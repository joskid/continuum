var utility = (function(exports){
  var BOOLEAN   = 'boolean',
      FUNCTION  = 'function',
      NUMBER    = 'number',
      OBJECT    = 'object',
      STRING    = 'string',
      UNDEFINED = 'undefined';

  var KEYS   = 'keys',
      VALUES = 'values',
      ITEMS  = 'items',
      ATTRS  = 'attributes';

  var hasDunderProto = { __proto__: [] } instanceof Array,
      isES5 = !(!Object.getOwnPropertyNames || 'prototype' in Object.getOwnPropertyNames);

  var toBrand = {}.toString,
      _slice = [].slice,
      hasOwn = {}.hasOwnProperty,
      toSource = Function.toString;

  var hidden = {
    configurable: true,
    enumerable: false,
    writable: true,
    value: undefined
  };

  var proto = uid();


  function getBrandOf(o){
    if (o === null) {
      return 'Null';
    } else if (o === undefined) {
      return 'Undefined';
    } else {
      return toBrand.call(o).slice(8, -1);
    }
  }

  function ensureObject(name, o){
    if (o === null || typeof o !== 'object') {
      throw new TypeError(name + ' called with non-object ' + getBrandOf(o));
    }
  }

  function uid(){
    return Math.random().toString(36).slice(2);
  }

  exports.uid = uid;


  function toArray(o){
    var len = o.length;
    if (!len) return [];
    if (len === 1) return [o[0]];
    if (len === 2) return [o[0], o[1]];
    if (len === 3) return [o[0], o[1], o[2]];
    if (len > 9)   return _slice.call(o);
    if (len === 4) return [o[0], o[1], o[2], o[3]];
    if (len === 5) return [o[0], o[1], o[2], o[3], o[4]];
    if (len === 6) return [o[0], o[1], o[2], o[3], o[4], o[5]];
    if (len === 7) return [o[0], o[1], o[2], o[3], o[4], o[5], o[6]];
    if (len === 8) return [o[0], o[1], o[2], o[3], o[4], o[5], o[6], o[7]];
    if (len === 9) return [o[0], o[1], o[2], o[3], o[4], o[5], o[6], o[7], o[8]];
  }
  exports.toArray = toArray;

  function slice(o, start, end){
    if (!o.length) {
      return [];
    } else if (!end && !start) {
      return toArray(o);
    } else {
      return _slice.call(o, start, end);
    }
  }
  exports.slice = slice;

  var fname = exports.fname = (function(){
    if (Function.name === 'Function') {
      return function fname(f){
        if (typeof f !== FUNCTION) {
          throw new TypeError('Tried to get the name of a non-function');
        }

        return f.name;
      };
    }
    return function fname(f){
      if (typeof f !== FUNCTION) {
        throw new TypeError('Tried to get the name of a non-function');
      }

      if (!hasOwn.call(f, 'name')) {
        hidden.value = toSource.call(f).match(/^\n?function\s?(\w*)?_?\(/)[1];
        defineProperty(f, 'name', hidden);
      }

      return f.name;
    };
  })();

  function isObject(v){
    var type = typeof v;
    return type === OBJECT ? v !== null : type === FUNCTION;
  }
  exports.isObject = isObject;

  exports.nextTick = typeof process !== UNDEFINED
                    ? process.nextTick
                    : function nextTick(f){ setTimeout(f, 1) };

  exports.numbers = (function(cache){
    return function numbers(start, end){
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
    };
  })([]);


  if (isES5) {
    var create = exports.create = Object.create;
  } else {
    var Null = function(){};
    var hiddens = ['constructor', 'hasOwnProperty', 'propertyIsEnumerable',
                   'isPrototypeOf', 'toLocaleString', 'toString', 'valueOf'];

    var create = exports.create = (function(F){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = 'javascript:';
      Null.prototype = iframe.contentWindow.Object.prototype;
      document.body.removeChild(iframe);

      while (hiddens.length) {
        delete Null.prototype[hiddens.pop()];
      }

      return function create(object){
        if (object === null) {
          return new Null;
        } else {
          F.prototype = object;
          object = new F;
          F.prototype = null;
          return object;
        }
      };
    })(function(){});
  }

  var ownKeys = exports.keys = (function(){
    if (isES5) return Object.keys;
    return function keys(o){
      var out = [], i=0;
      for (var k in o) {
        if (hasOwn.call(o, k)) {
          out[i++] = k;
        }
      }
      return out;
    };
  })();

  var getPrototypeOf = exports.getPrototypeOf = (function(){
    if (isES5) {
      return Object.getPrototypeOf;
    } else if (hasDunderProto) {
      return function getPrototypeOf(o){
        ensureObject('getPrototypeOf', o);
        return o.__proto__;
      };
    } else {
      return function getPrototypeOf(o){
        ensureObject('getPrototypeOf', o);

        var ctor = o.constructor;

        if (typeof ctor === FUNCTION) {
          var proto = ctor.prototype;
          if (o !== proto) {
            return proto;
          } else if (!ctor._super) {
            delete o.constructor;
            ctor._super = o.constructor;
            o.constructor = ctor;
          }
          return ctor._super.prototype;
        } else if (o instanceof Null) {
          return null;
        } else if (o instanceof Object) {
          return Object.prototype;
        }
      };
    }
  })();

  var defineProperty = exports.defineProperty = (function(){
    if (isES5) return Object.defineProperty;
    return function defineProperty(o, k, desc){
      o[k] = desc.value;
      return o;
    };
  })();


  var describeProperty = exports.describeProperty = (function(){
    if (isES5) return Object.getOwnPropertyDescriptor;
    return function getOwnPropertyDescriptor(o, k){
      ensureObject('getOwnPropertyDescriptor', o);
      if (hasOwn.call(o, k)) {
        return { value: o[k] };
      }
    };
  })();

  var ownProperties = exports.ownProperties = isES5 ? Object.getOwnPropertyNames : ownKeys;

  var _call, _apply, _bind;

  if (typeof Function.prototype.bind === FUNCTION && !('prototype' in Function.prototype.bind)) {
    _bind = Function.prototype.bind;
    _call = Function.prototype.call;
    _apply = Function.prototype.apply;
  } else {
    void function(){
      function bind(receiver){
        if (typeof this !== 'function') {
          throw new TypeError("Function.prototype.bind called on non-callable");
        }

        var args = toArray(arguments),
            params = '',
            F = this;

        for (var i=1; i < args.length; i++) {
          if (i > 1) params += ',';
          params += '$['+i+']';
        }

        var bound = function(){
          if (this instanceof bound) {
            var p = params;
            for (var i=0; i < arguments.length; i++) {
              p += ',_['+i+']';
            }
            return new Function('F,$,_', 'return new F('+p+')')(F, args, arguments);
          } else {
            var a = toArray(args);
            for (var i=0; i < arguments.length; i++) {
              a[a.length] = arguments[i];
            }
            return _call.apply(F, a);
          }
        };

        return bound;
      }

      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = 'javascript:';
      _call = iframe.contentWindow.Function.prototype.call;
      _apply = _call.apply;
      _bind = bind;
      document.body.removeChild(iframe);
    }();
  }

  var bindbind  = exports.bindbind  = _bind.bind(_bind),
      callbind  = exports.callbind  = bindbind(_call),
      applybind = exports.applybind = bindbind(_apply),
      bindapply = exports.bindapply = applybind(_bind),
      bind      = exports.bind      = callbind(_bind),
      call      = exports.call      = callbind(_call),
      apply     = exports.apply     = callbind(_apply);


  function applyNew(Ctor, args){
    return new (bindapply(Ctor, [null].concat(args)));
  }
  exports.applyNew = applyNew;


  function copy(o){
    return assign(create(getPrototypeOf(o)), o);
  }
  exports.copy = copy;

  function clone(o, hidden){
    function recurse(from, to, key){
      try {
        var val = from[key];
        if (!isObject(val)) {
          return to[key] = val;
        }
        if (from[key] === val) {
          if (hasOwn.call(from[key], tag)) {
            return to[key] = from[key][tag];
          }
          to[key] = enqueue(from[key]);
        }
      } catch (e) {}
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

    var queue = new Queue,
        tag = uid(),
        tagged = [],
        list = hidden ? ownProperties : ownKeys,
        out = enqueue(o);

    while (queue.length) {
      recurse.apply(this, queue.shift());
    }

    for (var i=0; i < tagged.length; i++) {
      delete tagged[tag];
    }

    return out;
  }
  exports.clone = clone;


  function enumerate(o){
    var out = [], i = 0;
    for (out[i++] in o);
    return out;
  }
  exports.enumerate = enumerate;

  var StopIteration = exports.StopIteration = global.StopIteration || create(null);

  function iterate(o, callback, context){
    if (o == null) return;
    var type = typeof o;
    context = context || o;
    if (type === 'number' || type === 'boolean') {
      callback.call(context, o, 0, o);
    } else {
      o = Object(o);
      var iterator = o.iterator || o.__iterator__;

      if (typeof iterator === 'function') {
        var iter = iterator.call(o);
        if (iter && typeof iter.next === 'function') {
          var i=0;
          try {
            while (1) callback.call(context, iter.next(), i++, o);
          } catch (e) {
            if (e === StopIteration) return;
            throw e;
          }
        }
      }

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
  }
  exports.iterate = iterate;

  function each(o, callback){
    for (var i=0; i < o.length; i++) {
      callback(o[i], i, o);
    }
  }
  exports.each = each;

  function map(o, callback){
    var out = new Array(o.length);
    for (var i=0; i < o.length; i++) {
      out[i] = callback(o[i]);
    }
    return out;
  }
  exports.map = map;

  function fold(o, initial, callback){
    if (callback) {
      var val = initial, i = 0;
    } else {
      if (typeof initial === STRING) {
        callback = fold[initial];
      } else {
        callback = initial;
      }

      var val = o[0], i = 1;
    }
    for (; i < o.length; i++) {
      val = callback(val, o[i], i, o);
    }
    return val;
  }
  exports.fold = fold;

  fold['+'] = function(a, b){ return a + b };
  fold['*'] = function(a, b){ return a - b };
  fold['-'] = function(a, b){ return a * b };
  fold['/'] = function(a, b){ return a / b };

  function repeat(n, args, callback){
    if (typeof args === FUNCTION) {
      callback = args;
      for (var i=0; i < n; i++) {
        callback();
      }
    } else {
      for (var i=0; i < n; i++) {
        callback.apply(this, args);
      }
    }
  }
  exports.repeat = repeat;


  function generate(n, callback){
    var out = new Array(n);
    for (var i=0; i < n; i++) {
      out[i] = callback(i, n, out);
    }
    return out;
  }
  exports.generate = generate;


  function define(o, p, v){
    switch (typeof p) {
      case FUNCTION:
        v = p;
        p = fname(v);
      case STRING:
        hidden.value = v;
        defineProperty(o, p, hidden);
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
              hidden.value = f;
              defineProperty(o, name, hidden);
            }
          }
        } else if (p) {
          var keys = ownKeys(p)

          for (var i=0; i < keys.length; i++) {
            var desc = describeProperty(p, keys[i]);
            if (desc) {
              desc.enumerable = 'get' in desc;
              defineProperty(o, keys[i], desc);
            }
          }
        }
    }

    hidden.value = undefined;
    return o;
  }
  exports.define = define;


  function assign(o, p, v){
    switch (typeof p) {
      case FUNCTION:
        o[fname(p)] = p;
        break;
      case STRING:
        o[p] = v;
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



  var hide = exports.hide = (function(){
    if (isES5) {
      return function hide(o, k){
        Object.defineProperty(o, k, { enumerable: false });
      };
    }
    return function hide(){};
  })();



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


  var MAX_INTEGER = 9007199254740992;

  function toInteger(v){
    if (v === Infinity) {
      return MAX_INTEGER;
    } else if (v === -Infinity) {
      return -MAX_INTEGER;
    } else {
      return v - 0 >> 0;
    }
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
    return typeof value === NUMBER
               && value === value
               && value > -MAX_INTEGER
               && value < MAX_INTEGER
               && value >> 0 === value;
  }
  exports.isInteger = isInteger;

  function walk(root, callback){
    var queue = new Queue([[root]]),
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
          if (result === walk.RECURSE) {
            queue.push(item);
          } else if (result === walk.BREAK) {
            return queue.empty();
          }
        }
      }
    }
  }
  exports.walk = walk;

  var BREAK    = walk.BREAK    = new Number(1),
      CONTINUE = walk.CONTINUE = new Number(2),
      RECURSE  = walk.RECURSE  = new Number(3);

  exports.collector = (function(){
    function path(){
      var parts = toArray(arguments);

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
        } else if (typeof o[k] === FUNCTION) {
          handlers[k] = o[k];
        } else {
          handlers[k] = o[k];
        }
      }

      return function(node){
        var items  = [];

        function walker(node, parent){
          if (!node) return CONTINUE;

          if (node instanceof Array) {
            return RECURSE;
          }

          var handler = handlers[node.type];

          if (handler === true) {
            items.push(node);
          } else if (handler === RECURSE || handler === CONTINUE) {
            return handler;
          } else if (typeof handler === STRING) {
            if (node[handler]) {
              walk(node[handler], walker);
            }
          } else if (typeof handler === FUNCTION) {
            var item = handler(node);
            if (item !== undefined) {
              items.push(item);
            }
          } else

          return CONTINUE;
        }

        walk(node, walker);

        return items;
      };
    }

    return collector;
  })();

  function Hash(){}
  Hash.prototype = create(null);
  exports.Hash = Hash;

  exports.Emitter = (function(){
    function Emitter(){
      '_events' in this || define(this, '_events', create(null));
    }

    define(Emitter.prototype, [
      function on(events, handler){
        iterate(events.split(/\s+/), function(event){
          if (!(event in this)) {
            this[event] = [];
          }
          this[event].push(handler);
        }, this._events);
      },
      function off(events, handler){
        iterate(events.split(/\s+/), function(event){
          if (event in this) {
            var index = '__index' in handler ? handler.__index : this[event].indexOf(handler);
            if (~index) {
              this[event].splice(index, 1);
            }
          }
        }, this._events);
      },
      function once(events, handler){
        function one(val){
          this.off(events, one);
          handler.call(this, val);
        }
        this.on(events, one);
      },
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
    ]);

    return Emitter;
  })();

  var PropertyList = exports.PropertyList = (function(){
    var PropertyListIterator = (function(){
      var types = {
        keys: 0,
        values: 1,
        attributes: 2
      };

      function PropertyListIterator(list, type){
        this.list = list;
        this.type = type ? types[type] : ITEMS;
        this.index = 0;
      }

      define(PropertyListIterator.prototype, [
        function next(){
          var props = this.list.props, property;
          while (!property) {
            if (this.index >= props.length) {
              throw StopIteration;
            }
            property = props[this.index++];
          }
          return this.type === ITEMS ? property : property[this.type];
        },
        function __iterator__(){
          return this;
        }
      ]);

      return PropertyListIterator;
    })();

    function PropertyList(){
      this.hash = new Hash;
      this.props = [];
      this.holes = 0;
      this.length = 0;
    }

    define(PropertyList.prototype, [
      function get(key){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index !== undefined) {
          return this.props[index][1];
        }
      },
      function getAttribute(key){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index !== undefined) {
          return this.props[index][2];
        } else {
          return null;
        }
      },
      function getProperty(key){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index !== undefined) {
          return this.props[index];
        } else {
          return null;
        }
      },
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
      },
      function initialize(props){
        var len = props.length;
        for (var i=0; i < len; i += 3) {
          var index = this.hash[props[i]] = this.props.length;
          this.props[index] = [props[i], props[i + 1], props[i + 2]];
        }
      },
      function setAttribute(key, attr){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index !== undefined) {
          this.props[index][2] = attr;
          return true;
        } else {
          return false;
        }
      },
      function setProperty(prop){
        var key = prop[0],
            name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index === undefined) {
          index = this.hash[name] = this.props.length;
          this.length++;
        }
        this.props[index] = prop;
      },
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
      },
      function has(key){
        var name = key === '__proto__' ? proto : key;
        return this.hash[name] !== undefined;
      },
      function hasAttribute(key, mask){
        var name = key === '__proto__' ? proto : key,
            attr = this.getAttribute(name);
        if (attr !== null) {
          return (attr & mask) > 0;
        }
      },
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
      },
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
      },
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
      },
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
      },
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
      },
      function clone(deep){
        return this.translate(function(prop, i){
          return deep ? prop.slice() : prop;
        });
      },
      function keys(){
        return this.map(function(prop){
          return prop[0];
        });
      },
      function values(){
        return this.map(function(prop){
          return prop[1];
        });
      },
      function items(){
        return this.map(function(prop){
          return prop.slice();
        });
      },
      function merge(list){
        list.forEach(this.setProperty, this);
      },
      function __iterator__(type){
        return new PropertyListIterator(this, type);
      },
      function inspect(){
        var out = create(null);
        function Token(value){
          this.value = value;
        }
        Token.prototype.inspect = function(){
          return this.value;
        };
        this.forEach(function(property){
          var attrs = (property[2] & 0x01 ? 'E' : '_') +
                      (property[2] & 0x02 ? 'C' : '_') +
                      (property[2] & 0x04 ? 'W' :
                       property[2] & 0x08 ? 'A' : '_');
          out[property[0]] = new Token(attrs + ' ' + (isObject(property[1]) ? property[1].NativeBrand : property[1]));
        });
        return require('util').inspect(out);
      }
    ]);

    return PropertyList;
  })();

  var LinkedList = exports.LinkedList = (function(){
    function Item(data, prev){
      this.data = data;
      this.after(prev);
    }

    define(Item.prototype, [
      function after(item){
        this.relink(item);
        return this;
      },
      function before(item){
        this.prev.relink(item);
        return this;
      },
      function relink(prev){
        if (this.next) {
          this.next.prev = this.prev;
          this.prev.next = this.next;
        }
        this.prev = prev;
        this.next = prev.next;
        prev.next.prev = this;
        prev.next = this;
        return this;
      },
      function unlink(){
        this.next.prev = this.prev;
        this.prev.next = this.next;
        this.prev = this.next = null;
        return this;
      },
      function clear(){
        var data = this.data;
        this.next = this.prev = this.data = null;
        return data;
      }
    ]);

    function Sentinel(list){
      this.list = list;
      this.next = this;
      this.prev = this;
      this.data = undefined;
    }

    inherit(Sentinel, Item, [
      function unlink(){
        return this;
      }
    ]);


    function LinkedListIterator(list){
      this.item = list.sentinel;
      this.sentinel = list.sentinel;
    }

    define(LinkedListIterator.prototype, [
      function next(){
        this.item = this.item.next;
        if (this.item === this.sentinel) {
          throw StopIteration;
        }
        return this.item.data;
      }
    ]);

    function find(list, value){
      if (list.lastFind && list.lastFind.data === value) {
        return list.lastFind;
      }

      var item = list.sentinel,
          i = 0;

      while ((item = item.next) !== list.sentinel) {
        if (item.data === value) {
          return list.lastFind = item;
        }
      }
    }

    function LinkedList(){
      this.sentinel = new Sentinel(this);
      this.size = 0;
      this.lastFind = null;
      hide(this, 'sentinel');
      hide(this, 'lastFind');
    }

    define(LinkedList.prototype, [
      function first() {
        return this.sentinel.next.data;
      },
      function last() {
        return this.sentinel.prev.data;
      },
      function unshift(value){
        var item = new Item(value, this.sentinel);
        return this.size++;
      },
      function push(value){
        var item = new Item(value, this.sentinel.prev);
        return this.size++;
      },
      function insert(value, after){
        var item = find(this, after);
        if (item) {
          item = new Item(value, item);
          return this.size++;
        }
        return false;
      },
      function replace(value, replacement){
        var item = find(this, value);
        if (item) {
          new Item(replacement, item);
          item.unlink();
          return true;
        }
        return false;
      },
      function insertBefore(value, before){
        var item = find(this, before);
        if (item) {
          item = new Item(value, item.prev);
          return this.size++;
        }
        return false;
      },
      function pop(){
        if (this.size) {
          this.size--;
          return this.sentinel.prev.unlink().data;
        }
      },
      function shift() {
        if (this.size) {
          this.size--;
          return this.sentinel.next.unlink().data;
        }
      },
      function remove(value){
        var item = find(this, value);
        if (item) {
          item.unlink();
          return true;
        }
        return false;
      },
      function has(value) {
        return !!find(this, value);
      },
      function items(){
        var item = this.sentinel,
            array = [];

        while ((item = item.next) !== this.sentinel) {
          array.push(item.data);
        }

        return array;
      },
      function clear(){
        var next,
            item = this.sentinel.next;

        while (item !== this.sentinel) {
          next = item.next;
          item.clear();
          item = next;
        }

        this.size = 0;
        return this;
      },
      function clone(){
        var item = this.sentinel,
            list = new LinkedList;

        while ((item = item.next) !== this.sentinel) {
          list.push(item.data);
        }
        return list;
      },
      function forEach(callback, context){
        var item = this.sentinel,
            i = 0;
        context = context || this;
        while ((item = item.next) !== this.sentinel) {
          callback.call(context, item.data, i++, this);
        }
      },
      function map(callback, context) {
        var array = [];
        context = context || this;

        this.forEach(function(data, i){
          array.push(callback.call(context, data, i, this));
        });

        return array;
      },
      function filter(callback, context) {
        var array = [];
        context = context || this;

        this.forEach(function(data, i){
          if (callback.call(context, data, i, this)) {
            array.push(data);
          }
        });

        return array;
      },
      function __iterator__(){
        return new LinkedListIterator(this);
      }
    ]);

    return LinkedList;
  })();


  exports.Stack = (function(){
    function StackIterator(stack){
      this.stack = stack;
      this.index = stack.length;
    }

    define(StackIterator.prototype, [
      function next(){
        if (!this.index) {
          throw StopIteration;
        }
        return this.stack[--this.index];
      }
    ]);

    function Stack(){
      this.empty();
      for (var k in arguments) {
        this.push(arguments[k]);
      }
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

        for (var i=0; i < this.length; i++) {
          if (callback.call(context, this[i], i, this)) {
            out.push(this[i]);
          }
        }

        return out;
      },
      function __iterator__(){
        return new StackIterator(this);
      }
    ]);

    return Stack;
  })();

  var Queue = exports.Queue = (function(){
    function QueueIterator(queue){
      this.queue = queue;
      this.index = queue.index;
    }

    define(QueueIterator.prototype, [
      function next(){
        if (this.index === this.queue.items.length) {
          throw StopIteration;
        }
        return this.queue.items[this.index++];
      }
    ]);

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

    define(Queue.prototype, [
      function push(item){
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
      },
      function empty(){
        this.length = 0;
        this.index = 0;
        this.items = [];
        return this;
      },
      function front(){
        return this.items[this.index];
      },
      function item(depth){
        return this.items[this.index + depth];
      },
      function __iterator__(){
        return new QueueIterator(this);
      }
    ]);

    return Queue;
  })();

  exports.Feeder = (function(){
    function Feeder(callback, context, pace){
      var self = this;
      this.queue = new Queue;
      this.active = false;
      this.pace = pace || 5;
      this.feeder = function feeder(){
        var count = Math.min(self.pace, self.queue.length);

        while (self.active && count--) {
          callback.call(context, self.queue.shift());
        }

        if (!self.queue.length) {
          self.active = false;
        } else if (self.active) {
          setTimeout(feeder, 15);
        }
      };
    }

    define(Feeder.prototype, [
      function push(item){
        this.queue.push(item);
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

    return Feeder;
  })();

  function inspect(o){
    o = require('util').inspect(o, null, 4);
    console.log(o);
    return o;
  }
  exports.inspect = inspect;

  return exports;
})(typeof module !== 'undefined' ? module.exports : {});
