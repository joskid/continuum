let decodeURI          = $__decodeURI,
    decodeURIComponent = $__decodeURIComponent,
    encodeURI          = $__encodeURI,
    encodeURIComponent = $__encodeURIComponent,
    escape             = $__escape,
    eval               = $__eval,
    parseInt           = $__parseInt,
    parseFloat         = $__parseFloat;

let isFinite = function isFinite(number){
  number = $__ToNumber(number);
  return number === number && number !== Infinity && number !== -Infinity;
}

let isNaN = function isNaN(number){
  number = $__ToNumber(number);
  return number !== number;
}


$__setupFunction(isFinite);
$__setupFunction(isNaN);


export decodeURI, decodeURIComponent, encodeURI, encodeURIComponent,
       escape, eval, parseInt, parseFloat, isFinite, isNaN;
