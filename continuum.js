var continuum = (function(GLOBAL, exports, undefined){
  var errors  = require('./errors'),
      utility = require('./utility'),
      compile = require('./compiler');

  var Hash = utility.Hash,
      Emitter = utility.Emitter,
      PropertyList = utility.PropertyList,
      create = utility.create,
      numbers = utility.numbers,
      isObject = utility.isObject,
      nextTick = utility.nextTick,
      enumerate = utility.enumerate,
      ownKeys = utility.ownKeys,
      define = utility.define,
      inherit = utility.inherit,
      decompile = utility.decompile,
      parse = utility.parse;

  var slice = [].slice;


  var constants = require('./constants'),
      BINARYOPS = constants.BINARYOPS.array,
      UNARYOPS  = constants.UNARYOPS.array,
      ENTRY     = constants.ENTRY.hash,
      AST       = constants.AST.array;

  var ARROW  = constants.FUNCTYPE.getIndex('ARROW'),
      METHOD = constants.FUNCTYPE.getIndex('METHOD'),
      NORMAL = constants.FUNCTYPE.getIndex('NORMAL');

  var BOOLEAN   = 'boolean',
      FUNCTION  = 'function',
      NUMBER    = 'number',
      OBJECT    = 'object',
      STRING    = 'string',
      UNDEFINED = 'undefined',
      ARGUMENTS = 'arguments';

  var GET          = 'Get',
      SET          = 'Set',
      VALUE        = 'Value',
      WRITABLE     = 'Writable',
      ENUMERABLE   = 'Enumerable',
      CONFIGURABLE = 'Configurable';


  var E = 0x1,
      C = 0x2,
      W = 0x4,
      A = 0x8,
      ___ =  0,
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


  var Empty = {};


  function Symbol(name){
    this.name = name;
  }

  define(Symbol.prototype, [
    function toString(){
      return this.name;
    },
    function inspect(){
      return '['+this.name+']';
    }
  ]);


  var BreakSigil            = new Symbol('Break'),
      PauseSigil            = new Symbol('Pause'),
      ResumeSigil           = new Symbol('Resume'),
      ThrowSigil            = new Symbol('Throw'),
      ReturnSigil           = new Symbol('Return'),
      NativeSigil           = new Symbol('Native'),
      ContinueSigil         = new Symbol('Continue'),
      ReferenceSigil        = new Symbol('Reference'),
      CompletionSigil       = new Symbol('Completion'),
      AbruptCompletionSigil = new Symbol('AbruptCompletion');

  var LexicalScope          = 'Lexical',
      StrictScope           = 'Strict',
      GlobalScope           = 'Global';

  var GlobalCode            = 'Global',
      EvalCode              = 'Eval',
      FuntionCode           = 'Function';

  var UNINITIALIZED = new Symbol('UNINITIALIZED');



  // ##################################################
  // ### Internal Utilities not from specification ####
  // ##################################################

  function noop(){}

  function hide(o, k){
    Object.defineProperty(o, k, { enumerable: false });
  }

  function defineDirect(o, key, value, attrs){
    o.properties[key] = value;
    o.attributes[key] = attrs;
    o.keys.add(key);
  }
  function deleteDirect(o, key){
    delete o.properties[key];
    delete o.attributes[key];
    o.keys.remove(key);
  }
  function hasDirect(o, key){
    return key in o.properties;
  }
  function hasOwnDirect(o, key){
    return o.keys.has(key);
  }
  function setDirect(o, key, value){
    o.properties[key] = value;
    if (!(key in o.attributes))
      o.attributes[key] = ECW;
    o.keys.add(key);
  }
  function getDirect(o, key){
    return o.properties[key];
  }


  // ###############################
  // ###############################
  // ### Specification Functions ###
  // ###############################
  // ###############################

  function ThrowException(error, args){
    if (!(args instanceof Array)) {
      args = [args];
    }
    return new AbruptCompletion(ThrowSigil, errors[error].apply(null, args));
  }

  // ## FromPropertyDescriptor

  function FromPropertyDescriptor(desc){
    var obj = new $Object;
    if (IsDataDescriptor(desc)) {
      setDirect(obj, 'value', desc.Value);
      setDirect(obj, 'writable', desc.Writable);
    } else if (IsAccessorDescriptor(desc))  {
      setDirect(obj, 'get', desc.Get);
      setDirect(obj, 'set', desc.Set);
    }
    setDirect(obj, 'enumerable', desc.Enumerable);
    setDirect(obj, 'configurable', desc.Configurable);
    return obj;
  }


  // ## ToPropertyDescriptor

  var descFields = ['value', 'writable', 'enumerable', 'configurable', 'get', 'set'];
  var descProps = [VALUE, WRITABLE, ENUMERABLE, CONFIGURABLE, GET, SET];

  function ToPropertyDescriptor(obj) {
    if (obj.IsCompletion) { if (obj.IsAbruptCompletion) return obj; else obj = obj.value; }

    if (typeof obj !== OBJECT)
      return ThrowException('property_desc_object', [typeof obj]);

    var desc = create(null);

    for (var i=0, v; i < 6; i++) {
      if (obj.HasProperty(descFields[i])) {
        v = obj.Get(descFields[i]);
        if (v.IsCompletion) { if (v.IsAbruptCompletion) return v; else v = v.value; }
        desc[descProps[i]] = v;
      }
    }

    if (GET in desc) {
      if (desc.Get !== undefined && !desc.Get || !desc.Get.Call)
        return ThrowException('getter_must_be_callable', [typeof desc.Get]);
    }

    if (SET in desc) {
      if (desc.Set !== undefined && !desc.Set ||  !desc.Set.Call)
        return ThrowException('setter_must_be_callable', [typeof desc.Set]);
    }

    if ((GET in desc || SET in desc) && (VALUE in desc || WRITABLE in desc))
      return ThrowException('value_and_accessor', [desc]);

    return desc;
  }

  // ## IsAccessorDescriptor

  function IsAccessorDescriptor(desc) {
    return desc === undefined ? false : GET in desc || SET in desc;
  }

  // ## IsDataDescriptor

  function IsDataDescriptor(desc) {
    return desc === undefined ? false : VALUE in desc || WRITABLE in desc;
  }

  // ## IsGenericDescriptor

  function IsGenericDescriptor(desc) {
    return desc === undefined ? false : !(IsAccessorDescriptor(desc) || IsDataDescriptor(desc));
  }

  // ## ToCompletePropertyDescriptor

  function ToCompletePropertyDescriptor(obj) {
    var desc = ToPropertyDescriptor(obj);
    if (desc.IsCompletion) { if (desc.IsAbruptCompletion) return desc; else desc = desc.value; }

    if (IsGenericDescriptor(desc) || IsDataDescriptor(desc)) {
      VALUE in desc    || (desc.Value = undefined);
      WRITABLE in desc || (desc.Writable = false);
    } else {
      GET in desc || (desc.Get = undefined);
      SET in desc || (desc.Set = undefined);
    }
    ENUMERABLE in desc   || (desc.Enumerable = false);
    CONFIGURABLE in desc || (desc.Configurable = false);
    return desc;
  }

  // ## IsEmptyDescriptor

  function IsEmptyDescriptor(desc) {
    return !(GET in desc
          || SET in desc
          || VALUE in desc
          || WRITABLE in desc
          || ENUMERABLE in desc
          || CONFIGURABLE in desc);
  }

  // ## IsEquivalentDescriptor

  function IsEquivalentDescriptor(a, b) {
    if (a && a.IsCompletion) {
      if (a.IsAbruptCompletion) {
        return a;
      } else {
        a = a.value;
      }
    }
    if (b && b.IsCompletion) {
      if (b.IsAbruptCompletion) {
        return b;
      } else {
        b = b.value;
      }
    }
    return IS(a.Get, b.Get) &&
           IS(a.Set, b.Set) &&
           IS(a.Value, b.Value) &&
           IS(a.Writable, b.Writable) &&
           IS(a.Enumerable, b.Enumerable) &&
           IS(a.Configurable, b.Configurable);
  }

  // ## GetIdentifierReference

  function GetIdentifierReference(lex, name, strict){
      //throw
    if (lex === null) {
      return new Reference(undefined, name, strict);
    } else if (lex.HasBinding(name)) {
      return new Reference(lex, name, strict);
    } else {
      return GetIdentifierReference(lex.outer, name, strict);
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

  function GetValue(v){
    if (v && v.IsCompletion) {
      if (v.IsAbruptCompletion) {
        return v;
      } else {
        v = v.value;
      }
    }
    if (!v || !v.IsReference) {
      return v;
    } else if (IsUnresolvableReference(v)) {
      return ThrowException('non_object_property_load', [v.name, v.base]);
    } else {
      var base = v.base;

      if (HasPrimitiveBase(v)) {
        base = new $PrimitiveBase(base);
      }

      if (base.Get) {
        if (IsSuperReference(v)) {
          return base.GetP(GetThisValue(v), v.name);
        } else {
          return base.Get(v.name);
        }
      } else if (base.GetBindingValue) {
        return base.GetBindingValue(v.name, v.strict);
      }
    }
  }

  // ## PutValue

  function PutValue(v, w){
    if (v && v.IsCompletion) {
      if (v.IsAbruptCompletion) {
        return v;
      } else {
        v = v.value;
      }
    }
    if (w && w.IsCompletion) {
      if (w.IsAbruptCompletion) {
        return w;
      } else {
        w = w.value;
      }
    }
    if (!v || !v.IsReference) {
      return ThrowException('non_object_property_store', [v.name, v.base]);
    } else if (IsUnresolvableReference(v)) {
      if (v.strict) {
        return ThrowException('not_defined', [v.name, v.base]);
      } else {
        return global.Put(v.name, w, false);
      }
    } else {
      var base = v.base;

      if (HasPrimitiveBase(v)) {
        base = new $PrimitiveBase(base);
      }

      if (base.Get) {
        if (IsSuperReference(v)) {
          return base.SetP(GetThisValue(v), v.name, w, v.strict);
        } else {
          return base.Put(v.name, w, v.strict);
        }
      } else {
        return base.SetMutableBinding(v.name, w, v.strict);
      }
    }
  }

  function GetThisValue(v){
    if (v && v.IsCompletion) {
      if (v.IsAbruptCompletion) {
        return v;
      } else {
        v = v.value;
      }
    }
    if (!v || !v.IsReference) {
      return v;
    }

    if (IsUnresolvableReference(v)) {
      return ThrowException('non_object_property_load', [v.name, v.base]);
    }

    if (IsSuperReference(v)) {
      return v.thisValue;
    }

    return v.base;
  }

  // ## GetThisEnvironment

  function GetThisEnvironment(){
    var env = context.LexicalEnvironment;
    while (env) {
      if (env.HasThisBinding())
        return env;
      env = env.outer;
    }
  }

  function ThisResolution() {
    return GetThisEnvironment().GetThisBinding();
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
    lex.outer = method.Scope;
    return lex;
  }


  function ToPrimitive(argument, hint){
    if (typeof argument === OBJECT) {
      if (argument === null) {
        return argument;
      } else if (argument.IsCompletion) {
        if (argument.IsAbruptCompletion) {
          return argument;
        }
        return ToPrimitive(argument.value, hint);
      }
      return ToPrimitive(argument.DefaultValue(hint), hint);
    } else {
      return argument;
    }
  }

  function ToBoolean(argument){
    if (!argument) {
      return false;
    } else if (typeof argument === OBJECT && argument.IsCompletion) {
      if (argument.IsAbruptCompletion) {
        return argument;
      } else {
        return !!argument.value;
      }
    } else {
      return !!argument;
    }
  }

  function ToNumber(argument){
    if (argument !== null && typeof argument === OBJECT) {
      if (argument.IsCompletion) {
        if (argument.IsAbruptCompletion) {
          return argument;
        }
        return ToNumber(argument.value);
      }
      return ToNumber(ToPrimitive(argument, 'Number'));
    } else {
      return +argument;
    }
  }

  function ToInteger(argument){
    if (argument && typeof argument === OBJECT && argument.IsCompletion) {
      if (argument.IsAbruptCompletion) {
        return argument;
      }
      argument = argument.value;
    }
    return ToNumber(argument) | 0;
  }

  function ToUint32(argument){
    if (argument && typeof argument === OBJECT && argument.IsCompletion) {
      if (argument.IsAbruptCompletion) {
        return argument;
      }
      argument = argument.value;
    }
    return ToNumber(argument) >>> 0;
  }

  function ToInt32(argument){
    if (argument && typeof argument === OBJECT && argument.IsCompletion) {
      if (argument.IsAbruptCompletion) {
        return argument;
      }
      argument = argument.value;
    }
    return ToNumber(argument) >> 0;
  }

  function ToUint32(argument){
    if (argument && typeof argument === OBJECT && argument.IsCompletion) {
      if (argument.IsAbruptCompletion) {
        return argument;
      }
      argument = argument.value;
    }
    return (ToNumber(argument) >>> 0) % (1 << 16);
  }

  function ToObject(argument){
    switch (typeof argument) {
      case BOOLEAN:
        return new $Boolean(argument);
      case NUMBER:
        return new $Number(argument);
      case STRING:
        return new $String(argument);
      case UNDEFINED:
        return ThrowException('undefined_to_object', []);
      case OBJECT:
        if (argument === null) {
          return ThrowException('null_to_object', []);
        } else if (argument.IsCompletion) {
          if (argument.IsAbruptCompletion) {
            return argument;
          }
          return ToObject(argument.value);
        }
        return argument;
    }
  }

  function ToPropertyKey(argument){
    if (argument && argument.IsCompletion) {
      if (argument.IsAbruptCompletion) {
        return argument;
      } else {
        argument = argument.value;
      }
    }
    if (argument && typeof argument === OBJECT && argument.NativeBrand === NativePrivateName) {
      return argument;
    } else {
      return ToString(argument);
    }
  }

  function ToString(argument){
    switch (typeof argument) {
      case STRING: return argument;
      case UNDEFINED:
      case NUMBER:
      case BOOLEAN: return ''+argument;
      case OBJECT:
        if (argument === null) {
          return 'null';
        } else if (argument.IsCompletion) {
          if (argument.IsAbruptCompletion) {
            return argument;
          }
          return ToString(argument.value);
        }
        return ToString(ToPrimitive(argument, 'String'));
    }
  }

  // ## CheckObjectCoercible

  function CheckObjectCoercible(argument){
    if (argument === null) {
      return ThrowException('null_to_object');
    } else if (argument === undefined) {
      return ThrowException('undefined_to_object');
    } else if (typeof argument === OBJECT && argument.IsCompletion) {
      if (argument.IsAbruptCompletion) {
        return argument;
      }
      return CheckObjectCoercible(argument.value);
    } else {
      return argument;
    }
  }

  // ## IsCallable

  function IsCallable(argument){
    if (argument && typeof argument === OBJECT) {
      if (argument.IsCompletion) {
        if (argument.IsAbruptCompletion) {
          return argument;
        }
        return IsCallable(argument.value);
      }
      return 'Call' in argument;
    } else {
      return false;
    }
  }


  // ## IsArrayIndex

  function IsArrayIndex(argument) {
    var n = +argument >>> 0;
    if ('' + n === argument && n !== 0xffffffff) {
      return true;
    }
    return false;
  }



  // ## Invoke

  function Invoke(key, receiver, args){
    var obj = ToObject(receiver);
    if (obj && obj.IsCompletion) { if (obj.IsAbruptCompletion) return obj; else obj = obj.value; }

    var func = obj.Get(key);
    if (func && func.IsCompletion) { if (func.IsAbruptCompletion) return func; else func = func.value; }

    if (!IsCallable(func))
      return ThrowException('called_non_callable', key);

    return func.Call(receiver, args);
  }


  function MakeConstructor(func, writablePrototype, prototype){
    var install = prototype === undefined;
    if (install)
      prototype = new $Object;
    if (writablePrototype === undefined)
      writablePrototype = true;
    if (install)
      defineDirect(prototype, 'constructor', func, writablePrototype ? _CW : ___);
    defineDirect(func, 'prototype', prototype, writablePrototype ? __W : ___);
  }

  // ## CreateStrictArgumentsObject


  // 10.6
  function CreateStrictArgumentsObject(args) {
    var obj = new $Arguments(args.length);

    for (var i=0; i < args.length; i++) {
      defineDirect(obj, i+'', args[i], ECW);
    }

    //defineDirect(obj, 'caller', intrinsics.ThrowTypeError, __A);
    //defineDirect(obj, ARGUMENTS, intrinsics.ThrowTypeError, __A);
    return obj;
  }


  function ArgAccessor(name, env){
    this.name = name;
    define(this, {
      env: env
    });
  }

  define(ArgAccessor.prototype, {
    Get: {
      Call: function(){
        return this.env.GetBindingValue(this.name);
      }
    },
    Set: {
      Call: function(v){
        this.env.SetMutableBinding(this.name, v);
      }
    }
  });


  // ## CreateMappedArgumentsObject

  function CreateMappedArgumentsObject(names, env, args, func) {
    var obj = new $Arguments(args.length),
        map = new $Object,
        mapped = create(null),
        isMapped;

    for (var i=0; i < args.length; i++) {
      defineDirect(obj, i+'', args[i], ECW);
      var name = names[i];
      if (i < names.length && !(name in mapped)) {
        isMapped = true;
        mapped[name] = true;
        defineDirect(map, name, new ArgAccessor(name, env), _CA);
      }
    }

    defineDirect(obj, 'callee', func, _CW);
    return isMapped ? new $MappedArguments(map, obj) : obj;
  }


  // ## EvaluateConstruct

  function EvaluateConstruct(func, args) {
    if (typeof func !== OBJECT) {
      return ThrowException('not_constructor', func);
    }

    if ('Construct' in func) {
      return func.Construct(args);
    } else {
      return ThrowException('not_constructor', func);
    }
  }


  // ## EvaluateCall

  function EvaluateCall(ref, func, args) {
    if (typeof func !== OBJECT || !IsCallable(func)) {
      return ThrowException('called_non_callable', ref.name);
    }

    if (ref instanceof Reference) {
      var receiver = IsPropertyReference(ref) ? GetThisValue(ref) : ref.base.WithBaseObject();
    }

    return func.Call(receiver, args);
  }



  function TopLevelDeclarationInstantiation(code) {
    var env = context.VariableEnvironment,
        configurable = code.Type === 'eval',
        decls = code.LexicalDeclarations;

    for (var i=0, decl; decl = decls[i]; i++) {
      if (decl.type === 'FunctionDeclaration') {
        var name = decl.id.name;
        if (env.HasBinding(name)) {
          env.CreateMutableBinding(name, configurable);
        } else if (env === realm.globalEnv) {
          var existing = global.GetOwnProperty(name);
          if (!existing) {
            global.DefineOwnProperty(name, {
              Value: undefined,
              Writable: true,
              Enumerable: true,
              Configurable: configurable
            }, true);
          } else if (IsAccessorDescriptor(existing) || !existing.Writable && !existing.Enumerable) {
            return ThrowException('global invalid define');
          }
        }
        env.SetMutableBinding(name, InstantiateFunctionDeclaration(decl), code.Strict);
      }
    }

    for (var i=0; i < code.VarDeclaredNames.length; i++) {
      var name = code.VarDeclaredNames[i];
      if (!env.HasBinding(name)) {
        env.CreateMutableBinding(name, configurable);
        env.SetMutableBinding(name, undefined, code.Strict);
      } else if (env === realm.globalEnv) {
        var existing = global.GetOwnProperty(name);
        if (!existing) {
          global.DefineOwnProperty(name, {
            Value: undefined,
            Writable: true,
            Enumerable: true,
            Configurable: configurable
          }, true);
        }
      }
    }
  }


  // ## FunctionDeclarationInstantiation

  function FunctionDeclarationInstantiation(func, args, env) {
    var params = func.FormalParameters,
        names = params.BoundNames,
        status;

    for (var i=0; i < names.length; i++) {
      if (!env.HasBinding(names[i])) {
        status = env.CreateMutableBinding(names[i]);
        if (status && status.IsAbruptCompletion) {
          return status;
        }

        if (!func.Strict) {
          env.InitializeBinding(names[i], undefined);
        }
      }
    }

    if (func.Strict) {
      var ao = CreateStrictArgumentsObject(args);
      status = ArgumentBindingInitialization(params, ao, env);
    } else {
      var ao = CreateMappedArgumentsObject(names, env, args, func)
      status = ArgumentBindingInitialization(params, ao);
    }

    if (status && status.IsCompletion) {
      if (status.IsAbruptCompletion) {
        return status;
      } else {
        status = status.value;
      }
    }



    if (!env.HasBinding(ARGUMENTS)) {
      if (func.Strict) {
        env.CreateImmutableBinding(ARGUMENTS);
      } else {
        env.CreateMutableBinding(ARGUMENTS);
      }
      env.InitializeBinding(ARGUMENTS, ao);
    }

    var vardecls = func.Code.VarDeclaredNames;

    for (var i=0; i < vardecls.length; i++) {
      if (!env.HasBinding(vardecls[i])) {
        env.CreateMutableBinding(vardecls[i]);
        env.InitializeBinding(vardecls[i], undefined);
      }
    }

    var decls = func.Code.LexicalDeclarations;
    var funcs = create(null);

    for (var i=0; i < decls.length; i++) {
      if (decls[i].type === 'FunctionDeclaration') {
        var decl = decls[i],
            name = decl.BoundNames[0];

        if (!(name in funcs)) {
          funcs[name] = true;
          env.InitializeBinding(name, InstantiateFunctionDeclaration(decl));
        }
      }
    }
  }


  // ## InstantiateFunctionDeclaration

  function InstantiateFunctionDeclaration(decl){
    var func = new $Function(NORMAL, decl.BoundNames[0], decl.Code.params, decl.Code, context.LexicalEnvironment, decl.Code.Strict);
    MakeConstructor(func);
    return func;
  }


  // ## BlockDeclarationInstantiation

  function BlockDeclarationInstantiation(code, env){
    var decls = code.LexicalDeclarations;
    for (var i=0, decl; decl = decls[i]; i++) {
      for (var j=0, name; name = decl.BoundNames[j]; j++) {
        if (decl.IsConstantDeclaration) {
          env.CreateImmutableBinding(name);
        } else {
          env.CreateMutableBinding(name, false);
        }
      }
    }

    for (i=0; i < decls.length; i++) {
      if (decls[i].type === 'FunctionDeclaration') {
        env.InitializeBinding(decls[i].BoundNames[0], InstantiateFunctionDeclaration(decls[i]));
      }
    }
  }

  // ## IdentifierResolution

  function IdentifierResolution(name) {
    return GetIdentifierReference(context.LexicalEnvironment, name, context.strict);
  }

  // ## BindingInitialization

  function BindingInitialization(pattern, value, env){
    if (pattern.type === 'Identifier') {
      if (env) {
        env.InitializeBinding(pattern.name, value);
      } else {
        return PutValue(IdentifierResolution(pattern.name), value);
      }
    } else if (pattern.type === 'ArrayPattern') {
      return IndexedBindingInitialization(pattern, value, 0, env);
    } else if (pattern.type === 'ObjectPattern') {
      return ObjectBindingInitialization(pattern, value, env);
    }
  }

  // ## ArgumentBindingInitialization

  function ArgumentBindingInitialization(params, args, env){
    for (var i = 0, arg; arg = params[i]; i++) {
      var value = args.HasProperty(i) ? args.Get(i) : undefined;
      if (value && value.IsCompletion) {
        if (value.IsAbruptCompletion) {
          return value;
        } else {
          value = value.value;
        }
      }
      BindingInitialization(arg, value, env);
    }
    if (params.Rest) {
      var len = getDirect(args, 'length') - params.length;
          array = new $Array(0);

      if (len > 0) {
        for (var i=0; i < len; i++) {
          setDirect(array, i, getDirect(args, params.length + i));
        }
        setDirect(array, 'length', len);
      }
      BindingInitialization(params.Rest, array, env);
    }
  }


  // ## IndexedBindingInitialization

  function IndexedBindingInitialization(pattern, array, i, env){
    for (var element; element = pattern.elements[i]; i++) {
      var value = array.HasProperty(i) ? array.Get(i) : undefined;
      if (value && value.IsCompletion) {
        if (value.IsAbruptCompletion) {
          return value;
        } else {
          value = value.value;
        }
      }
      BindingInitialization(element, value, env);
    }
    return i;
  }

  // ## ObjectBindingInitialization

  function ObjectBindingInitialization(pattern, object, env){
    for (var i=0; property = pattern.properties[i]; i++) {
      var value = object.HasProperty(property.key.name) ? object.Get(property.key.name) : undefined;
      if (value && value.IsCompletion) {
        if (value.IsAbruptCompletion) {
          return value;
        } else {
          value = value.value;
        }
      }
      BindingInitialization(property.value, value, env);
    }
  }

  var PRE_INC, POST_INC, PRE_DEC, POST_DEC;
  void function(createChanger){
    PRE_INC = createChanger(true, 1);
    POST_INC = createChanger(false, 1);
    PRE_DEC = createChanger(true, -1);
    POST_DEC = createChanger(false, -1);
  }(function(pre, change){
    return function(ref) {
      var val = ToNumber(GetValue(ref));
      if (val && val.IsAbruptCompletion) {
        return val;
      }

      var newVal = val + change,
          result = PutValue(ref, newVal);

      if (result && result.IsAbruptCompletion) {
        return result;
      }
      return pre ? newVal : val;
    };
  });




  function DELETE(ref){
    if (!ref || !ref.IsReference) {
      return true;
    }

    if (IsUnresolvableReference(ref)) {
      if (ref.strict) {
        return ThrowException('strict_delete_property', [ref.name, ref.base]);
      } else {
        return true;
      }
    }

    if (IsPropertyReference(ref)) {
      if (IsSuperReference(ref)) {
        return ThrowException('super_delete_property', ref.name);
      } else {
        var obj = ToObject(ref.base)
        if (obj && obj.IsCompletion) {
          if (obj.IsAbruptCompletion) {
            return obj;
          } else {
            obj = obj.value;
          }
        }

        return obj.Delete(ref.name, ref.strict);
      }
    } else {
      return ref.base.DeleteBinding(ref.name);
    }
  }

  function VOID(ref){
    var val = GetValue(ref);
    if (val && val.IsAbruptCompletion) {
      return val;
    }
    return undefined;
  }

  function TYPEOF(val) {
    var type = typeof val;
    switch (type) {
      case UNDEFINED:
      case BOOLEAN:
      case NUMBER:
      case STRING: return type;
      case OBJECT:
        if (val === null) {
          return OBJECT;
        }

        if (val && val.IsCompletion) {
          if (val.IsAbruptCompletion) {
            return val;
          } else {
            val = val.value;
          }
        }

        if (val.IsReference) {
          if (IsUnresolvableReference(val)) {
            return UNDEFINED;
          }
          return TYPEOF(GetValue(val));
        }

        if ('Call' in val) {
          return FUNCTION;
        } else {
          return OBJECT;
        }
      }
  }


  function POSITIVE(ref){
    return ToNumber(GetValue(ref));
  }

  var NEGATIVE, BIT_NOT, NOT;
  void function(createUnaryOp){
    NEGATIVE = createUnaryOp(ToNumber, function(n){ return -n });
    BIT_NOT = createUnaryOp(ToInt32, function(n){ return ~n });
    NOT = createUnaryOp(ToBoolean, function(n){ return !n });
  }(function(convert, finalize){
    return function(ref){
      if (!ref || typeof ref !== OBJECT) {
        return finalize(ref);
      }
      var val = convert(GetValue(ref));

      if (val && val.IsCompletion) {
        if (val.IsAbruptCompletion) {
          return val;
        } else {
          val = val.value;
        }
      }

      return finalize(val);
    }
  });

  var MUL, DIV, MOD, SUB;
  void function(makeMultiplier){
    MUL = makeMultiplier(function(l, r){ return l * r });
    DIV = makeMultiplier(function(l, r){ return l / r });
    MOD = makeMultiplier(function(l, r){ return l % r });
    SUB = makeMultiplier(function(l, r){ return l - r });
  }(function(finalize){
    return function(lval, rval) {
      lval = ToNumber(lval);
      if (lval && lval.IsCompletion) {
        if (lval.IsAbruptCompletion) {
          return lval;
        } else {
          lval = lval.value;
        }
      }
      rval = ToNumber(rval);
      if (rval && rval.IsCompletion) {
        if (rval.IsAbruptCompletion) {
          return rval;
        } else {
          rval = rval.value;
        }
      }
      return finalize(lval, rval);
    };
  });

  function ADD(lval, rval) {
    lval = ToPrimitive(lval);
    if (lval && lval.IsCompletion) {
      if (lval.IsAbruptCompletion) {
        return lval;
      } else {
        lval = lval.value;
      }
    }

    rval = ToPrimitive(rval);
    if (rval && rval.IsCompletion) {
      if (rval && rval.IsAbruptCompletion) {
        return rval;
      } else {
        rval = rval.value;
      }
    }

    var ltype = typeof lval,
        rtype = typeof rval;

    if (ltype === 'string' || rtype === 'string') {
      if (ltype !== 'string') {
        lval = ToString(lval);
        if (lval && lval.IsCompletion) {
          if (lval.IsAbruptCompletion) {
            return lval;
          } else {
            lval = lval.value;
          }
        }
      } else if (rtype !== 'string') {
        rval = ToString(rval);
        if (rval && rval.IsCompletion) {
          if (rval.IsAbruptCompletion) {
            return rval;
          } else {
            rval = rval.value;
          }
        }
      }
    } else {
      if (ltype !== 'number') {
        lval = ToNumber(lval);
        if (lval && lval.IsCompletion) {
          if (lval.IsAbruptCompletion) {
            return lval;
          } else {
            lval = lval.value;
          }
        }
      } else if (rtype !== 'number') {
        rval = ToNumber(rval);
        if (rval && rval.IsCompletion) {
          if (rval.IsAbruptCompletion) {
            return rval;
          } else {
            rval = rval.value;
          }
        }
      }
    }

    return lval + rval;
  }

  var SHL, SHR, SAR;
  void function(makeShifter){
    SHL = makeShifter(function(l, r){ return l << r });
    SHR = makeShifter(function(l, r){ return l >> r });
    SAR = makeShifter(function(l, r){ return l >>> r });
  }(function(finalize){
    return function(lval, rval) {
      lval = ToInt32(lval);
      if (lval && lval.IsCompletion) {
        if (lval.IsAbruptCompletion) {
          return lval;
        } else {
          lval = lval.value;
        }
      }
      rval = ToUint32(rval);
      if (rval && rval.IsCompletion) {
        if (rval.IsAbruptCompletion) {
          return rval;
        } else {
          rval = rval.value;
        }
      }
      return finalize(lval, rval & 0x1F);
    };
  });



  function COMPARE(x, y, left){
    if (left === false) {
      var lval = x,
          rval = y;
    } else {
      var lval = y,
          rval = x;
    }

    lval = ToPrimitive(lval, 'Number');
    if (lval && lval.IsCompletion) {
      if (lval.IsAbruptCompletion) {
        return lval;
      } else {
        lval = lval.value;
      }
    }

    rval = ToPrimitive(rval, 'Number');
    if (rval && rval.IsCompletion) {
      if (rval.IsAbruptCompletion) {
        return rval;
      } else {
        rval = rval.value;
      }
    }

    var ltype = typeof lval,
        rtype = typeof rval;

    if (ltype === 'string' || rtype === 'string') {
      if (ltype !== 'string') {
        lval = ToString(lval);
        if (lval && lval.IsCompletion) {
          if (lval.IsAbruptCompletion) {
            return lval;
          } else {
            lval = lval.value;
          }
        }
      } else if (rtype !== 'string') {
        rval = ToString(rval);
        if (rval && rval.IsCompletion) {
          if (rval.IsAbruptCompletion) {
            return rval;
          } else {
            rval = rval.value;
          }
        }
      }
      if (typeof lval === 'string' && typeof rval === 'string') {
        return lval < rval;
      }
    } else {
      if (ltype !== 'number') {
        lval = ToNumber(lval);
        if (lval && lval.IsCompletion) {
          if (lval.IsAbruptCompletion) {
            return lval;
          } else {
            lval = lval.value;
          }
        }
      }
      if (rtype !== 'number') {
        rval = ToNumber(rval);
        if (rval && rval.IsCompletion) {
          if (rval.IsAbruptCompletion) {
            return rval;
          } else {
            rval = rval.value;
          }
        }
      }
      if (typeof lval === 'number' && typeof rval === 'number') {
        return lval < rval;
      }
    }
  }

  var LT, GT, LTE, GTE;
  void function(creatorComparer){
    LT = creatorComparer(true, false);
    GT = creatorComparer(false, false);
    LTE = creatorComparer(true, true);
    GTE = creatorComparer(false, true);
  }(function(reverse, left){
    return function(lval, rval){
      if (reverse) {
        var temp = lval;
        lval = rval;
        rval = temp;
      }

      var result = COMPARE(lval, rval, left);
      if (result && result.IsCompletion) {
        if (result.IsAbruptCompletion) {
          return result;
        } else {
          result = result.value;
        }
      }

      if (result === undefined) {
        return false;
      } else if (left) {
        return !result;
      } else {
        return result;
      }
    };
  });


  function INSTANCE_OF(lval, rval) {
    if (lval === null || typeof lval !== OBJECT || !('HasInstance' in lval)) {
      return ThrowException('instanceof_function_expected', lval);
    }

    return lval.HasInstance(rval);
  }

  function IN(lval, rval) {
    if (lval === null || typeof lval !== OBJECT) {
      return ThrowException('invalid_in_operator_use', [rval, lval]);
    }

    rval = ToString(rval);
    if (rval && rval.IsCompletion) {
      if (rval.IsAbruptCompletion) {
        return rval;
      } else {
        rval = rval.value;
      }
    }

    return lval.HasProperty(rval);
  }



  function IS(x, y) {
    if (x && x.IsCompletion) {
      if (x.IsAbruptCompletion) {
        return x;
      } else {
        x = x.value;
      }
    }
    if (y && y.IsCompletion) {
      if (y.IsAbruptCompletion) {
        return y;
      } else {
        y = y.value;
      }
    }
    return x === y ? (x !== 0 || 1 / x === 1 / y) : (x !== x && y !== y);
  }

  function STRICT_EQUAL(x, y) {
    if (x && x.IsCompletion) {
      if (x.IsAbruptCompletion) {
        return x;
      } else {
        x = x.value;
      }
    }
    if (y && y.IsCompletion) {
      if (y.IsAbruptCompletion) {
        return y;
      } else {
        y = y.value;
      }
    }
    return x === y;
  }


  function EQUAL(x, y){
    if (x && x.IsCompletion) {
      if (x.IsAbruptCompletion) {
        return x;
      } else {
        x = x.value;
      }
    }
    if (y && y.IsCompletion) {
      if (y.IsAbruptCompletion) {
        return y;
      } else {
        y = y.value;
      }
    }

    var ltype = typeof x,
        rtype = typeof y;

    if (ltype === rtype) {
      return STRICT_EQUAL(x, y);
    } else if (x == null && x == y) {
      return true;
    } else if (ltype === NUMBER && rtype === STRING) {
      return EQUAL(x, ToNumber(y));
    } else if (ltype === STRING && rtype === NUMBER) {
      return EQUAL(ToNumber(x), y);
    } else if (rtype === OBJECT && ltype === STRING || ltype === OBJECT) {
      return EQUAL(x, ToPrimitive(y));
    } else if (ltype === OBJECT && rtype === STRING || rtype === OBJECT) {
      return EQUAL(ToPrimitive(x), y);
    } else {
      return false;
    }
  }

  function UnaryOp(operator, val) {
    switch (operator) {
      case 'delete': return DELETE(val);
      case 'void':   return VOID(val);
      case 'typeof': return TYPEOF(val);
      case '+':      return POSITIVE(val);
      case '-':      return NEGATIVE(val);
      case '~':      return BIT_NOT(val);
      case '!':      return NOT(val);
    }
  }

  function BinaryOp(operator, lval, rval) {
    switch (operator) {
      case 'instanceof': return INSTANCE_OF(lval, rval);
      case 'in':   return IN(lval, rval);
      case 'is':   return IS(lval, rval);
      case 'isnt': return NOT(IS(lval, rval));
      case '==':   return EQUAL(lval, rval);
      case '!=':   return NOT(EQUAL(lval, rval));
      case '===':  return STRICT_EQUAL(lval, rval);
      case '!==':  return NOT(STRICT_EQUAL(lval, rval));
      case '<':    return LT(lval, rval);
      case '>':    return GT(lval, rval);
      case '<=':   return LTE(lval, rval);
      case '>=':   return GTE(lval, rval);
      case '*':    return MUL(lval, rval);
      case '/':    return DIV(lval, rval);
      case '%':    return MOD(lval, rval);
      case '+':    return ADD(lval, rval);
      case '-':    return SUB(lval, rval);
      case '<<':   return SHL(lval, rval);
      case '>>':   return SHR(lval, rval);
      case '>>>':  return SAR(lval, rval);
      case '|':    return BIT_OR(lval, rval);
      case '&':    return BIT_AND(lval, rval);
      case '^':    return BIT_XOR(lval, rval);
    }
  }


  function DefineProperty(obj, key, val) {
    if (val && val.IsCompletion) {
      if (val.IsAbruptCompletion) {
        return val;
      } else {
        val = val.value;
      }
    }
    return obj.DefineOwnProperty(key, new NormalDescriptor(val), false);
  }

  function PropertyDefinitionEvaluation(kind, obj, key, code) {
    if (kind === 'get') {
      return DefineGetter(obj, key, code);
    } else if (kind === 'set') {
      return DefineSetter(obj, key, code);
    } else if (kind === 'method') {
      return DefineMethod(obj, key, code);
    }
  }

  var DefineMethod, DefineGetter, DefineSetter;

  void function(){
    function makeDefiner(constructs, field, desc){
      return function(obj, key, code) {
        var sup = code.NeedsSuperBinding,
            home = sup ? obj : undefined,
            func = new $Function(METHOD, key, code.params, code, context.LexicalEnvironment, code.Strict, undefined, home, sup);

        constructs && MakeConstructor(func);
        desc[field] = func;
        var result = obj.DefineOwnProperty(key, desc, false);
        desc[field] = undefined;

        return result && result.IsAbruptCompletion ? result : func;
      };
    }

    DefineMethod = makeDefiner(false, VALUE, {
      Value: undefined,
      Writable: true,
      Enumerable: true,
      Configurable: true
    });

    DefineGetter = makeDefiner(true, GET, {
      Get: undefined,
      Enumerable: true,
      Configurable: true
    });

    DefineSetter = makeDefiner(true, SET, {
      Set: undefined,
      Enumerable: true,
      Configurable: true
    });
  }();

  // ## Element

  function Element(prop, base) {
    var result = CheckObjectCoercible(base);
    if (result.IsAbruptCompletion) {
      return result;
    }

    var name = ToString(prop);
    if (name && name.IsCompletion) {
      if (name.IsAbruptCompletion) {
        return name;
      } else {
        name = name.value;
      }
    }

    return new Reference(base, name, context.Strict);
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

  define(Reference.prototype, {
    IsReference: ReferenceSigil
  });



  // ##################
  // ### Completion ###
  // ##################

  function Completion(type, value, target){
    this.type = type;
    this.value = value;
    this.target = target;
  }

  define(Completion.prototype, {
    IsCompletion: CompletionSigil
  }, [
    function toString(){
      return this.value;
    },
    function valueOf(){
      return this.value;
    }
  ]);

  function AbruptCompletion(type, value, target){
    this.type = type;
    this.value = value;
    this.target = target;
  }

  inherit(AbruptCompletion, Completion, {
    IsAbruptCompletion: AbruptCompletionSigil
  });



  // ##########################
  // ### PropertyDescriptor ###
  // ##########################

  function PropertyDescriptor(attributes){
    this.Enumerable = (attributes & E) > 0;
    this.Configurable = (attributes & C) > 0;
  }

  define(PropertyDescriptor.prototype, {
    Enumerable: undefined,
    Configurable: undefined
  });

  function DataDescriptor(value, attributes){
    this.Value = value;
    this.Writable = (attributes & W) > 0;
    this.Enumerable = (attributes & E) > 0;
    this.Configurable = (attributes & C) > 0;
  }

  inherit(DataDescriptor, PropertyDescriptor, {
    Writable: undefined,
    Value: undefined
  });

  function AccessorDescriptor(accessors, attributes){
    this.Get = accessors.Get;
    this.Set = accessors.Set;
    this.Enumerable = (attributes & E) > 0;
    this.Configurable = (attributes & C) > 0;
  }

  inherit(AccessorDescriptor, PropertyDescriptor, {
    Get: undefined,
    Set: undefined
  });

  function NormalDescriptor(value){
    this.Value = value;
  }

  var emptyValue = NormalDescriptor.prototype = new DataDescriptor(undefined, ECW);

  function StringIndice(value){
    this.Value = value;
  }

  StringIndice.prototype = new DataDescriptor(undefined, E__);

  function Accessor(get, set){
    this.Get = get;
    this.Set = set;
  }

  define(Accessor.prototype, {
    Get: undefined,
    Set: undefined
  });

  function Value(value){
    this.Value = value;
  }


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
    function HasBinding(name){},
    function GetBindingValue(name, strict){},
    function SetMutableBinding(name, value, strict){},
    function DeleteBinding(name){},
    function CreateVarBinding(name, deletable){
      return this.CreateMutableBinding(name, deletable);
    },
    function WithBaseObject(){
      return this.withBase;
    },
    function HasThisBinding(){
      return false;
    },
    function HasSuperBinding(){
      return false;
    },
    function GetThisBinding(){},
    function GetSuperBase(){}
  ]);


  function DeclarativeEnvironmentRecord(){
    EnvironmentRecord.call(this, new Hash);
    this.consts = new Hash;
    this.deletables = new Hash;
  }

  inherit(DeclarativeEnvironmentRecord, EnvironmentRecord, [
    function HasBinding(name){
      return name in this.bindings;
    },
    function CreateMutableBinding(name, deletable){
      this.bindings[name] = undefined;
      if (deletable)
        this.deletables[name] = true;
    },
    function InitializeBinding(name, value){
      this.bindings[name] = value;
    },
    function GetBindingValue(name, strict){
      if (name in this.bindings) {
        var value = this.bindings[name];
        if (value === UNINITIALIZED)
          return ThrowException('uninitialized_const', name);
        else
          return value;
      } else if (strict) {
        return ThrowException('not_defined', name);
      } else {
        return false;
      }
    },
    function SetMutableBinding(name, value, strict){
      if (name in this.consts) {
        if (this.bindings[name] === UNINITIALIZED)
          return ThrowException('uninitialized_const', name);
        else if (strict)
          return ThrowException('const_assign', name);
      } else {
        this.bindings[name] = value;
      }
    },
    function CreateImmutableBinding(name){
      this.bindings[name] = UNINITIALIZED;
      this.consts[name] = true;
    },
    function DeleteBinding(name){
      if (name in this.bindings) {
        if (name in this.deletables) {
          delete this.bindings[name];
          delete this.deletables[names];
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    }
  ]);


  function ObjectEnvironmentRecord(object){
    EnvironmentRecord.call(this, object);
  }

  inherit(ObjectEnvironmentRecord, EnvironmentRecord, [
    function HasBinding(name){
      return this.bindings.HasProperty(name);
    },
    function CreateMutableBinding(name, deletable){
      return this.bindings.DefineOwnProperty(name, emptyValue, true);
    },
    function InitializeBinding(name, value){
      return this.bindings.DefineOwnProperty(name, new NormalDescriptor(value), true);
    },
    function GetBindingValue(name, strict){
      if (this.bindings.HasProperty(name)) {
        return this.bindings.Get(name);
      } else if (strict) {
        return ThrowException('not_defined', name);
      }
    },
    function SetMutableBinding(name, value, strict){

      return this.bindings.Put(name, value, strict);
    },
    function DeleteBinding(name){
     return this.bindings.Delete(name, false);
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
    thisValue: undefined,
  }, [
    function HasThisBinding(){
      return true;
    },
    function HasSuperBinding(){
      return this.HomeObject !== undefined;
    },
    function GetThisBinding(){
      return this.thisValue;
    },
    function GetSuperBase(){
      return this.HomeObject ? this.HomeObject.GetPrototype() : undefined;
    },
    function GetMethodName() {
      return this.MethodName;
    }
  ]);


  function GlobalEnvironmentRecord(global){
    ObjectEnvironmentRecord.call(this, global);
  }

  inherit(GlobalEnvironmentRecord, ObjectEnvironmentRecord, {
    outer: null
  }, [
    function GetThisBinding(){
      return this.bindings;
    },
    function HasThisBinding(){
      return true;
    },
    function GetSuperBase(){
      return this.bindings;
    },
    function inspect(){
      return '[GlobalEnvironmentRecord]';
    }
  ]);



  // ###################
  // ### NativeBrand ###
  // ##################

  function NativeBrand(name){
    this.name = name;
    this.brand = '[object '+name+']';
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
    if (proto === undefined)
      proto = intrinsics.ObjectProto;
    this.Prototype = proto;
    this.properties = new Hash;
    this.attributes = new Hash;
    define(this, 'keys', new PropertyList);
    hide(this, 'Prototype');
    hide(this, 'attributes');
  }

  define($Object.prototype, {
    Extensible: true,
    NativeBrand: NativeObject
  });

  define($Object.prototype, [
    function GetPrototype(){
      return this.Prototype;
    },
    function SetPrototype(value){
      this.Prototype = value;
    },
    function GetExtensible(){
      return this.Extensible;
    },
    function GetOwnProperty(key){
      if (this.keys.has(key)) {
        var attrs = this.attributes[key];
        var Descriptor = attrs & A ? AccessorDescriptor : DataDescriptor;
        return new Descriptor(this.properties[key], attrs);
      }
    },
    function GetProperty(key){
      var desc = this.GetOwnProperty(key);
      if (desc) {
        return desc
      } else {
        var proto = this.GetPrototype();
        if (proto) {
          return proto.GetProperty(key);
        }
      }
    },
    function Get(key){
      if (key === '__proto__') {
        return this.GetPrototype();
      }
      return this.GetP(this, key);
    },
    function Put(key, value, strict){
      if (key === '__proto__') {
        return this.SetPrototype(value);
      }
      if (!this.SetP(this, key, value) && strict) {
        return ThrowException('strict_cannot_assign', [key]);
      }
    },
    function GetP(receiver, key){
      if (!this.keys.has(key)) {
        var proto = this.GetPrototype();
        if (proto) {
          return proto.GetP(receiver, key);
        }
      } else {
        var attrs = this.attributes[key];
        if (attrs & A) {
          var getter = this.properties[key].Get;
          if (IsCallable(getter))
            return getter.Call(receiver, []);
        } else {
          return this.properties[key];
        }
      }
    },
    function SetP(receiver, key, value) {
      if (this.keys.has(key)) {
        var attrs = this.attributes[key];
        if (attrs & A) {
          var setter = this.properties[key].Set;
          if (IsCallable(setter)) {
            setter.Call(receiver, [value]);
            return true;
          } else {
            return false;
          }
        } else if (attrs & W) {
          if (this === receiver) {
            return this.DefineOwnProperty(key, new Value(value), false);
          } else if (!receiver.GetExtensible()) {
            return false;
          } else {
            return receiver.DefineOwnProperty(key, new DataDescriptor(value, ECW), false);
          }
        } else {
          return false;
        }
      } else {
        var proto = this.GetPrototype();
        if (!proto) {
          if (!receiver.GetExtensible()) {
            return false;
          } else {
            return receiver.DefineOwnProperty(key, new DataDescriptor(value, ECW), false);
          }
        } else {
          return proto.SetP(receiver, key, value);
        }
      }
    },
    function DefineOwnProperty(key, desc, strict){
      var reject = strict
          ? function(e, a){ return ThrowException(e, a) }
          : function(e, a){ return false };

      var current = this.GetOwnProperty(key);

      if (current === undefined) {
        if (!this.GetExtensible()) {
          return reject('define_disallowed', []);
        } else {
          if (IsGenericDescriptor(desc) || IsDataDescriptor(desc)) {
            this.attributes[key] = desc.Enumerable | (desc.Configurable << 1) | (desc.Writable << 2);
            this.properties[key] = desc.Value;
          } else {
            this.attributes[key] = desc.Enumerable | (desc.Configurable << 1) | A;
            this.properties[key] = new Accessor(desc.Get, desc.Set);
          }
          this.keys.add(key);
          return true;
        }
      } else {
        var rejected = false;
        if (IsEmptyDescriptor(desc) || IsEquivalentDescriptor(desc, current)) {
          return;
        }

        if (!current.Configurable) {
          if (desc.Configurable || desc.Enumerable === !current.Configurable) {
            return reject('redefine_disallowed', []);
          } else {
            var currentIsData = IsDataDescriptor(current),
                descIsData = IsDataDescriptor(desc);

            if (currentIsData !== descIsData)
              return reject('redefine_disallowed', []);
            else if (currentIsData && descIsData)
              if (!current.Writable && VALUE in desc && desc.Value !== current.Value)
                return reject('redefine_disallowed', []);
            else if (SET in desc && desc.Set !== current.Set)
              return reject('redefine_disallowed', []);
            else if (GET in desc && desc.Get !== current.Get)
              return reject('redefine_disallowed', []);
          }
        }

        CONFIGURABLE in desc || (desc.Configurable = current.Configurable);
        ENUMERABLE in desc || (desc.Enumerable = current.Enumerable);

        if (IsAccessorDescriptor(desc)) {
          this.attributes[key] = desc.Enumerable | (desc.Configurable << 1) | A;
          if (IsDataDescriptor(current)) {
            this.properties[key] = new Accessor(desc.Get, desc.Set);
          } else {
            if (SET in desc)
              this.properties[key].Set = desc.Set;
            if (GET in desc)
              this.properties[key].Get = desc.Get;
          }
        } else {
          if (IsAccessorDescriptor(current)) {
            current.Writable = true;
          }
          WRITABLE in desc || (desc.Writable = current.Writable)
          this.properties[key] = desc.Value;
          this.attributes[key] = desc.Enumerable | (desc.Configurable << 1) | (desc.Writable << 2);
        }

        this.keys.add(key);
        return true;
      }
    },
    function HasOwnProperty(key){
      return key === '__proto__' ? false : this.keys.has(key);
    },
    function HasProperty(key){
      if (this.keys.has(key) || key === '__proto__') {
        return true;
      } else {
        var proto = this.GetPrototype();
        if (proto) {
          return proto.HasProperty(key);
        } else {
          return false;
        }
      }
    },
    function Delete(key, strict){
      if (key === '__proto__') {
        return false;
      } else if (!this.keys.has(key)) {
        return true;
      } else if (this.attributes[key] & C) {
        delete this.properties[key];
        delete this.attributes[key];
        this.keys.remove(key);
        return true;
      } else if (strict) {
        return ThrowException('strict_delete', []);
      } else {
        return false;
      }
    },
    function Enumerate(){
      var props = this.keys.filter(function(key){
        return this.attributes[key] & E;
      }, this);

      var proto = this.GetPrototype();
      if (proto) {
        props.add(proto.Enumerate());
      }

      return props.toArray();
    },
    function GetOwnPropertyNames(){
      return this.keys.toArray();
    },
    function GetPropertyNames(){
      var props = this.keys.clone();

      var proto = this.GetPrototype();
      if (proto) {
        props.add(proto.GetPropertyNames());
      }

      return props.toArray();
    },
    function DefaultValue(hint){
      var order = hint === 'String' ? ['toString', 'valueOf'] : ['valueOf', 'toString'];

      for (var i=0; i < 2; i++) {
        var method = this.Get(order[i]);
        if (method && method.IsCompletion) {
          if (method.IsAbruptCompletion) {
            return method;
          } else {
            method = method.value;
          }
        }

        if (IsCallable(method)) {
          var val = method.Call(this, []);
          if (val && val.IsCompletion) {
            if (val.IsAbruptCompletion) {
              return val;
            } else {
              val = val.value;
            }
          }
          if (!isObject(val)) {
            return val;
          }
        }
      }

      return ThrowException('cannot_convert_to_primitive', []);
    },
  ]);

  var DefineOwn = $Object.prototype.DefineOwnProperty;

  // #################
  // ### $Function ###
  // #################

  function $Function(kind, name, params, code, scope, strict, proto, holder, method){
    if (proto === undefined)
      proto = intrinsics.FunctionProto;

    $Object.call(this, proto);
    this.FormalParameters = params;
    this.ThisMode = kind === ARROW ? 'lexical' : strict ? 'strict' : 'global';
    this.Strict = !!strict;
    this.Realm = realm;
    this.Scope = scope;
    this.Code = code;
    if (holder !== undefined)
      this.Home = holder;
    if (method) {
      this.MethodName = name;
    } else if (typeof name === 'string') {
      defineDirect(this, 'name', name, ___);
    }

    defineDirect(this, 'length', params.ExpectedArgumentCount, ___);
    if (kind === NORMAL && strict) {
      defineDirect(this, 'caller', intrinsics.ThrowTypeError, __A);
      defineDirect(this, ARGUMENTS, intrinsics.ThrowTypeError, __A);
    } else {
      defineDirect(this, 'caller', null, ___);
    }
    hide(this, 'Realm');
    hide(this, 'Code');
    hide(this, 'Scope');
    hide(this, 'FormalParameters');
    hide(this, 'Strict');
    hide(this, 'ThisMode');
  }

  inherit($Function, $Object, {
    NativeBrand: NativeFunction,
    FormalParameters: null,
    Code: null,
    Scope: null,
    TargetFunction: null,
    BoundThis: null,
    BoundArguments: null,
    Strict: false,
    ThisMode: 'global',
    Realm: null,
  }, [
    function Call(receiver, args, isConstruct){
      if (this.ThisMode === 'lexical') {
        var local = NewDeclarativeEnvironment(this.Scope);
      } else {
        if (this.ThisMode !== 'strict') {
          if (receiver == null) {
            receiver = this.Realm.global;
          } else if (typeof receiver !== OBJECT) {
            receiver = ToObject(receiver);
            if (receiver.IsCompletion) {
              if (receiver.IsAbruptCompletion) {
                return receiver;
              } else {
                receiver = receiver.value;
              }
            }
          }
        }
        var local = NewMethodEnvironment(this, receiver);
      }

      if (!this.Strict) {
        defineDirect(this, 'caller', context.callee, ___);
      }
      ExecutionContext.push(new ExecutionContext(context, local, this.Realm, this.Code, this, isConstruct));

      var status = FunctionDeclarationInstantiation(this, args, local);
      if (status && status.IsAbruptCompletion) {
        ExecutionContext.pop();
        return status;
      }

      if (!this.thunk) {
        this.thunk = createThunk(this.Code);
        hide(this, 'thunk');
      }
      var result = this.thunk.run();
      ExecutionContext.pop();
      if (!this.Strict) {
        defineDirect(this, 'caller', null, ___);
      }
      if (result && result.type === ReturnSigil) {
        return result.Value
      }
      return result;
    },
    function Construct(args){
      var prototype = this.Get('prototype');
      if (prototype.IsCompletion) {
        if (prototype.IsAbruptCompletion) {
          return prototype;
        } else {
          prototype = prototype.value;
        }
      }
      var instance = typeof prototype === OBJECT ? new $Object(prototype) : new $Object;
      var result = this.Call(instance, args, true);
      if (result && result.IsCompletion) {
        if (result.IsAbruptCompletion) {
          return result;
        } else {
          result = result.value;
        }
      }
      return typeof result === OBJECT ? result : instance;
    },
    function HasInstance(arg){
      if (typeof arg !== OBJECT || arg === null) {
        return false;
      }

      var prototype = this.Get('prototype');
      if (prototype.IsCompletion) {
        if (prototype.IsAbruptCompletion) {
          return prototype;
        } else {
          prototype = prototype.value;
        }
      }

      if (typeof prototype !== OBJECT) {
        return ThrowException('instanceof_nonobject_proto');
      }

      while (arg) {
        arg = arg.GetPrototype();
        if (prototype === arg) {
          return true;
        }
      }
      return false;
    }
  ]);


  function $NativeFunction(options){
    if (options.proto === undefined)
      options.proto = intrinsics.FunctionProto;
    $Object.call(this, options.proto);
    defineDirect(this, 'name', options.name, ___);
    defineDirect(this, 'length', options.length, ___);
    defineDirect(this, 'caller', null, ___);
    this.call = options.call;
    if (options.construct) {
      this.construct = options.construct;
    }
    this.Realm = realm;
    hide(this, 'Realm');
    hide(this, 'call');
  }
  inherit($NativeFunction, $Function, {
    Native: true,
  }, [
    function Call(receiver, args){
      return this.call.apply(receiver, args);
    },
    function Construct(args){
      if (this.construct) {
        if (hasDirect(this, 'prototype')) {
          var instance = new $Object(getDirect(this, 'prototype'));
        } else {
          var instance = new $Object;
        }
        return this.construct.apply(instance, args);
      } else {
        return this.call.apply(undefined, args);
      }
    }
  ]);


  // #############
  // ### $Date ###
  // #############

  function $Date(value){
    $Object.call(this, intrinsics.DateProto);
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
    $Object.call(this, intrinsics.StringProto);
    this.PrimitiveValue = value;
    defineDirect(this, 'length', value.length, ___);
  }

  inherit($String, $Object, {
    NativeBrand: StringWrapper,
    PrimitiveValue: undefined,
    GetOwnProperty: function GetOwnProperty(key){
      var desc = $Object.prototype.GetOwnProperty.call(this, key);
      if (desc) {
        return desc;
      }

      var index = ToInteger(key);
      if (index.IsCompletion) {
        if (index.IsAbruptCompletion) {
          return index;
        } else {
          index = index.value;
        }
      }

      if (index === +key && this.PrimitiveValue.length > index) {
        return new StringIndice(this.PrimitiveValue[index]);
      }
    },
    HasOwnProperty: function HasOwnProperty(key){
      key = ToString(key);
      if (key && key.IsCompletion) {
        if (key.IsAbruptCompletion) {
          return key;
        } else {
          key = key.value;
        }
      }
      if (typeof key === 'string') {
        if (key < getDirect(this, 'length') && key > 0 || key === '0') {
          return true;
        }
      }
      return $Object.prototype.HasOwnProperty.call(this, key);
    },
    HasProperty: function HasProperty(key){
      var ret = this.HasOwnProperty(key);
      if (ret && ret.IsCompletion) {
        if (ret.IsAbruptCompletion) {
          return ret;
        } else {
          ret = ret.value;
        }
      }
      if (ret === true) {
        return true;
      } else {
        return $Object.prototype.HasProperty.call(this, key);
      }
    },
    Enumerate: function Enumerate(){
      var props = this.keys.filter(function(key){
        return this.attributes[key] & E;
      }, this)
      props.add(numbers(this.PrimitiveValue.length));

      var proto = this.GetPrototype();
      if (proto) {
        props.add(proto.Enumerate());
      }

      return props.toArray();
    },
    GetOwnPropertyNames: function GetOwnPropertyNames(){
      return this.keys.toArray().concat(numbers(this.PrimitiveValue.length));
    },
    GetPropertyNames: function GetPropertyNames(){
      var props = this.keys.clone();
      props.add(numbers(this.PrimitiveValue.length));

      var proto = this.GetPrototype();
      if (proto) {
        props.add(proto.GetPropertyNames());
      }

      return props.toArray();
    },
  });


  // ###############
  // ### $Number ###
  // ###############

  function $Number(value){
    $Object.call(this, intrinsics.NumberProto);
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
    $Object.call(this, intrinsics.BooleanProto);
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
    $Object.call(this, intrinsics.MapProto);
  }

  inherit($Map, $Object, {
    NativeBrand: NativeMap,
  });

  // ############
  // ### $Set ###
  // ############

  function $Set(){
    $Object.call(this, intrinsics.SetProto);
  }

  inherit($Set, $Object, {
    NativeBrand: NativeSet,
  });


  // ################
  // ### $WeakMap ###
  // ################

  function $WeakMap(){
    $Object.call(this, intrinsics.WeakMapProto);
  }

  inherit($WeakMap, $Object, {
    NativeBrand: NativeWeakMap,
  });

  // ##############
  // ### $Array ###
  // ##############


  function $Array(items){
    $Object.call(this, intrinsics.ArrayProto);
    if (items instanceof Array) {
      var len = items.length;
      for (var i=0; i < len; i++)
        setDirect(this, i, items[i]);
    } else {
      var len = 0;
    }
    defineDirect(this, 'length', len, _CW);
  }

  inherit($Array, $Object, {
    NativeBrand: NativeArray,
    DefineOwnProperty: function DefineOwnProperty(key, desc, strict){
      var len = this.properties.length,
          writable = this.attributes.length & W,
          result;

      var reject = strict
          ? function(){ return ThrowException('strict_read_only_property') }
          : function(){ return false };

      if (key === 'length') {
        if (!(VALUE in desc)) {
          return DefineOwn.call(this, key, desc, strict);
        }

        this.attributes.length |= W;

        var newLen = desc.Value >>> 0,
            newDesc = new DataDescriptor(newLen, _CW);


        if (desc.Value !== newDesc.Value) {
          return ThrowException('invalid_array_length', [], ƒ);
        } else if (newDesc.Value > len) {
          return DefineOwn.call(this, 'length', newDesc, strict);
        } else if (!writable) {
          return reject();
        }


        newDesc.Writable = true;
        if (desc.Writable === false) {
          var deferNonWrite = true;
        }

        result = DefineOwn.call(this, 'length', newDesc, strict);
        if (result && result.IsCompletion) {
          if (result.IsAbruptCompletion) {
            return result;
          } else {
            result = result.Value;
          }
        }

        if (result === false) {
          return false;
        }

        while (newLen < len--) {
          result = this.Delete(''+len, false);
          if (result.IsCompletion) {
            if (result.IsAbruptCompletion) {
              return result;
            } else {
              result = result.Value;
            }
          }

          if (result === false) {
            newDesc.Value = len + 1;
            result = DefineOwn.call(this, 'length', newDesc, false);
            if (result.IsAbruptCompletion) {
              return result;
            }
            return reject();
          }
        }

        if (deferNonWrite) {
          DefineOwn.call(this, 'length', { Writable: false }, false);
        }

        return true;
      } else if ((+key === key | 0) && key > -1) {
        var index = ToUint32(key);
        if (index.IsCompletion) {
          if (index.IsAbruptCompletion) {
            return index;
          } else {
            index = index.Value;
          }
        }

        if (index > len && !writable) {
          return reject();
        }

        result = DefineOwn.call(this, ''+index, desc, false);
        if (result.IsCompletion) {
          if (result.IsAbruptCompletion) {
            return result;
          } else {
            result = result.Value;
          }
        }

        if (!result) {
          return reject();
        } else {
          if (index > len) {
            this.properties.length = index + 1;
          }
          return true;
        }
      } else {
        return DefineOwn.call(this, key, desc, strict);
      }
    }
  });


  // ###############
  // ### $RegExp ###
  // ###############

  function $RegExp(native){
    $Object.call(this, intrinsics.RegExpProto);
    this.Source = native;
  }

  inherit($RegExp, $Object, {
    NativeBrand: NativeRegExp,
    Match: null,
  });


  // ####################
  // ### $PrivateName ###
  // ####################

  function $PrivateName(proto){
    $Object.call(this, intrinsics.PrivateNameProto);
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
    defineDirect(this, 'length', length, _CW);
  }

  inherit($Arguments, $Object, {
    NativeBrand: NativeArguments,
    ParameterMap: null,
  });

  function $MappedArguments(map, args){
    this.attributes = args.attributes;
    this.properties = args.properties;
    this.Prototype = args.Prototype;
    define(this, 'keys', args.keys);
    this.ParameterMap = map;
  }

  inherit($MappedArguments, $Arguments, {
    ParameterMap: null,
  }, [
    function Get(key){
      if (hasOwnDirect(this.ParameterMap, key)) {
        return this.ParameterMap.Get(key);
      } else {
        var val = $Object.prototype.Get.call(this, key);
        if (key === 'caller' && IsCallable(val) && val.Strict) {
          return ThrowError('strict_poison_pill');
        }
        return val;
      }
    },
    function GetOwnProperty(key){
      var desc = $Object.prototype.GetOwnProperty.call(this, key);
      if (desc === undefined) {
        return desc;
      }
      if (hasOwnDirect(this.ParameterMap, key)) {
        desc.Value = this.ParameterMap.Get(key);
      }
      return desc;
    },
    function DefineOwnProperty(key, desc, strict){
      if (!DefineOwn.call(this, key, desc, false) && strict) {
        return ThrowError('strict_lhs_assignment');
      }

      if (hasOwnDirect(this.ParameterMap, key)) {
        if (IsAccessorDescriptor(desc)) {
          this.ParameterMap.Delete(key, false);
        } else {
          if ('Value' in desc) {
            this.ParameterMap.Put(key, desc.Value, strict);
          }
          if ('Writable' in desc) {
            this.ParameterMap.Delete(key, false);
          }
        }
      }

      return true;
    },
    function Delete(key, strict){
      var result = $Object.prototype.Delete.call(this, key, strict);
      if (result.IsAbruptCompletion) {
        return result;
      }

      if (result && hasOwnDirect(this.ParameterMap, key)) {
        this.ParameterMap.Delete(key, false);
      }

      return result;
    }
  ]);


  // ######################
  // ### $PrimitiveBase ###
  // ######################

  function $PrimitiveBase(value, proto){
    this.base = value;
    var type = typeof value;
    if (type === STRING) {
      $Object.call(this, intrinsics.StringProto);
      this.NativeBrand = StringWrapper;
    } else if (type === NUMBER) {
      $Object.call(this, intrinsics.NumberProto);
      this.NativeBrand = NumberWrapper;
    } else if (type === BOOLEAN) {
      $Object.call(this, intrinsics.BooleanProto);
      this.NativeBrand = BooleanWrapper;
    }
  }

  inherit($PrimitiveBase, $Object, [
    function GetProperty(key, receiver){
      var base = this.base;
      var desc = $Object.prototype.GetProperty.call(this, key);
      if (desc === undefined) {
       return desc;
      } else if (desc instanceof $DataDescriptor) {
        return desc.properties.value;
      } else {
        var getter = desc.properties.get;
        if (getter === undefined) {
          return getter;
        } else {
          return getter.Call(receiver || base, []);
        }
      }
    },
    // function Put(key, value, strict){
    //   var base = this.base;
    //   this.SetP(this, key, value, function(desc){
    //   }, ƒ);
    // },
  ]);




  function ExecutionContext(caller, local, realm, code, func, isConstruct){
    this.caller = caller;
    this.realm = realm;
    this.Code = code;
    this.LexicalEnvironment = local;
    this.VariableEnvironment = local;
    this.isConstruct = !!isConstruct;
    this.callee = func && !func.Native ? func : caller ? caller.callee : null;
  }

  define(ExecutionContext, [
    function push(newContext){
      context = newContext;
      context.realm.active || context.realm.activate();
    },
    function pop(){
      if (context) {
        var oldContext = context;
        context = context.caller;
        return oldContext;
      }
    },
    function reset(){
      var stack = [];
      while (context) {
        stack.push(ExecutionContext.pop());
      }
      return stack;
    }
  ]);

  define(ExecutionContext.prototype, {
    isGlobal: false,
    strict: false,
    isEval: false,
  });


  function Intrinsics(realm){
    DeclarativeEnvironmentRecord.call(this);
    this.realm = realm;
    var bindings = this.bindings;
    bindings.ObjectProto = new $Object(null);

    for (var k in $builtins) {
      var prototype = bindings[k + 'Proto'] = create($builtins[k].prototype);
      $Object.call(prototype, bindings.ObjectProto);
      if (k in primitives)
        prototype.PrimitiveValue = primitives[k];
    }

    bindings.FunctionProto.FormalParameters = [];
    defineDirect(bindings.ArrayProto, 'length', 0, __W);
  }

  inherit(Intrinsics, DeclarativeEnvironmentRecord, [
    function binding(options){
      if (typeof options === 'function') {
        options = {
          call: options,
          name: options.name,
          length: options.length,
        }
      }

      if (!options.name) {
        if (!options.call.name) {
          options.name = arguments[1];
        } else {
          options.name = options.call.name;
        }
      }

      if (typeof options.length !== 'number') {
        options.length = options.call.length;
      }

      if (realm !== this.realm) {
        var activeRealm = realm;
        this.realm.activate();
      }

      this.bindings[options.name] = new $NativeFunction(options);

      if (activeRealm) {
        activeRealm.activate();
      }
    }
  ]);


  function instructions(ops, opcodes){
    var out = [];
    for (var i=0; i < ops.length; i++) {
      out[i] = opcodes[+ops[i].op];
    }
    return out;
  }

  function createThunk(code){
    var opcodes = [
      ARRAY, ARRAY_DONE, BINARY, BLOCK, BLOCK_EXIT, CALL, CASE, CLASS_DECL,
      CLASS_EXPR, CONST, CONSTRUCT, DEBUGGER, DEFAULT, DUP, ELEMENT,
      FUNCTION, GET, IFEQ, IFNE, INDEX, JSR, JUMP, LET, LITERAL,
      MEMBER, METHOD, OBJECT, POP, SAVE, POPN, PROPERTY, PUT,
      REGEXP, RESOLVE, RETURN, COMPLETE, ROTATE, RUN, SUPER_CALL, SUPER_ELEMENT,
      SUPER_GUARD, SUPER_MEMBER, THIS, THROW, UNARY, UNDEFINED, UPDATE, VAR, WITH,
      NATIVE_RESOLVE, ENUM, NEXT, STRING
    ];

    var ops = code.ops,
        cmds = instructions(ops, opcodes);

    function ARRAY(){
      stack[sp++] = new $Array(0);
      stack[sp++] = 0;
      return cmds[++ip];
    }

    function ARRAY_DONE(){
      a = stack[--sp];
      stack[sp - 1].Put('length', a);
      return cmds[++ip];
    }

    function BINARY(){
      a = BinaryOp(BINARYOPS[ops[ip][0]], stack[--sp], stack[--sp]);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function BLOCK(){
      var env = NewDeclarativeEnvironment(context.LexicalEnvironment);
      context.LexicalEnvironment = env;
      BlockDeclarationInstantiation(ops[ip][0], context.LexicalEnvironment);
      return cmds[++ip];
    }

    function BLOCK_EXIT(){
      context.LexicalEnvironment = context.LexicalEnvironment.outer;
      return cmds[++ip];
    }

    function CALL(){
      sp -= ops[ip][0];
      a = stack.slice(sp, sp + ops[ip][0]);
      b = stack[--sp];
      c = stack[--sp];
      d = EvaluateCall(c, b, a);
      if (d && d.IsCompletion) {
        if (d.IsAbruptCompletion) {
          error = d.value;
          return ƒ;
        } else {
          d = d.value;
        }
      }
      stack[sp++] = d;
      return cmds[++ip];
    }

    function CASE(){
      a = STRICT_EQUAL(stack[--sp], stack[sp - 1]);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      if (a) {
        sp--;
        ip = ops[ip][0];
      }
      return cmds[++ip];
    }

    function CLASS_DECL(){
      a = ClassDefinitionEvaluation(ops[ip][0], ops[ip][1] ? stack[--sp] : undefined);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }

      a = BindingInitialization(ops[ip][0], a, context.LexicalEnvironment);
      if (a && a.IsAbruptCompletion) {
        error = a.value;
        return ƒ;
      }
      return cmds[++ip];
    }

    function CLASS_EXPR(){
      a = ClassDefinitionEvaluation(ops[ip], ops[ip][1] ? stack[--sp] : undefinedA);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function COMPLETE(){
      return false;
    }

    function CONST(){
      BindingInitialization(ops[ip][0], stack[--sp], context.LexicalEnvironment);
      return cmds[++ip];
    }

    function CONSTRUCT(){
      sp -= ops[ip][0];
      a = stack.slice(sp, sp + ops[ip][0]);
      a = EvaluateConstruct(stack[--sp], a);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function DEBUGGER(){
      cleanup = pauseCleanup;
      return false;
    }

    function DEFAULT(){
      sp--;
      ip = ops[ip][0];
      return cmds[++ip];
    }

    function DUP(){
      a = stack[sp - 1];
      stack[sp++] = a;
      return cmds[++ip];
    }

    function ELEMENT(){
      a = Element(stack[--sp], stack[--sp]);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function ENUM(){
      a = stack[sp - 1].Enumerate();
      stack[sp - 1] = a;
      stack[sp++] = 0;
      return cmds[++ip];
    }

    function FUNCTION(){
      a = ops[ip][1];
      b = NewDeclarativeEnvironment(context.LexicalEnvironment);
      c = new $Function(a.Type, code.lookup(ops[ip][0]) || '', a.params, a, b, a.Strict);
      b.func = c;
      MakeConstructor(c);
      stack[sp++] = c;
      return cmds[++ip];
    }

    function GET(){
      a = GetValue(stack[--sp]);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function IFEQ(){
      if (ops[ip][1] === ToBoolean(stack[--sp])) {
        ip = ops[ip][0];
      }
      return cmds[++ip];
    }

    function IFNE(){
      if (ops[ip][1] === ToBoolean(stack[sp - 1])) {
        ip = ops[ip][0];
      } else {
        sp--;
      }
      inspect(stack)
      return cmds[++ip];
    }

    function INDEX(){
      if (ops[ip][0]) {
        stack[sp - 1]++;
      } else {
        a = GetValue(stack[--sp]);
        if (a && a.IsCompletion) {
          if (a.IsAbruptCompletion) {
            error = a.value;
            return ƒ;
          } else {
            a = a.value;
          }
        }
        b = stack[--sp];
        stack[sp - 1].DefineOwnProperty(b, new NormalDescriptor(a));
        stack[sp++] = b + 1;
      }
      return cmds[++ip];
    }

    function LITERAL(){
      stack[sp++] = ops[ip][0];
      return cmds[++ip];
    }

    function JUMP(){
      ip = ops[ip][0];
      return cmds[++ip];
    }

    function JSR(){
      return cmds[++ip];
    }

    function LET(){
      BindingInitialization(ops[ip][0], stack[--sp], context.LexicalEnvironment);
      return cmds[++ip];
    }

    function MEMBER(){
      a = Element(code.lookup(ops[ip][0]), stack[--sp]);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function METHOD(){
      a = PropertyDefinitionEvaluation(ops[ip][0], stack[sp - 1], code.lookup(ops[ip][2]), ops[ip][1]);
      if (a && a.IsAbruptCompletion) {
        error = a.value;
        return ƒ;
      }
      return cmds[++ip];
    }

    function NATIVE_RESOLVE(){
      if (!code.natives) {
        error = 'invalid native reference';
        return ƒ;
      }
      stack[sp++] = new Reference(realm.natives, code.lookup(ops[ip][0]), false);
      return cmds[++ip];
    }

    function NEXT(){
      a = stack[sp - 2];
      b = stack[sp - 1];
      if (b < a.length) {
        PutValue(stack[sp - 3], a[b]);
        stack[sp - 1] = b + 1;
      } else {
        ip = ops[ip][0];
      }
      return cmds[++ip];
    }

    function PROPERTY(){
      a = stack[--sp];
      b = DefineProperty(stack[sp - 1], code.lookup(ops[ip][0]), a);
      if (b && b.IsAbruptCompletion) {
        error = b.value;
        return ƒ;
      }
      return cmds[++ip];
    }

    function OBJECT(){
      stack[sp++] = new $Object;
      return cmds[++ip];
    }

    function POP(){
      sp--;
      return cmds[++ip];
    }

    function POPN(){
      sp -= ops[ip][0];
      return cmds[++ip];
    }

    function PUT(){
      a = stack[--sp];
      b = PutValue(stack[--sp], a);
      if (b && b.IsAbruptCompletion) {
        error = b.value;
        return ƒ;
      }
      stack[sp++] = a;
      return cmds[++ip];
    }


    function REGEXP(){
      stack[sp++] = new $RegExp(ops[ip][0]);
      return cmds[++ip];
    }

    function RESOLVE(){
      stack[sp++] = IdentifierResolution(code.lookup(ops[ip][0]));
      return cmds[++ip];
    }

    function RETURN(){
      completion = stack[--sp];
      return false;
    }

    function ROTATE(){
      a = [];
      b = stack[--sp];
      for (c = 0; c < ops[ip][0]; c++) {
        a[c] = stack[--sp];
      }
      a[c++] = b;
      while (c--) {
        stack[sp++] = a[c];
      }
      return cmds[++ip];
    }

    function RUN(){
      throw 'wtf'
    }

    function SAVE(){
      completion = stack[--sp];
      return cmds[++ip];
    }

    function STRING(){
      stack[sp++] = code.lookup(ops[ip][0]);
      return cmds[++ip];
    }

    function SUPER_CALL(){
      a = CallSuperSetup();
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function SUPER_ELEMENT(){
      a = ElementSuper(stack[--sp]);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function SUPER_GUARD(){
      a = SuperGuard();
      if (a && a.IsAbruptCompletion) {
        error = a.value;
        return ƒ;
      }
      return cmds[++ip];
    }

    function SUPER_MEMBER(){
      a = ElementSuper(code.lookup(ops[ip][0]));
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function THIS(){
      a = ThisResolution();
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function THROW(){
      error = stack[--sp];
      return ƒ;
    }

    function UNARY(){
      a = UnaryOp(UNARYOPS[ops[ip][0]], stack[--sp]);
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function UNDEFINED(){
      stack[sp++] = undefined;
      return cmds[++ip];
    }

    function UPDATE(){
      switch (ops[ip][0]) {
        case 0: a = POST_DEC(stack[--sp]); break;
        case 1: a = PRE_DEC(stack[--sp]); break;
        case 2: a = POST_INC(stack[--sp]); break;
        case 3: a = PRE_INC(stack[--sp]); break;
      }
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function VAR(){
      BindingInitialization(ops[ip][0], stack[--sp]);
      return cmds[++ip];
    }

    function WITH(){
      a = ToObject(GetValue(stack[--sp]));
      if (a && a.IsCompletion) {
        if (a.IsAbruptCompletion) {
          error = a.value;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      b = context.LexicalEnvironment;
      c = context.LexicalEnvironment = NewObjectEnvironment(a, b);
      c.withEnvironment = true;
      c.outer = b;
      return cmds[++ip];
    }

    function ƒ(){
      for (var i = 0, entrypoint; entrypoint = code.entrances[i]; i++) {
        if (entrypoint.begin < ip && ip <= entrypoint.end) {
          if (entrypoint.type === ENTRY.ENV) {
            context.LexicalEnvironment = context.LexicalEnvironment.outer;
          } else {
            //sp = entrypoint.unwindStack(this);
            if (entrypoint.type === ENTRY.FINALLY) {
              stack[sp++] = Empty;
              stack[sp++] = error;
              stack[sp++] = ENTRY.FINALLY;
            } else {
              stack[sp++] = error;
            }
            ip = entrypoint.end;
            return cmds[++ip];
          }
        }
      }
      completion = error;
      return false;
    }

    function normalPrepare(){
      stack = [];
      ip = 0;
      sp = 0;
      completion = error = a = b = c = d = undefined;
    }

    function normalExecute(){
      var f = cmds[ip];
      while (f) f = f();
    }

    function normalCleanup(){
      var result = completion;
      prepare();
      return result;
    }

    function instrumentedExecute(){
      var f = cmds[ip];

      while (f) {
        thunk.emit('op', ops[ip]);
        f = f();
      }
    }

    function resumePrepare(){
      delete thunk.ip;
      delete thunk.stack;
      prepare = normalPrepare;
      context = ctx;
      ctx = undefined;
      context.realm.activate();
    }

    function pauseCleanup(){
      thunk.ip = ip;
      thunk.stack = stack;
      stack.length = sp;
      prepare = resumePrepare;
      cleanup = normalCleanup;
      ctx = context;
      return PauseSigil;
    }

    var completion, stack, ip, sp, error, a, b, c, d, ctx;

    var prepare = normalPrepare,
        execute = normalExecute,
        cleanup = normalCleanup;

    function run(){
      prepare();
      execute();
      return cleanup();
    }

    var thunk = new Thunk(code, run, function(){
      if (execute = normalExecute) {
        execute = instrumentedExecute;
      } else {
        execute = normalExecute;
      }
    });

    return thunk;
  }

  function Thunk(code, run, instrument){
    Emitter.call(this);
    this.run = run;
    this.code = code;
    this.instrument = instrument;
  }

  inherit(Thunk, Emitter, []);


  function fromInternalArray(array){
    var $array = new $Array,
        len = array.length;

    for (var i=0; i < len; i++) {
      defineDirect($array, i, array[i], ECW);
    }
    defineDirect($array, 'length', array.length, __W);
    return $array;
  }

  function toInternalArray($array){
    var array = [],
        len = getDirect($array, 'length');

    for (var i=0; i < len; i++) {
      array[i] = getDirect($array, i);
    }
    return array;
  }

  var $builtins = {
    Array   : $Array,
    Boolean : $Boolean,
    Date    : $Date,
    Function: $Function,
    Map     : $Map,
    Number  : $Number,
    RegExp  : $RegExp,
    Set     : $Set,
    String  : $String,
    WeakMap : $WeakMap
  };

  var primitives = {
    Date: Date.prototype,
    String: '',
    Number: 0,
    Boolean: false
  };

  var atoms = {
    NaN: NaN,
    Infinity: Infinity,
    undefined: undefined
  };

  var natives = {
    writeln: function(){
      console.log.apply(console, arguments);
    },
    defineDirect: defineDirect,
    deleteDirect: deleteDirect,
    hasOwnDirect: hasOwnDirect,
    hasDirect: hasDirect,
    setDirect: setDirect,
    isConstructCall: function(){
      return context.isConstruct;
    },
    getNativeBrand: function(object){
      return object.NativeBrand.name;
    },
    objectToString: function(object){
      return object.NativeBrand.brand;
    },
    getPrimitiveValue: function(object){
      return object ? object.PrimitiveValue : undefined;
    },
    numberToString: function(object, radix){
      return object.PrimitiveValue.toString(radix);
    },
    dateToString: function(object){
      return ''+object.PrimitiveValue;
    },
    dateToNumber: function(object){
      return +object.PrimitiveValue;
    },
    isPrototypeOf: function(object){
      while (object) {
        object = object.GetPrototype();
        if (object === this) {
          return true;
        }
      }
      return false;
    },
    propertyIsEnumerable: function(key){
      return (this.attributes[key] & E) > 0;
    },
    hasOwnProperty: function(key){
      return this.HasOwnProperty(key);
    },
    isExtensible: function(object){
      return object.GetExtensible();
    },
    keys: function(object){
      var names = object.GetOwnPropertyNames(),
          out = [],
          count = 0;

      for (var i=0; i < names.length; i++) {
        if (object.attributes[names[i]] & E) {
          out.push(names[i]);
        }
      }

      return fromInternalArray(out);
    },
    getOwnPropertyNames: function(object){
      return fromInternalArray(object.GetOwnPropertyNames());
    },
    getOwnPropertyDescriptor: function(object, key){
      var desc = object.GetOwnProperty(key);
      if (desc) {
        return FromPropertyDescriptor(desc);
      }
    },
    call: function(receiver){
      return this.Call(receiver, slice.call(arguments, 1));
    },
    apply: function(receiver, args){
      return this.Call(receiver, toInternalArray(args));
    },
    ToObject: ToObject,
    ToString: ToString,
    ToNumber: ToNumber,
    ToBoolean: ToBoolean,
    ToInteger: ToInteger,
    ToInt32: ToInt32,
    ToUint32: ToUint32,
    DefineOwnProperty: function(object, key, desc){
      object.DefineOwnProperty(key, desc);
    },
    BooleanCreate: function(boolean){
      return new $Boolean(boolean);
    },
    DateCreate: function(date){
      return new $Date(date === undefined ? new Date : date);
    },
    FunctionCreate: function(args){
      args = toInternalArray(args);
      var body = args.pop();
      body = '(function anonymous('+args.join(', ')+') {\n'+body+'\n})';
      var code = compile(body, { natives: false, eval: true });
      return createThunk(code).run();
    },
    NumberCreate: function(number){
      return new $Number(number);
    },
    ObjectCreate: function(proto){
      return new $Object(proto);
    },
    StringCreate: function(string){
      return new $String(string);
    },
    RegExpCreate: function(regexp){
      return new $RegExp(regexp);
    },
    parseInt: function(value, radix){
      return parseInt(ToPrimitive(value), ToNumber(radix));
    },
    parseFloat: function(value){
      return parseFloat(ToPrimitive(value));
    },
    decodeURI: function(value){
      return decodeURI(ToString(value));
    },
    decodeURIComponent: function(value){
      return decodeURIComponent(ToString(value));
    },
    encodeURI: function(value){
      return encodeURI(ToString(value));
    },
    encodeURIComponent: function(value){
      return encodeURIComponent(ToString(value));
    },
    escape: function(value){
      return escape(ToString(value));
    },
    charCode: function(char){
      return char.charCodeAt(0);
    }
  };


  function Realm(){
    this.natives = new Intrinsics(this);
    this.intrinsics = this.natives.bindings;
    this.global = new $Object(this.intrinsics.ObjectProto);
    this.globalEnv = new GlobalEnvironmentRecord(this.global);

    this.intrinsics.FunctionProto.Realm = this;
    this.intrinsics.FunctionProto.Scope = this.globalEnv;


    this.active = false;
    Emitter.call(this);
    hide(this.intrinsics.FunctionProto, 'Realm');
    hide(this.intrinsics.FunctionProto, 'Scope');
    hide(this.natives, 'realm');

    for (var k in atoms) {
      defineDirect(this.global, k, atoms[k], ___);
    }
    for (var k in natives) {
      this.natives.binding({ name: k, call: natives[k] });
    }
  }

  var realm = null,
      global = null,
      context = null,
      intrinsics = null;

  inherit(Realm, Emitter, [
    function activate(){
      if (realm !== this) {
        if (realm) {
          realm.active = false;
          realm.emit('deactivate');
        }
        realm = this;
        global = this.global;
        intrinsics = this.intrinsics;
        this.active = true;
        this.emit('activate');
      }
    }
  ]);




  function Script(ast, code, name){
    if (ast instanceof Script)
      return ast;

    if (typeof ast === FUNCTION) {
      this.type = 'recompiled function';
      if (!ast.name) {
        name || (name = 'unnamed');
        code = '('+ast+')()';
      } else {
        name || (name = ast.name);
        code = ast+'';
      }
      ast = null
    } else if (typeof ast === STRING) {
      code = ast;
      ast = null;
    }

    if (!isObject(ast) && typeof code === STRING) {
      ast = parse(code);
    }

    if (!code && isObject(ast)) {
      code = decompile(ast);
    }

    this.code = compile(code, { natives: true });
    this.thunk = createThunk(this.code);
    define(this, {
      source: code,
      ast: ast
    });
    this.name = name || '';
  }

  function ScriptFile(location){
    var code = ScriptFile.load(location);
    Script.call(this, null, code, location);
  }

  ScriptFile.load = function load(location){
    return require('fs').readFileSync(location, 'utf8');
  };

  inherit(ScriptFile, Script);


  // ###################
  // ### Interpreter ###
  // ###################

  function Continuum(listener){
    var self = this;
    Emitter.call(this);
    listener && this.on('*', listener);

    define(this, {
      scripts: [],
      realm: new Realm
    });

    this.state = 'idle';
    this.eval(new ScriptFile(__dirname+'/runtime.js'))
  }

  inherit(Continuum, Emitter, [
    function resume(){
      if (this.executing) {
        this.emit('resume');
        return this.run(this.executing);
      }
    },
    function run(thunk){
      this.realm.activate();
      this.executing = thunk;
      this.state = 'executing';
      this.emit('executing', thunk);
      var result = thunk.run();
      if (result === PauseSigil) {
        this.state = 'paused';
        this.emit('pause');
      } else {
        ExecutionContext.pop();
        this.executing = null;
        this.state = 'idle';
        this.emit('complete', result);
        return result;
      }
    },
    function eval(subject){
      var script = new Script(subject),
          self = this;

      this.scripts.push(script);
      script.thunk.instrument();
      script.thunk.on('op', function(op){
        self.emit('op', op);
      });
      ExecutionContext.push(new ExecutionContext(null, this.realm.globalEnv, this.realm, script.code));
      TopLevelDeclarationInstantiation(script.code);
      return this.run(script.thunk);
    }
  ]);


  function inspect(o){
    o = require('util').inspect(o, null, 10);
    console.log(o);
    return o;
  }

  exports.Continuum = Continuum;
  exports.create = function createContinuum(listener){
    return new Continuum(listener);
  };

  return exports;
})((0,eval)('this'), typeof exports === 'undefined' ? {} : exports);
