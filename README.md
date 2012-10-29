# Continuum - A JavaScript Virtual Machine Built in JavaScript

Continuum is a JavaScript virtual machine built in JavaScript. It assembles bytecode from sourcecode and executes it an ES6 runtime environment. The code of the VM is written in ES3 level JavaScript, which means it can run in browsers as old as IE6. (though currently it's only been tested in IE9+ and there's probably some kinks to work out in older IE's).

**ES6 is still an unfinished specification so by ES6 I'm referring to somewhat of a movning target*

# Usage

Documentation coming soon.

For now use the debugger interface at http://benvie.github.com/continuum.

![screenshot](https://raw.github.com/Benvie/continuum/gh-pages/docs/screenshot.png)


# ES6 Implementation Status

### Already Implemented

* destructuring assignment
* destructuring arguments
* spread array initializer
* spread arguments
* spread destructuring
* rest parameters
* classes and super
* `is` and `isnt` operators
* arrow functions
* block scope
* new Math functions
* new Object functions
* new String functions
* concise object literal method syntax
* __proto__ (not as special accessor on Object.prototype yet though)

### Partially Implemented

* Proxy and Reflect
* Map, Set, WeakMap
* Iterators and for..of
* Tail call optimization
* Templates

### Soon
* Comprhensions
* Generators
* Private Names
* Partial implementation of Modules

### Further out
* Proper implementation of Modules
* Binary data api
