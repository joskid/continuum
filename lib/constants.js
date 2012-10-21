var constants = (function(exports){
  var create = require('./utility').create,
      define = require('./utility').define;

  function Constants(array){
    this.hash = create(null);
    for (var i=0; i < array.length; i++) {
      this.hash[array[i]] = i;
    }
    this.array = array;
  }

  define(Constants.prototype, [
    function getIndex(key){
      return this.hash[key];
    },
    function getKey(index){
      return this.array[index];
    }
  ]);



  function Symbol(name){
    this.name = name;
  }

  define(Symbol.prototype, [
    function toString(){
      return this.name;
    },
    function inspect(){
      return '['+this.name+']';
    }
  ]);

  exports.BINARYOPS = new Constants(['instanceof', 'in', 'is', 'isnt', '==', '!=', '===', '!==', '<', '>',
                                   '<=', '>=', '*', '/','%', '+', '-', '<<', '>>', '>>>', '|', '&', '^']);
  exports.UNARYOPS = new Constants(['delete', 'void', 'typeof', '+', '-', '~', '!']);
  exports.ENTRY = new Constants(['ENV', 'FINALLY', 'TRYCATCH' ]);
  exports.FUNCTYPE = new Constants(['NORMAL', 'METHOD', 'ARROW' ]);

  exports.SYMBOLS = {
    Break            : new Symbol('Break'),
    Pause            : new Symbol('Pause'),
    Throw            : new Symbol('Throw'),
    Empty            : new Symbol('Empty'),
    Resume           : new Symbol('Resume'),
    Return           : new Symbol('Return'),
    Abrupt           : new Symbol('Abrupt'),
    Native           : new Symbol('Native'),
    Continue         : new Symbol('Continue'),
    Reference        : new Symbol('Reference'),
    Completion       : new Symbol('Completion'),
    Uninitialized    : new Symbol('Uninitialized')
  };




  exports.AST = (function(f,b,c,g,d,a){
    function e(c,b,a){for(a=0,b='';c[a];b+=g[c.charCodeAt(a++)]);return b}
    d=0,a=c.length;while(a-=4)b[d++] = e(f(c.slice(a,a+4))); return new Constants(b);
  }(typeof atob==='undefined'?function(a){return Buffer(a,'base64').toString('binary')}:atob,[],
    'OQE=OAg=Ewg=Njc=Ng4=NQE=NAE=Mwg=Mgg=MQE=LyA=LzA=Li8BLQg=LAE=Kwg=Kg==KQ==KA==JwI=JwE=JgE=JQ4=IyQ=IgE=IQE=IA==Hwg=HhY=Hg4=HQg=HA==Gw==BAE=BA4=GAg=GBoIGBkIAQg=FRYXFRY=FQ4=FAg=EhMIEQg=EAE=DA8=DAE=DA4=DA0=Cgs=CQg=Bwg=BgE=BQE=AwQBAAI=AAE=',
    'ArrayExpressionPatternArrowFunctionAssignmentBinaryBlockStatementBreakCatchClauseClassBodyDeclarationHeritageConditionalDebuggerDoWhileEmptyExportSpecifierSetForInOfGlobIdentifierIfImportLabeledLiteralLogicalMemberMethodDefinitionModuleNewObjectPathProgramPropertyReturnSequenceSwitchTaggedTemplateElementThisThrowTryUnaryUpdateVariableDeclaratorWithYield'.split(/(?!=\w)(?=[A-Z])/)))

  return exports;
})(typeof exports === undefined ? {} : exports);
