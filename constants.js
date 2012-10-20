var create = require('./utility').create;

function Hash(array){
  this.hash = create(null);
  for (var i=0; i < array.length; i++) {
    this.hash[array[i]] = i;
  }
  this.array = array;
}

function getIndex(key){
  return this.hash[key];
}
Hash.prototype.getIndex = getIndex;

function getKey(index){
  return this.array[index];
}
Hash.prototype.getKey = getKey;


exports.BINARYOPS = new Hash(['instanceof', 'in', 'is', 'isnt', '==', '!=', '===', '!==', '<', '>',
                                 '<=', '>=', '*', '/','%', '+', '-', '<<', '>>', '>>>', '|', '&', '^']);
exports.UNARYOPS = new Hash(['delete', 'void', 'typeof', '+', '-', '~', '!']);
exports.ENTRY = new Hash(['ENV', 'FINALLY', 'TRYCATCH' ]);
exports.FUNCTYPE = new Hash(['NORMAL', 'METHOD', 'ARROW' ]);

exports.AST = (function(f,b,c,g,d,a){
  function e(c,b,a){for(a=0,b='';c[a];b+=g[c.charCodeAt(a++)]);return b}
  d=0,a=c.length;while(a-=4)b[d++] = e(f(c.slice(a,a+4))); return new Hash(b);
}(typeof atob==='undefined'?function(a){return Buffer(a,'base64').toString('binary')}:atob,[],
  'OQE=OAg=Ewg=Njc=Ng4=NQE=NAE=Mwg=Mgg=MQE=LyA=LzA=Li8BLQg=LAE=Kwg=Kg==KQ==KA==JwI=JwE=JgE=JQ4=IyQ=IgE=IQE=IA==Hwg=HhY=Hg4=HQg=HA==Gw==BAE=BA4=GAg=GBoIGBkIAQg=FRYXFRY=FQ4=FAg=EhMIEQg=EAE=DA8=DAE=DA4=DA0=Cgs=CQg=Bwg=BgE=BQE=AwQBAAI=AAE=',
  'ArrayExpressionPatternArrowFunctionAssignmentBinaryBlockStatementBreakCatchClauseClassBodyDeclarationHeritageConditionalDebuggerDoWhileEmptyExportSpecifierSetForInOfGlobIdentifierIfImportLabeledLiteralLogicalMemberMethodDefinitionModuleNewObjectPathProgramPropertyReturnSequenceSwitchTaggedTemplateElementThisThrowTryUnaryUpdateVariableDeclaratorWithYield'.split(/(?!=\w)(?=[A-Z])/)))
