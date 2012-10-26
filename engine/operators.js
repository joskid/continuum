var operators = (function(exports){
  var ThrowException = require('./errors').ThrowException;

  var SYMBOLS       = require('./constants').SYMBOLS,
      Break         = SYMBOLS.Break,
      Pause         = SYMBOLS.Pause,
      Throw         = SYMBOLS.Throw,
      Empty         = SYMBOLS.Empty,
      Resume        = SYMBOLS.Resume,
      Return        = SYMBOLS.Return,
      Abrupt        = SYMBOLS.Abrupt,
      Native        = SYMBOLS.Native,
      Continue      = SYMBOLS.Continue,
      Reference     = SYMBOLS.Reference,
      Completion    = SYMBOLS.Completion,
      Uninitialized = SYMBOLS.Uninitialized;

  var BOOLEAN   = 'boolean',
      FUNCTION  = 'function',
      NUMBER    = 'number',
      OBJECT    = 'object',
      STRING    = 'string',
      UNDEFINED = 'undefined';




  function HasPrimitiveBase(v){
    var type = typeof v.base;
    return type === STRING || type === NUMBER || type === BOOLEAN;
  }


  // ## GetValue

  function GetValue(v){
    if (v && v.Completion) {
      if (v.Abrupt) {
        return v;
      } else {
        v = v.value;
      }
    }
    if (!v || !v.Reference) {
      return v;
    } else if (v.base === undefined) {
      return ThrowException('non_object_property_load', [v.name, v.base]);
    } else {
      var base = v.base;

      if (HasPrimitiveBase(v)) {
        base = exports.ToObject(base);
      }

      if (base.Get) {
        if ('thisValue' in v) {
          return base.GetP(GetThisValue(v), v.name);
        } else {
          return base.Get(v.name);
        }
      } else if (base.GetBindingValue) {
        return base.GetBindingValue(v.name, v.strict);
      }
    }
  }

  exports.GetValue = GetValue;

  // ## PutValue

  function PutValue(v, w){
    if (v && v.Completion) {
      if (v.Abrupt) {
        return v;
      } else {
        v = v.value;
      }
    }
    if (w && w.Completion) {
      if (w.Abrupt) {
        return w;
      } else {
        w = w.value;
      }
    }
    if (!v) {
      return ThrowException('non_object_property_store', ['undefined', 'undefined']);
    } else if (!v.Reference) {
      return ThrowException('non_object_property_store', [v.name, v.base]);
    } else if (v.base === undefined) {
      if (v.strict) {
        return ThrowException('not_defined', [v.name, v.base]);
      } else {
        return exports.global.Put(v.name, w, false);
      }
    } else {
      var base = v.base;

      if (HasPrimitiveBase(v)) {
        base = exports.ToObject(base);
      }

      if (v.name === '__proto__') {
        if (base.SetPrototype) {
          base.SetPrototype(w);
        } else if (base.bindings && base.bindings.SetPrototype) {
          base.bindings.SetPrototype(w);
        } else {
          console.log(v);
        }
      } else {
        if (base.Get) {
          if ('thisValue' in v) {
            return base.SetP(GetThisValue(v), v.name, w, v.strict);
          } else {
            return base.Put(v.name, w, v.strict);
          }
        } else {
          return base.SetMutableBinding(v.name, w, v.strict);
        }
      }
    }
  }
  exports.PutValue = PutValue;

  // ## GetThisValue

  function GetThisValue(v){
    if (v && v.Completion) {
      if (v.Abrupt) {
        return v;
      } else {
        v = v.value;
      }
    }
    if (!v || !v.Reference) {
      return v;
    }

    if (v.base === undefined) {
      return ThrowException('non_object_property_load', [v.name, v.base]);
    }

    if ('thisValue' in v) {
      return v.thisValue;
    }

    return v.base;
  }
  exports.GetThisValue = GetThisValue;



  // ## ToPrimitive

  function ToPrimitive(argument, hint){
    if (typeof argument === OBJECT) {
      if (argument === null) {
        return argument;
      } else if (argument.Completion) {
        if (argument.Abrupt) {
          return argument;
        }
        return ToPrimitive(argument.value, hint);
      }
      return ToPrimitive(argument.DefaultValue(hint), hint);
    } else {
      return argument;
    }
  }
  exports.ToPrimitive = ToPrimitive;

  // ## ToBoolean

  function ToBoolean(argument){
    if (!argument) {
      return false;
    } else if (typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      } else {
        return !!argument.value;
      }
    } else {
      return !!argument;
    }
  }
  exports.ToBoolean = ToBoolean;

  // ## ToNumber

  function ToNumber(argument){
    if (argument !== null && typeof argument === OBJECT) {
      if (argument.Completion) {
        if (argument.Abrupt) {
          return argument;
        }
        return ToNumber(argument.value);
      }
      return ToNumber(ToPrimitive(argument, 'Number'));
    } else {
      return +argument;
    }
  }
  exports.ToNumber = ToNumber;

  // ## ToInteger

  function ToInteger(argument){
    if (argument && typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      argument = argument.value;
    }
    return ToNumber(argument) | 0;
  }
  exports.ToInteger = ToInteger;

  // ## ToUint32

  function ToUint32(argument){
    if (argument && typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      argument = argument.value;
    }
    return ToNumber(argument) >>> 0;
  }
  exports.ToUint32 = ToUint32;

  // ## ToInt32

  function ToInt32(argument){
    if (argument && typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      argument = argument.value;
    }
    return ToNumber(argument) >> 0;
  }
  exports.ToInt32 = ToInt32;

  // ## ToUint32

  function ToUint32(argument){
    if (argument && typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      argument = argument.value;
    }
    return (ToNumber(argument) >>> 0) % (1 << 16);
  }
  exports.ToUint32 = ToUint32;


  // ## ToPropertyName

  function ToPropertyName(argument){
    if (argument && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      } else {
        argument = argument.value;
      }
    }
    if (argument && typeof argument === OBJECT && argument.NativeBrand === NativePrivateName) {
      return argument;
    } else {
      return ToString(argument);
    }
  }
  exports.ToPropertyName = ToPropertyName;

  // ## ToString

  function ToString(argument){
    switch (typeof argument) {
      case STRING: return argument;
      case UNDEFINED:
      case NUMBER:
      case BOOLEAN: return ''+argument;
      case OBJECT:
        if (argument === null) {
          return 'null';
        } else if (argument.Completion) {
          if (argument.Abrupt) {
            return argument;
          }
          return ToString(argument.value);
        }
        return ToString(ToPrimitive(argument, 'String'));
    }
  }
  exports.ToString = ToString;


  var PRE_INC, POST_INC, PRE_DEC, POST_DEC;
  void function(createChanger){
    exports.PRE_INC = PRE_INC = createChanger(true, 1);
    exports.POST_INC = POST_INC = createChanger(false, 1);
    exports.PRE_DEC = PRE_DEC = createChanger(true, -1);
    exports.POST_DEC = POST_DEC = createChanger(false, -1);
  }(function(pre, change){
    return function(ref) {
      var val = ToNumber(GetValue(ref));
      if (val && val.Abrupt) {
        return val;
      }

      var newVal = val + change,
          result = PutValue(ref, newVal);

      if (result && result.Abrupt) {
        return result;
      }
      return pre ? newVal : val;
    };
  });

  function VOID(ref){
    var val = GetValue(ref);
    if (val && val.Abrupt) {
      return val;
    }
    return undefined;
  }
  exports.VOID = VOID;

  function TYPEOF(val) {
    var type = typeof val;
    switch (type) {
      case UNDEFINED:
      case BOOLEAN:
      case NUMBER:
      case STRING: return type;
      case OBJECT:
        if (val === null) {
          return OBJECT;
        }

        if (val.Completion) {
          if (val.Abrupt) {
            return val;
          } else {
            return TYPEOF(val.value);
          }
        }

        if (val.Reference) {
          if (val.base === undefined) {
            return UNDEFINED;
          }
          return TYPEOF(GetValue(val));
        }

        if ('Call' in val) {
          return FUNCTION;
        } else {
          return OBJECT;
        }
      }
  }
  exports.TYPEOF = TYPEOF;


  function POSITIVE(ref){
    return ToNumber(GetValue(ref));
  }
  exports.POSITIVE = POSITIVE;

  var NEGATIVE, BIT_NOT, NOT;
  void function(createUnaryOp){
    exports.NEGATIVE = NEGATIVE = createUnaryOp(ToNumber, function(n){ return -n });
    exports.BIT_NOT  = BIT_NOT  = createUnaryOp(ToInt32, function(n){ return ~n });
    exports.NOT      = NOT      = createUnaryOp(ToBoolean, function(n){ return !n });
  }(function(convert, finalize){
    return function(ref){
      if (!ref || typeof ref !== OBJECT) {
        return finalize(ref);
      }
      var val = convert(GetValue(ref));

      if (val && val.Completion) {
        if (val.Abrupt) {
          return val;
        } else {
          val = val.value;
        }
      }

      return finalize(val);
    }
  });

  var MUL, DIV, MOD, SUB;
  void function(makeMultiplier){
    exports.MUL = MUL = makeMultiplier(function(l, r){ return l * r });
    exports.DIV = DIV = makeMultiplier(function(l, r){ return l / r });
    exports.MOD = MOD = makeMultiplier(function(l, r){ return l % r });
    exports.SUB = SUB = makeMultiplier(function(l, r){ return l - r });
  }(function(finalize){
    return function(lval, rval) {
      lval = ToNumber(lval);
      if (lval && lval.Completion) {
        if (lval.Abrupt) {
          return lval;
        } else {
          lval = lval.value;
        }
      }
      rval = ToNumber(rval);
      if (rval && rval.Completion) {
        if (rval.Abrupt) {
          return rval;
        } else {
          rval = rval.value;
        }
      }
      return finalize(rval, lval);
    };
  });

  function convertAdd(a, b, type, converter){
    if (typeof a !== type) {
      a = converter(a);
      if (a && a.Completion) {
        if (a.Abrupt) {
          return a;
        } else {
          a = a.value;
        }
      }
    } else if (typeof b !== type) {
      b = converter(b);
      if (b && b.Completion) {
        if (b.Abrupt) {
          return b;
        } else {
          b = b.value;
        }
      }
    }
    return a + b;
  }

  function ADD(rval, lval) {
    lval = ToPrimitive(lval);
    if (lval && lval.Completion) {
      if (lval.Abrupt) {
        return lval;
      } else {
        lval = lval.value;
      }
    }

    rval = ToPrimitive(rval);
    if (rval && rval.Completion) {
      if (rval && rval.Abrupt) {
        return rval;
      } else {
        rval = rval.value;
      }
    }

    if (typeof lval === STRING || typeof rval === STRING) {
      var type = STRING,
          converter = ToString;
    } else {
      var type = NUMBER,
          converter = ToNumber;
    }

    return convertAdd(lval, rval, type, converter);
  }
  exports.ADD = ADD;



  var SHL, SHR, SAR;
  void function(makeShifter){
    exports.SHL = SHL = makeShifter(function(l, r){ return l << r });
    exports.SHR = SHR = makeShifter(function(l, r){ return l >> r });
    exports.SAR = SAR = makeShifter(function(l, r){ return l >>> r });
  }(function(finalize){
    return function(lval, rval) {
      lval = ToInt32(lval);
      if (lval && lval.Completion) {
        if (lval.Abrupt) {
          return lval;
        } else {
          lval = lval.value;
        }
      }
      rval = ToUint32(rval);
      if (rval && rval.Completion) {
        if (rval.Abrupt) {
          return rval;
        } else {
          rval = rval.value;
        }
      }
      return finalize(lval, rval & 0x1F);
    };
  });



  function COMPARE(x, y, left){
    if (left === false) {
      var lval = x,
          rval = y;
    } else {
      var lval = y,
          rval = x;
    }

    lval = ToPrimitive(lval, 'Number');
    if (lval && lval.Completion) {
      if (lval.Abrupt) {
        return lval;
      } else {
        lval = lval.value;
      }
    }

    rval = ToPrimitive(rval, 'Number');
    if (rval && rval.Completion) {
      if (rval.Abrupt) {
        return rval;
      } else {
        rval = rval.value;
      }
    }

    var ltype = typeof lval,
        rtype = typeof rval;

    if (ltype === STRING || rtype === STRING) {
      if (ltype !== STRING) {
        lval = ToString(lval);
        if (lval && lval.Completion) {
          if (lval.Abrupt) {
            return lval;
          } else {
            lval = lval.value;
          }
        }
      } else if (rtype !== STRING) {
        rval = ToString(rval);
        if (rval && rval.Completion) {
          if (rval.Abrupt) {
            return rval;
          } else {
            rval = rval.value;
          }
        }
      }
      if (typeof lval === STRING && typeof rval === STRING) {
        return lval < rval;
      }
    } else {
      if (ltype !== NUMBER) {
        lval = ToNumber(lval);
        if (lval && lval.Completion) {
          if (lval.Abrupt) {
            return lval;
          } else {
            lval = lval.value;
          }
        }
      }
      if (rtype !== NUMBER) {
        rval = ToNumber(rval);
        if (rval && rval.Completion) {
          if (rval.Abrupt) {
            return rval;
          } else {
            rval = rval.value;
          }
        }
      }
      if (typeof lval === NUMBER && typeof rval === NUMBER) {
        return lval < rval;
      }
    }
  }

  var LT, GT, LTE, GTE;
  void function(creatorComparer){
    exports.LT  = LT  = creatorComparer(true, false);
    exports.GT  = GT  = creatorComparer(false, false);
    exports.LTE = LTE = creatorComparer(true, true);
    exports.GTE = GTE = creatorComparer(false, true);
  }(function(reverse, left){
    return function(lval, rval){
      if (reverse) {
        var temp = lval;
        lval = rval;
        rval = temp;
      }

      var result = COMPARE(lval, rval, left);
      if (result && result.Completion) {
        if (result.Abrupt) {
          return result;
        } else {
          result = result.value;
        }
      }

      if (result === undefined) {
        return false;
      } else if (left) {
        return !result;
      } else {
        return result;
      }
    };
  });


  function INSTANCE_OF(lval, rval) {
    if (lval === null || typeof lval !== OBJECT || !('HasInstance' in lval)) {
      return ThrowException('instanceof_function_expected', lval);
    }

    return lval.HasInstance(rval);
  }
  exports.INSTANCE_OF = INSTANCE_OF;


  function DELETE(ref){
    if (!ref || !ref.Reference) {
      return true;
    }

    if (ref.base === undefined) {
      if (ref.strict) {
        return ThrowException('strict_delete_property', [ref.name, ref.base]);
      } else {
        return true;
      }
    }

    if (IsPropertyReference(ref)) {
      if ('thisValue' in ref) {
        return ThrowException('super_delete_property', ref.name);
      } else {
        var obj = exports.ToObject(ref.base)
        if (obj && obj.Completion) {
          if (obj.Abrupt) {
            return obj;
          } else {
            obj = obj.value;
          }
        }

        return obj.Delete(ref.name, ref.strict);
      }
    } else {
      return ref.base.DeleteBinding(ref.name);
    }
  }
  exports.DELETE = DELETE;


  function IN(lval, rval) {
    if (lval === null || typeof lval !== OBJECT) {
      return ThrowException('invalid_in_operator_use', [rval, lval]);
    }

    rval = ToPropertyName(rval);
    if (rval && rval.Completion) {
      if (rval.Abrupt) {
        return rval;
      } else {
        rval = rval.value;
      }
    }

    return lval.HasProperty(rval);
  }
  exports.IN = IN;



  function IS(x, y) {
    if (x && x.Completion) {
      if (x.Abrupt) {
        return x;
      } else {
        x = x.value;
      }
    }
    if (y && y.Completion) {
      if (y.Abrupt) {
        return y;
      } else {
        y = y.value;
      }
    }
    return x === y ? (x !== 0 || 1 / x === 1 / y) : (x !== x && y !== y);
  }
  exports.IS = IS;



  function STRICT_EQUAL(x, y) {
    if (x && x.Completion) {
      if (x.Abrupt) {
        return x;
      } else {
        x = x.value;
      }
    }
    if (y && y.Completion) {
      if (y.Abrupt) {
        return y;
      } else {
        y = y.value;
      }
    }
    return x === y;
  }
  exports.STRICT_EQUAL = STRICT_EQUAL;


  function EQUAL(x, y){
    if (x && x.Completion) {
      if (x.Abrupt) {
        return x;
      } else {
        x = x.value;
      }
    }
    if (y && y.Completion) {
      if (y.Abrupt) {
        return y;
      } else {
        y = y.value;
      }
    }


    var ltype = typeof x,
        rtype = typeof y;

    if (ltype === rtype) {
      return STRICT_EQUAL(x, y);
    } else if (x == null && x == y) {
      return true;
    } else if (ltype === NUMBER && rtype === STRING) {
      return EQUAL(x, ToNumber(y));
    } else if (ltype === STRING && rtype === NUMBER) {
      return EQUAL(ToNumber(x), y);
    } else if (rtype === OBJECT && ltype === STRING || ltype === OBJECT) {
      return EQUAL(x, ToPrimitive(y));
    } else if (ltype === OBJECT && rtype === STRING || rtype === OBJECT) {
      return EQUAL(ToPrimitive(x), y);
    } else {
      return false;
    }
  }
  exports.EQUAL = EQUAL;



  function UnaryOp(operator, val) {
    switch (operator) {
      case 'delete': return DELETE(val);
      case 'void':   return VOID(val);
      case 'typeof': return TYPEOF(val);
      case '+':      return POSITIVE(val);
      case '-':      return NEGATIVE(val);
      case '~':      return BIT_NOT(val);
      case '!':      return NOT(val);
    }
  }
  exports.UnaryOp = UnaryOp;



  function BinaryOp(operator, lval, rval) {
    switch (operator) {
      case 'instanceof': return INSTANCE_OF(lval, rval);
      case 'in':   return IN(lval, rval);
      case 'is':   return IS(lval, rval);
      case 'isnt': return NOT(IS(lval, rval));
      case '==':   return EQUAL(lval, rval);
      case '!=':   return NOT(EQUAL(lval, rval));
      case '===':  return STRICT_EQUAL(lval, rval);
      case '!==':  return NOT(STRICT_EQUAL(lval, rval));
      case '<':    return LT(lval, rval);
      case '>':    return GT(lval, rval);
      case '<=':   return LTE(lval, rval);
      case '>=':   return GTE(lval, rval);
      case '*':    return MUL(lval, rval);
      case '/':    return DIV(lval, rval);
      case '%':    return MOD(lval, rval);
      case '+':    return ADD(lval, rval);
      case '-':    return SUB(lval, rval);
      case '<<':   return SHL(lval, rval);
      case '>>':   return SHR(lval, rval);
      case '>>>':  return SAR(lval, rval);
      case '|':    return BIT_OR(lval, rval);
      case '&':    return BIT_AND(lval, rval);
      case '^':    return BIT_XOR(lval, rval);
    }
  }
  exports.BinaryOp = BinaryOp;


  return exports;
})(typeof module !== 'undefined' ? module.exports : {});
