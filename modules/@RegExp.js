export function RegExp(pattern, flags){
  if ($__IsConstructCall()) {
    if (pattern === undefined) {
      pattern = '';
    } else if (typeof pattern === 'string') {
    } else if (typeof pattern === 'object' && $__GetNativeBrand(pattern) === 'RegExp') {
      if (flags !== undefined) {
        throw $__Exception('regexp_flags', []);
      }
    } else {
      pattern = $__ToString(pattern);
    }
    return $__RegExpCreate(pattern, flags);
  } else {
    if (flags === undefined && pattern) {
      if (typeof pattern === 'object' && $__GetNativeBrand(pattern) === 'RegExp') {
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
    if ($__GetNativeBrand(this) === 'RegExp') {
      return $__RegExpToString(this);
    } else {
      throw $__Exception('not_generic', ['RegExp.prototype.toString']);
    }
  }
});
