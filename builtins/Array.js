function Array(...values){
  if (values.length === 1 && typeof values[0] === 'number') {
    var out = [];
    out.length = values[0];
    return out;
  } else {
    return values;
  }
}

$__setupConstructor(Array, $__ArrayProto);


$__defineProps(Array, {
  isArray(array){
    return $__GetNativeBrand(array) === 'Array';
  },
  from(iterable){
    var out = [];
    iterable = $__ToObject(iterable);

    for (var i = 0, len = iterable.length >>> 0; i < len; i++) {
      if (i in iterable) {
        out[i] = iterable[i];
      }
    }

    return out;
  }
});

$__defineProps(Array.prototype, {
  every(callback, context){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length),
        result = [];

    if (typeof callback !== 'function') {
      throw $__Exception('callback_must_be_callable', ['Array.prototype.every']);
    }

    for (var i = 0; i < len; i++) {
      if (i in array && !$__CallFunction(callback, context, [array[i], i, array])) {
        return false;
      }
    }

    return true;
  },
  filter(callback, context){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length),
        result = [],
        count = 0;

    if (typeof callback !== 'function') {
      throw $__Exception('callback_must_be_callable', ['Array.prototype.filter']);
    }

    for (var i = 0; i < len; i++) {
      if (i in array) {
        var element = array[i];
        if ($__CallFunction(callback, context, [element, i, array])) {
          result[count++] = element;
        }
      }
    }

    return result;
  },
  forEach(callback, context){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length);

    if (typeof callback !== 'function') {
      throw $__Exception('callback_must_be_callable', ['Array.prototype.forEach']);
    }

    for (var i=0; i < len; i++) {
      if (i in array) {
        $__CallFunction(callback, context, [array[i], i, this]);
      }
    }
  },
  indexOf(search, fromIndex){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length);

    if (len === 0) {
      return -1;
    }

    fromIndex = $__ToInteger(fromIndex);
    if (fromIndex > len) {
      return -1;
    }

    for (var i=fromIndex; i < len; i++) {
      if (i in array && array[i] === search) {
        return i;
      }
    }

    return -1;
  },
  items(){
    return new ArrayIterator(this, 'key+value');
  },
  iterator(){
    return new ArrayIterator(this, 'key+value');
  },
  join(separator){
    return joinArray(this, separator);
  },
  keys(){
    return new ArrayIterator(this, 'key');
  },
  lastIndexOf(search, fromIndex){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length);

    if (len === 0) {
      return -1;
    }

    fromIndex = arguments.length > 1 ? $__ToInteger(fromIndex) : len - 1;

    if (fromIndex >= len) {
      fromIndex = len - 1;
    } else if (fromIndex < 0) {
      fromIndex += fromIndex;
    }

    for (var i=fromIndex; i >= 0; i--) {
      if (i in array && array[i] === search) {
        return i;
      }
    }

    return -1;
  },
  map(callback, context){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length),
        result = [];

    if (typeof callback !== 'function') {
      throw $__Exception('callback_must_be_callable', ['Array.prototype.map']);
    }

    for (var i=0; i < len; i++) {
      if (i in array) {
        result[i] = $__CallFunction(callback, context, [array[i], i, this]);
      }
    }
    return result;
  },
  pop(){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length),
        result = array[len - 1];

    array.length = len - 1;
    return result;
  },
  push(...values){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length),
        valuesLen = values.length;

    for (var i=0; i < valuesLen; i++) {
      array[len++] = values[i];
    }
    return len;
  },
  reduce(callback, initial){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length),
        result = [];

    if (typeof callback !== 'function') {
      throw $__Exception('callback_must_be_callable', ['Array.prototype.reduce']);
    }

    var i = 0;
    if (arguments.length === 1) {
      initial = array[0];
      i = 1;
    }

    for (; i < len; i++) {
      if (i in array) {
        initial = $__CallFunction(callback, this, [initial, array[i], array]);
      }
    }
    return initial;
  },
  reduceRight(callback, initial){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length),
        result = [];

    if (typeof callback !== 'function') {
      throw $__Exception('callback_must_be_callable', ['Array.prototype.reduceRight']);
    }

    var i = len - 1;
    if (arguments.length === 1) {
      initial = array[i];
      i--;
    }

    for (; i >= 0; i--) {
      if (i in array) {
        initial = $__CallFunction(callback, this, [initial, array[i], array]);
      }
    }
    return initial;
  },
  slice(start, end){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length),
        result = [];

    start = start === undefined ? 0 : +start || 0;
    end = end === undefined ? len - 1 : +end || 0;

    if (start < 0) {
      start += len;
    }

    if (end < 0) {
      end += len;
    } else if (end >= len) {
      end = len - 1;
    }

    if (start > end || end < start || start === end) {
      return [];
    }

    for (var i=0, count = start - end; i < count; i++) {
      result[i] = array[i + start];
    }

    return result;
  },
  some(callback, context){
    var array = $__ToObject(this),
        len = $__ToUint32(array.length),
        result = [];

    if (typeof callback !== 'function') {
      throw $__Exception('callback_must_be_callable', ['Array.prototype.some']);
    }

    for (var i = 0; i < len; i++) {
      if (i in array && $__CallFunction(callback, context, [array[i], i, array])) {
        return true;
      }
    }

    return false;
  },
  toString(){
    return joinArray(this, ',');
  },
  values(){
    return new ArrayIterator(this, 'value');
  }
});

