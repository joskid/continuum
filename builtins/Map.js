function Map(iterable){
  var map;
  if ($__IsConstructCall()) {
    map = this;
  } else {
    if (this === undefined || this === $__MapProto) {
      map = $__ObjectCreate($__MapProto) ;
    } else {
      map = $__ToObject(this);
    }
  }

  if ($__HasInternal(map, 'MapData')) {
    throw $__Exception('double_initialization', ['Map'])
  }

  $__MapInitialization(map, iterable);
  return map;
}


$__setupConstructor(Map, $__MapProto);


$__defineProps(Map.prototype, {
  clear(){
    return $__MapClear(this, key);
  },
  set(key, value){
    return $__MapSet(this, key, value);
  },
  get(key){
    return $__MapGet(this, key);
  },
  has(key){
    return $__MapHas(this, key);
  },
  delete: function(key){
    return $__MapDelete(this, key);
  },
  items(){
    return new MapIterator(this, 'key+value');
  },
  keys(){
    return new MapIterator(this, 'key');
  },
  values(){
    return new MapIterator(this, 'value');
  },
  iterator(){
    return new MapIterator(this, 'key+value');
  }
});

$__defineDirect(Map.prototype.delete, 'name', 'delete', 0);

$__DefineOwnProperty(Map.prototype, 'size', {
  configurable: true,
  enumerable: false,
  get: function(){
    if (this === $__MapProto) {
      return 0;
    }
    return $__MapSize(this);
  },
  set: undefined
});

var MAP = 'Map',
    KEY  = 'MapNextKey',
    KIND  = 'MapIterationKind';


var K = 0x01,
    V = 0x02;

var kinds = {
  'key': 1,
  'value': 2,
  'key+value': 3
};


function MapIterator(map, kind){
  map = $__ToObject(map);
  $__SetInternal(this, MAP, map);
  $__SetInternal(this, KEY,  $__MapSigil());
  $__SetInternal(this, KIND, kinds[kind]);
  this.next = () => next.call(this);
}

$__defineProps(MapIterator.prototype, {
  next(){
    if (!$__IsObject(this)) {
      throw $__Exception('called_on_non_object', ['MapIterator.prototype.next']);
    }
    if (!$__HasInternal(this, MAP) || !$__HasInternal(this, KEY) || !$__HasInternal(this, KIND)) {
      throw $__Exception('called_on_incompatible_object', ['MapIterator.prototype.next']);
    }
    var map = $__GetInternal(this, MAP),
        key = $__GetInternal(this, KEY),
        kind = $__GetInternal(this, KIND);

    var item = $__MapNext(map, key);
    $__SetInternal(this, KEY, item[0]);

    if (kind & V) {
      if (kind & K) {
        return item;
      }
      return item[1];
    }
    return item[0];
  },
  iterator(){
    return this;
  }
});

var next = MapIterator.prototype.next;
