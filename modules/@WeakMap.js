export function WeakMap(iterable){
  var weakmap;
  if ($__IsConstructCall()) {
    weakmap = this;
  } else {
    if (this === undefined || this === $__WeakMapProto) {
      weakmap = $__ObjectCreate($__WeakMapProto) ;
    } else {
      weakmap = $__ToObject(this);
    }
  }

  if ($__HasInternal(weakmap, 'WeakMapData')) {
    throw $__Exception('double_initialization', ['WeakMap']);
  }

  $__WeakMapInitialization(weakmap, iterable);
  return weakmap;
}

$__setupConstructor(WeakMap, $__WeakMapProto);
{
$__defineProps(WeakMap.prototype, {
  set(key, value){
    ensureWeakMap(this, key, 'set');
    return $__WeakMapSet(this, key, value);
  },
  get(key){
    ensureWeakMap(this, key, 'get');
    return $__WeakMapGet(this, key);
  },
  has(key){
    ensureWeakMap(this, key, 'has');
    return $__WeakMapHas(this, key);
  },
  delete: function(key){
    ensureWeakMap(this, key, 'delete');
    return $__WeakMapDelete(this, key);
  }
});

$__defineDirect(WeakMap.prototype.delete, 'name', 'delete', 0);


function ensureWeakMap(o, p, name){
  if (!o || typeof o !== 'object' || !$__HasInternal(o, 'WeakMapData')) {
    throw $__Exception('called_on_incompatible_object', ['WeakMap.prototype.'+name]);
  }
  if (typeof p === 'object' ? p === null : typeof p !== 'function') {
    throw $__Exception('invalid_weakmap_key', []);
  }
}
}
