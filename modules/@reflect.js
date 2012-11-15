let ___ = 0b0000,
    E__ = 0b0001,
    _C_ = 0b0010,
    EC_ = 0b0011,
    __W = 0b0100,
    E_W = 0b0101,
    _CW = 0b0110,
    ECW = 0b0111,
    __A = 0b1000,
    E_A = 0b1001,
    _CA = 0b1010,
    ECA = 0b1011;

function makeDefiner(desc){
  return (object, key, value) => {
    desc.value = value;
    $__DefineOwnProperty(object, key, desc);
    desc.value = undefined;
    return object;
  };
}

let defineNormal = makeDefiner({ writable: true,
                                 enumerable: true,
                                 configurable: true });
let sealer = { configurable: false },
    freezer = { configurable: false, writable: false };


export function Proxy(target, handler){
  ensureObject(target, 'Proxy');
  ensureObject(handler, 'Proxy');
  return $__ProxyCreate(target, handler);
}


export class Handler {
  constructor(){}

  getOwnPropertyDescriptor(target, name){
    throw $__Exception('missing_fundamental_trap', ['getOwnPropertyDescriptor']);
  }

  getOwnPropertyNames(target){
    throw $__Exception('missing_fundamental_trap', ['getOwnPropertyNames']);
  }

  getPrototypeOf(target){
    throw $__Exception('missing_fundamental_trap', ['getPrototypeOf']);
  }

  defineProperty(target, name, desc){
    throw $__Exception('missing_fundamental_trap', ['defineProperty']);
  }

  deleteProperty(target, name){
    throw $__Exception('missing_fundamental_trap', ['deleteProperty']);
  }

  preventExtensions(target){
    throw $__Exception('missing_fundamental_trap', ['preventExtensions']);
  }

  isExtensible(target){
    throw $__Exception('missing_fundamental_trap', ['isExtensible']);
  }

  apply(target, thisArg, args){
    throw $__Exception('missing_fundamental_trap', ['apply']);
  }

  seal(target) {
    if (!this.preventExtensions(target)) return false;

    var props = this.getOwnPropertyNames(target),
        len = +props.length;

    for (var i = 0; i < len; i++) {
      success = success && this.defineProperty(target, props[i], sealer);
    }
    return success;
  }

  freeze(target){
    if (!this.preventExtensions(target)) return false;

    var props = this.getOwnPropertyNames(target),
        len = +props.length;

    for (var i = 0; i < len; i++) {
      var name = props[i],
          desc = this.getOwnPropertyDescriptor(target, name);

      if (desc) {
        success = success && this.defineProperty(target, name, 'writable' in desc || 'value' in desc ? freezer : sealer);
      }
    }

    return success;
  }

  isSealed(target){
    var props = this.getOwnPropertyNames(target),
        len = +props.length;

    for (var i = 0; i < len; i++) {
      var desc = this.getOwnPropertyDescriptor(target, props[i]);

      if (desc && desc.configurable) {
        return false;
      }
    }
    return !this.isExtensible(target);
  }

  isFrozen(target){
    var props = this.getOwnPropertyNames(target),
        len = +props.length;

    for (var i = 0; i < len; i++) {
      var desc = this.getOwnPropertyDescriptor(target, props[i]);

      if (desc.configurable || ('writable' in desc || 'value' in desc) && desc.writable) {
        return false;
      }
    }
    return !this.isExtensible(target);
  }

  has(target, name){
    var desc = this.getOwnPropertyDescriptor(target, name);
    if (desc !== undefined) {
      return true;
    }
    var proto = $__GetPrototype(target);
    return proto === null ? false : has(proto, name);
  }

  hasOwn(target, name){
    return this.getOwnPropertyDescriptor(target, name) !== undefined;
  }

  get(target, name, receiver){
    receiver = receiver || target;

    var desc = this.getOwnPropertyDescriptor(target, name);
    if (desc === undefined) {
      var proto = $__GetPrototype(target);
      return proto === null ? undefined : this.get(proto, name, receiver);
    }
    if ('writable' in desc || 'value' in desc) {
      return desc.value;
    }
    var getter = desc.get;
    return getter === undefined ? undefined : $__CallFunction(getter, receiver, []);
  }

  set(target, name, value, receiver){
    var ownDesc = this.getOwnPropertyDescriptor(target, name);

    if (ownDesc !== undefined) {
      if ('get' in ownDesc || 'set' in ownDesc) {
        var setter = ownDesc.set;
        if (setter === undefined) return false;
        $__CallFunction(setter, receiver, [value]);
        return true;
      }

      if (ownDesc.writable === false) {
        return false;
      } else if (receiver === target) {
        $__DefineOwnProperty(receiver, name, { value: value });
        return true;
      } else {
        $__DefineOwnProperty(receiver, name, newDesc);
        var extensible = $__GetExtensible(receiver);
        extensible && defineNormal(receiver, name, value);
        return extensible;
      }
    }

    var proto = $__GetPrototype(target);
    if (proto === null) {
      var extensible = $__GetExtensible(receiver);
      extensible && defineNormal(receiver, name, value);
      return extensible;
    }

    return this.set(proto, name, value, receiver);
  }

  enumerate(target){
    var result = this.getOwnPropertyNames(target),
        len = +result.length,
        out = [];

    for (var i = 0; i < len; i++) {
      var name = $__ToString(result[i]),
          desc = this.getOwnPropertyDescriptor(name);

      if (desc != null && !desc.enumerable) {
        out.push(name);
      }
    }

    var proto = $__GetPrototype(target);
    return proto === null ? out : out.concat(enumerate(proto));
  }

