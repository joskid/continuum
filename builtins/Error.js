function Error(message){
  this.message = message;
}
$__setupConstructor(Error, $__ErrorProto);

$__defineProps(Error.prototype, {
  toString(){
    return this.name + ': '+this.message;
  }
});

function EvalError(message){
  this.message = message;
}
$__setupConstructor(EvalError, $__EvalErrorProto);

function RangeError(message){
  this.message = message;
}
$__setupConstructor(RangeError, $__RangeErrorProto);

function ReferenceError(message){
  this.message = message;
}
$__setupConstructor(ReferenceError, $__ReferenceErrorProto);

function SyntaxError(message){
  this.message = message;
}
$__setupConstructor(SyntaxError, $__SyntaxErrorProto);

function TypeError(message){
  this.message = message;
}
$__setupConstructor(TypeError, $__TypeErrorProto);

function URIError(message){
  this.message = message;
}
$__setupConstructor(URIError, $__URIErrorProto);
