var file = require('fs'),
    path = require('path'),
    util = require('util'),
    fs = require('fs'),
    Bot = require('oftn-bot/lib/irc'),
    continuum = require('../continuum'),
    NativeScript = require('../engine/runtime').NativeScript,
    utility = continuum.utility;


var extras = new NativeScript(fs.readFileSync(__dirname+'/extras.js'));


var colors = exports.colors = {
  white    : '\x0300',
  black    : '\x0301',
  navy     : '\x0302',
  green    : '\x0303',
  red      : '\x0304',
  brown    : '\x0305',
  violet   : '\x0306',
  olive    : '\x0307',
  yellow   : '\x0308',
  lime     : '\x0309',
  teal     : '\x0310',
  cyan     : '\x0311',
  blue     : '\x0312',
  fuchsia  : '\x0313',
  gray     : '\x0314',
  silver   : '\x0315',
  reset    : '\x03',
  normal   : '\x00',
  underline: '\x1F',
  bold     : '\x02',
  italic   : '\x16'
};


function color(name, text, reset) {
    reset in colors || (reset = 'reset');
    name in colors || (name = 'white');
    return colors[name] + text + colors[reset];
};





function renderObject(mirror){
  var out = color('gray', '{ ') + renderProperties(mirror) + color('gray', ' }');
  return out === '{  }' ? '{}' : out;
}


function renderProperties(mirror){
  var out = '';
  if (mirror.subject.Brand) {
    out += mirror.label();
  }
  return mirror.list(false, false).map(function(prop){
    return color('white', prop) + ': ' + renderer.render(mirror.get(prop));
  }).join(', ');
}

function renderWithNativeBrand(mirror){
  var props = renderProperties(mirror);
  if (props) props += ' ';
  return  color('gray', '{') + color('olive', '[' + mirror.label() +'] ') + props + color('gray', '}');
}

function renderIndexed(mirror){
  return color('gray', '[')+mirror.list(false, false).map(function(prop){
    if (prop > 0 || prop == 0) {
      return mirror.hasOwn(prop) ? renderer.render(mirror.get(prop)) : '';
    } else {
      return color('white', prop)+': '+renderer.render(mirror.get(prop));
    }
  }).join(', ')+color('gray', ']');
}


function prepend(func, text){
  return function(mirror){
    return text + func(mirror);
  };
}

function primitiveWrapper(name){
  return function(mirror){
    return color('cyan', name+'('+mirror.label()+')');
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
  out = color('teal', out);
  var props = mirror.list(false, false);
  if (props.length) {
    out+=' '+renderProperties(mirror);
  }
  return out + color('teal', ']');
}

var renderer = new continuum.debug.Renderer({
  //Unknown       : standard,
  //BooleanValue  : standard,
  //StringValue   : standard,
  //NumberValue   : standard,
  //UndefinedValue: standard,
  //NullValue     : standard,
  Thrown        : function(mirror){ color('red', renderer.render()) },
  Global        : renderWithNativeBrand,
  Arguments     : prepend(renderIndexed, color('yellow', 'Arguments ')),
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
      callback(color('fuchsia', 'resetting'));
      reset();
    });
    context.on('pause', function(){
      callback(color('fuchsia', 'paused'));
    });
    context.on('resume', function(){
      callback(color('fuchsia', 'resumed'));
    });
    context.on('write', function(args){
      var text = args[0];
      if (args[1] in colors) {
        text = color(args[1], args[0]);
      }
      callback('console: '+text);
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
