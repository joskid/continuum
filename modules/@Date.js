export function Date(...values){
  return $__DateCreate(values);
}

$__setupConstructor(Date, $__DateProto);

export let now = $__now;

$__defineMethods(Date, [now]);

$__defineProps(Date.prototype, {
  toString(){
    if ($__GetNativeBrand(this) === 'Date') {
      return $__DateToString(this);
    } else {
      throw $__Exception('not_generic', ['Date.prototype.toString']);
    }
  },
  valueOf(){
    if ($__GetNativeBrand(this) === 'Date') {
      return $__DateToNumber(this);
    } else {
      throw $__Exception('not_generic', ['Date.prototype.valueOf']);
    }
  }
});

$__wrapDateMethods(Date.prototype);


