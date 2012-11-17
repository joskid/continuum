import Symbol from '@symbol';
import hasOwn from '@reflect';

export let _iterator = new Symbol('iterator');

export function Iterator(){}

$__setupConstructor(Iterator, $__IteratorProto);

$__DefineOwnProperty(Iterator.prototype, {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function iterator(){
    return this;
  }
});


export function keys(obj){
  return {
    iterator: ()=> (function*(){
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
    iterator: ()=> (function*(){
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
    iterator: ()=> (function*(){
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
    iterator: ()=> (function*(){
      for (let x in obj) {
        yield x;
      }
    })()
  };
}

export function allValues(obj){
  return {
    iterator: ()=> (function*(){
      for (let x in obj) {
        yield obj[x];
      }
    })()
  };
}

export function allItems(obj){
  return {
    iterator: ()=> (function*(){
      for (let x in obj) {
        yield [x, obj[x]];
      }
    })()
  };
}
