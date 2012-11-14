var fs = require('fs'),
    path = require('path'),
    continuum = require('../continuum'),
    resolve = path.resolve,
    exists = fs.existsSync,
    print = console.log,
    define = continuum.utility.define,
    iterate = continuum.utility.iterate,
    map = continuum.utility.map,
    Queue = continuum.utility.Queue,
    createNativeFunction = continuum.createNativeFunction;

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

function write(name, value){
  fs.writeFileSync(name, value);
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

function formatPath(name){
  return name.split(/\/|\\/).slice(3).join('/');
}

function stringify(o){
  return require('util').inspect(o);
}

function toObject(o){
  if (o && o.Enumerate) {
    var out = {};
    var keys = o.Enumerate(false, true);
    for (var i=0; i < keys.length; i++) {
      var item = out[keys[i]] = o.Get(keys[i]);
      if (item && item.Enumerate) {
        out[keys[i]] = toObject(item);
      }
    }
    return out;
  }
  return o;
}

var TestCase = (function(){
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

    if (!match) {
      throw new Error('unrecognized: '+name);
    }

    obj.test = match[3];

    if (match[2]) {
      var texts = match[2].split(atattrs);
      obj.commentary = stripStars(texts.shift());

      texts.forEach(function(text){
        var match = text.match(/^\w+/);

        if (!match) {
          throw new Error('Malformed "@" attribute: '+name);
        }

        match = match[0];

        if (match in obj) {
          throw new Error('duplicate: '+match);
        }

        obj[match] = stripStars(text.slice(match.length));
      });
    }
  }

  function TestCase(filename, strict){
    this.abspath = filename;
    this.name = path.basename(filename).slice(0, -3);
    parseTestRecord(this, read(filename), this.name);
  }

  define(TestCase.prototype, [
    function isNegative(){
      return 'negative' in this.record;
    },
    function isOnlyStrict(){
      return 'onlyStrict' in this.record;
    },
    function isNonStrict(){
      return 'noStrict' in this.record;
    },
    function getSource(){
      var source = 'var strict_mode = ';
      if (this.strict || this.onlyStrict) {
        source = '"use strict";\n'+source+'true;\n';
      } else {
        source += 'false;\n';
      }
      return source + this.test + '\n';
    }
  ]);

  return TestCase;
})();

function TestRunner(suite, before, after) {
  var self = this;

  this.cache = create(null);
  this.suite = suite;

  define(this, {
    executeBefore: before || '',
    executeAfter: after || ''
  });


  this.testFinished = function testFinished(){
    var current = self.current,
        result = current.Get('result'),
        error = current.Get('error');

    if (result === undefined) {
      current.Put('result', 'fail');
      current.Put('error', 'Failed to load test case (probable parse error).');
      current.Put('description', 'Failed to load test case!');
    } else if (error !== undefined) {
      var msg = error.ConstructorName === 'Test262Error' ? '' : error.Get('name') + ": ";
      msg += error.Get('message');
      current.Put('error', msg);
    } else if (error === undefined && result === 'fail') {
      current.Put('error', 'Test case returned non-true value.');
    }

    self.callback(toObject(current));
  };

  this.testRun = function testRun(id, path, description, code, result, error){
    var current = self.current;
    current.Put('id', id);
    current.Put('path', path);
    current.Put('description', description);
    current.Put('result', result);
    current.Put('error', error);
    current.Put('code', code);
  };
}

define(TestRunner.prototype, [
  function run(test, callback){
    var self = this;
    this.callback = callback;
    continuum(function(realm){
      var src = test.getSource(),
          current = self.current = realm.evaluate('({})');

      realm.on('throw', function(e){
        self.current = e.value;
        self.testFinished();
      });

      iterate(test, function(val, key){
        if (key !== 'test') {
          current.Put(key, val);
        }
      });

      current.Put('code', src);
      realm.evaluate(self.executeBefore);
      realm.global.Put('testRun', createNativeFunction(self.testRun));
      realm.global.Put('testFinished', createNativeFunction(self.testFinished));
      realm.global.Put('testDescrip', current);
      realm.evaluate(src);
      realm.evaluate(self.executeAfter);
    });
  }
]);

var TestSuite = (function(){
  function TestSuiteOptions(o){
    if (o) {
      o = Object(o);
      for (var k in this) {
        if (k in o) {
          this[k] = o[k];
        }
      }
    }
  }

  TestSuiteOptions.prototype = {
    root: __dirname,
    strictOnly: false,
    nonStrictOnly: false,
    unmarkedDefault: false
  };


  function TestSuite(options){
    options = new TestSuiteOptions(options);
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

    var before = map(['cth.js', 'sta.js', 'testBuiltInObject.js'], function(name){
      return read(resolve(this.libs, name));
    }, this).join('\n\n');

    var after = read(resolve(this.libs, 'gs.js'));
    this.runner = new TestRunner(this, before, after);

    Object.defineProperty(this, 'includes', {
      get: function(){ return includes }
    });
  }


  define(TestSuite.prototype, [
    function summary(progress) {
      print();
      print("=== Summary ===");
      print(" - Ran %d tests", progress.count);
      if (progress.failed === 0) {
        print(" - All tests succeeded");
      } else {
        print(" - Passed %d tests (%d)", progress.succeeded, percent(progress.succeeded, progress.count));
        print(" - Failed %d tests (%d)", progress.failed, percent(progress.failed, progress.count));
      }
    },
    function enqueue(path){
      if (this.queue.length >= this.max) return this;
      if (isDirectory(path)) {
        dir(path).forEach(this.enqueue, this);
      } else {
        this.queue.push(path);
      }
      return this;
    },
    function chapter(chapter){
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
    },
    function next(done){
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
        this.runner.run(test, function(result){
          done.call(self, test);
        });
      }
    },
    function run(count, done){
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

          write(__dirname + '/results/'+name+'.js', stringify(test));
          test.global = null;
          this.run(count, done);
        });
      } else {
        done('done')
      }
    }
  ]);

  return TestSuite;
})();

var x = new TestSuite;

x.chapter('8.2');
x.run(function(result){
  print(x);
});
// print(x.includes);
//print(realm.global);
