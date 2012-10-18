var utility   = require('./utility'),
    util      = require('util');

var Visitor = utility.Visitor,
    Collector = utility.Collector,
    define = utility.define,
    parse = utility.parse,
    decompile = utility.decompile,
    inherit = utility.inherit,
    isObject = utility.isObject,
    quotes = utility.quotes;



function parenter(node){
  new Visitor(node, function(node, parent){
    if (isObject(node) && parent)
      define(node, 'parent', parent);
    return Visitor.RECURSE;
  }).next();
}


var BoundNames = new Collector({
  ObjectPattern      : Visitor.RECURSE,
  ArrayPattern       : Visitor.RECURSE,
  VariableDeclaration: Visitor.RECURSE,
  VariableDeclarator : Visitor.RECURSE,
  BlockStatement     : Visitor.RECURSE,
  Property           : ['key', 'name'],
  Identifier         : ['name'],
  FunctionDeclaration: ['id', 'name'],
  ClassDeclaration   : ['id', 'name']
});


var collectExpectedArguments = new Collector({
  Identifier: ['name'],
  ObjectPattern: ['properties'],
  ArrayPattern: ['items'],
})

function ExpectedArgumentCount(args){
  return collectExpectedArguments(args).length;
}

var LexicalDeclarations = (function(lexical){
  return new Collector({
    ClassDeclaration: lexical(true),
    FunctionDeclaration: lexical(false),
    SwitchCase: Visitor.RECURSE,
    VariableDeclaration: lexical(function(node){
      return node.kind === 'const';
    }),
  });
})(function(isConst){
  if (typeof isConst !== 'function') {
    isConst = (function(v){
      return function(){ return v };
    })(isConst);
  }
  return function(node){
    node.IsConstantDeclaration = isConst(node);
    node.BoundNames = BoundNames(node);
    return node;
  };
});


function isSuperReference(node) {
  return !!node && node.type === 'Identifier' && node.name === 'super';
}

function ReferencesSuper(node, parent){
  var found = false;
  Visitor.visit(node, function(node, parent){
    if (!node) return Visitor.CONTINUE;
    switch (node.type) {
      case 'MemberExpression':
        if (isSuperReference(node.object)) {
          found = true;
          return Visitor.BREAK;
        }
      case 'CallExpression':
        if (isSuperReference(node.callee)) {
          found = true;
          return Visitor.BREAK;
        }
        break;
      case 'FunctionExpression':
      case 'FunctionDeclaration':
      case 'ArrowFunctionExpression':
        return Visitor.CONTINUE;
    }
    return Visitor.RECURSE;
  });
  return found;
}



function Code(node, source, type, isGlobal){
  var body = node.type === 'Program' ? node : node.body;
  define(this, {
    body: body,
    source: source,
    LexicalDeclarations: LexicalDeclarations(node)
  });
  this.handlers = [];
  this.Type = type || 'Normal';
  this.VarDeclaredNames = [];
  this.NeedsSuperBinding = ReferencesSuper(this.body);
  this.params = node.params || [];
  this.params.BoundNames = BoundNames(node);
  this.params.ExpectedArgumentCount = ExpectedArgumentCount(this.params);
  this.ops = [];
  this.children = [];
}



function OpCode(id, name){
  this.id = id;
  this.name = name;
  this.props = Object.create(null);
}

define(OpCode.prototype, [
  function inspect(){
    return this.name;
  },
  function toString(){
    return this.name
  },
  function valueOf(){
    return this.id;
  },
  function toJSON(){
    return this.id;
  }
]);


function Operation(op, o){
  this.op = op;

  if (o) {
    for (var k in o) {
      this[k] = o[k];
      if (k !== 'LexicalDeclarations' && k !== 'code')
        op.props[k] = true;
    }
  }
}

define(Operation.prototype, [
  function inspect(){
    var obj = {},
        i = 0,
        val = '';

    for (var k in this.op.props) {
      if (k in this) {
        i++;
        obj[k] = this[k];
      }
    }

    if (i === 1) {
      val = typeof this[k] === 'string' ? quotes(this[k]) : this[k];
    } else if (i > 1) {
      val = util.inspect(obj);
    }

    return util.inspect(this.op)+'('+val+')';
  }
]);


