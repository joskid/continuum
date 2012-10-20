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
    log: function log(v){
      %writeln(v);
    }
  }, _CW);



  function defineMethods(obj, props){
    for (var i=0; i < props.length; i++) {
      %defineDirect(obj, props[i].name, props[i], _CW);
      %deleteDirect(props[i], 'prototype');
    }
  }

  function setupConstructor(ctor, proto){
    %defineDirect(ctor, 'prototype', proto, ___);
    %defineDirect(ctor.prototype, 'constructor', ctor, ___);
    %defineDirect(global, ctor.name, ctor, _CW);
  }



  function Object(obj){
    if (%isConstructCall() || obj == null) {
      return this;
    } else {
      return %ToObject(obj);
    }
  }

  setupConstructor(Object, %ObjectProto);


  defineMethods(Object, [
    function defineProperty(object, key, desc){
      if (!(object instanceof Object)) {
      }
      %DefineOwnProperty(object, key, desc);
      return object;
    },
    function defineProperties(object, descs){
      for (var key in descs) {
        %DefineOwnProperty(object, key, descs[key]);
      }
      return object;
    },
    function create(proto, descs){
      var object = %ObjectCreate(proto);
      if (descs) {
        for (var key in descs) {
          %DefineOwnProperty(object, key, descs[key]);
        }
      }
      return object;
    },
    %isExtensible,
    %keys,
    %getOwnPropertyNames,
    %getOwnPropertyDescriptor,
  ]);

  defineMethods(Object.prototype, [
    function toString(){
      if (this === undefined) {
        return '[object Undefined]';
      } else if (this === null) {
        return '[object Null]';
      } else {
        return %getNativeBrand(this);
      }
    },
    function toLocaleString(){
      return this.toString();
    },
    function valueOf(){
      return this;
    },
    %hasOwnProperty,
    %isPrototypeOf,
    %propertyIsEnumerable
  ]);


  function Array(n){
    var out = [];
    if (arguments.length === 1 && typeof n === 'number') {
      out.length = n;
    } else {
      for (var k in arguments) {
        out[k] = arguments[k];
      }
    }
    return out;
  }

  setupConstructor(Array, %ArrayProto);


  console.log(new Array(5, 10, 20));
})(this);
