var fs = require('fs'),
    path = require('path');


var files = [
  './header.js',
  '../node_modules/esprima/esprima.js',
  '../lib/utility.js',
  '../lib/constants.js',
  '../lib/errors.js',
  '../lib/bytecode.js',
  '../lib/operators.js',
  '../lib/thunk.js',
  '../lib/runtime.js',
  '../lib/builtins.js',
  '../lib/debug.js',
  './footer.js'
].map(function(file, i, a){
  var source = fs.readFileSync(file, 'utf8');
  if (i === 0 || i === a.length - 1) {
    return source;
  } else if (/^var /.test(source)) {
    source = 'exports.'+source.slice(4);
  } else {
    var name = path.basename(file).slice(0, -path.extname(file).length);
    source = 'exports.'+name+' = (function(exports){\n'+source+'\nreturn exports;\n})({});';
  }
  return source;
});

fs.writeFileSync('../continuum-combined.js', files.join('\n\n'));