var ARRAY         = new OpCode( 0, 'ARRAY'),
    ARRAY_DONE    = new OpCode( 1, 'ARRAY_DONE'),
    BINARY        = new OpCode( 2, 'BINARY'),
    BLOCK         = new OpCode( 3, 'BLOCK'),
    BLOCK_EXIT    = new OpCode( 4, 'BLOCK_EXIT'),
    CALL          = new OpCode( 5, 'CALL'),
    CASE          = new OpCode( 6, 'CASE'),
    CLASS_DECL    = new OpCode( 7, 'CLASS_DECL'),
    CLASS_EXPR    = new OpCode( 8, 'CLASS_EXPR'),
    CONST         = new OpCode( 9, 'CONST'),
    CONSTRUCT     = new OpCode(10, 'CONSTRUCT'),
    DEBUGGER      = new OpCode(11, 'DEBUGGER'),
    DEFAULT       = new OpCode(12, 'DEFAULT'),
    DUP           = new OpCode(13, 'DUP'),
    ELEMENT       = new OpCode(14, 'ELEMENT'),
    FUNCTION      = new OpCode(15, 'FUNCTION'),
    GET           = new OpCode(16, 'GET'),
    IFEQ          = new OpCode(17, 'IFEQ'),
    IFNE          = new OpCode(18, 'IFNE'),
    INDEX         = new OpCode(19, 'INDEX'),
    JSR           = new OpCode(20, 'JSR'),
    JUMP          = new OpCode(21, 'JUMP'),
    LET           = new OpCode(22, 'LET'),
    LITERAL       = new OpCode(23, 'LITERAL'),
    MEMBER        = new OpCode(24, 'MEMBER'),
    METHOD        = new OpCode(25, 'METHOD'),
    OBJECT        = new OpCode(26, 'OBJECT'),
    POP           = new OpCode(27, 'POP'),
    POP_EVAL      = new OpCode(28, 'POP_EVAL'),
    POPN          = new OpCode(29, 'POPN'),
    PROPERTY      = new OpCode(30, 'PROPERTY'),
    PUT           = new OpCode(31, 'PUT'),
    REGEXP        = new OpCode(32, 'REGEXP'),
    RESOLVE       = new OpCode(33, 'RESOLVE'),
    RETURN        = new OpCode(34, 'RETURN'),
    RETURN_EVAL   = new OpCode(35, 'RETURN_EVAL'),
    ROTATE        = new OpCode(36, 'ROTATE'),
    SUPER_CALL    = new OpCode(37, 'SUPER_CALL'),
    SUPER_ELEMENT = new OpCode(38, 'SUPER_ELEMENT'),
    SUPER_GUARD   = new OpCode(39, 'SUPER_GUARD'),
    SUPER_MEMBER  = new OpCode(40, 'SUPER_MEMBER'),
    THIS          = new OpCode(41, 'THIS'),
    THROW         = new OpCode(42, 'THROW'),
    UNARY         = new OpCode(43, 'UNARY'),
    UNDEFINED     = new OpCode(44, 'UNDEFINED'),
    UPDATE        = new OpCode(45, 'UPDATE'),
    VAR           = new OpCode(46, 'VAR'),
    WITH          = new OpCode(47, 'WITH');








function Handler(type, begin, end){
  this.type = type;
  this.begin = begin;
  this.end = end;
}

var ENV = 'ENV',
    FINALLY = 'FINALLY',
    CATCH = 'CATCH';




function Stack(){
  this.empty();
  for (var k in arguments)
    this.record(arguments[k]);
}

define(Stack.prototype, [
  function push(item){
    this.items.push(item);
    this.length++;
    this.top = item;
    return this;
  },
  function pop(){
    this.length--;
    this.top = this.items[this.length - 1];
    return this.items.pop();
  },
  function empty(){
    this.length = 0;
    this.items = [];
    this.top = undefined;
  },
  function first(callback, context){
    var i = this.length;
    context || (context = this);
    while (i--)
      if (callback.call(context, this[i], i, this))
        return this[i];
  },
  function filter(callback, context){
    var i = this.length,
        out = new Stack;
    context || (context = this);

    for (var i=0; i < this.length; i++)
      if (callback.call(context, this[i], i, this))
        out.push(this[i]);

    return out;
  }
]);










function CompilerOptions(o){
  o = Object(o);
  for (var k in this)
    this[k] = k in o ? o[k] : this[k];
}

