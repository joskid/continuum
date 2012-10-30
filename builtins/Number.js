function Number(value){
  value = $__ToNumber(value);
  if ($__isConstructCall()) {
    return $__NumberCreate(value);
  } else {
    return value;
  }
}

$__setupConstructor(Number, $__NumberProto);

$__defineConstants(Number, {
  EPSILON: 2.220446049250313e-16,
  MAX_INTEGER: 9007199254740992,
  MAX_VALUE: 1.7976931348623157e+308,
  MIN_VALUE: 5e-324,
  NaN: NaN,
  NEGATIVE_INFINITY: -Infinity,
  POSITIVE_INFINITY: Infinity
});

$__defineProps(Number, {
  isNaN(number){
    return number !== number;
  },
  isFinite(number){
    return typeof value === 'number'
        && value === value
        && value < Infinity
        && value > -Infinity;
  },
  isInteger(value) {
    return typeof value === 'number'
        && value === value
        && value > -9007199254740992
        && value < 9007199254740992
        && value | 0 === value;
  },
  toInteger(value){
    return (value / 1 || 0) | 0;
  }
});

var isFinite = Number.isFinite;

$__defineProps(Number.prototype, {
  toString(radix){
    if ($__getNativeBrand(this) === 'Number') {
      return $__NumberToString(this, radix);
    } else {
      throw $__exception('not_generic', ['Number.prototype.toString']);
    }
  },
  valueOf(){
    if ($__getNativeBrand(this) === 'Number') {
      return $__getPrimitiveValue(this);
    } else {
      throw $__exception('not_generic', ['Number.prototype.valueOf']);
    }
  },
  clz() {
    var x = $__ToNumber(this);
    if (!x || !isFinite(x)) {
      return 32;
    } else {
      x = x < 0 ? x + 1 | 0 : x | 0;
      x -= (x / 0x100000000 | 0) * 0x100000000;
      return 32 - $__NumberToString(x, 2).length;
    }
  }
});
