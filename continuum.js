continuum = (function(global, exports, require, module){


exports.esprima = (function(exports){
/*
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true plusplus:true */
/*global esprima:true, define:true, exports:true, window: true,
throwError: true, createLiteral: true, generateStatement: true,
parseAssignmentExpression: true, parseBlock: true,
parseClassExpression: true, parseClassDeclaration: true, parseExpression: true,
parseForStatement: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseImportSpecifier: true,
parseLeftHandSideExpression: true,
parseStatement: true, parseSourceElement: true, parseModuleBlock: true, parseConciseBody: true,
parseYieldExpression: true
*/

(function (factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((window.esprima = {}));
    }
}(function (exports) {
    'use strict';

    var Token,
        TokenName,
        Syntax,
        PropertyKind,
        Messages,
        Regex,
        source,
        strict,
        yieldAllowed,
        yieldFound,
        index,
        lineNumber,
        lineStart,
        length,
        buffer,
        state,
        extra;

    Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8,
        Template: 9,
        AtSymbol: 10
    };

    TokenName = {};
    TokenName[Token.BooleanLiteral] = 'Boolean';
    TokenName[Token.EOF] = '<end>';
    TokenName[Token.Identifier] = 'Identifier';
    TokenName[Token.Keyword] = 'Keyword';
    TokenName[Token.NullLiteral] = 'Null';
    TokenName[Token.NumericLiteral] = 'Numeric';
    TokenName[Token.Punctuator] = 'Punctuator';
    TokenName[Token.StringLiteral] = 'String';
    TokenName[Token.AtSymbol] = 'AtSymbol';

    Syntax = {
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        AssignmentExpression: 'AssignmentExpression',
        AtSymbol: 'AtSymbol',
        BinaryExpression: 'BinaryExpression',
        BlockStatement: 'BlockStatement',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ClassBody: 'ClassBody',
        ClassDeclaration: 'ClassDeclaration',
        ClassExpression: 'ClassExpression',
        ClassHeritage: 'ClassHeritage',
        ComprehensionBlock: 'ComprehensionBlock',
        ComprehensionExpression: 'ComprehensionExpression',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExportDeclaration: 'ExportDeclaration',
        ExportSpecifier: 'ExportSpecifier',
        ExportSpecifierSet: 'ExportSpecifierSet',
        ExpressionStatement: 'ExpressionStatement',
        ForInStatement: 'ForInStatement',
        ForOfStatement: 'ForOfStatement',
        ForStatement: 'ForStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Glob: 'Glob',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        ImportDeclaration: 'ImportDeclaration',
        ImportSpecifier: 'ImportSpecifier',
        LabeledStatement: 'LabeledStatement',
        Literal: 'Literal',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        MethodDefinition: 'MethodDefinition',
        ModuleDeclaration: 'ModuleDeclaration',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Path:  'Path',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SpreadElement: 'SpreadElement',
        SwitchCase: 'SwitchCase',
        SwitchStatement: 'SwitchStatement',
        SymbolDeclaration: 'SymbolDeclaration',
        SymbolDeclarator: 'SymbolDeclarator',
        TaggedTemplateExpression: 'TaggedTemplateExpression',
        TemplateElement: 'TemplateElement',
        TemplateLiteral: 'TemplateLiteral',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression'
    };

    PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
    };

    // Error messages should be identical to V8.
    Messages = {
        UnexpectedToken:  'Unexpected token %0',
        UnexpectedNumber:  'Unexpected number',
        UnexpectedString:  'Unexpected string',
        UnexpectedIdentifier:  'Unexpected identifier',
        UnexpectedReserved:  'Unexpected reserved word',
        UnexpectedTemplate:  'Unexpected quasi %0',
        UnexpectedEOS:  'Unexpected end of input',
        NewlineAfterThrow:  'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp:  'Invalid regular expression: missing /',
        InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
        InvalidLHSInFormalsList:  'Invalid left-hand side in formals list',
        InvalidLHSInForIn:  'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally:  'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalReturn: 'Illegal return statement',
        IllegalYield: 'Illegal yield expression',
        IllegalSpread: 'Illegal spread element',
        StrictModeWith:  'Strict mode code may not include a with statement',
        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        ParameterAfterRestParameter: 'Rest parameter must be final parameter of an argument list',
        ElementAfterSpreadElement: 'Spread must be the final element of an element list',
        ObjectPatternAsRestParameter: 'Invalid rest parameter',
        ObjectPatternAsSpread: 'Invalid spread argument',
        StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
        StrictDelete:  'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
        AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord:  'Use of future reserved word in strict mode',
        NoFromAfterImport: 'Missing from after import',
        NoYieldInGenerator: 'Missing yield in generator',
        NoUnintializedConst: 'Const must be initialized',
        ComprehensionRequiresBlock: 'Comprehension must have at least one block',
        ComprehensionError:  'Comprehension Error',
        EachNotAllowed:  'Each is not supported'
    };

    // See also tools/generate-unicode-regex.py.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
        NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
    };

    // Ensure the condition is true, otherwise throw an error.
    // This is only to have a better contract semantic, i.e. another safety net
    // to catch a logic error. The condition shall be fulfilled in normal case.
    // Do NOT use this to enforce a certain condition on any user input.

    function assert(condition, message) {
        if (!condition) {
            throw new Error('ASSERT: ' + message);
        }
    }

    function sliceSource(from, to) {
        return source.slice(from, to);
    }

    if (typeof 'esprima'[0] === 'undefined') {
        sliceSource = function sliceArraySource(from, to) {
            return source.slice(from, to).join('');
        };
    }

    function isDecimalDigit(ch) {
        return '0123456789'.indexOf(ch) >= 0;
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }


    // 7.2 White Space

    function isWhiteSpace(ch) {
        return (ch === ' ') || (ch === '\u0009') || (ch === '\u000B') ||
            (ch === '\u000C') || (ch === '\u00A0') ||
            (ch.charCodeAt(0) >= 0x1680 &&
             '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(ch) >= 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierStart.test(ch));
    }

    function isIdentifierPart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch >= '0') && (ch <= '9')) ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierPart.test(ch));
    }

    // 7.6.1.2 Future Reserved Words

    function isFutureReservedWord(id) {
        switch (id) {

        // Future reserved words.
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        }

        return false;
    }

    function isStrictModeReservedWord(id) {
        switch (id) {

        // Strict Mode reserved words.
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        }

        return false;
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    // 7.6.1.1 Keywords

    function isKeyword(id) {
        var keyword = false;
        switch (id.length) {
        case 2:
            keyword = (id === 'if') || (id === 'in') || (id === 'do');
            break;
        case 3:
            keyword = (id === 'var') || (id === 'for') || (id === 'new') || (id === 'try');
            break;
        case 4:
            keyword = (id === 'this') || (id === 'else') || (id === 'case') || (id === 'void') || (id === 'with');
            break;
        case 5:
            keyword = (id === 'while') || (id === 'break') || (id === 'catch') || (id === 'throw');
            break;
        case 6:
            keyword = (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch') || (id === 'public');
            break;
        case 7:
            keyword = (id === 'default') || (id === 'finally') || (id === 'private');
            break;
        case 8:
            keyword = (id === 'function') || (id === 'continue') || (id === 'debugger');
            break;
        case 10:
            keyword = (id === 'instanceof');
            break;
        }

        if (keyword) {
            return true;
        }

        switch (id) {
        // Future reserved words.
        // 'const' is specialized as Keyword in V8.
        case 'const':
            return true;

        // For compatiblity to SpiderMonkey and ES.next
        case 'yield':
        case 'let':
            return true;
        }

        if (strict && isStrictModeReservedWord(id)) {
            return true;
        }

        return isFutureReservedWord(id);
    }

    // Return the next character and move forward.

    function nextChar() {
        return source[index++];
    }

    // 7.4 Comments

    function skipComment() {
        var ch, blockComment, lineComment;

        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = nextChar();
                if (isLineTerminator(ch)) {
                    lineComment = false;
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = nextChar();
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            ++index;
                            blockComment = false;
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    index += 2;
                    lineComment = true;
                } else if (ch === '*') {
                    index += 2;
                    blockComment = true;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function scanHexEscape(prefix) {
        var i, len, ch, code = 0;

        len = (prefix === 'u') ? 4 : 2;
        for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
                ch = nextChar();
                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
                return '';
            }
        }
        return String.fromCharCode(code);
    }

    function scanUnicodeCodePointEscape() {
        var ch, code, cu1, cu2;

        ch = source[index];
        code = 0;

        // At least, one hex digit is required.
        if (ch === '}') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        while (index < length) {
            ch = nextChar();
            if (!isHexDigit(ch)) {
                break;
            }
            code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
        }

        if (code > 0x10FFFF || ch !== '}') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        // UTF-16 Encoding
        if (code <= 0xFFFF) {
            return String.fromCharCode(code);
        }
        cu1 = ((code - 0x10000) >> 10) + 0xD800;
        cu2 = ((code - 0x10000) & 1023) + 0xDC00;
        return String.fromCharCode(cu1, cu2);
    }

    function scanIdentifier() {
        var ch, atname, start, id, restore;

        ch = source[index];

        if (ch === '@') {
            atname = true;
            ch = source[++index];
        }

        if (!isIdentifierStart(ch)) {
            return;
        }

        start = index;
        if (ch === '\\') {
            ++index;
            if (source[index] !== 'u') {
                return;
            }
            ++index;
            restore = index;
            ch = scanHexEscape('u');
            if (ch) {
                if (ch === '\\' || !isIdentifierStart(ch)) {
                    return;
                }
                id = ch;
            } else {
                index = restore;
                id = 'u';
            }
        } else {
            id = nextChar();
        }

        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }
            if (ch === '\\') {
                ++index;
                if (source[index] !== 'u') {
                    return;
                }
                ++index;
                restore = index;
                ch = scanHexEscape('u');
                if (ch) {
                    if (ch === '\\' || !isIdentifierPart(ch)) {
                        return;
                    }
                    id += ch;
                } else {
                    index = restore;
                    id += 'u';
                }
            } else {
                id += nextChar();
            }
        }

        if (atname) {
            return {
                type: Token.AtSymbol,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // There is no keyword or literal with only one character.
        // Thus, it must be an identifier.
        if (id.length === 1) {
            return {
                type: Token.Identifier,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (isKeyword(id)) {
            return {
                type: Token.Keyword,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.1 Null Literals

        if (id === 'null') {
            return {
                type: Token.NullLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.2 Boolean Literals

        if (id === 'true' || id === 'false') {
            return {
                type: Token.BooleanLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        return {
            type: Token.Identifier,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.7 Punctuators

    function scanPunctuator() {
        var start = index,
            ch1 = source[index],
            ch2,
            ch3,
            ch4;

        // Check for most common single-character punctuators.

        if (ch1 === ';' || ch1 === '{' || ch1 === '}') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === ',' || ch1 === '(' || ch1 === ')') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Dot (.) can also start a floating-point number and ellipsis, hence
        // the need to check the next character.

        ch2 = source[index + 1];
        if (ch1 === '.' && !isDecimalDigit(ch2) && ch2 !== '.') {
            return {
                type: Token.Punctuator,
                value: nextChar(),
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Peek more characters.

        ch3 = source[index + 2];
        ch4 = source[index + 3];

        // 4-character punctuator: >>>=

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            if (ch4 === '=') {
                index += 4;
                return {
                    type: Token.Punctuator,
                    value: '>>>=',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // 3-character punctuators: === !== >>> <<= >>= ...

        if (ch1 === '=' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '===',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '!' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '!==',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>>',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '<<=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '.' && ch2 === '.' && ch3 === '.') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '...',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 2-character punctuators: <= >= == != ++ -- << >> && ||
        // += -= *= %= &= |= ^= /=

        if (ch2 === '=') {
            if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        if (ch1 === ch2 && ('+-<>&|'.indexOf(ch1) >= 0)) {
            if ('+-<>&|'.indexOf(ch2) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        if (ch1 === '=' && ch2 === '>') {
            index += 2;
            return {
                type: Token.Punctuator,
                value: '=>',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // The remaining 1-character punctuators.

        if ('[]<>+-*%&|^!~?:=/'.indexOf(ch1) >= 0) {
            return {
                type: Token.Punctuator,
                value: nextChar(),
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    }

    // 7.8.3 Numeric Literals

    function scanNumericLiteral() {
        var number, start, ch, octal;

        ch = source[index];
        assert(isDecimalDigit(ch) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        start = index;
        number = '';
        if (ch !== '.') {
            number = nextChar();
            ch = source[index];

            // Hex number starts with '0x'.
            // Octal number starts with '0'.
            // Octal number in ES6 starts with '0o'.
            // Binary number in ES6 starts with '0b'.
            if (number === '0') {
                if (ch === 'x' || ch === 'X') {
                    number += nextChar();
                    while (index < length) {
                        ch = source[index];
                        if (!isHexDigit(ch)) {
                            break;
                        }
                        number += nextChar();
                    }

                    if (number.length <= 2) {
                        // only 0x
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 16),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                } else if (ch === 'b' || ch === 'B') {
                    nextChar();
                    number = '';

                    while (index < length) {
                        ch = source[index];
                        if (ch !== '0' && ch !== '1') {
                            break;
                        }
                        number += nextChar();
                    }

                    if (number.length === 0) {
                        // only 0b or 0B
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 2),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                } else if (ch === 'o' || ch === 'O' || isOctalDigit(ch)) {
                    if (isOctalDigit(ch)) {
                        octal = true;
                        number = nextChar();
                    } else {
                        octal = false;
                        nextChar();
                        number = '';
                    }

                    while (index < length) {
                        ch = source[index];
                        if (!isOctalDigit(ch)) {
                            break;
                        }
                        number += nextChar();
                    }

                    if (number.length === 0) {
                        // only 0o or 0O
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }

                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 8),
                        octal: octal,
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                }

                // decimal number starts with '0' such as '09' is illegal.
                if (isDecimalDigit(ch)) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            }

            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += nextChar();
            }
        }

        if (ch === '.') {
            number += nextChar();
            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += nextChar();
            }
        }

        if (ch === 'e' || ch === 'E') {
            number += nextChar();

            ch = source[index];
            if (ch === '+' || ch === '-') {
                number += nextChar();
            }

            ch = source[index];
            if (isDecimalDigit(ch)) {
                number += nextChar();
                while (index < length) {
                    ch = source[index];
                    if (!isDecimalDigit(ch)) {
                        break;
                    }
                    number += nextChar();
                }
            } else {
                ch = 'character ' + ch;
                if (index >= length) {
                    ch = '<end>';
                }
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        if (index < length) {
            ch = source[index];
            if (isIdentifierStart(ch)) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.8.4 String Literals

    function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false;

        quote = source[index];
        assert((quote === '\'' || quote === '"'),
            'String literal must starts with a quote');

        start = index;
        ++index;

        while (index < length) {
            ch = nextChar();

            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = nextChar();
                if (!isLineTerminator(ch)) {
                    switch (ch) {
                    case 'n':
                        str += '\n';
                        break;
                    case 'r':
                        str += '\r';
                        break;
                    case 't':
                        str += '\t';
                        break;
                    case 'u':
                    case 'x':
                        if (source[index] === '{') {
                            ++index;
                            str += scanUnicodeCodePointEscape();
                        } else {
                            restore = index;
                            unescaped = scanHexEscape(ch);
                            if (unescaped) {
                                str += unescaped;
                            } else {
                                index = restore;
                                str += ch;
                            }
                        }
                        break;
                    case 'b':
                        str += '\b';
                        break;
                    case 'f':
                        str += '\f';
                        break;
                    case 'v':
                        str += '\v';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch);

                            // \0 is not octal escape sequence
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(nextChar());

                                // 3 digits are only allowed when string starts
                                // with 0, 1, 2, 3
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(nextChar());
                                }
                            }
                            str += String.fromCharCode(code);
                        } else {
                            str += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                }
            } else if (isLineTerminator(ch)) {
                break;
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanTemplate() {
        var cooked = '', ch, start, terminated, tail, restore, unescaped, code, octal;

        terminated = false;
        tail = false;
        start = index;

        ++index;

        while (index < length) {
            ch = nextChar();
            if (ch === '`') {
                tail = true;
                terminated = true;
                break;
            } else if (ch === '$') {
                if (source[index] === '{') {
                    ++index;
                    terminated = true;
                    break;
                }
                cooked += ch;
            } else if (ch === '\\') {
                ch = nextChar();
                if (!isLineTerminator(ch)) {
                    switch (ch) {
                    case 'n':
                        cooked += '\n';
                        break;
                    case 'r':
                        cooked += '\r';
                        break;
                    case 't':
                        cooked += '\t';
                        break;
                    case 'u':
                    case 'x':
                        if (source[index] === '{') {
                            ++index;
                            cooked += scanUnicodeCodePointEscape();
                        } else {
                            restore = index;
                            unescaped = scanHexEscape(ch);
                            if (unescaped) {
                                cooked += unescaped;
                            } else {
                                index = restore;
                                cooked += ch;
                            }
                        }
                        break;
                    case 'b':
                        cooked += '\b';
                        break;
                    case 'f':
                        cooked += '\f';
                        break;
                    case 'v':
                        cooked += '\v';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch);

                            // \0 is not octal escape sequence
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(nextChar());

                                // 3 digits are only allowed when string starts
                                // with 0, 1, 2, 3
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(nextChar());
                                }
                            }
                            cooked += String.fromCharCode(code);
                        } else {
                            cooked += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                }
            } else if (isLineTerminator(ch)) {
                ++lineNumber;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
            } else {
                cooked += ch;
            }
        }

        if (!terminated) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.Template,
            value: {
                cooked: cooked,
                raw: sliceSource(start + 1, index - ((tail) ? 1 : 2))
            },
            tail: tail,
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanTemplateElement(option) {
        var startsWith;

        buffer = null;
        skipComment();

        startsWith = (option.head) ? '`' : '}';

        if (source[index] !== startsWith) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return scanTemplate();
    }

    function scanRegExp() {
        var str = '', ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;

        buffer = null;
        skipComment();

        start = index;
        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = nextChar();

        while (index < length) {
            ch = nextChar();
            str += ch;
            if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '\\') {
                    ch = nextChar();
                    // ECMA-262 7.8.5
                    if (isLineTerminator(ch)) {
                        throwError({}, Messages.UnterminatedRegExp);
                    }
                    str += ch;
                } else if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                } else if (isLineTerminator(ch)) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
            }
        }

        if (!terminated) {
            throwError({}, Messages.UnterminatedRegExp);
        }

        // Exclude leading and trailing slash.
        pattern = str.substr(1, str.length - 2);

        flags = '';
        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }

            ++index;
            if (ch === '\\' && index < length) {
                ch = source[index];
                if (ch === 'u') {
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        flags += ch;
                        str += '\\u';
                        for (; restore < index; ++restore) {
                            str += source[restore];
                        }
                    } else {
                        index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                } else {
                    str += '\\';
                }
            } else {
                flags += ch;
                str += ch;
            }
        }

        try {
            value = new RegExp(pattern, flags);
        } catch (e) {
            throwError({}, Messages.InvalidRegExp);
        }

        return {
            literal: str,
            value: value,
            range: [start, index]
        };
    }

    function isIdentifierName(token) {
        return token.type === Token.Identifier ||
            token.type === Token.Keyword ||
            token.type === Token.BooleanLiteral ||
            token.type === Token.NullLiteral ||
            token.type === Token.AtSymbol;
    }

    function advance() {
        var ch, token;

        skipComment();

        if (index >= length) {
            return {
                type: Token.EOF,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [index, index]
            };
        }

        token = scanPunctuator();
        if (typeof token !== 'undefined') {
            return token;
        }

        ch = source[index];

        if (ch === '\'' || ch === '"') {
            return scanStringLiteral();
        }

        if (ch === '.' || isDecimalDigit(ch)) {
            return scanNumericLiteral();
        }

        if (ch === '`') {
            return scanTemplate();
        }

        token = scanIdentifier();
        if (typeof token !== 'undefined') {
            return token;
        }

        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    function lex() {
        var token;

        if (buffer) {
            index = buffer.range[1];
            lineNumber = buffer.lineNumber;
            lineStart = buffer.lineStart;
            token = buffer;
            buffer = null;
            return token;
        }

        buffer = null;
        return advance();
    }

    function lookahead() {
        var pos, line, start;

        if (buffer !== null) {
            return buffer;
        }

        pos = index;
        line = lineNumber;
        start = lineStart;
        buffer = advance();
        index = pos;
        lineNumber = line;
        lineStart = start;

        return buffer;
    }

    function lookahead2() {
        var adv, pos, line, start, result;

        // If we are collecting the tokens, don't grab the next one yet.
        adv = (typeof extra.advance === 'function') ? extra.advance : advance;

        pos = index;
        line = lineNumber;
        start = lineStart;

        // Scan for the next immediate token.
        if (buffer === null) {
            buffer = adv();
        }
        index = buffer.range[1];
        lineNumber = buffer.lineNumber;
        lineStart = buffer.lineStart;

        // Grab the token right after.
        result = adv();
        index = pos;
        lineNumber = line;
        lineStart = start;

        return result;
    }

    // Return true if there is a line terminator before the next token.

    function peekLineTerminator() {
        var pos, line, start, found;

        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;

        return found;
    }

    // Throw an exception

    function throwError(token, messageFormat) {
        var error,
            args = Array.prototype.slice.call(arguments, 2),
            msg = messageFormat.replace(
                /%(\d)/g,
                function (whole, index) {
                    return args[index] || '';
                }
            );

        if (typeof token.lineNumber === 'number') {
            error = new Error('Line ' + token.lineNumber + ': ' + msg);
            error.index = token.range[0];
            error.lineNumber = token.lineNumber;
            error.column = token.range[0] - lineStart + 1;
        } else {
            error = new Error('Line ' + lineNumber + ': ' + msg);
            error.index = index;
            error.lineNumber = lineNumber;
            error.column = index - lineStart + 1;
        }

        throw error;
    }

    function throwErrorTolerant() {
        try {
            throwError.apply(null, arguments);
        } catch (e) {
            if (extra.errors) {
                extra.errors.push(e);
            } else {
                throw e;
            }
        }
    }


    // Throw an exception because of the token.

    function throwUnexpected(token) {
        if (token.type === Token.EOF) {
            throwError(token, Messages.UnexpectedEOS);
        }

        if (token.type === Token.NumericLiteral) {
            throwError(token, Messages.UnexpectedNumber);
        }

        if (token.type === Token.StringLiteral) {
            throwError(token, Messages.UnexpectedString);
        }

        if (token.type === Token.Identifier) {
            throwError(token, Messages.UnexpectedIdentifier);
        }

        if (token.type === Token.Keyword) {
            if (isFutureReservedWord(token.value)) {
                throwError(token, Messages.UnexpectedReserved);
            } else if (strict && isStrictModeReservedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictReservedWord);
                return;
            }
            throwError(token, Messages.UnexpectedToken, token.value);
        }

        if (token.type === Token.Template) {
            throwError(token, Messages.UnexpectedTemplate, token.value.raw);
        }

        if (token.type === Token.AtSymbol) {
            throwError(token, Messages.UnexpectedIdentifier);
        }

        // BooleanLiteral, NullLiteral, or Punctuator.
        throwError(token, Messages.UnexpectedToken, token.value);
    }

    // Expect the next token to match the specified punctuator.
    // If not, an exception will be thrown.

    function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpected(token);
        }
    }

    // Expect the next token to match the specified keyword.
    // If not, an exception will be thrown.

    function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpected(token);
        }
    }

    // Return true if the next token matches the specified punctuator.

    function match(value) {
        var token = lookahead();
        return token.type === Token.Punctuator && token.value === value;
    }

    // Return true if the next token matches the specified keyword

    function matchKeyword(keyword) {
        var token = lookahead();
        return token.type === Token.Keyword && token.value === keyword;
    }


    // Return true if the next token matches the specified contextual keyword

    function matchContextualKeyword(keyword) {
        var token = lookahead();
        return token.value === keyword && token.type === Token.Identifier || token.type === Token.AtSymbol;
    }

    // Return true if the next token is an assignment operator

    function matchAssign() {
        var token = lookahead(),
            op = token.value;

        if (token.type !== Token.Punctuator) {
            return false;
        }
        return op === '=' ||
            op === '*=' ||
            op === '/=' ||
            op === '%=' ||
            op === '+=' ||
            op === '-=' ||
            op === '<<=' ||
            op === '>>=' ||
            op === '>>>=' ||
            op === '&=' ||
            op === '^=' ||
            op === '|=';
    }

    function consumeSemicolon() {
        var token, line;

        // Catch the very common case first.
        if (source[index] === ';') {
            lex();
            return;
        }

        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
            return;
        }

        if (match(';')) {
            lex();
            return;
        }

        token = lookahead();
        if (token.type !== Token.EOF && !match('}')) {
            throwUnexpected(token);
        }
        return;
    }

    // Return true if provided expression is LeftHandSideExpression

    function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
    }

    function isAssignableLeftHandSide(expr) {
        return isLeftHandSide(expr) || expr.type === Syntax.ObjectPattern || expr.type === Syntax.ArrayPattern;
    }

    // 11.1.4 Array Initialiser

    function parseArrayInitialiser() {
        var elements = [], blocks = [], filter = null, token, tmp, possiblecomprehension = true, body;

        expect('[');
        while (!match(']')) {
            token = lookahead();
            switch (token.value) {
            case 'for':
                if (!possiblecomprehension) {
                    throwError({}, Messages.ComprehensionError);
                }
                matchKeyword('for');
                tmp = parseForStatement({ignore_body: true});
                tmp.of = tmp.type === Syntax.ForOfStatement;
                tmp.type = Syntax.ComprehensionBlock;
                if (tmp.left.kind) { // can't be let or const
                    throwError({}, Messages.ComprehensionError);
                }
                blocks.push(tmp);
                break;
            case 'if':
                if (!possiblecomprehension) {
                    throwError({}, Messages.ComprehensionError);
                }
                expectKeyword('if');
                expect('(');
                filter = parseExpression();
                expect(')');
                break;
            case ',':
                possiblecomprehension = false; // no longer allowed.
                lex();
                elements.push(null);
                break;
            default:
                tmp = parseSpreadOrAssignmentExpression();
                elements.push(tmp);
                if (tmp && tmp.type === Syntax.SpreadElement) {
                    if (!match(']')) {
                        throwError({}, Messages.ElementAfterSpreadElement);
                    }
                } else if (!(match(']') || matchKeyword('for') || matchKeyword('if'))) {
                    expect(','); // this lexes.
                    possiblecomprehension = false;
                }
            }
        }

        expect(']');

        if (filter && !blocks.length) {
            throwError({}, Messages.ComprehensionRequiresBlock);
        }

        if (blocks.length) {
            if (elements.length !== 1) {
                throwError({}, Messages.ComprehensionError);
            }
            return {
                type:  Syntax.ComprehensionExpression,
                filter: filter,
                blocks: blocks,
                body: elements[0]
            };
        } else {
            return {
                type: Syntax.ArrayExpression,
                elements: elements
            };
        }
    }

    // 11.1.5 Object Initialiser

    function parsePropertyFunction(options) {
        var previousStrict, previousYieldAllowed, params, body;

        previousStrict = strict;
        previousYieldAllowed = yieldAllowed;
        yieldAllowed = options.generator;
        params = options.params || [];

        body = parseConciseBody();
        if (options.name && strict && isRestrictedWord(params[0].name)) {
            throwErrorTolerant(options.name, Messages.StrictParamName);
        }
        if (yieldAllowed && !yieldFound) {
            throwError({}, Messages.NoYieldInGenerator);
        }
        strict = previousStrict;
        yieldAllowed = previousYieldAllowed;

        return {
            type: Syntax.FunctionExpression,
            id: null,
            params: params,
            defaults: [],
            body: body,
            rest: options.rest || null,
            generator: options.generator,
            expression: body.type !== Syntax.BlockStatement
        };
    }


    function parsePropertyMethodFunction(options) {
        var token, previousStrict, tmp, method, firstRestricted, message;

        previousStrict = strict;
        strict = true;

        tmp = parseParams();

        if (tmp.firstRestricted) {
            throwError(tmp.firstRestricted, tmp.message);
        }
        if (tmp.stricted) {
            throwErrorTolerant(tmp.stricted, tmp.message);
        }


        method = parsePropertyFunction({
            params: tmp.params,
            rest: tmp.rest,
            generator: options.generator
        });

        strict = previousStrict;

        return method;
    }


    function parseObjectPropertyKey() {
        var token = lex();

        // Note: This function is called only from parseObjectProperty(), where
        // EOF and Punctuator tokens are already filtered out.

        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(token);
        }

        if (token.type === Token.AtSymbol) {
            return {
                type: Syntax.AtSymbol,
                name: token.value
            };
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseObjectProperty() {
        var token, key, id, param;

        token = lookahead();

        if (token.type === Token.Identifier || token.type === Token.AtSymbol) {

            id = parseObjectPropertyKey();

            // Property Assignment: Getter and Setter.

            if (token.value === 'get' && !(match(':') || match('('))) {
                key = parseObjectPropertyKey();
                expect('(');
                expect(')');
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parsePropertyFunction({ generator: false }),
                    kind: 'get'
                };
            } else if (token.value === 'set' && !(match(':') || match('('))) {
                key = parseObjectPropertyKey();
                expect('(');
                token = lookahead();
                param = [ parseVariableIdentifier() ];
                expect(')');
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parsePropertyFunction({ params: param, generator: false, name: token }),
                    kind: 'set'
                };
            } else {
                if (match(':')) {
                    lex();
                    return {
                        type: Syntax.Property,
                        key: id,
                        value: parseAssignmentExpression(),
                        kind: 'init'
                    };
                } else if (match('(')) {
                    return {
                        type: Syntax.Property,
                        key: id,
                        value: parsePropertyMethodFunction({ generator: false }),
                        kind: 'init',
                        method: true
                    };
                } else {
                    return {
                        type: Syntax.Property,
                        key: id,
                        value: id,
                        kind: 'init',
                        shorthand: true
                    };
                }
            }
        } else if (token.type === Token.EOF || token.type === Token.Punctuator) {
            if (!match('*')) {
                throwUnexpected(token);
            }
            lex();

            id = parseObjectPropertyKey();

            if (!match('(')) {
                throwUnexpected(lex());
            }

            return {
                type: Syntax.Property,
                key: id,
                value: parsePropertyMethodFunction({ generator: true }),
                kind: 'init',
                method: true
            };
        } else {
            key = parseObjectPropertyKey();
            if (match(':')) {
                lex();
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parseAssignmentExpression(),
                    kind: 'init'
                };
            } else if (match('(')) {
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parsePropertyMethodFunction({ generator: false }),
                    kind: 'init',
                    method: true
                };
            }
            throwUnexpected(lex());
        }
    }

    function parseObjectInitialiser() {
        var properties = [], property, name, kind, map = {}, toString = String;

        expect('{');

        while (!match('}')) {
            property = parseObjectProperty();

            if (property.key.type === Syntax.Identifier || property.key.type === Syntax.AtSymbol) {
                name = property.key.name;
            } else {
                name = toString(property.key.value);
            }
            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;
            if (Object.prototype.hasOwnProperty.call(map, name)) {
                if (map[name] === PropertyKind.Data) {
                    if (strict && kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    } else if (map[name] & kind) {
                        throwErrorTolerant({}, Messages.AccessorGetSet);
                    }
                }
                map[name] |= kind;
            } else {
                map[name] = kind;
            }

            properties.push(property);

            if (!match('}')) {
                expect(',');
            }
        }

        expect('}');

        return {
            type: Syntax.ObjectExpression,
            properties: properties
        };
    }

    function parseTemplateElement(option) {
        var token = scanTemplateElement(option);
        if (strict && token.octal) {
            throwError(token, Messages.StrictOctalLiteral);
        }
        return {
            type: Syntax.TemplateElement,
            value: {
                raw: token.value.raw,
                cooked: token.value.cooked
            },
            tail: token.tail
        };
    }

    function parseTemplateLiteral() {
        var quasi, quasis, expressions;

        quasi = parseTemplateElement({ head: true });
        quasis = [ quasi ];
        expressions = [];

        while (!quasi.tail) {
            expressions.push(parseExpression());
            quasi = parseTemplateElement({ head: false });
            quasis.push(quasi);
        }

        return {
            type: Syntax.TemplateLiteral,
            quasis: quasis,
            expressions: expressions
        };
    }

    // 11.1.6 The Grouping Operator

    function parseGroupExpression() {
        var expr;

        expect('(');

        ++state.parenthesizedCount;

        state.allowArrowFunction = !state.allowArrowFunction;
        expr = parseExpression();
        state.allowArrowFunction = false;

        if (expr.type !== Syntax.ArrowFunctionExpression) {
            expect(')');
        }

        return expr;
    }


    // 11.1 Primary Expressions

    function parsePrimaryExpression() {
        var expr,
            token = lookahead(),
            type = token.type;

        if (type === Token.Identifier) {
            return {
                type: Syntax.Identifier,
                name: lex().value
            };
        }

        if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(lex());
        }

        if (type === Token.Keyword) {
            if (matchKeyword('this')) {
                lex();
                return {
                    type: Syntax.ThisExpression
                };
            }

            if (matchKeyword('function')) {
                return parseFunctionExpression();
            }

            if (matchKeyword('class')) {
                return parseClassExpression();
            }

            if (matchKeyword('super')) {
                lex();
                return {
                    type: Syntax.Identifier,
                    name: 'super'
                };
            }
        }

        if (type === Token.BooleanLiteral) {
            lex();
            token.value = (token.value === 'true');
            return createLiteral(token);
        }

        if (type === Token.NullLiteral) {
            lex();
            token.value = null;
            return createLiteral(token);
        }

        if (match('[')) {
            return parseArrayInitialiser();
        }

        if (match('{')) {
            return parseObjectInitialiser();
        }

        if (match('(')) {
            return parseGroupExpression();
        }

        if (match('/') || match('/=')) {
            return createLiteral(scanRegExp());
        }

        if (type === Token.Template) {
            return parseTemplateLiteral();
        }

        if (type === Token.AtSymbol) {
            return {
                type: Syntax.AtSymbol,
                name: lex().value
            };
        }

        return throwUnexpected(lex());
    }

    // 11.2 Left-Hand-Side Expressions

    function parseArguments() {
        var args = [], arg;

        expect('(');

        if (!match(')')) {
            while (index < length) {
                arg = parseSpreadOrAssignmentExpression();
                args.push(arg);

                if (match(')')) {
                    break;
                } else if (arg.type === Syntax.SpreadElement) {
                    throwError({}, Messages.ElementAfterSpreadElement);
                }

                expect(',');
            }
        }

        expect(')');

        return args;
    }

    function parseSpreadOrAssignmentExpression() {
        if (match('...')) {
            lex();
            return {
                type: Syntax.SpreadElement,
                argument: parseAssignmentExpression()
            };
        } else {
            return parseAssignmentExpression();
        }
    }

    function parseNonComputedProperty() {
        var token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpected(token);
        }

        if (token.type === Token.AtSymbol) {
            return {
                type: Syntax.AtSymbol,
                name: token.value
            };
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseNonComputedMember() {
        expect('.');

        return parseNonComputedProperty();
    }

    function parseComputedMember() {
        var expr;

        expect('[');

        expr = parseExpression();

        expect(']');

        return expr;
    }

    function parseNewExpression() {
        var expr;

        expectKeyword('new');

        expr = {
            type: Syntax.NewExpression,
            callee: parseLeftHandSideExpression(),
            'arguments': []
        };

        if (match('(')) {
            expr['arguments'] = parseArguments();
        }

        return expr;
    }

    function parseLeftHandSideExpressionAllowCall() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(') || lookahead().type === Token.Template) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else if (match('.')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.TaggedTemplateExpression,
                    tag: expr,
                    quasi: parseTemplateLiteral()
                };
            }
        }

        return expr;
    }


    function parseLeftHandSideExpression() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || lookahead().type === Token.Template) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else if (match('.')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.TaggedTemplateExpression,
                    tag: expr,
                    quasi: parseTemplateLiteral()
                };
            }
        }

        return expr;
    }

    // 11.3 Postfix Expressions

    function parsePostfixExpression() {
        var expr = parseLeftHandSideExpressionAllowCall(),
            token = lookahead();

        if (token.type !== Token.Punctuator) {
            return expr;
        }

        if ((match('++') || match('--')) && !peekLineTerminator()) {
            // 11.3.1, 11.3.2
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPostfix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: lex().value,
                argument: expr,
                prefix: false
            };
        }

        return expr;
    }

    // 11.4 Unary Operators

    function parseUnaryExpression() {
        var token, expr;

        token = lookahead();
        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return parsePostfixExpression();
        }

        if (match('++') || match('--')) {
            token = lex();
            expr = parseUnaryExpression();
            // 11.4.4, 11.4.5
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPrefix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: token.value,
                argument: expr,
                prefix: true
            };
            return expr;
        }

        if (match('+') || match('-') || match('~') || match('!')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression()
            };
            return expr;
        }

        if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression()
            };
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                throwErrorTolerant({}, Messages.StrictDelete);
            }
            return expr;
        }

        return parsePostfixExpression();
    }

    // 11.5 Multiplicative Operators

    function parseMultiplicativeExpression() {
        var expr = parseUnaryExpression();

        while (match('*') || match('/') || match('%')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseUnaryExpression()
            };
        }

        return expr;
    }

    // 11.6 Additive Operators

    function parseAdditiveExpression() {
        var expr = parseMultiplicativeExpression();

        while (match('+') || match('-')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseMultiplicativeExpression()
            };
        }

        return expr;
    }

    // 11.7 Bitwise Shift Operators

    function parseShiftExpression() {
        var expr = parseAdditiveExpression();

        while (match('<<') || match('>>') || match('>>>')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseAdditiveExpression()
            };
        }

        return expr;
    }
    // 11.8 Relational Operators

    function parseRelationalExpression() {
        var expr, previousAllowIn;

        previousAllowIn = state.allowIn;
        state.allowIn = true;

        expr = parseShiftExpression();

        while (match('<') || match('>') || match('<=') || match('>=') || (previousAllowIn && matchKeyword('in')) || matchKeyword('instanceof')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseShiftExpression()
            };
        }

        state.allowIn = previousAllowIn;
        return expr;
    }

    // 11.9 Equality Operators

    function parseEqualityExpression() {
        var expr = parseRelationalExpression();

        while ((!peekLineTerminator() && (matchContextualKeyword('is') || matchContextualKeyword('isnt'))) || match('==') || match('!=') || match('===') || match('!==')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseRelationalExpression()
            };
        }

        return expr;
    }

    // 11.10 Binary Bitwise Operators

    function parseBitwiseANDExpression() {
        var expr = parseEqualityExpression();

        while (match('&')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '&',
                left: expr,
                right: parseEqualityExpression()
            };
        }

        return expr;
    }

    function parseBitwiseXORExpression() {
        var expr = parseBitwiseANDExpression();

        while (match('^')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '^',
                left: expr,
                right: parseBitwiseANDExpression()
            };
        }

        return expr;
    }

    function parseBitwiseORExpression() {
        var expr = parseBitwiseXORExpression();

        while (match('|')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '|',
                left: expr,
                right: parseBitwiseXORExpression()
            };
        }

        return expr;
    }

    // 11.11 Binary Logical Operators

    function parseLogicalANDExpression() {
        var expr = parseBitwiseORExpression();

        while (match('&&')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '&&',
                left: expr,
                right: parseBitwiseORExpression()
            };
        }

        return expr;
    }

    function parseLogicalORExpression() {
        var expr = parseLogicalANDExpression();

        while (match('||')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '||',
                left: expr,
                right: parseLogicalANDExpression()
            };
        }

        return expr;
    }

    // 11.12 Conditional Operator

    function parseConditionalExpression() {
        var expr, previousAllowIn, consequent;

        expr = parseLogicalORExpression();

        if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = parseAssignmentExpression();
            state.allowIn = previousAllowIn;
            expect(':');

            expr = {
                type: Syntax.ConditionalExpression,
                test: expr,
                consequent: consequent,
                alternate: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.13 Assignment Operators

    function reinterpretAsAssignmentBindingPattern(expr) {
        var i, len, property, element;

        if (expr.type === Syntax.ObjectExpression) {
            expr.type = Syntax.ObjectPattern;
            for (i = 0, len = expr.properties.length; i < len; i += 1) {
                property = expr.properties[i];
                if (property.kind !== 'init') {
                    throwError({}, Messages.InvalidLHSInAssignment);
                }
                reinterpretAsAssignmentBindingPattern(property.value);
            }
        } else if (expr.type === Syntax.ArrayExpression) {
            expr.type = Syntax.ArrayPattern;
            for (i = 0, len = expr.elements.length; i < len; i += 1) {
                element = expr.elements[i];
                if (element) {
                    reinterpretAsAssignmentBindingPattern(element);
                }
            }
        } else if (expr.type === Syntax.Identifier) {
            if (isRestrictedWord(expr.name)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }
        } else if (expr.type === Syntax.SpreadElement) {
            reinterpretAsAssignmentBindingPattern(expr.argument);
            if (expr.argument.type === Syntax.ObjectPattern) {
                throwError({}, Messages.ObjectPatternAsSpread);
            }
        } else {
            if (expr.type !== Syntax.MemberExpression && expr.type !== Syntax.CallExpression && expr.type !== Syntax.NewExpression) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }
        }
    }


    function reinterpretAsDestructuredParameter(options, expr) {
        var i, len, property, element;

        if (expr.type === Syntax.ObjectExpression) {
            expr.type = Syntax.ObjectPattern;
            for (i = 0, len = expr.properties.length; i < len; i += 1) {
                property = expr.properties[i];
                if (property.kind !== 'init') {
                    throwError({}, Messages.InvalidLHSInFormalsList);
                }
                reinterpretAsDestructuredParameter(options, property.value);
            }
        } else if (expr.type === Syntax.ArrayExpression) {
            expr.type = Syntax.ArrayPattern;
            for (i = 0, len = expr.elements.length; i < len; i += 1) {
                element = expr.elements[i];
                if (element) {
                    reinterpretAsDestructuredParameter(options, element);
                }
            }
        } else if (expr.type === Syntax.Identifier) {
            validateParam(options, expr, expr.name);
        } else {
            if (expr.type !== Syntax.MemberExpression) {
                throwError({}, Messages.InvalidLHSInFormalsList);
            }
        }
    }

    function reinterpretAsCoverFormalsList(expressions) {
        var i, len, param, params, options, rest;

        params = [];
        rest = null;
        options = {
            paramSet: {}
        };

        for (i = 0, len = expressions.length; i < len; i += 1) {
            param = expressions[i];
            if (param.type === Syntax.Identifier) {
                params.push(param);
                validateParam(options, param, param.name);
            } else if (param.type === Syntax.ObjectExpression || param.type === Syntax.ArrayExpression) {
                reinterpretAsDestructuredParameter(options, param);
                params.push(param);
            } else if (param.type === Syntax.SpreadElement) {
                if (i !== len - 1) {
                    throwError({}, Messages.ParameterAfterRestParameter);
                }
                reinterpretAsDestructuredParameter(options, param.argument);
                rest = param.argument;
            } else {
                return null;
            }
        }

        if (options.firstRestricted) {
            throwError(options.firstRestricted, options.message);
        }
        if (options.stricted) {
            throwErrorTolerant(options.stricted, options.message);
        }

        return { params: params, rest: rest };
    }

    function parseArrowFunctionExpression(options) {
        var previousStrict, previousYieldAllowed, body;

        expect('=>');

        previousStrict = strict;
        previousYieldAllowed = yieldAllowed;
        strict = true;
        yieldAllowed = false;
        body = parseConciseBody();
        strict = previousStrict;
        yieldAllowed = previousYieldAllowed;

        return {
            type: Syntax.ArrowFunctionExpression,
            id: null,
            params: options.params,
            defaults: [],
            body: body,
            rest: options.rest,
            generator: false,
            expression: body.type !== Syntax.BlockStatement
        };
    }

    function parseAssignmentExpression() {
        var expr, token, params, oldParenthesizedCount, coverFormalsList;

        if (matchKeyword('yield')) {
            return parseYieldExpression();
        }

        oldParenthesizedCount = state.parenthesizedCount;

        if (match('(')) {
            token = lookahead2();
            if (token.type === Token.Punctuator && token.value === ')' || token.value === '...') {
                params = parseParams();
                if (!match('=>')) {
                    throwUnexpected(lex());
                }
                return parseArrowFunctionExpression(params);
            }
        }

        token = lookahead();
        expr = parseConditionalExpression();

        if (match('=>') && expr.type === Syntax.Identifier) {
            if (state.parenthesizedCount === oldParenthesizedCount || state.parenthesizedCount === (oldParenthesizedCount + 1)) {
                if (isRestrictedWord(expr.name)) {
                    throwError({}, Messages.StrictParamName);
                }
                return parseArrowFunctionExpression({ params: [ expr ], rest: null });
            }
        }

        if (matchAssign()) {
            // 11.13.1
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant(token, Messages.StrictLHSAssignment);
            }

            // ES.next draf 11.13 Runtime Semantics step 1
            if (match('=') && (expr.type === Syntax.ObjectExpression || expr.type === Syntax.ArrayExpression)) {
                reinterpretAsAssignmentBindingPattern(expr);
            } else if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.AssignmentExpression,
                operator: lex().value,
                left: expr,
                right: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.14 Comma Operator

    function parseExpression() {
        var expr, sequence, coverFormalsList, spreadFound, token;

        expr = parseAssignmentExpression();

        if (match(',')) {
            sequence = {
                type: Syntax.SequenceExpression,
                expressions: [ expr ]
            };

            while (index < length) {
                if (!match(',')) {
                    break;
                }

                lex();
                expr = parseSpreadOrAssignmentExpression();
                sequence.expressions.push(expr);

                if (expr.type === Syntax.SpreadElement) {
                    spreadFound = true;
                    if (!match(')')) {
                        throwError({}, Messages.ElementAfterSpreadElement);
                    }
                    break;
                }
            }
        }

        if (state.allowArrowFunction && match(')')) {
            token = lookahead2();
            if (token.value === '=>') {
                lex();

                state.allowArrowFunction = false;
                expr = sequence ? sequence.expressions : [ expr ];
                coverFormalsList = reinterpretAsCoverFormalsList(expr);
                if (coverFormalsList) {
                    return parseArrowFunctionExpression(coverFormalsList);
                }

                throwUnexpected(token);
            }
        }

        if (spreadFound) {
            throwError({}, Messages.IllegalSpread);
        }

        return sequence || expr;
    }

    // 12.1 Block

    function parseStatementList() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseBlock() {
        var block;

        expect('{');

        block = parseStatementList();

        expect('}');

        return {
            type: Syntax.BlockStatement,
            body: block
        };
    }

    // 12.2 Variable Statement

    function parseVariableIdentifier() {
        var token = lex();

        if (token.type !== Token.Identifier) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }


    function parseVariableDeclaration(kind) {
        var id,
            init = null;
        if (match('{')) {
            id = parseObjectInitialiser();
            reinterpretAsAssignmentBindingPattern(id);
        } else if (match('[')) {
            id = parseArrayInitialiser();
            reinterpretAsAssignmentBindingPattern(id);
        } else {
            id = parseVariableIdentifier();
            // 12.2.1
            if (strict && isRestrictedWord(id.name)) {
                throwErrorTolerant({}, Messages.StrictVarName);
            }
        }

        if (kind === 'const') {
            if (!match('=')) {
                throwError({}, Messages.NoUnintializedConst);
            }
            expect('=');
            init = parseAssignmentExpression();
        } else if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return {
            type: Syntax.VariableDeclarator,
            id: id,
            init: init
        };
    }

    function parseVariableDeclarationList(kind) {
        var list = [];

        while (index < length) {
            list.push(parseVariableDeclaration(kind));
            if (!match(',')) {
                break;
            }
            lex();
        }

        return list;
    }

    function parseVariableStatement() {
        var declarations;

        expectKeyword('var');

        declarations = parseVariableDeclarationList();

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: 'var'
        };
    }

    // kind may be `const` or `let`
    // Both are experimental and not in the specification yet.
    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
    function parseConstLetDeclaration(kind) {
        var declarations;

        expectKeyword(kind);

        declarations = parseVariableDeclarationList(kind);

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: kind
        };
    }


    function parseAtSymbol() {
        var token = lex();

        if (token.type !== Token.AtSymbol) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.AtSymbol,
            name: token.value
        };
    }

    function parsePrivateStatement() {
        var declarations;

        expectKeyword('private');

        declarations = parseSymbolDeclarationList();

        consumeSemicolon();

        return {
            type: Syntax.SymbolDeclaration,
            declarations: declarations,
            kind: 'private'
        };
    }

    function parseSymbolStatement() {
        var declarations;

        matchContextualKeyword('symbol');
        lex();


        declarations = parseSymbolDeclarationList();

        consumeSemicolon();

        return {
            type: Syntax.SymbolDeclaration,
            declarations: declarations,
            kind: 'symbol'
        };
    }

    function parseSymbolDeclarationList() {
        var list = [];

        while (index < length) {
            list.push(parseSymbolDeclaration());
            if (!match(',')) {
                break;
            }
            lex();
        }

        return list;
    }

    function parseSymbolDeclaration() {
        var id, init = null;

        id = parseAtSymbol();

        if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return {
            type: Syntax.SymbolDeclarator,
            id: id,
            init: init
        };
    }


    // http://wiki.ecmascript.org/doku.php?id=harmony:modules

    function parsePath() {
        var result, id;

        result = {
            type: Syntax.Path,
            body: []
        };

        while (true) {
            id = parseVariableIdentifier();
            result.body.push(id);
            if (!match('.')) {
                break;
            }
            lex();
        }

        return result;
    }

    function parseGlob() {
        expect('*');
        return {
            type: Syntax.Glob
        };
    }

    function parseModuleDeclaration() {
        var id, token, declaration;

        lex();

        id = parseVariableIdentifier();

        if (match('{')) {
            return {
                type: Syntax.ModuleDeclaration,
                id: id,
                body: parseModuleBlock()
            };
        }

        expect('=');

        token = lookahead();
        if (token.type === Token.StringLiteral) {
            declaration = {
                type: Syntax.ModuleDeclaration,
                id: id,
                from: parsePrimaryExpression()
            };
        } else {
            declaration = {
                type: Syntax.ModuleDeclaration,
                id: id,
                from: parsePath()
            };
        }

        consumeSemicolon();

        return declaration;
    }

    function parseExportSpecifierSetProperty() {
        var specifier;

        specifier = {
            type: Syntax.ExportSpecifier,
            id: parseVariableIdentifier(),
            from: null
        };

        if (match(':')) {
            lex();
            specifier.from = parsePath();
        }

        return specifier;
    }

    function parseExportSpecifier() {
        var specifier, specifiers;

        if (match('{')) {
            lex();
            specifiers = [];

            do {
                specifiers.push(parseExportSpecifierSetProperty());
            } while (match(',') && lex());

            expect('}');

            return {
                type: Syntax.ExportSpecifierSet,
                specifiers: specifiers
            };
        }

        if (match('*')) {
            specifier = {
                type: Syntax.ExportSpecifier,
                id: parseGlob(),
                from: null
            };

            if (matchContextualKeyword('from')) {
                lex();
                specifier.from = parsePath();
            }
        } else {
            specifier = {
                type: Syntax.ExportSpecifier,
                id: parseVariableIdentifier(),
                from: null
            };
        }
        return specifier;
    }

    function parseExportDeclaration() {
        var token, specifiers;

        expectKeyword('export');

        token = lookahead();

        if (token.type === Token.Keyword || (token.type === Token.Identifier && token.value === 'module')) {
            switch (token.value) {
            case 'function':
                return {
                    type: Syntax.ExportDeclaration,
                    declaration: parseFunctionDeclaration()
                };
            case 'module':
                return {
                    type: Syntax.ExportDeclaration,
                    declaration: parseModuleDeclaration()
                };
            case 'let':
            case 'const':
                return {
                    type: Syntax.ExportDeclaration,
                    declaration: parseConstLetDeclaration(token.value)
                };
            case 'var':
                return {
                    type: Syntax.ExportDeclaration,
                    declaration: parseStatement()
                };
            case 'class':
                return {
                    type: Syntax.ExportDeclaration,
                    declaration: parseClassDeclaration()
                };
            }
            throwUnexpected(lex());
        }

        specifiers = [ parseExportSpecifier() ];
        if (match(',')) {
            while (index < length) {
                if (!match(',')) {
                    break;
                }
                lex();
                specifiers.push(parseExportSpecifier());
            }
        }

        consumeSemicolon();

        return {
            type: Syntax.ExportDeclaration,
            specifiers: specifiers
        };
    }

    function parseImportDeclaration() {
        var specifiers, from;

        expectKeyword('import');

        if (match('*')) {
            specifiers = [parseGlob()];
        } else if (match('{')) {
            lex();
            specifiers = [];

            do {
                specifiers.push(parseImportSpecifier());
            } while (match(',') && lex());

            expect('}');
        } else {
            specifiers = [parseVariableIdentifier()];
        }

        if (!matchContextualKeyword('from')) {
            throwError({}, Messages.NoFromAfterImport);
        }

        lex();

        if (lookahead().type === Token.StringLiteral) {
            from = parsePrimaryExpression();
        } else {
            from = parsePath();
        }

        consumeSemicolon();

        return {
            type: Syntax.ImportDeclaration,
            specifiers: specifiers,
            from: from
        };
    }

    function parseImportSpecifier() {
        var specifier;

        specifier = {
            type: Syntax.ImportSpecifier,
            id: parseVariableIdentifier(),
            from: null
        };

        if (match(':')) {
            lex();
            specifier.from = parsePath();
        }

        return specifier;
    }

    // 12.3 Empty Statement

    function parseEmptyStatement() {
        expect(';');

        return {
            type: Syntax.EmptyStatement
        };
    }

    // 12.4 Expression Statement

    function parseExpressionStatement() {
        var expr = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 12.5 If statement

    function parseIfStatement() {
        var test, consequent, alternate;

        expectKeyword('if');

        expect('(');

        test = parseExpression();

        expect(')');

        consequent = parseStatement();

        if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
        } else {
            alternate = null;
        }

        return {
            type: Syntax.IfStatement,
            test: test,
            consequent: consequent,
            alternate: alternate
        };
    }

    // 12.6 Iteration Statements

    function parseDoWhileStatement() {
        var body, test, oldInIteration;

        expectKeyword('do');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        if (match(';')) {
            lex();
        }

        return {
            type: Syntax.DoWhileStatement,
            body: body,
            test: test
        };
    }

    function parseWhileStatement() {
        var test, body, oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return {
            type: Syntax.WhileStatement,
            test: test,
            body: body
        };
    }

    function parseForVariableDeclaration() {
        var token = lex();

        return {
            type: Syntax.VariableDeclaration,
            declarations: parseVariableDeclarationList(),
            kind: token.value
        };
    }

    function parseForStatement(opts) {
        var init, test, update, left, right, body, operator, oldInIteration;
        init = test = update = null;
        expectKeyword('for');

        // http://wiki.ecmascript.org/doku.php?id=proposals:iterators_and_generators&s=each
        if (matchContextualKeyword("each")) {
            lex();//throwError({}, Messages.EachNotAllowed);
        }

        expect('(');

        if (match(';')) {
            lex();
        } else {
            if (matchKeyword('var') || matchKeyword('let') || matchKeyword('const')) {
                state.allowIn = false;
                init = parseForVariableDeclaration();
                state.allowIn = true;

                if (init.declarations.length === 1) {
                    if (matchKeyword('in') || matchContextualKeyword('of')) {
                        operator = lookahead();
                        if (!((operator.value === 'in' || init.kind !== 'var') && init.declarations[0].init)) {
                            lex();
                            left = init;
                            right = parseExpression();
                            init = null;
                        }
                    }
                }
            } else {
                state.allowIn = false;
                init = parseExpression();
                state.allowIn = true;

                if (matchContextualKeyword('of')) {
                    operator = lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                } else if (matchKeyword('in')) {
                    // LeftHandSideExpression
                    if (!isAssignableLeftHandSide(init)) {
                        throwError({}, Messages.InvalidLHSInForIn);
                    }
                    operator = lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            }

            if (typeof left === 'undefined') {
                expect(';');
            }
        }

        if (typeof left === 'undefined') {

            if (!match(';')) {
                test = parseExpression();
            }
            expect(';');

            if (!match(')')) {
                update = parseExpression();
            }
        }

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        if (!(opts !== undefined && opts.ignore_body)) {
            body = parseStatement();
        }

        state.inIteration = oldInIteration;

        if (typeof left === 'undefined') {
            return {
                type: Syntax.ForStatement,
                init: init,
                test: test,
                update: update,
                body: body
            };
        }

        if (operator.value === 'in') {
            return {
                type: Syntax.ForInStatement,
                left: left,
                right: right,
                body: body,
                each: false
            };
        } else {
            return {
                type: Syntax.ForOfStatement,
                left: left,
                right: right,
                body: body
            };
        }
    }

    // 12.7 The continue statement

    function parseContinueStatement() {
        var token, label = null;

        expectKeyword('continue');

        // Optimize the most common form: 'continue;'.
        if (source[index] === ';') {
            lex();

            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return {
            type: Syntax.ContinueStatement,
            label: label
        };
    }

    // 12.8 The break statement

    function parseBreakStatement() {
        var token, label = null;

        expectKeyword('break');

        // Optimize the most common form: 'break;'.
        if (source[index] === ';') {
            lex();

            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return {
            type: Syntax.BreakStatement,
            label: label
        };
    }

    // 12.9 The return statement

    function parseReturnStatement() {
        var token, argument = null;

        expectKeyword('return');

        if (!state.inFunctionBody) {
            throwErrorTolerant({}, Messages.IllegalReturn);
        }

        // 'return' followed by a space and an identifier is very common.
        if (source[index] === ' ') {
            if (isIdentifierStart(source[index + 1])) {
                argument = parseExpression();
                consumeSemicolon();
                return {
                    type: Syntax.ReturnStatement,
                    argument: argument
                };
            }
        }

        if (peekLineTerminator()) {
            return {
                type: Syntax.ReturnStatement,
                argument: null
            };
        }

        if (!match(';')) {
            token = lookahead();
            if (!match('}') && token.type !== Token.EOF) {
                argument = parseExpression();
            }
        }

        consumeSemicolon();

        return {
            type: Syntax.ReturnStatement,
            argument: argument
        };
    }

    // 12.10 The with statement

    function parseWithStatement() {
        var object, body;

        if (strict) {
            throwErrorTolerant({}, Messages.StrictModeWith);
        }

        expectKeyword('with');

        expect('(');

        object = parseExpression();

        expect(')');

        body = parseStatement();

        return {
            type: Syntax.WithStatement,
            object: object,
            body: body
        };
    }

    // 12.10 The swith statement

    function parseSwitchCase() {
        var test,
            consequent = [],
            statement;

        if (matchKeyword('default')) {
            lex();
            test = null;
        } else {
            expectKeyword('case');
            test = parseExpression();
        }
        expect(':');

        while (index < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            consequent.push(statement);
        }

        return {
            type: Syntax.SwitchCase,
            test: test,
            consequent: consequent
        };
    }

    function parseSwitchStatement() {
        var discriminant, cases, clause, oldInSwitch, defaultFound;

        expectKeyword('switch');

        expect('(');

        discriminant = parseExpression();

        expect(')');

        expect('{');

        if (match('}')) {
            lex();
            return {
                type: Syntax.SwitchStatement,
                discriminant: discriminant
            };
        }

        cases = [];

        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;

        while (index < length) {
            if (match('}')) {
                break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    throwError({}, Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }

        state.inSwitch = oldInSwitch;

        expect('}');

        return {
            type: Syntax.SwitchStatement,
            discriminant: discriminant,
            cases: cases
        };
    }

    // 12.13 The throw statement

    function parseThrowStatement() {
        var argument;

        expectKeyword('throw');

        if (peekLineTerminator()) {
            throwError({}, Messages.NewlineAfterThrow);
        }

        argument = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ThrowStatement,
            argument: argument
        };
    }

    // 12.14 The try statement

    function parseCatchClause() {
        var param;

        expectKeyword('catch');

        expect('(');
        if (!match(')')) {
            param = parseExpression();
            // 12.14.1
            if (strict && param.type === Syntax.Identifier && isRestrictedWord(param.name)) {
                throwErrorTolerant({}, Messages.StrictCatchVariable);
            }
        }
        expect(')');

        return {
            type: Syntax.CatchClause,
            param: param,
            body: parseBlock()
        };
    }

    function parseTryStatement() {
        var block, handlers = [], finalizer = null;

        expectKeyword('try');

        block = parseBlock();

        if (matchKeyword('catch')) {
            handlers.push(parseCatchClause());
        }

        if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
        }

        if (handlers.length === 0 && !finalizer) {
            throwError({}, Messages.NoCatchOrFinally);
        }

        return {
            type: Syntax.TryStatement,
            block: block,
            guardedHandlers: [],
            handlers: handlers,
            finalizer: finalizer
        };
    }

    // 12.15 The debugger statement

    function parseDebuggerStatement() {
        expectKeyword('debugger');

        consumeSemicolon();

        return {
            type: Syntax.DebuggerStatement
        };
    }

    // 12 Statements

    function parseStatement() {
        var token = lookahead(),
            expr,
            labeledBody;

        if (token.type === Token.EOF) {
            throwUnexpected(token);
        }

        if (token.type === Token.Punctuator) {
            switch (token.value) {
            case ';':
                return parseEmptyStatement();
            case '{':
                return parseBlock();
            case '(':
                return parseExpressionStatement();
            default:
                break;
            }
        }


        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'break':
                return parseBreakStatement();
            case 'continue':
                return parseContinueStatement();
            case 'debugger':
                return parseDebuggerStatement();
            case 'do':
                return parseDoWhileStatement();
            case 'for':
                return parseForStatement();
            case 'function':
                return parseFunctionDeclaration();
            case 'class':
                return parseClassDeclaration();
            case 'if':
                return parseIfStatement();
            case 'private':
                return parsePrivateStatement();
            case 'return':
                return parseReturnStatement();
            case 'switch':
                return parseSwitchStatement();
            case 'throw':
                return parseThrowStatement();
            case 'try':
                return parseTryStatement();
            case 'var':
                return parseVariableStatement();
            case 'while':
                return parseWhileStatement();
            case 'with':
                return parseWithStatement();
            default:
                break;
            }
        }

        if (token.type === Token.Identifier && token.value === 'symbol' && lookahead2().type === Token.AtSymbol) {
            return parseSymbolStatement();
        }

        expr = parseExpression();

        // 12.12 Labelled Statements
        if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();

            if (Object.prototype.hasOwnProperty.call(state.labelSet, expr.name)) {
                throwError({}, Messages.Redeclaration, 'Label', expr.name);
            }

            state.labelSet[expr.name] = true;
            labeledBody = parseStatement();
            delete state.labelSet[expr.name];

            return {
                type: Syntax.LabeledStatement,
                label: expr,
                body: labeledBody
            };
        }

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 13 Function Definition

    function parseConciseBody() {
        if (match('{')) {
            return parseFunctionSourceElements();
        } else {
            return parseAssignmentExpression();
        }
    }

    function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted,
            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody, oldParenthesizedCount;

        expect('{');

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;
        oldParenthesizedCount = state.parenthesizedCount;

        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;
        state.parenthesizedCount = 0;

        while (index < length) {
            if (match('}')) {
                break;
            }
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }

        expect('}');

        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;
        state.parenthesizedCount = oldParenthesizedCount;

        return {
            type: Syntax.BlockStatement,
            body: sourceElements
        };
    }


    function validateParam(options, param, name) {
        if (strict) {
            if (isRestrictedWord(name)) {
                options.stricted = param;
                options.message = Messages.StrictParamName;
            }
            if (Object.prototype.hasOwnProperty.call(options.paramSet, name)) {
                options.stricted = param;
                options.message = Messages.StrictParamDupe;
            }
        } else if (!options.firstRestricted) {
            if (isRestrictedWord(name)) {
                options.firstRestricted = param;
                options.message = Messages.StrictParamName;
            } else if (isStrictModeReservedWord(name)) {
                options.firstRestricted = param;
                options.message = Messages.StrictReservedWord;
            } else if (Object.prototype.hasOwnProperty.call(options.paramSet, name)) {
                options.firstRestricted = param;
                options.message = Messages.StrictParamDupe;
            }
        }
        options.paramSet[name] = true;
    }


    function parseParam(options) {
        var token, rest, param;

        token = lookahead();
        if (token.value === '...') {
            token = lex();
            rest = true;
        }

        if (match('[')) {
            param = parseArrayInitialiser();
            reinterpretAsDestructuredParameter(options, param);
        } else if (match('{')) {
            if (rest) {
                throwError({}, Messages.ObjectPatternAsRestParameter);
            }
            param = parseObjectInitialiser();
            reinterpretAsDestructuredParameter(options, param);
        } else {
            param = parseVariableIdentifier();
            validateParam(options, token, token.value);
        }

        if (rest) {
            if (!match(')')) {
                throwError({}, Messages.ParameterAfterRestParameter);
            }
            options.rest = param;
            return false;
        }

        options.params.push(param);
        return !match(')');
    }


    function parseParams(firstRestricted) {
        var options;

        options = {
            params: [],
            rest: null,
            firstRestricted: firstRestricted
        }

        expect('(');

        if (!match(')')) {
            options.paramSet = {};
            while (index < length) {
                if (!parseParam(options)) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return options;
    }


    function parseFunctionDeclaration() {
        var id, body, token, tmp, firstRestricted, message, previousStrict, previousYieldAllowed, generator, expression;

        expectKeyword('function');

        generator = false;
        if (match('*')) {
            lex();
            generator = true;
        }

        token = lookahead();

        id = parseVariableIdentifier();
        if (strict) {
            if (isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        tmp = parseParams(firstRestricted);
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
            message = tmp.message;
        }

        previousStrict = strict;
        previousYieldAllowed = yieldAllowed;
        yieldAllowed = generator;

        // here we redo some work in order to set 'expression'
        expression = !match('{');
        body = parseConciseBody();

        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && tmp.stricted) {
            throwErrorTolerant(tmp.stricted, message);
        }
        if (yieldAllowed && !yieldFound) {
            throwError({}, Messages.NoYieldInGenerator);
        }
        strict = previousStrict;
        yieldAllowed = previousYieldAllowed;

        return {
            type: Syntax.FunctionDeclaration,
            id: id,
            params: tmp.params,
            defaults: [],
            body: body,
            rest: tmp.rest,
            generator: generator,
            expression: expression
        };
    }

    function parseFunctionExpression() {
        var token, id = null, firstRestricted, message, tmp, body, previousStrict, previousYieldAllowed, generator, expression;

        expectKeyword('function');

        generator = false;

        if (match('*')) {
            lex();
            generator = true;
        }

        if (!match('(')) {
            token = lookahead();
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }

        tmp = parseParams(firstRestricted);
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
            message = tmp.message;
        }

        previousStrict = strict;
        previousYieldAllowed = yieldAllowed;
        yieldAllowed = generator;

        // here we redo some work in order to set 'expression'
        expression = !match('{');
        body = parseConciseBody();

        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && tmp.stricted) {
            throwErrorTolerant(tmp.stricted, message);
        }
        if (yieldAllowed && !yieldFound) {
            throwError({}, Messages.NoYieldInGenerator);
        }
        strict = previousStrict;
        yieldAllowed = previousYieldAllowed;


        return {
            type: Syntax.FunctionExpression,
            id: id,
            params: tmp.params,
            defaults: [],
            body: body,
            rest: tmp.rest,
            generator: generator,
            expression: expression
        };
    }

    function parseYieldExpression() {
        var delegate, expr, previousYieldAllowed;

        expectKeyword('yield');

        if (!yieldAllowed) {
            throwErrorTolerant({}, Messages.IllegalYield);
        }

        delegate = false;
        if (match('*')) {
            lex();
            delegate = true;
        }

        // It is a Syntax Error if any AssignmentExpression Contains YieldExpression.
        previousYieldAllowed = yieldAllowed;
        yieldAllowed = false;
        expr = parseAssignmentExpression();
        yieldAllowed = previousYieldAllowed;
        yieldFound = true;

        return {
            type: Syntax.YieldExpression,
            argument: expr,
            delegate: delegate
        };
    }

    // 14 Classes

    function parseMethodDefinition() {
        var token, key, param;

        if (match('*')) {
            lex();
            return {
                type: Syntax.MethodDefinition,
                key: parseObjectPropertyKey(),
                value: parsePropertyMethodFunction({ generator: true }),
                kind: ''
            };
        }

        token = lookahead();
        key = parseObjectPropertyKey();

        if (token.value === 'get' && !match('(')) {
            key = parseObjectPropertyKey();
            expect('(');
            expect(')');
            return {
                type: Syntax.MethodDefinition,
                key: key,
                value: parsePropertyFunction({ generator: false }),
                kind: 'get'
            };
        } else if (token.value === 'set' && !match('(')) {
            key = parseObjectPropertyKey();
            expect('(');
            token = lookahead();
            param = [ parseVariableIdentifier() ];
            expect(')');
            return {
                type: Syntax.MethodDefinition,
                key: key,
                value: parsePropertyFunction({ params: param, generator: false, name: token }),
                kind: 'set'
            };
        } else {
            return {
                type: Syntax.MethodDefinition,
                key: key,
                value: parsePropertyMethodFunction({ generator: false }),
                kind: ''
            };
        }
    }

    function parseClassElement() {
        if (match(';')) {
            lex();
            return;
        } else if (lookahead().value === 'private' && lookahead2().type === Token.AtSymbol) {
            return parsePrivateStatement();
        } else if (lookahead().value === 'symbol' && lookahead2().type === Token.AtSymbol) {
            return parseSymbolStatement();
        } else {
            return parseMethodDefinition();
        }
    }

    function parseClassBody() {
        var classElement, classElements = [];

        expect('{');

        while (index < length) {
            if (match('}')) {
                break;
            }
            classElement = parseClassElement();
            if (typeof classElement !== 'undefined') {
                classElements.push(classElement);
            }
        }

        expect('}');

        return {
            type: Syntax.ClassBody,
            body: classElements
        };
    }

    function parseClassExpression() {
        var id, body, previousYieldAllowed, superClass;

        expectKeyword('class');

        if (!matchKeyword('extends') && !match('{')) {
            id = parseVariableIdentifier();
        }

        if (matchKeyword('extends')) {
            expectKeyword('extends');
            previousYieldAllowed = yieldAllowed;
            yieldAllowed = false;
            superClass = parseAssignmentExpression();
            yieldAllowed = previousYieldAllowed;
        }

        body = parseClassBody();
        return {
            id: id,
            type: Syntax.ClassExpression,
            body: body,
            superClass: superClass
        };
    }

    function parseClassDeclaration() {
        var token, id, body, previousYieldAllowed, superClass;

        expectKeyword('class');

        token = lookahead();
        id = parseVariableIdentifier();

        if (matchKeyword('extends')) {
            expectKeyword('extends');
            previousYieldAllowed = yieldAllowed;
            yieldAllowed = false;
            superClass = parseAssignmentExpression();
            yieldAllowed = previousYieldAllowed;
        }

        body = parseClassBody();
        return {
            id: id,
            type: Syntax.ClassDeclaration,
            body: body,
            superClass: superClass
        };
    }

    // 15 Program

    function parseSourceElement() {
        var token = lookahead();

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'const':
            case 'let':
                return parseConstLetDeclaration(token.value);
            case 'function':
                return parseFunctionDeclaration();
            default:
                return parseStatement();
            }
        }

        if (token.type !== Token.EOF) {
            return parseStatement();
        }
    }

    function parseProgramElement() {
        var token = lookahead(), lineNumber;

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'export':
                return parseExportDeclaration();
            case 'import':
                return parseImportDeclaration();
            }
        }

        if (token.value === 'module' && token.type === Token.Identifier) {
            lineNumber = token.lineNumber;
            token = lookahead2();
            if (token.type === Token.Identifier && token.lineNumber === lineNumber) {
                return parseModuleDeclaration();
            }
        }

        return parseSourceElement();
    }

    function parseProgramElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseProgramElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        while (index < length) {
            sourceElement = parseProgramElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }
        return sourceElements;
    }

    function parseModuleElement() {
        return parseProgramElement();
    }

    function parseModuleElements() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseModuleElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseModuleBlock() {
        var block;

        expect('{');

        block = parseModuleElements();

        expect('}');

        return {
            type: Syntax.BlockStatement,
            body: block
        };
    }

    function parseProgram() {
        var program;
        strict = false;
        yieldAllowed = false;
        yieldFound = false;
        program = {
            type: Syntax.Program,
            body: parseProgramElements()
        };
        return program;
    }

    // The following functions are needed only when the option to preserve
    // the comments is active.

    function addComment(type, value, start, end, loc) {
        assert(typeof start === 'number', 'Comment must have valid position');

        // Because the way the actual token is scanned, often the comments
        // (if any) are skipped twice during the lexical analysis.
        // Thus, we need to skip adding a comment if the comment array already
        // handled it.
        if (extra.comments.length > 0) {
            if (extra.comments[extra.comments.length - 1].range[1] > start) {
                return;
            }
        }

        extra.comments.push({
            type: type,
            value: value,
            range: [start, end],
            loc: loc
        });
    }

    function scanComment() {
        var comment, ch, loc, start, blockComment, lineComment;

        comment = '';
        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = nextChar();
                if (isLineTerminator(ch)) {
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart - 1
                    };
                    lineComment = false;
                    addComment('Line', comment, start, index - 1, loc);
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                    comment = '';
                } else if (index >= length) {
                    lineComment = false;
                    comment += ch;
                    loc.end = {
                        line: lineNumber,
                        column: length - lineStart
                    };
                    addComment('Line', comment, start, length, loc);
                } else {
                    comment += ch;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                        comment += '\r\n';
                    } else {
                        comment += ch;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = nextChar();
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    comment += ch;
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            comment = comment.substr(0, comment.length - 1);
                            blockComment = false;
                            ++index;
                            loc.end = {
                                line: lineNumber,
                                column: index - lineStart
                            };
                            addComment('Block', comment, start, index, loc);
                            comment = '';
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart
                        }
                    };
                    start = index;
                    index += 2;
                    lineComment = true;
                    if (index >= length) {
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        lineComment = false;
                        addComment('Line', comment, start, index, loc);
                    }
                } else if (ch === '*') {
                    start = index;
                    index += 2;
                    blockComment = true;
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart - 2
                        }
                    };
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function filterCommentLocation() {
        var i, entry, comment, comments = [];

        for (i = 0; i < extra.comments.length; ++i) {
            entry = extra.comments[i];
            comment = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                comment.range = entry.range;
            }
            if (extra.loc) {
                comment.loc = entry.loc;
            }
            comments.push(comment);
        }

        extra.comments = comments;
    }

    function collectToken() {
        var start, loc, token, range, value;

        skipComment();
        start = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        token = extra.advance();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        if (token.type !== Token.EOF) {
            range = [token.range[0], token.range[1]];
            value = sliceSource(token.range[0], token.range[1]);
            extra.tokens.push({
                type: TokenName[token.type],
                value: value,
                range: range,
                loc: loc
            });
        }

        return token;
    }

    function collectRegex() {
        var pos, loc, regex, token;

        skipComment();

        pos = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        regex = extra.scanRegExp();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        // Pop the previous token, which is likely '/' or '/='
        if (extra.tokens.length > 0) {
            token = extra.tokens[extra.tokens.length - 1];
            if (token.range[0] === pos && token.type === 'Punctuator') {
                if (token.value === '/' || token.value === '/=') {
                    extra.tokens.pop();
                }
            }
        }

        extra.tokens.push({
            type: 'RegularExpression',
            value: regex.literal,
            range: [pos, index],
            loc: loc
        });

        return regex;
    }

    function filterTokenLocation() {
        var i, entry, token, tokens = [];

        for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                token.range = entry.range;
            }
            if (extra.loc) {
                token.loc = entry.loc;
            }
            tokens.push(token);
        }

        extra.tokens = tokens;
    }

    function createLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value
        };
    }

    function createRawLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value,
            raw: sliceSource(token.range[0], token.range[1])
        };
    }

    function createLocationMarker() {
        var marker = {};

        marker.range = [index, index];
        marker.loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            },
            end: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        marker.end = function () {
            this.range[1] = index;
            this.loc.end.line = lineNumber;
            this.loc.end.column = index - lineStart;
        };

        marker.applyGroup = function (node) {
            if (extra.range) {
                node.groupRange = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.groupLoc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        marker.apply = function (node) {
            if (extra.range) {
                node.range = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.loc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        return marker;
    }

    function trackGroupExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();
        expect('(');

        ++state.parenthesizedCount;

        state.allowArrowFunction = !state.allowArrowFunction;
        expr = parseExpression();
        state.allowArrowFunction = false;

        if (expr.type === 'ArrowFunctionExpression') {
            marker.end();
            marker.apply(expr);
        } else {
            expect(')');
            marker.end();
            marker.applyGroup(expr);
        }

        return expr;
    }

    function trackLeftHandSideExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || lookahead().type === Token.Template) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else if (match('.')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.TaggedTemplateExpression,
                    tag: expr,
                    quasi: parseTemplateLiteral()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function trackLeftHandSideExpressionAllowCall() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(') || lookahead().type === Token.Template) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
                marker.end();
                marker.apply(expr);
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else if (match('.')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.TaggedTemplateExpression,
                    tag: expr,
                    quasi: parseTemplateLiteral()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function filterGroup(node) {
        var n, i, entry;

        n = (Object.prototype.toString.apply(node) === '[object Array]') ? [] : {};
        for (i in node) {
            if (node.hasOwnProperty(i) && i !== 'groupRange' && i !== 'groupLoc') {
                entry = node[i];
                if (entry === null || typeof entry !== 'object' || entry instanceof RegExp) {
                    n[i] = entry;
                } else {
                    n[i] = filterGroup(entry);
                }
            }
        }
        return n;
    }

    function wrapTrackingFunction(range, loc) {

        return function (parseFunction) {

            function isBinary(node) {
                return node.type === Syntax.LogicalExpression ||
                    node.type === Syntax.BinaryExpression;
            }

            function visit(node) {
                var start, end;

                if (isBinary(node.left)) {
                    visit(node.left);
                }
                if (isBinary(node.right)) {
                    visit(node.right);
                }

                if (range) {
                    if (node.left.groupRange || node.right.groupRange) {
                        start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                        end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                        node.range = [start, end];
                    } else if (typeof node.range === 'undefined') {
                        start = node.left.range[0];
                        end = node.right.range[1];
                        node.range = [start, end];
                    }
                }
                if (loc) {
                    if (node.left.groupLoc || node.right.groupLoc) {
                        start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                        end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                        node.loc = {
                            start: start,
                            end: end
                        };
                    } else if (typeof node.loc === 'undefined') {
                        node.loc = {
                            start: node.left.loc.start,
                            end: node.right.loc.end
                        };
                    }
                }
            }

            return function () {
                var marker, node;

                skipComment();

                marker = createLocationMarker();
                node = parseFunction.apply(null, arguments);
                marker.end();

                if (range && typeof node.range === 'undefined') {
                    marker.apply(node);
                }

                if (loc && typeof node.loc === 'undefined') {
                    marker.apply(node);
                }

                if (isBinary(node)) {
                    visit(node);
                }

                return node;
            };
        };
    }

    function patch() {

        var wrapTracking;

        if (extra.comments) {
            extra.skipComment = skipComment;
            skipComment = scanComment;
        }

        if (extra.raw) {
            extra.createLiteral = createLiteral;
            createLiteral = createRawLiteral;
        }

        if (extra.range || extra.loc) {

            extra.parseGroupExpression = parseGroupExpression;
            extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
            extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
            parseGroupExpression = trackGroupExpression;
            parseLeftHandSideExpression = trackLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;

            wrapTracking = wrapTrackingFunction(extra.range, extra.loc);

            extra.parseAdditiveExpression = parseAdditiveExpression;
            extra.parseAssignmentExpression = parseAssignmentExpression;
            extra.parseAtSymbol = parseAtSymbol;
            extra.parseBitwiseANDExpression = parseBitwiseANDExpression;
            extra.parseBitwiseORExpression = parseBitwiseORExpression;
            extra.parseBitwiseXORExpression = parseBitwiseXORExpression;
            extra.parseBlock = parseBlock;
            extra.parseFunctionSourceElements = parseFunctionSourceElements;
            extra.parseCatchClause = parseCatchClause;
            extra.parseComputedMember = parseComputedMember;
            extra.parseConditionalExpression = parseConditionalExpression;
            extra.parseConstLetDeclaration = parseConstLetDeclaration;
            extra.parseEqualityExpression = parseEqualityExpression;
            extra.parseExportDeclaration = parseExportDeclaration;
            extra.parseExportSpecifier = parseExportSpecifier;
            extra.parseExportSpecifierSetProperty = parseExportSpecifierSetProperty;
            extra.parseExpression = parseExpression;
            extra.parseForVariableDeclaration = parseForVariableDeclaration;
            extra.parseFunctionDeclaration = parseFunctionDeclaration;
            extra.parseFunctionExpression = parseFunctionExpression;
            extra.parseParam = parseParam;
            extra.parseGlob = parseGlob;
            extra.parseImportDeclaration = parseImportDeclaration;
            extra.parseImportSpecifier = parseImportSpecifier;
            extra.parseLogicalANDExpression = parseLogicalANDExpression;
            extra.parseLogicalORExpression = parseLogicalORExpression;
            extra.parseMultiplicativeExpression = parseMultiplicativeExpression;
            extra.parseModuleDeclaration = parseModuleDeclaration;
            extra.parseModuleBlock = parseModuleBlock;
            extra.parseNewExpression = parseNewExpression;
            extra.parseNonComputedProperty = parseNonComputedProperty;
            extra.parseObjectProperty = parseObjectProperty;
            extra.parseObjectPropertyKey = parseObjectPropertyKey;
            extra.parseParam = parseParam;
            extra.parsePath = parsePath;
            extra.parsePostfixExpression = parsePostfixExpression;
            extra.parsePrimaryExpression = parsePrimaryExpression;
            extra.parsePrivateStatement = parsePrivateStatement;
            extra.parseProgram = parseProgram;
            extra.parsePropertyFunction = parsePropertyFunction;
            extra.parseRelationalExpression = parseRelationalExpression;
            extra.parseSpreadOrAssignmentExpression = parseSpreadOrAssignmentExpression;
            extra.parseSymbolStatement = parseSymbolStatement;
            extra.parseSymbolDeclarationList = parseSymbolDeclarationList;
            extra.parseSymbolDeclaration = parseSymbolDeclaration;
            extra.parseTemplateElement = parseTemplateElement;
            extra.parseTemplateLiteral = parseTemplateLiteral;
            extra.parseStatement = parseStatement;
            extra.parseShiftExpression = parseShiftExpression;
            extra.parseSwitchCase = parseSwitchCase;
            extra.parseUnaryExpression = parseUnaryExpression;
            extra.parseVariableDeclaration = parseVariableDeclaration;
            extra.parseVariableIdentifier = parseVariableIdentifier;
            extra.parseMethodDefinition = parseMethodDefinition;
            extra.parseClassDeclaration = parseClassDeclaration;
            extra.parseClassExpression = parseClassExpression;
            extra.parseClassBody = parseClassBody;

            parseAdditiveExpression = wrapTracking(extra.parseAdditiveExpression);
            parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
            parseAtSymbol = wrapTracking(extra.parseAtSymbol);
            parseBitwiseANDExpression = wrapTracking(extra.parseBitwiseANDExpression);
            parseBitwiseORExpression = wrapTracking(extra.parseBitwiseORExpression);
            parseBitwiseXORExpression = wrapTracking(extra.parseBitwiseXORExpression);
            parseBlock = wrapTracking(extra.parseBlock);
            parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
            parseCatchClause = wrapTracking(extra.parseCatchClause);
            parseComputedMember = wrapTracking(extra.parseComputedMember);
            parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
            parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
            parseExportDeclaration = wrapTracking(parseExportDeclaration);
            parseExportSpecifier = wrapTracking(parseExportSpecifier);
            parseExportSpecifierSetProperty = wrapTracking(parseExportSpecifierSetProperty);
            parseEqualityExpression = wrapTracking(extra.parseEqualityExpression);
            parseExpression = wrapTracking(extra.parseExpression);
            parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
            parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
            parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
            parseParam = wrapTracking(extra.parseParam);
            parseGlob = wrapTracking(extra.parseGlob);
            parseImportDeclaration = wrapTracking(extra.parseImportDeclaration);
            parseImportSpecifier = wrapTracking(extra.parseImportSpecifier);
            parseLogicalANDExpression = wrapTracking(extra.parseLogicalANDExpression);
            parseLogicalORExpression = wrapTracking(extra.parseLogicalORExpression);
            parseMultiplicativeExpression = wrapTracking(extra.parseMultiplicativeExpression);
            parseModuleDeclaration = wrapTracking(extra.parseModuleDeclaration);
            parseModuleBlock = wrapTracking(extra.parseModuleBlock);
            parseNewExpression = wrapTracking(extra.parseNewExpression);
            parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
            parseObjectProperty = wrapTracking(extra.parseObjectProperty);
            parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
            parseParam = wrapTracking(extra.parseParam);
            parsePath = wrapTracking(extra.parsePath);
            parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
            parsePrivateStatement = wrapTracking(extra.parsePrivateStatement);
            parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
            parseProgram = wrapTracking(extra.parseProgram);
            parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
            parseSymbolStatement = wrapTracking(extra.parseSymbolStatement);
            parseSymbolDeclarationList = wrapTracking(extra.parseSymbolDeclarationList);
            parseSymbolDeclaration = wrapTracking(extra.parseSymbolDeclaration);
            parseTemplateElement = wrapTracking(extra.parseTemplateElement);
            parseTemplateLiteral = wrapTracking(extra.parseTemplateLiteral);
            parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
            parseSpreadOrAssignmentExpression = wrapTracking(extra.parseSpreadOrAssignmentExpression);
            parseStatement = wrapTracking(extra.parseStatement);
            parseShiftExpression = wrapTracking(extra.parseShiftExpression);
            parseSwitchCase = wrapTracking(extra.parseSwitchCase);
            parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
            parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
            parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
            parseMethodDefinition = wrapTracking(extra.parseMethodDefinition);
            parseClassDeclaration = wrapTracking(extra.parseClassDeclaration);
            parseClassExpression = wrapTracking(extra.parseClassExpression);
            parseClassBody = wrapTracking(extra.parseClassBody);
        }

        if (typeof extra.tokens !== 'undefined') {
            extra.advance = advance;
            extra.scanRegExp = scanRegExp;

            advance = collectToken;
            scanRegExp = collectRegex;
        }
    }

    function unpatch() {
        if (typeof extra.skipComment === 'function') {
            skipComment = extra.skipComment;
        }

        if (extra.raw) {
            createLiteral = extra.createLiteral;
        }

        if (extra.range || extra.loc) {
            parseAdditiveExpression = extra.parseAdditiveExpression;
            parseAssignmentExpression = extra.parseAssignmentExpression;
            parseAtSymbol = extra.parseAtSymbol;
            parseBitwiseANDExpression = extra.parseBitwiseANDExpression;
            parseBitwiseORExpression = extra.parseBitwiseORExpression;
            parseBitwiseXORExpression = extra.parseBitwiseXORExpression;
            parseBlock = extra.parseBlock;
            parseFunctionSourceElements = extra.parseFunctionSourceElements;
            parseCatchClause = extra.parseCatchClause;
            parseComputedMember = extra.parseComputedMember;
            parseConditionalExpression = extra.parseConditionalExpression;
            parseConstLetDeclaration = extra.parseConstLetDeclaration;
            parseEqualityExpression = extra.parseEqualityExpression;
            parseExportDeclaration = extra.parseExportDeclaration;
            parseExportSpecifier = extra.parseExportSpecifier;
            parseExportSpecifierSetProperty = extra.parseExportSpecifierSetProperty;
            parseExpression = extra.parseExpression;
            parseForVariableDeclaration = extra.parseForVariableDeclaration;
            parseFunctionDeclaration = extra.parseFunctionDeclaration;
            parseFunctionExpression = extra.parseFunctionExpression;
            parseParam = extra.parseParam;
            parseGlob = extra.parseGlob;
            parseImportDeclaration = extra.parseImportDeclaration;
            parseImportSpecifier = extra.parseImportSpecifier;
            parseGroupExpression = extra.parseGroupExpression;
            parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
            parseLogicalANDExpression = extra.parseLogicalANDExpression;
            parseLogicalORExpression = extra.parseLogicalORExpression;
            parseMultiplicativeExpression = extra.parseMultiplicativeExpression;
            parseModuleDeclaration = extra.parseModuleDeclaration;
            parseModuleBlock = extra.parseModuleBlock;
            parseNewExpression = extra.parseNewExpression;
            parseNonComputedProperty = extra.parseNonComputedProperty;
            parseObjectProperty = extra.parseObjectProperty;
            parseObjectPropertyKey = extra.parseObjectPropertyKey;
            parsePath = extra.parsePath;
            parsePostfixExpression = extra.parsePostfixExpression;
            parsePrimaryExpression = extra.parsePrimaryExpression;
            parsePrivateStatement = extra.parsePrivateStatement;
            parseProgram = extra.parseProgram;
            parsePropertyFunction = extra.parsePropertyFunction;
            parseTemplateElement = extra.parseTemplateElement;
            parseTemplateLiteral = extra.parseTemplateLiteral;
            parseRelationalExpression = extra.parseRelationalExpression;
            parseSpreadOrAssignmentExpression = extra.parseSpreadOrAssignmentExpression;
            parseStatement = extra.parseStatement;
            parseShiftExpression = extra.parseShiftExpression;
            parseSymbolStatement = extra.parseSymbolStatement;
            parseSymbolDeclarationList = extra.parseSymbolDeclarationList;
            parseSymbolDeclaration = extra.parseSymbolDeclaration;
            parseSwitchCase = extra.parseSwitchCase;
            parseUnaryExpression = extra.parseUnaryExpression;
            parseVariableDeclaration = extra.parseVariableDeclaration;
            parseVariableIdentifier = extra.parseVariableIdentifier;
            parseMethodDefinition = extra.parseMethodDefinition;
            parseClassDeclaration = extra.parseClassDeclaration;
            parseClassExpression = extra.parseClassExpression;
            parseClassBody = extra.parseClassBody;
        }

        if (typeof extra.scanRegExp === 'function') {
            advance = extra.advance;
            scanRegExp = extra.scanRegExp;
        }
    }

    function stringToArray(str) {
        var length = str.length,
            result = [],
            i;
        for (i = 0; i < length; ++i) {
            result[i] = str.charAt(i);
        }
        return result;
    }

    function parse(code, options) {
        var program, toString;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        buffer = null;
        state = {
            allowIn: true,
            labelSet: {},
            parenthesizedCount: 0,
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false
        };

        extra = {};
        if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.raw = (typeof options.raw === 'boolean') && options.raw;
            if (typeof options.tokens === 'boolean' && options.tokens) {
                extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
                extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                extra.errors = [];
            }
        }

        if (length > 0) {
            if (typeof source[0] === 'undefined') {
                // Try first to convert to a string. This is good as fast path
                // for old IE which understands string indexing for string
                // literals only and not for string object.
                if (code instanceof String) {
                    source = code.valueOf();
                }

                // Force accessing the characters via an array.
                if (typeof source[0] === 'undefined') {
                    source = stringToArray(code);
                }
            }
        }

        patch();
        try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
                filterCommentLocation();
                program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
                filterTokenLocation();
                program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
                program.errors = extra.errors;
            }
            if (extra.range || extra.loc) {
                program.body = filterGroup(program.body);
            }
        } catch (e) {
            throw e;
        } finally {
            unpatch();
            extra = {};
        }

        return program;
    }

    // Sync with package.json.
    exports.version = '1.1.0-dev-harmony';

    exports.parse = parse;

    // Deep copy.
    exports.Syntax = (function () {
        var name, types = {};

        if (typeof Object.create === 'function') {
            types = Object.create(null);
        }

        for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                types[name] = Syntax[name];
            }
        }

        if (typeof Object.freeze === 'function') {
            Object.freeze(types);
        }

        return types;
    }());

}));
/* vim: set sw=4 ts=4 et tw=80 : */

return exports;
})({});

exports.utility = (function(exports){
  var BOOLEAN   = 'boolean',
      FUNCTION  = 'function',
      NUMBER    = 'number',
      OBJECT    = 'object',
      STRING    = 'string',
      UNDEFINED = 'undefined';

  var KEYS   = 'keys',
      VALUES = 'values',
      ITEMS  = 'items',
      ATTRS  = 'attributes';

  var hasDunderProto = { __proto__: [] } instanceof Array,
      isES5 = !(!Object.getOwnPropertyNames || 'prototype' in Object.getOwnPropertyNames);

  var toBrand = {}.toString,
      _slice = [].slice,
      hasOwn = {}.hasOwnProperty,
      toSource = Function.toString;

  var hidden = {
    configurable: true,
    enumerable: false,
    writable: true,
    value: undefined
  };

  var proto = uid();


  function getBrandOf(o){
    if (o === null) {
      return 'Null';
    } else if (o === undefined) {
      return 'Undefined';
    } else {
      return toBrand.call(o).slice(8, -1);
    }
  }

  function ensureObject(name, o){
    if (o === null || typeof o !== 'object') {
      throw new TypeError(name + ' called with non-object ' + getBrandOf(o));
    }
  }

  function uid(){
    return Math.random().toString(36).slice(2);
  }

  exports.uid = uid;


  function toArray(o){
    var len = o.length;
    if (!len) return [];
    if (len === 1) return [o[0]];
    if (len === 2) return [o[0], o[1]];
    if (len === 3) return [o[0], o[1], o[2]];
    if (len > 9)   return _slice.call(o);
    if (len === 4) return [o[0], o[1], o[2], o[3]];
    if (len === 5) return [o[0], o[1], o[2], o[3], o[4]];
    if (len === 6) return [o[0], o[1], o[2], o[3], o[4], o[5]];
    if (len === 7) return [o[0], o[1], o[2], o[3], o[4], o[5], o[6]];
    if (len === 8) return [o[0], o[1], o[2], o[3], o[4], o[5], o[6], o[7]];
    if (len === 9) return [o[0], o[1], o[2], o[3], o[4], o[5], o[6], o[7], o[8]];
  }
  exports.toArray = toArray;

  function slice(o, start, end){
    if (!o.length) {
      return [];
    } else if (!end && !start) {
      return toArray(o);
    } else {
      return _slice.call(o, start, end);
    }
  }
  exports.slice = slice;

  var fname = exports.fname = (function(){
    if (Function.name === 'Function') {
      return function fname(f){
        return f ? f.name || '' : '';
      };
    }
    return function fname(f){
      if (typeof f !== FUNCTION) {
        return '';
      }

      if (!hasOwn.call(f, 'name')) {
        hidden.value = toSource.call(f).match(/^\n?function\s?(\w*)?_?\(/)[1];
        defineProperty(f, 'name', hidden);
      }

      return f.name || '';
    };
  })();

  function isObject(v){
    var type = typeof v;
    return type === OBJECT ? v !== null : type === FUNCTION;
  }
  exports.isObject = isObject;

  exports.nextTick = typeof process !== UNDEFINED
                    ? process.nextTick
                    : function nextTick(f){ setTimeout(f, 1) };

  exports.numbers = (function(cache){
    return function numbers(start, end){
      if (!isFinite(end)) {
        end = start;
        start = 0;
      }
      var length = end - start,
          curr;

      if (end > cache.length) {
        while (length--)
          cache[curr = length + start] = '' + curr;
      }
      return cache.slice(start, end);
    };
  })([]);


  if (isES5) {
    var create = exports.create = Object.create;
  } else {
    var Null = function(){};
    var hiddens = ['constructor', 'hasOwnProperty', 'propertyIsEnumerable',
                   'isPrototypeOf', 'toLocaleString', 'toString', 'valueOf'];

    var create = exports.create = (function(F){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = 'javascript:';
      Null.prototype = iframe.contentWindow.Object.prototype;
      document.body.removeChild(iframe);

      while (hiddens.length) {
        delete Null.prototype[hiddens.pop()];
      }

      return function create(object){
        if (object === null) {
          return new Null;
        } else {
          F.prototype = object;
          object = new F;
          F.prototype = null;
          return object;
        }
      };
    })(function(){});
  }

  var ownKeys = exports.keys = (function(){
    if (isES5) return Object.keys;
    return function keys(o){
      var out = [], i=0;
      for (var k in o) {
        if (hasOwn.call(o, k)) {
          out[i++] = k;
        }
      }
      return out;
    };
  })();

  var getPrototypeOf = exports.getPrototypeOf = (function(){
    if (isES5) {
      return Object.getPrototypeOf;
    } else if (hasDunderProto) {
      return function getPrototypeOf(o){
        ensureObject('getPrototypeOf', o);
        return o.__proto__;
      };
    } else {
      return function getPrototypeOf(o){
        ensureObject('getPrototypeOf', o);

        var ctor = o.constructor;

        if (typeof ctor === FUNCTION) {
          var proto = ctor.prototype;
          if (o !== proto) {
            return proto;
          } else if (!ctor._super) {
            delete o.constructor;
            ctor._super = o.constructor;
            o.constructor = ctor;
          }
          return ctor._super.prototype;
        } else if (o instanceof Null) {
          return null;
        } else if (o instanceof Object) {
          return Object.prototype;
        }
      };
    }
  })();

  var defineProperty = exports.defineProperty = (function(){
    if (isES5) return Object.defineProperty;
    return function defineProperty(o, k, desc){
      o[k] = desc.value;
      return o;
    };
  })();


  var describeProperty = exports.describeProperty = (function(){
    if (isES5) return Object.getOwnPropertyDescriptor;
    return function getOwnPropertyDescriptor(o, k){
      ensureObject('getOwnPropertyDescriptor', o);
      if (hasOwn.call(o, k)) {
        return { value: o[k] };
      }
    };
  })();

  var ownProperties = exports.ownProperties = isES5 ? Object.getOwnPropertyNames : ownKeys;

  var _call, _apply, _bind;

  if (typeof Function.prototype.bind === FUNCTION && !('prototype' in Function.prototype.bind)) {
    _bind = Function.prototype.bind;
    _call = Function.prototype.call;
    _apply = Function.prototype.apply;
  } else {
    void function(){
      function bind(receiver){
        if (typeof this !== 'function') {
          throw new TypeError("Function.prototype.bind called on non-callable");
        }

        var args = toArray(arguments),
            params = '',
            F = this;

        for (var i=1; i < args.length; i++) {
          if (i > 1) params += ',';
          params += '$['+i+']';
        }

        var bound = function(){
          if (this instanceof bound) {
            var p = params;
            for (var i=0; i < arguments.length; i++) {
              p += ',_['+i+']';
            }
            return new Function('F,$,_', 'return new F('+p+')')(F, args, arguments);
          } else {
            var a = toArray(args);
            for (var i=0; i < arguments.length; i++) {
              a[a.length] = arguments[i];
            }
            return _call.apply(F, a);
          }
        };

        return bound;
      }

      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = 'javascript:';
      _call = iframe.contentWindow.Function.prototype.call;
      _apply = _call.apply;
      _bind = bind;
      document.body.removeChild(iframe);
    }();
  }

  var bindbind  = exports.bindbind  = _bind.call(_bind, _bind),
      callbind  = exports.callbind  = bindbind(_call),
      applybind = exports.applybind = bindbind(_apply),
      bindapply = exports.bindapply = applybind(_bind),
      bind      = exports.bind      = callbind(_bind),
      call      = exports.call      = callbind(_call),
      apply     = exports.apply     = callbind(_apply);


  function applyNew(Ctor, args){
    return new (bindapply(Ctor, [null].concat(args)));
  }
  exports.applyNew = applyNew;


  function copy(o){
    return assign(create(getPrototypeOf(o)), o);
  }
  exports.copy = copy;

  function clone(o, hidden){
    function recurse(from, to, key){
      try {
        var val = from[key];
        if (!isObject(val)) {
          return to[key] = val;
        }
        if (from[key] === val) {
          if (hasOwn.call(from[key], tag)) {
            return to[key] = from[key][tag];
          }
          to[key] = enqueue(from[key]);
        }
      } catch (e) {}
    }

    function enqueue(o){
      var out = o instanceof Array ? [] : create(getPrototypeOf(o));
      tagged.push(o);
      var keys = list(o);
      for (var i=0; i < keys.length; i++) {
        queue.push([o, out, keys[i]]);
      }
      o[tag] = out;
      return out;
    }

    var queue = new Queue,
        tag = uid(),
        tagged = [],
        list = hidden ? ownProperties : ownKeys,
        out = enqueue(o);

    while (queue.length) {
      recurse.apply(this, queue.shift());
    }

    for (var i=0; i < tagged.length; i++) {
      delete tagged[tag];
    }

    return out;
  }
  exports.clone = clone;


  function enumerate(o){
    var out = [], i = 0;
    for (out[i++] in o);
    return out;
  }
  exports.enumerate = enumerate;

  var StopIteration = exports.StopIteration = global.StopIteration || create(null);

  function iterate(o, callback, context){
    if (o == null) return;
    var type = typeof o;
    context = context || o;
    if (type === 'number' || type === 'boolean') {
      callback.call(context, o, 0, o);
    } else {
      o = Object(o);
      var iterator = o.iterator || o.__iterator__;

      if (typeof iterator === 'function') {
        var iter = iterator.call(o);
        if (iter && typeof iter.next === 'function') {
          var i=0;
          try {
            while (1) callback.call(context, iter.next(), i++, o);
          } catch (e) {
            if (e === StopIteration) return;
            throw e;
          }
        }
      }

      if (type !== 'function' && o.length) {
        for (var i=0; i < o.length; i++) {
          callback.call(context, o[i], i, o);
        }
      } else {
        var keys = ownKeys(o);
        for (var i=0; i < keys.length; i++) {
          callback.call(context, o[keys[i]], keys[i], o);
        }
      }
    }
  }
  exports.iterate = iterate;

  function each(o, callback){
    for (var i=0; i < o.length; i++) {
      callback(o[i], i, o);
    }
  }
  exports.each = each;

  function map(o, callback){
    var out = new Array(o.length);
    for (var i=0; i < o.length; i++) {
      out[i] = callback(o[i]);
    }
    return out;
  }
  exports.map = map;

  function fold(o, initial, callback){
    if (callback) {
      var val = initial, i = 0;
    } else {
      if (typeof initial === STRING) {
        callback = fold[initial];
      } else {
        callback = initial;
      }

      var val = o[0], i = 1;
    }
    for (; i < o.length; i++) {
      val = callback(val, o[i], i, o);
    }
    return val;
  }
  exports.fold = fold;

  fold['+'] = function(a, b){ return a + b };
  fold['*'] = function(a, b){ return a - b };
  fold['-'] = function(a, b){ return a * b };
  fold['/'] = function(a, b){ return a / b };

  function repeat(n, args, callback){
    if (typeof args === FUNCTION) {
      callback = args;
      for (var i=0; i < n; i++) {
        callback();
      }
    } else {
      for (var i=0; i < n; i++) {
        callback.apply(this, args);
      }
    }
  }
  exports.repeat = repeat;


  function generate(n, callback){
    var out = new Array(n);
    for (var i=0; i < n; i++) {
      out[i] = callback(i, n, out);
    }
    return out;
  }
  exports.generate = generate;


  function define(o, p, v){
    switch (typeof p) {
      case FUNCTION:
        v = p;
        p = fname(v);
      case STRING:
        hidden.value = v;
        defineProperty(o, p, hidden);
        break;
      case OBJECT:
        if (p instanceof Array) {
          for (var i=0; i < p.length; i++) {
            var f = p[i];
            if (typeof f === FUNCTION) {
              var name = fname(f);
            } else if (typeof f === STRING && typeof p[i+1] !== FUNCTION || !fname(p[i+1])) {
              var name = f;
              f = p[i+1];
            }
            if (name) {
              hidden.value = f;
              defineProperty(o, name, hidden);
            }
          }
        } else if (p) {
          var keys = ownKeys(p)

          for (var i=0; i < keys.length; i++) {
            var desc = describeProperty(p, keys[i]);
            if (desc) {
              desc.enumerable = 'get' in desc;
              defineProperty(o, keys[i], desc);
            }
          }
        }
    }

    hidden.value = undefined;
    return o;
  }
  exports.define = define;


  function assign(o, p, v){
    switch (typeof p) {
      case FUNCTION:
        o[fname(p)] = p;
        break;
      case STRING:
        o[p] = v;
        break;
      case OBJECT:
        if (p instanceof Array) {
          for (var i=0; i < p.length; i++) {
            var f = p[i];
            if (typeof f === FUNCTION && fname(f)) {
              var name = fname(f);
            } else if (typeof f === STRING && typeof p[i+1] !== FUNCTION || !fname(p[i+1])) {
              var name = f;
              f = p[i+1];
            }
            if (name) {
              o[name] = f;
            }
          }
        } else if (p) {
          var keys = ownKeys(p)

          for (var i=0; i < keys.length; i++) {
            var k = keys[i];
            o[k] = p[k];
          }
        }
    }
    return o;
  }
  exports.assign = assign;



  var hide = exports.hide = (function(){
    if (isES5) {
      return function hide(o, k){
        Object.defineProperty(o, k, { enumerable: false });
      };
    }
    return function hide(){};
  })();



  function inherit(Ctor, Super, properties, methods){
    define(Ctor, { inherits: Super });

    Ctor.prototype = create(Super.prototype, {
      constructor: { value: Ctor,
                     writable: true,
                     configurable: true }
    });

    properties && define(Ctor.prototype, properties);
    methods && define(Ctor.prototype, methods);
    return Ctor;
  }
  exports.inherit = inherit;


  var __ = partial.__ = {};

  function partial(f, args){
    args instanceof Array || (args = [args]);
    return function(){
      var a = [],
          j = 0;

      for (var i=0; i < args.length; i++) {
        a[i] = args[i] === __ ? arguments[j++] : args[i];
      }
      return f.apply(this, a);
    };
  }
  exports.partial = partial;


  function quotes(s) {
    s = (''+s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    var singles = 0,
        doubles = 0,
        i = s.length;

    while (i--) {
      if (s[i] === '"') {
        doubles++;
      } else if (s[i] === "'") {
        singles++;
      }
    }

    if (singles > doubles) {
      return '"' + s.replace(/"/g, '\\"') + '"';
    } else {
      return "'" + s.replace(/'/g, "\\'") + "'";
    }
  }
  exports.quotes = quotes;


  function unique(strings){
    var seen = create(null),
        out = [];

    for (var i=0; i < strings.length; i++) {
      if (!(strings[i] in seen)) {
        seen[strings[i]] = true;
        out.push(strings[i]);
      }
    }

    return out;
  }
  exports.unique = unique;


  var MAX_INTEGER = 9007199254740992;

  function toInteger(v){
    if (v === Infinity) {
      return MAX_INTEGER;
    } else if (v === -Infinity) {
      return -MAX_INTEGER;
    } else {
      return v - 0 >> 0;
    }
  }
  exports.toInteger = toInteger;


  function isNaN(number){
    return number !== number;
  }
  exports.isNaN = isNaN;


  function isFinite(number){
    return typeof value === 'number'
               && value === value
               && value < Infinity
               && value > -Infinity;
  }
  exports.isFinite = isFinite;


  function isInteger(value) {
    return typeof value === NUMBER
               && value === value
               && value > -MAX_INTEGER
               && value < MAX_INTEGER
               && value >> 0 === value;
  }
  exports.isInteger = isInteger;

  function walk(root, callback){
    var queue = new Queue([[root]]),
        branded = [],
        tag = uid();

    while (queue.length) {
      recurse(queue.shift());
    }

    for (var i=0; i < branded.length; i++) {
      delete branded[i][tag];
    }

    function recurse(node){
      if (!isObject(node)) return;
      var keys = ownKeys(node);
      for (var i=0; i < keys.length; i++) {
        var key = keys[i],
            item = node[key];

        if (isObject(item) && !hasOwn.call(tag, tag)) {
          item[tag] = true;
          branded.push(item);
          var result = callback(item, node);
          if (result === walk.RECURSE) {
            queue.push(item);
          } else if (result === walk.BREAK) {
            return queue.empty();
          }
        }
      }
    }
  }
  exports.walk = walk;

  var BREAK    = walk.BREAK    = new Number(1),
      CONTINUE = walk.CONTINUE = new Number(2),
      RECURSE  = walk.RECURSE  = new Number(3);

  exports.collector = (function(){
    function path(){
      var parts = toArray(arguments);

      for (var i=0; i < parts.length; i++) {

        if (typeof parts[i] === 'function') {
          return function(o){
            for (var i=0; i < parts.length; i++) {
              var part = parts[i],
                  type = typeof part;

              if (type === 'string') {
                o = o[part];
              } else if (type === 'function') {
                o = part(o);
              }
            }
            return o;
          };
        }
      }

      return function(o){
        for (var i=0; i < parts.length; i++) {
          o = o[parts[i]];
        }
        return o;
      };
    }


    function collector(o){
      var handlers = create(null);
      for (var k in o) {
        if (o[k] instanceof Array) {
          handlers[k] = path(o[k]);
        } else if (typeof o[k] === FUNCTION) {
          handlers[k] = o[k];
        } else {
          handlers[k] = o[k];
        }
      }

      return function(node){
        var items  = [];

        function walker(node, parent){
          if (!node) return CONTINUE;

          if (node instanceof Array) {
            return RECURSE;
          }

          var handler = handlers[node.type];

          if (handler === true) {
            items.push(node);
          } else if (handler === RECURSE || handler === CONTINUE) {
            return handler;
          } else if (typeof handler === STRING) {
            if (node[handler]) {
              walk(node[handler], walker);
            }
          } else if (typeof handler === FUNCTION) {
            var item = handler(node);
            if (item !== undefined) {
              items.push(item);
            }
          } else

          return CONTINUE;
        }

        walk(node, walker);

        return items;
      };
    }

    return collector;
  })();

  function Hash(){}
  Hash.prototype = create(null);
  exports.Hash = Hash;

  exports.Emitter = (function(){
    function Emitter(){
      '_events' in this || define(this, '_events', create(null));
    }

    define(Emitter.prototype, [
      function on(events, handler){
        iterate(events.split(/\s+/), function(event){
          if (!(event in this)) {
            this[event] = [];
          }
          this[event].push(handler);
        }, this._events);
      },
      function off(events, handler){
        iterate(events.split(/\s+/), function(event){
          if (event in this) {
            var index = '__index' in handler ? handler.__index : this[event].indexOf(handler);
            if (~index) {
              this[event].splice(index, 1);
            }
          }
        }, this._events);
      },
      function once(events, handler){
        function one(val){
          this.off(events, one);
          handler.call(this, val);
        }
        this.on(events, one);
      },
      function emit(event, val){
        var handlers = this._events['*'];

        if (handlers) {;
          for (var i=0; i < handlers.length; i++) {
            handlers[i].call(this, event, val);
          }
        }

        handlers = this._events[event];
        if (handlers) {
          for (var i=0; i < handlers.length; i++) {
            handlers[i].call(this, val);
          }
        }
      }
    ]);

    return Emitter;
  })();

  var PropertyList = exports.PropertyList = (function(){
    var PropertyListIterator = (function(){
      var types = {
        keys: 0,
        values: 1,
        attributes: 2
      };

      function PropertyListIterator(list, type){
        this.list = list;
        this.type = type ? types[type] : ITEMS;
        this.index = 0;
      }

      define(PropertyListIterator.prototype, [
        function next(){
          var props = this.list.props, property;
          while (!property) {
            if (this.index >= props.length) {
              throw StopIteration;
            }
            property = props[this.index++];
          }
          return this.type === ITEMS ? property : property[this.type];
        },
        function __iterator__(){
          return this;
        }
      ]);

      return PropertyListIterator;
    })();

    function PropertyList(){
      this.hash = new Hash;
      this.props = [];
      this.holes = 0;
      this.length = 0;
    }

    define(PropertyList.prototype, [
      function get(key){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index !== undefined) {
          return this.props[index][1];
        }
      },
      function getAttribute(key){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index !== undefined) {
          return this.props[index][2];
        } else {
          return null;
        }
      },
      function getProperty(key){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index !== undefined) {
          return this.props[index];
        } else {
          return null;
        }
      },
      function set(key, value, attr){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name],
            prop;

        if (index === undefined) {
          index = this.hash[name] = this.props.length;
          prop = this.props[index] = [key, value, 0];
          this.length++;
        } else {
          prop = this.props[index];
          prop[1] = value;
        }

        if (attr !== undefined) {
          prop[2] = attr;
        }
        return true;
      },
      function initialize(props){
        var len = props.length;
        for (var i=0; i < len; i += 3) {
          var index = this.hash[props[i]] = this.props.length;
          this.props[index] = [props[i], props[i + 1], props[i + 2]];
        }
      },
      function setAttribute(key, attr){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index !== undefined) {
          this.props[index][2] = attr;
          return true;
        } else {
          return false;
        }
      },
      function setProperty(prop){
        var key = prop[0],
            name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index === undefined) {
          index = this.hash[name] = this.props.length;
          this.length++;
        }
        this.props[index] = prop;
      },
      function remove(key){
        var name = key === '__proto__' ? proto : key,
            index = this.hash[name];
        if (index !== undefined) {
          this.hash[name] = undefined;
          this.props[index] = undefined;
          this.holes++;
          this.length--;
          return true;
        } else {
          return false;
        }
      },
      function has(key){
        var name = key === '__proto__' ? proto : key;
        return this.hash[name] !== undefined;
      },
      function hasAttribute(key, mask){
        var name = key === '__proto__' ? proto : key,
            attr = this.getAttribute(name);
        if (attr !== null) {
          return (attr & mask) > 0;
        }
      },
      function compact(){
        var props = this.props,
            len = props.length,
            index = 0,
            prop;

        this.hash = new Hash;
        this.props = [];
        this.holes = 0;

        for (var i=0; i < len; i++) {
          if (prop = props[i]) {
            var name = prop[0] === '__proto__' ? proto : prop[0];
            this.props[index] = prop;
            this.hash[name] = index++;
          }
        }
      },
      function forEach(callback, context){
        var len = this.props.length,
            index = 0,
            prop;

        context = context || this;

        for (var i=0; i < len; i++) {
          if (prop = this.props[i]) {
            callback.call(context, prop, index++, this);
          }
        }
      },
      function map(callback, context){
        var out = [],
            len = this.props.length,
            index = 0,
            prop;

        context = context || this;

        for (var i=0; i < len; i++) {
          if (prop = this.props[i]) {
            out[index] = callback.call(context, prop, index++, this);
          }
        }

        return out;
      },
      function translate(callback, context){
        var out = new PropertyList;

        out.length = this.length;
        context = context || this;

        this.forEach(function(prop, index){
          prop = callback.call(context, prop, index, this);
          var name = prop[0] === '__proto__' ? proto : prop[0];
          out.props[index] = prop;
          out.hash[name] = index;
        });

        return out;
      },
      function filter(callback, context){
        var out = new PropertyList,
            index = 0;

        context = context || this;

        this.forEach(function(prop, i){
          if (callback.call(context, prop, i, this)) {
            var name = prop[0] === '__proto__' ? proto : prop[0];
            out.props[index] = prop;
            out.hash[name] = index++;
          }
        });

        return out;
      },
      function clone(deep){
        return this.translate(function(prop, i){
          return deep ? prop.slice() : prop;
        });
      },
      function keys(){
        return this.map(function(prop){
          return prop[0];
        });
      },
      function values(){
        return this.map(function(prop){
          return prop[1];
        });
      },
      function items(){
        return this.map(function(prop){
          return prop.slice();
        });
      },
      function merge(list){
        each(list, this.setProperty, this);
      },
      function __iterator__(type){
        return new PropertyListIterator(this, type);
      },
      function inspect(){
        var out = create(null);
        function Token(value){
          this.value = value;
        }
        Token.prototype.inspect = function(){
          return this.value;
        };
        this.forEach(function(property){
          var attrs = (property[2] & 0x01 ? 'E' : '_') +
                      (property[2] & 0x02 ? 'C' : '_') +
                      (property[2] & 0x04 ? 'W' :
                       property[2] & 0x08 ? 'A' : '_');
          out[property[0]] = new Token(attrs + ' ' + (isObject(property[1]) ? property[1].NativeBrand : property[1]));
        });
        return require('util').inspect(out);
      }
    ]);

    return PropertyList;
  })();

  var LinkedList = exports.LinkedList = (function(){
    function Item(data, prev){
      this.data = data;
      this.after(prev);
    }

    define(Item.prototype, [
      function after(item){
        this.relink(item);
        return this;
      },
      function before(item){
        this.prev.relink(item);
        return this;
      },
      function relink(prev){
        if (this.next) {
          this.next.prev = this.prev;
          this.prev.next = this.next;
        }
        this.prev = prev;
        this.next = prev.next;
        prev.next.prev = this;
        prev.next = this;
        return this;
      },
      function unlink(){
        this.next.prev = this.prev;
        this.prev.next = this.next;
        this.prev = this.next = null;
        return this;
      },
      function clear(){
        var data = this.data;
        this.next = this.prev = this.data = null;
        return data;
      }
    ]);

    function Sentinel(list){
      this.list = list;
      this.next = this;
      this.prev = this;
      this.data = undefined;
    }

    inherit(Sentinel, Item, [
      function unlink(){
        return this;
      }
    ]);


    function LinkedListIterator(list){
      this.item = list.sentinel;
      this.sentinel = list.sentinel;
    }

    define(LinkedListIterator.prototype, [
      function next(){
        this.item = this.item.next;
        if (this.item === this.sentinel) {
          throw StopIteration;
        }
        return this.item.data;
      }
    ]);

    function find(list, value){
      if (list.lastFind && list.lastFind.data === value) {
        return list.lastFind;
      }

      var item = list.sentinel,
          i = 0;

      while ((item = item.next) !== list.sentinel) {
        if (item.data === value) {
          return list.lastFind = item;
        }
      }
    }

    function LinkedList(){
      this.sentinel = new Sentinel(this);
      this.size = 0;
      this.lastFind = null;
      hide(this, 'sentinel');
      hide(this, 'lastFind');
    }

    define(LinkedList.prototype, [
      function first() {
        return this.sentinel.next.data;
      },
      function last() {
        return this.sentinel.prev.data;
      },
      function unshift(value){
        var item = new Item(value, this.sentinel);
        return this.size++;
      },
      function push(value){
        var item = new Item(value, this.sentinel.prev);
        return this.size++;
      },
      function insert(value, after){
        var item = find(this, after);
        if (item) {
          item = new Item(value, item);
          return this.size++;
        }
        return false;
      },
      function replace(value, replacement){
        var item = find(this, value);
        if (item) {
          new Item(replacement, item);
          item.unlink();
          return true;
        }
        return false;
      },
      function insertBefore(value, before){
        var item = find(this, before);
        if (item) {
          item = new Item(value, item.prev);
          return this.size++;
        }
        return false;
      },
      function pop(){
        if (this.size) {
          this.size--;
          return this.sentinel.prev.unlink().data;
        }
      },
      function shift() {
        if (this.size) {
          this.size--;
          return this.sentinel.next.unlink().data;
        }
      },
      function remove(value){
        var item = find(this, value);
        if (item) {
          item.unlink();
          return true;
        }
        return false;
      },
      function has(value) {
        return !!find(this, value);
      },
      function items(){
        var item = this.sentinel,
            array = [];

        while ((item = item.next) !== this.sentinel) {
          array.push(item.data);
        }

        return array;
      },
      function clear(){
        var next,
            item = this.sentinel.next;

        while (item !== this.sentinel) {
          next = item.next;
          item.clear();
          item = next;
        }

        this.size = 0;
        return this;
      },
      function clone(){
        var item = this.sentinel,
            list = new LinkedList;

        while ((item = item.next) !== this.sentinel) {
          list.push(item.data);
        }
        return list;
      },
      function forEach(callback, context){
        var item = this.sentinel,
            i = 0;
        context = context || this;
        while ((item = item.next) !== this.sentinel) {
          callback.call(context, item.data, i++, this);
        }
      },
      function map(callback, context) {
        var array = [];
        context = context || this;

        this.forEach(function(data, i){
          array.push(callback.call(context, data, i, this));
        });

        return array;
      },
      function filter(callback, context) {
        var array = [];
        context = context || this;

        this.forEach(function(data, i){
          if (callback.call(context, data, i, this)) {
            array.push(data);
          }
        });

        return array;
      },
      function __iterator__(){
        return new LinkedListIterator(this);
      }
    ]);

    return LinkedList;
  })();


  exports.Stack = (function(){
    function StackIterator(stack){
      this.stack = stack;
      this.index = stack.length;
    }

    define(StackIterator.prototype, [
      function next(){
        if (!this.index) {
          throw StopIteration;
        }
        return this.stack[--this.index];
      }
    ]);

    function Stack(){
      this.empty();
      for (var k in arguments) {
        this.push(arguments[k]);
      }
    }

    define(Stack.prototype, [
      function push(item){
        this.items.push(item);
        this.length++;
        this.top = item;
        return this;
      },
      function pop(){
        this.length--;
        this.top = this.items[this.length - 1];
        return this.items.pop();
      },
      function empty(){
        this.length = 0;
        this.items = [];
        this.top = undefined;
      },
      function first(callback, context){
        var i = this.length;
        context || (context = this);
        while (i--)
          if (callback.call(context, this[i], i, this))
            return this[i];
      },
      function filter(callback, context){
        var i = this.length,
            out = new Stack;

        context || (context = this);

        for (var i=0; i < this.length; i++) {
          if (callback.call(context, this[i], i, this)) {
            out.push(this[i]);
          }
        }

        return out;
      },
      function __iterator__(){
        return new StackIterator(this);
      }
    ]);

    return Stack;
  })();

  var Queue = exports.Queue = (function(){
    function QueueIterator(queue){
      this.queue = queue;
      this.index = queue.index;
    }

    define(QueueIterator.prototype, [
      function next(){
        if (this.index === this.queue.items.length) {
          throw StopIteration;
        }
        return this.queue.items[this.index++];
      }
    ]);

    function Queue(items){
      if (isObject(items)) {
        if (items instanceof Queue) {
          this.items = items.items.slice(items.front);
        } else if (items instanceof Array) {
          this.items = items.slice();
        } else if (items.length) {
          this.items = slice.call(items);
        } else {
          this.items = [items];
        }
      } else if (items != null) {
        this.items = [items];
      } else {
        this.items = [];
      }
      this.length = this.items.length;
      this.index = 0;
    }

    define(Queue.prototype, [
      function push(item){
        this.items.push(item);
        this.length++;
        return this;
      },
      function shift(){
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
      function empty(){
        this.length = 0;
        this.index = 0;
        this.items = [];
        return this;
      },
      function front(){
        return this.items[this.index];
      },
      function item(depth){
        return this.items[this.index + depth];
      },
      function __iterator__(){
        return new QueueIterator(this);
      }
    ]);

    return Queue;
  })();

  exports.Feeder = (function(){
    function Feeder(callback, context, pace){
      var self = this;
      this.queue = new Queue;
      this.active = false;
      this.pace = pace || 5;
      this.feeder = function feeder(){
        var count = Math.min(self.pace, self.queue.length);

        while (self.active && count--) {
          callback.call(context, self.queue.shift());
        }

        if (!self.queue.length) {
          self.active = false;
        } else if (self.active) {
          setTimeout(feeder, 15);
        }
      };
    }

    define(Feeder.prototype, [
      function push(item){
        this.queue.push(item);
        if (!this.active) {
          this.active = true;
          setTimeout(this.feeder, 15);
        }
        return this;
      },
      function pause(){
        this.active = false;
      }
    ]);

    return Feeder;
  })();

  function inspect(o){
    o = require('util').inspect(o, null, 4);
    console.log(o);
    return o;
  }
  exports.inspect = inspect;

  return exports;
})(typeof module !== 'undefined' ? module.exports : {});


exports.constants = (function(exports){
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


  function NativeBrand(name){
    this.name = name;
    this.brand = '[object '+name+']';
  }

  define(NativeBrand.prototype, [
    function toString(){
      return this.name;
    },
    function inspect(){
      return this.name;
    }
  ]);


  exports.BRANDS = {
    BooleanWrapper     : new NativeBrand('Boolean'),
    GlobalObject       : new NativeBrand('global'),
    NativeArguments    : new NativeBrand('Arguments'),
    NativeArrayIterator: new NativeBrand('ArrayIterator'),
    NativeArray        : new NativeBrand('Array'),
    NativeDate         : new NativeBrand('Date'),
    NativeError        : new NativeBrand('Error'),
    NativeFunction     : new NativeBrand('Function'),
    NativeIterator     : new NativeBrand('Iterator'),
    NativeJSON         : new NativeBrand('JSON'),
    NativeMap          : new NativeBrand('Map'),
    NativeMath         : new NativeBrand('Math'),
    NativeModule       : new NativeBrand('Module'),
    NativeObject       : new NativeBrand('Object'),
    NativeRegExp       : new NativeBrand('RegExp'),
    NativeSet          : new NativeBrand('Set'),
    NativeSymbol       : new NativeBrand('Symbol'),
    NativeWeakMap      : new NativeBrand('WeakMap'),
    NumberWrapper      : new NativeBrand('Number'),
    StopIteration      : new NativeBrand('StopIteration'),
    StringWrapper      : new NativeBrand('String')
  };


  exports.BINARYOPS = new Constants(['instanceof', 'in', 'is', 'isnt', '==', '!=', '===', '!==', '<', '>',
                                   '<=', '>=', '*', '/','%', '+', '-', '<<', '>>', '>>>', '|', '&', '^', 'string+']);
  exports.UNARYOPS = new Constants(['delete', 'void', 'typeof', '+', '-', '~', '!']);
  exports.ENTRY = new Constants(['ENV', 'FINALLY', 'TRYCATCH', 'FOROF' ]);
  exports.FUNCTYPE = new Constants(['NORMAL', 'METHOD', 'ARROW' ]);
  exports.SCOPE = new Constants(['EVAL', 'FUNCTION', 'GLOBAL', 'MODULE' ]);

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

  var E = 0x1,
      C = 0x2,
      W = 0x4,
      A = 0x8;

  exports.ATTRIBUTES = {
    ENUMERABLE  : E,
    CONFIGURABLE: C,
    WRITABLE    : W,
    ACCESSOR    : A,
    ___: 0,
    E__: E,
    _C_: C,
    EC_: E | C,
    __W: W,
    E_W: E | W,
    _CW: C | W,
    ECW: E | C | W,
    __A: A,
    E_A: E | A,
    _CA: C | A,
    ECA: E | C | A
  };

  exports.AST = new Constants(['ArrayExpression', 'ArrayPattern', 'ArrowFunctionExpression',
    'AssignmentExpression', 'BinaryExpression', 'BlockStatement', 'BreakStatement',
    'CatchClause', 'ClassBody', 'ClassDeclaration', 'ClassExpression', 'ClassHeritage',
    'ConditionalExpression', 'DebuggerStatement', 'DoWhileStatement', 'EmptyStatement',
    'ExportDeclaration', 'ExportSpecifier', 'ExportSpecifierSet', 'ExpressionStatement',
    'ForInStatement', 'ForOfStatement', 'ForStatement', 'FunctionDeclaration',
    'FunctionExpression', 'Glob', 'Identifier', 'IfStatement', 'ImportDeclaration',
    'ImportSpecifier', 'LabeledStatement', 'Literal', 'LogicalExpression', 'MemberExpression',
    'MethodDefinition', 'ModuleDeclaration', 'NewExpression', 'ObjectExpression', 'ObjectPattern',
    'Path', 'Program', 'Property', 'ReturnStatement', 'SequenceExpression', 'SwitchStatement',
    'TaggedTemplateExpression', 'TemplateElement', 'TemplateLiteral', 'ThisExpression',
    'ThrowStatement', 'TryStatement', 'UnaryExpression', 'UpdateExpression', 'VariableDeclaration',
    'VariableDeclarator', 'WhileStatement', 'WithStatement', 'YieldExpression']);





  return exports;
})(typeof module !== 'undefined' ? module.exports : {});


exports.errors = (function(errors, messages, exports){
  var inherit = require('./utility').inherit,
      define = require('./utility').define,
      constants = require('./constants');


  function Exception(name, type, message){
    var args = {},
        argNames = [],
        src = '';

    for (var i=0; i < message.length; i++) {
      var str = message[i];
      if (str[0] === '$') {
        if (!args.hasOwnProperty(str))
          argNames.push(str);
        src += '+'+str;
      } else {
        src += '+'+'"'+str.replace(/["\\\n]/g, '\\$0')+'"';
      }
    }

    this.name = name;
    this.type = type;
    return new Function('e', 'return function '+name+'('+argNames.join(', ')+'){ return '+src.slice(1)+'; }')(this);
  }



  for (var name in messages) {
    for (var type in messages[name]) {
      errors[type] = new Exception(name, type, messages[name][type]);
    }
  }




  // ##################
  // ### Completion ###
  // ##################

  function Completion(type, value, target){
    this.type = type;
    this.value = value;
    this.target = target;
  }

  exports.Completion = Completion;

  define(Completion.prototype, {
    Completion: true
  });

  define(Completion.prototype, [
    function toString(){
      return this.value;
    },
    function valueOf(){
      return this.value;
    }
  ]);


  function AbruptCompletion(type, value, target){
    this.type = type;
    this.value = value;
    this.target = target;
  }

  inherit(AbruptCompletion, Completion, {
    Abrupt: true
  });

  exports.AbruptCompletion = AbruptCompletion;

  function MakeException(type, args){
    if (!(args instanceof Array)) {
      args = [args];
    }
    var error = errors[type];
    return exports.createError(error.name, type, error.apply(null, args));
  }

  exports.MakeException = MakeException;


  function ThrowException(type, args){
    return new AbruptCompletion('throw', MakeException(type, args));
  }

  exports.ThrowException = ThrowException;


  return exports;
})({}, {
  TypeError: {
    cyclic_proto                   : ["Cyclic __proto__ value"],
    incompatible_method_receiver   : ["Method ", "$0", " called on incompatible receiver ", "$1"],
    invalid_lhs_in_assignment      : ["Invalid left-hand side in assignment"],
    invalid_lhs_in_for_in          : ["Invalid left-hand side in for-in"],
    invalid_lhs_in_postfix_op      : ["Invalid left-hand side expression in postfix operation"],
    invalid_lhs_in_prefix_op       : ["Invalid left-hand side expression in prefix operation"],
    redeclaration                  : ["$0", " '", "$1", "' has already been declared"],
    uncaught_exception             : ["Uncaught ", "$0"],
    stack_trace                    : ["Stack Trace:\n", "$0"],
    called_non_callable            : ["$0", " is not a function"],
    property_not_function          : ["Property '", "$0", "' of object ", "$1", " is not a function"],
    not_constructor                : ["$0", " is not a constructor"],
    cannot_convert_to_primitive    : ["Cannot convert object to primitive value"],
    with_expression                : ["$0", " has no properties"],
    illegal_invocation             : ["Illegal invocation"],
    invalid_in_operator_use        : ["Cannot use 'in' operator to search for '", "$0", "' in ", "$1"],
    instanceof_function_expected   : ["Expecting a function in instanceof check, but got ", "$0"],
    instanceof_nonobject_proto     : ["Function has non-object prototype '", "$0", "' in instanceof check"],
    null_to_object                 : ["Cannot convert null to object"],
    undefined_to_object            : ["Cannot convert undefined to object"],
    object_not_coercible           : ["$0", " cannot convert ", "$1", " to an object"],
    reduce_no_initial              : ["Reduce of empty array with no initial value"],
    callback_must_be_callable      : ["$0", " requires a function callback"],
    getter_must_be_callable        : ["Getter must be a function: ", "$0"],
    setter_must_be_callable        : ["Setter must be a function: ", "$0"],
    value_and_accessor             : ["A property cannot both have accessors and be writable or have a value, ", "$0"],
    proto_object_or_null           : ["Object prototype may only be an Object or null"],
    property_desc_object           : ["Property description must be an object: ", "$0"],
    redefine_disallowed            : ["Cannot redefine property: ", "$0"],
    apply_wrong_args               : ["Invalid arguments used in apply"],
    define_disallowed              : ["Cannot define property:", "$0", ", object is not extensible."],
    non_extensible_proto           : ["$0", " is not extensible"],
    handler_non_object             : ["Proxy.", "$0", " called with non-object as handler"],
    proto_non_object               : ["Proxy.", "$0", " called with non-object as prototype"],
    trap_function_expected         : ["Proxy.", "$0", " called with non-function for '", "$1", "' trap"],
    handler_trap_missing           : ["Proxy handler ", "$0", " has no '", "$1", "' trap"],
    handler_trap_must_be_callable  : ["Proxy handler ", "$0", " has non-callable '", "$1", "' trap"],
    handler_returned_false         : ["Proxy handler ", "$0", " returned false from '", "$1", "' trap"],
    handler_returned_undefined     : ["Proxy handler ", "$0", " returned undefined from '", "$1", "' trap"],
    proxy_non_object_prop_names    : ["Trap '", "$1", "' returned non-object ", "$0"],
    proxy_repeated_prop_name       : ["Trap '", "$1", "' returned repeated property name '", "$2", "'"],
    invalid_weakmap_key            : ["Invalid value used as weak map key"],
    invalid_json                   : ["String '", "$0", "' is not valid JSON"],
    circular_structure             : ["Converting circular structure to JSON"],
    called_on_non_function         : ["$0", " called on non-function"],
    called_on_non_object           : ["$0", " called on non-object"],
    called_on_null_or_undefined    : ["$0", " called on null or undefined"],
    strict_delete_property         : ["Cannot delete property '", "$0", "' of ", "$1"],
    super_delete_property          : ["Cannot delete property '", "$0", "' from super"],
    strict_read_only_property      : ["Cannot assign to read only property '", "$0", "' of ", "$1"],
    strict_cannot_assign           : ["Cannot assign to read only '", "$0", "' in strict mode"],
    strict_poison_pill             : ["'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them"],
    object_not_extensible          : ["Can't add property ", "$0", ", object is not extensible"],


    proxy_prototype_inconsistent        : ["cannot report a prototype value that is inconsistent with target prototype value"],
    proxy_extensibility_inconsistent    : ["cannot report a non-extensible object as extensible or vice versa"],
    proxy_configurability_inconsistent  : ["cannot report innacurate configurability for property '", "$0"],
    proxy_enumerate_properties          : ["enumerate trap failed to include non-configurable enumerable property '", "$0", "'"],
    missing_fundamental_trap            : ["Proxy handler is missing fundamental trap ", "$0"],
    non_object_superclass               : ["non-object superclass provided"],
    non_object_superproto               : ["non-object superprototype"],
    invalid_super_binding               : ["object has no super binding"],
    not_generic                         : ["$0", " is not generic and was called on an invalid target"],
    spread_non_object                   : ["Expecting an object as spread argument, but got ", "$0"],
    called_on_incompatible_object       : ["$0", " called on incompatible object"],
    double_initialization               : ["Initializating an already initialized ", "$0"],
    construct_arrow_function            : ["Arrow functions cannot be constructed"],
    generator_executing                 : ["'", "$0", "' called on executing generator"],
    generator_closed                    : ["'", "$0", "' called on closed generator"],
    generator_send_newborn              : ["Sent value into newborn generator"]
  },
  ReferenceError: {
    unknown_label                  : ["Undefined label '", "$0", "'"],
    undefined_method               : ["Object ", "$1", " has no method '", "$0", "'"],
    not_defined                    : ["$0", " is not defined"],
    uninitialized_const            : ["$0", " is not initialized"],
    non_object_property_load       : ["Cannot read property '", "$0", "' of ", "$1"],
    non_object_property_store      : ["Cannot set property '", "$0", "' of ", "$1"],
    non_object_property_call       : ["Cannot call method '", "$0", "' of ", "$1"],
    no_setter_in_callback          : ["Cannot set property ", "$0", " of ", "$1", " which has only a getter"],
  },
  RangeError: {
    invalid_array_length           : ["Invalid array length"],
    invalid_repeat_count           : ["Invalid repeat count"],
    stack_overflow                 : ["Maximum call stack size exceeded"],
    invalid_time_value             : ["Invalid time value"],
  },
  SyntaxError : {
    multiple_defaults_in_switch    : ["More than one default clause in switch statement"],
    newline_after_throw            : ["Illegal newline after throw"],
    no_catch_or_finally            : ["Missing catch or finally after try"],
    malformed_regexp               : ["Invalid regular expression: /", "$0", "/: ", "$1"],
    unterminated_regexp            : ["Invalid regular expression: missing /"],
    regexp_flags                   : ["Cannot supply flags when constructing one RegExp from another"],
    unexpected_token               : ["Unexpected token ", "$0"],
    unexpected_token_number        : ["Unexpected number"],
    unexpected_token_string        : ["Unexpected string"],
    unexpected_token_identifier    : ["Unexpected identifier"],
    unexpected_reserved            : ["Unexpected reserved word"],
    unexpected_strict_reserved     : ["Unexpected strict mode reserved word"],
    unexpected_eos                 : ["Unexpected end of input"],
    invalid_regexp_flags           : ["Invalid flags supplied to RegExp constructor '", "$0", "'"],
    invalid_regexp                 : ["Invalid RegExp pattern /", "$0", "/"],
    illegal_break                  : ["Illegal break statement"],
    illegal_continue               : ["Illegal continue statement"],
    illegal_return                 : ["Illegal return statement"],
    illegal_let                    : ["Illegal let declaration outside extended mode"],
    illegal_access                 : ["Illegal access"],
    strict_mode_with               : ["Strict mode code may not include a with statement"],
    strict_catch_variable          : ["Catch variable may not be eval or arguments in strict mode"],
    strict_param_name              : ["Parameter name eval or arguments is not allowed in strict mode"],
    strict_param_dupe              : ["Strict mode function may not have duplicate parameter names"],
    strict_var_name                : ["Variable name may not be eval or arguments in strict mode"],
    strict_function_name           : ["Function name may not be eval or arguments in strict mode"],
    strict_octal_literal           : ["Octal literals are not allowed in strict mode."],
    strict_duplicate_property      : ["Duplicate data property in object literal not allowed in strict mode"],
    accessor_data_property         : ["Object literal may not have data and accessor property with the same name"],
    accessor_get_set               : ["Object literal may not have multiple get/set accessors with the same name"],
    strict_lhs_assignment          : ["Assignment to eval or arguments is not allowed in strict mode"],
    strict_lhs_postfix             : ["Postfix increment/decrement may not have eval or arguments operand in strict mode"],
    strict_lhs_prefix              : ["Prefix increment/decrement may not have eval or arguments operand in strict mode"],
    strict_reserved_word           : ["Use of future reserved word in strict mode"],
    strict_delete                  : ["Delete of an unqualified identifier in strict mode."],
    strict_caller                  : ["Illegal access to a strict mode caller function."],
    const_assign                   : ["Assignment to constant variable."],
    invalid_module_path            : ["Module does not export '", "$0", "', or export is not itself a module"],
    module_type_error              : ["Module '", "$0", "' used improperly"],
  },
}, typeof module !== 'undefined' ? module.exports : {});



exports.assembler = (function(exports){
  var utility   = require('./utility'),
      util      = require('util');

  var walk      = utility.walk,
      collector = utility.collector,
      Stack     = utility.Stack,
      define    = utility.define,
      assign    = utility.assign,
      create    = utility.create,
      copy      = utility.copy,
      decompile = utility.decompile,
      inherit   = utility.inherit,
      ownKeys   = utility.keys,
      isObject  = utility.isObject,
      iterate   = utility.iterate,
      each      = utility.each,
      repeat    = utility.repeat,
      map       = utility.map,
      fold      = utility.fold,
      generate  = utility.generate,
      quotes    = utility.quotes;

  var constants = require('./constants'),
      BINARYOPS = constants.BINARYOPS.hash,
      UNARYOPS  = constants.UNARYOPS.hash,
      ENTRY     = constants.ENTRY.hash,
      SCOPE     = constants.SCOPE.hash,
      AST       = constants.AST,
      FUNCTYPE  = constants.FUNCTYPE.hash;

  var hasOwn = {}.hasOwnProperty,
      push = [].push,
      proto = Math.random().toString(36).slice(2),
      context,
      opcodes = 0;

  function StandardOpCode(params, name){
    var opcode = this;
    var func = this.creator();
    this.id = func.id = opcodes++;
    this.params = func.params = params;
    this.name = func.opname = name;
    return func;
  }

  define(StandardOpCode.prototype, [
    function creator(){
      var opcode = this;
      return function(){
        return context.code.createDirective(opcode, arguments);
      };
    },
    function inspect(){
      return this.name;
    },
    function toString(){
      return this.name
    },
    function valueOf(){
      return this.id;
    },
    function toJSON(){
      return this.id;
    }
  ]);


  function InternedOpCode(params, name){
    return StandardOpCode.call(this, params, name);
  }

  inherit(InternedOpCode, StandardOpCode, [
    function creator(){
      var opcode = this;
      return function(a, b, c){
        //return context.code.createDirective(opcode, [context.intern(arg)]);
        return context.code.createDirective(opcode, [a, b, c]);
      };
    }
  ]);



  var ARRAY            = new StandardOpCode(0, 'ARRAY'),
      ARG              = new StandardOpCode(0, 'ARG'),
      ARGS             = new StandardOpCode(0, 'ARGS'),
      ARRAY_DONE       = new StandardOpCode(0, 'ARRAY_DONE'),
      BINARY           = new StandardOpCode(1, 'BINARY'),
      BLOCK            = new StandardOpCode(1, 'BLOCK'),
      CALL             = new StandardOpCode(0, 'CALL'),
      CASE             = new StandardOpCode(1, 'CASE'),
      CLASS_DECL       = new StandardOpCode(1, 'CLASS_DECL'),
      CLASS_EXPR       = new StandardOpCode(1, 'CLASS_EXPR'),
      COMPLETE         = new StandardOpCode(0, 'COMPLETE'),
      CONST            = new StandardOpCode(1, 'CONST'),
      CONSTRUCT        = new StandardOpCode(0, 'CONSTRUCT'),
      DEBUGGER         = new StandardOpCode(0, 'DEBUGGER'),
      DEFAULT          = new StandardOpCode(1, 'DEFAULT'),
      DEFINE           = new StandardOpCode(1, 'DEFINE'),
      DUP              = new StandardOpCode(0, 'DUP'),
      ELEMENT          = new StandardOpCode(0, 'ELEMENT'),
      ENUM             = new StandardOpCode(0, 'ENUM'),
      EXTENSIBLE       = new StandardOpCode(1, 'EXTENSIBLE'),
      FLIP             = new StandardOpCode(1, 'FLIP'),
      FUNCTION         = new StandardOpCode(2, 'FUNCTION'),
      GET              = new StandardOpCode(0, 'GET'),
      IFEQ             = new StandardOpCode(2, 'IFEQ'),
      IFNE             = new StandardOpCode(2, 'IFNE'),
      INC              = new StandardOpCode(0, 'INC'),
      INDEX            = new StandardOpCode(2, 'INDEX'),
      ITERATE          = new StandardOpCode(0, 'ITERATE'),
      JUMP             = new StandardOpCode(1, 'JUMP'),
      LET              = new StandardOpCode(1, 'LET'),
      LITERAL          = new StandardOpCode(1, 'LITERAL'),
      LOG              = new StandardOpCode(0, 'LOG'),
      MEMBER           = new InternedOpCode(1, 'MEMBER'),
      METHOD           = new StandardOpCode(3, 'METHOD'),
      NATIVE_CALL      = new StandardOpCode(0, 'NATIVE_CALL'),
      NATIVE_REF       = new InternedOpCode(1, 'NATIVE_REF'),
      OBJECT           = new StandardOpCode(0, 'OBJECT'),
      POP              = new StandardOpCode(0, 'POP'),
      POPN             = new StandardOpCode(1, 'POPN'),
      PROPERTY         = new InternedOpCode(1, 'PROPERTY'),
      PUT              = new StandardOpCode(0, 'PUT'),
      REF              = new InternedOpCode(1, 'REF'),
      REFSYMBOL        = new InternedOpCode(1, 'REFSYMBOL'),
      REGEXP           = new StandardOpCode(1, 'REGEXP'),
      RETURN           = new StandardOpCode(0, 'RETURN'),
      ROTATE           = new StandardOpCode(1, 'ROTATE'),
      RUN              = new StandardOpCode(0, 'RUN'),
      SAVE             = new StandardOpCode(0, 'SAVE'),
      SPREAD           = new StandardOpCode(1, 'SPREAD'),
      SPREAD_ARG       = new StandardOpCode(0, 'SPREAD_ARG'),
      STRING           = new InternedOpCode(1, 'STRING'),
      SUPER_CALL       = new StandardOpCode(0, 'SUPER_CALL'),
      SUPER_ELEMENT    = new StandardOpCode(0, 'SUPER_ELEMENT'),
      SUPER_MEMBER     = new StandardOpCode(1, 'SUPER_MEMBER'),
      SYMBOL           = new InternedOpCode(3, 'SYMBOL'),
      TEMPLATE         = new StandardOpCode(1, 'TEMPLATE'),
      THIS             = new StandardOpCode(0, 'THIS'),
      THROW            = new StandardOpCode(0, 'THROW'),
      UNARY            = new StandardOpCode(1, 'UNARY'),
      UNDEFINED        = new StandardOpCode(0, 'UNDEFINED'),
      UPDATE           = new StandardOpCode(1, 'UPDATE'),
      UPSCOPE          = new StandardOpCode(0, 'UPSCOPE'),
      VAR              = new StandardOpCode(1, 'VAR'),
      WITH             = new StandardOpCode(0, 'WITH'),
      YIELD            = new StandardOpCode(1, 'YIELD');




  var Code = (function(){
    var Directive = (function(){
      function Directive(op, args){
        this.op = op;
        this.loc = currentNode.loc;
        this.range = currentNode.range;
        for (var i=0; i < op.params; i++) {
          this[i] = args[i];
        }
      }

      define(Directive.prototype, [
        function inspect(){
          var out = [];
          for (var i=0; i < this.op.params; i++) {
            out.push(util.inspect(this[i]));
          }
          return util.inspect(this.op)+'('+out.join(', ')+')';
        }
      ]);

      return Directive;
    })();

    var Params = (function(){
      function Params(params, node, rest){
        this.length = 0;
        if (params) {
          push.apply(this, params)
          this.BoundNames = BoundNames(params);
        } else {
          this.BoundNames = [];
        }
        this.Rest = rest;
        this.ExpectedArgumentCount = this.BoundNames.length;
        if (rest) this.BoundNames.push(rest.name);
      }

      define(Params, [
        function add(items){

        }
      ]);
      return Params;
    })();

    function Code(node, source, type, scope, strict){
      function Instruction(opcode, args){
        Directive.call(this, opcode, args);
      }

      inherit(Instruction, Directive, {
        code: this
      });

      var body = node;

      if (node.type === 'Program') {
        this.topLevel = true;
        this.imports = getImports(node);
      } else {
        this.topLevel = false;
        body = body.body;
        if (node.type === 'ModuleDeclaration') {
          this.imports = getImports(body);
          body = body.body;
        }
      }

      this.path = [];


      define(this, {
        body: body,
        source: source == null ? context.code.source : source,
        range: node.range,
        loc: node.loc,
        children: [],
        LexicalDeclarations: LexicalDeclarations(body),
        createDirective: function(opcode, args){
          var op = new Instruction(opcode, args);
          this.ops.push(op);
          return op;
        }
      });


      if (node.id) {
        this.name = node.id.name;
      }

      if (node.generator) {
        this.generator = true;
      }


      this.transfers = [];
      this.ScopeType = scope;
      this.Type = type || FUNCTYPE.NORMAL;
      this.VarDeclaredNames = [];
      this.NeedsSuperBinding = ReferencesSuper(this.body);
      this.Strict = strict || (context.code && context.code.strict) || isStrict(this.body);
      if (scope === SCOPE.MODULE) {
        this.ExportedNames = getExports(this.body);
      }
      this.params = new Params(node.params, node, node.rest);
      this.ops = [];
    }


    define(Code.prototype, [
      function derive(code){
        if (code) {
          this.strings = code.strings;
          this.hash = code.hash;
          this.natives = code.natives;
        }
      },
      function lookup(id){
        return id;
        if (typeof id === 'number') {
          return this.strings[id];
        } else {
          return id;
        }
      }
    ]);

    return Code;
  })();


  function ClassDefinition(node){
    var self = this;
    this.name = node.id ? node.id.name : null;
    this.methods = [];
    this.symbols = [];

    each(node.body.body, function(node){
      if (node.type === 'SymbolDefinition') {
        var symbols = {
          Init: create(null),
          Names: [],
          Private: node.kind === 'private'
        };
        self.symbols.push(symbols);

        each(node.declarations, function(item){
          symbols.init[item.id.name] = item.init;
          symbols.Names.push(item.id.name);
        });
      } else {
        var method = node;
        var code = new Code(method.value, context.source, FUNCTYPE.METHOD, SCOPE.CLASS, context.code.Strict);
        if (self.name) {
          code.name = self.name + '#' + method.key.name;
        } else {
          code.name = method.key.name;
        }
        context.pending.push(code);

        if (method.kind === '') {
          method.kind = 'method';
        }

        if (method.key.name === 'constructor') {
          self.ctor = code;
        } else {
          self.methods.push({
            kind: method.kind,
            code: code,
            name: method.key.name
          });
        }
      }
    });

    if (node.superClass) {
      recurse(node.superClass);
      GET();
      this.superClass = node.superClass.name;
    }
  }

  var Unwinder = (function(){
    function Unwinder(type, begin, end){
      this.type = type;
      this.begin = begin;
      this.end = end;
    }

    define(Unwinder.prototype, [
      function toJSON(){
        return [this.type, this.begin, this.end];
      }
    ]);

    return Unwinder;
  })();

  var ControlTransfer = (function(){
    function ControlTransfer(labels){
      this.labels = labels;
      this.breaks = [];
      this.continues = [];
    }

    define(ControlTransfer.prototype, {
      labels: null,
      breaks: null,
      continues: null
    });

    define(ControlTransfer.prototype, [
      function updateContinues(ip){
        if (ip !== undefined) {
          each(this.continues, function(item){ item[0] = ip });
        }
      },
      function updateBreaks(ip){
        if (ip !== undefined) {
          each(this.breaks, function(item){ item[0] = ip });
        }
      }
    ]);

    return ControlTransfer;
  })();


  function isSuperReference(node) {
    return !!node && node.type === 'Identifier' && node.name === 'super';
  }

  function isUseStrictDirective(node){
    return node.type === 'ExpressionSatatement'
        && node.expression.type === 'Literal'
        && node.expression.value === 'use strict';
  }

  function isPattern(node){
    return !!node && node.type === 'ObjectPattern' || node.type === 'ArrayPattern';
  }

  function isLexicalDeclaration(node){
    return !!node && node.type === 'VariableDeclaration' && node.kind !== 'var';
  }

  function isFunction(node){
    return node.type === 'FunctionDeclaration'
        || node.type === 'FunctionExpression'
        || node.type === 'ArrowFunctionExpression';
  }

  function isDeclaration(node){
    return node.type === 'FunctionDeclaration'
        || node.type === 'ClassDeclaration'
        || node.type === 'VariableDeclaration';
  }

  function isAnonymousFunction(node){
    return !!node && !(node.id && node.id.name)
        && node.type === 'FunctionExpression'
        || node.type === 'ArrowFunctionExpression';
  }

  function isStrict(node){
    if (isFunction(node)) {
      node = node.body.body;
    } else if (node.type === 'Program') {
      node = node.body;
    }
    if (node instanceof Array) {
      for (var i=0, element; element = node[i]; i++) {
        if (isUseStrictDirective(element)) {
          return true;
        } else if (element.type !== 'EmptyStatement' && element.type !== 'FunctionDeclaration') {
          return false;
        }
      }
    }
    return false;
  }


  var boundNamesCollector = collector({
    ObjectPattern      : 'properties',
    ArrayPattern       : 'elements',
    VariableDeclaration: 'declarations',
    BlockStatement     : walk.RECURSE,
    Program            : walk.RECURSE,
    ForStatement       : walk.RECURSE,
    Property           : 'value',
    ExportDeclaration  : 'declaration',
    ExportSpecifierSet : 'specifiers',
    ImportDeclaration  : 'specifiers',
    Identifier         : ['name'],
    ImportSpecifier    : 'id',
    VariableDeclarator : 'id',
    ModuleDeclaration  : 'id',
    FunctionDeclaration: 'id',
    ClassDeclaration   : 'id'
  });


  function BoundNames(node){
    if (isFunction(node) || node.type === 'ClassDeclaration') {
      //node = node.body;
    }
    return boundNamesCollector(node);
  }

  var LexicalDeclarations = (function(lexical){
    return collector({
      ClassDeclaration: lexical(false),
      FunctionDeclaration: lexical(false),
      ExportDeclaration: walk.RECURSE,
      SwitchCase: walk.RECURSE,
      Program: walk.RECURSE,
      VariableDeclaration: lexical(function(node){
        return node.kind === 'const';
      }),
    });
  })(function(isConst){
    if (typeof isConst !== 'function') {
      isConst = (function(v){
        return function(){ return v };
      })(isConst);
    }
    return function(node){
      node.IsConstantDeclaration = isConst(node);
      node.BoundNames = BoundNames(node)//.map(intern);
      return node;
    };
  });



  var getExports = (function(){
    var collectExportDecls = collector({
      Program          : 'body',
      BlockStatement   : 'body',
      ExportDeclaration: true
    });

    var getExportedDecls = collector({
      ClassDeclaration   : true,
      ExportDeclaration  : walk.RECURSE,
      ExportSpecifier    : true,
      ExportSpecifierSet : walk.RECURSE,
      FunctionDeclaration: true,
      ModuleDeclaration  : true,
      VariableDeclaration: walk.RECURSE,
      VariableDeclarator : true
    });


    var getExportedNames = collector({
      ArrayPattern       : 'elements',
      ObjectPattern      : 'properties',
      Property           : 'value',
      ClassDeclaration   : 'id',
      ExportSpecifier    : 'id',
      FunctionDeclaration: 'id',
      ModuleDeclaration  : 'id',
      VariableDeclarator : 'id',
      Glob               : true,
      Identifier         : ['name'],
    });

    return function getExports(node){
      return getExportedNames(getExportedDecls(collectExportDecls(node)));
    };
  })();


  var getImports = (function(){
    var collectImportDecls = collector({
      Program          : 'body',
      BlockStatement   : 'body',
      ImportDeclaration: true,
      ModuleDeclaration: true
    });

    function Import(origin, name, specifiers){
      this.origin = origin;
      this.name = name;
      this.specifiers = specifiers;
    }

    var handlers = {
      Glob: function(){
        return ['*', '*'];
      },
      Path: function(node){
        return map(node.body, function(subpath){
          return handlers[subpath.type](subpath);
        });
      },
      ImportSpecifier: function(node){
        var name = handlers[node.id.type](node.id);
        var from = node.from === null ? name : handlers[node.from.type](node.from);
        return [name, from];
      },
      Identifier: function(node){
        return node.name;
      },
      Literal: function(node){
        return node.value;
      }
    };

    return function getImports(node){
      var decls = collectImportDecls(node),
          imported = [];

      each(decls, function(decl, i){
        if (decl.body) {
          var origin = name = decl.id.name;
          var specifiers = decl;
        } else {
          var origin = handlers[decl.from.type](decl.from);

          if (decl.type === 'ModuleDeclaration') {
            var name = decl.id.name;
          } else {
            var specifiers = create(null);
            each(decl.specifiers, function(specifier){
              var result = handlers[specifier.type](specifier);
              result = typeof result === 'string' ? [result, result] : result;
              if (!(result[1] instanceof Array)) {
                result[1] = [result[1]];
              }
              specifiers[result[0]] = result[1];
            });
          }
        }

        imported.push(new Import(origin, name, specifiers));
      });

      return imported;
    };
  })();


  function ReferencesSuper(node){
    var found = false;
    walk(node, function(node){
      switch (node.type) {
        case 'MemberExpression':
          if (isSuperReference(node.object)) {
            found = true;
            return walk.BREAK;
          }
          return walk.RECURSE;
        case 'CallExpression':
          if (isSuperReference(node.callee)) {
            found = true;
            return walk.BREAK;
          }
          return walk.RECURSE;
        case 'FunctionExpression':
        case 'FunctionDeclaration':
        case 'ArrowFunctionExpression':
          return walk.CONTINUE;
        default:
          return walk.RECURSE;
      }
    });
    return found;
  }



  var currentNode;
  function recurse(node){
    if (node) {
      if (node.type) {
        var lastNode = currentNode;
        currentNode = node;
        handlers[node.type](node);
        if (lastNode) {
          currentNode = lastNode;
        }
      } else if (node.length) {
        each(node, recurse);
      }
    }
  }


  function intern(str){
    return str;//context.intern(string);
  }

  function current(){
    return context.code.ops.length;
  }

  function last(){
    return context.code.ops[context.code.ops.length - 1];
  }

  function pop(){
    return context.code.ops.pop();
  }

  function adjust(op){
    if (op) {
      return op[0] = context.code.ops.length;
    }
  }

  function symbol(node){
    if (node.type === 'AtSymbol') {
      return ['@', node.name];
    } else {
      return ['', node.name];
    }
  }

  function macro(){
    var opcodes = arguments;
    MACRO.params = opcodes.length;
    return MACRO;

    function MACRO(){
      var offset = 0,
          args = arguments;

      each(opcodes, function(opcode){
        opcode.apply(null, generate(opcode.params, function(){
          return args[offset++]
        }));
      });
    }
  }

  function block(callback){
      var entry = new ControlTransfer(context.labels);
      context.jumps.push(entry);
      context.labels = create(null);
      callback();
      entry.updateBreaks(current());
      context.jumps.pop();
  }

  function control(callback){
    var entry = new ControlTransfer(context.labels);
    context.jumps.push(entry);
    context.labels = create(null);
    entry.updateContinues(callback());
    entry.updateBreaks(current());
    context.jumps.pop();
  }

  function lexical(type, callback){
    if (typeof type === 'function') {
      callback = type;
      type = ENTRY.ENV;
    }
    var begin = current();
    callback();
    context.code.transfers.push(new Unwinder(type, begin, current()));
  }

  function move(node, set, pos){
    if (node.label) {
      var transfer = context.jumps.first(function(transfer){
        return node.label.name in transfer.labels;
      });

    } else {
      var transfer = context.jumps.first(function(transfer){
        return transfer && transfer.continues;
      });
    }
    transfer && transfer[set].push(pos);
  }

  var elementAt = {
    elements: function(node, index){
      return node.elements[index];
    },
    properties: function(node, index){
      return node.properties[index].value;
    }
  };

  function destructure(left, right){
    var key = left.type === 'ArrayPattern' ? 'elements' : 'properties',
        rights = right[key];

    each(left[key], function(item, i){
      var binding = elementAt[key](left, i);

      if (isPattern(binding)){
        var value = rights && rights[i] ? elementAt[key](right, i) : binding;
        destructure(binding, value);
      } else {
        if (binding.type === 'SpreadElement') {
          recurse(binding.argument);
          recurse(right);
          SPREAD(i);
        } else {
          recurse(binding);
          recurse(right);
          if (left.type === 'ArrayPattern') {
            LITERAL(i);
            ELEMENT(i);
          } else {
            MEMBER(symbol(binding))
          }
        }
        PUT();
      }
    });
  }


  function args(node){
    ARGS();
    each(node, function(item, i){
      if (item && item.type === 'SpreadElement') {
        recurse(item.argument);
        GET();
        SPREAD_ARG();
      } else {
        recurse(item);
        GET();
        ARG();
      }
    });
  }

  function isGlobalOrEval(){
    return context.code.ScopeType === SCOPE.EVAL || context.code.ScopeType === SCOPE.GLOBAL;
  }


  function AssignmentExpression(node){
    if (node.operator === '='){
      if (isPattern(node.left)){
        destructure(node.left, node.right);
      } else {
        recurse(node.left);
        recurse(node.right);
        GET();
        PUT();
      }
    } else {
      recurse(node.left);
      DUP();
      GET();
      recurse(node.right);
      GET();
      BINARY(BINARYOPS[node.operator.slice(0, -1)]);
      PUT();
    }
  }

  function ArrayExpression(node){
    ARRAY();
    each(node.elements, function(item, i){
      var empty = false,
          spread = false,
          item = node.elements[i];

      if (!item){
        empty = true;
      } else if (item.type === 'SpreadElement'){
        spread = true;
        recurse(item.argument);
      } else {
        recurse(item);
      }

      GET();
      INDEX(empty, spread);
    });
    ARRAY_DONE();
  }

  function ArrayPattern(node){}

  function ArrowFunctionExpression(node, name){
    var code = new Code(node, null, FUNCTYPE.ARROW, SCOPE.FUNCTION);
    code.name = name;
    context.queue(code);
    FUNCTION(null, code);
    return code;
  }

  function AtSymbol(node){
    REFSYMBOL(node.name);
  }

  function BinaryExpression(node){
    recurse(node.left);
    GET();
    recurse(node.right);
    GET();
    BINARY(BINARYOPS[node.operator]);
  }

  function BreakStatement(node){
    move(node, 'breaks', JUMP(0));
  }

  function BlockStatement(node){
    block(function(){
      lexical(function(){
        BLOCK(LexicalDeclarations(node.body));
        each(node.body, recurse);
        UPSCOPE();
      });
    });
  }

  function CallExpression(node){
    if (isSuperReference(node.callee)) {
      if (context.code.ScopeType !== SCOPE.FUNCTION) {
        throwError('illegal_super');
      }
      SUPER_CALL();
    } else {
      recurse(node.callee);
    }
    DUP();
    GET();
    args(node.arguments);
    node.callee.type === 'NativieIdentifier' ? NATIVE_CALL(): CALL();
  }

  function CatchClause(node){
    lexical(function(){
      var decls = LexicalDeclarations(node.body);
      decls.push({
        type: 'VariableDeclaration',
        kind: 'let',
        IsConstantDeclaration: false,
        BoundNames: [node.param.name],
        declarations: [{
          type: 'VariableDeclarator',
          id: node.param,
          init: undefined
        }]
      });
      BLOCK(decls);
      recurse(node.param);
      PUT();
      each(node.body.body, recurse);
      UPSCOPE();
    });
  }

  function ClassBody(node){}

  function ClassDeclaration(node){
    CLASS_DECL(new ClassDefinition(node));
  }

  function ClassExpression(node){
    CLASS_EXPR(new ClassDefinition(node));
  }

  function ClassHeritage(node){}

  function ConditionalExpression(node){
    recurse(node.test);
    GET();
    var test = IFEQ(0, false);
    recurse(node.consequent)
    GET();
    var alt = JUMP(0);
    adjust(test);
    recurse(node.alternate);
    GET();
    adjust(alt);
  }

  function ContinueStatement(node){
    move(node, 'continues', JUMP(0));
  }

  function DoWhileStatement(node){
    control(function(){
      var start = current();
      recurse(node.body);
      var cond = current();
      recurse(node.test);
      GET();
      IFEQ(start, true);
      return cond;
    });
  }

  function DebuggerStatement(node){
    DEBUGGER();
  }

  function EmptyStatement(node){}

  function ExportSpecifier(node){}

  function ExportSpecifierSet(node){

  }

  function ExportDeclaration(node){
    if (node.declaration) {
      recurse(node.declaration);
    }
  }

  function ExpressionStatement(node){
    recurse(node.expression);
    GET();
    isGlobalOrEval() ? SAVE() : POP();
  }

  function ForStatement(node){
    control(function(){
      lexical(function(){
        var init = node.init;
        if (init){
          var isLexical = isLexicalDeclaration(init);
          if (isLexical) {
            var scope = BLOCK([]);
            recurse(init);
            var decl = init.declarations[init.declarations.length - 1].id;
            scope[0] = BoundNames(decl);
            var lexicalDecl = {
              type: 'VariableDeclaration',
              kind: init.kind,
              declarations: [{
                type: 'VariableDeclarator',
                id: decl,
                init: null
              }],
            };
            lexicalDecl.BoundNames = BoundNames(lexicalDecl);
            recurse(decl);
          } else {
            recurse(init);
            GET();
            POP();
          }
        }

        var test = current();

        if (node.test) {
          recurse(node.test);
          GET();
          var op = IFEQ(0, false);
        }

        var update = current();

        if (node.body.body && decl) {
          block(function(){
            lexical(function(){
              var lexicals = LexicalDeclarations(node.body.body);
              lexicals.push(lexicalDecl);
              GET();
              BLOCK(lexicals);
              recurse(decl);
              ROTATE(1);
              PUT();
              each(node.body.body, recurse);
              UPSCOPE();
            });
          });
        } else {
          recurse(node.body);
        }

        if (node.update) {
          recurse(node.update);
          GET();
          POP();
        }

        JUMP(test);
        adjust(op);
        isLexical && UPSCOPE();
        return update;
      });
    });
  }

  function ForInStatement(node){
    iteration(node, ENUM);
  }

  function ForOfStatement(node){
    iteration(node, ITERATE);
  }

  function iteration(node, KIND){
    control(function(){
      var update;
      lexical(ENTRY.FOROF, function(){
        recurse(node.right);
        GET();
        KIND();
        GET();
        DUP();
        MEMBER('next');
        GET();
        update = current();
        DUP();
        DUP();
        ARGS();
        CALL();
        DUP();
        var compare = IFEQ(0, false);
        if (node.left.type === 'VariableDeclaration' && node.left.kind !== 'var') {
          block(function(){
            lexical(function(){
              BLOCK(LexicalDeclarations(node.left));
              recurse(node.left);
              recurse(node.body);
              UPSCOPE();
            });
          });
        } else {
          recurse(node.left);
          recurse(node.body);
        }
        JUMP(update);
        adjust(compare);
      });
      return update;
    });
  }

  function FunctionDeclaration(node){
    node.Code = new Code(node, null, FUNCTYPE.NORMAL, SCOPE.FUNCTION);
    context.queue(node.Code);
  }

  function FunctionExpression(node, methodName){
    var code = new Code(node, null, FUNCTYPE.NORMAL, SCOPE.FUNCTION);
    if (methodName) {
      code.name = methodName;
    }
    context.queue(code);
    FUNCTION(intern(node.id ? node.id.name : ''), code);
    return code;
  }

  function Glob(node){}

  function Identifier(node){
    REF(node.name);
  }

  function IfStatement(node){
    recurse(node.test);
    GET();
    var test = IFEQ(0, false);
    recurse(node.consequent);

    if (node.alternate) {
      var alt = JUMP(0);
      adjust(test);
      recurse(node.alternate);
      adjust(alt);
    } else {
      adjust(test);
    }
  }

  function ImportDeclaration(node){
    // recurse(node.from);
    // IMPORT();
    // each(node.specifiers, function(specifier){
    //   recurse(specifier);
    //   GET();
    //   PUT();
    // });
  }

  function ImportSpecifier(node){

  }

  function Literal(node){
    if (node.value instanceof RegExp) {
      REGEXP(node.value);
    } else if (typeof node.value === 'string') {
      STRING(node.value);
    } else {
      LITERAL(node.value);
    }
  }

  function LabeledStatement(node){
    if (!context.labels){
      context.labels = create(null);
    } else if (label in context.labels) {
      throwError('duplicate_label');
    }
    context.labels[node.label.name] = true;
    recurse(node.body);
    context.labels = null;
  }

  function LogicalExpression(node){
    recurse(node.left);
    GET();
    var op = IFNE(0, node.operator === '||');
    recurse(node.right);
    GET();
    adjust(op);
  }

  function MemberExpression(node){
    var isSuper = isSuperReference(node.object);
    if (isSuper){
      if (context.code.ScopeType !== SCOPE.FUNCTION) {
        throwError('illegal_super_reference');
      }
    } else {
      recurse(node.object);
      GET();
    }

    if (node.computed){
      recurse(node.property);
      GET();
      isSuper ? SUPER_ELEMENT() : ELEMENT();
    } else {
      isSuper ? SUPER_MEMBER() : MEMBER(symbol(node.property));
    }
  }

  function MethodDefinition(node){}

  function ModuleDeclaration(node){
    if (node.body) {
      node.Code = new Code(node, null, FUNCTYPE.NORMAL, SCOPE.MODULE);
      node.Code.path = context.code.path.concat(node.id.name);
      context.queue(node.Code);
    }
  }

  function NativeIdentifier(node){
    NATIVE_REF(node.name);
  }

  function NewExpression(node){
    recurse(node.callee);
    GET();
    args(node.arguments);
    CONSTRUCT();
  }

  function ObjectExpression(node){
    OBJECT();
    each(node.properties, recurse);
  }

  function ObjectPattern(node){}

  function Path(node){

  }

  function Program(node){
    each(node.body, recurse);
  }

  function Property(node){
    var value = node.value;
    if (node.kind === 'init'){
      var key = node.key.type === 'Identifier' ? node.key : node.key.value;
      if (node.method) {
        FunctionExpression(value, intern(key));
      } else if (isAnonymousFunction(value)) {
        var Expr = node.type === 'FunctionExpression' ? FunctionExpression : ArrowFunctionExpression;
        var code = Expr(value, key);
        code.writableName = true;
      } else {
        recurse(value);
      }
      GET();
      PROPERTY(symbol(node.key));
    } else {
      var code = new Code(value, null, FUNCTYPE.NORMAL, SCOPE.FUNCTION);
      context.queue(code);
      METHOD(node.kind, code, symbol(node.key));
    }
  }

  function ReturnStatement(node){
    if (node.argument){
      recurse(node.argument);
      GET();
    } else {
      UNDEFINED();
    }

    RETURN();
  }

  function SequenceExpression(node){
    for (var i=0, item; item = node.expressions[i]; i++) {
      recurse(item)
      GET();
      POP();
    }
    recurse(item);
    GET();
  }

  function SwitchStatement(node){
    control(function(){
      recurse(node.discriminant);
      GET();

      lexical(function(){
        BLOCK(LexicalDeclarations(node.cases));

        if (node.cases){
          var cases = [];
          each(node.cases, function(item, i){
            if (item.test){
              recurse(item.test);
              GET();
              cases.push(CASE(0));
            } else {
              var defaultFound = i;
              cases.push(0);
            }
          });

          if (defaultFound != null){
            DEFAULT(cases[defaultFound]);
          } else {
            POP();
            var last = JUMP(0);
          }

          each(node.cases, function(item, i){
            adjust(cases[i])
            each(item.consequent, recurse);
          });

          if (last) {
            adjust(last);
          }
        } else {
          POP();
        }

        UPSCOPE();
      });
    });
  }


  function SymbolDeclaration(node){
    var symbols = node.AtSymbols = [],
        pub = node.kind === 'symbol';

    each(node.declarations, function(item){
      var init = item.init;
      if (init) {
        recurse(init);
        GET();
      }

      console.log(SYMBOL(item.id.name, pub, !!init));
      symbols.push(item.id.name);
    });
  }

  function SymbolDeclarator(node){}

  function TemplateElement(node){}

  function TemplateLiteral(node, tagged){
    each(node.quasis, function(element, i){
      STRING(element.value.raw);
      if (!element.tail) {
        recurse(node.expressions[i]);
        GET();
        BINARY(BINARYOPS['string+']);
      }
      if (i) {
        BINARY(BINARYOPS['string+']);
      }
    });
  }

  function TaggedTemplateExpression(node){
    var template = [];
    each(node.quasi.quasis, function(element){
      template.push(element.value);
    });

    UNDEFINED();
    recurse(node.tag);
    GET();
    ARGS();
    TEMPLATE(template);
    GET();
    ARG();
    each(node.quasi.expressions, function(node){
      recurse(node);
      GET();
      ARG();
    });
    CALL();
  }

  function ThisExpression(node){
    THIS();
  }

  function ThrowStatement(node){
    recurse(node.argument);
    GET();
    THROW();
  }

  function TryStatement(node){
    lexical(ENTRY.TRYCATCH, function(){
      recurse(node.block);
    });

    var tryer = JUMP(0),
        handlers = [];

    for (var i=0, handler; handler = node.handlers[i]; i++) {
      recurse(handler);
      if (i < node.handlers.length - 1) {
        handlers.push(JUMP(0));
      }
    }

    adjust(tryer);
    while (i--) {
      handlers[i] && adjust(handlers[i]);
    }

    if (node.finalizer) {
      recurse(node.finalizer);
    }
  }

  function UnaryExpression(node){
    recurse(node.argument);
    UNARY(UNARYOPS[node.operator]);
  }

  function UpdateExpression(node){
    recurse(node.argument);
    UPDATE(!!node.prefix | ((node.operator === '++') << 1));
  }

  function VariableDeclaration(node){
    var DECLARE = {
      'var': VAR,
      'const': CONST,
      'let': LET
    }[node.kind];

    each(node.declarations, function(item){
      var init = item.init;
      if (init) {
        if (item.id && item.id.type === 'Identifier' && isAnonymousFunction(init)) {
          var Expr = node.type === 'FunctionExpression' ? FunctionExpression : ArrowFunctionExpression;
          var code = Expr(init, item.id.name);
          code.writableName = true;
        } else {
          recurse(init);
        }
        GET();
      }

      DECLARE(item.id);

      if (node.kind === 'var') {
        push.apply(context.code.VarDeclaredNames, BoundNames(item.id));
      }
    });
  }

  function VariableDeclarator(node){}

  function WhileStatement(node){
    control(function(){
      var start = current();
      recurse(node.test);
      GET();
      var op = IFEQ(0, false)
      recurse(node.body);
      JUMP(start);
      adjust(op);
      return start;
    });
  }

  function WithStatement(node){
    recurse(node.object)
    lexical(function(){
      WITH();
      recurse(node.body);
      UPSCOPE();
    });
  }

  function YieldExpression(node){
    if (node.argument){
      recurse(node.argument);
      GET();
    } else {
      UNDEFINED();
    }

    YIELD(node.delegate);
  }

  var handlers = {};

  utility.iterate([ ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AtSymbol,
    BinaryExpression, BlockStatement, BreakStatement, CallExpression,
    CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassHeritage,
    ConditionalExpression, DebuggerStatement, DoWhileStatement, EmptyStatement,
    ExportDeclaration, ExportSpecifier, ExportSpecifierSet, ExpressionStatement,
    ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration,
    FunctionExpression, Glob, Identifier, IfStatement, ImportDeclaration,
    ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression,
    MethodDefinition, ModuleDeclaration, NativeIdentifier, NewExpression, ObjectExpression,
    ObjectPattern, Path, Program, Property, ReturnStatement, SequenceExpression, SwitchStatement,
    SymbolDeclaration, SymbolDeclarator, TaggedTemplateExpression, TemplateElement, TemplateLiteral,
    ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration,
    VariableDeclarator, WhileStatement, WithStatement, YieldExpression], function(handler){
      handlers[utility.fname(handler)] = handler;
    });




  var Assembler = exports.Assembler = (function(){
    function annotateParent(node, parent){
      walk(node, function(node){
        if (isObject(node) && parent) {
          define(node, 'parent', parent);
        }
        return walk.RECURSE;
      });
    }

    function reinterpretNatives(node){
      walk(node, function(node){
        if (node.type === 'Identifier' && /^\$__/.test(node.name)) {
          node.type = 'NativeIdentifier';
          node.name = node.name.slice(3);
        } else {
          return walk.RECURSE;
        }
      });
    }


    function AssemblerOptions(o){
      o = Object(o);
      for (var k in this)
        this[k] = k in o ? o[k] : this[k];
    }

    AssemblerOptions.prototype = {
      scope: SCOPE.GLOBAL,
      natives: false,
      filename: null
    };


    function Assembler(options){
      this.options = new AssemblerOptions(options);
      define(this, {
        strings: [],
        hash: create(null)
      });
    }

    define(Assembler.prototype, {
      source: null,
      node: null,
      code: null,
      pending: null,
      jumps: null,
      labels: null,
    });

    define(Assembler.prototype, [
      function assemble(node, source){
        context = this;
        this.pending = new Stack;
        this.jumps = new Stack;
        this.labels = null;
        this.source = source;

        if (this.options.scope === SCOPE.FUNCTION) {
          node = node.body[0].expression;
        }

        var code = new Code(node, source, FUNCTYPE.NORMAL, this.options.scope);
        define(code, {
          strings: this.strings,
          hash: this.hash
        });

        code.topLevel = true;

        if (this.options.natives) {
          code.natives = true;
          reinterpretNatives(node);
        }

        annotateParent(node);
        this.queue(code);

        while (this.pending.length) {
          var lastCode = this.code;
          this.code = this.pending.pop();
          this.code.filename = this.filename;
          if (lastCode) {
            this.code.derive(lastCode);
          }
          recurse(this.code.body);
          if (this.code.ScopeType === SCOPE.GLOBAL || this.code.ScopeType === SCOPE.EVAL){
            COMPLETE();
          } else {
            if (this.code.Type === FUNCTYPE.ARROW && this.code.body.type !== 'BlockStatement') {
              GET();
            } else {
              UNDEFINED();
            }
            RETURN();
          }
        }

        return code;
      },
      function queue(code){
        if (this.code) {
          this.code.children.push(code);
        }
        this.pending.push(code);
      },
      function intern(name){
        return name;
        if (name === '__proto__') {
          if (!this.hash[proto]) {
            var index = this.hash[proto] = this.strings.length;
            this.strings[index] = '__proto__';
          }
          name = proto;
        }

        if (name in this.hash) {
          return this.hash[name];
        } else {
          var index = this.hash[name] = this.strings.length;
          this.strings[index] = name;
          return index;
        }
      },
    ]);

    return Assembler;
  })();

  exports.assemble = function assemble(options){
    var assembler = new Assembler(options);
    return assembler.assemble(options.ast, options.source);
  };

  return exports;
})(typeof module !== 'undefined' ? module.exports : {});



exports.operators = (function(exports){
  var ThrowException = require('./errors').ThrowException;

  var SYMBOLS       = require('./constants').SYMBOLS,
      Break         = SYMBOLS.Break,
      Pause         = SYMBOLS.Pause,
      Throw         = SYMBOLS.Throw,
      Empty         = SYMBOLS.Empty,
      Resume        = SYMBOLS.Resume,
      Return        = SYMBOLS.Return,
      Abrupt        = SYMBOLS.Abrupt,
      Native        = SYMBOLS.Native,
      Continue      = SYMBOLS.Continue,
      Reference     = SYMBOLS.Reference,
      Completion    = SYMBOLS.Completion,
      Uninitialized = SYMBOLS.Uninitialized,
      NativeSymbol  = require('./constants').BRANDS.NativeSymbol;

  var BOOLEAN   = 'boolean',
      FUNCTION  = 'function',
      NUMBER    = 'number',
      OBJECT    = 'object',
      STRING    = 'string',
      UNDEFINED = 'undefined';



  function HasPrimitiveBase(v){
    var type = typeof v.base;
    return type === STRING || type === NUMBER || type === BOOLEAN;
  }


  // ## GetValue

  function GetValue(v){
    if (v && v.Completion) {
      if (v.Abrupt) {
        return v;
      } else {
        v = v.value;
      }
    }
    if (!v || !v.Reference) {
      return v;
    } else if (v.base === undefined) {
      return ThrowException('not_defined', [v.name]);
    } else {
      var base = v.base;

      if (HasPrimitiveBase(v)) {
        if (typeof base === STRING && v.name === 'length' || v.name >= 0 && v.name < base.length) {
          return base[v.name];
        }
        base = new exports.$PrimitiveBase(base);
      }

      if (exports.IsPropertyReference(v)) {
        if (base.Get) {
          if ('thisValue' in v) {
            return base.GetP(GetThisValue(v), v.name);
          } else {
            return base.Get(v.name);
          }
        }
      } else if (base.GetBindingValue) {
        return base.GetBindingValue(v.name, v.strict);
      }
    }
  }

  exports.GetValue = GetValue;

  // ## PutValue

  function PutValue(v, w){
    if (v && v.Completion) {
      if (v.Abrupt) {
        return v;
      } else {
        v = v.value;
      }
    }
    if (w && w.Completion) {
      if (w.Abrupt) {
        return w;
      } else {
        w = w.value;
      }
    }
    if (!v) {
      return ThrowException('non_object_property_store', ['undefined', 'undefined']);
    } else if (!v.Reference) {
      return ThrowException('non_object_property_store', [v.name, v.base]);
    } else if (v.base === undefined) {
      if (v.strict) {
        return ThrowException('not_defined', [v.name, v.base]);
      } else {
        return exports.global.Put(v.name, w, false);
      }
    } else {
      var base = v.base;

      if (exports.IsPropertyReference(v)) {
        if (HasPrimitiveBase(v)) {
          base = new exports.$PrimitiveBase(base);
        }
        if ('thisValue' in v) {
          return base.SetP(GetThisValue(v), v.name, w, v.strict);
        } else {
          return base.Put(v.name, w, v.strict);
        }
      } else {
        return base.SetMutableBinding(v.name, w, v.strict);
      }
    }
  }
  exports.PutValue = PutValue;

  // ## GetThisValue

  function GetThisValue(v){
    if (v && v.Completion) {
      if (v.Abrupt) {
        return v;
      } else {
        v = v.value;
      }
    }
    if (!v || !v.Reference) {
      return v;
    }

    if (v.base === undefined) {
      return ThrowException('non_object_property_load', [v.name, v.base]);
    }

    if ('thisValue' in v) {
      return v.thisValue;
    }

    return v.base;
  }
  exports.GetThisValue = GetThisValue;



  // ## ToPrimitive

  function ToPrimitive(argument, hint){
    if (typeof argument === OBJECT) {
      if (argument === null) {
        return argument;
      } else if (argument.Completion) {
        if (argument.Abrupt) {
          return argument;
        }
        return ToPrimitive(argument.value, hint);
      }
      return ToPrimitive(argument.DefaultValue(hint), hint);
    } else {
      return argument;
    }
  }
  exports.ToPrimitive = ToPrimitive;

  // ## ToBoolean

  function ToBoolean(argument){
    if (!argument) {
      return false;
    } else if (typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      } else {
        return !!argument.value;
      }
    } else {
      return !!argument;
    }
  }
  exports.ToBoolean = ToBoolean;

  // ## ToNumber

  function ToNumber(argument){
    if (argument !== null && typeof argument === OBJECT) {
      if (argument.Completion) {
        if (argument.Abrupt) {
          return argument;
        }
        return ToNumber(argument.value);
      }
      return ToNumber(ToPrimitive(argument, 'Number'));
    } else {
      return +argument;
    }
  }
  exports.ToNumber = ToNumber;

  // ## ToInteger

  function ToInteger(argument){
    argument = ToNumber(argument);

    if (argument && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      argument = argument.value;
    }

    if (argument !== argument) {
      return 0;
    }

    if (argument === 0 || argument === Infinity || argument === -Infinity) {
      return argument;
    }

    return argument >> 0;;
  }
  exports.ToInteger = ToInteger;

  // ## ToUint32

  function ToUint32(argument){
    argument = ToNumber(argument);
    if (argument && typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      return ToUint32(argument.value);
    }
    return argument >>> 0;
  }
  exports.ToUint32 = ToUint32;

  // ## ToInt32

  function ToInt32(argument){
    argument = ToNumber(argument);
    if (argument && typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      return ToInt32(argument.value);
    }
    return argument >> 0;
  }
  exports.ToInt32 = ToInt32;

  // ## ToUint16

  function ToUint16(argument){
    argument = ToNumber(argument);
    if (argument && typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      return ToUint16(argument.value);
    }
    return (argument >>> 0) % (1 << 16);
  }
  exports.ToUint16 = ToUint16;


  // ## ToPropertyName

  function ToPropertyName(argument){
    if (argument && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      } else {
        argument = argument.value;
      }
    }
    if (argument && typeof argument === OBJECT && argument.NativeBrand === NativeSymbol) {
      return argument;
    } else {
      return ToString(argument);
    }
  }
  exports.ToPropertyName = ToPropertyName;

  // ## ToString

  function ToString(argument){
    switch (typeof argument) {
      case STRING: return argument;
      case UNDEFINED:
      case NUMBER:
      case BOOLEAN: return ''+argument;
      case OBJECT:
        if (argument === null) {
          return 'null';
        } else if (argument.Completion) {
          if (argument.Abrupt) {
            return argument;
          }
          return ToString(argument.value);
        }
        return ToString(ToPrimitive(argument, 'String'));
    }
  }
  exports.ToString = ToString;


  var PRE_INC, POST_INC, PRE_DEC, POST_DEC;
  void function(createChanger){
    exports.PRE_INC = PRE_INC = createChanger(true, 1);
    exports.POST_INC = POST_INC = createChanger(false, 1);
    exports.PRE_DEC = PRE_DEC = createChanger(true, -1);
    exports.POST_DEC = POST_DEC = createChanger(false, -1);
  }(function(pre, change){
    return function(ref) {
      var val = ToNumber(GetValue(ref));
      if (val && val.Abrupt) {
        return val;
      }

      var newVal = val + change,
          result = PutValue(ref, newVal);

      if (result && result.Abrupt) {
        return result;
      }
      return pre ? newVal : val;
    };
  });

  function VOID(ref){
    var val = GetValue(ref);
    if (val && val.Abrupt) {
      return val;
    }
    return undefined;
  }
  exports.VOID = VOID;

  function TYPEOF(val) {
    var type = typeof val;
    switch (type) {
      case UNDEFINED:
      case BOOLEAN:
      case NUMBER:
      case STRING: return type;
      case OBJECT:
        if (val === null) {
          return OBJECT;
        }

        if (val.Completion) {
          if (val.Abrupt) {
            return val;
          } else {
            return TYPEOF(val.value);
          }
        }

        if (val.Reference) {
          if (val.base === undefined) {
            return UNDEFINED;
          }
          return TYPEOF(GetValue(val));
        }

        if ('Call' in val) {
          return FUNCTION;
        } else {
          return OBJECT;
        }
      }
  }
  exports.TYPEOF = TYPEOF;


  function POSITIVE(ref){
    return ToNumber(GetValue(ref));
  }
  exports.POSITIVE = POSITIVE;

  var NEGATIVE, BIT_NOT, NOT;
  void function(createUnaryOp){
    exports.NEGATIVE = NEGATIVE = createUnaryOp(ToNumber, function(n){ return -n });
    exports.BIT_NOT  = BIT_NOT  = createUnaryOp(ToInt32, function(n){ return ~n });
    exports.NOT      = NOT      = createUnaryOp(ToBoolean, function(n){ return !n });
  }(function(convert, finalize){
    return function(ref){
      if (!ref || typeof ref !== OBJECT) {
        return finalize(ref);
      }
      var val = convert(GetValue(ref));

      if (val && val.Completion) {
        if (val.Abrupt) {
          return val;
        } else {
          val = val.value;
        }
      }

      return finalize(val);
    }
  });
  var MUL, DIV, MOD, SUB, BIT_OR, BIT_AND;
  void function(makeMathOp){
    exports.MUL = MUL = makeMathOp(function(l, r){ return l * r });
    exports.DIV = DIV = makeMathOp(function(l, r){ return l / r });
    exports.MOD = MOD = makeMathOp(function(l, r){ return l % r });
    exports.SUB = SUB = makeMathOp(function(l, r){ return l - r });
    exports.BIT_AND = BIT_AND = makeMathOp(function(l, r){ return l & r });
    exports.BIT_OR = BIT_OR = makeMathOp(function(l, r){ return l | r });
  }(function(finalize){
    return function(lval, rval) {
      lval = ToNumber(lval);
      if (lval && lval.Completion) {
        if (lval.Abrupt) {
          return lval;
        } else {
          lval = lval.value;
        }
      }
      rval = ToNumber(rval);
      if (rval && rval.Completion) {
        if (rval.Abrupt) {
          return rval;
        } else {
          rval = rval.value;
        }
      }
      return finalize(lval, rval);
    };
  });

  function convertAdd(a, b, type, converter){
    if (typeof a !== type) {
      a = converter(a);
      if (a && a.Completion) {
        if (a.Abrupt) {
          return a;
        } else {
          a = a.value;
        }
      }
    } else if (typeof b !== type) {
      b = converter(b);
      if (b && b.Completion) {
        if (b.Abrupt) {
          return b;
        } else {
          b = b.value;
        }
      }
    }
    return a + b;
  }



  function ADD(lval, rval) {
    lval = ToPrimitive(lval);
    if (lval && lval.Completion) {
      if (lval.Abrupt) {
        return lval;
      } else {
        lval = lval.value;
      }
    }

    rval = ToPrimitive(rval);
    if (rval && rval.Completion) {
      if (rval && rval.Abrupt) {
        return rval;
      } else {
        rval = rval.value;
      }
    }

    if (typeof lval === STRING || typeof rval === STRING) {
      var type = STRING,
          converter = ToString;
    } else {
      var type = NUMBER,
          converter = ToNumber;
    }

    return convertAdd(lval, rval, type, converter);
  }
  exports.ADD = ADD;



  function STRING_ADD(lval, rval){
    return convertAdd(lval, rval, STRING, ToString);
  }
  exports.STRING_ADD = STRING_ADD;



  var SHL, SHR, SAR;
  void function(makeShifter){
    exports.SHL = SHL = makeShifter(function(l, r){ return l << r });
    exports.SHR = SHR = makeShifter(function(l, r){ return l >> r });
    exports.SAR = SAR = makeShifter(function(l, r){ return l >>> r });
  }(function(finalize){
    return function(lval, rval) {
      lval = ToInt32(lval);
      if (lval && lval.Completion) {
        if (lval.Abrupt) {
          return lval;
        } else {
          lval = lval.value;
        }
      }
      rval = ToUint32(rval);
      if (rval && rval.Completion) {
        if (rval.Abrupt) {
          return rval;
        } else {
          rval = rval.value;
        }
      }
      return finalize(lval, rval & 0x1F);
    };
  });



  function COMPARE(x, y, left){
    if (left === false) {
      var lval = x,
          rval = y;
    } else {
      var lval = y,
          rval = x;
    }

    lval = ToPrimitive(lval, 'Number');
    if (lval && lval.Completion) {
      if (lval.Abrupt) {
        return lval;
      } else {
        lval = lval.value;
      }
    }

    rval = ToPrimitive(rval, 'Number');
    if (rval && rval.Completion) {
      if (rval.Abrupt) {
        return rval;
      } else {
        rval = rval.value;
      }
    }

    var ltype = typeof lval,
        rtype = typeof rval;

    if (ltype === STRING || rtype === STRING) {
      if (ltype !== STRING) {
        lval = ToString(lval);
        if (lval && lval.Completion) {
          if (lval.Abrupt) {
            return lval;
          } else {
            lval = lval.value;
          }
        }
      } else if (rtype !== STRING) {
        rval = ToString(rval);
        if (rval && rval.Completion) {
          if (rval.Abrupt) {
            return rval;
          } else {
            rval = rval.value;
          }
        }
      }
      if (typeof lval === STRING && typeof rval === STRING) {
        return lval < rval;
      }
    } else {
      if (ltype !== NUMBER) {
        lval = ToNumber(lval);
        if (lval && lval.Completion) {
          if (lval.Abrupt) {
            return lval;
          } else {
            lval = lval.value;
          }
        }
      }
      if (rtype !== NUMBER) {
        rval = ToNumber(rval);
        if (rval && rval.Completion) {
          if (rval.Abrupt) {
            return rval;
          } else {
            rval = rval.value;
          }
        }
      }
      if (typeof lval === NUMBER && typeof rval === NUMBER) {
        return lval < rval;
      }
    }
  }

  var LT, GT, LTE, GTE;
  void function(creatorComparer){
    exports.LT  = LT  = creatorComparer(true, false);
    exports.GT  = GT  = creatorComparer(false, false);
    exports.LTE = LTE = creatorComparer(true, true);
    exports.GTE = GTE = creatorComparer(false, true);
  }(function(reverse, left){
    return function(lval, rval){
      if (reverse) {
        var temp = lval;
        lval = rval;
        rval = temp;
      }

      var result = COMPARE(rval, lval, left);
      if (result && result.Completion) {
        if (result.Abrupt) {
          return result;
        } else {
          result = result.value;
        }
      }

      if (result === undefined) {
        return false;
      } else if (left) {
        return !result;
      } else {
        return result;
      }
    };
  });


  function INSTANCE_OF(lval, rval) {
    if (rval === null || typeof rval !== OBJECT || !('HasInstance' in rval)) {
      return ThrowException('instanceof_function_expected', lval);
    }

    return rval.HasInstance(lval);
  }
  exports.INSTANCE_OF = INSTANCE_OF;


  function DELETE(ref){
    if (!ref || !ref.Reference) {
      return true;
    }

    if (ref.base === undefined) {
      if (ref.strict) {
        return ThrowException('strict_delete_property', [ref.name, ref.base]);
      } else {
        return true;
      }
    }

    if (exports.IsPropertyReference(ref)) {
      if ('thisValue' in ref) {
        return ThrowException('super_delete_property', ref.name);
      } else {
        var obj = exports.ToObject(ref.base)
        if (obj && obj.Completion) {
          if (obj.Abrupt) {
            return obj;
          } else {
            obj = obj.value;
          }
        }

        return obj.Delete(ref.name, ref.strict);
      }
    } else {
      return ref.base.DeleteBinding(ref.name);
    }
  }
  exports.DELETE = DELETE;


  function IN(lval, rval) {
    if (rval === null || typeof rval !== OBJECT) {
      return ThrowException('invalid_in_operator_use', [lval, rval]);
    }

    lval = ToPropertyName(lval);
    if (lval && lval.Completion) {
      if (lval.Abrupt) {
        return lval;
      } else {
        lval = lval.value;
      }
    }

    return rval.HasProperty(lval);
  }
  exports.IN = IN;



  function IS(x, y) {
    if (x && x.Completion) {
      if (x.Abrupt) {
        return x;
      } else {
        x = x.value;
      }
    }
    if (y && y.Completion) {
      if (y.Abrupt) {
        return y;
      } else {
        y = y.value;
      }
    }
    return x === y ? (x !== 0 || 1 / x === 1 / y) : (x !== x && y !== y);
  }
  exports.IS = IS;



  function STRICT_EQUAL(x, y) {
    if (x && x.Completion) {
      if (x.Abrupt) {
        return x;
      } else {
        x = x.value;
      }
    }
    if (y && y.Completion) {
      if (y.Abrupt) {
        return y;
      } else {
        y = y.value;
      }
    }
    return x === y;
  }
  exports.STRICT_EQUAL = STRICT_EQUAL;


  function EQUAL(x, y){
    if (x && x.Completion) {
      if (x.Abrupt) {
        return x;
      } else {
        x = x.value;
      }
    }
    if (y && y.Completion) {
      if (y.Abrupt) {
        return y;
      } else {
        y = y.value;
      }
    }

    var ltype = typeof x,
        rtype = typeof y;

    if (ltype === rtype) {
      return x === y;
    } else if (x == null && y == null) {
      return true;
    } else if (ltype === NUMBER || rtype === STRING) {
      return EQUAL(x, ToNumber(y));
    } else if (ltype === STRING || rtype === NUMBER) {
      return EQUAL(ToNumber(x), y);
    } else if (rtype === BOOLEAN) {
      return EQUAL(x, ToNumber(y));
    } else if (ltype === BOOLEAN) {
      return EQUAL(ToNumber(x), y);
    } else if (rtype === OBJECT && ltype === NUMBER || ltype === STRING) {
      return EQUAL(x, ToPrimitive(y));
    } else if (ltype === OBJECT && rtype === NUMBER || rtype === OBJECT) {
      return EQUAL(ToPrimitive(x), y);
    }
    return false;
  }

  exports.EQUAL = EQUAL;



  function UnaryOp(operator, val) {
    switch (operator) {
      case 'delete': return DELETE(val);
      case 'void':   return VOID(val);
      case 'typeof': return TYPEOF(val);
      case '+':      return POSITIVE(val);
      case '-':      return NEGATIVE(val);
      case '~':      return BIT_NOT(val);
      case '!':      return NOT(val);
    }
  }
  exports.UnaryOp = UnaryOp;



  function BinaryOp(operator, lval, rval) {
    switch (operator) {
      case 'instanceof': return INSTANCE_OF(lval, rval);
      case 'in':         return IN(lval, rval);
      case 'is':         return IS(lval, rval);
      case 'isnt':       return NOT(IS(lval, rval));
      case '==':         return EQUAL(lval, rval);
      case '!=':         return NOT(EQUAL(lval, rval));
      case '===':        return STRICT_EQUAL(lval, rval);
      case '!==':        return NOT(STRICT_EQUAL(lval, rval));
      case '<':          return LT(lval, rval);
      case '>':          return GT(lval, rval);
      case '<=':         return LTE(lval, rval);
      case '>=':         return GTE(lval, rval);
      case '*':          return MUL(lval, rval);
      case '/':          return DIV(lval, rval);
      case '%':          return MOD(lval, rval);
      case '+':          return ADD(lval, rval);
      case 'string+':    return STRING_ADD(lval, rval);
      case '-':          return SUB(lval, rval);
      case '<<':         return SHL(lval, rval);
      case '>>':         return SHR(lval, rval);
      case '>>>':        return SAR(lval, rval);
      case '|':          return BIT_OR(lval, rval);
      case '&':          return BIT_AND(lval, rval);
      case '^':          return BIT_XOR(lval, rval);
    }
  }
  exports.BinaryOp = BinaryOp;


  return exports;
})(typeof module !== 'undefined' ? module.exports : {});


exports.thunk = (function(exports){
  var utility = require('./utility'),
      Emitter          = utility.Emitter,
      define           = utility.define,
      inherit          = utility.inherit;

  var operators    = require('./operators'),
      STRICT_EQUAL = operators.STRICT_EQUAL,
      ToObject     = operators.ToObject,
      UnaryOp      = operators.UnaryOp,
      BinaryOp     = operators.BinaryOp,
      GetValue     = operators.GetValue,
      PutValue     = operators.PutValue,
      PRE_INC      = operators.PRE_INC,
      POST_INC     = operators.POST_INC,
      PRE_DEC      = operators.PRE_DEC,
      POST_DEC     = operators.POST_DEC;

  var constants = require('./constants'),
      BINARYOPS = constants.BINARYOPS.array,
      UNARYOPS  = constants.UNARYOPS.array,
      ENTRY     = constants.ENTRY.hash,
      AST       = constants.AST.array,
      Pause     = constants.SYMBOLS.Pause,
      Empty     = constants.SYMBOLS.Empty,
      Resume    = constants.SYMBOLS.Resume,
      StopIteration = constants.BRANDS.StopIteration;

  var AbruptCompletion = require('./errors').AbruptCompletion;




  function Desc(v){
    this.Value = v;
  }

  Desc.prototype = {
    Configurable: true,
    Enumerable: true,
    Writable: true
  };



  var D = (function(d, i){
    while (i--) {
      d[i] = new Function('return function '+
        ((i & 1) ? 'E' : '_') +
        ((i & 2) ? 'C' : '_') +
        ((i & 4) ? 'W' : '_') +
        '(v){ this.Value = v }')();

      d[i].prototype = {
        Enumerable  : (i & 1) > 0,
        Configurable: (i & 2) > 0,
        Writable    : (i & 4) > 0
      };
    }
    return d;
  })([], 8);


  function DefineProperty(obj, key, val) {
    if (val && val.Completion) {
      if (val.Abrupt) {
        return val;
      } else {
        val = val.value;
      }
    }

    return obj.DefineOwnProperty(key, new Desc(val), false);
  }

  var log = false;



  function instructions(ops, opcodes){
    var out = [];
    for (var i=0; i < ops.length; i++) {
      out[i] = opcodes[+ops[i].op];
      if (out[i].name === 'LOG') {
        out.log = true;
      }
    }
    return out;
  }


  function Thunk(code){
    var opcodes = [ARRAY, ARG, ARGS, ARRAY_DONE, BINARY, BLOCK, CALL, CASE,
      CLASS_DECL, CLASS_EXPR, COMPLETE, CONST, CONSTRUCT, DEBUGGER, DEFAULT, DEFINE,
      DUP, ELEMENT, ENUM, EXTENSIBLE, FLIP, FUNCTION, GET, IFEQ, IFNE, INC, INDEX, ITERATE, JUMP, LET,
      LITERAL, LOG, MEMBER, METHOD, NATIVE_CALL, NATIVE_REF, OBJECT, POP,
      POPN, PROPERTY, PUT, REF, REFSYMBOL, REGEXP, RETURN, ROTATE, RUN, SAVE, SPREAD,
      SPREAD_ARG, STRING, SUPER_CALL, SUPER_ELEMENT, SUPER_MEMBER, SYMBOL, TEMPLATE,
      THIS, THROW, UNARY, UNDEFINED, UPDATE, UPSCOPE, VAR, WITH, YIELD];

    var thunk = this,
        ops = code.ops,
        cmds = instructions(ops, opcodes);

    function getKey(v){
      if (typeof v === 'string') {
        return v;
      }
      if (v[0] !== '@') {
        return v[1];
      }

      v = context.getSymbol(v[1]);
      if (v && v.Abrupt) {
        error = v;
        return unwind;
      }
      return v;
    }

    function unwind(){
      for (var i = 0, entry; entry = code.transfers[i]; i++) {
        if (entry.begin < ip && ip <= entry.end) {
          if (entry.type === ENTRY.ENV) {
            trace(context.popBlock());
          } else {
            if (entry.type === ENTRY.TRYCATCH) {
              stack[sp++] = error.value;
              ip = entry.end;
              console.log(ops[ip])
              return cmds[ip];
            } else if (entry.type === ENTRY.FOROF) {
              if (error && error.value && error.value.NativeBrand === StopIteration) {
                ip = entry.end;
                return cmds[ip];
              }
            }
          }
        }
      }


      if (error) {
        if (error.value && error.value.setCode) {
          var range = code.ops[ip].range,
              loc = code.ops[ip].loc;

          if (!error.value.hasLocation) {
            error.value.hasLocation = true;
            error.value.setCode(loc, code.source);
            error.value.setOrigin(code.filename, code.name);
          }

          if (stacktrace) {
            if (error.value.trace) {
              [].push.apply(error.value.trace, stacktrace);
            } else {
              error.value.trace = stacktrace;
            }
            error.value.context || (error.value.context = context);
          }
        }
      }

      completion = error;
      return false;
    }



    function ARGS(){
      stack[sp++] = [];
      return cmds[++ip];
    }

    function ARG(){
      var arg = stack[--sp];
      stack[sp - 1].push(arg);
      return cmds[++ip];
    }

    function ARRAY(){
      stack[sp++] = context.createArray(0);
      stack[sp++] = 0;
      return cmds[++ip];
    }

    function ARRAY_DONE(){
      var len = stack[--sp];
      stack[sp - 1].Put('length', len);
      return cmds[++ip];
    }

    function BINARY(){
      var right  = stack[--sp],
          left   = stack[--sp],
          result = BinaryOp(BINARYOPS[ops[ip][0]], GetValue(left), GetValue(right));

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function BLOCK(){
      context.pushBlock(ops[ip][0]);
      return cmds[++ip];
    }

    function CALL(){
      var args     = stack[--sp],
          receiver = stack[--sp],
          func     = stack[--sp],
          result   = context.callFunction(func, receiver, args);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function CASE(){
      var result = STRICT_EQUAL(stack[--sp], stack[sp - 1]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      if (result) {
        sp--;
        ip = ops[ip][0];
        return cmds[ip];
      }

      return cmds[++ip];
    }

    function CLASS_DECL(){
      var def  = ops[ip][0],
          sup  = def.superClass ? stack[--sp] : undefined,
          ctor = context.pushClass(def, sup);

      if (ctor && ctor.Completion) {
        if (ctor.Abrupt) {
          error = ctor;
          return unwind;
        } else {
          ctor = ctor.value;
        }
      }

      var result = context.initializeBinding(def.name, ctor);
      if (result && result.Abrupt) {
        error = result;
        return unwind;
      }

      return cmds[++ip];
    }

    function CLASS_EXPR(){
      var def  = ops[ip][0],
          sup  = def.superClass ? stack[--sp] : undefined,
          ctor = context.pushClass(def, sup);

      if (ctor && ctor.Completion) {
        if (ctor.Abrupt) {
          error = ctor;
          return unwind;
        } else {
          ctor = ctor.value;
        }
      }

      stack[sp++] = ctor;
      return cmds[++ip];
    }

    function COMPLETE(){
      return false;
    }

    function CONST(){
      context.initializeBindings(ops[ip][0], stack[--sp], true);
      return cmds[++ip];
    }

    function CONSTRUCT(){
      var args   = stack[--sp],
          func   = stack[--sp],
          result = context.constructFunction(func, args);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }
      stack[sp++] = result;
      return cmds[++ip];
    }

    function DEBUGGER(){
      cleanup = pauseCleanup;
      ip++;
      console.log(context, thunk);
      return false;
    }

    function DEFAULT(){
      sp--;
      ip = ops[ip][0];
      return cmds[++ip];
    }

    function DEFINE(){
      var attrs  = ops[ip][0],
          val    = stack[--sp],
          key    = stack[sp - 1],
          obj    = stack[sp - 2],
          result = obj.DefineOwnProperty(key, new D[attrs](val));

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function DUP(){
      stack[sp] = stack[sp++ - 1];
      return cmds[++ip];
    }

    function ELEMENT(){
      var obj    = stack[--sp],
          key    = stack[--sp],
          result = context.getPropertyReference(obj, key);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function ENUM(){
      stack[sp - 1] = stack[sp - 1].enumerator();
      return cmds[++ip];
    }

    function EXTENSIBLE(){
      stack[sp - 1].SetExtensible(!!ops[ip][0]);
      return cmds[++ip];
    }

    function FUNCTION(){
      stack[sp++] = context.createFunction(ops[ip][0], ops[ip][1]);
      return cmds[++ip];
    }

    function FLIP(){
      var buffer = [],
          index  = 0,
          count  = ops[ip][0];

      while (index < count) {
        buffer[index] = stack[sp - index++];
      }

      index = 0;
      while (index < count) {
        stack[sp - index] = buffer[count - ++index];
      }

      return cmds[++ip];
    }


    function GET(){
      var result = GetValue(stack[--sp]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function IFEQ(){
      if (ops[ip][1] === !!stack[--sp]) {
        ip = ops[ip][0];
        return cmds[ip];
      }
      return cmds[++ip];
    }

    function IFNE(){
      if (ops[ip][1] === !!stack[sp - 1]) {
        ip = ops[ip][0];
        return cmds[ip];
      } else {
        sp--;
      }
      return cmds[++ip];
    }

    function INC(){
      stack[sp - 1]++;
      return cmds[++ip];
    }

    function INDEX(){
      if (ops[ip][0]) {
        stack[sp - 1]++;
      } else {
        var val = GetValue(stack[--sp]);

        if (val && val.Completion) {
          if (val.Abrupt) {
            error = val;
            return unwind;
          } else {
            val = val.value;
          }
        }

        var index = stack[--sp],
            array = stack[sp - 1];

        if (ops[ip][1]) {
          var status = context.spreadArray(array, index, val);

          if (status && status.Abrupt) {
            error = status;
            return unwind;
          }

          stack[sp++] = status;
        } else {
          array.DefineOwnProperty(index, new Desc(val));
          stack[sp++] = index + 1;
        }
      }

      return cmds[++ip];
    }

    function ITERATE(){
      stack[sp - 1] = stack[sp - 1].Iterate();
      return cmds[++ip];
    }

    function LITERAL(){
      stack[sp++] = ops[ip][0];
      return cmds[++ip];
    }

    function JUMP(){
      ip = ops[ip][0];
      return cmds[ip];
    }

    function LET(){
      context.initializeBindings(ops[ip][0], stack[--sp], true);
      return cmds[++ip];
    }

    function LOG(){
      console.log({
        stackPosition: sp,
        stack: stack,
        history: history
      });
      return cmds[++ip];
    }

    function MEMBER(){
      var obj = stack[--sp],
          key = getKey(ops[ip][0]);

      if (key && key.Abrupt) {
        error = key;
        return unwind;
      }

      var result = context.getPropertyReference(key, obj);
      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function METHOD(){
      var kind   = ops[ip][0],
          obj    = stack[sp - 1],
          code   = ops[ip][1],
          key    = getKey(ops[ip][2]);

      if (key && key.Abrupt) {
        error = key;
        return unwind;
      }

      var status = context.defineMethod(kind, obj, key, code);

      if (status && status.Abrupt) {
        error = status;
        return unwind;
      }
      return cmds[++ip];
    }

    function NATIVE_CALL(){
      return CALL();
    }

    function NATIVE_REF(){
      if (!code.natives) {
        error = 'invalid native reference';
        return unwind;
      }
      stack[sp++] = context.Realm.natives.reference(code.lookup(ops[ip][0]), false);
      return cmds[++ip];
    }

    function PROPERTY(){
      var val    = stack[--sp],
          obj    = stack[sp - 1],
          key    = getKey(ops[ip][0]);

      if (key && key.Abrupt) {
        error = key;
        return unwind;
      }

      var status = DefineProperty(obj, key, val);
      if (status && status.Abrupt) {
        error = status;
        return unwind;
      }

      return cmds[++ip];
    }

    function OBJECT(){
      stack[sp++] = context.createObject();
      return cmds[++ip];
    }

    function POP(){
      sp--;
      return cmds[++ip];
    }

    function POPN(){
      sp -= ops[ip][0];
      return cmds[++ip];
    }

    function PUT(){
      var val    = stack[--sp],
          ref    = stack[--sp],
          status = PutValue(ref, val);

      if (status && status.Abrupt) {
        error = status;
        return unwind;
      }

      stack[sp++] = val;
      return cmds[++ip];
    }

    function REGEXP(){
      stack[sp++] = context.createRegExp(ops[ip][0]);
      return cmds[++ip];
    }

    function REF(){
      var ident = code.lookup(ops[ip][0]);
      stack[sp++] = context.getReference(ident);
      return cmds[++ip];
    }

    function REFSYMBOL(){
      var symbol = code.lookup(ops[ip][0]);
      stack[sp++] = context.getSymbolReference(symbol);
      return cmds[++ip];
    }

    function RETURN(){
      completion = stack[--sp];
      ip++;
      if (code.generator) {
        context.currentGenerator.ExecutionContext = context;
        context.currentGenerator.State = 'closed';
        error = new AbruptCompletion('throw', context.Realm.intrinsics.StopIteration);
        unwind();
      }
      return false;
    }

    function ROTATE(){
      var buffer = [],
          item   = stack[--sp],
          index  = 0,
          count  = ops[ip][0];

      while (index < count) {
        buffer[index++] = stack[--sp];
      }

      buffer[index++] = item;

      while (index--) {
        stack[sp++] = buffer[index];
      }

      return cmds[++ip];
    }

    function RUN(){
      throw 'wtf'
    }

    function SAVE(){
      completion = stack[--sp];
      return cmds[++ip];
    }

    function SPREAD(){
      var obj    = stack[--sp],
          index  = ops[ip][0],
          result = context.destructureSpread(obj, index);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function SPREAD_ARG(){
      var spread = stack[--sp],
          args   = stack[sp - 1],
          status = context.spreadArguments(args, spread);

      if (status && status.Abrupt) {
        error = status;
        return unwind;
      }

      return cmds[++ip];
    }


    function STRING(){
      stack[sp++] = code.lookup(ops[ip][0]);
      return cmds[++ip];
    }

    function SUPER_CALL(){
      var result = context.getSuperReference(false);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function SUPER_ELEMENT(){
      var result = context.getSuperReference(stack[--sp]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function SUPER_MEMBER(){
      var key = getKey(ops[ip][0]);

      if (key && key.Abrupt) {
        error = key;
        return unwind;
      }
      var result = context.getSuperReference(key);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function SYMBOL(){
      var name = ops[ip][0],
          isPublic = ops[ip][1],
          hasInit = ops[ip][2];

      if (hasInit) {
        var init = stack[--sp];
        if (init && init.Completion) {
          if (init.Abrupt) { error = init; return unwind; } else init = init.value;
        }
      } else {
        var init = context.createSymbol(name, isPublic);
      }

      var result = context.initializeSymbolBinding(name, init);

      if (result && result.Abrupt) {
        error = result;
        return unwind;
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function TEMPLATE(){
      stack[sp++] = context.getTemplateCallSite(ops[ip][0]);
      console.log(stack, sp);
      return cmds[++ip];
    }

    function THIS(){
      var result = context.getThis();

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function THROW(){
      error = new AbruptCompletion('throw', stack[--sp]);
      return unwind;
    }

    function UNARY(){
      var result = UnaryOp(UNARYOPS[ops[ip][0]], stack[--sp]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function UNDEFINED(){
      stack[sp++] = undefined;
      return cmds[++ip];
    }

    var updaters = [POST_DEC, PRE_DEC, POST_INC, PRE_INC];

    function UPDATE(){
      var update = updaters[ops[ip][0]],
          result = update(stack[--sp]);

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      stack[sp++] = result;
      return cmds[++ip];
    }

    function UPSCOPE(){
      context.popBlock();
      return cmds[++ip];
    }

    function VAR(){
      context.initializeBindings(ops[ip][0], stack[--sp], false);
      return cmds[++ip];
    }

    function WITH(){
      var result = ToObject(GetValue(stack[--sp]));

      if (result && result.Completion) {
        if (result.Abrupt) {
          error = result;
          return unwind;
        } else {
          result = result.value;
        }
      }

      context.pushWith(result);
      return cmds[++ip];
    }

    function YIELD(){
      var generator = context.currentGenerator;
      generator.ExecutionContext = context;
      generator.State = 'suspended';
      context.pop();
      cleanup = yieldCleanup;
      yielded = stack[--sp];
      ip++;
      return false;
    }

    function trace(unwound){
      stacktrace || (stacktrace = []);
      stacktrace.push(unwound);
    }

    function normalPrepare(newContext){
      thunkStack.push({
        ip: ip,
        sp: sp,
        stack: stack,
        error: error,
        prepare: prepare,
        execute: execute,
        cleanup: cleanup,
        history: history,
        completion: completion,
        stacktrace: stacktrace,
        context: context,
        log: log,
        ctx: ctx,
        yielded: yielded
      });
      ip = 0;
      sp = 0;
      stack = [];
      error = completion = stacktrace = yielded = undefined;
      log = log || cmds.log;
      context = newContext;
      history = [];
      execute = context.Realm.quiet ? normalExecute : instrumentedExecute;
    }

    function normalCleanup(){
      var result = GetValue(completion);
      if (thunkStack.length) {
        var v = thunkStack.pop();
        ip = v.ip;
        sp = v.sp;
        stack = v.stack;
        error = v.error;
        prepare = v.prepare;
        execute = v.execute;
        cleanup = v.cleanup;
        history = v.history;
        completion = v.completion;
        stacktrace = v.stacktrace;
        context = v.context;
        log = v.log;
        ctx = v.ctx;
        yielded = v.yielded;
      }
      return result;
    }


    function normalExecute(){
      var f = cmds[ip],
          ips = 0;
      if (log) {
        history = [];
        while (f) {
          history[ips++] = [ip, ops[ip]];
          f = f();
        }
      } else {
        while (f) f = f();
      }
    }

    function instrumentedExecute(){
      var f = cmds[ip],
          ips = 0,
          realm = context.Realm;

      while (f) {
        history[ips++] = [ip, ops[ip]];
        realm.emit('op', [ops[ip], stack[sp - 1]]);
        f = f();
      }
    }

    function resumePrepare(){
      delete thunk.ip;
      delete thunk.stack;
      prepare = normalPrepare;
      context = ctx;
      ctx = undefined;
    }

    function pauseCleanup(){
      thunk.ip = ip;
      thunk.stack = stack;
      stack.length = sp;
      prepare = resumePrepare;
      cleanup = normalCleanup;
      ctx = context;
      return Pause;
    }

    function yieldPrepare(ctx){
      prepare = normalPrepare;
      context = ctx;
    }

    function yieldCleanup(){
      prepare = yieldPrepare;
      cleanup = normalCleanup;
      return yielded;
    }

    function run(ctx){
      prepare(ctx);
      execute();
      return cleanup();
    }

    function send(ctx, value){
      if (stack) {
        stack[sp++] = value;
      }
      return run(ctx);
    }


    var completion, yielded, stack, ip, sp, error, ctx, context, stacktrace, history;

    var executing = false, thunkStack = [];

    var prepare = normalPrepare,
        execute = normalExecute,
        cleanup = normalCleanup;

    this.run = run;
    this.send = send;
    this.code = code;
    Emitter.call(this);
  }

  inherit(Thunk, Emitter, []);

  exports.Thunk = Thunk;
  return exports;
})(typeof module !== 'undefined' ? module.exports : {});



exports.runtime = (function(GLOBAL, exports, undefined){
  var esprima   = require('../third_party/esprima'),
      errors    = require('./errors'),
      utility   = require('./utility'),
      assemble  = require('./assembler').assemble,
      constants = require('./constants'),
      operators = require('./operators');

  operators.ToObject = ToObject;
  var Thunk = require('./thunk').Thunk;

  var Hash             = utility.Hash,
      Emitter          = utility.Emitter,
      PropertyList     = utility.PropertyList,
      create           = utility.create,
      numbers          = utility.numbers,
      isObject         = utility.isObject,
      nextTick         = utility.nextTick,
      enumerate        = utility.enumerate,
      ownKeys          = utility.keys,
      define           = utility.define,
      copy             = utility.copy,
      inherit          = utility.inherit,
      each             = utility.each,
      iterate          = utility.iterate,
      unique           = utility.unique;


  var ThrowException   = errors.ThrowException,
      MakeException    = errors.MakeException,
      Completion       = errors.Completion,
      AbruptCompletion = errors.AbruptCompletion;

  var GetValue         = operators.GetValue,
      PutValue         = operators.PutValue,
      GetThisValue     = operators.GetThisValue,
      ToPrimitive      = operators.ToPrimitive,
      ToBoolean        = operators.ToBoolean,
      ToNumber         = operators.ToNumber,
      ToInteger        = operators.ToInteger,
      ToUint32         = operators.ToUint32,
      ToInt32          = operators.ToInt32,
      ToUint16         = operators.ToUint16,
      ToString         = operators.ToString,
      UnaryOp          = operators.UnaryOp,
      BinaryOp         = operators.BinaryOp,
      ToPropertyName   = operators.ToPropertyName,
      IS               = operators.IS,
      EQUAL            = operators.EQUAL,
      STRICT_EQUAL     = operators.STRICT_EQUAL;


  var SYMBOLS       = constants.SYMBOLS,
      Break         = SYMBOLS.Break,
      Pause         = SYMBOLS.Pause,
      Throw         = SYMBOLS.Throw,
      Empty         = SYMBOLS.Empty,
      Return        = SYMBOLS.Return,
      Native        = SYMBOLS.Native,
      Continue      = SYMBOLS.Continue,
      Uninitialized = SYMBOLS.Uninitialized;

  var StopIteration = constants.BRANDS.StopIteration;
  var slice = [].slice;
  var uid = (Math.random() * (1 << 30)) | 0;

  var BINARYOPS = constants.BINARYOPS.array,
      UNARYOPS  = constants.UNARYOPS.array,
      BRANDS    = constants.BRANDS,
      ENTRY     = constants.ENTRY.hash,
      SCOPE     = constants.SCOPE.hash,
      AST       = constants.AST.array;

  var ARROW  = constants.FUNCTYPE.getIndex('ARROW'),
      METHOD = constants.FUNCTYPE.getIndex('METHOD'),
      NORMAL = constants.FUNCTYPE.getIndex('NORMAL');


  var ATTRS = constants.ATTRIBUTES,
      E = ATTRS.ENUMERABLE,
      C = ATTRS.CONFIGURABLE,
      W = ATTRS.WRITABLE,
      A = ATTRS.ACCESSOR,
      ___ = ATTRS.___,
      E__ = ATTRS.E__,
      _C_ = ATTRS._C_,
      EC_ = ATTRS.EC_,
      __W = ATTRS.__W,
      E_W = ATTRS.E_W,
      _CW = ATTRS._CW,
      ECW = ATTRS.ECW,
      __A = ATTRS.__A,
      E_A = ATTRS.E_A,
      _CA = ATTRS._CA,
      ECA = ATTRS.ECA;

  var BOOLEAN   = 'boolean',
      FUNCTION  = 'function',
      NUMBER    = 'number',
      OBJECT    = 'object',
      STRING    = 'string',
      UNDEFINED = 'undefined',
      ARGUMENTS = 'arguments';

  var GET          = 'Get',
      SET          = 'Set',
      VALUE        = 'Value',
      WRITABLE     = 'Writable',
      ENUMERABLE   = 'Enumerable',
      CONFIGURABLE = 'Configurable';


  errors.createError = function(name, type, message){
    return new $Error(name, type, message);
  };

  AbruptCompletion.prototype.Abrupt = SYMBOLS.Abrupt;
  Completion.prototype.Completion   = SYMBOLS.Completion;



  // ##################################################
  // ### Internal Utilities not from specification ####
  // ##################################################

  function noop(){}

  if (Object.getOwnPropertyNames) {
    var hide = function(o, k){
      Object.defineProperty(o, k, { enumerable: false });
    };
  } else {
    var hide = function(){};
  }


  function hasDirect(o, key){
    if (o) {
      return o.properties.has(key) || hasDirect(o.GetPrototype(), key);
    } else {
      return false;
    }
  }

  function setDirect(o, key, value){
    if (o.properties.has(key)) {
      o.properties.set(key, value);
    } else {
      o.properties.set(key, value, ECW);
    }
  }


  // ###############################
  // ###############################
  // ### Specification Functions ###
  // ###############################
  // ###############################


  // ## FromPropertyDescriptor

  function FromPropertyDescriptor(desc){
    var obj = new $Object;
    if (IsDataDescriptor(desc)) {
      setDirect(obj, 'value', desc.Value);
      setDirect(obj, 'writable', desc.Writable);
    } else if (IsAccessorDescriptor(desc))  {
      setDirect(obj, 'get', desc.Get);
      setDirect(obj, 'set', desc.Set);
    }
    setDirect(obj, 'enumerable', desc.Enumerable);
    setDirect(obj, 'configurable', desc.Configurable);
    return obj;
  }


  // ## CheckObjectCoercible

  function CheckObjectCoercible(argument){
    if (argument === null) {
      return ThrowException('null_to_object');
    } else if (argument === undefined) {
      return ThrowException('undefined_to_object');
    } else if (typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      return CheckObjectCoercible(argument.value);
    } else {
      return argument;
    }
  }

  // ## ToPropertyDescriptor

  var descFields = ['value', 'writable', 'enumerable', 'configurable', 'get', 'set'];
  var descProps = [VALUE, WRITABLE, ENUMERABLE, CONFIGURABLE, GET, SET];
  var standardFields = create(null);

  each(descFields, function(field){
    standardFields[field] = true;
  });


  function ToPropertyDescriptor(obj) {
    if (obj && obj.Completion) {
      if (obj.Abrupt) return obj; else obj = obj.value;
    }

    if (typeof obj !== OBJECT) {
      return ThrowException('property_desc_object', [typeof obj]);
    }

    var desc = create(null);

    for (var i=0, v; i < 6; i++) {
      if (obj.HasProperty(descFields[i])) {
        v = obj.Get(descFields[i]);
        if (v && v.Completion) {
          if (v.Abrupt) return v; else v = v.value;
        }
        desc[descProps[i]] = v;
      }
    }

    if (desc.Get !== undefined) {
      if (!desc.Get || !desc.Get.Call) {
        return ThrowException('getter_must_be_callable', [typeof desc.Get]);
      }
    }

    if (desc.Set !== undefined) {
      if (!desc.Set || !desc.Set.Call) {
        return ThrowException('setter_must_be_callable', [typeof desc.Set]);
      }
    }

    if ((GET in desc || SET in desc) && (VALUE in desc || WRITABLE in desc))
      return ThrowException('value_and_accessor', [desc]);

    return desc;
  }

  function CopyAttributes(from, to){
    var props = from.Enumerate(true, false);
    for (var i=0; i < props.length; i++) {
      var field = props[i];
      if (!(field in standardFields)) {
        to.properties.set(field, from.Get(field), ECW);
      }
    }
  }
  // ## IsAccessorDescriptor

  function IsAccessorDescriptor(desc) {
    return desc === undefined ? false : GET in desc || SET in desc;
  }

  // ## IsDataDescriptor

  function IsDataDescriptor(desc) {
    return desc === undefined ? false : VALUE in desc || WRITABLE in desc;
  }

  // ## IsGenericDescriptor

  function IsGenericDescriptor(desc) {
    return desc === undefined ? false : !(IsAccessorDescriptor(desc) || IsDataDescriptor(desc));
  }

  function FromGenericPropertyDescriptor(desc){
    if (desc === undefined) return;
    var obj = new $Object;
    for (var i=0, v; i < 6; i++) {
      if (descProps[i] in desc) setDirect(obj, descFields[i], desc[descProps[i]]);
    }
    return obj;
  }
  // ## ToCompletePropertyDescriptor

  function ToCompletePropertyDescriptor(obj) {
    var desc = ToPropertyDescriptor(obj);
    if (desc && desc.Completion) {
      if (desc.Abrupt) {
        return desc;
      } else {
        desc = desc.value;
      }
    }

    if (IsGenericDescriptor(desc) || IsDataDescriptor(desc)) {
      VALUE in desc    || (desc.Value = undefined);
      WRITABLE in desc || (desc.Writable = false);
    } else {
      GET in desc || (desc.Get = undefined);
      SET in desc || (desc.Set = undefined);
    }
    ENUMERABLE in desc   || (desc.Enumerable = false);
    CONFIGURABLE in desc || (desc.Configurable = false);
    return desc;
  }

  // ## IsEmptyDescriptor

  function IsEmptyDescriptor(desc) {
    return !(GET in desc
          || SET in desc
          || VALUE in desc
          || WRITABLE in desc
          || ENUMERABLE in desc
          || CONFIGURABLE in desc);
  }

  // ## IsEquivalentDescriptor

  function IsEquivalentDescriptor(a, b) {
    if (a && a.Completion) {
      if (a.Abrupt) return a; else a = a.value;
    }
    if (b && b.Completion) {
      if (b.Abrupt) return b; else b = b.value;
    }
    return IS(a.Get, b.Get) &&
           IS(a.Set, b.Set) &&
           IS(a.Value, b.Value) &&
           IS(a.Writable, b.Writable) &&
           IS(a.Enumerable, b.Enumerable) &&
           IS(a.Configurable, b.Configurable);
  }

  // ## IsCallable

  function IsCallable(argument){
    if (argument && typeof argument === OBJECT) {
      if (argument.Completion) {
        if (argument.Abrupt) {
          return argument;
        }
        return IsCallable(argument.value);
      }
      return 'Call' in argument;
    } else {
      return false;
    }
  }

  // ## IsConstructor

  function IsConstructor(argument){
    if (argument && typeof argument === OBJECT) {
      if (argument.Completion) {
        if (argument.Abrupt) {
          return argument;
        }
        return IsConstructor(argument.value);
      }
      return 'Construct' in argument;
    } else {
      return false;
    }
  }

  // ## MakeConstructor

  function MakeConstructor(func, writable, prototype){
    var install = prototype === undefined;
    if (install) {
      prototype = new $Object;
    }
    prototype.IsProto = true;
    if (writable === undefined) {
      writable = true;
    }
    if (install) {
      prototype.properties.set('constructor', func, writable ? _CW : ___);
    }
    func.properties.set('prototype', prototype, writable ? __W : ___);
  }

  // ## IsArrayIndex

  function IsArrayIndex(argument) {
    var n = +argument >>> 0;
    if ('' + n === argument && n !== 0xffffffff) {
      return true;
    }
    return false;
  }


  // ## Invoke
  function Invoke(key, receiver, args){
    var obj = ToObject(receiver);
    if (obj && obj.Completion) {
      if (obj.Abrupt) return obj; else obj = obj.value;
    }

    var func = obj.Get(key);
    if (func && func.Completion) {
      if (func.Abrupt) return func; else func = func.value;
    }

    if (!IsCallable(func))
      return ThrowException('called_non_callable', key);

    return func.Call(obj, args);
  }

  // ## GetIdentifierReference

  function GetIdentifierReference(lex, name, strict){
    if (lex == null) {
      return new Reference(undefined, name, strict);
    } else if (lex.HasBinding(name)) {
      return new Reference(lex, name, strict);
    } else {
      return GetIdentifierReference(lex.outer, name, strict);
    }
  }

  function GetSymbol(context, name){
    var env = context.LexicalEnvironment;
    while (env) {
      if (env.HasSymbolBinding(name)) {
        return env.GetSymbol(name);
      }
      env = env.outer;
    }
  }

  // ## IsPropertyReference

  function IsPropertyReference(v){
    var type = typeof v.base;
    return type === STRING
        || type === NUMBER
        || type === BOOLEAN
        || v.base instanceof $Object;
  }

  operators.IsPropertyReference = IsPropertyReference;

  // ## ToObject

  function ToObject(argument){
    switch (typeof argument) {
      case BOOLEAN:
        return new $Boolean(argument);
      case NUMBER:
        return new $Number(argument);
      case STRING:
        return new $String(argument);
      case UNDEFINED:
        return ThrowException('undefined_to_object', []);
      case OBJECT:
        if (argument === null) {
          return ThrowException('null_to_object', []);
        } else if (argument.Completion) {
          if (argument.Abrupt) {
            return argument;
          }
          return ToObject(argument.value);
        }
        return argument;
    }
  }


  function ThrowStopIteration(){
    return new AbruptCompletion('throw', intrinsics.StopIteration);
  }

  function IsStopIteration(o){
    return !!(o && o.Abrupt && o.value && o.value.NativeBrand === StopIteration);
  }


  var PropertyDefinitionEvaluation = (function(){
    function makeDefiner(constructs, field, desc){
      return function(obj, key, code) {

        var sup = code.NeedsSuperBinding,
            lex = context.LexicalEnvironment,
            home = sup ? obj : undefined,
            $F = code.generator ? $GeneratorFunction : $Function,
            func = new $F(METHOD, key, code.params, code, lex, code.Strict, undefined, home, sup);

        constructs && MakeConstructor(func);
        desc[field] = func;
        var result = obj.DefineOwnProperty(key, desc, false);
        desc[field] = undefined;

        return result && result.Abrupt ? result : func;
      };
    }

    var DefineMethod = makeDefiner(false, VALUE, {
      Value: undefined,
      Writable: true,
      Enumerable: true,
      Configurable: true
    });

    var DefineGetter = makeDefiner(true, GET, {
      Get: undefined,
      Enumerable: true,
      Configurable: true
    });

    var DefineSetter = makeDefiner(true, SET, {
      Set: undefined,
      Enumerable: true,
      Configurable: true
    });

    return function PropertyDefinitionEvaluation(kind, obj, key, code){
      if (kind === 'get') {
        return DefineGetter(obj, key, code);
      } else if (kind === 'set') {
        return DefineSetter(obj, key, code);
      } else if (kind === 'method') {
        return DefineMethod(obj, key, code);
      }
    };
  })();



  var mutable = {
    Value: undefined,
    Writable: true,
    Enumerable: true,
    Configurable: true
  };

  var immutable = {
    Value: undefined,
    Writable: true,
    Enumerable: true,
    Configurable: false
  };


  function TopLevelDeclarationInstantiation(code){
    var env = context.VariableEnvironment,
        configurable = code.ScopeType === SCOPE.EVAL,
        decls = code.LexicalDeclarations;

    var desc = configurable ? mutable : immutable;

    for (var i=0, decl; decl = decls[i]; i++) {
      if (decl.type === 'FunctionDeclaration') {
        var name = decl.id.name;
        if (env.HasBinding(name)) {
          env.CreateMutableBinding(name, configurable);
        } else if (env === realm.globalEnv) {
          var existing = global.GetOwnProperty(name);
          if (!existing) {
            global.DefineOwnProperty(name, desc, true);
          } else if (IsAccessorDescriptor(existing) || !existing.Writable && !existing.Enumerable) {
            return ThrowException('global invalid define');
          }
        }
        if (decl.type === 'FunctionDeclaration') {
          env.SetMutableBinding(name, InstantiateFunctionDeclaration(decl, context.LexicalEnvironment), code.Strict);
        }
      }
    }

    for (var i=0; i < code.VarDeclaredNames.length; i++) {
      var name = code.VarDeclaredNames[i];
      if (!env.HasBinding(name)) {
        env.CreateMutableBinding(name, configurable);
        env.SetMutableBinding(name, undefined, code.Strict);
      } else if (env === realm.globalEnv) {
        var existing = global.GetOwnProperty(name);
        if (!existing) {
          global.DefineOwnProperty(name, desc, true);
        }
      }
    }
  }


  // ## FunctionDeclarationInstantiation

  function FunctionDeclarationInstantiation(func, args, env){
    var formals = func.FormalParameters,
        params = formals.BoundNames;

    for (var i=0; i < params.length; i++) {
      if (!env.HasBinding(params[i])) {
        env.CreateMutableBinding(params[i]);
        env.InitializeBinding(params[i], undefined);
      }
    }

    var decls = func.Code.LexicalDeclarations;

    for (var i=0, decl; decl = decls[i]; i++) {
      var names = decl.BoundNames;
      for (var j=0; j < names.length; j++) {
        if (!env.HasBinding(names[j])) {
          if (decl.IsConstantDeclaration) {
            env.CreateImmutableBinding(names[j]);
          } else {
            env.CreateMutableBinding(names[j], false);
          }
        }
      }
    }

    if (func.Strict) {
      var ao = new $StrictArguments(args);
      var status = ArgumentBindingInitialization(formals, ao, env);
    } else {
      var ao = env.arguments = new $MappedArguments(params, env, args, func);
      var status = ArgumentBindingInitialization(formals, ao);
    }

    if (status && status.Abrupt) {
      return status;
    }

    if (!env.HasBinding(ARGUMENTS)) {
      if (func.Strict) {
        env.CreateImmutableBinding(ARGUMENTS);
      } else {
        env.CreateMutableBinding(ARGUMENTS);
      }
      env.InitializeBinding(ARGUMENTS, ao);
    }


    var vardecls = func.Code.VarDeclaredNames;
    for (var i=0; i < vardecls.length; i++) {
      if (!env.HasBinding(vardecls[i])) {
        env.CreateMutableBinding(vardecls[i]);
        env.InitializeBinding(vardecls[i], undefined);
      }
    }

    var funcs = create(null);

    for (var i=0; i < decls.length; i++) {
      if (decls[i].type === 'FunctionDeclaration') {
        var decl = decls[i],
            name = decl.id.name;

        if (!(name in funcs)) {
          funcs[name] = true;
          env.InitializeBinding(name, InstantiateFunctionDeclaration(decl, env));
        }
      }
    }
  }

  function Brand(name){
    this.name = name;
  }

  // ## ClassDefinitionEvaluation

  function ClassDefinitionEvaluation(name, superclass, constructor, methods){
    if (superclass === undefined) {
      var superproto = intrinsics.ObjectProto,
          superctor = intrinsics.FunctionProto;
    } else {
      if (superclass && superclass.Completion) {
        if (superclass.Abrupt) {
          return superclass;
        } else {
          superclass = superclass.value;
        }
      }

      if (superclass === null) {
        superproto = null;
        superctor = intrinsics.FunctionProto;
      } else if (typeof superclass !== 'object') {
        return ThrowException('non_object_superclass');
      } else if (!('Construct' in superclass)) {
        superproto = superclass;
        superctor = intrinsics.FunctionProto;
      } else {
        superproto = superclass.Get('prototype');
        if (superproto && superproto.Completion) {
          if (superproto.Abrupt) {
            return superproto;
          } else {
            superproto = superproto.value;
          }
        }

        if (typeof superproto !== 'object') {
          return ThrowException('non_object_superproto');
        }
        superctor = superclass;
      }
    }

    var proto = new $Object(superproto),
        lex = context.LexicalEnvironment,
        brand = name || '';

    if (name) {
      var scope = context.LexicalEnvironment = new DeclarativeEnvironmentRecord(lex);
      scope.CreateImmutableBinding(name);
    }

    constructor || (constructor = intrinsics.EmptyClass.Code);

    var ctor = PropertyDefinitionEvaluation('method', proto, 'constructor', constructor);
    if (ctor && ctor.Completion) {
      if (ctor.Abrupt) return ctor; else ctor = ctor.value;
    }

    if (name) {
      scope.InitializeBinding(name, ctor);
    }

    ctor.SetPrototype(superctor);
    setDirect(ctor, 'name', brand);
    MakeConstructor(ctor, false, proto);
    proto.properties.set('constructor', ctor, _CW);
    ctor.properties.set('prototype', proto, ___);

    for (var i=0, method; method = methods[i]; i++) {
      PropertyDefinitionEvaluation(method.kind, proto, method.name, method.code);
    }

    ctor.Class = true;
    proto.Brand = new Brand(brand);
    proto.IsClassProto = true;
    context.LexicalEnvironment = lex;
    return ctor;
  }

  // ## InstantiateFunctionDeclaration

  function InstantiateFunctionDeclaration(decl, env){
    var code = decl.Code;
    var $F = code.generator ? $GeneratorFunction : $Function;
    var func = new $F(NORMAL, decl.id.name, code.params, code, env, code.Strict);
    MakeConstructor(func);
    return func;
  }


  // ## BlockDeclarationInstantiation

  function BlockDeclarationInstantiation(decls, env){
    for (var i=0, decl; decl = decls[i]; i++) {
      for (var j=0, name; name = decl.BoundNames[j]; j++) {
        if (decl.IsConstantDeclaration) {
          env.CreateImmutableBinding(name);
        } else {
          env.CreateMutableBinding(name, false);
        }
      }
    }

    for (i=0, decl; decl = decls[i]; i++) {
      if (decl.type === 'FunctionDeclaration') {
        env.InitializeBinding(decl.id.name, InstantiateFunctionDeclaration(decl, env));
      }
    }
  }



  // ## IdentifierResolution

  function IdentifierResolution(context, name) {
    return GetIdentifierReference(context.LexicalEnvironment, name, context.strict);
  }

  // ## BindingInitialization

  function BindingInitialization(pattern, value, env){
    if (pattern.type === 'Identifier') {
      if (env) {
        env.InitializeBinding(pattern.name, value);
      } else {
        return PutValue(IdentifierResolution(context, pattern.name), value);
      }
    } else if (pattern.type === 'ArrayPattern') {
      return IndexedBindingInitialization(pattern, value, 0, env);
    } else if (pattern.type === 'ObjectPattern') {
      return ObjectBindingInitialization(pattern, value, env);
    }
  }

  // ## ArgumentBindingInitialization

  function ArgumentBindingInitialization(params, args, env){
    for (var i = 0, arg; arg = params[i]; i++) {
      var value = args.HasProperty(i) ? args.Get(i) : undefined;
      if (value && value.Completion) {
        if (value.Abrupt) {
          return value;
        } else {
          value = value.value;
        }
      }
      BindingInitialization(arg, value, env);
    }
    if (params.Rest) {
      var len = args.properties.get('length') - params.length,
          array = new $Array(0);

      if (len > 0) {
        for (var i=0; i < len; i++) {
          setDirect(array, i, args.properties.get(params.length + i));
        }
        setDirect(array, 'length', len);
      }
      BindingInitialization(params.Rest, array, env);
    }
  }


  // ## IndexedBindingInitialization

  function IndexedBindingInitialization(pattern, array, i, env){
    for (var element; element = pattern.elements[i]; i++) {
      if (element.type === 'SpreadElement') {
        var value = context.destructureSpread(array, i);
        if (value.Abrupt) {
          return value;
        }
        return BindingInitialization(element.argument, value, env);
      }

      var value = array.HasProperty(i) ? array.Get(i) : undefined;
      if (value && value.Completion) {
        if (value.Abrupt) {
          return value;
        } else {
          value = value.value;
        }
      }
      BindingInitialization(element, value, env);
    }
    return i;
  }

  // ## ObjectBindingInitialization

  function ObjectBindingInitialization(pattern, object, env){
    for (var i=0; property = pattern.properties[i]; i++) {
      var value = object.HasProperty(property.key.name) ? object.Get(property.key.name) : undefined;
      if (value && value.Completion) {
        if (value.Abrupt) {
          return value;
        } else {
          value = value.value;
        }
      }
      BindingInitialization(property.value, value, env);
    }
  }




  function CollectionInitializer(Data, name){
    var data = name + 'Data';
    return function(object, iterable){
      object[data] = new Data;

      if (iterable === undefined) {
        return object;
      }

      iterable = ToObject(iterable);
      if (iterable && iterable.Completion) {
        if (iterable.Abrupt) {
          return iterable;
        } else {
          iterable = iterable.value;
        }
      }

      var iterator = Invoke('iterator', iterable);

      var adder = object.Get('set');
      if (adder && adder.Completion) {
        if (adder.Abrupt) {
          return adder;
        } else {
          adder = adder.value;
        }
      }

      if (!IsCallable(adder)) {
        return ThrowException('called_on_incompatible_object', [name + '.prototype.set']);
      }

      var next;
      while (next = Invoke('next', iterator)) {
        if (IsStopIteration(next)) {
          return object;
        }

        if (next && next.Completion) {
          if (next.Abrupt) return next; else next = next.value;
        }

        next = ToObject(next);

        var k = next.Get(0);
        if (k && k.Completion) {
          if (k.Abrupt) return k; else k = k.value;
        }

        var v = next.Get(1);
        if (v && v.Completion) {
          if (v.Abrupt) return v; else v = v.value;
        }

        var status = adder.Call(object, [k, v]);
        if (status && status.Abrupt) {
          return status;
        }
      }
    }

    return object;
  }


  var MapData = (function(){
    function LinkedItem(key, next){
      this.key = key;
      this.next = next;
      this.previous = next.previous;
      next.previous = next.previous.next = this;
    }

    define(LinkedItem.prototype, [
      function setNext(item){
        this.next = item;
        item.previous = this;
      },
      function setPrevious(item){
        this.previous = item;
        item.next = this;
      },
      function unlink(){
        this.next.previous = this.previous;
        this.previous.next = this.next;
        this.next = this.previous = this.data = this.key = null;
        return this.data;
      }
    ]);


    function MapData(){
      this.id = uid++ + '';
      this.size = 0;
      this.strings = create(null);
      this.numbers = create(null);
      this.others = create(null);
      this.guard = create(LinkedItem.prototype);
      this.guard.next = this.guard.previous = this.guard;
      this.guard.key = {};
      this.lastLookup = this.guard;
    }

    MapData.sigil = create(null);

    define(MapData.prototype, [
      function add(key){
        this.size++;
        return new LinkedItem(key, this.guard);
      },
      function lookup(key){
        var type = typeof key;
        if (key === this) {
          return this.guard;
        } else if (key !== null && type === OBJECT) {
          return key.storage[this.id];
        } else {
          return this.getStorage(key)[key];
        }
      },
      function getStorage(key){
        var type = typeof key;
        if (type === STRING) {
          return this.strings;
        } else if (type === NUMBER) {
          return key === 0 && 1 / key === -Infinity ? this.others : this.numbers;
        } else {
          return this.others;
        }
      },
      function set(key, value){
        var type = typeof key;
        if (key !== null && type === OBJECT) {
          var item = key.storage[this.id] || (key.storage[this.id] = this.add(key));
          item.value = value;
        } else {
          var container = this.getStorage(key);
          var item = container[key] || (container[key] = this.add(key));
          item.value = value;
        }
      },
      function get(key){
        var item = this.lookup(key);
        if (item) {
          return item.value;
        }
      },
      function has(key){
        return !!this.lookup(key);
      },
      function remove(key){
        var item;
        if (key !== null && typeof key === OBJECT) {
          item = key.storage[this.id];
          if (item) {
            delete key.storage[this.id];
          }
        } else {
          var container = this.getStorage(key);
          item = container[key];
          if (item) {
            delete container[key];
          }
        }

        if (item) {
          item.unlink();
          this.size--;
          return true;
        }
        return false;
      },
      function after(key){
        if (key === MapData.sigil) {
          var item = this.guard;
        } else if (key === this.lastLookup.key) {
          var item = this.lastLookup;
        } else {
          var item = this.lookup(key);
        }
        if (item && item.next !== this.guard) {
          this.lastLookup = item.next;
          return [item.next.key, item.next.value];
        } else {
          return ThrowStopIteration();
        }
      }
    ]);

    return MapData;
  })();


  var WeakMapData = (function(){
    function WeakMapData(){
      this.id = uid++ + '';
    }

    define(WeakMapData.prototype, [
      function set(key, value){
        if (value === undefined) {
          value = Empty;
        }
        key.storage[this.id] = value;
      },
      function get(key){
        var value = key.storage[this.id];
        if (value !== Empty) {
          return value;
        }
      },
      function has(key){
        return key.storage[this.id] !== undefined;
      },
      function remove(key){
        var item = key.storage[this.id];
        if (item !== undefined) {
          key.storage[this.id] = undefined;
          return true;
        }
        return false;
      }
    ]);

    return WeakMapData;
  })();


  function Element(context, prop, base){
    var result = CheckObjectCoercible(base);
    if (result.Abrupt) {
      return result;
    }

    var name = ToPropertyName(prop);
    if (name && name.Completion) {
      if (name.Abrupt) return name; else name = name.value;
    }

    return new Reference(base, name, context.Strict);
  }

  function SuperReference(context, prop){
    var env = context.getThisEnvironment();
    if (!env.HasSuperBinding()) {
      return ThrowException('invalid_super_binding');
    } else if (prop === null) {
      return env;
    }

    var baseValue = env.GetSuperBase(),
        status = CheckObjectCoercible(baseValue);

    if (status.Abrupt) {
      return status;
    }

    if (prop === false) {
      var key = env.GetMethodName();
    } else {
      var key = ToPropertyName(prop);
      if (key && key.Completion) {
        if (key.Abrupt) return key; else return key.value;
      }
    }

    var ref = new Reference(baseValue, key, context.Strict);
    ref.thisValue = env.GetThisBinding();
    return ref;
  }

  function GetThisEnvironment(context){
    var env = context.LexicalEnvironment;
    while (env) {
      if (env.HasThisBinding())
        return env;
      env = env.outer;
    }
  }


  function ThisResolution(context){
    return GetThisEnvironment(context).GetThisBinding();
  }

  function EvaluateConstruct(func, args) {
    if (typeof func !== OBJECT) {
      return ThrowException('not_constructor', func);
    }

    if ('Construct' in func) {
      return func.Construct(args);
    } else {
      return ThrowException('not_constructor', func);
    }
  }

  function EvaluateCall(ref, func, args){
    if (typeof func !== OBJECT || !IsCallable(func)) {
      return ThrowException('called_non_callable', [ref && ref.name]);
    }

    if (ref instanceof Reference) {
      var receiver = IsPropertyReference(ref) ? GetThisValue(ref) : ref.base.WithBaseObject();
    }

    return func.Call(receiver, args);
  }

  function SpreadArguments(precedingArgs, spread){
    if (typeof spread !== 'object') {
      return ThrowException('spread_non_object');
    }

    var offset = precedingArgs.length,
        len = ToUint32(spread.Get('length'));

    if (len && len.Completion) {
      if (len.Abrupt) return len; else return len.value;
    }

    for (var i=0; i < len; i++) {
      var value = spread.Get(i);
      if (value && value.Completion) {
        if (value.Abrupt) return value; else value = value.value;
      }

      precedingArgs[i + offset] = value;
    }
  }

  function SpreadInitialization(array, offset, spread){
    if (typeof spread !== 'object') {
      return ThrowException('spread_non_object');
    }

    var value, iterator = spread.Iterate();

    while (!(value = Invoke('next', iterator, [])) && !IsStopIteration(value)) {
      if (value && value.Completion) {
        if (value.Abrupt) return value; else value = value.value;
      }
      array.properties.set(offset++, value, ECW);
    }

    array.properties.set('length', offset, _CW);
    return offset;
  }

  function GetTemplateCallSite(context, template){
    if (!('id' in template)) {
      GetTemplateCallSite.count = (GetTemplateCallSite.count || 0) + 1;
      template.id = GetTemplateCallSite.count;
    }
    if (template.id in realm.templates) {
      return context.Realm.templates[template.id];
    }

    var count = template.length,
        site = context.createArray(count),
        raw = context.createArray(count);

    for (var i=0; i < count; i++) {
      site.properties.set(i+'', template[i].cooked, E__);
      raw.properties.set(i+'', template[i].raw, E__);
    }
    site.properties.set('length', count, ___);
    raw.properties.set('length', count, ___);
    site.properties.set('raw', raw, ___);
    site.SetExtensible(false);
    raw.SetExtensible(false);
    realm.templates[template.id] = site;
    return site;
  }

  function SpreadDestructuring(context, target, index){
    var array = context.createArray(0);
    if (target == null) {
      return array;
    }
    if (typeof target !== 'object') {
      return ThrowException('spread_non_object', typeof target);
    }

    var len = ToUint32(target.Get('length'));
    if (len && len.Completion) {
      if (len.Abrupt) return len; else len = len.value;
    }

    var count = len - index;
    for (var i=0; i < count; i++) {
      var value = target.Get(index + i);
      if (value && value.Completion) {
        if (value.Abrupt) return value; else value = value.value;
      }
      array.properties.set(i, value, ECW);
    }

    array.properties.set('length', i, _CW);
    return array;
  }


  // ###########################
  // ###########################
  // ### Specification Types ###
  // ###########################
  // ###########################


  // #################
  // ### Reference ###
  // #################


  var Reference = (function(){
    function Reference(base, name, strict){
      this.base = base;
      this.name = name;
      this.strict = strict;
    }
    define(Reference.prototype, {
      Reference: SYMBOLS.Reference
    });

    return Reference;
  })();






  // ##########################
  // ### PropertyDescriptor ###
  // ##########################

  function PropertyDescriptor(attributes){
    this.Enumerable = (attributes & E) > 0;
    this.Configurable = (attributes & C) > 0;
  }

  define(PropertyDescriptor.prototype, {
    Enumerable: undefined,
    Configurable: undefined
  });

  function DataDescriptor(value, attributes){
    this.Value = value;
    this.Writable = (attributes & W) > 0;
    this.Enumerable = (attributes & E) > 0;
    this.Configurable = (attributes & C) > 0;
  }

  inherit(DataDescriptor, PropertyDescriptor, {
    Writable: undefined,
    Value: undefined
  });

  function AccessorDescriptor(accessors, attributes){
    this.Get = accessors.Get;
    this.Set = accessors.Set;
    this.Enumerable = (attributes & E) > 0;
    this.Configurable = (attributes & C) > 0;
  }

  inherit(AccessorDescriptor, PropertyDescriptor, {
    Get: undefined,
    Set: undefined
  });

  function NormalDescriptor(value){
    this.Value = value;
  }

  var emptyValue = NormalDescriptor.prototype = new DataDescriptor(undefined, ECW);

  function StringIndice(value){
    this.Value = value;
  }

  StringIndice.prototype = new DataDescriptor(undefined, E__);


  function Value(value){
    this.Value = value;
  }



  function Accessor(get, set){
    this.Get = get;
    this.Set = set;
  }

  define(Accessor.prototype, {
    Get: undefined,
    Set: undefined
  });




  function ArgAccessor(name, env){
    this.name = name;
    define(this, { env: env  });
  }

  inherit(ArgAccessor, Accessor, {
    Get: { Call: function(){ return this.env.GetBindingValue(this.name) } },
    Set: { Call: function(v){ this.env.SetMutableBinding(this.name, v) } }
  });



  // #########################
  // ### EnvironmentRecord ###
  // #########################

  var EnvironmentRecord = (function(){
    function EnvironmentRecord(bindings, outer){
      this.bindings = bindings;
      this.outer = outer;
    }

    define(EnvironmentRecord.prototype, {
      bindings: null,
      withBase: undefined,
      type: 'Environment',
      Environment: true
    });

    define(EnvironmentRecord.prototype, [
      function EnumerateBindings(){},
      function HasBinding(name){},
      function GetBindingValue(name, strict){},
      function SetMutableBinding(name, value, strict){},
      function DeleteBinding(name){},
      function WithBaseObject(){
        return this.withBase;
      },
      function HasThisBinding(){
        return false;
      },
      function HasSuperBinding(){
        return false;
      },
      function GetThisBinding(){},
      function GetSuperBase(){},
      function HasSymbolBinding(name){
        if (this.symbols) {
          return name in this.symbols;
        }
        return false;
      },
      function InitializeSymbolBinding(name, symbol){
        if (!this.symbols) {
          this.symbols = create(null);
        }
        if (name in this.symbols) {
          return ThrowException('symbol_redefine', name);
        }
        this.symbols[name] = symbol;
      },
      function GetSymbol(name){
        if (this.symbols && name in this.symbols) {
          return this.symbols[name];
        } else{
          return ThrowException('symbol_not_defined', name);
        }
      },
      function reference(name, strict){
        return new Reference(this, name, strict);
      }
    ]);

    return EnvironmentRecord;
  })();

  var DeclarativeEnvironmentRecord = (function(){
    function DeclarativeEnvironmentRecord(outer){
      EnvironmentRecord.call(this, new Hash, outer);
      this.consts = new Hash;
      this.deletables = new Hash;
    }

    inherit(DeclarativeEnvironmentRecord, EnvironmentRecord, {
      type: 'Declarative Env'
    }, [
      function EnumerateBindings(){
        return ownKeys(this.bindings);
      },
      function HasBinding(name){
        return name in this.bindings;
      },
      function CreateMutableBinding(name, deletable){
        this.bindings[name] = undefined;
        if (deletable)
          this.deletables[name] = true;
      },
      function InitializeBinding(name, value){
        this.bindings[name] = value;
      },
      function GetBindingValue(name, strict){
        if (name in this.bindings) {
          var value = this.bindings[name];
          if (value === Uninitialized)
            return ThrowException('uninitialized_const', name);
          else
            return value;
        } else if (strict) {
          return ThrowException('not_defined', name);
        } else {
          return false;
        }
      },
      function SetMutableBinding(name, value, strict){
        if (name in this.consts) {
          if (this.bindings[name] === Uninitialized)
            return ThrowException('uninitialized_const', name);
          else if (strict)
            return ThrowException('const_assign', name);
        } else {
          this.bindings[name] = value;
        }
      },
      function CreateImmutableBinding(name){
        this.bindings[name] = Uninitialized;
        this.consts[name] = true;
      },
      function DeleteBinding(name){
        if (name in this.bindings) {
          if (name in this.deletables) {
            delete this.bindings[name];
            delete this.deletables[names];
            return true;
          } else {
            return false;
          }
        } else {
          return true;
        }
      }
    ]);

    return DeclarativeEnvironmentRecord;
  })();


  var ObjectEnvironmentRecord = (function(){
    function ObjectEnvironmentRecord(object, outer){
      EnvironmentRecord.call(this, object, outer);
    }

    inherit(ObjectEnvironmentRecord, EnvironmentRecord, {
      type: 'Object Env'
    }, [
      function EnumerateBindings(){
        return this.bindings.Enumerate(false, false);
      },
      function HasBinding(name){
        return this.bindings.HasProperty(name);
      },
      function CreateMutableBinding(name, deletable){
        return this.bindings.DefineOwnProperty(name, emptyValue, true);
      },
      function InitializeBinding(name, value){
        return this.bindings.DefineOwnProperty(name, new NormalDescriptor(value), true);
      },
      function GetBindingValue(name, strict){
        if (this.bindings.HasProperty(name)) {
          return this.bindings.Get(name);
        } else if (strict) {
          return ThrowException('not_defined', name);
        }
      },
      function SetMutableBinding(name, value, strict){
        return this.bindings.Put(name, value, strict);
      },
      function DeleteBinding(name){
       return this.bindings.Delete(name, false);
      }
    ]);

    return ObjectEnvironmentRecord;
  })();



  var FunctionEnvironmentRecord = (function(){
    function FunctionEnvironmentRecord(receiver, method){
      DeclarativeEnvironmentRecord.call(this, method.Scope);
      this.thisValue = receiver;
      this.HomeObject = method.HomeObject;
      this.MethodName = method.MethodName;
    }

    inherit(FunctionEnvironmentRecord, DeclarativeEnvironmentRecord, {
      HomeObject: undefined,
      MethodName: undefined,
      thisValue: undefined,
      type: 'Function Env'
    }, [
      function HasThisBinding(){
        return true;
      },
      function HasSuperBinding(){
        return this.HomeObject !== undefined;
      },
      function GetThisBinding(){
        return this.thisValue;
      },
      function GetSuperBase(){
        return this.HomeObject ? this.HomeObject.GetPrototype() : undefined;
      },
      function GetMethodName() {
        return this.MethodName;
      }
    ]);

    return FunctionEnvironmentRecord;
  })();



  var GlobalEnvironmentRecord = (function(){
    function GlobalEnvironmentRecord(global){
      ObjectEnvironmentRecord.call(this, global);
      this.thisValue = this.bindings;
      global.env = this;
      hide(global, 'env');
    }

    inherit(GlobalEnvironmentRecord, ObjectEnvironmentRecord, {
      outer: null,
      type: 'Global Env'
    }, [
      function GetThisBinding(){
        return this.bindings;
      },
      function HasThisBinding(){
        return true;
      },
      function inspect(){
        return '[GlobalEnvironmentRecord]';
      }
    ]);

    return GlobalEnvironmentRecord;
  })();




  // ###############
  // ### $Object ###
  // ###############

  var $Object = (function(){
    var Proto = {
      Get: {
        Call: function(receiver){
          return receiver.GetPrototype();
        }
      },
      Set: {
        Call: function(receiver, args){
          return receiver.SetPrototype(args[0]);
        }
      }
    };

    function $Object(proto){
      if (proto === undefined) {
        proto = intrinsics.ObjectProto;
      }
      this.Prototype = proto;
      this.properties = new PropertyList;
      this.hiddens = create(null);
      this.storage = create(null);
      $Object.tag(this);
      if (proto === null) {
        this.properties.setProperty(['__proto__', null, 6, Proto]);
      }

      this.Realm = realm;
      hide(this, 'hiddens');
      hide(this, 'storage');
      hide(this, 'Prototype');
      hide(this, 'Realm');
    }

    var counter = 0;
    define($Object, function tag(object){
      if (object.id === undefined) {
        object.id = counter++;
        hide(object, 'id');
      }
    });

    define($Object.prototype, {
      Extensible: true,
      NativeBrand: BRANDS.NativeObject
    });

    define($Object.prototype, [
      function GetPrototype(){
        return this.Prototype;
      },
      function SetPrototype(value){
        if (typeof value === 'object' && this.GetExtensible()) {
          this.Prototype = value;
          return true;
        } else {
          return false;
        }
      },
      function GetExtensible(){
        return this.Extensible;
      },
      function SetExtensible(v){
        v = !!v;
        if (this.Extensible) {
          this.Extensible = v;
        }
        return this.Extensible === v;
      },
      function GetOwnProperty(key){
        if (key === '__proto__') {
          var val = this.GetP(this, '__proto__');
          return typeof val === OBJECT ? new DataDescriptor(val, 6) : undefined;
        }

        var prop = this.properties.getProperty(key);
        if (prop) {
          if (prop[2] & A) {
            var Descriptor = AccessorDescriptor,
                val = prop[1];
          } else {
            var val = prop[3] ? prop[3](this) : prop[1],
                Descriptor = DataDescriptor;
          }
          return new Descriptor(val, prop[2]);
        }
      },
      function GetProperty(key){
        var desc = this.GetOwnProperty(key);
        if (desc) {
          return desc;
        } else {
          var proto = this.GetPrototype();
          if (proto) {
            return proto.GetProperty(key);
          }
        }
      },
      function Get(key){
        return this.GetP(this, key);
      },
      function Put(key, value, strict){
        if (!this.SetP(this, key, value) && strict) {
          return ThrowException('strict_cannot_assign', [key]);
        }
      },
      function GetP(receiver, key){
        var prop = this.properties.getProperty(key);
        if (!prop) {
          var proto = this.GetPrototype();
          if (proto) {
            return proto.GetP(receiver, key);
          }
        } else if (prop[3]) {
          var getter = prop[3].Get;
          return getter.Call(receiver, [key]);
        } else if (prop[2] & A) {
          var getter = prop[1].Get;
          if (IsCallable(getter)) {
            return getter.Call(receiver, []);
          }
        } else {
          return prop[1];
        }
      },
      function SetP(receiver, key, value) {
        var prop = this.properties.getProperty(key);
        if (prop) {
          if (prop[3]) {
            var setter = prop[3].Set;
            setter.Call(receiver, [key, value]);
            return true;
          } else if (prop[2] & A) {
            var setter = prop[1].Set;
            if (IsCallable(setter)) {
              setter.Call(receiver, [value]);
              return true;
            } else {
              return false;
            }
          } else if (prop[2] & W) {
            if (this === receiver) {
              return this.DefineOwnProperty(key, new Value(value), false);
            } else if (!receiver.GetExtensible()) {
              return false;
            } else {
              return receiver.DefineOwnProperty(key, new DataDescriptor(value, ECW), false);
            }
          } else {
            return false;
          }
        } else {
          var proto = this.GetPrototype();
          if (!proto) {
            if (!receiver.GetExtensible()) {
              return false;
            } else {
              return receiver.DefineOwnProperty(key, new DataDescriptor(value, ECW), false);
            }
          } else {
            return proto.SetP(receiver, key, value);
          }
        }
      },
      function DefineOwnProperty(key, desc, strict){
        var reject = strict
            ? function(e, a){ return ThrowException(e, a) }
            : function(e, a){ return false };

        var current = this.GetOwnProperty(key);

        if (current === undefined) {
          if (!this.GetExtensible()) {
            return reject('define_disallowed', []);
          } else {
            if (IsGenericDescriptor(desc) || IsDataDescriptor(desc)) {
              this.properties.set(key, desc.Value, desc.Enumerable | (desc.Configurable << 1) | (desc.Writable << 2));
            } else {
              this.properties.set(key, new Accessor(desc.Get, desc.Set), desc.Enumerable | (desc.Configurable << 1) | A);
            }
            return true;
          }
        } else {
          var rejected = false;
          if (IsEmptyDescriptor(desc) || IsEquivalentDescriptor(desc, current)) {
            return;
          }

          if (!current.Configurable) {
            if (desc.Configurable || desc.Enumerable === !current.Configurable) {
              return reject('redefine_disallowed', []);
            } else {
              var currentIsData = IsDataDescriptor(current),
                  descIsData = IsDataDescriptor(desc);

              if (currentIsData !== descIsData)
                return reject('redefine_disallowed', []);
              else if (currentIsData && descIsData)
                if (!current.Writable && VALUE in desc && desc.Value !== current.Value)
                  return reject('redefine_disallowed', []);
              else if (SET in desc && desc.Set !== current.Set)
                return reject('redefine_disallowed', []);
              else if (GET in desc && desc.Get !== current.Get)
                return reject('redefine_disallowed', []);
            }
          }

          CONFIGURABLE in desc || (desc.Configurable = current.Configurable);
          ENUMERABLE in desc || (desc.Enumerable = current.Enumerable);

          var prop = this.properties.getProperty(key);

          if (IsAccessorDescriptor(desc)) {
            prop[2] = desc.Enumerable | (desc.Configurable << 1) | A;
            if (IsDataDescriptor(current)) {
              prop[1] = new Accessor(desc.Get, desc.Set);
            } else {
              if (SET in desc) {
                prop[1].Set = desc.Set;
              }
              if (GET in desc) {
                prop[1].Get = desc.Get;
              }
            }
          } else {
            if (IsAccessorDescriptor(current)) {
              current.Writable = true;
            }
            WRITABLE in desc || (desc.Writable = current.Writable);
            if ('Value' in desc) {
              prop[1] = desc.Value;
            }
            prop[2] = desc.Enumerable | (desc.Configurable << 1) | (desc.Writable << 2);
          }

          return true;
        }
      },
      function HasOwnProperty(key){
        return this.properties.has(key);
      },
      function HasProperty(key){
        if (this.properties.has(key)) {
          return true;
        } else {
          var proto = this.GetPrototype();
          if (proto) {
            return proto.HasProperty(key);
          } else {
            return false;
          }
        }
      },
      function Delete(key, strict){
        if (!this.properties.has(key)) {
          return true;
        } else if (this.properties.hasAttribute(key, C)) {
          this.properties.remove(key);
          return true;
        } else if (strict) {
          return ThrowException('strict_delete', []);
        } else {
          return false;
        }
      },
      function Iterate(){
        return Invoke(intrinsics.iterator, this, []);
      },
      function enumerator(){
        var keys = this.Enumerate(true, true),
            index = 0,
            len = keys.length;

        var iterator = new $Object;
        setDirect(iterator, 'next', new $NativeFunction({
          length: 0,
          name: 'next',
          call: function(){
            if (index < len) {
              return keys[index++];
            } else {
              return ThrowStopIteration();
            }
          }
        }));
        return iterator;
      },
      function Enumerate(includePrototype, onlyEnumerable){
        var props = this.properties.filter(function(prop){
          return !prop[0].Private && (!onlyEnumerable || (prop[2] & E));
        }, this);

        if (includePrototype) {
          var proto = this.GetPrototype();
          if (proto) {
            props.merge(proto.Enumerate(includePrototype, onlyEnumerable));
          }
        }

        return props.keys();
      },
      function DefaultValue(hint){
        var order = hint === 'String' ? ['toString', 'valueOf'] : ['valueOf', 'toString'];

        for (var i=0; i < 2; i++) {
          var method = this.Get(order[i]);
          if (method && method.Completion) {
            if (method.Abrupt) return method; else method = method.value;
          }

          if (IsCallable(method)) {
            var value = method.Call(this, []);
            if (value && value.Completion) {
              if (value.Abrupt) return value; else value = value.value;
            }
            if (value === null || typeof value !== OBJECT) {
              return value;
            }
          }
        }

        return ThrowException('cannot_convert_to_primitive', []);
      }
    ]);

    return $Object;
  })();



  var DefineOwn = $Object.prototype.DefineOwnProperty;

  // #################
  // ### $Function ###
  // #################

  var $Function = (function(){
    function $Function(kind, name, params, code, scope, strict, proto, holder, method){
      if (proto === undefined)
        proto = intrinsics.FunctionProto;

      $Object.call(this, proto);
      this.FormalParameters = params;
      this.ThisMode = kind === ARROW ? 'lexical' : strict ? 'strict' : 'global';
      this.Strict = !!strict;
      this.Realm = realm;
      this.Scope = scope;
      this.Code = code;
      if (holder !== undefined) {
        this.HomeObject = holder;
      }
      if (method) {
        this.MethodName = name;
      }

      var len = params ? params.ExpectedArgumentCount : 0;
      var nameAttrs = code.name && !code.writableName ? ___ : __W;
      name = code.name || '';

      if (strict) {
        this.properties.initialize([
          'arguments', intrinsics.ThrowTypeError, __A,
          'caller', intrinsics.ThrowTypeError, __A,
          'length', len, ___,
          'name', name, nameAttrs
        ]);
      } else {
        this.properties.initialize([
          'arguments', null, ___,
          'caller', null, ___,
          'length', len, ___,
          'name', name, nameAttrs
        ]);
      }

      hide(this, 'Realm');
      hide(this, 'Code');
      hide(this, 'Scope');
      hide(this, 'FormalParameters');
      hide(this, 'Strict');
      hide(this, 'ThisMode');
    }

    inherit($Function, $Object, {
      NativeBrand: BRANDS.NativeFunction,
      FormalParameters: null,
      Code: null,
      Scope: null,
      Strict: false,
      ThisMode: 'global',
      Realm: null
    }, [
      function Call(receiver, args, isConstruct){
        if (realm !== this.Realm) {
          activate(this.Realm);
        }
        if (this.ThisMode === 'lexical') {
          var local = new DeclarativeEnvironmentRecord(this.Scope);
        } else {
          if (this.ThisMode !== 'strict') {
            if (receiver == null) {
              receiver = this.Realm.global;
            } else if (typeof receiver !== OBJECT) {
              receiver = ToObject(receiver);
              if (receiver.Completion) {
                if (receiver.Abrupt) return receiver; else receiver = receiver.value;
              }
            }
          }
          var local = new FunctionEnvironmentRecord(receiver, this);
        }

        var caller = context ? context.callee : null;

        ExecutionContext.push(new ExecutionContext(context, local, realm, this.Code, this, isConstruct));
        var status = FunctionDeclarationInstantiation(this, args, local);
        if (status && status.Abrupt) {
          ExecutionContext.pop();
          return status;
        }

        if (!this.thunk) {
          this.thunk = new Thunk(this.Code);
          hide(this, 'thunk');
        }

        if (!this.Strict) {
          this.properties.set('arguments', local.arguments, ___);
          this.properties.set('caller', caller, ___);
          local.arguments = null;
        }

        var result = this.thunk.run(context);

        if (!this.Strict) {
          this.properties.set('arguments', null, ___);
          this.properties.set('caller', null, ___);
        }

        ExecutionContext.pop();
        return result && result.type === Return ? result.value : result;
      },
      function Construct(args){
        if (this.ThisMode === 'lexical') {
          return ThrowException('construct_arrow_function');
        }
        var prototype = this.Get('prototype');
        if (prototype && prototype.Completion) {
          if (prototype.Abrupt) return prototype; else prototype = prototype.value;
        }

        var instance = typeof prototype === OBJECT ? new $Object(prototype) : new $Object;
        if (this.NativeConstructor) {
          instance.NativeBrand = prototype.NativeBrand;
        } else if (this.Class) {
          instance.Brand = prototype.Brand;
        }
        instance.ConstructorName = this.properties.get('name');

        var result = this.Call(instance, args, true);
        if (result && result.Completion) {
          if (result.Abrupt) return result; else result = result.value;
        }
        return typeof result === OBJECT ? result : instance;
      },
      function HasInstance(arg){
        if (typeof arg !== OBJECT || arg === null) {
          return false;
        }

        var prototype = this.Get('prototype');
        if (prototype.Completion) {
          if (prototype.Abrupt) return prototype; else prototype = prototype.value;
        }

        if (typeof prototype !== OBJECT) {
          return ThrowException('instanceof_nonobject_proto');
        }

        while (arg) {
          arg = arg.GetPrototype();
          if (prototype === arg) {
            return true;
          }
        }
        return false;
      }
    ]);

    return $Function;
  })();


  var $NativeFunction = (function(){
    function $NativeFunction(options){
      if (options.proto === undefined) {
        options.proto = intrinsics.FunctionProto;
      }
      $Object.call(this, options.proto);

      this.properties.initialize([
        'arguments', null, ___,
        'caller', null, ___,
        'length', options.length, ___,
        'name', options.name, ___
      ]);

      this.call = options.call;
      if (options.construct) {
        this.construct = options.construct;
      }

      this.Realm = realm;
      hide(this, 'Realm');
      hide(this, 'call');
    }

    inherit($NativeFunction, $Function, {
      Native: true,
    }, [
      function Call(receiver, args){
        var result = this.call.apply(receiver, [].concat(args));
        return result && result.type === Return ? result.value : result;
      },
      function Construct(args){
        if (this.construct) {
          var instance = hasDirect(this, 'prototype') ? new $Object(this.properties.get('prototype')) : new $Object;
          instance.ConstructorName = this.properties.get('name');
          var result = this.construct.apply(instance, args);
        } else {
          var result = this.call.apply(undefined, args);
        }
        return result && result.type === Return ? result.value : result;
      }
    ]);

    return $NativeFunction;
  })();

  var $BoundFunction = (function(){
    function $BoundFunction(target, boundThis, boundArgs){
      $Object.call(this, intrinsics.FunctionProto);
      this.TargetFunction = target;
      this.BoundThis = boundThis;
      this.BoundArgs = boundArgs;
      this.properties.initialize([
        'arguments', intrinsics.ThrowTypeError, __A,
        'caller', intrinsics.ThrowTypeError, __A,
        'length', target.properties.get('length'), ___
      ]);
    }

    inherit($BoundFunction, $Function, {
      TargetFunction: null,
      BoundThis: null,
      BoundArguments: null
    }, [
      function Call(_, newArgs){
        return this.TargetFunction.Call(this.BoundThis, this.BoundArgs.concat(newArgs));
      },
      function Construct(newArgs){
        if (!this.TargetFunction.Construct) {
          return ThrowException('not_constructor', this.TargetFunction.name);
        }
        return this.TargetFunction.Construct(this.BoundArgs.concat(newArgs));
      },
      function HasInstance(arg){
        if (!this.TargetFunction.HasInstance) {
          return ThrowException('instanceof_function_expected', this.TargetFunction.name);
        }
        return This.TargetFunction.HasInstance(arg);
      }
    ]);

    return $BoundFunction;
  })();

  var $GeneratorFunction = (function(){
    function $GeneratorFunction(){
      $Function.apply(this, arguments);
    }

    inherit($GeneratorFunction, $Function, [
      function Call(receiver, args){
        if (realm !== this.Realm) {
          activate(this.Realm);
        }
        if (this.ThisMode === 'lexical') {
          var local = new DeclarativeEnvironmentRecord(this.Scope);
        } else {
          if (this.ThisMode !== 'strict') {
            if (receiver == null) {
              receiver = this.Realm.global;
            } else if (typeof receiver !== OBJECT) {
              receiver = ToObject(receiver);
              if (receiver.Completion) {
                if (receiver.Abrupt) return receiver; else receiver = receiver.value;
              }
            }
          }
          var local = new FunctionEnvironmentRecord(receiver, this);
        }

        var ctx = new ExecutionContext(context, local, this.Realm, this.Code, this);
        ExecutionContext.push(ctx);

        var status = FunctionDeclarationInstantiation(this, args, local);
        if (status && status.Abrupt) {
          ExecutionContext.pop();
          return status;
        }

        if (!this.thunk) {
          this.thunk = new Thunk(this.Code);
          hide(this, 'thunk');
        }

        var result = new $Generator(this.Realm, local, ctx, this.thunk);
        ExecutionContext.pop();
        return result;
      }
    ]);

    return $GeneratorFunction;
  })();


  var $Generator = (function(){
    function setFunction(obj, name, func){
      setDirect(obj, name, new $NativeFunction({
        name: name,
        length: func.length,
        call: func
      }));
    }

    function $Generator(realm, scope, ctx, thunk){
      $Object.call(this);
      this.Realm = realm;
      this.Scope = scope;
      this.Code = thunk.code;
      this.ExecutionContext = ctx;
      this.State = 'newborn';
      this.thunk = thunk;

      var self = this;
      setFunction(this, 'iterator', function(){ return self });
      setFunction(this, 'next',     function(){ return self.Send() });
      setFunction(this, 'close',    function(){ return self.Close() });
      setFunction(this, 'send',     function(v){ return self.Send(v) });
      setFunction(this, 'throw',    function(v){ return self.Throw(v) });

      hide(this, 'thunk');
      hide(this, 'Realm');
      hide(this, 'Code');
    }

    inherit($Generator, $Object, {
      Code: null,
      ExecutionContext: null,
      Scope: null,
      Handler: null,
      State: null,
    }, [
      function Send(value){
        if (this.State === 'executing') {
          return ThrowException('generator_executing', 'send');
        } else if (this.State === 'closed') {
          return ThrowException('generator_closed', 'send');
        }
        if (this.State === 'newborn') {
          if (value !== undefined) {
            return ThrowException('generator_send_newborn');
          }
          this.ExecutionContext.currentGenerator = this;
          this.State = 'executing';
          ExecutionContext.push(this.ExecutionContext);
          return this.thunk.run(this.ExecutionContext);
        }

        this.State = 'executing';
        return Resume(this.ExecutionContext, 'normal', value);
      },
      function Throw(value){
        if (this.State === 'executing') {
          return ThrowException('generator_executing', 'throw');
        } else if (this.State === 'closed') {
          return ThrowException('generator_closed', 'throw');
        }
        if (this.State === 'newborn') {
          this.State = 'closed';
          this.Code = null;
          return new AbruptCompletion('throw', value);
        }

        this.State = 'executing';
        var result = Resume(this.ExecutionContext, 'throw', value);
      },
      function Close(value){
        if (this.State === 'executing') {
          return ThrowException('generator_executing', 'close');
        } else if (this.State === 'closed') {
          return;
        }

        if (state === 'newborn') {
          this.State = 'closed';
          this.Code = null;
          return;
        }

        this.State = 'executing';
        var result = Resume(this.ExecutionContext, 'return', value);
        this.State = 'closed';
        return result;
      }
    ]);


    function Resume(ctx, completionType, value){
      ExecutionContext.push(ctx);
      if (completionType !== 'normal') {
        value = new AbruptCompletion(completionType, value);
      }
      return ctx.currentGenerator.thunk.send(ctx, value);
    }

    return $Generator;
  })();





  // #############
  // ### $Date ###
  // #############

  var $Date = (function(){
    function $Date(value){
      $Object.call(this, intrinsics.DateProto);
      this.PrimitiveValue = value;
    }

    inherit($Date, $Object, {
      NativeBrand: BRANDS.NativeDate,
    });

    return $Date;
  })();



  // ###############
  // ### $String ###
  // ###############

  var $String = (function(){
    function $String(value){
      $Object.call(this, intrinsics.StringProto);
      this.PrimitiveValue = value;
      this.properties.set('length', value.length, ___);
    }

    inherit($String, $Object, {
      NativeBrand: BRANDS.StringWrapper,
      PrimitiveValue: undefined
    }, [
      function GetOwnProperty(key){
        var desc = $Object.prototype.GetOwnProperty.call(this, key);
        if (desc) {
          return desc;
        }
        if (key < this.PrimitiveValue.length && key >= 0) {
          return new StringIndice(this.PrimitiveValue[key]);
        }
      },
      function Get(key){
        if (key < this.PrimitiveValue.length && key >= 0) {
          return this.PrimitiveValue[key];
        }
        return this.GetP(this, key);
      },
      function HasOwnProperty(key){
        key = ToPropertyName(key);
        if (key && key.Completion) {
          if (key.Abrupt) return key; else key = key.value;
        }
        if (typeof key === 'string') {
          if (key < this.properties.get('length') && key >= 0) {
            return true;
          }
        }
        return $Object.prototype.HasOwnProperty.call(this, key);
      },
      function HasProperty(key){
        var ret = this.HasOwnProperty(key);
        if (ret && ret.Completion) {
          if (ret.Abrupt) return ret; else ret = ret.value;
        }
        if (ret === true) {
          return true;
        } else {
          return $Object.prototype.HasProperty.call(this, key);
        }
      },
      function Enumerate(includePrototype, onlyEnumerable){
        var props = $Object.prototype.Enumerate.call(this, includePrototype, onlyEnumerable);
        return unique(numbers(this.PrimitiveValue.length).concat(props));
      }
    ]);

    return $String;
  })();


  // ###############
  // ### $Number ###
  // ###############

  var $Number = (function(){
    function $Number(value){
      $Object.call(this, intrinsics.NumberProto);
      this.PrimitiveValue = value;
    }

    inherit($Number, $Object, {
      NativeBrand: BRANDS.NumberWrapper,
      PrimitiveValue: undefined,
    });

    return $Number;
  })();


  // ################
  // ### $Boolean ###
  // ################

  var $Boolean = (function(){
    function $Boolean(value){
      $Object.call(this, intrinsics.BooleanProto);
      this.PrimitiveValue = value;
    }

    inherit($Boolean, $Object, {
      NativeBrand: BRANDS.BooleanWrapper,
      PrimitiveValue: undefined,
    });

    return $Boolean;
  })();



  // ############
  // ### $Map ###
  // ############

  var $Map = (function(){
    function $Map(){
      $Object.call(this, intrinsics.MapProto);
    }

    inherit($Map, $Object, {
      NativeBrand: BRANDS.NativeMap
    });

    return $Map;
  })();


  // ############
  // ### $Set ###
  // ############

  var $Set = (function(){
    function $Set(){
      $Object.call(this, intrinsics.SetProto);
    }

    inherit($Set, $Object, {
      NativeBrand: BRANDS.NativeSet
    });

    return $Set;
  })();



  // ################
  // ### $WeakMap ###
  // ################

  var $WeakMap = (function(){
    function $WeakMap(){
      $Object.call(this, intrinsics.WeakMapProto);
    }

    inherit($WeakMap, $Object, {
      NativeBrand: BRANDS.NativeWeakMap,
    });

    return $WeakMap;
  })();



  // ##############
  // ### $Array ###
  // ##############

  var $Array = (function(){
    function $Array(items){
      $Object.call(this, intrinsics.ArrayProto);
      if (items instanceof Array) {
        var len = items.length;
        for (var i=0; i < len; i++)
          setDirect(this, i, items[i]);
      } else {
        var len = 0;
      }
      this.properties.set('length', len, _CW);
    }

    inherit($Array, $Object, {
      NativeBrand: BRANDS.NativeArray
    }, [
      function DefineOwnProperty(key, desc, strict){
        function Reject(str) {
          if (strict) {
            throw new TypeError(str);
          }
          return false;
        }

        var oldLenDesc = this.GetOwnProperty('length'),
            oldLen = oldLenDesc.Value;

        if (key === 'length') {
          if (!(VALUE in desc)) {
            return DefineOwn.call(this, 'length', desc, strict);
          }

          var newLenDesc = copy(desc),
              newLen = ToUint32(desc.Value);

          if (newLen.Completion) {
            if (newLen.Abrupt) return newLen; else newLen = newLen.value;
          }

          var value = ToNumber(desc.Value);
          if (value.Completion) {
            if (value.Abrupt) return value; else value = value.value;
          }

          if (newLen !== value) {
            return ThrowException('invalid_array_length');
          }

          newLen = newLenDesc.Value;
          if (newLen >= oldLen) {
            return DefineOwn.call(this, 'length', newLenDesc, strict);
          }

          if (oldLenDesc.Writable === false) {
            return Reject();
          }

          if (!(WRITABLE in newLenDesc) || newLenDesc.Writable) {
            var newWritable = true;
          } else {
            newWritable = false;
            newLenDesc.Writable = true;
          }

          var success = DefineOwn.call(this, 'length', newLenDesc, strict);
          if (success.Completion) {
            if (success.Abrupt) return success; else success = success.value;
          }
          if (success === false) {
            return false;
          }

          while (newLen < oldLen) {
            oldLen = oldLen - 1;
            var deleted = this.Delete('' + oldLen, false);
            if (deleted.Completion) {
              if (deleted.Abrupt) return deleted; else deleted = deleted.value;
            }

            if (!deleted) {
              newLenDesc.Value = oldLen + 1;
              if (!newWritable) {
                newLenDesc.Writable = false;
              }
              DefineOwn.call(this, 'length', newLenDesc, false);
              Reject();
            }
          }
          if (!newWritable) {
            DefineOwn.call(this, 'length', {
              Writable: false
            }, false);
          }

          return true;
        }  else if (IsArrayIndex(key)) {
          var index = ToUint32(key);

          if (index.Completion) {
            if (index.Abrupt) return index; else index = index.value;
          }

          if (index >= oldLen && oldLenDesc.Writable === false) {
            return Reject();
          }

          success = DefineOwn.call(this, key, desc, false);
          if (success.Completion) {
            if (success.Abrupt) return success; else success = success.value;
          }

          if (success === false) {
            return Reject();
          }

          if (index >= oldLen) {
            oldLenDesc.Value = index + 1;
            DefineOwn.call(this, 'length', oldLenDesc, false);
          }
          return true;
        }

        return DefineOwn.call(this, key, desc, key);
      }
    ]);

    return $Array;
  })();


  // ###############
  // ### $RegExp ###
  // ###############

  var $RegExp = (function(){
    function $RegExp(primitive){
      if (!this.properties) {
        $Object.call(this, intrinsics.RegExpProto);
      }
      this.PrimitiveValue = primitive;
      this.properties.initialize([
        'global', primitive.global, ___,
        'ignoreCase', primitive.ignoreCase, ___,
        'lastIndex', primitive.lastIndex, __W,
        'multiline', primitive.multiline, ___,
        'source', primitive.source, ___
      ]);
    }

    inherit($RegExp, $Object, {
      NativeBrand: BRANDS.NativeRegExp,
      Match: null,
    });

    return $RegExp;
  })();


  // ###############
  // ### $Symbol ###
  // ###############

  var $Symbol = (function(){
    var seed = Math.random() * 4294967296 | 0;

    function $Symbol(name, isPublic){
      $Object.call(this, intrinsics.SymbolProto);
      this.Symbol = seed++;
      this.Name = name;
      this.Private = !isPublic;
    }

    inherit($Symbol, $Object, {
      NativeBrand: BRANDS.NativeSymbol,
      Extensible: false
    }, [
      function toString(){
        return this.Symbol;
      }
    ]);

    return $Symbol;
  })();


  // ##################
  // ### $Arguments ###
  // ##################

  var $Arguments = (function(){
    function $Arguments(length){
      $Object.call(this);
      this.properties.set('length', length, _CW);
    }

    inherit($Arguments, $Object, {
      NativeBrand: BRANDS.NativeArguments,
      ParameterMap: null,
    });

    return $Arguments;
  })();


  var $StrictArguments = (function(){
    function $StrictArguments(args){
      $Arguments.call(this, args.length);
      for (var i=0; i < args.length; i++) {
        this.properties.set(i+'', args[i], ECW);
      }

      this.properties.set('arguments', intrinsics.ThrowTypeError, __A);
      this.properties.set('caller', intrinsics.ThrowTypeError, __A);
    }

    inherit($StrictArguments, $Arguments);

    return $StrictArguments;
  })();



  var $MappedArguments = (function(){
    function $MappedArguments(names, env, args, func){
      var mapped = create(null);
      $Arguments.call(this, args.length);

      this.ParameterMap = new $Object;
      this.isMapped = false;

      for (var i=0; i < args.length; i++) {
        this.properties.set(i+'', args[i], ECW);
        var name = names[i];
        if (i < names.length && !(name in mapped)) {
          this.isMapped = true;
          mapped[name] = true;
          this.ParameterMap.properties.set(name, new ArgAccessor(name, env), _CA);
        }
      }

      this.properties.set('callee', func, _CW);
    }

    inherit($MappedArguments, $Arguments, {
      ParameterMap: null,
    }, [
      function Get(key){
        if (this.isMapped && this.ParameterMap.properties.has(key)) {
          return this.ParameterMap.Get(key);
        } else {
          var val = this.GetP(this, key);
          if (key === 'caller' && IsCallable(val) && val.Strict) {
            return ThrowException('strict_poison_pill');
          }
          return val;
        }
      },
      function GetOwnProperty(key){
        var desc = $Object.prototype.GetOwnProperty.call(this, key);
        if (desc === undefined) {
          return desc;
        }
        if (this.isMapped && this.ParameterMap.properties.has(key)) {
          desc.Value = this.ParameterMap.Get(key);
        }
        return desc;
      },
      function DefineOwnProperty(key, desc, strict){
        if (!DefineOwn.call(this, key, desc, false) && strict) {
          return ThrowException('strict_lhs_assignment');
        }

        if (this.isMapped && this.ParameterMap.properties.has(key)) {
          if (IsAccessorDescriptor(desc)) {
            this.ParameterMap.Delete(key, false);
          } else {
            if ('Value' in desc) {
              this.ParameterMap.Put(key, desc.Value, strict);
            }
            if ('Writable' in desc) {
              this.ParameterMap.Delete(key, false);
            }
          }
        }

        return true;
      },
      function Delete(key, strict){
        var result = $Object.prototype.Delete.call(this, key, strict);
        if (result.Abrupt) {
          return result;
        }

        if (result && this.isMapped && this.ParameterMap.properties.has(key)) {
          this.ParameterMap.Delete(key, false);
        }

        return result;
      }
    ]);

    return $MappedArguments;
  })();

  var $Module = (function(){
    function ModuleGetter(ref){
      var getter = this.Get = {
        Call: function(){
          var value = GetValue(ref);
          ref = null;
          getter.Call = function(){ return value };
          return value;
        }
      };
    }

    inherit(ModuleGetter, Accessor);


    function $Module(object, names){
      if (object instanceof $Module) {
        return object;
      }

      $Object.call(this, null);
      this.properties.remove('__proto__');
      var self = this;

      each(names, function(name){
        self.properties.set(name, new ModuleGetter(new Reference(object, name)), E_A);
      });
    }

    inherit($Module, $Object, {
      NativeBrand: BRANDS.NativeModule,
      Extensible: false
    });

    return $Module;
  })();


  var $Error = (function(){
    function $Error(name, type, message){
      $Object.call(this, intrinsics[name+'Proto']);
      this.properties.set('message', message, ECW);
      if (type !== undefined) {
        this.properties.set('type', type, _CW);
      }
    }

    inherit($Error, $Object, {
      NativeBrand: BRANDS.NativeError
    }, [
      function setOrigin(filename, kind){
        if (filename) {
          setDirect(this, 'filename', filename);
        }
        if (kind) {
          setDirect(this, 'kind', kind);
        }
      },
      function setCode(loc, code){
        var line = code.split('\n')[loc.start.line - 1];
        var pad = new Array(loc.start.column).join('-') + '^';
        setDirect(this, 'line', loc.start.line);
        setDirect(this, 'column', loc.start.column);
        setDirect(this, 'code', line + '\n' + pad);
      }
    ]);

    return $Error;
  })();


  var $Proxy = (function(){
    function IsCompatibleDescriptor(){
      return true;
    }

    function GetTrap(handler, trap){
      var result = handler.Get(trap);
      if (result !== undefined && !IsCallable(result)) {
        return ThrowException('non_callable_proxy_trap');
      }
      return result;
    }

    function TrapDefineOwnProperty(proxy, key, descObj, strict){
      var handler = proxy.Handler,
          target = proxy.Target,
          trap = GetTrap(handler, 'defineProperty'),
          normalizedDesc = ToPropertyDescriptor(descObj);

      if (trap === undefined) {
        return target.DefineOwnProperty(key, normalizedDesc, strict);
      } else {
        var normalizedDescObj = FromGenericPropertyDescriptor(normalizedDesc);
        CopyAttributes(descObj, normalizedDescObj);

        var trapResult = trap.Call(handler, [target, key, normalizedDescObj]),
            success = ToBoolean(trapResult),
            targetDesc = target.GetOwnProperty(key),
            extensible = target.GetExtensible();

        if (!extensible && targetDesc === undefined) {
          return ThrowException('proxy_configurability_non_extensible_inconsistent');
        } else if (targetDesc !== undefined && !IsCompatibleDescriptor(extensible, targetDesc, ToPropertyDescriptor(normalizedDesc))) {
          return ThrowException('proxy_incompatible_descriptor');
        } else if (!normalizedDesc.Configurable) {
          if (targetDesc === undefined || targetDesc.Configurable) {
            return ThrowException('proxy_configurability_inconsistent')
          }
        } else if (strict) {
          return ThrowException('strict_property_redefinition');
        }
        return false;
      }
    }

    function TrapGetOwnProperty(proxy, key){
      var handler = proxy.Handler,
          target = proxy.Target,
          trap = GetTrap(handler, 'getOwnPropertyDescriptor');

      if (trap === undefined) {
        return target.GetOwnProperty(key);
      } else {
        var trapResult = trap.Call(handler, [target, key]),
            desc = NormalizeAndCompletePropertyDescriptor(trapResult),
            targetDesc = target.GetOwnProperty(key);

        if (desc === undefined) {
          if (targetDesc !== undefined) {
            if (!targetDesc.Configurable) {
              return ThrowException('proxy_configurability_inconsistent');
            } else if (!target.GetExtensible()) {
              return ThrowException('proxy_configurability_non_extensible_inconsistent');
            }
            return undefined;
          }
        }
        var extensible = target.GetExtensible();
        if (!extensible && targetDesc === undefined) {
          return ThrowException('proxy_configurability_non_extensible_inconsistent');
        } else if (targetDesc !== undefined && !IsCompatibleDescriptor(extensible, targetDesc, ToPropertyDescriptor(desc))) {
          return ThrowException('proxy_incompatible_descriptor');
        } else if (!ToBoolean(desc.Get('configurable'))) {
          if (targetDesc === undefined || targetDesc.Configurable) {
            return ThrowException('proxy_configurability_inconsistent')
          }
        }
        return desc;
      }
    }



    function $Proxy(target, handler){
      this.Handler = handler;
      this.Target = target;
      this.NativeBrand = target.NativeBrand;
      if ('Call' in target) {
        this.HasInstance = $Function.prototype.HasInstance;
        this.Call = ProxyCall;
        this.Construct = ProxyConstruct;
      }
      if ('PrimitiveValue' in target) {
        this.PrimitiveValue = target.PrimitiveValue;
      }
    }

    inherit($Proxy, $Object, {
      Proxy: true
    }, [
      function GetPrototype(){
        var trap = GetTrap(this.Handler, 'getPrototypeOf');
        if (trap === undefined) {
          return this.Target.GetPrototype();
        } else {
          var result = trap.Call(this.Handler, [this.Target]),
              targetProto = this.Target.GetPrototype();

          if (result !== targetProto) {
            return ThrowException('proxy_prototype_inconsistent');
          } else {
            return targetProto;
          }
        }
      },
      function GetExtensible(){
        var trap = GetTrap(this.Handler, 'isExtensible');
        if (trap === undefined) {
          return this.Target.GetExtensible();
        }
        var proxyIsExtensible = ToBoolean(trap.Call(this.Handler, [this.Target])),
            targetIsExtensible  = this.Target.GetExtensible();

        if (proxyIsExtensible !== targetIsExtensible) {
          return ThrowException('proxy_extensibility_inconsistent');
        }
        return targetIsExtensible;
      },
      function GetP(receiver, key){
        var trap = GetTrap(this.Handler, 'get');
        if (trap === undefined) {
          return this.Target.GetP(receiver, key);
        }

        var trapResult = trap.Call(this.Handler, [this.Target, key, receiver]),
            desc = this.Target.GetOwnProperty(key);

        if (desc !== undefined) {
          if (IsDataDescriptor(desc) && desc.Configurable === false && desc.Writable === false) {
            if (!IS(trapResult, desc.Value)) {
              return ThrowException('proxy_get_inconsistent');
            }
          } else if (IsAccessorDescriptor(desc) && desc.Configurable === false && desc.Get === undefined) {
            if (trapResult !== undefined) {
              return ThrowException('proxy_get_inconsistent');
            }
          }
        }

        return trapResult;
      },
      function SetP(receiver, key, value){
        var trap = GetTrap(this.Handler, 'set');
        if (trap === undefined) {
          return this.Target.SetP(receiver, key, value);
        }

        var trapResult = trap.Call(this.Handler, [this.Target, key, value, receiver]),
            success = ToBoolean(trapResult);

        if (success) {
          var desc = this.Target.GetOwnProperty(key);
          if (desc !== undefined) {
            if (IsDataDescriptor(desc) && desc.Configurable === false && desc.Writable === false) {
              if (!IS(value, desc.Value)) {
                return ThrowException('proxy_set_inconsistent');
              }
            }
          } else if (IsAccessorDescriptor(desc) && desc.Configurable === false) {
            if (desc.Set !== undefined) {
              return ThrowException('proxy_set_inconsistent');
            }
          }
        }

        return success;
      },
      function GetOwnProperty(key){
        var desc = TrapGetOwnProperty(this, key);
        if (desc !== undefined) {
          return desc;
        }
      },
      function DefineOwnProperty(key, desc, strict){
        var descObj = FromGenericPropertyDescriptor(desc);
        return TrapDefineOwnProperty(this, key, descObj, strict);
      },
      function HasOwnProperty(key){
        var trap = GetTrap(this.Handler, 'hasOwn');
        if (trap === undefined) {
          return this.Target.HasOwnProperty(key);
        }

        var trapResult = trap.Call(this.Handler, [this.Target, key]),
            success = ToBoolean(trapResult);

        if (success === false) {
          var targetDesc = this.Target.GetOwnProperty(key);
          if (desc !== undefined && targetDesc.Configurable === false) {
            return ThrowException('proxy_hasown_inconsistent');
          } else if (!this.Target.GetExtensible() && targetDesc !== undefined) {
            return ThrowException('proxy_hasown_inconsistent');
          }
        }
        return success;
      },
      function HasProperty(key){
        var trap = GetTrap(this.Handler, 'has');
        if (trap === undefined) {
          return this.Target.HasProperty(key);
        }

        var trapResult = trap.Call(this.Handler, [this.Target, key]),
            success = ToBoolean(trapResult);

        if (success === false) {
          var targetDesc = this.Target.GetOwnProperty(key);
          if (desc !== undefined && targetDesc.Configurable === false) {
            return ThrowException('proxy_has_inconsistent');
          } else if (!this.Target.GetExtensible() && targetDesc !== undefined) {
            return ThrowException('proxy_has_inconsistent');
          }
        }
        return success;
      },
      function Delete(key, strict){
        var trap = GetTrap(this.Handler, 'deleteProperty');
        if (trap === undefined) {
          return this.Target.Delete(key, strict);
        }
        var trapResult = trap.Call(this.Handler, [this.Target, key]),
            success = ToBoolean(trapResult);

        if (success === true) {
          var targetDesc = this.Target.GetOwnProperty(key);
          if (desc !== undefined && targetDesc.Configurable === false) {
            return ThrowException('proxy_delete_inconsistent');
          } else if (!this.Target.GetExtensible() && targetDesc !== undefined) {
            return ThrowException('proxy_delete_inconsistent');
          }
          return true;
        } else if (strict) {
          return ThrowException('strict_delete_failure');
        } else {
          return false;
        }
      },
      function Enumerate(includePrototype, onlyEnumerable){
        if (onlyEnumerable) {
          var trap = includePrototype ? 'enumerate' : 'keys';
        } else {
          var trap = 'getOwnPropertyNames',
              recurse = includePrototype;
        }
        var trap = GetTrap(this.Handler, trap);
        if (trap === undefined) {
          return this.Target.Enumerate(includePrototype, onlyEnumerable);
        }

        var trapResult = trap.Call(this.Handler, [this.Target, key]);

        if (Type(trapResult) !== 'Object') {
          return ThrowException(trap+'_trap_non_object');
        }

        var len = ToUint32(trapResult.Get('length')),
            array = [],
            seen = create(null);

        for (var i = 0; i < len; i++) {
          var element = ToString(trapResult.Get(''+i));
          if (element in seen) {
            return ThrowException('trap_returned_duplicate', trap);
          }
          seen[element] = true;
          if (!includePrototype && !this.Target.GetExtensible() && !this.Target.HasOwnProperty(element)) {
            return ThrowException('proxy_'+trap+'_inconsistent');
          }
          array[i] = element;
        }

        var props = this.Target.Enumerate(includePrototype, onlyEnumerable),
            len = props.length;

        for (var i=0; i < len; i++) {
          if (!(props[i] in seen)) {
            var targetDesc = this.Target.GetOwnProperty(props[i]);
            if (targetDesc && !targetDesc.Configurable) {
              return ThrowException('proxy_'+trap+'_inconsistent');
            }
            if (targetDesc && !this.Target.GetExtensible()) {
              return ThrowException('proxy_'+trap+'_inconsistent');
            }
          }
        }

        return array;
      }
    ]);

    function ProxyCall(thisValue, args){
      var trap = GetTrap(this.Handler, 'apply');
      if (trap === undefined) {
        return this.Target.Call(thisValue, args);
      }

      return trap.Call(this.Handler, [this.Target, thisValue, fromInternalArray(args)]);
    }

    function ProxyConstruct(args){
      var trap = GetTrap(this.Handler, 'construct');
      if (trap === undefined) {
        return this.Target.Construct(args);
      }

      return trap.Call(this.Handler, [this.Target, fromInternalArray(args)]);
    }

    return $Proxy;
  })();




  var $PrimitiveBase = (function(){
    function $PrimitiveBase(value){
      this.PrimitiveValue = value;
      switch (typeof value) {
        case STRING:
          $Object.call(this, intrinsics.StringProto);
          this.NativeBrand = BRANDS.StringWrapper;
          break;
        case NUMBER:
          $Object.call(this, intrinsics.NumberProto);
          this.NativeBrand = BRANDS.NumberWrapper;
          break;
        case BOOLEAN:
          $Object.call(this, intrinsics.BooleanProto);
          this.NativeBrand = BRANDS.BooleanWrapper;
          break;
      }
    }

    operators.$PrimitiveBase = $PrimitiveBase;

    inherit($PrimitiveBase, $Object, [
      function SetP(receiver, key, value, strict){
        var desc = this.GetProperty(key);
        if (desc) {
          if (IsDataDescriptor(desc)) {
            return desc.Value;
          } else if (desc.Get) {
            if (!receiver) {
              receiver = this.PrimitiveValue;
            }

            return desc.Get.Call(receiver, []);
          }
        }
      },
      function GetP(receiver, key) {
        var desc = this.GetProperty(key);
        if (desc) {
          if (IsDataDescriptor(desc)) {
            return desc.Value;
          } else if (desc.Get) {
            if (!receiver) {
              receiver = this.PrimitiveValue;
            }

            return desc.Get.Call(receiver, []);
          }
        }
      }
    ]);

    return $PrimitiveBase;
  })();



  var ExecutionContext = (function(){
    function ExecutionContext(caller, local, realm, code, func, isConstruct){
      this.caller = caller;
      this.Realm = realm;
      this.Code = code;
      this.LexicalEnvironment = local;
      this.VariableEnvironment = local;
      this.Strict = code.Strict;
      this.isConstruct = !!isConstruct;
      this.callee = func && !func.Native ? func : caller ? caller.callee : null;
    }

    define(ExecutionContext, [
      function push(newContext){
        context = newContext;
        context.Realm.active || activate(context.Realm);
      },
      function pop(){
        if (context) {
          var oldContext = context;
          context = context.caller;
          return oldContext;
        }
      },
      function reset(){
        var stack = [];
        while (context) {
          stack.push(ExecutionContext.pop());
        }
        return stack;
      }
    ]);

    define(ExecutionContext.prototype, {
      isGlobal: false,
      strict: false,
      isEval: false,
    });

    define(ExecutionContext.prototype, [
      function pop(){
        if (this === context) {
          context = this.caller;
          return this;
        }
      },
      function initializeBinding(name, value){
        return this.LexicalEnvironment.InitializeBinding(name, value);
      },
      function initializeBindings(pattern, value){
        return BindingInitialization(pattern, value, this.LexicalEnvironment);
      },
      function popBlock(){
        var block = this.LexicalEnvironment;
        this.LexicalEnvironment = this.LexicalEnvironment.outer;
        return block;
      },
      function pushBlock(decls){
        this.LexicalEnvironment = new DeclarativeEnvironmentRecord(this.LexicalEnvironment);
        return BlockDeclarationInstantiation(decls, this.LexicalEnvironment);
      },
      function pushClass(def, superclass){
        return ClassDefinitionEvaluation(def.name, superclass, def.ctor, def.methods);
      },
      function pushWith(obj){
        this.LexicalEnvironment = new ObjectEnvironmentRecord(obj, this.LexicalEnvironment);
        this.LexicalEnvironment.withEnvironment = true;
        return obj;
      },
      function defineMethod(kind, obj, key, code){
        return PropertyDefinitionEvaluation(kind, obj, key, code);
      },
      function createFunction(name, code){
        var $F = code.generator ? $GeneratorFunction : $Function;
            env = this.LexicalEnvironment;

        if (name) {
          env = new DeclarativeEnvironmentRecord(env);
          env.CreateImmutableBinding(name);
        }

        var func = new $F(code.Type, name, code.params, code, env, code.Strict);

        if (code.Type !== ARROW) {
          MakeConstructor(func);
          name && env.InitializeBinding(name, func);
        }

        return func;
      },
      function createArray(len){
        return new $Array(len);
      },
      function createObject(proto){
        return new $Object(proto);
      },
      function createRegExp(regex){
        return new $RegExp(regex);
      },
      function constructFunction(func, args){
        return EvaluateConstruct(func, args);
      },
      function callFunction(thisRef, func, args){
        return EvaluateCall(thisRef, func, args);
      },
      function getPropertyReference(name, obj){
        return Element(this, name, obj);
      },
      function getReference(name){
        return IdentifierResolution(this, name);
      },
      function getSuperReference(name){
        return SuperReference(this, name);
      },
      function getThisEnvironment(){
        return GetThisEnvironment(this);
      },
      function getThis(){
        return ThisResolution(this);
      },
      function spreadArguments(precedingArgs, obj){
        return SpreadArguments(precedingArgs, obj);
      },
      function spreadArray(array, offset, obj){
        return SpreadInitialization(array, offset, obj);
      },
      function destructureSpread(target, index){
        return SpreadDestructuring(this, target, index);
      },
      function getTemplateCallSite(template){
        return GetTemplateCallSite(this, template);
      },
      function getSymbol(name){
        return GetSymbol(this, name) || ThrowException('undefined_symbol', name);
      },
      function getSymbolReference(name){
        var symbol = GetSymbol(this, name);
        if (symbol) {
          return symbol//IdentifierResolution(this, symbol);
        } else {
          return ThrowException('undefined_symbol', name);
        }
      },
      function createSymbol(name, isPublic){
        return new $Symbol(name, isPublic);
      },
      function initializeSymbolBinding(name, symbol){
        return this.LexicalEnvironment.InitializeSymbolBinding(name, symbol);
      }
    ]);

    return ExecutionContext;
  })();


  var Intrinsics = (function(){
    var $errors = ['EvalError', 'RangeError', 'ReferenceError',
                   'SyntaxError', 'TypeError', 'URIError'];

    var $builtins = {
      Array   : $Array,
      Boolean : $Boolean,
      Date    : $Date,
      Error   : $Error,
      Function: $Function,
      Map     : $Map,
      Number  : $Number,
      //Proxy   : $Proxy,
      RegExp  : $RegExp,
      Set     : $Set,
      String  : $String,
      Symbol  : $Symbol,
      WeakMap : $WeakMap
    };

    exports.builtins = {
      $Array   : $Array,
      $Boolean : $Boolean,
      $Date    : $Date,
      $Error   : $Error,
      $Function: $Function,
      $Map     : $Map,
      $Number  : $Number,
      $Object  : $Object,
      $RegExp  : $RegExp,
      $Set     : $Set,
      $Symbol  : $Symbol,
      $String  : $String,
      $WeakMap : $WeakMap
    };

    var primitives = {
      Date   : Date.prototype,
      RegExp : RegExp.prototype,
      String : '',
      Number : 0,
      Boolean: false
    };

    function Intrinsics(realm){
      DeclarativeEnvironmentRecord.call(this, null);
      this.Realm = realm;
      var bindings = this.bindings;
      bindings.ObjectProto = new $Object(null);

      for (var k in $builtins) {
        var prototype = bindings[k + 'Proto'] = create($builtins[k].prototype);
        $Object.call(prototype, bindings.ObjectProto);
        if (k in primitives)
          prototype.PrimitiveValue = primitives[k];
      }

      bindings.StopIteration = new $Object(bindings.ObjectProto);
      bindings.StopIteration.NativeBrand = StopIteration;

      for (var i=0; i < 6; i++) {
        var prototype = bindings[$errors[i] + 'Proto'] = create($Error.prototype);
        $Object.call(prototype, bindings.ErrorProto);
        prototype.properties.initialize([
          'name', $errors[i], _CW,
          'type', undefined, _CW,
          'arguments', undefined, _CW
        ]);
      }

      bindings.FunctionProto.FormalParameters = [];
      bindings.ArrayProto.properties.set('length', 0, __W);
      bindings.ErrorProto.properties.initialize([
        'name', 'Error', _CW,
        'message', '', _CW
      ]);
    }

    inherit(Intrinsics, DeclarativeEnvironmentRecord, [
      function binding(options){
        if (typeof options === 'function') {
          options = {
            call: options,
            name: options.name,
            length: options.length,
          }
        }

        if (!options.name) {
          if (!options.call.name) {
            options.name = arguments[1];
          } else {
            options.name = options.call.name;
          }
        }

        if (typeof options.length !== 'number') {
          options.length = options.call.length;
        }

        if (realm !== this.Realm) {
          var activeRealm = realm;
          activate(this.Realm);
        }

        this.bindings[options.name] = new $NativeFunction(options);

        if (activeRealm) {
          activate(activeRealm);
        }
      }
    ]);

    return Intrinsics;
  })();

  function wrapForInside(o){
    if (o === null) return o;

    var type = typeof o;
    if (type === FUNCTION) {
      return new $NativeFunction({
        length: o._length || o.length,
        name: o._name || o.name,
        call: o
      });
    }

    if (type === OBJECT) {
      switch (o.NativeBrand) {
        case BRANDS.NativeFunction:
          var func = function(){
            return o.Call(this, arguments);
          };
          func._wraps = o;
          return func;
        case BRANDS.NativeObject:

      }
    }
    return o;
  }


  function wrapFunction(f){
    if (f._wrapper) {
      return f._wrapper;
    }
    return f._wrapper = function(){
      var receiver = this;
      if (isObject(receiver) && !(receiver instanceof $Object)) {
        receiver = undefined
      }
      return f.Call(receiver, arguments);
    };
  }

  function fromInternalArray(array){
    var $array = new $Array,
        len = array.length;

    for (var i=0; i < len; i++) {
      $array.properties.set(i, array[i], ECW);
    }
    $array.properties.set('length', array.length, __W);
    return $array;
  }

  function toInternalArray($array){
    var array = [],
        len = $array.properties.get('length');

    for (var i=0; i < len; i++) {
      array[i] = $array.properties.get(i);
    }
    return array;
  }

  var Script = (function(){
    var parseOptions = {
      loc    : true,
      range  : true,
      raw    : false,
      tokens : false,
      comment: false
    }

    function parse(src, origin, type, options){
      try {
        return esprima.parse(src, options || parseOptions);
      } catch (e) {
        var err = new $Error('SyntaxError', undefined, e.message);
        err.setCode({ start: { line: e.lineNumber, column: e.column } }, src);
        err.setOrigin(origin, type);
        return new AbruptCompletion('throw', err);
      }
    }


    function Script(options){
      if (options instanceof Script)
        return options;

      this.type = 'script';

      if (typeof options === FUNCTION) {
        this.type = 'recompiled function';
        if (!utility.fname(options)) {
          options = {
            scope: SCOPE.FUNCTION,
            filename: 'unnamed',
            source: '('+options+')()'
          }
        } else {
          options = {
            scope: SCOPE.FUNCTION,
            filename: utility.fname(options),
            source: options+''
          };
        }
      } else if (typeof options === STRING) {
        options = {
          scope: SCOPE.GLOBAL,
          source: options
        };
      }

      if (options.natives) {
        this.natives = true;
        this.type = 'native';
      }
      if (options.eval || options.scope === SCOPE.EVAL) {
        this.eval = true;
        this.type = 'eval';
      }
      this.scope = options.scope;

      if (!isObject(options.ast) && typeof options.source === STRING) {
        this.source = options.source;
        this.ast = parse(options.source, options.filename, this.type);
        if (this.ast.Abrupt) {
          this.error = this.ast;
          this.ast = null;
        }
      }

      this.filename = options.filename || '';
      if (this.ast) {
        this.bytecode = assemble(this);
        this.thunk = new Thunk(this.bytecode);
      }
      return this;
    }

    return Script;
  })();


  function ScriptFile(source){
    Script.call(this, ScriptFile.load(source));
  }

  ScriptFile.load = (function(){
    if (typeof process !== 'undefined') {
      return function load(source){
        if (!~source.indexOf('\n') && require('fs').existsSync(source)) {
          return {
            source: require('fs').readFileSync(source, 'utf8'),
            filename: source
          };
        } else {
          return {
            source: source,
            filename: ''
          };
        }
      };
    }
    return function load(source){
      // TODO ajax
      return {
        source: source,
        filename: ''
      };
    };
  })();

  utility.inherit(ScriptFile, Script);



  function activate(target){
    if (realm !== target) {
      if (realm) {
        realm.active = false;
        realm.emit('deactivate');
      }
      realmStack.push(realm);
      realm = target;
      global = operators.global = target.global;
      intrinsics = target.intrinsics;
      target.active = true;
      target.emit('activate');
    }
  }

  function deactivate(target){
    if (realm === target && realmStack.length) {
      target.active = false;
      realm = realmStack.pop();
      target.emit('dectivate');
    }
  }


  var Realm = (function(){

    function CreateThrowTypeError(realm){
      var thrower = create($NativeFunction.prototype);
      $Object.call(thrower, realm.intrinsics.FunctionProto);
      thrower.call = function(){ return ThrowException('strict_poison_pill') };
      thrower.properties.set('length', 0, ___);
      thrower.properties.set('name', 'ThrowTypeError', ___);
      thrower.Realm = realm;
      thrower.Extensible = false;
      thrower.Strict = true;
      hide(thrower, 'Realm');
      return new Accessor(thrower);
    }


    var natives = (function(){
      function wrapNatives(source, target){
        each(utility.ownProperties(source), function(key){
          if (typeof source[key] === 'function'
                          && key !== 'constructor'
                          && key !== 'toString'
                          && key !== 'valueOf') {
            var func = new $NativeFunction({
              name: key,
              length: source[key].length,
              call: function(a, b, c, d){
                var v = this;
                if (v == null) {
                  try { v = source.constructor(v) }
                  catch (e) { v = new source.constructor }
                }
                if (v instanceof source.constructor || typeof v !== 'object') {
                  var result =  v[key](a, b, c, d);
                } else if (v.PrimitiveValue) {
                  var result = v.PrimitiveValue[key](a, b, c, d);
                }
                if (!isObject(result)) {
                  return result;
                }
                if (result instanceof Array) {
                  return fromInternalArray(result);
                }
              }
            });
            target.properties.set(key, func, 6);
          }
        });
      }

      function wrapMapFunction(name){
        return function(map, key, val){
          return map.MapData[name](key, val);
        };
      }

      function wrapWeakMapFunction(name){
        return function(map, key, val){
          return map.WeakMapData[name](key, val);
        };
      }

      var timers = {};

      var nativeCode = ['function ', '() { [native code] }'];

      return {
        defineDirect: function(o, key, value, attrs){
          o.properties.set(key, value, attrs);
        },
        deleteDirect: function(o, key){
          o.properties.remove(key);
        },
        hasOwnDirect: function(o, key){
          return o.properties.has(key);
        },
        hasDirect: hasDirect,
        setDirect: setDirect,
        updateAttrDirect: function(obj, key, attr){
          var prop = obj.properties.getProperty(key);
          if (prop) {
            prop[2] &= attr;
            return true;
          }
          return false;
        },
        CheckObjectCoercible: CheckObjectCoercible,
        ToObject: ToObject,
        ToString: ToString,
        ToNumber: ToNumber,
        ToBoolean: ToBoolean,
        ToPropertyName: ToPropertyName,
        ToInteger: ToInteger,
        ToInt32: ToInt32,
        ToUint32: ToUint32,
        ToUint16: ToUint16,
        ToModule: function(obj){
          if (obj.NativeBrand === BRANDS.NativeModule) {
            return obj;
          }
          return new $Module(obj, obj.Enumerate(false, false));
        },
        IsConstructCall: function(){
          return context.isConstruct;
        },
        GetNativeBrand: function(object){
          return object.NativeBrand.name;
        },
        SetNativeBrand: function(object, name){
          var brand = BRANDS[name];
          if (brand) {
            object.NativeBrand = brand;
          } else {
            var err = new $Error('ReferenceError', undefined, 'Unknown NativeBrand "'+name+'"');
            return new AbruptException('throw', err);
          }
          return object.NativeBrand.name;
        },
        GetBrand: function(object){
          return object.Brand || object.NativeBrand.name;
        },
        GetPrimitiveValue: function(object){
          return object ? object.PrimitiveValue : undefined;
        },
        IsObject: function(object){
          return object instanceof $Object;
        },
        SetInternal: function(object, key, value){
          object[key] = value;
          hide(object, key);
        },
        GetInternal: function(object, key){
          if (object) {
            return object[key];
          }
        },
        HasInternal: function(object, key){
          if (object) {
            return key in object;
          }
        },
        SetHidden: function(object, key, value){
          if (object) {
            object.hiddens[key] = value;
          }
        },
        GetHidden: function(object, key){
          if (object) {
            return object.hiddens[key];
          }
        },
        DeleteHidden: function(object, key){
          if (object) {
            if (key in object.hiddens) {
              delete object.hiddens[key];
              return true;
            }
            return false;
          }
        },
        HasHidden: function(object, key){
          if (object) {
            return key in object.hiddens;
          }
        },
        EnumerateHidden: function(object){
          if (object) {
            return fromInternalArray(ownKeys(object.hiddens));
          }
        },
        Type: function(o){
          if (o === null) {
            return 'Null';
          } else {
            switch (typeof o) {
              case UNDEFINED: return 'Undefined';
              case NUMBER:    return 'Number';
              case STRING:    return 'String';
              case BOOLEAN:   return 'Boolean';
              case OBJECT:    return 'Object';
            }
          }
        },
        Exception: function(type, args){
          return MakeException(type, toInternalArray(args));
        },
        Signal: function(name, value){
          if (isObject(value)) {
            if (value instanceof $Array) {
              value = toInternalArray(value);
            } else {
              throw new Error('NYI');
            }
          }
          realm.emit(name, value);
        },
        wrapDateMethods: function(target){
          wrapNatives(Date.prototype, target);
        },
        wrapRegExpMethods: function(target){
          wrapNatives(RegExp.prototype, target);
        },
        now: Date.now || function(){ return +new Date },


        CallFunction: function(func, receiver, args){
          return func.Call(receiver, toInternalArray(args));
        },

        Fetch: function(name, callback){
          var result = require('../modules')[name];
          if (!result) {
            result = new $Error('Error', undefined, 'Unable to locate module "'+name+'"');
          }
          callback.Call(undefined, [result]);
        },

        EvaluateModule: function(source, global, name, errback, callback){
          realm.evaluateModule(source, global, name, wrapFunction(errback), wrapFunction(callback));
        },
        eval: function(code){
          if (typeof code !== 'string') {
            return code;
          }
          var script = new Script({
            scope: SCOPE.EVAL,
            natives: false,
            source: code
          });
          if (script.error) {
            return script.error;
          } else if (script.thunk) {
            return script.thunk.run(context);
          }
        },
        FunctionCreate: function(args){
          args = toInternalArray(args);
          var body = args.pop();
          var script = new Script({
            scope: SCOPE.GLOBAL,
            natives: false,
            source: '(function anonymous('+args.join(', ')+') {\n'+body+'\n})'
          });
          if (script.error) {
            return script.error;
          }
          var ctx = new ExecutionContext(context, new DeclarativeEnvironmentRecord(realm.globalEnv), realm, script.bytecode);
          ExecutionContext.push(ctx);
          var func = script.thunk.run(ctx);
          ExecutionContext.pop();
          return func;
        },
        BoundFunctionCreate: function(func, receiver, args){
          return new $BoundFunction(func, receiver, toInternalArray(args));
        },
        BooleanCreate: function(boolean){
          return new $Boolean(boolean);
        },
        DateCreate: function(args){
          return new $Date(utility.applyNew(Date, toInternalArray(args)));
        },
        NumberCreate: function(number){
          return new $Number(number);
        },
        ObjectCreate: function(proto){
          return new $Object(proto);
        },
        RegExpCreate: function(pattern, flags){
          if (typeof pattern === 'object') {
            pattern = pattern.PrimitiveValue;
          }
          try {
            var result = new RegExp(pattern, flags);
          } catch (e) {
            return ThrowException('invalid_regexp', [pattern+'']);
          }
          return new $RegExp(result);
        },
        ProxyCreate: function(target, handler){
          return new $Proxy(target, handler);
        },
        SymbolCreate: function(name, isPublic){
          return new $Symbol(name, isPublic);
        },
        StringCreate: function(string){
          return new $String(string);
        },

        DateToNumber: function(object){
          return +object.PrimitiveValue;
        },
        DateToString: function(object){
          return ''+object.PrimitiveValue;
        },
        FunctionToString: function(func){
          if (func.Proxy) {
            func = func.Target;
          }
          var code = func.Code;
          if (func.Native || !code) {
            return nativeCode[0] + func.properties.get('name') + nativeCode[1];
          } else {
            return code.source.slice(code.range[0], code.range[1]);
          }
        },
        NumberToString: function(object, radix){
          return object.PrimitiveValue.toString(radix);
        },
        RegExpToString: function(object, radix){
          return object.PrimitiveValue.toString(radix);
        },
        CallNative: function(target, name, args){
          if (args) {
            return target[name].apply(target, toInternalArray(args));
          } else {
            return target[name]();
          }
        },

        CodeUnit: function(char){
          return char.charCodeAt(0);
        },
        StringReplace: function(string, search, replace){
          if (typeof search !== STRING) {
            search = search.PrimitiveValue;
          }
          return string.replace(search, replace);
        },
        StringSplit: function(string, separator, limit){
          if (typeof separator !== STRING) {
            separator = separator.PrimitiveValue;
          }
          return fromInternalArray(string.split(separator, limit));
        },
        StringSearch: function(regexp){
          return string.search(regexp);
        },
        StringSlice: function(string, start, end){
          return end === undefined ? string.slice(start) : string.slice(start, end);
        },
        FromCharCode: String.fromCharCode,
        StringTrim: String.prototype.trim
          ? function(str){ return str.trim() }
          : (function(trimmer){
            return function(str){
              return str.replace(trimmer, '');
            };
          })(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/),
        GetExtensible: function(obj){
          return obj.GetExtensible();
        },
        SetExtensible: function(obj, value){
          return obj.SetExtensible(value);
        },
        GetPrototype: function(obj){
          return obj.GetPrototype();
        },
        DefineOwnProperty: function(obj, key, desc){
          return obj.DefineOwnProperty(key, ToPropertyDescriptor(desc), false);
        },
        Enumerate: function(obj, includePrototype, onlyEnumerable){
          return fromInternalArray(obj.Enumerate(includePrototype, onlyEnumerable));
        },
        GetProperty: function(obj, key){
          var desc = obj.GetProperty(key);
          if (desc) {
            return FromPropertyDescriptor(desc);
          }
        },
        GetOwnProperty: function(obj, key){
          var desc = obj.GetOwnProperty(key);
          if (desc) {
            return FromPropertyDescriptor(desc);
          }
        },
        GetPropertyAttributes: function(obj, key){
          return obj.properties.getAttribute(key);
        },
        HasOwnProperty: function(obj, key){
          return obj.HasOwnProperty(key);
        },
        SetP: function(obj, key, value, receiver){
          return obj.SetP(receiver, key, value);
        },
        GetP: function(obj, key, receiver){
          return obj.GetP(receiver, key);
        },

        parseInt: function(value, radix){
          return parseInt(ToPrimitive(value), ToNumber(radix));
        },
        parseFloat: function(value){
          return parseFloat(ToPrimitive(value));
        },
        decodeURI: function(value){
          return decodeURI(ToString(value));
        },
        decodeURIComponent: function(value){
          return decodeURIComponent(ToString(value));
        },
        encodeURI: function(value){
          return encodeURI(ToString(value));
        },
        encodeURIComponent: function(value){
          return encodeURIComponent(ToString(value));
        },
        escape: function(value){
          return escape(ToString(value));
        },
        SetTimer: function(f, time, repeating){
          if (typeof f === 'string') {
            f = natives.FunctionCreate(f);
          }
          var id = Math.random() * 1000000 << 10;
          timers[id] = setTimeout(function trigger(){
            if (timers[id]) {
              f.Call(global, []);
              if (repeating) {
                timers[id] = setTimeout(trigger, time);
              } else {
                timers[id] = f = null;
              }
            } else {
              f = null;
            }
          }, time);
          return id;
        },
        ClearTimer: function(id){
          if (timers[id]) {
            timers[id] = null;
          }
        },
        Quote: (function(){
          var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
              escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
              meta = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\' };

          function escaper(a) {
            var c = meta[a];
            return typeof c === 'string' ? c : '\\u'+('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          }

          return function(string){
            escapable.lastIndex = 0;
            return '"'+string.replace(escapable, escaper)+'"';
          };
        })(),
        MathCreate: (function(Math){
          var consts = ['E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2'],
              sqrt = Math.sqrt,
              log = Math.log,
              pow = Math.pow,
              exp = Math.exp,
              LN2 = Math.LN2,
              LN10 = Math.LN10;


          function wrapMathFunction(fn, args){
            if (args === 0) {
              return fn;
            }
            if (args === 1) {
              return function(x){
                x = ToNumber(x);
                if (x && x.Completion) {
                  if (x.Abrupt) return x; else x = x.value;
                }
                return fn(x);
              }
            } else if (args === 2) {
              return function(x, y){
                x = ToNumber(x);
                if (x && x.Completion) {
                  if (x.Abrupt) return x; else x = x.value;
                }
                y = ToNumber(y);
                if (y && y.Completion) {
                  if (y.Abrupt) return y; else y = y.value;
                }
                return fn(x, y);
              }
            } else {
              return function(){
                var values = [];
                for (var k in arguments) {
                  var x = arguments[k]
                  if (x && x.Completion) {
                    if (x.Abrupt) return x; else x = x.value;
                  }
                  values.push(x);
                }
                return fn.apply(null, values);
              };
            }
          }

          var funcs = {
            abs: wrapMathFunction(Math.abs, 1),
            acos: wrapMathFunction(Math.acos, 1),
            acosh: wrapMathFunction(function(x){
              return Math.log(x + Math.sqrt(x * x - 1));
            }, 1),
            asinh: wrapMathFunction(function(x){
              return Math.log(x + Math.sqrt(x * x + 1));
            }, 1),
            asin: wrapMathFunction(Math.asin, 1),
            atan: wrapMathFunction(Math.atan, 1),
            atanh: wrapMathFunction(function(x) {
              return .5 * log((1 + x) / (1 - x));
            }, 1),
            atan2: wrapMathFunction(Math.atan2, 2),
            ceil: wrapMathFunction(Math.ceil, 1),
            cos: wrapMathFunction(Math.acos, 1),
            cosh: wrapMathFunction(function(x) {
              if (x < 0) {
                x = -x;
              }
              if (x > 21) {
                return exp(x) / 2;
              } else {
                return (exp(x) + exp(-x)) / 2;
              }
            }, 1),
            exp: wrapMathFunction(Math.exp, 1),
            expm1: wrapMathFunction(function(x) {
              function factorial(x){
                for (var i = 2, o = 1; i <= x; i++) {
                  o *= i;
                }
                return o;
              }

              var o = 0, n = 50;
              for (var i = 1; i < n; i++) {
                o += pow(x, i) / factorial(i);
              }
              return o;
            }, 1),
            floor: wrapMathFunction(Math.floor, 1),
            hypot: wrapMathFunction(function(x, y) {
              return sqrt(x * x + y * y) || 0;
            }, 2),
            log: wrapMathFunction(Math.log, 1),
            log2: wrapMathFunction(function(x){
              return log(x) * (1 / LN2);
            }, 1),
            log10: wrapMathFunction(function(x){
              return log(x) * (1 / LN10);
            }, 1),
            log1p: wrapMathFunction(function(x){
              var o = 0,
                  n = 50;

              if (x <= -1) {
                return -Infinity;
              } else if (x < 0 || value > 1) {
                return log(1 + x);
              } else {
                for (var i = 1; i < n; i++) {
                  if ((i % 2) === 0) {
                    o -= pow(x, i) / i;
                  } else {
                    o += pow(x, i) / i;
                  }
                }
                return o;
              }
            }, 1),
            max: wrapMathFunction(Math.max),
            min: wrapMathFunction(Math.min),
            pow: wrapMathFunction(Math.pow, 2),
            random: wrapMathFunction(Math.random, 0),
            round: wrapMathFunction(Math.round, 1),
            sign: wrapMathFunction(function(x){
              x = +x;
              return x === 0 || x !== x ? x : x < 0 ? -1 : 1;
            }, 1),
            sinh: wrapMathFunction(function(x){
              return (exp(x) - exp(-x)) / 2;
            }, 1),
            sin: wrapMathFunction(Math.sin, 1),
            sqrt: wrapMathFunction(Math.sqrt, 1),
            tan: wrapMathFunction(Math.tan, 1),
            tanh: wrapMathFunction(function(x) {
              return (exp(x) - exp(-x)) / (exp(x) + exp(-x));
            }, 1),
            trunc: wrapMathFunction(function(x){
              return ~~x;
            }, 1)
          };

          return function(){
            var math = new $Object;
            math.NativeBrand = BRANDS.NativeMath;
            for (var i=0; i < consts.length; i++) {
              math.properties.set(consts[i], Math[consts[i]], ___);
            }
            for (var k in funcs) {
              math.properties.set(k, new $NativeFunction({
                call: funcs[k],
                name: k,
                length: funcs[k].length
              }), _CW);
            }
            return math;
          };
        })(Math),

        MapInitialization: CollectionInitializer(MapData, 'Map'),
        MapSigil: function(){
          return MapData.sigil;
        },
        MapSize: function(map){
          return map.MapData ? map.MapData.size : 0;
        },
        MapClear: wrapMapFunction('clear'),
        MapSet: wrapMapFunction('set'),
        MapDelete: wrapMapFunction('remove'),
        MapGet: wrapMapFunction('get'),
        MapHas: wrapMapFunction('has'),
        MapNext: function(map, key){
          var result = map.MapData.after(key);
          return result instanceof Array ? fromInternalArray(result) : result;
        },

        WeakMapInitialization: CollectionInitializer(WeakMapData, 'WeakMap'),
        WeakMapSet: wrapWeakMapFunction('set'),
        WeakMapDelete: wrapWeakMapFunction('remove'),
        WeakMapGet: wrapWeakMapFunction('get'),
        WeakMapHas: wrapWeakMapFunction('has'),
        readFile: function(path, callback){
          require('fs').readFile(path, 'utf8', function(err, file){
            callback.Call(undefined, [file]);
          });
        },
        resolve: module
          ? require('path').resolve
          : function(base, to){
              to = to.split('/');
              base = base.split('/');
              base.length--;

              for (var i=0; i < to.length; i++) {
                if (to[i] === '..') {
                  base.length--;
                } else if (to[i] !== '.') {
                  base[base.length] = to[i];
                }
              }

              return base.join('/');
            },
        baseURL: module ? function(){ return module.parent.parent.dirname }
                        : function(){ return location.origin + location.pathname }
      };
    })();


    var moduleInitScript = new Script({
      scope: SCOPE.GLOBAL,
      natives: true,
      filename: 'module-init.js',
      source: 'import * from "@std";\n'+
              'for (let k in this) {\n'+
              '  let isConstant = typeof this[k] !== "function" && typeof this[k] !== "object";\n'+
              '  Object.defineProperty(this, k, { enumerable: false, configurable: !isConstant, writable: !isConstant });\n'+
              '}'
    });

    var mutationScopeScript = new Script('void 0');

    var emptyClassScript = new Script({
      scope: SCOPE.GLOBAL,
      natives: true,
      filename: 'class-init.js',
      source: '$__EmptyClass = function constructor(...args){ super(...args) }'
    });

    function initialize(realm, ƒ, Ω){
      if (realm.initialized) Ω();
      realm.state = 'initializing';
      realm.initialized = true;
      realm.mutationScope = new ExecutionContext(null, realm.globalEnv, realm, mutationScopeScript.bytecode);
      realm.evaluate(emptyClassScript, true);
      resolveModule(require('../modules')['@system'], realm.global, '@system', ƒ, function(){
        realm.evaluateAsync(moduleInitScript, function(){
          realm.state = 'idle';
          Ω();
        });
      });
    }

    function prepareToRun(bytecode, scope){
      if (!scope) {
        var realm = createSandbox(realm.global);
        scope = realm.globalEnv;
      } else {
        var realm = scope.Realm;
      }
      ExecutionContext.push(new ExecutionContext(null, scope, realm, bytecode));
      var status = TopLevelDeclarationInstantiation(bytecode);
      if (status && status.Abrupt) {
        realm.emit(status.type, status);
        return status;
      }
    }

    function run(realm, thunk, bytecode){
      realm.executing = thunk;
      realm.state = 'executing';
      realm.emit('executing', thunk);

      var result = thunk.run(context);

      if (result === Pause) {
        var resume = function(){
          resume = function(){};
          delete realm.resume;
          realm.emit('resume');
          return run(realm, thunk, bytecode);
        };

        realm.resume = function(){ return resume() };
        realm.state = 'paused';
        realm.emit('pause', realm.resume);
      } else {
        realm.executing = null;
        realm.state = 'idle';
        if (result && result.Abrupt) {
          realm.emit(result.type, result);
        } else {
          realm.emit('complete', result);
        }

        return result;
      }
    }


    function mutationContext(realm, toggle){
      if (toggle === undefined) {
        toggle = !realm.mutating;
      } else {
        toggle = !!toggle;
      }

      if (toggle !== this.mutating) {
        realm.mutating = toggle;
        if (toggle) {
          ExecutionContext.push(realm.mutationScope);
        } else {
          ExecutionContext.pop();
        }
      }
      return toggle;
    }

    function resolveImports(code, ƒ, Ω){
      var modules = create(null);
      if (code.imports && code.imports.length) {
        var load = intrinsics.System.Get('load'),
            count = code.imports.length,
            errors = [];

        var callback = {
          Call: function(receiver, args){
            var result = args[0],
                internals = result.hiddens['loader-internals'];

            if (result instanceof $Module) {
              modules[internals.mrl] = result;
            } else {}

            if (!--count) {
              if (errors.length) {
                ƒ(errors);
              }
              Ω(modules);
            }
          }
        };

        var errback = {
          Call: function(receiver, args){
            errors.push(args[0]);
            if (!--count) {
              ƒ(errors);
              Ω(modules);
            }
          }
        };

        each(code.imports, function(imported){
          if (imported.specifiers && imported.specifiers.Code) {
            var code = imported.specifiers.Code,
                sandbox = createSandbox(global);

            runScript({ bytecode: code }, sandbox, errback.Call, function(){
              var module = new $Module(sandbox.globalEnv, code.ExportedNames);
              var internals = module.hiddens['loader-internals'] = create(null);
              internals.mrl = code.name;
              callback.Call(null, [module]);
            });
          } else {
            var origin = imported.origin;
            if (typeof origin !== STRING && origin instanceof Array) {

            } else {
              load.Call(intrinsics.System, [imported.origin, callback, errback]);
            }
          }
        });
      } else {
        Ω(modules);
      }
    }

    function createSandbox(object){
      var outerRealm = object.Realm || object.Prototype.Realm,
          bindings = new $Object,
          scope = new GlobalEnvironmentRecord(bindings),
          realm = scope.Realm = bindings.Realm = create(outerRealm);

      bindings.NativeBrand = BRANDS.GlobalObject;
      scope.outer = outerRealm.globalEnv;
      realm.global = bindings;
      realm.globalEnv = scope;
      return realm;
    }


    function runScript(script, realm, ƒ, Ω){
      var scope = realm.globalEnv,
          ctx = new ExecutionContext(context, scope, realm, script.bytecode);

      if (!script.thunk) {
        script.thunk = new Thunk(script.bytecode);
      }

      ExecutionContext.push(ctx);
      var status = TopLevelDeclarationInstantiation(script.bytecode);
      context === ctx && ExecutionContext.pop();

      if (status && status.Abrupt) {
        realm.emit(status.type, status);
        return ƒ(status);
      }

      resolveImports(script.bytecode, ƒ, function(modules){
        each(script.bytecode.imports, function(imported){
          var module = modules[imported.origin];

          if (imported.name) {
            scope.SetMutableBinding(imported.name, module);
          } else if (imported.specifiers) {
            iterate(imported.specifiers, function(path, name){
              if (name === '*') {
                module.properties.forEach(function(prop){
                  scope.SetMutableBinding(prop[0], module.Get(prop[0]));
                });
              } else {
                var obj = module;

                each(path, function(part){
                  var o = obj;
                  obj = obj.Get(part);
                });

                scope.SetMutableBinding(name, obj);
              }
            });
          }
        });

        ExecutionContext.push(ctx);
        var result = run(realm, script.thunk, script.bytecode);
        context === ctx && ExecutionContext.pop();
        Ω(result);
      });
    }

    function resolveModule(source, global, name, ƒ, Ω){
      var script = new Script({
        name: name,
        natives: true,
        source: source,
        scope: SCOPE.MODULE
      });

      if (script.error) {
        return ƒ(script.error);
      }

      var sandbox = createSandbox(global);

      runScript(script, sandbox, ƒ, function(){
        Ω(new $Module(sandbox.globalEnv, script.bytecode.ExportedNames));
      });
    }


    function Realm(callback){
      var self = this;

      Emitter.call(this);
      realms.push(this);
      this.active = false;
      this.scripts = [];
      this.templates = {};
      this.state = 'bootstrapping';

      activate(this);
      this.natives = new Intrinsics(this);
      intrinsics = this.intrinsics = this.natives.bindings;
      intrinsics.global = global = this.global = new $Object(new $Object(this.intrinsics.ObjectProto));
      this.global.NativeBrand = BRANDS.GlobalObject;
      globalEnv = this.globalEnv = new GlobalEnvironmentRecord(this.global);
      this.globalEnv.Realm = this;

      this.intrinsics.FunctionProto.Scope = this.globalEnv;
      this.intrinsics.FunctionProto.Realm = this;
      this.intrinsics.ThrowTypeError = CreateThrowTypeError(this);
      hide(this.intrinsics.FunctionProto, 'Scope');
      hide(this, 'intrinsics');
      hide(this, 'natives');
      hide(this, 'active');
      hide(this, 'templates');
      hide(this, 'scripts');
      hide(this, 'globalEnv');

      for (var k in natives) {
        this.natives.binding({ name: k, call: natives[k] });
      }

      this.state = 'initializing';

      function errback(error){
        self.state = 'error';
        callback && callback(error);
        self.emit('error', error);
      }

      initialize(this, errback, function(){
        deactivate(self);
        self.scripts = [];
        self.state = 'idle';
        callback && callback(self);
        self.emit('ready');
      });
      hide(this, 'mutationScope');
      hide(this, 'initialized');
      hide(this, 'quiet');
    }

    inherit(Realm, Emitter, [
      function enterMutationContext(){
        mutationContext(this, true);
      },
      function exitMutationContext(){
        mutationContext(this, false);
      },
      function evaluateModule(source, global, name, errback, callback){
        if (typeof errback !== FUNCTION) {
          if (typeof name === FUNCTION) {
            errback = name;
            name = '';
          } else {
            errback = noop;
          }
        }
        if (typeof callback !== FUNCTION) {
          callback = errback;
          errback = noop;
        }
        resolveModule(source, global, name, errback, callback);
      },
      function evaluateAsync(subject, callback){
        var script = new Script(subject),
            self = this;

        if (script.error) {
          this.emit(script.error.type, script.error);
          return callback(script.error);
        }

        this.scripts.push(script);

        function errback(error){
          callback(error);
          self.emit('error', error);
        }

        runScript(script, this, errback, callback);
      },
      function evaluate(subject){
        activate(this);
        var script = new Script(subject);

        if (script.error) {
          this.emit(script.error.type, script.error);
          return script.error;
        }

        this.scripts.push(script);
        return prepareToRun(script.bytecode, this.globalEnv) || run(this, script.thunk, script.bytecode);
      }
    ]);

    return Realm;
  })();


  var realms = [],
      realmStack = [],
      realm = null,
      global = null,
      context = null,
      intrinsics = null;

  exports.Realm = Realm;
  exports.Script = Script;
  exports.ScriptFile = ScriptFile;

  exports.createRealm = function createRealm(listener){
    return new Realm(listener);
  };

  exports.createBytecode = function createBytecode(source){
    return new ScriptFile(source).bytecode;
  };

  exports.activeRealm = function activeRealm(){
    if (!realm && realms.length) {
      activate(realms[realms.length - 1]);
    }
    return realm;
  };

  exports.activeContext = function activeContext(){
    return context;
  };

  exports.createNativeFunction = function createNativeFunction(o){
    if (typeof options === FUNCTION) {
      return new $NativeFunction({
        length: o._length || o.length,
        name: o._name || o.name,
        call: o
      });
    } else {
      return new $NativeFunction(o);
    }
  };

  return exports;
})((0,eval)('this'), typeof module !== 'undefined' ? module.exports : {});






exports.debug = (function(exports){

  var utility = require('./utility'),
      isObject = utility.isObject,
      inherit = utility.inherit,
      create = utility.create,
      each = utility.each,
      define = utility.define;

  var constants = require('./constants'),
      ENUMERABLE = constants.ATTRIBUTES.ENUMERABLE,
      CONFIGURABLE = constants.ATTRIBUTES.CONFIGURABLE,
      WRITABLE = constants.ATTRIBUTES.WRITABLE,
      ACCESSOR = constants.ATTRIBUTES.ACCESSOR;

  var runtime = require('./runtime'),
      realm = runtime.activeRealm;

  function always(value){
    return function(){ return value };
  }

  function alwaysCall(func, args){
    args || (args = []);
    return function(){ return func.apply(null, args) }
  }

  function isNegativeZero(n){
    return n === 0 && 1 / n === -Infinity;
  }


  function Mirror(){}

  define(Mirror.prototype, {
    type: null,
    getPrototype: function(){
      return _Null;
    },
    get: function(){
      return _Undefined;
    },
    getValue: function(){
      return _Undefined;
    },
    kind: 'Unknown',
    label: always(''),
    hasOwn: always(null),
    has: always(null),
    list: alwaysCall(Array),
    inheritedAttrs: alwaysCall(create, [null]),
    ownAttrs: alwaysCall(create, [null]),
    getterAttrs: alwaysCall(create, [null]),
    isPropExtensible: always(null),
    isPropEnumerable: always(null),
    isPropConfigurable: always(null),
    getOwnDescriptor: always(null),
    getDescriptor: always(null),
    getProperty: always(null),
    isPropAccessor: always(null),
    isPropWritable: always(null),
    propAttributes: always(null)
  });

  function brand(v){
    if (v === null) {
      return 'Null';
    } else if (v === void 0) {
      return 'Undefined';
    }
    return Object.prototype.toString.call(v).slice(8, -1);
  }

  function MirrorValue(subject, label){
    this.subject = subject;
    this.type = typeof subject;
    this.kind = brand(subject)+'Value';
    if (this.type === 'number' && isNegativeZero(subject)) {
      label = '-0';
    }
    this.label = always(label);
  }

  inherit(MirrorValue, Mirror);

  function MirrorStringValue(subject){
    this.subject = subject;
  }

  inherit(MirrorStringValue, MirrorValue, {
    label: always('string'),
    kind: 'StringValue',
    type: 'string'
  });

  function MirrorNumberValue(subject){
    this.subject = subject;
  }

  inherit(MirrorNumberValue, MirrorValue, {
    label: always('number'),
    kind: 'NumberValue',
    type: 'number'
  });

  function MirrorAccessor(holder, accessor, key){
    this.holder = holder;
    this.accessor = accessor;
    this.key = key;
    realm().enterMutationContext();
    this.subject = accessor.Get.Call(holder, key);
    if (this.subject.__introspected) {
      this.introspected = this.subject.__introspected;
    } else {
      this.introspected = introspect(this.subject);
    }
    this.kind = this.introspected.kind;
    this.type = this.introspected.type;
    realm().exitMutationContext();
  }

  void function(){
    inherit(MirrorAccessor, Mirror, {
      accessor: true
    }, [
      function label(){
        return this.introspected.label();
      },
      function getName(){
        return this.subject.properties.get('name');
      },
      function getParams(){
        var params = this.subject.FormalParameters;
        if (params && params.ArgNames) {
          var names = params.ArgNames.slice();
          if (params.Rest) {
            names.rest = true;
          }
          return names;
        } else {
          return [];
        }
      }
    ]);
  }();

  var proto = Math.random().toString(36).slice(2);


  function MirrorObject(subject){
    subject.__introspected = this;
    this.subject = subject;
    this.props = subject.properties;
    this.accessors = create(null);
  }

  void function(){
    inherit(MirrorObject, Mirror, {
      kind: 'Object',
      type: 'object',
      parentLabel: '[[proto]]',
      attrs: null,
      props: null
    }, [
      function get(key){
        if (this.isPropAccessor(key)) {
          if (this.subject.IsProto) {
            return _Undefined;
          }
          var prop = this.getProperty(key),
              accessor = prop[1] || prop[3];

          if (!this.accessors[key]) {
            this.accessors[key] = new MirrorAccessor(this.subject, accessor, key);
          }
          return this.accessors[key];
        } else {
          var prop = this.props.getProperty(key);
          if (prop) {
            return introspect(prop[1]);
          } else {
            return this.getPrototype().get(key);
          }
        }
      },
      function getProperty(key){
        return this.props.getProperty(key) || this.getPrototype().getProperty(key);
      },
      function isClass(){
        return !!this.subject.Class;
      },
      function getBrand(){
        return this.subject.Brand || this.subject.NativeBrand;
      },
      function getValue(key){
        return this.get(key).subject;
      },
      function getPrototype(){
        return introspect(this.subject.GetPrototype());
      },
      function setPrototype(value){
        realm().enterMutationContext();
        var ret = this.subject.SetPrototype(value);
        realm().exitMutationContext();
        return ret;
      },
      function set(key, value){
        var ret;
        realm().enterMutationContext();
        ret = this.subject.Put(key, value, false);
        realm().exitMutationContext();
        return ret;
      },
      function setAttribute(key, attr){
        var prop = this.props.getProperty(key);
        if (prop) {
          prop[2] = attr;
          return true;
        }
        return false;
      },
      function defineProperty(key, desc){
        desc = Object(desc);
        var Desc = {};
        if ('value' in desc) {
          Desc.Value = desc.value;
        }
        if ('get' in desc) {
          Desc.Get = desc.get;
        }
        if ('set' in desc) {
          Desc.Set = desc.set;
        }
        if ('enumerable' in desc) {
          Desc.Enumerable = desc.enumerable;
        }
        if ('configurable' in desc) {
          Desc.Configurable = desc.configurable;
        }
        if ('writable' in desc) {
          Desc.Writable = desc.writable;
        }
        realm().enterMutationContext();
        var ret = this.subject.DefineOwnProperty(key, Desc, false);
        realm().exitMutationContext();
        return ret;
      },
      function hasOwn(key){
        if (this.props) {
          return this.props.has(key);
        } else {
          return false;
        }
      },
      function has(key){
        return this.hasOwn(key) || this.getPrototype().has(key);
      },
      function isExtensible(key){
        return this.subject.GetExtensible();
      },
      function getDescriptor(key){
        return this.getOwnDescriptor(key) || this.getPrototype().getDescriptor(key);
      },
      function getOwnDescriptor(key){
        var prop = this.props.getProperty(key);
        if (prop) {
          if (prop[2] & ACCESSOR) {
            return {
              name: key,
              get: prop[1].Get,
              set: prop[1].Set,
              enumerable: (prop[2] & ENUMERABLE) > 0,
              configurable: (prop[2] & CONFIGURABLE) > 0
            }
          } else {
            return {
              name: key,
              value: prop[1],
              writable: (prop[2] & WRITABLE) > 0,
              enumerable: (prop[2] & ENUMERABLE) > 0,
              configurable: (prop[2] & CONFIGURABLE) > 0
            }
          }
        }
      },
      function getInternal(name){
        return this.subject[name];
      },
      function isPropEnumerable(key){
        return (this.propAttributes(key) & ENUMERABLE) > 0;
      },
      function isPropConfigurable(key){
        return (this.propAttributes(key) & CONFIGURABLE) > 0;
      },
      function isPropAccessor(key){
        return (this.propAttributes(key) & ACCESSOR) > 0;
      },
      function isPropWritable(key){
        var prop = this.props.get(key);
        if (prop) {
          return !!(prop[2] & ACCESSOR ? prop[1].Set : prop[2] & WRITABLE);
        } else {
          return this.subject.GetExtensible();
        }
      },
      function propAttributes(key){
        var prop = this.props.getProperty(key);
        return prop ? prop[2] : this.getPrototype().propAttributes(key);
      },
      function label(){
        var brand = this.subject.Brand || this.subject.NativeBrand;
        if (brand && brand.name !== 'Object') {
          return brand.name;
        }

        if (this.subject.ConstructorName) {
          return this.subject.ConstructorName;
        } else if (this.has('constructor')) {
          var ctorName = this.get('constructor').get('name');
          if (ctorName.subject && typeof ctorName.subject === 'string') {
            return ctorName.subject;
          }
        }

        return 'Object';
      },
      function inheritedAttrs(){
        return this.ownAttrs(this.getPrototype().inheritedAttrs());
      },
      function ownAttrs(props){
        props || (props = create(null));
        this.props.forEach(function(prop){
          if (!prop[0].Private) {
            var key = prop[0] === '__proto__' ? proto : prop[0];
            props[key] = prop;
          }
        });
        return props;
      },
      function getterAttrs(own){
        var inherited = this.getPrototype().getterAttrs(),
            props = this.ownAttrs();

        for (var k in props) {
          if (own || (props[k][2] & ACCESSOR)) {
            inherited[k] = props[k];
          }
        }
        return inherited;
      },
      function list(hidden, own){
        var keys = [],
            props = own
              ? this.ownAttrs()
              : own === false
                ? this.inheritedAttrs()
                : this.getterAttrs(true);

        for (var k in props) {
          if (hidden || (props[k][2] & ENUMERABLE)) {
            keys.push(props[k][0]);
          }
        }

        return keys.sort();
      }
    ]);
  }();

  function MirrorArguments(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorArguments, MirrorObject, {
    kind: 'Arguments'
  }, []);


  function MirrorArray(subject){
    MirrorObject.call(this, subject);
  }

  void function(){
    inherit(MirrorArray, MirrorObject, {
      kind: 'Array'
    }, [
      function list(hidden, own){
        var keys = [],
            indexes = [],
            len = this.getValue('length'),
            props = own
              ? this.ownAttrs()
              : own === false
                ? this.inheritedAttrs()
                : this.getterAttrs(true);

        for (var i=0; i < len; i++) {
          indexes.push(i+'');
        }
        indexes.push('length');

        for (var k in props) {
          if (hidden || props[k][2] & ENUMERABLE) {
            if (k !== props[k][0] || k !== 'length' && !(k >= 0 && k < len)) {
              keys.push(props[k][0]);
            }
          }
        }

        return indexes.concat(keys.sort());
      }
    ]);
  }();


  function MirrorBoolean(subject){
    MirrorObject.call(this, subject);
  }

  void function(){
    inherit(MirrorBoolean, MirrorObject, {
      kind: 'Boolean'
    }, [
      function label(){
        return 'Boolean('+this.subject.PrimitiveValue+')';
      }
    ]);
  }();

  function MirrorDate(subject){
    MirrorObject.call(this, subject);
  }

  void function(){
    inherit(MirrorDate, MirrorObject, {
      kind: 'Date'
    }, [
      function label(){
        var date = this.subject.PrimitiveValue;
        if (!date || date === Date.prototype || ''+date === 'Invalid Date') {
          return 'Invalid Date';
        } else {
          var json = date.toJSON();
          return json.slice(0, 10) + ' ' + json.slice(11, 19);
        }
      }
    ]);
  }();


  function MirrorError(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorError, MirrorObject, {
    kind: 'Error'
  }, [
  ]);

  function MirrorThrown(subject){
    if (utility.isObject(subject)) {
      MirrorError.call(this, subject);
    } else {
      return introspect(subject);
    }
  }

  void function(){
    inherit(MirrorThrown, MirrorError, {
      kind: 'Thrown'
    }, [
      function getError(){
        if (this.subject.NativeBrand.name === 'StopIteration') {
          return 'StopIteration';
        }
        return this.getValue('name') + ': ' + this.getValue('message');
      },
      function origin(){
        var file = this.getValue('filename') || '',
            type = this.getValue('kind') || '';

        return file && type ? type + ' ' + file : type + file;
      },
      function trace(){
        return this.subject.trace;
      },
      function context(){
        return this.subject.context;
      }
    ]);
  }();


  function MirrorFunction(subject){
    MirrorObject.call(this, subject);
  }

  void function(){
    inherit(MirrorFunction, MirrorObject, {
      type: 'function',
      kind: 'Function',
    }, [
      function getName(){
        return this.props.get('name');
      },
      function getParams(){
        var params = this.subject.FormalParameters;
        if (params && params.BoundNames) {
          var names = params.BoundNames.slice();
          if (params.Rest) {
            names.rest = true;
          }
          return names;
        } else {
          return [];
        }
      },
      function apply(receiver, args){
        if (receiver.subject) {
          receiver = receiver.subject;
        }
        realm().enterMutationContext();
        var ret = this.subject.Call(receiver, args);
        realm().exitMutationContext();
        return introspect(ret);
      },
      function construct(args){
        if (this.subject.Construct) {
          realm().enterMutationContext();
          var ret = this.subject.Construct(args);
          realm().exitMutationContext();
          return introspect(ret);
        } else {
          return false;
        }
      },
      function getScope(){
        return introspect(this.subject.Scope);
      }
    ]);
  }();

  function MirrorGlobal(subject){
    MirrorObject.call(this, subject);
  }

  void function(){
    inherit(MirrorGlobal, MirrorObject, {
      kind: 'Global'
    }, [
      function getEnvironment(){
        return introspect(this.subject.env);
      }
    ]);
  }();



  function MirrorJSON(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorJSON, MirrorObject, {
    kind: 'JSON'
  }, []);

  function MirrorMap(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorMap, MirrorObject, {
    kind: 'Map'
  }, []);

  function MirrorMath(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorMath, MirrorObject, {
    kind: 'Math'
  }, []);

  var MirrorModule = (function(){
    function MirrorModule(subject){
      MirrorObject.call(this, subject);
    }

    inherit(MirrorModule, MirrorObject, {
      kind: 'Module'
    }, [
      function get(key){
        if (this.isPropAccessor(key)) {
          if (!this.accessors[key]) {
            var prop = this.getProperty(key),
                accessor = prop[1] || prop[3];

            realm().enterMutationContext();
            this.accessors[key] = introspect(accessor.Get.Call(this.subject, []));
            realm().exitMutationContext();
          }

          return this.accessors[key];
        } else {
          var prop = this.props.getProperty(key);
          if (prop) {
            return introspect(prop[1]);
          } else {
            return this.getPrototype().get(key);
          }
        }
      },
    ]);

    return MirrorModule;
  })();

  var MirrorNumber = (function(){
    function MirrorNumber(subject){
      MirrorObject.call(this, subject);
    }

    inherit(MirrorNumber, MirrorObject, {
      kind: 'Number'
    }, [
      function label(){
        var value = this.subject.PrimitiveValue;
        if (isNegativeZero(value)) {
          value = '-0';
        } else {
          value += '';
        }
        return value;
      }
    ]);

    return MirrorNumber;
  })();

  function MirrorRegExp(subject){
    MirrorObject.call(this, subject);
  }

  void function(){
    inherit(MirrorRegExp, MirrorObject, {
      kind: 'RegExp'
    }, [
      function label(){
        return this.subject.PrimitiveValue+'';
      }
    ]);
  }();


  var MirrorSet = (function(){
    function MirrorSet(subject){
      MirrorObject.call(this, subject);
    }

    inherit(MirrorSet, MirrorObject, {
      kind: 'Set'
    });

    return MirrorSet;
  })();


  function MirrorString(subject){
    MirrorObject.call(this, subject);
  }

  void function(){
    inherit(MirrorString, MirrorObject,{
      kind: 'String'
    }, [
      function get(key){
        if (key < this.props.get('length') && key >= 0) {
          return this.subject.PrimitiveValue[key];
        } else {
          return MirrorObject.prototype.get.call(this, key);
        }
      },
      function ownAttrs(props){
        var len = this.props.get('length');
        props || (props = create(null));
        for (var i=0; i < len; i++) {
          props[i] = 1;
        }
        this.props.forEach(function(prop){
          if (!prop[0].Private) {
            var key = prop[0] === '__proto__' ? proto : prop[0];
            props[key] = prop[2];
          }
        });
        return props;
      },
      function propAttributes(key){
        if (key < this.props.get('length') && key >= 0) {
          return 1;
        } else {
          return MirrorObject.prototype.propAttributes.call(this, key);
        }
      },
      function label(){
        return 'String('+utility.quotes(this.subject.PrimitiveValue)+')';
      }
    ]);
  }();




  var MirrorSymbol = (function(){
    function MirrorSymbol(subject){
      MirrorObject.call(this, subject);
    }

    inherit(MirrorSymbol, MirrorObject, {
      kind: 'Symbol'
    }, [
      function label(){
        return '@' + (this.subject.Name || 'Symbol');
      }
    ]);

    return MirrorSymbol;
  })();


  function MirrorWeakMap(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorWeakMap, MirrorObject, {
    kind: 'WeakMap'
  }, []);


  var MirrorProxy = (function(){
    function MirrorProxy(subject){
      this.subject = subject;
      if ('Call' in subject) {
        this.type = 'function';
      }
      this.attrs = create(null);
      this.props = create(null);
      this.kind = introspect(subject.Target).kind;
    }

    function descToAttrs(desc){
      if (desc) {
        if ('Value' in desc) {
          return desc.Enumerable | (desc.Configurable << 1) | (desc.Writable << 2);
        }
        return desc.Enumerable | (desc.Configurable << 1) | ACCESSOR;
      }
    }

    inherit(MirrorProxy, Mirror, {
      type: 'object'
    }, [
      MirrorObject.prototype.isExtensible,
      MirrorObject.prototype.getPrototype,
      MirrorObject.prototype.list,
      MirrorObject.prototype.inheritedAttrs,
      MirrorObject.prototype.getterAttrs,
      function getOwnDescriptor(key){
        var desc = this.subject.GetOwnProperty(key);
        var out =  {};
        for (var k in desc) {
          out[k.toLowerCase()] = desc[k];
        }
        return out;
      },
      function label(){
        return 'Proxy' + MirrorObject.prototype.label.call(this);
      },
      function get(key){
        return introspect(this.subject.Get(key));
      },
      function getValue(key){
        return this.subject.Get(key);
      },
      function hasOwn(key){
        return this.subject.HasOwnProperty(key);
      },
      function has(key){
        return this.subject.HasProperty(key);
      },
      function isPropEnumerable(key){
        var desc = this.subject.GetOwnProperty(key);
        return !!(desc && desc.Enumerable);
      },
      function isPropConfigurable(key){
        var desc = this.subject.GetOwnProperty(key);
        return !!(desc && desc.Configurable);
      },
      function isPropAccessor(key){
        var desc = this.subject.GetOwnProperty(key);
        return !!(desc && desc.Get || desc.Set);
      },
      function isPropWritable(key){
        var desc = this.subject.GetOwnProperty(key);
        return !!(desc && desc.Writable);
      },
      function propAttributes(key){
        var desc = this.subject.GetOwnProperty(key);
        if (desc) {
          return descToAttrs(desc);
        }
      },
      function ownAttrs(props){
        var key, keys = this.subject.Enumerate(false, true);

        props || (props = create(null));
        this.props = create(null);
        this.attrs = create(null);

        for (var i=0; i < keys.length; i++) {
          var desc = this.subject.GetOwnProperty(key);
          if (desc) {
            props[keys[i]] = [keys[i], desc.Value, descToAttrs(desc)];
          }
        }

        return props;
      }
    ]);

    return MirrorProxy;
  })();



  var MirrorScope = (function(){
    function MirrorScope(subject){
      if (subject.type === 'Global Env') {
        return new MirrorGlobalScope(subject);
      }
      subject.__introspected = this;
      this.subject = subject;
    }

    inherit(MirrorScope, Mirror, {
      kind: 'Scope',
      type: 'scope',
      parentLabel: '[[outer]]',
      isExtensible: always(true),
      isPropEnumerable: always(true),
      isPropAccessor: always(false)
    }, [
      function isPropAccessor(key){
        return this.getPrototype().isPropAccessor(key) || false;
      },
      function getPrototype(){
        return introspect(this.subject.outer);
      },
      function getValue(key){
        return this.subject.GetBindingValue(key);
      },
      function get(key){
        return introspect(this.subject.GetBindingValue(key));
      },
      function getOwn(key){
        if (this.hasOwn(key)) {
          return introspect(this.subject.GetBindingValue(key));
        }
      },
      function label(){
        return this.subject.type;
      },
      function hasOwn(key){
        return this.subject.HasBinding(key);
      },
      function has(key){
        return this.subject.HasBinding(key) || this.getPrototype().has(key);
      },
      function inheritedAttrs(){
        return this.ownAttrs(this.getPrototype().inheritedAttrs());
      },
      function ownAttrs(props){
        props || (props = create(null));

        each(this.subject.EnumerateBindings(), function(key){
          key = key === '__proto__' ? proto : key;
          props[key] = [key, null, 7]
        });

        return props;
      },
      function list(hidden, own){
        own = true;
        var props = own ? this.ownAttrs() : this.inheritedAttrs(),
            keys = [];

        for (var k in props) {
          keys.push(props[k][0]);
        }

        return keys.sort();
      },
      function isPropConfigurable(key){
        return !(this.subject.deletables && key in this.subject.deletables);
      },
      function isPropWritable(key){
        return !(this.subject.consts && key in this.subject.consts);
      },
      function getOwnDescriptor(key){
        if (this.hasOwn(key)) {
          return { configurable: this.isPropConfigurable(key),
                   enumerable: true,
                   writable: this.isPropWritable(key),
                   value: this.get(key)   };
        }
      },
      function getDescriptor(key){
        return this.getOwnDescriptor(key) || this.getPrototype().getDescriptor(key);
      },
      function getProperty(key){
        return [this.subject.GetBindingValue(key), value, this.propAttributes(key)];
      },
      function propAttributes(key){
        return 1 | (this.isPropConfigurable(key) << 1) | (this.isPropWritable(key) << 2);
      },
    ]);

    return MirrorScope;
  })();

  var MirrorGlobalScope = (function(){
    function MirrorGlobalScope(subject){
      subject.__introspected = this;
      this.subject = subject;
      this.global = introspect(subject.bindings);
    }

    inherit(MirrorGlobalScope, MirrorScope, {
    }, [
      function isExtensible(){
        return this.global.isExtensible();
      },
      function isPropEnumerable(key){
        return this.global.isPropEnumerable(key);
      },
      function isPropConfigurable(key){
        return this.global.isPropConfigurable(key);
      },
      function isPropWritable(key){
        return this.global.isPropWritable(key);
      },
      function isPropAccessor(key){
        return this.global.isPropAccessor(key);
      },
      function propAttributes(key){
        return this.global.propAttributes(key);
      },
      function getProperty(key){
        return this.global.getProperty(key);
      },
      function getDescriptor(key){
        return this.global.getDescriptor(key);
      },
      function getOwnDescriptor(key){
        return this.global.getOwnDescriptor(key);
      },
      function inheritedAttrs(){
        return this.global.inheritedAttrs();
      },
      function ownAttrs(props){
        return this.global.ownAttrs(props);
      },
      function list(hidden, own){
        return this.global.list(hidden, own);
      }
    ]);

    return MirrorGlobalScope;
  })();

  var brands = {
    Arguments: MirrorArguments,
    Array    : MirrorArray,
    Boolean  : MirrorBoolean,
    Date     : MirrorDate,
    Error    : MirrorError,
    Function : MirrorFunction,
    global   : MirrorGlobal,
    JSON     : MirrorJSON,
    Map      : MirrorMap,
    Math     : MirrorMath,
    Module   : MirrorModule,
    Number   : MirrorNumber,
    RegExp   : MirrorRegExp,
    Set      : MirrorSet,
    String   : MirrorString,
    Symbol   : MirrorSymbol,
    WeakMap  : MirrorWeakMap
  };

  var _Null        = new MirrorValue(null, 'null'),
      _Undefined   = new MirrorValue(undefined, 'undefined'),
      _True        = new MirrorValue(true, 'true'),
      _False       = new MirrorValue(false, 'false'),
      _NaN         = new MirrorValue(NaN, 'NaN'),
      _Infinity    = new MirrorValue(Infinity, 'Infinity'),
      _NegInfinity = new MirrorValue(-Infinity, '-Infinity'),
      _Zero        = new MirrorValue(0, '0'),
      _NegZero     = new MirrorValue(-0, '-0'),
      _One         = new MirrorValue(1, '1'),
      _NegOne      = new MirrorValue(-1, '-1'),
      _Empty       = new MirrorValue('', "''");

  var numbers = create(null),
      strings = create(null);


  function introspect(subject){
    switch (typeof subject) {
      case 'undefined': return _Undefined;
      case 'boolean': return subject ? _True : _False;
      case 'string':
        if (subject === '') {
          return _Empty
        } else if (subject.length < 20) {
          if (subject in strings) {
            return strings[subject];
          } else {
            return strings[subject] = new MirrorStringValue(subject);
          }
        } else {
          return new MirrorStringValue(subject);
        }
      case 'number':
        if (subject !== subject) {
          return _NaN;
        }
        switch (subject) {
          case Infinity: return _Infinity;
          case -Infinity: return _NegInfinity;
          case 0: return 1 / subject === -Infinity ? _NegZero : _Zero;
          case 1: return _One;
          case -1: return _NegOne;
        }
        if (subject in numbers) {
          return numbers[subject];
        } else {
          return numbers[subject] = new MirrorNumberValue(subject);
        }
      case 'object':
        if (subject == null) {
          return _Null;
        } else if (subject instanceof Mirror) {
          return subject;
        } else if (subject.__introspected) {
          return subject.__introspected;
        } else if (subject.Environment) {
          return new MirrorScope(subject);
        } else if (subject.Completion) {
          return new MirrorThrown(subject.value);
        } else if (subject.NativeBrand) {
          if (subject.Proxy) {
            return new MirrorProxy(subject);
          } else if ('Call' in subject) {
            return new MirrorFunction(subject);
          } else if (subject.NativeBrand.name in brands) {
            return new brands[subject.NativeBrand.name](subject);
          } else {
            return new MirrorObject(subject);
          }
        } else {
          return _Undefined
        }
    }
  }



  function Renderer(handlers){
    if (handlers) {
      for (var k in this) {
        if (k in handlers) {
          this[k] = handlers[k];
        }
      }
    }
  }

  var alwaysLabel = function(mirror){
    return mirror.label();
  };

  Renderer.prototype = {
    Unknown: alwaysLabel,
    BooleanValue: alwaysLabel,
    StringValue: function(mirror){
      return utility.quotes(mirror.subject);
    },
    NumberValue: function(mirror){
      var label = mirror.label();
      return label === 'number' ? mirror.subject : label;
    },
    UndefinedValue: alwaysLabel,
    NullValue: alwaysLabel,
    Thrown: function(mirror){
      return mirror.getError();
    },
    Accessor: alwaysLabel,
    Arguments: alwaysLabel,
    Array: alwaysLabel,
    Boolean: alwaysLabel,
    Date: alwaysLabel,
    Error: function(mirror){
      return mirror.getValue('name') + ': ' + mirror.getValue('message');
    },
    Function: alwaysLabel,
    Global: alwaysLabel,
    JSON: alwaysLabel,
    Map: alwaysLabel,
    Math: alwaysLabel,
    Module: alwaysLabel,
    Object: alwaysLabel,
    Number: alwaysLabel,
    RegExp: alwaysLabel,
    Scope: alwaysLabel,
    Set: alwaysLabel,
    Symbol: alwaysLabel,
    String: alwaysLabel,
    WeakMap: alwaysLabel
  };

  void function(){
    define(Renderer.prototype, [
      function render(subject){
        var mirror = introspect(subject);
        return this[mirror.kind](mirror);
      }
    ]);
  }();


  var renderer = new Renderer;

  function render(o){
    return renderer.render(o);
  }

  function createRenderer(handlers){
    return new Renderer(handlers);
  }

  function isMirror(o){
    return o instanceof Mirror;
  }

  void function(){
    return;
    if (typeof Proxy !== 'object' || typeof require !== 'function') return;

    var util = require('util'),
        wrappers = new WeakMap,
        $Object = require('./runtime').builtins.$Object;

    void function(){
      define($Object.prototype, function inspect(fn){
        if (fn && typeof fn === 'function') {
          return fn(wrap(this));
        } else {
          return util.inspect(wrap(this), true, 2, false);
        }
      });
    }();


    exports.wrap = wrap;

    function wrap(target){
      if (isObject(target)) {
        if (target instanceof $Object) {
          target = introspect(target);
        }
        if (target instanceof MirrorObject) {
          if (!target.proxy) {
            if (target.type === 'function') {
              var handler = new RenderHandler(target);
              target.proxy = Proxy.createFunction(handler,
                function(){ return handler.apply(this, [].slice.call(arguments)) },
                function(){ return handler.construct([].slice.call(arguments)) }
              );
            } else {
              target.proxy = Proxy.create(new RenderHandler(target));
            }
            wrappers.set(target.proxy, target.subject);
          }
        } else if (target instanceof Mirror) {
          return Mirror.subject;
        }
        return target.proxy;
      }
      return target;
    }

    function unwrap(target){
      if (!isObject(target) || target instanceof $Object) {
        return target;
      }
      if (wrappers.has(target)) {
        return wrappers.get(target);
      }
      return target;
    }


    function RenderHandler(mirror){
      this.mirror = mirror;
    }

    RenderHandler.prototype = {
      getOwnPropertyNames: function(){
        return this.mirror.list(false, true);
      },
      getPropertyNames: function(){
        return this.mirror.list(false, true);
      },
      enumerate: function(){
        return this.mirror.list(false, true);
      },
      keys: function(){
        return this.mirror.list(false, true);
      },
      getOwnPropertyDescriptor: function(key){
        var desc = this.mirror.getOwnDescriptor(key);
        if (desc) {
          desc.configurable = true;
          if (isObject(desc.value)) {
            desc.value = wrap(desc.value);
          } else {
            if (isObject(desc.get)) {
              desc.get = wrap(desc.get);
            }
            if (isObject(desc.set)) {
              desc.set = wrap(desc.set);
            }
          }
        }
        return desc;
      },
      get: function(rcvr, key){
        if (key === 'inspect') return;
        if (key === 'toString') {
          var mirror = this.mirror;
          return function toString(){
            return '[object '+ mirror.subject.NativeBrand.name+']';
          };
        }
        var result = this.mirror.get(key);
        if (!isObject(result.subject)) {
          return result.subject;
        } else {
          return wrap(result);
        }

      },
      set: function(receiver, key, value){
        this.mirror.set(key, unwrap(value));
        return true;
      },
      defineProperty: function(key, desc){
        if ('value' in desc) {
          desc.value = unwrap(desc.value);
        } else {
          if ('get' in desc) {
            desc.get = unwrap(desc.get);
          }
          if ('set' in desc) {
            desc.set = unwrap(desc.set);
          }
        }
        this.mirror.defineProperty(key, desc);
      },
      has: function(key){
        return this.mirror.has(key);
      },
      hasOwn: function(key){
        return this.mirror.hasOwn(key);
      },
      apply: function(receiver, args){
        return wrap(this.mirror.apply(unwrap(receiver), args.map(unwrap)));
      },
      construct: function(args){
        return wrap(this.mirror.construct(args.map(unwrap)));
      }
    };
  }();


  exports.createRenderer = createRenderer;
  exports.basicRenderer = render;
  exports.introspect = introspect;
  exports.isMirror = isMirror;
  exports.Renderer = Renderer;

  return exports;
})(typeof module !== 'undefined' ? module.exports : {});


exports.modules["@array"] = "import iterator from '@iter';\nsymbol @iterator = iterator;\n\nexport function Array(...values){\n  if (values.length === 1 && typeof values[0] === 'number') {\n    var out = [];\n    out.length = values[0];\n    return out;\n  } else {\n    return values;\n  }\n}\n\n$__setupConstructor(Array, $__ArrayProto);\n\n\nexport function isArray(array){\n  return $__GetNativeBrand(array) === 'Array';\n}\n\nexport function from(iterable){\n  var out = [];\n  iterable = $__ToObject(iterable);\n\n  for (var i = 0, len = iterable.length >>> 0; i < len; i++) {\n    if (i in iterable) {\n      out[i] = iterable[i];\n    }\n  }\n\n  return out;\n}\n\n$__defineMethods(Array, [isArray, from]);\n\n\n{\n$__defineProps(Array.prototype, {\n  every(callback, context){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length),\n        result = [];\n\n    if (typeof callback !== 'function') {\n      throw $__Exception('callback_must_be_callable', ['Array.prototype.every']);\n    }\n\n    for (var i = 0; i < len; i++) {\n      if (i in array && !$__CallFunction(callback, context, [array[i], i, array])) {\n        return false;\n      }\n    }\n\n    return true;\n  },\n  filter(callback, context){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length),\n        result = [],\n        count = 0;\n\n    if (typeof callback !== 'function') {\n      throw $__Exception('callback_must_be_callable', ['Array.prototype.filter']);\n    }\n\n    for (var i = 0; i < len; i++) {\n      if (i in array) {\n        var element = array[i];\n        if ($__CallFunction(callback, context, [element, i, array])) {\n          result[count++] = element;\n        }\n      }\n    }\n\n    return result;\n  },\n  forEach(callback, context){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length);\n\n    if (typeof callback !== 'function') {\n      throw $__Exception('callback_must_be_callable', ['Array.prototype.forEach']);\n    }\n\n    for (var i=0; i < len; i++) {\n      if (i in array) {\n        $__CallFunction(callback, context, [array[i], i, this]);\n      }\n    }\n  },\n  indexOf(search, fromIndex){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length);\n\n    if (len === 0) {\n      return -1;\n    }\n\n    fromIndex = $__ToInteger(fromIndex);\n    if (fromIndex > len) {\n      return -1;\n    }\n\n    for (var i=fromIndex; i < len; i++) {\n      if (i in array && array[i] === search) {\n        return i;\n      }\n    }\n\n    return -1;\n  },\n  items(){\n    return new ArrayIterator(this, 'key+value');\n  },\n  join(separator){\n    return joinArray(this, arguments.length ? separator : ',');\n  },\n  keys(){\n    return new ArrayIterator(this, 'key');\n  },\n  lastIndexOf(search, fromIndex){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length);\n\n    if (len === 0) {\n      return -1;\n    }\n\n    fromIndex = arguments.length > 1 ? $__ToInteger(fromIndex) : len - 1;\n\n    if (fromIndex >= len) {\n      fromIndex = len - 1;\n    } else if (fromIndex < 0) {\n      fromIndex += fromIndex;\n    }\n\n    for (var i=fromIndex; i >= 0; i--) {\n      if (i in array && array[i] === search) {\n        return i;\n      }\n    }\n\n    return -1;\n  },\n  map(callback, context){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length),\n        result = [];\n\n    if (typeof callback !== 'function') {\n      throw $__Exception('callback_must_be_callable', ['Array.prototype.map']);\n    }\n\n    for (var i=0; i < len; i++) {\n      if (i in array) {\n        result[i] = $__CallFunction(callback, context, [array[i], i, this]);\n      }\n    }\n    return result;\n  },\n  pop(){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length),\n        result = array[len - 1];\n\n    array.length = len - 1;\n    return result;\n  },\n  push(...values){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length),\n        valuesLen = values.length;\n\n    for (var i=0; i < valuesLen; i++) {\n      array[len++] = values[i];\n    }\n    return len;\n  },\n  reduce(callback, initial){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length),\n        result = [];\n\n    if (typeof callback !== 'function') {\n      throw $__Exception('callback_must_be_callable', ['Array.prototype.reduce']);\n    }\n\n    var i = 0;\n    if (arguments.length === 1) {\n      initial = array[0];\n      i = 1;\n    }\n\n    for (; i < len; i++) {\n      if (i in array) {\n        initial = $__CallFunction(callback, this, [initial, array[i], array]);\n      }\n    }\n    return initial;\n  },\n  reduceRight(callback, initial){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length),\n        result = [];\n\n    if (typeof callback !== 'function') {\n      throw $__Exception('callback_must_be_callable', ['Array.prototype.reduceRight']);\n    }\n\n    var i = len - 1;\n    if (arguments.length === 1) {\n      initial = array[i];\n      i--;\n    }\n\n    for (; i >= 0; i--) {\n      if (i in array) {\n        initial = $__CallFunction(callback, this, [initial, array[i], array]);\n      }\n    }\n    return initial;\n  },\n  slice(start, end){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length),\n        result = [];\n\n    start = start === undefined ? 0 : +start || 0;\n    end = end === undefined ? len - 1 : +end || 0;\n\n    if (start < 0) {\n      start += len;\n    }\n\n    if (end < 0) {\n      end += len;\n    } else if (end >= len) {\n      end = len - 1;\n    }\n\n    if (start > end || end < start || start === end) {\n      return [];\n    }\n\n    for (var i=0, count = start - end; i < count; i++) {\n      result[i] = array[i + start];\n    }\n\n    return result;\n  },\n  some(callback, context){\n    var array = $__ToObject(this),\n        len = $__ToUint32(array.length),\n        result = [];\n\n    if (typeof callback !== 'function') {\n      throw $__Exception('callback_must_be_callable', ['Array.prototype.some']);\n    }\n\n    for (var i = 0; i < len; i++) {\n      if (i in array && $__CallFunction(callback, context, [array[i], i, array])) {\n        return true;\n      }\n    }\n\n    return false;\n  },\n  toString(){\n    return joinArray(this, ',');\n  },\n  values(){\n    return new ArrayIterator(this, 'value');\n  },\n  @iterator(){\n    return new ArrayIterator(this, 'value');\n  }\n});\n\n$__setLength(Array.prototype, {\n  every: 1,\n  filter: 1,\n  forEach: 1,\n  indexOf: 1,\n  lastIndexOf: 1,\n  map: 1,\n  reduce: 1,\n  reduceRight: 1,\n  some: 1,\n  reduce: 1\n});\n\nfunction joinArray(array, separator){\n  array = $__ToObject(array);\n\n  var result = '',\n      len = $__ToUint32(array.length);\n\n  if (len === 0) {\n    return result;\n  }\n\n  if (typeof separator !== 'string') {\n    separator = $__ToString(separator);\n  }\n\n  for (var i=0; i < len; i++) {\n    if (i) result += separator;\n    result += $__ToString(array[i]);\n  }\n\n  return result;\n}\n\n\n\nlet ARRAY = 'IteratedObject',\n    INDEX  = 'ArrayIteratorNextIndex',\n    KIND  = 'ArrayIterationKind';\n\n\nlet K = 0x01,\n    V = 0x02,\n    S = 0x04;\n\nlet kinds = {\n  'key': 1,\n  'value': 2,\n  'key+value': 3,\n  'sparse:key': 5,\n  'sparse:value': 6,\n  'sparse:key+value': 7\n};\n\nclass ArrayIterator {\n  constructor(array, kind){\n    array = $__ToObject(array);\n    $__SetInternal(this, ARRAY, array);\n    $__SetInternal(this, INDEX, 0);\n    $__SetInternal(this, KIND, kinds[kind]);\n    this.next = () => next.call(this);\n  }\n\n  next(){\n    if (!$__IsObject(this)) {\n      throw $__Exception('called_on_non_object', ['ArrayIterator.prototype.next']);\n    }\n    if (!$__HasInternal(this, ARRAY) || !$__HasInternal(this, INDEX) || !$__HasInternal(this, KIND)) {\n      throw $__Exception('incompatible_array_iterator', ['ArrayIterator.prototype.next']);\n    }\n    var array = $__GetInternal(this, ARRAY),\n        index = $__GetInternal(this, INDEX),\n        kind = $__GetInternal(this, KIND),\n        len = $__ToUint32(array.length),\n        key = $__ToString(index);\n\n    if (kind & S) {\n      var found = false;\n      while (!found && index < len) {\n        found = index in array;\n        if (!found) {\n          index++;\n        }\n      }\n    }\n    if (index >= len) {\n      $__SetInternal(this, INDEX, Infinity);\n      throw $__StopIteration;\n    }\n    $__SetInternal(this, INDEX, index + 1);\n\n    if (kind & V) {\n      var value = array[key];\n      if (kind & K) {\n        return [key, value];\n      }\n      return value;\n    }\n    return key;\n  }\n\n  @iterator(){\n    return this;\n  }\n}\n\n$__hideEverything(ArrayIterator);\n\nlet next = ArrayIterator.prototype.next;\n}\n";

exports.modules["@boolean"] = "export function Boolean(value){\n  value = $__ToBoolean(value);\n  if ($__IsConstructCall()) {\n    return $__BooleanCreate(value);\n  } else {\n    return value;\n  }\n}\n\n$__setupConstructor(Boolean, $__BooleanProto);\n\n$__defineProps(Boolean.prototype, {\n  toString(){\n    if ($__GetNativeBrand(this) === 'Boolean') {\n      return $__GetPrimitiveValue(this) ? 'true' : 'false';\n    } else {\n      throw $__Exception('not_generic', ['Boolean.prototype.toString']);\n    }\n  },\n  valueOf(){\n    if ($__GetNativeBrand(this) === 'Boolean') {\n      return $__GetPrimitiveValue(this);\n    } else {\n      throw $__Exception('not_generic', ['Boolean.prototype.valueOf']);\n    }\n  }\n});\n";

exports.modules["@console"] = "export function log(...values){\n  var text = '';\n  for (var i=0; i < values.length; i++) {\n    text += $__ToString(values[i]);\n  }\n  $__Signal('write', [text + '\\n', '#fff']);\n}\n\n\nexport function dir(object){\n\n}\n\nlet timers = $__ObjectCreate(null);\n\nexport function time(name){\n  timers[name] = Date.now();\n}\n\nexport function timeEnd(name){\n  if (name in timers) {\n    var duration = Date.now() - timers[name];\n    log(name + ': ' + duration + 'ms');\n  }\n}\n\n\nexport let stdout = {\n  write(text, color){\n    $__Signal('write', [text, color]);\n  },\n  clear(){\n    $__Signal('clear');\n  },\n  backspace(count){\n    $__Signal('backspace', $_ToInteger(count));\n  }\n};\n\n\n$__setupFunctions(log, dir, time, timeEnd, write, clear, backspace);\n";

exports.modules["@date"] = "export function Date(...values){\n  return $__DateCreate(values);\n}\n\n$__setupConstructor(Date, $__DateProto);\n\nexport let now = $__now;\n\n$__defineMethods(Date, [now]);\n\n$__defineProps(Date.prototype, {\n  toString(){\n    if ($__GetNativeBrand(this) === 'Date') {\n      return $__DateToString(this);\n    } else {\n      throw $__Exception('not_generic', ['Date.prototype.toString']);\n    }\n  },\n  valueOf(){\n    if ($__GetNativeBrand(this) === 'Date') {\n      return $__DateToNumber(this);\n    } else {\n      throw $__Exception('not_generic', ['Date.prototype.valueOf']);\n    }\n  }\n});\n\n$__wrapDateMethods(Date.prototype);\n\n\n";

exports.modules["@error"] = "export function Error(message){\n  this.message = message;\n}\n\nexport function EvalError(message){\n  this.message = message;\n}\n\nexport function RangeError(message){\n  this.message = message;\n}\n\nexport function ReferenceError(message){\n  this.message = message;\n}\n\nexport function SyntaxError(message){\n  this.message = message;\n}\n\nexport function TypeError(message){\n  this.message = message;\n}\n\nexport function URIError(message){\n  this.message = message;\n}\n\n\n$__defineProps(Error.prototype, {\n  toString(){\n    return this.name + ': '+this.message;\n  }\n});\n\n$__setupConstructor(Error, $__ErrorProto);\n$__setupConstructor(EvalError, $__EvalErrorProto);\n$__setupConstructor(RangeError, $__RangeErrorProto);\n$__setupConstructor(ReferenceError, $__ReferenceErrorProto);\n$__setupConstructor(SyntaxError, $__SyntaxErrorProto);\n$__setupConstructor(TypeError, $__TypeErrorProto);\n$__setupConstructor(URIError, $__URIErrorProto);\n";

exports.modules["@function"] = "export function Function(...args){\n  return $__FunctionCreate(args);\n}\n\n$__setupConstructor(Function, $__FunctionProto);\n$__defineDirect(Function.prototype, 'name', '', 0);\n\n\nexport function apply(func, receiver, args){\n  ensureFunction(func, '@function.apply');\n  return $__CallFunction(func, receiver, ensureArgs(args));\n}\n\nexport function bind(func, receiver, ...args){\n  ensureFunction(func, '@function.bind');\n  return $__BoundFunctionCreate(func, receiver, args);\n}\n\nexport function call(func, receiver, ...args){\n  ensureFunction(func, '@function.call');\n  return $__CallFunction(func, receiver, args);\n}\n\n$__setupFunctions(apply, bind, call);\n\n\n$__defineProps(Function.prototype, {\n  apply(receiver, args){\n    ensureFunction(this, 'Function.prototype.apply');\n    return $__CallFunction(this, receiver, ensureArgs(args));\n  },\n  bind(receiver, ...args){\n    ensureFunction(this, 'Function.prototype.bind');\n    return $__BoundFunctionCreate(this, receiver, args);\n  },\n  call(receiver, ...args){\n    ensureFunction(this, 'Function.prototype.call');\n    return $__CallFunction(this, receiver, args);\n  },\n  toString(){\n    ensureFunction(this, 'Function.prototype.toString');\n    return $__FunctionToString(this);\n  }\n});\n\n\nfunction ensureArgs(o, name){\n  if (o == null || typeof o !== 'object' || typeof o.length !== 'number') {\n    throw $__Exception('apply_wrong_args', []);\n  }\n\n  var brand = $__GetNativeBrand(o);\n  return brand === 'Array' || brand === 'Arguments' ? o : [...o];\n}\n\nfunction ensureFunction(o, name){\n  if (typeof o !== 'function') {\n    throw $__Exception('called_on_non_function', [name]);\n  }\n}\n";

exports.modules["@globals"] = "let decodeURI          = $__decodeURI,\n    decodeURIComponent = $__decodeURIComponent,\n    encodeURI          = $__encodeURI,\n    encodeURIComponent = $__encodeURIComponent,\n    escape             = $__escape,\n    eval               = $__eval,\n    parseInt           = $__parseInt,\n    parseFloat         = $__parseFloat;\n\nfunction isFinite(number){\n  number = $__ToNumber(number);\n  return number === number && number !== Infinity && number !== -Infinity;\n}\n\nfunction isNaN(number){\n  number = $__ToNumber(number);\n  return number !== number;\n}\n\n\n$__setupFunctions(isFinite, isNaN);\n\n\nexport decodeURI, decodeURIComponent, encodeURI, encodeURIComponent,\n       escape, eval, parseInt, parseFloat, isFinite, isNaN;\n";

exports.modules["@iter"] = "import hasOwn from '@reflect';\n\nsymbol @iterator;\nexport let iterator = @iterator;\n$__iterator = @iterator;\nexport function Iterator(){}\n\n$__defineDirect(Iterator, 'prototype', Iterator.prototype, 0);\n$__defineDirect(Iterator.prototype, @iterator, function iterator(){ return this }, 0);\n$__SetNativeBrand(Iterator.prototype, 'NativeIterator');\n\n\nexport function keys(obj){\n  return {\n    @iterator: ()=> (function*(){\n      for (let x in obj) {\n        if (hasOwn(obj, x)) {\n          yield x;\n        }\n      }\n    })()\n  };\n}\n\nexport function values(obj){\n  return {\n    @iterator: ()=> (function*(){\n      for (let x in obj) {\n        if (hasOwn(obj, x)) {\n          yield obj[x];\n        }\n      }\n    })()\n  };\n}\n\nexport function items(obj){\n  return {\n    @iterator: ()=> (function*(){\n      for (let x in obj) {\n        if (hasOwn(obj, x)) {\n          yield [x, obj[x]];\n        }\n      }\n    })()\n  };\n}\n\nexport function allKeys(obj){\n  return {\n    @iterator: ()=> (function*(){\n      for (let x in obj) {\n        yield x;\n      }\n    })()\n  };\n}\n\nexport function allValues(obj){\n  return {\n    @iterator: ()=> (function*(){\n      for (let x in obj) {\n        yield obj[x];\n      }\n    })()\n  };\n}\n\nexport function allItems(obj){\n  return {\n    @iterator: ()=> (function*(){\n      for (let x in obj) {\n        yield [x, obj[x]];\n      }\n    })()\n  };\n}\n";

exports.modules["@json"] = "export let JSON = {};\n\n$__SetNativeBrand(JSON, 'NativeJSON');\n\nlet ReplacerFunction,\n    PropertyList,\n    stack,\n    indent,\n    gap;\n\nfunction J(value){\n  if (stack.has(value)) {\n    throw $__Exception('circular_structure', []);\n  }\n\n  var stepback = indent,\n      partial = [],\n      brackets;\n\n  indent += gap;\n  stack.add(value);\n\n  if ($__GetNativeBrand(value) === 'Array') {\n    brackets = ['[', ']'];\n\n    for (var i=0, len = value.length; i < len; i++) {\n      var prop = Str(i, value);\n      partial[i] = prop === undefined ? 'null' : prop;\n    }\n  } else {\n    var keys = PropertyList || $__Enumerate(value, false, true),\n        colon = gap ? ': ' : ':';\n\n    brackets = ['{', '}'];\n\n    for (var i=0, len=keys.length; i < len; i++) {\n      var prop = Str(keys[i], value);\n      if (prop !== undefined) {\n        partial.push($__Quote(keys[i]) + colon + prop);\n      }\n    }\n  }\n\n  if (!partial.length) {\n    stack.delete(value);\n    indent = stepback;\n    return brackets[0]+brackets[1];\n  } else if (!gap) {\n    stack.delete(value);\n    indent = stepback;\n    return brackets[0]+partial.join(',')+brackets[1];\n  } else {\n    var final = '\\n' + indent + partial.join(',\\n' + indent) + '\\n' + stepback;\n    stack.delete(value);\n    indent = stepback;\n    return brackets[0]+final+brackets[1];\n  }\n}\n\n\nfunction Str(key, holder){\n  var v = holder[key];\n  if ($__Type(v) === 'Object') {\n    var toJSON = v.toJSON;\n    if (typeof toJSON === 'function') {\n      v = $__CallFunction(toJSON, v, [key]);\n    }\n  }\n\n  if (ReplacerFunction) {\n    v = $__CallFunction(ReplacerFunction, holder, [key, v]);\n  }\n\n  if ($__Type(v) === 'Object') {\n    var brand = $__GetNativeBrand(v);\n    if (brand === 'Number') {\n      v = $__ToNumber(v);\n    } else if (brand === 'String') {\n      v = $__ToString(v);\n    } else if (brand === 'Boolean') {\n      v = $__GetPrimitiveValue(v);\n    }\n  }\n\n\n  if (v === null) {\n    return 'null';\n  } else if (v === true) {\n    return 'true';\n  } else if (v === false) {\n    return 'false';\n  }\n\n  var type = typeof v;\n  if (type === 'string') {\n    return $__Quote(v);\n  } else if (type === 'number') {\n    return v !== v || v === Infinity || v === -Infinity ? 'null' : '' + v;\n  } else if (type === 'object') {\n    return J(v);\n  }\n\n}\n\n\nexport function stringify(value, replacer, space){\n  ReplacerFunction = undefined;\n  PropertyList = undefined;\n  stack = new Set;\n  indent = '';\n\n  if ($__Type(replacer) === 'Object') {\n    if (typeof replacer === 'function') {\n      ReplacerFunction = replacer;\n    } else if ($__GetNativeBrand(replacer) === 'Array') {\n      let props = new Set;\n\n      for (let v of replacer) {\n        var item,\n            type = $__Type(v);\n\n        if (type === 'String') {\n          item = v;\n        } else if (type === 'Number') {\n          item = v + '';\n        } else if (type === 'Object') {\n          let brand = $__GetNativeBrand(v);\n          if (brand === 'String' || brand === 'Number') {\n            item = $__ToString(v);\n          }\n        }\n\n        if (item !== undefined) {\n          props.add(item);\n        }\n      }\n\n      PropertyList = [...props];\n    }\n  }\n\n  if ($__Type(space) === 'Object') {\n    space = $__GetPrimitiveValue(space);\n  }\n\n  if ($__Type(space) === 'String') {\n    gap = $__StringSlice(space, 0, 10);\n  } else if ($__Type(space) === 'Number') {\n    space |= 0;\n    space = space > 10 ? 10 : space < 1 ? 0 : space\n    gap = ' '.repeat(space);\n  } else {\n    gap = '';\n  }\n\n  return Str('', { '': value });\n}\n\n$__defineMethods(JSON, [stringify]);\n";

exports.modules["@map"] = "import iterator from '@iter';\nsymbol @iterator = iterator;\n\n\nexport function Map(iterable){\n  var map;\n  if ($__IsConstructCall()) {\n    map = this;\n  } else {\n    if (this == null || this === $__MapProto) {\n      map = $__ObjectCreate($__MapProto) ;\n    } else {\n      map = $__ToObject(this);\n    }\n  }\n\n  if ($__HasInternal(map, 'MapData')) {\n    throw $__Exception('double_initialization', ['Map'])\n  }\n\n  $__MapInitialization(map, iterable);\n  return map;\n}\n\n\n$__setupConstructor(Map, $__MapProto);\n{\n$__defineProps(Map.prototype, {\n  clear(){\n    ensureMap(this, 'clear');\n    return $__MapClear(this, key);\n  },\n  set(key, value){\n    ensureMap(this, 'set');\n    return $__MapSet(this, key, value);\n  },\n  get(key){\n    ensureMap(this, 'get');\n    return $__MapGet(this, key);\n  },\n  has(key){\n    ensureMap(this, 'has');\n    return $__MapHas(this, key);\n  },\n  delete: function(key){\n    ensureMap(this, 'delete');\n    return $__MapDelete(this, key);\n  },\n  items(){\n    ensureMap(this, 'items');\n    return new MapIterator(this, 'key+value');\n  },\n  keys(){\n    ensureMap(this, 'keys');\n    return new MapIterator(this, 'key');\n  },\n  values(){\n    ensureMap(this, 'values');\n    return new MapIterator(this, 'value');\n  },\n  @iterator(){\n    ensureMap(this, '@iterator');\n    return new MapIterator(this, 'key+value');\n  }\n});\n\n$__defineDirect(Map.prototype.delete, 'name', 'delete', 0);\n\n$__DefineOwnProperty(Map.prototype, 'size', {\n  configurable: true,\n  enumerable: false,\n  get: function(){\n    if (this === $__MapProto) {\n      return 0;\n    }\n    return $__MapSize(this);\n  },\n  set: void 0\n});\n\nlet MAP = 'Map',\n    KEY  = 'MapNextKey',\n    KIND  = 'MapIterationKind';\n\n\nlet K = 0x01,\n    V = 0x02;\n\nlet kinds = {\n  'key': 1,\n  'value': 2,\n  'key+value': 3\n};\n\n\nfunction MapIterator(map, kind){\n  map = $__ToObject(map);\n  $__SetInternal(this, MAP, map);\n  $__SetInternal(this, KEY,  $__MapSigil());\n  $__SetInternal(this, KIND, kinds[kind]);\n  this.next = () => next.call(this);\n}\n\n$__defineProps(MapIterator.prototype, {\n  next(){\n\n    if (!$__IsObject(this)) {\n      throw $__Exception('called_on_non_object', ['MapIterator.prototype.next']);\n    }\n    if (!$__HasInternal(this, MAP) || !$__HasInternal(this, KEY) || !$__HasInternal(this, KIND)) {\n      throw $__Exception('called_on_incompatible_object', ['MapIterator.prototype.next']);\n    }\n    var map = $__GetInternal(this, MAP),\n        key = $__GetInternal(this, KEY),\n        kind = $__GetInternal(this, KIND);\n\n    var item = $__MapNext(map, key);\n    $__SetInternal(this, KEY, item[0]);\n\n    if (kind & V) {\n      if (kind & K) {\n        return item;\n      }\n      return item[1];\n    }\n    return item[0];\n  },\n  @iterator(){\n    return this;\n  }\n});\n\nlet next = MapIterator.prototype.next;\n\nfunction ensureMap(o, name){\n  if (!o || typeof o !== 'object' || !$__HasInternal(o, 'MapData')) {\n    throw Exception('called_on_incompatible_object', ['Map.prototype.'+name]);\n  }\n}\n}\n";

exports.modules["@math"] = "export let Math = $__MathCreate();\n\n\nconst E       = 2.718281828459045,\n      LN10    = 2.302585092994046,\n      LN2     = 0.6931471805599453,\n      LOG10E  = 0.4342944819032518,\n      LOG2E   = 1.4426950408889634,\n      PI      = 3.141592653589793,\n      SQRT1_2 = 0.7071067811865476,\n      SQRT2   = 1.4142135623730951;\n\n\nlet abs    = $__abs,\n    acos   = $__acos,\n    acosh  = $__acosh,\n    asinh  = $__asinh,\n    asin   = $__asin,\n    atan   = $__atan,\n    atanh  = $__atanh,\n    atan2  = $__atan2,\n    ceil   = $__ceil,\n    cos    = $__cos,\n    cosh   = $__cosh,\n    exp    = $__exp,\n    expm1  = $__expm1,\n    floor  = $__floor,\n    hypot  = $__hypot,\n    log    = $__log,\n    log2   = $__log2,\n    log10  = $__log10,\n    log1p  = $__log1p,\n    max    = $__max,\n    min    = $__min,\n    pow    = $__pow,\n    random = $__random,\n    round  = $__round,\n    sign   = $__sign,\n    sinh   = $__sinh,\n    sin    = $__sin,\n    sqrt   = $__sqrt,\n    tan    = $__tan,\n    tanh   = $__tanh,\n    trunc  = $__trunc;\n\nexport E, LN10, LN2, LOG10E, LOG2E, PI, SQRT1_2, SQRT2;\n\nexport abs, acos, acosh, asinh, asin, atan, atanh,\n       atan2, ceil, cos, cosh, exp, expm1, floor, hypot,\n       log, log2, log10, log1p, max, min, pow, rando,\n       round, sign, sinh, sin, sqrt,tan, tanh, trunc;\n";

exports.modules["@number"] = "export function Number(value){\n  value = $__ToNumber(value);\n  if ($__IsConstructCall()) {\n    return $__NumberCreate(value);\n  } else {\n    return value;\n  }\n}\n\n$__setupConstructor(Number, $__NumberProto);\n\n\nexport function isNaN(number){\n  return number !== number;\n}\n\nexport function isFinite(number){\n  return typeof value === 'number'\n      && value === value\n      && value < POSITIVE_INFINITY\n      && value > NEGATIVE_INFINITY;\n}\n\nexport function isInteger(value) {\n  return typeof value === 'number'\n      && value === value\n      && value > -MAX_INTEGER\n      && value < MAX_INTEGER\n      && value | 0 === value;\n}\n\nexport function toInteger(value){\n  return (value / 1 || 0) | 0;\n}\n\n$__defineMethods(Number, [isNaN, isFinite, isInteger, toInteger]);\n\n\nexport let\n  EPSILON           = 2.220446049250313e-16,\n  MAX_INTEGER       = 9007199254740992,\n  MAX_VALUE         = 1.7976931348623157e+308,\n  MIN_VALUE         = 5e-324,\n  NaN               = +'NaN',\n  NEGATIVE_INFINITY = 1 / 0,\n  POSITIVE_INFINITY = 1 / -0;\n\n$__defineConstants(Number, {\n  EPSILON          : EPSILON,\n  MAX_INTEGER      : MAX_INTEGER,\n  MAX_VALUE        : MAX_VALUE,\n  MIN_VALUE        : MIN_VALUE,\n  NaN              : NaN,\n  NEGATIVE_INFINITY: NEGATIVE_INFINITY,\n  POSITIVE_INFINITY: POSITIVE_INFINITY\n});\n\n\n\n$__defineProps(Number.prototype, {\n  toString(radix){\n    if ($__GetNativeBrand(this) === 'Number') {\n      var number = $__GetPrimitiveValue(this);\n      radix = $__ToInteger(radix);\n      return $__NumberToString(number, radix);\n    } else {\n      throw $__Exception('not_generic', ['Number.prototype.toString']);\n    }\n  },\n  valueOf(){\n    if ($__GetNativeBrand(this) === 'Number') {\n      return $__GetPrimitiveValue(this);\n    } else {\n      throw $__Exception('not_generic', ['Number.prototype.valueOf']);\n    }\n  },\n  clz() {\n    var x = $__ToNumber(this);\n    if (!x || !isFinite(x)) {\n      return 32;\n    } else {\n      x = x < 0 ? x + 1 | 0 : x | 0;\n      x -= (x / 0x100000000 | 0) * 0x100000000;\n      return 32 - $__NumberToString(x, 2).length;\n    }\n  }\n});\n";

exports.modules["@object"] = "export function Object(value){\n  if ($__IsConstructCall()) {\n    return {};\n  } else if (value == null) {\n    return {};\n  } else {\n    return $__ToObject(value);\n  }\n}\n\n$__setupConstructor(Object, $__ObjectProto);\n\n\n\nexport function assign(target, source){\n  ensureObject(target, 'Object.assign');\n  source = $__ToObject(source);\n  for (let [i, key] of $__Enumerate(source, false, true)) {\n    let prop = source[key];\n    if (typeof prop === 'function' && $__GetInternal(prop, 'HomeObject')) {\n      // TODO\n    }\n    target[key] = prop;\n  }\n  return target;\n}\n\nexport function create(prototype, properties){\n  if (typeof prototype !== 'object') {\n    throw $__Exception('proto_object_or_null', [])\n  }\n\n  var object = $__ObjectCreate(prototype);\n\n  if (properties !== undefined) {\n    ensureDescriptor(properties);\n\n    for (var k in properties) {\n      var desc = properties[k];\n      ensureDescriptor(desc);\n      $__DefineOwnProperty(object, key, desc);\n    }\n  }\n\n  return object;\n}\n\nexport function defineProperty(object, key, property){\n  ensureObject(object, 'Object.defineProperty');\n  ensureDescriptor(property);\n  key = $__ToPropertyName(key);\n  $__DefineOwnProperty(object, key, property);\n  return object;\n}\n\nexport function defineProperties(object, properties){\n  ensureObject(object, 'Object.defineProperties');\n  ensureDescriptor(properties);\n\n  for (var key in properties) {\n    var desc = properties[key];\n    ensureDescriptor(desc);\n    $__DefineOwnProperty(object, key, desc);\n  }\n\n  return object;\n}\n\nexport function freeze(object){\n  ensureObject(object, 'Object.freeze');\n  var props = $__Enumerate(object, false, false);\n\n  for (var i=0; i < props.length; i++) {\n    var desc = $__GetOwnProperty(object, props[i]);\n    if (desc.configurable) {\n      desc.configurable = false;\n      if ('writable' in desc) {\n        desc.writable = false;\n      }\n      $__DefineOwnProperty(object, props[i], desc);\n    }\n  }\n\n  $__SetExtensible(object, false);\n  return object;\n}\n\nexport function getOwnPropertyDescriptor(object, key){\n  ensureObject(object, 'Object.getOwnPropertyDescriptor');\n  key = $__ToPropertyName(key);\n  return $__GetOwnProperty(object, key);\n}\n\nexport function getOwnPropertyNames(object){\n  ensureObject(object, 'Object.getOwnPropertyNames');\n  return $__Enumerate(object, false, false);\n}\n\nexport function getPropertyDescriptor(object, key){\n  ensureObject(object, 'Object.getPropertyDescriptor');\n  key = $__ToPropertyName(key);\n  return $__GetProperty(object, key);\n}\n\nexport function getPropertyNames(object){\n  ensureObject(object, 'Object.getPropertyNames');\n  return $__Enumerate(object, true, false);\n}\n\nexport function getPrototypeOf(object){\n  ensureObject(object, 'Object.getPrototypeOf');\n  return $__GetPrototype(object);\n}\n\nexport function isExtensible(object){\n  ensureObject(object, 'Object.isExtensible');\n  return $__GetExtensible(object);\n}\n\nexport function isFrozen(object){\n  ensureObject(object, 'Object.isFrozen');\n  if ($__GetExtensible(object)) {\n    return false;\n  }\n\n  var props = $__Enumerate(object, false, false);\n\n  for (var i=0; i < props.length; i++) {\n    var desc = $__GetOwnProperty(object, props[i]);\n    if (desc) {\n      if (desc.configurable || 'writable' in desc && desc.writable) {\n        return false;\n      }\n    }\n  }\n\n  return true;\n}\n\nexport function isSealed(object){\n  ensureObject(object, 'Object.isSealed');\n  if ($__GetExtensible(object)) {\n    return false;\n  }\n\n  var props = $__Enumerate(object, false, false);\n\n  for (var i=0; i < props.length; i++) {\n    var desc = $__GetOwnProperty(object, props[i]);\n    if (desc && desc.configurable) {\n      return false;\n    }\n  }\n\n  return true;\n}\n\nexport function keys(object){\n  ensureObject(object, 'Object.keys');\n  return $__Enumerate(object, false, true);\n}\n\nexport function preventExtensions(object){\n  ensureObject(object, 'Object.preventExtensions');\n  $__SetExtensible(object, false);\n  return object;\n}\n\nexport function seal(object){\n  ensureObject(object, 'Object.seal');\n\n  var desc = { configurable: false },\n      props = $__Enumerate(object, false, false);\n\n  for (var i=0; i < props.length; i++) {\n    $__DefineOwnProperty(object, props[i], desc);\n  }\n\n  $__SetExtensible(object, false);\n  return object;\n}\n\n\n$__defineMethods(Object, [assign, create, defineProperty, defineProperties, freeze,\n  getOwnPropertyDescriptor, getOwnPropertyNames, getPropertyDescriptor, getPropertyNames,\n  getPrototypeOf, isExtensible, isFrozen, isSealed, keys, preventExtensions, seal]);\n\n\nexport function isPrototypeOf(object, prototype){\n  while (prototype) {\n    prototype = $__GetPrototype(prototype);\n    if (prototype === object) {\n      return true;\n    }\n  }\n  return false;\n}\n\nexport function hasOwnProperty(object, key){\n  var object = $__ToObject(object);\n  return $__HasOwnProperty(object, key);\n}\n\nexport function propertyIsEnumerable(object, key){\n  var object = $__ToObject(object);\n  return ($__GetPropertyAttributes(object, key) & 0x01) !== 0;\n}\n\n$__setupFunctions(isPrototypeOf, hasOwnProperty, propertyIsEnumerable);\n\n\n\n$__defineProps(Object.prototype, {\n  toString(){\n    if (this === undefined) {\n      return '[object Undefined]';\n    } else if (this === null) {\n      return '[object Null]';\n    } else {\n      return '[object '+$__GetBrand($__ToObject(this))+']';\n    }\n  },\n  isPrototypeOf(object){\n    while (object) {\n      object = $__GetPrototype(object);\n      if (object === this) {\n        return true;\n      }\n    }\n    return false;\n  },\n  toLocaleString(){\n    return this.toString();\n  },\n  valueOf(){\n    return $__ToObject(this);\n  },\n  hasOwnProperty(key){\n    var object = $__ToObject(this);\n    return $__HasOwnProperty(object, key);\n  },\n  propertyIsEnumerable(key){\n    var object = $__ToObject(this);\n    return ($__GetPropertyAttributes(this, key) & 0x01) !== 0;\n  }\n});\n\n\nfunction ensureObject(o, name){\n  var type = typeof o;\n  if (type === 'object' ? o === null : type !== 'function') {\n    throw $__Exception('called_on_non_object', [name]);\n  }\n}\n\nfunction ensureDescriptor(o){\n  if (o === null || typeof o !== 'object') {\n    throw $__Exception('property_desc_object', [typeof o])\n  }\n}\n";

exports.modules["@reflect"] = "\nexport function Proxy(target, handler){\n  ensureObject(target, 'Proxy');\n  ensureObject(handler, 'Proxy');\n  return $__ProxyCreate(target, handler);\n}\n\n\nfunction makeDefiner(desc){\n  return (object, key, value) => {\n    desc.value = value;\n    $__DefineOwnProperty(object, key, desc);\n    desc.value = undefined;\n    return object;\n  };\n}\n\n\nlet ___ = 0b0000,\n    E__ = 0b0001,\n    _C_ = 0b0010,\n    EC_ = 0b0011,\n    __W = 0b0100,\n    E_W = 0b0101,\n    _CW = 0b0110,\n    ECW = 0b0111,\n    __A = 0b1000,\n    E_A = 0b1001,\n    _CA = 0b1010,\n    ECA = 0b1011;\n\nlet defineNormal = makeDefiner({ writable: true,\n                                 enumerable: true,\n                                 configurable: true });\nlet sealer = { configurable: false },\n    freezer = { configurable: false, writable: false };\n\n\nexport class Handler {\n  constructor(){}\n\n  getOwnPropertyDescriptor(target, name){\n    throw $__Exception('missing_fundamental_trap', ['getOwnPropertyDescriptor']);\n  }\n\n  getOwnPropertyNames(target){\n    throw $__Exception('missing_fundamental_trap', ['getOwnPropertyNames']);\n  }\n\n  getPrototypeOf(target){\n    throw $__Exception('missing_fundamental_trap', ['getPrototypeOf']);\n  }\n\n  defineProperty(target, name, desc){\n    throw $__Exception('missing_fundamental_trap', ['defineProperty']);\n  }\n\n  deleteProperty(target, name){\n    throw $__Exception('missing_fundamental_trap', ['deleteProperty']);\n  }\n\n  preventExtensions(target){\n    throw $__Exception('missing_fundamental_trap', ['preventExtensions']);\n  }\n\n  isExtensible(target){\n    throw $__Exception('missing_fundamental_trap', ['isExtensible']);\n  }\n\n  apply(target, thisArg, args){\n    throw $__Exception('missing_fundamental_trap', ['apply']);\n  }\n\n  seal(target) {\n    if (!this.preventExtensions(target)) return false;\n\n    var props = this.getOwnPropertyNames(target),\n        len = +props.length;\n\n    for (var i = 0; i < len; i++) {\n      success = success && this.defineProperty(target, props[i], sealer);\n    }\n    return success;\n  }\n\n  freeze(target){\n    if (!this.preventExtensions(target)) return false;\n\n    var props = this.getOwnPropertyNames(target),\n        len = +props.length;\n\n    for (var i = 0; i < len; i++) {\n      var name = props[i],\n          desc = this.getOwnPropertyDescriptor(target, name);\n\n      if (desc) {\n        success = success && this.defineProperty(target, name, 'writable' in desc || 'value' in desc ? freezer : sealer);\n      }\n    }\n\n    return success;\n  }\n\n  isSealed(target){\n    var props = this.getOwnPropertyNames(target),\n        len = +props.length;\n\n    for (var i = 0; i < len; i++) {\n      var desc = this.getOwnPropertyDescriptor(target, props[i]);\n\n      if (desc && desc.configurable) {\n        return false;\n      }\n    }\n    return !this.isExtensible(target);\n  }\n\n  isFrozen(target){\n    var props = this.getOwnPropertyNames(target),\n        len = +props.length;\n\n    for (var i = 0; i < len; i++) {\n      var desc = this.getOwnPropertyDescriptor(target, props[i]);\n\n      if (desc.configurable || ('writable' in desc || 'value' in desc) && desc.writable) {\n        return false;\n      }\n    }\n    return !this.isExtensible(target);\n  }\n\n  has(target, name){\n    var desc = this.getOwnPropertyDescriptor(target, name);\n    if (desc !== undefined) {\n      return true;\n    }\n    var proto = $__GetPrototype(target);\n    return proto === null ? false : has(proto, name);\n  }\n\n  hasOwn(target, name){\n    return this.getOwnPropertyDescriptor(target, name) !== undefined;\n  }\n\n  get(target, name, receiver){\n    receiver = receiver || target;\n\n    var desc = this.getOwnPropertyDescriptor(target, name);\n    if (desc === undefined) {\n      var proto = $__GetPrototype(target);\n      return proto === null ? undefined : this.get(proto, name, receiver);\n    }\n    if ('writable' in desc || 'value' in desc) {\n      return desc.value;\n    }\n    var getter = desc.get;\n    return getter === undefined ? undefined : $__CallFunction(getter, receiver, []);\n  }\n\n  set(target, name, value, receiver){\n    var ownDesc = this.getOwnPropertyDescriptor(target, name);\n\n    if (ownDesc !== undefined) {\n      if ('get' in ownDesc || 'set' in ownDesc) {\n        var setter = ownDesc.set;\n        if (setter === undefined) return false;\n        $__CallFunction(setter, receiver, [value]);\n        return true;\n      }\n\n      if (ownDesc.writable === false) {\n        return false;\n      } else if (receiver === target) {\n        $__DefineOwnProperty(receiver, name, { value: value });\n        return true;\n      } else {\n        $__DefineOwnProperty(receiver, name, newDesc);\n        var extensible = $__GetExtensible(receiver);\n        extensible && defineNormal(receiver, name, value);\n        return extensible;\n      }\n    }\n\n    var proto = $__GetPrototype(target);\n    if (proto === null) {\n      var extensible = $__GetExtensible(receiver);\n      extensible && defineNormal(receiver, name, value);\n      return extensible;\n    }\n\n    return this.set(proto, name, value, receiver);\n  }\n\n  enumerate(target){\n    var result = this.getOwnPropertyNames(target),\n        len = +result.length,\n        out = [];\n\n    for (var i = 0; i < len; i++) {\n      var name = $__ToString(result[i]),\n          desc = this.getOwnPropertyDescriptor(name);\n\n      if (desc != null && !desc.enumerable) {\n        out.push(name);\n      }\n    }\n\n    var proto = $__GetPrototype(target);\n    return proto === null ? out : out.concat(enumerate(proto));\n  }\n\n  iterate(target){\n    var result = this.enumerate(target),\n        len = +result.length,\n        i = 0;\n\n    return {\n      next(){\n        if (i === len) throw StopIteration;\n        return result[i++];\n      }\n    };\n  }\n\n  keys(target){\n    var result = this.getOwnPropertyNames(target),\n        len = +result.length,\n        result = [];\n\n    for (var i = 0; i < len; i++) {\n      var name = $__ToString(result[i]),\n          desc = this.getOwnPropertyDescriptor(name);\n\n      if (desc != null && desc.enumerable) {\n        result.push(name);\n      }\n    }\n    return result;\n  }\n\n  construct(target, args) {\n    var proto = this.get(target, 'prototype', target),\n        instance = $__Type(proto) === 'Object' ? $__ObjectCreate(proto) : {},\n        result = this.apply(target, instance, args);\n\n    return $__Type(result) === 'Object' ? result : instance;\n  }\n}\n\n\nexport function apply(target, thisArg, args){\n  ensureFunction(target, '@Reflect.apply');\n  return $__CallFunction(target, thisArg, ensureArgs(args));\n}\n\nexport function construct(target, args){\n  ensureFunction(target, '@Reflect.construct');\n  return $__Construct(target, ensureArgs(args));\n}\n\nexport function defineProperty(target, name, desc){\n  ensureObject(target, '@Reflect.defineProperty');\n  ensureDescriptor(desc);\n  name = $__ToPropertyName(name);\n  $__DefineOwnProperty(target, name, desc);\n  return object;\n}\n\nexport function deleteProperty(target, name){\n  ensureObject(target, '@Reflect.deleteProperty');\n  name = $__ToPropertyName(name);\n  return $__Delete(target, name, false);\n}\n\nexport function enumerate(target){\n  return $__Enumerate($__ToObject(target), false, false);\n}\n\nexport function freeze(target){\n  if (Type(target) !== 'Object') return false;\n  var success = $__SetExtensible(target, false);\n  if (!success) return success;\n\n  var props = $__Enumerate(target, false, false);\n      len = props.length;\n\n  for (var i = 0; i < len; i++) {\n    var desc = $__GetOwnProperty(target, props[i]),\n        attrs = 'writable' in desc || 'value' in desc ? freezer : desc !== undefined ? sealer : null;\n\n    if (attrs !== null) {\n      success = success && $__DefineOwnProperty(target, props[i], attrs);\n    }\n  }\n  return success;\n}\n\nexport function get(target, name, receiver){\n  target = $__ToObject(target);\n  name = $__ToPropertyName(name);\n  receiver = receiver === undefined ? undefined : $__ToObject(receiver);\n  return $__GetP(target, name, receiver);\n}\n\nexport function getOwnPropertyDescriptor(target, name){\n  ensureObject(target, '@Reflect.getOwnPropertyDescriptor');\n  name = $__ToPropertyName(name);\n  return $__GetOwnProperty(target, name);\n}\n\nexport function getOwnPropertyNames(target){\n  ensureObject(target, '@Reflect.getOwnPropertyNames');\n  return $__Enumerate(target, false, false);\n}\n\nexport function getPrototypeOf(target){\n  ensureObject(target, '@Reflect.getPrototypeOf');\n  return $__GetPrototype(target);\n}\n\nexport function has(target, name){\n  target = $__ToObject(target);\n  name = $__ToPropertyName(name);\n  return name in target;\n}\n\nexport function hasOwn(target, name){\n  target = $__ToObject(target);\n  name = $__ToPropertyName(name);\n  return $__HasOwnProperty(target, name);\n}\n\nexport function isFrozen(target){\n  ensureObject(target, '@Reflect.isFrozen');\n  if ($__GetExtensible(target)) {\n    return false;\n  }\n\n  var props = $__Enumerate(target, false, false);\n\n  for (var i=0; i < props.length; i++) {\n    var desc = $__GetOwnProperty(target, props[i]);\n    if (desc) {\n      if (desc.configurable || 'writable' in desc && desc.writable) {\n        return false;\n      }\n    }\n  }\n\n  return true;\n}\n\nexport function isSealed(target){\n  ensureObject(target, '@Reflect.isSealed');\n  if ($__GetExtensible(target)) {\n    return false;\n  }\n\n  var props = $__Enumerate(target, false, false);\n\n  for (var i=0; i < props.length; i++) {\n    var desc = $__GetOwnProperty(target, props[i]);\n    if (desc && desc.configurable) {\n      return false;\n    }\n  }\n\n  return true;\n}\n\nexport function isExtensible(target){\n  ensureObject(target, '@Reflect.isExtensible');\n  return $__GetExtensible(target);\n}\n\nexport function keys(target){\n  ensureObject(target, '@Reflect.keys');\n  return $__Enumerate(target, false, true);\n}\n\nexport function preventExtensions(target){\n  if (Type(target) !== 'Object') return false;\n  return $__SetExtensible(target, false);\n}\n\nexport function seal(target){\n  if (Type(target) !== 'Object') return false;\n  var success = $__SetExtensible(target, false);\n  if (!success) return success;\n\n  var props = $__Enumerate(target, false, false);\n      len = props.length;\n\n  for (var i = 0; i < len; i++) {\n    success = success && $__DefineOwnProperty(target, props[i], sealer);\n  }\n  return success;\n}\n\nexport function set(target, name, value, receiver){\n  target = $__ToObject(target);\n  name = $__ToPropertyName(name);\n  receiver = receiver === undefined ? undefined : $__ToObject(receiver);\n  return $__SetP(target, name, value, receiver);\n}\n\n\n\n$__setupFunctions(getOwnPropertyDescriptor, getOwnPropertyNames, getPrototypeOf,\n  defineProperty, deleteProperty, preventExtensions, isExtensible, apply, enumerate,\n  freeze, seal, isFrozen, isSealed, has, hasOwn, keys, get, set, construct);\n\n\n\nfunction ensureObject(o, name){\n  var type = typeof o;\n  if (type === 'object' ? o === null : type !== 'function') {\n    throw $__Exception('called_on_non_object', [name]);\n  }\n}\n\nfunction ensureDescriptor(o){\n  if (o === null || typeof o !== 'object') {\n    throw $__Exception('property_desc_object', [typeof o])\n  }\n}\n\n\nfunction ensureArgs(o, name){\n  if (o == null || typeof o !== 'object' || typeof $__getDirect(o, 'length') !== 'number') {\n    throw $__Exception('apply_wrong_args', []);\n  }\n\n  var brand = $__GetNativeBrand(o);\n  return brand === 'Array' || brand === 'Arguments' ? o : [...o];\n}\n\nfunction ensureFunction(o, name){\n  if (typeof o !== 'function') {\n    throw $__Exception('called_on_non_function', [name]);\n  }\n}\n";

exports.modules["@regexp"] = "export function RegExp(pattern, flags){\n  if ($__IsConstructCall()) {\n    if (pattern === undefined) {\n      pattern = '';\n    } else if (typeof pattern === 'string') {\n    } else if (typeof pattern === 'object' && $__GetNativeBrand(pattern) === 'RegExp') {\n      if (flags !== undefined) {\n        throw $__Exception('regexp_flags', []);\n      }\n    } else {\n      pattern = $__ToString(pattern);\n    }\n    return $__RegExpCreate(pattern, flags);\n  } else {\n    if (flags === undefined && pattern) {\n      if (typeof pattern === 'object' && $__GetNativeBrand(pattern) === 'RegExp') {\n        return pattern;\n      }\n    }\n    return $__RegExpCreate(pattern, flags);\n  }\n}\n\n$__setupConstructor(RegExp, $__RegExpProto);\n$__wrapRegExpMethods(RegExp.prototype);\n\n$__defineProps(RegExp.prototype, {\n  toString(){\n    if ($__GetNativeBrand(this) === 'RegExp') {\n      return $__RegExpToString(this);\n    } else {\n      throw $__Exception('not_generic', ['RegExp.prototype.toString']);\n    }\n  }\n});\n";

exports.modules["@set"] = "import Map from '@map';\nimport iterator from '@iter';\nsymbol @iterator = iterator;\n\n\nexport function Set(iterable){\n  var set;\n  if ($__IsConstructCall()) {\n    set = this;\n  } else {\n    if (this == null || this === $__SetProto) {\n      set = $__ObjectCreate($__SetProto) ;\n    } else {\n      set = $__ToObject(this);\n    }\n  }\n  if ($__HasInternal(set, 'SetData')) {\n    throw $__Exception('double_initialization', ['Set']);\n  }\n\n  if (iterable !== undefined) {\n    iterable = $__ToObject(iterable);\n    $__SetInternal(set, 'SetData', new Map(iterable.values()));\n  } else {\n    $__SetInternal(set, 'SetData', new Map);\n  }\n  return set;\n}\n\n\n$__setupConstructor(Set, $__SetProto);\n{\n$__defineProps(Set.prototype, {\n  clear(){\n    return $__MapClear(ensureSet(this));\n  },\n  add(key){\n    return $__MapSet(ensureSet(this), key, key);\n  },\n  has(key){\n    return $__MapHas(ensureSet(this), key);\n  },\n  delete: function(key){\n    return $__MapDelete(ensureSet(this), key);\n  },\n  items(){\n    return new SetIterator(this, 'key+value');\n  },\n  keys(){\n    return new SetIterator(this, 'key');\n  },\n  values(){\n    return new SetIterator(this, 'value');\n  },\n  @iterator(){\n    return new SetIterator(this, 'value');\n  }\n});\n\n$__defineDirect(Set.prototype.delete, 'name', 'delete', 0);\n\n$__DefineOwnProperty(Set.prototype, 'size', {\n  configurable: true,\n  enumerable: false,\n  get: function size(){\n    if (this === $__SetProto) {\n      return 0;\n    }\n    return $__MapSize(ensureSet(this));\n  },\n  set: void 0\n});\n\nfunction ensureSet(o, name){\n  var type = typeof o;\n  if (type === 'object' ? o === null : type !== 'function') {\n    throw $__Exception('called_on_non_object', [name]);\n  }\n  var data = $__GetInternal(o, 'SetData');\n  if (!data) {\n    throw $__Exception('called_on_incompatible_object', [name]);\n  }\n  return data;\n}\n\nlet SET = 'Set',\n    KEY  = 'SetNextKey',\n    KIND  = 'SetIterationKind';\n\nlet K = 0x01,\n    V = 0x02,\n    KV = 0x03;\n\nlet kinds = {\n  'key': 1,\n  'value': 2,\n  'key+value': 3\n};\n\n\nfunction SetIterator(set, kind){\n  set = $__ToObject(set);\n  $__SetInternal(this, SET, ensureSet(set));\n  $__SetInternal(this, KEY,  $__MapSigil());\n  $__SetInternal(this, KIND, kinds[kind]);\n  this.next = () => next.call(this);\n}\n\n$__defineProps(SetIterator.prototype, {\n  next(){\n    if (!$__IsObject(this)) {\n      throw $__Exception('called_on_non_object', ['SetIterator.prototype.next']);\n    }\n    if (!$__HasInternal(this, SET) || !$__HasInternal(this, KEY) || !$__HasInternal(this, KIND)) {\n      throw $__Exception('called_on_incompatible_object', ['SetIterator.prototype.next']);\n    }\n    var data = $__GetInternal(this, SET),\n        key = $__GetInternal(this, KEY),\n        kind = $__GetInternal(this, KIND);\n\n    var item = $__MapNext(data, key);\n    $__SetInternal(this, KEY, item[0]);\n    return kind === KV ? [item[1], item[1]] : item[1];\n  },\n  @iterator(){\n    return this;\n  }\n});\n\nlet next = SetIterator.prototype.next;\n}\n";

exports.modules["@std"] = "// standard constants\nconst NaN       = +'NaN';\nconst Infinity  = 1 / 0;\nconst undefined = void 0;\n\n// standard functions\nimport { decodeURI,\n         decodeURIComponent,\n         encodeURI,\n         encodeURIComponent,\n         eval,\n         isFinite,\n         isNaN,\n         parseFloat,\n         parseInt } from '@globals';\n\n\nimport { clearInterval,\n         clearTimeout,\n         setInterval,\n         setTimeout } from '@timers';\n\n// standard types\nimport Array    from '@array';\nimport Boolean  from '@boolean';\nimport Date     from '@date';\nimport Function from '@function';\nimport Map      from '@map';\nimport Number   from '@number';\nimport Object   from '@object';\nimport Proxy    from '@reflect';\nimport RegExp   from '@regexp';\nimport Set      from '@set';\nimport String   from '@string';\nimport WeakMap  from '@weakmap';\n\n\n\n// standard errors\nimport { Error,\n         EvalError,\n         RangeError,\n         ReferenceError,\n         SyntaxError,\n         TypeError,\n         URIError } from '@error';\n\n\n// standard pseudo-modules\nimport JSON from '@json';\nimport Math from '@math';\n\nimport Symbol from '@symbol';\n//import Iterator from '@iter';\n\nlet StopIteration = $__StopIteration\n\n\nexport Array, Boolean, Date, Function, Map, Number, Object, Proxy, RegExp, Set, String, WeakMap,\n       Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError,\n       decodeURI, decodeURIComponent, encodeURI, encodeURIComponent, eval, isFinite, isNaN,\n       parseFloat, parseInt, clearInterval, clearTimeout, setInterval, setTimeout,\n       StopIteration, JSON, Math, NaN, Infinity, undefined;\n\n\n";

exports.modules["@string"] = "import MAX_INTEGER from '@number';\nimport RegExp from '@regexp';\n\n\nexport function String(string){\n  string = arguments.length ? $__ToString(string) : '';\n  if ($__IsConstructCall()) {\n    return $__StringCreate(string);\n  } else {\n    return string;\n  }\n}\n\n$__setupConstructor(String, $__StringProto);\n\nexport function fromCharCode(...codeUnits){\n  var length = codeUnits.length,\n      str = '';\n  for (var i=0; i < length; i++) {\n    str += $__FromCharCode($__ToUint16(codeUnits[i]));\n  }\n  return str;\n}\n\n$__defineMethods(String, [fromCharCode]);\n\n\n{\n$__defineProps(String.prototype, {\n  anchor(name){\n    var string = ensureCoercible(this, 'anchor');\n    return ToHTML('a', string, 'name', name);\n  },\n  big(){\n    var string = ensureCoercible(this, 'big');\n    return ToHTML('big', string);\n  },\n  blink(){\n    var string = ensureCoercible(this, 'blink');\n    return ToHTML('blink', string);\n  },\n  bold(){\n    var string = ensureCoercible(this, 'bold');\n    return ToHTML('b', string);\n  },\n  fixed(){\n    var string = ensureCoercible(this, 'fixed');\n    return ToHTML('fixed', string);\n  },\n  fontcolor(color){\n    var string = ensureCoercible(this, 'fontcolor');\n    return ToHTML('font', string, 'color', color);\n  },\n  fontsize(size){\n    var string = ensureCoercible(this, 'fontsize');\n    return ToHTML('font', string, 'size', size);\n  },\n  italics(){\n    var string = ensureCoercible(this, 'italics');\n    return ToHTML('i', string);\n  },\n  link(href){\n    var string = ensureCoercible(this, 'link');\n    return ToHTML('a', string, 'href', href);\n  },\n  small(){\n    var string = ensureCoercible(this, 'small');\n    return ToHTML('small', string);\n  },\n  strike(){\n    var string = ensureCoercible(this, 'strike');\n    return ToHTML('s', string);\n  },\n  sub(){\n    var string = ensureCoercible(this, 'sub');\n    return ToHTML('sub', string);\n  },\n  sup(){\n    var string = ensureCoercible(this, 'sup');\n    return ToHTML('sup', string);\n  },\n  charAt(position){\n    var string = ensureCoercible(this, 'charAt');\n    position = $__ToInteger(position);\n    return position < 0 || position >= string.length ? '' : string[position];\n  },\n  charCodeAt(position){\n    var string = ensureCoercible(this, 'charCodeAt');\n    position = $__ToInteger(position);\n    return position < 0 || position >= string.length ? NaN : $__CodeUnit(string[position]);\n  },\n  concat(...args){\n    var string = ensureCoercible(this, 'concat');\n    for (var i=0; i < args.length; i++) {\n      string += $__ToString(args[i]);\n    }\n    return string;\n  },\n  indexOf(search){\n    var string = ensureCoercible(this, 'indexOf');\n    return stringIndexOf(string, search, arguments[1]);\n  },\n  lastIndexOf(search){\n    var string = ensureCoercible(this, 'lastIndexOf'),\n        len = string.length,\n        position = $__ToNumber(arguments[1]);\n\n    search = $__ToString(search);\n    var searchLen = search.length;\n\n    position = position !== position ? Infinity : $__ToInteger(position);\n    position -= searchLen;\n\n    var i = position > 0 ? position < len ? position : len : 0;\n\n    while (i--) {\n      var j = 0;\n      while (j < searchLen && search[j] === string[i + j]) {\n        if (j++ === searchLen - 1) {\n          return i;\n        }\n      }\n    }\n    return -1;\n  },\n  localeCompare(){\n    var string = ensureCoercible(this, 'localeCompare');\n  },\n  match(regexp){\n    var string = ensureCoercible(this, 'match');\n    return stringMatch(string, regexp);\n  },\n  repeat(count){\n    var string = ensureCoercible(this, 'repeat'),\n        n = $__ToInteger(count),\n        o = '';\n\n    if (n <= 1 || n === Infinity || n === -Infinity) {\n      throw $__Exception('invalid_repeat_count', []);\n    }\n\n    while (n > 0) {\n      n & 1 && (o += string);\n      n >>= 1;\n      string += string;\n    }\n\n    return o;\n  },\n  replace(search, replace){\n    var string = ensureCoercible(this, 'replace');\n\n    if (typeof replace === 'function') {\n      var match, count;\n      if (isRegExp(search)) {\n        match = stringMatch(string, search);\n        count = matches.length;\n      } else {\n        match = stringIndexOf(string, $__ToString(search));\n        count = 1;\n      }\n      //TODO\n    } else {\n      replace = $__ToString(replace);\n      if (!isRegExp(search)) {\n        search = $__ToString(search);\n      }\n      return $__StringReplace(string, search, replace);\n    }\n  },\n  search(regexp){\n    var string = ensureCoercible(this, 'search');\n    if (!isRegExp(regexp)) {\n      regexp = new RegExp(regexp);\n    }\n    return $__StringSearch(string, regexp);\n  },\n  slice(start, end){\n    var string = ensureCoercible(this, 'slice');\n    start = $__ToInteger(start);\n    if (end === undefined) {\n      return $__StringSlice(string, start);\n    } else {\n      return $__StringSlice(string, start, $__ToInteger(end));\n    }\n  },\n  split(separator, limit){\n    var string = ensureCoercible(this, 'split');\n    limit = limit === undefined ? MAX_INTEGER - 1 : $__ToInteger(limit);\n    separator = isRegExp(separator) ? separator : $__ToString(separator);\n    return $__StringSplit(string, separator, limit);\n  },\n  substr(start, length){\n    var string = ensureCoercible(this, 'substr'),\n        start = $__ToInteger(start),\n        chars = string.length;\n\n    length = length === undefined ? Infinity : $__ToInteger(length);\n\n    if (start < 0) {\n      start += chars;\n      if (start < 0) start = 0;\n    }\n    if (length < 0) {\n      length = 0;\n    }\n    if (length > chars - start) {\n      length = chars - start;\n    }\n\n    return length <= 0 ? '' : $__StringSlice(string, start, start + length);\n  },\n  substring(start, end){\n    var string = ensureCoercible(this, 'substring'),\n        start = $__ToInteger(start),\n        len = string.length;\n\n    end = end === undefined ? len : $__ToInteger(end);\n\n    start = start > 0 ? start < len ? start : len : 0;\n    end = end > 0 ? end < len ? end : len : 0;\n\n    var from = start < end ? start : end,\n        to = start > end ? start : end;\n\n    return $__StringSlice(string, from, to);\n  },\n  toLowerCase(){\n    var string = ensureCoercible(this, 'toLowerCase');\n    return $__CallNative(string, 'toLowerCase');\n  },\n  toLocaleLowerCase(){\n    var string = ensureCoercible(this, 'toLocaleLowerCase');\n    return $__CallNative(string, 'toLocaleLowerCase');\n  },\n  toUpperCase(){\n    var string = ensureCoercible(this, 'toUpperCase');\n    return $__CallNative(string, 'toUpperCase');\n  },\n  toLocaleUpperCase(){\n    var string = ensureCoercible(this, 'toLocaleUpperCase');\n    return $__CallNative(string, 'toLocaleUpperCase');\n  },\n  toString(){\n    if ($__GetNativeBrand(this) === 'String') {\n      return $__GetPrimitiveValue(this);\n    } else {\n      throw $__exception('not_generic', ['String.prototype.toString']);\n    }\n  },\n  trim(){\n    var string = ensureCoercible(this, 'trim');\n    return $__StringTrim(string);\n  },\n  valueOf(){\n    if ($__GetNativeBrand(this) === 'String') {\n      return $__GetPrimitiveValue(this);\n    } else {\n      throw $__Exception('not_generic', ['String.prototype.valueOf']);\n    }\n  }\n});\n\nfunction ensureCoercible(target, method){\n  if (target === null || target === undefined) {\n    throw $__Exception('object_not_coercible', ['String.prototype.'+method, target]);\n  }\n  return $__ToString(target);\n}\n\nfunction ToHTML(tag, content, attrName, attrVal){\n  attrVal = $__ToString(attrVal);\n  var attr = attrName === undefined ? '' : ' '+attrName+'=\"'+$__StringReplace(attrVal, '\"', '&quot;')+'\"';\n  return '<'+tag+attr+'>'+content+'</'+tag+'>';\n}\n\n\nfunction isRegExp(subject){\n  return subject != null && typeof subject === 'object' && $__GetNativeBrand(subject) === 'RegExp';\n}\n\nfunction stringIndexOf(string, search, position){\n  search = $__ToString(search);\n  position = $__ToInteger(position);\n\n  var len = string.length,\n      searchLen = search.length,\n      i = position > 0 ? position < len ? position : len : 0,\n      maxLen = len - searchLen;\n\n  while (i < maxLen) {\n    var j = 0;\n    while (j < searchLen && search[j] === string[i + j]) {\n      if (j++ === searchLen - 1) {\n        return i;\n      }\n    }\n  }\n  return -1;\n}\n\nfunction stringMatch(string, regexp){\n  if (!isRegExp(regexp)) {\n    regexp = new RegExp(regexp);\n  }\n  if (!regexp.global) {\n    return regexp.exec(string);\n  }\n  regexp.lastIndex = 0;\n  var array = [],\n      previous = 0,\n      lastMatch = true,\n      n = 0;\n\n  while (lastMatch) {\n    var result = regexp.exec(string);\n    if (result === null) {\n      lastMatch = false;\n    } else {\n      var thisIndex = regexp.lastIndex;\n      if (thisIndex === lastIndex) {\n        previous = regexp.lastIndex = thisIndex + 1;\n      } else {\n        previous = thisIndex;\n      }\n      array[n++] = result[0];\n    }\n  }\n\n  return n === 0 ? null : array;\n}\n}\n";

exports.modules["@symbol"] = "export function Symbol(name, isPublic){\n  if (name == null) {\n    throw $__Exception('unnamed_symbol', []);\n  }\n  return $__SymbolCreate(name, !!isPublic);\n}\n\n$__setupConstructor(Symbol, $__SymbolProto);\n\n$__defineProps(Symbol.prototype, {\n  valueOf(){\n    if ($__GetNativeBrand(this) === 'Symbol') {\n      return $__GetInternal(this, 'Label');\n    } else {\n      throw $__Exception('not_generic', ['Symbol.prototype.toString']);\n    }\n  },\n  toString(){\n    if ($__GetNativeBrand(this) === 'Symbol') {\n      return $__GetInternal(this, 'Label');\n    } else {\n      throw $__Exception('not_generic', ['Symbol.prototype.toString']);\n    }\n  }\n});\n\n$__DefineOwnProperty(Symbol.prototype, 'constructor', { configurable: false, writable: false });\n$__SetExtensible(Symbol.prototype, false);\n";

exports.modules["@system"] = "{\n  let ___ = 0x00,\n      E__ = 0x01,\n      _C_ = 0x02,\n      EC_ = 3,\n      __W = 0x04,\n      E_W = 5,\n      _CW = 6,\n      ECW = 7,\n      __A = 0x08,\n      E_A = 9,\n      _CA = 10,\n      ECA = 11;\n\n  let global = $__global;\n\n\n  $__defineMethods = function defineMethods(obj, props){\n    for (var i=0; i < props.length; i++) {\n      $__SetInternal(props[i], 'Native', true);\n      $__defineDirect(obj, props[i].name, props[i], _CW);\n      $__deleteDirect(props[i], 'prototype');\n    }\n    return obj;\n  };\n\n  $__defineProps = function defineProps(obj, props){\n    var keys = $__Enumerate(props, false, false);\n    for (var i=0; i < keys.length; i++) {\n      var name = keys[i],\n          prop = props[name];\n\n      $__defineDirect(obj, name, prop, _CW);\n\n      if (typeof prop === 'function') {\n        $__SetInternal(prop, 'Native', true);\n        $__defineDirect(prop, 'name', name, ___);\n        $__deleteDirect(prop, 'prototype');\n      }\n    }\n    return obj;\n  };\n\n  $__setupFunctions = function setupFunctions(...funcs){\n    var len = funcs.length;\n    for (var i=0; i < len; i++) {\n      $__SetInternal(funcs[i], 'Native', true);\n      $__deleteDirect(funcs[i], 'prototype');\n    }\n  };\n\n  $__defineConstants = function defineConstants(obj, props){\n    var keys = $__Enumerate(props, false, false);\n    for (var i=0; i < keys.length; i++) {\n      $__defineDirect(obj, keys[i], props[keys[i]], 0);\n    }\n  };\n\n  $__setupConstructor = function setupConstructor(ctor, proto){\n    $__defineDirect(ctor, 'prototype', proto, ___);\n    $__defineDirect(ctor, 'length', 1, ___);\n    $__defineDirect(ctor.prototype, 'constructor', ctor, _CW);\n    $__defineDirect(global, ctor.name, ctor, _CW);\n    $__SetInternal(ctor, 'Native', true);\n    $__SetInternal(ctor, 'NativeConstructor', true);\n  };\n\n\n  $__setLength = function setLength(f, length){\n    if (typeof length === 'string') {\n      $__setDirect(f, 'length', length);\n    } else {\n      var keys = $__Enumerate(length, false, false);\n      for (var i=0; i < keys.length; i++) {\n        var key = keys[i];\n        $__setDirect(f[key], 'length', length[key]);\n      }\n    }\n  };\n\n  $__setProperty = function setProperty(key, object, values){\n    var keys = $__Enumerate(values, false, false),\n        i = keys.length;\n\n    while (i--) {\n      $__defineDirect(object[keys[i]], key, values[keys[i]], ___);\n    }\n  };\n\n\n  let hidden = { enumerable: false };\n\n  $__hideEverything = function hideEverything(o){\n    if (!o || typeof o !== 'object') return o;\n\n    var keys = $__Enumerate(o, false, true),\n        i = keys.length;\n\n    while (i--) {\n      $__updateAttrDirect(o, keys[i], ~E__);\n    }\n\n    if (typeof o === 'function') {\n      hideEverything(o.prototype);\n    }\n\n    return o;\n  };\n}\n\n\nclass Storage {\n  constructor(){}\n  set(props){\n    for (var k in props) {\n      this[k] = props[k];\n    }\n  }\n  empty(){\n    for (var k in this) {\n      delete this[k];\n    }\n  }\n}\n\n$__hideEverything(Storage.prototype);\n\n\nlet _ = o => {\n  var v = $__GetHidden(o, 'loader-internals');\n  if (!v) {\n    v = new Storage;\n    $__SetHidden(o, 'loader-internals', v);\n  }\n  return v;\n}\n\n\n\nclass Request {\n  constructor(loader, mrl, resolved, callback, errback){\n    _(this).set({\n      loader: loader,\n      callback: callback,\n      errback: errback,\n      mrl: mrl,\n      resolved: resolved\n    });\n  }\n\n  fulfill(src){\n    var _this = _(this),\n        _loader = _(_this.loader);\n\n    var translated = (_loader.translate)(src, _this.mrl, _loader.baseURL, _this.resolved);\n    if (_loader.strict) {\n      translated = '\"use strict\";'+translated;\n    }\n\n    $__EvaluateModule(translated, _loader.global, _this.resolved, msg => this.reject(msg), module => {\n      var _module = _(module);\n      _module.loader = _this.loader;\n      $__SetInternal(_module, 'resolved', _this.resolved);\n      $__SetInternal(_module, 'mrl', _this.mrl);\n      _loader.modules[_this.resolved] = module;\n      (_this.callback)(module);\n      _this.empty();\n    });\n  }\n\n  redirect(mrl, baseURL){\n    var _this = _(this),\n        _loader = _(_this.loader);\n\n    _this.resolved = (_loader.resolve)(mrl, baseURL);\n    _this.mrl = mrl;\n\n    var module = _this.loader.get(_this.resolved);\n    if (module) {\n      (_this.callback)(module);\n    } else {\n      (_loader.fetch)(mrl, baseURL, this, _this.resolved);\n    }\n  }\n\n  reject(msg){\n    var _this = _(this);\n    (_this.errback)(msg);\n    _this.empty();\n  }\n}\n\n\nexport class Loader {\n  constructor(parent, options){\n    options = options || {};\n    this.linkedTo  = options.linkedTo || null;\n    _(this).set({\n      translate: options.translate || parent.translate,\n      resolve  : options.resolve || parent.resolve,\n      fetch    : options.fetch || parent.fetch,\n      strict   : options.strict === true,\n      global   : options.global || $__global,\n      baseURL  : options.baseURL || (parent ? parent.baseURL : ''),\n      modules  : $__ObjectCreate(null)\n    });\n  }\n\n  get global(){\n    return _(this).global;\n  }\n\n  get baseURL(){\n    return _(this).baseURL;\n  }\n\n  load(mrl, callback, errback){\n    var _this = _(this),\n        key = (_this.resolve)(mrl, _this.baseURL),\n        module = _this.modules[key];\n\n    if (module) {\n      callback(module);\n    } else {\n      (_this.fetch)(mrl, _this.baseURL, new Request(this, mrl, key, callback, errback), key);\n    }\n  }\n\n  eval(src){\n    var _this = _(this);\n    var module = $__EvaluateModule(src, _this.global, _this.baseURL);\n    return module;\n  }\n\n  evalAsync(src, callback, errback){\n\n  }\n\n  get(mrl){\n    var _this = _(this),\n        canonical = (_this.resolve)(mrl, _this.baseURL);\n    return _this.modules[canonical];\n  }\n\n  set(mrl, mod){\n    var _this = _(this),\n        canonical = (_this.resolve)(mrl, _this.baseURL);\n\n    if (typeof canonical === 'string') {\n      _this.modules[canonical] = mod;\n    } else {\n      for (var k in canonical) {\n        _this.modules[k] = canonical[k];\n      }\n    }\n  }\n\n  defineBuiltins(object){\n    var std  = $__StandardLibrary(),\n        desc = { configurable: true,\n                 enumerable: false,\n                 writable: true,\n                 value: undefined };\n\n    object || (object = _(this).global);\n    for (var k in std) {\n      desc.value = std[k];\n      $__DefineOwnProperty(object, k, desc);\n    }\n\n    return object;\n  }\n}\n\nexport let Module = function Module(object){\n  if ($__GetNativeBrand(object) === 'Module') {\n    return object;\n  }\n  return $__ToModule($__ToObject(object));\n}\n\n$__deleteDirect(Module, 'prototype');\n\n\nexport let System = new Loader(null, {\n  global: $__global,\n  baseURL: '',\n  strict: false,\n  fetch(relURL, baseURL, request, resolved) {\n    var fetcher = resolved[0] === '@' ? $__Fetch : $__readFile;\n\n    fetcher(resolved, src => {\n      if (typeof src === 'string') {\n        request.fulfill(src);\n      } else {\n        request.reject(src.message);\n      }\n    });\n  },\n  resolve(relURL, baseURL){\n    return relURL[0] === '@' ? relURL : $__resolve(baseURL, relURL);\n  },\n  translate(src, relURL, baseURL, resolved) {\n    return src;\n  }\n});\n\n$__System = System;\n";

exports.modules["@timers"] = "export function clearInterval(id){\n  id = $__ToInteger(id);\n  $__ClearTimer(id);\n}\n\nexport function clearTimeout(id){\n  id = $__ToInteger(id);\n  $__ClearTimer(id);\n}\n\nexport function setInterval(callback, milliseconds){\n  milliseconds = $__ToInteger(milliseconds);\n  if (typeof callback !== 'function') {\n    callback = $__ToString(callback);\n  }\n  return $__SetTimer(callback, milliseconds, true);\n}\n\nexport function setTimeout(callback, milliseconds){\n  milliseconds = $__ToInteger(milliseconds);\n  if (typeof callback !== 'function') {\n    callback = $__ToString(callback);\n  }\n  return $__SetTimer(callback, milliseconds, false);\n}\n\n$__setupFunctions(clearInterval, clearTimeout, setInterval, setTimeout);\n";

exports.modules["@weakmap"] = "export function WeakMap(iterable){\n  var weakmap;\n  if ($__IsConstructCall()) {\n    weakmap = this;\n  } else {\n    if (this === undefined || this === $__WeakMapProto) {\n      weakmap = $__ObjectCreate($__WeakMapProto) ;\n    } else {\n      weakmap = $__ToObject(this);\n    }\n  }\n\n  if ($__HasInternal(weakmap, 'WeakMapData')) {\n    throw $__Exception('double_initialization', ['WeakMap']);\n  }\n\n  $__WeakMapInitialization(weakmap, iterable);\n  return weakmap;\n}\n\n$__setupConstructor(WeakMap, $__WeakMapProto);\n{\n$__defineProps(WeakMap.prototype, {\n  set(key, value){\n    ensureWeakMap(this, key, 'set');\n    return $__WeakMapSet(this, key, value);\n  },\n  get(key){\n    ensureWeakMap(this, key, 'get');\n    return $__WeakMapGet(this, key);\n  },\n  has(key){\n    ensureWeakMap(this, key, 'has');\n    return $__WeakMapHas(this, key);\n  },\n  delete: function(key){\n    ensureWeakMap(this, key, 'delete');\n    return $__WeakMapDelete(this, key);\n  }\n});\n\n$__defineDirect(WeakMap.prototype.delete, 'name', 'delete', 0);\n\n\nfunction ensureWeakMap(o, p, name){\n  if (!o || typeof o !== 'object' || !$__HasInternal(o, 'WeakMapData')) {\n    throw $__Exception('called_on_incompatible_object', ['WeakMap.prototype.'+name]);\n  }\n  if (typeof p === 'object' ? p === null : typeof p !== 'function') {\n    throw $__Exception('invalid_weakmap_key', []);\n  }\n}\n}\n";



  var continuum = {
    createBytecode      : exports.runtime.createBytecode,
    createNativeFunction: exports.runtime.createNativeFunction,
    createRealm         : exports.runtime.createRealm,
    createRenderer      : exports.debug.createRenderer,
    introspect          : exports.debug.introspect,
    iterate             : exports.utility.iterate,
    exports : exports
  };

  exports.utility.define(continuum, {
    Assembler : exports.assembler.Assembler,
    Realm     : exports.runtime.Realm,
    Renderer  : exports.debug.Renderer,
    Script    : exports.runtime.Script,
    ScriptFile: exports.runtime.ScriptFile,
    constants : exports.constants,
    utility   : exports.utility
  });

  return continuum;

}).apply(this, function(){
  var exports = {
    builtins: {},
    modules: {},
    fs: {
      readFile: function(path, encoding, callback){
        var xhr = new XMLHttpRequest;
        xhr.onerror = xhr.onload = function(evt){
          if (xhr.readyState === 4) {
            xhr.onload = xhr.onerror = null;
            callback(null, xhr.responseText);
          }
        }

        xhr.open('GET', path);
        xhr.send();
      }
    }
  };

  function require(request){
    request = request.slice(request.lastIndexOf('/') + 1);
    return exports[request];
  }

  return [this, exports, require];
}());
