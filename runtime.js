void function(){
  function define(o, v){
    Object.defineProperty(o, v.name, { configurable: true, writable: true, value: v });
  }

  define(Array.prototype, function forEach(callback, context){
    context = context || this;

    for (var i=0; i < this.length; i++) {
      callback.call(context, this[i], i, this);
    }
  });

  define(Array.prototype, function map(callback, context){
    var out = [];

    context = context || this;
    for (var i=0; i < this.length; i++) {
      out.push(callback.call(context, this[i], i, this));
    }

    return out;
  });

  define(Array.prototype, function reduce(callback, start){
    if (arguments.length < 2) {
      var index = 1;
      start = this[0];
    } else {
      var index = 0;
    }
    for (; index < this.length; index++) {
      start = callback.call(this, start, this[index], index, this);
    }
    return start;
  });

  define(Array.prototype, function map(callback, context){
    var out = [];

    context = context || this;
    for (var i=0; i < this.length; i++) {
      out.push(callback.call(context, this[i], i, this));
    }

    return out;
  });


  define(Array.prototype, function filter(callback){
    var out = [];
    for (var i=0; i < this.length; i++) {
      if (callback.call(this, this[i], i)) {
        out.push(this[i]);
      }
    }
  });

  define(Array.prototype, function iterator(){
    return new ArrayIterator(this);
  });

  function ArrayIterator(array){
    var index=0;
    this.next = function(){
      if (index < array.length)
        return array[index++]
      else
        throw StopIteration;
    };

    return this
  }
  ArrayIterator.prototype = new Iterator;
}();

  //['filter', 'every', 'some', 'sort', 'reduceRight']
