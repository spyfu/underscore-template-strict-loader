function isIdentifier(node) {
    return node.type === 'Identifier';
}

function isUnderscoreVariable(node) {
    var excludeIdentifiers = /__\w{1}$/;
    return excludeIdentifiers.test(node.name) || node.name === "_";
}

function isParentAFunction(node) {
    return node.parent.type === "FunctionExpression" || node.parent.type === "FunctionDeclaration";
}

function isIdentifierInCatchClause(node) {
    return node.parent.type === "CatchClause";
}

function isKeyInObjectProperty(node) {
    return node.parent.type === "Property" && node.start === node.parent.start;
}

function isPropertyOfIdentifier(node) {
    return node.parent.property == node;
}

function isParentVariableDeclarator(node) {
    return node.parent.type == 'VariableDeclarator';
}

module.exports = {
    isIdentifier,
    isUnderscoreVariable,
    isParentAFunction,
    isIdentifierInCatchClause,
    isKeyInObjectProperty,
    isPropertyOfIdentifier,
    isParentVariableDeclarator
};
