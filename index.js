var _ = require('underscore');
var falafel = require('falafel');
var path = require('path');
var loaderUtils = require('loader-utils');

module.exports = function(content) {
    if (this.cacheable)
        this.cacheable();

    var done = this.async();
    var query = loaderUtils.parseQuery(this.query);

    // set the template setting to whatever they pass in 
    _.templateSettings = query.templateSettings;

    // Add a comment with the filename for debugging
    if (query.addFilenameComment) {
        content = "\n<!--  " + this.resource + "  -->\n" + content;
    }

    // Compile template
    var templateSource = _.template(content, { variable: "data" }).source;

    // Prefix all variables that aren't declared internally with data
    templateSource = updateIdentifiersInTemplate(templateSource);

    // Export the template function
    templateSource = 'module.exports = ' + templateSource + ';\n';

    done(null, templateSource);
};

// string -> string
function updateIdentifiersInTemplate(source) {
    // variables that are declared in template
    var declaredIds = [];

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
    return node.parent && node.parent.type == 'VariableDeclarator';
}

// falafel node -> bool
function testForIdentifier(node) {
    var excludeIdentifiers = /__\w{1}$/;

    return node.type === 'Identifier' &&

           // We ignore anything that underscore is using for an internal identifier.
           !excludeIdentifiers.test(node.name) &&

           node.name != "_" &&

           // Also, we make sure the identifier isn't a property on another identifier (ie: object.someProp.someProp)
           node.parent.property != node;
}

module.exports._ = _;
