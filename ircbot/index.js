var file = require('fs'),
    path = require('path'),
    util = require('util'),
    fs = require('fs'),
    Bot = require('oftn-bot/lib/irc'),
    continuum = require('../continuum'),
    NativeScript = require('../engine/runtime').NativeScript,
    utility = continuum.utility;


var extras = new NativeScript(fs.readFileSync(__dirname+'/extras.js'));

function renderObject(mirror){
  var out = '{ ' + renderProperties(mirror) + ' }';
  return out === '{  }' ? '{}' : out;
}


function renderProperties(mirror){
  var out = '';
  if (mirror.subject.Brand) {
    out += mirror.label();
  }
  return mirror.list(false, false).map(function(prop){
    return prop + ': ' + renderer.render(mirror.get(prop));
  }).join(', ');
}

function renderWithNativeBrand(mirror){
  var props = renderProperties(mirror);
  if (props) props += ' ';
  return '{ [' + mirror.label() +'] ' + props + '}';
}

function renderIndexed(mirror){
  return '['+mirror.list(false, false).map(function(prop){
    if (prop > 0 || prop == 0) {
      return mirror.hasOwn(prop) ? renderer.render(mirror.get(prop)) : '';
    } else {
      return prop+': '+renderer.render(mirror.get(prop));
    }
  }).join(', ')+']';
}


function prepend(func, text){
  return function(mirror){
    return text + func(mirror);
  };
}

function primitiveWrapper(name){
  return function(mirror){
    return name+'('+mirror.label()+')';
  };
}

function standard(mirror){
  return mirror.label()
}

function renderFunction(mirror){
  var out = '[';
  out += mirror.isClass() ? 'Class' : 'Function';
  var name = mirror.getName();
  if (name) {
    out += ' '+name;
  }
  var props = mirror.list(false, false);
  if (props.length) {
    out+=' '+renderProperties(mirror);
  }
  return out + ']';
}

var renderer = new continuum.debug.Renderer({
  //Unknown       : standard,
  //BooleanValue  : standard,
  //StringValue   : standard,
  //NumberValue   : standard,
  //UndefinedValue: standard,
  //NullValue     : standard,
  //Thrown        : renderObject,
  Global        : renderWithNativeBrand,
  Arguments     : prepend(renderIndexed, 'Arguments'),
  Array         : renderIndexed,
  Boolean       : primitiveWrapper('Boolean'),
  //Date          : standard,
  Error         : renderObject,
  Function      : renderFunction,
  JSON          : renderObject,
  Map           : renderObject,
  Math          : renderObject,
  Object        : renderObject,
  Number        : primitiveWrapper('Number'),
  RegExp        : function(mirror){ return mirror.subject.PrimitiveValue+'' },
  Set           : renderObject,
  String        : primitiveWrapper('String'),
  WeakMap       : renderObject
});

var users = {};

function createContext(callback){
  var context;
  function reset(){
    context = continuum();
    context.evaluate(extras, true);
    context.on('reset', function(){
      callback('resetting');
      reset();
    });
    context.on('pause', function(){
      callback('paused');
    });
    context.on('resume', function(){
      callback('resumed');
    });
    context.on('write', function(text, color){
      callback('console: '+require('util').inspect(text));
    });
  }
  reset();
  return function run(code){
    return renderer.render(context.evaluate(code));
  };
}


function execute(context, text, command, code){
  var user = context.sender;
  if (!(user.name in users)) {
    users[user.name] = createContext(function(signal){
      context.channel.send_reply(context.sender, signal);
    });
  }
  var result = users[user.name](code);
  context.channel.send_reply(context.sender, result);
}


function ContinuumBot(profile){
  Bot.call(this, profile);
  this.set_log_level(this.LOG_ALL);
  this.set_trigger('!');
  Bot.prototype.init.call(this);
  this.register_listener(/^((?:es6|vm)>)\w*(.*)+/, execute);
}

utility.inherit(ContinuumBot, Bot);


module.exports = function(){
  return new ContinuumBot([{
    host: 'irc.freenode.net',
    port: 6667,
    nick: 'continuum',
    user: 'continuum',
    real: 'continuum',
    channels: ['#continuum', '##javascript', '#node.js', '#appjs']
  }]);
}
