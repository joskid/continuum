var runtime = require('./engine/runtime'),
    utility = require('./engine/utility'),
    debug = require('./engine/debug'),
    fs = require('fs')

function ScriptFile(location){
  runtime.Script.call(this, {
    source: ScriptFile.load(location),
    filename: location
  });
}

ScriptFile.load = function load(location){
  return require('fs').readFileSync(location, 'utf8');
};

utility.inherit(ScriptFile, runtime.Script);


function createBytecode(source){
  if (!~source.indexOf('\n') && fs.existsSync(source)) {
    return new ScriptFile(source).bytecode;
  } else {
    return new runtime.Script(source).bytecode;
  }
}


function continuum(listener){
  return new runtime.Realm(listener);
}

module.exports = continuum;
continuum.debug = debug;
continuum.Realm = runtime.Realm;
continuum.createBytecode = createBytecode;
continuum.createNativeFunction = runtime.createNativeFunction;
utility.define(continuum, 'utility', utility);
