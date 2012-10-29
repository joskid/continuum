(function(global, Realm, constants, utility, debug){
var inherit = utility.inherit,
    create = utility.create,
    assign = utility.assign,
    define = utility.define,
    isObject = utility.isObject;

function _(s){
  return document.createElement(s);
}

var sides = { left: 0, top: 1, right: 2, bottom: 3 },
    vert = { near: 'top', far: 'bottom', size: 'height' },
    horz = { near: 'left', far: 'right', size: 'width' },
    eventOptions = { bubbles: true, cancelable: true },
    noBubbleEventOptions = { bubbles: false, cancelable: true },
    opposites = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' },
    min = Math.min,
    max = Math.max;



function Component(tag){
  if (tag instanceof Element) {
    this.element = tag;
  } else {
    this.element = _(tag);
  }
  if (this.element.classList) {
    this.classes = this.element.classList;
  }
  this.styles = this.element.style;
}

define(Component.prototype, {
  ns: 'ƒ'
});

define(Component.prototype, [
  function on(event, listener, receiver){
    receiver = receiver || this;
    function bound(e){ return listener.call(receiver, e) };
    define(listener, bound);
    this.element.addEventListener(event, bound, false);
    return this;
  },
  function off(event, listener){
    this.element.removeEventListener(event, listener.bound, false);
    delete listener.bound;
    return this;
  },
  function once(event, listener, receiver){
    receiver = receiver || this;
    this.element.addEventListener(event, function bound(e){
      this.removeEventListener(event, bound, false);
      return listener.call(receiver, e);
    }, false);
    return this;
  },
  function emit(event, data){
    if (typeof event === 'string') {
      var opts = data && data.bubbles === false ? noBubbleEventOptions : eventOptions;
      event = new Event(event, opts);
    }
    if (data) {
      for (var k in data) {
        if (k !== 'bubbles') {
          event[k] = data[k];
        }
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
    return subject;
  },
  function remove(subject){
    if (subject === undefined) {
      this.element.parentNode.removeChild(this.element);
    } else {
      if (subject.element) {
        subject = subject.element;
      }
      this.element.removeChild(subject);
    }
  },
  function width(value){
    if (value === undefined) {
      return this.element.getBoundingClientRect().width;
    } else {
      this.styles.width = value + 'px';
    }
  },
  function height(value){
    if (value === undefined) {
      return this.element.getBoundingClientRect().height;
    } else {
      this.styles.height = value + 'px';
    }
  },
  function left(value){
    if (value === undefined) {
      return this.element.getBoundingClientRect().left;
    } else {
      this.styles.left = value + 'px';
    }
  },
  function top(value){
    if (value === undefined) {
      return this.element.getBoundingClientRect().top;
    } else {
      this.styles.top = value + 'px';
    }
  },
  function bounds(){
    return this.element.getBoundingClientRect();
  },
  function getMetric(name){
    return parseFloat(this.getComputed(name));
  },
  function getComputed(name){
    if (!this.computedStyles) {
      this.computedStyles = getComputedStyle(this.element);
    }
    return this.computedStyles[name];
  },
  function offset(){
    return {
      left: this.element.offsetLeft + this.getMetric('marginLeft'),
      top: this.element.offsetTop + this.getMetric('marginTop')
    }
  },
  function text(value){
    if (value === undefined) {
      return this.element.textContent;
    } else {
      this.element.textContent = value;
      return this;
    }
  },
  function clear(){
    this.innerHTML = '';
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

// var handlers = {};

// function registerHandler(type, handler){
//   handlers[type] = handler
// }

// registerHandler('mouseenter', function(target, callback){
//   target.on('mouseover', function(e){
//     var from = window.event ? e.srcElement : e.target,
//         to = e.relatedTarget || e.toElement;

//     while (related !== from && to.nodeName !== document.body) {
//       to = to.parentNode;
//     }
//   });
// });
// if (type === 'mouseenter') {


function PanelOptions(o){
  o = Object(o);
  for (var k in this) {
    if (k in o) {
      this[k] = o[k];
    }
  }
}

PanelOptions.prototype = {
  size: 'auto',
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
    this.append(label);
  }

  if (options.name) {
    this.name = options.name;
    this.element.id = options.name;
  }

  this.addClass('panel');

  if (parent) {
    this.parent = parent;
    this.size = options.size;
  } else {
    this.parent = null;
    this.addClass('root');
  }


  function append(side){
    self[side] = Panel.from(self, options[side]);
    self[side].anchor = side;
    self.append(self[side]);
    self[side].addClass(side);
    return self[side];
  }

  if (options.content) {
    if (options.content instanceof Element) {
      this.content = new Component(options.content);
    } else if (options.content instanceof Component) {
      this.content = options.content;
    }
    this.append(this.content);
  } else {
     if (options.left || options.right) {
      this.orient = 'horizontal';
      var first = append('left'),
          second = append('right');
    } else if (options.top || options.bottom) {
      this.orient = 'vertical';
      var first = append('top'),
          second = append('bottom');
    } else {
      throw new Error('invalid options');
    }

    this.addClass(this.orient);
    if (options.splitter) {
      this.splitter = new Splitter(first, second, this.orient);
    }
  }

  if (!parent) {
    var update = function(){
      var rect = self.bounds();
      self.calcWidth = rect.width;
      self.calcHeight = rect.height;
      self.recalc();
      self.resize();
    };

    window.addEventListener('resize', update, true);
    document.body.appendChild(this.element);
    var computed = getComputedStyle(this.element);
    this.size = 1;
    update();
  }
}

define(Panel, [
  function from(parent, obj){
    if (obj instanceof Panel) {
      return obj;
    } else if (obj && typeof obj === 'object') {
      return new Panel(parent, obj);
    }
  }
]);

function length(value, container){
  if (value >= -1 && value <= 1) {
    return value * container;
  } else {
    return value;
  }
}

inherit(Panel, Component, [
  function resize(){
    if (this.content) {
      this.content.width(this.content.calcWidth);
      this.content.height(this.content.calcHeight);
      this.content.resize && this.content.resize();
    } else if (this.orient === 'vertical') {
      this.top.height(this.top.calcHeight);
      this.top.resize && this.top.resize();
      this.bottom.height(this.bottom.calcHeight);
      this.bottom.resize && this.bottom.resize();
    } else if (this.orient === 'horizontal') {
      this.left.width(this.left.calcWidth);
      this.left.resize && this.left.resize();
      this.right.width(this.right.calcWidth);
      this.right.resize && this.right.resize();
    }
  },
  function recalc(){
    if (this.content) {
      this.content.calcWidth = this.calcWidth;
      this.content.calcHeight = this.calcHeight;
      this.content.recalc && this.content.recalc();
    } else {
      if (this.orient === 'vertical') {
        var first = 'top',
            second = 'bottom',
            main = 'calcHeight',
            cross = 'calcWidth';
      } else {
        var first = 'left',
            second = 'right',
            main = 'calcWidth',
            cross = 'calcHeight';
      }

      if (this[first] && this[second]) {
        this[first][cross] = this[second][cross] = this[cross];
        if (this[first].size === 'auto' && this[second].size === 'auto') {
          this[first][main] = this[second][main] = this[main] / 2 | 0;
        } else {
          if (this[first].size === 'auto') {
            var primary = this[second];
                second = this[first];
          } else {
            var primary = this[first];
                second = this[second];
          }
          primary[main] = length(primary.size, this[main]);
          second[main] = this[main] - primary[main];
        }
        this[first].recalc && this[first].recalc();
        this[second] && this[second].recalc && this[second].recalc();
      }
    }
  }
]);



function Dragger(target){
  Component.call(this, 'div');
  this.target = target;
  this.addClass('drag-helper');
  target.on('mousedown', this.grab, this);
  this.on('mousemove', this.drag);
  target.on('mouseup', this.drop, this);
}

inherit(Dragger, Component, [
  function grab(e){
    e.preventDefault();
    document.body.appendChild(this.element);
    this.x = e.pageX;
    this.y = e.pageY;
    this.start = this.target.offset();
    this.emit('grab');
  },
  function drag(e){
    this.emit('drag', this.calculate(e.pageX, e.pageY));
  },
  function drop(e){
    if (this.element.parentNode) {
      document.body.removeChild(this.element);
      this.emit('drop', this.calculate(e.pageX, e.pageY));
    }
  },
  function calculate(x, y){
    var xDelta = this.x - x,
        yDelta = this.y - y;

    return {
      xDelta: xDelta,
      yDelta: yDelta,
      xOffset: xDelta + this.start.left,
      yOffset: yDelta + this.start.top
    };
  },
]);


var Splitter = (function(){

  function Splitter(near, far, orientation){
    if (!(this instanceof splitters[orientation])) {
      return new splitters[orientation](near, far);
    }
    Component.call(this, 'div');
    this.near = near;
    this.far = far;
    this.parent = near.parent;

    this.addClass('splitter');
    this.addClass('splitter-'+orientation);
    this.parent.addClass('splitter-container');
    far.addClass('splitter-side');
    near.addClass('splitter-side');
    far.append(this);

    this.lastNear = this.nearSize();
    this.lastFar = this.parentSize() - this.lastNear;
    this.position(0);

    this.dragger = new Dragger(this);
    this.dragger.on('grab', this.grab, this);
    this.dragger.on('drag', this.drag, this);
    this.dragger.on('drop', this.drop, this);

  }


  inherit(Splitter, Component, [
    function grab(e){
      this.addClass('dragging');
      this.startSize = this.nearSize();
    },
    function drag(e){
      var container = this.parentSize();
      this.set(min(max(this.size(), this.startSize - this.mouseOffset(e)), container), container);
    },
    function drop(e){
      this.removeClass('dragging');
    },
    function refresh(){
      this.set(this.lastNear, this.parentSize(), true);
    },
    function set(near, container, silent){
      if (this.maximized === -1) {
        if (container < this.lastSize) {
          near = container;
        }
      }

      var far = container - near;

      if (this.lastNear !== near || this.lastFar !== far) {
        this.lastNear = near;
        this.lastFar = far;
        //this.nearSize(near);
        //this.farSize(far);

        this.near.size = near / container;
        this.far.size = 'auto';
        this.parent.recalc();
        this.parent.resize();

        // if (!silent) {
        //   this.emit('change-split', {
        //     change: near - far,
        //     near: near,
        //     far: far,
        //     percent: (near / container * 100 | 0) / 100,
        //     bubbles: false
        //   });
        // }
      }
    },
  ]);

  function VerticalSplitter(near, far){
    Splitter.call(this, near, far, 'vertical');
    this.near.addClass('splitter-top');
    this.far.addClass('splitter-bottom');
    this.dragger.addClass('row-resize');
  }

  inherit(VerticalSplitter, Splitter, [
    function nearSize(v){
      return this.near.height(v);
    },
    function farSize(v){
      return this.far.height(v);
    },
    function parentSize(v){
      return this.parent.height(v);
    },
    function size(v){
      return this.height(v);
    },
    function position(v){
      return this.left(v);
    },
    function mouseOffset(e){
      return e.yDelta;
    }
  ]);


  function HorizontalSplitter(near, far){
    Splitter.call(this, near, far, 'horizontal');
    this.near.addClass('splitter-left');
    this.far.addClass('splitter-right');
    this.dragger.addClass('col-resize');
  }

  inherit(HorizontalSplitter, Splitter, [
    function nearSize(v){
      return this.near.width(v);
    },
    function farSize(v){
      return this.far.width(v);
    },
    function parentSize(v){
      return this.parent.width(v);
    },
    function size(v){
      return this.width(v);
    },
    function position(v){
      return this.top(v);
    },
    function mouseOffset(e){
      return e.xDelta;
    }
  ]);

  var splitters = {
    vertical: VerticalSplitter,
    horizontal: HorizontalSplitter
  };

  return Splitter;
})();



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
  tag: 'textarea',
  autofocus: false
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

  if (options.autofocus) {
    this.element.focus();
  }

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
    if (this.disabled) return;
    this.element.value = value;
    this.emit(reason, value);
    return this;
  },
  function emit(event, value){
    if (this.disabled) return;

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
  },
  function disable(){
    this.element.disabled = true;
    this.disabled = true;
  },
  function enable(){
    this.element.disabled = false;
    this.disabled = false;
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
  this.key = new Key('__proto__');
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
      mirror.list(true).forEach(function(key){
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

  var name = this.mirror.getName(),
      params = this.mirror.getParams();

  if (params.rest) {
    params.push('...'+params.pop());
  }

  this.label.append(new Span(name, 'FunctionName'));
  var paramContainer = new Span('', 'Params');
  for (var i=0; i < params.length; i++) {
    paramContainer.append(new Span(params[i], 'Param'))
  }
  this.label.append(paramContainer);
}

FunctionBranch.create = function create(mirror){
  return new FunctionBranch(mirror);
}

inherit(FunctionBranch, Branch, [
  function refresh(){ }
]);



function ThrownBranch(mirror){
  Branch.call(this, mirror);
}

ThrownBranch.create = function create(mirror){
  return new ThrownBranch(mirror);
}

inherit(ThrownBranch, Branch, [
  function refresh(){
    this.label.innerHTML = '';
    this.label.append(new Div('Uncaught Exception', 'Exception'));
    this.label.append(new Div(this.mirror.getError()));
  }
]);

'Uncaught Exception'
var renderer = new debug.Renderer({
  Unknown: Branch.create,
  BooleanValue: Leaf.create,
  StringValue: StringLeaf.create,
  NumberValue: NumberLeaf.create,
  UndefinedValue: Leaf.create,
  NullValue: Leaf.create,
  Global: Branch.create,
  Thrown: ThrownBranch.create,
  Array: Branch.create,
  Boolean: Branch.create,
  Date: Branch.create,
  Error: Branch.create,
  Function: FunctionBranch.create,
  JSON: Branch.create,
  Map: Branch.create,
  Math: Branch.create,
  Object: Branch.create,
  Number: Branch.create,
  RegExp: Branch.create,
  Set: Branch.create,
  String: Branch.create,
  WeakMap: Branch.create
});

function Span(text, name){
  Component.call(this, 'span');
  this.name = name;
  this.text(text);
  if (name) {
    this.addClass(name);
  }
}

inherit(Span, Component, []);

function Div(text, name){
  Component.call(this, 'div');
  this.name = name;
  this.text(text);
  if (name) {
    this.addClass(name);
  }
}

inherit(Div, Component, []);


function Button(text, name){
  Component.call(this, 'button');
  this.addClass('button');
  if (name) {
    this.addClass(name);
  }
  this.face = this.append(new Div(text, 'button-text'));
}

inherit(Button, Component, [
  function text(value){
    return this.face.text(value);
  }
]);



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
  this.append(new Span(op.name, 'op-name'));
  if (op.name === 'GET' || op.name === 'PUT') {
    if (!isObject(item)) {
      var type = typeof item;
      this.append(new Span(translators[type](item), typeofs[type]));
    } else {
      if (item.Reference) {
        if (item.base) {
          if (item.base.bindings) {
            if (item.base.bindings.NativeBrand) {
              if (item.name === '__proto__') {
                item = item.base.bindings.GetPrototype();
              } else {
                item = item.base.bindings.properties[item.name];
              }
            } else if (item.name in item.base.bindings) {
              item = item.base.bindings[item.name];
            }
          } else if (item.base.NativeBrand) {
            if (item.name === '__proto__') {
              item = item.base.GetPrototype();
            } else {
              item = item.base.properties[item.name];
            }
          }
        }
      }
      if (item && item.NativeBrand) {
        var result = renderer.render(item);
        this.append(result);
      }
    }
  } else if (op.name === 'BINARY') {
    this.append(new Span(constants.BINARYOPS.getKey(instruction[0]), 'Operator'));
  } else if (op.name === 'UNARY') {
    this.append(new Span(constants.UNARYOPS.getKey(instruction[0]), 'Operator'));
  } else {
    for (var i=0; i < op.params; i++) {
      var param = instruction[i];
      if (!isObject(param)) {
        this.append(new Span(param, typeofs[typeof param]));
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
  function append(item){
    Component.prototype.append.call(this, item);
    this.element.scrollTop = this.element.scrollHeight;
  }
]);



function Queue(items){
  this.items = items instanceof Queue ? items.items.slice(items.index) : [];
  this.length = this.items.length;
  this.index = 0;
}

define(Queue.prototype, [
  function append(item){
    this.items.push(item);
    this.length++;
    return this;
  },
  function shift(){
    if (this.length) {
      var item = this.items[this.index];
      this.items[this.index++] = null;
      this.length--;
      if (this.index === 500) {
        this.items = this.items.slice(this.index);
        this.index = 0;
      }
      return item;
    }
  }
]);


function Feeder(callback, context){
  var self = this;
  this.queue = new Queue;
  this.active = false;
  this.feeder = feeder;

  function feeder(){
    var item, i = self.queue.length;
    if (i > 5) i = 5;

    while (self.active && i--) {
      callback.call(context, self.queue.shift());
    }

    if (!self.queue.length) {
      self.active = false;
    } else if (self.active) {
      setTimeout(feeder, 15);
    }
  }
}

define(Feeder.prototype, [
  function append(item){
    this.queue.append(item);
    if (!this.active) {
      this.active = true;
      setTimeout(this.feeder, 15);
    }
    return this;
  },
  function pause(){
    this.active = false;
  }
]);





var input = new InputBox({ hint: 'Enter code to run...', autofocus: true }),
    stdout = new Console,
    root = _('div'),
    instructions = new Instructions;

root.className = 'root';


var main = new Panel(null, {
  name: 'container',
  top: {
    left: {
      size: 250,
      top: {
        size: .7,
        label: 'Instructions',
        name: 'instructions',
        content: instructions
      },
      bottom: {
        label: 'stdout',
        name: 'output',
        content: stdout
      },
    },
    right: {
      label: 'Inspector',
      name: 'view',
      content: root
    },
  },
  bottom: {
    label: 'Input',
    name: 'input',
    size: 35,
    content: input
  }
});


function runInContext(code, realm){
  if (root.firstChild) {
    root.removeChild(root.firstChild);
  }
  var result = renderer.render(realm.eval(code));
  root.appendChild(result.element);
  if (result.tree) {
    result.tree.expand();
  }
  return result;
}


var realm = new Realm;

runInContext('this', realm);



var ops = new Feeder(function(op){
  instructions.append(new Instruction(op[0], op[1]));
});

realm.on('op', function(op){
  ops.append(op);
});

realm.on('write', stdout.append.bind(stdout));
realm.on('clear', stdout.clear.bind(stdout));
realm.on('backspace', stdout.backspace.bind(stdout));
realm.on('pause', function(){
  body.addClass('paused');
  input.disable();
  var overlay = new Div('', 'overlay');
  body.append(overlay);

  var unpause = body.append(new Button('Unpause', 'unpause'));
  unpause.once('click', function(){
    body.removeClass('paused');
    input.enable();
    unpause.remove();
    overlay.remove();
    realm.resume();
  });
});





var body = new Component(document.body);

input.on('entry', function(evt){
  runInContext(evt.value, realm);
});


})(this, continuum.Realm, continuum.constants, continuum.utility, continuum.debug);
delete continuum

