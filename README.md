# Continuum - A JavaScript Virtual Machine Built in JavaScript

Continuum is a JavaScript virtual machine built in JavaScript. It assembles bytecode from sourcecode and executes it an ES6 runtime environment. The code of the VM is written in ES3 level JavaScript, which means it can run in browsers as old as IE6. (though currently it's only been tested in IE9+ and there's probably some kinks to work out in older IE's).

*ES6 is still an unfinished specification and is still a moving target*

# Compatibility
Continuum probably works in every modern engine, but has not been tested.

Currently known to work in:

* IE8+
* Chrome 23+
* Firefox 15+
* Opera 12+

Will soon work in:

* IE6-7

![screenshot](https://raw.github.com/Benvie/continuum/gh-pages/docs/screenshot.png)

# Installation
In the browser, use the combined continuum.js or continuum.min.js. In node

    npm install continuum


# Quickstart Usage Overview
In the browser, an object named `continuum` is added to the window, or in node it's the object returned by `require('contiinuum')`.

Usage of continuum is quite simple and can basically be treated like using `eval` or node's `vm.runInContext`. Supply the code, get the result. In ES6 language, a "realm" is basically the container for a context. A realm has a 'global' property which is its global object, and a number of properties that specific to each realm isntance, such as the list of "intrinsics" or builtins like Array, Function, Object, etc.

```javascript
var realm = continuum.createRealm();

var $array = realm.evaluate('[5, 10, 15, 20]');

// you can use the ES internal functions to directly interact with objects
console.log($array.Get(0)) // 5
console.log($array.Get('map')) // $Function object

// these two lines have the same result
var $Function = realm.evaluate('Function');
var $Function = realm.global.Get('Function');

// if your code uses the module system then it must be run asynchronously
realm.evaluateAsync('module F = "@Function"', function(result){
  // statements and declarations have no return value so result is undefined in this case, however...
  console.log(realm.evaluate('F')) // $Module with Function, call, apply, and bind (functional versions)
})
```

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


# API Overview
Core API:

* __createRealm([callback])__: creates a new realm (context + global object). Optional debug callback for massive information
* __createBytecode(code|filename)__: Creates bytecode from the given source and returns it unexecuted (this will be serializable to disk soon).
* __createRenderer(handlers)__: For debug rendering, like the debugger UI.
* __createNativeFunction(func)__: Wraps a regular function as a function object that can be used inside the virtual
* __introspect($object)__: return a debug Mirror object that wraps any type of VM object, primitive, or scope object. This provides an easy to use and normalized interface for querying information about objects.

Extras:

* __utility__: substantial amount of useful functionality used in continuum and generally useful in any JS
* __constants__: all of the large amount of constants and symbols used by the VM

Additionally exported is the class objects `Assembler`, `Realm`, `Renderer`, and `Script`.

## Realm ##
A Realm is the main thing you interact with. Each realm has a global object with a unique set of builtin globals. A realm is roughly equivelent to an iframe or a node vm context.

* __realm.evaluate(code)__: Executes code in the virtual machine and returns the completion value, if any. "code" can be a string or an already compiled Script object. Every time code is executed, the script object is added to realm.scripts, so you can reuse a script if desired.
* __realm.evaluateAsync(code, callback)__: Primarily for when executing code that uses the module system, which must be run asynchronously if importing remote resources.


__VM Events__
These are emitted by the VM to indicate changes to the state of execution and provide access to information about related objects.

* __realm.on('complete', function(result){})__: emitted whenever a script completes execution. The result value is the same value that's returned from realm.evaluate.
* __realm.on('executing', function(thunk){})__: emitted whenever execution begins or resume. The thunk is the object which executes the bytecode.
* __realm.on('throw', function(exception){})__: throw is emitted on uncaught exception. The thrown object (usually an $Error) will be passed to the callback.
* __realm.on('pause', function(resume){})__: pause is emitter when a `debugger` statement is encountered. A function which will resume execution is passed to the callback, and is also available as `realm.resume`.
* __realm.on('resume', function(){})__: emitted when the resume function provided from the __pause__ event is called and execution begins again.
* __realm.on('op', function(op){})__: emitted every time an opcode is executed. Be very careful when listening to this event. A small to medium sized chunk of code can emit hundreds of thousands or millions of ops in a very short amount of time.

__API Events__
These are emitted by functions from inside the VM to simulate things like input/output and require some implementation on your part to do anything useful.

* __realm.on('write', function(text, color){})__: emitted by __stdout.write__, which is used by __console.log__ and friends.
* __realm.on('clear', function(){})__: emitted by __stdout.clear__ to provide a way to clear whatever it is you're providing as stdout
* __realm.on('backspace', function(number){})__: emitted by __stdout.backspace__ to provide a way to delete a specific amount of characters from the end.

## Renderer ##
A renderer is a visitor used to introspect VM objects and values.

## Assembler ##
An assembler is used to convert AST into bytecode and static script information.

## Script ##
A script contains all the bits related to a given chunk of source. The given options, sourcecode string, AST, bytecode, and the thunk (lazily created upon first execution). Scripts don't contain realm-specific information, so they are portable between realms/globals and can be executed multiple times as needed.

# TODO
* Hook up module system to environment
* Much work on optimizations
* Serializable state for saving applications while they run
* Expanded debugger and eventually full dev environment built around continuum
* Move more runtime semantics to bytecode
* Bootstrap the runtime on an even simpler bytecode interpreter
