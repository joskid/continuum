  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
      defineProperties = Object.defineProperties,
      defineProperty = Object.defineProperty;

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

  var E__ = 1,
      _C_ = 2,
      EC_ = 3,
      __W = 4,
      E_W = 5,
      _CW = 6,
      ECW = 7;


  // ##################################################
  // ### Internal Utilities not from specification ####
  // ##################################################

  var create = Object.create && !Object.create(null).toString
    ? (function(ObjectCreate){
        function create(object){
          return ObjectCreate(object);
        }
        return create;
      })(Object.create)
    : (function(F){
        function create(object){
          if (object === null) {
            var iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframe.src = 'javascript:'
            var object = iframe.contentWindow.Object.prototype;
            document.body.removeChild(iframe);
            iframe = null;
            delete object.constructor;
            delete object.hasOwnProperty;
            delete object.propertyIsEnumerable;
            delete object.isProtoypeOf;
            delete object.toLocaleString;
            delete object.toString;
            delete object.valueOf;
            return object;
          } else {
            F.prototype = object;
            object = new F;
            F.prototype = null;
            return object;
          }
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
        return defineProperty(o, p, { configurable: true, writable: true, value: v });
      case FUNCTION:
        return defineProperty(o, p.name, { configurable: true, writable: true, value: p });
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
              defineProperty(o, name, { configurable: true, writable: true, value: f });
            }
          }
        } else if (p) {
          var keys = Object.keys(p)

          for (var i=0; i < keys.length; i++) {
            var k = keys[i];
            var desc = getOwnPropertyDescriptor(p, k);
            if (desc) {
              desc.enumerable = 'get' in desc;
              defineProperty(o, k, desc);
            }
          }
        }
    }

    return o;
  }

  function inherit(Ctor, Super, properties, methods){
    define(Ctor, { inherits: Super });
    Ctor.prototype = create(Super.prototype, {
      constructor: { configurable: true, writable: true, value: Ctor }
    });
    properties && define(Ctor.prototype, properties);
    methods && define(Ctor.prototype, methods);
    return Ctor;
  }

  var errors = require('./errors');

  function throwException(error, args, Ω){
    error = errors[error];
    error.apply(null, [null, function(err){
      Ω(new CompletionRecord(THROW, err));
    }].concat(args));
  }



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

  function SEQUENCE(funcs, Ω, ƒ){
    var i = 0;
    funcs[i]([], function next(v){
      if (++i === funcs.length - 1)
        next = Ω;
      funcs[i](v, next, ƒ);
    });
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

  function IF(condition, consequent, alternate, Ω, ƒ){
    return function(input){
      condition(input, function(result){
        if (result)
          consequent(input, Ω, ƒ);
        else
          alternate(input, Ω, ƒ);
      }, ƒ);
    };
  }

  function COMPARE(left, right, comparison){
    return function(Ω, ƒ){
      left(function(left){
        right(function(right){
          comparison(left, right, Ω, ƒ);
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
  // ### Specification Functions ###
  // ###############################

  // ## ToPropertyDescriptor

  function ToPropertyDescriptor(obj, Ω, ƒ) {
    if (!(obj instanceof $Object))
      return throwException('property_desc_object', [typeof obj], ƒ);

    var desc = new $Object(intrinsics.ObjectPrototype);

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
    return !('get' in desc || 'set' in desc || 'value' in desc ||
             'writable' in desc || 'enumerable' in desc || 'configurable' in desc);
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

  // ## IsCallable

  function IsCallable(o){
    return isObject(o) && o instanceof $Function || 'Call' in Object(o);
  }

  // ## GetReference

  function GetReference(lex, name, strict, Ω, ƒ){
    if (lex === null) {
      Ω(new Reference(undefined, name, strict));
    } else {
      lex.record.HasBinding(name, function(result){
        if (result)
          Ω(new Reference(lex.record, name, strict));
        else
          GetReference(lex.outer, name, strict, Ω, ƒ);
      }, ƒ);
    }
  }

  // ## GetLexicalReference

  function GetLexicalReference(name, Ω, ƒ){
    GetReference(context.lexical, name, context.isStrict, Ω, ƒ);
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
    ReturnIfAbrupt(v, function(v){
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
            base.Get(v.name, GetThisValue(v), Ω, ƒ);
          } else {
            base.Get(v.name, Ω, ƒ);
          }
        } else {
          base.GetBindingValue(v.name, v.strict, Ω, ƒ);
        }
      }
    }, ƒ);
  }

  // ## PutValue

  function PutValue(v, w, Ω, ƒ){
    ReturnIfAbrupt(v, function(v){
      ReturnIfAbrupt(w, function(w){
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
              base.Put(v.name, w, v.strict, GetThisValue(v), Ω, ƒ);
            }
          } else {
            base.SetMutableBinding(v.name, w, v.strict, Ω, ƒ);
          }
        }
      }, ƒ);
    }, ƒ);
  }

  // ## GetThisValue

  function GetThisValue(v, Ω, ƒ){
    ReturnIfAbrupt(v, function(v){
      if (!(v instanceof Reference))
        Ω(v);
      else if (IsUnresolvableReference(v))
        throwError('non_object_property_load', [v.name, v.base], ƒ);
      else if ('thisValue' in v)
        Ω(v.thisValue);
      else
        Ω(v.base);
    }, ƒ);
  }


  // ## GetThisEnvironment

  function GetThisEnvironment(Ω, ƒ){
    void function recurse(env){
      env.record.HasThis(function(result){
        result ? Ω(env) : recurse(env.outer);
      }, ƒ)
    }(context.lexical);
  }

  // ## NewObjectEnvironment

  function NewObjectEnvironment(outer, object){
    return new LexicalEnvironment(outer, new ObjectEnvironmentRecord(object));
  }

  // ## NewDeclarativeEnvironment

  function NewDeclarativeEnvironment(outer){
    return new LexicalEnvironment(outer, new DeclarativeEnvironmentRecord);
  }

  // ## NewMethodEnvironment

  function NewMethodEnvironment(method, receiver){
    var env = new MethodEnvironmentRecord(receiver, method.holder, method.name);
    return new LexicalEnvironment(method.scope, env);
  }




  // ########################
  // ### CompletionRecord ###
  // ########################


  function CompletionRecord(type, value, target){
    this.type = type;
    this.value = value;
    this.target = target;
  }

  define(CompletionRecord.prototype, [
    function toString(){
      return this.value;
    },
    function valueOf(){
      return this.value;
    }
  ]);

  function Completion(name){
    this.name = name;
  }

  define(Completion.prototype, [
    function toString(){
      return '[object Completion]';
    },
    function inspect(){
      return '['+this.name+']';
    }
  ]);

  var CONTINUE = new Completion('continue'),
      BREAK    = new Completion('break'),
      NORMAL   = new Completion('normal'),
      RETURN   = new Completion('return'),
      THROW    = new Completion('throw');



  // ## ReturnIfAbrupt

  function ReturnIfAbrupt(value, Ω, ƒ){
    if (value instanceof CompletionRecord) {
      if (value.type === NORMAL) {
        Ω(value.value);
      } else {
        ƒ(value);
      }
    } else {
      Ω(value);
    }
  }


  // #################
  // ### Reference ###
  // #################

  function Reference(base, name, strict){
    this.base = base;
    this.name = name;
    this.strict = strict;
  }



  function EnvironmentRecord(bindings){
    this.bindings = bindings;
  }

  define(EnvironmentRecord.prototype, {
    bindings: null,
    receiver: null,
    holder: null,
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
      this.CreateBinding(name, deletable, Ω, ƒ);
    },
    function HasWithBase(Ω, ƒ){
      Ω(false);
    },
    function GetWithBase(Ω, ƒ){
      Ω(this.withBase);
    },
    function HasThis(Ω, ƒ){
      Ω(false);
    },
    function GetThis(Ω, ƒ){
      Ω();
    },
    function HasSuper(Ω, ƒ){
      Ω(false);
    },
    function GetSuper(Ω, ƒ){
      Ω();
    }
  ]);


  function DeclarativeEnvironmentRecord(){
    EnvironmentRecord.call(this, new Hash);
    this.consts = new Hash;
  }

  inherit(DeclarativeEnvironmentRecord, EnvironmentRecord, [
    function HasBinding(name, Ω, ƒ){
      Ω(name in this.bindings);
    },
    function CreateBinding(name, deletable, Ω, ƒ){
      if (deletable) {
        this.bindings[name] = undefined;
      } else {
        defineProperty(this.bindings, name, {
          value: undefined,
          configurable: false,
          enumerable: true,
          writable: true
        });
      }
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
      this.HasBinding(name, function(has){
        Ω(has ? delete this.bindings[name] : true);
      });
    },
  ]);


  function ObjectEnvironmentRecord(object){
    EnvironmentRecord.call(this, object);
  }

  inherit(ObjectEnvironmentRecord, EnvironmentRecord, [
    function HasBinding(name, Ω, ƒ){
      this.bindings.HasProperty(name, Ω, ƒ);
    },
    function CreateBinding(name, deletable, Ω, ƒ){
      this.bindings.DefineOwnProperty(name, new $DataDescriptor(undefined, ECW), true, Ω, ƒ);
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
    this.receiver = receiver;
    this.holder = holder;
    this.name = name;
  }

  inherit(MethodEnvironmentRecord, DeclarativeEnvironmentRecord, {
    name: undefined
  }, [
    function HasThis(Ω, ƒ){
      Ω(true);
    },
    function GetThis(Ω, ƒ){
      Ω(this.receiver);
    },
    function HasSuper(Ω, ƒ){
      Ω(this.holder !== undefined);
    },
    function GetSuper(Ω, ƒ){
      Ω(this.holder.proto);
    }
  ]);


  function GlobalEnvironmentRecord(global){
    ObjectEnvironmentRecord.call(this, global);
  }

  inherit(GlobalEnvironmentRecord, ObjectEnvironmentRecord, {
  }, [
    function HasThis(Ω, ƒ){
      Ω(true);
    },
    function GetThis(Ω, ƒ){
      Ω(this.bindings);
    }
  ]);



  function LexicalEnvironment(outer, record){
    this.outer = outer || null;
    this.record = record;
  }

  define(LexicalEnvironment.prototype, {
    outer: null,
    record: null
  });




  function Realm(){
    this.intrinsics = new Hash;
    this.intrinsics.ObjectPrototype = new $Object(null);
    this.global = new $Object(this.intrinsics.ObjectPrototype);
    this.globalEnv = new LexicalEnvironment(null, new GlobalEnvironmentRecord(this.global));

    // for (var name in builtins)
    //   if (name !== 'Object')
    //     this.intrinsics[name+'Prototype'] = create(this.intrinsics.ObjectPrototype);

    // for (var name in builtins) {
    //   this.intrinsics[name] = builtins[name].instantiate(this);
    //   define(this.global, name, this.intrinsics[name]);
    // }

    // defineProperties(this.global, constants);
    // BuiltinGlobals.forEach(function(builtin){
    //   define(this.global, builtin.name, builtin.instantiate(this));
    // }, this);
  }


  function ExecutionContext(realm){
    this.realm = realm;
  }

  var realm = ExecutionContext.realm = null,
      global = ExecutionContext.global = null,
      context = ExecutionContext.context = null,
      globalEnv = ExecutionContext.globalEnv = null,
      intrinsics = ExecutionContext.intrinsics = null;



  define(ExecutionContext, [
    function beginExecution(realm, isGlobal, isStrict, isEval){
      var context = new ExecutionContext(realm);
      if (isGlobal) {
        context.isGlobal = true;
        context.variable = realm.globalEnv;
      } else {
        context.variable = NewDeclarativeEnvironment(context.globalEnv);
      }
      context.lexical = context.variable;
      if (isStrict)
        context.isStrict = true;
      if (isEval)
        context.isEval = true;

      ExecutionContext.setCurrent(context);
      ExecutionContext.stack = [context];
      return context;
    },
    function setCurrent(newContext){
      realm = ExecutionContext.realm = newContext.realm;
      global = ExecutionContext.globalEnv = realm.global;
      context = ExecutionContext.context = newContext;
      globalEnv = ExecutionContext.globalEnv = realm.globalEnv;
      intrinsics = ExecutionContext.intrinsics = realm.intrinsics;
    },
  ]);

  define(ExecutionContext.prototype, {
    isGlobal: false,
    isStrict: false,
    isEval: false,
  });




  // ###############
  // ### $Object ###
  // ###############

  function $Object(proto){
    if (proto === null) {
      this.proto = null;
      this.properties = create(null);
      this.attributes = new Hash;
      this.propertyNames = new PropertyList;
    } else {
      this.proto = proto;
      this.properties = create(proto.properties);
      this.attributes = create(proto.attributes);
      this.propertyNames = new PropertyList;
    }
  }

  define($Object.prototype, {
    extensible: true
  });

  define($Object.prototype, [
    function GetOwnProperty(key, Ω, ƒ){
      if (!this.propertyNames.has(key)) {
        Ω();
      } else {
        var attrs = this.attributes[key];
        var $Descriptor = attrs & ISACCESSOR ? $AccessorDescriptor : $DataDescriptor;
        Ω(new $Descriptor(this.properties[key], attrs));
      }
    },
    function GetProperty(key, Ω, ƒ){
      var proto = this.proto;
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
      if (!this.propertyNames.has(key)) {
        if (this.proto === null) {
          Ω();
        } else {
          this.proto.GetP(receiver, key, Ω, ƒ);
        }
      } else {
        var attrs = this.attributes[key];
        if (attrs & ISACCESSOR) {
          var getter = this.properties[key].get;
          getter ? getter.Call(receiver, Ω, ƒ) : Ω();
        } else {
          Ω(this.properties[key]);
        }
      }
    },
    function SetP(receiver, key, value, Ω, ƒ) {
      if (this.propertyNames.has(key)) {
        var attrs = this.attributes[key];
        if (attrs & ISACCESSOR) {
          var setter = this.properties[key].set;
          setter ? setter.Call(receiver, value, TRUE(Ω), ƒ) : Ω(false);
        } else if (attrs & WRITABLE) {
          if (this === receiver) {
            this.DefineOwnProperty(key, new $Value(value), false, Ω, ƒ);
          } else if (!receiver.extensible) {
            Ω(false);
          } else {
            receiver.DefineOwnProperty(key, new $DataDescriptor(value, ECW), false, Ω, ƒ);
          }
        } else {
          Ω(false);
        }
      } else {
        var proto = this.proto;
        if (proto === null) {
          if (!receiver.extensible) {
            Ω(false);
          } else {
            receiver.DefineOwnProperty(key, new $DataDescriptor(value, ECW), false, Ω, ƒ);
          }
        } else {
          proto.SetP(receiver, key, value, Ω, ƒ);
        }
      }
    },
    function DefineOwnProperty(key, descriptor, strict, Ω, ƒ){
      var self = this;
      var reject = strict ? function(e, a){ throwError(e, a, ƒ) } : FALSE(Ω);
      var desc = descriptor.properties;

      this.GetOwnProperty(key, function(current){
        if (current === undefined) {
          if (!self.extensible) {
            reject('define_disallowed', []);
          } else {
            if (IsGenericDescriptor(desc) || IsDataDescriptor(desc)) {
              self.attributes[key] = desc.writable | (desc.enumerable << 1) | (desc.configurable << 2);
              self.properties[key] = desc.value;
            } else {
              self.attributes[key] = ISACCESSOR | (desc.enumerable << 1) | (desc.configurable << 2);
              self.properties[key] = new Accessor(desc.get, desc.set);
            }
            self.propertyNames.add(key);
            Ω(true);
          }
        } else {
          var rejected = false;
          current = current.properties;

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
      Ω(this.propertyNames.has(key));
    },
    function HasProperty(key, Ω, ƒ){
      var proto = this.proto;
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
      if (!this.propertyNames.has(key)) {
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
      var props = this.propertyNames.filter(function(key){
        return this.attributes[key] & ENUMERABLE;
      }, this);

      if (this.proto) {
        this.proto.Enumerate(function(inherited){
          props.add(inherited);
          Ω(props.toArray());
        }, ƒ);
      } else {
        Ω(props.toArray());
      }
    },
    function GetOwnPropertyNames(Ω, ƒ){
      Ω(this.propertyNames.toArray());
    },
    function GetPropertyNames(Ω, ƒ){
      var props = this.propertyNames.clone();

      if (this.proto) {
        this.proto.GetPropertyNames(function(inherited){
          props.add(inherited);
          Ω(props.toArray());
        }, ƒ);
      } else {
        Ω(props.toArray());
      }
    },
    function DefaultValue(hint, Ω, ƒ){
      var self = this;
      var first = hint === 'String' ? 'toString' : 'valueOf',
          second = hint === 'Number' ? 'valueOf' : 'toString';
      SEQUENCE([
        function(_, next){
          self.Get(first, function(first){
            if (IsCallable(first)) {
              first.Call(self, [], function(val){
                if (!isObject(val))
                  Ω(val);
                else
                  next();
              }, ƒ);
            } else {
              next();
            }
          }, ƒ);
        },
        function(_, next){
          self.Get(second, function(second){
            if (IsCallable(second)) {
              second.Call(self, [], function(val){
                if (!isObject(val))
                  Ω(val);
                else
                  next();
              }, ƒ);
            } else {
              next();
            }
          }, ƒ);
        },
        THROWS('cannot_convert_to_primitive', [], ƒ)
      ]);
    },
    function inherit(proto){
      this.proto = proto;
      this.properties = create(proto.properties);
      this.attributes = create(proto.attributes);
      this.propertyNames = new PropertyList;
    },
    function hasDirect(key){
      return key in this.properties;
    },
    function hasOwnDirect(key){
      return this.propertyNames.has(key);
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

  function $PrimitiveBase(base){
    this.base = base;
    var type = typeof base;
    if (type === STRING)
      $Object.call(this, intrinsics.StringPrototype);
    else if (type === NUMBER)
      $Object.call(this, intrinsics.NumberPrototype);
    else if (type === BOOLEAN)
      $Object.call(this, intrinsics.BooleanPrototype);

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

  // #######################
  // ### $DataDescriptor ###
  // #######################

  function $DataDescriptor(value, attributes){
    this.inherit(intrinsics.ObjectPrototype);
    var attrs = this.attributes,
        props = this.properties;

    attrs.value = ECW;
    attrs.writable = ECW;
    attrs.enumerable = ECW;
    attrs.configurable = ECW;
    props.value = value;
    props.writable = (attributes & WRITABLE) > 0;
    props.enumerable = (attributes & ENUMERABLE) > 0;
    props.configurable = (attributes & CONFIGURABLE) > 0;
  }

  inherit($DataDescriptor, $Object);


  // ###########################
  // ### $AccessorDescriptor ###
  // ###########################

  function $AccessorDescriptor(accessors, attributes){
    this.inherit(intrinsics.ObjectPrototype);
    var attributes = this.attributes,
        properties = this.properties;

    attrs.get = ECW;
    attrs.set = ECW;
    attrs.enumerable = ECW;
    attrs.configurable = ECW;
    props.get = accessors.get;
    props.set = accessors.set;
    props.enumerable = (attributes & ENUMERABLE) > 0;
    props.configurable = (attributes & CONFIGURABLE) > 0;
  }

  inherit($AccessorDescriptor, $Object);



  // ##############
  // ### $Value ###
  // ##############

  function $Value(value){
    this.inherit(intrinsics.ObjectPrototype);
    this.properties.value = value;
    this.attributes.value = ECW;
  }

  inherit($Value, $Object);



  // #################
  // ### $Function ###
  // #################

  function $Function(proto, call, construct){
    $Object.call(this, proto);
  }

  inherit($Function, $Object, [
    function Call(reciever, args, Ω, ƒ){

    },
    function Construct(args, Ω, ƒ){

    },
  ]);




  var builtins = {
    Object: {
      Call: function(args, Ω, ƒ){
        ToObject(args[0], Ω, ƒ);
      },
      Construct: function(args, Ω, ƒ){
        Ω(new $Object(intrinsics.ObjectPrototype));
      },
      defineProperty: function(args, Ω, ƒ){
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
      defineProperties: function(args, Ω, ƒ){
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
      create: function(args, Ω, ƒ) {
        var proto = args[0],
            descs = args[1];

        if (proto !== null && !(proto instanceof $Object)) {
          return throwException('proto_object_or_null', [], ƒ);
        }
        var object = new $Object(proto);
        if (descs) {
          $Object.defineProperties(object, descs, Ω, ƒ);
        } else {
          Ω(object);
        }
      }
    }
  };


  function thrower(completion){
    if (completion.type === THROW)
      throw completion.value;
    else
      log(completion.value);
  }

  function log(r){
    console.log(r);
  }


  var intrinsics = {
    ObjectPrototype: new $Object(null),
  };

  var o = new $Object(intrinsics.ObjectPrototype);

  o.Put('test', 5, false, function(){
    builtins.Object.create([o], function(obj){
      obj.Put('x', 'grg', false, function(){
        obj.GetOwnPropertyNames(log, thrower);
        obj.DefaultValue('String', log, thrower); // throw TypeError
      }, thrower);
    }, thrower);
  }, thrower);
