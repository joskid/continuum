(function(global){
  %defineDirect(global, 'stdout', {
    write: %write,
    backspace: %backspace,
    clear: %clear
  }, 6);

  %defineDirect(global, 'console', {
    log: function log(...args){
      args.forEach(function(arg){
        stdout.write(arg + ' ');
      });
      stdout.write('\n');
    }
  }, 6);



  function defineMethods(obj, props){
    for (var i in props) {
      %defineDirect(obj, props[i].name, props[i], 6);
      %markAsNative(props[i]);
      %deleteDirect(props[i], 'prototype');
    }
  }

  function defineConstants(obj, props){
    for (var k in props) {
      %defineDirect(obj, k, props[k], 0);
    }
  }


  function setupConstructor(ctor, proto){
    %defineDirect(ctor, 'prototype', proto, 0);
    %defineDirect(ctor.prototype, 'constructor', ctor, 0);
    %defineDirect(global, ctor.name, ctor, 6);
    %markAsNativeConstructor(ctor);
  }


  %EmptyClass = function constructor(){};

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

  setupConstructor(Array, %ArrayProto);


  defineMethods(Array, [
    function isArray(array){
      return %getNativeBrand(array) === 'Array';
    },
    function from(iterable){
      var out = [];
      iterable = Object(iterable);

      for (var i = 0, len = iterable.length >>> 0; i < len; i++) {
        if (i in iterable) {
          out[i] = iterable[i];
        }
      }

      return out;
    }
  ]);



  defineMethods(Array.prototype, [
    function filter(callback, receiver) {
      if (this == null) {
        throw %exception("called_on_null_or_undefined", ["Array.prototype.filter"]);
      }

      var array = %ToObject(this),
          length = %ToUint32(this.length);

      if (receiver == null) {
        receiver = this;
      } else if (typeof receiver !== 'object') {
        receiver = %ToObject(receiver);
      }

      var result = [],
          count = 0;

      for (var i = 0; i < length; i++) {
        if (i in array) {
          var element = array[i];
          if (%callFunction(callback, receiver, [element, i, array])) {
            result[count++] = element;
          }
        }
      }

      return result;
    },
    function forEach(callback, context){
      if (arguments.length === 1) {
        context = this;
      } else {
        context = %ToObject(this);
      }
      for (var i=0; i < this.length; i++) {
        if (%hasOwnDirect(this, i)) {
          callback.call(context, this[i], i, this);
        }
      }
    },
    function map(callback, context){
      var out = [];
      if (arguments.length === 1) {
        context = this;
      } else {
        context = %ToObject(this);
      }
      for (var i=0; i < this.length; i++) {
        if (%hasOwnDirect(this, i)) {
          out[i] = callback.call(context, this[i], i, this);
        }
      }
      return out;
    },
    function reduce(callback, initial){
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
    function join(joiner){
      var out = '', len = this.length;

      if (len === 0) {
        return out;
      }

      if (arguments.length === 0) {
        joiner = ',';
      } else {
        joiner = %ToString(joiner);
      }

      len--;
      for (var i=0; i < len; i++) {
        out += this[i] + joiner;
      }

      return out + this[i];
    },
    function push(...args){
      var len = this.length,
          argsLen = args.length;

      for (var i=0; i < argsLen; i++) {
        this[len++] = args[i];
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
    if (%isConstructCall()) {
      return %BooleanCreate(%ToBoolean(arg));
    } else {
      return %ToBoolean(arg);
    }
  }

  setupConstructor(Boolean, %BooleanProto);

  defineMethods(Boolean.prototype, [
    function toString(){
      if (%getNativeBrand(this) === 'Boolean') {
        return %getPrimitiveValue(this) ? 'true' : 'false';
      } else {
        throw %exception("not_generic", ["Boolean.prototype.toString"]);
      }
    },
    function valueOf(){
      if (%getNativeBrand(this) === 'Boolean') {
        return %getPrimitiveValue(this);
      } else {
        throw %exception("not_generic", ["Boolean.prototype.valueOf"]);
      }
    }
  ]);


  // ############
  // ### Date ###
  // ############

  function Date(...args){
    return %DateCreate(args);
  }

  setupConstructor(Date, %DateProto);

  defineMethods(Date.prototype, [
    function toString(){
      if (%getNativeBrand(this) === 'Date') {
        return %dateToString(this);
      } else {
        throw %exception("not_generic", ["Date.prototype.toString"]);
      }
    },
    function valueOf(){
      if (%getNativeBrand(this) === 'Date') {
        return %dateToNumber(this);
      } else {
        throw %exception("not_generic", ["Date.prototype.valueOf"]);
      }
    }
  ]);

  %wrapDateMethods(Date.prototype);


  // ################
  // ### Function ###
  // ################

  function Function(...args){
    return %FunctionCreate(args);
  }

  %defineDirect(%FunctionProto, 'name', 'Empty', 0);

  setupConstructor(Function, %FunctionProto);

  defineMethods(Function.prototype, [
    %call,
    %apply,
    %bind,
    function toString(){
      if (typeof this !== 'function') {
        throw %exception("not_generic", ["Function.prototype.toString"]);
      }
      return %functionToString(this);
    }
  ]);


  // ###########
  // ### Map ###
  // ###########

  function Map(iterable){}
  setupConstructor(Map, %MapProto);


  // ##############
  // ### Number ###
  // ##############

  function Number(arg){
    if (%isConstructCall()) {
      return %NumberCreate(+arg);
    } else {
      return %ToNumber(arg);
    }
  }
  setupConstructor(Number, %NumberProto);

  defineConstants(Number, {
    EPSILON: 2.220446049250313e-16,
    MAX_INTEGER: 9007199254740992,
    MAX_VALUE: 1.7976931348623157e+308,
    MIN_VALUE: 5e-324,
    NaN: NaN,
    NEGATIVE_INFINITY: -Infinity,
    POSITIVE_INFINITY: Infinity
  });

  %isFinite = function isFinite(number){
    return typeof value === 'number'
        && value === value
        && value < Infinity
        && value > -Infinity;
  }

  defineMethods(Number, [
    function isNaN(number){
      return number !== number;
    },
    %isFinite,
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
      if (%getNativeBrand(this) === 'Number') {
        return %numberToString(this, radix);
      } else {
        throw %exception("not_generic", ["Number.prototype.toString"]);
      }
    },
    function valueOf(){
      if (%getNativeBrand(this) === 'Number') {
        return %getPrimitiveValue(this);
      } else {
        throw %exception("not_generic", ["Number.prototype.valueOf"]);
      }
    },
    function clz() {
      var x = +this;
      if (!x || !isFinite(x)) {
        return 32;
      } else {
        x = x < 0 ? x + 1 | 0 : x | 0;
        x -= ((x / 0x100000000) | 0) * 0x100000000;
        return 32 - x.toString(2).length;
      }
    }
  ]);


  // ##############
  // ### Object ###
  // ##############

  function Object(obj){
    if (%isConstructCall()) {
      return this;
    } else if (obj == null) {
      return {};
    } else {
      return %ToObject(obj);
    }
  }

  setupConstructor(Object, %ObjectProto);


  defineMethods(Object, [
    %keys,
    %create,
    %isExtensible,
    %getPrototypeOf,
    %defineProperty,
    %defineProperties,
    %getPropertyNames,
    %getOwnPropertyNames,
    %getPropertyDescriptor,
    %getOwnPropertyDescriptor
  ]);

  defineMethods(Object.prototype, [
    function toString(){
      if (this === undefined) {
        return '[object Undefined]';
      } else if (this === null) {
        return '[object Null]';
      } else {
        return %objectToString(this);
      }
    },
    function toLocaleString(){
      return this.toString();
    },
    function valueOf(){
      return %ToObject(this);
    },
    %hasOwnProperty,
    %isPrototypeOf,
    %propertyIsEnumerable
  ]);


  // ##############
  // ### RegExp ###
  // ##############

  function RegExp(pattern){
    return %RegExpCreate(%ToString(pattern));
  }

  setupConstructor(RegExp, %RegExpProto);


  // ###########
  // ### Set ###
  // ###########

  function Set(iterable){}
  setupConstructor(Set, %SetProto);



  // ##############
  // ### String ###
  // ##############

  function String(string){
    string = arguments.length ? %ToString(string) : '';
    if (%isConstructCall()) {
      return %StringCreate(string);
    } else {
      return string;
    }
  }

  setupConstructor(String, %StringProto);

  defineMethods(String.prototype, [
    function toString(){
      if (%getNativeBrand(this) === 'String') {
        return %getPrimitiveValue(this);
      } else {
        throw %exception("not_generic", ["String.prototype.toString"]);
      }
    },
    function valueOf(){
      if (%getNativeBrand(this) === 'String') {
        return %getPrimitiveValue(this);
      } else {
        throw %exception("not_generic", ["String.prototype.valueOf"]);
      }
    },
  ]);


  %wrapStringMethods(String.prototype);


  // ###############
  // ### WeakMap ###
  // ###############

  function WeakMap(iterable){}
  setupConstructor(WeakMap, %WeakMapProto);



  function Error(message){
    this.message = message;
  }
  setupConstructor(Error, %ErrorProto);

  defineMethods(Error.prototype, [
    function toString(){
      return this.name + ': '+this.message;
    }
  ]);

  function EvalError(message){
    this.message = message;
  }
  setupConstructor(EvalError, %EvalErrorProto);

  function RangeError(message){
    this.message = message;
  }
  setupConstructor(RangeError, %RangeErrorProto);

  function ReferenceError(message){
    this.message = message;
  }
  setupConstructor(ReferenceError, %ReferenceErrorProto);

  function SyntaxError(message){
    this.message = message;
  }
  setupConstructor(SyntaxError, %SyntaxErrorProto);

  function TypeError(message){
    this.message = message;
  }
  setupConstructor(TypeError, %TypeErrorProto);

  function URIError(message){
    this.message = message;
  }
  setupConstructor(URIError, %URIErrorProto);


  %defineDirect(global, 'Math', %MathCreate(), 6);
  %defineDirect(global, 'JSON', %JSONCreate(), 6);


  defineMethods(global, [
    %parseInt,
    %parseFloat,
    %decodeURI,
    %encodeURI,
    %decodeURIComponent,
    %encodeURIComponent,
    %escape,
    %eval,
    function isNaN(number){
      number = %ToNumber(number);
      return number !== number;
    },
    function isFinite(number){
      number = %ToNumber(number);
      return number === number && number !== Infinity && number !== -Infinity;
    }
  ]);
})(this)
