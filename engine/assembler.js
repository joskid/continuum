var assembler = (function(exports){
  var utility   = require('./utility'),
      util      = require('util');

  var visit     = utility.visit,
      collector = utility.collector,
      Stack     = utility.Stack,
      define    = utility.define,
      assign    = utility.assign,
      create    = utility.create,
      copy      = utility.copy,
      parse     = utility.parse,
      decompile = utility.decompile,
      inherit   = utility.inherit,
      ownKeys   = utility.keys,
      isObject  = utility.isObject,
      quotes    = utility.quotes;

  var constants = require('./constants'),
      BINARYOPS = constants.BINARYOPS.hash,
      UNARYOPS  = constants.UNARYOPS.hash,
      ENTRY     = constants.ENTRY.hash,
      AST       = constants.AST,
      FUNCTYPE  = constants.FUNCTYPE.hash;

  var hasOwn = {}.hasOwnProperty;






  function parenter(node, parent){
    visit(node, function(node){
      if (isObject(node) && parent)
        define(node, 'parent', parent);
      return visit.RECURSE;
    });
  }

  function reinterpretNatives(node){
    visit(node, function(node){
      if (node.type === 'Identifier' && /^\$__/.test(node.name)) {
        node.type = 'NativeIdentifier';
        node.name = node.name.slice(3);
      } else {
        return visit.RECURSE;
      }
    });
  }


  var boundNamesCollector = collector({
    ObjectPattern      : visit.RECURSE,
    ArrayPattern       : visit.RECURSE,
    VariableDeclaration: visit.RECURSE,
    VariableDeclarator : visit.RECURSE,
    BlockStatement     : visit.RECURSE,
    Identifier         : ['name'],
    FunctionDeclaration: ['id', 'name'],
    ClassDeclaration   : ['id', 'name']
  });

  function BoundNames(node){
    var names = boundNamesCollector(node);
    if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
      return names.slice(1);
    } else if (node.type === 'FunctionExpression') {
      return node.id ? names.slice(1) : names;
    } else {
      return names;
    }
  }


  var LexicalDeclarations = (function(lexical){
    return collector({
      ClassDeclaration: lexical(false),
      FunctionDeclaration: lexical(false),
      SwitchCase: visit.RECURSE,
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

  function ReferencesSuper(node){
    var found = false;
    visit(node, function(node){
      switch (node.type) {
        case 'MemberExpression':
          if (isSuperReference(node.object)) {
            found = true;
            return visit.BREAK;
          }
        case 'CallExpression':
          if (isSuperReference(node.callee)) {
            found = true;
            return visit.BREAK;
          }
          break;
        case 'FunctionExpression':
        case 'FunctionDeclaration':
        case 'ArrowFunctionExpression':
          return visit.CONTINUE;
      }
      return visit.RECURSE;
    });
    return found;
  }

  function isUseStrictDirective(node){
    return node.type === 'ExpressionSatatement'
        && node.expression.type === 'Literal'
        && node.expression.value === 'use strict';
  }

  function isFunction(node){
    return node.type === 'FunctionDeclaration'
        || node.type === 'FunctionExpression'
        || node.type === 'ArrowFunctionExpression';
  }

  function isStrict(node){
    if (isFunction(node)) {
      node = node.body.body;
    } else if (node.type === 'Program') {
      node = node.body;
    }
    if (node instanceof Array) {
      for (var i=0, element;  element = node[i]; i++) {
        if (element) {
          if (isUseStrictDirective(element)) {
            return true;
          } else if (element.type !== 'EmptyStatement' && element.type !== 'FunctionDeclaration') {
            return false;
          }
        }
      }
    }
    return false;
  }

  function isPattern(node){
    return !!node && node.type === 'ObjectPattern' || node.type === 'ArrayPattern';
  }


  var collectExpectedArguments = collector({
    Identifier: true,
    ObjectPattern: true,
    ArrayPattern: true,
  });

  function Params(params, node, rest){
    this.length = 0;
    if (params) {
      [].push.apply(this, params);
    }
    this.Rest = rest;
    this.BoundNames = BoundNames(node);
    var args = collectExpectedArguments(this);
    this.ExpectedArgumentCount = args.length;
    this.ArgNames = [];
    for (var i=0; i < args.length; i++) {
      if (args[i].type === 'Identifier') {
        this.ArgNames.push(args[i].name);
      } else {

      }
    }
  }

  function Code(node, source, type, global, strict){

    function Instruction(args){
      Operation.apply(this, args);
    }

    inherit(Instruction, Operation, {
      code: this
    });

    this.topLevel = node.type === 'Program';
    var body = this.topLevel ? node : node.body;

    define(this, {
      body: body,
      source: source,
      LexicalDeclarations: LexicalDeclarations(body.body),
      createOperation: function(args){
        var op =  new Instruction(args);
        this.ops.push(op);
        return op;
      }
    });

    this.range = node.range;
    this.loc = node.loc;

    this.global = global;
    this.entrances = [];
    this.Type = type || FUNCTYPE.NORMAL;
    this.VarDeclaredNames = [];
    this.NeedsSuperBinding = ReferencesSuper(this.body);
    this.Strict = strict || isStrict(this.body);
    this.params = new Params(node.params, node, node.rest);
    this.ops = [];
    this.children = [];

  }

  define(Code.prototype, [
    function inherit(code){
      if (code) {
        this.identifiers = code.identifiers;
        this.hash = code.hash;
        this.natives = code.natives;
      }
    },
    function intern(name){
      return name;
      if (name in this.hash) {
        return this.hash[name];
      } else {
        var index = this.hash[name] = this.identifiers.length;
        this.identifiers[index] = name;
        return index;
      }
    },
    function lookup(id){
      return id;
      if (typeof id === 'number') {
        return this.identifiers[id];
      } else {
        return id;
      }
    }
  ]);

  var opcodes = 0;

  function OpCode(params, name){
    this.id = opcodes++;
    this.params = params;
    this.name = name;
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



  var ARRAY         = new OpCode(0, 'ARRAY'),
      ARG           = new OpCode(0, 'ARG'),
      ARGS          = new OpCode(0, 'ARGS'),
      ARRAY_DONE    = new OpCode(0, 'ARRAY_DONE'),
      BINARY        = new OpCode(1, 'BINARY'),
      BLOCK         = new OpCode(1, 'BLOCK'),
      CALL          = new OpCode(0, 'CALL'),
      CASE          = new OpCode(1, 'CASE'),
      CLASS_DECL    = new OpCode(1, 'CLASS_DECL'),
      CLASS_EXPR    = new OpCode(1, 'CLASS_EXPR'),
      COMPLETE      = new OpCode(0, 'COMPLETE'),
      CONST         = new OpCode(1, 'CONST'),
      CONSTRUCT     = new OpCode(0, 'CONSTRUCT'),
      DEBUGGER      = new OpCode(0, 'DEBUGGER'),
      DEFAULT       = new OpCode(1, 'DEFAULT'),
      DUP           = new OpCode(0, 'DUP'),
      ELEMENT       = new OpCode(0, 'ELEMENT'),
      ENUM          = new OpCode(0, 'ENUM'),
      FUNCTION      = new OpCode(2, 'FUNCTION'),
      GET           = new OpCode(0, 'GET'),
      IFEQ          = new OpCode(2, 'IFEQ'),
      IFNE          = new OpCode(2, 'IFNE'),
      INDEX         = new OpCode(2, 'INDEX'),
      JSR           = new OpCode(2, 'JSR'),
      JUMP          = new OpCode(1, 'JUMP'),
      LET           = new OpCode(1, 'LET'),
      LITERAL       = new OpCode(1, 'LITERAL'),
      MEMBER        = new OpCode(1, 'MEMBER'),
      METHOD        = new OpCode(3, 'METHOD'),
      NATIVE_CALL   = new OpCode(0, 'NATIVE_CALL'),
      NATIVE_REF    = new OpCode(1, 'NATIVE_REF'),
      NEXT          = new OpCode(1, 'NEXT'),
      OBJECT        = new OpCode(0, 'OBJECT'),
      POP           = new OpCode(0, 'POP'),
      POPN          = new OpCode(1, 'POPN'),
      PROPERTY      = new OpCode(1, 'PROPERTY'),
      PUT           = new OpCode(0, 'PUT'),
      REF           = new OpCode(1, 'REF'),
      REGEXP        = new OpCode(1, 'REGEXP'),
      RETURN        = new OpCode(0, 'RETURN'),
      ROTATE        = new OpCode(1, 'ROTATE'),
      RUN           = new OpCode(0, 'RUN'),
      SAVE          = new OpCode(0, 'SAVE'),
      SPREAD        = new OpCode(1, 'SPREAD'),
      SPREAD_ARG    = new OpCode(0, 'SPREAD_ARG'),
      STRING        = new OpCode(1, 'STRING'),
      SUPER_CALL    = new OpCode(0, 'SUPER_CALL'),
      SUPER_ELEMENT = new OpCode(0, 'SUPER_ELEMENT'),
      SUPER_MEMBER  = new OpCode(1, 'SUPER_MEMBER'),
      THIS          = new OpCode(0, 'THIS'),
      THROW         = new OpCode(1, 'THROW'),
      UNARY         = new OpCode(1, 'UNARY'),
      UNDEFINED     = new OpCode(0, 'UNDEFINED'),
      UPDATE        = new OpCode(1, 'UPDATE'),
      UPSCOPE       = new OpCode(0, 'UPSCOPE'),
      VAR           = new OpCode(1, 'VAR'),
      WITH          = new OpCode(0, 'WITH');




  function Operation(op, a, b, c, d){
    this.op = op;
    for (var i=0; i < op.params; i++) {
      this[i] = arguments[i + 1];
    }
  }


  define(Operation.prototype, [
    function inspect(){
      var out = [];
      for (var i=0; i < this.op.params; i++) {
        if (typeof this[i] === 'number') {
          var interned = this.code.lookup(this[i]);
          if (typeof interned === 'string') {
            out.push(interned)
          }
        } else {
          out.push(util.inspect(this[i]));
        }
      }

      return util.inspect(this.op)+'('+out.join(', ')+')';
    }
  ]);


  function ClassDefinition(node){
    this.name = node.id ? node.id.name : null;
    this.pattern = node.id;
    this.methods = [];

    for (var i=0, method; method = node.body.body[i]; i++) {
      var code = new Code(method.value, context.source, FUNCTYPE.METHOD, false, context.code.strict);
      code.name = method.key.name;
      context.pending.push(code);

      if (method.kind === '') {
        method.kind = 'method';
      }

      if (method.key.name === 'constructor') {
        this.ctor = code;
      } else {
        this.methods.push({
          kind: method.kind,
          code: code,
          name: method.key.name
        });
      }
    }

    if (node.superClass) {
      recurse(node.superClass);
      record(GET);
      this.superClass = node.superClass.name;
    }
  }


  function Unwinder(type, begin, end){
    this.type = type;
    this.begin = begin;
    this.end = end;
  }

  define(Unwinder.prototype, [
    function toJSON(){
      return [this.type, this.begin, this.end];
    }
  ]);



  function Entry(labels, level){
    this.labels = labels;
    this.level = level;
    this.breaks = [];
    this.continues = [];
  }

  define(Entry.prototype, {
    labels: null,
    breaks: null,
    continues: null,
    level: null
  })

  define(Entry.prototype, [
    function updateContinues(address){
      if (address !== undefined) {
        for (var i=0, item; item = this.breaks[i]; i++) {
          item.position = address;
        }
      }
    },
    function updateBreaks(address){
      if (address !== undefined) {
        for (var i=0, item; item = this.continues[i]; i++) {
          item.position = address;
        }
      }
    }
  ]);


  function AssemblerOptions(o){
    o = Object(o);
    for (var k in this)
      this[k] = k in o ? o[k] : this[k];
  }

  AssemblerOptions.prototype = {
    eval: false,
    normal: true,
    scoped: false,
    natives: false
  };



  var context;

  function Assembler(options){
    this.options = new AssemblerOptions(options);
  }

  define(Assembler.prototype, {
    source: null,
    node: null,
    code: null,
    pending: null,
    levels: null,
    jumps: null,
    labels: null,
  });

  define(Assembler.prototype, [
    function assemble(source){
      this.pending = new Stack;
      this.levels = new Stack;
      this.jumps = new Stack;
      this.labels = null;

      var node = parse(source);
      if (this.options.normal)
        node = node.body[0].expression;

      var type = this.options.eval ? 'eval' : this.options.normal ? 'function' : 'global';
      var code = new Code(node, source, type, !this.options.scoped);
      code.identifiers = [];
      code.hash = create(null);
      code.topLevel = true;

      if (this.options.natives) {
        code.natives = true;
        reinterpretNatives(node);
      }

      parenter(node);
      context = this;
      this.queue(code);

      while (this.pending.length) {
        var lastCode = this.code;
        this.code = this.pending.pop();
        if (lastCode) {
          this.code.inherit(lastCode);
        }
        recurse(this.code.body);
        if (this.code.eval || this.code.global){
          record(COMPLETE);
        } else {
          if (this.Type !== FUNCTYPE.ARROW) {
            record(UNDEFINED);
          }
          record(RETURN);
        }
      }

      return code;
    },
    function queue(code){
      if (this.code) {
        this.code.children.push(code);
      }
      this.pending.push(code);
    }
  ]);

  function recurse(node){
    if (node) {
      handlers[node.type](node);
    }
  }

  function intern(string){
    return string;
  }

  function record(){
    return context.code.createOperation(arguments);
  }

  function current(){
    return context.code.ops.length;
  }

  function last(){
    return context.code.ops[context.code.ops.length - 1];
  }

  function adjust(op){
    return op[0] = context.code.ops.length;
  }

  function block(callback){
    if (context.labels){
      var entry = new Entry(context.labels, context.levels.length);
      context.jumps.push(entry);
      context.labels = create(null);
      entry.updateBreaks(callback());
      context.jumps.pop();
    } else {
      callback();
    }
  }

  function entrance(callback){
    var entry = new Entry(context.labels, context.levels.length);
    context.jumps.push(entry);
    context.labels = create(null);
    entry.updateContinues(callback());
    entry.updateBreaks(current());
    context.jumps.pop();
  }

  function lexical(callback){
    var begin = current();
    callback();
    context.code.entrances.push(new Unwinder(ENTRY.ENV, begin, current()));
  }

  function move(node){
    if (node.label) {
      var entry = context.jumps.first(function(entry){
        return node.label.name in entry.labels;
      });
    } else {
      var entry = context.jumps.first(function(entry){
        return entry && entry.continues;
      });
    }

    var levels = {
      FINALLY: function(level){
        level.entries.push(record(JSR, 0, false));
      },
      WITH: function(){
        record(UPSCOPE);
      },
      SUBROUTINE: function(){
        record(POPN, 3);
      },
      FORIN: function(){
        entry.level + 1 !== len && record(POP);
      }
    };

    var min = entry ? entry.level : 0;
    for (var len = context.levels.length; len > min; --len){
      var level = context.levels[len - 1];
      levels[level.type](level);
    }
    return entry;
  }

  var elementAt = {
    elements: function(node, index){
      return node.elements[index];
    },
    properties: function(node, index){
      return node.properties[index].value;
    }
  };



  function destructure(left, right){
    var key = left.type === 'ArrayPattern' ? 'elements' : 'properties',
        lefts = left[key],
        right = right[key],
        binding, value;

    for (var i=0; i < lefts.length; i++) {
      binding = elementAt[key](left, i);
      value = right && right[i] ? elementAt[key](right, i) : binding;

      if (isPattern(binding)){
        destructure(binding, value);
      } else {
        if (binding.type === 'SpreadElement') {
          recurse(binding.argument);
          recurse(right);
          record(GET);
          record(SPREAD, i);
        } else {
          recurse(binding);
          recurse(right);
          record(GET);
          if (left.type === 'ArrayPattern') {
            record(LITERAL, i);
            record(ELEMENT, i);
          } else {
            record(MEMBER, binding.name)
          }
          record(GET);
        }
        record(PUT);
      }
    }
  }

  function args(node){
    record(ARGS);
    for (var i=0, item; item = node[i]; i++) {
      if (item && item.type === 'SpreadElement') {
        recurse(item.argument);
        record(GET);
        record(SPREAD_ARG);
      } else {
        recurse(item);
        record(GET);
        record(ARG);
      }
    }
  }



  function AssignmentExpression(node){
    if (node.operator === '='){
      if (isPattern(node.left)){
        destructure(node.left, node.right);
      } else {
        recurse(node.left);
        recurse(node.right);
        record(GET);
        record(PUT);
      }
    } else {
      recurse(node.left);
      record(DUP);
      record(GET);
      recurse(node.right);
      record(GET);
      record(BINARY, BINARYOPS[node.operator.slice(0, -1)]);
      record(PUT);
    }
  }

  function ArrayExpression(node){
    record(ARRAY);
    for (var i=0, item; i < node.elements.length; i++) {
      var empty = false,
          spread = false,
          item = node.elements[i];

      if (!item){
        empty = true;
      } else if (item.type === 'SpreadElement'){
        spread = true;
        recurse(item.argument);
      } else {
        recurse(item);
      }

      record(INDEX, empty, spread);
    }
    record(ARRAY_DONE);
  }

  function ArrayPattern(node){}

  function ArrowFunctionExpression(node){
    var code = new Code(node, context.code.source, FUNCTYPE.ARROW, false, context.code.strict);
    context.queue(code);
    record(FUNCTION, null, code);
  }

  function BinaryExpression(node){
    recurse(node.left);
    record(GET);
    recurse(node.right);
    record(GET);
    record(BINARY, BINARYOPS[node.operator]);
  }

  function BreakStatement(node){
    var entry = move(node);
    if (entry) {
      entry.breaks.push(record(JUMP, 0));
    }
  }

  function BlockStatement(node){
    block(function(){
      lexical(function(){
        record(BLOCK, { LexicalDeclarations: LexicalDeclarations(node.body) });

        for (var i=0, item; item = node.body[i]; i++) {
          recurse(item);
        }

        record(UPSCOPE);
      });
    });
  }

  function CallExpression(node){
    if (isSuperReference(node.callee)) {
      if (context.code.Type === 'global' || context.code.Type === 'eval' && context.code.global) {
        throwError('illegal_super');
      }
      record(SUPER_CALL);
    } else {
      recurse(node.callee);
    }
    record(DUP);
    record(GET);
    args(node.arguments);
    record(node.callee.type === 'NativeIdentifier' ? NATIVE_CALL : CALL);
  }

  function CatchClause(node){
    lexical(function(){
      var decls = LexicalDeclarations(node.body);
      decls.push({
        type: 'VariableDeclaration',
        kind: 'var',
        IsConstantDeclaration: false,
        BoundNames: [node.param.name],
        declarations: [{
          type: 'VariableDeclarator',
          id: node.param,
          init: undefined
        }]
      });
      record(BLOCK, { LexicalDeclarations: decls });
      recurse(node.param);
      record(GET);
      record(PUT);
      for (var i=0, item; item = node.body.body[i]; i++)
        recurse(item);

      record(UPSCOPE);
    });
  }

  function ClassBody(node){}

  function ClassDeclaration(node){
    record(CLASS_EXPR, new ClassDefinition(node));
  }

  function ClassExpression(node){
    record(CLASS_DECL, new ClassDefinition(node));
  }

  function ClassHeritage(node){}

  function ConditionalExpression(node){
    recurse(node.test);
    record(GET);
    var test = record(IFEQ, 0, false);
    recurse(node.consequent)
    record(GET);
    var alt = record(JUMP, 0);
    adjust(test);
    recurse(node.alternate);
    record(GET);
    adjust(alt)
  }

  function ContinueStatement(node){
    var entry = move(node);
    if (entry) {
      entry.continues.push(record(JUMP, 0));
    }
  }

  function DoWhileStatement(node){
    entrance(function(){
      var start = current();
      recurse(node.body);
      var cond = current();
      recurse(node.test);
      record(GET);
      record(IFEQ, start, true);
      return cond;
    });
  }

  function DebuggerStatement(node){
    record(DEBUGGER);
  }

  function EmptyStatement(node){}
  function ExportSpecifier(node){}
  function ExportSpecifierSet(node){}
  function ExportDeclaration(node){}

  function ExpressionStatement(node){
    recurse(node.expression);
    record(GET);
    if (context.code.eval || context.code.global) {
      record(SAVE)
    } else {
      record(POP);
    }
  }

  function ForStatement(node){
    entrance(function(){
      if (node.init){
        recurse(node.init);
        if (node.init.type !== 'VariableDeclaration') {
          record(GET);
          record(POP);
        }
      }

      var test = current();
      if (node.test) {
        recurse(node.test);
        record(GET);
        var op = record(IFEQ, 0, false);
      }
      var update = current();

      recurse(node.body);
      if (node.update) {
        recurse(node.update);
        record(GET);
        record(POP);
      }

      record(JUMP, test);
      adjust(op);
      return update;
    });
  }

  function ForInStatement(node){
    entrance(function(){
      recurse(node.left);
      record(REF, last()[0].name);
      recurse(node.right);
      record(GET);
      record(ENUM);
      var update = current();
      var op = record(NEXT);
      recurse(node.body);
      record(JUMP, update);
      adjust(op);
      return update;
    });
  }

  function ForOfStatement(node){
    entrance(function(){
      recurse(node.right);
      record(GET);
      record(MEMBER, intern('iterator'));
      record(GET);
      record(ARGS);
      record(CALL);
      record(ROTATE, 4);
      record(POPN, 3);
      var update = current();
      record(MEMBER, intern('next'));
      record(GET);
      record(ARGS);
      record(CALL);
      recurse(node.left);
      recurse(node.body);
      record(JUMP, update);
      adjust(op);
      record(POPN, 2);
      return update;
    });
  }

  function FunctionDeclaration(node){
    node.Code = new Code(node, context.code.source, FUNCTYPE.NORMAL, false, context.code.strict);
    context.queue(node.Code);
  }

  function FunctionExpression(node){
    var code = new Code(node, context.code.source, FUNCTYPE.NORMAL, false, context.code.strict);
    context.queue(code);
    record(FUNCTION, intern(node.id ? node.id.name : ''), code);
  }

  function Glob(node){}

  function Identifier(node){
    record(REF, intern(node.name));
  }

  function IfStatement(node){
    recurse(node.test);
    record(GET);
    var test = record(IFEQ, 0, false);
    recurse(node.consequent);

    if (node.alternate) {
      var alt = record(JUMP, 0);
      adjust(test);
      recurse(node.alternate);
      adjust(alt);
    } else {
      adjust(test);
    }
  }

  function ImportDeclaration(node){}

  function ImportSpecifier(spec){}

  function Literal(node){
    if (node.value instanceof RegExp) {
      record(REGEXP, node.value);
    } else if (typeof node.value === 'string') {
      record(STRING, intern(node.value));
    } else {
      record(LITERAL, node.value);
    }
  }

  function LabeledStatement(node){
    if (!context.labels){
      context.labels = create(null);
    } else if (label in context.labels) {
      throwError('duplicate_label');
    }
    context.labels[node.label.name] = true;
    recurse(node.body);
    context.labels = null;
  }

  function LogicalExpression(node){
    recurse(node.left);
    record(GET);
    var op = record(IFNE, 0, node.operator === '||');
    recurse(node.right);
    record(GET);
    adjust(op);
  }

  function MemberExpression(node){
    var isSuper = isSuperReference(node.object);
    if (isSuper){
      if (context.code.Type === 'global' || context.code.Type === 'eval' && context.code.global) {
        throwError('illegal_super_reference');
      }
    } else {
      recurse(node.object);
      record(GET);
    }

    if (node.computed){
      recurse(node.property);
      record(GET);
      record(isSuper ? SUPER_ELEMENT : ELEMENT);
    } else {
      record(isSuper ? SUPER_MEMBER : MEMBER, intern(node.property.name));
    }
  }
  function MethodDefinition(node){}

  function ModuleDeclaration(node){}

  function NativeIdentifier(node){
    record(NATIVE_REF, intern(node.name));
  }

  function NewExpression(node){
    recurse(node.callee);
    record(GET);
    args(node.arguments);
    record(CONSTRUCT);
  }

  function ObjectExpression(node){
    record(OBJECT);
    for (var i=0, item; item = node.properties[i]; i++) {
      recurse(item);
    }
  }

  function ObjectPattern(node){}

  function Path(){}

  function Program(node){
    for (var i=0, item; item = node.body[i]; i++)
      recurse(item);
  }

  function Property(node){
    if (node.kind === 'init'){
      recurse(node.value);
      record(GET);
      record(PROPERTY, intern(node.key.name));
    } else {
      var code = new Code(node.value, context.source, FUNCTYPE.NORMAL, false, context.code.strict);
      context.queue(code);
      record(METHOD, node.kind, code, intern(node.key.name));
    }
  }

  function ReturnStatement(node){
    if (node.argument){
      recurse(node.argument);
      record(GET);
    } else {
      record(UNDEFINED);
    }

    var levels = {
      FINALLY: function(level){
        level.entries.push(record(JSR, 0, true));
      },
      WITH: function(){
        record(UPSCOPE);
      },
      SUBROUTINE: function(){
        record(ROTATE, 4);
        record(POPN, 4);
      },
      FORIN: function(){
        record(ROTATE, 4);
        record(POP);
      }
    };

    for (var len = context.levels.length; len > 0; --len){
      var level = context.levels[len - 1];
      levels[level.type](level);
    }

    record(RETURN);
  }

  function SequenceExpression(node){
    for (var i=0, item; item = node.expressions[i]; i++) {
      recurse(item)
      record(GET);
      record(POP);
    }
    recurse(item);
    record(GET);
  }

  function SwitchStatement(node){
    entrance(function(){
      recurse(node.discriminant);
      record(GET);

      lexical(function(){
        record(BLOCK, { LexicalDeclarations: LexicalDeclarations(node.cases) });

        if (node.cases){
          var cases = [];
          for (var i=0, item; item = node.cases[i]; i++) {
            if (item.test){
              recurse(item.test);
              record(GET);
              cases.push(record(CASE, 0));
            } else {
              var defaultFound = i;
              cases.push(0);
            }
          }

          if (defaultFound != null){
            record(DEFAULT, cases[defaultFound]);
          } else {
            record(POP);
            var last = record(JUMP, 0);
          }

          for (var i=0, item; item = node.cases[i]; i++) {
            adjust(cases[i])
            for (var j=0, consequent; consequent = item.consequent[j]; j++)
              recurse(consequent);
          }

          if (last) {
            adjust(last);
          }
        } else {
          record(POP);
        }

        record(UPSCOPE);
      });
    });
  }

  function TemplateElement(node){}

  function TemplateLiteral(node){}

  function TaggedTemplateExpression(node){}

  function ThisExpression(node){
    record(THIS);
  }

  function ThrowStatement(node){
    recurse(node.argument);
    record(GET);
    record(THROW);
  }

  function TryStatement(node){
    lexical(TRYCATCH, function(){
      recurse(node.block);
    });
    var count = node.handlers.length,
        tryer = record(JUMP, 0),
        handlers = [tryer];

    for (var i=0; i < count; i++) {
      recurse(node.handlers[i]);
      if (i < count - 1) {
        handlers.push(record(JUMP, 0));
      }
    }

    while (i--) {
      adjust(handlers[i]);
    }

    if (node.finalizer) {
      recurse(node.finalizer);
    }
  }

  function UnaryExpression(node){
    recurse(node.argument);
    record(UNARY, UNARYOPS[node.operator]);
  }

  function UpdateExpression(node){
    recurse(node.argument);
    record(UPDATE, !!node.prefix | ((node.operator === '++') << 1));
  }

  function VariableDeclaration(node){
    var op = {
      'var': VAR,
      'const': CONST,
      'let': LET
    }[node.kind];

    for (var i=0, item; item = node.declarations[i]; i++) {
      if (item.init) {
        recurse(item.init);
        record(GET);
      } else if (item.kind === 'let') {
        record(UNDEFINED);
      }

      record(op, item.id);

      if (node.kind === 'var') {
        context.code.VarDeclaredNames.push(item.id.name);
      }
    }
  }

  function VariableDeclarator(node){}

  function WhileStatement(node){
    entrance(function(update){
      var start = current();
      recurse(node.test);
      record(GET);
      var op = record(IFEQ, 0, false)
      recurse(node.body);
      record(JUMP, start);
      adjust(op);
      return start;
    });
  }

  function WithStatement(node){
    recurse(node.object)
    lexical(function(){
      record(WITH);
      recurse(node.body);
      record(UPSCOPE);
    });
  }

  function YieldExpression(node){}

  var handlers = {};

  [ ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression,
    BinaryExpression, BlockStatement, BreakStatement, CallExpression,
    CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassHeritage,
    ConditionalExpression, DebuggerStatement, DoWhileStatement, EmptyStatement,
    ExportDeclaration, ExportSpecifier, ExportSpecifierSet, ExpressionStatement,
    ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration,
    FunctionExpression, Glob, Identifier, IfStatement, ImportDeclaration,
    ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression,
    MethodDefinition, ModuleDeclaration, NativeIdentifier, NewExpression, ObjectExpression,
    ObjectPattern, Path, Program, Property, ReturnStatement, SequenceExpression, SwitchStatement,
    TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression,
    ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration,
    VariableDeclarator, WhileStatement, WithStatement, YieldExpression].forEach(function(handler){
      handlers[utility.fname(handler)] = handler;
    });


  function assemble(code, options){
    var assembler = new Assembler(assign({ normal: false }, options));
    return assembler.assemble(code);
  }

  exports.assemble = assemble;
  return exports;
})(typeof module !== 'undefined' ? module.exports : {});
