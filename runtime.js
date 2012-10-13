void function(){
  function define(o, v){
    Object.defineProperty(o, v.name, { configurable: true, writable: true, value: v });
  }

  define(Array.prototype, function forEach(callback, context){
    context = context || this;

    for (var i=0; i < this.length; i++) {
      callback.call(context, this[i], i, this);
    }
  });

  define(Array.prototype, function map(callback, context){
    var out = [];

    context = context || this;
    for (var i=0; i < this.length; i++) {
      out.push(callback.call(context, this[i], i, this));
    }

    return out;
  });

  define(Array.prototype, function reduce(callback, start){
    if (arguments.length < 2) {
      var index = 1;
      start = this[0];
    } else {
      var index = 0;
    }
    for (; index < this.length; index++) {
      start = callback.call(this, start, this[index], index, this);
    }
    return start;
  });

  define(Array.prototype, function map(callback, context){
    var out = [];

    context = context || this;
    for (var i=0; i < this.length; i++) {
      out.push(callback.call(context, this[i], i, this));
    }

    return out;
  });


  define(Array.prototype, function filter(callback){
    var out = [];
    for (var i=0; i < this.length; i++) {
      if (callback.call(this, this[i], i)) {
        out.push(this[i]);
      }
    }
  });

  function ArrayIterator(array){
    var index = 0;
    this.next = () => {
      if (index < array.length) {
        return array[index++];
      } else {
        throw StopIteration;
      }
    };
  }
  define(Array.prototype, function iterator(){
    return new ArrayIterator(this);
  });

}();
global = this;
  // define(Array.prototype, function iterator(){
  //   var index = 0;
  //   return {
  //     next: () => {
  //       if (index < this.length) {
  //         return this[index++];
  //       } else {
  //         throw StopIteration;
  //       }
  //     }
  //   };
  //['filter', 'every', 'some', 'sort', 'reduceRight']


var builtins = {
  Object: {
    Call: function(receiver, args, Ω, ƒ){
      ToObject(args[0], Ω, ƒ);
    },
    Construct: function(receiver, args, Ω, ƒ){
      Ω(new $Object(intrinsics.ObjectPrototype));
    },
    defineProperty: function(receiver, args, Ω, ƒ){
      var object = args[0],
          key    = args[1],
          desc   = args[2];

      if (object instanceof $Object) {
        throwException('called_on_non_object', [], ƒ);
      } else if (!isObject(desc)) {
        throwException('property_desc_object', [typeof descs[k]], ƒ);
      } else {
        object.DefineOwnProperty(key, desc, false, Ω, ƒ);
      }
    },
    defineProperties: function(receiver, args, Ω, ƒ){
      var object = args[0],
          descs  = args[1];

      if (object instanceof $Object) {
        throwException('called_on_non_object', [], ƒ);
      } else if (!isObject(desc)) {
        throwException('property_desc_object', [typeof descs], ƒ);
      } else {
        descs = descs.properties;
        for (var k in descs) {
          if (!isObject(descs[k]))
            throwException('property_desc_object', [typeof descs[k]], ƒ);
          object.DefineOwnProperty(k, descs[k], false, RETURNS(object), ƒ)
        }
      }
    },
    create: function(receiver, args, Ω, ƒ){
      var proto = args[0],
          descs = args[1];

      if (proto !== null && !(proto instanceof $Object)) {
        throwException('proto_object_or_null', [], ƒ);
      } else {
        var object = new $Object(proto);
        if (descs) {
          builtins.Object.defineProperties([object], descs, Ω, ƒ);
        } else {
          Ω(object);
        }
      }
    },
    prototype: {
      toString: function(receiver, args, Ω, ƒ){

      },
      valueOf: function(receiver, args, Ω, ƒ){

      },
      hasOwnProperty: function(receiver, args, Ω, ƒ){
        var key = args[0];
      },
      isPrototypeOf: function(receiver, args, Ω, ƒ){
        var object = args[0];
      },
      propertyIsEnumerable: function(receiver, args, Ω, ƒ){
        var key = args[0];
      },
      toLocaleString: function(receiver, args, Ω, ƒ){

      },
      __defineGetter__: function(receiver, args, Ω, ƒ){
        var key  = args[0],
            func = args[1];
      },
      __defineSetter__: function(receiver, args, Ω, ƒ){
        var key  = args[0],
            func = args[1];
      },
      __lookupGetter__: function(receiver, args, Ω, ƒ){
        var key  = args[0],
            func = args[1];
      },
      __lookupSetter__: function(receiver, args, Ω, ƒ){
        var key  = args[0],
            func = args[1];
      },
    }
  }
};
