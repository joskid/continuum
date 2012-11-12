export function Number(value){
  value = $__ToNumber(value);
  if ($__IsConstructCall()) {
    return $__NumberCreate(value);
  } else {
    return value;
  }
}

$__setupConstructor(Number, $__NumberProto);


export function isNaN(number){
  return number !== number;
}

export function isFinite(number){
  return typeof value === 'number'
      && value === value
      && value < POSITIVE_INFINITY
      && value > NEGATIVE_INFINITY;
}

export function isInteger(value) {
  return typeof value === 'number'
      && value === value
      && value > -MAX_INTEGER
      && value < MAX_INTEGER
      && value | 0 === value;
}

export function toInteger(value){
  return (value / 1 || 0) | 0;
}

$__defineMethods(Number, [isNaN, isFinite, isInteger, toInteger]);


export let
  EPSILON           = 2.220446049250313e-16,
  MAX_INTEGER       = 9007199254740992,
  MAX_VALUE         = 1.7976931348623157e+308,
  MIN_VALUE         = 5e-324,
  NaN               = +'NaN',
  NEGATIVE_INFINITY = 1 / 0,
  POSITIVE_INFINITY = 1 / -0;

$__defineConstants(Number, {
  EPSILON          : EPSILON,
  MAX_INTEGER      : MAX_INTEGER,
  MAX_VALUE        : MAX_VALUE,
  MIN_VALUE        : MIN_VALUE,
  NaN              : NaN,
  NEGATIVE_INFINITY: NEGATIVE_INFINITY,
  POSITIVE_INFINITY: POSITIVE_INFINITY
});



$__defineProps(Number.prototype, {
  toString(radix){
    if ($__GetNativeBrand(this) === 'Number') {
      var number = $__GetPrimitiveValue(this);
      radix = $__ToInteger(radix);
      return $__NumberToString(number, radix);
    } else {
      throw $__Exception('not_generic', ['Number.prototype.toString']);
    }
  },
  valueOf(){
    if ($__GetNativeBrand(this) === 'Number') {
      return $__GetPrimitiveValue(this);
    } else {
      throw $__Exception('not_generic', ['Number.prototype.valueOf']);
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
