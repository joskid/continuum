return exports.runtime;

}).apply(this, function(){
  var exports = {};
  function require(request){
    request = request.replace(/^\.{0,2}\//, '');
    return exports[request];
  }
  return [exports, require];
}());
