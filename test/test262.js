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

var Queue = continuum.utility.Queue;



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
    if (this.strict || this.onlyStrict) {
      source = '"use strict";\n'+source+'true;\n';
    } else {
      source += 'false;\n';
    }
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
  if (this.queue.length >= this.max) return this;
  if (isDirectory(path)) {
    dir(path).forEach(this.enqueue, this);
  } else {
    this.queue.push(path);
  }
  return this;
}

TestSuite.prototype.chapter = function chapter(chapter){
  chapter = chapter.toString().split('.');
  var path = resolve(this.tests, 'ch' + ('00'+ (chapter[0] | 0)).slice(-2));
  if (chapter[1]) {
    path = resolve(path, chapter[0] + '.' + chapter[1]);
  }
  if (chapter[2]) {
    path = resolve(path, chapter[0] + '.' + chapter[1] + '.' + chapter[2]);
  }
  if (exists(path)) {
    this.enqueue(path);
  }
  return this;
};

TestSuite.prototype.next = function next(done){
  var item = this.queue.shift();
  if (item) {
    var test = new TestCase(item, this.strict);

    test.paths = test.path.split('/');

    test.paths.reduce(function(r, s, i, a){
      if (!(s in r)) {
        if (i === a.length - 1) {
          r[s] = test;
        } else {
          r[s] = {};
        }
      }
      return r[s];
    }, this.results);
    var self = this;

    continuum(function(context){
      test.global = context.global;
      context.on('throw', function(e){
        print(e.value.Get('message'))
      });
      context.evaluate(self.includes);
      context.global.properties.forEach(function(prop){
        prop[2] &= ~1;
      });
      var src = test.getSource();
      test.result = context.evaluate(src);
      done.call(self, test);
    });
  }
}

function formatPath(name){
  return name.split(/\/|\\/).slice(3).join('/');
}

TestSuite.prototype.run = function run(count, done){
  var record = __dirname+'/tested.json';
  var tested = fs.existsSync(record) ? require(record) : {};
  if (typeof count === 'function') {
    done = count;
    count = 40;
  }
  if (count-- && this.queue.length) {
    var name = formatPath(path.relative(__dirname, this.queue.front()));
    if (name in tested) {
      this.queue.shift();
      return this.run(++count, done);
    }
    tested[name] = true;

    this.next(function(test){
      var name = test.paths.slice(-1);
      delete test.abspath;
      delete test.path;
      delete test.paths;
      if (test.result === undefined) {
        test.result = 'PASS';
      }
      fs.writeFileSync(__dirname + '/results/'+name+'.js', require('util').inspect(test));
      test.global = null;

      fs.writeFileSync(record, JSON.stringify(test, null, '  '));

      this.run(count, done);
    });
  } else {
    done('done')
  }
}

var x = new TestSuite;

x.chapter('8.2');
x.run(function(result){
  print(x);
});
// print(x.includes);
//print(realm.global);
