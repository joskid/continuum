function Boolean(value){
  value = $__ToBoolean(value);
  if ($__isConstructCall()) {
    return $__BooleanCreate(value);
  } else {
    return value;
  }
}

$__setupConstructor(Boolean, $__BooleanProto);

$__defineProps(Boolean.prototype, {
  toString(){
    if ($__getNativeBrand(this) === 'Boolean') {
      return $__getPrimitiveValue(this) ? 'true' : 'false';
    } else {
      throw $__exception('not_generic', ['Boolean.prototype.toString']);
    }
  },
  valueOf(){
    if ($__getNativeBrand(this) === 'Boolean') {
      return $__getPrimitiveValue(this);
    } else {
      throw $__exception('not_generic', ['Boolean.prototype.valueOf']);
    }
  }
});
