function Error(message){
  this.message = message;
}

function EvalError(message){
  this.message = message;
}

function RangeError(message){
  this.message = message;
}

function ReferenceError(message){
  this.message = message;
}

function SyntaxError(message){
  this.message = message;
}

function TypeError(message){
  this.message = message;
}

function URIError(message){
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

export Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError;
