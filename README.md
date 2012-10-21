# Continuum - A JavaScript Virtual Machine Built in JavaScript

Continuum is a JavaScript meta-interpeter that uses a bytecode virtual machine to host an ES6 ECMAScript runtime in ES3 and ES5 browsers and other JS engines (yes, ES6 in IE6 and 7). It is still a work in progress but it is fully usable right now.


# Usage

As I said, still a work in progress. The easiest way to see it in action is to load up the __continuum-combined.js__ file which will bestow a `continuum` object globally. (or load this module in Node.js)

```javascript
// when you create a new context, it will bootstrap in the builtin globals by executing the script

var realm = continuum.create(); // returns a Realm object which contains the global object and everything else
realm.eval('Object.getOwnPropertyNames(this)');
  { properties:
    { 'NaN', 'Infinity', 'undefined', 'console', 'Array', 'Boolean', 'Date', 'Function', 'Number',
      'Object', 'RegExp', 'String', 'parseInt', 'parseFloat', 'decodeURI', 'encodeURI',
      'decodeURIComponent', 'encodeURIComponent', 'escape', 'isNaN', 'isFinite', length: 21 } }

realm.eval('class Rect { constructor(...args){ [this.x, this.y, this.w, this.h] = args } }')
realm.eval('new Rect(25, 50, 200, 500)');

{ properties: { x: 25, y: 50, w: 200, h: 500 } }

```
