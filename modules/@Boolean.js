export function Boolean(value){
  value = $__ToBoolean(value);
  if ($__IsConstructCall()) {
    return $__BooleanCreate(value);
  } else {
    return value;
  }
}

$__setupConstructor(Boolean, $__BooleanProto);

$__defineProps(Boolean.prototype, {
  toString(){
    if ($__GetNativeBrand(this) === 'Boolean') {
      return $__GetPrimitiveValue(this) ? 'true' : 'false';
    } else {
      throw $__Exception('not_generic', ['Boolean.prototype.toString']);
    }
  },
  valueOf(){
    if ($__GetNativeBrand(this) === 'Boolean') {
      return $__GetPrimitiveValue(this);
    } else {
      throw $__Exception('not_generic', ['Boolean.prototype.valueOf']);
    }
  }
});
