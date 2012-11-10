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
      decompile = utility.decompile,
      inherit   = utility.inherit,
      ownKeys   = utility.keys,
      isObject  = utility.isObject,
      iterate   = utility.iterate,
      each      = utility.each,
      repeat    = utility.repeat,
      map       = utility.map,
      fold      = utility.fold,
      generate  = utility.generate,
      quotes    = utility.quotes;

  var constants = require('./constants'),
      BINARYOPS = constants.BINARYOPS.hash,
      UNARYOPS  = constants.UNARYOPS.hash,
      ENTRY     = constants.ENTRY.hash,
      SCOPE     = constants.SCOPE.hash,
      AST       = constants.AST,
      FUNCTYPE  = constants.FUNCTYPE.hash;

  var hasOwn = {}.hasOwnProperty,
      push = [].push;

  var context;

  var opcodes = 0;

  function StandardOpCode(params, name){
    var opcode = this;
    var func = this.creator();
    this.id = func.id = opcodes++;
    this.params = func.params = params;
    this.name = func.opname = name;
    return func;
  }

  define(StandardOpCode.prototype, [
    function creator(){
      var opcode = this;
      return function(){
        return context.code.createDirective(opcode, arguments);
      };
    },
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


  function InternedOpCode(params, name){
    return StandardOpCode.call(this, params, name);
  }

  inherit(InternedOpCode, StandardOpCode, [
    function creator(){
      var opcode = this;
      return function(arg){
        //return context.code.createDirective(opcode, [context.intern(arg)]);
        return context.code.createDirective(opcode, [arg]);
      };
    }
  ]);



  var ARRAY            = new StandardOpCode(0, 'ARRAY'),
      ARG              = new StandardOpCode(0, 'ARG'),
      ARGS             = new StandardOpCode(0, 'ARGS'),
      ARRAY_DONE       = new StandardOpCode(0, 'ARRAY_DONE'),
      BINARY           = new StandardOpCode(1, 'BINARY'),
      BLOCK            = new StandardOpCode(1, 'BLOCK'),
      CALL             = new StandardOpCode(0, 'CALL'),
      CASE             = new StandardOpCode(1, 'CASE'),
      CLASS_DECL       = new StandardOpCode(1, 'CLASS_DECL'),
      CLASS_EXPR       = new StandardOpCode(1, 'CLASS_EXPR'),
      COMPLETE         = new StandardOpCode(0, 'COMPLETE'),
      CONST            = new StandardOpCode(1, 'CONST'),
      CONSTRUCT        = new StandardOpCode(0, 'CONSTRUCT'),
      DEBUGGER         = new StandardOpCode(0, 'DEBUGGER'),
      DEFAULT          = new StandardOpCode(1, 'DEFAULT'),
      DEFINE           = new StandardOpCode(1, 'DEFINE'),
      DUP              = new StandardOpCode(0, 'DUP'),
      ELEMENT          = new StandardOpCode(0, 'ELEMENT'),
      ENUM             = new StandardOpCode(0, 'ENUM'),
      EXTENSIBLE       = new StandardOpCode(1, 'EXTENSIBLE'),
      FLIP             = new StandardOpCode(1, 'FLIP'),
      FUNCTION         = new StandardOpCode(2, 'FUNCTION'),
      GET              = new StandardOpCode(0, 'GET'),
      IFEQ             = new StandardOpCode(2, 'IFEQ'),
      IFNE             = new StandardOpCode(2, 'IFNE'),
      INC              = new StandardOpCode(0, 'INC'),
      INDEX            = new StandardOpCode(2, 'INDEX'),
      ITERATE          = new StandardOpCode(0, 'ITERATE'),
      JUMP             = new StandardOpCode(1, 'JUMP'),
      LET              = new StandardOpCode(1, 'LET'),
      LITERAL          = new StandardOpCode(1, 'LITERAL'),
      LOG              = new StandardOpCode(0, 'LOG'),
      MEMBER           = new InternedOpCode(1, 'MEMBER'),
      METHOD           = new StandardOpCode(3, 'METHOD'),
      NATIVE_CALL      = new StandardOpCode(0, 'NATIVE_CALL'),
      NATIVE_REF       = new InternedOpCode(1, 'NATIVE_REF'),
      OBJECT           = new StandardOpCode(0, 'OBJECT'),
      POP              = new StandardOpCode(0, 'POP'),
      POPN             = new StandardOpCode(1, 'POPN'),
      PROPERTY         = new InternedOpCode(1, 'PROPERTY'),
      PUT              = new StandardOpCode(0, 'PUT'),
      REF              = new InternedOpCode(1, 'REF'),
      REGEXP           = new StandardOpCode(1, 'REGEXP'),
      RETURN           = new StandardOpCode(0, 'RETURN'),
      ROTATE           = new StandardOpCode(1, 'ROTATE'),
      RUN              = new StandardOpCode(0, 'RUN'),
      SAVE             = new StandardOpCode(0, 'SAVE'),
      SPREAD           = new StandardOpCode(1, 'SPREAD'),
      SPREAD_ARG       = new StandardOpCode(0, 'SPREAD_ARG'),
      STRING           = new InternedOpCode(1, 'STRING'),
      SUPER_CALL       = new StandardOpCode(0, 'SUPER_CALL'),
      SUPER_ELEMENT    = new StandardOpCode(0, 'SUPER_ELEMENT'),
      SUPER_MEMBER     = new StandardOpCode(1, 'SUPER_MEMBER'),
      TEMPLATE         = new StandardOpCode(1, 'TEMPLATE'),
      THIS             = new StandardOpCode(0, 'THIS'),
      THROW            = new StandardOpCode(0, 'THROW'),
      UNARY            = new StandardOpCode(1, 'UNARY'),
      UNDEFINED        = new StandardOpCode(0, 'UNDEFINED'),
      UPDATE           = new StandardOpCode(1, 'UPDATE'),
      UPSCOPE          = new StandardOpCode(0, 'UPSCOPE'),
      VAR              = new StandardOpCode(1, 'VAR'),
      WITH             = new StandardOpCode(0, 'WITH'),
      YIELD            = new StandardOpCode(1, 'YIELD');



  function Directive(op, args){
    this.op = op;
    this.loc = currentNode.loc;
    this.range = currentNode.range;
    for (var i=0; i < op.params; i++) {
      this[i] = args[i];
    }
  }

  define(Directive.prototype, [
    function inspect(){
      var out = [];
      for (var i=0; i < this.op.params; i++) {
        out.push(util.inspect(this[i]));
      }
      return util.inspect(this.op)+'('+out.join(', ')+')';
    }
  ]);



  function Params(params, node, rest){
    this.length = 0;
    if (params) {
      push.apply(this, params)
      this.ArgNames = BoundNames(params);
    } else {
      this.ArgNames = [];
    }
    this.Rest = rest;
    this.BoundNames = BoundNames(node);//.map(intern);
    this.ExpectedArgumentCount = this.ArgNames.length;
    if (rest) this.ArgNames.push(rest.name);
  }


  function Code(node, source, type, scope, strict){
    function Instruction(opcode, args){
      Directive.call(this, opcode, args);
    }

    inherit(Instruction, Directive, {
      code: this
    });

    this.topLevel = node.type === 'Program';
    var body = this.topLevel ? node : node.body;

    define(this, {
      body: body,
      source: source,
      range: node.range,
      loc: node.loc,
      children: [],
      LexicalDeclarations: LexicalDeclarations(body),
      createDirective: function(opcode, args){
        var op = new Instruction(opcode, args);
        this.ops.push(op);
        return op;
      }
    });

    if (!this.topLevel && node.id) {
      this.name = node.id.name;
      if (node.generator) {
        this.generator = true;
      }
    }


    this.transfers = [];
    this.ScopeType = scope;
    this.Type = type || FUNCTYPE.NORMAL;
    this.VarDeclaredNames = [];
    this.NeedsSuperBinding = ReferencesSuper(this.body);
    this.Strict = strict || isStrict(this.body);
    if (scope === SCOPE.MODULE) {
      this.ExportedNames = Exports(this.body);
    }
    this.params = new Params(node.params, node, node.rest);
    this.ops = [];
  }

  void function(){
    var proto = Math.random().toString(36).slice(2);

    define(Code.prototype, [
      function inherit(code){
        if (code) {
          this.strings = code.strings;
          this.hash = code.hash;
          this.natives = code.natives;
        }
      },
      function lookup(id){
        return id;
        if (typeof id === 'number') {
          return this.strings[id];
        } else {
          return id;
        }
      }
    ]);
  }();


  function ClassDefinition(node){
    this.name = node.id ? node.id.name : null;
    this.pattern = node.id;
    this.methods = [];

    for (var i=0, method; method = node.body.body[i]; i++) {
      var code = new Code(method.value, context.source, FUNCTYPE.METHOD, SCOPE.CLASS, context.code.Strict);
      if (this.name) {
        code.name = this.name + '#' + method.key.name;
      } else {
        code.name = method.key.name;
      }
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
      GET();
      this.superClass = node.superClass.name;
    }
  }


  function Unwinder(type, begin, end){
    this.type = type;
    this.begin = begin;
    this.end = end;
  }

  void function(){
    define(Unwinder.prototype, [
      function toJSON(){
        return [this.type, this.begin, this.end];
      }
    ]);
  }();



  function ControlTransfer(labels){
    this.labels = labels;
    this.breaks = [];
    this.continues = [];
  }

  void function(){
    define(ControlTransfer.prototype, {
      labels: null,
      breaks: null,
      continues: null
    })

    define(ControlTransfer.prototype, [
      function updateContinues(ip){
        if (ip !== undefined) {
          for (var i=0, item; item = this.breaks[i]; i++) {
            item[0] = ip;
          }
        }
      },
      function updateBreaks(ip){
        if (ip !== undefined) {
          for (var i=0, item; item = this.continues[i]; i++) {
            item[0] = ip;
          }
        }
      }
    ]);
  }();




  function AssemblerOptions(o){
    o = Object(o);
    for (var k in this)
      this[k] = k in o ? o[k] : this[k];
  }

  AssemblerOptions.prototype = {
    scope: SCOPE.GLOBAL,
    natives: false,
    filename: null
  };



  function Assembler(options){
    this.options = new AssemblerOptions(options);
    define(this, {
      strings: [],
      hash: create(null)
    });
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


  void function(){
    define(Assembler.prototype, [
      function assemble(node, source){
        context = this;
        this.pending = new Stack;
        this.levels = new Stack;
        this.jumps = new Stack;
        this.labels = null;
        this.source = source;

        if (this.options.scope === SCOPE.FUNCTION) {
          node = node.body[0].expression;
        }

        var code = new Code(node, source, FUNCTYPE.NORMAL, this.options.scope);
        define(code, {
          strings: this.strings,
          hash: this.hash
        });

        code.topLevel = true;

        if (this.options.natives) {
          code.natives = true;
          reinterpretNatives(node);
        }

        annotateParent(node);
        this.queue(code);

        while (this.pending.length) {
          var lastCode = this.code;
          this.code = this.pending.pop();
          this.code.filename = this.filename;
          if (lastCode) {
            this.code.inherit(lastCode);
          }
          recurse(this.code.body);
          if (this.code.ScopeType === SCOPE.GLOBAL || this.code.ScopeType === SCOPE.EVAL){
            COMPLETE();
          } else {
            if (this.code.Type === FUNCTYPE.ARROW && this.code.body.type !== 'BlockStatement') {
              GET();
            } else {
              UNDEFINED();
            }
            RETURN();
          }
        }

        return code;
      },
      function queue(code){
        if (this.code) {
          this.code.children.push(code);
        }
        this.pending.push(code);
      },
      function intern(name){
        return name;
        if (name === '__proto__') {
          if (!this.hash[proto]) {
            var index = this.hash[proto] = this.strings.length;
            this.strings[index] = '__proto__';
          }
          name = proto;
        }

        if (name in this.hash) {
          return this.hash[name];
        } else {
          var index = this.hash[name] = this.strings.length;
          this.strings[index] = name;
          return index;
        }
      },
    ]);
  }();



  function annotateParent(node, parent){
    visit(node, function(node){
      if (isObject(node) && parent) {
        define(node, 'parent', parent);
      }
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
    ObjectPattern      : 'properties',
    ArrayPattern       : 'elements',
    VariableDeclaration: 'declarations',
    BlockStatement     : visit.RECURSE,
    Property           : 'value',
    ExportDeclaration  : 'declaration',
    ExportSpecifierSet : 'specifiers',
    ImportDeclaration  : 'specifiers',
    Identifier         : ['name'],
    ImportSpecifier    : 'id',
    VariableDeclarator : 'id',
    ModuleDeclaration  : 'id',
    FunctionDeclaration: ['id', 'name'],
    ClassDeclaration   : 'id'
  });


  function BoundNames(node){
    var names = [];
    if (isFunction(node) || node.type === 'ClassDeclaration') {
      names = names.concat(boundNamesCollector(node.params));
      if (node.rest) {
        names = names.concat(boundNamesCollector(node.rest));
      }
      node = node.body;
    }

    return names.concat(boundNamesCollector(node));
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
      node.BoundNames = BoundNames(node)//.map(intern);
      return node;
    };
  });


  var collectExports = collector({
    Program          : 'body',
    BlockStatement   : 'body',
    ExportDeclaration: true
  });
      //collectImports = collector({ ImportDeclaration: true });

  var findExportedDeclarations = collector({
    ClassDeclaration   : true,
    ExportDeclaration  : visit.RECURSE,
    ExportSpecifier    : true,
    ExportSpecifierSet : visit.RECURSE,
    FunctionDeclaration: true,
    ModuleDeclaration  : true,
    VariableDeclaration: visit.RECURSE,
    VariableDeclarator : true
  });


  var exportedNames = collector({
    ArrayPattern       : 'elements',
    ObjectPattern      : 'properties',
    Property           : 'value',
    ClassDeclaration   : 'id',
    ExportSpecifier    : 'id',
    FunctionDeclaration: 'id',
    ModuleDeclaration  : 'id',
    VariableDeclarator : 'id',
    Glob               : true,
    Identifier         : ['name'],
  });

  function Exports(node){
    return exportedNames(findExportedDeclarations(collectExports(node)));
  }

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



  var currentNode;
  function recurse(node){
    if (node) {
      var lastNode = currentNode;
      currentNode = node;
      handlers[node.type](node);
      if (lastNode) {
        currentNode = lastNode;
      }
    }
  }


  function intern(str){
    return str;//context.intern(string);
  }

  function current(){
    return context.code.ops.length;
  }

  function last(){
    return context.code.ops[context.code.ops.length - 1];
  }

  function pop(){
    return context.code.ops.pop();
  }

  function adjust(op){
    return op[0] = context.code.ops.length;
  }

  function macro(){
    var opcodes = arguments;
    MACRO.params = opcodes.length;
    return MACRO;

    function MACRO(){
      var offset = 0,
          args = arguments;

      each(opcodes, function(opcode){
        opcode.apply(null, generate(opcode.params, function(){
          return args[offset++]
        }));
      });
    }
  }

  function block(callback){
    if (context.labels){
      var entry = new ControlTransfer(context.labels);
      context.jumps.push(entry);
      context.labels = create(null);
      callback();
      entry.updateBreaks(current());
      context.jumps.pop();
    } else {
      callback();
    }
  }

  function control(callback){
    var entry = new ControlTransfer(context.labels);
    context.jumps.push(entry);
    context.labels = create(null);
    entry.updateContinues(callback());
    entry.updateBreaks(current());
    context.jumps.pop();
  }

  function lexical(type, callback){
    if (typeof type === 'function') {
      callback = type;
      type = ENTRY.ENV;
    }
    var begin = current();
    callback();
    context.code.transfers.push(new Unwinder(type, begin, current()));
  }

  function move(node){
    if (node.label) {
      var entry = context.jumps.first(function(transfer){
        return node.label.name in transfer.labels;
      });
    } else {
      var entry = context.jumps.first(function(transfer){
        return transfer && transfer.continues;
      });
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
        rights = right[key],
        binding, value;

    for (var i=0; i < lefts.length; i++) {
      binding = elementAt[key](left, i);

      if (isPattern(binding)){
        value = rights && rights[i] ? elementAt[key](right, i) : binding;
        destructure(binding, value);
      } else {
        if (binding.type === 'SpreadElement') {
          recurse(binding.argument);
          recurse(right);
          SPREAD(i);
        } else {
          recurse(binding);
          recurse(right);
          if (left.type === 'ArrayPattern') {
            LITERAL(i);
            ELEMENT(i);
          } else {
            MEMBER(binding.name)
          }
        }
        PUT();
      }
    }
  }

  function args(node){
    ARGS();
    for (var i=0, item; item = node[i]; i++) {
      if (item && item.type === 'SpreadElement') {
        recurse(item.argument);
        GET();
        SPREAD_ARG();
      } else {
        recurse(item);
        GET();
        ARG();
      }
    }
  }

  function isGlobalOrEval(){
    return context.code.ScopeType === SCOPE.EVAL || context.code.ScopeType === SCOPE.GLOBAL;
  }


  function AssignmentExpression(node){
    if (node.operator === '='){
      if (isPattern(node.left)){
        destructure(node.left, node.right);
      } else {
        recurse(node.left);
        recurse(node.right);
        GET();
        PUT();
      }
    } else {
      recurse(node.left);
      DUP();
      GET();
      recurse(node.right);
      GET();
      BINARY(BINARYOPS[node.operator.slice(0, -1)]);
      PUT();
    }
  }

  function ArrayExpression(node){
    ARRAY();
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

      GET();
      INDEX(empty, spread);
    }
    ARRAY_DONE();
  }

  function ArrayPattern(node){}

  function ArrowFunctionExpression(node){
    var code = new Code(node, context.code.source, FUNCTYPE.ARROW, SCOPE.FUNCTION, context.code.Strict);
    context.queue(code);
    FUNCTION(null, code);
  }

  function BinaryExpression(node){
    recurse(node.left);
    GET();
    recurse(node.right);
    GET();
    BINARY(BINARYOPS[node.operator]);
  }

  function BreakStatement(node){
    var entry = move(node);
    if (entry) {
      entry.breaks.push(JUMP(0));
    }
  }

  function BlockStatement(node){
    block(function(){
      lexical(function(){
        BLOCK({ LexicalDeclarations: LexicalDeclarations(node.body) });

        for (var i=0, item; item = node.body[i]; i++) {
          recurse(item);
        }

        UPSCOPE();
      });
    });
  }

  function CallExpression(node){
    if (isSuperReference(node.callee)) {
      if (context.code.ScopeType !== SCOPE.FUNCTION) {
        throwError('illegal_super');
      }
      SUPER_CALL();
    } else {
      recurse(node.callee);
    }
    DUP();
    GET();
    args(node.arguments);
    node.callee.type === 'NativieIdentifier' ? NATIVE_CALL(): CALL();
  }

  function CatchClause(node){
    lexical(function(){
      var decls = LexicalDeclarations(node.body);
      decls.push({
        type: 'VariableDeclaration',
        kind: 'let',
        IsConstantDeclaration: false,
        BoundNames: [node.param.name],
        declarations: [{
          type: 'VariableDeclarator',
          id: node.param,
          init: undefined
        }]
      });
      BLOCK({ LexicalDeclarations: decls });
      recurse(node.param);
      PUT();
      for (var i=0, item; item = node.body.body[i]; i++) {
        recurse(item);
      }

      UPSCOPE();
    });
  }

  function ClassBody(node){}

  function ClassDeclaration(node){
    CLASS_DECL(new ClassDefinition(node));
  }

  function ClassExpression(node){
    CLASS_EXPR(new ClassDefinition(node));
  }

  function ClassHeritage(node){}

  function ConditionalExpression(node){
    recurse(node.test);
    GET();
    var test = IFEQ(0, false);
    recurse(node.consequent)
    GET();
    var alt = JUMP(0);
    adjust(test);
    recurse(node.alternate);
    GET();
    adjust(alt)
  }

  function ContinueStatement(node){
    var entry = move(node);
    if (entry) {
      entry.continues.push(JUMP(0));
    }
  }

  function DoWhileStatement(node){
    control(function(){
      var start = current();
      recurse(node.body);
      var cond = current();
      recurse(node.test);
      GET();
      IFEQ(start, true);
      return cond;
    });
  }

  function DebuggerStatement(node){
    DEBUGGER();
  }

  function EmptyStatement(node){}

  function ExportSpecifier(node){}

  function ExportSpecifierSet(node){}

  function ExportDeclaration(node){
    if (node.declaration) {
      recurse(node.declaration);
    }
  }

  function ExpressionStatement(node){
    recurse(node.expression);
    GET();
    isGlobalOrEval() ? SAVE() : POP();
  }

  function ForStatement(node){
    control(function(){
      var update;
      lexical(function(){
        var scope = BLOCK({ LexicalDeclarations: [] });
        var init = node.init;
        if (init){
          if (init.type === 'VariableDeclaration') {
            recurse(init);
            if (init.kind === 'let' || init.kind === 'const') {
              var decl = init.declarations[init.declarations.length - 1].id;
              scope[0].LexicalDeclarations = BoundNames(decl);
              var lexicalDecl = {
                type: 'VariableDeclaration',
                kind: init.kind,
                declarations: [{
                  type: 'VariableDeclarator',
                  id: decl,
                  init: null
                }],
              };
              lexicalDecl.BoundNames = BoundNames(lexicalDecl);
              recurse(decl);
            }
          } else {
            GET();
            POP();
          }
        }

        var test = current();

        if (node.test) {
          recurse(node.test);
          GET();
          var op = IFEQ(0, false);
        }

        update = current();

        if (node.body.body && decl) {
          block(function(){
            lexical(function(){
              var lexicals = LexicalDeclarations(node.body.body);
              lexicals.push(lexicalDecl);
              GET();
              BLOCK({ LexicalDeclarations: lexicals });
              recurse(decl);
              ROTATE(1);
              PUT();

              for (var i=0, item; item = node.body.body[i]; i++) {
                recurse(item);
              }

              UPSCOPE();
            });
          });
        } else {
          recurse(node.body);
        }

        if (node.update) {
          recurse(node.update);
          GET();
          POP();
        }

        JUMP(test);
        adjust(op);
        UPSCOPE();
      });
      return update;
    });
  }

  function ForInStatement(node){
    iteration(node, ENUM);
  }

  function ForOfStatement(node){
    iteration(node, ITERATE);
  }

  function iteration(node, KIND){
    control(function(){
      var update;
      lexical(ENTRY.FOROF, function(){
        recurse(node.right);
        GET();
        KIND();
        GET();
        DUP();
        MEMBER('next');
        GET();
        update = current();
        DUP();
        DUP();
        ARGS();
        CALL();
        DUP();
        var compare = IFEQ(0, false);
        if (node.left.type === 'VariableDeclaration' && node.left.kind !== 'var') {
          block(function(){
            lexical(function(){
              BLOCK({ LexicalDeclarations: LexicalDeclarations(node.left) });
              recurse(node.left);
              recurse(node.body);
              UPSCOPE();
            });
          });
        } else {
          recurse(node.left);
          recurse(node.body);
        }
        JUMP(update);
        adjust(compare);
      });
      return update;
    });
  }

  function FunctionDeclaration(node){
    node.Code = new Code(node, context.code.source, FUNCTYPE.NORMAL, SCOPE.FUNCTION, context.code.Strict);
    context.queue(node.Code);
  }

  function FunctionExpression(node, methodName){
    var code = new Code(node, context.code.source, FUNCTYPE.NORMAL, SCOPE.FUNCTION, context.code.Strict);
    if (methodName) {
      code.name = methodName;
    }
    context.queue(code);
    FUNCTION(intern(node.id ? node.id.name : ''), code);
  }

  function Glob(node){}

  function Identifier(node){
    REF(node.name);
  }

  function IfStatement(node){
    recurse(node.test);
    GET();
    var test = IFEQ(0, false);
    recurse(node.consequent);

    if (node.alternate) {
      var alt = JUMP(0);
      adjust(test);
      recurse(node.alternate);
      adjust(alt);
    } else {
      adjust(test);
    }
  }

  function ImportDeclaration(node){}

  function ImportSpecifier(node){}

  function Literal(node){
    if (node.value instanceof RegExp) {
      REGEXP(node.value);
    } else if (typeof node.value === 'string') {
      STRING(node.value);
    } else {
      LITERAL(node.value);
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
    GET();
    var op = IFNE(0, node.operator === '||');
    recurse(node.right);
    GET();
    adjust(op);
  }

  function MemberExpression(node){
    var isSuper = isSuperReference(node.object);
    if (isSuper){
      if (context.code.ScopeType !== SCOPE.FUNCTION) {
        throwError('illegal_super_reference');
      }
    } else {
      recurse(node.object);
      GET();
    }

    if (node.computed){
      recurse(node.property);
      GET();
      isSuper ? SUPER_ELEMENT() : ELEMENT();
    } else {
      isSuper ? SUPER_MEMBER() : MEMBER(node.property.name);
    }
  }

  function MethodDefinition(node){}

  function ModuleDeclaration(node){
    recurse(node.id);
    if (node.from) {
      recurse(node.from);
      IMPORT();
    } else {
      node.Code = new Code(node, context.code.source, FUNCTYPE.NORMAL, SCOPE.MODULE, context.code.Strict);
      context.queue(node.Code);
    }
  }

  function NativeIdentifier(node){
    NATIVE_REF(node.name);
  }

  function NewExpression(node){
    recurse(node.callee);
    GET();
    args(node.arguments);
    CONSTRUCT();
  }

  function ObjectExpression(node){
    OBJECT();
    each(node.properties, recurse);
  }

  function ObjectPattern(node){}

  function Path(node){}

  function Program(node){
    each(node.body, recurse);
  }

  function Property(node){
    if (node.kind === 'init'){
      var key = node.key.type === 'Identifier' ? node.key.name : node.key.value;
      if (node.method) {
        FunctionExpression(node.value, intern(key));
      } else {
        recurse(node.value);
      }
      GET();
      PROPERTY(key);
    } else {
      var code = new Code(node.value, context.source, FUNCTYPE.NORMAL, SCOPE.FUNCTION, context.code.Strict);
      context.queue(code);
      METHOD(node.kind, code, intern(node.key.name));
    }
  }

  function ReturnStatement(node){
    if (node.argument){
      recurse(node.argument);
      GET();
    } else {
      UNDEFINED();
    }

    RETURN();
  }

  function SequenceExpression(node){
    for (var i=0, item; item = node.expressions[i]; i++) {
      recurse(item)
      GET();
      POP();
    }
    recurse(item);
    GET();
  }

  function SwitchStatement(node){
    control(function(){
      recurse(node.discriminant);
      GET();

      lexical(function(){
        BLOCK({ LexicalDeclarations: LexicalDeclarations(node.cases) });

        if (node.cases){
          var cases = [];
          for (var i=0, item; item = node.cases[i]; i++) {
            if (item.test){
              recurse(item.test);
              GET();
              cases.push(CASE(0));
            } else {
              var defaultFound = i;
              cases.push(0);
            }
          }

          if (defaultFound != null){
            DEFAULT(cases[defaultFound]);
          } else {
            POP();
            var last = JUMP(0);
          }

          for (var i=0, item; item = node.cases[i]; i++) {
            adjust(cases[i])
            for (var j=0, consequent; consequent = item.consequent[j]; j++) {
              recurse(consequent);
            }
          }

          if (last) {
            adjust(last);
          }
        } else {
          POP();
        }

        UPSCOPE();
      });
    });
  }


  function TemplateElement(node){}

  function TemplateLiteral(node, tagged){
    each(node.quasis, function(element, i){
      STRING(element.value.raw);
      if (!element.tail) {
        recurse(node.expressions[i]);
        GET();
        BINARY(BINARYOPS['string+']);
      }
      if (i) {
        BINARY(BINARYOPS['string+']);
      }
    });
  }

  function TaggedTemplateExpression(node){
    var template = [];
    each(node.quasi.quasis, function(element){
      template.push(element.value);
    });

    UNDEFINED();
    recurse(node.tag);
    GET();
    ARGS();
    TEMPLATE(template);
    GET();
    ARG();
    each(node.quasi.expressions, function(node){
      recurse(node);
      GET();
      ARG();
    });
    CALL();
  }

  function ThisExpression(node){
    THIS();
  }

  function ThrowStatement(node){
    recurse(node.argument);
    GET();
    THROW();
  }

  function TryStatement(node){
    lexical(ENTRY.TRYCATCH, function(){
      recurse(node.block);
    });

    var tryer = JUMP(0),
        handlers = [];

    for (var i=0, handler; handler = node.handlers[i]; i++) {
      recurse(handler);
      if (i < node.handlers.length - 1) {
        handlers.push(JUMP(0));
      }
    }

    adjust(tryer);
    while (i--) {
      handlers[i] && adjust(handlers[i]);
    }

    if (node.finalizer) {
      recurse(node.finalizer);
    }
  }

  function UnaryExpression(node){
    recurse(node.argument);
    UNARY(UNARYOPS[node.operator]);
  }

  function UpdateExpression(node){
    recurse(node.argument);
    UPDATE(!!node.prefix | ((node.operator === '++') << 1));
  }

  function VariableDeclaration(node){
    var OP = {
      'var': VAR,
      'const': CONST,
      'let': LET
    }[node.kind];

    for (var i=0, item; item = node.declarations[i]; i++) {
      if (item.init) {
        recurse(item.init);
        GET();
      } else if (item.kind === 'let') {
        UNDEFINED();
      }

      //if (item.id.type === 'Identifier') {
      //  op(intern(item.id.name));
      //} else {
        OP(item.id);
      //}

      if (node.kind === 'var') {
        context.code.VarDeclaredNames.push(intern(item.id.name));
      }
    }
  }

  function VariableDeclarator(node){}

  function WhileStatement(node){
    control(function(){
      var start = current();
      recurse(node.test);
      GET();
      var op = IFEQ(0, false)
      recurse(node.body);
      JUMP(start);
      adjust(op);
      return start;
    });
  }

  function WithStatement(node){
    recurse(node.object)
    lexical(function(){
      WITH();
      recurse(node.body);
      UPSCOPE();
    });
  }

  function YieldExpression(node){
    if (node.argument){
      recurse(node.argument);
      GET();
    } else {
      UNDEFINED();
    }

    YIELD(node.delegate);
  }

  var handlers = {};

  utility.iterate([ ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression,
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
    VariableDeclarator, WhileStatement, WithStatement, YieldExpression], function(handler){
      handlers[utility.fname(handler)] = handler;
    });


  function assemble(options){
    var assembler = new Assembler(options);
    return assembler.assemble(options.ast, options.source);
  }

  exports.assemble = assemble;
  return exports;
})(typeof module !== 'undefined' ? module.exports : {});

