import Map from '@Map';

export function Set(iterable){
  var set;
  if ($__IsConstructCall()) {
    set = this;
  } else {
    if (this === undefined || this === $__SetProto) {
      set = $__ObjectCreate($__SetProto) ;
    } else {
      set = $__ToObject(this);
    }
  }
  if ($__HasInternal(set, 'SetData')) {
    throw $__Exception('double_initialization', ['Set']);
  }

  if (iterable !== undefined) {
    iterable = $__ToObject(iterable);
    $__SetInternal(set, 'SetData', new Map(iterable.values()));
  } else {
    $__SetInternal(set, 'SetData', new Map);
  }
  return set;
}


$__setupConstructor(Set, $__SetProto);
{
$__defineProps(Set.prototype, {
  clear(){
    return $__MapClear(ensureSet(this));
  },
  add(key){
    return $__MapSet(ensureSet(this), key, key);
  },
  has(key){
    return $__MapHas(ensureSet(this), key);
  },
  delete: function(key){
    return $__MapDelete(ensureSet(this), key);
  },
  items(){
    return new SetIterator(this, 'key+value');
  },
  keys(){
    return new SetIterator(this, 'key');
  },
  values(){
    return new SetIterator(this, 'value');
  },
  iterator(){
    return new SetIterator(this, 'value');
  }
});

$__defineDirect(Set.prototype.delete, 'name', 'delete', 0);

$__DefineOwnProperty(Set.prototype, 'size', {
  configurable: true,
  enumerable: false,
  get: function size(){
    if (this === $__SetProto) {
      return 0;
    }
    return $__MapSize(ensureSet(this));
  },
  set: undefined
});

function ensureSet(o, name){
  var type = typeof o;
  if (type === 'object' ? o === null : type !== 'function') {
    throw $__Exception('called_on_non_object', [name]);
  }
  var data = $__GetInternal(o, 'SetData');
  if (!data) {
    throw $__Exception('called_on_incompatible_object', [name]);
  }
  return data;
}

let SET = 'Set',
    KEY  = 'SetNextKey',
    KIND  = 'SetIterationKind';

let K = 0x01,
    V = 0x02,
    KV = 0x03;

let kinds = {
  'key': 1,
  'value': 2,
  'key+value': 3
};


function SetIterator(set, kind){
  set = $__ToObject(set);
  $__SetInternal(this, SET, ensureSet(set));
  $__SetInternal(this, KEY,  $__MapSigil());
  $__SetInternal(this, KIND, kinds[kind]);
  this.next = () => next.call(this);
}

$__defineProps(SetIterator.prototype, {
  next(){
    if (!$__IsObject(this)) {
      throw $__Exception('called_on_non_object', ['SetIterator.prototype.next']);
    }
    if (!$__HasInternal(this, SET) || !$__HasInternal(this, KEY) || !$__HasInternal(this, KIND)) {
      throw $__Exception('called_on_incompatible_object', ['SetIterator.prototype.next']);
    }
    var data = $__GetInternal(this, SET),
        key = $__GetInternal(this, KEY),
        kind = $__GetInternal(this, KIND);

    var item = $__MapNext(data, key);
    $__SetInternal(this, KEY, item[0]);
    return kind === KV ? [item[1], item[1]] : item[1];
  },
  iterator(){
    return this;
  }
});

let next = SetIterator.prototype.next;
}
