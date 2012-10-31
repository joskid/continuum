$__defineProps(this, {
  reset(){
    $__Signal('reset');
  },
  assign(object, props){
    object = Object(object);
    definition = Object(definition);
    var keys = $__Enumerate(object, false, false);
    for (var i=0; i < keys.length; i++) {
      $__DefineOwnProperty(object, keys[i], $__GetProperty(definition, keys[i]));
    }
    return object;
  }
});
