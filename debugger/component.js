(function(global){
var utility = continuum.utility,
    inherit = utility.inherit,
    create = utility.create,
    assign = utility.assign,
    define = utility.define,
    each = utility.each;



var eventOptions = { bubbles: true, cancelable: true },
    noBubbleEventOptions = { bubbles: false, cancelable: true },
    min = Math.min,
    max = Math.max;


function forward(o, from, to){
  Object.defineProperty(o, to, {
    configurable: true,
    get: function(){ return this[from] },
    set: function(v){ this[from] = v }
  });
  return o;
}




try {
  new global.Event('test');
  var Event = global.Event;
} catch (e) {
  var Event = (function(E){
    function EventInit(type, o){
      if (o)
        for (var k in this)
          if (k in o)
            this[k] = o[k];
      if (type)
        this.type = type;
    }

    EventInit.prototype = assign(create(null), eventOptions);
    EventInit.prototype.type = '';


    if ('createEvent' in document) {
      var Event = function Event(type, dict){
        dict = new EventInit(type, dict);
        var evt = document.createEvent('Event');
        evt.initEvent(dict.type, dict.bubbles, dict.cancelable);
        return evt;
      };
    } else {
      var Event = (function(){
        function Event(type, dict){
          var evt = document.createEventObject();
          dict = new EventInit(type, dict);
          dict.cancelBubble = dict.bubbles;
          for (var k in dict) {
            evt[k] = dict[k];
          }
          return evt;
        }

        function preventDefault(){
          this.returnValue = false;
        }

        define(E.prototype, preventDefault);

        forward(E.prototype, 'screenX', 'pageX');
        forward(E.prototype, 'screenY', 'pageY');

        return Event;
      })();
    }

    Event.prototype = E.prototype;
    define(Event.prototype, 'constructor', Event);

    return Event;
  })(global.Event);
}




var Component = (function(){
  var textContent = 'textContent' in document.body ? 'textContent' : 'innerText';

  if ('getComputedStyle' in window) {
    var getComputedStyle = window.getComputedStyle;
  } else {
    var getComputedStyle = function(el){
      return el.currentStyle;
    };
  }

  function Component(tag){
    if (typeof tag === 'string') {
      this.element = document.createElement(tag);
    } else {
      this.element = tag;
    }
    if (this.element.classList) {
      this.classes = this.element.classList;
    }
    this.styles = this.element.style;
    this.element.component = this;
  }

  define(Component.prototype, {
    ns: 'ƒ'
  });

  define(Component.prototype, [
    function append(subject){
      if (!subject) return subject;
      if (subject.element) {
        this.children || (this.children = new utility.LinkedList);
        this.children.push(subject);
        this.element.appendChild(subject.element);
      } else if (subject instanceof Element) {
        this.element.appendChild(subject);
      }
      return subject;
    },
    function batchAppend(subject){
      if (!subject) return subject;
      if (!this.batcher) {
        var self = this,
            batcher = this.batcher = document.createDocumentFragment();
        setTimeout(function(){
          self.element.appendChild(self.batcher);
          self.batcher = null;
          self.onBatchAppend(batcher);
        }, 1);
      }
      if (subject.element) {
        this.children || (this.children = []);
        this.children.push(subject);
        this.batcher.appendChild(subject.element);
      } else if (subject instanceof Element) {
        this.batcher.appendChild(subject);
      }
      return subject;
    },
    function onBatchAppend(){
    },
    function insert(subject, before){
      if (!this.children) {
        return this.append(subject);
      }
      if (subject instanceof Element) {
        subject = new Component(subject);
      }

      this.children.insertBefore(subject, before);
      this.element.insertBefore(subject.element, before.element);
    },
    function remove(subject){
      if (subject === undefined) {
        var parent = this.parent();
        if (parent) {
          parent.remove(this);
        } else {
          this.element.parentNode.removeChild(this.element);
        }
      } else {
        if (!subject.element && subject.component) {
          subject = subject.component;
        }

        if (subject.element) {
          if (this.children) {
            this.children.remove(subject);
          }
          subject = subject.element;
        }

        if (subject && subject.parentNode) {
          if (subject.parentNode === this.element) {
            this.element.removeChild(subject);
          }
        } else if (subject === this.element.parentNode) {
          subject.removeChild(this.element);
        } else {
          console.dir(subject);
        }
      }
    },
    function replace(child, replacement){
      if (!replacement.element) {
        if (replacement.component) {
          replacement = replacement.component;
        } else if (replacement instanceof Element || replacement instanceof Document) {
          replacement = new Component(replacement);
        }
      }

      if (this.children) {
        this.children.replace(child, replacement);
      } else {
        this.children = new utility.LinkedList;
        this.children.push(replacement);
      }

      this.element.insertBefore(replacement.element, child.element);
      this.element.removeChild(child.element);
    },
    function width(value){
      if (value === undefined) {
        return this.element.offsetWidth;
      } else {
        this.styles.width = value + 'px';
      }
    },
    function height(value){
      if (value === undefined) {
        return this.element.offsetHeight;
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
    function right(value){
      if (value === undefined) {
        return this.element.getBoundingClientRect().right;
      } else {
        this.styles.right = value + 'px';
      }
    },
    function top(value){
      if (value === undefined) {
        return this.element.getBoundingClientRect().top;
      } else {
        this.styles.top = value + 'px';
      }
    },
    function bottom(value){
      if (value === undefined) {
        return this.element.getBoundingClientRect().bottom;
      } else {
        this.styles.bottom = value + 'px';
      }
    },
    function bounds(){
      return this.element.getBoundingClientRect();
    },
    function getMetric(name){
      var v = this.getComputed(name);
      return v === 'auto' ? 0 : parseFloat(v);
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
    function clear(){
      this.innerHTML = '';
    },
    function hide(){
      this.element.style.display = 'none';
    },
    function show(){
      this.element.style.display = '';
    },
    function parent(){
      var node = this.element.parentNode;
      if (node) {
        if (!node.component) {
          return new Component(node);
        } else {
          return node.component;
        }
      }
    },
    function style(name, val){
      if (typeof name === 'string') {
        if (typeof val === 'number') {
          val += 'px';
        }
        this.element.style[name] = val;
      } else {
        for (var k in name) {
          var val = name[k];
          if (typeof val === 'number') {
            val += 'px';
          }
          this.element.style[k] = val;
        }
      }
    },
    function child(){
      var el = this.element.firstChild;
      if (el && el.component) {
        return el.component;
      } else if (el) {
        return new Component(el);
      }
    },
    function text(value){
      if (value === undefined) {
        return this.element[textContent];
      } else {
        this.element[textContent] = value;
        return this;
      }
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
    void function(){
      var cache = create(null);

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
    }();
  }


  if ('dispatchEvent' in document.body) {
    define(Component.prototype, [
      function on(event, listener, receiver){
        if (typeof listener !== 'function') {
          for (var k in listener) {
            this.on(k, listener[k], receiver)
          }
          return this;
        }

        receiver || (receiver = this);

        function bound(e){
          return listener.call(receiver, e);
        }

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

        function bound(e){
          this.removeEventListener(event, bound, false);
          return listener.call(receiver, e);
        }

        this.element.addEventListener(event, bound, false);
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
      }
    ]);
  } else {
    void function(){
      var realEvents = create(null);
      each([
        'activate', 'afterupdate', 'beforeactivate', 'beforecopy', 'beforecut', 'beforedeactivate',
        'beforeeditfocus', 'beforepaste', 'beforeupdate', 'blur', 'cellchange', 'click', 'contextmenu',
        'controlselect', 'copy', 'dataavailable', 'datasetchanged', 'datasetcomplete', 'dblclick',
        'deactivate', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop',
        'errorupdate', 'filterchange', 'focus', 'focusin', 'focusout', 'help', 'keydown', 'keyup',
        'losecapture', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseup',
        'mousewheel', 'move', 'moveend', 'movestart', 'paste', 'propertychange', 'readystatechange',
        'resize', 'resizeend', 'resizestart', 'rowenter', 'rowexit', 'rowsdelete', 'rowsinserted',
        'scroll', 'selectstart'
      ], function(name){ realEvents[name] = true });

      define(Component.prototype, [
        function on(event, listener, receiver){
          if (typeof listener !== 'function') {
            for (var k in listener) {
              this.on(k, listener[k], receiver)
            }
            return this;
          }

          receiver || (receiver = this);

          var real = event in realEvents;

          if (real) {
            var bound = function(e){
              return listener.call(receiver, e);
            };
          } else {
            var bound = function(e){
              e = e.srcElement.customEvent;
              if (e && !e.expired && e.type === event) {
                return listener.call(receiver, e);
              }
            };
          }

          define(listener, 'bound', bound);
          event = real ? event : 'propertychange';
          this.element.attachEvent('on'+event, bound);
          return this;
        },
        function off(event, listener){
          event = event in realEvents ? event : 'propertychange';
          this.element.detachEvent('on'+event, listener.bound);
          delete listener.bound;
          return this;
        },
        function once(event, listener, receiver){
          function one(e){
            this.off(event, one);
            return listener.call(receiver, e);
          }
          this.on(event, one, this);
          return this;
        },
        function emit(event, data){
          if (typeof event === 'string') {
            var opts = data && data.bubbles === false ? noBubbleEventOptions : eventOptions;
            event = new Event(event, opts);
          }

          if (data) {
            for (var k in data) {
              event[k] = data[k];
            }
          }

          if (event in realEvents) {
            return this.element.fireEvent(event);
          } else {
            this.element.customEvent = event;
            event.expired = true;
            return event.returnValue === undefined ? true : event.returnValue;
          }
        }
      ]);
    }();
  }

  return Component;
})();



var Inline = (function(){
  function Inline(text, name){
    Component.call(this, 'span');
    this.name = name;
    this.text(text);
    if (name) {
      this.addClass(name);
    }
  }

  inherit(Inline, Component, []);

  return Inline;
})();

var Block = (function(){
  function Block(text, name){
    Component.call(this, 'div');
    if (text && text[0] === '.') {
      name = text.slice(1);
      text = '';
    }
    this.name = name;
    text && this.text(text);
    name && this.addClass(name);
  }

  inherit(Block, Component, []);

  return Block;
})();


var Button = (function(){
  function Button(text, name){
    Component.call(this, 'button');
    this.addClass('button');
    if (name) {
      this.addClass(name);
    }
    this.face = this.append(new Block(text, 'button-text'));
  }

  inherit(Button, Component, [
    function text(value){
      return this.face.text(value);
    }
  ]);

  return Button;
})();


var VerticalScrollbar = function(){
  var scrollbarWidth = (function(d, b, e, s) {
    b = d.body;
    e = b.appendChild(document.createElement('div'));
    (s = e.style).height = s.width = '50px';
    s.overflowX = 'scroll';
    e.appendChild(document.createElement('div')).style.width = '100px';
    s = e.offsetHeight - e.clientHeight;
    b.removeChild(e);
    e = null;
    return s;
  })(document);

  function VerticalScrollbar(container){
    var self = this;
    Component.call(this, 'div');
    this.addClass('scroll');
    this.track = this.append(new Block('.scroll-track'));
    this.thumb = this.track.append(new Block('.scroll-thumb'));
    this.up = this.append(new Block('.scroll-top'));
    this.down = this.append(new Block('.scroll-bottom'));

    if (container instanceof Element) {
      container = new Component(container);
    }
    var parent = container.parent();

    parent.right(-scrollbarWidth);
    var oldWidth = parent.width;

    parent.width = function(value){
      if (value === undefined) {
        return oldWidth.call(parent) - scrollbarWidth;
      } else {
        oldWidth.call(parent, value + scrollbarWidth + 2);
      }
    };

    container.resize = function(){
      this.scrollbar.refresh();
    };

    parent.style('overflowX', 'hidden');
    container.style({
      paddingRight: container.getMetric('paddingRight') + scrollbarWidth,
      overflowY: 'auto'
    });
    parent.addClass('scroll-container');
    container.addClass('scrolled');
    this.container = container;
    container.append(this);
    container.scrollbar = this;
    container.on('scroll', this.refresh, this);
    container.on('click', this.refresh, this);


    this.dragger = new Dragger(this.thumb, {
      grab: function(e){
        var el = self.container.element;
        self.thumb.addClass('scrolling');
        self.start = el.scrollTop * el.clientHeight - el.scrollHeight * e.clientY;
      },
      drag: function(e){
        var el = self.container.element;
        el.scrollTop = (self.start + el.scrollHeight * e.clientY) / el.clientHeight;
      },
      drop: function(e){
        self.thumb.removeClass('scrolling');
      }
    });
    this.dragger.addClass('pointer');


    this.down.on('mousedown', function(e){
      self.repeat(.005, 15);
      this.addClass('scrolling');
      e.preventDefault();
    });

    this.up.on('mousedown', function(e){
      self.repeat(-.005, 15);
      this.addClass('scrolling');
      e.preventDefault();
    });

    this.track.on('mousedown', function(e){
      var compare = e.pageY > self.thumb.bottom() ? 1 : e.pageY < self.thumb.top() ? -1 : 0;
      if (compare) {
        this.addClass('scrolling');
        self.repeat(compare * .1, 300);
      }
      e.preventDefault();
    });

    this.on('scroll-end', function(){
      this.track.removeClass('scrolling');
      this.down.removeClass('scrolling');
      this.up.removeClass('scrolling');
    });
  }

  inherit(VerticalScrollbar, Component, [
    function repeat(amount, speed){
      var self = this;
      speed = speed || 300;
      self.repeating = true;

      body.once('mouseup', function(){
        if (self.repeating) {
          self.repeating = false;
          self.emit('scroll-end')
        }
      });

      body.once('click', function(){
        if (self.repeating) {
          self.repeating = false;
          self.emit('scroll-end')
        }
      });

      function loop(){
        if (self.repeating) {
          var percent = max(min(self.percent() + amount, 1), 0);
          self.percent(percent);
          if (percent !== 1 && percent !== 0) {
            setTimeout(loop, speed);
          } else if (self.repeating) {
            self.repeating = false;
            self.emit('scroll-end');
          }
        }
      }

      setTimeout(loop, 100);
    },
    function scrollHeight(){
      return this.container.element.scrollHeight - this.container.element.clientHeight;
    },
    function percent(val){
      var el = this.container.element;
      if (val === undefined) {
        return (el.scrollTop + el.clientHeight) / el.scrollHeight;
      } else {
        el.scrollTop = val * el.scrollHeight - el.clientHeight;
      }
    },
    function scrollRelative(percent){
      this.percent(this.percent() + percent);
    },
    function resize(){
      this.refresh();
    },
    function thumbTop(){
      var el = this.container.element;
      return el.scrollTop / el.scrollHeight * this.track.height() + .5 | 0;
    },
    function thumbBottom(){
      var el = this.container.element,
          height = this.track.height();
      return height - (el.clientHeight + el.scrollTop) / el.scrollHeight * height + .5 | 0;
    },
    function trackHeight(){
      var self = this;
      if (!this._trackHeight) {
        this._trackHeight = this.track.height();
        setTimeout(function(){
          this._trackHeight = 0;
        }, 10);
      }
      return this._trackHeight;
    },
    function scale(value){
      var el = this.container.element;
      return value / el.scrollHeight * this.trackHeight() + .5 | 0;
    },
    function refresh(){
      var top = this.thumbTop(),
          bottom = this.thumbBottom();

      this.thumb.top(top);
      this.thumb.bottom(bottom);
      if (!this.disabled && !top && !bottom) {
        this.disabled = true;
        this.addClass('disabled');
      } else if (this.disabled && top || bottom) {
        this.disabled = false;
        this.removeClass('disabled');
      }
    }
  ]);

  return VerticalScrollbar;
}();


var Panel = function(){
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
    scroll: null
  };

  function Panel(parent, options){
    var self = this;
    Component.call(this, 'div');
    options = new PanelOptions(options);

    if (options.label) {
      var label = new Component('h2');
      label.text(options.label);
      label.addClass('panel-label');
      this.append(label);
    }

    if (options.name) {
      this.name = options.name;
      this.element.id = options.name;
    }

    this.addClass('panel');

    if (parent) {
      this._parent = parent;
      this.size = options.size;
    } else {
      this._parent = null;
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
        //var rect = self.bounds();
        self.calcWidth = self.element.clientWidth;
        self.calcHeight = self.element.clientHeight;
        self.recalc();
        self.resize();
      };

      win.on('resize', update);
      body.append(this.element);
      this.size = 1;
      update();
    }

    if (options.scroll && this.content) {
      this.scrollbar = new VerticalScrollbar(this.content);
    }
  }


  function length(value, container){
    if (value >= -1 && value <= 1) {
      return value * container;
    } else {
      return value;
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


  inherit(Panel, Component, [
    function resize(){
      if (this.content) {
        //this.content.width(this.content.calcWidth);
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
            this[first][main] = this[second][main] = this[main] / 2 + .5 | 0;
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

  return Panel;
}();

var Dragger = (function(){
  function Dragger(target, bindings){
    Component.call(this, 'div');
    this.target = target;
    this.addClass('drag-helper');
    target.on('mousedown', this.grab, this);
    this.on('mousemove', this.drag);
    target.on('mouseup', this.drop, this);
    this.on('mouseup', this.drop);
    if (bindings) {
      for (var k in bindings) {
        this.on(k, bindings[k]);
      }
    }
  }

  inherit(Dragger, Component, [
    function grab(e){
      body.append(this);
      this.x = e.pageX;
      this.y = e.pageY;
      this.start = this.target.offset();
      this.emit('grab', {
        x: this.x,
        y: this.x,
        clientX: e.clientX,
        clientY: e.clientY
      });
      e.preventDefault();
    },
    function drag(e){
      this.emit('drag', this.calculate(e));
    },
    function drop(e){
      if (this.element.parentNode) {
        body.remove(this);
        this.emit('drop', this.calculate(e));
      }
    },
    function calculate(e){
      var xDelta = this.x - e.pageX,
          yDelta = this.y - e.pageY;

      return {
        x: e.pageX,
        y: e.pageY,
        clientX: e.clientX,
        clientY: e.clientY,
        xDelta: xDelta,
        yDelta: yDelta,
        xOffset: xDelta + this.start.left,
        yOffset: yDelta + this.start.top
      };
    },
  ]);

  return Dragger;
})();

var Splitter = (function(){
  function Splitter(near, far, orientation){
    if (!(this instanceof splitters[orientation])) {
      return new splitters[orientation](near, far);
    }
    Component.call(this, 'div');
    this.near = near;
    this.far = far;
    this._parent = near._parent;

    this.addClass('splitter');
    this.addClass('splitter-'+orientation);
    this._parent.addClass('splitter-container');
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
    function render(){
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
        this.near.size = near / container;
        this.far.size = 'auto';
        this._parent.recalc();
        this._parent.resize();
      }
    }
  ]);

  var splitters = {
    vertical: (function(){
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
          return this._parent.height(v);
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

      return VerticalSplitter;
    })(),
    horizontal: (function(){
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
          return this._parent.width(v);
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

      return HorizontalSplitter;
    })()
  };

  return Splitter;
})();


function _(subject){
  if (typeof subject === 'string') {
    return new Component(subject);
  } else if (subject.component) {
    return subject.component;
  } else if (subject instanceof Element || subject instanceof Document) {
    return new Component(subject);
  }
}

function inline(text, name){
  return new Inline(text, name);
}

function block(text, name){
  return new Block(text, name);
}


continuum._ = _;
continuum.inline = inline;
continuum.block = block;
continuum.Component = Component;

continuum.createPanel = function createPanel(type, parent, options){
  return new panels[type](parent, options);
};

var panels = continuum.createPanel.panels = {
  panel: Panel,
  button: Button,
  scrollbar: VerticalScrollbar
};

var win = new Component(window),
    body = new Component(document.body);

})(this, continuum);
