# Continuum - A JavaScript Virtual Machine Built in JavaScript

Continuum is a JavaScript virtual machine built in JavaScript. It assembles bytecode from sourcecode and executes it an ES6 runtime environment. The code of the VM is written in ES3 level JavaScript, which means it can run in browsers as old as IE6. (though currently it's only been tested in IE9+ and there's probably some kinks to work out in older IE's).

*ES6 is still an unfinished specification and is still a moving target*

# Usage

Documentation coming soon.

For now use the debugger interface at http://benvie.github.com/continuum.

![screenshot](https://raw.github.com/Benvie/continuum/gh-pages/docs/screenshot.png)

# Compatibility
Continuum probably works in every modern engine, but has not been tested.

Currently known to work in:

* IE8+
* Chrome 23+
* Firefox 15+
* Opera 12+

Will soon work in:

* IE6-7

# ES6 Implementation Status

### Already Implemented

* destructuring assignment and arguments
* spread in arguments and array initializers
* rest parameters
* classes and super
* arrow functions
* block scope
* new Math functions
* new Object functions
* new String functions
* concise methods in object literals
* mutable and deletable __proto__
* Map, Set, and WeakMap (garbage collection semantics not fully realized)
* Iterators and for...of
* Templates
* Module system with imports and exports
* builtin '@std' modules `module std = '@std'` or `import call from '@Function'`
* Generators (kind of broken at the moment though)

### Partially Implemented
* Proxy and Reflect

### Soon
* Array Comprehensions
* Private Names
* Default parameters
* Tail call optimization

### Further out
* Binary data api


# TODO
* Hook up module system to environment
* Much work on optimizations
* Serializable state for saving applications while they run
* Expanded debugger and eventually full dev environment built around continuum
* Move more runtime semantics to bytecode
* Bootstrap the runtime on an even simpler bytecode interpreter
