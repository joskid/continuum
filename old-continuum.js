var Interpretor = (function(global){

  if (typeof require === 'function') {
    var esprima = require('esprima'),
        escodegen = require('escodegen'),
        errors = require('./errors');
  } else {
    var esprima = global.esprima,
        escodegen = global.escodegen;
  }

  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
      defineProperties = Object.defineProperties,
      defineProperty = Object.defineProperty,
      create = Object.create;

  var isPrototypeOf = Object.prototype.isPrototypeOf,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      slice = Array.prototype.slice;


  var constants = {
    NaN: { value: NaN },
    undefined: { value: undefined },
    Infinity: { value: Infinity }
  }

  var thunks   = new WeakMap,
      wrappers = new WeakMap,
      brands   = new WeakMap;

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
      WRITABLE     = 0x4;

  var E__ = 1,
      _C_ = 2,
      EC_ = 3,
      __W = 4,
      E_W = 5,
      _CW = 6,
      ECW = 7;

  var nextTick = typeof process !== UNDEFINED ? process.nextTick : function(f){ setTimeout(f, 1) };

  function noop(){}

  function isObject(v){
    return typeof v === OBJECT ? v !== null : typeof v === FUNCTION;
  }

  function throwAbstractInvocationError(name){
    throw new Error(name+' is abstract and no one should ever see this error.');
  }

  function parse(src){
    return esprima.parse(src, parse.options);
  }

  function decompile(ast){
    return escodegen.generate(ast, decompile.options);
  }

  parse.options = {
    loc    : false,
    range  : false,
    raw    : false,
    tokens : false,
    comment: false
  };

  decompile.options = {
    comment: false,
    allowUnparenthesizedNew: true,
    format: {
      indent: {
        style: '  ',
        base: 0,
        adjustMultilineComment: false
      },
      json             : false,
      renumber         : false,
      hexadecimal      : true,
      quotes           : 'single',
      escapeless       : true,
      compact          : false,
      parentheses      : true,
      semicolons       : true,
      safeConcatenation: true
    }
  };


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
  var stack = 0;

  function evaluate(node, Ω, ƒ){
    var next = Ω;
    Ω = function(result){
      Interpreter.current.emit(node, result);
      next(result);
    };
    if (stack++ > 100) {
      stack = 0;
      nextTick(function(){
        evaluate(node, Ω, ƒ);
      });
    } else if (node) {
      evaluaters[node.type](node, Ω, ƒ);
    } else {
      ƒ(Ω, new Thrown('invalid node'));
    }
  }

  function reference(node, Ω, ƒ){
    if (node.type === 'MemberExpression') {
      evaluate(node.object, function(object){
        var resolver = node.computed ? evaluate : toProperty;
        resolver(node.property, function(prop){
          Ω(new Reference(object, prop));
        }, ƒ)
      }, ƒ);
    } else if (node.type === 'Identifier') {
      Ω(context.reference(node.name));
    } else if (node.type === 'VariableDeclaration') {
      evaluate(node, function(){
        var decl = node.declarations[node.declarations.length - 1];
        if (decl.id)
          Ω(context.reference(decl.id.name));
      }, ƒ);
    }
  }

  function iterate(array, Ω, ƒ){
    var index = 0,
        stack = 0;

    var next = function(){
      if (stack++ > 100) {
        stack = 0;
        nextTick(next);
      } else if (index < array.length) {
        Ω(array[index++], next, ƒ);
      } else {
        next = function(){};
        ƒ(BREAK);
      }
    }
    next();
  }

  function throwException(name, args, Ω, ƒ){
    errors[name].apply(null, [function(e){
      ƒ(Ω, new Thrown(e));
    }].concat(args));
  }



  // ###################
  // ### Completions ###
  // ###################

  function Completion(name){
    this.name = name;
  }

  define(Completion.prototype, [
    function valueOf(){
      return '[object Completion]';
    },
    function toString(){
      return '[object Completion]';
    },
    function inspect(){
      return '[Completion: '+this.name+']';
    }
  ]);

  var CONTINUE = new Completion('continue'),
      BREAK    = new Completion('break'),
      PAUSE    = new Completion('pause'),
      RESUME   = new Completion('resume'),
      COMPLETE = new Completion('complete'),
      NORMAL   = new Completion('normal'),
      RETURN   = new Completion('return'),
      THROWN   = new Completion('thrown');


  function Thrown(value){
    this.value = value;
  }
  Thrown.prototype = THROWN;

  function Returned(value){
    this.value = value;
  }
  Returned.prototype = RETURN;


  // #################
  // ### Sentinels ###
  // #################

  function Sentinel(name){
    this.name = name;
  }

  define(Sentinel.prototype, [
    function toString(){
      return '[sentinel '+this.name+']';
    },
    function inspect(){
      return '[sentinel '+this.name+']';
    }
  ]);

  var UNINITIALIZED = new Sentinel('UNINITIALIZED'),
      EMPTY = new Sentinel('EMPTY');


  var descriptor = (function(){
    function Descriptor(enumerable, configurable){
      this.enumerable = !!enumerable;
      this.configurable = !!configurable;
    }

    function Accessor(get, set, enumerable, configurable){
      this.get = typeof get === FUNCTION ? get : undefined;
      this.set = typeof set === FUNCTION ? set : undefined;
      this.enumerable = !!enumerable;
      this.configurable = !!configurable;
    }

    Accessor.prototype = new Descriptor;

    function Value(value, writable, enumerable, configurable){
      this.value = value;
      this.writable = !!writable;
      this.enumerable = !!enumerable;
      this.configurable = !!configurable;
    }

    Value.prototype = new Descriptor;

    function NormalValue(value){ this.value = value }
    NormalValue.prototype = new Value(undefined, true, true, true);

    function ReadonlyValue(value){ this.value = value }
    ReadonlyValue.prototype = new Value(undefined, false, true, true);

    function NormalGetter(get){ this.get = get }
    NormalGetter.prototype = new Accessor(undefined, undefined, true, true);

    function NormalSetter(set){ this.set = set }
    NormalSetter.prototype = new Accessor(undefined, undefined, true, true);

    function LockedDescriptor(value){ this.value = value }
    LockedDescriptor.prototype = new Value(undefined, false, false, false);

    function LengthDescriptor(value){ this.value = value >>> 0 }
    LengthDescriptor.prototype = new Value(0, true, false, false);

    return function descriptor(type, a, b, c, d){
      switch (type) {
        case 'init': return new NormalValue(a);
        case 'get': return new NormalGetter(a);
        case 'set': return new NormalSetter(a);
        case 'value': return new Value(a, b, c, d);
        case 'accessor': return new Accessor(a, b, c, d);
        case 'readonly': return new ReadonlyValue(a);
        case 'frozen': return new Value(a, true, b, true);
        case 'hidden': return new Value(a, b, false, c);
        case 'length': return new LengthDescriptor(a);
        case 'locked': return new LockedDescriptor(a);
      }
    };
  }());

  descriptor.blank = descriptor('init');


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

    this.code = code;
    this.ast = ast;
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

  function Interpreter(listener){
    var self = this;
    Emitter.call(this);
    listener && this.on('*', listener);

    define(this, {
      scripts: [],
      realm: new Realm
    });

    this.global = this.realm.global;

    this.realm.on('pause', function(context){
      self.emit('pause', context);
    });
    this.realm.on('resume', function(context){
      self.emit('resume', context);
    });

    var count = Interpreter.intializers.length;
    Interpreter.intializers.forEach(function(script){
      this.run(script, function(complete){
        if (!--count)
          self.emit('ready');
      });
    }, this);
  }

  define(Interpreter, [
    function createInterpreter(origin){
      return new Interpreter(origin);
    },
    function registerInitializer(subject){
      Interpreter.intializers.push(new Script(subject));
    },
  ]);

  define(Interpreter, 'intializers', []);
  if (typeof __dirname === 'string')
    Interpreter.intializers[0] = new ScriptFile(__dirname + '/runtime.js');

  inherit(Interpreter, Emitter, [
    function pause(){
      this.context.pause();
      return this;
    },
    function resume(){
      this.context.resume();
      return this;
    },
    function run(subject, Ω){
      var self = this,
          script = this.executing = new Script(subject);

      this.scripts.push(script);

      function complete(result){
        Interpreter.current = null;
        self.executing = null;
        script.result = result;
        self.emit('complete', result);
        typeof Ω === FUNCTION && Ω(result);
      }

      function control(next, result){
        Interpreter.current = null;
        self.executing = null;
        if (result instanceof Thrown) {
          script.error = result.value;
          self.emit('exception', result.value);
        } else {
          script.result = result;
          self.emit('complete', result);
        }
        typeof Ω === FUNCTION && Ω(result);
      }

      Interpreter.current = this;
      evaluate(script.ast, this.realm, complete, control);
      return script;
    }
  ]);





  // #############
  // ### Thunk ###
  // #############

  function Thunk(){
    throwAbstractInvocationError('Thunk');
  }

  defineProperties(Thunk, {
    NORMAL_FUNCTION : { enumerable: true, value: 0 },
    BUILTIN_TYPE    : { enumerable: true, value: 1 },
    BUILTIN_FUNCTION: { enumerable: true, value: 2 },
    ARROW_FUNCTION  : { enumerable: true, value: 3 },
    BOUND_FUNCTION  : { enumerable: true, value: 4 }
  });

  define(Thunk.prototype, [
    function apply(args, Ω, ƒ){
      throwAbstractInvocationError('Thunk.prototype.apply');
    },
    function construct(args, Ω, ƒ){
      throwAbstractInvocationError('Thunk.prototype.construct');
    },
    function instantiate(context){
      throwAbstractInvocationError('Thunk.prototype.instantiate');
    }
  ]);

  // ########################
  // ### BuiltinTypeThunk ###
  // ########################

  function BuiltinTypeThunk(options){
    this.name      = options.name;
    this.apply     = options.apply || options.construct;
    this.construct = options.construct;
    this.methods   = options.methods || [];
    this.functions = options.functions || [];
    this.code = 'function ' + options.name + '(){ [native code] }';
  }

  inherit(BuiltinTypeThunk, Thunk, {
    type: Thunk.BUILTIN_TYPE,
    length: 1
  }, [
    function instantiate(realm){
      var Constructor = create(realm.intrinsics.FunctionPrototype, {
        name: { value: this.name },
        length: { value: 1 },
        prototype: {
          value: realm.intrinsics[this.name+'Prototype']
        }
      });

      define(Constructor.prototype, 'constructor', Constructor);
      brands.set(Constructor.prototype, this.name);


      // static functions that live on constructor
      this.functions.forEach(function(func){
        define(Constructor, func.name, func.instantiate(realm));
      });

      // methods that live on the prototype
      this.methods.forEach(function(method){
        define(Constructor.prototype, method.name, method.instantiate(realm));
      });

      thunks.set(Constructor, this);
      return Constructor;
    }
  ]);



  // ############################
  // ### BuiltinFunctionThunk ###
  // ############################

  function BuiltinFunctionThunk(options){
    this.name      = options.name;
    this.length    = options.length || 0;
    this.apply     = options.apply;
    this.construct = this.apply;
    this.code = 'function ' + options.name + '(){ [native code] }';
  }

  inherit(BuiltinFunctionThunk, Thunk, {
    type: Thunk.BUILTIN_FUNCTION
  }, [
    function instantiate(realm){
      var Func = create(realm.intrinsics.FunctionPrototype, {
        name: { value: this.name },
        length: { value: this.length }
      });
      thunks.set(Func, this);
      return Func;
    }
  ]);



  function applyReturnHandler(Ω, ƒ){
    return function(_, __, signal) {
      if (signal instanceof Returned)
        Ω(signal.value);
      else
        ƒ(_, __, signal);
    };
  }


  function constructReturnHandler(instance, Ω, ƒ){
    return function(_, __, signal) {
      if (signal instanceof Returned)
        Ω(isObject(signal.value) ? signal.value : instance);
      else
        ƒ(_, __, signal);
    };
  }


  // ################################
  // ### FunctionDeclarationThunk ###
  // ################################

  function FunctionDeclarationThunk(node){
    this.ast = node;
    this.name = node.id.name;
    this.body = node.body;
    this.length = node.params.length;
    // TODO handle params using CPS for rest and defaults and destructuring
    this.params = node.params.map(function(param){
      return param.name;
    });
  }


  inherit(FunctionDeclarationThunk, Thunk, {
    type: Thunk.NORMAL_FUNCTION
  }, [
    function apply(args, Ω, ƒ){
      context = new FunctionScope(context);
      context.declareArguments(this.params, args);
      evaluate(this.body, Ω, applyReturnHandler(Ω, ƒ));
    },
    function construct(args, Ω, ƒ){
      context = new FunctionScope(context);
      var instance = context.receiver = create(args.callee.prototype);
      context.declareArguments(this.params, args);
      console.log(context);
      evaluate(this.body, function(res){
        Ω(instance);
      }, constructReturnHandler(instance, Ω, ƒ));
    },
    function instantiate(realm){
      var func = create(realm.intrinsics.FunctionPrototype, {
        name: { value: this.name },
        length: { value: this.params.length },
        prototype: {
          writable: true,
          value: create(realm.intrinsics.ObjectPrototype, {
            constructor: {
              configurable: true,
              writable: true,
              value: func
            }
          })
        }
      });

      thunks.set(func, this);
      return func;
    }
  ]);


  function FunctionExpressionThunk(node){
    this.ast = node;
    this.name = node.id ? node.id.name : '';
    this.body = node.body;
    this.length = node.params.length;
    // TODO handle params using CPS for rest and defaults and destructuring
    this.params = node.params.map(function(param){
      return param.name;
    });
  }

  inherit(FunctionExpressionThunk, FunctionDeclarationThunk, [
    function apply(args, Ω, ƒ){
      context = new FunctionScope(context);
      context.declare('var', this.name, args.callee);
      context.declareArguments(this.params, args);
      evaluate(this.body, Ω, applyReturnHandler(Ω, ƒ));
    },
    function construct(args, Ω, ƒ){
      context = new FunctionScope(context);
      context.declare('var', this.name, args.callee);
      context.declareArguments(this.params, args);
      var instance = context.receiver = create(args.callee.prototype);
      evaluate(this.body, function(result){
        Ω(instance);
      }, constructReturnHandler(instance, Ω, ƒ));
    }
  ]);


  // ##################
  // ### ArrowThunk ###
  // ##################

  function ArrowFunctionThunk(node){
    this.ast = node;
    this.body = node.body;
    // TODO handle params using CPS for rest and defaults and destructuring
    this.length = node.params.length;
    this.params = node.params.map(function(param){
      return param.name;
    });
  }

  inherit(ArrowFunctionThunk, Thunk, {
    type: Thunk.ARROW_FUNCTION
  }, [
    function apply(args, Ω, ƒ){
      context = new FunctionScope(context);
      context.receiver = this.receiver;
      for (var i=0; i < this.params.length; i++)
        context.declare('var', this.params[i], args[i]);
      evaluate(this.body, Ω, ƒ);
    },
    function construct(args, Ω, ƒ){
      ƒ(Ω, context.error('TypeError', 'Arrow functions cannot be used as constructors'));
    },
    function instantiate(realm){
      var func = create(realm.intrinsics.FunctionPrototype, {
        length: { value: this.params.length }
      });

      var thunk = create(this);
      thunk.receiver = ExecutionContext.getThis();
      thunks.set(func, thunk);
      return func;
    }
  ]);


  // ##########################
  // ### BoundFunctionThunk ###
  // ##########################

  function BoundFunctionThunk(args){
    this.bound = args.thunk;
    this.receiver = args[0];
    this.args = args.slice(1);
  }

  inherit(BoundFunctionThunk, Thunk, {
    type: Thunk.BOUND_FUNCTION
  }, [
    function apply(args, Ω, ƒ){
      context.receiver = this.receiver;
      this.bound.apply(this.args.concat(args), Ω, ƒ);
    },
    function construct(args, Ω, ƒ){
      thunk.construct(this.args.concat(args), Ω, ƒ);
    },
    function instantiate(realm){
      var func = create(realm.intrinsics.FunctionPrototype, {
        length: { value: this.bound.length },
        name: { value: '' }
      });

      thunks.set(func, this);
      return func;
    }
  ]);



  function DefaultValue(args, Ω, ƒ){
    var subject = args[0];

    if (isObject(subject)) {
      var func = subject.toString || subject.valueOf;
      var thunk = func && thunks.get(func);
      if (thunk) {
        var args = [];
        args.callee = func;
        context.receiver = subject;
        thunk.apply(args, Ω, ƒ);
      } else {
        ƒ(Ω, context.error('TypeError', "Couldn't convert value to primitive type"));
      }
    } else {
      Ω(subject);
    }
  };


  function ToPrimitive(args, Ω, ƒ){
    var subject = args[0];
    switch (typeof subject) {
      case UNDEFINED:
      case STRING:
      case NUMBER:
      case BOOLEAN: Ω(subject); break;
      case OBJECT:
        if (subject === null){
          Ω(subject);
          break;
        }
      case FUNCTION:
        DefaultValue(args, Ω, ƒ);
    }
  }

  function ToBoolean(args, Ω, ƒ){
    Ω(args[0] ? true : false);
  }

  function ToNumber(args, Ω, ƒ){
    var subject = args[0];
    if (typeof subject === NUMBER)
      return Ω(subject);
    switch (subject) {
      case true: return Ω(1);
      case false:
      case null: return Ω(0);
      case undefined: return Ω(NaN);
    }
    if (typeof subject === STRING) {
      subject = subject.trim();
      switch (subject) {
        case '0': return Ω(0);
        case '-0': return Ω(-0);
        case 'Infinity': return Ω(Infinity);
        case '-Infinity': return Ω(-Infinity);
      }
      if (subject[0] === '0' && subject[1] === 'x' || subject[1] === 'X')
        return Ω(parseInt(subject, 16));
      if (~subject.indexOf('.'))
        return Ω(parseFloat(subject));
      return Ω(parseInt(subject, 10));
    }

    ToPrimitive(args, function(result){
      ToNumber([result], Ω, ƒ);
    }, ƒ);
  }


  function ToObject(args, Ω, ƒ) {
    switch (typeof args[0]) {
      case BOOLEAN_TYPE:    return BuiltinBoolean.construct(args, Ω, ƒ);
      case NUMBER_TYPE:     return BuiltinNumber.construct(args, Ω, ƒ);
      case STRING_TYPE:     return BuiltinString.construct(args, Ω, ƒ);
      case FUNCTION_TYPE:   return Ω(args[0]);
      case OBJECT_TYPE:
      if (args[0] !== null) return Ω(args[0]);
      default:              return BuiltinObject.construct(args, Ω, ƒ);
    }
  }

  function ToUint32(args, Ω, ƒ) {
    Ω(args[0] >> 0);
  }

  function ToInt32(args, Ω, ƒ) {
    Ω(args[0] >>> 0);
  }

  function ToString(args, Ω, ƒ) {
    switch (args[0]) {
      case undefined: return Ω(UNDEFINED);
      case null: return Ω('null');
      case true: return Ω('true');
      case false: return Ω('false');
    }

    if (typeof args[0] === STRING)
      Ω(args[0]);
    else
      DefaultValue(args, Ω, ƒ);
  }





  // #############
  // ### Scope ###
  // #############

  function Scope(parent){
    this.parent = parent;
    this.record = create(parent.record);
    this.receiver = parent.receiver;
    define(this, 'global', parent.global);
  }

  var types = {
    reference: 'ReferenceError',
    type: 'TypeError'
  };

  inherit(Scope, Interpreter, [
    function error(type, message){
      var err = create(this.global[type+'Prototype']);
      err.type = type;
      err.message = message;
      return new Thrown(err);
    },
    function nearest(type){
      var current = this;
      while (current) {
        if (current instanceof type)
          return current;
        current = current.parent;
      }
    },
    function declare(type, name, init){
      if (this.has(name)) {
        if (init !== undefined)
          this.record[name] = init;
      } else {
        this.record[name] = init;
      }
    },
    function strictDeclare(type, name, init){
      if (this.has(name))
        this.error('ReferenceError', 'Duplicate declaration for "'+name+'"');
      else
        this.record[name] = init;
    },
    function has(name){
      return hasOwnProperty.call(this.record, name);
    },
    function set(name, value){
      var scope = this;
      while (scope && !hasOwnProperty.call(scope.record, name))
        scope = scope.parent;
      scope || (scope = this.global);
      scope.record[name] = value;
    },
    function get(name){
      if (name in this.record)
        return this.record[name];
      else
        this.error('ReferenceError', 'Referenced undeclared identifier "'+name+'"');
    },
    function remove(name){
      if (this.has(name)) {
        return delete this.record[name];
      } else {
        return false;
      }
    },
    function reference(name){
      return new ScopeReference(this, name);
    },
    function child(ScopeType){
      return new ScopeType(this);
    },
    function create(Type, args){
      return builtins[Type].construct(this, args ? args : []);
    }
  ]);





  // #####################
  // ### FunctionScope ###
  // #####################

  function FunctionScope(parent){
    this.type = FUNCTION;
    Scope.call(this, parent);
  }

  inherit(FunctionScope, Scope, [
    function declareArguments(params, args){
      var arguments_ = create(this.global.ObjectPrototype);
      brands.set(arguments_, 'Arguments');

      for (var i=0; i < args.length; i++)
        arguments_[i] = args[i];


      defineProperty(arguments_, 'length', { value: i });
      defineProperty(arguments_, 'callee', { value: args.callee || null });
      this.declare('var', 'arguments', arguments_);

      // TODO: link arguments indices to variable bindings
      for (var i=0; i < params.length; i++)
        this.declare('var', params[i], args[i]);
    }
  ]);



  // ##################
  // ### ClassScope ###
  // ##################

  function ClassScope(parent){
    this.type = 'module';
    Scope.call(this, parent);
    //TODO super
  }

  inherit(ClassScope, Scope);



  // ##################
  // ### BlockScope ###
  // ##################

  function BlockScope(parent){
    this.type = 'block';
    Scope.call(this, parent);
  }

  inherit(BlockScope, Scope, [
    function declare(type, name, init){
      if (type === 'let') {
        if (!hasOwnProperty.call(this.record, name))
          this.record[name] = init;
        var scope = this;
      } else {
        var scope = this.nearest(FunctionScope) || this.global;
        scope.declare(type, name, init);
      }
    },
    function strictDeclare(type, name, init){
      if (type === 'let') {
        if (hasOwnProperty.call(this.record, name))
          return this.error('ReferenceError', 'Duplicate declaration for "'+name+'"');
        this.record[name] = init;
        var scope = this;
      } else {
        var scope = this.nearest(FunctionScope) || this.global;
        scope.strictDeclare(type, name, init);
      }
    },
  ]);


  // ##################
  // ### CatchScope ###
  // ##################

  function CatchScope(parent, name, value){
    this.type = 'catch';
    Scope.call(this, parent);
    this.declare('catch', name, value);
  }

  inherit(CatchScope, Scope);



  // ##################
  // ### WithScope ###
  // ##################

  function WithScope(parent, object){
    Scope.call(this, parent);
    this.object = object;
  }

  inherit(WithScope, Scope, [
    function declare(type, name, init){
      if (!(name in this.object) || init !== undefined)
        this.object[name] = init;
    },
    function set(name, value){
      this.object[name] = value;
    },
    function get(name){
      if (name in this.object)
        return this.object[name];
      else if (name in this.record)
        return this.record[name];
      else
        this.error('ReferenceError', 'Referenced undeclared identifier "'+name+'"');
    },
  ]);



  // ##########
  // ### ID ###
  // ##########

  function ID(name){
    this.name = name;
  }

  ID.prototype.type = 'Identifier';

  function template(r) {
    for (var i = 0, o = ''; r[i]; o += r[i].raw + (++i === r.length ? '' : arguments[i]));
    return o;
  }

  function toProperty(node, Ω, ƒ){
    if (node.type === 'Identifier')
      Ω(node.name);
    else if (node.type === 'Property' || node.type === 'Method')
      Ω(node.key.name);
    else if (node.type === 'Literal')
      Ω(node.value);
    else if (node.type === 'ExpressionStatement')
      toProperty(node.expression, Ω, ƒ);
  }


  // function isArrayIndex(args, Ω, ƒ) {
  //   if (typeof args[0] === STRING) {
  //     ToUint32(args, function(result){
  //       ToString([result], function(result){
  //         Ω(args[0] === result) && result !== MAX_UINT32 - 1
  //       }, ƒ);
  //     }, ƒ);
  //   } else {
  //     Ω(false);
  //   }
  // }



  // #####################
  // ### Builtin Types ###
  // #####################


  var BuiltinArray, BuiltinBoolean, BuiltinDate, BuiltinError, BuiltinFunction, BuiltinGlobals, BuiltinIterator,
      BuiltinObject, BuiltinMap, BuiltinNumber, BuiltinRegExp, BuiltinSet, BuiltinString, BuiltinWeakMap;

  var builtins = (function(builtins){

    function register(def){
      return builtins[def.name] = new BuiltinTypeThunk(def);
    }

    function api(name, apply){
      return new BuiltinFunctionThunk({ name: name, apply: apply });
    }

    function wrapBuiltin(name, builtin){
      return new BuiltinFunctionThunk({
        name: name,
        length: builtin.length,
        apply: function(args, Ω, ƒ){
          try {
            Ω(builtin.apply(context.receiver, args));
          } catch (e) {
            ƒ(Ω, context.error(e.name, e.message));
          }
        }
      });
    }

    function bridgeBuiltins(definition, target, names){
      var type = typeof target === FUNCTION ? 'functions' : 'methods';
      names.forEach(function(name){
        definition[type].push(wrapBuiltin(name, target[name]));
      });
    }


    function makeCollection(Ctor, methods){
      var collections = new WeakMap,
          prototype = Ctor.name + 'Prototype';

      var Builtin = register({
        name: Ctor.name,
        apply: function(args, Ω, ƒ){
          if (context.receiver === context.record)
            return Builtin.construct(args, Ω, ƒ);

          ToObject([context.receiver], function(target){
            if (collections.has(target)) {
              ƒ(Ω, context.error('TypeError', 'Object is already a '+Ctor.name));
            } else {
              collections.set(target, new Ctor);
              Ω(target);
            }
          }, ƒ);
        },
        construct: function(args, Ω, ƒ){
          var self = create(context.global[prototype]);
          collections.set(self, new Ctor);
          Ω(self);
        }
      });

      bridgeBuiltins(Builtin, Ctor.prototype, methods);

      return Builtin;
    }

    function makePrimitive(Ctor, methods){
      var prototype = Ctor.name + 'Prototype';

      var Builtin = register({
        name: Ctor.name,
        apply: function(args, Ω, ƒ){
          Ω(Ctor(args[0]));
        },
        construct: function(args, Ω, ƒ){
          var self = create(context.global[prototype]);
          wrappers.set(self, Ctor(args[0]));
          Ω(self);
        },
        methods: [
          api('toString', function(args, Ω, ƒ){
            var self = wrappers.get(context.receiver);
            if (self)
              Ω(''+self);
            else
              ƒ(Ω, context.error('TypeError', Ctor.name+'.prototype.toString is not generic'));
          }),
          api('valueOf', function(args, Ω, ƒ){
            var self = wrappers.get(context.receiver);
            if (self)
              Ω(Ctor(self));
            else
              ƒ(Ω, context.error('TypeError', Ctor.name+'.prototype.valueOf is not generic'));
          })
        ]
      });

      bridgeBuiltins(Builtin, Ctor.prototype, methods);
      return Builtin;
    }

    function wrapType(Ctor){
      var prototype = Ctor.name+'Prototype';

      var Builtin = register({
        name: Ctor.name,
        construct: function(args, Ω, ƒ){
          var self = create(context.global[prototype]);
          wrappers.set(self, Ctor.apply(null, args));
          Ω(self);
        }
      });

      Object.getOwnPropertyNames(Ctor.prototype).forEach(function(name){
        var builtin = Ctor.prototype[name];
        if (typeof builtin !== FUNCTION || builtin === Ctor) return;

        Builtin.methods.push(api(name, function(args, Ω, ƒ){
          if (isObject(context.receiver)){
            var unwrapped = wrappers.get(context.receiver);
          }

          if (unwrapped) {
            try {
              Ω(builtin.apply(unwrapped, args));
            } catch (e) {
              ƒ(Ω, context.error(e.name, e.message));
            }
          } else {
            ƒ(Ω, context.error('TypeError', name+' must be called on a '+Ctor.name+' object'));
          }
        }));
      });

      return Builtin;
    }

    function makeError(name){
      var prototype = name+'Prototype';
      var Builtin = register({
        name: name,
        construct: function(args, Ω, ƒ){
          ToString([args[0]], function(message){
            var self = create(context.global[prototype]);
            define(self, {
              message: message,
              type: undefined
            });
            Ω(self);
          }, ƒ);
        },
        apply: function(args, Ω, ƒ){
          if (context.receiver === context.global.record || !context.receiver) {
            Builtin.construct(args, Ω, ƒ);
          } else {
            ToObject([context.receiver], function(receiver){
              ToString(contexts, [args[0]], function(message){
                define(receiver, {
                  message: message,
                  type: undefined
                });
                Ω(receiver);
              }, ƒ);
            }, ƒ);
          }
        },
        methods: [
          api('toString', function(args, Ω, ƒ){
            ToString([args.receiver.type], function(type){
              ToString([args.receiver.message], function(message){
                Ω(type + ': ' + message);
              }, ƒ);
            }, ƒ);
          })
        ]
      });
      var protoProps = {
        type: { value: name }
      };
      Builtin.instantiate = function(context){
        var instance = BuiltinTypeThunk.prototype.instantiate.call(this, context);
        defineProperties(instance.prototype, protoProps);
        return instance;
      }
      return Builtin;
    }

    BuiltinArray = register({
      name: 'Array',
      construct: function(args, Ω, ƒ){
        var self = create(context.global.ArrayPrototype);
        if (args.length === 1 && typeof args[0] === NUMBER) {
          var len = args[0];
        } else {
          for (var i=0; i < args.length; i++)
            self[i] = args[i];
          var len = args.length;
        }
        defineProperty(self, 'length', descriptor('length', len));
        Ω(self);
      },
      functions: [
        api('isArray', function(args, Ω, ƒ){
          Ω(Object.getPrototypeOf(args[0]) === context.ArrayPrototype || Array.isArray(args[0]));
        })
      ]
    });

    bridgeBuiltins(BuiltinArray, Array.prototype, [
      'toString', 'pop', 'shift','unshift', 'lastIndexOf','push',
      'splice', 'reverse','slice', 'concat', 'join', 'indexOf'
    ]);

    BuiltinBoolean = makePrimitive(Boolean, []);


    BuiltinDate = wrapType(Date);
    bridgeBuiltins(BuiltinDate, Date, ['now']);

    BuiltinError = makeError('Error');
    makeError('EvalError');

    function thunkUnwrapper(name, handler){
      return api(name, function(args, Ω, ƒ){
        if (isObject(context.receiver))
          args.thunk = thunks.get(context.receiver);

        if (args.thunk) {
          handler(args, Ω, ƒ);
        } else {
          ƒ(Ω, context.error('TypeError', name+' must be called on a function'));
        }
      });
    }

    BuiltinFunction = register({
      name: 'Function',
      construct: function(args, Ω, ƒ){
        var body = args.length ? args.pop() : '';
        var src = '(function anonymous('+args.join(', ')+'){\n'+body+'\n})';
        try {
          var ast = parse(src),
              self = new FunctionExpressionThunk(ast.body[0].expression);
          Ω(self.instantiate(context.global));
        } catch (e) {
          ƒ(Ω, context.error(e.type, e.message));
        }
      },
      methods: [
        thunkUnwrapper('bind', function(args, Ω, ƒ){
          Ω(new BoundFunctionThunk(args).instantiate(context));
        }),
        thunkUnwrapper('call', function(args, Ω, ƒ){
          context.receiver = args[0];
          args.thunk.apply(args.slice(1), Ω, ƒ);
        }),
        thunkUnwrapper('apply', function(args, Ω, ƒ){
          var applied = [];

          for (var i=0; i < args[1].length; i++)
            applied[i] = args[1][i];

          context.receiver = args[0];
          args.thunk.apply(applied, Ω, ƒ);
        }),
        thunkUnwrapper('toString', function(args, Ω, ƒ){
          var thunk = args.thunk;

          if (!thunk.code) {
            if (thunk.ast) {
              thunk.code = decompile(thunk.ast);
            } else {
              return ƒ(Ω, new Thrown('No way to generate code for function'));
            }
          }

          Ω(thunk.code);
        })
      ]
    });

    BuiltinMap = makeCollection(Map, ['get', 'set', 'has', 'delete']);

    BuiltinNumber = makePrimitive(Number, ['toExponential', 'toFixed', 'toPrecision']);
    bridgeBuiltins(BuiltinNumber, Number, ['isFinite', 'isNaN']);

    BuiltinNumber.constants = {
      NaN: { value: NaN },
      MIN_VALUE: { value: Number.MIN_VALUE },
      MAX_VALUE: { value: Number.MAX_VALUE },
      NEGATIVE_INFINITY: { value: -Infinity },
      POSITIVE_INFINITY: { value: Infinity }
    };

    BuiltinNumber.instantiate = function(context){
      var instance = BuiltinTypeThunk.prototype.instantiate.call(this, context);
      return defineProperties(instance, BuiltinNumber.constants);
    };

    BuiltinObject = register({
      name: 'Object',
      apply: ToObject,
      construct: function(args, Ω, ƒ){
        Ω(create(context.global.ObjectPrototype));
      },
      functions: [
        api('is', function(args, Ω, ƒ){
          var o = args[0],
              p = args[1];
          Ω(o === p || (o === 0 && p === 0 && 1 / o === 1 / p) || (o !== o && p !== p))
        })
      ],
      methods: [
        api('valueOf', ToObject),
        api('toString', function(args, Ω, ƒ){
          var o = context.receiver;
          if (o === null) {
            Ω('[object Null]');
          } else if (o === undefined) {
            Ω('[object Undefined]');
          } else {
            ToObject([o], function(o){
              do {
                if (brands.has(o))
                  return Ω('[object '+brands.get(o)+']');
              } while (o = Object.getPrototypeOf(o))

              Ω('[object Object]');
            }, ƒ);
          }
        })
      ]
    });

    BuiltinIterator = register({
      name: 'Iterator',
      construct: function(args, Ω, ƒ){
        Ω(create(context.global.IteratorPrototype));
      },
      methods: [
        api('iterator', function(args, Ω, ƒ){
          Ω(context.receiver);
        })
      ]
    });

    bridgeBuiltins(BuiltinObject, Object, [
      'getOwnPropertyNames', 'getOwnPropertyDescriptor', 'defineProperty',
      'defineProperties', 'keys', 'getPrototypeOf', 'create', 'freeze',
      'isExtensible', 'isFrozen', 'isSealed', 'preventExtensions', 'seal'
    ]);

    // would prefer to not include these obsolete accessor thunks
    bridgeBuiltins(BuiltinObject, Object.prototype, [
      '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
      'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString'
    ]);

    makeError('RangeError');
    makeError('ReferenceError');

    BuiltinRegExp = wrapType(RegExp);

    BuiltinSet = makeCollection(Set, ['add', 'has', 'delete']);

    BuiltinString = makePrimitive(String, [
      'charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 'localeCompare', 'match',
      'replace', 'search', 'slice', 'split', 'substr', 'substring', 'toLocaleLowerCase',
      'toLocaleUpperCase', 'toLowerCase', 'toUpperCase', 'trim', 'trimLeft', 'trimRight'
    ]);
    // ['anchor', 'big', 'blink', 'bold', 'fixed', 'fontcolor', 'fontsize', 'italics',
    // 'link', 'small', 'strike', 'sub', 'sup']

    makeError('StopIteration');
    makeError('SyntaxError');
    makeError('TypeError');
    makeError('URIError');

    BuiltinWeakMap = makeCollection(WeakMap, ['get', 'set', 'has', 'delete']);

    BuiltinGlobals = [
      api('eval', function(args, Ω, ƒ){
        evaluaters.Program(parse(args[0]), Ω, ƒ);
      }),
      api('sleep', function(args, Ω, ƒ){
        ToNumber(args, function(time){
          setTimeout(Ω, time >> 0);
        }, ƒ);
      }),
      thunkUnwrapper('callcc', function(args, Ω, ƒ){
        var cc = new BuiltinFunctionThunk({
          name: 'continuation',
          length: 1,
          apply: function(c, args, _, __){
            Ω(args[0]);
          }
        });
        args = [cc.instantiate()];
        args.callee = func;
        args.thunk.apply(args, Ω, ƒ);
      }),
      api('log', function(args, Ω, ƒ){
        console.log.apply(console, args);
        Ω();
      })
    ];
    return builtins;
  }({}));




  function completeIfBreak(Ω, ƒ){
    return function(_, __, signal){
      if (signal === BREAK)
        Ω();
      else
        ƒ(_, __, signal);
    };
  }

  function applyMethod(obj, key, args, Ω, ƒ){
    if (isObject(obj[key]))
      var thunk = thunks.get(obj[key]);

    if (thunk) {
      args.callee = obj;
      thunk.apply(args, Ω, function(_, __, signal){
        if (signal instanceof Returned)
          Ω(signal.value);
        else
          ƒ(_, __, signal);
      });
    } else {
      ƒ(Ω, context.error('TypeError', (typeof obj[key]) + ' is not a function'));
    }
  }

  function cc(Ω, c){
    return function(v){ c(v, Ω) };
  }

  function SEQUENCE(funcs){
    var index = 0;
    funcs[index](function next(v){
      if (++index === funcs.length - 2)
        next = funcs[index + 1];
      funcs[index](v, next);
    });
  }

  function isStopIteration(signal){
    if (signal instanceof Thrown) {
      if (context.StopIteration === signal.value)
        return true;
      if (isPrototypeOf.call(context.StopIterationPrototype, signal.value))
        return true;
    }
    return false;
  }

  var evaluaters = {
    ArrayExpression: function(node, Ω, ƒ){
      var output = [];

      iterate(node.elements, function(item, next){
        if (!item) {
          output.push(item);
          next();
        } else if (item.type === 'Literal') {
          output.push(item.value);
          next();
        } else {
          evaluate(node.elements[i], function(value){
            output.push(value);
            next();
          }, ƒ);
        }
      }, function(){
        BuiltinArray.construct(output, Ω, ƒ);
      });
    },
    ArrayPattern: function(node, Ω, ƒ){},
    ArrowFunctionExpression: function(node, Ω, ƒ){
      node.thunk || (node.thunk = new ArrowFunctionThunk(node));
      Ω(node.thunk.instantiate(context));
    },
    AssignmentExpression: function(node, Ω, ƒ){
      reference(node.left, function(ref){
        evaluate(node.right, function(value){
          if (node.operator === '=') {
            ref.set(value);
            Ω(value);
          } else {
            ToPrimitive(ref.get(), function(left){
              ToPrimitive(value, function(value){
                switch (node.operator) {
                  case '*=':   value = left * value; break;
                  case '/=':   value = left / value; break;
                  case '%=':   value = left % value; break;
                  case '+=':   value = left + value; break;
                  case '-=':   value = left - value; break;
                  case '<<=':  value = left << value; break;
                  case '>>=':  value = left >> value; break;
                  case '>>>=': value = left >>> value; break;
                  case '&=':   value = left & value; break;
                  case '^=':   value = left ^ value; break;
                  case '|=':   value = left | value; break;
                }
                ref.set(value);
                Ω(value);
              }, ƒ);
            }, ƒ);
          }
        }, ƒ);
      }, ƒ);
    },
    BinaryExpression: function(node, Ω, ƒ){
      evaluate(node.left, function(left){
        evaluate(node.right, function(right){
          if (node.operator === 'instanceof') {
            if (isObject(right) && thunks.has(right)) {
              Ω(isPrototypeOf.call(right.prototype, left));
            } else {
              ƒ(Ω, context.error('TypeError', "'instanceof' called on non-function"));
            }
          } else if (node.operator === 'in') {
            if (isObject(right)) {
              ToString(left, function(left){
                Ω(left in right);
              }, ƒ);
            } else {
              ƒ(Ω, context.error('TypeError', "'in' called on non-object"));
            }
          } else {
            ToPrimitive(left, function(left){
              ToPrimitive(right, function(right){
                switch (node.operator) {
                  case '*':   Ω(left * right); break;
                  case '/':   Ω(left / right); break;
                  case '%':   Ω(left % right); break;
                  case '+':   Ω(left + right); break;
                  case '-':   Ω(left - right); break;
                  case '<<':  Ω(left << right); break;
                  case '>>':  Ω(left >> right); break;
                  case '>>>': Ω(left >>> right); break;
                  case '&':   Ω(left & right); break;
                  case '^':   Ω(left ^ right); break;
                  case '|':   Ω(left | right); break;
                  case '===': Ω(left === right); break;
                  case '==':  Ω(left == right); break;
                  case '>':   Ω(left > right); break;
                  case '<':   Ω(left < right); break;
                  case '!==': Ω(left !== right); break;
                  case '!=':  Ω(left != right); break;
                  case '>=':  Ω(left >= right); break;
                  case '<=':  Ω(left <= right); break;
                }
              }, ƒ);
            }, ƒ);
          }
        }, ƒ);
      }, ƒ);
    },
    BlockStatement: function(node, Ω, ƒ){
      var completion;
      context = context.child(BlockScope);
      iterate(node.body, function(node, next){
        evaluate(node, function(value){
          completion = value;
          next();
        }, ƒ);
      }, function(){
        Ω(completion);
      });
    },
    BreakStatement: function(node, Ω, ƒ){
      if (node.label === null)
        ƒ(Ω, BREAK);
    },
    CallExpression: function(node, Ω, ƒ){
      var args = [];

      iterate(node.arguments, function(node, next){
        evaluate(node, function(value){
          args.push(value);
          next();
        }, ƒ);
      }, function(){
        evaluate(node.callee, function(callee){
          if (isObject(callee))
            var thunk = thunks.get(callee);

          if (thunk) {
            args.callee = callee;
            thunk.apply(args, Ω, function(_, signal){
              if (signal instanceof Returned)
                Ω(signal.value);
              else if (signal instanceof Thrown)
                ƒ(_, signal);
              else
                Ω();
            });
          } else {
            ƒ(Ω, context.error('TypeError', (typeof callee) + ' is not a function'));
          }
        }, ƒ);
      });
    },
    CatchClause: function(node, Ω, ƒ){
      evaluate(node.body, Ω, ƒ);
    },
    ClassBody: function(node, Ω, ƒ){
      var descs = {};

      iterate(node.body, function(property, next){
        evaluate(property, function(desc){
          var key = property.key.name;
          if (key in descs)
            descs[key][property.kind] = desc[property.kind];
          else
            descs[key] = desc;
          next();
        }, ƒ);
      }, function(){
        var Class = descs.constructor.value;
        if (context.superClass)
          Class.prototype = create(context.superClass.prototype);
        defineProperties(Class.prototype, descs);
        Ω(Class);
      });
    },
    ClassDeclaration: function(node, Ω, ƒ){
      context = context.child(ClassScope);
      context.className = node.id.name;

      if (node.superClass)
        context.superClass = context.get(node.superClass.name);

      evaluate(node.body, function(Class){
        context.parent.declare('class', context.className, Class);
        Ω(Class);
      }, ƒ);
    },
    ClassExpression: function(node, Ω, ƒ){
      context = context.child(ClassScope);
      context.className = node.id ? node.id.name : '';

      if (node.superClass)
        context.superClass = context.get(node.superClass.name);

      evaluate(node.body, Ω, ƒ);
    },
    ClassHeritage: function(node, context){},
    ConditionalExpression: function(node, Ω, ƒ){
      evaluate(node.test, function(result){
        evaluate(result ? node.consequent : node.alternate, Ω, ƒ);
      }, ƒ);
    },
    ContinueStatement: function(node, Ω, ƒ){
      ƒ(Ω, CONTINUE);
    },
    DebuggerStatement: function(node, Ω, ƒ){
      context.global.pause(Ω, ƒ);
    },
    DoWhileStatement: function(node, Ω, ƒ){
      void function loop(i){
        evaluate(node.body, function(){
          evaluate(node.test, function(test){
            test ? i > 100 ? nextTick(loop) : loop((i || 0) + 1) : Ω();
          });
        }, function(Ω, signal){
          if (signal === CONTINUE)
            i > 100 ? nextTick(loop) : loop((i || 0) + 1);
          else if (signal === BREAK)
            Ω();
          else
            ƒ(Ω, signal);
        });
      }();
    },
    EmptyStatement: function(node, Ω, ƒ){
      Ω();
    },
    ExportDeclaration: function(node, Ω, ƒ){
      var decl = node.declaration;
      evaluate(node.declaration, function(decls){
        context.exports || (context.exports = {});
        if (node.declaration.declarations) {
          for (var k in decls) {
            context.exports[k] = decls[k];
          }
        } else {
          context.exports[node.declaration.id.name] = decls;
        }

        Ω(decls);
      }, ƒ);
    },
    ExportSpecifier: function(node, Ω, ƒ){},
    ExportSpecifierSet: function(node, Ω, ƒ){},
    ExpressionStatement: function(node, Ω, ƒ){
      evaluate(node.expression, Ω, ƒ);
    },
    ForInStatement: function(node, Ω, ƒ){
      reference(node.left, function(left){
        evaluate(node.right, function(right){
          var keys = [],
              len = 0,
              i = 0;

          for (keys[len++] in right);

          void function loop(){
            if (i >= len) return Ω();
            if (i++ > 100) {
              i = 0;
              return nextTick(loop);
            }
            left.set(keys[i++]);
            evaluate(node.body, loop, function(_, __, signal){
              if (signal === CONTINUE)
                loop();
              else if (signal === BREAK)
                Ω();
              else
                ƒ(_, __, signal);
            });
          }();
        });
      });
    },
    ForOfStatement: function(node, Ω, ƒ){
      reference(node.left, function(left){
        evaluate(node.right, function(right){
          applyMethod(right, 'iterator', [], function(iterator){
            var i = 0;
            void function loop(){
              if (i++ > 100) {
                i = 0;
                return nextTick(loop);
              }
              applyMethod(iterator, 'next', [], function(result){
                left.set(result);

                evaluate(node.body, loop, function(_, __, signal){
                  if (signal === CONTINUE)
                    loop();
                  else if (signal === BREAK)
                    Ω();
                  else
                    ƒ(_, __, signal);
                });
              }, function(_, __, signal){
                isStopIteration(signal) ? Ω() : ƒ(_, __, signal);
              });
            }();
          }, ƒ);
        });
      });
    },
    ForStatement: function(node, Ω, ƒ){
      evaluate(node.init, function(init){
        var i = 0;

        function update(){
          evaluate(node.update, function(){
            if (i++ > 100) {
              i = 0;
              nextTick(loop);
            } else {
              loop();
            }
          }, ƒ);
        }

        function loop(){
          evaluate(node.test, function(test){
            if (!test) return Ω();
            evaluate(node.body, update, function(Ω, signal){
              if (signal === CONTINUE)
                update();
              else if (signal === BREAK)
                Ω();
              else
                ƒ(Ω, signal);
            });
          }, ƒ);
        }

        loop();
      }, ƒ);
    },
    FunctionDeclaration: function(node, Ω, ƒ){
      node.thunk || (node.thunk = new FunctionDeclarationThunk(node));

      var env = context.variable,
          name = node.id.name,
          instance = node.thunk.instantiate(context);

      SEQUENCE([
        function(Ω){
          if (!env.hasBinding(name)) {
            env.createVarBinding(name, context.isStrict);
            env.initBinding(name);
            Ω();
          } else if (env === context.global) {
            var global = env.record;
            SEQUENCE([
              function(Ω){
                global.getOwnProperty(name, Ω, ƒ);
              },
              function(desc){
                if (desc.configurable)
                  global.defineOwnProperty(descriptor.blank, true, Ω, ƒ);
                else if (type === ACCESSOR || attrs === MISSING)
                  throwException('redeclaration', [], Ω, ƒ);
              }
            ]);
          } else {
            Ω();
          }
        },
        function(_, Ω){
          env.setBinding(name, instance, context.isStrict);
          Ω();
        },
        Ω
      ]);
    },
    FunctionExpression: function(node, Ω, ƒ){
      node.thunk || (node.thunk = new FunctionExpressionThunk(node));
      Ω(node.thunk.instantiate(context));
    },
    Glob: function(node, Ω, ƒ){},
    Identifier: function(node, Ω, ƒ){
      Ω(context.get(node.name));
    },
    IfStatement: function(node, Ω, ƒ){
      evaluate(node.test, function(result){
        var target = !!result ? node.consequent : node.alternate;
        target ? evaluate(target, Ω, ƒ) : Ω();
      }, ƒ);
    },
    ImportDeclaration: function(node, Ω, ƒ){},
    ImportSpecifier: function(node, Ω, ƒ){},
    LabeledStatement: function(node, Ω, ƒ){},
    Literal: function(node, Ω, ƒ){
      if (node.value instanceof RegExp)
        BuiltinRegExp.construct([node.value.source], Ω, ƒ);
      else
        Ω(node.value);
    },
    LogicalExpression: function(node, Ω, ƒ){
      evaluate(node.left, function(left){
        evaluate(node.right, function(right){
          node.operator === '&&' ? Ω(left && right) : Ω(left || right);
        }, ƒ);
      }, ƒ);
    },
    MemberExpression: function(node, Ω, ƒ){
      evaluate(node.object, function(object){
        var resolver = node.computed ? evaluate : toProperty;
        resolver(node.property, function(key){
          context.receiver = object;
          Ω(object[key]);
        }, ƒ)
      }, ƒ);
    },
    MethodDefinition: function(node, Ω, ƒ){
      var name = node.key.name === 'constructor' ? context.className : node.key.name;

      if (node.kind === 'get' || node.kind === 'set') {
        node.value.id = new ID(node.kind+'_'+name);
        evaluate(node.value, function(accessor){
          Ω(descriptor(node.kind, accessor));
        }, ƒ);
      } else {
        node.value.id = new ID(name);
        evaluate(node.value, function(method){
          Ω(descriptor('init', method));
        }, ƒ);
      }
    },
    ModuleDeclaration: function(node, Ω, ƒ){},
    NewExpression: function(node, Ω, ƒ){
      var args = [];

      iterate(node.arguments, function(node, next){
        evaluate(node, function(value){
          args.push(value);
          next();
        }, ƒ);
      }, function(){
        evaluate(node.callee, function(callee){
          if (isObject(callee))
            var thunk = thunks.get(callee);

          if (thunk) {
            args.callee = callee;
            thunk.construct(args, Ω, ƒ);
          } else {
            ƒ(Ω, context.error('TypeError', (typeof callee) + ' is not a function'));
          }
        }, ƒ);
      });
    },
    ObjectExpression: function(node, Ω, ƒ){
      var properties = {};

      iterate(node.properties, function(property, next){
        toProperty(property.key, function(key){
          evaluate(property.value, function(value){
            if (properties[key])
              properties[key][property.kind] = value;
            else
              properties[key] = descriptor(property.kind, value);

            next();
          }, ƒ);
        }, ƒ);
      }, function(){
        BuiltinObject.construct([], function(object){
          Ω(defineProperties(object, properties));
        }, ƒ);
      });
    },
    ObjectPattern: function(node, Ω, ƒ){},
    Path: function(node, Ω, ƒ){},
    Program: function(node, Ω, ƒ){
      var completion;

      nextTick(function(){
        SEQUENCE([
          function(Ω){
            iterate(node.body, function(node, Ω){
              if (node.type === 'FunctionDeclaration')
                evaluate(node, Ω, ƒ);
            }, Ω);
          },
          function(_, Ω){
            iterate(node.body, function(node, Ω){
              if (node.type === 'VariableDeclaration')
                evaluate(node, Ω, ƒ);
            }, Ω);
          },
        ]);
      });

      return context;
    },
    Property: function(node, Ω, ƒ){
      evaluate(node.value, Ω, ƒ);
    },
    ReturnStatement: function(node, Ω, ƒ){
      evaluate(node.argument, function(result){
        ƒ(Ω, new Returned(result));
      }, ƒ);
    },
    SequenceExpression: function(node, Ω, ƒ){
      var completion;

      iterate(node.expressions, function(node, next){
        evaluate(node, function(value){
          completion = value;
          next();
        }, ƒ);
      }, function(){
        Ω(completion);
      });
    },
    // SwitchCase: function(node, Ω, ƒ){
    //   evaluate(node.test, function(test){
    //     if (test !== context.discriminant && test !== null) return Ω();
    //     var completion;
    //     iterate(node.consequent, function(node, next){
    //       evaluate(node, function(value){
    //         completion = value;
    //         next();
    //       }, ƒ);
    //     }, function(){
    //       Ω(completion);
    //     });
    //   });
    // },
    SwitchStatement: function(node, Ω, ƒ){
      evaluate(node.discriminant, function(discriminant){
        var executing;
        var control = completeIfBreak(Ω, ƒ);
        iterate(node.cases, function(node, next){
          if (executing) {
            evaluate(node.consequent, next, control);
          } else {
            evaluate(node.test, function(test){
              if (test === discriminant) {
                executing = true;
                evaluate(node.consequent, next, control);
              }
            }, ƒ);
          }
        }, function(){
          if (executing) return Ω();

          iterate(node.cases, function(node, next){
            if (node.test === null)
              executing = true;

            if (executing)
              evaluate(node.consequent, next, control);
            else
              next();
          }, Ω)
        });
      });
    },
    TaggedTemplateExpression: function(node, Ω, ƒ){
      node.quasi.tagged = context.get(node.tag.name);
      evaluate(node.quasi, Ω, ƒ);
    },
    TemplateElement: function(node, Ω, ƒ){
      Ω(node.value);
    },
    TemplateLiteral: function(node, Ω, ƒ){
      if (!node.converted) {
        node.converted = [];
        iterate(node.expressions, function(element, next){
          evaluate(element, function(result){
            node.converted.push(Object.freeze(result));
            next();
          }, ƒ);
        }, function(){
          Object.freeze(node.converted)
          finish();
        });
      } else {
        finish();
      }

      function finish(){
        var args = [node.converted];
        iterate(node.expressions, function(node, next){
          evaluate(node, function(result){
            args.push(result);
            next();
          }, ƒ);
        }, function(){
          Ω(template.apply(null, args));
        });
      }
    },
    ThisExpression: function(node, Ω, ƒ){
      Ω(context.receiver);
    },
    ThrowStatement: function(node, Ω, ƒ){
      evaluate(node.argument, function(argument){
        ƒ(Ω, new Thrown(argument));
      }, ƒ);
    },
    TryStatement: function(node, Ω, ƒ){
      evaluate(node.block, Ω, function(_, __, signal){
        if (signal instanceof Thrown) {
          iterate(node.handlers, function(node, next){
            var catchContext = new CatchScope(node.param.name, signal.value);
            evaluate(node, catchContext, next, ƒ);
          }, function(){
            node.finalizer ? evaluate(node.finalizer, Ω, ƒ) : Ω();
          });
        } else {
          ƒ(_, __, signal);
        }
      });
    },
    UnaryExpression: function(node, Ω, ƒ){
      if (node.operator === 'delete') {
        reference(node.argument, function(ref){
          Ω(ref.remove());
        }, ƒ);
      } else {
        evaluate(node.argument, function(value){
          if (node.operator === 'typeof') {
            if (value === null) return Ω(OBJECT);

            var type = typeof value;
            Ω(type === OBJECT && thunks.has(value) ? FUNCTION : type);

          } else if (node.operator === 'void') {
            Ω(void 0);

          } else if (node.operator === '!') {
            Ω(!value);

          } else {
            ToPrimitive([value], function(value){
              switch (node.operator) {
                case '~': Ω(~value); break;
                case '+': Ω(+value); break;
                case '-': Ω(-value); break;
              }
            }, ƒ);
          }
        });
      }
    },
    UpdateExpression: function(node, Ω, ƒ){
      reference(node.argument, function(ref){
        ToPrimitive([ref.get()], function(val){
          var newval = node.operator === '++' ? val + 1 : val - 1;
          ref.set(newval);
          Ω(node.prefix ? newval : val);
        }, ƒ);
      }, ƒ);
    },
    VariableDeclaration: function(node, Ω, ƒ){
      var out = {};

      iterate(node.declarations, function(node, Ω){
        evaluate(node, function(result){
          out[node.id.name] = result;
          next();
        }, ƒ);
      }, function(){
        Ω(out);
      });
    },
    VariableDeclarator: function(node, Ω, ƒ){
      function declare(result){
        if (node.id.type === 'Identifier')
          context.declare(node.kind, node.id.name, result);
        Ω(result);
      }

      var env = context.variable;
      if (node.id.type === 'Identifier') {
        var name = node.id.name;
        if (!env.hasBinding()) {
          env.createBinding(name, ƒ)
        }
      }

      if (node.init)
        evaluate(node.init, declare, ƒ);
      else
        declare();
    },
    WhileStatement: function(node, Ω, ƒ){
      void function loop(i){
        evaluate(node.test, function(test){
          if (!test) return Ω();
          evaluate(node.body, function(){
            i > 100 ? nextTick(loop) : loop((i || 0) + 1);
          }, function(_, __, signal){
            if (signal === CONTINUE)
              i > 100 ? nextTick(loop) : loop((i || 0) + 1);
            else if (signal === BREAK)
              Ω();
            else
              ƒ(_, __, signal);
          });
        }, ƒ);
      }();
    },
    WithStatement: function(node, Ω, ƒ){
      evaluate(node.object, function(object){
        context = new WithScope(object);
        evaluate(node.body, Ω, ƒ)
      }, ƒ);
    },
    YieldExpression: function(node, Ω, ƒ){},
  };

  if (typeof module === 'object')
    module.exports = Interpreter;
  else if (typeof exports === 'object')
    exports.Interpreter = Interpreter;

  var x = new Realm;
  x.globalEnv.record.getBinding('Object', console.log);
  return Interpreter
})((0,eval)('this'));


