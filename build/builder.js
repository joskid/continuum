var fs = require('fs'),
    path = require('path');



function dir(name){
  return fs.readdirSync(name).map(function(file){
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
  return '"' + source.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"') + '"';
}

function transformer(files, callback){
  return files.map(function(file){
    var name = path.basename(file).slice(0, -path.extname(file).length);
    return callback(name, read(file));
  });
}

function Combiner(){
  this.source = [];
}

Combiner.prototype.addSource = function addSource(code){
  if (code instanceof Array) {
    [].push.apply(this.source, code);
  } else {
    this.source.push(code);
  }
};

Combiner.prototype.addFiles = function addFiles(names, callback){
  if (!(names instanceof Array)) {
    names = [names];
  }
  if (callback) {
    this.addSource(transformer(names, callback));
  } else {
    this.addSource(names.map(read));
  }
};

Combiner.prototype.addDirectory = function addDirectory(name, callback){
  if (callback) {
    this.addSource(transformer(dir(name), callback));
  } else {
    this.addSource(dir(name).map(read));
  }
};

Combiner.prototype.combine = function combine(){
  return this.source.join('\n\n');
};

Combiner.prototype.writeFile = function writeFile(name){
  write(name, this.combine());
}


var source = new Combiner;
source.addFiles('./header.js');
source.addFiles('../node_modules/esprima/esprima.js', function(name, source){
  return 'exports.'+name+' = (function(exports){\n'+source+'\nreturn exports;\n})({});';
});
source.addFiles([
  '../engine/utility.js',
  '../engine/constants.js',
  '../engine/errors.js',
  '../engine/bytecode.js',
  '../engine/operators.js',
  '../engine/thunk.js',
  '../engine/runtime.js',
  '../engine/debug.js',
], function(name, source){
  return 'exports.'+source.slice(4);
});
source.addDirectory('../builtins', function(name, source){
  if (name === 'index') {
    return '';
  } else {
    return 'exports.builtins.'+name+' = '+escapeJS(source);
  }
});
source.addFiles('./footer.js');
source.writeFile('../continuum-combined.js');
