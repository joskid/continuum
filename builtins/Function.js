function Function(...args){
  return $__FunctionCreate(args);
}

$__setupConstructor(Function, $__FunctionProto);

$__defineDirect(Function.prototype, 'name', 'Empty', 0);

$__defineProps(Function.prototype, {
  apply(receiver, args){
    ensureFunction(this, 'apply');
    if (args == null || typeof args !== 'object', typeof args.length !== 'number') {
      throw $__Exception('apply_wrong_args', []);
    }

    if ($__GetNativeBrand(args) !== 'Array') {
      args = [...args];
    }

    return $__CallFunction(this, receiver, args);
  },
  bind(receiver, ...args){
    ensureFunction(this, 'bind');
    return $__BoundFunctionCreate(this, receiver, args);
  },
  call(receiver, ...args){
    ensureFunction(this, 'call');
    return $__CallFunction(this, receiver, args);
  },
  toString(radix){
    ensureFunction(this, 'toString');
    if (radix !== undefined) {
      radix = $__ToInteger(radix);
    }
    return $__FunctionToString(this, radix);
  }
});


function ensureFunction(o, name){
  if (typeof o !== 'function') {
    throw $__Exception('called_on_non_object', ['Function.prototype.'+name]);
  }
}
