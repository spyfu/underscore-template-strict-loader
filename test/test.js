'use strict';

var _ = require("underscore");
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

    it('doesn\'t prefix function expression parameters', () => {
        let output = load(`<% _.each(hello, function(world) { %>
            <%= foo %>
            <%= world %>
        <% }) %>`);

        expect(output.indexOf('data.hello')).not.to.equal(-1);
        expect(output.indexOf('data.world')).to.equal(-1);
        expect(output.indexOf('data.foo')).not.to.equal(-1);
    });

    it('doesn\'t prefix function declaration parameters', () => {
        let output = load(`<% function hello(world) { %>
            <%= foo %>
            <%= world %>
        <% } %>`);

        expect(output.indexOf('data.hello')).to.equal(-1);
        expect(output.indexOf('data.world')).to.equal(-1);
        expect(output.indexOf('data.foo')).not.to.equal(-1);
    });

    it('doesn\'t prefix object literal properties', () => {
        let output = load(`<% function test(options) {}; test({objectKey: objectValue}); %>`);

        expect(output.indexOf('data.objectKey')).to.equal(-1);
        expect(output.indexOf('data.objectValue')).not.to.equal(-1);
    });

    it('doesn\'t prefix catch clause parameters', () => {
        let output = load(`<% try { JSON.stringify("bad json") } catch (e) {} %>`);

        expect(output.indexOf('data.e')).to.equal(-1);
    });

    it('doesn\'t prefix global variables', () => {
        let output = load(`<%= someAwesomeGlobal %>`, {
            query: {
                globals: ['someAwesomeGlobal'],
            },
        });

        expect(output.indexOf('data.someAwesomeGlobal')).to.equal(-1);
    });

    it('doesn\'t prefix built in javascript objects', () => {
        let output = load('<%= Math.round(1.1) %>');
        let template = getTemplateFunction(output);

        expect(output.indexOf('data.Math')).to.equal(-1);
        expect(template()).to.equal('1');
    });

    it('transpiles templates with babel', (done) => {
        let output = load(`
            <% foo.forEach(bar => { %>
                <span><%= bar %></span>
            <% }) %>
        `, {
            query: {
                babel: { presets: ['es2015'] },
            },
        });

        let template = getTemplateFunction(output);
        let html = template({ foo: ['one', 'two', 'three'] });

        expect(html.indexOf('<span>one</span>')).not.to.equal(-1);
        expect(html.indexOf('<span>two</span>')).not.to.equal(-1);
        expect(html.indexOf('<span>three</span>')).not.to.equal(-1);

        setTimeout(done, 1000);
    });

    it('can take a regex string in options', () => {
        let output = load('{{ hello }}', {
            query: {
                templateSettings: {
                    evaluate: '\\{\\[([\\s\\S]+?)\\]\\}',
                    escape: '\\{\\{([\\s\\S]+?)\\}\\}',
                    interpolate: '\\{\\!([\\s\\S]+?)\\!\\}',
                },
            },
        });

        expect(output.indexOf('data.hello')).not.to.equal(-1);
    });
});
