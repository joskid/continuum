$__defineProps(global, {
  Math: $__MathCreate(),
  JSON: $__JSONCreate(),
  parseInt: $__parseInt,
  parseFloat: $__parseFloat,
  decodeURI: $__decodeURI,
  encodeURI: $__encodeURI,
  decodeURIComponent: $__decodeURIComponent,
  encodeURIComponent: $__encodeURIComponent,
  escape: $__escape,
  eval: $__eval,
  isNaN(number){
    number = $__ToNumber(number);
    return number !== number;
  },
  isFinite(number){
    number = $__ToNumber(number);
    return number === number && number !== Infinity && number !== -Infinity;
  }
});

$__defineProps(global, {
  stdout: {
    write(text, color){
      $__Signal('write', [text, color]);
    },
    clear(){
      $__Signal('clear');
    },
    backspace(count){
      $__Signal('backspace', $_ToInteger(count));
    }
  },
  console: {
    log(...values){
      var text = '';
      for (var i=0; i < values.length; i++) {
        text += $__ToString(values[i]);
      }
      $__Signal('write', [text, '#fff']);
    }
  }
});
