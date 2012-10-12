  var errors = require('./errors');

  var BOOLEAN   = 'boolean',
      FUNCTION  = 'function',
      NUMBER    = 'number',
      OBJECT    = 'object',
      STRING    = 'string',
      UNDEFINED = 'undefined';

  var MISSING  = 0,
      DATA     = 1,
      ACCESSOR = 2;

  var ENUMERABLE   = 0x1,
      CONFIGURABLE = 0x2,
      WRITABLE     = 0x4,
      ISACCESSOR   = 0x8;

  var ___ = 0,
      E__ = 1,
      _C_ = 2,
      EC_ = 3,
      __W = 4,
      E_W = 5,
      _CW = 6,
      ECW = 7,
      __A = 8,
      E_A = 9,
      _CA = 10,
      ECA = 11;

  var NOARGS = [];

  // ##################################################
  // ### Internal Utilities not from specification ####
  // ##################################################

  var create = Object.create && !Object.create(null).toString
    ? Object.create
    : (function(F, empty){
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.src = 'javascript:';
        empty = iframe.contentWindow.Object.prototype;
        document.body.removeChild(iframe);
        iframe = null;
        delete empty.constructor;
        delete empty.hasOwnProperty;
        delete empty.propertyIsEnumerable;
        delete empty.isProtoypeOf;
        delete empty.toLocaleString;
        delete empty.toString;
        delete empty.valueOf;

        function create(object){
          F.prototype = object === null ? empty : object;
          object = new F;
          F.prototype = null;
          return object;
        }
        return create;
      })(function(){});

  function Hash(){}
  Hash.prototype = create(null);

  var nextTick = typeof process !== UNDEFINED ? process.nextTick : function(f){ setTimeout(f, 1) };

  function noop(){}

  function isObject(v){
    return typeof v === OBJECT ? v !== null : typeof v === FUNCTION;
  }

  function define(o, p, v){
    switch (typeof p) {
      case STRING:
        return Object.defineProperty(o, p, { configurable: true, writable: true, value: v });
      case FUNCTION:
        return Object.defineProperty(o, p.name, { configurable: true, writable: true, value: p });
      case OBJECT:
        if (p instanceof Array) {
          for (var i=0; i < p.length; i++) {
            var f = p[i];
            if (typeof f === FUNCTION && f.name) {
              var name = f.name;
            } else if (typeof f === STRING && typeof p[i+1] !== FUNCTION || !p[i+1].name) {
              var name = f;
              f = p[i+1];
            }
            if (name) {
              Object.defineProperty(o, name, { configurable: true, writable: true, value: f });
            }
          }
        } else if (p) {
          var keys = Object.keys(p)

          for (var i=0; i < keys.length; i++) {
            var k = keys[i];
            var desc = Object.getOwnPropertyDescriptor(p, k);
            if (desc) {
              desc.enumerable = 'get' in desc;
              Object.defineProperty(o, k, desc);
            }
          }
        }
    }

    return o;
  }

  function inherit(Ctor, Super, properties, methods){
    define(Ctor, { inherits: Super });
    Ctor.prototype = Object.create(Super.prototype, {
      constructor: { configurable: true, writable: true, value: Ctor }
    });
    properties && define(Ctor.prototype, properties);
    methods && define(Ctor.prototype, methods);
    return Ctor;
  }


  function throwException(error, args, Ω){
    error = errors[error];
    error.apply(null, [null, function(err){
      Ω(new Completion(THROW, err));
    }].concat(args));
  }



  function Symbol(name){
    this.name = name;
  }

  define(Symbol.prototype, [
    function toString(){
      return '[object Symbol]';
    },
    function inspect(){
      return '['+this.name+']';
    }
  ]);


  function Accessor(get, set){
    this.get = get;
    this.set = set;
  }

  Accessor.prototype.get = undefined;
  Accessor.prototype.set = undefined;


  function PropertyList(list){
    this.hash = new Hash;
    this.keys = [];
    this.add(list);
  }

  define(PropertyList.prototype, [
    function add(key){
      if (typeof key === 'string') {
        if (!(key in this.hash)) {
          this.hash[key] = this.keys.push(key);
        }
      } else if (key instanceof PropertyList) {
        key.forEach(function(key){
          this.add(key);
        }, this);
      } else if (key instanceof Array) {
        for (var i=0; i < key.length; i++)
          this.add(key[i]);
      }
    },
    function remove(key){
      if (key in this.hash) {
        this.keys.splice(this.hash[key], 1);
        delete this.hash[key];
        return true;
      } else {
        return false;
      }
    },
    function has(key){
      return key in this.hash;
    },
    function forEach(callback, context){
      context = context || this;
      for (var i=0; i < this.keys.length; i++)
        callback.call(context, this.keys[i], i, this);
    },
    function map(callback, context){
      var out = new PropertyList;
      context = context || this;
      for (var i=0; i < this.keys.length; i++)
        out.push(callback.call(context, this.keys[i], i, this));
      return out;
    },
    function filter(callback, context){
      var out = new PropertyList;
      context = context || this;
      for (var i=0; i < this.keys.length; i++) {
        if (callback.call(context, this.keys[i], i, this))
          out.add(this.keys[i]);
      }
      return out;
    },
    function clone(){
      return new PropertyList(this);
    },
    function toArray(){
      return this.keys.slice();
    },
  ]);

  function RETURNS(v, Ω){
    return function(){ Ω(v) }
  }

  function TRUE(Ω){
    return function(){ Ω(true) };
  }

  function FALSE(Ω){
    return function(){ Ω(false) };
  }

  function THROWS(msg, args, Ω){
    return function(){ throwException(msg, args, Ω); };
  }

  function EVERY(funcs, Ω1, Ω2, ƒ){
    var i = 0;
    function next(v){
      if (v) {
        if (++i === funcs.length - 1)
          next = Ω1;
        funcs[i](NOARGS, next, ƒ);
      } else {
        Q2();
      }
    }
    funcs[i](NOARGS, next);
  }

  function SOME(funcs, Ω1, Ω2, ƒ){
    var i = 0, found;
    function next(v){
      if (v) {
        found = true;
      }
      if (++i === funcs.length - 1)
        next = found ? Ω1 : Q2;
      funcs[i](NOARGS, next, ƒ);
    }
    funcs[i](NOARGS, next);
  }

  function SEQUENCE(funcs, Ω, ƒ){
    var i = 0;
    function next(v){
      if (++i === funcs.length - 1)
        next = Ω;
      funcs[i](v, next, ƒ);
    }
    funcs[i](NOARGS, next);
  }

  function DISCARD(func, args){
    return function(_, Ω, ƒ){
      func(args, Ω, ƒ)
    };
  }

  function PASS(func){
    return function(v, Ω, ƒ){
      func([v], Ω, ƒ);
    };
  }

  function APPEND(func, args){
    return function(v, Ω, ƒ){
      func(args.concat(v), Ω, ƒ);
    };
  }

  function IF(condition, consequent, alternate){
    return function(input, Ω, ƒ){
      condition(input, function(result){
        if (result)
          consequent(input, Ω, ƒ);
        else
          alternate(input, Ω, ƒ);
      }, ƒ);
    };
  }

  function COMPARE(left, right, compare){
    return function(Ω, ƒ){
      left(function(left){
        right(function(right){
          compare(left, right, Ω, ƒ);
        }, ƒ);
      }, ƒ);
    };
  }

  function copyIfHas(args, Ω, ƒ){
    var from = args[0],
        to   = args[1],
        key  = args[2];

    from.HasProperty(key, function(has){
      if (has) {
        from.Get(key, function(value){
          to.Put(key, value, Ω, ƒ);
        }, ƒ);
      } else {
        Ω();
      }
    }, ƒ);
  }


  // ###############################
  // ###############################
  // ### Specification Functions ###
  // ###############################
  // ###############################

  // ## FromPropertyDescriptor

  function FromPropertyDescriptor(desc){
    var obj = new $Object;
    if (IsDataDescriptor(desc)) {
      obj.setDirect('value', desc.value);
      obj.setDirect('writable', desc.writable);
    } else if (IsAccessorDescriptor(desc))  {
      obj.setDirect('get', desc.get);
      obj.setDirect('set', desc.set);
    }
    obj.setDirect('enumerable', desc.enumerable);
    obj.setDirect('configurable', desc.configurable);
    return obj;
  }

  // ## ToPropertyDescriptor

  function ToPropertyDescriptor(obj, Ω, ƒ) {
    if (!(obj instanceof $Object))
      return throwException('property_desc_object', [typeof obj], ƒ);

    var desc = new $Object;

    SEQUENCE([
      DISCARD(copyIfHas, [desc, obj, 'value']),
      DISCARD(copyIfHas, [desc, obj, 'writable']),
      DISCARD(copyIfHas, [desc, obj, 'enumerable']),
      DISCARD(copyIfHas, [desc, obj, 'configurable']),
      DISCARD(copyIfHas, [desc, obj, 'get']),
      DISCARD(copyIfHas, [desc, obj, 'set']),
    ], function(){
      var props = desc.properties;

      if ('get' in props) {
        if (props.get !== undefined && !IsCallable(props.get))
          return throwException('getter_must_be_callable', [typeof props.get], ƒ);
      }

      if ('set' in props) {
        if (props.set !== undefined && !IsCallable(props.set))
          return throwException('setter_must_be_callable', [typeof props.set], ƒ);
      }

      if (('get' in props || 'set' in props) && ('value' in props || 'writable' in props))
        return throwException('value_and_accessor', [desc], ƒ);

      Ω(desc);
    }, ƒ);
  }

  // ## IsAccessorDescriptor

  function IsAccessorDescriptor(desc) {
    return desc === undefined ? false : 'get' in desc || 'set' in desc;
  }

  // ## IsDataDescriptor

  function IsDataDescriptor(desc) {
    return desc === undefined ? false : 'value' in desc || 'writable' in desc;
  }

  // ## IsGenericDescriptor

  function IsGenericDescriptor(desc) {
    return desc === undefined ? false : !(IsAccessorDescriptor(desc) || IsDataDescriptor(desc));
  }

  // ## ToCompletePropertyDescriptor

  function ToCompletePropertyDescriptor(obj, Ω, ƒ) {
    ToPropertyDescriptor(obj, function(desc){
      var props = desc.props;
      'enumerable' in props   || desc.setDirect('enumerable', false);
      'configurable' in props || desc.setDirect('configurable', false);
      if (IsGenericDescriptor(props) || IsDataDescriptor(props)) {
        'value' in props    || desc.setDirect('value', undefined);
        'writable' in props || desc.setDirect('writable', false);
      } else {
        'get' in desc || desc.setDirect('get', undefined);
        'set' in desc || desc.setDirect('set', undefined);
      }
      Ω(desc);
    }, ƒ);
  }

  // ## IsEmptyDescriptor

  function IsEmptyDescriptor(desc) {
    return !('get' in desc
          || 'set' in desc
          || 'value' in desc
          || 'writable' in desc
          || 'enumerable' in desc
          || 'configurable' in desc);
  }

  // ## SameValue

  function SameValue(x, y) {
    return x === y ? (x !== 0 || 1 / x === 1 / y) : (x !== x && y !== y);
  }

  // ## IsEquivalentDescriptor

  function IsEquivalentDescriptor(a, b) {
    return SameValue(a.get, b.get) &&
           SameValue(a.set, b.set) &&
           SameValue(a.value, b.value) &&
           SameValue(a.writable, b.writable) &&
           SameValue(a.enumerable, b.enumerable) &&
           SameValue(a.configurable, b.configurable);
  }

  // ## GetIdentifierReference

  function GetIdentifierReference(lex, name, strict, Ω, ƒ){
    if (lex === null) {
      Ω(new Reference(undefined, name, strict));
    } else {
      lex.HasBinding(name, function(result){
        if (result)
          Ω(new Reference(lex.bindings, name, strict));
        else
          GetIdentifierReference(lex.outer, name, strict, Ω, ƒ);
      }, ƒ);
    }
  }

  // ## HasPrimitiveBase

  function HasPrimitiveBase(v){
    var type = typeof v.base;
    return type === STRING || type === NUMBER || type === BOOLEAN;
  }

  // ## IsPropertyReference

  function IsPropertyReference(v){
    return HasPrimitiveBase(v) || v.base instanceof $Object;
  }

  // ## IsUnresolvableReference

  function IsUnresolvableReference(v){
    return v.base === undefined;
  }

  // ## IsSuperReference

  function IsSuperReference(v){
    return 'thisValue' in v;
  }


  // ## GetValue

  function GetValue(v, Ω, ƒ){
    if (!(v instanceof Reference)) {
      Ω(v);
    } else if (IsUnresolvableReference(v)) {
      throwError('non_object_property_load', [v.name, v.base], ƒ);
    } else {
      var base = v.base;

      if (HasPrimitiveBase(v)) {
        base = new $PrimitiveBase(base);
      }

      if (base instanceof $Object) {
        if (IsSuperReference(v)) {
          GetThisValue(v, function(receiver){
            base.GetP(receiver, v.name, Ω, ƒ);
          }, ƒ);
        } else {
          base.Get(v.name, Ω, ƒ);
        }
      } else {
        base.GetBindingValue(v.name, v.strict, Ω, ƒ);
      }
    }
  }

  // ## PutValue

  function PutValue(v, w, Ω, ƒ){
    if (!(v instanceof Reference)) {
      throwError('non_object_property_store', [v.name, v.base], ƒ);
    } else if (IsUnresolvableReference(v)) {
      if (v.strict)
        throwError('not_defined', [v.name, v.base], ƒ);
      else
        global.Put(v.name, w, false, Ω, ƒ);
    } else {
      var base = v.base;

      if (HasPrimitiveBase(v)) {
        base = new $PrimitiveBase(base);
      }

      if (base instanceof $Object) {
        if (IsSuperReference(v)) {
          base.Put(v.name, w, v.strict, Ω, ƒ);
        } else {
          GetThisValue(v, function(receiver){
            base.SetP(receiver, v.name, w, v.strict, Ω, ƒ);
          }, ƒ);
        }
      } else {
        base.SetMutableBinding(v.name, w, v.strict, Ω, ƒ);
      }
    }
  }

  // ## GetThisValue

  function GetThisValue(v, Ω, ƒ){
    if (!(v instanceof Reference))
      Ω(v);
    else if (IsUnresolvableReference(v))
      throwError('non_object_property_load', [v.name, v.base], ƒ);
    else if ('thisValue' in v)
      Ω(v.thisValue);
    else
      Ω(v.base);
  }


  // ## GetThisEnvironment

  function GetThisEnvironment(Ω, ƒ){
    void function recurse(env){
      env.HasThisBinding(function(result){
        result ? Ω(env) : recurse(env.outer);
      }, ƒ)
    }(context.lexical);
  }

  // ## NewObjectEnvironment

  function NewObjectEnvironment(outer, object){
    var lex = new ObjectEnvironmentRecord(object);
    lex.outer = outer;
    return lex;
  }

  // ## NewDeclarativeEnvironment

  function NewDeclarativeEnvironment(outer){
    var lex = new DeclarativeEnvironmentRecord;
    lex.outer = outer;
    return lex;
  }

  // ## NewMethodEnvironment

  function NewMethodEnvironment(method, receiver){
    var lex = new MethodEnvironmentRecord(receiver, method.Home, method.MethodName);
    lex.outer = method.scope;
    return lex;
  }

  // ## ReturnIfAbrupt

  // this function is unneccessary due to separate continuation channel for abrupt completions
  // function ReturnIfAbrupt(value, Ω, ƒ){
  //   if (value instanceof Completion) {
  //     if (value.type === NORMAL) {
  //       Ω(value.value);
  //     } else {
  //       ƒ(value);
  //     }
  //   } else {
  //     Ω(value);
  //   }
  // }

  function ToPrimitive(argument, hint, Ω, ƒ){
    if (typeof argument === OBJECT) {
      if (argument === null) {
        Ω(argument);
      } else {
        argument.DefaultValue(hint, function(primitive){
          ToPrimitive(primitive, hint, Ω, ƒ);
        }, ƒ);
      }
    } else {
      Ω(argument);
    }
  }

  function ToBoolean(argument, Ω, ƒ){
    Ω(!!argument);
  }

  function ToNumber(argument, Ω, ƒ){
    if (argument !== null && typeof argument === OBJECT) {
      ToPrimitive(argument, 'Number', function(result){
        ToNumber(result, Ω, ƒ);
      }, ƒ);
    } else {
      Ω(+argument);
    }
  }

  function ToInteger(argument, Ω, ƒ){
  ToNumber(argument, function(number){
      Ω(number | 0);
    }, ƒ);
  }

  function ToUint32(argument, Ω, ƒ) {
    ToNumber(argument, function(number){
      Ω(number >> 0);
    }, ƒ);
  }

  function ToInt32(argument, Ω, ƒ) {
    ToNumber(argument, function(number){
      Ω(number >>> 0);
    }, ƒ);
  }


  function ToObject(argument, Ω, ƒ) {
    switch (typeof argument) {
      case BOOLEAN:
        Ω(new $Boolean(argument));
        break;
      case NUMBER:
        Ω(new $Number(argument));
        break;
      case STRING:
        Ω(new $String(argument));
        break;
      case UNDEFINED:
        throwException('undefined_to_object', [], ƒ);
        break;
      case OBJECT:
        if (argument === null) {
          throwException('null_to_object', [], ƒ);
        } else {
          Ω(argument);
        }
    }
  }

  function ToPropertyKey(argument, Ω, ƒ){
    if (argument !== null && typeof argument === OBJECT && argument.NativeBrand === NativePrivateName) {
      Ω(argument);
    } else {
      ToString(argument, Ω, ƒ);
    }
  }

  function ToString(argument, Ω, ƒ){
    if (argument === undefined) Ω('undefined');
    else if (argument === null) Ω('null');
    else if (argument === true) Ω('true');
    else if (argument === false) Ω('false');
    else if (typeof argument === STRING) Ω(argument);
    else if (typeof argument === NUMBER) Ω(''+argument);
    else if (typeof argument === OBJECT) {
      ToPrimitive(argument, 'String', function(prim){
        ToString(prim, Ω, ƒ);
      }, ƒ);
    }
  }

  // ## IsCallable

  function IsCallable(argument, Ω, ƒ){
    if (typeof argument === OBJECT && argument !== null) {
      Ω('Call' in argument);
    } else {
      Ω(false);
    }
  }

  // ## CheckObjectCoercible

  function CheckObjectCoercible(argument, Ω, ƒ){
    if (argument === null) {
      throwException('null_to_object', [], ƒ);
    } else if (argument === undefined) {
      throwException('undefined_to_object', [], ƒ);
    } else {
      Ω(argument);
    }
  }

  // ## Invoke

  function Invoke(key, receiver, args, Ω, ƒ){
    ToObject(receiver, function(obj){
      obj.Get(key, function(func){
        IsCallable(func, function(callable){
          if (callable)
            func.Call(receiver, args, Ω, ƒ);
          else
            throwException('called_non_callable', key, ƒ);
        }, ƒ);
      }, ƒ);
    }, ƒ);
  }

  function ArgAccessor(name, env){
    this.get = function(Ω, ƒ){
      env.GetBindingValue(name, Ω, ƒ);
    };
    this.set = function(args, Ω, ƒ){
      env.SetMutableBinding(name, args[0], Ω, ƒ);
    };
  }


  function CreateStrictArgumentsObject(args){
    var obj = new $Arguments(args.length);

    for (var i=0; i < args.length; i++)
      obj.defineDirect(i, args[i], ECW);

    //obj.defineDirect('caller', intrinsics.ThrowTypeError, __A);
    //obj.defineDirect('arguments', intrinsics.ThrowTypeError, __A);
    return obj;
  }


  function CreateMappedArgumentsObject(func, names, env, args){
    var obj = new $Arguments(args.length),
        map = new $Object,
        mapped = create(null),
        count = 0;

    for (var i=0; i < args.length; i++) {
      obj.defineDirect(i, args[i], ECW);
      var name = names[i];
      if (i < names.length && !(name in mapped)) {
        count++;
        mapped[name] = true;
        map.defineDirect(names[i], new ArgAccessor(name, env), _CA);
      }
    }

    if (count) {
      obj.ParameterMap = map;
    }
    obj.defineDirect('callee', func, _CW);
    return obj;
  }

  // ###########################
  // ###########################
  // ### Specification Types ###
  // ###########################
  // ###########################



  // #################
  // ### Reference ###
  // #################

  function Reference(base, name, strict){
    this.base = base;
    this.name = name;
    this.strict = strict;
  }

  // ##################
  // ### Completion ###
  // ##################


  var CONTINUE = new Symbol('continue'),
      BREAK    = new Symbol('break'),
      RETURN   = new Symbol('return'),
      THROW    = new Symbol('throw');


  function Completion(type, value, target){
    this.type = type;
    this.value = value;
    this.target = target;
  }

  define(Completion.prototype, [
    function toString(){
      return this.value;
    },
    function valueOf(){
      return this.value;
    }
  ]);

  // ##########################
  // ### PropertyDescriptor ###
  // ##########################

  function PropertyDescriptor(attributes){
    this.enumerable = (attributes & ENUMERABLE) > 0;
    this.configurable = (attributes & CONFIGURABLE) > 0;
  }

  define(PropertyDescriptor.prototype, {
    enumerable: undefined,
    configurable: undefined
  });

  function DataDescriptor(value, attributes){
    this.value = value;
    this.writable = (attributes & WRITABLE) > 0;
    this.enumerable = (attributes & ENUMERABLE) > 0;
    this.configurable = (attributes & CONFIGURABLE) > 0;
  }

  inherit(DataDescriptor, PropertyDescriptor, {
    writable: undefined,
    value: undefined
  });
  var emptyValue = new DataDescriptor(undefined, ECW);

  function AccessorDescriptor(accessors, attributes){
    this.get = accessors.get;
    this.set = accessors.set;
    this.enumerable = (attributes & ENUMERABLE) > 0;
    this.configurable = (attributes & CONFIGURABLE) > 0;
  }

  inherit(AccessorDescriptor, PropertyDescriptor, {
    get: undefined,
    set: undefined
  });


  // #########################
  // ### EnvironmentRecord ###
  // #########################

  function EnvironmentRecord(bindings){
    this.bindings = bindings;
  }

  define(EnvironmentRecord.prototype, {
    bindings: null,
    thisValue: null,
    withBase: undefined
  });

  define(EnvironmentRecord.prototype, [
    function HasBinding(name, Ω, ƒ){
      throwAbstractInvocationError('EnvironmentRecord.prototype.HasBinding');
    },
    function GetBindingValue(name, strict, Ω, ƒ){
      throwAbstractInvocationError('EnvironmentRecord.prototype.GetBindingValue');
    },
    function SetMutableBinding(name, value, strict, Ω, ƒ){
      throwAbstractInvocationError('EnvironmentRecord.prototype.SetMutableBinding');
    },
    function DeleteBinding(name, Ω, ƒ){
      throwAbstractInvocationError('EnvironmentRecord.prototype.DeleteBinding');
    },
    function CreateVarBinding(name, deletable, Ω, ƒ){
      this.CreateMutableBinding(name, deletable, Ω, ƒ);
    },
    function WithBaseObject(Ω, ƒ){
      Ω(this.withBase);
    },
    function HasThisBinding(Ω, ƒ){
      Ω(false);
    },
    function HasSuperBinding(Ω, ƒ){
      Ω(false);
    },
    function GetThisBinding(Ω, ƒ){
      Ω();
    },
    function GetSuperBase(Ω, ƒ){
      Ω();
    }
  ]);


  function DeclarativeEnvironmentRecord(){
    EnvironmentRecord.call(this, new Hash);
    this.consts = new Hash;
    this.deletables = new Hash;
  }

  inherit(DeclarativeEnvironmentRecord, EnvironmentRecord, [
    function HasBinding(name, Ω, ƒ){
      Ω(name in this.bindings);
    },
    function CreateMutableBinding(name, deletable, Ω, ƒ){
      this.bindings[name] = undefined;
      if (deletable)
        this.deletables[name] = true;
      Ω();
    },
    function GetBindingValue(name, strict, Ω, ƒ){
      if (name in this.bindings) {
        var value = this.bindings[name];
        if (value === UNINITIALIZED)
          throwException('uninitialized_const', name, Ω, ƒ);
        else
          Ω(value);
      } else if (strict) {
        throwException('not_defined', name, Ω, ƒ);
      } else {
        Ω(false);
      }
    },
    function SetMutableBinding(name, value, strict, Ω, ƒ){
      if (name in this.consts) {
        if (this.bindings[name] === UNINITIALIZED)
          throwException('uninitialized_const', name, Ω, ƒ);
        else if (strict)
          throwException('const_assign', name, Ω, ƒ);
        else
          Ω();
      } else {
        this.bindings[name] = value;
        Ω();
      }
    },
    function CreateImmutableBinding(name, Ω, ƒ){
      this.bindings[name] = UNINITIALIZED;
      this.consts[name] = true;
      Ω();
    },
    function InititalizeBinding(name, value, Ω, ƒ){
      this.bindings[name] = value;
      Ω();
    },
    function DeleteBinding(name, Ω, ƒ){
      if (name in this.bindings) {
        if (name in this.deletables) {
          delete this.bindings[name];
          delete this.deletables[names];
          Ω(true);
        } else {
          Ω(false);
        }
      } else {
        Ω(true);
      }
    }
  ]);


  function ObjectEnvironmentRecord(object){
    EnvironmentRecord.call(this, object);
  }

  inherit(ObjectEnvironmentRecord, EnvironmentRecord, [
    function HasBinding(name, Ω, ƒ){
      this.bindings.HasProperty(name, Ω, ƒ);
    },
    function CreateMutableBinding(name, deletable, Ω, ƒ){
      this.bindings.DefineOwnProperty(name, emptyValue, true, Ω, ƒ);
    },
    function GetBindingValue(name, strict, Ω, ƒ){
      var self = this;
      this.bindings.HasProperty(name, function(result){
        if (result)
          self.bindings.Get(name, Ω, ƒ);
        else if (strict)
          throwException('not_defined', name, Ω, ƒ);
        else
          Ω();
      }, ƒ);
    },
    function SetMutableBinding(name, value, strict, Ω, ƒ){
      this.bindings.Put(name, value, strict, Ω, ƒ);
    },
    function DeleteBinding(name, Ω, ƒ){
      this.bindings.Delete(name, false, Ω, ƒ);
    }
  ]);


  function MethodEnvironmentRecord(receiver, holder, name){
    DeclarativeEnvironmentRecord.call(this);
    this.thisValue = receiver;
    this.HomeObject = holder;
    this.MethodName = name;
  }

  inherit(MethodEnvironmentRecord, DeclarativeEnvironmentRecord, {
    HomeObject: undefined,
    MethodName: undefined,
    ThisValue: undefined,
  }, [
    function HasThisBinding(Ω, ƒ){
      Ω(true);
    },
    function HasSuperBinding(Ω, ƒ){
      Ω(this.HomeObject !== undefined);
    },
    function GetThisBinding(Ω, ƒ){
      Ω(this.thisValue);
    },
    function GetSuperBase(Ω, ƒ){
      Ω(this.HomeObject ? this.HomeObject.Prototype : undefined);
    },
    function GetMethodName(Ω, ƒ) {
      Ω(this.MethodName);
    }
  ]);


  function GlobalEnvironmentRecord(global){
    ObjectEnvironmentRecord.call(this, global);
  }

  inherit(GlobalEnvironmentRecord, ObjectEnvironmentRecord, {
    outer: null
  }, [
    function HasThisBinding(Ω, ƒ){
      Ω(true);
    },
    function GetSuperBase(Ω, ƒ){
      Ω(this.bindings);
    }
  ]);


  // ##########################
  // ### LexicalEnvironment ###
  // ##########################


  function NativeBrand(name){
    this.name = name;
  }

  define(NativeBrand.prototype, [
    function toString(){
      return this.name;
    },
    function inspect(){
      return this.name;
    }
  ]);

  var NativeArguments   = new NativeBrand('Arguments'),
      NativeArray       = new NativeBrand('Array'),
      NativeDate        = new NativeBrand('Date'),
      NativeFunction    = new NativeBrand('Function'),
      NativeMap         = new NativeBrand('Map'),
      NativeObject      = new NativeBrand('Object'),
      NativePrivateName = new NativeBrand('PrivateName'),
      NativeRegExp      = new NativeBrand('RegExp'),
      NativeSet         = new NativeBrand('Set'),
      NativeWeakMap     = new NativeBrand('WeakMap'),
      BooleanWrapper    = new NativeBrand('Boolean'),
      NumberWrapper     = new NativeBrand('Number'),
      StringWrapper     = new NativeBrand('String');

  // ###############
  // ### $Object ###
  // ###############

  function $Object(proto){
    if (proto === null) {
      this.Prototype = null;
      this.properties = create(null);
      this.attributes = new Hash;
      this.keys = new PropertyList;
    } else {
      if (proto === undefined)
        proto = intrinsics.ObjectPrototype;
      this.Prototype = proto;
      this.properties = create(proto.properties);
      this.attributes = create(proto.attributes);
      this.keys = new PropertyList;
    }
  }

  define($Object.prototype, {
    Extensible: true,
    NativeBrand: NativeObject
  });

  define($Object.prototype, [
    function GetOwnProperty(key, Ω, ƒ){
      if (!this.keys.has(key)) {
        Ω();
      } else {
        var attrs = this.attributes[key];
        var Descriptor = attrs & ISACCESSOR ? AccessorDescriptor : DataDescriptor;
        Ω(new Descriptor(this.properties[key], attrs));
      }
    },
    function GetProperty(key, Ω, ƒ){
      var proto = this.Prototype;
      this.GetOwnProperty(key, function(desc){
        desc ? Ω(desc) : proto ? proto.GetProperty(key, Ω, ƒ) : Ω();
      }, ƒ);
    },
    function Get(key, Ω, ƒ){
      this.GetP(this, key, Ω, ƒ);
    },
    function Put(key, value, strict, Ω, ƒ){
      this.SetP(this, key, value, function(success){
        if (strict && !success)
          throwException('strict_cannot_assign', [key], ƒ);
        else
          Ω();
      }, ƒ);
    },
    function GetP(receiver, key, Ω, ƒ){
      if (!this.keys.has(key)) {
        if (this.Prototype === null) {
          Ω();
        } else {
          this.Prototype.GetP(receiver, key, Ω, ƒ);
        }
      } else {
        var attrs = this.attributes[key];
        if (attrs & ISACCESSOR) {
          var getter = this.properties[key].get;
          IsCallable(getter, function(callable){
            callable ? getter.Call(receiver, [], Ω, ƒ) : Ω();
          }, ƒ);
        } else {
          Ω(this.properties[key]);
        }
      }
    },
    function SetP(receiver, key, value, Ω, ƒ) {
      if (this.keys.has(key)) {
        var attrs = this.attributes[key];
        if (attrs & ISACCESSOR) {
          var setter = this.properties[key].set;
          IsCallable(setter, function(callable){
            callable ? setter.Call(receiver, [value], TRUE(Ω), ƒ) : Ω(false);
          }, ƒ);
        } else if (attrs & WRITABLE) {
          if (this === receiver) {
            this.DefineOwnProperty(key, { value: value }, false, Ω, ƒ);
          } else if (!receiver.Extensible) {
            Ω(false);
          } else {
            receiver.DefineOwnProperty(key, new DataDescriptor(value, ECW), false, Ω, ƒ);
          }
        } else {
          Ω(false);
        }
      } else {
        var proto = this.Prototype;
        if (proto === null) {
          if (!receiver.Extensible) {
            Ω(false);
          } else {
            receiver.DefineOwnProperty(key, new DataDescriptor(value, ECW), false, Ω, ƒ);
          }
        } else {
          proto.SetP(receiver, key, value, Ω, ƒ);
        }
      }
    },
    function DefineOwnProperty(key, desc, strict, Ω, ƒ){
      var self = this;
      var reject = strict ? function(e, a){ throwException(e, a, ƒ) } : FALSE(Ω);

      this.GetOwnProperty(key, function(current){
        if (current === undefined) {
          if (!self.Extensible) {
            reject('define_disallowed', []);
          } else {
            if (IsGenericDescriptor(desc) || IsDataDescriptor(desc)) {
              self.attributes[key] = desc.writable | (desc.enumerable << 1) | (desc.configurable << 2);
              self.properties[key] = desc.value;
            } else {
              self.attributes[key] = ISACCESSOR | (desc.enumerable << 1) | (desc.configurable << 2);
              self.properties[key] = new Accessor(desc.get, desc.set);
            }
            self.keys.add(key);
            Ω(true);
          }
        } else {
          var rejected = false;

          if (IsEmptyDescriptor(desc) || IsEquivalentDescriptor(desc, current)) {
            Ω(true);
          } else if (!current.configurable) {
            var nonConfigurableReject = function(){
              reject('redefine_disallowed', []);
              rejected = true;
            };

            if (desc.configurable || desc.enumerable === !current.configurable) {
              nonConfigurableReject();
            } else {
              var currentIsData = IsDataDescriptor(current),
                  descIsData = IsDataDescriptor(desc);

              if (currentIsData !== descIsData)
                nonConfigurableReject();
              else if (currentIsData && descIsData)
                if (!current.writable && 'value' in desc && desc.value !== current.value)
                  nonConfigurableReject();
              else if ('set' in desc && desc.set !== current.set)
                nonConfigurableReject();
              else if ('get' in desc && desc.get !== current.get)
                nonConfigurableReject();
            }
          }

          if (!rejected) {
            'configurable' in desc || (desc.configurable = current.configurable);
            'enumerable' in desc || (desc.enumerable = current.enumerable);

            if (IsAccessorDescriptor(desc)) {
              self.attributes[key] = ISACCESSOR | (desc.enumerable << 1) | (desc.configurable << 2);
              if (IsDataDescriptor(current)) {
                self.properties[key] = new Accessor(desc.get, desc.set);
              } else {
                if ('set' in desc)
                  self.properties[key].set = desc.set;
                if ('get' in desc)
                  self.properties[key].get = desc.get;
              }
            } else {
              if (IsAccessorDescriptor(current)) {
                current.writable = true;
              }
              'writable' in desc || (desc.writable = current.writable)
              self.properties[key] = desc.value;
              self.attributes[key] = desc.writable | (desc.enumerable << 1) | (desc.configurable << 2);
            }
            Ω(true);
          }
        }
      }, ƒ);
    },
    function HasOwnProperty(key, Ω, ƒ){
      Ω(this.keys.has(key));
    },
    function HasProperty(key, Ω, ƒ){
      var proto = this.Prototype;
      this.HasOwnProperty(key, function(hasOwn){
        if (hasOwn)
          Ω(true);
        else if (!proto)
          Ω(false)
        else
          proto.HasProperty(key, Ω, ƒ);
      }, ƒ);
    },
    function Delete(key, strict, Ω, ƒ){
      if (!this.keys.has(key)) {
        Ω(true);
      } else if (this.attributes[key] & CONFIGURABLE) {
        delete this.properties[key];
        delete this.attributes[key];
        Ω(true);
      } else if (strict) {
        throwException('strict_delete', [], ƒ);
      } else {
        Ω(false);
      }
    },
    function Enumerate(Ω, ƒ){
      var props = this.keys.filter(function(key){
        return this.attributes[key] & ENUMERABLE;
      }, this);

      if (this.Prototype) {
        this.Prototype.Enumerate(function(inherited){
          props.add(inherited);
          Ω(props.toArray());
        }, ƒ);
      } else {
        Ω(props.toArray());
      }
    },
    function GetOwnPropertyNames(Ω, ƒ){
      Ω(this.keys.toArray());
    },
    function GetPropertyNames(Ω, ƒ){
      var props = this.keys.clone();

      if (this.Prototype) {
        this.Prototype.GetPropertyNames(function(inherited){
          props.add(inherited);
          Ω(props.toArray());
        }, ƒ);
      } else {
        Ω(props.toArray());
      }
    },
    function DefaultValue(hint, Ω, ƒ){
      var self = this;

      function attempt(name, next){
        self.Get(name, function(method){
          IsCallable(method, function(callable){
            if (callable) {
              method.Call(self, [], function(val){
                isObject(val) ? next(name) : Ω(val);
              }, ƒ);
            } else {
              next(name);
            }
          }, ƒ);
        }, ƒ);
      }

      attempt(hint === 'String' ? 'toString' : 'valueOf', function(name){
        name = name === 'toString' ? 'valueOf' : 'toString';
        attempt(name, THROWS('cannot_convert_to_primitive', [], ƒ));
      });
    },
    function inherit(proto){
      this.Prototype = proto;
      this.properties = create(proto.properties);
      this.attributes = create(proto.attributes);
      this.keys = new PropertyList;
    },
    function defineDirect(key, value, attrs){
      this.properties[key] = value;
      this.attributes[key] = attrs;
    },
    function hasDirect(key){
      return key in this.properties;
    },
    function hasOwnDirect(key){
      return this.keys.has(key);
    },
    function setDirect(key, value){
      this.properties[key] = value;
      if (!(key in this.attributes))
        this.attributes[key] = ECW;
    },
    function getDirect(key){
      return this.properties[key];
    },
  ]);


  // ######################
  // ### $PrimitiveBase ###
  // ######################

  function $PrimitiveBase(value, proto){
    this.base = base;
    var type = typeof base;
    if (type === STRING) {
      $Object.call(this, intrinsics.StringPrototype);
      this.NativeBrand = StringWrapper;
    } else if (type === NUMBER) {
      $Object.call(this, intrinsics.NumberPrototype);
      this.NativeBrand = NumberWrapper;
    } else if (type === BOOLEAN) {
      $Object.call(this, intrinsics.BooleanPrototype);
      this.NativeBrand = BooleanWrapper;
    }
  }

  inherit($PrimitiveBase, $Object, [
    function GetProperty(key, receiver, Ω, ƒ){
      var base = this.base;
      $Object.prototype.GetProperty.call(this, key, function(desc){
        if (desc === undefined) {
          Ω(desc);
        } else if (desc instanceof $DataDescriptor) {
          Ω(desc.properties.value);
        } else {
          var getter = desc.properties.get;
          if (getter === undefined) {
            Ω(getter);
          } else {
            getter.Call(receiver || base, [], Ω, ƒ);
          }
        }
      }, ƒ);
    },
    function Put(key, value, strict, Ω, ƒ){
      var base = this.base;
      $Object.prototype.Put.call(this, key, value, strict, function(desc){
      }, ƒ);
    },
  ]);

  // #################
  // ### $Function ###
  // #################

  var LexicalScope = new Symbol('LexicalScope'),
      StrictScope = new Symbol('StrictScope'),
      GlobalScope = new Symbol('GlobalScope');

  var Arrow = new Symbol('Arrow'),
      Normal = new Symbol('Normal');


  function $Function(kind, params, body, scope, strict, proto, holder, name){
    if (proto === undefined)
      proto = intrinsics.FunctionPrototype;

    $Object.call(this, proto);
    this.FormalParameters = params;
    this.ThisMode = kind === Arrow ? LexicalScope : strict ? StrictScope : GlobalScope;
    this.Strict = strict;
    this.Realm = realm;
    this.Scope = scope;
    this.Code = code;
    if (home !== undefined)
      this.Home = holder;
    if (name !== undefined)
      this.MethodName = name;

    this.defineDirect('length', params.ExpectedArgumentCount, 0);
    if (kind === Normal && strict) {
      this.defineDirect('caller', intrinsics.ThrowTypeError, __A);
      this.defineDirect('arguments', intrinsics.ThrowTypeError, __A);
    }
  }

  inherit($Function, $Object, {
    NativeBrand: NativeFunction,
    FormalParameters: null,
    Code: [],
    Scope: null,
    TargetFunction: null,
    BoundThis: null,
    BoundArguments: null,
    Strict: false,
    ThisMode: GlobalScope,
    Realm: null,
  }, [
    function Call(receiver, args, Ω, ƒ){
      var self = this;
      SEQUENCE([
        function(_, Ω){
          if (self.ThisMode === 'lexical') {
            Ω(NewDeclarativeEnvironment(self.Scope));
          } else {
            if (self.ThisMode === 'strict') {
              Ω(NewMethodEnvironment(self, receiver));
            } else if (receiver === null || receiver === undefined) {
              Ω(NewMethodEnvironment(self, self.Realm.global));
            } else if (typeof receiver !== 'object') {
              ToObject(receiver, function(thisValue){
                Ω(NewMethodEnvironment(self, thisValue));
              }, ƒ);
            }
          }
        },
        function(local, Ω){
          ExecutionContext.push(new ExecutionContext(context, local, self.Realm, self.Code));
          FunctionDeclarationInstantiation(self, args, local, function(){
            context.evaluate(Ω, function(result){
              if (result.type === RETURN) {
                Ω(result.value);
              } else {
                result.context = ExecutionContext.pop();
                result.continuation = Ω;
                ƒ(result);
              }
            });
          }, function(result){
            ExecutionContext.pop();
            ƒ(result);
          });
        },
        function(result, Ω){
          ExecutionContext.pop();
          Ω(result);
        }
      ], Ω, ƒ)
    },
    function Construct(args, Ω, ƒ){
      var self = this;
      this.Get('prototype', function(prototype){
        var instance = typeof prototype === 'object' ? new $Object(prototype) : new $Object;
        self.Call(instance, args, function(result){
          Ω(typeof result === 'object' ? result : instance);
        }, ƒ);
      }, ƒ);
    },
    function HasInstance(arg){

    },
    function MakeConstructor(writablePrototype, prototype){
      var install = prototype === undefined;
      if (install)
        prototype = new $Object;
      if (writablePrototype === undefined)
        writablePrototype = true;
      if (install)
        prototype.defineDirect('constructor', this, writablePrototype ? C_W : ___);
      this.defineDirect('prototype', prototype, writablePrototype ? __W : ___);
    }
  ]);

  // #############
  // ### $Date ###
  // #############

  function $Date(value){
    $Object.call(this, intrinsics.DatePrototype);
    this.PrimitiveValue = value;
  }

  inherit($Date, $Object, {
    NativeBrand: NativeDate,
    PrimitiveValue: undefined,
  });

  // ###############
  // ### $String ###
  // ###############

  function $String(value){
    $Object.call(this, intrinsics.StringPrototype);
    this.PrimitiveValue = value;
  }

  inherit($String, $Object, {
    NativeBrand: StringWrapper,
    PrimitiveValue: undefined,
  });


  // ###############
  // ### $Number ###
  // ###############

  function $Number(value){
    $Object.call(this, intrinsics.NumberPrototype);
    this.PrimitiveValue = value;
  }

  inherit($Number, $Object, {
    NativeBrand: NumberWrapper,
    PrimitiveValue: undefined,
  });


  // ################
  // ### $Boolean ###
  // ################

  function $Boolean(value){
    $Object.call(this, intrinsics.BooleanPrototype);
    this.PrimitiveValue = value;
  }

  inherit($Boolean, $Object, {
    NativeBrand: BooleanWrapper,
    PrimitiveValue: undefined,
  });



  // ############
  // ### $Map ###
  // ############

  function $Map(){
    $Object.call(this, intrinsics.MapPrototype);
  }

  inherit($Map, $Object, {
    NativeBrand: NativeMap,
  });

  // ############
  // ### $Set ###
  // ############

  function $Set(){
    $Object.call(this, intrinsics.SetPrototype);
  }

  inherit($Set, $Object, {
    NativeBrand: NativeSet,
  });


  // ################
  // ### $WeakMap ###
  // ################

  function $WeakMap(){
    $Object.call(this, intrinsics.WeakMapPrototype);
  }

  inherit($WeakMap, $Object, {
    NativeBrand: NativeWeakMap,
  });

  // ##############
  // ### $Array ###
  // ##############

  function $Array(){
    $Object.call(this, intrinsics.ArrayPrototype);
  }

  inherit($Array, $Object, {
    NativeBrand: NativeArray,
  });


  // ###############
  // ### $RegExp ###
  // ###############

  function $RegExp(){
    $Object.call(this, intrinsics.RegExpPrototype);
  }

  inherit($RegExp, $Object, {
    NativeBrand: NativeRegExp,
    Match: null,
  });


  // ####################
  // ### $PrivateName ###
  // ####################

  function $PrivateName(proto){
    $Object.call(this, intrinsics.PrivateNamePrototype);
  }

  inherit($PrivateName, $Object, {
    NativeBrand: NativePrivateName,
    Match: null,
  });



  // ##################
  // ### $Arguments ###
  // ##################

  function $Arguments(length){
    $Object.call(this);
    this.defineDirect('length', length, _CW);
  }

  inherit($Arguments, $Object, {
    NativeBrand: NativeArguments,
    ParameterMap: null,
  }, [
    function Get(key, Ω, ƒ){
      var map = this.ParameterMap;
      if (map.keys.has(key)) {
        map.properties[key].get(Ω, ƒ);
      } else {
        $Object.prototype.Get.call(this, key, Ω, ƒ);
      }
    },
    // function GetOwnProperty(key, Ω, ƒ){
    //   var map = this.ParameterMap;
    //   $Object.prototype.GetOwnProperty.call(this, key, function(desc){
    //     if (desc) {
    //       if (map.keys.has(key)) {
    //         map.properties[key].get(Ω, ƒ);
    //       }
    //     }
    //   }, ƒ);
    // }
  ]);

  var builtinInit = [$Array, $Boolean, $Date, $Function, $Map,
                     $Number, $RegExp, $Set, $String, $WeakMap];


  function Realm(){
    var intrin = this.intrinsics = new Hash;
    var ObjectPrototype = intrin.ObjectPrototype = new $Object(null);

    this.global = new $Object(ObjectPrototype);
    this.globalEnv = new GlobalEnvironmentRecord(this.global);

    for (var i = 0; i < builtinInit.length; i++) {
      var Prototype = intrin[builtinInit[i].name.slice(1) + 'Prototype'] = create(builtinInit[i].prototype);
      $Object.call(Prototype, ObjectPrototype);
    }
    var FunctionPrototype = intrin.FunctionPrototype;
    FunctionPrototype.Realm = this;
    FunctionPrototype.Scope = this.globalEnv;
    FunctionPrototype.FormalParameters = [];
    intrin.DatePrototype.PrimitiveValue = Date.prototype;
    intrin.StringPrototype.PrimitiveValue = '';
    intrin.NumberPrototype.PrimitiveValue = 0;
    intrin.BooleanPrototype.PrimitiveValue = false;
    intrin.ArrayPrototype.defineDirect('length', 0, ___);
  }


  function ExecutionContext(caller, local, realm){
    this.caller = caller;
    this.realm = realm;
    this.LexicalEnvironment = local;
    this.VariableEnvironment = local;
  }

  var realm = ExecutionContext.realm = null,
      global = ExecutionContext.global = null,
      context = ExecutionContext.context = null,
      intrinsics = ExecutionContext.intrinsics = null;

  define(ExecutionContext, [
    function update(){
      if (context.realm !== realm) {
        realm = ExecutionContext.realm = newContext.realm;
        global = ExecutionContext.globalEnv = realm.global;
        intrinsics = ExecutionContext.intrinsics = realm.intrinsics;
      }
    },
    function push(newContext){
      context = ExecutionContext.context = newContext;
      ExecutionContext.update();
    },
    function pop(){
      if (context) {
        var oldContext = context;
        context = context.caller;
        ExecutionContext.update();
        return oldContext;
      }
    }
  ]);

  define(ExecutionContext.prototype, {
    isGlobal: false,
    isStrict: false,
    isEval: false,
  });



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


  var operators = {
    '==': EQUALS,
    '===': STRICT_EQUALS
  };

  function EQUALS(left, right, Ω, ƒ){
    var leftType = typeof left,
        rightType = typeof right;

    if (leftType === rightType) {
      STRICT_EQUALS(left, right, Ω, ƒ);
    } else if (left == null && left == right) {
      Ω(true);
    } else if (leftType === NUMBER && rightType === STRING) {
      ToNumber(right, function(right){
        EQUALS(left, right, Ω, ƒ);
      }, ƒ);
    } else if (leftType === STRING && rightType === NUMBER) {
      ToNumber(left, function(left){
        EQUALS(left, right, Ω, ƒ);
      }, ƒ);
    } else if (rightType === OBJECT && leftType === STRING || leftType === OBJECT) {
      ToPrimitive(right, function(right){
        EQUALS(left, right, Ω, ƒ);
      }, ƒ);
    } else if (leftType === OBJECT && rightType === STRING || rightType === OBJECT) {
      ToPrimitive(left, function(left){
        EQUALS(left, right, Ω, ƒ);
      }, ƒ);
    } else {
      Ω(false);
    }
  }

  function STRICT_EQUALS(left, right, Ω, ƒ){
    Ω(left === right);
  }


  function ƒ(completion){
    if (completion.type === THROW) {
      console.log(completion.value);
      console.log(completion.value.name + ': ' + completion.value.message);
    } else {
      Ω(completion.value);
    }
  }

  function Ω(r){
    console.log(r);
  }

  console.log(new Realm)

  var intrinsics = {
    ObjectPrototype: new $Object(null),
  };

  // var o = new $Object(intrinsics.ObjectPrototype);

  // o.Put('test', 5, false, function(){
  //   builtins.Object.create(null, [o], function(obj){
  //     obj.Put('x', 'grg', false, function(){
  //       console.log(obj);
  //       obj.GetPropertyNames(Ω, ƒ);
  //       obj.DefaultValue('String', Ω, ƒ); // throw TypeError
  //       console.log(CreateMappedArgumentsObject(null, ['x', 'y', 'z'], new NewDeclarativeEnvironment(null), ['a', 'b', 'c']))
  //     }, ƒ);
  //   }, ƒ);
  // }, ƒ);
