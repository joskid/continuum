return (function(Realm){
  function continuum(listener){
    return new Realm(listener);
  }

  continuum.debug = exports.debug;
  continuum.utility = exports.utility;
  continuum.constants = exports.constants;
  continuum.Realm = Realm;

  return continuum;
})(exports.runtime.Realm);

}).apply(this, function(){
  var exports = { builtins: {} };

  function require(request){
    request = request.replace(/^\.{0,2}\//, '');
    return exports[request];
  }

  return [exports, require];
}());
