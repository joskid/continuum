export function Proxy(target, handler){}

export function getOwnPropertyDescriptor(target, name){
  ensureObject(target, 'Reflect.getOwnPropertyDescriptor');
  name = $__ToPropertyName(name);
  return $__GetOwnProperty(target, name);
}

export function defineProperty(target, name, desc){
  ensureObject(target, 'Reflect.defineProperty');
  ensureDescriptor(desc);
  name = $__ToPropertyName(name);
  $__DefineOwnProperty(target, name, desc);
  return object;
}

export function getOwnPropertyNames(target){
  ensureObject(target, 'Reflect.getOwnPropertyNames');
  return $__Enumerate(target, false, false);
}

export function getPrototypeOf(target){
  ensureObject(target, 'Reflect.getPrototypeOf');
  return $__GetPrototype(target);
}

export function deleteProperty(target, name){
  return $__Delete(target, name, false);
}

export function enumerate(target){
  ensureObject(target, 'Reflect.enumerate');
  return $__Enumerate(target, false, false);
}

export function freeze(target){
  ensureObject(target, 'Reflect.freeze');
  var props = $__Enumerate(target, false, false);

  for (var i=0; i < props.length; i++) {
    var desc = $__GetOwnProperty(target, props[i]);
    if (desc.configurable) {
      desc.configurable = false;
      if ('writable' in desc) {
        desc.writable = false;
      }
      $__DefineOwnProperty(target, props[i], desc);
    }
  }

  $__SetExtensible(target, false);
  return target;
}

export function seal(target){

}

export function preventExtensions(target){
  ensureObject(target, 'Reflect.preventExtensions');
  $__SetExtensible(target, false);
  return target;
}

export function isFrozen(target){
  ensureObject(target, 'Reflect.isFrozen');
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
  ensureObject(target, 'Reflect.isSealed');
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
  ensureObject(target, 'Reflect.isExtensible');
  return $__GetExtensible(target);
}

export function has(target, name){
  ensureObject(target, 'Reflect.has');
  name = $__ToPropertyName(name);
  return $__HasProperty(target, name);
}

export function hasOwn(target, name){
  ensureObject(target, 'Reflect.hasOwn');
  name = $__ToPropertyName(name);
  return $__HasOwnProperty(target, name);
}

export function keys(target){
  ensureObject(target, 'Reflect.keys');
  return $__Enumerate(target, false, true);
}

export function get(target, name, receiver){
  ensureObject(target, 'Reflect.get');
  name = $__ToPropertyName(name);
  return $__GetP(target, name, receiver);
}

export function set(target, name, value, receiver){
  ensureObject(target, 'Reflect.set');
  name = $__ToPropertyName(name);
  return $__SetP(target, name, value, receiver);
}

export function apply(target, thisArg, args){
  return $__CallFunction(target, thisArg, args);
}

export function construct(target, args){
  return $__Construct(target, args);
}


export function Handler(){}

