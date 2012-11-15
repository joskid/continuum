let decodeURI          = $__decodeURI,
    decodeURIComponent = $__decodeURIComponent,
    encodeURI          = $__encodeURI,
    encodeURIComponent = $__encodeURIComponent,
    escape             = $__escape,
    eval               = $__eval,
    parseInt           = $__parseInt,
    parseFloat         = $__parseFloat;

function isFinite(number){
  number = $__ToNumber(number);
  return number === number && number !== Infinity && number !== -Infinity;
}

function isNaN(number){
  number = $__ToNumber(number);
  return number !== number;
}


$__setupFunctions(isFinite, isNaN);


export decodeURI, decodeURIComponent, encodeURI, encodeURIComponent,
       escape, eval, parseInt, parseFloat, isFinite, isNaN;
