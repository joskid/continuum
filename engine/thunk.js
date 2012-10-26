var thunk = (function(exports){
  var utility = require('./utility'),
      Emitter          = utility.Emitter,
      define           = utility.define,
      inherit          = utility.inherit;

  var operators = require('./operators'),
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
      Resume    = constants.SYMBOLS.Resume

  function Desc(v){ this.Value = v }
  Desc.prototype.Configurable = true;
  Desc.prototype.Enumerable = true;
  Desc.prototype.Writable = true;

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



  function instructions(ops, opcodes){
    var out = [];
    for (var i=0; i < ops.length; i++) {
      out[i] = opcodes[+ops[i].op];
    }
    return out;
  }


  function Thunk(code){
    var opcodes = [
      ARRAY, ARRAY_DONE, BINARY, BLOCK, BLOCK_EXIT, CALL, CASE, CLASS_DECL,
      CLASS_EXPR, CONST, CONSTRUCT, DEBUGGER, DEFAULT, DUP, ELEMENT,
      FUNCTION, GET, IFEQ, IFNE, INDEX, JSR, JUMP, LET, LITERAL,
      MEMBER, METHOD, OBJECT, POP, SAVE, POPN, PROPERTY, PUT,
      REGEXP, REF, RETURN, COMPLETE, ROTATE, RUN, SUPER_CALL, SUPER_ELEMENT,
      SUPER_GUARD, SUPER_MEMBER, THIS, THROW, UNARY, UNDEFINED, UPDATE, VAR, WITH,
      NATIVE_REF, ENUM, NEXT, STRING, NATIVE_CALL, TO_OBJECT, SPREAD, ARGS, ARG, SPREAD_ARG
    ];

    var thunk = this,
        ops = code.ops,
        cmds = instructions(ops, opcodes);

    function ARGS(){
      stack[sp++] = [];
      return cmds[++ip];
    }

    function ARG(){
      a = stack[--sp];
      stack[sp - 1].push(a);
      return cmds[++ip];
    }

    function ARRAY(){
      stack[sp++] = context.createArray(0);
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
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function BLOCK(){
      context.pushBlock(ops[ip][0]);
      return cmds[++ip];
    }

    function BLOCK_EXIT(){
      context.popBlock();
      return cmds[++ip];
    }

    function CALL(){
      a = stack[--sp];
      b = stack[--sp];
      c = stack[--sp];
      d = context.EvaluateCall(c, b, a);
      if (d && d.Completion) {
        if (d.Abrupt) {
          error = d;
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
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
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
      a = ops[ip][0];
      b = ops[ip][1] ? stack[--sp] : undefined;
      c = context.pushClass(a, b);
      if (c && c.Completion) {
        if (c.Abrupt) {
          error = c;
          return ƒ;
        } else {
          c = c.value;
        }
      }

      d = context.initializeBindings(a.pattern, c);
      if (d && d.Abrupt) {
        error = d;
        return ƒ;
      }
      return cmds[++ip];
    }

    function CLASS_EXPR(){
      b = ops[ip][1] ? stack[--sp] : undefined;
      a = context.pushClass(ops[ip][0], b);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
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
      context.initializeBindings(ops[ip][0], stack[--sp], true);
      return cmds[++ip];
    }

    function CONSTRUCT(){
      a = stack[--sp];
      b = stack[--sp];
      c = context.EvaluateConstruct(b, a);
      if (c && c.Completion) {
        if (c.Abrupt) {
          error = c;
          return ƒ;
        } else {
          c = c.value;
        }
      }
      stack[sp++] = c;
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
      a = context.Element(stack[--sp], stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function ENUM(){
      a = stack[sp - 1].Enumerate(true, true);
      stack[sp - 1] = a;
      stack[sp++] = 0;
      return cmds[++ip];
    }

    function FUNCTION(){
      c = context.createFunction(ops[ip][1], code.lookup(ops[ip][0]));
      stack[sp++] = c;
      return cmds[++ip];
    }

    function GET(){
      a = GetValue(stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function IFEQ(){
      if (ops[ip][1] === !!stack[--sp]) {
        ip = ops[ip][0];
      }
      return cmds[++ip];
    }

    function IFNE(){
      if (ops[ip][1] === !!stack[sp - 1]) {
        ip = ops[ip][0];
      } else {
        sp--;
      }
      return cmds[++ip];
    }

    function INDEX(){
      if (ops[ip][0]) {
        stack[sp - 1]++;
      } else {
        a = GetValue(stack[--sp]);
        if (a && a.Completion) {
          if (a.Abrupt) {
            error = a;
            return ƒ;
          } else {
            a = a.value;
          }
        }
        b = stack[--sp];
        c = stack[sp - 1];
        if (ops[ip][1]) {
          d = context.SpreadInitialization(c, b, a)
          if (d && d.Abrupt) {
            error = d;
            return ƒ;
          }
          stack[sp++] = d;
        } else {
          c.DefineOwnProperty(b, new Desc(a));
          stack[sp++] = b + 1;
        }
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
      context.initializeBindings(ops[ip][0], stack[--sp], true);
      return cmds[++ip];
    }

    function MEMBER(){
      a = context.Element(code.lookup(ops[ip][0]), stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function METHOD(){
      context.defineMethod(ops[ip][0], stack[sp - 1], code.lookup(ops[ip][2]), ops[ip][1]);
      if (a && a.Abrupt) {
        error = a;
        return ƒ;
      }
      return cmds[++ip];
    }

    function NATIVE_CALL(){
      a = stack[--sp];
      b = stack[--sp];
      c = stack[--sp];
      d = context.EvaluateCall(c, b, a);
      if (d && d.Completion) {
        if (d.Abrupt) {
          error = d;
          return ƒ;
        } else {
          d = d.value;
        }
      }
      stack[sp++] = d;
      return cmds[++ip];
    }

    function NATIVE_REF(){
      if (!code.natives) {
        error = 'invalid native reference';
        return ƒ;
      }
      stack[sp++] = context.realm.natives.reference(code.lookup(ops[ip][0]), false);
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
      if (b && b.Abrupt) {
        error = b;
        return ƒ;
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
      a = stack[--sp];
      b = PutValue(stack[--sp], a);
      if (b && b.Abrupt) {
        error = b;
        return ƒ;
      }
      stack[sp++] = a;
      return cmds[++ip];
    }


    function REGEXP(){
      stack[sp++] = context.createRegExp(ops[ip][0]);
      return cmds[++ip];
    }

    function REF(){
      stack[sp++] = context.IdentifierResolution(code.lookup(ops[ip][0]));
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

    function SPREAD(){
      a = context.SpreadDestructuring(stack[--sp], ops[ip][0]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function SPREAD_ARG(){
      a = stack[--sp];
      b = context.SpreadArguments(stack[sp - 1], a);
      if (b && b.Abrupt) {
        error = b;
        return ƒ;
      }
      return cmds[++ip];
    }

    function STRING(){
      stack[sp++] = code.lookup(ops[ip][0]);
      return cmds[++ip];
    }

    function SUPER_CALL(){
      a = SuperReference(false);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function SUPER_ELEMENT(){
      a = context.SuperReference(stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function SUPER_GUARD(){
      a = context.SuperReference(null);
      if (a && a.Abrupt) {
        error = a;
        return ƒ;
      }
      return cmds[++ip];
    }

    function SUPER_MEMBER(){
      a = context.SuperReference(code.lookup(ops[ip][0]));
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function THIS(){
      a = context.ThisResolution();
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
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

    function TO_OBJECT(){

    }

    function UNARY(){
      a = UnaryOp(UNARYOPS[ops[ip][0]], stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
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
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function VAR(){
      context.initializeBindings(ops[ip][0], stack[--sp], false);
      return cmds[++ip];
    }

    function WITH(){
      a = ToObject(GetValue(stack[--sp]));
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      context.pushWith(a);
      return cmds[++ip];
    }

    function ƒ(){
      for (var i = 0, entrypoint; entrypoint = code.entrances[i]; i++) {
        if (entrypoint.begin < ip && ip <= entrypoint.end) {
          if (entrypoint.type === ENTRY.ENV) {
            context.popBlock();
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
      var f = cmds[ip],
          realm = context.realm;

      while (f) {
        realm.emit('op', [ops[ip], stack[sp - 1]]);
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
      return Pause;
    }

    function run(ctx){
      context = ctx;
      if (context.realm.quiet) {
        execute = normalExecute;
      } else {
        execute = instrumentedExecute;
      }
      prepare();
      execute();
      return cleanup();
    }


    var completion, stack, ip, sp, error, a, b, c, d, ctx, context;

    var prepare = normalPrepare,
        execute = normalExecute,
        cleanup = normalCleanup;

    this.run = run;
    this.code = code;
    Emitter.call(this);
  }

  inherit(Thunk, Emitter, []);

  exports.Thunk = Thunk;
  return exports;
})(typeof module !== 'undefined' ? module.exports : {});
