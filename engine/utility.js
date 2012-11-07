var utility = (function(exports){
  var BOOLEAN   = 'boolean',
      FUNCTION  = 'function',
      NUMBER    = 'number',
      OBJECT    = 'object',
      STRING    = 'string',
      UNDEFINED = 'undefined';

  var toBrand = {}.toString,
      slice = [].slice,
      hasOwn = {}.hasOwnProperty,
      toSource = Function.toString;

  var hasDunderProto = { __proto__: [] } instanceof Array;


  function getBrandOf(o){
    return toBrand.call(o).slice(8, -1);
  }

  function ensureObject(name, o){
    if (!o || typeof o !== 'object') {
      throw new TypeError(name + ' called with non-object ' + getBrandOf(o));
    }
  }


  function fname(func){
    if (typeof func !== 'function') {
      return '';
    } else if ('name' in func) {
      return func.name;
    }

    return toSource.call(func).match(/^\n?function\s?(\w*)?_?\(/)[1];
  }
  exports.fname = fname;

  function isObject(v){
    return typeof v === OBJECT ? v !== null : typeof v === FUNCTION;
  }

  exports.isObject = isObject;


  exports.nextTick = typeof process !== UNDEFINED
    ? process.nextTick
    : function(f){ setTimeout(f, 1) };


  exports.numbers = (function(cache){
    function numbers(start, end){
      if (!isFinite(end)) {
        end = start;
        start = 0;
      }
      var length = end - start,
          curr;

      if (end > cache.length) {
        while (length--)
          cache[curr = length + start] = '' + curr;
      }
      return cache.slice(start, end);
    }

    return numbers;
  })([]);


  if (Object.create && !Object.create(null).toString) {
    var create = exports.create = Object.create;
  } else {
    var Empty = function(){};
    var create = exports.create = (function(F, empty){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = 'javascript:';
      empty = iframe.contentWindow.Object.prototype;
      document.body.removeChild(iframe);

      var keys = ['constructor', 'hasOwnProperty', 'propertyIsEnumerable',
                  'isPrototypeOf', 'toLocaleString', 'toString', 'valueOf'];

      for (var i=0; i < keys.length; i++)
        delete empty[keys[i]];

      Empty.prototype = empty;
      keys = null;


      function create(object){
        if (object === null) {
          return new Empty;
        } else {
          F.prototype = object;
          object = new F;
          F.prototype = null;
          return object;
        }
      }

      return create;
    })(function(){});
  }


  function enumerate(o){
    var keys = [], i = 0;
    for (keys[i++] in o);
    return keys;
  }

  exports.enumerate = enumerate;


  if (Object.keys) {
    var ownKeys = exports.keys = Object.keys;
  } else {
    var ownKeys = exports.keys = (function(hasOwn){
      function keys(o){
        var out = [], i=0;
        for (var k in o)
          if (hasOwn.call(o, k))
            out[i++] = k;
        return out;
      }
      return keys;
    })({}.hasOwnProperty);
  }


  if (Object.getPrototypeOf) {
    var getPrototypeOf = Object.getPrototypeOf;
  } else if (hasDunderProto) {
    var getPrototypeOf = (function(){
      function getPrototypeOf(o){
        ensureObject('getPrototypeOf', o);
        return o.__proto__;
      }
      return getPrototypeOf;
    })();
  } else {
    var getPrototypeOf = (function(){
      function getPrototypeOf(o){
        ensureObject('getPrototypeOf', o);
        if (typeof o.constructor === 'function') {
          return o.constructor.prototype;
        }
      }
      return getPrototypeOf;
    })();
  }

  exports.getPrototypeOf = getPrototypeOf


  if (Object.getOwnPropertyNames) {
    var defineProperty = Object.defineProperty;
  } else {
    var defineProperty = (function(){
      function defineProperty(o, k, desc){
        o[k] = desc.value;
        return o;
      }
      return defineProperty;
    })();
  }

  exports.defineProperty = defineProperty;


  if (Object.getOwnPropertyNames) {
    var describeProperty = Object.getOwnPropertyDescriptor;
  } else {
    var describeProperty = (function(){
      function getOwnPropertyDescriptor(o, k){
        ensureObject('getOwnPropertyDescriptor', o);
        return  { value: o[k] };
      }
      return getOwnPropertyDescriptor;
    })();
  }

  exports.describeProperty = describeProperty;


  if (Object.getOwnPropertyNames) {
    var getProperties = Object.getOwnPropertyNames;
  } else {
    var getProperties = ownKeys;
  }


  function copy(o){
    return assign(create(getPrototypeOf(o)), o);
  }

  exports.copy = copy;

  function clone(o, hidden){
    var queue = new Queue,
        tag = uid(),
        tagged = [],
        list = hidden ? getProperties : ownKeys;

    var out = enqueue(o);

    while (queue.length) {
      recurse.apply(this, queue.shift());
    }

    for (var i=0; i < tagged.length; i++) {
      delete tagged[tag];
    }

    return out;

    function recurse(from, to, key){
      if (!isObject(from[key])) {
        return to[key] = from[key];
      }
      if (hasOwn.call(from[key], tag)) {
        return to[key] = from[key][tag];
      }
      to[key] = enqueue(from[key]);
    }

    function enqueue(o){
      var out = o instanceof Array ? [] : create(getPrototypeOf(o));
      tagged.push(o);
      var keys = list(o);
      for (var i=0; i < keys.length; i++) {
        queue.push([o, out, keys[i]]);
      }
      o[tag] = out;
      return out;
    }
  }

  exports.clone = clone;


  function iterate(o, callback, context){
    if (!o) return;
    var type = typeof o;
    context = context || this;
    if (type === 'number' || type === 'boolean') {
      return void callback.call(context, o, 0, o);
    }
    o = Object(o);
    if (type !== 'function' && o.length) {
      for (var i=0; i < o.length; i++) {
        callback.call(context, o[i], i, o);
      }
    } else {
      var keys = ownKeys(o);
      for (var i=0; i < keys.length; i++) {
        callback.call(context, o[keys[i]], keys[i], o);
      }
    }
  }

  exports.iterate = iterate;


  function Hidden(value){
    this.value = value;
  }

  Hidden.prototype = {
    configurable: true,
    enumerable: false,
    writable: true,
    value: undefined
  };


  function define(o, p, v){
    switch (typeof p) {
      case STRING:
        defineProperty(o, p, new Hidden(v));
        break;
      case FUNCTION:
        defineProperty(o, fname(p), new Hidden(p));
        break;
      case OBJECT:
        if (p instanceof Array) {
          for (var i=0; i < p.length; i++) {
            var f = p[i];
            if (typeof f === FUNCTION) {
              var name = fname(f);
            } else if (typeof f === STRING && typeof p[i+1] !== FUNCTION || !fname(p[i+1])) {
              var name = f;
              f = p[i+1];
            }
            if (name) {
              defineProperty(o, name, new Hidden(f));
            }
          }
        } else if (p) {
          var keys = ownKeys(p)

          for (var i=0; i < keys.length; i++) {
            var k = keys[i];
            var desc = describeProperty(p, k);
            if (desc) {
              desc.enumerable = 'get' in desc;
              defineProperty(o, k, desc);
            }
          }
        }
    }

    return o;
  }

  exports.define = define;




  function assign(o, p, v){
    switch (typeof p) {
      case STRING:
        o[p] = v;
        break;
      case FUNCTION:
        o[fname(p)] = p;
        break;
      case OBJECT:
        if (p instanceof Array) {
          for (var i=0; i < p.length; i++) {
            var f = p[i];
            if (typeof f === FUNCTION && fname(f)) {
              var name = fname(f);
            } else if (typeof f === STRING && typeof p[i+1] !== FUNCTION || !fname(p[i+1])) {
              var name = f;
              f = p[i+1];
            }
            if (name) {
              o[name] = f;
            }
          }
        } else if (p) {
          var keys = ownKeys(p)

          for (var i=0; i < keys.length; i++) {
            var k = keys[i];
            o[k] = p[k];
          }
        }
    }
    return o;
  }

  exports.assign = assign;

  function inherit(Ctor, Super, properties, methods){
    define(Ctor, { inherits: Super });

    Ctor.prototype = create(Super.prototype, {
      constructor: { value: Ctor,
                     writable: true,
                     configurable: true }
    });

    properties && define(Ctor.prototype, properties);
    methods && define(Ctor.prototype, methods);
    return Ctor;
  }

  exports.inherit = inherit;


  var __ = partial.__ = {};

  function partial(f, args){
    args instanceof Array || (args = [args]);
    return function(){
      var a = [],
          j = 0;

      for (var i=0; i < args.length; i++) {
        a[i] = args[i] === __ ? arguments[j++] : args[i];
      }
      return f.apply(this, a);
    };
  }

  exports.partial = partial;




  function quotes(s) {
    s = (''+s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    var singles = 0,
        doubles = 0,
        i = s.length;

    while (i--) {
      if (s[i] === '"') {
        doubles++;
      } else if (s[i] === "'") {
        singles++;
      }
    }

    if (singles > doubles) {
      return '"' + s.replace(/"/g, '\\"') + '"';
    } else {
      return "'" + s.replace(/'/g, "\\'") + "'";
    }
  }

  exports.quotes = quotes;


  function unique(strings){
    var seen = create(null),
        out = [];

    for (var i=0; i < strings.length; i++) {
      if (!(strings[i] in seen)) {
        seen[strings[i]] = true;
        out.push(strings[i]);
      }
    }

    return out;
  }

  exports.unique = unique;



  function toInteger(v){
    return (v / 1 || 0) | 0;
  }

  exports.toInteger = toInteger;


  function isNaN(number){
    return number !== number;
  }

  exports.isNaN = isNaN;


  function isFinite(number){
    return typeof value === 'number'
        && value === value
        && value < Infinity
        && value > -Infinity;
  }

  exports.isFinite = isFinite;


  function isInteger(value) {
    return typeof value === 'number'
        && value === value
        && value > -9007199254740992
        && value < 9007199254740992
        && value | 0 === value;
  }

  exports.isInteger = isInteger;

  function uid(){
    return Math.random().toString(36).slice(2)
  }

  exports.uid = uid;


  var BREAK    = visit.BREAK    = new Number(1),
      CONTINUE = visit.CONTINUE = new Number(2),
      RECURSE  = visit.RECURSE  = new Number(3);


  function visit(root, callback){
    var queue = new Queue([root]),
        branded = [],
        tag = uid();

    while (queue.length) {
      recurse(queue.shift());
    }

    for (var i=0; i < branded.length; i++) {
      delete branded[i][tag];
    }

    function recurse(node){
      if (!isObject(node)) return;
      var keys = ownKeys(node);
      for (var i=0; i < keys.length; i++) {
        var key = keys[i],
            item = node[key];

        if (isObject(item) && !hasOwn.call(tag, tag)) {
          item[tag] = true;
          branded.push(item);
          var result = callback(item, node);
          if (result === visit.RECURSE) {
            queue.push(item);
          } else if (result === visit.BREAK) {
            return queue.empty();
          }
        }
      }
    }
  }

  exports.visit = visit;



  exports.collector = (function(){
    function path(){
      var parts = [].slice.call(arguments);

      for (var i=0; i < parts.length; i++) {

        if (typeof parts[i] === 'function') {
          return function(o){
            for (var i=0; i < parts.length; i++) {
              var part = parts[i],
                  type = typeof part;

              if (type === 'string') {
                o = o[part];
              } else if (type === 'function') {
                o = part(o);
              }
            }
            return o;
          };
        }
      }

      return function(o){
        for (var i=0; i < parts.length; i++) {
          o = o[parts[i]];
        }
        return o;
      };
    }


    function collector(o){
      var handlers = create(null);
      for (var k in o) {
        if (o[k] instanceof Array) {
          handlers[k] = path(o[k]);
        } else if (typeof o[k] === 'function') {
          handlers[k] = o[k];
        } else {
          handlers[k] = o[k];
        }
      }

      return function(node){
        var items  = [];

        function visitor(node, parent){
          if (!node) return CONTINUE;

          var handler = handlers[node.type];

          if (handler === true) {
            items.push(node);
          } else if (handler === RECURSE || handler === CONTINUE) {
            return handler;
          } else if (typeof handler === 'function') {
            var item = handler(node);
            if (item !== undefined) {
              items.push(item);
            }
          } else if (node instanceof Array) {
            return RECURSE;
          }

          return CONTINUE;
        }

        visit(node, visitor);

        return items;
      };
    }

    return collector;
  })();

  if (Function.prototype.bind) {
    var applybind = Function.prototype.apply.bind(Function.prototype.bind);
    exports.applyNew = function(Ctor, args){
      return new (applybind(Ctor, [null].concat(args)));
    };
  } else {
    exports.applyNew = function(Ctor, args){
      var params = '';
      for (var i=0; i < args.length; i++) {
        params += ',$'+i;
      }
      return new Function('F'+params, 'return new F('+params.slice(1)+')').apply(null, args);
    };
  }

  exports.Emitter = (function(){
    function Emitter(){
      '_events' in this || define(this, '_events', create(null));
    }

    function on(events, handler){
      iterate(events.split(/\s+/), function(event){
        if (!(event in this)) {
          this[event] = [];
        }
        this[event].push(handler);
      }, this._events);
    }

    function off(events, handler){
      iterate(events.split(/\s+/), function(event){
        if (event in this) {
          var index = '__index' in handler ? handler.__index : this[event].indexOf(handler);
          if (~index) {
            this[event].splice(index, 1);
          }
        }
      }, this._events);
    }

    function once(events, handler){
      function one(val){
        this.off(events, one);
        handler.call(this, val);
      }
      this.on(events, one);
    }

    function emit(event, val){
      var handlers = this._events['*'];

      if (handlers) {;
        for (var i=0; i < handlers.length; i++) {
          handlers[i].call(this, event, val);
        }
      }

      handlers = this._events[event];
      if (handlers) {
        for (var i=0; i < handlers.length; i++) {
          handlers[i].call(this, val);
        }
      }
    }
     define(Emitter.prototype, [on, off, once, emit]);
    return Emitter;
  })();



  function Hash(){}
  Hash.prototype = create(null);
  exports.Hash = Hash;


  var proto = Math.random().toString(36).slice(2);


  var PropertyList = exports.PropertyList = (function(){
    function PropertyList(){
      this.hash = new Hash;
      this.props = [];
      this.holes = 0;
      this.length = 0;
    }

    function get(key){
      var name = key === '__proto__' ? proto : key,
          index = this.hash[name];
      if (index !== undefined) {
        return this.props[index][1];
      }
    }

    function getAttribute(key){
      var name = key === '__proto__' ? proto : key,
          index = this.hash[name];
      if (index !== undefined) {
        return this.props[index][2];
      } else {
        return null;
      }
    }

    function getProperty(key){
      var name = key === '__proto__' ? proto : key,
          index = this.hash[name];
      if (index !== undefined) {
        return this.props[index];
      } else {
        return null;
      }
    }

    function set(key, value, attr){
      var name = key === '__proto__' ? proto : key,
          index = this.hash[name],
          prop;

      if (index === undefined) {
        index = this.hash[name] = this.props.length;
        prop = this.props[index] = [key, value, 0];
        this.length++;
      } else {
        prop = this.props[index];
        prop[1] = value;
      }

      if (attr !== undefined) {
        prop[2] = attr;
      }
      return true;
    }

    function setAttribute(key, attr){
      var name = key === '__proto__' ? proto : key,
          index = this.hash[name];
      if (index !== undefined) {
        this.props[index][2] = attr;
        return true;
      } else {
        return false;
      }
    }

    function setProperty(prop){
      var key = prop[0],
          name = key === '__proto__' ? proto : key,
          index = this.hash[name];
      if (index === undefined) {
        index = this.hash[name] = this.props.length;
        this.length++;
      }
      this.props[index] = prop;
    }

    function remove(key){
      var name = key === '__proto__' ? proto : key,
          index = this.hash[name];
      if (index !== undefined) {
        this.hash[name] = undefined;
        this.props[index] = undefined;
        this.holes++;
        this.length--;
        return true;
      } else {
        return false;
      }
    }

    function has(key){
      var name = key === '__proto__' ? proto : key;
      return this.hash[name] !== undefined;
    }

    function hasAttribute(key, mask){
      var name = key === '__proto__' ? proto : key,
          attr = this.getAttribute(name);
      if (attr !== null) {
        return (attr & mask) > 0;
      }
    }

    function compact(){
      var props = this.props,
          len = props.length,
          index = 0,
          prop;

      this.hash = new Hash;
      this.props = [];
      this.holes = 0;

      for (var i=0; i < len; i++) {
        if (prop = props[i]) {
          var name = prop[0] === '__proto__' ? proto : prop[0];
          this.props[index] = prop;
          this.hash[name] = index++;
        }
      }
    }

    function forEach(callback, context){
      var len = this.props.length,
          index = 0,
          prop;

      context = context || this;

      for (var i=0; i < len; i++) {
        if (prop = this.props[i]) {
          callback.call(context, prop, index++, this);
        }
      }
    }

    function map(callback, context){
      var out = [],
          len = this.props.length,
          index = 0,
          prop;

      context = context || this;

      for (var i=0; i < len; i++) {
        if (prop = this.props[i]) {
          out[index] = callback.call(context, prop, index++, this);
        }
      }

      return out;
    }

    function translate(callback, context){
      var out = new PropertyList;

      out.length = this.length;
      context = context || this;

      this.forEach(function(prop, index){
        prop = callback.call(context, prop, index, this);
        var name = prop[0] === '__proto__' ? proto : prop[0];
        out.props[index] = prop;
        out.hash[name] = index;
      });

      return out;
    }

    function filter(callback, context){
      var out = new PropertyList,
          index = 0;

      context = context || this;

      this.forEach(function(prop, i){
        if (callback.call(context, prop, i, this)) {
          var name = prop[0] === '__proto__' ? proto : prop[0];
          out.props[index] = prop;
          out.hash[name] = index++;
        }
      });

      return out;
    }

    function clone(deep){
      return this.translate(function(prop, i){
        return deep ? prop.slice() : prop;
      });
    }

    function keys(){
      return this.map(function(prop){
        return prop[0];
      });
    }

    function values(){
      return this.map(function(prop){
        return prop[1];
      });
    }

    function items(){
      return this.map(function(prop){
        return prop.slice();
      });
    }

    function merge(list){
      list.forEach(this.setProperty, this);
    }

    define(PropertyList.prototype, [
      get, getAttribute, getProperty, set, setAttribute, setProperty, remove, has, hasAttribute,
      compact, forEach, map, translate,  filter, clone, keys, values, items, merge
    ]);
    return PropertyList;
  })();



  exports.Stack = (function(){
    function Stack(){
      this.empty();
      for (var k in arguments)
        this.push(arguments[k]);
    }

    function push(item){
      this.items.push(item);
      this.length++;
      this.top = item;
      return this;
    }

    function pop(){
      this.length--;
      this.top = this.items[this.length - 1];
      return this.items.pop();
    }

    function empty(){
      this.length = 0;
      this.items = [];
      this.top = undefined;
    }

    function first(callback, context){
      var i = this.length;
      context || (context = this);
      while (i--)
        if (callback.call(context, this[i], i, this))
          return this[i];
    }

    function filter(callback, context){
      var i = this.length,
          out = new Stack;

      context || (context = this);

      for (var i=0; i < this.length; i++) {
        if (callback.call(context, this[i], i, this)) {
          out.push(this[i]);
        }
      }

      return out;
    }

    define(Stack.prototype, [push, pop, empty, first, filter]);
    return Stack;
  })();

  var Queue = exports.Queue = (function(){
    function Queue(items){
      if (isObject(items)) {
        if (items instanceof Queue) {
          this.items = items.items.slice(items.front);
        } else if (items instanceof Array) {
          this.items = items.slice();
        } else if (items.length) {
          this.items = slice.call(items);
        } else {
          this.items = [items];
        }
      } else if (items != null) {
        this.items = [items];
      } else {
        this.items = [];
      }
      this.length = this.items.length;
      this.index = 0;
    }

    function push(item){
      this.items.push(item);
      this.length++;
      return this;
    }

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

    function empty(){
      this.length = 0;
      this.index = 0;
      this.items = [];
      return this;
    }

    function front(){
      return this.items[this.index];
    }

    define(Queue.prototype, [push, empty, front, shift]);
    return Queue;
  })();


  exports.Feeder = (function(){
    function Feeder(callback, context, pace){
      var self = this;
      this.queue = new Queue;
      this.active = false;
      this.feeder = feeder;
      this.pace = pace || 5;

      function feeder(){
        var count = Math.min(self.pace, self.queue.length);

        while (self.active && count--) {
          callback.call(context, self.queue.shift());
        }

        if (!self.queue.length) {
          self.active = false;
        } else if (self.active) {
          setTimeout(feeder, 15);
        }
      }
    }

    function push(item){
      this.queue.push(item);
      if (!this.active) {
        this.active = true;
        setTimeout(this.feeder, 15);
      }
      return this;
    }

    function pause(){
      this.active = false;
    }

    define(Feeder.prototype, [push, pause]);
    return Feeder;
  })();



  function inspect(o){
    o = require('util').inspect(o, null, 10);
    console.log(o);
    return o;
  }

  function decompile(ast, options){
    return escodegen.generate(ast, options || decompile.options);
  }

  exports.decompile = decompile;

  decompile.options = {
    comment: false,
    allowUnparenthesizedNew: true,
    format: {
      indent: {
        style: '  ',
        base: 0,
      },
      json       : false,
      renumber   : false,
      hexadecimal: true,
      quotes     : 'single',
      escapeless : true,
      compact    : false,
      parentheses: true,
      semicolons : true
    }
  };

  return exports;
})(typeof module !== 'undefined' ? module.exports : {});
