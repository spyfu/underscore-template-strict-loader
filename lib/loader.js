var _ = require('underscore');
var falafel = require('falafel');
var loaderUtils = require('loader-utils');
var objects = require('./objects');
var path = require('path');

module.exports = function(content) {
    if (this.cacheable)
        this.cacheable();

    var query = loaderUtils.getOptions(this) || {};

    // set the template setting to whatever they pass in
    if (typeof query.templateSettings !== "undefined") {
        for (var key of Object.keys(query.templateSettings)) {
            if (typeof key === 'string') {
                query.templateSettings[key] = new RegExp(query.templateSettings[key]);
            }
        }

        _.templateSettings = query.templateSettings;
    }

    // Add a comment with the filename for debugging
    if (query.addFilenameComment) {
        content = "\n<!--  " + this.resource + "  -->\n" + content;
    }

    // Compile template
    var templateSource = _.template(content, { variable: "data" }).source;

    // Prefix all variables that aren't declared internally with data
    templateSource = updateIdentifiersInTemplate(templateSource, query);

    // Export the template function
    templateSource = 'module.exports = ' + templateSource + ';\n';

    return templateSource;
};

/**
 * Prefix all reference to variables with `data.` (ie: {{ source }} becomes {{
 * data.source }})
 *
 * @param   {string}    source  The source of the compiled underscore template
 * @param   {object}    query   Loader configuration
 * @return  {string}            The underscore template fixed for strict mode
 */
function updateIdentifiersInTemplate(source, query) {
    // variables that are declared in template
    var declaredIds = [];

    // add all built in javascript objects
    declaredIds = declaredIds.concat(objects);

    // add any globals to the declaredIds
    if (typeof query.globals != 'undefined' && Array.isArray(query.globals)) {
        declaredIds = declaredIds.concat(query.globals);
    }

    var sourceLines = source.split("\n");

    // keep track of the first 2 lines.
    var functionLine = sourceLines[0];
    var declarationLine = sourceLines[1];

    // We need to remove them since we don't want to mess with these
    // and add them back later.
    sourceLines.splice(0, 2);
    source = 'var __z=function() {\n' + sourceLines.join("\n");


    // Walk the source code and prefix all variables referenced with "data."
    var output = falafel(source, function (node) {
        if (testForDeclaration(node))
        {
            declaredIds.push(node.name)
        }
        else if (!_.contains(declaredIds, node.name) && testForIdentifier(node)) {
            node.update('data.' + node.source());
        }
    });

    // replace the first 2 lines with what they were before transforming them
    var outputLines = output.toString().split("\n");
    outputLines.splice(0, 1);
    outputLines.unshift(functionLine, declarationLine);

    return outputLines.join("\n");
}

function testForDeclaration(node) {
    var isVariabledDeclarator;
    var isDefinedInFunctionExpression;

    if (node.parent) {
        isVariabledDeclarator = node.parent.type == 'VariableDeclarator';
        isDefinedInFunctionExpression = node.parent.type == "FunctionExpression" && node.type == "Identifier";
    }

    return isVariabledDeclarator || isDefinedInFunctionExpression;
}

//
// Test whether this node is a variable identifier.
//
// @param      {falafel node (Object)}  node    The node to test.
// @return     {bool}  whether or not the node is an Identifier that we would want to prefix.
//
function testForIdentifier(node) {
    var excludeIdentifiers = /__\w{1}$/;

    return node.type === 'Identifier' &&

           // We ignore anything that underscore is using for an internal identifier.
           !excludeIdentifiers.test(node.name) &&

           // ignore the parameters of function expressions
           node.parent.type !== "FunctionExpression" &&

           // ignore underscore
           node.name != "_" &&

           // Also, we make sure the identifier isn't a property on another identifier (ie: object.someProp.someProp)
           node.parent.property != node;
}

module.exports._ = _;
