export function log(...values){
  var text = '';
  for (var i=0; i < values.length; i++) {
    text += $__ToString(values[i]);
  }
  $__Signal('write', [text + '\n', '#fff']);
}


export function dir(object){

}

let timers = $__ObjectCreate(null);

export function time(name){
  timers[name] = Date.now();
}

export function timeEnd(name){
  if (name in timers) {
    var duration = Date.now() - timers[name];
    log(name + ': ' + duration + 'ms');
  }
}


export let stdout = {
  write(text, color){
    $__Signal('write', [text, color]);
  },
  clear(){
    $__Signal('clear');
  },
  backspace(count){
    $__Signal('backspace', $_ToInteger(count));
  }
};


$__setupFunction(log);
$__setupFunction(dir);
$__setupFunction(time);
$__setupFunction(timeEnd);
$__setupFunction(write);
$__setupFunction(clear);
$__setupFunction(backspace);
