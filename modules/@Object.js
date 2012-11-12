export function Object(value){
  if ($__IsConstructCall()) {
    return {};
  } else if (value == null) {
    return {};
  } else {
    return $__ToObject(value);
  }
}

$__setupConstructor(Object, $__ObjectProto);

$__defineProps(Object, {
  assign(target, source){
    ensureObject(target, 'Object.assign');
    source = $__ToObject(source);
    var props = $__Enumerate(source, false, true);
    for (let [i, key] of $__Enumerate(source, false, true)) {
      let prop = source[key];
      if (typeof prop === 'function' && $__GetInternal(prop, 'HomeObject')) {
        // TODO
      }
      target[key] = prop;
    }
    return target;
  },
  create(prototype, properties){
    if (typeof prototype !== 'object') {
      throw $__Exception('proto_object_or_null', [])
    }

    var object = $__ObjectCreate(prototype);

    if (properties !== undefined) {
      ensureDescriptor(properties);

      for (var k in properties) {
        var desc = properties[k];
        ensureDescriptor(desc);
        $__DefineOwnProperty(object, key, desc);
      }
    }

    return object;
  },
  defineProperty(object, key, property){
    ensureObject(object, 'Object.defineProperty');
    ensureDescriptor(property);
    key = $__ToPropertyName(key);
    $__DefineOwnProperty(object, key, property);
    return object;
  },
  defineProperties(object, properties){
    ensureObject(object, 'Object.defineProperties');
    ensureDescriptor(properties);

    for (var key in properties) {
      var desc = properties[key];
      ensureDescriptor(desc);
      $__DefineOwnProperty(object, key, desc);
    }

    return object;
  },
  freeze(object){
    ensureObject(object, 'Object.freeze');
    var props = $__Enumerate(object, false, false);

    for (var i=0; i < props.length; i++) {
      var desc = $__GetOwnProperty(object, props[i]);
      if (desc.configurable) {
        desc.configurable = false;
        if ('writable' in desc) {
          desc.writable = false;
        }
        $__DefineOwnProperty(object, props[i], desc);
      }
    }

    $__SetExtensible(object, false);
    return object;
  },
  getOwnPropertyDescriptor(object, key){
    ensureObject(object, 'Object.getOwnPropertyDescriptor');
    key = $__ToPropertyName(key);
    return $__GetOwnProperty(object, key);
  },
  getOwnPropertyNames(object){
    ensureObject(object, 'Object.getOwnPropertyNames');
    return $__Enumerate(object, false, false);
  },
  getPropertyDescriptor(object, key){
    ensureObject(object, 'Object.getPropertyDescriptor');
    key = $__ToPropertyName(key);
    return $__GetProperty(object, key);
  },
  getPropertyNames(object){
    ensureObject(object, 'Object.getPropertyNames');
    return $__Enumerate(object, true, false);
  },
  getPrototypeOf(object){
    ensureObject(object, 'Object.getPrototypeOf');
    return $__GetPrototype(object);
  },
  isExtensible(object){
    ensureObject(object, 'Object.isExtensible');
    return $__GetExtensible(object);
  },
  isFrozen(object){
    ensureObject(object, 'Object.isFrozen');
    if ($__GetExtensible(object)) {
      return false;
    }

    var props = $__Enumerate(object, false, false);

    for (var i=0; i < props.length; i++) {
      var desc = $__GetOwnProperty(object, props[i]);
      if (desc) {
        if (desc.configurable || 'writable' in desc && desc.writable) {
          return false;
        }
      }
    }

    return true;
  },
  isSealed(object){
    ensureObject(object, 'Object.isSealed');
    if ($__GetExtensible(object)) {
      return false;
    }

    var props = $__Enumerate(object, false, false);

    for (var i=0; i < props.length; i++) {
      var desc = $__GetOwnProperty(object, props[i]);
      if (desc && desc.configurable) {
        return false;
      }
    }

    return true;
  },
  keys(object){
    ensureObject(object, 'Object.keys');
    return $__Enumerate(object, false, true);
  },
  preventExtensions(object){
    ensureObject(object, 'Object.preventExtensions');
    $__SetExtensible(object, false);
    return object;
  }
});

$__defineProps(Object.prototype, {
  toString(){
    if (this === undefined) {
      return '[object Undefined]';
    } else if (this === null) {
      return '[object Null]';
    } else {
      return '[object '+$__GetBrand($__ToObject(this))+']';
    }
  },
  isPrototypeOf(object){
    while (object) {
      object = $__GetPrototype(object);
      if (object === this) {
        return true;
      }
    }
    return false;
  },
  toLocaleString(){
    return this.toString();
  },
  valueOf(){
    return $__ToObject(this);
  },
  hasOwnProperty(key){
    var object = $__ToObject(this);
    return $__HasOwnProperty(object, key);
  },
  propertyIsEnumerable(key){
    var object = $__ToObject(this);
    return ($__GetPropertyAttributes(this, key) & 0x01) !== 0;
  }
});


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
