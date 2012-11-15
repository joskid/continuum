  var continuum = {
    createBytecode      : exports.runtime.createBytecode,
    createNativeFunction: exports.runtime.createNativeFunction,
    createRealm         : exports.runtime.createRealm,
    createRenderer      : exports.debug.createRenderer,
    introspect          : exports.debug.introspect
  };

  exports.utility.define(continuum, {
    Assembler : exports.assembler.Assembler,
    Realm     : exports.runtime.Realm,
    Renderer  : exports.debug.Renderer,
    Script    : exports.runtime.Script,
    ScriptFile: exports.runtime.ScriptFile,
    constants : exports.constants,
    utility   : exports.utility
  });

  return continuum;

}).apply(this, function(){
  var exports = {
    builtins: {},
    modules: {},
    fs: {
      readFile: function(path, encoding, callback){
        var xhr = new XMLHttpRequest;
        xhr.responseType = 'text';
        xhr.open('GET', path);
        xhr.onerror = xhr.onload = function(evt){
          if (xhr.readyState === 4) {
            xhr.onload = xhr.onerror = null;
            callback(null, xhr.responseText);
          }
        }

        xhr.send();
      }
    }
  };

  function require(request){
    request = request.slice(request.lastIndexOf('/') + 1);
    return exports[request];
  }

  return [this, exports, require];
}());
