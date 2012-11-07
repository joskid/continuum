var runtime = (function(GLOBAL, exports, undefined){
  var esprima   = require('../third_party/esprima'),
      errors    = require('./errors'),
      utility   = require('./utility'),
      assemble  = require('./assembler').assemble,
      constants = require('./constants'),
      operators = require('./operators');

  operators.ToObject = ToObject;
  var Thunk = require('./thunk').Thunk;

  var Hash             = utility.Hash,
      Emitter          = utility.Emitter,
      PropertyList     = utility.PropertyList,
      create           = utility.create,
      numbers          = utility.numbers,
      isObject         = utility.isObject,
      nextTick         = utility.nextTick,
      enumerate        = utility.enumerate,
      ownKeys          = utility.ownKeys,
      define           = utility.define,
      copy             = utility.copy,
      inherit          = utility.inherit,
      unique           = utility.unique;


  var ThrowException   = errors.ThrowException,
      MakeException    = errors.MakeException,
      Completion       = errors.Completion,
      AbruptCompletion = errors.AbruptCompletion;

  var GetValue         = operators.GetValue,
      PutValue         = operators.PutValue,
      GetThisValue     = operators.GetThisValue,
      ToPrimitive      = operators.ToPrimitive,
      ToBoolean        = operators.ToBoolean,
      ToNumber         = operators.ToNumber,
      ToInteger        = operators.ToInteger,
      ToUint32         = operators.ToUint32,
      ToInt32          = operators.ToInt32,
      ToUint16          = operators.ToUint16,
      ToString         = operators.ToString,
      UnaryOp          = operators.UnaryOp,
      BinaryOp         = operators.BinaryOp,
      ToPropertyName   = operators.ToPropertyName,
      IS               = operators.IS,
      EQUAL            = operators.EQUAL,
      STRICT_EQUAL     = operators.STRICT_EQUAL;


  var SYMBOLS       = constants.SYMBOLS,
      Break         = SYMBOLS.Break,
      Pause         = SYMBOLS.Pause,
      Throw         = SYMBOLS.Throw,
      Empty         = SYMBOLS.Empty,
      Resume        = SYMBOLS.Resume,
      Return        = SYMBOLS.Return,
      Native        = SYMBOLS.Native,
      Continue      = SYMBOLS.Continue,
      Uninitialized = SYMBOLS.Uninitialized;

  var StopIteration = constants.BRANDS.StopIteration;
  var slice = [].slice;
  var uid = (Math.random() * (1 << 30)) | 0;

  var BINARYOPS = constants.BINARYOPS.array,
      UNARYOPS  = constants.UNARYOPS.array,
      BRANDS    = constants.BRANDS,
      ENTRY     = constants.ENTRY.hash,
      AST       = constants.AST.array;

  var ARROW  = constants.FUNCTYPE.getIndex('ARROW'),
      METHOD = constants.FUNCTYPE.getIndex('METHOD'),
      NORMAL = constants.FUNCTYPE.getIndex('NORMAL');

  var ATTRS = constants.ATTRIBUTES,
      E = ATTRS.ENUMERABLE,
      C = ATTRS.CONFIGURABLE,
      W = ATTRS.WRITABLE,
      A = ATTRS.ACCESSOR,
      ___ = ATTRS.___,
      E__ = ATTRS.E__,
      _C_ = ATTRS._C_,
      EC_ = ATTRS.EC_,
      __W = ATTRS.__W,
      E_W = ATTRS.E_W,
      _CW = ATTRS._CW,
      ECW = ATTRS.ECW,
      __A = ATTRS.__A,
      E_A = ATTRS.E_A,
      _CA = ATTRS._CA,
      ECA = ATTRS.ECA;

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


  errors.createError = function(name, type, message){
    return new $Error(name, type, message);
  };

  AbruptCompletion.prototype.Abrupt = SYMBOLS.Abrupt;
  Completion.prototype.Completion   = SYMBOLS.Completion;


  var LexicalScope          = 'Lexical',
      StrictScope           = 'Strict',
      GlobalScope           = 'Global';

  var GlobalCode            = 'elobal',
      EvalCode              = 'eval',
      FuntionCode           = 'function';


  // ##################################################
  // ### Internal Utilities not from specification ####
  // ##################################################

  function noop(){}

  if (Object.getOwnPropertyNames) {
    var hide = function(o, k){
      Object.defineProperty(o, k, { enumerable: false });
    };
  } else {
    var hide = function(){};
  }

  function defineDirect(o, key, value, attrs){
    o.properties.set(key, value, attrs);
  }

  function deleteDirect(o, key){
    o.properties.remove(key);
  }

  function hasDirect(o, key){
    if (o) {
      return o.properties.has(key) || hasDirect(o.GetPrototype(), key);
    } else {
      return false;
    }
  }

  function hasOwnDirect(o, key){
    return o.properties.has(key);
  }

  function setDirect(o, key, value){
    if (o.properties.has(key)) {
      o.properties.set(key, value);
    } else {
      o.properties.set(key, value, ECW);
    }
  }

  function getDirect(o, key){
    return o.properties.get(key);
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


  // ## CheckObjectCoercible

  function CheckObjectCoercible(argument){
    if (argument === null) {
      return ThrowException('null_to_object');
    } else if (argument === undefined) {
      return ThrowException('undefined_to_object');
    } else if (typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      return CheckObjectCoercible(argument.value);
    } else {
      return argument;
    }
  }

  // ## ToPropertyDescriptor

  var descFields = ['value', 'writable', 'enumerable', 'configurable', 'get', 'set'];
  var descProps = [VALUE, WRITABLE, ENUMERABLE, CONFIGURABLE, GET, SET];

  function ToPropertyDescriptor(obj) {
    if (obj && obj.Completion) {
      if (obj.Abrupt) {
        return obj;
      } else {
        obj = obj.value;
      }
    }

    if (typeof obj !== OBJECT) {
      return ThrowException('property_desc_object', [typeof obj]);
    }

    var desc = create(null);

    for (var i=0, v; i < 6; i++) {
      if (obj.HasProperty(descFields[i])) {
        v = obj.Get(descFields[i]);
        if (v && v.Completion) {
          if (v.Abrupt) {
            return v;
          } else {
            v = v.value;
          }
        }
        desc[descProps[i]] = v;
      }
    }

    if (desc.Get !== undefined) {
      if (!desc.Get || !desc.Get.Call) {
        return ThrowException('getter_must_be_callable', [typeof desc.Get]);
      }
    }

    if (desc.Set !== undefined) {
      if (!desc.Set || !desc.Set.Call) {
        return ThrowException('setter_must_be_callable', [typeof desc.Set]);
      }
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
    if (desc && desc.Completion) {
      if (desc.Abrupt) {
        return desc;
      } else {
        desc = desc.value;
      }
    }

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
    if (a && a.Completion) {
      if (a.Abrupt) {
        return a;
      } else {
        a = a.value;
      }
    }
    if (b && b.Completion) {
      if (b.Abrupt) {
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

  // ## IsCallable

  function IsCallable(argument){
    if (argument && typeof argument === OBJECT) {
      if (argument.Completion) {
        if (argument.Abrupt) {
          return argument;
        }
        return IsCallable(argument.value);
      }
      return 'Call' in argument;
    } else {
      return false;
    }
  }

  // ## IsConstructor

  function IsConstructor(argument){
    if (argument && typeof argument === OBJECT) {
      if (argument.Completion) {
        if (argument.Abrupt) {
          return argument;
        }
        return IsConstructor(argument.value);
      }
      return 'Construct' in argument;
    } else {
      return false;
    }
  }

  // ## MakeConstructor

  function MakeConstructor(func, writable, prototype){
    var install = prototype === undefined;
    if (install) {
      prototype = new $Object;
    }
    prototype.IsProto = true;
    if (writable === undefined) {
      writable = true;
    }
    if (install) {
      defineDirect(prototype, 'constructor', func, writable ? _CW : ___);
    }
    defineDirect(func, 'prototype', prototype, writable ? __W : ___);
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
    if (obj && obj.Completion) {
      if (obj.Abrupt) {
        return obj;
      } else {
        obj = obj.value;
      }
    }

    var func = obj.Get(key);
    if (func && func.Completion) {
      if (func.Abrupt) {
        return func;
      } else {
        func = func.value;
      }
    }

    if (!IsCallable(func))
      return ThrowException('called_non_callable', key);

    return func.Call(obj, args);
  }

  // ## GetIdentifierReference

  function GetIdentifierReference(lex, name, strict){
    if (lex == null) {
      return new Reference(undefined, name, strict);
    } else if (lex.HasBinding(name)) {
      return new Reference(lex, name, strict);
    } else {
      return GetIdentifierReference(lex.outer, name, strict);
    }
  }

  // ## IsPropertyReference

  function IsPropertyReference(v){
    var type = typeof v.base;
    return type === STRING
        || type === NUMBER
        || type === BOOLEAN
        || v.base instanceof $Object;
  }

  operators.IsPropertyReference = IsPropertyReference;

  // ## ToObject

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
        } else if (argument.Completion) {
          if (argument.Abrupt) {
            return argument;
          }
          return ToObject(argument.value);
        }
        return argument;
    }
  }


  function ThrowStopIteration(){
    return new AbruptCompletion('throw', intrinsics.StopIteration);
  }

  function IsStopIteration(o){
    return !!(o && o.Abrupt && o.value && o.value.NativeBrand === StopIteration);
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
            lex = context.LexicalEnvironment,
            home = sup ? obj : undefined,
            func = new $Function(METHOD, key, code.params, code, lex, code.Strict, undefined, home, sup);

        constructs && MakeConstructor(func);
        desc[field] = func;
        var result = obj.DefineOwnProperty(key, desc, false);
        desc[field] = undefined;

        return result && result.Abrupt ? result : func;
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



  function CreateThrowTypeError(realm){
    var thrower = create($NativeFunction.prototype);
    $Object.call(thrower, realm.intrinsics.FunctionProto);
    thrower.call = function(){ return ThrowException('strict_poison_pill') };
    defineDirect(thrower, 'length', 0, ___);
    defineDirect(thrower, 'name', 'ThrowTypeError', ___);
    thrower.Realm = realm;
    thrower.Extensible = false;
    thrower.Strict = true;
    hide(thrower, 'Realm');
    return new Accessor(thrower);
  }

  // ## CompleteStrictArgumentsObject

  function CompleteStrictArgumentsObject(args) {
    var obj = new $Arguments(args.length);
    for (var i=0; i < args.length; i++) {
      defineDirect(obj, i+'', args[i], ECW);
    }

    defineDirect(obj, 'arguments', intrinsics.ThrowTypeError, __A);
    defineDirect(obj, 'caller', intrinsics.ThrowTypeError, __A);
    return obj;
  }


  // ## CompleteMappedArgumentsObject

  function CompleteMappedArgumentsObject(names, env, args, func) {
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


  function ArgAccessor(name, env){
    this.name = name;
    define(this, { env: env  });
  }

  define(ArgAccessor.prototype, {
    Get: { Call: function(){ return this.env.GetBindingValue(this.name) } },
    Set: { Call: function(v){ this.env.SetMutableBinding(this.name, v) } }
  });


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
        if (decl.type === 'FunctionDeclaration') {
          env.SetMutableBinding(name, InstantiateFunctionDeclaration(decl), code.Strict);
        }
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
    var formals = func.FormalParameters,
        params = formals.BoundNames;

    for (var i=0; i < params.length; i++) {
      if (!env.HasBinding(params[i])) {
        env.CreateMutableBinding(params[i]);
        env.InitializeBinding(params[i], undefined);
      }
    }

    var decls = func.Code.LexicalDeclarations;

    for (var i=0, decl; decl = decls[i]; i++) {
      var names = decl.BoundNames;
      for (var j=0; j < names.length; j++) {
        if (!env.HasBinding(names[j])) {
          if (decl.IsConstantDeclaration) {
            env.CreateImmutableBinding(names[j]);
          } else {
            env.CreateMutableBinding(names[j], false);
          }
        }
      }
    }

    if (func.Strict) {
      var ao = CompleteStrictArgumentsObject(args);
      var status = ArgumentBindingInitialization(formals, ao, env);
    } else {
      var ao = env.arguments = CompleteMappedArgumentsObject(params, env, args, func)
      var status = ArgumentBindingInitialization(formals, ao);
    }

    if (status && status.Abrupt) {
      return status;
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

    var funcs = create(null);

    for (var i=0; i < decls.length; i++) {
      if (decls[i].type === 'FunctionDeclaration') {
        var decl = decls[i],
            name = decl.id.name;

        if (!(name in funcs)) {
          funcs[name] = true;
          env.InitializeBinding(name, InstantiateFunctionDeclaration(decl));
        }
      }
    }


  }

  function Brand(name){
    this.name = name;
  }

  // ## ClassDefinitionEvaluation

  function ClassDefinitionEvaluation(name, superclass, constructor, methods){
    if (superclass === undefined) {
      var superproto = intrinsics.ObjectProto,
          superctor = intrinsics.FunctionProto;
    } else {
      if (superclass && superclass.Completion) {
        if (superclass.Abrupt) {
          return superclass;
        } else {
          superclass = superclass.value;
        }
      }

      if (superclass === null) {
        superproto = null;
        superctor = intrinsics.FunctionProto;
      } else if (typeof superclass !== 'object') {
        return ThrowException('non_object_superclass');
      } else if (!('Construct' in superclass)) {
        superproto = superclass;
        superctor = intrinsics.FunctionProto;
      } else {
        superproto = superclass.Get('prototype');
        if (superproto && superproto.Completion) {
          if (superproto.Abrupt) {
            return superproto;
          } else {
            superproto = superproto.value;
          }
        }

        if (typeof superproto !== 'object') {
          return ThrowException('non_object_superproto');
        }
        superctor = superclass;
      }
    }

    var proto = new $Object(superproto),
        lex = context.LexicalEnvironment;

    if (name) {
      var scope = context.LexicalEnvironment = NewDeclarativeEnvironment(lex);
      scope.CreateImmutableBinding(name.name ? name.name : name);
    }

    constructor || (constructor = intrinsics.EmptyClass);

    var ctor = PropertyDefinitionEvaluation('method', proto, 'constructor', constructor);
    if (ctor && ctor.Completion) {
      if (ctor.Abrupt) {
        return ctor;
      } else {
        ctor = ctor.value;
      }
    }

    ctor.SetPrototype(superctor);
    var brand = name ? name.name || name : '';
    setDirect(ctor, 'name', brand);
    MakeConstructor(ctor, false, proto);
    defineDirect(proto, 'constructor', ctor, _CW);
    defineDirect(ctor, 'prototype', proto, ___);

    for (var i=0, method; method = methods[i]; i++) {
      PropertyDefinitionEvaluation(method.kind, proto, method.name, method.code);
    }

    ctor.Class = true;
    proto.Brand = new Brand(brand);
    proto.IsClassProto = true;
    context.LexicalEnvironment = lex;
    return ctor;
  }

  // ## InstantiateFunctionDeclaration

  function InstantiateFunctionDeclaration(decl){
    var code = decl.Code;
    var func = new $Function(NORMAL, decl.id.name, code.params, code, context.LexicalEnvironment, code.Strict);
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

    for (i=0, decl; decl = decls[i]; i++) {
      if (decl.type === 'FunctionDeclaration') {
        env.InitializeBinding(decl.id.name, InstantiateFunctionDeclaration(decl));
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
      if (value && value.Completion) {
        if (value.Abrupt) {
          return value;
        } else {
          value = value.value;
        }
      }
      BindingInitialization(arg, value, env);
    }
    if (params.Rest) {
      var len = getDirect(args, 'length') - params.length,
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
      if (element.type === 'SpreadElement') {
        var value = context.SpreadDestructuring(array, i);
        if (value.Abrupt) {
          return value;
        }
        return BindingInitialization(element.argument, value, env);
      }

      var value = array.HasProperty(i) ? array.Get(i) : undefined;
      if (value && value.Completion) {
        if (value.Abrupt) {
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
      if (value && value.Completion) {
        if (value.Abrupt) {
          return value;
        } else {
          value = value.value;
        }
      }
      BindingInitialization(property.value, value, env);
    }
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

  // ## NewFunctionEnvironment

  function NewFunctionEnvironment(method, receiver){
    var lex = new FunctionEnvironmentRecord(receiver, method.Home, method.MethodName);
    lex.outer = method.Scope;
    return lex;
  }



  function CollectionInitializer(Data, name){
    var data = name + 'Data';
    return function(object, iterable){
      object[data] = new Data;

      if (iterable !== undefined) {
        iterable = ToObject(iterable);
        if (iterable && iterable.Completion) {
          if (iterable.Abrupt) {
            return iterable;
          } else {
            iterable = iterable.value;
          }
        }

        var itr = Invoke('iterator', iterable, []);

        var adder = object.Get('set');
        if (adder && adder.Completion) {
          if (adder.Abrupt) {
            return adder;
          } else {
            adder = adder.value;
          }
        }

        if (!IsCallable(adder)) {
          return ThrowException('called_on_incompatible_object', [name + '.prototype.set']);
        }

        var next;
        while (next = Invoke('next', itr, [])) {
          if (IsStopIteration(next)) {
            return object;
          }

          if (next && next.Completion) {
            if (next.Abrupt) {
              return next;
            } else {
              next = next.value;
            }
          }

          next = ToObject(next);

          var k = next.Get(0);
          if (k && k.Completion) {
            if (k.Abrupt) {
              return k;
            } else {
              k = k.value;
            }
          }

          var v = next.Get(1);
          if (v && v.Completion) {
            if (v.Abrupt) {
              return v;
            } else {
              v = v.value;
            }
          }

          var status = adder.Call(object, [k, v]);
          if (status && status.Abrupt) {
            return status;
          }
        }
      }

      return object;
    };
  }


  var MapInitialization = CollectionInitializer(MapData, 'Map');

  function LinkedItem(key, next){
    this.key = key;
    this.next = next;
    this.previous = next.previous;
    next.previous = next.previous.next = this;
  }

  void function(){
    define(LinkedItem.prototype, [
      function setNext(item){
        this.next = item;
        item.previous = this;
      },
      function setPrevious(item){
        this.previous = item;
        item.next = this;
      },
      function unlink(){
        this.next.previous = this.previous;
        this.previous.next = this.next;
        this.next = this.previous = this.data = this.key = null;
        return this.data;
      }
    ]);
  }();


  function MapData(){
    this.id = uid++ + '';
    this.size = 0;
    this.strings = create(null);
    this.numbers = create(null);
    this.others = create(null);
    this.guard = create(LinkedItem.prototype);
    this.guard.next = this.guard.previous = this.guard;
    this.guard.key = {};
    this.lastLookup = this.guard;
  }

  MapData.sigil = create(null);

  void function(){
    define(MapData.prototype, [
      function add(key){
        this.size++;
        return new LinkedItem(key, this.guard);
      },
      function lookup(key){
        var type = typeof key;
        if (key === this) {
          return this.guard;
        } else if (key !== null && type === OBJECT) {
          return key.storage[this.id];
        } else {
          return this.getStorage(key)[key];
        }
      },
      function getStorage(key){
        var type = typeof key;
        if (type === STRING) {
          return this.strings;
        } else if (type === NUMBER) {
          return key === 0 && 1 / key === -Infinity ? this.others : this.numbers;
        } else {
          return this.others;
        }
      },
      function set(key, value){
        var type = typeof key;
        if (key !== null && type === OBJECT) {
          var item = key.storage[this.id] || (key.storage[this.id] = this.add(key));
          item.value = value;
        } else {
          var container = this.getStorage(key);
          var item = container[key] || (container[key] = this.add(key));
          item.value = value;
        }
      },
      function get(key){
        var item = this.lookup(key);
        if (item) {
          return item.value;
        }
      },
      function has(key){
        return !!this.lookup(key);
      },
      function remove(key){
        var item;
        if (key !== null && typeof key === OBJECT) {
          item = key.storage[this.id];
          if (item) {
            delete key.storage[this.id];
          }
        } else {
          var container = this.getStorage(key);
          item = container[key];
          if (item) {
            delete container[key];
          }
        }

        if (item) {
          item.unlink();
          this.size--;
          return true;
        }
        return false;
      },
      function after(key){
        if (key === MapData.sigil) {
          var item = this.guard;
        } else if (key === this.lastLookup.key) {
          var item = this.lastLookup;
        } else {
          var item = this.lookup(key);
        }
        if (item && item.next !== this.guard) {
          this.lastLookup = item.next;
          return [item.next.key, item.next.value];
        } else {
          return ThrowStopIteration();
        }
      }
    ]);
  }();




  var WeakMapInitialization = CollectionInitializer(WeakMapData, 'WeakMap');

  function WeakMapData(){
    this.id = uid++ + '';
  }

  void function(){
    define(WeakMapData.prototype, [
      function set(key, value){
        if (value === undefined) {
          value = Empty;
        }
        key.storage[this.id] = value;
      },
      function get(key){
        var value = key.storage[this.id];
        if (value !== Empty) {
          return value;
        }
      },
      function has(key){
        return key.storage[this.id] !== undefined;
      },
      function remove(key){
        var item = key.storage[this.id];
        if (item !== undefined) {
          key.storage[this.id] = undefined;
          return true;
        }
        return false;
      }
    ]);
  }();



  function GetTrap(handler, trap){

  }

  function TrapDefineOwnProperty(proxy, key, descObj, strict){
    var handler = proxy.Handler,
        target = proxy.Target,
        trap = GetTrap(handler, 'defineProperty');


    if (trap === undefined) {
      return target.DefineOwnProperty(key, desc, strict);
    } else {
      var normalizedDesc = NormalizePropertyDescriptor(descObj),
          trapResult = trap.Call(handler, [target, key, normalizedDesc]),
          success = ToBoolean(trapResult),
          targetDesc = target.GetOwnProperty(key),
          extensible = target.GetExtensible();

      if (!extensible && targetDesc === undefined) {
        return ThrowException('proxy_configurability_non_extensible_inconsistent');
      } else if (targetDesc !== undefined && !IsCompatibleDescriptor(extensible, targetDesc, ToPropertyDescriptor(normalizedDesc))) {
        return ThrowException('proxy_incompatible_descriptor');
      } else if (!normalizedDesc.Configurable) {
        if (targetDesc === undefined || targetDesc.Configurable) {
          return ThrowException('proxy_configurability_inconsistent')
        }
      } else if (strict) {
        return ThrowException('strict_property_redefinition');
      }
      return false;
    }
  }

  function TrapGetOwnProperty(proxy, key){
    var handler = proxy.Handler,
        target = proxy.Target,
        trap = GetTrap(handler, 'getOwnPropertyDescriptor');

    if (trap === undefined) {
      return target.GetOwnProperty(key);
    } else {
      var trapResult = trap.Call(handler, [target, key]),
          desc = NormalizeAndCompletePropertyDescriptor(trapResult),
          targetDesc = target.GetOwnProperty(key);

      if (desc === undefined) {
        if (targetDesc !== undefined) {
          if (!targetDesc.Configurable) {
            return ThrowException('proxy_configurability_inconsistent');
          } else if (!target.GetExtensible()) {
            return ThrowException('proxy_configurability_non_extensible_inconsistent');
          }
          return undefined;
        }
      }
      var extensible = target.GetExtensible();
      if (!extensible && targetDesc === undefined) {
        return ThrowException('proxy_configurability_non_extensible_inconsistent');
      } else if (targetDesc !== undefined && !IsCompatibleDescriptor(extensible, targetDesc, ToPropertyDescriptor(desc))) {
        return ThrowException('proxy_incompatible_descriptor');
      } else if (!ToBoolean(desc.Get('configurable'))) {
        if (targetDesc === undefined || targetDesc.Configurable) {
          return ThrowException('proxy_configurability_inconsistent')
        }
      }
      return desc;
    }
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

  void function(){
    define(Reference.prototype, {
      Reference: SYMBOLS.Reference
    });
  }();




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
    withBase: undefined
  });

  void function(){
    define(EnvironmentRecord.prototype, [
      function HasBinding(name){},
      function GetBindingValue(name, strict){},
      function SetMutableBinding(name, value, strict){},
      function DeleteBinding(name){},
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
      function GetSuperBase(){},
      function reference(name, strict){
        return new Reference(this, name, strict);
      }
    ]);
  }();


  function DeclarativeEnvironmentRecord(){
    EnvironmentRecord.call(this, new Hash);
    this.consts = new Hash;
    this.deletables = new Hash;
  }

  void function(){
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
          if (value === Uninitialized)
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
          if (this.bindings[name] === Uninitialized)
            return ThrowException('uninitialized_const', name);
          else if (strict)
            return ThrowException('const_assign', name);
        } else {
          this.bindings[name] = value;
        }
      },
      function CreateImmutableBinding(name){
        this.bindings[name] = Uninitialized;
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
  }();


  function ObjectEnvironmentRecord(object){
    EnvironmentRecord.call(this, object);
  }

  void function(){
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
  }();


  function FunctionEnvironmentRecord(receiver, holder, name){
    DeclarativeEnvironmentRecord.call(this);
    this.thisValue = receiver;
    this.HomeObject = holder;
    this.MethodName = name;
  }

  void function(){
    inherit(FunctionEnvironmentRecord, DeclarativeEnvironmentRecord, {
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
  }();


  function GlobalEnvironmentRecord(global){
    ObjectEnvironmentRecord.call(this, global);
    this.thisValue = this.bindings;
  }

  void function(){
    inherit(GlobalEnvironmentRecord, ObjectEnvironmentRecord, {
      outer: null
    }, [
      function GetThisBinding(){
        return this.bindings;
      },
      function HasThisBinding(){
        return true;
      },
      function inspect(){
        return '[GlobalEnvironmentRecord]';
      }
    ]);
  }();



  var Proto = {
    Get: {
      Call: function(receiver){
        return receiver.GetPrototype();
      }
    },
    Set: {
      Call: function(receiver, args){
        return receiver.SetPrototype(args[0]);
      }
    }
  };


  // ###############
  // ### $Object ###
  // ###############

  function $Object(proto){
    if (proto === undefined) {
      proto = intrinsics.ObjectProto;
    }
    this.Prototype = proto;
    this.properties = new PropertyList;
    this.hiddens = create(null);
    this.storage = create(null);
    $Object.tag(this);
    if (proto === null) {
      this.properties.setProperty(['__proto__', null, 6, Proto]);
    }
    hide(this, 'hiddens');
    hide(this, 'storage');
    hide(this, 'Prototype');
  }

  void function(counter){
    define($Object, [
      function tag(object){
        if (object.id === undefined) {
          object.id = counter++;
          hide(object, 'id');
        }
      }
    ]);
  }(0)

  define($Object.prototype, {
    Extensible: true,
    NativeBrand: BRANDS.NativeObject
  });

  void function(){
    define($Object.prototype, [
      function GetPrototype(){
        return this.Prototype;
      },
      function SetPrototype(value){
        if (typeof value === 'object' && this.GetExtensible()) {
          this.Prototype = value;
          return true;
        } else {
          return false;
        }
      },
      function GetExtensible(){
        return this.Extensible;
      },
      function GetOwnProperty(key){
        if (key === '__proto__') {
          var val = this.GetP(this, '__proto__');
          return typeof val === OBJECT ? new DataDescriptor(val, 6) : undefined;
        }

        var prop = this.properties.getProperty(key);
        if (prop) {
          if (prop[2] & A) {
            var Descriptor = AccessorDescriptor,
                val = prop[1];
          } else {
            var val = prop[3] ? prop[3](this) : prop[1],
                Descriptor = DataDescriptor;
          }
          return new Descriptor(val, prop[2]);
        }
      },
      function GetProperty(key){
        var desc = this.GetOwnProperty(key);
        if (desc) {
          return desc;
        } else {
          var proto = this.GetPrototype();
          if (proto) {
            return proto.GetProperty(key);
          }
        }
      },
      function Get(key){
        return this.GetP(this, key);
      },
      function Put(key, value, strict){
        if (!this.SetP(this, key, value) && strict) {
          return ThrowException('strict_cannot_assign', [key]);
        }
      },
      function GetP(receiver, key){
        var prop = this.properties.getProperty(key);
        if (!prop) {
          var proto = this.GetPrototype();
          if (proto) {
            return proto.GetP(receiver, key);
          }
        } else if (prop[3]) {
          var getter = prop[3].Get;
          return getter.Call(receiver, [key]);
        } else if (prop[2] & A) {
          var getter = prop[1].Get;
          if (IsCallable(getter)) {
            return getter.Call(receiver, []);
          }
        } else {
          return prop[1];
        }
      },
      function SetP(receiver, key, value) {
        var prop = this.properties.getProperty(key);
        if (prop) {
          if (prop[3]) {
            var setter = prop[3].Set;
            setter.Call(receiver, [key, value]);
            return true;
          } else if (prop[2] & A) {
            var setter = prop[1].Set;
            if (IsCallable(setter)) {
              setter.Call(receiver, [value]);
              return true;
            } else {
              return false;
            }
          } else if (prop[2] & W) {
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
              this.properties.set(key, desc.Value, desc.Enumerable | (desc.Configurable << 1) | (desc.Writable << 2));
            } else {
              this.properties.set(key, new Accessor(desc.Get, desc.Set), desc.Enumerable | (desc.Configurable << 1) | A);
            }
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

          var prop = this.properties.getProperty(key);

          if (IsAccessorDescriptor(desc)) {
            prop[2] = desc.Enumerable | (desc.Configurable << 1) | A;
            if (IsDataDescriptor(current)) {
              prop[1] = new Accessor(desc.Get, desc.Set);
            } else {
              if (SET in desc) {
                prop[1].Set = desc.Set;
              }
              if (GET in desc) {
                prop[1].Get = desc.Get;
              }
            }
          } else {
            if (IsAccessorDescriptor(current)) {
              current.Writable = true;
            }
            WRITABLE in desc || (desc.Writable = current.Writable);
            if ('Value' in desc) {
              prop[1] = desc.Value;
            }
            prop[2] = desc.Enumerable | (desc.Configurable << 1) | (desc.Writable << 2);
          }

          return true;
        }
      },
      function HasOwnProperty(key){
        return this.properties.has(key);
      },
      function HasProperty(key){
        if (this.properties.has(key)) {
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
        if (!this.properties.has(key)) {
          return true;
        } else if (this.properties.hasAttribute(key, C)) {
          this.properties.remove(key);
          return true;
        } else if (strict) {
          return ThrowException('strict_delete', []);
        } else {
          return false;
        }
      },
      function Iterate(){
        return Invoke('iterator', this, []);
      },
      function enumerator(){
        var keys = this.Enumerate(true, true),
            index = 0,
            len = keys.length;

        var iterator = new $Object;
        setDirect(iterator, 'next', new $NativeFunction({
          length: 0,
          name: 'next',
          call: function(){
            if (index < len) {
              return keys[index++];
            } else {
              return ThrowStopIteration();
            }
          }
        }));
        return iterator;
      },
      function Enumerate(includePrototype, onlyEnumerable){
        if (onlyEnumerable) {
          var props = this.properties.filter(function(prop){
            return prop[2] & E;
          }, this);
        } else {
          var props = this.properties.clone();
        }

        if (includePrototype) {
          var proto = this.GetPrototype();
          if (proto) {
            props.merge(proto.Enumerate(includePrototype, onlyEnumerable));
          }
        }

        return props.keys();
      },
      function DefaultValue(hint){
        var order = hint === 'String' ? ['toString', 'valueOf'] : ['valueOf', 'toString'];

        for (var i=0; i < 2; i++) {
          var method = this.Get(order[i]);
          if (method && method.Completion) {
            if (method.Abrupt) {
              return method;
            } else {
              method = method.value;
            }
          }

          if (IsCallable(method)) {
            var val = method.Call(this, []);
            if (val && val.Completion) {
              if (val.Abrupt) {
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
  }();

  function PrivateName(name){
    this.name = name;
    this.key = Math.random().toString(36).slice(2);
  }

  void function(){
    define(PrivateName.prototype, [
      function toString(){
        return this.key;
      }
    ]);
  }();



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
    if (holder !== undefined) {
      this.Home = holder;
    }
    if (method) {
      this.MethodName = name;
    }

    if (strict) {
      defineDirect(this, 'arguments', intrinsics.ThrowTypeError, __A);
      defineDirect(this, 'caller', intrinsics.ThrowTypeError, __A);
    } else {
      defineDirect(this, 'arguments', null, ___);
      defineDirect(this, 'caller', null, ___);
    }

    defineDirect(this, 'length', params ? params.ExpectedArgumentCount : 0, ___);

    if (kind !== ARROW) {
      if (!name && code.name) {
        name = code.name;
      }
      if (typeof name === 'string') {
        defineDirect(this, 'name', name, ___);
      }
    }

    hide(this, 'Realm');
    hide(this, 'Code');
    hide(this, 'Scope');
    hide(this, 'FormalParameters');
    hide(this, 'Strict');
    hide(this, 'ThisMode');
  }

  void function(){
    inherit($Function, $Object, {
      NativeBrand: BRANDS.NativeFunction,
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
        if (realm !== this.Realm) {
          activate(this.Realm);
        }
        if (this.ThisMode === 'lexical') {
          var local = NewDeclarativeEnvironment(this.Scope);
        } else {
          if (this.ThisMode !== 'strict') {
            if (receiver == null) {
              receiver = this.Realm.global;
            } else if (typeof receiver !== OBJECT) {
              receiver = ToObject(receiver);
              if (receiver.Completion) {
                if (receiver.Abrupt) {
                  return receiver;
                } else {
                  receiver = receiver.value;
                }
              }
            }
          }
          var local = NewFunctionEnvironment(this, receiver);
        }

        var caller = context ? context.callee : null;

        ExecutionContext.push(new ExecutionContext(context, local, realm, this.Code, this, isConstruct));
        var status = FunctionDeclarationInstantiation(this, args, local);
        if (status && status.Abrupt) {
          ExecutionContext.pop();
          return status;
        }

        if (!this.thunk) {
          this.thunk = new Thunk(this.Code);
          hide(this, 'thunk');
        }

        if (!this.Strict) {
          defineDirect(this, 'arguments', local.arguments, ___);
          defineDirect(this, 'caller', caller, ___);
          local.arguments = null;
        }

        var result = this.thunk.run(context);

        if (!this.Strict) {
          defineDirect(this, 'arguments', null, ___);
          defineDirect(this, 'caller', null, ___);
        }

        ExecutionContext.pop();
        return result && result.type === Return ? result.value : result;
      },
      function Construct(args){
        if (this.ThisMode === 'lexical') {
          return ThrowException('construct_arrow_function');
        }
        var prototype = this.Get('prototype');
        if (prototype.Completion) {
          if (prototype.Abrupt) {
            return prototype;
          } else {
            prototype = prototype.value;
          }
        }
        var instance = typeof prototype === OBJECT ? new $Object(prototype) : new $Object;
        if (this.NativeConstructor) {
          instance.NativeBrand = prototype.NativeBrand;
        } else if (this.Class) {
          instance.Brand = prototype.Brand;
        }
        instance.ConstructorName = this.properties.get('name');
        var result = this.Call(instance, args, true);
        if (result && result.Completion) {
          if (result.Abrupt) {
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
        if (prototype.Completion) {
          if (prototype.Abrupt) {
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
  }();


  function $NativeFunction(options){
    if (options.proto === undefined)
      options.proto = intrinsics.FunctionProto;
    $Object.call(this, options.proto);
    defineDirect(this, 'arguments', null, ___);
    defineDirect(this, 'caller', null, ___);
    defineDirect(this, 'length', options.length, ___);
    defineDirect(this, 'name', options.name, ___);
    this.call = options.call;
    if (options.construct) {
      this.construct = options.construct;
    }
    this.Realm = realm;
    hide(this, 'Realm');
    hide(this, 'call');
  }

  void function(){
    inherit($NativeFunction, $Function, {
      Native: true,
    }, [
      function Call(receiver, args){
        "use strict";
        var result = this.call.apply(receiver, [].concat(args));
        return result && result.type === Return ? result.value : result;
      },
      function Construct(args){
        "use strict";
        if (this.construct) {
          if (hasDirect(this, 'prototype')) {
            var instance = new $Object(getDirect(this, 'prototype'));
          } else {
            var instance = new $Object;
          }
          instance.ConstructorName = this.properties.get('name');
          var result = this.construct.apply(instance, args);
        } else {
          var result = this.call.apply(undefined, args);
        }
        return result && result.type === Return ? result.value : result;
      }
    ]);
  }();

  function $BoundFunction(target, boundThis, boundArgs){
    $Object.call(this, intrinsics.FunctionProto);
    this.TargetFunction = target;
    this.BoundThis = boundThis;
    this.BoundArgs = boundArgs;
    defineDirect(this, 'arguments', intrinsics.ThrowTypeError, __A);
    defineDirect(this, 'caller', intrinsics.ThrowTypeError, __A);
    defineDirect(this, 'length', getDirect(target, 'length'), ___);
  }

  void function(){
    inherit($BoundFunction, $Function, [
      function Call(_, newArgs){
        return this.TargetFunction.Call(this.BoundThis, this.BoundArgs.concat(newArgs));
      },
      function Construct(newArgs){
        if (!this.TargetFunction.Construct) {
          return ThrowException('not_constructor', this.TargetFunction.name);
        }
        return this.TargetFunction.Construct(this.BoundArgs.concat(newArgs));
      },
      function HasInstance(arg){
        if (!this.TargetFunction.HasInstance) {
          return ThrowException('instanceof_function_expected', this.TargetFunction.name);
        }
        return This.TargetFunction.HasInstance(arg);
      }
    ]);
  }();

  // #############
  // ### $Date ###
  // #############

  function $Date(value){
    $Object.call(this, intrinsics.DateProto);
    this.PrimitiveValue = value;
  }

  inherit($Date, $Object, {
    NativeBrand: BRANDS.NativeDate,
  });

  // ###############
  // ### $String ###
  // ###############

  function $String(value){
    $Object.call(this, intrinsics.StringProto);
    this.PrimitiveValue = value;
    defineDirect(this, 'length', value.length, ___);
  }

  void function(){
    inherit($String, $Object, {
      NativeBrand: BRANDS.StringWrapper,
      PrimitiveValue: undefined
    }, [
      function GetOwnProperty(key){
        var desc = $Object.prototype.GetOwnProperty.call(this, key);
        if (desc) {
          return desc;
        }
        if (key < this.PrimitiveValue.length && key >= 0) {
          return new StringIndice(this.PrimitiveValue[key]);
        }
      },
      function Get(key){
        if (key < this.PrimitiveValue.length && key >= 0) {
          return this.PrimitiveValue[key];
        }
        return this.GetP(this, key);
      },
      function HasOwnProperty(key){
        key = ToPropertyName(key);
        if (key && key.Completion) {
          if (key.Abrupt) {
            return key;
          } else {
            key = key.value;
          }
        }
        if (typeof key === 'string') {
          if (key < getDirect(this, 'length') && key >= 0) {
            return true;
          }
        }
        return $Object.prototype.HasOwnProperty.call(this, key);
      },
      function HasProperty(key){
        var ret = this.HasOwnProperty(key);
        if (ret && ret.Completion) {
          if (ret.Abrupt) {
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
      function Enumerate(includePrototype, onlyEnumerable){
        var props = $Object.prototype.Enumerate.call(this, includePrototype, onlyEnumerable);
        return unique(numbers(this.PrimitiveValue.length).concat(props));
      }
    ]);
  }();


  // ###############
  // ### $Number ###
  // ###############

  function $Number(value){
    $Object.call(this, intrinsics.NumberProto);
    this.PrimitiveValue = value;
  }

  inherit($Number, $Object, {
    NativeBrand: BRANDS.NumberWrapper,
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
    NativeBrand: BRANDS.BooleanWrapper,
    PrimitiveValue: undefined,
  });



  // ############
  // ### $Map ###
  // ############

  function $Map(){
    $Object.call(this, intrinsics.MapProto);
  }

  inherit($Map, $Object, {
    NativeBrand: BRANDS.NativeMap
  });

  // ############
  // ### $Set ###
  // ############

  function $Set(){
    $Object.call(this, intrinsics.SetProto);
  }

  inherit($Set, $Object, {
    NativeBrand: BRANDS.NativeSet
  });


  // ################
  // ### $WeakMap ###
  // ################

  function $WeakMap(){
    $Object.call(this, intrinsics.WeakMapProto);
  }

  inherit($WeakMap, $Object, {
    NativeBrand: BRANDS.NativeWeakMap,
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

  void function(){
    inherit($Array, $Object, {
      NativeBrand: BRANDS.NativeArray
    }, [
      function DefineOwnProperty(key, desc, strict){
        function Reject(str) {
          if (strict) {
            throw new TypeError(str);
          }
          return false;
        }

        var oldLenDesc = this.GetOwnProperty('length'),
            oldLen = oldLenDesc.Value;

        if (key === 'length') {
          if (!(VALUE in desc)) {
            return $Object.prototype.DefineOwnProperty.call(this, 'length', desc, strict);
          }

          var newLenDesc = copy(desc),
              newLen = ToUint32(desc.Value);

          if (newLen.Completion) {
            if (newLen.Abrupt) {
              return newLen;
            } else {
              newLen = newLen.Value;
            }
          }
          var val = ToNumber(desc.Value);
          if (val.Completion) {
            if (val.Abrupt) {
              return val;
            } else {
              val = val.Value;
            }
          }

          if (newLen !== val) {
            return ThrowException('invalid_array_length');
          }

          newLen = newLenDesc.Value;
          if (newLen >= oldLen) {
            return $Object.prototype.DefineOwnProperty.call(this, 'length', newLenDesc, strict);
          }

          if (oldLenDesc.Writable === false) {
            return Reject();
          }

          if (!(WRITABLE in newLenDesc) || newLenDesc.Writable) {
            var newWritable = true;
          } else {
            newWritable = false;
            newLenDesc.Writable = true;
          }

          var success = $Object.prototype.DefineOwnProperty.call(this, 'length', newLenDesc, strict);
          if (success.Completion) {
            if (success.Abrupt) {
              return success;
            } else {
              success = success.Value;
            }
          }
          if (success === false) {
            return false;
          }

          while (newLen < oldLen) {
            oldLen = oldLen - 1;
            var deleted = this.Delete('' + oldLen, false);
            if (deleted.Completion) {
              if (deleted.Abrupt) {
                return deleted;
              } else {
                deleted = deleted.Value;
              }
            }

            if (!deleted) {
              newLenDesc.Value = oldLen + 1;
              if (!newWritable) {
                newLenDesc.Writable = false;
              }
              $Object.prototype.DefineOwnProperty.call(this, 'length', newLenDesc, false);
              Reject();
            }
          }
          if (!newWritable) {
            $Object.prototype.DefineOwnProperty.call(this, 'length', {
              Writable: false
            }, false);
          }

          return true;
        }  else if (IsArrayIndex(key)) {
          var index = ToUint32(key);

          if (index.Completion) {
            if (index.Abrupt) {
              return index;
            } else {
              index = index.Value;
            }
          }

          if (index >= oldLen && oldLenDesc.Writable === false) {
            return Reject();
          }

          success = $Object.prototype.DefineOwnProperty.call(this, key, desc, false);
          if (success.Completion) {
            if (success.Abrupt) {
              return success;
            } else {
              success = success.Value;
            }
          }

          if (success === false) {
            return Reject();
          }

          if (index >= oldLen) {
            oldLenDesc.Value = index + 1;
            $Object.prototype.DefineOwnProperty.call(this, 'length', oldLenDesc, false);
          }
          return true;
        }

        return $Object.prototype.DefineOwnProperty.call(this, key, desc, key);
      }
    ]);
  }();


  // ###############
  // ### $RegExp ###
  // ###############

  function $RegExp(primitive){
    if (!this.properties) {
      $Object.call(this, intrinsics.RegExpProto);
    }
    this.PrimitiveValue = primitive;
    defineDirect(this, 'global', primitive.global, ___);
    defineDirect(this, 'ignoreCase', primitive.ignoreCase, ___);
    defineDirect(this, 'lastIndex', primitive.lastIndex, __W);
    defineDirect(this, 'multiline', primitive.multiline, ___);
    defineDirect(this, 'source', primitive.source, ___);
  }

  inherit($RegExp, $Object, {
    NativeBrand: BRANDS.NativeRegExp,
    Match: null,
  });


  // ####################
  // ### $PrivateName ###
  // ####################

  function $PrivateName(proto){
    $Object.call(this, intrinsics.PrivateNameProto);
  }

  inherit($PrivateName, $Object, {
    NativeBrand: BRANDS.NativePrivateName
  });



  // ##################
  // ### $Arguments ###
  // ##################

  function $Arguments(length){
    $Object.call(this);
    defineDirect(this, 'length', length, _CW);
  }

  inherit($Arguments, $Object, {
    NativeBrand: BRANDS.NativeArguments,
    ParameterMap: null,
  });

  function $MappedArguments(map, args){
    this.properties = args.properties;
    this.Prototype = args.Prototype;
    define(this, 'keys', args.keys);
    this.ParameterMap = map;
  }

  void function(){
    inherit($MappedArguments, $Arguments, {
      ParameterMap: null,
    }, [
      function Get(key){
        if (hasOwnDirect(this.ParameterMap, key)) {
          return this.ParameterMap.Get(key);
        } else {
          var val = this.GetP(this, key);
          if (key === 'caller' && IsCallable(val) && val.Strict) {
            return ThrowException('strict_poison_pill');
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
          return ThrowException('strict_lhs_assignment');
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
        if (result.Abrupt) {
          return result;
        }

        if (result && hasOwnDirect(this.ParameterMap, key)) {
          this.ParameterMap.Delete(key, false);
        }

        return result;
      }
    ]);
  }();

  function $Math(){
    $Object.call(this);
  }

  inherit($Math, $Object, {
    NativeBrand: BRANDS.NativeMath
  });

  function $JSON(){
    $Object.call(this);
  }

  inherit($JSON, $Object, {
    NativeBrand: BRANDS.NativeJSON
  });

  function $Error(name, type, message){
    $Object.call(this, intrinsics[name+'Proto']);
    defineDirect(this, 'message', message, ECW);
    if (type !== undefined) {
      defineDirect(this, 'type', type, _CW);
    }
  }

  void function(){
    inherit($Error, $Object, {
      NativeBrand: BRANDS.NativeError
    }, [
      function setOrigin(filename, type){
        if (filename) {
          setDirect(this, 'filename', filename);
        }
        if (type) {
          setDirect(this, 'type', type);
        }
      },
      function setCode(loc, code){
        var line = code.split('\n')[loc.start.line - 1];
        var pad = new Array(loc.start.column).join('-') + '^';
        setDirect(this, 'line', loc.start.line);
        setDirect(this, 'column', loc.start.column);
        setDirect(this, 'code', line + '\n' + pad);
      }
    ]);
  }();



  function $Proxy(handler, target){
    this.Handler = handler;
    this.Target = target;
    this.NativeBrand = target.NativeBrand;
    if ('Call' in target) {
      this.HasInstance = $Function.prototype.HasInstance;
      this.Call = ProxyCall;
      this.Construct = ProxyConstruct;
    }
    if ('PrimitiveValue' in target) {
      this.PrimitiveValue = target.PrimitiveValue;
    }
  }

  void function(){
    inherit($Proxy, $Object, {
      isProxy: true
    }, [
      function GetPrototype(){
        var trap = GetTrap(this.Handler, 'getPrototypeOf');
        if (trap === undefined) {
          return this.Target.GetPrototype();
        } else {
          var result = trap.Call(this.Handler, [this.Target]),
              targetProto = this.Target.GetPrototype();

          if (result !== targetProto) {
            return ThrowException('proxy_prototype_inconsistent');
          } else {
            return targetProto;
          }
        }
      },
      function GetExtensible(){
        var trap = GetTrap(this.Handler, 'isExtensible');
        if (trap === undefined) {
          return this.Target.GetExtensible();
        } else {
          var proxyIsExtensible = ToBoolean(trap.Call(this.Handler, [this.Target])),
              targetIsExtensible  = this.Target.GetExtensible();

          if (proxyIsExtensible !== targetIsExtensible) {
            return ThrowException('proxy_extensibility_inconsistent');
          } else {
            return targetIsExtensible;
          }
        }
      },
      function GetP(key, receiver){

      },
      function SetP(key, value, receiver){

      },
      function GetOwnProperty(key){
        var descObj = TrapGetOwnProperty(this, key);
        if (descObj === undefined) {
          return descObj;
        } else {
          return ToCompletePropertyDescriptor(descObj);
        }
      },
      function DefineOwnProperty(key, desc, strict){
        var descObj = FromGenericPropertyDescriptor(desc);
        return TrapDefineOwnProperty(this, key, descObj, strict);
      },
      function HasOwnProperty(key){

      },
      function HasProperty(key){
        var trap = GetTrap(this.Handler, 'has');
        if (trap === undefined) {
          return this.Target.HasProperty(key);
        }
        var trapResult = trap.Call(this.Handler, [this.Target, key]),
            success = ToBoolean(trapResult);

        if (success === false) {
          var targetDesc = this.Target.GetOwnProperty(key);
          if (desc !== undefined && targetDesc.Configurable === false) {
            return ThrowException('proxy_has_inconsistent');
          } else if (!this.Target.GetExtensible() && targetDesc !== undefined) {
            return ThrowException('proxy_has_inconsistent');
          }
        }
        return success;
      },
      function Delete(key, strict){
        var trap = GetTrap(this.Handler, 'deleteProperty');
        if (trap === undefined) {
          return this.Target.Delete(key, strict);
        }
        var trapResult = trap.Call(this.Handler, [this.Target, key]),
            success = ToBoolean(trapResult);

        if (success === true) {
          var targetDesc = this.Target.GetOwnProperty(key);
          if (desc !== undefined && targetDesc.Configurable === false) {
            return ThrowException('proxy_delete_inconsistent');
          } else if (!this.Target.GetExtensible() && targetDesc !== undefined) {
            return ThrowException('proxy_delete_inconsistent');
          }
          return true;
        } else if (strict) {
          return ThrowException('strict_delete_failure');
        } else {
          return false;
        }
      }
    ]);
  }();

  function ProxyCall(receiver, args){}
  function ProxyConstruct(args){}

  function $PrimitiveBase(value){
    this.PrimitiveValue = value;
    switch (typeof value) {
      case STRING:
        $Object.call(this, intrinsics.StringProto);
        this.NativeBrand = BRANDS.StringWrapper;
        break;
      case NUMBER:
        $Object.call(this, intrinsics.NumberProto);
        this.NativeBrand = BRANDS.NumberWrapper;
        break;
      case BOOLEAN:
        $Object.call(this, intrinsics.BooleanProto);
        this.NativeBrand = BRANDS.BooleanWrapper;
        break;
    }
  }

  operators.$PrimitiveBase = $PrimitiveBase;

  void function(){
    inherit($PrimitiveBase, $Object, [
      function SetP(receiver, key, value, strict){
        var desc = this.GetProperty(key);
        if (desc) {
          if (IsDataDescriptor(desc)) {
            return desc.Value;
          } else if (desc.Get) {
            if (!receiver) {
              receiver = this.PrimitiveValue;
            }

            return desc.Get.Call(receiver, []);
          }
        }
      },
      function GetP(receiver, key) {
        var desc = this.GetProperty(key);
        if (desc) {
          if (IsDataDescriptor(desc)) {
            return desc.Value;
          } else if (desc.Get) {
            if (!receiver) {
              receiver = this.PrimitiveValue;
            }

            return desc.Get.Call(receiver, []);
          }
        }
      }
    ]);
  }();


  function ExecutionContext(caller, local, realm, code, func, isConstruct){
    this.caller = caller;
    this.realm = realm;
    this.Code = code;
    this.LexicalEnvironment = local;
    this.VariableEnvironment = local;
    this.Strict = code.Strict;
    this.isConstruct = !!isConstruct;
    this.callee = func && !func.Native ? func : caller ? caller.callee : null;
  }

  void function(){
    define(ExecutionContext, [
      function push(newContext){
        context = newContext;
        context.realm.active || activate(context.realm);
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
  }();

  define(ExecutionContext.prototype, {
    isGlobal: false,
    strict: false,
    isEval: false,
  });

  void function(){
    define(ExecutionContext.prototype, [
      function initializeBindings(pattern, value, lexical){
        return BindingInitialization(pattern, value, lexical ? this.LexicalEnvironment : undefined);
      },
      function popBlock(){
        var block = this.LexicalEnvironment;
        this.LexicalEnvironment = this.LexicalEnvironment.outer;
        return block;
      },
      function pushBlock(code){
        this.LexicalEnvironment = NewDeclarativeEnvironment(this.LexicalEnvironment);
        return BlockDeclarationInstantiation(code, this.LexicalEnvironment);
      },
      function pushClass(def, superclass){
        return ClassDefinitionEvaluation(def.pattern, superclass, def.ctor, def.methods);
      },
      function pushWith(obj){
        this.LexicalEnvironment = NewObjectEnvironment(obj, this.LexicalEnvironment);
        this.LexicalEnvironment.withEnvironment = true;
        return obj;
      },
      function defineMethod(kind, obj, key, code){
        return PropertyDefinitionEvaluation(kind, obj, key, code);
      },
      function createFunction(name, code){
        if (name) {
          var env = NewDeclarativeEnvironment(this.LexicalEnvironment);
          env.CreateImmutableBinding(name);
        } else {
          var env = this.LexicalEnvironment;
        }
        var func = new $Function(code.Type, name, code.params, code, env, code.Strict);
        if (code.Type !== ARROW) {
          MakeConstructor(func);
          name && env.InitializeBinding(name, func);
        }
        return func;
      },
      function createArray(len){
        return new $Array(len);
      },
      function createObject(proto){
        return new $Object(proto);
      },
      function createRegExp(regex){
        return new $RegExp(regex);
      },
      function Element(prop, base){
        var result = CheckObjectCoercible(base);
        if (result.Abrupt) {
          return result;
        }

        var name = ToPropertyName(prop);
        if (name && name.Completion) {
          if (name.Abrupt) {
            return name;
          } else {
            name = name.value;
          }
        }

        return new Reference(base, name, this.Strict);
      },
      function SuperReference(prop){
        var env = this.GetThisEnvironment();
        if (!env.HasSuperBinding()) {
          return ThrowException('invalid_super_binding');
        } else if (prop === null) {
          return env;
        }

        var baseValue = env.GetSuperBase(),
            status = CheckObjectCoercible(baseValue);

        if (status.Abrupt) {
          return status;
        }

        if (prop === false) {
          var key = env.GetMethodName();
        } else {
          var key = ToPropertyName(prop);
          if (key && key.Completion) {
            if (key.Abrupt) {
              return key;
            } else {
              return key.value;
            }
          }
        }

        var ref = new Reference(baseValue, key, this.Strict);
        ref.thisValue = env.GetThisBinding();
        return ref;
      },
      function GetThisEnvironment(){
        var env = this.LexicalEnvironment;
        while (env) {
          if (env.HasThisBinding())
            return env;
          env = env.outer;
        }
      },
      function IdentifierResolution(name){
        return GetIdentifierReference(this.LexicalEnvironment, name, this.Strict);
      },
      function ThisResolution(){
        return this.GetThisEnvironment().GetThisBinding();
      },
      function EvaluateConstruct(func, args) {
        if (typeof func !== OBJECT) {
          return ThrowException('not_constructor', func);
        }

        if ('Construct' in func) {
          return func.Construct(args);
        } else {
          return ThrowException('not_constructor', func);
        }
      },
      function EvaluateCall(ref, func, args){
        if (typeof func !== OBJECT || !IsCallable(func)) {
          return ThrowException('called_non_callable', [ref && ref.name]);
        }

        if (ref instanceof Reference) {
          var receiver = IsPropertyReference(ref) ? GetThisValue(ref) : ref.base.WithBaseObject();
        }

        return func.Call(receiver, args);
      },
      function SpreadArguments(precedingArgs, spread){
        if (typeof spread !== 'object') {
          return ThrowException('spread_non_object');
        }

        var offset = precedingArgs.length,
            len = ToUint32(spread.Get('length'));

        if (len && len.Completion) {
          if (len.Abrupt) {
            return len;
          } else {
            return len.value;
          }
        }

        for (var i=0; i < len; i++) {
          var value = spread.Get(i);
          if (value && value.Completion) {
            if (value.Abrupt) {
              return value;
            } else {
              value = value.value;
            }
          }

          precedingArgs[i + offset] = value;
        }
      },
      function SpreadInitialization(array, offset, spread){
        if (typeof spread !== 'object') {
          return ThrowException('spread_non_object');
        }

        var value, iterator = spread.Iterate();

        while (!(value = Invoke('next', iterator, [])) && !IsStopIteration(value)) {
          if (value && value.Completion) {
            if (value.Abrupt) {
              return value;
            } else {
              value = value.value;
            }
          }
          defineDirect(array, offset++, value, ECW);
        }

        defineDirect(array, 'length', offset, _CW);
        return offset;
      },
      function SpreadDestructuring(target, index){
        var array = new $Array(0);
        if (target == null) {
          return array;
        }
        if (typeof target !== 'object') {
          return ThrowException('spread_non_object', typeof target);
        }

        var len = ToUint32(target.Get('length'));
        if (len && len.Completion) {
          if (len.Abrupt) {
            return len;
          } else {
            len = len.value;
          }
        }

        var count = len - index;
        for (var i=0; i < count; i++) {
          var value = target.Get(index + i);
          if (value && value.Completion) {
            if (value.Abrupt) {
              return value;
            } else {
              value = value.value;
            }
          }
          defineDirect(array, i, value, ECW);
        }

        defineDirect(array, 'length', i, _CW);
        return array;
      }
    ]);
  }();


  var $errors = ['EvalError',  'RangeError',  'ReferenceError',  'SyntaxError',  'TypeError',  'URIError'];


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

    bindings.StopIteration = new $Object(bindings.ObjectProto);
    bindings.StopIteration.NativeBrand = StopIteration;

    for (var i=0; i < 6; i++) {
      var prototype = bindings[$errors[i] + 'Proto'] = create($Error.prototype);
      $Object.call(prototype, bindings.ErrorProto);
      defineDirect(prototype, 'name', $errors[i], _CW);
      defineDirect(prototype, 'type', undefined, _CW);
      defineDirect(prototype, 'arguments', undefined, _CW);
    }

    bindings.FunctionProto.FormalParameters = [];
    defineDirect(bindings.ArrayProto, 'length', 0, __W);
    defineDirect(bindings.ErrorProto, 'name', 'Error', _CW);
    defineDirect(bindings.ErrorProto, 'message', '', _CW);

  }

  void function(){
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
          activate(this.realm);
        }

        this.bindings[options.name] = new $NativeFunction(options);

        if (activeRealm) {
          activate(activeRealm);
        }
      }
    ]);
  }();


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
    Error   : $Error,
    Function: $Function,
    Map     : $Map,
    Number  : $Number,
    //Proxy   : $Proxy,
    RegExp  : $RegExp,
    Set     : $Set,
    String  : $String,
    WeakMap : $WeakMap
  };

  var primitives = {
    Date: Date.prototype,
    RegExp: RegExp.prototype,
    String: '',
    Number: 0,
    Boolean: false
  };

  var atoms = {
    NaN: NaN,
    Infinity: Infinity,
    undefined: undefined
  };

  function wrapNatives(source, target){
    if (!Object.getOwnPropertyNames) return;
    Object.getOwnPropertyNames(source).forEach(function(key){
      if (typeof source[key] === 'function' && key !== 'constructor' && key !== 'toString' && key !== 'valueOf') {
        var func = new $NativeFunction({
          name: key,
          length: source[key].length,
          call: function(a, b, c, d){
            var v = this;
            if (v == null) {
              try { v = source.constructor(v) }
              catch (e) { v = new source.constructor }
            }
            if (v instanceof source.constructor || typeof v !== 'object') {
              var result =  v[key](a, b, c, d);
            } else if (v.PrimitiveValue) {
              var result = v.PrimitiveValue[key](a, b, c, d);
            }
            if (!isObject(result)) {
              return result;
            }
            if (result instanceof Array) {
              return fromInternalArray(result);
            }
          }
        });
        defineDirect(target, key, func, 6);
      }
    });
  }

  function wrapMapFunction(name){
    return function(map, key, val){
      return map.MapData[name](key, val);
    };
  }

  function wrapWeakMapFunction(name){
    return function(map, key, val){
      return map.WeakMapData[name](key, val);
    };
  }

  var timers = {};

  var nativeCode = ['function ', '() { [native code] }'];

  var natives = {
    defineDirect: defineDirect,
    deleteDirect: deleteDirect,
    hasOwnDirect: hasOwnDirect,
    hasDirect: hasDirect,
    setDirect: setDirect,
    ToObject: ToObject,
    ToString: ToString,
    ToNumber: ToNumber,
    ToBoolean: ToBoolean,
    ToPropertyName: ToPropertyName,
    ToInteger: ToInteger,
    ToInt32: ToInt32,
    ToUint32: ToUint32,
    ToUint16: ToUint16,
    IsConstructCall: function(){
      return context.isConstruct;
    },
    GetNativeBrand: function(object){
      return object.NativeBrand.name;
    },
    GetBrand: function(object){
      return object.Brand || object.NativeBrand.name;
    },
    GetPrimitiveValue: function(object){
      return object ? object.PrimitiveValue : undefined;
    },
    IsObject: function(object){
      return object instanceof $Object;
    },
    SetInternal: function(object, key, value){
      object[key] = value;
      hide(object, key);
    },
    GetInternal: function(object, key){
      return object[key];
    },
    HasInternal: function(object, key){
      return key in object;
    },
    SetHidden: function(object, key, value){
      object.hiddens[key] = value;
    },
    GetHidden: function(object, key){
      return object.hiddens[key];
    },
    DeleteHidden: function(object, key){
      if (key in object.hiddens) {
        delete object.hiddens[key];
        return true;
      }
      return false;
    },
    HasHidden: function(object, key){
      return key in object.hiddens;
    },
    EnumerateHidden: function(object){
      return ownKeys(object.hiddens);
    },
    Type: function(o){
      if (o === null) {
        return 'Null';
      } else {
        switch (typeof o) {
          case UNDEFINED: return 'Undefined';
          case NUMBER:    return 'Number';
          case STRING:    return 'String';
          case BOOLEAN:   return 'Boolean';
          case OBJECT:    return 'Object';
        }
      }
    },
    Exception: function(type, args){
      return MakeException(type, toInternalArray(args));
    },
    Signal: function(name, value){
      if (isObject(value)) {
        if (value instanceof $Array) {
          value = toInternalArray(value);
        } else {
          throw new Error('NYI');
        }
      }
      realm.emit(name, value);
    },
    wrapDateMethods: function(target){
      wrapNatives(Date.prototype, target);
    },
    wrapStringMethods: function(target){
      wrapNatives(String.prototype, target);
    },
    wrapRegExpMethods: function(target){
      wrapNatives(RegExp.prototype, target);
    },
    // FUNCTION
    eval: function(code){
      if (typeof code !== 'string') {
        return code;
      }
      var script = new Script({
        natives: false,
        source: code,
        eval: true
      });
      if (script.error) {
        return script.error;
      } else if (script.thunk) {
        return script.thunk.run(context);
      }
    },
    CallFunction: function(func, receiver, args){
      return func.Call(receiver, toInternalArray(args));
    },

    BoundFunctionCreate: function(func, receiver, args){
      return new $BoundFunction(func, receiver, toInternalArray(args));
    },
    BooleanCreate: function(boolean){
      return new $Boolean(boolean);
    },
    DateCreate: function(args){
      return utility.applyNew(Date, args);
    },
    FunctionCreate: function(args){
      args = toInternalArray(args);
      var body = args.pop();
      var script = new Script({
        normal: true,
        natives: false,
        source: '(function anonymous('+args.join(', ')+') {\n'+body+'\n})'
      });
      if (script.error) {
        return script.error;
      }
      var ctx = new ExecutionContext(context, NewDeclarativeEnvironment(realm.globalEnv), realm, script.bytecode);
      ExecutionContext.push(ctx);
      var func = script.thunk.run(ctx);
      ExecutionContext.pop();
      return func;
    },
    NumberCreate: function(number){
      return new $Number(number);
    },
    ObjectCreate: function(proto){
      return new $Object(proto);
    },
    RegExpCreate: function(pattern, flags){
      if (typeof pattern === 'object') {
        pattern = pattern.PrimitiveValue;
      }
      try {
        var result = new RegExp(pattern, flags);
      } catch (e) {
        return ThrowException('invalid_regexp', [pattern+'']);
      }
      return new $RegExp(result);
    },
    StringCreate: function(string){
      return new $String(string);
    },

    DateToNumber: function(object){
      return +object.PrimitiveValue;
    },
    DateToString: function(object){
      return ''+object.PrimitiveValue;
    },
    FunctionToString: function(func){
      var code = func.Code;
      if (func.Native || !code) {
        return nativeCode[0] + func.properties.get('name') + nativeCode[1];
      } else {
        return code.source.slice(code.range[0], code.range[1]);
      }
    },
    NumberToString: function(object, radix){
      return object.PrimitiveValue.toString(radix);
    },
    RegExpToString: function(object, radix){
      return object.PrimitiveValue.toString(radix);
    },

    CodeUnit: function(char){
      return char.charCodeAt(0);
    },
    StringSlice: function(string, start, end){
      return string.slice(start, end);
    },
    StringReplace: function(string, search, replace){
      if (typeof search !== 'string') {
        search = search.PrimitiveValue;
      }
      return string.replace(search, replace);
    },
    FromCharCode: String.fromCharCode,
    GetExtensible: function(obj){
      return obj.GetExtensible();
    },
    SetExtensible: function(obj, value){
      obj.Extensible = value;
    },
    GetPrototype: function(obj){
      return obj.GetPrototype();
    },
    DefineOwnProperty: function(obj, key, desc){
      obj.DefineOwnProperty(key, ToPropertyDescriptor(desc), false);
    },
    Enumerate: function(obj, includePrototype, onlyEnumerable){
      return fromInternalArray(obj.Enumerate(includePrototype, onlyEnumerable));
    },
    GetProperty: function(obj, key){
      var desc = obj.GetProperty(key);
      if (desc) {
        return FromPropertyDescriptor(desc);
      }
    },
    GetOwnProperty: function(obj, key){
      var desc = obj.GetOwnProperty(key);
      if (desc) {
        return FromPropertyDescriptor(desc);
      }
    },
    GetPropertyAttributes: function(obj, key){
      return obj.properties.getAttribute(key);
    },
    HasOwnProperty: function(obj, key){
      return obj.HasOwnProperty(key);
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
    SetTimer: function(f, time, repeating){
      if (typeof f === 'string') {
        f = natives.FunctionCreate(f);
      }
      var id = Math.random() * 1000000 << 10;
      timers[id] = setTimeout(function trigger(){
        if (timers[id]) {
          f.Call(global, []);
          if (repeating) {
            timers[id] = setTimeout(trigger, time);
          } else {
            timers[id] = f = null;
          }
        } else {
          f = null;
        }
      }, time);
      return id;
    },
    ClearTimer: function(id){
      if (timers[id]) {
        timers[id] = null;
      }
    },
    Quote: (function(){
      var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          meta = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\' };

      function escaper(a) {
        var c = meta[a];
        return typeof c === 'string' ? c : '\\u'+('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }

      return function(string){
        escapable.lastIndex = 0;
        return '"'+string.replace(escapable, escaper)+'"';
      };
    })(),
    JSONCreate: function(){
      return new $JSON;
    },
    MathCreate: (function(Math){
      var consts = ['E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2'],
          sqrt = Math.sqrt,
          log = Math.log,
          pow = Math.pow,
          exp = Math.exp,
          LN2 = Math.LN2,
          LN10 = Math.LN10;


      function wrapMathFunction(fn, args){
        if (args === 0) {
          return fn;
        }
        if (args === 1) {
          return function(x){
            x = ToNumber(x);
            if (x && x.Completion) {
              if (x.Abrupt) {
                return x;
              } else {
                x = x.value;
              }
            }
            return fn(x);
          }
        } else if (args === 2) {
          return function(x, y){
            x = ToNumber(x);
            if (x && x.Completion) {
              if (x.Abrupt) {
                return x;
              } else {
                x = x.value;
              }
            }
            y = ToNumber(y);
            if (y && y.Completion) {
              if (y.Abrupt) {
                return y;
              } else {
                y = y.value;
              }
            }
            return fn(x, y);
          }
        } else {
          return function(){
            var values = [];
            for (var k in arguments) {
              var x = arguments[k]
              if (x && x.Completion) {
                if (x.Abrupt) {
                  return x;
                } else {
                  x = x.value;
                }
              }
              values.push(x);
            }
            return fn.apply(null, values);
          };
        }
      }

      var funcs = {
        abs: wrapMathFunction(Math.abs, 1),
        acos: wrapMathFunction(Math.acos, 1),
        acosh: wrapMathFunction(function(x){
          return Math.log(x + Math.sqrt(x * x - 1));
        }, 1),
        asinh: wrapMathFunction(function(x){
          return Math.log(x + Math.sqrt(x * x + 1));
        }, 1),
        asin: wrapMathFunction(Math.asin, 1),
        atan: wrapMathFunction(Math.atan, 1),
        atanh: wrapMathFunction(function(x) {
          return .5 * log((1 + x) / (1 - x));
        }, 1),
        atan2: wrapMathFunction(Math.atan2, 2),
        ceil: wrapMathFunction(Math.ceil, 1),
        cos: wrapMathFunction(Math.acos, 1),
        cosh: wrapMathFunction(function(x) {
          if (x < 0) {
            x = -x;
          }
          if (x > 21) {
            return exp(x) / 2;
          } else {
            return (exp(x) + exp(-x)) / 2;
          }
        }, 1),
        exp: wrapMathFunction(Math.exp, 1),
        expm1: wrapMathFunction(function(x) {
          function factorial(x){
            for (var i = 2, o = 1; i <= x; i++) {
              o *= i;
            }
            return o;
          }

          var o = 0, n = 50;
          for (var i = 1; i < n; i++) {
            o += pow(x, i) / factorial(i);
          }
          return o;
        }, 1),
        floor: wrapMathFunction(Math.floor, 1),
        hypot: wrapMathFunction(function(x, y) {
          return sqrt(x * x + y * y) || 0;
        }, 2),
        log: wrapMathFunction(Math.log, 1),
        log2: wrapMathFunction(function(x){
          return log(x) * (1 / LN2);
        }, 1),
        log10: wrapMathFunction(function(x){
          return log(x) * (1 / LN10);
        }, 1),
        log1p: wrapMathFunction(function(x){
          var o = 0,
              n = 50;

          if (x <= -1) {
            return -Infinity;
          } else if (x < 0 || value > 1) {
            return log(1 + x);
          } else {
            for (var i = 1; i < n; i++) {
              if ((i % 2) === 0) {
                o -= pow(x, i) / i;
              } else {
                o += pow(x, i) / i;
              }
            }
            return o;
          }
        }, 1),
        max: wrapMathFunction(Math.max),
        min: wrapMathFunction(Math.min),
        pow: wrapMathFunction(Math.pow, 2),
        random: wrapMathFunction(Math.random, 0),
        round: wrapMathFunction(Math.round, 1),
        sign: wrapMathFunction(function(x){
          x = +x;
          return x === 0 || x !== x ? x : x < 0 ? -1 : 1;
        }, 1),
        sinh: wrapMathFunction(function(x){
          return (exp(x) - exp(-x)) / 2;
        }, 1),
        sin: wrapMathFunction(Math.sin, 1),
        sqrt: wrapMathFunction(Math.sqrt, 1),
        tan: wrapMathFunction(Math.tan, 1),
        tanh: wrapMathFunction(function(x) {
          return (exp(x) - exp(-x)) / (exp(x) + exp(-x));
        }, 1),
        trunc: wrapMathFunction(function(x){
          return ~~x;
        }, 1)
      };

      return function(){
        var math = new $Math;
        for (var i=0; i < consts.length; i++) {
          defineDirect(math, consts[i], Math[consts[i]], ___);
        }
        for (var k in funcs) {
          defineDirect(math, k, new $NativeFunction({
            call: funcs[k],
            name: k,
            length: funcs[k].length
          }), _CW);
        }
        return math;
      };
    })(Math),

    MapInitialization: MapInitialization,
    MapSigil: function(){
      return MapData.sigil;
    },
    MapSize: function(map){
      return map.MapData.size;
    },
    MapClear: wrapMapFunction('clear'),
    MapSet: wrapMapFunction('set'),
    MapDelete: wrapMapFunction('remove'),
    MapGet: wrapMapFunction('get'),
    MapHas: wrapMapFunction('has'),
    MapNext: function(map, key){
      var result = map.MapData.after(key);
      return result instanceof Array ? fromInternalArray(result) : result;
    },

    WeakMapInitialization: WeakMapInitialization,
    WeakMapSet: wrapWeakMapFunction('set'),
    WeakMapDelete: wrapWeakMapFunction('remove'),
    WeakMapGet: wrapWeakMapFunction('get'),
    WeakMapHas: wrapWeakMapFunction('has')
  };

  function parse(src, origin, type, options){
    try {
      return esprima.parse(src, options || parse.options);
    } catch (e) {
      var err = new $Error('SyntaxError', undefined, e.message);
      err.setCode({ start: { line: e.lineNumber, column: e.column } }, src);
      err.setOrigin(origin, type);
      return new AbruptCompletion('throw', err);
    }
  }

  parse.options = {
    loc    : true,
    range  : true,
    raw    : false,
    tokens : false,
    comment: false
  }

  function Script(options){
    if (options instanceof Script)
      return options;

    this.type = 'script';

    if (typeof options === FUNCTION) {
      this.type = 'recompiled function';
      if (!utility.fname(options)) {
        options = {
          filename: 'unnamed',
          source: '('+options+')()'
        }
      } else {
        options = {
          filename: utility.fname(options),
          source: options+''
        };
      }
    } else if (typeof options === STRING) {
      options = {
        source: options
      };
    }

    if (options.natives) {
      this.natives = true;
      this.type = 'native';
    }
    if (options.eval) {
      this.eval = true;
      this.type = 'eval';
    }

    if (!isObject(options.ast) && typeof options.source === STRING) {
      this.source = options.source;
      this.ast = parse(options.source, options.filename, this.type);
      if (this.ast.Abrupt) {
        this.error = this.ast;
        this.ast = null;
      }
    }

    this.filename = options.filename || '';
    if (this.ast) {
      this.bytecode = assemble(this);
      this.thunk = new Thunk(this.bytecode);
    }
    return this;
  }

  function NativeScript(source, location){
    Script.call(this, {
      source: '(function(global, undefined){\n'+source+'\n})(this)',
      filename: location +'.js',
      natives: true
    });
  }

  inherit(NativeScript, Script);





  function initializeRealm(realm){
    if (realm.initialized) {
      return realm;
    }

    builtins || (builtins = require('../builtins'));
    activate(realm);
    realm.state = 'initializing';
    realm.initialized = true;
    realm.mutationScope = new ExecutionContext(null, realm.globalEnv, realm, new NativeScript('void 0', 'mutation scope'));

    for (var k in builtins) {
      var script = new NativeScript(builtins[k], k);
      if (script.error) {
        realm.emit(script.error.type, script.error);
      } else {
        realm.evaluate(script, false);
      }
    }

    deactivate(realm);
    realm.state = 'idle';
    return realm;
  }

  function prepareToRun(realm, bytecode){
    initializeRealm(realm);
    ExecutionContext.push(new ExecutionContext(null, realm.globalEnv, realm, bytecode));
    var status = TopLevelDeclarationInstantiation(bytecode);
    if (status && status.Abrupt) {
      realm.emit(status.type, status);
      return status;
    }
  }

  function run(realm, thunk){
    activate(realm);
    realm.executing = thunk;
    realm.state = 'executing';
    realm.emit('executing', thunk);

    var result = thunk.run(context);

    if (result === Pause) {
      var resume = function(){
        resume = function(){};
        delete realm.resume;
        realm.emit('resume');
        return run(realm, thunk);
      };

      realm.resume = function(){ return resume() };
      realm.state = 'paused';
      realm.emit('pause');
    } else {
      realm.executing = null;
      realm.state = 'idle';
      if (result && result.Abrupt) {
        realm.emit(result.type, result);
      } else {
        realm.emit('complete', result);
      }

      deactivate(realm);
      return result;
    }
  }


  function activate(target){
    if (realm !== target) {
      if (realm) {
        realm.active = false;
        realm.emit('deactivate');
      }
      realmStack.push(realm);
      realm = target;
      global = operators.global = target.global;
      intrinsics = target.intrinsics;
      target.active = true;
      target.emit('activate');
    }
  }

  function deactivate(target){
    if (realm === target && realmStack.length) {
      target.active = false;
      realm = realmStack.pop();
      target.emit('dectivate');
    }
  }

  function mutationContext(realm, toggle){
    if (toggle === undefined) {
      toggle = !realm.mutating;
    } else {
      toggle = !!toggle;
    }

    if (toggle !== this.mutating) {
      realm.mutating = toggle;
      if (toggle) {
        activate(realm);
        ExecutionContext.push(realm.mutationScope);
      } else {
        ExecutionContext.pop();
      }
    }
    return toggle;
  }

  var builtins,
      realms = [],
      realmStack = [],
      realm = null,
      global = null,
      context = null,
      intrinsics = null;

  function Realm(listener){
    Emitter.call(this);
    realms.push(this);
    this.active = false;
    this.scripts = [];
    this.natives = new Intrinsics(this);
    this.intrinsics = this.natives.bindings;
    this.global = new $Object(new $Object(this.intrinsics.ObjectProto));
    this.global.NativeBrand = BRANDS.GlobalObject;
    this.globalEnv = new GlobalEnvironmentRecord(this.global);

    this.intrinsics.FunctionProto.Realm = this;
    this.intrinsics.FunctionProto.Scope = this.globalEnv;
    this.intrinsics.ThrowTypeError = CreateThrowTypeError(this);
    hide(this.intrinsics.FunctionProto, 'Realm');
    hide(this.intrinsics.FunctionProto, 'Scope');
    hide(this.natives, 'realm');

    for (var k in atoms) {
      defineDirect(this.global, k, atoms[k], ___);
    }

    for (var k in natives) {
      this.natives.binding({ name: k, call: natives[k] });
    }


    this.state = 'idle';
    listener && this.on('*', listener);

    if (!realm) {
      activate(this);
    }
  }

  void function(){
    inherit(Realm, Emitter, [
      function enterMutationContext(){
        mutationContext(this, true);
      },
      function exitMutationContext(){
        mutationContext(this, false);
      },
      function evaluate(subject, quiet){
        activate(this);
        var script = new Script(subject);

        if (script.error) {
          this.emit(script.error.type, script.error);
          return script.error;
        }

        realm.quiet = !!quiet;
        this.scripts.push(script);
        return prepareToRun(this, script.bytecode) || run(this, script.thunk);
      }
    ]);
  }();



  exports.Realm = Realm;
  exports.Script = Script;
  exports.NativeScript = NativeScript;
  function activeRealm(){
    if (!realm && realms.length) {
      activate(realms[realms.length - 1]);
    }
    return realm;
  };
  exports.activeRealm = activeRealm;

  function activeContext(){
    return context;
  }
  exports.activeContext = activeContext;

  exports.builtins = {
    $Object: $Object
  };
  for (var k in $builtins) {
    exports.builtins['$'+k] = $builtins[k];
  }

  return exports;
})((0,eval)('this'), typeof module !== 'undefined' ? module.exports : {});
