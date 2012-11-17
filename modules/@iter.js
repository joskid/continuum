import hasOwn from '@reflect';

symbol @iterator;
export let iterator = @iterator;
$__iterator = @iterator;
export function Iterator(){}

$__defineDirect(Iterator, 'prototype', Iterator.prototype, 0);
$__defineDirect(Iterator.prototype, @iterator, function iterator(){ return this }, 0);
$__SetNativeBrand(Iterator.prototype, 'NativeIterator');


export function keys(obj){
  return {
    @iterator: ()=> (function*(){
      for (let x in obj) {
        if (hasOwn(obj, x)) {
          yield x;
        }
      }
    })()
  };
}

export function values(obj){
  return {
    @iterator: ()=> (function*(){
      for (let x in obj) {
        if (hasOwn(obj, x)) {
          yield obj[x];
        }
      }
    })()
  };
}

export function items(obj){
  return {
    @iterator: ()=> (function*(){
      for (let x in obj) {
        if (hasOwn(obj, x)) {
          yield [x, obj[x]];
        }
      }
    })()
  };
}

export function allKeys(obj){
  return {
    @iterator: ()=> (function*(){
      for (let x in obj) {
        yield x;
      }
    })()
  };
}

export function allValues(obj){
  return {
    @iterator: ()=> (function*(){
      for (let x in obj) {
        yield obj[x];
      }
    })()
  };
}

export function allItems(obj){
  return {
    @iterator: ()=> (function*(){
      for (let x in obj) {
        yield [x, obj[x]];
      }
    })()
  };
}
