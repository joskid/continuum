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
      $__write(text, color);
    },
    clear(){
      $__clear();
    },
    backspace(count){
      $__backspace(count);
    }
  },
  console: {
    log(...values){
      for (var i=0; i < values.length; i++) {
        stdout.write(values[i] + ' ');
      }
      stdout.write('\n');
    }
  }
});
