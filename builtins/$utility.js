var ___ = 0x00,
    E__ = 0x01,
    _C_ = 0x02,
    EC_ = E__ | _C_,
    __W = 0x04,
    E_W = E__ | __W,
    _CW = _C_ | __W,
    ECW = EC_ | __W,
    __A = 0x08,
    E_A = E__ | __A,
    _CA = _C_ | __A,
    ECA = EC_ | __A;


$__defineMethods = function defineMethods(obj, props){
  for (var i in props) {
    $__defineDirect(obj, props[i].name, props[i], _CW);
    $__MarkAsNative(props[i]);
    $__deleteDirect(props[i], 'prototype');
  }
  return obj;
};

$__defineProps = function defineProps(obj, props){
  for (var name in props) {
    var prop = props[name];
    $__defineDirect(obj, name, prop, _CW);
    if (typeof prop === 'function') {
      $__MarkAsNative(prop);
      $__defineDirect(prop, 'name', name, ___);
      $__deleteDirect(prop, 'prototype');
    }
  }
  return obj;
};

$__defineConstants = function defineConstants(obj, props){
  for (var k in props) {
    $__defineDirect(obj, k, props[k], ___);
  }
};

$__setupConstructor = function setupConstructor(ctor, proto){
  $__defineDirect(ctor, 'prototype', proto, ___);
  $__defineDirect(ctor.prototype, 'constructor', ctor, ___);
  $__defineDirect(global, ctor.name, ctor, _CW);
  $__MarkAsNativeConstructor(ctor);
};

$__EmptyClass = function constructor(...args){
  super(...args);
};
