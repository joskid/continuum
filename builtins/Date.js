function Date(...values){
  return $__DateCreate(values);
}

$__setupConstructor(Date, $__DateProto);

$__defineProps(Date.prototype, {
  toString(){
    if ($__getNativeBrand(this) === 'Date') {
      return $__DateToString(this);
    } else {
      throw $__exception('not_generic', ['Date.prototype.toString']);
    }
  },
  valueOf(){
    if ($__getNativeBrand(this) === 'Date') {
      return $__DateToNumber(this);
    } else {
      throw $__exception('not_generic', ['Date.prototype.valueOf']);
    }
  }
});

$__wrapDateMethods(Date.prototype);
