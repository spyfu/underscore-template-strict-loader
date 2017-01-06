underscore-template-strict-loader
=========================

An Underscore.js template loader for Webpack that works with strict mode. Underscore templates don't work with strict mode by default because they use the `with(data)` function to give you access to your data variables. This plugin works by prefixing each variable in your templates with `data.whatever` so `{{ name }}` becomes `{{ data.name }}` .

### Installation
Once you have the Underscore package installed, you can run:
```
npm install underscore-template-loader
```

### License

underscore-template-strict-loader is [MIT licenced](http://www.opensource.org/licenses/mit-license.php).

### Usage
```js
module.exports = {
    module: {
            test: /\.jst/,
            loader: 'underscore-template-strict-loader',
            query: {
                templateSettings: {
                    evaluate: /\{\[([\s\S]+?)\]\}/,
                    escape: /\{\{([\s\S]+?)\}\}/,
                    interpolate: /\{\!([\s\S]+?)\!\}/
                },
                
                // Add this only if you want to prefix the template with
                // an HTML comment with the path to the file for debugging.
                addFilenameComment: true
            }
        }
};
```
