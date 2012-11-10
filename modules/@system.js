// function constructor(...args){
//   super(...args);
// }

// $__EmptyClass = constructor;


class Storage {
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


var _ = function(object){
  var internals = $__GetHidden(object, 'loader-internals');
  if (!internals) $__SetHidden(object, 'loader-internals', internals = new Storage);
  return internals;
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

    var module = $__EvaluateModule(translated, _loader.global, _this.resolved);
    _loader.modules[_this.resolved] = module;
    (_this.callback)(module);
    _this.empty();
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
      global   : options.global || new Function('return this')(),
      baseURL  : options.baseURL || parent ? parent.baseURL : '.',
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
    return $__EvaluateModule(src, _this.global, _this.baseURL);
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

export var System = new Loader(null, {
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