$__setLength(Array.prototype, {
  every: 1,
  filter: 1,
  forEach: 1,
  indexOf: 1,
  lastIndexOf: 1,
  map: 1,
  reduce: 1,
  reduceRight: 1,
  some: 1,
  reduce: 1
});

function joinArray(array, separator){
  array = $__ToObject(array);

  var result = '',
      len = $__ToUint32(array.length);

  if (len === 0) {
    return result;
  }

  if (arguments.length === 1) {
    separator = ',';
  } else if (typeof separator !== 'string') {
    separator = $__ToString(separator);
  }

  len--;
  for (var i=0; i < len; i++) {
    result += $__ToString(array[i]) + separator;
  }

  return result + $__ToString(array[i]);
}



var ARRAY = 'IteratedObject',
    INDEX  = 'ArrayIteratorNextIndex',
    KIND  = 'ArrayIterationKind';


var K = 0x01,
    V = 0x02,
    S = 0x04;

var kinds = {
  'key': 1,
  'value': 2,
  'key+value': 3,
  'sparse:key': 5,
  'sparse:value': 6,
  'sparse:key+value': 7
};

class ArrayIterator {
  constructor(array, kind){
    array = $__ToObject(array);
    $__SetInternal(this, ARRAY, array);
    $__SetInternal(this, INDEX, 0);
    $__SetInternal(this, KIND, kinds[kind]);
    this.next = () => next.call(this);
  }

  next(){
    if (!$__IsObject(this)) {
      throw $__Exception('called_on_non_object', ['ArrayIterator.prototype.next']);
    }
    if (!$__HasInternal(this, ARRAY) || !$__HasInternal(this, INDEX) || !$__HasInternal(this, KIND)) {
      throw $__Exception('incompatible_array_iterator', ['ArrayIterator.prototype.next']);
    }
    var array = $__GetInternal(this, ARRAY),
        index = $__GetInternal(this, INDEX),
        kind = $__GetInternal(this, KIND),
        len = $__ToUint32(array.length),
        key = $__ToString(index);

    if (kind & S) {
      var found = false;
      while (!found && index < len) {
        found = index in array;
        if (!found) {
          index++;
        }
      }
    }
    if (index >= len) {
      $__SetInternal(this, INDEX, Infinity);
      throw $__StopIteration;
    }
    $__SetInternal(this, INDEX, index + 1);

    if (kind & V) {
      var value = array[key];
      if (kind & K) {
        return [key, value];
      }
      return value;
    }
    return key;
  }

  iterator(){
    return this;
  }
}

$__hideEverything(ArrayIterator);

var next = ArrayIterator.prototype.next;
