var utility = (function(exports){
  var esprima = require('esprima');

  var BOOLEAN   = 'boolean',
      FUNCTION  = 'function',
      NUMBER    = 'number',
      OBJECT    = 'object',
      STRING    = 'string',
      UNDEFINED = 'undefined';

  var toBrand = {}.toString,
      slice = [].slice,
      hasOwn = {}.hasOwnProperty;

  var hasDunderProto = { __proto__: [] } instanceof Array;


  function getBrandOf(o){
    return toBrand.call(o).slice(8, -1);
  }

  function ensureObject(name, o){
    if (!o || typeof o !== 'object') {
      throw new TypeError(name + ' called with non-object ' + getBrandOf(o));
    }
  }




  function isObject(v){
    return typeof v === OBJECT ? v !== null : typeof v === FUNCTION;
  }

  exports.isObject = isObject;


  exports.nextTick = typeof process !== UNDEFINED
    ? process.nextTick
    : function(f){ setTimeout(f, 1) };



  if (Object.create && !Object.create(null).toString) {
    var create = exports.create = Object.create;
  } else {
    var create = exports.create = (function(F, empty){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = 'javascript:';
      empty = iframe.contentWindow.Object.prototype;
      document.body.removeChild(iframe);

      var keys = ['constructor', 'hasOwnProperty', 'propertyIsEnumerable',
                  'isProtoypeOf', 'toLocaleString', 'toString', 'valueOf'];

      for (var i=0; i < keys.length; i++)
        delete empty[keys[i]];

      iframe = null = keys = null;

      function create(object){
        F.prototype = object === null ? empty : object;
        object = new F;
        F.prototype = null;
        return object;
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


  if (Object.defineProperty) {
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


  if (Object.getOwnPropertyDescriptor) {
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
        defineProperty(o, p.name, new Hidden(p));
        break;
      case OBJECT:
        if (p instanceof Array) {
          for (var i=0; i < p.length; i++) {
            var f = p[i];
            if (typeof f === FUNCTION && f.name) {
              var name = f.name;
            } else if (typeof f === STRING && typeof p[i+1] !== FUNCTION || !p[i+1].name) {
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
        o[p.name] = p;
        break;
      case OBJECT:
        if (p instanceof Array) {
          for (var i=0; i < p.length; i++) {
            var f = p[i];
            if (typeof f === FUNCTION && f.name) {
              var name = f.name;
            } else if (typeof f === STRING && typeof p[i+1] !== FUNCTION || !p[i+1].name) {
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
      constructor: { configurable: true, writable: true, value: Ctor }
    });
    properties && define(Ctor.prototype, properties);
    methods && define(Ctor.prototype, methods);
    return Ctor;
  }

  exports.inherit = inherit;




  function partial(f, args){
    args instanceof Array || (args = [args]);
    return function(){
      var a = [], j=0;
      for (var i=0; i < args.length; i++)
        a[i] = args[i] === __ ? arguments[j++] : args[i];
      return f.apply(this, a);
    };
  }

  exports.partial = partial;

  var __ = partial.__ = {};




  function quotes(s) {
    s = (''+s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    var singles = 0,
        doubles = 0,
        i = s.length;

    while (i--) {
      if (s[i] === '"')
        doubles++;
      else if (s[i] === "'")
        singles++;
    }

    if (singles > doubles)
      return '"' + s.replace(/"/g, '\\"') + '"';
    else
      return "'" + s.replace(/'/g, "\\'") + "'";
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

  var Visitor = exports.Visitor = (function(){
    function Cursor(parent, items){
      this.parent = parent || null;
      this.items = items;
    }

    function Visitor(node, callback, filter){
      if (typeof node === 'function') {
        this.callback = node;
        if (callback)
          this.filter = callback;
      } else {
        this.callback = callback;
        if (filter)
          this.filter = filter;
        this.reset(node);
      }
    }


    Visitor.visit = function visit(node, callback){
      if (!(node instanceof Array))
        node = [node];

      var visitor = new Visitor({}, function(node){
        if (!node) {
          return CONTINUE;
        } else if (node instanceof Array) {
          return RECURSE;
        } else {
          if (node.type) {
            callback(node);
          }
          return RECURSE;
        }
      });

      for (var i=0; i < node.length; i++) {
        visitor.reset(node[i]);
        visitor.next();
      }
    };

    define(Visitor.prototype, [
      function filter(){
        return true;
      },
      function reset(root){
        if (root !== undefined)
          this.root = root;
        this.stack = [];
        this.items = [];
        this.seen = Math.random().toString(36).slice(2);
        this.queue(this.root);
        this.items.unshift(this.root);
        return this;
      },
      function next(){
        this.items.length || this.pop();
        var item = this.items.pop();

        if (item !== undefined)
          var result = this.callback(item, this.cursor);

        switch (result) {
          case RECURSE:
            if (isObject(item) && !hasOwn.call(item, this.seen)) {
              define(item, this.seen, true);
              this.queue(item);
            }
          case CONTINUE:
            if (this.cursor)
              this.next();
          case BREAK:
          default:
        }
        return this;
      },
      function queue(node, parent){
        if (this.cursor && this.items.length)
          this.stack.push(new Cursor(this.cursor, this.items));

        this.cursor = node;
        this.items = [];

        var items = [],
            index = 0;

        if (!node)
          return;

        for (var k in node)
          if (this.filter(node[k]))
            items[index++] = node[k];

        while (index--)
          this.items.push(items[index]);

        return this;
      },
      function pop(){
        var current = this.stack.pop();
        if (current) {
          this.cursor = current.parent;
          this.items = current.items;
          if (!this.items.length)
            this.pop();
        } else {
          this.cursor = null;
          this.items = [];
          this.depleted = true;
        }
        return this;
      }
    ]);

    return Visitor;
  })();


  var BREAK    = Visitor.BREAK    = new Number(1),
      CONTINUE = Visitor.CONTINUE = new Number(2),
      RECURSE  = Visitor.RECURSE  = new Number(3);

  exports.Collector = (function(){
    function path(){
      var parts = [].slice.call(arguments);
      for (var i=0; i < parts.length; i++) {
        if (typeof parts[i] === 'function') {
          return function(o){
            for (var i=0; i < parts.length; i++) {
              if (typeof parts[i] === 'string')
                o = o[parts[i]];
              else if (typeof parts[i] === 'function')
                o = parts[i](o);
            }
            return o;
          };
        }
      }

      return function(o){
        for (var i=0; i < parts.length; i++)
          o = o[parts[i]];
        return o;
      };
    }



    function Collector(handlers){
      this.handlers = Object.create(null);
      for (var k in handlers) {
        if (handlers[k] instanceof Array)
          this.handlers[k] = path(handlers[k])
        else
          this.handlers[k] = handlers[k];
      }
      var self = this;
      return function(node){
        return self.collect(node);
      };
    }

    inherit(Collector, Visitor, [
      function collect(node, parent){
        var items = this.collected = [];
        this.reset(node);
        this.next();
        this.collected = null;
        return items;
      },
      function callback(node, parent){
        if (!node) return CONTINUE;
        var handler = this.handlers[node.type];
        if (handler) {
          if (handler === RECURSE || handler === CONTINUE) {
            return handler;
          } else {
            var item = handler(node);
            if (item !== undefined)
              this.collected.push(item);
          }
        } else if (node instanceof Array) {
          return RECURSE;
        }
        return CONTINUE;
      },
    ]);

    return Collector;
  })();



  function Emitter(){
    '_events' in this || define(this, '_events', create(null));
  }

  exports.Emitter = Emitter;

  define(Emitter.prototype, [
    function on(events, handler){
      events.split(/\s+/).forEach(function(event){
        if (!(event in this))
          this[event] = [];
        this[event].push(handler);
      }, this._events);
    },
    function off(events, handler){
      events.split(/\s+/).forEach(function(event){
        if (event in this) {
          var index = '__index' in handler ? handler.__index : this[event].indexOf(handler);
          if (~index)
            this[event].splice(index, 1)
        }
      }, this._events);
    },
    function once(events, handler){
      this.on(events, function once(){
        this.off(events, once);
        handler.apply(this, arguments);
      });
    },
    function emit(event){
      if (this._events['*']) {
        var handlers = this._events['*'];
        for (var i=0; i < handlers.length; i++)
          handlers[i].apply(this, arguments);
      }

      if (this._events[event]) {
        var args = slice.call(arguments, 1),
            handlers = this._events[event];
        for (var i=0; i < handlers.length; i++)
          handlers[i].apply(this, args);
      }
    }
  ]);



  function Hash(){}
  Hash.prototype = create(null);

  exports.Hash = Hash;


  function PropertyList(list){
    this.hash = new Hash;
    define(this, 'keys', []);
    this.add(list);
  }

  exports.PropertyList = PropertyList;

  define(PropertyList.prototype, [
    function add(key){
      if (typeof key === 'number')
        key += '';

      if (typeof key === 'string') {
        if (!(key in this.hash)) {
          this.hash[key] = this.keys.push(key) - 1;
        }
      } else if (key instanceof PropertyList) {
        key.forEach(function(key){
          this.add(key);
        }, this);
      } else if (key instanceof Array) {
        for (var i=0; i < key.length; i++)
          this.add(key[i]);
      }
    },
    function remove(key){
      if (key in this.hash) {
        this.keys.splice(this.hash[key], 1);
        delete this.hash[key];
        return true;
      } else {
        return false;
      }
    },
    function has(key){
      return key in this.hash;
    },
    function forEach(callback, context){
      context = context || this;
      for (var i=0; i < this.keys.length; i++)
        callback.call(context, this.keys[i], i, this);
    },
    function map(callback, context){
      var out = new PropertyList;
      context = context || this;
      for (var i=0; i < this.keys.length; i++)
        out.push(callback.call(context, this.keys[i], i, this));
      return out;
    },
    function filter(callback, context){
      var out = new PropertyList;
      context = context || this;
      for (var i=0; i < this.keys.length; i++) {
        if (callback.call(context, this.keys[i], i, this))
          out.add(this.keys[i]);
      }
      return out;
    },
    function clone(){
      return new PropertyList(this);
    },
    function toArray(){
      return this.keys.slice();
    },
  ]);



  function Stack(){
    this.empty();
    for (var k in arguments)
      this.record(arguments[k]);
  }

  exports.Stack = Stack;

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



  var cache = [];

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

  exports.numbers = numbers;



  function Reflection(o){
    define(this, 'subject', o);
  }

  function reflect(o){
    return new Reflection(o);
  }

  exports.reflect = reflect;

  void function(){
    function enumerate(){
      var keys = [], i = 0;
      for (keys[i++] in this.subject);
      return keys;
    }

    function keys(){
      return ownKeys(this.subject);
    }

    function brand(){
      return toBrand.call(this.subject).slice(8, -1);
    }

    function proto(){
      return getPrototypeOf(this.subject);
    }

    function copy(){
      return assign(create(getPrototypeOf(this.subject)), this.subject);
    }

    function clone(){
      var out = create(getPrototypeOf(this.subject)),
          props = getProperties(this.subject);

      for (var i=0; i < props.length; i++) {
        defineProperty(out, props[i], decribeProperty(this.subject, props[i]));
      }
      return out;
    }

    function inherit(from, props, methods){
      define(this.subject, { inherits: from });
      this.subject.prototype = create(from.prototype, {
        constructor: { configurable: true, writable: true, value: this.subject }
      });
      props && define(this.subject.prototype, props);
      methods && define(this.subject.prototype, methods);
      return this;
    }

    function extend(){
      for (var k in arguments) {
        assign(this.subject, arguments[k]);
      }
      return this;
    }

    function visit(callback){
      Visitor.visit(this.subject, callback);
      return this;
    }

    function spawn(){
      var out = create(this.subject);
      if (arguments.length) {
        for (var k in arguments) {
          assign(out, arguments[k]);
        }
      }
      return out;
    }

    define(Reflection.prototype, [enumerate,  keys,  brand,  proto,  copy,  inherit,  extend,  visit,  spawn]);
  }();




  function parse(src, options){
    return esprima.parse(src, options || parse.options);
  }

  exports.parse = parse;

  parse.options = {
    loc    : true,
    range  : true,
    raw    : false,
    tokens : false,
    comment: false
  }


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
