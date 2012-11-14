var fs = require('fs'),
    path = require('path');



function dir(name){
  return fs.readdirSync(name).sort().map(function(file){
    return name + '/' + file;
  });
}

function read(file){
  return fs.readFileSync(file, 'utf8')
}

function write(file, content){
  fs.writeFileSync(file, content);
}

function escapeJS(source){
  return '"' + source.replace(/\\/g, '\\\\').replace(/(?!=\\)\r?\n/g, '\\n').replace(/"/g, '\\"') + '"';
}

function transformer(files, callback){
  return files.map(function(file){
    var name = path.basename(file).slice(0, -path.extname(file).length);
    return callback(name, read(file));
  });
}

function Builder(){
  this.source = [];
}

Builder.prototype.addSource = function addSource(code){
  if (code instanceof Array) {
    [].push.apply(this.source, code);
  } else {
    this.source.push(code);
  }
};

Builder.prototype.addFiles = function addFiles(names, callback){
  if (!(names instanceof Array)) {
    names = [names];
  }
  if (callback) {
    this.addSource(transformer(names, callback));
  } else {
    this.addSource(names.map(read));
  }
};

Builder.prototype.addDirectory = function addDirectory(name, callback){
  if (callback) {
    this.addSource(transformer(dir(name), callback));
  } else {
    this.addSource(dir(name).map(read));
  }
};

Builder.prototype.combine = function combine(){
  return this.source.join('\n\n');
};

Builder.prototype.writeFile = function writeFile(name){
  var src = this.combine();
  write(name+'.js', src);
  write(name+'.min.js', minify(src));
}


var builder = new Builder;

builder.addFiles('./header.js');

builder.addFiles('../third_party/esprima/esprima.js', function(name, source){
  return 'exports.'+name+' = (function(exports){\n'+source+'\nreturn exports;\n})({});';
});

builder.addFiles([
  '../engine/utility.js',
  '../engine/constants.js',
  '../engine/errors.js',
  '../engine/assembler.js',
  '../engine/operators.js',
  '../engine/thunk.js',
  '../engine/runtime.js',
  '../engine/debug.js',
], function(name, source){
  return 'exports.'+source.slice(4);
});


builder.addDirectory('../modules', function(name, source){
  return name === 'index' ? '' : 'exports.modules["'+name+'"] = '+escapeJS(source) + ';';
});


builder.addFiles('./footer.js');

var esprima, esmangle, escodegen, passes, post;

function minify(src){
  esprima = esprima || require('esprima');
  escodegen = escodegen || require('escodegen');
  esmangle = esmangle || require('esmangle');
  passes = passes || [
    esmangle.require('lib/pass/transform-dynamic-to-static-property-access'),
    esmangle.require('lib/pass/reordering-function-declarations'),
    esmangle.require('lib/pass/remove-unused-label'),
    esmangle.require('lib/pass/remove-empty-statement'),
    esmangle.require('lib/pass/remove-wasted-blocks'),
    esmangle.require('lib/pass/transform-to-compound-assignment'),
    esmangle.require('lib/pass/transform-to-sequence-expression'),
    esmangle.require('lib/pass/transform-branch-to-expression'),
    esmangle.require('lib/pass/reduce-sequence-expression'),
    esmangle.require('lib/pass/reduce-branch-jump'),
    esmangle.require('lib/pass/reduce-multiple-if-statements'),
    esmangle.require('lib/pass/dead-code-elimination')
  ];
  post = post || [
    esmangle.require('lib/post/transform-static-to-dynamic-property-access'),
    esmangle.require('lib/post/rewrite-boolean'),
    esmangle.require('lib/post/rewrite-conditional-expression')
  ];

  function passer(node, pass){ return pass(node) }

  var a = { loc: true },
      b = { destructive: true },
      c = {
        comment: false,
        allowUnparenthesizedNew: true,
        format: {
          indent: {
            style: '  ',
            base: 0,
            adjustMultilineComment: false
          },
          json: false,
          renumber: true,
          hexadecimal: true,
          quotes: 'single',
          escapeless: false,
          compact: true,
          parentheses: true,
          semicolons: true,
          safeConcatenation: true
        }
      },
      parse = esprima.parse,
      mangle = esmangle.mangle,
      optimize = esmangle.optimize,
      generate = escodegen.generate;

  return generate(mangle(post.reduce(passer, optimize(parse(src, a), passes, b)), b), c);
}


builder.writeFile('../continuum');
