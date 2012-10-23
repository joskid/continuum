(function(global, Continuum, constants, utility, debug){
var inherit = utility.inherit,
    create = utility.create,
    assign = utility.assign,
    define = utility.define;

function _(s){
  return document.createElement(s);
}

var sides = { left: 0, top: 1, right: 2, bottom: 3 },
    vert = { near: 'top', far: 'bottom', size: 'height' },
    horz = { near: 'left', far: 'right', size: 'width' },
    eventOptions = { bubbles: true, cancelable: true },
    opposites = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };




function Component(tag){
  this.element = _(tag);
  if (this.element.classList) {
    this.classes = this.element.classList;
  }
}

define(Component.prototype, {
  ns: 'ƒ'
});

define(Component.prototype, [
  function on(event, listener){
    define(listener, 'bound', listener.bind(this));
    this.element.addEventListener(event, listener.bound, false);
    return this;
  },
  function off(event, listener){
    this.element.removeEventListener(event, listener.bound, false);
    return this;
  },
  function once(event, listener){
    this.on(event, function once(e){
      this.off(event, once);
      return listener.apply(this, arguments);
    });
    return this;
  },
  function emit(event, data){
    if (typeof event === 'string') {
      event = new Event(event, eventOptions);
    }
    if (data) {
      for (var k in data) {
        event[k] = data[k];
      }
    }
    return this.element.dispatchEvent(event);
  },
  function append(subject){
    if (subject.element) {
      this.children || (this.children = []);
      this.children.push(subject);
      this.element.appendChild(subject.element);
    } else if (subject instanceof Element) {
      this.element.appendChild(subject);
    }
    return this;
  }
]);

if (document.body.classList) {
  define(Component.prototype, [
    function addClass(name, noNS){
      if (!noNS) name = this.ns+name;
      return this.classes.add(name);
    },
    function removeClass(name, noNS){
      if (!noNS) name = this.ns+name;
      return this.classes.remove(name);
    },
    function toggleClass(name, noNS){
      if (!noNS) name = this.ns+name;
      return this.classes.toggle(name);
    },
    function hasClass(name, noNS){
      if (!noNS) name = this.ns+name;
      return this.classes.contains(name);
    }
  ]);
} else {
  void function(cache){
    function matcher(n){
      if (!(n in cache)) {
        cache[n] = new RegExp('(.*)(?:^'+n+'\\s|\\s'+n+'$|\\s'+n+'\\s)(.*)');
      }
      return cache[n];
    }

    define(Component.prototype, [
      function addClass(name, noNS){
      if (!noNS) name = this.ns+name;
        var className = this.element.className;
        if (!matcher(name).test(className)) {
          this.element.className = className + ' ' + name;
        }
        return this;
      },
      function removeClass(name, noNS){
      if (!noNS) name = this.ns+name;
        var p = this.element.className.match(matcher(name));
        if (p) {
          this.element.className = p[1] ? p[2] ? p[1]+' '+p[2] : p[1] : p[2];
        }
        return this;
      },
      function toggleClass(name, noNS){
      if (!noNS) name = this.ns+name;
        if (this.hasClass(name)) {
          this.removeClass(name);
        } else {
          this.addClass(name);
        }
        return this;
      },
      function hasClass(name, noNS){
      if (!noNS) name = this.ns+name;
        return matcher(name).test(this.element.className);
      }
    ]);
  }(create(null));
}


function PanelOptions(o){
  o = Object(o);
  for (var k in this) {
    if (k in o) {
      this[k] = o[k];
    }
  }
}

PanelOptions.prototype = {
  anchor: 'top',
  orient: 'vertical',
  mainSize: 'auto',
  crossSize: 'auto',
  splitter: true,
  name: null,
  label: null,
  left: null,
  top: null,
  right: null,
  bottom: null,
  content: null,
};


function Panel(parent, options){
  var self = this;
  Component.call(this, 'div');
  options = new PanelOptions(options);

  if (options.label) {
    var label = _('h2');
    label.textContent = options.label;
    label.className = this.ns + 'panel-label'
    this.element.appendChild(label);
  }
  this.anchor = parent ? options.anchor : null;
  this.orient = options.orient;
  this.mainSize = options.mainSize;
  this.crossSize = options.crossSize;
  this.parent = null;
  for (var k in sides) {
    this[k] = null;
  }
  this.addClass('panel');
  this.addClass(options.orient);
  if (!parent) {
    this.addClass('root');
    var rootResize = function(){
      if (self.orient === 'vertical') {
        self.mainCalcSize = document.body.offsetHeight;
        self.crossCalcSize = document.body.offsetWidth;
      } else {
        self.mainCalcSize = document.body.offsetWidth;
        self.crossCalcSize = document.body.offsetHeight;
      }
    };
  }


  if (options.name) {
    this.name = options.name;
    this.element.id = options.name;
  }

  if (options.content) {
    this.content = options.content;
    this.element.appendChild(this.content.element ? this.content.element : this.content);
  } else {
    this.content = null;
  }


  if (parent) {
      parent.mount(this);

  } else {
    document.body.appendChild(this.element);
    window.addEventListener('resize', function(){
      rootResize();
      self.readjust();
    }, true);
    setTimeout(function(){
      rootResize();
      self.readjust();
    }, 10);
  }

  this.forEach(function(_, side){
    if (options[side]) {
      options[side].anchor = side;
      this.mount(new Panel(this, options[side]));
    }
  });
}

inherit(Panel, Component, [
  function opposite(panel){
    if (panel && panel.mount) {
      return this[opposites[panel.mount]]
    }
  },
  function mount(panel){
    if (panel.parent === this) {
      var side = this.find(panel);
      if (side) {
        if (side !== panel.mount) {
          panel.mount = side;
        }
        return;
      }
    } else if (panel.parent) {
      panel.parent.unmount(panel);
    }

    if (this[panel.anchor]) {
      throw new Error('Panel already has mount at '+panel.anchor+' anchor');
    }

    this[panel.anchor] = panel;
    panel.parent = this;
    this.element.appendChild(panel.element);
    panel.addClass(panel.anchor);
    this.readjust();
  },
  function readjust(){
    if (this.orient === 'vertical') {
      var main = vert, cross = horz;
    } else {
      var main = horz, cross = vert;
    }

    ['near', 'far'].forEach(function(axis, i, a){
      var panel = this[main[axis]];
      if (panel) {
        panel.mainCalcSize = panel.mainSize;
        if (panel.mainSize === 'auto') {
          var other = this[main[a[1 - i]]];
          if (other && other.mainSize === 'auto') {
            other.mainCalcSize = panel.mainCalcSize = this.mainCalcSize / 2 | 0;
          } else {
            panel.mainCalcSize = this.mainCalcSize - (other ? other.mainCalcSize : 0);
          }
        }
        panel.element.style[main.size] = panel.mainCalcSize + 'px';
        this[axis] = panel.mainCalcSize;
      } else {
        this[axis] = 0;
      }
    }, this);

    ['near', 'far'].forEach(function(axis, i, a){
      var panel = this[cross[axis]];
      if (panel) {
        panel.mainCalcSize = panel.mainSize;
        if (panel.mainSize === 'auto') {
          var other = this[cross[a[1 - i]]];
          if (other && other.mainSize === 'auto') {
            other.mainCalcSize = panel.mainCalcSize = this.crossCalcSize / 2 | 0;
          } else {
            panel.mainCalcSize = this.crossCalcSize - (other ? other.mainCalcSize : 0);
          }
        }
        panel.element.style[main.near] = this.near + 'px';
        panel.element.style[main.far] = this.far + 'px';
        panel.element.style[cross.size] = panel.mainCalcSize + 'px';
      }
    }, this);
  },
  function unmount(panel){
    var anchor = this.find(panel);
    if (anchor) {
      this[anchor] = null;
      this.element.removeChild(panel.element);
      panel.removeClass(anchor);
      return true;
    }
    return false;
  },
  function find(panel){
    if (this[panel.mount] === panel) {
      return panel.mount;
    }
    for (var k in sides) {
      if (this[k] === panel) {
        return k;
      }
    }
    return null;
  },
  function has(panel){
    if (this[panel.mount] === panel) {
      return true;
    }
    for (var k in sides) {
      if (this[k] === panel) {
        return true;
      }
    }
    return false;
  },
  function forEach(callback, context){
    context = context || this;
    for (var k in sides) {
      callback.call(context, this[k], k, this);
    }
    return this;
  },
]);


function InputBoxOptions(o){
  if (o)
    for (var k in this)
      if (k in o)
        this[k] = o[k];
}

InputBoxOptions.prototype = {
  hint: '',
  spellcheck: false,
  'class': 'input',
  tag: 'textarea'
};


function InputBox(options){
  options = new InputBoxOptions(options);
  Component.call(this, options.tag);
  this.element.spellcheck = options.spellcheck;
  this.addClass(options['class']);

  var keyboard = new Keyboard(this.element),
      self = this;

  this.reset();

  keyboard.on('Enter', 'activate', function(e){
    e.preventDefault();
    self.entry();
  });

  keyboard.on('Up', 'activate', function(e){
    e.preventDefault();
    self.previous();
  });

  keyboard.on('Down', 'activate', function(e){
    e.preventDefault();
    self.next();
  });

  if (options.hint) {
    this.element.value = options.hint;
    this.once('focus', function(e){
      this.element.value = '';
    });
  }
}

inherit(InputBox, Component, [
  function entry(){
    var value = this.element.value;
    this.element.value = '';
    if (this.index !== this.items.length) {
      this.items.splice(this.index, 0, value);
    } else {
      this.items.push(value);
    }
    this.index++;
    this.emit('entry', value);
    return this;
  },
  function reset(){
    this.items = [];
    this.index = 0;
    this.element.value = '';
    return this;
  },
  function last(){
    this.index = this.items.length;
    this.element.value = '';
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
    this.element.value = value;
    this.emit(reason, value);
    return this;
  },
  function emit(event, value){
    var self = this;
    if (typeof value === 'string')
      value = { value: value };

    setTimeout(function(){
      var evt = new Event(event, { bubbles: true });
      if (value) {
        for (var k in value) {
          evt[k] = value[k];
        }
      }
      self.element.dispatchEvent(evt);
    }, 1);
  }
]);


function Console(){
  Component.call(this, 'div');
  this.addClass('console');
}

inherit(Console, Component, [
  function clear(){
    this.element.innerHTML = '';
  },
  function append(msg, color){
    var node = document.createElement('span');
    node.textContent = msg;
    node.style.color = color === undefined ? 'white' : color;
    this.element.appendChild(node);
  },
  function backspace(count){
    while (buffer.lastElementChild && count > 0) {
      var el = buffer.lastElementChild,
          len = el.textContent.length;
      if (len < count) {
        buffer.removeChild(el);
        count -= len;
      } else if (len === count) {
        buffer.removeChild(el);
        return true;
      } else {
        el.firstChild.data = el.firstChild.data.slice(0, el.firstChild.data.length - count);
        return true;
      }
    }
  }
]);

try {
  new global.Event('test');
  var Event = global.Event;
}
catch (e) {
  var Event = (function(E){
    function EventInit(type, o){
      if (o)
        for (var k in this)
          if (k in o)
            this[k] = o[k];
      if (type)
        this.type = type;
    }
    EventInit.prototype = assign(create(null), { bubbles: true, cancelable: true, type: '' });

    function Event(type, dict){
      dict = new EventInit(type, dict);
      var evt = document.createEvent('Event');
      evt.initEvent(dict.type, dict.bubbles, dict.cancelable);
      return evt;
    }

    Event.prototype = E.prototype;
    define(Event.prototype, 'constructor', Event);

    return Event;
  })(global.Event);
}



function Key(key){
  Component.call(this, 'div');
  this.addClass('key');
  this.element.textContent = key;
}

inherit(Key, Component, [
  function text(value){
    if (value === undefined) {
      return this.element.textContent;
    } else {
      this.element.textContent = value;
      return this;
    }
  }
]);

var attributes = ['___', 'E__', '_C_', 'EC_', '__W', 'E_W', '_CW', 'ECW', '__A', 'E_A', '_CA', 'ECA'];

function Property(mirror, key){
  Component.call(this, 'li');
  this.mirror = mirror;
  this.attrs = attributes[mirror.propAttributes(key)];
  this.addClass('property');
  this.key = new Key(key);
  this.key.addClass(this.attrs);
  this.append(this.key);
  this.property = mirror.get(key);
  this.append(renderer.render(this.property));
}

inherit(Property, Component, [
  function refresh(){
    var attrs = attributes[this.mirror.propAttributes(this.key.text())];
    if (attrs !== this.attrs) {
      this.key.removeClass(this.attrs);
      this.key.addClass(attrs);
    }
  }
]);



function Proto(mirror){
  Component.call(this, 'li');
  this.mirror = mirror;
  this.addClass('property');
  this.key = new Key('[[Proto]]');
  this.key.addClass('Proto');
  this.key.addClass(this.attrs);
  this.append(this.key);
  this.property = mirror.getPrototype();
  this.append(renderer.render(this.property));
}

inherit(Proto, Property, [
  function refresh(){
    var proto = this.mirror.getPrototype();
    if (this.property !== proto) {
      this.property = proto;
      this.element.removeChild(this.element.lastElementChild);
      this.append(renderer.render(this.property));
    }
  }
]);

function Label(kind){
  Component.call(this, 'div');
  this.addClass('label');
  this.addClass(kind);
}

inherit(Label, Component, [
  function text(value){
    if (value === undefined) {
      return this.element.textContent;
    } else {
      this.element.textContent = value;
      return this;
    }
  }
]);


function Leaf(mirror){
  Component.call(this, 'div');
  this.mirror = mirror;
  this.addClass('leaf');
  this.label = new Label(mirror.kind);
  this.append(this.label);
  this.refresh();
}

Leaf.create = function create(mirror){
  return new Leaf(mirror);
}

inherit(Leaf, Component, [
  function refresh(){
    this.label.text(this.mirror.label());
    return this;
  }
]);



function StringLeaf(mirror){
  Leaf.call(this, mirror);
}

StringLeaf.create = function create(mirror){
  return new StringLeaf(mirror);
}

inherit(StringLeaf, Leaf, [
  function refresh(){
    this.label.text(utility.quotes(this.mirror.subject));
    return this;
  },
]);


function NumberLeaf(mirror){
  Leaf.call(this, mirror);
}

NumberLeaf.create = function create(mirror){
  return new NumberLeaf(mirror);
}

inherit(NumberLeaf, Leaf, [
  function refresh(){
    var label = this.mirror.label();
    this.label.text(label === 'number' ? this.mirror.subject : label);
    return this;
  },
]);




function Tree(){
  Component.call(this, 'ul');
  this.addClass('tree');
  this.expanded = false;
}

var placeholder = _('div');

function replace(parent, element, replacement){
  parent.insertBefore(placeholder, element);
  parent.removeChild(element);
}

inherit(Tree, Component, [
  function expand(){
    if (!this.expanded && this.emit('expand')) {
      this.addClass('expanded');
      this.expanded = true;
      return true;
    }
    return false;
  },
  function contract(){
    if (this.expanded && this.emit('contract')) {
      this.removeClass('expanded');
      this.expanded = false;
      return true;
    }
    return false;
  },
  function toggle(){
    if (this.expanded) {
      return this.contract();
    } else {
      return this.expand();
    }
  },
  function forEach(callback, context){
    context = context || this;
    var children = this.children || [];
    for (var i=0; i < children.length; i++) {
      callback.call(context, children[i], i, this);
    }
  }
]);






function Branch(mirror){
  var self = this,
      initialized;
  Component.call(this, 'div');
  this.mirror = mirror;
  this.label = new Label(mirror.kind);
  this.append(this.label);
  this.addClass('branch');
  this.tree = new Tree;
  this.append(this.tree);
  this.tree.on('expand', function(e){
    if (!initialized) {
      initialized = true;
      mirror.list(true, true).forEach(function(key){
        this.append(new Property(mirror, key));
      }, this);
      this.append(new Proto(mirror));
    } else {
      this.forEach(function(item){
        item.refresh();
      }, this);
    }
  });
  this.refresh();

  this.label.on('click', function(e){
    self.tree.toggle();
  });
}

Branch.create = function create(mirror){
  return new Branch(mirror);
}

inherit(Branch, Component, [
  function refresh(){
    this.label.text(this.mirror.label());
  }
]);


function FunctionBranch(mirror){
  Branch.call(this, mirror);
}

FunctionBranch.create = function create(mirror){
  return new FunctionBranch(mirror);
}

inherit(FunctionBranch, Branch, [
  function refresh(){
    var name = this.mirror.get('name').subject;
    this.label.text(name);
  }
])


var renderer = new debug.Renderer({
  Unknown: Branch.create,
  BooleanValue: Leaf.create,
  StringValue: StringLeaf.create,
  NumberValue: NumberLeaf.create,
  UndefinedValue: Leaf.create,
  NullValue: Leaf.create,
  Array: Branch.create,
  Boolean: Branch.create,
  Date: Branch.create,
  Error: Branch.create,
  Function: FunctionBranch.create,
  Map: Branch.create,
  Object: Branch.create,
  Number: Branch.create,
  RegExp: Branch.create,
  Set: Branch.create,
  String: Branch.create,
  WeakMap: Branch.create
});



var input = new InputBox,
    stdout = new Console,
    root = _('div');

root.className = 'root';


var main = new Panel(null, {
  anchor: 'full',
  name: 'container',
  left: {
    label: 'stdout',
    name: 'output',
    mainSize: 250,
    content: stdout
  },
  right: {
    label: 'Inspector',
    name: 'view',
    mainSize: 'auto',
    content: root
  },
  bottom: {
    label: 'Input',
    anchor: 'bottom',
    name: 'input',
    mainSize: 35,
    content: input
  }
});


function runInContext(code, context){
  if (root.firstChild) {
    root.removeChild(root.firstChild);
  }
  var result = renderer.render(context.eval(code));
  root.appendChild(result.element);
  if (result.tree) {
    result.tree.expand();
  }
  return result;
}


var context = new Continuum;
context.realm.on('write', stdout.append.bind(stdout));
context.realm.on('clear', stdout.clear.bind(stdout));
context.realm.on('backspace', stdout.backspace.bind(stdout));


input.on('entry', function(evt){
  runInContext(evt.value, context);
});

console.log(runInContext('this', context));

input.element.focus();

})(this, continuum.Continuum, continuum.constants, continuum.utility, continuum.debug);
delete continuum

