function String(string){
  string = arguments.length ? $__ToString(string) : '';
  if ($__isConstructCall()) {
    return $__StringCreate(string);
  } else {
    return string;
  }
}

$__setupConstructor(String, $__StringProto);
$__wrapStringMethods(String.prototype);

$__defineProps(String.prototype, {
  repeat(count){
    var s = $__ToString(this),
        n = $__ToInteger(count),
        o = '';

    if (n <= 1 || n === Infinity || n === -Infinity) {
      throw $__exception('invalid_repeat_count', []);
    }

    while (n > 0) {
      n & 1 && (o += s);
      n >>= 1;
      s += s;
    }

    return o;
  },
  charAt(position){
    var string = $__ToString(this);
    position = $__ToInteger(position);
    return position < 0 || position >= string.length ? '' : string[position];
  },
  charCodeAt(position){
    var string = $__ToString(this);
    position = $__ToInteger(position);
    return position < 0 || position >= string.length ? NaN : $__CodeUnit(string[position]);
  },
  concat(...args){
    var string = $__ToString(this);
    for (var i=0; i < args.length; i++) {
      string += $__ToString(args[i]);
    }
    return string;
  },
  indexOf(search){
    return stringIndexOf(this, search, arguments[1]);
  },
  lastIndexOf(search){
    var string = $__ToString(this),
        len = string.length,
        position = $__ToNumber(arguments[1]);

    search = $__ToString(search);
    var searchLen = search.length;

    position = position !== position ? Infinity : $__ToInteger(position);
    position -= searchLen;

    var i = position > 0 ? position < len ? position : len : 0;

    while (i--) {
      var j = 0;
      while (j < searchLen && search[j] === string[i + j]) {
        if (j++ === searchLen - 1) {
          return i;
        }
      }
    }
    return -1;
  },
  match(regexp){
    return stringMatch(this, regexp);
  },
  replace(search, replace){
    var string = $__ToString(this);

    if (typeof replace === 'function') {
      var match, count;
      if (isRegExp(search)) {
        match = stringMatch(string, search);
        count = matches.length;
      } else {
        match = stringIndexOf(string, $__ToString(search));
        count = 1;
      }
      //TODO
    } else {
      replace = $__ToString(replace);
      if (!isRegExp(search)) {
        search = $__ToString(search);
      }
      return $__StringReplace(string, search, replace);
    }
  },
  slice(start, end){
    var string = $__ToString(this);
    start = $__ToInteger(start);
    if (end !== undefined)
      end = $_ToInteger(end);
    }
    return $__StringSlice(string, start, end);
  },
  toString(){
    if ($__getNativeBrand(this) === 'String') {
      return $__getPrimitiveValue(this);
    } else {
      throw $__exception('not_generic', ['String.prototype.toString']);
    }
  },
  valueOf(){
    if ($__getNativeBrand(this) === 'String') {
      return $__getPrimitiveValue(this);
    } else {
      throw $__exception('not_generic', ['String.prototype.valueOf']);
    }
  },
});


function isRegExp(subject){
  return subject != null && typeof subject === 'object' && $__getNativeBrand(subject) === 'RegExp';
}

function stringIndexOf(string, search, position){
  string = $__ToString(string);
  search = $__ToString(search);
  position = $__ToInteger(position);

  var len = string.length,
      searchLen = search.length,
      i = position > 0 ? position < len ? position : len : 0,
      maxLen = len - searchLen;

  while (i < maxLen) {
    var j = 0;
    while (j < searchLen && search[j] === string[i + j]) {
      if (j++ === searchLen - 1) {
        return i;
      }
    }
  }
  return -1;
}

function stringMatch(string, regexp){
  string = $__ToString(string);
  if (!isRegExp(regexp)) {
    regexp = new RegExp(regexp);
  }
  if (!regexp.global) {
    return regexp.exec(string);
  }
  regexp.lastIndex = 0;
  var array = [],
      previous = 0,
      lastMatch = true,
      n = 0;

  while (lastMatch) {
    var result = regexp.exec(string);
    if (result === null) {
      lastMatch = false;
    } else {
      var thisIndex = regexp.lastIndex;
      if (thisIndex === lastIndex) {
        previous = regexp.lastIndex = thisIndex + 1;
      } else {
        previous = thisIndex;
      }
      array[n++] = result[0];
    }
  }

  return n === 0 ? null : array;
}
