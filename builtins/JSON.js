var ReplacerFunction,
    PropertyList,
    stack,
    indent,
    gap;

function JO(value){
  var keys = PropertyList || $__Enumerate(value, false, true),
      partial = [],
      colon = gap ? ': ' : ':';

  for (var i=0, len=keys.length; i < len; i++) {
    var prop = Str(keys[i], value);
    if (prop !== undefined) {
      partial.push($__Quote(keys[i]) + colon + prop);
    }
  }

  return partial;
}

function JA(value){
  var partial = [];

  for (var i=0, len = value.length; i < len; i++) {
    var prop = Str(i, value);
    if (prop !== undefined) {
      partial[i] = prop;
    } else {
      partial[i] = 'null';
    }
  }

  return partial;
}


function J(v){
  if (stack.has(v)) {
    throw $__Exception('circular_structure', []);
  }

  var stepback = indent;
  indent += gap;
  stack.add(v);

  var partial, brackets, final;

  if ($__GetNativeBrand(v) === 'Array') {
    partial = JA(v);
    brackets = ['[', ']'];
  } else {
    partial = JO(v);
    brackets = ['{', '}'];
  }

  if (!partial.length) {
    final = '';
  } else if (!gap) {
    final = partial.join(',');
  } else {
    final = '\n' + indent + partial.join(',\n' + indent) + '\n' + stepback;
  }

  stack.delete(v);
  indent = stepback;
  return final;
}


function Str(key, holder){
  var value = holder[key];
  if ($__Type(value) === 'Object') {
    var toJSON = value.toJSON;
    if (typeof toJSON === 'function') {
      value = $__CallFunction(toJSON, value, [key]);
    }
  }

  if (ReplacerFunction) {
    value = $__CallFunction(ReplacerFunction, holder, [key, value]);
  }

  if ($__Type(value) === 'Object') {
    var brand = $__GetNativeBrand(value);
    if (brand === 'Number') {
      value = $__ToNumber(value);
    } else if (brand === 'String') {
      value = $__ToString(value);
    } else if (brand === 'Boolean') {
      value = $__GetPrimitiveValue(value);
    }
  }

  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';


  if (typeof value === 'string') {
    return $__Quote(value);
  }

  if (typeof value === 'number') {
    return value is NaN || value === Infinity || value === -Infinity ? 'null' : '' + value;
  }

  if (typeof value === 'object') {
    return J(value);
  }

  throw value;
}



$__defineProps(global, {
  JSON: $__JSONCreate()
});

$__defineProps(JSON, {
  stringify(value, replacer, space){
    ReplacerFunction = undefined;
    PropertyList = undefined;
    stack = new Set;
    indent = '';

    if ($__Type(replacer) === 'Object') {
      if (typeof replacer === 'function') {
        ReplacerFunction = replacer;
      } else if ($__GetNativeBrand(replacer) === 'Array') {
        let props = new Set;

        for (let v of replacer) {
          var item,
              type = $__Type(v);

          if (type === 'String') {
            item = v;
          } else if (type === 'Number') {
            item = v + '';
          } else if (type === 'Object') {
            let brand = $__GetNativeBrand(v);
            if (brand === 'String' || brand === 'Number') {
              item = $__ToString(v);
            }
          }

          if (item !== undefined) {
            props.add(item);
          }
        }

        PropertyList = [...props];
      }
    }

    if ($__Type(space) === 'Object') {
      space = $__GetPrimitiveValue(space);
    }

    if ($__Type(space) === 'String') {
      gap = $__StringSlice(space, 0, 10);
    } else if ($__Type(space) === 'Number') {
      space |= 0;
      space = space > 10 ? 10 : space < 1 ? 0 : space
      gap = ' '.repeat(space);
    } else {
      gap = '';
    }

    return Str('', { '': value });
  }
});
