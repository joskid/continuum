function RegExp(pattern, flags){
  if ($__isConstructCall()) {
    if (pattern === undefined) {
      pattern = '';
    } else if (typeof pattern === 'string') {
    } else if (typeof pattern === 'object' && $__getNativeBrand(pattern) === 'RegExp') {
      if (flags !== undefined) {
        throw $__exception('regexp_flags', []);
      }
    } else {
      pattern = $__ToString(pattern);
    }
    return $__RegExpCreate(pattern, flags);
  } else {
    if (flags === undefined && pattern) {
      if (typeof pattern === 'object' && $__getNativeBrand(pattern) === 'RegExp') {
        return pattern;
      }
    }
    return $__RegExpCreate(pattern, flags);
  }
}

$__setupConstructor(RegExp, $__RegExpProto);
$__wrapRegExpMethods(RegExp.prototype);

$__defineProps(RegExp.prototype, {
  toString(){
    if ($__getNativeBrand(this) === 'RegExp') {
      return $__RegExpToString(this);
    } else {
      throw $__exception('not_generic', ['RegExp.prototype.toString']);
    }
  }
});