  iterate(target){
    var result = this.enumerate(target),
        len = +result.length,
        i = 0;

    return {
      next(){
        if (i === len) throw StopIteration;
        return result[i++];
      }
    };
  }

  keys(target){
    var result = this.getOwnPropertyNames(target),
        len = +result.length,
        result = [];

    for (var i = 0; i < len; i++) {
      var name = $__ToString(result[i]),
          desc = this.getOwnPropertyDescriptor(name);

      if (desc != null && desc.enumerable) {
        result.push(name);
      }
    }
    return result;
  }

  construct(target, args) {
    var proto = this.get(target, 'prototype', target),
        instance = $__Type(proto) === 'Object' ? $__ObjectCreate(proto) : {},
        result = this.apply(target, instance, args);

    return $__Type(result) === 'Object' ? result : instance;
  }
}


export function apply(target, thisArg, args){
  ensureFunction(target, '@Reflect.apply');
  return $__CallFunction(target, thisArg, ensureArgs(args));
}

export function construct(target, args){
  ensureFunction(target, '@Reflect.construct');
  return $__Construct(target, ensureArgs(args));
}

export function defineProperty(target, name, desc){
  ensureObject(target, '@Reflect.defineProperty');
  ensureDescriptor(desc);
  name = $__ToPropertyName(name);
  $__DefineOwnProperty(target, name, desc);
  return object;
}

export function deleteProperty(target, name){
  ensureObject(target, '@Reflect.deleteProperty');
  name = $__ToPropertyName(name);
  return $__Delete(target, name, false);
}

export function enumerate(target){
  return $__Enumerate($__ToObject(target), false, false);
}

export function freeze(target){
  if (Type(target) !== 'Object') return false;
  var success = $__SetExtensible(target, false);
  if (!success) return success;

  var props = $__Enumerate(target, false, false);
      len = props.length;

  for (var i = 0; i < len; i++) {
    var desc = $__GetOwnProperty(target, props[i]),
        attrs = 'writable' in desc || 'value' in desc ? freezer : desc !== undefined ? sealer : null;

    if (attrs !== null) {
      success = success && $__DefineOwnProperty(target, props[i], attrs);
    }
  }
  return success;
}

export function get(target, name, receiver){
  target = $__ToObject(target);
  name = $__ToPropertyName(name);
  receiver = receiver === undefined ? undefined : $__ToObject(receiver);
  return $__GetP(target, name, receiver);
}

export function getOwnPropertyDescriptor(target, name){
  ensureObject(target, '@Reflect.getOwnPropertyDescriptor');
  name = $__ToPropertyName(name);
  return $__GetOwnProperty(target, name);
}

export function getOwnPropertyNames(target){
  ensureObject(target, '@Reflect.getOwnPropertyNames');
  return $__Enumerate(target, false, false);
}

export function getPrototypeOf(target){
  ensureObject(target, '@Reflect.getPrototypeOf');
  return $__GetPrototype(target);
}

export function has(target, name){
  target = $__ToObject(target);
  name = $__ToPropertyName(name);
  return name in target;
}

export function hasOwn(target, name){
  target = $__ToObject(target);
  name = $__ToPropertyName(name);
  return $__HasOwnProperty(target, name);
}

export function isFrozen(target){
  ensureObject(target, '@Reflect.isFrozen');
  if ($__GetExtensible(target)) {
    return false;
  }

  var props = $__Enumerate(target, false, false);

  for (var i=0; i < props.length; i++) {
    var desc = $__GetOwnProperty(target, props[i]);
    if (desc) {
      if (desc.configurable || 'writable' in desc && desc.writable) {
        return false;
      }
    }
  }

  return true;
}

export function isSealed(target){
  ensureObject(target, '@Reflect.isSealed');
  if ($__GetExtensible(target)) {
    return false;
  }

  var props = $__Enumerate(target, false, false);

  for (var i=0; i < props.length; i++) {
    var desc = $__GetOwnProperty(target, props[i]);
    if (desc && desc.configurable) {
      return false;
    }
  }

  return true;
}

export function isExtensible(target){
  ensureObject(target, '@Reflect.isExtensible');
  return $__GetExtensible(target);
}

export function keys(target){
  ensureObject(target, '@Reflect.keys');
  return $__Enumerate(target, false, true);
}

export function preventExtensions(target){
  if (Type(target) !== 'Object') return false;
  return $__SetExtensible(target, false);
}

export function seal(target){
  if (Type(target) !== 'Object') return false;
  var success = $__SetExtensible(target, false);
  if (!success) return success;

  var props = $__Enumerate(target, false, false);
      len = props.length;

  for (var i = 0; i < len; i++) {
    success = success && $__DefineOwnProperty(target, props[i], sealer);
  }
  return success;
}

export function set(target, name, value, receiver){
  target = $__ToObject(target);
  name = $__ToPropertyName(name);
  receiver = receiver === undefined ? undefined : $__ToObject(receiver);
  return $__SetP(target, name, value, receiver);
}



$__setupFunctions(getOwnPropertyDescriptor, getOwnPropertyNames, getPrototypeOf,
  defineProperty, deleteProperty, preventExtensions, isExtensible, apply, enumerate,
  freeze, seal, isFrozen, isSealed, has, hasOwn, keys, get, set, construct);



function ensureObject(o, name){
  var type = typeof o;
  if (type === 'object' ? o === null : type !== 'function') {
    throw $__Exception('called_on_non_object', [name]);
  }
}

function ensureDescriptor(o){
  if (o === null || typeof o !== 'object') {
    throw $__Exception('property_desc_object', [typeof o])
  }
}


function ensureArgs(o, name){
  if (o == null || typeof o !== 'object' || typeof $__getDirect(o, 'length') !== 'number') {
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