CompilerOptions.prototype = {
  eval: false,
  function: true,
  scoped: false
};



function Compiler(options){
  this.options = new CompilerOptions(options);
}

define(Compiler.prototype, {
  source: null,
  node: null,
  code: null,
  strict: null,
  pending: null,
  levelStack: null,
  jumpStack: null,
  labelSet: null,
});

define(Compiler.prototype, [
  function compile(source){
    this.pending = new Stack;
    this.levelStack = new Stack;
    this.jumpStack = new Stack;
    this.labelSet = null;

    var node = parse(source);
    if (this.options.function)
      node = node.body[0].expression;


    var type = this.options.eval ? 'eval' : this.options.function ? 'function' : 'global';
    var code = new Code(node, source, type, !this.options.scoped);

    this.queue(code);
    parenter(node);

    while (this.pending.length) {
      this.code = this.pending.pop();
      this.visit(this.code.body);
      if (this.code.eval){
        this.record(RETURN_EVAL);
      } else {
        this.record(UNDEFINED);
        this.record(RETURN);
      }
    }

    return code;
  },
  function queue(code){
    if (this.code)
      this.code.children.push(code);
    this.pending.push(code);
  },
  function visit(node){
    if (node) {
      this[node.type](node);
    }
    return this;
  },
  function visitGet(node, parent){
    if (node) this[node.type](node);
    return this.record(GET);
  },
  function record(code, options){
    var op = new Operation(code, options);
    this.code.ops.push(op);
    return op;
  },
  function current(){
    return this.code.ops.length;
  },

  function pop(number){
    if (number === 1)
      return this.record(POP);
    else
      return this.record(POPN, { number: number });
  },
  function binary(type, operator){
    return this.record(BINARY, { operator: operator });
  },
  function rotate(number){
    return this.record(ROTATE, { number: number });
  },
  function jump(position){
    return this.record(JUMP, { position: position });
  },
  function ifEqual(position, test){
    return this.record(IFEQ, { test: test, position: position });
  },
  function ifNotEqual(position, test){
    return this.record(IFNE, { test: test, position: position });
  },
  function jumpToSub(position, returns){
    return this.record(JSR, { returns: returns, position: position })
  },
  function createFunction(name, code){
    return this.record(FUNCTION, { name: name ? name.name : name, code: code });
  },

  function withBreakBlock(func){
    if (this.labelSet){
      var entry = {
        labels: this.labelSet,
        breaks: [],
        continues: null,
        level: this.levelStack.length
      };
      this.jumpStack.push(entry);
      this.labelSet = Object.create(null);
      func.call(this, function(b){
        for (var i=0, item; item = entry.breaks[i]; i++)
          item.position = b;
      });
      this.jumpStack.pop();
    } else {
      func.call(this, function(){});
    }
  },
  function withBreak(func){
    var entry = {
      labels: this.labelSet,
      breaks: [],
      continues: null,
      level: this.levelStack.length
    };
    this.jumpStack.push(entry);
    this.labelSet = Object.create(null);
    func.call(this, function (b, c){
      for (var i=0, item; item = entry.breaks[i]; i++)
        item.position = b;
    });
    this.jumpStack.pop();
  },

  function withContinue(func){
    var entry = {
      labels: this.labelSet,
      breaks: [],
      continues: [],
      level: this.levelStack.length
    };
    this.jumpStack.push(entry);
    this.labelSet = Object.create(null);
    func.call(this, function(b, c){
      for (var i=0, item; item = entry.breaks[i]; i++)
        item.position = b;

      for (var i=0, item; item = entry.continues[i]; i++)
        item.position = c;
    });
    this.jumpStack.pop();
  },
  function addEnvironmentHandler(func){
    var begin = this.current();
    func.call(this);
    var end = this.current();
    this.code.handlers.push(new Handler(ENV, begin, end));
  },
  function move(node, parent){
    if (node.label) {
      var entry = this.jumpStack.first(function(entry){
        return node.label.name in entry.labels;
      });
    } else {
      var entry = this.jumpStack.first(function(entry){
        return entry && entry.continues;
      });
    }

    var levels = {
      FINALLY: function(level){
        level.entries.push(this.jumpToSub(0, false));
      },
      WITH: function(){
        this.record(BLOCK_EXIT);
      },
      SUBROUTINE: function(){
        this.pop(3);
      },
      FORIN: function(){
        entry.level + 1 !== len && this.pop(1);
      }
    };

    var min = entry ? entry.level : 0;
    for (var len = this.levelStack.length; len > min; --len){
      var level = this.levelStack[len - 1];
      levels[level.type].call(this, level);
    }

    return entry;
  },
  function AssignmentExpression(node, parent){
    if (node.operator === '='){
      if (node.left.type === 'ObjectPattern' || node.left.type === 'ArrayPattern'){
        this.destructure(node);
      } else {
        this.visit(node.left)
        this.visitGet(node.right)
        this.record(PUT);
      }
    } else {
      this.BinaryExpression(node);
      this.record(PUT);
    }
  },
  function ArrayExpression(node, parent){
    this.record(ARRAY);
    for (var i=0, item; i < node.elements.length; i++) {
      var props = {},
          item = node.elements[i];

      if (!item){
        props.empty = true;
      } else if (item.type === 'SpreadElement'){
        props.spread = true;
        this.visit(item.argument);
      } else {
        this.visit(item);
      }

      this.record(INDEX, props);
    }

    this.record(ARRAY_DONE);
  },
  function ArrowFunctionExpression(node, parent){
    var code = new Code(node, this.code.source, 'Arrow', false);
    this.queue(code);
    this.createFunction(null, code);
  },
  function BinaryExpression(node, parent){
    this.visit(node.left);
    if (node.type === 'AssignmentExpression')
      this.record(DUP);
    this.record(GET);
    this.visitGet(node.right);
    this.record(BINARY, { operator: node.operator });
  },
  function BreakStatement(node, parent){
    var entry = this.move(node);
    if (entry)
      entry.breaks.push(this.jump(0));
  },
  function BlockStatement(node, parent){
    this.withBreakBlock(function(patch){
      this.addEnvironmentHandler(function(){
        this.record(BLOCK, {
          LexicalDeclarations: LexicalDeclarations(node.body)
        });

        for (var i=0, item; item = node.body[i]; i++)
          this.visit(item);

        this.record(BLOCK_EXIT);
      });
      patch(this.current());
    });
  },
  function CallExpression(node, parent){
    if (0&&isResetExpression(node)) {
      this.ResetExpression(makeResetExpression(node));
    } else {
      if (isSuperReference(node.callee)) {
        if (this.code.Type === 'global' || this.code.Type === 'eval' && this.code.isGlobal)
          throw new Error('11.2.4 early error');
        this.record(SUPER_CALL);
      } else {
        this.visit(node.callee);
      }
      this.record(DUP);
      this.record(GET);

      for (var i=0, item; item = node.arguments[i]; i++)
        this.visitGet(item);

      this.record(CALL, { args: node.arguments.length });
    }
  },
  function CatchClause(node, parent){},
  function ClassDeclaration(node, parent){
    var name = node.id ? node.id.name : null,
        methods = [],
        ctor;

    for (var i=0, method; method = node.body.body[i]; i++) {
      var code = new Code(method.value, this.source, 'Method', false);
      code.name = name;
      this.pending.push(code);

      if (method.kind === '') {
        code.Strict = true;
        method.kind = 'method';
      }

      // TODO add super check

      if (method.key.name === 'constructor') {
        ctor = code;
      } else {
        methods.push({
          kind: kind,
          code: code,
          name: method.key.name
        });
      }
    }

    if (node.superClass) {
      this.visitGet(node.superClass);
    }

    this.record(node.type === 'ClassExpression' ? CLASS_EXPR : CLASS_DECL, {
      name: name,
      inherits: node.superClass ? node.superClass.name : null,
      constructor: ctor,
      methods: methods
    });
  },
  function ClassExpression(node, parent){
    this.ClassDeclaration(node);
  },
  function ConditionalExpression(node, parent){
    this.visitGet(node.test);
    var instr1 = this.ifEqual(0, false);
    this.visitGet(node.consequent)
    var instr2 = this.jump(0);
    instr1.position = this.current();
    instr2.position = this.visitGet(node.alternate);
  },
  function ContinueStatement(node, parent){
    var entry = this.move(node);
    if (entry)
      entry.continues.push(this.jump(0));
  },
  function DoWhileStatement(node, parent){
    this.withContinue(function(patch){
      var start = this.current();
      this.visit(node.body);
      var cond = this.current();
      this.visitGet(node.test)
      this.ifEqual(start, true);
      patch(this.current(), cond);
    });
  },
  function DebuggerStatement(node, parent){
    this.record(DEBUGGER);
  },
  function EmptyStatement(node, parent){},
  function ExportSpecifier(node, parent){},
  function ExportSpecifierSet(node, parent){},
  function ExportDeclaration(node, parent){},
  function ExpressionStatement(node, parent){
    this.visitGet(node.expression);
    this.code.eval ? this.record(POP_EVAL) : this.pop(1);
  },
  function ForStatement(node, parent){
    this.withContinue(function(patch){
      if (node.init){
        this.visit(node.init);
        if (node.init.type !== 'VariableDeclaration') {
          this.record(GET);
          this.pop(1);
        }
      }

      var cond = this.current();
      if (node.test) {
        this.visitGet(node.test);
        var instr = this.ifEqual(0, false);
      }

      this.visit(node.body);
      var update = this.current();
      if (node.update) {
        this.visitGet(node.update);
        this.pop(1);
      }

      this.jump(cond);
      patch(instr.position = this.current(), update);
    });
  },
  function ForInStatement(node, parent){

  },
  function ForOfStatement(node, parent){},
  function FunctionDeclaration(node, parent){
    this.queue(new Code(node, this.code.source, 'Normal', false));
  },
  function FunctionExpression(node, parent){
    var code = new Code(node, this.code.source, 'Normal', false);
    this.queue(code);
    this.createFunction(node.id || { name: '' }, code);
  },
  function Identifier(node, parent){
    this.record(RESOLVE, { name: node.name });
  },
  function IfStatement(node, parent){
    this.visitGet(node.test);
    var instr = this.ifEqual(0, false);
    this.visit(node.consequent);
    instr.position = this.current();

    if (node.alternate) {
      instr = this.jump(0);
      this.visit(node.alternate);
      instr.position = this.current();
    }
  },
  function ImportDeclaration(node, parent){},
  function ImportSpecifier(spec){},
  function Literal(node, parent){
    var type = node.value instanceof RegExp ? REGEXP : LITERAL;
    this.record(type, { value: node.value });
  },
  function LabeledStatement(node, parent){
    if (!this.labelSet){
      this.labelSet = Object.create(null);
    } else if (label in this.labelSet) {
      throw new SyntaxError('duplicate label');
    }
    this.labelSet[node.label.name] = true;
    this.visit(node.body);
    this.labelSet = null;
  },
  function LogicalExpression(node, parent){
    this.visitGet(node.left);
    this.ifNotEqual(0, node.operator === '||');
    var instr = this.current();
    this.visitGet(node.right);
    instr.position = this.current();
  },
  function MemberExpression(node, parent){
    var isSuper = isSuperReference(node.object);
    if (isSuper){
      if (this.code.Type === 'global' || this.code.Type === 'eval' && this.code.isGlobal)
        throw new Error('Illegal super reference');
      this.record(SUPER_GUARD);
    } else {
      this.visitGet(node.object);
    }

    if (node.computed){
      this.visitGet(node.property)
      this.record(isSuper ? SUPER_ELEMENT : ELEMENT);
    } else {
      this.record(isSuper ? SUPER_MEMBER : MEMBER, { name: node.property.name});
    }
  },
  function ModuleDeclaration(node, parent){ },
  function NewExpression(node, parent){
    this.visitGet(node.callee);
    for (var i=0, item; item = node.arguments[i]; i++) {
      this.visitGet(item);
    }
    this.record(CONSTRUCT, { args: i });
  },
  function ObjectExpression(node, parent){
    this.record(OBJECT);
    for (var i=0, item; item = node.properties[i]; i++)
      this.visit(item);
  },
  function Program(node, parent){
    for (var i=0, item; item = node.body[i]; i++)
      this.visit(item);
  },
  function Property(property){
    if (property.kind === 'init'){
      this.visitGet(property.value)
      this.record(PROPERTY, { name: property.key.name });
    } else {
      var code = new Code(property.value, this.source, 'Method');
      this.queue(code);

      if (property.kind === 'method')
        code.Strict = true;

      if (code.NeedsSuperBinding)
        throw new Error('ReferencesSuper MethodDefinition is true');

      this.record(METHOD, { kind: kind, code: code, name: property.key.name });
    }
  },
  function ReturnStatement(node, parent){
    if (node.argument){
      this.visitGet(node.argument);
    } else {
      this.record(UNDEFINED);
    }

    var levels = {
      FINALLY: function(level){
        level.entries.push(this.jumpToSub(0, true));
      },
      WITH: function(){
        this.record(BLOCK_EXIT);
      },
      SUBROUTINE: function(){
        this.rotate(4);
        this.pop(4);
      },
      FORIN: function(){
        this.rotate(2);
        this.pop(1);
      }
    };

    for (var len = this.levelStack.length; len > 0; --len){
      var level = this.levelStack[len - 1];
      levels[level.type].call(this, level);
    }

    this.record(RETURN);
  },
  function SequenceExpression(node, parent){
    for (var i=0, item; item = node.expressions[i]; i++) {
      this.visitGet(item)
      this.pop(1);
    }
    this.visitGet(item)
  },
  function SwitchStatement(node, parent){
    this.withBreak(function(patch){
      this.visitGet(node.discriminant);

      this.addEnvironmentHandler(function (){
        this.record(BLOCK, {
          LexicalDeclarations: LexicalDeclarations(node.cases)
        });

        if (node.cases){
          var cases = [];
          for (var i=0, item; item = node.cases[i]; i++) {
            if (item.test){
              this.visitGet(item.test);
              cases.push(this.record(CASE, { position: 0 }));
            } else {
              var defaultFound = i;
              cases.push({ position: 0 });
            }

          }

          if (defaultFound != null){
            this.record(DEFAULT, cases[defaultFound]);
          } else {
            this.pop(1);
            var last = this.jump(0);
          }

          for (var i=0, item; item = node.cases[i]; i++) {
            cases[i].position = this.current();
            for (var j=0, consequent; consequent = item.consequent[j]; j++)
              this.visit(consequent);
          }

          if (last)
            last.position = this.current();
        } else {
          this.pop(1);
        }

        this.record(BLOCK_EXIT);
      });
      patch(this.current());
    });
  },
  function ThisExpression(node, parent){
    this.record(THIS);
  },
  function ThrowStatement(node, parent){
    this.visitGet(node.argument);
    this.record(THROW);
  },
  function TryStatement(node, parent){
  },
  function UnaryExpression(node, parent){
    this.visit(node.argument);
    this.record(UNARY, { operator: node.operator });
  },
  function UpdateExpression(node, parent){
    this.visit(node.argument);
    this.record(UPDATE, { prefix: !!node.prefix, increment: node.operator === '++' });
  },
  function VariableDeclaration(node, parent){
    var op = {
      var: VAR,
      const: CONST,
      let: LET
    }[node.kind];

    for (var i=0, item; item = node.declarations[i]; i++) {
      if (item.init)
        this.visitGet(item.init);
      else if (item.kind === 'let')
        this.record(UNDEFINED);

      this.record(op, { name: item.id.name });

      if (node.kind === 'var')
        this.code.VarDeclaredNames.push(item.id.name);
    }
  },
  function VariableDeclarator(node, parent){
    UNREACHABLE();
  },
  function WhileStatement(node, parent){
    this.withContinue(function(patch){
      var start = this.current();
      this.visitGet(node.test)
      var instr = this.ifEqual(0, false)
      this.visit(node.body);
      this.jump(start);
      patch(instr.position = this.current(), start);
    });
  },
  function WithStatement(node, parent){
    this.visit(node.object)
    this.addEnvironmentHandler(function(){
      this.record(WITH);
      this.visit(node.body);
      this.record(BLOCK_EXIT);
    });
  }
]);



function compile(code){
  var compiler = new Compiler({ function: false });
  return compiler.compile(code);
}


module.exports = compile;

//inspect(test.compile('var k = reset(()=> shift(k => k) * 2);'));
//inspect(test.compile('function k(shift){ return 2 * shift }'));


//inspect(test.compile('class Test extends T { constructor(){ super() } }'));
// 'reset(() => {\n'+
// '  console.log(1);\n'+
// '  shift(cont => {\n'+
// '    cont();\n'+
// '    cont();\n'+
// '    console.log(2);\n'+
// '  });\n'+
// '  console.log(3);\n'+
// '});\n'));
//prints: 1 3 3 2


