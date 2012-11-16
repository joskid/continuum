(function(continuum){

var Component = continuum.Component,
    utility   = continuum.utility,
    inherit   = utility.inherit,
    each      = utility.each,
    iterate   = utility.iterate,
    inline    = continuum.inline,
    block     = continuum.block,
    _         = continuum._;

var Key = function(){
  function Key(key){
    Component.call(this, 'div');
    this.addClass('key');
    this.text(key);
  }

  inherit(Key, Component);

  return Key;
}();

var attributes = ['___', 'E__', '_C_', 'EC_', '__W', 'E_W', '_CW', 'ECW', '__A', 'E_A', '_CA', 'ECA'];


var Property = (function(){
  function Property(mirror, name){
    Component.call(this, 'li');
    this.mirror = mirror;
    this.name = name;
    this.valueMirror = this.createValue();
    this.value = render(this.valueRenderer, this.valueMirror);
    if (this.valueMirror.type === 'function' && this.valueMirror.getName() === name) {
      this.value.addClass(this.getAttributes());
    } else {
      this.key = this.createKey();
    }
    this.addClass('property');
    this.append(this.key);
    this.append(this.value);
    this.initTree();
  }

  inherit(Property, Component, {
    valueRenderer: 'normal'
  }, [
    function getAttributes(){
      return this.attrs = attributes[this.mirror.propAttributes(this.name)];
    },
    function createKey(){
      var key = new Key(this.name);
      key.addClass(this.getAttributes());
      return key;
    },
    function createValue(){
      return this.mirror.get(this.name);
    },
    function initTree(){
      this.append(document.createElement('div'));
      this.append(this.value.createTree());
    },
    function refresh(){
      var attrs = attributes[this.mirror.propAttributes(this.name)];
      if (attrs !== this.attrs) {
        this.key.removeClass(this.attrs);
        this.key.addClass(attrs);
        this.attrs = attrs;
      }
      if (this.valueMirror) {
        var valueMirror = this.createValue();
        if (this.valueMirror !== valueMirror) {
          var element = this.value;
          this.valueMirror = valueMirror;
          this.value = render(this.valueRenderer, valueMirror);
          this.remove(element);
          this.append(this.value);
        }
      }
    }
  ]);

  return Property;
})();

var PreviewProperty = (function(){
  function PreviewProperty(mirror, name){
    Property.call(this, mirror, name);
  }

  inherit(PreviewProperty, Property, {
    valueRenderer: 'subpreview'
  }, [
    function initTree(){
      return false;
    }
  ]);

  return PreviewProperty;
})();


var Index = (function(){
  function Index(mirror, index){
    Property.call(this, mirror, index);
  }

  inherit(Index, PreviewProperty, [
    function createKey(){
      return null;
    },
    function refresh(){
      if (this.valueMirror) {
        var valueMirror = this.mirror.get(this.name);
        if (this.valueMirror !== valueMirror) {
          var element = this.value;
          this.valueMirror = valueMirror;
          this.value = render(this.valueRenderer, valueMirror);
          this.remove(element);
          this.append(this.value);
        }
      }
    }
  ]);

  return Index;
})();




function createSpecialProperty(label, classname, method){
  var SpecialProperty = function(mirror){
    Property.call(this, mirror, label);
  }

  inherit(SpecialProperty, Property, [
    function getAttributes(){
      return this.attrs = classname;
    },
    function createValue(){
      return this.mirror[method]();
    },
    function refresh(){
      var valueMirror = this.createValue();
      if (this.valueMirror !== valueMirror) {
        var element = this.value;
        this.valueMirror = valueMirror;
        this.value = render(this.valueRenderer, valueMirror);
        this.remove(element);
        this.append(this.value);
      }
    }
  ]);

  return SpecialProperty;
}

var Scope = createSpecialProperty('[[scope]]', 'FunctionScope', 'getScope'),
    Proto = createSpecialProperty('[[proto]]', 'Proto', 'getPrototype'),
    Env   = createSpecialProperty('[[env]]', 'Env', 'getEnvironment'),
    Outer = createSpecialProperty('[[outer]]', 'Outer', 'getPrototype');


var Label = (function(){
  function Label(kind){
    Component.call(this, 'div');
    this.addClass('label');
    this.addClass(kind);
  }

  inherit(Label, Component);

  return Label;
})();


var Tree = (function(){
  function Tree(){
    Component.call(this, 'ul');
    this.addClass('tree');
    this.hide();
    this.expanded = false;
  }

  inherit(Tree, Component, [
    function expand(){
      if (!this.expanded && this.emit('expand')) {
        this.expanded = true;
        this.show();
        return true;
      }
      return false;
    },
    function contract(){
      if (this.expanded && this.emit('contract')) {
        this.expanded = false;
        this.hide();
        return true;
      }
      return false;
    },
    function toggle(){
      if (this.expanded) {
        this.contract();
        return false;
      } else {
        this.expand();
        return true;
      }
    },
    function refresh(){
      if (this.children) {
        each(this.children, function(child){
          child.refresh();
        });
      }
      return this;
    }
  ]);

  return Tree;
})();


var Result = (function(){
  function Result(result){
    Component.call(this, 'li');
    this.result = this.append(result);
    var tree = result.createTree();
    if (tree) {
      this.append(document.createElement('div'));
      this.tree = this.append(tree);
      this.tree.addClass('result-tree');
    }
  }

  inherit(Result, Component, [
    function refresh(){
      this.result.refresh();
    },
    function expand(){
      this.result.expand();
    },
    function contract(){
      this.result.contract();
    },
    function toggle(){
      this.result.toggle();
    }
  ]);

  return Result;
})();

continuum.createPanel.panels.result = Result;


function creator(Ctor){
  function create(mirror){
    var item = new Ctor(mirror);
    item.refresh();
    return item;
  };

  Ctor.create = create;
}

var Leaf = (function(){
  function Leaf(mirror){
    Component.call(this, 'div');
    this.mirror = mirror;
    this.addClass('leaf');
    this.label = new Label(mirror.kind);
    this.append(this.label);
  }

  creator(Leaf);
  inherit(Leaf, Component, [
    function refresh(){
      this.label.text(this.mirror.label());
      return this;
    },
    function createTree(){
      return null;
    }
  ]);

  return Leaf;
})();


var StringLeaf = (function(){
  function StringLeaf(mirror){
    Leaf.call(this, mirror);
  }

  creator(StringLeaf);
  inherit(StringLeaf, Leaf, [
    function refresh(){
      this.label.text(utility.quotes(this.mirror.subject));
      return this;
    },
  ]);

  return StringLeaf;
})();


var NumberLeaf = (function(){
  function NumberLeaf(mirror){
    Leaf.call(this, mirror);
  }

  creator(NumberLeaf);
  inherit(NumberLeaf, Leaf, [
    function refresh(){
      var label = this.mirror.label();
      this.label.text(label === 'number' ? this.mirror.subject : label);
      return this;
    },
  ]);

  return NumberLeaf;
})();


var Branch = (function(){
  function Branch(mirror){
    Component.call(this, 'div');
    this.mirror = mirror;
    this.label = this.createLabel();
    this.preview = this.createPreview();
    this.addClass('branch');
    this.append(this.label);
    this.append(this.preview);
  }

  creator(Branch);
  inherit(Branch, Component, [
    function createLabel(){
      var label = new Label(this.mirror.kind);
      label.on('click', function(e){
        if (this.tree) {
          this.tree.expanded ? this.contract() : this.expand();
        }
      }, this);
      return label;
    },
    function createTree(){
      return this.tree = new Tree;
    },
    function createPreview(){
      var preview = render('preview', this.mirror);
      var tree = block('.preview-tree');
      tree.append(preview);
      return tree;
    },
    function expand(){
      if (!this.tree.expanded) {
        this.expanded();
        this.addClass('expanded');
        this.tree.expand();
      }
      return this;
    },
    function contract(){
      if (this.tree.expanded) {
        this.contracted();
        this.removeClass('expanded');
        this.tree.contract();
      }
      return this;
    },
    function expanded(){
      this.preview.hide();
      if (!this.tree.initialized) {
        this.initTree();
      } else {
        this.tree.refresh();
      }
      return this;
    },
    function contracted(){
      this.preview.show();
      return this;
    },
    function refresh(){
      this.label.text(this.mirror.label());
      return this;
    },
    function initTree(){
      if (!this.tree.initialized) {
        this.tree.initialized = true;
        this.keys = this.mirror.list(true);
        iterate(this.keys, function(key){
          this.tree.batchAppend(new Property(this.mirror, key));
        }, this);
        this.tree.batchAppend(new Proto(this.mirror));
      }
      return this;
    }
  ]);

  return Branch;
})();


var FunctionBranch = (function(){
  function FunctionBranch(mirror){
    Branch.call(this, mirror);
  }

  creator(FunctionBranch);
  inherit(FunctionBranch, Branch, [
    function createLabel(){
      var label = Branch.prototype.createLabel.call(this),
          name = this.mirror.getName(),
          params = this.mirror.getParams();

      if (params.rest) {
        params.push('...'+params.pop());
      }

      label.append(inline(name, 'FunctionName'));
      var container = inline('', 'Params');
      for (var i=0; i < params.length; i++) {
        container.append(inline(params[i], 'Param'))
      }
      label.append(container);
      return label;
    },
    function createPreview(){
      return new Preview(this.mirror);
    },
    function refresh(){
      this.preview && this.preview.refresh();
      this.tree && this.tree.refresh();
      return this;
    },
    function initTree(){
      Branch.prototype.initTree.call(this);
      this.tree.batchAppend(new Scope(this.mirror));
    }
  ]);

  return FunctionBranch;
})();



var GlobalBranch = (function(){
  function GlobalBranch(mirror){
    Branch.call(this, mirror);
  }

  creator(GlobalBranch);
  inherit(GlobalBranch, Branch, [
    function initTree(){
      Branch.prototype.initTree.call(this);
      if (this.mirror.subject.env.outer) {
        this.tree.batchAppend(new Env(this.mirror));
      }
    }
  ]);

  return GlobalBranch;
})();


var ScopeBranch = (function(){
  function ScopeBranch(mirror){
    Branch.call(this, mirror);
  }

  creator(ScopeBranch);
  inherit(ScopeBranch, Branch, [
    function initTree(){
      if (!this.tree.initialized) {
        this.tree.initialized = true;
        this.keys = this.mirror.list(true);
        iterate(this.keys, function(key){
          this.tree.batchAppend(new Property(this.mirror, key));
        }, this);
        if (this.mirror.subject.outer) {
          this.tree.batchAppend(new Outer(this.mirror));
        }
      }
      return this;
    }
  ]);

  return ScopeBranch;
})();



var ThrownBranch = (function(){
  function ThrownBranch(mirror){
    Branch.call(this, mirror);
  }

  creator(ThrownBranch);
  inherit(ThrownBranch, Branch, [
    function createLabel(){
      var location = block('.Location');
      location.append(inline('Uncaught Exception ', 'Uncaught'));
      location.append(inline(' in '));
      location.append(inline(this.mirror.origin(), 'Origin'));
      location.append(inline(' at '));
      location.append(inline(this.mirror.getValue('line'), 'Line'));
      var label = block();
      label.append(location);
      label.append(block(this.mirror.getError(), 'Exception'));
      return label;
    },
    function createPreview(){

      var code = _('pre');
      code.addClass('Code');
      code.text(this.mirror.getValue('code'));

      var label = block('.error');
      label.append(code);
      label.refresh = function(){};
      return label;
    },
    function refresh(){
      this.preview && this.preview.refresh();
      this.tree && this.tree.refresh();
    }
  ]);

  return ThrownBranch;
})();


var Preview = (function(){
  function Preview(mirror){
    Component.call(this, 'ul');
    this.mirror = mirror;
    this.addClass('preview');
    this.createPreview();
  }

  creator(Preview);
  inherit(Preview, Branch, [
    function createPreview(){
      utility.iterate(this.mirror.list(false), function(key){
        this.batchAppend(new PreviewProperty(this.mirror, key));
      }, this);
    },
    function refresh(){
      return this;
    },
  ]);

  return Preview;
})();


var IndexedPreview = (function(){
  function IndexedPreview(mirror){
    Preview.call(this, mirror);
    this.addClass('ArrayPreview');
  }

  creator(IndexedPreview);
  inherit(IndexedPreview, Preview, [
    function createPreview(){
      var len = this.mirror.getValue('length');
      for (var i=0; i < len; i++) {
        this.batchAppend(new Index(this.mirror, i));
      }
    }
  ]);

  return IndexedPreview;
})();



var FunctionPreview = (function(){
  function FunctionPreview(mirror){
    Component.call(this, 'div');
    this.mirror = mirror;
    this.addClass('preview');
    this.addClass('Function');
    this.createPreview();
  }

  creator(FunctionPreview);
  inherit(FunctionPreview, Preview, [
    function createPreview(){
      this.text(this.mirror.getName());
    }
  ]);

  return FunctionPreview;
})();


var render = continuum.render = (function(){
  var renderers = {
    normal: continuum.createRenderer({
      Accessor      : Leaf.create,
      Arguments     : Branch.create,
      Array         : Branch.create,
      Boolean       : Branch.create,
      BooleanValue  : Leaf.create,
      Date          : Branch.create,
      Error         : Branch.create,
      Function      : FunctionBranch.create,
      Global        : GlobalBranch.create,
      JSON          : Branch.create,
      Map           : Branch.create,
      Math          : Branch.create,
      Module        : Branch.create,
      NullValue     : Leaf.create,
      Number        : Branch.create,
      NumberValue   : NumberLeaf.create,
      Object        : Branch.create,
      RegExp        : Branch.create,
      Scope         : ScopeBranch.create,
      Set           : Branch.create,
      String        : Branch.create,
      StringValue   : StringLeaf.create,
      Symbol        : Branch.create,
      Thrown        : ThrownBranch.create,
      UndefinedValue: Leaf.create,
      Unknown       : Branch.create,
      WeakMap       : Branch.create
    }),
    preview: continuum.createRenderer({
      Accessor      : Leaf.create,
      Arguments     : Preview.create,
      Array         : IndexedPreview.create,
      Boolean       : Preview.create,
      BooleanValue  : Leaf.create,
      Date          : Preview.create,
      Error         : Preview.create,
      Function      : FunctionPreview.create,
      Global        : Preview.create,
      JSON          : Preview.create,
      Map           : Preview.create,
      Math          : Preview.create,
      Module        : Preview.create,
      NullValue     : Leaf.create,
      Number        : Preview.create,
      NumberValue   : NumberLeaf.create,
      Object        : Preview.create,
      RegExp        : Preview.create,
      Scope         : Preview.create,
      Set           : Preview.create,
      String        : Preview.create,
      StringValue   : StringLeaf.create,
      Symbol        : Preview.create,
      Thrown        : Preview.create,
      UndefinedValue: Leaf.create,
      Unknown       : Preview.create,
      WeakMap       : Preview.create
    }),
    subpreview: continuum.createRenderer({
      Accessor      : Leaf.create,
      Arguments     : Leaf.create,
      Array         : Leaf.create,
      Boolean       : Leaf.create,
      BooleanValue  : Leaf.create,
      Date          : Leaf.create,
      Error         : Leaf.create,
      Function      : FunctionPreview.create,
      Global        : Leaf.create,
      JSON          : Leaf.create,
      Map           : Leaf.create,
      Math          : Leaf.create,
      Module        : Leaf.create,
      NullValue     : Leaf.create,
      Number        : Leaf.create,
      NumberValue   : NumberLeaf.create,
      Object        : Leaf.create,
      RegExp        : Leaf.create,
      Scope         : Leaf.create,
      Set           : Leaf.create,
      String        : Leaf.create,
      StringValue   : StringLeaf.create,
      Symbol        : Leaf.create,
      Thrown        : Leaf.create,
      UndefinedValue: Leaf.create,
      Unknown       : Leaf.create,
      WeakMap       : Leaf.create
    })
  };

  return function render(type, mirror){
    return renderers[type].render(mirror);
  }
})();



})(continuum);
