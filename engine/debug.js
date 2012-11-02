var debug = (function(exports){

  var utility = require('./utility'),
      isObject = utility.isObject,
      inherit = utility.inherit,
      create = utility.create,
      define = utility.define;

  var constants = require('./constants'),
      ENUMERABLE = constants.ATTRIBUTES.ENUMERABLE,
      CONFIGURABLE = constants.ATTRIBUTES.CONFIGURABLE,
      WRITABLE = constants.ATTRIBUTES.WRITABLE,
      ACCESSOR = constants.ATTRIBUTES.ACCESSOR;

  var runtime = require('./runtime'),
      realm = runtime.activeRealm;

  function always(value){
    return function(){ return value };
  }

  function alwaysCall(func, args){
    args || (args = []);
    return function(){ return func.apply(null, args) }
  }

  function isNegativeZero(n){
    return n === 0 && 1 / n === -Infinity;
  }


  function Mirror(){}

  define(Mirror.prototype, {
    type: null,
    getPrototype: function(){
      return _Null;
    },
    get: function(){
      return _Undefined;
    },
    kind: 'Unknown',
    label: always(''),
    hasOwn: always(null),
    has: always(null),
    list: alwaysCall(Array),
    inheritedAttrs: alwaysCall(create, [null]),
    ownAttrs: alwaysCall(create, [null]),
    getterAttrs: alwaysCall(create, [null]),
    isExtensible: always(null),
    isEnumerable: always(null),
    isConfigurable: always(null),
    isAccessor: always(null),
    isWritable: always(null),
    propAttributes: always(null)
  });

  function brand(v){
    return Object.prototype.toString.call(v).slice(8, -1);
  }

  function MirrorValue(subject, label){
    this.subject = subject;
    this.type = typeof subject;
    this.kind = brand(subject)+'Value';
    if (this.type === 'number' && isNegativeZero(subject)) {
      label = '-0';
    }
    this.label = always(label);
  }

  inherit(MirrorValue, Mirror);

  function MirrorStringValue(subject){
    this.subject = subject;
  }

  inherit(MirrorStringValue, MirrorValue, {
    label: always('string'),
    kind: 'StringValue',
    type: 'string'
  });

  function MirrorNumberValue(subject){
    this.subject = subject;
  }

  inherit(MirrorNumberValue, MirrorValue, {
    label: always('number'),
    kind: 'NumberValue',
    type: 'number'
  });





  function MirrorObject(subject){
    subject.__introspected = this;
    this.subject = subject;
    this.props = subject.properties;
  }

  inherit(MirrorObject, Mirror, {
    kind: 'Object',
    type: 'object',
    attrs: null,
    props: null
  }, [
    function get(key){
      if (key === '__proto__') {
        return this.getPrototype();
      }
      var prop = this.props.getProperty(key);
      if (!prop) {
        return this.getPrototype().get(key);
      } else if (prop[2] & ACCESSOR) {
        realm().enterMutationContext();
        var ret = introspect(this.subject.Get(key));
        realm().exitMutationContext();
        return ret;
      } else {
        return introspect(prop[1]);
      }
    },
    function isClass(){
      return !!this.subject.Class;
    },
    function getBrand(){
      return this.subject.Brand || this.subject.NativeBrand;
    },
    function getValue(key){
      return this.get(key).subject;
    },
    function getPrototype(){
      return introspect(this.subject.GetPrototype());
    },
    function setPrototype(value){
      realm().enterMutationContext();
      var ret = this.subject.SetPrototype(value);
      realm().exitMutationContext();
      return ret;
    },
    function set(key, value){
      var ret;
      realm().enterMutationContext();
      if (key === '__proto__') {
        this.subject.SetPrototype(value);
        ret = true;
      } else {
        ret = this.subject.Put(key, value, false);
      }
      realm().exitMutationContext();
      return ret;
    },
    function setAttribute(key, attr){
      var prop = this.props.getProperty(key);
      if (prop) {
        prop[2] = attr;
        return true;
      }
      return false;
    },
    function defineProperty(key, desc){
      desc = Object(desc);
      var Desc = {};
      if ('value' in desc) {
        Desc.Value = desc.value;
      }
      if ('get' in desc) {
        Desc.Get = desc.get;
      }
      if ('set' in desc) {
        Desc.Set = desc.set;
      }
      if ('enumerable' in desc) {
        Desc.Enumerable = desc.enumerable;
      }
      if ('configurable' in desc) {
        Desc.Configurable = desc.configurable;
      }
      if ('writable' in desc) {
        Desc.Writable = desc.writable;
      }
      realm().enterMutationContext();
      var ret = this.subject.DefineOwnProperty(key, Desc, false);
      realm().exitMutationContext();
      return ret;
    },
    function hasOwn(key){
      if (this.props) {
        return this.props.has(key);
      } else {
        return false;
      }
    },
    function has(key){
      return this.hasOwn(key) || this.getPrototype().has(key);
    },
    function isExtensible(key){
      return this.subject.GetExtensible();
    },
    function getOwnDescriptor(key){
      var prop = this.props.getProperty(key);
      if (prop) {
        if (prop[2] & ACCESSOR) {
          return {
            name: key,
            get: prop[1].Get,
            set: prop[1].Set,
            enumerable: (prop[2] & ENUMERABLE) > 0,
            configurable: (prop[2] & CONFIGURABLE) > 0
          }
        } else {
          return {
            name: key,
            value: prop[1],
            writable: (prop[2] & WRITABLE) > 0,
            enumerable: (prop[2] & ENUMERABLE) > 0,
            configurable: (prop[2] & CONFIGURABLE) > 0
          }
        }
      }
    },
    function getInternal(name){
      return this.subject[name];
    },
    function isPropEnumerable(key){
      return (this.propAttributes(key) & ENUMERABLE) > 0;
    },
    function isPropConfigurable(key){
      return (this.propAttributes(key) & CONFIGURABLE) > 0;
    },
    function isPropAccessor(key){
      return (this.propAttributes(key) & ACCESSOR) > 0;
    },
    function isPropWritable(key){
      var prop = this.props.get(key);
      if (prop) {
        return !!(prop[2] & ACCESSOR ? prop[1].Set : prop[2] & WRITABLE);
      } else {
        return this.subject.GetExtensible();
      }
    },
    function propAttributes(key){
      var prop = this.props.getProperty(key);
      return prop ? prop[2] : this.getPrototype().propAttributes(key);
    },
    function label(){
      var brand = this.subject.Brand || this.subject.NativeBrand;
      if (brand && brand.name !== 'Object') {
        return brand.name;
      }

      if (this.subject.ConstructorName) {
        return this.subject.ConstructorName;
      } else if (this.has('constructor')) {
        var ctorName = this.get('constructor').get('name');
        if (ctorName.subject && typeof ctorName.subject === 'string') {
          return ctorName.subject;
        }
      }

      return 'Object';
    },
    function inheritedAttrs(){
      return this.ownAttrs(this.getPrototype().inheritedAttrs());
    },
    function ownAttrs(props){
      props || (props = create(null));
      this.props.forEach(function(prop){
        props[prop[0]] = prop[2];
      });
      return props;
    },
    function getterAttrs(own){
      var inherited = this.getPrototype().getterAttrs(),
          props = this.ownAttrs();

      for (var k in props) {
        if (own || (props[k] & ACCESSOR)) {
          inherited[k] = props[k];
        }
      }
      return inherited;
    },
    function list(hidden, own){
      var keys = [],
          props = own
            ? this.ownAttrs()
            : own === false
              ? this.inheritedAttrs()
              : this.getterAttrs(true);

      for (var k in props) {
        if (hidden || (props[k] & ENUMERABLE)) {
          keys.push(k);
        }
      }

      return keys.sort();
    }
  ]);


  function MirrorArguments(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorArguments, MirrorObject, {
    kind: 'Arguments'
  }, [
  ]);


  function MirrorArray(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorArray, MirrorObject, {
    kind: 'Array'
  }, [
    function list(hidden, own){
      var keys = [],
          indexes = [],
          len = this.getValue('length'),
          props = own
            ? this.ownAttrs()
            : own === false
              ? this.inheritedAttrs()
              : this.getterAttrs(true);

      for (var i=0; i < len; i++) {
        indexes.push(i+'');
      }
      indexes.push('length');

      for (var k in props) {
        if (hidden || props[k] & ENUMERABLE) {
          if (k !== 'length' && !utility.isInteger(+k)) {
            keys.push(k);
          }
        }
      }

      return indexes.concat(keys.sort());
    }
  ]);


  function MirrorBoolean(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorBoolean, MirrorObject, {
    kind: 'Boolean'
  }, [
    function label(){
      return 'Boolean('+this.subject.PrimitiveValue+')';
    }
  ]);

  function MirrorDate(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorDate, MirrorObject, {
    kind: 'Date'
  }, [
    function label(){
      var date = this.subject.PrimitiveValue;
      if (!date || date === Date.prototype || ''+date === 'Invalid Date') {
        return 'Invalid Date';
      } else {
        var json = date.toJSON();
        return json.slice(0, 10) + ' ' + json.slice(11, 19);
      }
    }
  ]);


  function MirrorError(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorError, MirrorObject, {
    kind: 'Error'
  }, [
  ]);

  function MirrorThrown(subject){
    MirrorError.call(this, subject);
  }

  inherit(MirrorThrown, MirrorError, {
    kind: 'Thrown'
  }, [
    function getError(){
      if (this.subject.NativeBrand.name === 'StopIteration') {
        return 'StopIteration';
      }
      return this.getValue('name') + ': ' + this.getValue('message');
    },
    function trace(){
      return this.subject.trace;
    },
    function context(){
      return this.subject.context;
    }
  ]);


  function MirrorFunction(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorFunction, MirrorObject, {
    type: 'function',
    kind: 'Function',
  }, [
    function getName(){
      return this.props.get('name');
    },
    function getParams(){
      var params = this.subject.FormalParameters;
      if (params && params.ArgNames) {
        var names = params.ArgNames.slice();
        if (params.Rest) {
          names.rest = true;
        }
        return names;
      } else {
        return [];
      }
    },
    function apply(receiver, args){
      if (receiver.subject) {
        receiver = receiver.subject;
      }
      realm().enterMutationContext();
      var ret = this.subject.Call(receiver, args);
      realm().exitMutationContext();
      return introspect(ret);
    },
    function construct(args){
      if (this.subject.Construct) {
        realm().enterMutationContext();
        var ret = this.subject.Construct(args);
        realm().exitMutationContext();
        return introspect(ret);
      } else {
        return false;
      }
    }
  ]);


  function MirrorGlobal(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorGlobal, MirrorObject, {
    kind: 'Global'
  }, [
  ]);



  function MirrorJSON(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorJSON, MirrorObject, {
    kind: 'JSON'
  }, [
  ]);

  function MirrorMap(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorMap, MirrorObject, {
    kind: 'Map'
  }, [
  ]);

  function MirrorMath(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorMath, MirrorObject, {
    kind: 'Math'
  }, [
  ]);

  function MirrorNumber(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorNumber, MirrorObject, {
    kind: 'Number'
  }, [
    function label(){
      var value = this.subject.PrimitiveValue;
      if (isNegativeZero(value)) {
        value = '-0';
      } else {
        value += '';
      }
      return 'Number('+value+')';
    }
  ]);

  function MirrorRegExp(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorRegExp, MirrorObject, {
    kind: 'RegExp'
  }, [
    function label(){
      return this.subject.PrimitiveValue+'';
    }
  ]);


  function MirrorSet(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorSet, MirrorObject, {
    kind: 'Set'
  }, [
  ]);


  function MirrorString(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorString, MirrorObject,{
    kind: 'String'
  }, [
    function get(key){
      if (key < this.props.get('length') && key >= 0) {
        return this.subject.PrimitiveValue[key];
      } else {
        return MirrorObject.prototype.get.call(this, key);
      }
    },
    function ownAttrs(props){
      var len = this.props.get('length');
      props || (props = create(null));
      for (var i=0; i < len; i++) {
        props[i] = 1;
      }
      this.props.forEach(function(prop){
        props[prop[0]] = prop[2];
      });
      return props;
    },
    function propAttributes(key){
      if (key < this.props.get('length') && key >= 0) {
        return 1;
      } else {
        return MirrorObject.prototype.propAttributes.call(this, key);
      }
    },
    function label(){
      return 'String('+utility.quotes(this.subject.PrimitiveValue)+')';
    }
  ]);


  function MirrorWeakMap(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorWeakMap, MirrorObject, {
    kind: 'WeakMap'
  }, [
  ]);



  function MirrorProxy(subject){
    this.subject = subject;
    if ('Call' in subject) {
      this.type = 'function';
    }
    this.attrs = create(null)
    this.props = create(null)
    this.kind = introspect(subject.Target).kind;
  }

  inherit(MirrorProxy, Mirror, {
    type: 'object'
  }, [
    MirrorObject.prototype.isExtensible,
    MirrorObject.prototype.getPrototype,
    MirrorObject.prototype.list,
    MirrorObject.prototype.inheritedAttrs,
    MirrorObject.prototype.getterAttrs,
    function label(){
      return 'Proxy' + MirrorObject.prototype.label.call(this);
    },
    function get(key){
      this.refresh(key);
      return introspect(this.props.get(key));
    },
    function hasOwn(key){
      return this.refresh(key);
    },
    function has(key){
      return this.refresh(key) ? true : this.getPrototype().has(key);
    },
    function isPropEnumerable(key){
      if (this.refresh(key)) {
        return (this.attrs[key] & ENUMERABLE) > 0;
      } else {
        return false;
      }
    },
    function isPropConfigurable(key){
      if (this.refresh(key)) {
        return (this.attrs[key] & CONFIGURABLE) > 0;
      } else {
        return false;
      }
    },
    function isPropAccessor(key){
      if (this.refresh(key)) {
        return (this.attrs[key] & ACCESSOR) > 0;
      } else {
        return false;
      }
    },
    function isPropWritable(key){
      if (this.refresh(key)) {
        return !!(this.isAccessor() ? this.props[key].Set : this.attrs[key] & WRITABLE);
      } else {
        return false;
      }
    },
    function propAttributes(key){
      if (this.refresh(key)) {
        return this.attrs[key];
      } else {
        return this.getPrototype().propAttributes(key);
      }
    },
    function ownAttrs(props){
      var key, keys = this.subject.GetOwnPropertyNames();

      props || (props = create(null));
      this.props = create(null);
      this.attrs = create(null);

      for (var i=0; i < keys.length; i++) {
        key = keys[i];
        if (this.refresh(key)) {
          props[key] = this.attrs[key];
        }
      }

      return props;
    },
    function refresh(key){
      if (!(key in this.attrs)) {
        var desc = this.subject.GetOwnProperty(key, false);
        if (desc) {
          if ('Value' in desc) {
            this.attrs[key] = desc.Enumerable | (desc.Configurable << 1) | (desc.Writable << 2);
            this.props[key] = desc.Value;
          } else {
            this.attrs[key] = desc.Enumerable | (desc.Configurable << 1) | A;
            this.props[key] = { Get: desc.Get, Set: desc.Set };
          }
          return true;
        } else {
          delete this.attrs[key];
          delete this.props[key];
        }
      }
      return false;
    }
  ]);


  var brands = {
    Arguments: MirrorArguments,
    Array    : MirrorArray,
    Boolean  : MirrorBoolean,
    Date     : MirrorDate,
    Error    : MirrorError,
    Function : MirrorFunction,
    global   : MirrorGlobal,
    JSON     : MirrorJSON,
    Map      : MirrorMap,
    Math     : MirrorMath,
    Map      : MirrorMap,
    Number   : MirrorNumber,
    RegExp   : MirrorRegExp,
    Set      : MirrorSet,
    String   : MirrorString,
    WeakMap  : MirrorWeakMap
  };

  var _Null        = new MirrorValue(null, 'null'),
      _Undefined   = new MirrorValue(undefined, 'undefined'),
      _True        = new MirrorValue(true, 'true'),
      _False       = new MirrorValue(false, 'false'),
      _NaN         = new MirrorValue(NaN, 'NaN'),
      _Infinity    = new MirrorValue(Infinity, 'Infinity'),
      _NegInfinity = new MirrorValue(-Infinity, '-Infinity'),
      _Zero        = new MirrorValue(0, '0'),
      _NegZero     = new MirrorValue(-0, '-0'),
      _One         = new MirrorValue(1, '1'),
      _NegOne      = new MirrorValue(-1, '-1'),
      _Empty       = new MirrorValue('', "''");

  var numbers = create(null),
      strings = create(null);


  function introspect(subject){
    switch (typeof subject) {
      case 'undefined': return _Undefined;
      case 'boolean': return subject ? _True : _False;
      case 'string':
        if (subject === '') {
          return _Empty
        } else if (subject.length < 20) {
          if (subject in strings) {
            return strings[subject];
          } else {
            return strings[subject] = new MirrorStringValue(subject);
          }
        } else {
          return new MirrorStringValue(subject);
        }
      case 'number':
        if (subject !== subject) {
          return _NaN;
        }
        switch (subject) {
          case Infinity: return _Infinity;
          case -Infinity: return _NegInfinity;
          case 0: return 1 / subject === -Infinity ? _NegZero : _Zero;
          case 1: return _One;
          case -1: return _NegOne;
        }
        if (subject in numbers) {
          return numbers[subject];
        } else {
          return numbers[subject] = new MirrorNumberValue(subject);
        }
      case 'object':
        if (subject === null) {
          return _Null;
        }
        if (subject instanceof Mirror) {
          return subject;
        }
        if (subject.__introspected) {
          return subject.__introspected;
        }
        if (subject.Completion) {
          return new MirrorThrown(subject.value);
        } else if (subject.NativeBrand) {
          if (!subject.isProxy) {
            var Ctor = subject.NativeBrand.name in brands
                      ? brands[subject.NativeBrand.name]
                      : 'Call' in subject
                        ? MirrorFunction
                        : MirrorObject;

            return new Ctor(subject);
          } else {
            return new MirrorProxy(subject);
          }
        } else {
          console.log(subject);
          return _Undefined
        }
    }
  }



  function Renderer(handlers){
    if (handlers) {
      for (var k in this) {
        if (k in handlers) {
          this[k] = handlers[k];
        }
      }
    }
  }

  var label = function(mirror){
    return mirror.label();
  };

  Renderer.prototype = {
    Unknown: label,
    BooleanValue: label,
    StringValue: function(mirror){
      return utility.quotes(mirror.subject);
    },
    NumberValue: function(mirror){
      var label = mirror.label();
      return label === 'number' ? mirror.subject : label;
    },
    UndefinedValue: label,
    NullValue: label,
    Thrown: function(mirror){
      return mirror.getError();
    },
    Arguments: label,
    Array: label,
    Boolean: label,
    Date: label,
    Error: function(mirror){
      return mirror.getValue('name') + ': ' + mirror.getValue('message');
    },
    Function: label,
    Global: label,
    JSON: label,
    Map: label,
    Math: label,
    Object: label,
    Number: label,
    RegExp: label,
    Set: label,
    String: label,
    WeakMap: label
  };

  define(Renderer.prototype, [
    function render(subject){
      var mirror = introspect(subject);
      return this[mirror.kind](mirror);
    }
  ]);


  var renderer = new Renderer;

  function render(o){
    return renderer.render(o);
  }

  function createRenderer(handlers){
    return new Renderer(handlers);
  }

  function isMirror(o){
    return o instanceof Mirror;
  }

  void function(){
    if (typeof Proxy !== 'object' || typeof require !== 'function') return;

    var util = require('util'),
        wrappers = new WeakMap,
        $Object = require('./runtime').builtins.$Object;

    define($Object.prototype, function inspect(fn){
      if (fn && typeof fn === 'function') {
        return fn(wrap(this));
      } else {
        return util.inspect(wrap(this), true, 2, false);
      }
    });


    exports.wrap = wrap;

    function wrap(target){
      if (isObject(target)) {
        if (target instanceof $Object) {
          target = introspect(target);
        }
        if (target instanceof MirrorObject) {
          if (!target.proxy) {
            if (target.type === 'function') {
              var handler = new RenderHandler(target);
              target.proxy = Proxy.createFunction(handler,
                function(){ return handler.apply(this, [].slice.call(arguments)) },
                function(){ return handler.construct([].slice.call(arguments)) }
              );
            } else {
              target.proxy = Proxy.create(new RenderHandler(target));
            }
            wrappers.set(target.proxy, target.subject);
          }
        } else if (target instanceof Mirror) {
          return Mirror.subject;
        }
        return target.proxy;
      }
      return target;
    }

    function unwrap(target){
      if (!isObject(target) || target instanceof $Object) {
        return target;
      }
      if (wrappers.has(target)) {
        return wrappers.get(target);
      }
      return target;
    }


    function RenderHandler(mirror){
      this.mirror = mirror;
    }

    RenderHandler.prototype = {
      getOwnPropertyNames: function(){
        return this.mirror.list(false, true);
      },
      getPropertyNames: function(){
        return this.mirror.list(false, true);
      },
      enumerate: function(){
        return this.mirror.list(false, true);
      },
      keys: function(){
        return this.mirror.list(false, true);
      },
      getOwnPropertyDescriptor: function(key){
        var desc = this.mirror.getOwnDescriptor(key);
        if (desc) {
          desc.configurable = true;
          if (isObject(desc.value)) {
            desc.value = wrap(desc.value);
          } else {
            if (isObject(desc.get)) {
              desc.get = wrap(desc.get);
            }
            if (isObject(desc.set)) {
              desc.set = wrap(desc.set);
            }
          }
        }
        return desc;
      },
      get: function(rcvr, key){
        if (key === 'inspect') return;
        if (key === 'toString') {
          var mirror = this.mirror;
          return function toString(){
            return '[object '+ mirror.subject.NativeBrand.name+']';
          };
        }
        var result = this.mirror.get(key);
        if (!isObject(result.subject)) {
          return result.subject;
        } else {
          return wrap(result);
        }

      },
      set: function(receiver, key, value){
        this.mirror.set(key, unwrap(value));
        return true;
      },
      defineProperty: function(key, desc){
        if ('value' in desc) {
          desc.value = unwrap(desc.value);
        } else {
          if ('get' in desc) {
            desc.get = unwrap(desc.get);
          }
          if ('set' in desc) {
            desc.set = unwrap(desc.set);
          }
        }
        this.mirror.defineProperty(key, desc);
      },
      has: function(key){
        return this.mirror.has(key);
      },
      hasOwn: function(key){
        return this.mirror.hasOwn(key);
      },
      apply: function(receiver, args){
        return wrap(this.mirror.apply(unwrap(receiver), args.map(unwrap)));
      },
      construct: function(args){
        return wrap(this.mirror.construct(args.map(unwrap)));
      }
    };
  }();


  exports.createRenderer = createRenderer;
  exports.basicRenderer = render;
  exports.introspect = introspect;
  exports.isMirror = isMirror;
  exports.Renderer = Renderer;

  return exports;
})(typeof module !== 'undefined' ? module.exports : {});
