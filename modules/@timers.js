let clearInterval = function clearInterval(id){
  id = $__ToInteger(id);
  $__ClearTimer(id);
}

let clearTimeout = function clearTimeout(id){
  id = $__ToInteger(id);
  $__ClearTimer(id);
}

let setInterval = function setInterval(callback, milliseconds){
  milliseconds = $__ToInteger(milliseconds);
  if (typeof callback !== 'function') {
    callback = $__ToString(callback);
  }
  return $__SetTimer(callback, milliseconds, true);
}

let setTimeout = function setTimeout(callback, milliseconds){
  milliseconds = $__ToInteger(milliseconds);
  if (typeof callback !== 'function') {
    callback = $__ToString(callback);
  }
  return $__SetTimer(callback, milliseconds, false);
}

export clearInterval, clearTimeout, setInterval, setTimeout;
