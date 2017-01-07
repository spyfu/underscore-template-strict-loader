'use strict';

var expect = require('chai').expect;
var loader = require('../lib/loader');

function load(source, options) {
    let webpackContext = Object.assign({}, { cacheable: () => null }, options);
    return loader.bind(webpackContext)(source);
};

function getTemplateFunction(output) {
    let templateFunction = output.slice(17); // <- remove module export
    return new Function('return ' + templateFunction)();
}

describe('underscore-template-strict-loader', () => {
    it('doesn\'t violate strict mode', () => {
        let output = load('<%= foo %>');
        expect(output.indexOf('with')).to.equal(-1);
    });

    it('pre-compiles underscore templates', () => {
        let output = load('<div>hello</div>')
        let template = getTemplateFunction(output);

        expect(template()).to.equal('<div>hello</div>');
    });

    it('adds the template path in a comment', () => {
        let output = load('<div>hello</div>', {
            resource: 'test.jst',
            query: '?addFilenameComment=true',
        });

        let template = getTemplateFunction(output);

        expect(template().indexOf('<!--  test.jst  -->')).to.not.equal(-1);
    });

    it('doesn\'t prefix templates that are defined in the template', () => {
        let output = load('<% var foo = "bar" %><%= foo %>');
        let template = getTemplateFunction(output);

        expect(output.indexOf('data.foo')).to.equal(-1);
        expect(template()).to.equal('bar');
    });

    it('prefixes variables not defined in the template', () => {
        let output = load('<%= foo %>');
        let template = getTemplateFunction(output);

        expect(output.indexOf('data.foo')).to.not.equal(-1);
        expect(template({ foo: 'bar' })).to.equal('bar');
    });

    it('correctly prefixes objects in the template', () => {
        let output = load('<%= foo.bar %>');
        let template = getTemplateFunction(output);

        expect(output.indexOf('data.foo.bar')).to.not.equal(-1);
        expect(template({ foo: { bar: 'baz' } })).to.equal('baz');
    });
});
