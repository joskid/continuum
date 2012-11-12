export function Error(message){
  this.message = message;
}

export function EvalError(message){
  this.message = message;
}

export function RangeError(message){
  this.message = message;
}

export function ReferenceError(message){
  this.message = message;
}

export function SyntaxError(message){
  this.message = message;
}

export function TypeError(message){
  this.message = message;
}

export function URIError(message){
  this.message = message;
}


$__defineProps(Error.prototype, {
  toString(){
    return this.name + ': '+this.message;
  }
});

$__setupConstructor(Error, $__ErrorProto);
$__setupConstructor(EvalError, $__EvalErrorProto);
$__setupConstructor(RangeError, $__RangeErrorProto);
$__setupConstructor(ReferenceError, $__ReferenceErrorProto);
$__setupConstructor(SyntaxError, $__SyntaxErrorProto);
$__setupConstructor(TypeError, $__TypeErrorProto);
$__setupConstructor(URIError, $__URIErrorProto);
