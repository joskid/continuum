(function(global){
  var E = 0x1,
      C = 0x2,
      W = 0x4,
      A = 0x8;




  function defineMethods(obj, props){
    for (var i in props) {
      $__defineDirect(obj, props[i].name, props[i], 6);
      $__markAsNative(props[i]);
      $__deleteDirect(props[i], 'prototype');
    }
  }

  function defineProps(obj, props){
    for (var name in props) {
      var prop = props[name];
      $__defineDirect(obj, name, prop, 6);
      if (typeof prop === 'function') {
        $__defineDirect(prop, 'name', name, 0);
        $__markAsNative(prop);
        $__deleteDirect(prop, 'prototype');
      }
    }
  }

  function defineConstants(obj, props){
    for (var k in props) {
      $__defineDirect(obj, k, props[k], 0);
    }
  }


  function setupConstructor(ctor, proto){
    $__defineDirect(ctor, 'prototype', proto, 0);
    $__defineDirect(ctor.prototype, 'constructor', ctor, 0);
    $__defineDirect(global, ctor.name, ctor, 6);
    $__markAsNativeConstructor(ctor);
  }



 $__EmptyClass = function constructor(...args){ super(...args) };

  // #############
  // ### Array ###
  // #############

  function Array(...args){
    if (args.length === 1 && typeof args[0] === 'number') {
      var out = [];
      out.length = args[0];
      return out;
    } else {
      return args;
    }
  }

  setupConstructor(Array, $__ArrayProto);


  defineProps(Array, {
    isArray(array){
      return $__getNativeBrand(array) === 'Array';
    },
    from(iterable){
      var out = [];
      iterable = Object(iterable);

      for (var i = 0, len = iterable.length >>> 0; i < len; i++) {
        if (i in iterable) {
          out[i] = iterable[i];
        }
      }

      return out;
    }
  });



  defineProps(Array.prototype, {
    filter(callback){
      if (this == null) {
        throw $__exception('called_on_null_or_undefined', ['Array.prototype.filter']);
      }

      var array = $__ToObject(this),
          length = $__ToUint32(this.length);

      var receiver = this;

      if (typeof receiver !== 'object') {
        receiver = $__ToObject(receiver);
      }

      var result = [],
          count = 0;

      for (var i = 0; i < length; i++) {
        if (i in array) {
          var element = array[i];
          if ($__callFunction(callback, receiver, [element, i, array])) {
            result[count++] = element;
          }
        }
      }

      return result;
    },
    forEach(callback, context){
      var len = this.length;
      if (arguments.length === 1) {
        context = this;
      } else {
        context = $__ToObject(this);
      }
      for (var i=0; i < len; i++) {
        callback.call(context, this[i], i, this);
      }
    },
    map(callback, context){
      var out = [];
      var len = this.length;
      if (arguments.length === 1) {
        context = this;
      } else {
        context = Object(this);
      }
      for (var i=0; i < len; i++) {
        console.log(i);
        out.push(callback.call(context, this[i], i, this));
      }
      return out;
    },
    reduce(callback, initial){
      var index = 0;
      if (arguments.length === 1) {
        initial = this[0];
        index++;
      }
      for (; index < this.length; i++) {
        if (i in this) {
          initial = callback.call(this, initial, this[o], this);
        }
      }
      return initial;
    },
    join(joiner){
      var out = '', len = this.length;

      if (len === 0) {
        return out;
      }

      if (arguments.length === 0) {
        joiner = ',';
      } else {
        joiner = $__ToString(joiner);
      }

      len--;
      for (var i=0; i < len; i++) {
        out += this[i] + joiner;
      }

      return out + this[i];
    },
    push(...args){
      var len = this.length,
          argsLen = args.length;

      for (var i=0; i < argsLen; i++) {
        this[len++] = args[i];
      }
      return len;
    },
    pop(){
      var out = this[this.length - 1];
      this.length--;
      return out;
    },
    slice(start, end){
      var out = [], len;

      start = start === undefined ? 0 : +start || 0;
      end = end === undefined ? this.length - 1 : +end || 0;

      if (start < 0) {
        start += this.length;
      }

      if (end < 0) {
        end += this.length;
      } else if (end >= this.length) {
        end = this.length - 1;
      }

      if (start > end || end < start || start === end) {
        return [];
      }

      len = start - end;
      for (var i=0; i < len; i++) {
        out[i] = this[i + start];
      }

      return out;
    },
    toString(){
      return this.join(',');
    }
  });

  // ###############
  // ### Boolean ###
  // ###############

  function Boolean(arg){
    if ($__isConstructCall()) {
      return $__BooleanCreate($__ToBoolean(arg));
    } else {
      return $__ToBoolean(arg);
    }
  }

  setupConstructor(Boolean, $__BooleanProto);

  defineProps(Boolean.prototype, {
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


  // ############
  // ### Date ###
  // ############

  function Date(...args){
    return $__DateCreate(args);
  }

  setupConstructor(Date, $__DateProto);

  defineProps(Date.prototype, {
    toString(){
      if ($__getNativeBrand(this) === 'Date') {
        return $__dateToString(this);
      } else {
        throw $__exception('not_generic', ['Date.prototype.toString']);
      }
    },
    valueOf(){
      if ($__getNativeBrand(this) === 'Date') {
        return $__dateToNumber(this);
      } else {
        throw $__exception('not_generic', ['Date.prototype.valueOf']);
      }
    }
  });

  $__wrapDateMethods(Date.prototype);


  // ################
  // ### Function ###
  // ################

  function Function(...args){
    return $__FunctionCreate(args);
  }

  $__defineDirect($__FunctionProto, 'name', 'Empty', 0);

  setupConstructor(Function, $__FunctionProto);

  defineMethods(Function.prototype, [
    $__call,
    $__apply,
    $__bind,
    function toString(){
      if (typeof this !== 'function') {
        throw $__exception('not_generic', ['Function.prototype.toString']);
      }
      return $__functionToString(this);
    }
  ]);


  // ###########
  // ### Map ###
  // ###########

  function Map(iterable){}
  setupConstructor(Map, $__MapProto);


  // ##############
  // ### Number ###
  // ##############

  function Number(arg){
    if ($__isConstructCall()) {
      return $__NumberCreate(+arg);
    } else {
      return $__ToNumber(arg);
    }
  }
  setupConstructor(Number, $__NumberProto);

  defineConstants(Number, {
    EPSILON: 2.220446049250313e-16,
    MAX_INTEGER: 9007199254740992,
    MAX_VALUE: 1.7976931348623157e+308,
    MIN_VALUE: 5e-324,
    NaN: NaN,
    NEGATIVE_INFINITY: -Infinity,
    POSITIVE_INFINITY: Infinity
  });

  defineProps(Number, {
    isNaN(number){
      return number !== number;
    },
    isFinite(number){
      return typeof value === 'number'
          && value === value
          && value < Infinity
          && value > -Infinity;
    },
    isInteger(value) {
      return typeof value === 'number'
          && value === value
          && value > -9007199254740992
          && value < 9007199254740992
          && value | 0 === value;
    },
    toInteger(value){
      return (value / 1 || 0) | 0;
    }
  });

  var isFinite = Number.isFinite;

  defineProps(Number.prototype, {
    toString(radix){
      if ($__getNativeBrand(this) === 'Number') {
        return $__numberToString(this, radix);
      } else {
        throw $__exception('not_generic', ['Number.prototype.toString']);
      }
    },
    valueOf(){
      if ($__getNativeBrand(this) === 'Number') {
        return $__getPrimitiveValue(this);
      } else {
        throw $__exception('not_generic', ['Number.prototype.valueOf']);
      }
    },
    clz() {
      var x = $__ToNumber(this);
      if (!x || !isFinite(x)) {
        return 32;
      } else {
        x = x < 0 ? x + 1 | 0 : x | 0;
        x -= (x / 0x100000000 | 0) * 0x100000000;
        return 32 - x.toString(2).length;
      }
    }
  });


  function ensureObject(o, name){
    if (o === null || typeof o !== 'object') {
      throw $__exception('called_on_non_object', [name]);
    }
  }

  function ensureDescriptor(o){
    if (o === null || typeof desc !== 'object') {
      throw $__exception('property_desc_object', [typeof o])
    }
  }

  // ##############
  // ### Object ###
  // ##############

  function Object(obj){
    if ($__isConstructCall()) {
      return this;
    } else if (obj == null) {
      return {};
    } else {
      return $__ToObject(obj);
    }
  }

  setupConstructor(Object, $__ObjectProto);

  defineProps(Object, {
    create(prototype, descriptors){
      if (typeof prototype !== 'object') {
        throw $__exception('proto_object_or_null', [])
      }

      var object = $__ObjectCreate(prototype);

      if (descriptors !== undefined) {
        ensureDescriptor(descriptors);

        for (var k in descs) {
          var desc = descriptors[k];
          ensureDescriptor(desc);
          $__DefineOwnProperty(object, key, desc);
        }
      }

      return object;
    },
    defineProperty(object, key, desc){
      ensureObject(object, 'defineProperty');
      ensureDescriptor(desc);
      key = $__ToPropertyName(key);
      $__DefineOwnProperty(object, key, desc);
      return object;
    },
    defineProperties(object, descriptors){
      ensureObject(object, 'defineProperties');
      ensureDescriptor(descriptors);

      for (var key in descriptors) {
        var desc = descriptors[key];
        ensureDescriptor(desc);
        $__DefineOwnProperty(object, key, desc);
      }

      return object;
    },
    getOwnPropertyDescriptor(object, key){
      ensureObject(object, 'getOwnPropertyDescriptor');
      key = $__ToPropertyName(key);
      return $__GetOwnProperty(object, key);
    },
    getOwnPropertyNames(object){
      ensureObject(object, 'getOwnPropertyNames');
      return $__Enumerate(object, false, false);
    },
    getPropertyDescriptor(object, key){
      ensureObject(object, 'getPropertyDescriptor');
      key = $__ToPropertyName(key);
      return $__GetProperty(object, key);
    },
    getPropertyNames(object){
      ensureObject(object, 'getPropertyNames');
      return $__Enumerate(object, true, false);
    },
    getPrototypeOf(object){
      ensureObject(object, 'getPrototypeOf');
      return $__GetPrototype(object);
    },
    isExtensible(object){
      ensureObject(object, 'isExtensible');
      return $__GetExtensible(object);
    },
    keys(object){
      ensureObject(object, 'keys');
      return $__Enumerate(object, false, true);
    }
  });

  defineProps(Object.prototype, {
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
    toString(){
      if (this === undefined) {
        return '[object Undefined]';
      } else if (this === null) {
        return '[object Null]';
      } else {
        var object = $__ToObject(this);
        return '[object '+$__getNativeBrand(object)+']';
      }
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
      return ($__GetPropertyAttributes(this, key) & E) !== 0;
    }
  });



  // ##############
  // ### RegExp ###
  // ##############

  function RegExp(pattern){
    return $__RegExpCreate($__ToString(pattern));
  }

  setupConstructor(RegExp, $__RegExpProto);


  // ###########
  // ### Set ###
  // ###########

  function Set(iterable){}
  setupConstructor(Set, $__SetProto);



  // ##############
  // ### String ###
  // ##############

  function String(string){
    string = arguments.length ? $__ToString(string) : '';
    if ($__isConstructCall()) {
      return $__StringCreate(string);
    } else {
      return string;
    }
  }

  setupConstructor(String, $__StringProto);

  defineProps(String.prototype, {
    toString(){
      if ($__getNativeBrand(this) === 'String') {
        return $__getPrimitiveValue(this);
      } else {
        throw $__exception('not_generic', ['String.prototype.toString']);
      }
    },
    valueOf(){
      if ($__getNativeBrand(this) === 'String') {
        return $__getPrimitiveValue(this);
      } else {
        throw $__exception('not_generic', ['String.prototype.valueOf']);
      }
    },
  });


  $__wrapStringMethods(String.prototype);


  // ###############
  // ### WeakMap ###
  // ###############

  function WeakMap(iterable){}
  setupConstructor(WeakMap, $__WeakMapProto);



  function Error(message){
    this.message = message;
  }
  setupConstructor(Error, $__ErrorProto);

  defineProps(Error.prototype, {
    toString(){
      return this.name + ': '+this.message;
    }
  });

  function EvalError(message){
    this.message = message;
  }
  setupConstructor(EvalError, $__EvalErrorProto);

  function RangeError(message){
    this.message = message;
  }
  setupConstructor(RangeError, $__RangeErrorProto);

  function ReferenceError(message){
    this.message = message;
  }
  setupConstructor(ReferenceError, $__ReferenceErrorProto);

  function SyntaxError(message){
    this.message = message;
  }
  setupConstructor(SyntaxError, $__SyntaxErrorProto);

  function TypeError(message){
    this.message = message;
  }
  setupConstructor(TypeError, $__TypeErrorProto);

  function URIError(message){
    this.message = message;
  }
  setupConstructor(URIError, $__URIErrorProto);


  $__defineDirect(global, 'Math', $__MathCreate(), 6);
  $__defineDirect(global, 'JSON', $__JSONCreate(), 6);


  defineMethods(global, [
    $__parseInt,
    $__parseFloat,
    $__decodeURI,
    $__encodeURI,
    $__decodeURIComponent,
    $__encodeURIComponent,
    $__escape,
    $__eval,
    function isNaN(number){
      number = $__ToNumber(number);
      return number !== number;
    },
    function isFinite(number){
      number = $__ToNumber(number);
      return number === number && number !== Infinity && number !== -Infinity;
    }
  ]);


  $__defineDirect(global, 'stdout', {}, 6);

  defineProps(stdout, {
    write(text, color){
      $__write(text, color);
    },
    clear(){
      $__clear();
    },
    backspace(count){
      $__backspace(count);
    }
  });


  $__defineDirect(global, 'console', {}, 6);

  defineProps(console, {
    log(...args){
      for (var i=0; i < args.length; i++) {
        stdout.write(args[i] + ' ');
      }
      stdout.write('\n');
    }
  });
})(this)
