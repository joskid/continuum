(function(continuum){

var utility     = continuum.utility,
    Feeder      = utility.Feeder,
    block       = continuum.block,
    createPanel = continuum.createPanel,
    render      = continuum.render,
    _           = continuum._;


var body         = _(document.body),
    input        = createPanel('editor'),
    stdout       = createPanel('console'),
    inspector    = createPanel('inspector'),
    instructions = createPanel('instructions');

var main = createPanel('panel', null, {
  name: 'container',
  top: {
    left: {
      size: 250,
      top: {
        size: .7,
        label: 'Instructions',
        name: 'instructions',
        content: instructions,
        scroll: true
      },
      bottom: {
        label: 'stdout',
        name: 'output',
        content: stdout,
        scroll: true
      },
    },
    right: {
      label: 'Inspector',
      name: 'view',
      content: inspector,
      scroll: true
    },
  },
  bottom: {
    name: 'input',
    size: .3,
    content: input
  }
});

instructions.children.shift();


void function(){
  var scroll = _(document.querySelector('.CodeMirror-scroll')),
      scrollbar = input.append(createPanel('scrollbar', scroll)),
      child = input.child();

  scroll.removeClass('scrolled');
  child.removeClass('scroll-container');
  child.style('right', null);
  scrollbar.right(0);
  scrollbar.width(scrollbar.width() + 2);
  main.splitter.right(0);
}();


function makeRealm(){
  var realm = continuum.createRealm();

  function run(code){
    realm.evaluateAsync(code, inspect);
  }

  function inspect(o){
    var tree = inspector.append(createPanel('result', render('normal', o)));
    inspector.element.scrollTop = inspector.element.scrollHeight;
    inspector.refresh();
    return tree;
  }

  var ops = new Feeder(function(op){
    instructions.addInstruction(op);
  });

  realm.on('write', function(args){
    stdout.write.apply(stdout, args);
  });

  realm.on('clear', function(){
    stdout.clear();
  });

  realm.on('backspace', function(n){
    stdout.backspace(n);
  });

  realm.on('pause', function(){
    var overlay = body.append(block('.overlay')),
        unpause = body.append(createPanel('button', 'Unpause', 'unpause'));

    body.addClass('paused');
    input.disable();
    unpause.once('click', function(){
      body.removeClass('paused');
      input.enable();
      unpause.remove();
      overlay.remove();
      realm.resume();
    });
  });

  input.on('entry', function(evt){
    run(evt.value);
  });

  setTimeout(function(){
    realm.on('op', function(op){
      ops.push(op);
    });
  }, 100);

  var item = inspect(realm.evaluate('this'));
  setTimeout(function(){ item.expand() }, 50);

  return realm;
}


setTimeout(function(){ realm = makeRealm() }, 100);

})(continuum);
