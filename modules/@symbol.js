export function Symbol(str){
  var symbol = $__SymbolCreate();
  if (str != null) {
    $__SetInternal(symbol, 'Label', $__ToString(str));
  }
  return symbol;
}

$__setupConstructor(Symbol, $__SymbolProto);

$__defineProps(Symbol.prototype, {
  valueOf(){
    if ($__GetNativeBrand(this) === 'Symbol') {
      return $__GetInternal(this, 'Label');
    } else {
      throw $__Exception('not_generic', ['Symbol.prototype.toString']);
    }
  },
  toString(){
    if ($__GetNativeBrand(this) === 'Symbol') {
      return $__GetInternal(this, 'Label');
    } else {
      throw $__Exception('not_generic', ['Symbol.prototype.toString']);
    }
  }
});

$__DefineOwnProperty(Symbol.prototype, 'constructor', { configurable: false, writable: false });
$__SetExtensible(Symbol.prototype, false);
