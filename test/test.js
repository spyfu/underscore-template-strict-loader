var MemoryFileSystem = require('memory-fs');
var path = require('path');
var webpack = require('webpack');

var msf = new MemoryFileSystem();
var loaderPath = 'expose-loader?' + path.resolve(__dirname, '../index.js');

function bundle(options, callback) {
    var compiler = webpack(Object.assign({}, {
        output: { path: '/', filename: 'test.build.js' },
        module: { rules: [{ test: /\.jst$/, loader: loaderPath }] },
    }, options));

    compiler.outputFileSystem = mfs;
    webpackCompiler.run((err, stats) => {
        expect(err).to.be.null;
        if (stats.compilation.errors.length) {
            state.compilation.errors.forEach(err => console.error(err.message));
        }

        expect(stats.compilation.errors).to.be.empty;
        cb(mfs.readFileSync('/test.build.js').toString());
    });
}

describe('underscore-template-strict-loader', () => {
    it.skip('pre-compiles underscore templates', () => {
        // pending
    });

    it.skip('prefixes variables not defined in the template', () => {
        // pending
    });

    it.skip('adds the template path in a comment', () => {
        // pending
    });
});
