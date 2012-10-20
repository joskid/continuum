(function(global){
  var ___ =  0,
      E__ =  1,
      _C_ =  2,
      EC_ =  3,
      __W =  4,
      E_W =  5,
      _CW =  6,
      ECW =  7,
      __A =  8,
      E_A =  9,
      _CA = 10,
      ECA = 11;


  %defineDirect(global, 'console', {
    log(v){
      %writeln(v);
    }
  }, _CW);



  function defineMethods(obj, props){
    for (var k in props) {
      %defineDirect(obj, k, props[k], _CW);
      %deleteDirect(props[k], 'prototype');
    }
  }

  function setupConstructor(ctor, proto){
    %defineDirect(ctor, 'prototype', proto, ___);
    %defineDirect(ctor.prototype, 'constructor', ctor, ___);
    %defineDirect(global, ctor.name, ctor, _CW);
  }


  // #############
  // ### Array ###
  // #############

  function Array(...args){
    if (args.length === 1 && typeof n === 'number') {
      args.length = args[0];
      delete args[0];
      return args;
    } else {
      return args;
    }
  }

  setupConstructor(Array, %ArrayProto);


  defineMethods(Array, {
    isArray(array){
      return %getNativeBrand(array) === 'Array';
    }
  });

  defineMethods(Array.prototype, {
    forEach(callback, context){
      context = context || this;
      for (var i=0; i < this.length; i++) {
        if (%hasOwnDirect(this, i)) {
          callback.call(context, this[i], i, this);
        }
      }
    },
    map(callback, context){
      var out = [];
      context = context || this;
      for (var i=0; i < this.length; i++) {
        if (%hasOwnDirect(this, i)) {
          out.push(callback.call(context, this[i], i, this));
        }
      }
      return out;
    },
    join(joiner){
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
    push(...args){
      var len = this.length;
      for (var i=0; i < args.length; i++) {
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
    if (%isConstructCall()) {
      return %BooleanCreate(%ToBoolean(arg));
    } else {
      return %ToBoolean(arg);
    }
  }

  setupConstructor(Boolean, %BooleanProto);

  defineMethods(Boolean.prototype, {
    toString(){
      if (%getNativeBrand(this) === 'Boolean') {
        return %getPrimitiveValue(this) ? 'true' : 'false';
      } else {
        // throw
      }
    },
    valueOf(){
      if (%getNativeBrand(this) === 'Boolean') {
        return %getPrimitiveValue(this);
      } else {
        // throw
      }
    }
  });


  // ############
  // ### Date ###
  // ############

  function Date(arg){
    return %DateCreate(arg);
  }

  setupConstructor(Date, %DateProto);

  defineMethods(Date.prototype, {
    toString(){
      if (%getNativeBrand(this) === 'Date') {
        return %dateToString(this);
      } else {
        // throw
      }
    },
    valueOf(){
      if (%getNativeBrand(this) === 'Date') {
        return %dateToNumber(this);
      } else {
        // throw
      }
    }
  });


  // ################
  // ### Function ###
  // ################

  function Function(...args){
    return %FunctionCreate(args);
  }

  %defineDirect(%FunctionProto, 'name', 'Empty', ___);

  setupConstructor(Function, %FunctionProto);

  defineMethods(Function.prototype, {
    call: %call,
    apply: %apply
  });


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

  defineMethods(Number.prototype, {
    toString(radix){
      if (%getNativeBrand(this) === 'Number') {
        return %numberToString(this, radix);
      } else {
        // throw
      }
    },
    valueOf(){
      if (%getNativeBrand(this) === 'Number') {
        return %getPrimitiveValue(this);
      } else {
        // throw
      }
    }
  });


  // ##############
  // ### Object ###
  // ##############

  function Object(obj){
    if (%isConstructCall() || obj == null) {
      return this;
    } else {
      return %ToObject(obj);
    }
  }

  setupConstructor(Object, %ObjectProto);


  defineMethods(Object, {
    defineProperty(object, key, desc){
      if (!(object instanceof Object)) {
      }
      %DefineOwnProperty(object, key, desc);
      return object;
    },
    defineProperties(object, descs){
      for (var key in descs) {
        %DefineOwnProperty(object, key, descs[key]);
      }
      return object;
    },
    create(proto, descs){
      var object = %ObjectCreate(proto);
      if (descs) {
        for (var key in descs) {
          %DefineOwnProperty(object, key, descs[key]);
        }
      }
      return object;
    },
    is(a, b){
      return a is b;
    },
    isExtensible: %isExtensible,
    keys: %keys,
    getOwnPropertyNames: %getOwnPropertyNames,
    getOwnPropertyDescriptor: %getOwnPropertyDescriptor
  });

  defineMethods(Object.prototype, {
    toString(){
      if (this === undefined) {
        return '[object Undefined]';
      } else if (this === null) {
        return '[object Null]';
      } else {
        return %objectToString(this);
      }
    },
    toLocaleString(){
      return this.toString();
    },
    valueOf(){
      return this;
    },
    hasOwnProperty: %hasOwnProperty,
    isPrototypeOf: %isPrototypeOf,
    propertyIsEnumerable: %propertyIsEnumerable
  });


  // ##############
  // ### RegExp ###
  // ##############

  function RegExp(arg){
    return %RegExpCreate(''+arg);
  }

  setupConstructor(RegExp, %RegExpProto);


  // ##############
  // ### String ###
  // ##############

  function String(arg){
    arg = arguments.length ? %ToString(arg) : '';
    if (%isConstructCall()) {
      return %StringCreate(arg);
    } else {
      return arg;
    }
  }

  setupConstructor(String, %StringProto);

  defineMethods(String.prototype, {
    toString(){
      if (%getNativeBrand(this) === 'String') {
        return %getPrimitiveValue(this);
      } else {
        // throw
      }
    },
    valueOf(){
      if (%getNativeBrand(this) === 'String') {
        return %getPrimitiveValue(this);
      } else {
        // throw
      }
    },
    charAt(pos){
      pos = pos | 0;
      if (pos < 0 || pos >= this.length) {
        return '';
      } else {
        return this[pos];
      }
    },
    charCodeAt(pos){
      pos = pos | 0;
      if (pos < 0 || pos >= this.length) {
        return NaN;
      } else {
        return %charCode(this[pos]);
      }
    },
    concat(...args){ }
  });

  defineMethods(global, {
    parseInt: %parseInt,
    parseFloat: %parseFloat,
    decodeURI: %decodeURI,
    encodeURI: %encodeURI,
    decodeURIComponent: %decodeURIComponent,
    encodeURIComponent: %encodeURIComponent,
    escape: %escape,
  });

})(this);
