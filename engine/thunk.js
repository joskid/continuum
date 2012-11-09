var thunk = (function(exports){
  var utility = require('./utility'),
      Emitter          = utility.Emitter,
      define           = utility.define,
      inherit          = utility.inherit;

  var operators    = require('./operators'),
      STRICT_EQUAL = operators.STRICT_EQUAL,
      ToObject     = operators.ToObject,
      UnaryOp      = operators.UnaryOp,
      BinaryOp     = operators.BinaryOp,
      GetValue     = operators.GetValue,
      PutValue     = operators.PutValue,
      PRE_INC      = operators.PRE_INC,
      POST_INC     = operators.POST_INC,
      PRE_DEC      = operators.PRE_DEC,
      POST_DEC     = operators.POST_DEC;

  var constants = require('./constants'),
      BINARYOPS = constants.BINARYOPS.array,
      UNARYOPS  = constants.UNARYOPS.array,
      ENTRY     = constants.ENTRY.hash,
      AST       = constants.AST.array,
      Pause     = constants.SYMBOLS.Pause,
      Empty     = constants.SYMBOLS.Empty,
      Resume    = constants.SYMBOLS.Resume,
      StopIteration = constants.BRANDS.StopIteration;

  var AbruptCompletion = require('./errors').AbruptCompletion;




  function Desc(v){
    this.Value = v;
  }

  Desc.prototype = {
    Configurable: true,
    Enumerable: true,
    Writable: true
  };



  var D = (function(d, i){
    while (i--) {
      d[i] = new Function('return function '+
        ((i & 1) ? 'E' : '_') +
        ((i & 2) ? 'C' : '_') +
        ((i & 4) ? 'W' : '_') +
        '(v){ this.Value = v }')();

      d[i].prototype = {
        Enumerable  : (i & 1) > 0,
        Configurable: (i & 2) > 0,
        Writable    : (i & 4) > 0
      };
    }
    return d;
  })([], 8);


  function DefineProperty(obj, key, val) {
    if (val && val.Completion) {
      if (val.Abrupt) {
        return val;
      } else {
        val = val.value;
      }
    }

    return obj.DefineOwnProperty(key, new Desc(val), false);
  }

  var log = false;


  function instructions(ops, opcodes){
    var out = [];
    for (var i=0; i < ops.length; i++) {
      out[i] = opcodes[+ops[i].op];
      if (out[i].name === 'LOG') {
        out.log = true;
      }
    }
    return out;
  }


  function Thunk(code){
    var opcodes = [ARRAY, ARG, ARGS, ARRAY_DONE, BINARY, BLOCK, CALL, CASE,
      CLASS_DECL, CLASS_EXPR, COMPLETE, CONST, CONSTRUCT, DEBUGGER, DEFAULT, DEFINE,
      DUP, ELEMENT, ENUM, EXTENSIBLE, FLIP, FUNCTION, GET, IFEQ, IFNE, INC, INDEX, ITERATE, JUMP, LET,
      LITERAL, LOG, MEMBER, METHOD, NATIVE_CALL, NATIVE_REF, OBJECT, POP,
      POPN, PROPERTY, PUT, REF, REGEXP, RETURN, ROTATE, RUN, SAVE, SPREAD,
      SPREAD_ARG, STRING, SUPER_CALL, SUPER_ELEMENT, SUPER_MEMBER, TEMPLATE,
      THIS, THROW, UNARY, UNDEFINED, UPDATE, UPSCOPE, VAR, WITH, YIELD];

    var thunk = this,
        ops = code.ops,
        cmds = instructions(ops, opcodes);


    function unwind(){
      for (var i = 0, entry; entry = code.transfers[i]; i++) {
        if (entry.begin < ip && ip <= entry.end) {
          if (entry.type === ENTRY.ENV) {
            trace(context.popBlock());
          } else {
            if (entry.type === ENTRY.TRYCATCH) {
              stack[sp++] = error.value;
              ip = entry.end;
              console.log(ops[ip])
              return cmds[ip];
            } else if (entry.type === ENTRY.FOROF) {
              if (error && error.value && error.value.NativeBrand === StopIteration) {
                ip = entry.end;
                return cmds[ip];
              }
            }
          }
        }
      }


      if (error) {
        if (error.value && error.value.setCode) {
          var range = code.ops[ip].range,
              loc = code.ops[ip].loc;

          if (!error.value.hasLocation) {
            error.value.hasLocation = true;
            error.value.setCode(loc, code.source);
            error.value.setOrigin(code.filename, code.name);
          }

          if (stacktrace) {
            if (error.value.trace) {
              [].push.apply(error.value.trace, stacktrace);
            } else {
              error.value.trace = stacktrace;
            }
            error.value.context || (error.value.context = context);
          }
        }
      }

      completion = error;
      return false;
    }



    function ARGS(){
      stack[sp++] = [];
      return cmds[++ip];
    }

    function ARG(){
      var arg = stack[--sp];
      stack[sp - 1].push(arg);
      return cmds[++ip];
    }

    function ARRAY(){
      stack[sp++] = context.createArray(0);
      stack[sp++] = 0;
      return cmds[++ip];
    }

    function ARRAY_DONE(){
      var len = stack[--sp];
      stack[sp - 1].Put('length', len);
      return cmds[++ip];
    }

    function BINARY(){
      var right  = stack[--sp],
          left   = stack[--sp],
          result = BinaryOp(BINARYOPS[ops[ip][0]], GetValue(left), GetValue(right));

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function BLOCK(){
      context.pushBlock(ops[ip][0]);
      return cmds[++ip];
    }

    function CALL(){
      var args     = stack[--sp],
          receiver = stack[--sp],
          func     = stack[--sp],
          result   = context.EvaluateCall(func, receiver, args);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function CASE(){
      var result = STRICT_EQUAL(stack[--sp], stack[sp - 1]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      if (result) {
        sp--;
        ip = ops[ip][0];
        return cmds[ip];
      }

      return cmds[++ip];
    }

    function CLASS_DECL(){
      var def  = ops[ip][0],
          sup  = def.superClass ? stack[--sp] : undefined,
          ctor = context.pushClass(def, sup);

      if (ctor && ctor.Completion) {
        if (ctor.Abrupt) {
          error = ctor;
          return unwind;
        } else {
          ctor = ctor.value;
        }
      }

      var result = context.initializeBindings(def.pattern, ctor, true);
      if (result && result.Abrupt) {
        error = result;
        return unwind;
      }

      return cmds[++ip];
    }

    function CLASS_EXPR(){
      var def  = ops[ip][0],
          sup  = def.superClass ? stack[--sp] : undefined,
          ctor = context.pushClass(def, sup);

      if (ctor && ctor.Completion) {
        if (ctor.Abrupt) {
          error = ctor;
          return unwind;
        } else {
          ctor = ctor.value;
        }
      }

      stack[sp++] = ctor;
      return cmds[++ip];
    }

    function COMPLETE(){
      return false;
    }

    function CONST(){
      context.initializeBindings(ops[ip][0], stack[--sp], true);
      return cmds[++ip];
    }

    function CONSTRUCT(){
      var args   = stack[--sp],
          func   = stack[--sp],
          result = context.EvaluateConstruct(func, args);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }
      stack[sp++] = result;
      return cmds[++ip];
    }

    function DEBUGGER(){
      cleanup = pauseCleanup;
      ip++;
      console.log(context, thunk);
      return false;
    }

    function DEFAULT(){
      sp--;
      ip = ops[ip][0];
      return cmds[++ip];
    }

    function DEFINE(){
      var attrs  = ops[ip][0],
          val    = stack[--sp],
          key    = stack[sp - 1],
          obj    = stack[sp - 2],
          result = obj.DefineOwnProperty(key, new D[attrs](val));

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function DUP(){
      stack[sp] = stack[sp++ - 1];
      return cmds[++ip];
    }

    function ELEMENT(){
      var obj    = stack[--sp],
          key    = stack[--sp],
          result = context.Element(obj, key);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function ENUM(){
      stack[sp - 1] = stack[sp - 1].enumerator();
      return cmds[++ip];
    }

    function EXTENSIBLE(){
      stack[sp - 1].SetExtensible(!!ops[ip][0]);
      return cmds[++ip];
    }

    function FUNCTION(){
      stack[sp++] = context.createFunction(ops[ip][0], ops[ip][1]);
      return cmds[++ip];
    }

    function FLIP(){
      var buffer = [],
          index  = 0,
          count  = ops[ip][0];

      while (index < count) {
        buffer[index] = stack[sp - index++];
      }

      index = 0;
      while (index < count) {
        stack[sp - index] = buffer[count - ++index];
      }

      return cmds[++ip];
    }


    function GET(){
      var result = GetValue(stack[--sp]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function IFEQ(){
      if (ops[ip][1] === !!stack[--sp]) {
        ip = ops[ip][0];
        return cmds[ip];
      }
      return cmds[++ip];
    }

    function IFNE(){
      if (ops[ip][1] === !!stack[sp - 1]) {
        ip = ops[ip][0];
        return cmds[ip];
      } else {
        sp--;
      }
      return cmds[++ip];
    }

    function INC(){
      stack[sp - 1]++;
      return cmds[++ip];
    }

    function INDEX(){
      if (ops[ip][0]) {
        stack[sp - 1]++;
      } else {
        var val = GetValue(stack[--sp]);

        if (val && val.Completion) {
          if (val.Abrupt) {
            error = val;
            return unwind;
          } else {
            val = val.value;
          }
        }

        var index = stack[--sp],
            array = stack[sp - 1];

        if (ops[ip][1]) {
          var status = context.SpreadInitialization(array, index, val);

          if (status && status.Abrupt) {
            error = status;
            return unwind;
          }

          stack[sp++] = status;
        } else {
          array.DefineOwnProperty(index, new Desc(val));
          stack[sp++] = index + 1;
        }
      }

      return cmds[++ip];
    }

    function ITERATE(){
      stack[sp - 1] = stack[sp - 1].Iterate();
      return cmds[++ip];
    }

    function LITERAL(){
      stack[sp++] = ops[ip][0];
      return cmds[++ip];
    }

    function JUMP(){
      ip = ops[ip][0];
      return cmds[ip];
    }

    function LET(){
      context.initializeBindings(ops[ip][0], stack[--sp], true);
      return cmds[++ip];
    }

    function LOG(){
      console.log({
        stackPosition: sp,
        stack: stack,
        history: history
      });
      return cmds[++ip];
    }

    function MEMBER(){
      var obj    = stack[--sp],
          key    = code.lookup(ops[ip][0]),
          result = context.Element(key, obj);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function METHOD(){
      var kind   = ops[ip][0],
          obj    = stack[sp - 1],
          key    = code.lookup(ops[ip][2]),
          code   = ops[ip][1],
          status = context.defineMethod(kind, obj, key, code);

      if (status && status.Abrupt) {
        error = status;
        return unwind;
      }
      return cmds[++ip];
    }

    function NATIVE_CALL(){
      return CALL();
    }

    function NATIVE_REF(){
      if (!code.natives) {
        error = 'invalid native reference';
        return unwind;
      }
      stack[sp++] = context.realm.natives.reference(code.lookup(ops[ip][0]), false);
      return cmds[++ip];
    }

    function PROPERTY(){
      var val    = stack[--sp],
          obj    = stack[sp - 1],
          key    = code.lookup(ops[ip][0]),
          status = DefineProperty(obj, key, val);

      if (status && status.Abrupt) {
        error = status;
        return unwind;
      }
      return cmds[++ip];
    }

    function OBJECT(){
      stack[sp++] = context.createObject();
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
      var val    = stack[--sp],
          ref    = stack[--sp],
          status = PutValue(ref, val);

      if (status && status.Abrupt) {
        error = status;
        return unwind;
      }

      stack[sp++] = val;
      return cmds[++ip];
    }

    function REGEXP(){
      stack[sp++] = context.createRegExp(ops[ip][0]);
      return cmds[++ip];
    }

    function REF(){
      var key = code.lookup(ops[ip][0]);
      stack[sp++] = context.IdentifierResolution(key);
      return cmds[++ip];
    }

    function RETURN(){
      completion = stack[--sp];
      ip++;
      if (code.generator) {
        context.currentGenerator.ExecutionContext = context;
        context.currentGenerator.State = 'closed';
        error = new AbruptCompletion('throw', context.realm.intrinsics.StopIteration);
        unwind();
      }
      return false;
    }

    function ROTATE(){
      var buffer = [],
          item   = stack[--sp],
          index  = 0,
          count  = ops[ip][0];

      while (index < count) {
        buffer[index++] = stack[--sp];
      }

      buffer[index++] = item;

      while (index--) {
        stack[sp++] = buffer[index];
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

    function SPREAD(){
      var obj    = stack[--sp],
          index  = ops[ip][0],
          result = context.SpreadDestructuring(obj, index);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function SPREAD_ARG(){
      var spread = stack[--sp],
          args   = stack[sp - 1],
          status = context.SpreadArguments(args, spread);

      if (status && status.Abrupt) {
        error = status;
        return unwind;
      }

      return cmds[++ip];
    }

    function STRING(){
      stack[sp++] = code.lookup(ops[ip][0]);
      return cmds[++ip];
    }

    function SUPER_CALL(){
      var result = context.SuperReference(false);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function SUPER_ELEMENT(){
      var result = context.SuperReference(stack[--sp]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function SUPER_MEMBER(){
      var result = context.SuperReference(code.lookup(ops[ip][0]));

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function TEMPLATE(){
      stack[sp++] = context.GetTemplateCallSite(ops[ip][0]);
      console.log(stack, sp);
      return cmds[++ip];
    }

    function THIS(){
      var result = context.ThisResolution();

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function THROW(){
      error = new AbruptCompletion('throw', stack[--sp]);
      return unwind;
    }

    function UNARY(){
      var result = UnaryOp(UNARYOPS[ops[ip][0]], stack[--sp]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function UNDEFINED(){
      stack[sp++] = undefined;
      return cmds[++ip];
    }

    var updaters = [POST_DEC, PRE_DEC, POST_INC, PRE_INC];

    function UPDATE(){
      var update = updaters[ops[ip][0]],
          result = update(stack[--sp]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function UPSCOPE(){
      context.popBlock();
      return cmds[++ip];
    }

    function VAR(){
      context.initializeBindings(ops[ip][0], stack[--sp], false);
      return cmds[++ip];
    }

    function WITH(){
      var result = ToObject(GetValue(stack[--sp]));

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      context.pushWith(result);
      return cmds[++ip];
    }

    function YIELD(){
      var generator = context.currentGenerator;
      generator.ExecutionContext = context;
      generator.State = 'suspended';
      context.pop();
      cleanup = yieldCleanup;
      yielded = stack[--sp];
      ip++;
      return false;
    }

    function trace(unwound){
      stacktrace || (stacktrace = []);
      stacktrace.push(unwound);
    }

    function normalPrepare(){
      stack = [];
      ip = 0;
      sp = 0;
      stacktrace = completion = error = undefined;
    }

    function normalExecute(){
      var f = cmds[ip],
          ips = 0;
      if (log) {
        history = [];
        while (f) {
          history[ips++] = [ip, ops[ip]];
          f = f();
        }
      } else {
        while (f) f = f();
      }
    }

    function normalCleanup(){
      var result = completion;
      prepare();
      return result;
    }

    function instrumentedExecute(){
      var f = cmds[ip],
          ips = 0,
          realm = context.realm;

      history = [];

      while (f) {
        if (f) {
          history[ips++] = [ip, ops[ip]];
          realm.emit('op', [ops[ip], stack[sp - 1]]);
          f = f();
        }
      }
    }

    function resumePrepare(){
      delete thunk.ip;
      delete thunk.stack;
      prepare = normalPrepare;
      context = ctx;
      ctx = undefined;
    }

    function pauseCleanup(){
      thunk.ip = ip;
      thunk.stack = stack;
      stack.length = sp;
      prepare = resumePrepare;
      cleanup = normalCleanup;
      ctx = context;
      return Pause;
    }

    function yieldPrepare(){
      prepare = normalPrepare;
    }

    function yieldCleanup(){
      prepare = yieldPrepare;
      cleanup = normalCleanup;
      return yielded;
    }

    function run(ctx){
      context = ctx;
      if (context.realm.quiet) {
        execute = normalExecute;
      } else {
        execute = instrumentedExecute;
      }
      var prevLog = log;
      log = log || cmds.log;
      prepare();
      execute();
      if (log && !prevLog) log = false;
      return GetValue(cleanup());
    }

    function send(ctx, value){
      if (stack) {
        stack[sp++] = value;
      }
      return run(ctx);
    }


    var completion, stack, ip, sp, error, ctx, context, stacktrace, history;

    var prepare = normalPrepare,
        execute = normalExecute,
        cleanup = normalCleanup;

    this.run = run;
    this.send = send;
    this.code = code;
    Emitter.call(this);
  }

  inherit(Thunk, Emitter, []);

  exports.Thunk = Thunk;
  return exports;
})(typeof module !== 'undefined' ? module.exports : {});

