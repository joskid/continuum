{
  let ___ = 0x00,
      E__ = 0x01,
      _C_ = 0x02,
      EC_ = 3,
      __W = 0x04,
      E_W = 5,
      _CW = 6,
      ECW = 7,
      __A = 0x08,
      E_A = 9,
      _CA = 10,
      ECA = 11;

  let global = $__global;


  $__defineMethods = function defineMethods(obj, props){
    for (var i=0; i < props.length; i++) {
      $__SetInternal(props[i], 'Native', true);
      $__defineDirect(obj, props[i].name, props[i], _CW);
      $__deleteDirect(props[i], 'prototype');
    }
    return obj;
  };

  $__defineProps = function defineProps(obj, props){
    var keys = $__Enumerate(props, false, false);
    for (var i=0; i < keys.length; i++) {
      var name = keys[i],
          prop = props[name];

      $__defineDirect(obj, name, prop, _CW);

      if (typeof prop === 'function') {
        $__SetInternal(prop, 'Native', true);
        $__defineDirect(prop, 'name', name, ___);
        $__deleteDirect(prop, 'prototype');
      }
    }
    return obj;
  };

  $__setupFunction = function setupFunction(func, name){
    $__SetInternal(func, 'Native', true);
    if (name !== undefined) {
      $__defineDirect(func, 'name', name, ___);
    }
    $__deleteDirect(func, 'prototype');
  };

  $__defineConstants = function defineConstants(obj, props){
    var keys = $__Enumerate(props, false, false);
    for (var i=0; i < keys.length; i++) {
      $__defineDirect(obj, keys[i], props[keys[i]], ___);
    }
  };

  $__setupConstructor = function setupConstructor(ctor, proto){
    $__defineDirect(ctor, 'prototype', proto, ___);
    $__defineDirect(ctor, 'length', 1, ___);
    $__defineDirect(ctor.prototype, 'constructor', ctor, _CW);
    $__defineDirect(global, ctor.name, ctor, _CW);
    $__SetInternal(ctor, 'Native', true);
    $__SetInternal(ctor, 'NativeConstructor', true);
  };


  $__setLength = function setLength(f, length){
    if (typeof length === 'string') {
      $__setDirect(f, 'length', length);
    } else {
      var keys = $__Enumerate(length, false, false);
      for (var i=0; i < keys.length; i++) {
        var key = keys[i];
        $__setDirect(f[key], 'length', length[key]);
      }
    }
  };


  let hidden = { enumerable: false };

  $__hideEverything = function hideEverything(o){
    if (!o || typeof o !== 'object') return o;

    var keys = $__Enumerate(o, false, true),
        i = keys.length;

    while (i--) {
      $__updateAttrDirect(o, keys[i], ~E__);
    }

    if (typeof o === 'function') {
      hideEverything(o.prototype);
    }

    return o;
  };
}


class Storage {
  constructor(){}
  set(props){
    for (var k in props) {
      this[k] = props[k];
    }
  }
  empty(){
    for (var k in this) {
      delete this[k];
    }
  }
}

$__DefineOwnProperty(Storage.prototype, 'set', { enumerable: false, configurable: false, writable: false });
$__DefineOwnProperty(Storage.prototype, 'empty', { enumerable: false, configurable: false, writable: false });


let _ = o => {
  var v = $__GetHidden(o, 'loader-internals');
  if (!v) {
    v = new Storage;
    $__SetHidden(o, 'loader-internals', v);
  }
  return v;
}



class Request {
  constructor(loader, mrl, resolved, callback, errback){
    _(this).set({
      loader: loader,
      callback: callback,
      errback: errback,
      mrl: mrl,
      resolved: resolved
    });
  }

  fulfill(src){
    var _this = _(this),
        _loader = _(_this.loader);

    var translated = (_loader.translate)(src, _this.mrl, _loader.baseURL, _this.resolved);
    if (_loader.strict) {
      translated = '"use strict";'+translated;
    }

    $__EvaluateModule(translated, _loader.global, _this.resolved, module => {
      var _module = _(module);
      _module.loader = _this.loader;
      $__SetInternal(_module, 'resolved', _this.resolved);
      $__SetInternal(_module, 'mrl', _this.mrl);
      _loader.modules[_this.resolved] = module;
      (_this.callback)(module);
      _this.empty();
    });
  }

  redirect(mrl, baseURL){
    var _this = _(this),
        _loader = _(_this.loader);

    _this.resolved = (_loader.resolve)(mrl, baseURL);
    _this.mrl = mrl;

    var module = _this.loader.get(_this.resolved);
    if (module) {
      (_this.callback)(module);
    } else {
      (_loader.fetch)(mrl, baseURL, this, _this.resolved);
    }
  }

  reject(msg){
    var _this = _(this);
    (_this.errback)(msg);
    _this.empty();
  }
}


export class Loader {
  constructor(parent, options){
    this.linkedTo  = options.linkedTo || null;
    _(this).set({
      translate: options.translate || parent.translate,
      resolve  : options.resolve || parent.resolve,
      fetch    : options.fetch || parent.fetch,
      strict   : options.strict === true,
      global   : options.global || $__global,
      baseURL  : options.baseURL || parent ? parent.baseURL : '',
      modules  : $__ObjectCreate(null)
    });
  }

  get global(){
    return _(this).global;
  }

  get baseURL(){
    return _(this).baseURL;
  }

  load(mrl, callback, errback){
    var _this = _(this),
        key = (_this.resolve)(mrl, _this.baseURL),
        module = _this.modules[key];

    if (module) {
      callback(module);
    } else {
      (_this.fetch)(mrl, _this.baseURL, new Request(this, mrl, key, callback, errback), key);
    }
  }

  eval(src){
    var _this = _(this);
    var module = $__EvaluateModule(src, _this.global, _this.baseURL);
    return module;
  }

  evalAsync(src, callback, errback){

  }

  get(mrl){
    var _this = _(this),
        canonical = (_this.resolve)(mrl, _this.baseURL);
    return _this.modules[canonical];
  }

  set(mrl, mod){
    var _this = _(this),
        canonical = (_this.resolve)(mrl, _this.baseURL);

    if (typeof canonical === 'string') {
      _this.modules[canonical] = mod;
    } else {
      for (var k in canonical) {
        _this.modules[k] = canonical[k];
      }
    }
  }

  defineBuiltins(object){
    var std  = $__StandardLibrary(),
        desc = { configurable: true,
                 enumerable: false,
                 writable: true,
                 value: undefined };

    object || (object = _(this).global);
    for (var k in std) {
      desc.value = std[k];
      $__DefineOwnProperty(object, k, desc);
    }

    return object;
  }
}

export let Module = function Module(object){
  if ($__GetNativeBrand(object) === 'Module') {
    return object;
  }
  return $__ToModule($__ToObject(object));
}

$__deleteDirect(Module, 'prototype');

$__System = new Loader(null, {
  global: this,
  baseURL: '',
  strict: false,
  fetch(relURL, baseURL, request, resolved) {
    $__Fetch(resolved, src => {
      if (typeof src === 'string') {
        request.fulfill(src);
      } else {
        request.reject(src.message);
      }
    });
  },
  resolve(relURL, baseURL){
    return baseURL + relURL;
  },
  translate(src, relURL, baseURL, resolved) {
    return src;
  }
});


