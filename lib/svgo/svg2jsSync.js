'use strict';

var htmlparser = require('htmlparser2'),
    JSAPI = require('./jsAPI');



/**
 * Convert SVG (XML) string to SVG-as-JS object.
 *
 * @param {String} data input data
 * @param {Function} callback
 */
module.exports = function(data, callback) {

    var root = new JSAPI({ elem: '#document' }),
        current = root,
        stack = [root],
        textContext = null;



    function pushToContent(content) {

        content = new JSAPI(content, current);

        (current.content = current.content || []).push(content);

        return content;

    }

    // sax.ondoctype = function(doctype) {

    //     pushToContent({
    //         doctype: doctype
    //     });

    // };
    var config = {

    }

    config.onprocessinginstruction = function(name,data) {
        pushToContent({
            processinginstruction: data
        });

    };

    config.oncomment = function(comment) {

        pushToContent({
            comment: comment.trim()
        });

    };

    config.oncdata = function(cdata) {

        pushToContent({
            cdata: cdata
        });

    };

    config.onopentag = function(name,attributes) {

        var data = {
            name: name,
            attributes: attributes
        };

        var elem = {
            elem: data.name,
            //prefix: data.prefix,
            //local: data.local
        };

        if (Object.keys(data.attributes).length) {
            elem.attrs = {};

            for (var name in data.attributes) {
                elem.attrs[name] = {
                    name: name,
                    value: data.attributes[name]
                    //prefix: data.attributes[name].prefix,
                    //local: data.attributes[name].local
                };
            }
        }

        elem = pushToContent(elem);
        current = elem;

        // Save info about <text> tag to prevent trimming of meaningful whitespace
        if (data.name == 'text' && !data.prefix) {
            textContext = current;
        }

        stack.push(elem);

    };

    config.ontext = function(text) {


        if (/\S/.test(text) || textContext) {

            if (!textContext)
                text = text.trim();

            pushToContent({
                text: text
            });

        }

    };

    config.onclosetag = function(name) {

        var last = stack.pop();

        // Trim text inside <text> tag.
        if (last == textContext) {
            trim(textContext);
            textContext = null;
        }
        current = stack[stack.length - 1];

    };

    config.onerror = function(e) {

        callback({ error: 'Error in parsing: ' + e.message });

    };


    var parser = new htmlparser.Parser(config,{decodeEntities: true,xmlMode:true});
    parser.write(data);
    parser.end();

    return root;

    function trim(elem) {
        if (!elem.content) return elem;

        var start = elem.content[0],
            end = elem.content[elem.content.length - 1];

        while (start && start.content && !start.text) start = start.content[0];
        if (start && start.text) start.text = start.text.replace(/^\s+/, '');

        while (end && end.content && !end.text) end = end.content[end.content.length - 1];
        if (end && end.text) end.text = end.text.replace(/\s+$/, '');

        return elem;

    }

};
