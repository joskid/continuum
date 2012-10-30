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
    return $__getNativeBrand(array) === 'Array';
  },
  from(iterable){
    var out = [];
    iterable = Object(iterable);

    for (var i = 0, len = iterable.length >>> 0; i < len; i++) {
      if (i in iterable) {
        out[i] = iterable[i];
      }
    }

    return out;
  }
});

$__defineProps(Array.prototype, {
  filter(callback){
    if (this == null) {
      throw $__exception('called_on_null_or_undefined', ['Array.prototype.filter']);
    }

    var array = $__ToObject(this),
        length = $__ToUint32(this.length);

    var receiver = this;

    if (typeof receiver !== 'object') {
      receiver = $__ToObject(receiver);
    }

    var result = [],
        count = 0;

    for (var i = 0; i < length; i++) {
      if (i in array) {
        var element = array[i];
        if ($__callFunction(callback, receiver, [element, i, array])) {
          result[count++] = element;
        }
      }
    }

    return result;
  },
  forEach(callback, context){
    var len = this.length;
    if (arguments.length === 1) {
      context = this;
    } else {
      context = $__ToObject(this);
    }
    for (var i=0; i < len; i++) {
      callback.call(context, this[i], i, this);
    }
  },
  map(callback, context){
    var out = [];
    var len = this.length;
    if (arguments.length === 1) {
      context = this;
    } else {
      context = Object(this);
    }
    for (var i=0; i < len; i++) {
      out.push(callback.call(context, this[i], i, this));
    }
    return out;
  },
  reduce(callback, initial){
    var index = 0;
    if (arguments.length === 1) {
      initial = this[0];
      index++;
    }
    for (; index < this.length; i++) {
      if (i in this) {
        initial = callback.call(this, initial, this[o], this);
      }
    }
    return initial;
  },
  join(separator){
    var out = '', len = this.length;

    if (len === 0) {
      return out;
    }

    if (arguments.length === 0) {
      separator = ',';
    } else if (typeof separator !== 'string') {
      separator = $__ToString(separator);
    }

    len--;
    for (var i=0; i < len; i++) {
      out += this[i] + separator;
    }

    return out + this[i];
  },
  push(...values){
    var len = this.length,
        valuesLen = values.length;

    for (var i=0; i < valuesLen; i++) {
      this[len++] = values[i];
    }
    return len;
  },
  pop(){
    var out = this[this.length - 1];
    this.length--;
    return out;
  },
  slice(start, end){
    var out = [], len;

    start = start === undefined ? 0 : +start || 0;
    end = end === undefined ? this.length - 1 : +end || 0;

    if (start < 0) {
      start += this.length;
    }

    if (end < 0) {
      end += this.length;
    } else if (end >= this.length) {
      end = this.length - 1;
    }

    if (start > end || end < start || start === end) {
      return [];
    }

    len = start - end;
    for (var i=0; i < len; i++) {
      out[i] = this[i + start];
    }

    return out;
  },
  toString(){
    return this.join(',');
  }
});
