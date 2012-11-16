var runtime   = require('./engine/runtime'),
    assembler = require('./engine/assembler'),
    debug     = require('./engine/debug'),
    utility   = require('./engine/utility');

exports.createRealm = runtime.createRealm;
exports.createBytecode = runtime.createBytecode;
exports.createRenderer = debug.createRenderer;
exports.createNativeFunction = runtime.createNativeFunction;
exports.introspect = debug.introspect;
exports.iterate = utility.iterate;

utility.define(exports, {
  Assembler : assembler.Assembler,
  Realm     : runtime.Realm,
  Renderer  : debug.Renderer,
  Script    : runtime.Script,
  ScriptFile: runtime.ScriptFile,
  utility   : utility
});
