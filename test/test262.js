var fs = require('fs'),
    path = require('path'),
    continuum = require('../continuum'),
    resolve = path.resolve,
    exists = fs.existsSync,
    print = console.log;

var _push = [].push;

function isDirectory(file){
  return fs.statSync(file).isDirectory();
}

function dir(name){
  return fs.readdirSync(name).map(path.resolve.bind(null, name));
}

function read(name){
  return fs.readFileSync(name, 'utf8');
}

function percent(n, t){
  return ((100 * n) / t).toFixed(2);
}

function isInt(n){
  return +n === (n | 0);
}

function escapeJS(source){
  return '"' + source.replace(/\\/g, '\\\\').replace(/(?!=\\)\r?\n/g, '\\n').replace(/"/g, '\\"') + '"';
}

function Queue(){
  this.items = [];
  this.length = 0;
  this.index = 0;
}

Queue.prototype = {
  constructor: Queue,
  push: function push(items){
    if (!(items instanceof Array))
      items = [items];

    _push.apply(this.items, items);
    this.length += items.length;
    return this;
  },
  shift: function shift(){
    if (this.length) {
      var item = this.items[this.index];
      this.items[this.index++] = null;
      this.length--;
      if (this.index === 500) {
        this.items = this.items.slice(this.index);
        this.index = 0;
      }
      return item;
    }
  },
  empty: function empty(){
    this.length = 0;
    this.index = 0;
    this.items = [];
    return this;
  },
  front: function front(){
    return this.items[this.index];
  }
};



var parseTestRecord = (function(){
  var head = /(?:(?:\s*\/\/.*)?\s*\n)*/,
      comment = /\/\*\*?((?:\s|\S)*?)\*\/\s*\n/,
      any = /(?:\s|\S)*/g,
      placeholder = /\{\{(\w+)\}\}/,
      stars = /\s*\n\s*\*\s?/g,
      atattrs = /\s*\n\s*\*\s*@/,
      header = new RegExp('^'+head.source),
      record = new RegExp('^('+head.source+')(?:'+comment.source+')?('+any.source+')$');

  function stripStars(text){
    return text.replace(stars, '\n').trim();
  }

  function stripHeader(src){
    var match = src.match(header);
    return match ? src.slice(match[0].length) : src;
  }

  function parseTestRecord(obj, src, name){
    var match = src.match(record);

    if (!match)
      throw new Error('unrecognized: '+name);

    obj.test = match[3];

    if (match[2]) {
      var texts = match[2].split(atattrs);
      obj.commentary = stripStars(texts.shift());

      texts.forEach(function(text){
        var match = text.match(/^\w+/);

        if (!match)
          throw new Error('Malformed "@" attribute: '+name);

        match = match[0];

        if (match in obj)
          throw new Error('duplicate: '+match);

        obj[match] = stripStars(text.slice(match.length));
      });
    }
  }

  return parseTestRecord;
})();


function TestCase(filename, strict){
  this.abspath = filename;
  this.name = path.basename(filename).slice(0, -3);
  parseTestRecord(this, read(filename), this.name);
}

TestCase.prototype = {
  isNegative: function isNegative(){
    return 'negative' in this.record;
  },
  isOnlyStrict: function isOnlyStrict(){
    return 'onlyStrict' in this.record;
  },
  isNonStrict: function isNonStrict(){
    return 'noStrict' in this.record;
  },
  getSource: function getSource(){
    var source = 'var strict_mode = ';
    source = this.strict ? '"use strict";\n'+source+'true;\n' : source+'false;\n';
    return source + this.test + '\n';
  }
};


function Options(o){
  if (o)
    for (var k in this)
      if (k in o)
        this[k] = o[k];
}

Options.prototype = {
  root: __dirname,
  strictOnly: false,
  nonStrictOnly: false,
  unmarkedDefault: false
};


function TestSuite(options){
  options = new Options(options);
  var root = resolve(options.root, 'test262', 'test');
  this.tests = resolve(root, 'suite');
  this.libs = resolve(root, 'harness');
  this.strictOnly = options.strictOnly;
  this.nonStrictOnly = options.nonStrictOnly;
  this.unmarkedDefault = options.unmarkedDefault;
  this.queue = new Queue;
  this.results = {};

  if (!exists(this.tests)) {
    throw new Error('No test repository found');
  }

  if (!exists(this.libs)) {
    throw new Error('No test library found');
  }

  var includes = ['cth.js', 'sta.js', 'testBuiltInObject.js'].map(function(name){
    return read(resolve(this.libs, name));
  }, this).join('\n\n');

  Object.defineProperty(this, 'includes', {
    get: function(){ return includes }
  });
}


TestSuite.prototype.summary = function summary(progress) {
  print()
  print("=== Summary ===");
  print(" - Ran %d tests", progress.count);
  if (progress.failed === 0) {
    print(" - All tests succeeded");
  } else {
    print(" - Passed %d tests (%d)", progress.succeeded, percent(progress.succeeded, progress.count));
    print(" - Failed %d tests (%d)", progress.failed, percent(progress.failed, progress.count));
  }
};


TestSuite.prototype.enqueue = function enqueue(path){
  if (isDirectory(path)) {
    dir(path).forEach(this.enqueue, this);
  } else {
    this.queue.push(path);
  }
  return this;
}

TestSuite.prototype.chapter = function chapter(chapter){
  if (!isInt(chapter)) {
    var subchapter = ''+chapter;
  }
  chapter = 'ch' + ('00'+ (chapter | 0)).slice(-2);
  var path = resolve(this.tests, chapter);
  if (subchapter) {
    path = resolve(path, subchapter);
  }
  if (exists(path)) {
    this.enqueue(path);
  }
  return this;
};

TestSuite.prototype.next = function next(){
  var item = this.queue.shift();
  if (item) {
    var test = new TestCase(item, this.strict),
        comps = test.path.split('/');

    comps.reduce(function(r, s, i, a){
      if (!(s in r)) {
        if (i === a.length - 1) {
          r[s] = test;
        } else {
          r[s] = {};
        }
      }
      return r[s];
    }, this.results);

    var context = continuum();
    test.global = context.global;
    context.on('throw', function(e){
      print(e.Get('code'), e.Get('message'))
    });
    context.evaluate(this.includes);
    context.global.properties.forEach(function(prop){
      prop[2] &= ~1;
    });
    var src = test.getSource();
    console.log(src)
    test.result = context.evaluate(src);
    //test.result = context.evaluate('runTestCase(function(){ return eval('+escapeJS(test.getSource())+') })');
    return test;
  }
}

TestSuite.prototype.deplete = function deplete(){
  var results = [], result;
  while (result = this.next()) {
    results.push(result);
  }
  return results;
}

var x = new TestSuite;

x.chapter(8.7);
print(x.deplete());
// print(x.includes);
//print(realm.global);
