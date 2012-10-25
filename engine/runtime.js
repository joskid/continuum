var runtime = (function(GLOBAL, exports, undefined){
  var errors    = require('./errors'),
      utility   = require('./utility'),
      compile   = require('./bytecode').compile,
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
      unique           = utility.unique,
      decompile        = utility.decompile,
      parse            = utility.parse;


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
      ToUint32         = operators.ToUint32,
      ToString         = operators.ToString,
      UnaryOp          = operators.UnaryOp,
      BinaryOp         = operators.BinaryOp,
      ToPropertyKey    = operators.ToPropertyKey,
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

  var slice = [].slice;

  var BINARYOPS = constants.BINARYOPS.array,
      UNARYOPS  = constants.UNARYOPS.array,
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

  AbruptCompletion.prototype.Abrupt = SYMBOLS.Abrupt
  Completion.prototype.Completion   = SYMBOLS.Completion


  var LexicalScope          = 'Lexical',
      StrictScope           = 'Strict',
      GlobalScope           = 'Global';

  var GlobalCode            = 'Global',
      EvalCode              = 'Eval',
      FuntionCode           = 'Function';


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
    if (obj.Completion) {
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
        if (v.Completion) {
          if (v.Abrupt) {
            return v;
          } else {
            v = v.value;
          }
        }
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
    if (desc.Completion) { if (desc.Abrupt) return desc; else desc = desc.value; }

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


  // ## MakeConstructor

  function MakeConstructor(func, writable, prototype){
    var install = prototype === undefined;
    if (install) {
      prototype = new $Object;
    }
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

    var func = func.Get(key);
    if (func && func.Completion) {
      if (func.Abrupt) {
        return func;
      } else {
        func = func.value;
      }
    }

    if (!IsCallable(func))
      return ThrowException('called_non_callable', key);

    return func.Call(receiver, args);
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

  // ## IsPropertyReference

  function IsPropertyReference(v){
    var type = typeof v.base;
    return type === STRING
        || type === NUMBER
        || type === BOOLEAN
        || v.base instanceof $Object;
  }

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

  // ## CreateStrictArgumentsObject

  function CreateStrictArgumentsObject(args) {
    var obj = new $Arguments(args.length);
    for (var i=0; i < args.length; i++) {
      defineDirect(obj, i+'', args[i], ECW);
    }

    defineDirect(obj, 'arguments', intrinsics.ThrowTypeError, __A);
    defineDirect(obj, 'caller', intrinsics.ThrowTypeError, __A);
    return obj;
  }


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
        if (status && status.Abrupt) {
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
      var ao = env.arguments = CreateMappedArgumentsObject(names, env, args, func)
      status = ArgumentBindingInitialization(params, ao);
    }

    if (status && status.Completion) {
      if (status.Abrupt) {
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


  // ## ClassDefinitionEvaluation

  function ClassDefinitionEvaluation(name, superclass, constructor, methods){
    if (superclass === undefined) {
      var superproto = intrinsics.ObjectPrototype,
          superctor = intrinsics.FunctionPrototype;
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
        superctor = intrinsics.FunctionPrototype;
      } else if (typeof superclass !== 'object') {
        return ThrowException('non_object_superclass');
      } else if (!('Construct' in superclass)) {
        superproto = superclass;
        superctor = intrinsics.FunctionPrototype;
      } else {
        superproto = superclass.Get('prototype');
        if (superproto && superproto.Completion) {
          if (superproto.Abrupt) {
            return superproto;
          } else {
            superproto = superproto.value;
          }
        }

        if (typeof superproto !== 'object' && superproto !== null) {
          return ThrowException('non_object_superproto');
        }
        superctor = superclass;
      }
    }
    var proto = new $Object(superproto),
        lex = context.LexicalEnvironment;

    if (name) {
      var scope = NewDeclarativeEnvironment(lex);
      scope.CreateImmutableBinding(name.name ? name.name : name);
      context.LexicalEnvironment = scope;
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
    setDirect(ctor, 'name', name ? name.name || name : '');
    MakeConstructor(ctor, false, proto);
    defineDirect(proto, 'constructor', ctor, _CW);

    for (var i=0, method; method = methods[i]; i++) {
      PropertyDefinitionEvaluation(method.kind, proto, method.name, method.code);
    }

    context.LexicalEnvironment = lex;
    var _name = name.name ? name.name : name;
    context.LexicalEnvironment.CreateMutableBinding(_name);
    context.LexicalEnvironment.InitializeBinding(_name, ctor);
    return ctor;
  }

  // ## InstantiateFunctionDeclaration

  function InstantiateFunctionDeclaration(decl){
    var code = decl.Code;
    var func = new $Function(NORMAL, decl.BoundNames[0], code.params, code, context.LexicalEnvironment, code.Strict);
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

  // ## NewMethodEnvironment

  function NewMethodEnvironment(method, receiver){
    var lex = new MethodEnvironmentRecord(receiver, method.Home, method.MethodName);
    lex.outer = method.Scope;
    return lex;
  }



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

  define(Reference.prototype, {
    Reference: SYMBOLS.Reference
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
    function GetSuperBase(){},
    function childScope(){
      var lex = new DeclarativeEnvironmentRecord;
      lex.outer = this;
      return lex;
    },
    function reference(name, strict){
      return new Reference(this, name, false);
    }
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

  var GlobalObject      = new NativeBrand('global'),
      NativeArguments   = new NativeBrand('Arguments'),
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
      StringWrapper     = new NativeBrand('String'),
      NativeError       = new NativeBrand('Error'),
      NativeMath        = new NativeBrand('Math'),
      NativeJSON        = new NativeBrand('JSON');


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
      var desc = this.GetOwnProperty(key);
      if (!desc) {
        var proto = this.GetPrototype();
        if (proto) {
          return proto.GetP(receiver, key);
        }
      } else if (IsAccessorDescriptor(desc)) {
        var getter = desc.Get;
        if (IsCallable(getter)) {
          return getter.Call(receiver, []);
        }
      } else {
        return desc.Value;
      }
    },
    function SetP(receiver, key, value) {
      var desc = this.GetOwnProperty(key);
      if (desc) {
        if (IsAccessorDescriptor(desc)) {
          var setter = desc.Set;
          if (IsCallable(setter)) {
            setter.Call(receiver, [value]);
            return true;
          } else {
            return false;
          }
        } else if (desc.Writable) {
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
          WRITABLE in desc || (desc.Writable = current.Writable);
          if ('Value' in desc)
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

    if (kind === NORMAL && strict) {
      defineDirect(this, 'arguments', intrinsics.ThrowTypeError, __A);
      defineDirect(this, 'caller', intrinsics.ThrowTypeError, __A);
    } else {
      defineDirect(this, 'arguments', null, ___);
      defineDirect(this, 'caller', null, ___);
    }

    defineDirect(this, 'length', params.ExpectedArgumentCount, ___);

    if (typeof name === 'string' && kind !== ARROW) {
      defineDirect(this, 'name', name, ___);
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
      if (realm !== this.Realm) {
        this.Realm.activate();
        this.Realm.prepareContext(null);
      } else if (!context) {
        this.Realm.prepareContext(null);
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
        var local = NewMethodEnvironment(this, receiver);
      }

      var caller = context.callee || null;

      ExecutionContext.push(new ExecutionContext(context, local, this.Realm, this.Code, this, isConstruct));
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
      return result && result.type === Return ? result.Value : result;
    },
    function Construct(args){
      var prototype = this.Get('prototype');
      if (prototype.Completion) {
        if (prototype.Abrupt) {
          return prototype;
        } else {
          prototype = prototype.value;
        }
      }
      var instance = typeof prototype === OBJECT ? new $Object(prototype) : new $Object;
      instance.ConstructorName = this.properties.name;
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
        instance.ConstructorName = this.properties.name;
        return this.construct.apply(instance, args);
      } else {
        return this.call.apply(undefined, args);
      }
    }
  ]);

  function $BoundFunction(target, boundThis, boundArgs){
    $Object.call(this, intrinsics.FunctionProto);
    this.TargetFunction = target;
    this.BoundThis = boundThis;
    this.BoundArgs = boundArgs;
    defineDirect(this, 'arguments', intrinsics.ThrowTypeError, __A);
    defineDirect(this, 'caller', intrinsics.ThrowTypeError, __A);
    defineDirect(this, 'length', getDirect(target, 'length'));
  }

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
      if (key < this.PrimitiveValue.length && key > 0 || key === '0') {
        return new StringIndice(this.PrimitiveValue[key]);
      }
    },
    HasOwnProperty: function HasOwnProperty(key){
      key = ToString(key);
      if (key && key.Completion) {
        if (key.Abrupt) {
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
    Enumerate: function Enumerate(){
      var props = this.keys.filter(function(key){
        return this.attributes[key] & E;
      }, this);

      var proto = this.GetPrototype();
      if (proto) {
        props.add(proto.Enumerate());
      }

      return unique(numbers(this.PrimitiveValue.length).concat(props.toArray()));
    },
    GetOwnPropertyNames: function GetOwnPropertyNames(){
      return unique(numbers(this.PrimitiveValue.length).concat(this.keys.toArray()));
    },
    GetPropertyNames: function GetPropertyNames(){
      var props = this.keys.clone();

      var proto = this.GetPrototype();
      if (proto) {
        props.add(proto.GetPropertyNames());
      }

      return unique(numbers(this.PrimitiveValue.length).concat(props.toArray()));
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

  function $Math(){
    $Object.call(this);
  }

  inherit($Math, $Object, {
    NativeBrand: NativeMath
  });

  function $JSON(){
    $Object.call(this);
  }

  inherit($JSON, $Object, {
    NativeBrand: NativeJSON
  });

  function $Error(name, type, message){
    $Object.call(this, intrinsics[name+'Proto']);
    defineDirect(this, 'message', message, _CW);
    if (type !== undefined) {
      defineDirect(this, 'type', type, _CW);
    }
  }

  inherit($Error, $Object, {
    NativeBrand: NativeError
  });



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

  function ProxyCall(receiver, args){}
  function ProxyConstruct(args){}




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

  define(ExecutionContext.prototype, [
    function initializeBindings(pattern, value, lexical){
      return BindingInitialization(pattern, value, lexical ? this.LexicalEnvironment : undefined);
    },
    function pushBlock(code){
      var env = this.LexicalEnvironment = this.LexicalEnvironment.childScope();
      return BlockDeclarationInstantiation(code, env);
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
    function createFunction(code, name){
      var env = this.LexicalEnvironment.childScope();
      name && env.CreateImmutableBinding(name);
      env.func = new $Function(code.Type, name, code.params, code, env, code.Strict);
      name && env.InitializeBinding(name, env.func);
      MakeConstructor(env.func);
      return env.func;
    },
    function createArray(len){
      return new $Array(len);
    },
    function createObject(){
      return new $Object;
    },
    function createRegExo(v){
      return new $RegExp(v);
    },
    function popBlock(){
      this.LexicalEnvironment = this.LexicalEnvironment.outer;
    },
    function Element(prop, base){
      var result = CheckObjectCoercible(base);
      if (result.Abrupt) {
        return result;
      }

      var name = ToString(prop);
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
        var key = ToPropertyKey(prop);
        if (key && key.Completion) {
          if (key.Abrupt) {
            return key;
          } else {
            return key.value;
          }
        }
      }

      var ref = new Reference(baseValue, key, context.Strict);
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
    function IdentifierResolution(name) {
      return GetIdentifierReference(this.LexicalEnvironment, name, this.strict);
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
    function EvaluateCall(ref, func, args) {
      if (typeof func !== OBJECT || !IsCallable(func)) {
        return ThrowException('called_non_callable', func);
      }

      if (ref instanceof Reference) {
        var receiver = IsPropertyReference(ref) ? GetThisValue(ref) : ref.base.WithBaseObject();
      }

      return func.Call(receiver, args);
    }
  ]);


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
    Proxy   : $Proxy,
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

  var nativeCode = ['function ', '() { [native code] }'];

  var natives = {
    callFunction: function(func, receiver, args){
      return func.Call(receiver, toInternalArray(args))
    },
    isConstructCall: function(){
      return context.isConstruct;
    },
    getNativeBrand: function(object){
      return object.NativeBrand.name;
    },
    markAsNative: function(fn){
      fn.Native = true;
      hide(fn, 'Native');
    },
    exception: function(type, args){
      return MakeException(type, toInternalArray(args));
    },
    getPrimitiveValue: function(object){
      return object ? object.PrimitiveValue : undefined;
    },
    write: function(text, color){
      if (color === undefined) {
        color = 'white';
      }
      realm.emit('write', text, color);
    },
    clear: function(){
      realm.emit('clear');
    },
    backspace: function(count){
      realm.emit('backspace', count);
    },
    wrapDateMethods: function(target){
      Object.getOwnPropertyNames(Date.prototype).forEach(function(key){
        if (typeof Date.prototype[key] === 'function' && key !== 'constructor' && key !== 'toString' && key !== 'valueOf') {
          var func = new $NativeFunction({
            name: key,
            length: Date.prototype[key].length,
            call: function(a, b, c){
              return this.PrimitiveValue[key](a, b, c);
            }
          })
          defineDirect(target, key, func, 6);
        }
      });
    },
    wrapStringMethods: function(target){
      Object.getOwnPropertyNames(String.prototype).forEach(function(key){
        if (typeof String.prototype[key] === 'function' && key !== 'constructor' && key !== 'toString' && key !== 'valueOf') {
          var func = new $NativeFunction({
            name: key,
            length: String.prototype[key].length,
            call: function(a, b, c){
              return this.PrimitiveValue[key](a, b, c);
            }
          })
          defineDirect(target, key, func, 6);
        }
      });
    },
    defineDirect: defineDirect,
    deleteDirect: deleteDirect,
    hasOwnDirect: hasOwnDirect,
    hasDirect: hasDirect,
    setDirect: setDirect,
    ToObject: ToObject,
    ToString: ToString,
    ToNumber: ToNumber,
    ToBoolean: ToBoolean,
    ToInteger: ToInteger,
    ToInt32: ToInt32,
    ToUint32: ToUint32,
    // FUNCTION
    eval: function(code){
      if (typeof code !== 'string') {
        return code;
      }
      var code = compile(code, { natives: false, eval: true });
      return new Thunk(code).run(context);
    },
    FunctionCreate: function(args){
      args = toInternalArray(args);
      var body = args.pop();
      body = '(function anonymous('+args.join(', ')+') {\n'+body+'\n})';
      var code = compile(body, { natives: false, eval: true });
      ExecutionContext.push(new ExecutionContext(null, NewDeclarativeEnvironment(realm.globalEnv), realm, code));
      return new Thunk(code).run(realm.globalEnv);
    },
    // FUNCTION PROTOTYPE
    functionToString: function(fn){
      if (fn.Native || !fn.Code) {
        return nativeCode[0] + fn.properties.name + nativeCode[1];
      } else {
        var code = fn.Code;
        return code.source.slice(code.range[0], code.range[1]);
      }
    },
    call: function(receiver){
      return this.Call(receiver, slice.call(arguments, 1));
    },
    apply: function(receiver, args){
      return this.Call(receiver, toInternalArray(args));
    },
    bind: function(receiver){
      return new $BoundFunction(this, receiver, slice.call(arguments, 1));
    },

    // BOOLEAN
    BooleanCreate: function(boolean){
      return new $Boolean(boolean);
    },

    // DATE
    DateCreate: function(date){
      return new $Date(date === undefined ? new Date : date);
    },
    dateToString: function(object){
      return ''+object.PrimitiveValue;
    },
    dateToNumber: function(object){
      return +object.PrimitiveValue;
    },

    // NUMBER
    NumberCreate: function(number){
      return new $Number(number);
    },
    numberToString: function(object, radix){
      return object.PrimitiveValue.toString(radix);
    },

    // STRING
    StringCreate: function(string){
      return new $String(string);
    },
    // STRING PROTOTYPE
    charCode: function(char){
      return char.charCodeAt(0);
    },
    replace: function(match, replacer){
      if (typeof match === 'string') {
        return this.PrimitiveValue.replace(match, replacer);
      } else if (match instanceof $RegExp) {
        match = match.PrimitiveValue;
        return this.PrimitiveValue.replace(match.PrimitiveValue, replacer);
      }
    },
    RegExpCreate: function(regexp){
      return new $RegExp(regexp);
    },
    // REGEXP PROTOTYPE
    test: function(str){
      return this.PrimitiveValue.test(str);
    },

    // OBJECT
    defineProperty: function(obj, key, desc){
      if (typeof obj !== OBJECT) {
        return ThrowException('called_on_non_object', 'defineProperty')
      }
      if (typeof desc !==OBJECT) {
        return ThrowException('property_desc_object')
      }
      desc = ToPropertyDescriptor(desc);
      obj.DefineOwnProperty(key, desc, false);
      return obj;
    },
    defineProperties: function(obj, descs){
      if (typeof obj !== OBJECT) {
        return ThrowException('called_on_non_object', 'defineProperties');
      }
      if (typeof desc !== OBJECT) {
        return ThrowException('property_desc_object')
      }
      if (descs !== undefined) {
        if (typeof desc !==OBJECT) {
          return ThrowException('property_desc_object')
        }
        var keys = toInternalArray(descs.Enumerate());
        for (var i=0; i < keys.length; i++) {
          natives.defineProperty(obj, keys[i], descs.Get(keys[i]));
        }
      }
    },
    create: function(proto, descs){
      if (typeof proto !== OBJECT) {
        return ThrowException('proto_object_or_null')
      }
      var obj = new $Object(proto);
      if (descs !== undefined) {
        natives.defineProperties(obj, descs);
      }
      return obj;
    },
    getPrototypeOf: function(obj){
      if (typeof desc !== OBJECT) {
        return ThrowException('called_on_non_object', 'getPrototypeOf');
      }
      return obj.GetPrototype();
    },
    getPropertyNames: function(object){
      return fromInternalArray(object.GetPropertyNames());
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
    getPropertyDescriptor: function(object, key){
      var desc = object.GetProperty(key);
      if (desc) {
        return FromPropertyDescriptor(desc);
      }
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
    isExtensible: function(object){
      return object.GetExtensible();
    },

    // OBJECT PROTOTYPE
    objectToString: function(object){
      return object.NativeBrand.brand;
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
    JSONCreate: function(){
      var json = new $JSON;
      defineDirect(json, 'stringify', new $NativeFunction({
        call: function(){},
        name: 'stringify',
        length: 3
      }), _CW);
      defineDirect(json, 'parse', new $NativeFunction({
        call: function(){},
        name: 'parse',
        length: 2
      }), _CW);
      return json;
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
    })(Math)
  };




  function Realm(){
    this.natives = new Intrinsics(this);
    this.intrinsics = this.natives.bindings;
    this.global = new $Object(new $Object(this.intrinsics.ObjectProto));
    this.global.NativeBrand = GlobalObject;
    this.globalEnv = new GlobalEnvironmentRecord(this.global);

    this.intrinsics.FunctionProto.Realm = this;
    this.intrinsics.FunctionProto.Scope = this.globalEnv;
    this.intrinsics.ThrowTypeError = CreateThrowTypeError(this);

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
        global = operators.global = this.global;
        intrinsics = this.intrinsics;
        this.active = true;
        this.emit('activate');
      }
    },
    function prepareContext(code){
      ExecutionContext.push(new ExecutionContext(null, this.globalEnv, this, code));
    }
  ]);


  function Script(ast, code, name, native){
    if (ast instanceof Script)
      return ast;

    if (typeof ast === FUNCTION) {
      this.type = 'recompiled function';
      if (!utility.fname(ast)) {
        name || (name = 'unnamed');
        code = '('+ast+')()';
      } else {
        name || (name = utility.fname(ast));
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

    this.code = compile(code, { natives: !!native });
    this.thunk = new Thunk(this.code);
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

  function NativeScript(source, location){
    Script.call(this, null, source, location, true);
  }

  inherit(NativeScript, ScriptFile);



  // ###################
  // ### Interpreter ###
  // ###################

  var builtins;

  function Continuum(listener){
    var self = this;
    Emitter.call(this);
    listener && this.on('*', listener);

    define(this, {
      scripts: [],
      realm: new Realm
    });

    this.state = 'idle';
    if (!builtins) {
      builtins = require('../builtins');
    }
    for (var k in builtins) {
      this.eval(new NativeScript(builtins[k], k+'.js'), true);
    }
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
      var result = thunk.run(context);
      if (result === Pause) {
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
    function eval(subject, quiet){
      var script = new Script(subject),
          self = this;

      this.scripts.push(script);
      if (!quiet) {
        script.thunk.log();
        script.thunk.on('op', function(op){
          self.emit('op', op);
        });
      }
      ExecutionContext.push(new ExecutionContext(null, this.realm.globalEnv, this.realm, script.code));
      TopLevelDeclarationInstantiation(script.code);
      return this.run(script.thunk);
    }
  ]);

  exports.Continuum = Continuum;
  return exports;
})((0,eval)('this'), typeof module !== 'undefined' ? module.exports : {});