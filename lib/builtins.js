(function(global){
  $__defineDirect(global, 'console', {
    log: function log(v){
      $__writeln(v);
    }
  }, 6);



  function defineMethods(obj, props){
    for (var i in props) {
      $__defineDirect(obj, props[i].name, props[i], 6);
      $__markAsNative(props[i]);
      $__deleteDirect(props[i], 'prototype');
    }
  }

  function setupConstructor(ctor, proto){
    $__defineDirect(ctor, 'prototype', proto, 0);
    $__defineDirect(ctor.prototype, 'constructor', ctor, 0);
    $__defineDirect(global, ctor.name, ctor, 6);
    $__markAsNative(ctor);
  }


  $__EmptyClass = function constructor(){};

  // #############
  // ### Array ###
  // #############

  function Array(n){
    if (arguments.length === 1 && typeof n === 'number') {
      var out = []
      out.length = n;
      return out;
    } else {
      var out = [];
      for (var i=0; i < arguments.length; i++) {
        out[i] = arguments[i];
      }
      return out;
    }
  }

  setupConstructor(Array, $__ArrayProto);


  defineMethods(Array, [
    function isArray(array){
      return $__getNativeBrand(array) === 'Array';
    }
  ]);

  defineMethods(Array.prototype, [
    function forEach(callback, context){
      context = context || this;
      for (var i=0; i < this.length; i++) {
        if ($__hasOwnDirect(this, i)) {
          callback.call(context, this[i], i, this);
        }
      }
    },
    function map(callback, context){
      var out = [];
      context = context || this;
      for (var i=0; i < this.length; i++) {
        if ($__hasOwnDirect(this, i)) {
          out[i] = callback.call(context, this[i], i, this);
        }
      }
      return out;
    },
    function join(joiner){
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
    function push(){
      var len = this.length,
          argLen = arguments.length;

      for (var i=0; i < argLen; i++) {
        this[len++] = arguments[i];
      }
      return len;
    },
    function pop(){
      var out = this[this.length - 1];
      this.length--;
      return out;
    },
    function slice(start, end){
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
    function toString(){
      return this.join(',');
    }
  ]);



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

  defineMethods(Boolean.prototype, [
    function toString(){
      if ($__getNativeBrand(this) === 'Boolean') {
        return $__getPrimitiveValue(this) ? 'true' : 'false';
      } else {
        // throw
      }
    },
    function valueOf(){
      if ($__getNativeBrand(this) === 'Boolean') {
        return $__getPrimitiveValue(this);
      } else {
        // throw
      }
    }
  ]);


  // ############
  // ### Date ###
  // ############

  function Date(arg){
    return $__DateCreate(arg);
  }

  setupConstructor(Date, $__DateProto);

  defineMethods(Date.prototype, [
    function toString(){
      if ($__getNativeBrand(this) === 'Date') {
        return $__dateToString(this);
      } else {
        // throw
      }
    },
    function valueOf(){
      if ($__getNativeBrand(this) === 'Date') {
        return $__dateToNumber(this);
      } else {
        // throw
      }
    }
  ]);


  // ################
  // ### Function ###
  // ################

  function Function(){
    return $__FunctionCreate(arguments);
  }

  $__defineDirect($__FunctionProto, 'name', 'Empty', 0);

  setupConstructor(Function, $__FunctionProto);

  defineMethods(Function.prototype, [
    $__call,
    $__apply,
    $__bind,
    function toString(){
      return $__functionToString(this);
    }
  ]);


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

  defineMethods(Number, [
    function isNaN(number){
      return number !== number;
    },
    function isFinite(number){
      return typeof value === 'number'
          && value === value
          && value < Infinity
          && value > -Infinity;
    },
    function isInteger(value) {
      return typeof value === 'number'
          && value === value
          && value > -9007199254740992
          && value < 9007199254740992
          && value | 0 === value;
    },
    function toInteger(value){
      return (value / 1 || 0) | 0;
    }
  ]);

  defineMethods(Number.prototype, [
    function toString(radix){
      if ($__getNativeBrand(this) === 'Number') {
        return $__numberToString(this, radix);
      } else {
        // throw
      }
    },
    function valueOf(){
      if ($__getNativeBrand(this) === 'Number') {
        return $__getPrimitiveValue(this);
      } else {
        // throw
      }
    }
  ]);


  // ##############
  // ### Object ###
  // ##############

  function Object(obj){
    if ($__isConstructCall() || obj == null) {
      return this;
    } else {
      return $__ToObject(obj);
    }
  }

  setupConstructor(Object, $__ObjectProto);


  defineMethods(Object, [
    $__keys,
    $__create,
    $__isExtensible,
    $__getPrototypeOf,
    $__defineProperty,
    $__defineProperties,
    $__getPropertyNames,
    $__getOwnPropertyNames,
    $__getPropertyDescriptor,
    $__getOwnPropertyDescriptor
  ]);

  defineMethods(Object.prototype, [
    function toString(){
      if (this === undefined) {
        return '[object Undefined]';
      } else if (this === null) {
        return '[object Null]';
      } else {
        return $__objectToString(this);
      }
    },
    function toLocaleString(){
      return this.toString();
    },
    function valueOf(){
      return $__ToObject(this);
    },
    $__hasOwnProperty,
    $__isPrototypeOf,
    $__propertyIsEnumerable
  ]);


  // ##############
  // ### RegExp ###
  // ##############

  function RegExp(arg){
    return $__RegExpCreate(''+arg);
  }

  setupConstructor(RegExp, $__RegExpProto);


  // ##############
  // ### String ###
  // ##############

  function String(arg){
    arg = arguments.length ? $__ToString(arg) : '';
    if ($__isConstructCall()) {
      return $__StringCreate(arg);
    } else {
      return arg;
    }
  }

  setupConstructor(String, $__StringProto);

  defineMethods(String.prototype, [
    function toString(){
      if ($__getNativeBrand(this) === 'String') {
        return $__getPrimitiveValue(this);
      } else {
        // throw
      }
    },
    function valueOf(){
      if ($__getNativeBrand(this) === 'String') {
        return $__getPrimitiveValue(this);
      } else {
        // throw
      }
    },
    function charAt(pos){
      pos = pos | 0;
      if (pos < 0 || pos >= this.length) {
        return '';
      } else {
        return this[pos];
      }
    },
    function charCodeAt(pos){
      pos = pos | 0;
      if (pos < 0 || pos >= this.length) {
        return NaN;
      } else {
        return $__charCode(this[pos]);
      }
    }
  ]);

  defineMethods(global, [
    $__parseInt,
    $__parseFloat,
    $__decodeURI,
    $__encodeURI,
    $__decodeURIComponent,
    $__encodeURIComponent,
    $__escape,
    function isNaN(number){
      number = +number;
      return number !== number;
    },
    function isFinite(number){
      number = +number;
      return number === number && number !== Infinity && number !== -Infinity;
    }
  ]);

})(this);
