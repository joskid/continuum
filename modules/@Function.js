export function Function(...args){
  return $__FunctionCreate(args);
}

$__setupConstructor(Function, $__FunctionProto);
$__defineDirect(Function.prototype, 'name', 'Empty', 0);


export function apply(func, receiver, args){
  ensureFunction(func, '@Function.apply');
  return $__CallFunction(func, receiver, ensureArgs(args));
}

export function bind(func, receiver, ...args){
  ensureFunction(func, '@Function.bind');
  return $__BoundFunctionCreate(func, receiver, args);
}

export function call(func, receiver, ...args){
  ensureFunction(func, '@Function.call');
  return $__CallFunction(func, receiver, args);
}

$__setupFunction(apply);
$__setupFunction(bind);
$__setupFunction(call);


$__defineProps(Function.prototype, {
  apply(receiver, args){
    ensureFunction(this, 'Function.prototype.apply');
    return $__CallFunction(this, receiver, ensureArgs(args));
  },
  bind(receiver, ...args){
    ensureFunction(this, 'Function.prototype.bind');
    return $__BoundFunctionCreate(this, receiver, args);
  },
  call(receiver, ...args){
    ensureFunction(this, 'Function.prototype.call');
    return $__CallFunction(this, receiver, args);
  },
  toString(){
    ensureFunction(this, 'Function.prototype.toString');
    return $__FunctionToString(this);
  }
});


function ensureArgs(o, name){
  if (o == null || typeof o !== 'object' || typeof o.length !== 'number') {
    throw $__Exception('apply_wrong_args', []);
  }

  var brand = $__GetNativeBrand(o);
  return brand === 'Array' || brand === 'Arguments' ? o : [...o];
}

function ensureFunction(o, name){
  if (typeof o !== 'function') {
    throw $__Exception('called_on_non_function', [name]);
  }
}
