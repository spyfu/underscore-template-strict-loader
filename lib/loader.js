var _ = require('underscore');
var babel = require('babel-core');
var falafel = require('falafel');
var loaderUtils = require('loader-utils');
var objects = require('./objects');
var path = require('path');
var {
    isIdentifier,
    isUnderscoreVariable,
    isParentAFunction,
    isIdentifierInCatchClause,
    isKeyInObjectProperty,
    isPropertyOfIdentifier,
    isParentVariableDeclarator
} = require('./node');


function setTemplateSettings(templateSettings) {
    if (typeof templateSettings !== "undefined") {
        for (var key of Object.keys(templateSettings)) {
            if (typeof key === 'string') {
                templateSettings[key] = new RegExp(templateSettings[key]);
            }
        }

        _.templateSettings = templateSettings;
    }
}

module.exports = function(content) {
    if (this.cacheable)
        this.cacheable();

    var query = loaderUtils.getOptions(this) || {};

    // set the template setting to whatever they pass in
    setTemplateSettings(query.templateSettings);

    // Add a comment with the filename for debugging
    if (query.addFilenameComment) {
        content = "\n<!--  " + this.resource + "  -->\n" + content;
    }

    // Compile template
    var templateSource = _.template(content, { variable: "data" }).source;

    // If a babel config was provided, apply the transforms
    if (typeof query.babel !== 'undefined') {
        templateSource = applyBabelTransformation(templateSource, query.babel);
    }

    // Prefix all variables that aren't declared internally with data
    templateSource = updateIdentifiersInTemplate(templateSource, query);

    // Export the template function
    templateSource = 'module.exports = ' + templateSource + ';\n';

    return templateSource;
};

function applyBabelTransformation(source, config) {
    // seperate the underscore lines from our template lines
    var sourceLines = source.split("\n");
    var templateLines = sourceLines.slice(2, sourceLines.length - 2).join("\n");

    // transform our template lines with babel
    var transformedTemplateLines = babel.transform(templateLines, config).code

    // if a 'use strict' was applied in the transformation, remove it
    if (transformedTemplateLines.startsWith("'use strict';")) {
        transformedTemplateLines = transformedTemplateLines.split("\n").slice(1).join("\n")
    }

    // glue our transformed source back together with the underscore lines
    var transformedSource = sourceLines.slice(0, 2).join("\n")
        + transformedTemplateLines
        + sourceLines.slice(sourceLines.length - 2).join("\n");

    return transformedSource;
}

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
    var doesParentNodeExist = node.parent;

    if (doesParentNodeExist) {
        var isVariabledDeclarator = isParentVariableDeclarator(node);
        var isDefinedInFunction = isParentAFunction(node) && isIdentifier(node);

        return isVariabledDeclarator || isDefinedInFunction
    }

    return false;
}

//
// Test whether this node is a variable identifier.
//
// @param      {falafel node (Object)}  node    The node to test.
// @return     {bool}  whether or not the node is an Identifier that we would want to prefix.
//
function testForIdentifier(node) {


    return isIdentifier(node) &&

           // We ignore anything that underscore is using for an internal identifier.
           !isUnderscoreVariable(node) &&

           // ignore the parameters of function expressions or function declarations.
           !isParentAFunction(node) &&

           // ignore the parameters of catch clauses
           !isIdentifierInCatchClause(node) &&

           // ignore object properties (ignore the keys but need don't ignore the value)
           !isKeyInObjectProperty(node) &&

           // Also, we make sure the identifier isn't a property on another identifier (ie: object.someProp.someProp)
           !isPropertyOfIdentifier(node);
}

module.exports._ = _;
