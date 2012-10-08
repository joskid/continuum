
function ScopePromise(resolver){
  this.resolver = resolver;
}

define(ScopePromise, [
  function resolve(scope){
    return this.resolver(scope);
  }
]);

function ExceptionPromise(type, message){
  this.type = type;
  this.message = message;
}

ExceptionPromise.prototype = new ScopePromise(function(scope){
  var exception = create(scope[this.type].prototype);
  return define(exception, 'message', this.message);
});


function EnvironmentRecord(){
  throwAbstractInvocationError('EnvironmentRecord');
}

define(EnvironmentRecord.prototype, [
  function has(name){
    throwAbstractInvocationError('EnvironmentRecord.prototype.has');
  },
  function create(name, deletable){
    throwAbstractInvocationError('EnvironmentRecord.prototype.create');
  },
  function set(name, value, throwOnFail){
    throwAbstractInvocationError('EnvironmentRecord.prototype.set');
  },
  function get(name, throwIfMissing){
    throwAbstractInvocationError('EnvironmentRecord.prototype.get');
  },
  function remove(name){
    throwAbstractInvocationError('EnvironmentRecord.prototype.remove');
  },
  function createVar(name, deletable){
    throwAbstractInvocationError('EnvironmentRecord.prototype.createVar');
  },
  function hasThis(){
    throwAbstractInvocationError('EnvironmentRecord.prototype.hasThis');
  },
  function hasSuper(){
    throwAbstractInvocationError('EnvironmentRecord.prototype.hasSuper');
  }
]);


function DeclarativeEnvironmentRecord(){
  this.record = create(null);
  this.deletable = create(null);
  this.immutables = create(null);
}

inherit(DeclarativeEnvironmentRecord, EnvironmentRecord, {
  thisBinding: false,
  superBinding: false,
  withBase: undefined
}, [
  function has(name){
    return name in this.record;
  },
  function create(name, deletable){
    this.record[name] = undefined;
    this.deletable[name] = !!deletable;
    return NORMAL;
  },
  function get(name, throwOnFail){
    if (this.record[name] !== UNINITIALIZED) {
      return this.record[name];
    } else if (throwOnFail) {
      return new ExceptionPromise('ReferenceError', 'getting uninitialized binding "'+name+'"');
    }
  },
  function set(name, value, throwOnFail){
    if (this.record[name] !== UNINITIALIZED) {
      if (name in this.immutables) {
        if (throwOnFail)
          return new ExceptionPromise('TypeError', 'setting immutable binding "'+name+'"');
      } else {
        this.record[name] = value;
      }
    } else {
      return new ExceptionPromise('ReferenceError', 'setting uninitialized binding "'+name+'"');
    }
    return NORMAL;
  },
  function remove(name){
    if (!(name in this.record))
      return true;
    if (!(name in this.deletable))
      return false;
    delete this.record[name];
    delete this.deletable[name];
    return true;
  },
  function createVar(name, deletable){
    return this.create(name, deletable);
  },
  function createImmutable(name){
    this.record[name] = UNINITIALIZED;
    this.immutables[name] = true;
  },
  function initialize(name, value){
    this.record[name] = value;
  }
])



function ObjectEnvironmentRecord(object){
  this.record = object;
}

inherit(ObjectEnvironmentRecord, EnvironmentRecord, {
  thisBinding: false,
  superBinding: false,
  withBase: undefined
}, [
  function has(name){
    return name in this.record;
  },
  function create(name, deletable){
    defineProperty(this.record, name, {
      value: undefined,
      configurable: !!deletable,
      enumerable: true,
      writable: true
    });
    return NORMAL;
  },
  function get(name, throwOnFail){
    if (name in this.record)
      return this.record[name];

    if (throwOnFail)
      return new ExceptionPromise('ReferenceError', 'getting undeclared binding "'+name+'"');
  },
  function set(name, value, throwOnFail){
    this.record[name] = value;
    return NORMAL;
  },
  function remove(name){
    return delete this.record[name];
  },
  function createVar(name, deletable){
    return this.create(name, deletable);
  },
])


function MethodEnvironmentRecord(receiver, home, name){
  this.record = create(null);
  this.deletable = create(null);
  this.immutables = create(null);
  this.receiver = receiver;
  this.home = home;
  this.name = name;
}

inherit(MethodEnvironmentRecord, DeclarativeEnvironmentRecord, []);


function IdentifierReference(env, name, strict){
  this.env = env === null ? undefined : env;
  this.name = name;
  this.strict = !!strict;
}
