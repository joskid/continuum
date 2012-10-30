function Function(...args){
  return $__FunctionCreate(args);
}

$__defineDirect($__FunctionProto, 'name', 'Empty', 0);

$__setupConstructor(Function, $__FunctionProto);

$__defineMethods(Function.prototype, [
  $__call,
  $__apply,
  $__bind,
]);

$__defineProps(Function.prototype, {
  toString: $__FunctionToString
});
