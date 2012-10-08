var Interpretor = (function(global){

  if (typeof require === 'function') {
    var esprima = require('esprima'),
        escodegen = require('escodegen');
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



  var thunks   = new WeakMap,
      wrappers = new WeakMap,
      brands   = new WeakMap;

  var TYPE_BOOLEAN    = 'boolean',
      TYPE_FUNCTION   = 'function',
      TYPE_NUMBER     = 'number',
      TYPE_OBJECT     = 'object',
      TYPE_STRING     = 'string',
      TYPE_UNDEFINED  = 'undefined';




  var nextTick = typeof process !== TYPE_UNDEFINED ? process.nextTick : function(f){ setTimeout(f, 1) };

  function noop(){}

  function isObject(v){
    return typeof v === TYPE_OBJECT ? v !== null : typeof v === TYPE_FUNCTION;
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
      case TYPE_STRING:
        return defineProperty(o, p, { configurable: true, writable: true, value: v });
      case TYPE_FUNCTION:
        return defineProperty(o, p.name, { configurable: true, writable: true, value: p });
      case TYPE_OBJECT:
        if (p instanceof Array) {
          for (var i=0; i < p.length; i++) {
            var f = p[i];
            if (typeof f === TYPE_FUNCTION && f.name) {
              var name = f.name;
            } else if (typeof f === TYPE_STRING && typeof p[i+1] !== TYPE_FUNCTION || !p[i+1].name) {
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


  function Emitter(){
    '_events' in this || define(this, '_events', create(null));
  }

  define(Emitter.prototype, [
    function on(events, handler){
      events.split(/\s+/).forEach(function(event){
        if (!(event in this))
          this[event] = [];
        this[event].push(handler);
      }, this._events);
    },
    function off(events, handler){
      events.split(/\s+/).forEach(function(event){
        if (event in this) {
          var index = '__index' in handler ? handler.__index : this[event].indexOf(handler);
          if (~index)
            this[event].splice(index, 1)
        }
      }, this._events);
    },
    function once(events, handler){
      this.on(events, function once(){
        this.off(events, once);
        handler.apply(this, arguments);
      });
    },
    function emit(event){
      if (this._events['*']) {
        var handlers = this._events['*'];
        for (var i=0; i < handlers.length; i++)
          handlers[i].apply(this, arguments);
      }

      if (this._events[event]) {
        var args = slice.call(arguments, 1),
            handlers = this._events[event];
        for (var i=0; i < handlers.length; i++)
          handlers[i].apply(this, args);
      }
    }
  ]);



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
      this.get = typeof get === TYPE_FUNCTION ? get : undefined;
      this.set = typeof set === TYPE_FUNCTION ? set : undefined;
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


  function Script(ast, code, name){
    if (ast instanceof Script)
      return ast;

    if (typeof ast === TYPE_FUNCTION) {
      this.type = 'recompiled function';
      if (!ast.name) {
        name || (name = 'unnamed');
        code = '('+ast+')()';
      } else {
        name || (name = ast.name);
        code = ast+'';
      }
      ast = null
    } else if (typeof ast === TYPE_STRING) {
      code = ast;
      ast = null;
    }

    if (!isObject(ast) && typeof code === TYPE_STRING) {
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

  function Interpreter(){
    var self = this;
    Emitter.call(this);

    define(this, {
      scripts: [],
      context: new GlobalScope
    });

    this.global = this.context.record;

    this.context.on('pause', function(context){
      self.emit('pause', context);
    });
    this.context.on('resume', function(context){
      self.emit('resume', context);
    });

    Interpreter.intializers.forEach(this.execute, this);
  }

  define(Interpreter, [
    function createInterpreter(origin){
      return new Interpreter(origin);
    },
    function registerInitializer(subject){
      Interpreter.intializers.push(new Script(subject));
    },
  ]);

  if (typeof __dirname === 'string')
    Interpreter.intializers = [new ScriptFile(__dirname + '/runtime.js')];

  inherit(Interpreter, Emitter, [
    function pause(){
      this.context.pause();
      return this;
    },
    function resume(){
      this.context.resume();
      return this;
    },
    function execute(subject, Ω){
      var self = this;
          script = this.executing = new Script(subject);

      this.scripts.push(script);

      function complete(result){
        self.executing = null;
        script.result = result;
        self.emit('complete', result);
        typeof Ω === TYPE_FUNCTION && Ω(result);
      }

      function control(context, next, result){
        self.executing = null;
        if (result instanceof Thrown) {
          script.error = result.value;
          self.emit('exception', result.value);
        } else {
          script.result = result;
          self.emit('complete', result);
        }
        typeof Ω === TYPE_FUNCTION && Ω(result);
      }

      evaluate(script.ast, this.context, complete, control);
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
    function apply(context, args, Ω, ƒ){
      throwAbstractInvocationError('Thunk.prototype.apply');
    },
    function construct(context, args, Ω, ƒ){
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
    function instantiate(context){
      var Constructor = create(context.global.FunctionPrototype, {
        name: { value: this.name },
        length: { value: 1 },
        prototype: {
          value: context.global[this.name+'Prototype']
        }
      });

      define(Constructor.prototype, 'constructor', Constructor);
      brands.set(Constructor.prototype, this.name);


      // static functions that live on constructor
      this.functions.forEach(function(func){
        define(Constructor, func.name, func.instantiate(context));
      });

      // methods that live on the prototype
      this.methods.forEach(function(method){
        define(Constructor.prototype, method.name, method.instantiate(context));
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
    function instantiate(context){
      var Func = create(context.global.FunctionPrototype, {
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
    function apply(context, args, Ω, ƒ){
      context = new FunctionScope(context);
      context.declareArguments(this.params, args);
      evaluate(this.body, context, Ω, applyReturnHandler(Ω, ƒ));
    },
    function construct(context, args, Ω, ƒ){
      context = new FunctionScope(context);
      var instance = context.receiver = create(args.callee.prototype);
      context.declareArguments(this.params, args);
      evaluate(this.body, context, function(){
        Ω(instance);
      }, constructReturnHandler(instance, Ω, ƒ));
    },
    function instantiate(context){
      var func = create(context.global.FunctionPrototype, {
        name: { value: this.name },
        length: { value: this.params.length },
        prototype: {
          writable: true,
          value: create(context.global.ObjectPrototype, {
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
    function apply(context, args, Ω, ƒ){
      context = new FunctionScope(context);
      context.declare('var', this.name, args.callee);
      context.declareArguments(this.params, args);
      evaluate(this.body, context, Ω, applyReturnHandler(Ω, ƒ));
    },
    function construct(context, args, Ω, ƒ){
      context = new FunctionScope(context);
      context.declare('var', this.name, args.callee);
      var instance = context.receiver = create(args.callee.prototype);
      context.declareArguments(this.params, args);
      evaluate(this.body, context, function(result){
        Ω();
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
    function apply(context, args, Ω, ƒ){
      context = new FunctionScope(context);
      context.receiver = this.receiver;
      for (var i=0; i < this.params.length; i++)
        context.declare('var', this.params[i], args[i]);
      evaluate(this.body, context, Ω, ƒ);
    },
    function construct(context, args, Ω, ƒ){
      ƒ(context, Ω, context.error('TypeError', 'Arrow functions cannot be used as constructors'));
    },
    function instantiate(context){
      var func = create(context.global.FunctionPrototype, {
        length: { value: this.params.length }
      });

      var thunk = create(this);
      thunk.receiver = context.receiver;
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
    function apply(context, args, Ω, ƒ){
      context.receiver = this.receiver;
      this.bound.apply(context, this.args.concat(args), Ω, ƒ);
    },
    function construct(context, args, Ω, ƒ){
      thunk.construct(context, this.args.concat(args), Ω, ƒ);
    },
    function instantiate(context){
      var func = create(context.global.FunctionPrototype, {
        length: { value: this.bound.length },
        name: { value: '' }
      });

      thunks.set(func, this);
      return func;
    }
  ]);



  function DefaultValue(context, args, Ω, ƒ){
    var subject = args[0];

    if (isObject(subject)) {
      var func = subject.toString || subject.valueOf;
      var thunk = func && thunks.get(func);
      if (thunk) {
        var args = [];
        args.callee = func;
        context.receiver = subject;
        thunk.apply(context, args, Ω, ƒ);
      } else {
        ƒ(context, Ω, context.error('TypeError', "Couldn't convert value to primitive type"));
      }
    } else {
      Ω(subject);
    }
  };


  function ToPrimitive(context, args, Ω, ƒ){
    var subject = args[0];
    switch (typeof subject) {
      case TYPE_UNDEFINED:
      case TYPE_STRING:
      case TYPE_NUMBER:
      case TYPE_BOOLEAN: Ω(subject); break;
      case TYPE_OBJECT:
        if (subject === null){
          Ω(subject);
          break;
        }
      case TYPE_FUNCTION:
        DefaultValue(context, args, Ω, ƒ);
    }
  }

  function ToBoolean(context, args, Ω, ƒ){
    Ω(args[0] ? true : false);
  }

  function ToNumber(context, args, Ω, ƒ){
    var subject = args[0];
    if (typeof subject === TYPE_NUMBER)
      return Ω(subject);
    switch (subject) {
      case true: return Ω(1);
      case false:
      case null: return Ω(0);
      case undefined: return Ω(NaN);
    }
    if (typeof subject === TYPE_STRING) {
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

    ToPrimitive(context, args, function(result){
      ToNumber(context, [result], Ω, ƒ);
    }, ƒ);
  }


  function ToObject(context, args, Ω, ƒ) {
    switch (typeof args[0]) {
      case BOOLEAN_TYPE:    return BuiltinBoolean.construct(context, args, Ω, ƒ);
      case NUMBER_TYPE:     return BuiltinNumber.construct(context, args, Ω, ƒ);
      case STRING_TYPE:     return BuiltinString.construct(context, args, Ω, ƒ);
      case FUNCTION_TYPE:   return Ω(args[0]);
      case OBJECT_TYPE:
      if (args[0] !== null) return Ω(args[0]);
      default:              return BuiltinObject.construct(context, args, Ω, ƒ);
    }
  }

  function ToUint32(context, args, Ω, ƒ) {
    Ω(args[0] >> 0);
  }

  function ToInt32(context, args, Ω, ƒ) {
    Ω(args[0] >>> 0);
  }

  function ToString(context, args, Ω, ƒ) {
    switch (args[0]) {
      case undefined: return Ω(TYPE_UNDEFINED);
      case null: return Ω('null');
      case true: return Ω('true');
      case false: return Ω('false');
    }

    if (typeof args[0] === TYPE_STRING)
      Ω(args[0]);
    else
      DefaultValue(context, args, Ω, ƒ);
  }





  // #################
  // ### Reference ###
  // #################

  function Reference(subject, key){
    this.subject = subject;
    this.key = key;
  }

  define(Reference.prototype, [
    function get(){
      return this.subject[this.key];
    },
    function set(value){
      return this.subject[this.key] = value;
    }
  ]);


  // ######################
  // ### ScopeReference ###
  // ######################

  function ScopeReference(scope, key){
    this.scope = scope;
    this.key = key;
  }

  inherit(ScopeReference, Reference, [
    function get(){
      return this.scope.get(this.key);
    },
    function set(value){
      return this.scope.set(this.key, value);
    },
  ]);




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
      var err = this.create(type);
      define(err, 'message', message);
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
      if (hasOwnProperty.call(this.record, name)) {
        if (init !== undefined)
          this.record[name] = init;
      } else {
        this.record[name] = init;
      }
    },
    function strictDeclare(type, name, init){
      if (hasOwnProperty.call(this.record, name))
        this.error('ReferenceError', 'Duplicate declaration for "'+name+'"');
      else
        this.record[name] = init;
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
    function reference(name){
      return new ScopeReference(this, name);
    },
    function child(ScopeType){
      return new ScopeType(this);
    },
    function error(type, message){

    },
    function create(Type, args){
      return builtins[Type].construct(this, args ? args : []);
    }
  ]);


  var constants = {
    NaN: { value: NaN },
    undefined: { value: undefined },
    Infinity: { value: Infinity }
  }

  // ###################
  // ### GlobalScope ###
  // ###################

  function GlobalScope(){
    Emitter.call(this);
    this.type = 'global';

    define(this, {
      global: this,
      ObjectPrototype: create(null)
    });

    for (var name in builtins)
      if (name !== 'Object')
        define(this, name+'Prototype', create(this.ObjectPrototype));

    var record = create(this.ObjectPrototype);

    for (var name in builtins) {
      var builtin = builtins[name].instantiate(this);
      define(this, name, builtin);
      define(record, name, builtin);
    }
    defineProperties(record, constants);
    BuiltinGlobals.forEach(function(builtin){
      define(record, builtin.name, builtin.instantiate(this));
    }, this);

    //defineStopIteration

    this.record = record;
    define(this, 'receiver', this.record);

    define(this.FunctionPrototype, function inspect(){
      return '[Function' + (this.name ? ': ' + this.name : '') + ']';
    });
  }

  inherit(GlobalScope, Scope, [
    function pause(context, Ω, ƒ){
      this.resume = function resume(){
        delete this.resume;
        this.emit('resume');
        Ω();
      };

      this.emit('pause', context);
    }
  ]);




  // #####################
  // ### FunctionScope ###
  // #####################

  function FunctionScope(parent){
    this.type = TYPE_FUNCTION;
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


  function toProperty(node, context, Ω, ƒ){
    if (node.type === 'Identifier')
      Ω(node.name);
    else if (node.type === 'Property' || node.type === 'Method')
      Ω(node.key.name);
    else if (node.type === 'Literal')
      Ω(node.value);
    else if (node.type === 'ExpressionStatement')
      toProperty(node.expression, context, Ω, ƒ);
  }


  // function isArrayIndex(context, args, Ω, ƒ) {
  //   if (typeof args[0] === TYPE_STRING) {
  //     ToUint32(context, args, function(result){
  //       ToString(context, [result], function(result){
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
        apply: function(context, args, Ω, ƒ){
          try {
            Ω(builtin.apply(context.receiver, args));
          } catch (e) {
            ƒ(context, Ω, context.error(e.name, e.message));
          }
        }
      });
    }

    function bridgeBuiltins(definition, target, names){
      var type = typeof target === TYPE_FUNCTION ? 'functions' : 'methods';
      names.forEach(function(name){
        definition[type].push(wrapBuiltin(name, target[name]));
      });
    }


    function makeCollection(Ctor, methods){
      var collections = new WeakMap,
          prototype = Ctor.name + 'Prototype';

      var Builtin = register({
        name: Ctor.name,
        apply: function(context, args, Ω, ƒ){
          if (context.receiver === context.record)
            return Builtin.construct(context, args, Ω, ƒ);

          ToObject(context, [context.receiver], function(target){
            if (collections.has(target)) {
              ƒ(context, Ω, context.error('TypeError', 'Object is already a '+Ctor.name));
            } else {
              collections.set(target, new Ctor);
              Ω(target);
            }
          }, ƒ);
        },
        construct: function(context, args, Ω, ƒ){
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
        apply: function(context, args, Ω, ƒ){
          Ω(Ctor(args[0]));
        },
        construct: function(context, args, Ω, ƒ){
          var self = create(context.global[prototype]);
          wrappers.set(self, Ctor(args[0]));
          Ω(self);
        },
        methods: [
          api('toString', function(context, args, Ω, ƒ){
            var self = wrappers.get(context.receiver);
            if (self)
              Ω(''+self);
            else
              ƒ(context, Ω, context.error('TypeError', Ctor.name+'.prototype.toString is not generic'));
          }),
          api('valueOf', function(context, args, Ω, ƒ){
            var self = wrappers.get(context.receiver);
            if (self)
              Ω(Ctor(self));
            else
              ƒ(context, Ω, context.error('TypeError', Ctor.name+'.prototype.valueOf is not generic'));
          })
        ]
      });

      bridgeBuiltins(Builtin, Ctor.prototype, methods);
      return Builtin;
    }

    function makeError(name){
      var prototype = name+'Prototype';
      var Builtin = register({
        name: 'Error',
        construct: function(context, args, Ω, ƒ){
          ToString(contexts, [args[0]], function(message){
            var self = create(context.global[prototype]);
            define(self, {
              message: message,
              type: undefined
            });
            Ω(self);
          }, ƒ);
        },
        apply: function(context, args, Ω, ƒ){
          if (context.receiver === context.global.record || !context.receiver) {
            Builtin.construct(context, args, Ω, ƒ);
          } else {
            ToObject(context, [context.receiver], function(receiver){
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
          api('toString', function(context, args, Ω, ƒ){
            ToString(context, [args.receiver.type], function(type){
              ToString(context, [args.receiver.message], function(message){
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
      construct: function(context, args, Ω, ƒ){
        var self = create(context.global.ArrayPrototype);
        if (args.length === 1 && typeof args[0] === TYPE_NUMBER) {
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
        api('isArray', function(context, args, Ω, ƒ){
          Ω(Object.getPrototypeOf(args[0]) === context.ArrayPrototype || Array.isArray(args[0]));
        })
      ]
    });

    bridgeBuiltins(BuiltinArray, Array.prototype, [
      'toString', 'pop', 'shift','unshift', 'lastIndexOf','push',
      'splice', 'reverse','slice', 'concat', 'join', 'indexOf'
    ]);

    BuiltinBoolean = makePrimitive(Boolean, []);

    BuiltinDate = register({
      name: 'Date',
      construct: function(context, args, Ω, ƒ){
        var self = create(context.global.DatePrototype);
        wrappers.set(self, Date.apply(null, args));
        Ω(self);
      }
    });

    bridgeBuiltins(BuiltinDate, Date, ['now']);

    Object.getOwnPropertyNames(Date.prototype).forEach(function(name){
      var builtin = Date.prototype[name];
      if (typeof builtin !== TYPE_FUNCTION || builtin === Date) return;

      BuiltinDate.methods.push(api(name, function(context, args, Ω, ƒ){
        if (isObject(context.receiver)){
          var date = wrappers.get(context.receiver);
        }

        if (date) {
          try {
            Ω(builtin.apply(date, args));
          } catch (e) {
            ƒ(context, Ω, context.error(e.name, e.message));
          }
        } else {
          ƒ(context, Ω, context.error('TypeError', name+' must be called on a Date object'));
        }
      }));
    });

    BuiltinError = makeError('Error');
    makeError('EvalError');

    function thunkUnwrapper(name, handler){
      return api(name, function(context, args, Ω, ƒ){
        if (isObject(context.receiver))
          args.thunk = thunks.get(context.receiver);

        if (args.thunk) {
          handler(context, args, Ω, ƒ);
        } else {
          ƒ(context, Ω, context.error('TypeError', name+' must be called on a function'));
        }
      });
    }

    BuiltinFunction = register({
      name: 'Function',
      construct: function(context, args, Ω, ƒ){
        var body = args.length ? args.pop() : '';
        var src = '(function anonymous('+args.join(', ')+'){\n'+body+'\n})';
        try {
          var ast = parse(src),
              self = new FunctionExpressionThunk(ast.body[0].expression);
          Ω(self.instantiate(context.global));
        } catch (e) {
          ƒ(context, Ω, context.error(e.type, e.message));
        }
      },
      methods: [
        thunkUnwrapper('bind', function(context, args, Ω, ƒ){
          Ω(new BoundFunctionThunk(args).instantiate(context));
        }),
        thunkUnwrapper('call', function(context, args, Ω, ƒ){
          context.receiver = args[0];
          args.thunk.apply(context, args.slice(1), Ω, ƒ);
        }),
        thunkUnwrapper('apply', function(context, args, Ω, ƒ){
          var applied = [];

          for (var i=0; i < args[1].length; i++)
            applied[i] = args[1][i];

          context.receiver = args[0];
          args.thunk.apply(context, applied, Ω, ƒ);
        }),
        thunkUnwrapper('toString', function(context, args, Ω, ƒ){
          var thunk = args.thunk;

          if (!thunk.code) {
            if (thunk.ast) {
              thunk.code = decompile(thunk.ast);
            } else {
              return ƒ(context, Ω, new Thrown('No way to generate code for function'));
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
      construct: function(context, args, Ω, ƒ){
        Ω(create(context.global.ObjectPrototype));
      },
      functions: [
        api('is', function(context, args, Ω, ƒ){
          var o = args[0],
              p = args[1];
          if (Object.is)
            Ω(Object.is(a, b))
          else
            Ω(o === p || (o === 0 && p === 0 && 1 / o === 1 / p) || (o !== o && p !== p))
        })
      ],
      methods: [
        api('valueOf', ToObject),
        api('toString', function(context, args, Ω, ƒ){
          var o = context.receiver;
          if (o === null) {
            Ω('[object Null]');
          } else if (o === undefined) {
            Ω('[object Undefined]');
          } else {
            ToObject(context, [o], function(o){
              do {
                if (brands.has(o))
                  return Ω('[object '+brands.get(o)+']');
              } while (o = Object(Object.getPrototypeOf(o)))

              Ω('[object Object]');
            }, ƒ);
          }
        })
      ]
    });

    BuiltinIterator = register({
      name: 'Iterator',
      construct: function(context, args, Ω, ƒ){
        Ω(create(context.global.IteratorPrototype));
      },
      methods: [
        api('iterator', function(context, args, Ω, ƒ){
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

    BuiltinRegExp = register({
      name: 'RegExp',
      construct: function(context, args, Ω, ƒ){}
    });

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
      api('eval', function(context, args, Ω, ƒ){
        evaluaters.Program(parse(args[0]), context, Ω, ƒ, Ω, ƒ);
      }),
      api('sleep', function(context, args, Ω, ƒ){
        ToNumber(context, args, function(time){
          setTimeout(Ω, time >> 0);
        }, ƒ);
      })
    ];

    return builtins;
  }({}));


  var stack = 0;

  function evaluate(node, context, Ω, ƒ){
    if (stack++ > 100) {
      stack = 0;
      nextTick(function(){
        evaluate(node, context, Ω, ƒ);
      });
    } else if (node) {
      evaluaters[node.type](node, context, Ω, ƒ);
    } else {
      ƒ(context, Ω, new Thrown('invalid node'));
    }
  }


  function reference(node, context, Ω, ƒ){
    if (node.type === 'MemberExpression') {
      evaluate(node.object, context, function(object){
        var resolver = node.computed ? evaluate : toProperty;
        resolver(node.property, context, function(prop){
          Ω(new Reference(object, prop));
        }, ƒ)
      }, ƒ);
    } else if (node.type === 'Identifier') {
      Ω(context.reference(node.name));
    } else if (node.type === 'VariableDeclaration') {
      evaluate(node, context, function(){
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


  function completeIfBreak(Ω, ƒ){
    return function(_, __, signal){
      if (signal === BREAK)
        Ω();
      else
        ƒ(_, __, signal);
    };
  }

  function applyMethod(obj, key, context, args, Ω, ƒ){
    if (isObject(obj[key]))
      var thunk = thunks.get(obj[key]);

    if (thunk) {
      args.callee = obj;
      thunk.apply(context, args, Ω, function(_, __, signal){
        if (signal instanceof Returned)
          Ω(signal.value);
        else
          ƒ(_, __, signal);
      });
    } else {
      ƒ(context, Ω, context.error('TypeError', (typeof obj[key]) + ' is not a function'));
    }
  }

  function isStopIteration(context, signal){
    if (signal instanceof Thrown) {
      if (context.StopIteration === signal.value)
        return true;
      if (isPrototypeOf.call(context.StopIterationPrototype, signal.value))
        return true;
    }
    return false;
  }

  var evaluaters = {
    ArrayExpression: function(node, context, Ω, ƒ){
      var output = [];

      iterate(node.elements, function(item, next){
        if (!item) {
          output.push(item);
          next();
        } else if (item.type === 'Literal') {
          output.push(item.value);
          next();
        } else {
          evaluate(node.elements[i], context, function(value){
            output.push(value);
            next();
          }, ƒ);
        }
      }, function(){
        BuiltinArray.construct(context, output, Ω, ƒ);
      });
    },
    ArrayPattern: function(node, context, Ω, ƒ){},
    ArrowFunctionExpression: function(node, context, Ω, ƒ){
      node.thunk || (node.thunk = new ArrowFunctionThunk(node));
      Ω(node.thunk.instantiate(context));
    },
    AssignmentExpression: function(node, context, Ω, ƒ){
      reference(node.left, context, function(ref){
        evaluate(node.right, context, function(value){
          if (node.operator === '=') {
            ref.set(value);
            Ω(value);
          } else {
            ToPrimitive(context, [ref.get()], function(left){
              ToPrimitive(context, [value], function(value){
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
    BinaryExpression: function(node, context, Ω, ƒ){
      evaluate(node.left, context, function(left){
        evaluate(node.right, context, function(right){
          if (node.operator === 'instanceof') {
            if (isObject(right) && thunks.has(right)) {
              Ω(isPrototypeOf.call(right.prototype, left));
            } else {
              ƒ(context, Ω, context.error('TypeError', "'instanceof' called on non-function"));
            }
          } else if (node.operator === 'in') {
            if (isObject(right)) {
              ToString(context, [left], function(left){
                Ω(left in right);
              }, ƒ);
            } else {
              ƒ(context, Ω, context.error('TypeError', "'in' called on non-object"));
            }
          } else {
            ToPrimitive(context, [left], function(left){
              ToPrimitive(context, [right], function(right){
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
    BlockStatement: function(node, context, Ω, ƒ){
      var completion;
      context = context.child(BlockScope);
      iterate(node.body, function(node, next){
        evaluate(node, context, function(value){
          completion = value;
          next();
        }, ƒ);
      }, function(){
        Ω(completion);
      });
    },
    BreakStatement: function(node, context, Ω, ƒ){
      if (node.label === null)
        ƒ(context, Ω, BREAK);
    },
    CallExpression: function(node, context, Ω, ƒ){
      var args = [];

      iterate(node.arguments, function(node, next){
        evaluate(node, context, function(value){
          args.push(value);
          next();
        }, ƒ);
      }, function(){
        evaluate(node.callee, context, function(callee){
          if (isObject(callee))
            var thunk = thunks.get(callee);

          if (thunk) {
            args.callee = callee;
            thunk.apply(context, args, Ω, function(context, _, signal){
              if (signal instanceof Returned)
                Ω(signal.value);
              else if (signal instanceof Thrown)
                ƒ(context, _, signal);
              else
                Ω();
            });
          } else {
            ƒ(context, Ω, context.error('TypeError', (typeof callee) + ' is not a function'));
          }
        }, ƒ);
      });
    },
    CatchClause: function(node, context, Ω, ƒ){
      evaluate(node.body, context, Ω, ƒ);
    },
    ClassBody: function(node, context, Ω, ƒ){
      var descs = {};

      iterate(node.body, function(property, next){
        evaluate(property, context, function(desc){
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
    ClassDeclaration: function(node, context, Ω, ƒ){
      context = context.child(ClassScope);
      context.className = node.id.name;

      if (node.superClass)
        context.superClass = context.get(node.superClass.name);

      evaluate(node.body, context, function(Class){
        context.parent.declare('class', context.className, Class);
        Ω(Class);
      }, ƒ);
    },
    ClassExpression: function(node, context, Ω, ƒ){
      context = context.child(ClassScope);
      context.className = node.id ? node.id.name : '';

      if (node.superClass)
        context.superClass = context.get(node.superClass.name);

      evaluate(node.body, context, Ω, ƒ);
    },
    ClassHeritage: function(node, context){},
    ConditionalExpression: function(node, context, Ω, ƒ){
      evaluate(node.test, context, function(result){
        evaluate(result ? node.consequent : node.alternate, context, Ω, ƒ);
      }, ƒ);
    },
    ContinueStatement: function(node, context, Ω, ƒ){
      ƒ(context, Ω, CONTINUE);
    },
    DebuggerStatement: function(node, context, Ω, ƒ){
      context.global.pause(context, Ω, ƒ);
    },
    DoWhileStatement: function(node, context, Ω, ƒ){
      void function loop(i){
        evaluate(node.body, context, function(){
          evaluate(node.test, context, function(test){
            test ? i > 100 ? nextTick(loop) : loop((i || 0) + 1) : Ω();
          });
        }, function(context, Ω, signal){
          if (signal === CONTINUE)
            i > 100 ? nextTick(loop) : loop((i || 0) + 1);
          else if (signal === BREAK)
            Ω();
          else
            ƒ(context, Ω, signal);
        });
      }();
    },
    EmptyStatement: function(node, context, Ω, ƒ){
      Ω();
    },
    ExportDeclaration: function(node, context, Ω, ƒ){
      var decl = node.declaration;
      evaluate(node.declaration, context, function(decls){
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
    ExportSpecifier: function(node, context){},
    ExportSpecifierSet: function(node, context){},
    ExpressionStatement: function(node, context, Ω, ƒ){
      evaluate(node.expression, context, Ω, ƒ);
    },
    ForInStatement: function(node, context, Ω, ƒ){
      reference(node.left, context, function(left){
        evaluate(node.right, context, function(right){
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
            evaluate(node.body, context, loop, function(_, __, signal){
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
    ForOfStatement: function(node, context, Ω, ƒ){
      reference(node.left, context, function(left){
        evaluate(node.right, context, function(right){
          applyMethod(right, 'iterator', context, [], function(iterator){
            var i = 0;
            void function loop(){
              if (i++ > 100) {
                i = 0;
                return nextTick(loop);
              }
              applyMethod(iterator, 'next', context, [], function(result){
                left.set(result);

                evaluate(node.body, context, loop, function(_, __, signal){
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
    ForStatement: function(node, context, Ω, ƒ){
      evaluate(node.init, context, function(init){
        var i = 0;

        function update(){
          evaluate(node.update, context, function(){
            if (i++ > 100) {
              i = 0;
              nextTick(loop);
            } else {
              loop();
            }
          }, ƒ);
        }

        function loop(){
          evaluate(node.test, context, function(test){
            if (!test) return Ω();
            evaluate(node.body, context, update, function(context, Ω, signal){
              if (signal === CONTINUE)
                update();
              else if (signal === BREAK)
                Ω();
              else
                ƒ(context, Ω, signal);
            });
          }, ƒ);
        }

        loop();
      }, ƒ);
    },
    FunctionDeclaration: function(node, context, Ω, ƒ){
      node.thunk || (node.thunk = new FunctionDeclarationThunk(node));
      context.declare(TYPE_FUNCTION, node.id.name, node.thunk.instantiate(context));
      Ω();
    },
    FunctionExpression: function(node, context, Ω, ƒ){
      node.thunk || (node.thunk = new FunctionExpressionThunk(node));
      Ω(node.thunk.instantiate(context));
    },
    Glob: function(node, context, Ω, ƒ){},
    Identifier: function(node, context, Ω, ƒ){
      Ω(context.get(node.name));
    },
    IfStatement: function(node, context, Ω, ƒ){
      evaluate(node.test, context, function(result){
        var target = !!result ? node.consequent : node.alternate;
        target ? evaluate(target, context, Ω, ƒ) : Ω();
      }, ƒ);
    },
    ImportDeclaration: function(node, context, Ω, ƒ){},
    ImportSpecifier: function(node, context, Ω, ƒ){},
    LabeledStatement: function(node, context, Ω, ƒ){},
    Literal: function(node, context, Ω, ƒ){
      Ω(node.value);
    },
    LogicalExpression: function(node, context, Ω, ƒ){
      evaluate(node.left, context, function(left){
        evaluate(node.right, context, function(right){
          node.operator === '&&' ? Ω(left && right) : Ω(left || right);
        }, ƒ);
      }, ƒ);
    },
    MemberExpression: function(node, context, Ω, ƒ){
      evaluate(node.object, context, function(object){
        var resolver = node.computed ? evaluate : toProperty;
        resolver(node.property, context, function(key){
          context.receiver = object;
          Ω(object[key]);
        }, ƒ)
      }, ƒ);
    },
    MethodDefinition: function(node, context, Ω, ƒ){
      var name = node.key.name === 'constructor' ? context.className : node.key.name;

      if (node.kind === 'get' || node.kind === 'set') {
        node.value.id = new ID(node.kind+'_'+name);
        evaluate(node.value, context, function(accessor){
          Ω(descriptor(node.kind, accessor));
        }, ƒ);
      } else {
        node.value.id = new ID(name);
        evaluate(node.value, context, function(method){
          Ω(descriptor('init', method));
        }, ƒ);
      }
    },
    ModuleDeclaration: function(node, context, Ω, ƒ){},
    NewExpression: function(node, context, Ω, ƒ){
      var args = [];

      iterate(node.arguments, function(node, next){
        evaluate(node, context, function(value){
          args.push(value);
          next();
        }, ƒ);
      }, function(){
        evaluate(node.callee, context, function(callee){
          if (isObject(callee))
            var thunk = thunks.get(callee);

          if (thunk) {
            args.callee = callee;
            thunk.construct(context, args, Ω, ƒ);
          } else {
            ƒ(context, Ω, context.error('TypeError', (typeof callee) + ' is not a function'));
          }
        }, ƒ);
      });
    },
    ObjectExpression: function(node, context, Ω, ƒ){
      var properties = {};

      iterate(node.properties, function(property, next){
        toProperty(property.key, context, function(key){
          evaluate(property.value, context, function(value){
            if (properties[key])
              properties[key][property.kind] = value;
            else
              properties[key] = descriptor(property.kind, value);

            next();
          }, ƒ);
        }, ƒ);
      }, function(){
        BuiltinObject.construct(context, [], function(object){
          Ω(defineProperties(object, properties));
        }, ƒ);
      });
    },
    ObjectPattern: function(node, context, Ω, ƒ){},
    Path: function(node, context, Ω, ƒ){},
    Program: function(node, context, Ω, ƒ){
      var completion;
      context = context || new GlobalScope;

      nextTick(function(){
        iterate(node.body, function(node, next){
          evaluate(node, context, function(value){
            completion = value;
            next();
          }, ƒ);
        }, function(){
          Ω(completion);
        });
      });

      return context;
    },
    Property: function(node, context, Ω, ƒ){
      evaluate(node.value, context, Ω, ƒ);
    },
    ReturnStatement: function(node, context, Ω, ƒ){
      evaluate(node.argument, context, function(result){
        ƒ(context, Ω, new Returned(result));
      }, ƒ);
    },
    SequenceExpression: function(node, context, Ω, ƒ){
      var completion;

      iterate(node.expressions, function(node, next){
        evaluate(node, context, function(value){
          completion = value;
          next();
        }, ƒ);
      }, function(){
        Ω(completion);
      });
    },
    // SwitchCase: function(node, context, Ω, ƒ){
    //   evaluate(node.test, context, function(test){
    //     if (test !== context.discriminant && test !== null) return Ω();
    //     var completion;
    //     iterate(node.consequent, function(node, next){
    //       evaluate(node, context, function(value){
    //         completion = value;
    //         next();
    //       }, ƒ);
    //     }, function(){
    //       Ω(completion);
    //     });
    //   });
    // },
    SwitchStatement: function(node, context, Ω, ƒ){
      evaluate(node.discriminant, context, function(discriminant){
        var executing;
        var control = completeIfBreak(Ω, ƒ);
        iterate(node.cases, function(node, next){
          if (executing) {
            evaluate(node.consequent, context, next, control);
          } else {
            evaluate(node.test, context, function(test){
              if (test === discriminant) {
                executing = true;
                evaluate(node.consequent, context, next, control);
              }
            }, ƒ);
          }
        }, function(){
          if (executing) return Ω();

          iterate(node.cases, function(node, next){
            if (node.test === null)
              executing = true;

            if (executing)
              evaluate(node.consequent, context, next, control);
            else
              next();
          }, Ω)
        });
      });
    },
    TaggedTemplateExpression: function(node, context, Ω, ƒ){
      node.quasi.tagged = context.get(node.tag.name);
      evaluate(node.quasi, context, Ω, ƒ);
    },
    TemplateElement: function(node, context, Ω, ƒ){
      Ω(node.value);
    },
    TemplateLiteral: function(node, context, Ω, ƒ){
      if (!node.converted) {
        node.converted = [];
        iterate(node.expressions, function(element, next){
          evaluate(element, context, function(result){
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
          evaluate(node, context, function(result){
            args.push(result);
            next();
          }, ƒ);
        }, function(){
          Ω(template.apply(null, args));
        });
      }
    },
    ThisExpression: function(node, context, Ω, ƒ){
      console.log(context)
      Ω(context.receiver);
    },
    ThrowStatement: function(node, context, Ω, ƒ){
      evaluate(node.argument, context, function(argument){
        ƒ(context, Ω, new Thrown(argument));
      }, ƒ);
    },
    TryStatement: function(node, context, Ω, ƒ){
      evaluate(node.block, context, Ω, function(_, __, signal){
        if (signal instanceof Thrown) {
          iterate(node.handlers, function(node, next){
            var catchContext = new CatchScope(context, node.param.name, signal.value);
            evaluate(node, catchContext, next, ƒ);
          }, function(){
            node.finalizer ? evaluate(node.finalizer, context, Ω, ƒ) : Ω();
          });
        } else {
          ƒ(_, __, signal);
        }
      });
    },
    UnaryExpression: function(node, context, Ω, ƒ){
      evaluate(node.argument, context, function(value){
        if (node.operator === 'typeof') {
          if (value === null) return Ω(TYPE_OBJECT);

          var type = typeof value;
          Ω(type === TYPE_OBJECT && thunks.has(value) ? TYPE_FUNCTION : type);

        } else if (node.operator === 'void') {
          Ω(void 0);

        } else if (node.operator === '!') {
          Ω(!value);

        } else {
          ToPrimitive(context, [value], function(value){
            switch (node.operator) {
              case '~': Ω(~value); break;
              case '+': Ω(+value); break;
              case '-': Ω(-value); break;
            }
          }, ƒ);
        }
      });
    },
    UpdateExpression: function(node, context, Ω, ƒ){
      reference(node.argument, context, function(ref){
        ToPrimitive(context, [ref.get()], function(val){
          var newval = node.operator === '++' ? val + 1 : val - 1;
          ref.set(newval);
          Ω(node.prefix ? newval : val);
        }, ƒ);
      }, ƒ);
    },
    VariableDeclaration: function(node, context, Ω, ƒ){
      var out = {};

      iterate(node.declarations, function(node, next){
        evaluate(node, context, function(result){
          out[node.id.name] = result;
          next();
        }, ƒ);
      }, function(){
        Ω(out);
      });
    },
    VariableDeclarator: function(node, context, Ω, ƒ){
      function declare(result){
        if (node.id.type === 'Identifier')
          context.declare(node.kind, node.id.name, result);
        Ω(result);
      }

      if (node.init)
        evaluate(node.init, context, declare, ƒ);
      else
        declare();
    },
    WhileStatement: function(node, context, Ω, ƒ){
      void function loop(i){
        evaluate(node.test, context, function(test){
          if (!test) return Ω();
          evaluate(node.body, context, function(){
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
    WithStatement: function(node, context, Ω, ƒ){
      evaluate(node.object, context, function(object){
        context = new WithScope(context, object);
        evaluate(node.body, context, Ω, ƒ)
      }, ƒ);
    },
    YieldExpression: function(node, context, Ω, ƒ){},
  };

  if (typeof module === 'object')
    module.exports = Interpreter;
  else if (typeof exports === 'object')
    exports.Interpreter = Interpreter;

  return Interpreter
})((0,eval)('this'));
