export function clearInterval(id){
  id = $__ToInteger(id);
  $__ClearTimer(id);
}

export function clearTimeout(id){
  id = $__ToInteger(id);
  $__ClearTimer(id);
}

export function setInterval(callback, milliseconds){
  milliseconds = $__ToInteger(milliseconds);
  if (typeof callback !== 'function') {
    callback = $__ToString(callback);
  }
  return $__SetTimer(callback, milliseconds, true);
}

export function setTimeout(callback, milliseconds){
  milliseconds = $__ToInteger(milliseconds);
  if (typeof callback !== 'function') {
    callback = $__ToString(callback);
  }
  return $__SetTimer(callback, milliseconds, false);
}

$__setupFunctions(clearInterval, clearTimeout, setInterval, setTimeout);
