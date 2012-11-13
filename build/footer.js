return (function(Realm){
  function continuum(listener){
    return new Realm(listener);
  }

  continuum.debug = exports.debug;
  continuum.utility = exports.utility;
  continuum.constants = exports.constants;
  continuum.createNativeFunction = exports.runtime.createNativeFunction;
  continuum.Realm = Realm;

  return continuum;
})(exports.runtime.Realm);

}).apply(this, function(){
  var exports = { builtins: {}, modules: {} };

  function require(request){
    request = request.slice(request.lastIndexOf('/') + 1);
    return exports[request];
  }

  return [exports, require];
}());
