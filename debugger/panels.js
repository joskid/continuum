(function(continuum){
var Component = continuum.Component,
    utility   = continuum.utility,
    inherit   = utility.inherit,
    isObject  = utility.isObject,
    each      = utility.each,
    inline    = continuum.inline,
    block     = continuum.block,
    _         = continuum._;

var Editor = (function(commands, Pass){
  var paging = CodeMirror.keyMap.paging = {
    'Enter': function(cm){ cm.editor.entry() },
    'Up': function(cm){ cm.editor.previous() },
    'Down': function(cm){ cm.editor.next() },
    'Ctrl-Up': function(cm){ cm.editor.previous() },
    'Ctrl-Down': function(cm){ cm.editor.next() },
    fallthrough: ['default']
  };

  function cancelPaging(cm){
    cm.setOption('keyMap', 'debug');
    throw Pass;
  }

  utility.iterate(CodeMirror.keyNames, function(name){
    if (!(name in paging)) {
      paging[name] = cancelPaging;
    }
  });

  CodeMirror.keyMap.debug = {
    'Enter': function(cm){
      cm.editor.entry();
    },
    'Up': function(cm){
      if (!cm.getValue() && cm.editor.count) {
        cm.setOption('keyMap', 'paging');
        cm.editor.previous();
      } else {
        commands.goLineUp(cm);
      }
    },
    'Down': function(cm){
      if (!cm.getValue() && cm.editor.count) {
        cm.setOption('keyMap', 'paging');
        cm.editor.next();
      } else {
        commands.goLineDown(cm);
      }
    },
    'Ctrl-Up': function(cm){
      if (cm.editor.count) {
        cm.setOption('keyMap', 'paging');
        cm.editor.previous()
      } else {
        return Pass;
      }
    },
    'Ctrl-Down': function(cm){
      if (cm.editor.count) {
        cm.setOption('keyMap', 'paging');
        cm.editor.next()
      } else {
        return Pass;
      }
    },
    fallthrough: ['default']
  };


  function Editor(options){
    Component.call(this, 'div');
    this.addClass('editor');
    this.codemirror = new CodeMirror(this.element, {
      lineNumbers: true,
      autofocus: true,
      lineWrapping: true,
      smartIndent: true,
      autoClearEmptyLines: false,
      mode: 'javascript',
      keyMap: 'debug',
      tabSize: 2,
      pollInterval: 50
    });
    this.items = [];
    this.index = 0;
    this.count = 0;
    this.codemirror.editor = this;
  }

  inherit(Editor, Component, [
    function resize(){
      this.codemirror.refresh();
    },
    function entry(){
      var value = this.codemirror.getValue();
      this.codemirror.setValue('');
      if (this.index !== this.items.length) {
        this.items.splice(this.index, 0, value);
      } else {
        this.items.push(value);
      }
      this.index++;
      this.count++;
      this.emit('entry', { value: value });
      return this;
    },
    function reset(){
      this.items = [];
      this.index = 0;
      this.count = 0;
      this.codemirror.setValue('');
      return this;
    },
    function last(){
      this.index = this.items.length;
      this.codemirror.setValue('');
      return this;
    },
    function previous(){
      if (this.items.length) {
        if (this.index === 0) {
          this.last();
        } else {
          this.set('previous', this.items[--this.index]);
        }
      }
      return this;
    },
    function next(){
      if (this.items.length) {
        if (this.index === this.items.length - 1) {
          this.last();
        } else {
          if (this.index === this.items.length) {
            this.index = -1
          }
          this.set('next', this.items[++this.index]);
        }
      }
      return this;
    },
    function set(reason, value){
      if (this.disabled) return;
      this.codemirror.setValue(value);
      this.emit(reason, { value: value });
      CodeMirror.commands.goDocEnd(this.codemirror);
      return this;
    },
    function disable(){
      this.codemirror.setOption('readOnly', true);
      this.disabled = true;
    },
    function enable(){
      this.codemirror.setOption('readOnly', false);
      this.disabled = false;
    }
  ]);

  return Editor;
})(CodeMirror.commands, CodeMirror.Pass);



var Console = (function(){
  function Console(){
    Component.call(this, 'div');
    this.console = this.append(block('.console'));
  }

  inherit(Console, Component, [
    function clear(){
      this.console.element.innerHTML = '';
    },
    function write(msg, color){
      var node = inline(msg);
      node.style('color', color === undefined ? 'white' : color);
      this.console.append(node);
    },
    function backspace(count){
      var buffer = this.console.element;
      while (buffer.lastChild && count > 0) {
        var el = buffer.lastChild.component,
            len = el.text().length;
        if (len < count) {
          this.console.remove(el);
          count -= len;
        } else if (len === count) {
          this.console.remove(el);
          return true;
        } else {
          var text = el.element.firstChild;
          text.data = text.data.slice(0, text.data.length - count);
          return true;
        }
      }
    }
  ]);

  return Console;
})();


var Instructions = (function(){
  var typeofs = {
    string: 'StringValue',
    boolean: 'BooleanValue',
    number: 'NumberValue',
    undefined: 'UndefinedValue',
    object: 'NullValue'
  };

  function identity(x){
    return x;
  }

  var translators = {
    string: utility.quotes,
    boolean: identity,
    number: identity,
    undefined: identity,
    object: identity
  };


  function Instruction(instruction, item){
    var op = instruction.op;
    Component.call(this, 'li');
    this.instruction = instruction;
    this.addClass('instruction');
    this.addClass(op.name);
    this.batchAppend(inline(op.name, 'op-name'));
    if (op.name === 'GET' || op.name === 'PUT') {
      if (!isObject(item)) {
        var type = typeof item;
        this.batchAppend(inline(translators[type](item), typeofs[type]));
      } else {
        if (item.Reference) {
          var base = item.base;
          if (base) {
            if (base.bindings && base.bindings.NativeBrand) {
              base = base.bindings;
            }

            if (!base.Proxy && base.NativeBrand) {
              item = base.properties.get(item.name);
            }
          }
        }
        if (item && item.NativeBrand) {
          var result = continuum.render('normal', item);
          this.batchAppend(result);
        }
      }
    } else if (op.name === 'BINARY') {
      this.batchAppend(inline(constants.BINARYOPS.getKey(instruction[0]), 'Operator'));
    } else if (op.name === 'UNARY') {
      this.batchAppend(inline(constants.UNARYOPS.getKey(instruction[0]), 'Operator'));
    } else {
      for (var i=0; i < op.params; i++) {
        var param = instruction[i];
        if (!isObject(param)) {
          this.batchAppend(inline(param, typeofs[typeof param]));
        }
      }
    }
  }

  inherit(Instruction, Component, []);


  function Instructions(){
    Component.call(this, 'ul');
    this.addClass('instructions');
  }

  inherit(Instructions, Component, [
    function onBatchAppend(){
      this.element.scrollTop = this.element.scrollHeight;
    },
    function addInstruction(op){
      if (this.children.size > 100) {
        this.element.removeChild(this.children.shift().element);
      }
      this.batchAppend(new Instruction(op[0], op[1]));
    }
  ]);

  return Instructions;
})();


var Inspector = (function(){
  function Inspector(){
    Component.call(this, 'ul');
    this.addClass('inspector');
    this.show();
  }

  inherit(Inspector, Component, [
    function expand(){
      if (!this.expanded && this.emit('expand')) {
        this.expanded = true;
        this.show();
        return true;
      }
      return false;
    },
    function contract(){
      if (this.expanded && this.emit('contract')) {
        this.expanded = false;
        this.hide();
        return true;
      }
      return false;
    },
    function toggle(){
      if (this.expanded) {
        this.contract();
        return false;
      } else {
        this.expand();
        return true;
      }
    },
    function refresh(){
      if (this.children) {
        each(this.children, function(child){
          child.refresh();
        });
      }
      return this;
    }
  ]);

  return Inspector;
})();

continuum.createPanel.panels.editor = Editor;
continuum.createPanel.panels.console = Console;
continuum.createPanel.panels.inspector = Inspector;
continuum.createPanel.panels.instructions = Instructions;


})(continuum);