$__defineProps(Handler.prototype, {
  // fundamental traps
  getOwnPropertyDescriptor: Reflect.getOwnPropertyDescriptor,
  getOwnPropertyNames:      Reflect.getOwnPropertyNames,
  getPrototypeOf:           Reflect.getPrototypeOf,
  defineProperty:           Reflect.defineProperty,
  deleteProperty:           Reflect.deleteProperty,
  preventExtensions:        Reflect.preventExtensions,
  isExtensible:             Reflect.isExtensible,
  apply:                    Reflect.apply,

  // derived traps
  seal(target) {
    var success = this.preventExtensions(target);
    success = !!success;
    if (success) {
      var props = this.getOwnPropertyNames(target);
      var l = +props.length;
      for (var i = 0; i < l; i++) {
        var name = props[i];
        success = success &&
          this.defineProperty(target, name, { configurable: false });
      }
    }
    return success;
  },
  freeze(target){
    var success = this.preventExtensions(target);
    if (success = !!success) {
      var props = this.getOwnPropertyNames(target),
          l = +props.length;

      for (var i = 0; i < l; i++) {
        var name = props[i],
            desc = this.getOwnPropertyDescriptor(target, name);

        desc = normalizeAndCompletePropertyDescriptor(desc);
        if (isDataDescriptor(desc)) {
          success = success && this.defineProperty(target, name, { writable: false, configurable: false });
        } else if (desc !== undefined) {
          success = success && this.defineProperty(target, name, { configurable: false });
        }
      }
    }
    return success;
  },
  isSealed(target){
    var props = this.getOwnPropertyNames(target),
        l = +props.length;

    for (var i = 0; i < l; i++) {
      var name = props[i],
          desc = this.getOwnPropertyDescriptor(target, name);

      desc = normalizeAndCompletePropertyDescriptor(desc);
      if (desc.configurable) {
        return false;
      }
    }
    return !this.isExtensible(target);
  },
  isFrozen(target){
    var props = this.getOwnPropertyNames(target),
        l = +props.length;

    for (var i = 0; i < l; i++) {
      var name = props[i],
          desc = this.getOwnPropertyDescriptor(target, name);

      desc = normalizeAndCompletePropertyDescriptor(desc);
      if (isDataDescriptor(desc)) {
        if (desc.writable) {
          return false;
        }
      }
      if (desc.configurable) {
        return false;
      }
    }
    return !this.isExtensible(target);
  },
  has(target, name){
    var desc = this.getOwnPropertyDescriptor(target, name);
    desc = normalizeAndCompletePropertyDescriptor(desc);
    if (desc !== undefined) {
      return true;
    }
    var proto = $__GetPrototype(target);
    if (proto === null) {
      return false;
    }
    return Reflect.has(proto, name);
  },
  hasOwn(target,name){
    var desc = this.getOwnPropertyDescriptor(target, name);
    return undefined !== normalizeAndCompletePropertyDescriptor(desc);
  },
  get(target, name, receiver){
    receiver = receiver || target;

    var desc = this.getOwnPropertyDescriptor(target, name);
    desc = normalizeAndCompletePropertyDescriptor(desc);
    if (desc === undefined) {
      var proto = $__GetPrototype(target);
      if (proto === null) {
        return undefined;
      }
      return Reflect.get(proto, name, receiver);
    }
    if (isDataDescriptor(desc)) {
      return desc.value;
    }
    var getter = desc.get;
    if (getter === undefined) {
      return undefined;
    }
    return $__CallFunction(desc.get, receiver, []);
  },
  set(target, name, value, receiver){
    var ownDesc = this.getOwnPropertyDescriptor(target, name);
    ownDesc = normalizeAndCompletePropertyDescriptor(ownDesc);

    if (ownDesc !== undefined) {
      if (isAccessorDescriptor(ownDesc)) {
        var setter = ownDesc.set;
        if (setter === undefined) return false;
        $__CallFunction(setter, receiver, [value]); // assumes Function.prototype.call
        return true;
      }
      // otherwise, isDataDescriptor(ownDesc) must be true
      if (ownDesc.writable === false) return false;
      if (receiver === target) {
        var updateDesc = { value: value };
        $__DefineOwnProperty(receiver, name, updateDesc);
        return true;
      } else {
        if (!$__GetExtensible(receiver)) return false;
        var newDesc =
          { value: value,
            writable: true,
            enumerable: true,
            configurable: true };
        $__DefineOwnProperty(receiver, name, newDesc);
        return true;
      }
    }

    // name is not defined in target, search target's prototype
    var proto = $__GetPrototype(target);
    if (proto === null) {
      if (!$__GetExtensible(receiver)) return false;
      var newDesc =
        { value: value,
          writable: true,
          enumerable: true,
          configurable: true };
      $__DefineOwnProperty(receiver, name, newDesc);
      return true;
    }
    // continue the search in target's prototype
    return Reflect.set(proto, name, value, receiver);
  },
  enumerate(target){
    var trapResult = this.getOwnPropertyNames(target);
    var l = +trapResult.length;
    var result = [];
    for (var i = 0; i < l; i++) {
      var name = $__ToString(trapResult[i]);
      var desc = this.getOwnPropertyDescriptor(name);
      desc = normalizeAndCompletePropertyDescriptor(desc);
      if (desc !== undefined && desc.enumerable) {
        result.push(name);
      }
    }
    var proto = $__GetPrototype(target);
    if (proto === null) {
      return result;
    }
    var inherited = Reflect.enumerate(proto);
    // FIXME: filter duplicates
    return result.concat(inherited);
  },
  iterate(target){
    var trapResult = this.enumerate(target);
    var l = +trapResult.length;
    var idx = 0;
    return {
      next: function() {
        if (idx === l) {
          throw StopIteration;
        } else {
          return trapResult[idx++];
        }
      }
    };
  },
  keys(target){
    var trapResult = this.getOwnPropertyNames(target);
    var l = +trapResult.length;
    var result = [];
    for (var i = 0; i < l; i++) {
      var name = $__ToString(trapResult[i]);
      var desc = this.getOwnPropertyDescriptor(name);
      desc = normalizeAndCompletePropertyDescriptor(desc);
      if (desc !== undefined && desc.enumerable) {
        result.push(name);
      }
    }
    return result;
  },
  construct(target, args) {
    var proto = this.get(target, 'prototype', target);
    var instance;
    if (Object(proto) === proto) {
      instance = $__ObjectCreate(proto);
    } else {
      instance = {};
    }
    var res = this.apply(target, instance, args);
    if (Object(res) === res) {
      return res;
    }
    return instance;
  }
});

