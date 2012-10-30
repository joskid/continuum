continuum = (function(exports, require, module){


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
        Template: 9
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

    Syntax = {
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        AssignmentExpression: 'AssignmentExpression',
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
        Path: 'Path',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SpreadElement: 'SpreadElement',
        SwitchCase: 'SwitchCase',
        SwitchStatement: 'SwitchStatement',
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
        StrictModeWith:  'Strict mode code may not include a with statement',
        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
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
        EachNotAllowed:  'Each is not supported',
        RestDuplicate: 'Duplicate rest parameters',
        RestNotLast: 'Rest parameter must come last',
        InvalidSpread: 'Invalid spread/rest parameter location'
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
            keyword = (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch');
            break;
        case 7:
            keyword = (id === 'default') || (id === 'finally');
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
        var ch, start, id, restore;

        ch = source[index];
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

        // Dot (.) can also start a floating-point number, hence the need
        // to check the next character.

        ch2 = source[index + 1];
        ch3 = source[index + 2];

        if (ch1 === '.') {
            if (ch2 === '.' && ch3 === '.') {
                index += 3;
                return {
                    type: Token.Punctuator,
                    value: '...',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }

            if (!isDecimalDigit(ch2)) {
                return {
                    type: Token.Punctuator,
                    value: nextChar(),
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // Peek more characters.

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

        // 3-character punctuators: === !== >>> <<= >>=

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
            token.type === Token.NullLiteral;
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
        return token.type === Token.Identifier && token.value === keyword;
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

    function isParameter(expr) {
        var i;

        if (expr.type === Syntax.Identifier) {
            return true;
        } else if (expr.type === Syntax.ObjectExpression) {
            for (i = 0; i < expr.properties; i++) {
                if (!isParameter(expr.properties[i].value)) {
                    return false;
                }
            }
            return true;
        } else if (expr.type === Syntax.ArrayExpression) {
            for (i = 0; i < expr.elements; i++) {
                if (!isParameter(expr.elements[i])) {
                    return false;
                }
            }
            return true;
        }

        return false;
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
                elements.push(parseSpreadOrAssignmentExpression());
                if (!(match(']') || matchKeyword('for') || matchKeyword('if'))) {
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

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseObjectProperty() {
        var token, key, id, param;

        token = lookahead();

        if (token.type === Token.Identifier) {

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

            if (property.key.type === Syntax.Identifier) {
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
        var expr, parenCount;

        expect('(');

        parenCount = ++state.parenthesizedCount;

        state.allowArrowFunction = true;
        expr = parseExpression();
        state.allowArrowFunction = false;

        if (parenCount !== state.parenthesizedCount && expr.type === 'ArrowFunctionExpression') {
            --state.parenthesizedCount;
        } else {
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

        return throwUnexpected(lex());
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

    // 11.2 Left-Hand-Side Expressions

    function parseArguments() {
        var args = [];

        expect('(');

        if (!match(')')) {
            while (index < length) {
                args.push(parseSpreadOrAssignmentExpression());
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return args;
    }

    function parseNonComputedProperty() {
        var token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpected(token);
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
        var expr = parseLeftHandSideExpressionAllowCall();

        var token = lookahead();

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
            if (expr.argument.type !== Syntax.Identifier && expr.argument.type !== Syntax.ArrayPattern) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }
        } else {
            if (expr.type !== Syntax.MemberExpression &&
                expr.type !== Syntax.CallExpression &&
                expr.type !== Syntax.NewExpression) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }
        }
    }

    function reinterpretAsCoverFormalsList(expressions) {
        var i, j, len, param, params, paramSet, options, rest, previousStrict;

        params = [];
        rest = null;

        options = {
            paramSet: {}
        }

        for (i = 0, len = expressions.length; i < len; i += 1) {
            param = expressions[i];
            if (param.type === Syntax.Identifier) {
                params.push(param);
                checkParam(options, param, param.name);
            } else if (param.type === Syntax.SpreadElement) {
                if (rest) {
                    throwError({}, Messages.RestDuplicate);
                }
                if (i !== len - 1) {
                    throwError({}, Messages.RestNotLast);
                }
                reinterpretAsDestructuredParameter(options, param.argument);
                rest = param.argument;
            } else if (param.type === Syntax.ObjectExpression || param.type === Syntax.ArrayExpression) {
                reinterpretAsDestructuredParameter(options, param);
                params.push(param);
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

    function checkParam(options, param, name) {
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
            checkParam(options, expr, expr.name);
        } else {
            if (expr.type !== Syntax.MemberExpression) {
                throwError({}, Messages.InvalidLHSInFormalsList);
            }
        }
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
        var expr, token, oldParenthesizedCount, coverFormalsList, params;

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
                return parseArrowFunctionExpression({ rest: null, params: [ expr ] });
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
        var expr, sequence, coverFormalsList, rest, token;


        expr = parseAssignmentExpression();
        state.allowArrowFunction && (state.allowArrowFunction = isParameter(expr));

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
                if (state.allowArrowFunction && expr.type === Syntax.SpreadElement) {
                    rest = true;
                    if (!match(')')) {
                        throwError({}, Messages.InvalidSpread);
                    }
                    break;
                } else {
                    state.allowArrowFunction && (state.allowArrowFunction = isParameter(expr));
                }
            }

        }
        if (state.allowArrowFunction) {
            if (match(')') && lookahead2().value == '=>') {
                lex();
                --state.parenthesizedCount;
                coverFormalsList = reinterpretAsCoverFormalsList(sequence ? sequence.expressions : [ expr ]);
                if (coverFormalsList) {
                    return parseArrowFunctionExpression(coverFormalsList);
                }
            }

            if (rest) {
                throwError({}, Messages.InvalidSpread);
            }
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
            throwError({}, Messages.EachNotAllowed);
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

        if (opts !== undefined && opts.ignore_body) {
            // no body
        } else {
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
                throwError({}, Messages.InvalidLHSInFormalsList);
            }
            param = parseObjectInitialiser();
            reinterpretAsDestructuredParameter(options, param);
        } else {
            param = parseVariableIdentifier();
            checkParam(options, token, token.value);
        }

        if (rest) {
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
        var id, body, token, stricted, tmp, firstRestricted, message, previousStrict, previousYieldAllowed, generator, expression;

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
        stricted = tmp.stricted;
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
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
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
        var token, id = null, stricted, firstRestricted, message, tmp, body, previousStrict, previousYieldAllowed, paramSet, generator, expression;

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
        stricted = tmp.stricted;
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
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
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
        var marker, expr, parenCount;

        skipComment();
        marker = createLocationMarker();
        expect('(');

        parenCount = ++state.parenthesizedCount;
        state.allowArrowFunction = true;
        expr = parseExpression();
        state.allowArrowFunction = false;

        if (parenCount === state.parenthesizedCount) {
            expect(')');
            marker.end();
            marker.applyGroup(expr);
        } else if (expr.type === 'ArrowFunctionExpression') {
            marker.end();
            marker.apply(expr);
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
            extra.parseParams = parseParams;
            extra.parsePath = parsePath;
            extra.parsePostfixExpression = parsePostfixExpression;
            extra.parsePrimaryExpression = parsePrimaryExpression;
            extra.parseProgram = parseProgram;
            extra.parsePropertyFunction = parsePropertyFunction;
            extra.parseRelationalExpression = parseRelationalExpression;
            extra.parseSpreadOrAssignmentExpression = parseSpreadOrAssignmentExpression;
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
            parseParams = wrapTracking(extra.parseParams);
            parsePath = wrapTracking(extra.parsePath);
            parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
            parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
            parseProgram = wrapTracking(extra.parseProgram);
            parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
            parseSpreadOrAssignmentExpression = wrapTracking(extra.parseSpreadOrAssignmentExpression);
            parseTemplateElement = wrapTracking(extra.parseTemplateElement);
            parseTemplateLiteral = wrapTracking(extra.parseTemplateLiteral);
            parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
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
            parseParams = extra.parseParams;
            parsePath = extra.parsePath;
            parsePostfixExpression = extra.parsePostfixExpression;
            parsePrimaryExpression = extra.parsePrimaryExpression;
            parseProgram = extra.parseProgram;
            parsePropertyFunction = extra.parsePropertyFunction;
            parseTemplateElement = extra.parseTemplateElement;
            parseTemplateLiteral = extra.parseTemplateLiteral;
            parseRelationalExpression = extra.parseRelationalExpression;
            parseSpreadOrAssignmentExpression = extra.parseSpreadOrAssignmentExpression;
            parseStatement = extra.parseStatement;
            parseShiftExpression = extra.parseShiftExpression;
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

  var toBrand = {}.toString,
      slice = [].slice,
      hasOwn = {}.hasOwnProperty,
      toSource = Function.toString;

  var hasDunderProto = { __proto__: [] } instanceof Array;


  function getBrandOf(o){
    return toBrand.call(o).slice(8, -1);
  }

  function ensureObject(name, o){
    if (!o || typeof o !== 'object') {
      throw new TypeError(name + ' called with non-object ' + getBrandOf(o));
    }
  }


  function fname(func){
    if (typeof func !== 'function') {
      return '';
    } else if ('name' in func) {
      return func.name;
    }

    return toSource.call(func).match(/^\n?function\s?(\w*)?_?\(/)[1];
  }
  exports.fname = fname;

  function isObject(v){
    return typeof v === OBJECT ? v !== null : typeof v === FUNCTION;
  }

  exports.isObject = isObject;


  exports.nextTick = typeof process !== UNDEFINED
    ? process.nextTick
    : function(f){ setTimeout(f, 1) };


  exports.numbers = (function(cache){
    function numbers(start, end){
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
    }

    return numbers;
  })([]);


  if (Object.create && !Object.create(null).toString) {
    var create = exports.create = Object.create;
  } else {
    var create = exports.create = (function(F, empty){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = 'javascript:';
      empty = iframe.contentWindow.Object.prototype;
      document.body.removeChild(iframe);

      var keys = ['constructor', 'hasOwnProperty', 'propertyIsEnumerable',
                  'isProtoypeOf', 'toLocaleString', 'toString', 'valueOf'];

      for (var i=0; i < keys.length; i++)
        delete empty[keys[i]];

      iframe = keys = null;

      function create(object){
        F.prototype = object === null ? empty : object;
        object = new F;
        F.prototype = null;
        return object;
      }

      return create;
    })(function(){});
  }




  function enumerate(o){
    var keys = [], i = 0;
    for (keys[i++] in o);
    return keys;
  }

  exports.enumerate = enumerate;




  if (Object.keys) {
    var ownKeys = exports.keys = Object.keys;
  } else {
    var ownKeys = exports.keys = (function(hasOwn){
      function keys(o){
        var out = [], i=0;
        for (var k in o)
          if (hasOwn.call(o, k))
            out[i++] = k;
        return out;
      }
      return keys;
    })({}.hasOwnProperty);
  }


  if (Object.getPrototypeOf) {
    var getPrototypeOf = Object.getPrototypeOf;
  } else if (hasDunderProto) {
    var getPrototypeOf = (function(){
      function getPrototypeOf(o){
        ensureObject('getPrototypeOf', o);
        return o.__proto__;
      }
      return getPrototypeOf;
    })();
  } else {
    var getPrototypeOf = (function(){
      function getPrototypeOf(o){
        ensureObject('getPrototypeOf', o);
        if (typeof o.constructor === 'function') {
          return o.constructor.prototype;
        }
      }
      return getPrototypeOf;
    })();
  }

  exports.getPrototypeOf = getPrototypeOf


  if (Object.defineProperty) {
    var defineProperty = Object.defineProperty;
  } else {
    var defineProperty = (function(){
      function defineProperty(o, k, desc){
        o[k] = desc.value;
        return o;
      }
      return defineProperty;
    })();
  }

  exports.defineProperty = defineProperty;


  if (Object.getOwnPropertyDescriptor) {
    var describeProperty = Object.getOwnPropertyDescriptor;
  } else {
    var describeProperty = (function(){
      function getOwnPropertyDescriptor(o, k){
        ensureObject('getOwnPropertyDescriptor', o);
        return  { value: o[k] };
      }
      return getOwnPropertyDescriptor;
    })();
  }

  exports.describeProperty = describeProperty;


  if (Object.getOwnPropertyNames) {
    var getProperties = Object.getOwnPropertyNames;
  } else {
    var getProperties = ownKeys;
  }


  function copy(o){
    return assign(create(getPrototypeOf(o)), o);
  }

  exports.copy = copy;


  function Hidden(value){
    this.value = value;
  }

  Hidden.prototype = {
    configurable: true,
    enumerable: false,
    writable: true,
    value: undefined
  };


  function define(o, p, v){
    switch (typeof p) {
      case STRING:
        defineProperty(o, p, new Hidden(v));
        break;
      case FUNCTION:
        defineProperty(o, fname(p), new Hidden(p));
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
              defineProperty(o, name, new Hidden(f));
            }
          }
        } else if (p) {
          var keys = ownKeys(p)

          for (var i=0; i < keys.length; i++) {
            var k = keys[i];
            var desc = describeProperty(p, k);
            if (desc) {
              desc.enumerable = 'get' in desc;
              defineProperty(o, k, desc);
            }
          }
        }
    }

    return o;
  }

  exports.define = define;




  function assign(o, p, v){
    switch (typeof p) {
      case STRING:
        o[p] = v;
        break;
      case FUNCTION:
        o[fname(p)] = p;
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



  function toInteger(v){
    return (v / 1 || 0) | 0;
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
    return typeof value === 'number'
        && value === value
        && value > -9007199254740992
        && value < 9007199254740992
        && value | 0 === value;
  }

  exports.isInteger = isInteger;

  function uid(){
    return Math.random().toString(36).slice(2)
  }

  exports.uid = uid;


  var BREAK    = visit.BREAK    = new Number(1),
      CONTINUE = visit.CONTINUE = new Number(2),
      RECURSE  = visit.RECURSE  = new Number(3);


  function visit(root, callback){
    var queue = new Queue([root]),
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
          if (result === visit.RECURSE) {
            queue.push(item);
          } else if (result === visit.BREAK) {
            return queue.empty();
          }
        }
      }
    }
  }

  exports.visit = visit;



  exports.collector = (function(){
    function path(){
      var parts = [].slice.call(arguments);

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
      var handlers = Object.create(null);
      for (var k in o) {
        handlers[k] = o[k] instanceof Array ? path(o[k]) : o[k];
      }

      return function(node){
        var items  = [];

        visit(node, function(node, parent){
          if (!node) return CONTINUE;

          var handler = handlers[node.type];

          if (handler === true) {
            items.push(node);
          } else if (handler === RECURSE || handler === CONTINUE) {
            return handler;
          } else if (typeof handler === 'function') {
            var item = handler(node);
            if (item !== undefined) {
              items.push(item);
            }
          } else if (node instanceof Array) {
            return RECURSE;
          }

          return CONTINUE;
        });

        return items;
      };
    }

    return collector;
  })();



  exports.Emitter = (function(){
    function Emitter(){
      '_events' in this || define(this, '_events', create(null));
    }

    function on(events, handler){
      events.split(/\s+/).forEach(function(event){
        if (!(event in this)) {
          this[event] = [];
        }
        this[event].push(handler);
      }, this._events);
    }

    function off(events, handler){
      events.split(/\s+/).forEach(function(event){
        if (event in this) {
          var index = '__index' in handler ? handler.__index : this[event].indexOf(handler);
          if (~index) {
            this[event].splice(index, 1);
          }
        }
      }, this._events);
    }

    function once(events, handler){
      this.on(events, function once(val){
        this.off(events, once);
        handler.call(this, val);
      });
    }

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
     define(Emitter.prototype, [on, off, once, emit]);
    return Emitter;
  })();



  function Hash(){}
  Hash.prototype = create(null);
  exports.Hash = Hash;


  var PropertyList = exports.PropertyList = (function(){
    function PropertyList(){
      this.hash = new Hash;
      this.props = [];
      this.holes = 0;
      this.length = 0;
    }

    function get(key){
      var index = this.hash[key];
      if (index !== undefined) {
        return this.props[index][1];
      }
    }

    function getAttribute(key){
      var index = this.hash[key];
      if (index !== undefined) {
        return this.props[index][2];
      } else {
        return null;
      }
    }

    function getProperty(key){
      var index = this.hash[key];
      if (index !== undefined) {
        return this.props[index];
      } else {
        return null;
      }
    }

    function set(key, value, attr){
      var index = this.hash[key],
          prop;

      if (index === undefined) {
        index = this.hash[key] = this.props.length;
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
    }

    function setAttribute(key, attr){
      var index = this.hash[key];
      if (index !== undefined) {
        this.props[index][2] = attr;
        return true;
      } else {
        return false;
      }
    }

    function setProperty(prop){
      var key = prop[0],
          index = this.hash[key];
      if (index === undefined) {
        index = this.hash[key] = this.props.length;
      }
      this.props[index] = prop;
    }

    function remove(key){
      var index = this.hash[key];
      if (index !== undefined) {
        this.hash[key] = undefined;
        this.props[index] = undefined;
        this.holes++;
        this.length--;
        return true;
      } else {
        return false;
      }
    }

    function has(key){
      return this.hash[key] !== undefined;
    }

    function hasAttribute(key, mask){
      var attr = this.getAttribute(key);
      if (attr !== null) {
        return (attr & mask) > 0;
      }
    }

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
          this.props[index] = prop;
          this.hash[prop[0]] = index++;
        }
      }
    }

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
    }

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
    }

    function translate(callback, context){
      var out = new PropertyList;

      out.length = this.length;
      context = context || this;

      this.forEach(function(prop, index){
        prop = callback.call(context, prop, index, this);
        out.props[index] = prop;
        out.hash[prop[0]] = index;
      });

      return out;
    }

    function filter(callback, context){
      var out = new PropertyList,
          index = 0;

      context = context || this;

      this.forEach(function(prop, i){
        if (callback.call(context, prop, i, this)) {
          out.props[index] = prop;
          out.hash[prop[0]] = index++;
        }
      });

      return out;
    }

    function clone(deep){
      return this.translate(function(prop, i){
        return deep ? prop.slice() : prop;
      });
    }

    function keys(){
      return this.map(function(prop){
        return prop[0];
      });
    }

    function values(){
      return this.map(function(prop){
        return prop[1];
      });
    }

    function items(){
      return this.map(function(prop){
        return prop.slice();
      });
    }

    function merge(list){
      list.forEach(this.setProperty, this);
    }

    define(PropertyList.prototype, [
      get, getAttribute, getProperty, set, setAttribute, setProperty, remove, has, hasAttribute,
      compact, forEach, map, translate,  filter, clone, keys, values, items, merge
    ]);
    return PropertyList;
  })();



  exports.Stack = (function(){
    function Stack(){
      this.empty();
      for (var k in arguments)
        this.push(arguments[k]);
    }

    function push(item){
      this.items.push(item);
      this.length++;
      this.top = item;
      return this;
    }

    function pop(){
      this.length--;
      this.top = this.items[this.length - 1];
      return this.items.pop();
    }

    function empty(){
      this.length = 0;
      this.items = [];
      this.top = undefined;
    }

    function first(callback, context){
      var i = this.length;
      context || (context = this);
      while (i--)
        if (callback.call(context, this[i], i, this))
          return this[i];
    }

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
    }

    define(Stack.prototype, [push, pop, empty, first, filter]);
    return Stack;
  })();

  var Queue = exports.Queue = (function(){
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

    function push(item){
      this.items.push(item);
      this.length++;
      return this;
    }

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
    }

    function empty(){
      this.length = 0;
      this.index = 0;
      this.items = [];
      return this;
    }

    function front(){
      return this.items[this.index];
    }

    define(Queue.prototype, [push, empty, front, shift]);
    return Queue;
  })();


  exports.Feeder = (function(){
    function Feeder(callback, context, pace){
      var self = this;
      this.queue = new Queue;
      this.active = false;
      this.feeder = feeder;
      this.pace = pace || 5;

      function feeder(){
        var count = Math.min(self.pace, self.queue.length);

        while (self.active && count--) {
          callback.call(context, self.queue.shift());
        }

        if (!self.queue.length) {
          self.active = false;
        } else if (self.active) {
          setTimeout(feeder, 15);
        }
      }
    }

    function push(item){
      this.queue.push(item);
      if (!this.active) {
        this.active = true;
        setTimeout(this.feeder, 15);
      }
      return this;
    }

    function pause(){
      this.active = false;
    }

    define(Feeder.prototype, [push, pause]);
    return Feeder;
  })();




  function inspect(o){
    o = require('util').inspect(o, null, 10);
    console.log(o);
    return o;
  }

  function decompile(ast, options){
    return escodegen.generate(ast, options || decompile.options);
  }

  exports.decompile = decompile;

  decompile.options = {
    comment: false,
    allowUnparenthesizedNew: true,
    format: {
      indent: {
        style: '  ',
        base: 0,
      },
      json       : false,
      renumber   : false,
      hexadecimal: true,
      quotes     : 'single',
      escapeless : true,
      compact    : false,
      parentheses: true,
      semicolons : true
    }
  };

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
    GlobalObject      : new NativeBrand('global'),
    NativeArguments   : new NativeBrand('Arguments'),
    NativeArray       : new NativeBrand('Array'),
    NativeDate        : new NativeBrand('Date'),
    NativeFunction    : new NativeBrand('Function'),
    NativeMap         : new NativeBrand('Map'),
    NativeObject      : new NativeBrand('Object'),
    NativePrivateName : new NativeBrand('PrivateName'),
    NativeRegExp      : new NativeBrand('RegExp'),
    NativeSet         : new NativeBrand('Set'),
    NativeWeakMap     : new NativeBrand('WeakMap'),
    BooleanWrapper    : new NativeBrand('Boolean'),
    NumberWrapper     : new NativeBrand('Number'),
    StringWrapper     : new NativeBrand('String'),
    NativeError       : new NativeBrand('Error'),
    NativeMath        : new NativeBrand('Math'),
    NativeJSON        : new NativeBrand('JSON')
  };


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
    var args = {}, argNames = [];
    var src = message.map(function(str){
      if (str[0] === '$') {
        if (!args.hasOwnProperty(str))
          argNames.push(str);
        return str;
      } else {
        return '"'+str.replace(/["\\\n]/g, '\\$0')+'"';
      }
    }).join('+');
    var src = 'return '+
      'function '+name+'('+argNames.join(', ')+') {\n'+
      '  return '+src+';\n'+
      '}';
    this.name = name;
    this.type = type;
    return new Function('e', src)(this);
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
    error = errors[type];
    return exports.createError(error.name, type, error.apply(null, args));
  }

  exports.MakeException = MakeException;


  function ThrowException(type, args){
    return new AbruptCompletion('throw', MakeException(type, args));
  }

  exports.ThrowException = ThrowException;


  return exports;
})({}, {
  Error: {
    cyclic_proto                   : ["Cyclic __proto__ value"],
    code_gen_from_strings          : ["Code generation from strings disallowed for this context"],
  },
  TypeError: {
    unexpected_token               : ["Unexpected token ", "$0"],
    unexpected_token_number        : ["Unexpected number"],
    unexpected_token_string        : ["Unexpected string"],
    unexpected_token_identifier    : ["Unexpected identifier"],
    unexpected_reserved            : ["Unexpected reserved word"],
    unexpected_strict_reserved     : ["Unexpected strict mode reserved word"],
    unexpected_eos                 : ["Unexpected end of input"],
    malformed_regexp               : ["Invalid regular expression: /", "$0", "/: ", "$1"],
    unterminated_regexp            : ["Invalid regular expression: missing /"],
    regexp_flags                   : ["Cannot supply flags when constructing one RegExp from another"],
    incompatible_method_receiver   : ["Method ", "$0", " called on incompatible receiver ", "$1"],
    invalid_lhs_in_assignment      : ["Invalid left-hand side in assignment"],
    invalid_lhs_in_for_in          : ["Invalid left-hand side in for-in"],
    invalid_lhs_in_postfix_op      : ["Invalid left-hand side expression in postfix operation"],
    invalid_lhs_in_prefix_op       : ["Invalid left-hand side expression in prefix operation"],
    multiple_defaults_in_switch    : ["More than one default clause in switch statement"],
    newline_after_throw            : ["Illegal newline after throw"],
    redeclaration                  : ["$0", " '", "$1", "' has already been declared"],
    no_catch_or_finally            : ["Missing catch or finally after try"],
    uncaught_exception             : ["Uncaught ", "$0"],
    stack_trace                    : ["Stack Trace:\n", "$0"],
    called_non_callable            : ["$0", " is not a function"],
    property_not_function          : ["Property '", "$0", "' of object ", "$1", " is not a function"],
    not_constructor                : ["$0", " is not a constructor"],
    cannot_convert_to_primitive    : ["Cannot convert object to primitive value"],
    with_expression                : ["$0", " has no properties"],
    illegal_invocation             : ["Illegal invocation"],
    apply_non_function             : ["Function.prototype.apply was called on ", "$0", ", which is a ", "$1", " and not a function"],
    apply_wrong_args               : ["Function.prototype.apply: Arguments list has wrong type"],
    invalid_in_operator_use        : ["Cannot use 'in' operator to search for '", "$0", "' in ", "$1"],
    instanceof_function_expected   : ["Expecting a function in instanceof check, but got ", "$0"],
    instanceof_nonobject_proto     : ["Function has non-object prototype '", "$0", "' in instanceof check"],
    null_to_object                 : ["Cannot convert null to object"],
    undefined_to_object            : ["Cannot convert undefined to object"],
    reduce_no_initial              : ["Reduce of empty array with no initial value"],
    getter_must_be_callable        : ["Getter must be a function: ", "$0"],
    setter_must_be_callable        : ["Setter must be a function: ", "$0"],
    value_and_accessor             : ["Invalid property.  A property cannot both have accessors and be writable or have a value, ", "$0"],
    proto_object_or_null           : ["Object prototype may only be an Object or null"],
    property_desc_object           : ["Property description must be an object: ", "$0"],
    redefine_disallowed            : ["Cannot redefine property: ", "$0"],
    define_disallowed              : ["Cannot define property:", "$0", ", object is not extensible."],
    non_extensible_proto           : ["$0", " is not extensible"],
    handler_non_object             : ["Proxy.", "$0", " called with non-object as handler"],
    proto_non_object               : ["Proxy.", "$0", " called with non-object as prototype"],
    trap_function_expected         : ["Proxy.", "$0", " called with non-function for '", "$1", "' trap"],
    handler_trap_missing           : ["Proxy handler ", "$0", " has no '", "$1", "' trap"],
    handler_trap_must_be_callable  : ["Proxy handler ", "$0", " has non-callable '", "$1", "' trap"],
    handler_returned_false         : ["Proxy handler ", "$0", " returned false from '", "$1", "' trap"],
    handler_returned_undefined     : ["Proxy handler ", "$0", " returned undefined from '", "$1", "' trap"],
    proxy_prop_not_configurable    : ["Proxy handler ", "$0", " returned non-configurable descriptor for property '", "$2", "' from '", "$1", "' trap"],
    proxy_non_object_prop_names    : ["Trap '", "$1", "' returned non-object ", "$0"],
    proxy_repeated_prop_name       : ["Trap '", "$1", "' returned repeated property name '", "$2", "'"],
    invalid_weakmap_key            : ["Invalid value used as weak map key"],
    no_input_to_regexp             : ["No input to ", "$0"],
    invalid_json                   : ["String '", "$0", "' is not valid JSON"],
    circular_structure             : ["Converting circular structure to JSON"],
    called_on_non_object           : ["$0", " called on non-object"],
    called_on_null_or_undefined    : ["$0", " called on null or undefined"],
    array_indexof_not_defined      : ["Array.getIndexOf: Argument undefined"],
    strict_delete_property         : ["Cannot delete property '", "$0", "' of ", "$1"],
    super_delete_property          : ["Cannot delete property '", "$0", "' from super"],
    strict_read_only_property      : ["Cannot assign to read only property '", "$0", "' of ", "$1"],
    strict_cannot_assign           : ["Cannot assign to read only '", "$0", "' in strict mode"],
    strict_poison_pill             : ["'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them"],
    object_not_extensible          : ["Can't add property ", "$0", ", object is not extensible"],


    proxy_prototype_inconsistent        : ["cannot report a prototype value that is inconsistent with target prototype value"],
    proxy_extensibility_inconsistent    : ["(cannot report a non-extensible object as extensible or vice versa"],
    proxy_configurability_inconsistent  : ["cannot report innacurate configurability for property '", "$0"],
    proxy_enumerate_properties          : ["enumerate trap failed to include non-configurable enumerable property '", "$0", "'"],
    non_object_superclass               : ["non-object superclass provided"],
    non_object_superproto               : ["non-object superprototype"],
    invalid_super_binding               : ["object has no super binding"],
    not_generic                         : ["$0", " is not generic and was called on an invalid target"],
    spread_non_object                   : ["Expecting an object as spread argument, but got ", "$0"]
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
    unable_to_parse                : ["Parse error"],
    invalid_regexp_flags           : ["Invalid flags supplied to RegExp constructor '", "$0", "'"],
    invalid_regexp                 : ["Invalid RegExp pattern /", "$0", "/"],
    illegal_break                  : ["Illegal break statement"],
    illegal_continue               : ["Illegal continue statement"],
    illegal_return                 : ["Illegal return statement"],
    illegal_let                    : ["Illegal let declaration outside extended mode"],
    error_loading_debugger         : ["Error loading debugger"],
    illegal_access                 : ["Illegal access"],
    invalid_preparser_data         : ["Invalid preparser data for function ", "$0"],
    strict_mode_with               : ["Strict mode code may not include a with statement"],
    strict_catch_variable          : ["Catch variable may not be eval or arguments in strict mode"],
    too_many_arguments             : ["Too many arguments in function call (only 32766 allowed)"],
    too_many_parameters            : ["Too many parameters in function definition (only 32766 allowed)"],
    too_many_variables             : ["Too many variables declared (only 32767 allowed)"],
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
    strict_function                : ["In strict mode code, functions can only be declared at top level or immediately within another function." ],
    strict_caller                  : ["Illegal access to a strict mode caller function."],
    unprotected_let                : ["Illegal let declaration in unprotected statement context."],
    unprotected_const              : ["Illegal const declaration in unprotected statement context."],
    const_assign                   : ["Assignment to constant variable."],
    invalid_module_path            : ["Module does not export '", "$0", "', or export is not itself a module"],
    module_type_error              : ["Module '", "$0", "' used improperly"],
  },
}, typeof module !== 'undefined' ? module.exports : {});



exports.assembler = (function(exports){
  var utility   = require('./utility'),
      util      = require('util');

  var visit     = utility.visit,
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
      quotes    = utility.quotes;

  var constants = require('./constants'),
      BINARYOPS = constants.BINARYOPS.hash,
      UNARYOPS  = constants.UNARYOPS.hash,
      ENTRY     = constants.ENTRY.hash,
      AST       = constants.AST,
      FUNCTYPE  = constants.FUNCTYPE.hash;

  var hasOwn = {}.hasOwnProperty;






  function parenter(node, parent){
    visit(node, function(node){
      if (isObject(node) && parent)
        define(node, 'parent', parent);
      return visit.RECURSE;
    });
  }

  function reinterpretNatives(node){
    visit(node, function(node){
      if (node.type === 'Identifier' && /^\$__/.test(node.name)) {
        node.type = 'NativeIdentifier';
        node.name = node.name.slice(3);
      } else {
        return visit.RECURSE;
      }
    });
  }


  var boundNamesCollector = collector({
    ObjectPattern      : visit.RECURSE,
    ArrayPattern       : visit.RECURSE,
    VariableDeclaration: visit.RECURSE,
    VariableDeclarator : visit.RECURSE,
    BlockStatement     : visit.RECURSE,
    Property           : visit.RECURSE,
    Identifier         : ['name'],
    FunctionDeclaration: ['id', 'name'],
    ClassDeclaration   : ['id', 'name']
  });

  function BoundNames(node){
    var names = boundNamesCollector(node);
    if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
      return names.slice(1);
    } else if (node.type === 'FunctionExpression') {
      return node.id ? names.slice(1) : names;
    } else {
      return names;
    }
  }


  var LexicalDeclarations = (function(lexical){
    return collector({
      ClassDeclaration: lexical(false),
      FunctionDeclaration: lexical(false),
      SwitchCase: visit.RECURSE,
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
      node.BoundNames = BoundNames(node);
      return node;
    };
  });


  function isSuperReference(node) {
    return !!node && node.type === 'Identifier' && node.name === 'super';
  }

  function ReferencesSuper(node){
    var found = false;
    visit(node, function(node){
      switch (node.type) {
        case 'MemberExpression':
          if (isSuperReference(node.object)) {
            found = true;
            return visit.BREAK;
          }
        case 'CallExpression':
          if (isSuperReference(node.callee)) {
            found = true;
            return visit.BREAK;
          }
          break;
        case 'FunctionExpression':
        case 'FunctionDeclaration':
        case 'ArrowFunctionExpression':
          return visit.CONTINUE;
      }
      return visit.RECURSE;
    });
    return found;
  }

  function isUseStrictDirective(node){
    return node.type === 'ExpressionSatatement'
        && node.expression.type === 'Literal'
        && node.expression.value === 'use strict';
  }

  function isFunction(node){
    return node.type === 'FunctionDeclaration'
        || node.type === 'FunctionExpression'
        || node.type === 'ArrowFunctionExpression';
  }

  function isStrict(node){
    if (isFunction(node)) {
      node = node.body.body;
    } else if (node.type === 'Program') {
      node = node.body;
    }
    if (node instanceof Array) {
      for (var i=0, element;  element = node[i]; i++) {
        if (element) {
          if (isUseStrictDirective(element)) {
            return true;
          } else if (element.type !== 'EmptyStatement' && element.type !== 'FunctionDeclaration') {
            return false;
          }
        }
      }
    }
    return false;
  }

  function isPattern(node){
    return !!node && node.type === 'ObjectPattern' || node.type === 'ArrayPattern';
  }


  var collectExpectedArguments = collector({
    Identifier: true,
    ObjectPattern: true,
    ArrayPattern: true,
  });

  function Params(params, node, rest){
    this.length = 0;
    if (params) {
      [].push.apply(this, params);
    }
    this.Rest = rest;
    this.BoundNames = BoundNames(node);
    var args = collectExpectedArguments(this);
    this.ExpectedArgumentCount = args.length;
    this.ArgNames = [];
    for (var i=0; i < args.length; i++) {
      if (args[i].type === 'Identifier') {
        this.ArgNames.push(args[i].name);
      } else {

      }
    }
  }

  function Code(node, source, type, global, strict){

    function Instruction(args){
      Operation.apply(this, args);
    }

    inherit(Instruction, Operation, {
      code: this
    });

    this.topLevel = node.type === 'Program';
    var body = this.topLevel ? node : node.body;

    define(this, {
      body: body,
      source: source,
      LexicalDeclarations: LexicalDeclarations(body),
      createOperation: function(args){
        var op =  new Instruction(args);
        this.ops.push(op);
        return op;
      }
    });

    if (!this.topLevel && node.id) {
      this.name = node.id.name;
    }

    this.range = node.range;
    this.loc = node.loc;

    this.global = global;
    this.entrances = [];
    this.Type = type || FUNCTYPE.NORMAL;
    this.VarDeclaredNames = [];
    this.NeedsSuperBinding = ReferencesSuper(this.body);
    this.Strict = strict || isStrict(this.body);
    this.params = new Params(node.params, node, node.rest);
    this.ops = [];
    this.children = [];

  }

  define(Code.prototype, [
    function inherit(code){
      if (code) {
        this.identifiers = code.identifiers;
        this.hash = code.hash;
        this.natives = code.natives;
      }
    },
    function intern(name){
      return name;
      if (name in this.hash) {
        return this.hash[name];
      } else {
        var index = this.hash[name] = this.identifiers.length;
        this.identifiers[index] = name;
        return index;
      }
    },
    function lookup(id){
      return id;
      if (typeof id === 'number') {
        return this.identifiers[id];
      } else {
        return id;
      }
    }
  ]);

  var opcodes = 0;

  function OpCode(params, name){
    this.id = opcodes++;
    this.params = params;
    this.name = name;
  }

  define(OpCode.prototype, [
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



  var ARRAY         = new OpCode(0, 'ARRAY'),
      ARG           = new OpCode(0, 'ARG'),
      ARGS          = new OpCode(0, 'ARGS'),
      ARRAY_DONE    = new OpCode(0, 'ARRAY_DONE'),
      BINARY        = new OpCode(1, 'BINARY'),
      BLOCK         = new OpCode(1, 'BLOCK'),
      CALL          = new OpCode(0, 'CALL'),
      CASE          = new OpCode(1, 'CASE'),
      CLASS_DECL    = new OpCode(1, 'CLASS_DECL'),
      CLASS_EXPR    = new OpCode(1, 'CLASS_EXPR'),
      COMPLETE      = new OpCode(0, 'COMPLETE'),
      CONST         = new OpCode(1, 'CONST'),
      CONSTRUCT     = new OpCode(0, 'CONSTRUCT'),
      DEBUGGER      = new OpCode(0, 'DEBUGGER'),
      DEFAULT       = new OpCode(1, 'DEFAULT'),
      DUP           = new OpCode(0, 'DUP'),
      ELEMENT       = new OpCode(0, 'ELEMENT'),
      ENUM          = new OpCode(0, 'ENUM'),
      FUNCTION      = new OpCode(2, 'FUNCTION'),
      GET           = new OpCode(0, 'GET'),
      IFEQ          = new OpCode(2, 'IFEQ'),
      IFNE          = new OpCode(2, 'IFNE'),
      INDEX         = new OpCode(2, 'INDEX'),
      JSR           = new OpCode(2, 'JSR'),
      JUMP          = new OpCode(1, 'JUMP'),
      LET           = new OpCode(1, 'LET'),
      LITERAL       = new OpCode(1, 'LITERAL'),
      MEMBER        = new OpCode(1, 'MEMBER'),
      METHOD        = new OpCode(3, 'METHOD'),
      NATIVE_CALL   = new OpCode(0, 'NATIVE_CALL'),
      NATIVE_REF    = new OpCode(1, 'NATIVE_REF'),
      NEXT          = new OpCode(1, 'NEXT'),
      OBJECT        = new OpCode(0, 'OBJECT'),
      POP           = new OpCode(0, 'POP'),
      POPN          = new OpCode(1, 'POPN'),
      PROPERTY      = new OpCode(1, 'PROPERTY'),
      PUT           = new OpCode(0, 'PUT'),
      REF           = new OpCode(1, 'REF'),
      REGEXP        = new OpCode(1, 'REGEXP'),
      RETURN        = new OpCode(0, 'RETURN'),
      ROTATE        = new OpCode(1, 'ROTATE'),
      RUN           = new OpCode(0, 'RUN'),
      SAVE          = new OpCode(0, 'SAVE'),
      SPREAD        = new OpCode(1, 'SPREAD'),
      SPREAD_ARG    = new OpCode(0, 'SPREAD_ARG'),
      STRING        = new OpCode(1, 'STRING'),
      SUPER_CALL    = new OpCode(0, 'SUPER_CALL'),
      SUPER_ELEMENT = new OpCode(0, 'SUPER_ELEMENT'),
      SUPER_MEMBER  = new OpCode(1, 'SUPER_MEMBER'),
      THIS          = new OpCode(0, 'THIS'),
      THROW         = new OpCode(1, 'THROW'),
      UNARY         = new OpCode(1, 'UNARY'),
      UNDEFINED     = new OpCode(0, 'UNDEFINED'),
      UPDATE        = new OpCode(1, 'UPDATE'),
      UPSCOPE       = new OpCode(0, 'UPSCOPE'),
      VAR           = new OpCode(1, 'VAR'),
      WITH          = new OpCode(0, 'WITH');




  function Operation(op, a, b, c, d){
    this.op = op;
    this.loc = currentNode.loc;
    this.range = currentNode.range;
    for (var i=0; i < op.params; i++) {
      this[i] = arguments[i + 1];
    }
  }


  define(Operation.prototype, [
    function inspect(){
      var out = [];
      for (var i=0; i < this.op.params; i++) {
        if (typeof this[i] === 'number') {
          var interned = this.code.lookup(this[i]);
          if (typeof interned === 'string') {
            out.push(interned)
          }
        } else {
          out.push(util.inspect(this[i]));
        }
      }

      return util.inspect(this.op)+'('+out.join(', ')+')';
    }
  ]);


  function ClassDefinition(node){
    this.name = node.id ? node.id.name : null;
    this.pattern = node.id;
    this.methods = [];

    for (var i=0, method; method = node.body.body[i]; i++) {
      var code = new Code(method.value, context.source, FUNCTYPE.METHOD, false, context.code.strict);
      if (this.name) {
        code.name = this.name + '#' + method.key.name;
      } else {
        code.name = method.key.name;
      }
      context.pending.push(code);

      if (method.kind === '') {
        method.kind = 'method';
      }

      if (method.key.name === 'constructor') {
        this.ctor = code;
      } else {
        this.methods.push({
          kind: method.kind,
          code: code,
          name: method.key.name
        });
      }
    }

    if (node.superClass) {
      recurse(node.superClass);
      record(GET);
      this.superClass = node.superClass.name;
    }
  }


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



  function Entry(labels, level){
    this.labels = labels;
    this.level = level;
    this.breaks = [];
    this.continues = [];
  }

  define(Entry.prototype, {
    labels: null,
    breaks: null,
    continues: null,
    level: null
  })

  define(Entry.prototype, [
    function updateContinues(address){
      if (address !== undefined) {
        for (var i=0, item; item = this.breaks[i]; i++) {
          item.position = address;
        }
      }
    },
    function updateBreaks(address){
      if (address !== undefined) {
        for (var i=0, item; item = this.continues[i]; i++) {
          item.position = address;
        }
      }
    }
  ]);


  function AssemblerOptions(o){
    o = Object(o);
    for (var k in this)
      this[k] = k in o ? o[k] : this[k];
  }

  AssemblerOptions.prototype = {
    eval: false,
    normal: true,
    scoped: false,
    natives: false,
    filename: null
  };



  var context;

  function Assembler(options){
    this.options = new AssemblerOptions(options);
  }

  define(Assembler.prototype, {
    source: null,
    node: null,
    code: null,
    pending: null,
    levels: null,
    jumps: null,
    labels: null,
  });

  define(Assembler.prototype, [
    function assemble(node, source){
      this.pending = new Stack;
      this.levels = new Stack;
      this.jumps = new Stack;
      this.labels = null;
      this.source = source;

      if (this.options.normal)
        node = node.body[0].expression;

      var type = this.options.eval ? 'eval' : this.options.normal ? 'function' : 'global';
      var code = new Code(node, source, type, !this.options.scoped);
      code.identifiers = [];
      code.hash = create(null);
      code.topLevel = true;

      if (this.options.natives) {
        code.natives = true;
        reinterpretNatives(node);
      }

      parenter(node);
      context = this;
      this.queue(code);

      while (this.pending.length) {
        var lastCode = this.code;
        this.code = this.pending.pop();
        this.code.filename = this.filename;
        if (lastCode) {
          this.code.inherit(lastCode);
        }
        recurse(this.code.body);
        if (this.code.eval || this.code.global){
          record(COMPLETE);
        } else {
          if (this.code.Type === FUNCTYPE.ARROW && this.code.body.type !== 'BlockStatement') {
            record(GET);
          } else {
            record(UNDEFINED);
          }
          record(RETURN);
        }
      }

      return code;
    },
    function queue(code){
      if (this.code) {
        this.code.children.push(code);
      }
      this.pending.push(code);
    }
  ]);

  var currentNode;
  function recurse(node){
    if (node) {
      var lastNode = currentNode;
      currentNode = node;
      handlers[node.type](node);
      if (lastNode) {
        currentNode = lastNode;
      }
    }
  }

  function intern(string){
    return string;
  }

  function record(){
    return context.code.createOperation(arguments);
  }


  function current(){
    return context.code.ops.length;
  }

  function last(){
    return context.code.ops[context.code.ops.length - 1];
  }

  function adjust(op){
    return op[0] = context.code.ops.length;
  }

  function block(callback){
    if (context.labels){
      var entry = new Entry(context.labels, context.levels.length);
      context.jumps.push(entry);
      context.labels = create(null);
      entry.updateBreaks(callback());
      context.jumps.pop();
    } else {
      callback();
    }
  }

  function entrance(callback){
    var entry = new Entry(context.labels, context.levels.length);
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
    context.code.entrances.push(new Unwinder(type, begin, current()));
  }

  function move(node){
    if (node.label) {
      var entry = context.jumps.first(function(entry){
        return node.label.name in entry.labels;
      });
    } else {
      var entry = context.jumps.first(function(entry){
        return entry && entry.continues;
      });
    }

    var levels = {
      FINALLY: function(level){
        level.entries.push(record(JSR, 0, false));
      },
      WITH: function(){
        record(UPSCOPE);
      },
      SUBROUTINE: function(){
        record(POPN, 3);
      },
      FORIN: function(){
        entry.level + 1 !== len && record(POP);
      }
    };

    var min = entry ? entry.level : 0;
    for (var len = context.levels.length; len > min; --len){
      var level = context.levels[len - 1];
      levels[level.type](level);
    }
    return entry;
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
        lefts = left[key],
        rights = right[key],
        binding, value;

    for (var i=0; i < lefts.length; i++) {
      binding = elementAt[key](left, i);

      if (isPattern(binding)){
        value = rights && rights[i] ? elementAt[key](right, i) : binding;
        destructure(binding, value);
      } else {
        if (binding.type === 'SpreadElement') {
          recurse(binding.argument);
          recurse(right);
          record(SPREAD, i);
        } else {
          recurse(binding);
          recurse(right);
          if (left.type === 'ArrayPattern') {
            record(LITERAL, i);
            record(ELEMENT, i);
          } else {
            record(MEMBER, binding.name)
          }
        }
        record(PUT);
      }
    }
  }

  function args(node){
    record(ARGS);
    for (var i=0, item; item = node[i]; i++) {
      if (item && item.type === 'SpreadElement') {
        recurse(item.argument);
        record(GET);
        record(SPREAD_ARG);
      } else {
        recurse(item);
        record(GET);
        record(ARG);
      }
    }
  }



  function AssignmentExpression(node){
    if (node.operator === '='){
      if (isPattern(node.left)){
        destructure(node.left, node.right);
      } else {
        recurse(node.left);
        recurse(node.right);
        record(GET);
        record(PUT);
      }
    } else {
      recurse(node.left);
      record(DUP);
      record(GET);
      recurse(node.right);
      record(GET);
      record(BINARY, BINARYOPS[node.operator.slice(0, -1)]);
      record(PUT);
    }
  }

  function ArrayExpression(node){
    record(ARRAY);
    for (var i=0, item; i < node.elements.length; i++) {
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

      record(INDEX, empty, spread);
    }
    record(ARRAY_DONE);
  }

  function ArrayPattern(node){}

  function ArrowFunctionExpression(node){
    var code = new Code(node, context.code.source, FUNCTYPE.ARROW, false, context.code.strict);
    context.queue(code);
    record(FUNCTION, null, code);
  }

  function BinaryExpression(node){
    recurse(node.left);
    record(GET);
    recurse(node.right);
    record(GET);
    record(BINARY, BINARYOPS[node.operator]);
  }

  function BreakStatement(node){
    var entry = move(node);
    if (entry) {
      entry.breaks.push(record(JUMP, 0));
    }
  }

  function BlockStatement(node){
    block(function(){
      lexical(function(){
        record(BLOCK, { LexicalDeclarations: LexicalDeclarations(node.body) });

        for (var i=0, item; item = node.body[i]; i++) {
          recurse(item);
        }

        record(UPSCOPE);
      });
    });
  }

  function CallExpression(node){
    if (isSuperReference(node.callee)) {
      if (context.code.Type === 'global' || context.code.Type === 'eval' && context.code.global) {
        throwError('illegal_super');
      }
      record(SUPER_CALL);
    } else {
      recurse(node.callee);
    }
    record(DUP);
    record(GET);
    args(node.arguments);
    record(node.callee.type === 'NativeIdentifier' ? NATIVE_CALL : CALL);
  }

  function CatchClause(node){
    lexical(function(){
      var decls = LexicalDeclarations(node.body);
      decls.push({
        type: 'VariableDeclaration',
        kind: 'var',
        IsConstantDeclaration: false,
        BoundNames: [node.param.name],
        declarations: [{
          type: 'VariableDeclarator',
          id: node.param,
          init: undefined
        }]
      });
      record(BLOCK, { LexicalDeclarations: decls });
      recurse(node.param);
      record(GET);
      record(PUT);
      for (var i=0, item; item = node.body.body[i]; i++)
        recurse(item);

      record(UPSCOPE);
    });
  }

  function ClassBody(node){}

  function ClassDeclaration(node){
    record(CLASS_DECL, new ClassDefinition(node));
  }

  function ClassExpression(node){
    record(CLASS_EXPR, new ClassDefinition(node));
  }

  function ClassHeritage(node){}

  function ConditionalExpression(node){
    recurse(node.test);
    record(GET);
    var test = record(IFEQ, 0, false);
    recurse(node.consequent)
    record(GET);
    var alt = record(JUMP, 0);
    adjust(test);
    recurse(node.alternate);
    record(GET);
    adjust(alt)
  }

  function ContinueStatement(node){
    var entry = move(node);
    if (entry) {
      entry.continues.push(record(JUMP, 0));
    }
  }

  function DoWhileStatement(node){
    entrance(function(){
      var start = current();
      recurse(node.body);
      var cond = current();
      recurse(node.test);
      record(GET);
      record(IFEQ, start, true);
      return cond;
    });
  }

  function DebuggerStatement(node){
    record(DEBUGGER);
  }

  function EmptyStatement(node){}
  function ExportSpecifier(node){}
  function ExportSpecifierSet(node){}
  function ExportDeclaration(node){}

  function ExpressionStatement(node){
    recurse(node.expression);
    record(GET);
    if (context.code.eval || context.code.global) {
      record(SAVE)
    } else {
      record(POP);
    }
  }

  function ForStatement(node){
    entrance(function(){
      if (node.init){
        recurse(node.init);
        if (node.init.type !== 'VariableDeclaration') {
          record(GET);
          record(POP);
        }
      }

      var test = current();
      if (node.test) {
        recurse(node.test);
        record(GET);
        var op = record(IFEQ, 0, false);
      }
      var update = current();

      recurse(node.body);
      if (node.update) {
        recurse(node.update);
        record(GET);
        record(POP);
      }

      record(JUMP, test);
      adjust(op);
      return update;
    });
  }

  function ForInStatement(node){
    entrance(function(){
      recurse(node.left);
      record(REF, last()[0].name);
      recurse(node.right);
      record(GET);
      record(ENUM);
      var update = current();
      var op = record(NEXT);
      recurse(node.body);
      record(JUMP, update);
      adjust(op);
      return update;
    });
  }

  function ForOfStatement(node){
    entrance(function(){
      recurse(node.right);
      record(GET);
      record(MEMBER, intern('iterator'));
      record(GET);
      record(ARGS);
      record(CALL);
      record(ROTATE, 4);
      record(POPN, 3);
      var update = current();
      record(MEMBER, intern('next'));
      record(GET);
      record(ARGS);
      record(CALL);
      recurse(node.left);
      recurse(node.body);
      record(JUMP, update);
      adjust(op);
      record(POPN, 2);
      return update;
    });
  }

  function FunctionDeclaration(node){
    node.Code = new Code(node, context.code.source, FUNCTYPE.NORMAL, false, context.code.strict);
    context.queue(node.Code);
  }

  function FunctionExpression(node){
    var code = new Code(node, context.code.source, FUNCTYPE.NORMAL, false, context.code.strict);
    context.queue(code);
    record(FUNCTION, intern(node.id ? node.id.name : ''), code);
  }

  function Glob(node){}

  function Identifier(node){
    record(REF, intern(node.name));
  }

  function IfStatement(node){
    recurse(node.test);
    record(GET);
    var test = record(IFEQ, 0, false);
    recurse(node.consequent);

    if (node.alternate) {
      var alt = record(JUMP, 0);
      adjust(test);
      recurse(node.alternate);
      adjust(alt);
    } else {
      adjust(test);
    }
  }

  function ImportDeclaration(node){}

  function ImportSpecifier(spec){}

  function Literal(node){
    if (node.value instanceof RegExp) {
      record(REGEXP, node.value);
    } else if (typeof node.value === 'string') {
      record(STRING, intern(node.value));
    } else {
      record(LITERAL, node.value);
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
    record(GET);
    var op = record(IFNE, 0, node.operator === '||');
    recurse(node.right);
    record(GET);
    adjust(op);
  }

  function MemberExpression(node){
    var isSuper = isSuperReference(node.object);
    if (isSuper){
      if (context.code.Type === 'global' || context.code.Type === 'eval' && context.code.global) {
        throwError('illegal_super_reference');
      }
    } else {
      recurse(node.object);
      record(GET);
    }

    if (node.computed){
      recurse(node.property);
      record(GET);
      record(isSuper ? SUPER_ELEMENT : ELEMENT);
    } else {
      record(isSuper ? SUPER_MEMBER : MEMBER, intern(node.property.name));
    }
  }
  function MethodDefinition(node){}

  function ModuleDeclaration(node){}

  function NativeIdentifier(node){
    record(NATIVE_REF, intern(node.name));
  }

  function NewExpression(node){
    recurse(node.callee);
    record(GET);
    args(node.arguments);
    record(CONSTRUCT);
  }

  function ObjectExpression(node){
    record(OBJECT);
    for (var i=0, item; item = node.properties[i]; i++) {
      recurse(item);
    }
  }

  function ObjectPattern(node){}

  function Path(){}

  function Program(node){
    for (var i=0, item; item = node.body[i]; i++)
      recurse(item);
  }

  function Property(node){
    if (node.kind === 'init'){
      recurse(node.value);
      record(GET);
      record(PROPERTY, intern(node.key.name));
    } else {
      var code = new Code(node.value, context.source, FUNCTYPE.NORMAL, false, context.code.strict);
      context.queue(code);
      record(METHOD, node.kind, code, intern(node.key.name));
    }
  }

  function ReturnStatement(node){
    if (node.argument){
      recurse(node.argument);
      record(GET);
    } else {
      record(UNDEFINED);
    }

    var levels = {
      FINALLY: function(level){
        level.entries.push(record(JSR, 0, true));
      },
      WITH: function(){
        record(UPSCOPE);
      },
      SUBROUTINE: function(){
        record(ROTATE, 4);
        record(POPN, 4);
      },
      FORIN: function(){
        record(ROTATE, 4);
        record(POP);
      }
    };

    for (var len = context.levels.length; len > 0; --len){
      var level = context.levels[len - 1];
      levels[level.type](level);
    }

    record(RETURN);
  }

  function SequenceExpression(node){
    for (var i=0, item; item = node.expressions[i]; i++) {
      recurse(item)
      record(GET);
      record(POP);
    }
    recurse(item);
    record(GET);
  }

  function SwitchStatement(node){
    entrance(function(){
      recurse(node.discriminant);
      record(GET);

      lexical(function(){
        record(BLOCK, { LexicalDeclarations: LexicalDeclarations(node.cases) });

        if (node.cases){
          var cases = [];
          for (var i=0, item; item = node.cases[i]; i++) {
            if (item.test){
              recurse(item.test);
              record(GET);
              cases.push(record(CASE, 0));
            } else {
              var defaultFound = i;
              cases.push(0);
            }
          }

          if (defaultFound != null){
            record(DEFAULT, cases[defaultFound]);
          } else {
            record(POP);
            var last = record(JUMP, 0);
          }

          for (var i=0, item; item = node.cases[i]; i++) {
            adjust(cases[i])
            for (var j=0, consequent; consequent = item.consequent[j]; j++)
              recurse(consequent);
          }

          if (last) {
            adjust(last);
          }
        } else {
          record(POP);
        }

        record(UPSCOPE);
      });
    });
  }

  function TemplateElement(node){}

  function TemplateLiteral(node){}

  function TaggedTemplateExpression(node){}

  function ThisExpression(node){
    record(THIS);
  }

  function ThrowStatement(node){
    recurse(node.argument);
    record(GET);
    record(THROW);
  }

  function TryStatement(node){
    lexical(ENTRY.TRYCATCH, function(){
      recurse(node.block);
    });
    var count = node.handlers.length,
        tryer = record(JUMP, 0),
        handlers = [tryer];

    for (var i=0; i < count; i++) {
      recurse(node.handlers[i]);
      if (i < count - 1) {
        handlers.push(record(JUMP, 0));
      }
    }

    while (i--) {
      adjust(handlers[i]);
    }

    if (node.finalizer) {
      recurse(node.finalizer);
    }
  }

  function UnaryExpression(node){
    recurse(node.argument);
    record(UNARY, UNARYOPS[node.operator]);
  }

  function UpdateExpression(node){
    recurse(node.argument);
    record(UPDATE, !!node.prefix | ((node.operator === '++') << 1));
  }

  function VariableDeclaration(node){
    var op = {
      'var': VAR,
      'const': CONST,
      'let': LET
    }[node.kind];

    for (var i=0, item; item = node.declarations[i]; i++) {
      if (item.init) {
        recurse(item.init);
        record(GET);
      } else if (item.kind === 'let') {
        record(UNDEFINED);
      }

      record(op, item.id);

      if (node.kind === 'var') {
        context.code.VarDeclaredNames.push(item.id.name);
      }
    }
  }

  function VariableDeclarator(node){}

  function WhileStatement(node){
    entrance(function(update){
      var start = current();
      recurse(node.test);
      record(GET);
      var op = record(IFEQ, 0, false)
      recurse(node.body);
      record(JUMP, start);
      adjust(op);
      return start;
    });
  }

  function WithStatement(node){
    recurse(node.object)
    lexical(function(){
      record(WITH);
      recurse(node.body);
      record(UPSCOPE);
    });
  }

  function YieldExpression(node){}

  var handlers = {};

  [ ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression,
    BinaryExpression, BlockStatement, BreakStatement, CallExpression,
    CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassHeritage,
    ConditionalExpression, DebuggerStatement, DoWhileStatement, EmptyStatement,
    ExportDeclaration, ExportSpecifier, ExportSpecifierSet, ExpressionStatement,
    ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration,
    FunctionExpression, Glob, Identifier, IfStatement, ImportDeclaration,
    ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression,
    MethodDefinition, ModuleDeclaration, NativeIdentifier, NewExpression, ObjectExpression,
    ObjectPattern, Path, Program, Property, ReturnStatement, SequenceExpression, SwitchStatement,
    TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression,
    ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration,
    VariableDeclarator, WhileStatement, WithStatement, YieldExpression].forEach(function(handler){
      handlers[utility.fname(handler)] = handler;
    });


  function assemble(options){
    var assembler = new Assembler(assign({ normal: false }, options));
    return assembler.assemble(options.ast, options.source);
  }

  exports.assemble = assemble;
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
      Uninitialized = SYMBOLS.Uninitialized;

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

      if (v.name === '__proto__') {
        if (base.SetPrototype) {
          base.SetPrototype(w);
        } else if (base.bindings && base.bindings.SetPrototype) {
          base.bindings.SetPrototype(w);
        } else {
          console.log(v);
        }
      } else if (exports.IsPropertyReference(v)) {
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

    return argument >>> 0;;
  }
  exports.ToInteger = ToInteger;

  // ## ToUint32

  function ToUint32(argument){
    if (argument && typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      argument = argument.value;
    }
    return ToNumber(argument) >>> 0;
  }
  exports.ToUint32 = ToUint32;

  // ## ToInt32

  function ToInt32(argument){
    if (argument && typeof argument === OBJECT && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      }
      argument = argument.value;
    }
    return ToNumber(argument) >> 0;
  }
  exports.ToInt32 = ToInt32;


  // ## ToPropertyName

  function ToPropertyName(argument){
    if (argument && argument.Completion) {
      if (argument.Abrupt) {
        return argument;
      } else {
        argument = argument.value;
      }
    }
    if (argument && typeof argument === OBJECT && argument.NativeBrand === NativePrivateName) {
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
      return finalize(rval, lval);
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

  function ADD(rval, lval) {
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

      var result = COMPARE(lval, rval, left);
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
    if (lval === null || typeof lval !== OBJECT || !('HasInstance' in lval)) {
      return ThrowException('instanceof_function_expected', lval);
    }

    return lval.HasInstance(rval);
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
    if (lval === null || typeof lval !== OBJECT) {
      return ThrowException('invalid_in_operator_use', [rval, lval]);
    }

    rval = ToPropertyName(rval);
    if (rval && rval.Completion) {
      if (rval.Abrupt) {
        return rval;
      } else {
        rval = rval.value;
      }
    }

    return lval.HasProperty(rval);
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
      return STRICT_EQUAL(x, y);
    } else if (x == null && x == y) {
      return true;
    } else if (ltype === NUMBER && rtype === STRING) {
      return EQUAL(x, ToNumber(y));
    } else if (ltype === STRING && rtype === NUMBER) {
      return EQUAL(ToNumber(x), y);
    } else if (rtype === OBJECT && ltype === STRING || ltype === OBJECT) {
      return EQUAL(x, ToPrimitive(y));
    } else if (ltype === OBJECT && rtype === STRING || rtype === OBJECT) {
      return EQUAL(ToPrimitive(x), y);
    } else {
      return false;
    }
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
      case 'in':   return IN(lval, rval);
      case 'is':   return IS(lval, rval);
      case 'isnt': return NOT(IS(lval, rval));
      case '==':   return EQUAL(lval, rval);
      case '!=':   return NOT(EQUAL(lval, rval));
      case '===':  return STRICT_EQUAL(lval, rval);
      case '!==':  return NOT(STRICT_EQUAL(lval, rval));
      case '<':    return LT(lval, rval);
      case '>':    return GT(lval, rval);
      case '<=':   return LTE(lval, rval);
      case '>=':   return GTE(lval, rval);
      case '*':    return MUL(lval, rval);
      case '/':    return DIV(lval, rval);
      case '%':    return MOD(lval, rval);
      case '+':    return ADD(lval, rval);
      case '-':    return SUB(lval, rval);
      case '<<':   return SHL(lval, rval);
      case '>>':   return SHR(lval, rval);
      case '>>>':  return SAR(lval, rval);
      case '|':    return BIT_OR(lval, rval);
      case '&':    return BIT_AND(lval, rval);
      case '^':    return BIT_XOR(lval, rval);
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

  var operators = require('./operators'),
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
      Resume    = constants.SYMBOLS.Resume;

  var AbruptCompletion = require('./errors').AbruptCompletion;

  function Desc(v){ this.Value = v }
  Desc.prototype.Configurable = true;
  Desc.prototype.Enumerable = true;
  Desc.prototype.Writable = true;

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



  function instructions(ops, opcodes){
    var out = [];
    for (var i=0; i < ops.length; i++) {
      out[i] = opcodes[+ops[i].op];
    }
    return out;
  }


  function Thunk(code){
    var opcodes = [ARRAY, ARG, ARGS, ARRAY_DONE, BINARY, BLOCK, CALL, CASE,
      CLASS_DECL, CLASS_EXPR, COMPLETE, CONST, CONSTRUCT, DEBUGGER, DEFAULT,
      DUP, ELEMENT, ENUM, FUNCTION, GET, IFEQ, IFNE, INDEX, JSR, JUMP, LET,
      LITERAL, MEMBER, METHOD, NATIVE_CALL, NATIVE_REF, NEXT, OBJECT, POP,
      POPN, PROPERTY, PUT, REF, REGEXP, RETURN, ROTATE, RUN, SAVE, SPREAD,
      SPREAD_ARG, STRING, SUPER_CALL, SUPER_ELEMENT, SUPER_MEMBER, THIS,
      THROW, UNARY, UNDEFINED, UPDATE, UPSCOPE, VAR, WITH];

    var thunk = this,
        ops = code.ops,
        cmds = instructions(ops, opcodes);

    function ARGS(){
      stack[sp++] = [];
      return cmds[++ip];
    }

    function ARG(){
      a = stack[--sp];
      stack[sp - 1].push(a);
      return cmds[++ip];
    }

    function ARRAY(){
      stack[sp++] = context.createArray(0);
      stack[sp++] = 0;
      return cmds[++ip];
    }

    function ARRAY_DONE(){
      a = stack[--sp];
      stack[sp - 1].Put('length', a);
      return cmds[++ip];
    }

    function BINARY(){
      a = BinaryOp(BINARYOPS[ops[ip][0]], stack[--sp], stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function BLOCK(){
      context.pushBlock(ops[ip][0]);
      return cmds[++ip];
    }

    function CALL(){
      a = stack[--sp];
      b = stack[--sp];
      c = stack[--sp];
      d = context.EvaluateCall(c, b, a);
      if (d && d.Completion) {
        if (d.Abrupt) {
          error = d;
          return ƒ;
        } else {
          d = d.value;
        }
      }
      stack[sp++] = d;
      return cmds[++ip];
    }

    function CASE(){
      a = STRICT_EQUAL(stack[--sp], stack[sp - 1]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      if (a) {
        sp--;
        ip = ops[ip][0];
        return cmds[ip];
      }
      return cmds[++ip];
    }
    function CLASS_DECL(){
      a = ops[ip][0];
      b = a.superClass ? stack[--sp] : undefined;
      c = context.pushClass(a, b);
      if (c && c.Completion) {
        if (c.Abrupt) {
          error = c;
          return ƒ;
        } else {
          c = c.value;
        }
      }

      d = context.initializeBindings(a.pattern, c, true);
      if (d && d.Abrupt) {
        error = d;
        return ƒ;
      }
      return cmds[++ip];
    }

    function CLASS_EXPR(){
      a = ops[ip][0];
      b = a.superClass ? stack[--sp] : undefined;
      c = context.pushClass(a, b);
      if (c && c.Completion) {
        if (c.Abrupt) {
          error = c;
          return ƒ;
        } else {
          c = c.value;
        }
      }
      stack[sp++] = c;
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
      a = stack[--sp];
      b = stack[--sp];
      c = context.EvaluateConstruct(b, a);
      if (c && c.Completion) {
        if (c.Abrupt) {
          error = c;
          return ƒ;
        } else {
          c = c.value;
        }
      }
      stack[sp++] = c;
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

    function DUP(){
      a = stack[sp - 1];
      stack[sp++] = a;
      return cmds[++ip];
    }

    function ELEMENT(){
      a = context.Element(stack[--sp], stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function ENUM(){
      a = stack[sp - 1].Enumerate(true, true);
      stack[sp - 1] = a;
      stack[sp++] = 0;
      return cmds[++ip];
    }

    function FUNCTION(){
      stack[sp++] = context.createFunction(ops[ip][0], ops[ip][1]);
      return cmds[++ip];
    }

    function GET(){
      a = GetValue(stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
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

    function INDEX(){
      if (ops[ip][0]) {
        stack[sp - 1]++;
      } else {
        a = GetValue(stack[--sp]);
        if (a && a.Completion) {
          if (a.Abrupt) {
            error = a;
            return ƒ;
          } else {
            a = a.value;
          }
        }
        b = stack[--sp];
        c = stack[sp - 1];
        if (ops[ip][1]) {
          d = context.SpreadInitialization(c, b, a)
          if (d && d.Abrupt) {
            error = d;
            return ƒ;
          }
          stack[sp++] = d;
        } else {
          c.DefineOwnProperty(b, new Desc(a));
          stack[sp++] = b + 1;
        }
      }
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

    function JSR(){
      return cmds[++ip];
    }

    function LET(){
      context.initializeBindings(ops[ip][0], stack[--sp], true);
      return cmds[++ip];
    }

    function MEMBER(){
      a = context.Element(code.lookup(ops[ip][0]), stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function METHOD(){
      context.defineMethod(ops[ip][0], stack[sp - 1], code.lookup(ops[ip][2]), ops[ip][1]);
      if (a && a.Abrupt) {
        error = a;
        return ƒ;
      }
      return cmds[++ip];
    }

    function NATIVE_CALL(){
      a = stack[--sp];
      b = stack[--sp];
      c = stack[--sp];
      d = context.EvaluateCall(c, b, a);
      if (d && d.Completion) {
        if (d.Abrupt) {
          error = d;
          return ƒ;
        } else {
          d = d.value;
        }
      }
      stack[sp++] = d;
      return cmds[++ip];
    }

    function NATIVE_REF(){
      if (!code.natives) {
        error = 'invalid native reference';
        return ƒ;
      }
      stack[sp++] = context.realm.natives.reference(code.lookup(ops[ip][0]), false);
      return cmds[++ip];
    }

    function NEXT(){
      a = stack[sp - 2];
      b = stack[sp - 1];
      if (b < a.length) {
        PutValue(stack[sp - 3], a[b]);
        stack[sp - 1] = b + 1;
      } else {
        ip = ops[ip][0];
      }
      return cmds[++ip];
    }

    function PROPERTY(){
      a = stack[--sp];
      b = DefineProperty(stack[sp - 1], code.lookup(ops[ip][0]), a);
      if (b && b.Abrupt) {
        error = b;
        return ƒ;
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
      a = stack[--sp];
      b = PutValue(stack[--sp], a);
      if (b && b.Abrupt) {
        error = b;
        return ƒ;
      }
      stack[sp++] = a;
      return cmds[++ip];
    }


    function REGEXP(){
      stack[sp++] = context.createRegExp(ops[ip][0]);
      return cmds[++ip];
    }

    function REF(){
      stack[sp++] = context.IdentifierResolution(code.lookup(ops[ip][0]));
      return cmds[++ip];
    }

    function RETURN(){
      completion = stack[--sp];
      ip++;
      return false;
    }

    function ROTATE(){
      a = [];
      b = stack[--sp];
      for (c = 0; c < ops[ip][0]; c++) {
        a[c] = stack[--sp];
      }
      a[c++] = b;
      while (c--) {
        stack[sp++] = a[c];
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
      a = context.SpreadDestructuring(stack[--sp], ops[ip][0]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function SPREAD_ARG(){
      a = stack[--sp];
      b = context.SpreadArguments(stack[sp - 1], a);
      if (b && b.Abrupt) {
        error = b;
        return ƒ;
      }
      return cmds[++ip];
    }

    function STRING(){
      stack[sp++] = code.lookup(ops[ip][0]);
      return cmds[++ip];
    }

    function SUPER_CALL(){
      a = context.SuperReference(false);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function SUPER_ELEMENT(){
      a = context.SuperReference(stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function SUPER_GUARD(){
      a = context.SuperReference(null);
      if (a && a.Abrupt) {
        error = a;
        return ƒ;
      }
      return cmds[++ip];
    }

    function SUPER_MEMBER(){
      a = context.SuperReference(code.lookup(ops[ip][0]));
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function THIS(){
      a = context.ThisResolution();
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function THROW(){
      error = new AbruptCompletion('throw', stack[--sp]);
      return ƒ;
    }

    function UNARY(){
      a = UnaryOp(UNARYOPS[ops[ip][0]], stack[--sp]);
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
      return cmds[++ip];
    }

    function UNDEFINED(){
      stack[sp++] = undefined;
      return cmds[++ip];
    }

    function UPDATE(){
      switch (ops[ip][0]) {
        case 0: a = POST_DEC(stack[--sp]); break;
        case 1: a = PRE_DEC(stack[--sp]); break;
        case 2: a = POST_INC(stack[--sp]); break;
        case 3: a = PRE_INC(stack[--sp]); break;
      }
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      stack[sp++] = a;
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
      a = ToObject(GetValue(stack[--sp]));
      if (a && a.Completion) {
        if (a.Abrupt) {
          error = a;
          return ƒ;
        } else {
          a = a.value;
        }
      }
      context.pushWith(a);
      return cmds[++ip];
    }

    function ƒ(){
      for (var i = 0, entry; entry = code.entrances[i]; i++) {
        if (entry.begin < ip && ip <= entry.end) {
          if (entry.type === ENTRY.ENV) {
            trace(context.popBlock());
          } else {

            //sp = entry.unwindStack(this);
            if (entry.type === ENTRY.FINALLY) {
              stack[sp++] = Empty;
              stack[sp++] = error;
              stack[sp++] = ENTRY.FINALLY;
              ip = entry.end;
              return cmds[ip];
            } else {
              stack[sp++] = error;
            }
          }
        }
      }
      if (error) {

        if (error.value && error.value.setLocation) {
          var range = code.ops[ip].range,
              loc = code.ops[ip].loc;

          if (!error.value.hasLocation) {
            error.value.hasLocation = true;
            error.value.setLocation(loc);
            error.value.setCode(range, code.source);
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


    function trace(unwound){
      stacktrace || (stacktrace = []);
      stacktrace.push(unwound);
    }

    function normalPrepare(){
      stack = [];
      ip = 0;
      sp = 0;
      stacktrace = completion = error = a = b = c = d = undefined;
    }

    function normalExecute(){
      var f = cmds[ip];
      while (f) f = f();
    }

    function normalCleanup(){
      var result = completion;
      prepare();
      return result;
    }

    function instrumentedExecute(){
      var f = cmds[ip],
          realm = context.realm;

      while (f) {
        if (f) {
          realm.emit('op', [ops[ip], stack[sp - 1]]);
          f = f();
        }
      }
    }

    function resumePrepare(){
      delete thunk.ip;
      delete thunk.stack;
      prepare = normalPrepare;
      context = ctx;
      ctx = undefined;
      context.realm.activate();
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

    function run(ctx){
      context = ctx;
      if (context.realm.quiet) {
        execute = normalExecute;
      } else {
        execute = instrumentedExecute;
      }
      prepare();
      execute();
      return cleanup();
    }


    var completion, stack, ip, sp, error, a, b, c, d, ctx, context, stacktrace;

    var prepare = normalPrepare,
        execute = normalExecute,
        cleanup = normalCleanup;

    this.run = run;
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
      ownKeys          = utility.ownKeys,
      define           = utility.define,
      copy             = utility.copy,
      inherit          = utility.inherit,
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
      Resume        = SYMBOLS.Resume,
      Return        = SYMBOLS.Return,
      Native        = SYMBOLS.Native,
      Continue      = SYMBOLS.Continue,
      Uninitialized = SYMBOLS.Uninitialized;

  var slice = [].slice;

  var BINARYOPS = constants.BINARYOPS.array,
      UNARYOPS  = constants.UNARYOPS.array,
      BRANDS    = constants.BRANDS,
      ENTRY     = constants.ENTRY.hash,
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


  var LexicalScope          = 'Lexical',
      StrictScope           = 'Strict',
      GlobalScope           = 'Global';

  var GlobalCode            = 'elobal',
      EvalCode              = 'eval',
      FuntionCode           = 'function';


  // ##################################################
  // ### Internal Utilities not from specification ####
  // ##################################################

  function noop(){}

  function hide(o, k){
    Object.defineProperty(o, k, { enumerable: false });
  }

  function defineDirect(o, key, value, attrs){
    o.properties.set(key, value, attrs);
  }

  function deleteDirect(o, key){
    o.properties.remove(key);
  }

  function hasDirect(o, key){
    if (o) {
      return o.properties.has(key) || hasDirect(o.GetPrototype(), key);
    } else {
      return false;
    }
  }

  function hasOwnDirect(o, key){
    return o.properties.has(key);
  }

  function setDirect(o, key, value){
    if (o.properties.has(key)) {
      o.properties.set(key, value);
    } else {
      o.properties.set(key, value, ECW);
    }
  }

  function getDirect(o, key){
    return o.properties.get(key);
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

  function ToPropertyDescriptor(obj) {
    if (obj.Completion) {
      if (obj.Abrupt) {
        return obj;
      } else {
        obj = obj.value;
      }
    }

    if (typeof obj !== OBJECT) {
      return ThrowException('property_desc_object', [typeof obj]);
    }

    var desc = create(null);

    for (var i=0, v; i < 6; i++) {
      if (obj.HasProperty(descFields[i])) {
        v = obj.Get(descFields[i]);
        if (v.Completion) {
          if (v.Abrupt) {
            return v;
          } else {
            v = v.value;
          }
        }
        desc[descProps[i]] = v;
      }
    }

    if (GET in desc) {
      if (desc.Get !== undefined && !desc.Get || !desc.Get.Call)
        return ThrowException('getter_must_be_callable', [typeof desc.Get]);
    }

    if (SET in desc) {
      if (desc.Set !== undefined && !desc.Set ||  !desc.Set.Call)
        return ThrowException('setter_must_be_callable', [typeof desc.Set]);
    }

    if ((GET in desc || SET in desc) && (VALUE in desc || WRITABLE in desc))
      return ThrowException('value_and_accessor', [desc]);

    return desc;
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
      if (a.Abrupt) {
        return a;
      } else {
        a = a.value;
      }
    }
    if (b && b.Completion) {
      if (b.Abrupt) {
        return b;
      } else {
        b = b.value;
      }
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
    if (writable === undefined) {
      writable = true;
    }
    if (install) {
      defineDirect(prototype, 'constructor', func, writable ? _CW : ___);
    }
    defineDirect(func, 'prototype', prototype, writable ? __W : ___);
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
      if (obj.Abrupt) {
        return obj;
      } else {
        obj = obj.value;
      }
    }

    var func = func.Get(key);
    if (func && func.Completion) {
      if (func.Abrupt) {
        return func;
      } else {
        func = func.value;
      }
    }

    if (!IsCallable(func))
      return ThrowException('called_non_callable', key);

    return func.Call(receiver, args);
  }

  // ## GetIdentifierReference

  function GetIdentifierReference(lex, name, strict){
      //throw
    if (lex === null) {
      return new Reference(undefined, name, strict);
    } else if (lex.HasBinding(name)) {
      return new Reference(lex, name, strict);
    } else {
      return GetIdentifierReference(lex.outer, name, strict);
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




  function PropertyDefinitionEvaluation(kind, obj, key, code) {
    if (kind === 'get') {
      return DefineGetter(obj, key, code);
    } else if (kind === 'set') {
      return DefineSetter(obj, key, code);
    } else if (kind === 'method') {
      return DefineMethod(obj, key, code);
    }
  }

  var DefineMethod, DefineGetter, DefineSetter;

  void function(){
    function makeDefiner(constructs, field, desc){
      return function(obj, key, code) {
        var sup = code.NeedsSuperBinding,
            home = sup ? obj : undefined,
            func = new $Function(METHOD, key, code.params, code, context.LexicalEnvironment, code.Strict, undefined, home, sup);

        constructs && MakeConstructor(func);
        desc[field] = func;
        var result = obj.DefineOwnProperty(key, desc, false);
        desc[field] = undefined;

        return result && result.Abrupt ? result : func;
      };
    }

    DefineMethod = makeDefiner(false, VALUE, {
      Value: undefined,
      Writable: true,
      Enumerable: true,
      Configurable: true
    });

    DefineGetter = makeDefiner(true, GET, {
      Get: undefined,
      Enumerable: true,
      Configurable: true
    });

    DefineSetter = makeDefiner(true, SET, {
      Set: undefined,
      Enumerable: true,
      Configurable: true
    });
  }();



  function CreateThrowTypeError(realm){
    var thrower = create($NativeFunction.prototype);
    $Object.call(thrower, realm.intrinsics.FunctionProto);
    thrower.call = function(){ return ThrowException('strict_poison_pill') };
    defineDirect(thrower, 'length', 0, ___);
    defineDirect(thrower, 'name', 'ThrowTypeError', ___);
    thrower.Realm = realm;
    thrower.Extensible = false;
    thrower.Strict = true;
    hide(thrower, 'Realm');
    return new Accessor(thrower);
  }

  // ## CompleteStrictArgumentsObject

  function CompleteStrictArgumentsObject(args) {
    var obj = new $Arguments(args.length);
    for (var i=0; i < args.length; i++) {
      defineDirect(obj, i+'', args[i], ECW);
    }

    defineDirect(obj, 'arguments', intrinsics.ThrowTypeError, __A);
    defineDirect(obj, 'caller', intrinsics.ThrowTypeError, __A);
    return obj;
  }


  // ## CompleteMappedArgumentsObject

  function CompleteMappedArgumentsObject(names, env, args, func) {
    var obj = new $Arguments(args.length),
        map = new $Object,
        mapped = create(null),
        isMapped;

    for (var i=0; i < args.length; i++) {
      defineDirect(obj, i+'', args[i], ECW);
      var name = names[i];
      if (i < names.length && !(name in mapped)) {
        isMapped = true;
        mapped[name] = true;
        defineDirect(map, name, new ArgAccessor(name, env), _CA);
      }
    }

    defineDirect(obj, 'callee', func, _CW);
    return isMapped ? new $MappedArguments(map, obj) : obj;
  }


  function ArgAccessor(name, env){
    this.name = name;
    define(this, { env: env  });
  }

  define(ArgAccessor.prototype, {
    Get: { Call: function(){ return this.env.GetBindingValue(this.name) } },
    Set: { Call: function(v){ this.env.SetMutableBinding(this.name, v) } }
  });


  function TopLevelDeclarationInstantiation(code) {
    var env = context.VariableEnvironment,
        configurable = code.Type === 'eval',
        decls = code.LexicalDeclarations;

    for (var i=0, decl; decl = decls[i]; i++) {
      if (decl.type === 'FunctionDeclaration') {
        var name = decl.id.name;
        if (env.HasBinding(name)) {
          env.CreateMutableBinding(name, configurable);
        } else if (env === realm.globalEnv) {
          var existing = global.GetOwnProperty(name);
          if (!existing) {
            global.DefineOwnProperty(name, {
              Value: undefined,
              Writable: true,
              Enumerable: true,
              Configurable: configurable
            }, true);
          } else if (IsAccessorDescriptor(existing) || !existing.Writable && !existing.Enumerable) {
            return ThrowException('global invalid define');
          }
        }
        if (decl.type === 'FunctionDeclaration') {
          env.SetMutableBinding(name, InstantiateFunctionDeclaration(decl), code.Strict);
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
          global.DefineOwnProperty(name, {
            Value: undefined,
            Writable: true,
            Enumerable: true,
            Configurable: configurable
          }, true);
        }
      }
    }
  }


  // ## FunctionDeclarationInstantiation

  function FunctionDeclarationInstantiation(func, args, env) {
    var formals = func.FormalParameters,
        params = formals.BoundNames;

    for (var i=0; i < params.length; i++) {
      if (!env.HasBinding(params[i])) {
        env.CreateMutableBinding(params[i]);
        env.InitializeBinding(params[i], undefined);
      }
    }

    if (func.Strict) {
      var ao = CompleteStrictArgumentsObject(args);
      var status = ArgumentBindingInitialization(formals, ao, env);
    } else {
      var ao = env.arguments = CompleteMappedArgumentsObject(params, env, args, func)
      var status = ArgumentBindingInitialization(formals, ao);
    }

    if (status && status.Abrupt) {
      return status;
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
          env.InitializeBinding(name, InstantiateFunctionDeclaration(decl));
        }
      }
    }
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
        lex = context.LexicalEnvironment;

    if (name) {
      var scope = context.LexicalEnvironment = NewDeclarativeEnvironment(lex);
      scope.CreateImmutableBinding(name.name ? name.name : name);
    }

    constructor || (constructor = intrinsics.EmptyClass);

    var ctor = PropertyDefinitionEvaluation('method', proto, 'constructor', constructor);
    if (ctor && ctor.Completion) {
      if (ctor.Abrupt) {
        return ctor;
      } else {
        ctor = ctor.value;
      }
    }

    ctor.SetPrototype(superctor);
    setDirect(ctor, 'name', name ? name.name || name : '');
    MakeConstructor(ctor, false, proto);
    defineDirect(proto, 'constructor', ctor, _CW);
    defineDirect(ctor, 'prototype', proto, ___);

    for (var i=0, method; method = methods[i]; i++) {
      PropertyDefinitionEvaluation(method.kind, proto, method.name, method.code);
    }

    context.LexicalEnvironment = lex;
    return ctor;
  }

  // ## InstantiateFunctionDeclaration

  function InstantiateFunctionDeclaration(decl){
    var code = decl.Code;
    var func = new $Function(NORMAL, decl.id.name, code.params, code, context.LexicalEnvironment, code.Strict);
    MakeConstructor(func);
    return func;
  }


  // ## BlockDeclarationInstantiation

  function BlockDeclarationInstantiation(code, env){
    var decls = code.LexicalDeclarations;
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
        env.InitializeBinding(decl.id.name, InstantiateFunctionDeclaration(decl));
      }
    }
  }

  // ## IdentifierResolution

  function IdentifierResolution(name) {
    return GetIdentifierReference(context.LexicalEnvironment, name, context.strict);
  }

  // ## BindingInitialization

  function BindingInitialization(pattern, value, env){
    if (pattern.type === 'Identifier') {
      if (env) {
        env.InitializeBinding(pattern.name, value);
      } else {
        return PutValue(IdentifierResolution(pattern.name), value);
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
      var len = getDirect(args, 'length') - params.length,
          array = new $Array(0);

      if (len > 0) {
        for (var i=0; i < len; i++) {
          setDirect(array, i, getDirect(args, params.length + i));
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
        var value = context.SpreadDestructuring(array, i);
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



  // ## NewObjectEnvironment

  function NewObjectEnvironment(outer, object){
    var lex = new ObjectEnvironmentRecord(object);
    lex.outer = outer;
    return lex;
  }

  // ## NewDeclarativeEnvironment

  function NewDeclarativeEnvironment(outer){
    var lex = new DeclarativeEnvironmentRecord;
    lex.outer = outer;
    return lex;
  }

  // ## NewFunctionEnvironment

  function NewFunctionEnvironment(method, receiver){
    var lex = new FunctionEnvironmentRecord(receiver, method.Home, method.MethodName);
    lex.outer = method.Scope;
    return lex;
  }


  function MapInitialization(object, iterable){
    if (typeof object !== OBJECT) {
      return ThrowException('mapinit_nonobject', typeof object);
    }
    if (object.MapData) {
      return ThrowException('mapinit_duplicate');
    }
    if (!object.Extensible) {
      return ThrowException('mapinit_nonextensible');
    }
    if (iterable !== undefined) {
      iterable = ToObject(iterable);
      if (iterable && iterable.Completion) {
        if (iterable.Abrupt) {
          return iterable;
        } else {
          iterable = iterable.value;
        }
      }

      var itr = Invoke(iterator, object, []);
    }
  }


  function GetTrap(handler, trap){

  }

  function TrapDefineOwnProperty(proxy, key, descObj, strict){
    var handler = proxy.Handler,
        target = proxy.Target,
        trap = GetTrap(handler, 'defineProperty');


    if (trap === undefined) {
      return target.DefineOwnProperty(key, desc, strict);
    } else {
      var normalizedDesc = NormalizePropertyDescriptor(descObj),
          trapResult = trap.Call(handler, [target, key, normalizedDesc]),
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

  // ###########################
  // ###########################
  // ### Specification Types ###
  // ###########################
  // ###########################


  // #################
  // ### Reference ###
  // #################

  function Reference(base, name, strict){
    this.base = base;
    this.name = name;
    this.strict = strict;
  }

  define(Reference.prototype, {
    Reference: SYMBOLS.Reference
  });




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

  function Accessor(get, set){
    this.Get = get;
    this.Set = set;
  }

  define(Accessor.prototype, {
    Get: undefined,
    Set: undefined
  });

  function Value(value){
    this.Value = value;
  }


  // #########################
  // ### EnvironmentRecord ###
  // #########################

  function EnvironmentRecord(bindings){
    this.bindings = bindings;
  }

  define(EnvironmentRecord.prototype, {
    bindings: null,
    withBase: undefined
  });

  define(EnvironmentRecord.prototype, [
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
    function reference(name, strict){
      return new Reference(this, name, strict);
    }
  ]);


  function DeclarativeEnvironmentRecord(){
    EnvironmentRecord.call(this, new Hash);
    this.consts = new Hash;
    this.deletables = new Hash;
  }

  inherit(DeclarativeEnvironmentRecord, EnvironmentRecord, [
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


  function ObjectEnvironmentRecord(object){
    EnvironmentRecord.call(this, object);
  }

  inherit(ObjectEnvironmentRecord, EnvironmentRecord, [
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


  function FunctionEnvironmentRecord(receiver, holder, name){
    DeclarativeEnvironmentRecord.call(this);
    this.thisValue = receiver;
    this.HomeObject = holder;
    this.MethodName = name;
  }

  inherit(FunctionEnvironmentRecord, DeclarativeEnvironmentRecord, {
    HomeObject: undefined,
    MethodName: undefined,
    thisValue: undefined,
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


  function GlobalEnvironmentRecord(global){
    ObjectEnvironmentRecord.call(this, global);
    this.thisValue = this.bindings;
  }

  inherit(GlobalEnvironmentRecord, ObjectEnvironmentRecord, {
    outer: null
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




  // ###############
  // ### $Object ###
  // ###############

  function $Object(proto){
    if (proto === undefined)
      proto = intrinsics.ObjectProto;
    this.Prototype = proto;
    this.properties = new PropertyList;
    $Object.tag(this);
    hide(this, 'Prototype');
    hide(this, 'attributes');
  }

  void function(counter){
    define($Object, [
      function tag(object){
        if (object.id === undefined) {
          object.id = counter++;
          hide(object, 'id');
        }
      }
    ]);
  }(0)

  define($Object.prototype, {
    Extensible: true,
    NativeBrand: BRANDS.NativeObject
  });

  define($Object.prototype, [
    function GetPrototype(){
      return this.Prototype;
    },
    function SetPrototype(value){
      if (typeof value === 'object') {
        this.Prototype = value;
        return true;
      } else {
        return false;
      }
    },
    function GetExtensible(){
      return this.Extensible;
    },
    function GetOwnProperty(key){
      if (key === '__proto__') {
        return undefined;
      }

      var prop = this.properties.getProperty(key);
      if (prop) {
        var Descriptor = prop[2] & A ? AccessorDescriptor : DataDescriptor;
        return new Descriptor(prop[1], prop[2]);
      }
    },
    function GetProperty(key){
      if (key === '__proto__') {
        return undefined;
      }
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
      if (key === '__proto__') {
        return this.GetPrototype();
      }
      return this.GetP(this, key);
    },
    function Put(key, value, strict){
      if (key === '__proto__') {
        return this.SetPrototype(value);
      }
      if (!this.SetP(this, key, value) && strict) {
        return ThrowException('strict_cannot_assign', [key]);
      }
    },
    function GetP(receiver, key){
      if (key === '__proto__') {
        return receiver.GetPrototype();
      }
      var desc = this.GetOwnProperty(key);
      if (!desc) {
        var proto = this.GetPrototype();
        if (proto) {
          return proto.GetP(receiver, key);
        }
      } else if (IsAccessorDescriptor(desc)) {
        var getter = desc.Get;
        if (IsCallable(getter)) {
          return getter.Call(receiver, []);
        }
      } else {
        return desc.Value;
      }
    },
    function SetP(receiver, key, value) {
      if (key === '__proto__') {
        return receiver.SetPrototype(value);
      }
      var desc = this.GetOwnProperty(key);
      if (desc) {
        if (IsAccessorDescriptor(desc)) {
          var setter = desc.Set;
          if (IsCallable(setter)) {
            setter.Call(receiver, [value]);
            return true;
          } else {
            return false;
          }
        } else if (desc.Writable) {
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

      if (key === '__proto__') {
        if (isObject(desc) && 'Value' in desc) {
          return this.SetPrototype(desc.Value);
        } else {
          return false;
        }
      }

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
      return key === '__proto__' ? false : this.properties.has(key);
    },
    function HasProperty(key){
      if (key === '__proto__' || this.properties.has(key)) {
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
      if (key === '__proto__') {
        return false;
      } else if (!this.properties.has(key)) {
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
    function Enumerate(includePrototype, onlyEnumerable){
      if (onlyEnumerable) {
        var props = this.properties.filter(function(prop){
          return prop[2] & E;
        }, this);
      } else {
        var props = this.properties.clone();
      }

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
          if (method.Abrupt) {
            return method;
          } else {
            method = method.value;
          }
        }

        if (IsCallable(method)) {
          var val = method.Call(this, []);
          if (val && val.Completion) {
            if (val.Abrupt) {
              return val;
            } else {
              val = val.value;
            }
          }
          if (!isObject(val)) {
            return val;
          }
        }
      }

      return ThrowException('cannot_convert_to_primitive', []);
    },
  ]);

  var DefineOwn = $Object.prototype.DefineOwnProperty;

  // #################
  // ### $Function ###
  // #################

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
      this.Home = holder;
    }
    if (method) {
      this.MethodName = name;
    }

    if (strict) {
      defineDirect(this, 'arguments', intrinsics.ThrowTypeError, __A);
      defineDirect(this, 'caller', intrinsics.ThrowTypeError, __A);
    } else {
      defineDirect(this, 'arguments', null, ___);
      defineDirect(this, 'caller', null, ___);
    }

    defineDirect(this, 'length', params ? params.ExpectedArgumentCount : 0, ___);

    if (typeof name === 'string' && kind !== ARROW) {
      defineDirect(this, 'name', name, ___);
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
    TargetFunction: null,
    BoundThis: null,
    BoundArguments: null,
    Strict: false,
    ThisMode: 'global',
    Realm: null,
  }, [
    function Call(receiver, args, isConstruct){
      if (realm !== this.Realm) {
        this.Realm.activate();
      }
      if (this.ThisMode === 'lexical') {
        var local = NewDeclarativeEnvironment(this.Scope);
      } else {
        if (this.ThisMode !== 'strict') {
          if (receiver == null) {
            receiver = this.Realm.global;
          } else if (typeof receiver !== OBJECT) {
            receiver = ToObject(receiver);
            if (receiver.Completion) {
              if (receiver.Abrupt) {
                return receiver;
              } else {
                receiver = receiver.value;
              }
            }
          }
        }
        var local = NewFunctionEnvironment(this, receiver);
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
        defineDirect(this, 'arguments', local.arguments, ___);
        defineDirect(this, 'caller', caller, ___);
        local.arguments = null;
      }

      var result = this.thunk.run(context);

      if (!this.Strict) {
        defineDirect(this, 'arguments', null, ___);
        defineDirect(this, 'caller', null, ___);
      }

      ExecutionContext.pop();
      return result && result.type === Return ? result.value : result;
    },
    function Construct(args){
      var prototype = this.Get('prototype');
      if (prototype.Completion) {
        if (prototype.Abrupt) {
          return prototype;
        } else {
          prototype = prototype.value;
        }
      }
      var instance = typeof prototype === OBJECT ? new $Object(prototype) : new $Object;
      if (this.NativeConstructor) {
        instance.NativeBrand = prototype.NativeBrand;
      }
      instance.ConstructorName = this.properties.get('name');
      var result = this.Call(instance, args, true);
      if (result && result.Completion) {
        if (result.Abrupt) {
          return result;
        } else {
          result = result.value;
        }
      }
      return typeof result === OBJECT ? result : instance;
    },
    function HasInstance(arg){
      if (typeof arg !== OBJECT || arg === null) {
        return false;
      }

      var prototype = this.Get('prototype');
      if (prototype.Completion) {
        if (prototype.Abrupt) {
          return prototype;
        } else {
          prototype = prototype.value;
        }
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




  function $NativeFunction(options){
    if (options.proto === undefined)
      options.proto = intrinsics.FunctionProto;
    $Object.call(this, options.proto);
    defineDirect(this, 'arguments', null, ___);
    defineDirect(this, 'caller', null, ___);
    defineDirect(this, 'length', options.length, ___);
    defineDirect(this, 'name', options.name, ___);
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
      "use strict";
      var result = this.call.apply(receiver, [].concat(args));
      return result && result.type === Return ? result.value : result;
    },
    function Construct(args){
      if (this.construct) {
        if (hasDirect(this, 'prototype')) {
          var instance = new $Object(getDirect(this, 'prototype'));
        } else {
          var instance = new $Object;
        }
        instance.ConstructorName = this.properties.get('name');
        var result = this.construct.apply(instance, args);
      } else {
        var result = this.call.apply(undefined, args);
      }
      return result && result.type === Return ? result.value : result;
    }
  ]);

  function $BoundFunction(target, boundThis, boundArgs){
    $Object.call(this, intrinsics.FunctionProto);
    this.TargetFunction = target;
    this.BoundThis = boundThis;
    this.BoundArgs = boundArgs;
    defineDirect(this, 'arguments', intrinsics.ThrowTypeError, __A);
    defineDirect(this, 'caller', intrinsics.ThrowTypeError, __A);
    defineDirect(this, 'length', getDirect(target, 'length'), ___);
  }

  inherit($BoundFunction, $Function, [
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

  // #############
  // ### $Date ###
  // #############

  function $Date(value){
    $Object.call(this, intrinsics.DateProto);
    this.PrimitiveValue = value;
  }

  inherit($Date, $Object, {
    NativeBrand: BRANDS.NativeDate,
  });

  // ###############
  // ### $String ###
  // ###############

  function $String(value){
    $Object.call(this, intrinsics.StringProto);
    this.PrimitiveValue = value;
    defineDirect(this, 'length', value.length, ___);
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
    function HasOwnProperty(key){
      key = ToPropertyName(key);
      if (key && key.Completion) {
        if (key.Abrupt) {
          return key;
        } else {
          key = key.value;
        }
      }
      if (typeof key === 'string') {
        if (key < getDirect(this, 'length') && key >= 0) {
          return true;
        }
      }
      return $Object.prototype.HasOwnProperty.call(this, key);
    },
    function HasProperty(key){
      var ret = this.HasOwnProperty(key);
      if (ret && ret.Completion) {
        if (ret.Abrupt) {
          return ret;
        } else {
          ret = ret.value;
        }
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



  // ###############
  // ### $Number ###
  // ###############

  function $Number(value){
    $Object.call(this, intrinsics.NumberProto);
    this.PrimitiveValue = value;
  }

  inherit($Number, $Object, {
    NativeBrand: BRANDS.NumberWrapper,
    PrimitiveValue: undefined,
  });


  // ################
  // ### $Boolean ###
  // ################

  function $Boolean(value){
    $Object.call(this, intrinsics.BooleanProto);
    this.PrimitiveValue = value;
  }

  inherit($Boolean, $Object, {
    NativeBrand: BRANDS.BooleanWrapper,
    PrimitiveValue: undefined,
  });



  // ############
  // ### $Map ###
  // ############

  function $Map(){
    $Object.call(this, intrinsics.MapProto);
  }

  inherit($Map, $Object, {
    NativeBrand: BRANDS.NativeMap,
    MapData: null
  });

  // ############
  // ### $Set ###
  // ############

  function $Set(){
    $Object.call(this, intrinsics.SetProto);
  }

  inherit($Set, $Object, {
    NativeBrand: BRANDS.NativeSet
  });


  // ################
  // ### $WeakMap ###
  // ################

  function $WeakMap(){
    $Object.call(this, intrinsics.WeakMapProto);
  }

  inherit($WeakMap, $Object, {
    NativeBrand: BRANDS.NativeWeakMap,
  });

  // ##############
  // ### $Array ###
  // ##############


  function $Array(items){
    $Object.call(this, intrinsics.ArrayProto);
    if (items instanceof Array) {
      var len = items.length;
      for (var i=0; i < len; i++)
        setDirect(this, i, items[i]);
    } else {
      var len = 0;
    }
    defineDirect(this, 'length', len, _CW);
  }

  inherit($Array, $Object, {
    NativeBrand: BRANDS.NativeArray,
    DefineOwnProperty: function DefineOwnProperty(key, desc, strict){
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
          return $Object.prototype.DefineOwnProperty.call(this, 'length', desc, strict);
        }

        var newLenDesc = copy(desc),
            newLen = ToUint32(desc.Value);

        if (newLen.Completion) {
          if (newLen.Abrupt) {
            return newLen;
          } else {
            newLen = newLen.Value;
          }
        }
        var val = ToNumber(desc.Value);
        if (val.Completion) {
          if (val.Abrupt) {
            return val;
          } else {
            val = val.Value;
          }
        }

        if (newLen !== val) {
          return ThrowException('invalid_array_length');
        }

        newLen = newLenDesc.Value;
        if (newLen >= oldLen) {
          return $Object.prototype.DefineOwnProperty.call(this, 'length', newLenDesc, strict);
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

        var success = $Object.prototype.DefineOwnProperty.call(this, 'length', newLenDesc, strict);
        if (success.Completion) {
          if (success.Abrupt) {
            return success;
          } else {
            success = success.Value;
          }
        }
        if (success === false) {
          return false;
        }

        while (newLen < oldLen) {
          oldLen = oldLen - 1;
          var deleted = this.Delete('' + oldLen, false);
          if (deleted.Completion) {
            if (deleted.Abrupt) {
              return deleted;
            } else {
              deleted = deleted.Value;
            }
          }

          if (!deleted) {
            newLenDesc.Value = oldLen + 1;
            if (!newWritable) {
              newLenDesc.Writable = false;
            }
            $Object.prototype.DefineOwnProperty.call(this, 'length', newLenDesc, false);
            Reject();
          }
        }
        if (!newWritable) {
          $Object.prototype.DefineOwnProperty.call(this, 'length', {
            Writable: false
          }, false);
        }

        return true;
      }  else if (IsArrayIndex(key)) {
        var index = ToUint32(key);

        if (index.Completion) {
          if (index.Abrupt) {
            return index;
          } else {
            index = index.Value;
          }
        }

        if (index >= oldLen && oldLenDesc.Writable === false) {
          return Reject();
        }

        success = $Object.prototype.DefineOwnProperty.call(this, key, desc, false);
        if (success.Completion) {
          if (success.Abrupt) {
            return success;
          } else {
            success = success.Value;
          }
        }

        if (success === false) {
          return Reject();
        }

        if (index >= oldLen) {
          oldLenDesc.Value = index + 1;
          $Object.prototype.DefineOwnProperty.call(this, 'length', oldLenDesc, false);
        }
        return true;
      }

      return $Object.prototype.DefineOwnProperty.call(this, key, desc, key);
    }
  });


  // ###############
  // ### $RegExp ###
  // ###############

  function $RegExp(primitive){
    if (!this.properties) {
      $Object.call(this, intrinsics.RegExpProto);
    }
    this.PrimitiveValue = primitive;
    defineDirect(this, 'global', primitive.global, ___);
    defineDirect(this, 'ignoreCase', primitive.ignoreCase, ___);
    defineDirect(this, 'lastIndex', primitive.lastIndex, __W);
    defineDirect(this, 'multiline', primitive.multiline, ___);
    defineDirect(this, 'source', primitive.source, ___);
  }

  inherit($RegExp, $Object, {
    NativeBrand: BRANDS.NativeRegExp,
    Match: null,
  });


  // ####################
  // ### $PrivateName ###
  // ####################

  function $PrivateName(proto){
    $Object.call(this, intrinsics.PrivateNameProto);
  }

  inherit($PrivateName, $Object, {
    NativeBrand: BRANDS.NativePrivateName,
    Match: null,
  });



  // ##################
  // ### $Arguments ###
  // ##################

  function $Arguments(length){
    $Object.call(this);
    defineDirect(this, 'length', length, _CW);
  }

  inherit($Arguments, $Object, {
    NativeBrand: BRANDS.NativeArguments,
    ParameterMap: null,
  });

  function $MappedArguments(map, args){
    this.properties = args.properties;
    this.Prototype = args.Prototype;
    define(this, 'keys', args.keys);
    this.ParameterMap = map;
  }

  inherit($MappedArguments, $Arguments, {
    ParameterMap: null,
  }, [
    function Get(key){
      if (hasOwnDirect(this.ParameterMap, key)) {
        return this.ParameterMap.Get(key);
      } else {
        var val = $Object.prototype.Get.call(this, key);
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
      if (hasOwnDirect(this.ParameterMap, key)) {
        desc.Value = this.ParameterMap.Get(key);
      }
      return desc;
    },
    function DefineOwnProperty(key, desc, strict){
      if (!DefineOwn.call(this, key, desc, false) && strict) {
        return ThrowException('strict_lhs_assignment');
      }

      if (hasOwnDirect(this.ParameterMap, key)) {
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

      if (result && hasOwnDirect(this.ParameterMap, key)) {
        this.ParameterMap.Delete(key, false);
      }

      return result;
    }
  ]);

  function $Math(){
    $Object.call(this);
  }

  inherit($Math, $Object, {
    NativeBrand: BRANDS.NativeMath
  });

  function $JSON(){
    $Object.call(this);
  }

  inherit($JSON, $Object, {
    NativeBrand: BRANDS.NativeJSON
  });

  function $Error(name, type, message){
    $Object.call(this, intrinsics[name+'Proto']);
    defineDirect(this, 'message', message, _CW);
    if (type !== undefined) {
      defineDirect(this, 'type', type, _CW);
    }
  }

  inherit($Error, $Object, {
    NativeBrand: BRANDS.NativeError
  }, [
    function setLocation(loc){
      setDirect(this, 'line', loc.start.line);
      setDirect(this, 'column', loc.start.column);
    },
    function setOrigin(filename, scopename){
      if (filename) {
        setDirect(this, 'filename', filename);
      }
      if (scopename) {
        setDirect(this, 'scope', scopename);
      }
    },
    function setCode(range, code){
      var eol = range[1],
          bol = range[0],
          len = code.length;
      while (eol < len && code[eol + 1] !== '\n') {
        eol++;
      }
      while (bol >= 0 && code[bol - 1] !== '\n') {
        bol--;
      }
      var line = code.slice(bol, eol);
      var pad = new Array(range[0] - bol + 1).join(' ');
      pad += '|'+new Array(range[1] - range[0]).join('_')+'|';
      setDirect(this, 'code', line + '\n' + pad);
    }
  ]);



  function $Proxy(handler, target){
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
    isProxy: true
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
      } else {
        var proxyIsExtensible = ToBoolean(trap.Call(this.Handler, [this.Target])),
            targetIsExtensible  = this.Target.GetExtensible();

        if (proxyIsExtensible !== targetIsExtensible) {
          return ThrowException('proxy_extensibility_inconsistent');
        } else {
          return targetIsExtensible;
        }
      }
    },
    function GetP(key, receiver){

    },
    function SetP(key, value, receiver){

    },
    function GetOwnProperty(key){
      var descObj = TrapGetOwnProperty(this, key);
      if (descObj === undefined) {
        return descObj;
      } else {
        return ToCompletePropertyDescriptor(descObj);
      }
    },
    function DefineOwnProperty(key, desc, strict){
      var descObj = FromGenericPropertyDescriptor(desc);
      return TrapDefineOwnProperty(this, key, descObj, strict);
    },
    function HasOwnProperty(key){

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
    }
  ]);

  function ProxyCall(receiver, args){}
  function ProxyConstruct(args){}

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


  function ExecutionContext(caller, local, realm, code, func, isConstruct){
    this.caller = caller;
    this.realm = realm;
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
      context.realm.active || context.realm.activate();
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
    function initializeBindings(pattern, value, lexical){
      return BindingInitialization(pattern, value, lexical ? this.LexicalEnvironment : undefined);
    },
    function popBlock(){
      var block = this.LexicalEnvironment;
      this.LexicalEnvironment = this.LexicalEnvironment.outer;
      return block;
    },
    function pushBlock(code){
      this.LexicalEnvironment = NewDeclarativeEnvironment(this.LexicalEnvironment);
      return BlockDeclarationInstantiation(code, this.LexicalEnvironment);
    },
    function pushClass(def, superclass){
      return ClassDefinitionEvaluation(def.pattern, superclass, def.ctor, def.methods);
    },
    function pushWith(obj){
      this.LexicalEnvironment = NewObjectEnvironment(obj, this.LexicalEnvironment);
      this.LexicalEnvironment.withEnvironment = true;
      return obj;
    },
    function defineMethod(kind, obj, key, code){
      return PropertyDefinitionEvaluation(kind, obj, key, code);
    },
    function createFunction(name, code){
      if (name) {
        var env = NewDeclarativeEnvironment(this.LexicalEnvironment);
        env.CreateImmutableBinding(name);
      } else {
        var env = this.LexicalEnvironment;
      }
      var func = new $Function(code.Type, name, code.params, code, env, code.Strict);
      MakeConstructor(func);
      name && env.InitializeBinding(name, func);
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
    function Element(prop, base){
      var result = CheckObjectCoercible(base);
      if (result.Abrupt) {
        return result;
      }

      var name = ToPropertyName(prop);
      if (name && name.Completion) {
        if (name.Abrupt) {
          return name;
        } else {
          name = name.value;
        }
      }

      return new Reference(base, name, this.Strict);
    },
    function SuperReference(prop){
      var env = this.GetThisEnvironment();
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
          if (key.Abrupt) {
            return key;
          } else {
            return key.value;
          }
        }
      }

      var ref = new Reference(baseValue, key, this.Strict);
      ref.thisValue = env.GetThisBinding();
      return ref;
    },
    function GetThisEnvironment(){
      var env = this.LexicalEnvironment;
      while (env) {
        if (env.HasThisBinding())
          return env;
        env = env.outer;
      }
    },
    function IdentifierResolution(name){
      return GetIdentifierReference(this.LexicalEnvironment, name, this.Strict);
    },
    function ThisResolution(){
      return this.GetThisEnvironment().GetThisBinding();
    },
    function EvaluateConstruct(func, args) {
      if (typeof func !== OBJECT) {
        return ThrowException('not_constructor', func);
      }

      if ('Construct' in func) {
        return func.Construct(args);
      } else {
        return ThrowException('not_constructor', func);
      }
    },
    function EvaluateCall(ref, func, args){
      if (typeof func !== OBJECT || !IsCallable(func)) {
        return ThrowException('called_non_callable', [ref.name]);
      }

      if (ref instanceof Reference) {
        var receiver = IsPropertyReference(ref) ? GetThisValue(ref) : ref.base.WithBaseObject();
      }

      return func.Call(receiver, args);
    },
    function SpreadArguments(precedingArgs, spread){
      if (typeof spread !== 'object') {
        return ThrowException('spread_non_object');
      }

      var offset = precedingArgs.length,
          len = ToUint32(spread.Get('length'));

      if (len && len.Completion) {
        if (len.Abrupt) {
          return len;
        } else {
          return len.value;
        }
      }

      for (var i=0; i < len; i++) {
        var value = spread.Get(i);
        if (value && value.Completion) {
          if (value.Abrupt) {
            return value;
          } else {
            value = value.value;
          }
        }

        precedingArgs[i + offset] = value;
      }
    },
    function SpreadInitialization(array, offset, spread){
      if (typeof spread !== 'object') {
        return ThrowException('spread_non_object');
      }

      var len = ToUint32(spread.Get('length'));

      if (len && len.Completion) {
        if (len.Abrupt) {
          return len;
        } else {
          return len.value;
        }
      }

      for (var i=0; i < len; i++) {
        var value = spread.Get(i);
        if (value && value.Completion) {
          if (value.Abrupt) {
            return value;
          } else {
            value = value.value;
          }
        }

        defineDirect(array, i + offset, value, ECW);
      }

      defineDirect(array, 'length', i + offset, _CW);
      return i + offset;
    },
    function SpreadDestructuring(target, index){
      var array = new $Array(0);
      if (target == null) {
        return array;
      }
      if (typeof target !== 'object') {
        return ThrowException('spread_non_object', typeof target);
      }

      var len = ToUint32(target.Get('length'));
      if (len && len.Completion) {
        if (len.Abrupt) {
          return len;
        } else {
          len = len.value;
        }
      }

      var count = len - index;
      for (var i=0; i < count; i++) {
        var value = target.Get(index + i);
        if (value && value.Completion) {
          if (value.Abrupt) {
            return value;
          } else {
            value = value.value;
          }
        }
        defineDirect(array, i, value, ECW);
      }

      defineDirect(array, 'length', i, _CW);
      return array;
    }
  ]);


  var $errors = ['EvalError',  'RangeError',  'ReferenceError',  'SyntaxError',  'TypeError',  'URIError'];


  function Intrinsics(realm){
    DeclarativeEnvironmentRecord.call(this);
    this.realm = realm;
    var bindings = this.bindings;
    bindings.ObjectProto = new $Object(null);

    for (var k in $builtins) {
      var prototype = bindings[k + 'Proto'] = create($builtins[k].prototype);
      $Object.call(prototype, bindings.ObjectProto);
      if (k in primitives)
        prototype.PrimitiveValue = primitives[k];
    }

    for (var i=0; i < 6; i++) {
      var prototype = bindings[$errors[i] + 'Proto'] = create($Error.prototype);
      $Object.call(prototype, bindings.ErrorProto);
      defineDirect(prototype, 'name', $errors[i], _CW);
      defineDirect(prototype, 'type', undefined, _CW);
      defineDirect(prototype, 'arguments', undefined, _CW);
    }

    bindings.FunctionProto.FormalParameters = [];
    defineDirect(bindings.ArrayProto, 'length', 0, __W);
    defineDirect(bindings.ErrorProto, 'name', 'Error', _CW);
    defineDirect(bindings.ErrorProto, 'message', '', _CW);

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

      if (realm !== this.realm) {
        var activeRealm = realm;
        this.realm.activate();
      }

      this.bindings[options.name] = new $NativeFunction(options);

      if (activeRealm) {
        activeRealm.activate();
      }
    }

  ]);


  function fromInternalArray(array){
    var $array = new $Array,
        len = array.length;

    for (var i=0; i < len; i++) {
      defineDirect($array, i, array[i], ECW);
    }
    defineDirect($array, 'length', array.length, __W);
    return $array;
  }

  function toInternalArray($array){
    var array = [],
        len = getDirect($array, 'length');

    for (var i=0; i < len; i++) {
      array[i] = getDirect($array, i);
    }
    return array;
  }

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
    WeakMap : $WeakMap
  };

  var primitives = {
    Date: Date.prototype,
    RegExp: RegExp.prototype,
    String: '',
    Number: 0,
    Boolean: false
  };

  var atoms = {
    NaN: NaN,
    Infinity: Infinity,
    undefined: undefined
  };

  function wrapNatives(source, target){
    Object.getOwnPropertyNames(source).forEach(function(key){
      if (typeof source[key] === 'function' && key !== 'constructor' && key !== 'toString' && key !== 'valueOf') {
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
        defineDirect(target, key, func, 6);
      }
    });
  }


  var applybind = Function.prototype.apply.bind(Function.prototype.bind);

  var nativeCode = ['function ', '() { [native code] }'];

  var natives = {
    defineDirect: defineDirect,
    deleteDirect: deleteDirect,
    hasOwnDirect: hasOwnDirect,
    hasDirect: hasDirect,
    setDirect: setDirect,
    ToObject: ToObject,
    ToString: ToString,
    ToNumber: ToNumber,
    ToBoolean: ToBoolean,
    ToPropertyName: ToPropertyName,
    ToInteger: ToInteger,
    ToInt32: ToInt32,
    ToUint32: ToUint32,
    callFunction: function(func, receiver, args){
      return func.Call(receiver, toInternalArray(args))
    },
    isConstructCall: function(){
      return context.isConstruct;
    },
    getNativeBrand: function(object){
      return object.NativeBrand.name;
    },
    markAsNative: function(fn){
      fn.Native = true;
      hide(fn, 'Native');
    },
    markAsNativeConstructor: function(fn){
      fn.Native = true;
      fn.NativeConstructor = true;
      hide(fn, 'Native');
      hide(fn, 'NativeConstructor');
    },
    exception: function(type, args){
      return MakeException(type, toInternalArray(args));
    },
    getPrimitiveValue: function(object){
      return object ? object.PrimitiveValue : undefined;
    },
    write: function(text, color){
      if (color === undefined) {
        color = 'white';
      }
      realm.emit('write', text, color);
    },
    clear: function(){
      realm.emit('clear');
    },
    backspace: function(count){
      realm.emit('backspace', count);
    },
    wrapDateMethods: function(target){
      wrapNatives(Date.prototype, target);
    },
    wrapStringMethods: function(target){
      wrapNatives(String.prototype, target);
    },
    wrapRegExpMethods: function(target){
      wrapNatives(RegExp.prototype, target);
    },
    // FUNCTION
    eval: function(code){
      if (typeof code !== 'string') {
        return code;
      }
      var script = new Script({
        natives: false,
        source: code,
        eval: true
      });
      return script.thunk.run(context);
    },
    FunctionCreate: function(args){
      args = toInternalArray(args);
      var body = args.pop();
      var script = new Script({
        normal: true,
        natives: false,
        source: '(function anonymous('+args.join(', ')+') {\n'+body+'\n})'
      });
      var ctx = new ExecutionContext(context, NewDeclarativeEnvironment(realm.globalEnv), realm, script.bytecode);
      ExecutionContext.push(ctx);
      return script.thunk.run(ctx);
    },
    // FUNCTION PROTOTYPE
    FunctionToString: function(){
      if (!IsCallable(this)) {
        return ThrowException('not_generic', ['Function.prototype.toString'])
      }
      if (this.Native || !this.Code) {
        return nativeCode[0] + this.properties.get('name') + nativeCode[1];
      } else {
        var code = this.Code;
        return code.source.slice(code.range[0], code.range[1]);
      }
    },
    call: function(receiver){
      return this.Call(receiver, slice.call(arguments, 1));
    },
    apply: function(receiver, args){
      return this.Call(receiver, toInternalArray(args));
    },
    bind: function(receiver){
      return new $BoundFunction(this, receiver, slice.call(arguments, 1));
    },

    // BOOLEAN
    BooleanCreate: function(boolean){
      return new $Boolean(boolean);
    },

    // DATE
    DateCreate: function(args){
      return new $Date(new (applybind(Date, [null].concat(toInternalArray(args)))));
    },
    DateToString: function(object){
      return ''+object.PrimitiveValue;
    },
    DateToNumber: function(object){
      return +object.PrimitiveValue;
    },

    // NUMBER
    NumberCreate: function(number){
      return new $Number(number);
    },
    NumberToString: function(object, radix){
      return object.PrimitiveValue.toString(radix);
    },

    // STRING
    StringCreate: function(string){
      return new $String(string);
    },
    // STRING PROTOTYPE
    CodeUnit: function(char){
      return char.charCodeAt(0);
    },
    StringSlice: function(string, start, end){
      return string.slice(start, end);
    },
    StringReplace: function(string, search, replace){
      if (typeof search !== 'string') {
        search = search.PrimitiveValue;
      }
      return string.replace(search, replace);
    },
    replace: function(match, replacer){
      if (typeof match === 'string') {
        return this.PrimitiveValue.replace(match, replacer);
      } else if (match instanceof $RegExp) {
        match = match.PrimitiveValue;
        return this.PrimitiveValue.replace(match.PrimitiveValue, replacer);
      }
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
    RegExpToString: function(object, radix){
      return object.PrimitiveValue.toString(radix);
    },

    // OBJECT
    ObjectCreate: function(proto){
      return new $Object(proto);
    },
    GetExtensible: function(obj){
      return obj.GetExtensible();
    },
    SetExtensible: function(obj, value){
      obj.Extensible = value;
    },
    GetPrototype: function(obj){
      return obj.GetPrototype();
    },
    DefineOwnProperty: function(obj, key, desc){
      obj.DefineOwnProperty(key, ToPropertyDescriptor(desc), false);
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
    JSONCreate: function(){
      var json = new $JSON;
      defineDirect(json, 'stringify', new $NativeFunction({
        call: function(){},
        name: 'stringify',
        length: 3
      }), _CW);
      defineDirect(json, 'parse', new $NativeFunction({
        call: function(){},
        name: 'parse',
        length: 2
      }), _CW);
      return json;
    },
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
              if (x.Abrupt) {
                return x;
              } else {
                x = x.value;
              }
            }
            return fn(x);
          }
        } else if (args === 2) {
          return function(x, y){
            x = ToNumber(x);
            if (x && x.Completion) {
              if (x.Abrupt) {
                return x;
              } else {
                x = x.value;
              }
            }
            y = ToNumber(y);
            if (y && y.Completion) {
              if (y.Abrupt) {
                return y;
              } else {
                y = y.value;
              }
            }
            return fn(x, y);
          }
        } else {
          return function(){
            var values = [];
            for (var k in arguments) {
              var x = arguments[k]
              if (x && x.Completion) {
                if (x.Abrupt) {
                  return x;
                } else {
                  x = x.value;
                }
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
        var math = new $Math;
        for (var i=0; i < consts.length; i++) {
          defineDirect(math, consts[i], Math[consts[i]], ___);
        }
        for (var k in funcs) {
          defineDirect(math, k, new $NativeFunction({
            call: funcs[k],
            name: k,
            length: funcs[k].length
          }), _CW);
        }
        return math;
      };
    })(Math)
  };


  function parse(src, options){
    try {
      return esprima.parse(src, options || parse.options);
    } catch (e) {
      return new AbruptCompletion('throw', new $Error('SyntaxError', undefined, e.message));
    }
  }

  parse.options = {
    loc    : true,
    range  : true,
    raw    : false,
    tokens : false,
    comment: false
  }

  function Script(options){
    if (options instanceof Script)
      return options;

    if (typeof options === FUNCTION) {
      this.type = 'reassembled function';
      if (!utility.fname(options)) {
        options = {
          filename: 'unnamed',
          source: '('+options+')()'
        }
      } else {
        options = {
          filename: utility.fname(options),
          source: options+''
        };
      }
    } else if (typeof options === STRING) {
      options = {
        source: options
      };
    }

    if (options.natives) {
      this.natives = true;
    }
    if (options.eval) {
      this.eval = true;
    }

    if (!isObject(options.ast) && typeof options.source === STRING) {
      this.source = options.source;
      this.ast = parse(options.source);
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

  function ScriptFile(location){
    Script.call(this, {
      source: ScriptFile.load(location),
      filename: location
    });
  }

  ScriptFile.load = function load(location){
    return require('fs').readFileSync(location, 'utf8');
  };

  inherit(ScriptFile, Script);

  function NativeScript(source, location){
    Script.call(this, {
      source: '(function(global, undefined){\n'+source+'\n})(this)',
      filename: location,
      natives: true
    });
  }

  inherit(NativeScript, ScriptFile);




  var builtins,
      realms = [],
      realm = null,
      global = null,
      context = null,
      intrinsics = null;


  function Realm(listener){
    Emitter.call(this);
    this.state = 'initializing';
    this.active = false;
    this.scripts = [];
    this.natives = new Intrinsics(this);
    this.intrinsics = this.natives.bindings;
    this.global = new $Object(new $Object(this.intrinsics.ObjectProto));
    this.global.NativeBrand = BRANDS.GlobalObject;
    this.globalEnv = new GlobalEnvironmentRecord(this.global);

    this.intrinsics.FunctionProto.Realm = this;
    this.intrinsics.FunctionProto.Scope = this.globalEnv;
    this.intrinsics.ThrowTypeError = CreateThrowTypeError(this);
    hide(this.intrinsics.FunctionProto, 'Realm');
    hide(this.intrinsics.FunctionProto, 'Scope');
    hide(this.natives, 'realm');

    for (var k in atoms) {
      defineDirect(this.global, k, atoms[k], ___);
    }

    for (var k in natives) {
      this.natives.binding({ name: k, call: natives[k] });
    }


    if (!builtins) {
      builtins = require('../builtins');
    }

    listener && this.on('*', listener);

    this.activate();
    for (var k in builtins) {
      var script = new NativeScript(builtins[k], k);
      if (script.error) {
        this.emit(script.error.type, script.error.value);
      } else {
        this.eval(script, !listener);
      }
    }
    this.deactivate();

    this.state = 'idle';
  }


  inherit(Realm, Emitter, [
    function activate(){
      if (realm !== this) {
        if (realm) {
          realm.active = false;
          realm.emit('deactivate');
        }
        realms.push(realm);
        realm = this;
        global = operators.global = this.global;
        intrinsics = this.intrinsics;
        this.active = true;
        this.emit('activate');
      }
    },
    function deactivate(){
      if (realm === this) {
        this.active = false;
        realm = realms.pop();
        this.emit('dectivate');
      }
    },
    function resume(){
      if (this.executing) {
        this.emit('resume');
        return this.run(this.executing);
      }
    },
    function run(thunk){
      this.activate();
      this.executing = thunk;
      this.state = 'executing';
      this.emit('executing', thunk);
      var result = thunk.run(context);
      if (result === Pause) {
        this.state = 'paused';
        this.emit('pause');
      } else {
        this.executing = null;
        this.state = 'idle';
        if (result && result.Abrupt) {
          this.emit(result.type, result.value);
          //console.log(context);
        } else {
          this.emit('complete', result);
        }
        this.deactivate();
        return result;
      }
    },
    function prepare(bytecode){
      ExecutionContext.push(new ExecutionContext(null, this.globalEnv, this, bytecode));
      var status = TopLevelDeclarationInstantiation(bytecode);
      if (status && status.Abrupt) {
        this.emit(status.type, status.value);
        return status;
      }
    },
    function eval(subject, quiet){
      this.activate();
      var script = new Script(subject);

      if (script.error) {
        this.emit(script.error.type, script.error.value);
        this.deactivate();
        return script.error;
      }

      realm.quiet = !!quiet;
      this.scripts.push(script);
      return this.prepare(script.bytecode) || this.run(script.thunk);
    },
  ]);



  exports.Realm = Realm;

  exports.builtins = {
    $Object: $Object
  };
  for (var k in $builtins) {
    exports.builtins['$'+k] = $builtins[k];
  }

  return exports;
})((0,eval)('this'), typeof module !== 'undefined' ? module.exports : {});


exports.debug = (function(exports){

  var utility = require('./utility'),
      isObject = utility.isObject,
      inherit = utility.inherit,
      create = utility.create,
      define = utility.define;

  var constants = require('./constants'),
      ENUMERABLE = constants.ATTRIBUTES.ENUMERABLE,
      CONFIGURABLE = constants.ATTRIBUTES.CONFIGURABLE,
      WRITABLE = constants.ATTRIBUTES.WRITABLE,
      ACCESSOR = constants.ATTRIBUTES.ACCESSOR;


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
    kind: 'Unknown',
    label: always(''),
    hasOwn: always(null),
    has: always(null),
    list: alwaysCall(Array),
    inheritedAttrs: alwaysCall(create, [null]),
    ownAttrs: alwaysCall(create, [null]),
    getterAttrs: alwaysCall(create, [null]),
    isExtensible: always(null),
    isEnumerable: always(null),
    isConfigurable: always(null),
    isAccessor: always(null),
    isWritable: always(null),
    propAttributes: always(null)
  });

  function brand(v){
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





  function MirrorObject(subject){
    subject.__introspected = this;
    this.subject = subject;
    this.props = subject.properties;
  }

  inherit(MirrorObject, Mirror, {
    kind: 'Object',
    type: 'object',
    attrs: null,
    props: null
  }, [
    function get(key){
      var prop = this.props.getProperty(key);
      if (!prop) {
        return this.getPrototype().get(key);
      } else if (prop[2] & ACCESSOR) {
        return introspect(this.subject.Get(key));
      } else {
        return introspect(prop[1]);
      }
    },
    function getInternal(name){
      return this.subject[name];
    },
    function getValue(key){
      return this.get(key).subject;
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
    function getPrototype(){
      return introspect(this.subject.GetPrototype());
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
      var brand = this.subject.NativeBrand;
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
        props[prop[0]] = prop[2];
      });
      return props;
    },
    function getterAttrs(own){
      var inherited = this.getPrototype().getterAttrs(),
          props = this.ownAttrs();

      for (var k in props) {
        if (own || props[k] & ACCESSOR) {
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
        if (hidden || props[k] & ENUMERABLE) {
          keys.push(k);
        }
      }

      return keys.sort();
    }
  ]);


  function MirrorArguments(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorArguments, MirrorObject, {
    kind: 'Arguments'
  }, [
  ]);


  function MirrorArray(subject){
    MirrorObject.call(this, subject);
  }

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
        if (hidden || props[k] & ENUMERABLE) {
          if (k !== 'length' && !utility.isInteger(+k)) {
            keys.push(k);
          }
        }
      }

      return indexes.concat(keys.sort());
    }
  ]);


  function MirrorBoolean(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorBoolean, MirrorObject, {
    kind: 'Boolean'
  }, [
    function label(){
      return 'Boolean('+this.subject.PrimitiveValue+')';
    }
  ]);

  function MirrorDate(subject){
    MirrorObject.call(this, subject);
  }

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


  function MirrorError(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorError, MirrorObject, {
    kind: 'Error'
  }, [
  ]);

  function MirrorThrown(subject){
    MirrorError.call(this, subject);
  }

  inherit(MirrorThrown, MirrorError, {
    kind: 'Thrown'
  }, [
    function getError(){
      return this.getValue('name') + ': ' + this.getValue('message');
    },
    function trace(){
      return this.subject.trace;
    },
    function context(){
      return this.subject.context;
    }
  ]);


  function MirrorFunction(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorFunction, MirrorObject, {
    type: 'function',
    kind: 'Function',
  }, [
    function getName(){
      return this.props.get('name');
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


  function MirrorGlobal(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorGlobal, MirrorObject, {
    kind: 'Global'
  }, [
  ]);



  function MirrorJSON(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorJSON, MirrorObject, {
    kind: 'JSON'
  }, [
  ]);

  function MirrorMap(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorMap, MirrorObject, {
    kind: 'Map'
  }, [
  ]);

  function MirrorMath(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorMath, MirrorObject, {
    kind: 'Math'
  }, [
  ]);

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
      return 'Number('+value+')';
    }
  ]);

  function MirrorRegExp(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorRegExp, MirrorObject, {
    kind: 'RegExp'
  }, [
    function label(){
      return this.subject.PrimitiveValue+'';
    }
  ]);


  function MirrorSet(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorSet, MirrorObject, {
    kind: 'Set'
  }, [
  ]);


  function MirrorString(subject){
    MirrorObject.call(this, subject);
  }

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
        props[prop[0]] = prop[2];
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


  function MirrorWeakMap(subject){
    MirrorObject.call(this, subject);
  }

  inherit(MirrorWeakMap, MirrorObject, {
    kind: 'WeakMap'
  }, [
  ]);



  function MirrorProxy(subject){
    this.subject = subject;
    if ('Call' in subject) {
      this.type = 'function';
    }
    this.attrs = create(null)
    this.props = create(null)
    this.kind = introspect(subject.Target).kind;
  }

  inherit(MirrorProxy, Mirror, {
    type: 'object'
  }, [
    MirrorObject.prototype.isExtensible,
    MirrorObject.prototype.getPrototype,
    MirrorObject.prototype.list,
    MirrorObject.prototype.inheritedAttrs,
    MirrorObject.prototype.getterAttrs,
    function label(){
      return 'Proxy' + MirrorObject.prototype.label.call(this);
    },
    function get(key){
      this.refresh(key);
      return introspect(this.props.get(key));
    },
    function hasOwn(key){
      return this.refresh(key);
    },
    function has(key){
      return this.refresh(key) ? true : this.getPrototype().has(key);
    },
    function isPropEnumerable(key){
      if (this.refresh(key)) {
        return (this.attrs[key] & ENUMERABLE) > 0;
      } else {
        return false;
      }
    },
    function isPropConfigurable(key){
      if (this.refresh(key)) {
        return (this.attrs[key] & CONFIGURABLE) > 0;
      } else {
        return false;
      }
    },
    function isPropAccessor(key){
      if (this.refresh(key)) {
        return (this.attrs[key] & ACCESSOR) > 0;
      } else {
        return false;
      }
    },
    function isPropWritable(key){
      if (this.refresh(key)) {
        return !!(this.isAccessor() ? this.props[key].Set : this.attrs[key] & WRITABLE);
      } else {
        return false;
      }
    },
    function propAttributes(key){
      if (this.refresh(key)) {
        return this.attrs[key];
      } else {
        return this.getPrototype().propAttributes(key);
      }
    },
    function ownAttrs(props){
      var key, keys = this.subject.GetOwnPropertyNames();

      props || (props = create(null));
      this.props = create(null);
      this.attrs = create(null);

      for (var i=0; i < keys.length; i++) {
        key = keys[i];
        if (this.refresh(key)) {
          props[key] = this.attrs[key];
        }
      }

      return props;
    },
    function refresh(key){
      if (!(key in this.attrs)) {
        var desc = this.subject.GetOwnProperty(key, false);
        if (desc) {
          if ('Value' in desc) {
            this.attrs[key] = desc.Enumerable | (desc.Configurable << 1) | (desc.Writable << 2);
            this.props[key] = desc.Value;
          } else {
            this.attrs[key] = desc.Enumerable | (desc.Configurable << 1) | A;
            this.props[key] = { Get: desc.Get, Set: desc.Set };
          }
          return true;
        } else {
          delete this.attrs[key];
          delete this.props[key];
        }
      }
      return false;
    }
  ]);


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
    Map      : MirrorMap,
    Number   : MirrorNumber,
    RegExp   : MirrorRegExp,
    Set      : MirrorSet,
    String   : MirrorString,
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
        if (subject === null) {
          return _Null;
        }
        if (subject instanceof Mirror) {
          return subject;
        }
        if (subject.__introspected) {
          return subject.__introspected;
        }
        if (subject.Completion) {
          return new MirrorThrown(subject.value);
        } else if (subject.NativeBrand) {
          if (!subject.isProxy) {
            var Ctor = subject.NativeBrand.name in brands
                      ? brands[subject.NativeBrand.name]
                      : 'Call' in subject
                        ? MirrorFunction
                        : MirrorObject;

            return new Ctor(subject);
          } else {
            return new MirrorProxy(subject);
          }
        } else {
          console.log(subject);
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

  var label = function(mirror){
    return mirror.label();
  };

  Renderer.prototype = {
    Unknown: label,
    BooleanValue: label,
    StringValue: function(mirror){
      return utility.quotes(mirror.subject);
    },
    NumberValue: function(mirror){
      var label = mirror.label();
      return label === 'number' ? mirror.subject : label;
    },
    UndefinedValue: label,
    NullValue: label,
    Thrown: function(mirror){
      return mirror.getError();
    },
    Arguments: label,
    Array: label,
    Boolean: label,
    Date: label,
    Error: function(mirror){
      return mirror.getValue('name') + ': ' + mirror.getValue('message');
    },
    Function: label,
    Global: label,
    JSON: label,
    Map: label,
    Math: label,
    Object: label,
    Number: label,
    RegExp: label,
    Set: label,
    String: label,
    WeakMap: label
  };

  define(Renderer.prototype, [
    function render(subject){
      var mirror = introspect(subject);
      return this[mirror.kind](mirror);
    }
  ]);


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
    if (typeof Proxy !== 'object' || typeof require !== 'function') return;

    var util = require('util'),
        $Object = require('./runtime').builtins.$Object;

    define($Object.prototype, function inspect(fn){
      if (fn && typeof fn === 'function') {
        return fn(wrap(this));
      } else {
        return util.inspect(wrap(this), true, 2, false);
      }
    });

    function wrap(target){
      if (isObject(target) && target instanceof $Object) {
        target = introspect(target);
        if (!target.proxy) {
          if (target.getParams) {
            target.proxy = Proxy.createFunction(new RenderHandler(target), function(){});
          } else {
            target.proxy = Proxy.create(new RenderHandler(target));
          }
        }
        return target.proxy;
      }
      return target;
    }


    function RenderHandler(mirror){
      this.mirror = mirror;
    }

    RenderHandler.prototype = {
      getOwnPropertyNames: function(){
        return this.mirror.list(true, true);
      },
      getPropertyNames: function(){
        return this.mirror.list(true, false);
      },
      enumerate: function(){
        return this.mirror.list(false, false);
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
        if (key === 'toString') {
          var mirror = this.mirror;
          return function toString(){
            return '[object '+ mirror.subject.NativeBrand+']';
          };
        }
        return wrap(this.mirror.getValue(key));
      },
      set: function(){},
      has: function(key){
        return this.mirror.has(key);
      },
      hasOwn: function(key){
        return this.mirror.hasOwn(key);
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


exports.builtins.$utility = "var ___ = 0x00,\n    E__ = 0x01,\n    _C_ = 0x02,\n    EC_ = E__ | _C_,\n    __W = 0x04,\n    E_W = E__ | __W,\n    _CW = _C_ | __W,\n    ECW = EC_ | __W,\n    __A = 0x08,\n    E_A = E__ | __A,\n    _CA = _C_ | __A,\n    ECA = EC_ | __A;\n\n\n$__defineMethods = function defineMethods(obj, props){\n  for (var i in props) {\n    $__defineDirect(obj, props[i].name, props[i], _CW);\n    $__markAsNative(props[i]);\n    $__deleteDirect(props[i], 'prototype');\n  }\n  return obj;\n};\n\n$__defineProps = function defineProps(obj, props){\n  for (var name in props) {\n    var prop = props[name];\n    $__defineDirect(obj, name, prop, _CW);\n    if (typeof prop === 'function') {\n      $__defineDirect(prop, 'name', name, ___);\n      $__markAsNative(prop);\n      $__deleteDirect(prop, 'prototype');\n    }\n  }\n  return obj;\n};\n\n$__defineConstants = function defineConstants(obj, props){\n  for (var k in props) {\n    $__defineDirect(obj, k, props[k], ___);\n  }\n};\n\n$__setupConstructor = function setupConstructor(ctor, proto){\n  $__defineDirect(ctor, 'prototype', proto, ___);\n  $__defineDirect(ctor.prototype, 'constructor', ctor, ___);\n  $__defineDirect(global, ctor.name, ctor, _CW);\n  $__markAsNativeConstructor(ctor);\n};\n\n$__EmptyClass = function constructor(...args){\n  super(...args);\n};\n";

exports.builtins.Array = "function Array(...values){\n  if (values.length === 1 && typeof values[0] === 'number') {\n    var out = [];\n    out.length = values[0];\n    return out;\n  } else {\n    return values;\n  }\n}\n\n$__setupConstructor(Array, $__ArrayProto);\n\n\n$__defineProps(Array, {\n  isArray(array){\n    return $__getNativeBrand(array) === 'Array';\n  },\n  from(iterable){\n    var out = [];\n    iterable = Object(iterable);\n\n    for (var i = 0, len = iterable.length >>> 0; i < len; i++) {\n      if (i in iterable) {\n        out[i] = iterable[i];\n      }\n    }\n\n    return out;\n  }\n});\n\n$__defineProps(Array.prototype, {\n  filter(callback){\n    if (this == null) {\n      throw $__exception('called_on_null_or_undefined', ['Array.prototype.filter']);\n    }\n\n    var array = $__ToObject(this),\n        length = $__ToUint32(this.length);\n\n    var receiver = this;\n\n    if (typeof receiver !== 'object') {\n      receiver = $__ToObject(receiver);\n    }\n\n    var result = [],\n        count = 0;\n\n    for (var i = 0; i < length; i++) {\n      if (i in array) {\n        var element = array[i];\n        if ($__callFunction(callback, receiver, [element, i, array])) {\n          result[count++] = element;\n        }\n      }\n    }\n\n    return result;\n  },\n  forEach(callback, context){\n    var len = this.length;\n    if (arguments.length === 1) {\n      context = this;\n    } else {\n      context = $__ToObject(this);\n    }\n    for (var i=0; i < len; i++) {\n      callback.call(context, this[i], i, this);\n    }\n  },\n  map(callback, context){\n    var out = [];\n    var len = this.length;\n    if (arguments.length === 1) {\n      context = this;\n    } else {\n      context = Object(this);\n    }\n    for (var i=0; i < len; i++) {\n      out.push(callback.call(context, this[i], i, this));\n    }\n    return out;\n  },\n  reduce(callback, initial){\n    var index = 0;\n    if (arguments.length === 1) {\n      initial = this[0];\n      index++;\n    }\n    for (; index < this.length; i++) {\n      if (i in this) {\n        initial = callback.call(this, initial, this[o], this);\n      }\n    }\n    return initial;\n  },\n  join(separator){\n    var out = '', len = this.length;\n\n    if (len === 0) {\n      return out;\n    }\n\n    if (arguments.length === 0) {\n      separator = ',';\n    } else if (typeof separator !== 'string') {\n      separator = $__ToString(separator);\n    }\n\n    len--;\n    for (var i=0; i < len; i++) {\n      out += this[i] + separator;\n    }\n\n    return out + this[i];\n  },\n  push(...values){\n    var len = this.length,\n        valuesLen = values.length;\n\n    for (var i=0; i < valuesLen; i++) {\n      this[len++] = values[i];\n    }\n    return len;\n  },\n  pop(){\n    var out = this[this.length - 1];\n    this.length--;\n    return out;\n  },\n  slice(start, end){\n    var out = [], len;\n\n    start = start === undefined ? 0 : +start || 0;\n    end = end === undefined ? this.length - 1 : +end || 0;\n\n    if (start < 0) {\n      start += this.length;\n    }\n\n    if (end < 0) {\n      end += this.length;\n    } else if (end >= this.length) {\n      end = this.length - 1;\n    }\n\n    if (start > end || end < start || start === end) {\n      return [];\n    }\n\n    len = start - end;\n    for (var i=0; i < len; i++) {\n      out[i] = this[i + start];\n    }\n\n    return out;\n  },\n  toString(){\n    return this.join(',');\n  }\n});\n";

exports.builtins.Boolean = "function Boolean(value){\n  value = $__ToBoolean(value);\n  if ($__isConstructCall()) {\n    return $__BooleanCreate(value);\n  } else {\n    return value;\n  }\n}\n\n$__setupConstructor(Boolean, $__BooleanProto);\n\n$__defineProps(Boolean.prototype, {\n  toString(){\n    if ($__getNativeBrand(this) === 'Boolean') {\n      return $__getPrimitiveValue(this) ? 'true' : 'false';\n    } else {\n      throw $__exception('not_generic', ['Boolean.prototype.toString']);\n    }\n  },\n  valueOf(){\n    if ($__getNativeBrand(this) === 'Boolean') {\n      return $__getPrimitiveValue(this);\n    } else {\n      throw $__exception('not_generic', ['Boolean.prototype.valueOf']);\n    }\n  }\n});\n";

exports.builtins.Date = "function Date(...values){\n  return $__DateCreate(values);\n}\n\n$__setupConstructor(Date, $__DateProto);\n\n$__defineProps(Date.prototype, {\n  toString(){\n    if ($__getNativeBrand(this) === 'Date') {\n      return $__DateToString(this);\n    } else {\n      throw $__exception('not_generic', ['Date.prototype.toString']);\n    }\n  },\n  valueOf(){\n    if ($__getNativeBrand(this) === 'Date') {\n      return $__DateToNumber(this);\n    } else {\n      throw $__exception('not_generic', ['Date.prototype.valueOf']);\n    }\n  }\n});\n\n$__wrapDateMethods(Date.prototype);\n";

exports.builtins.Error = "function Error(message){\n  this.message = message;\n}\n$__setupConstructor(Error, $__ErrorProto);\n\n$__defineProps(Error.prototype, {\n  toString(){\n    return this.name + ': '+this.message;\n  }\n});\n\nfunction EvalError(message){\n  this.message = message;\n}\n$__setupConstructor(EvalError, $__EvalErrorProto);\n\nfunction RangeError(message){\n  this.message = message;\n}\n$__setupConstructor(RangeError, $__RangeErrorProto);\n\nfunction ReferenceError(message){\n  this.message = message;\n}\n$__setupConstructor(ReferenceError, $__ReferenceErrorProto);\n\nfunction SyntaxError(message){\n  this.message = message;\n}\n$__setupConstructor(SyntaxError, $__SyntaxErrorProto);\n\nfunction TypeError(message){\n  this.message = message;\n}\n$__setupConstructor(TypeError, $__TypeErrorProto);\n\nfunction URIError(message){\n  this.message = message;\n}\n$__setupConstructor(URIError, $__URIErrorProto);\n";

exports.builtins.Function = "function Function(...args){\n  return $__FunctionCreate(args);\n}\n\n$__defineDirect($__FunctionProto, 'name', 'Empty', 0);\n\n$__setupConstructor(Function, $__FunctionProto);\n\n$__defineMethods(Function.prototype, [\n  $__call,\n  $__apply,\n  $__bind,\n]);\n\n$__defineProps(Function.prototype, {\n  toString: $__FunctionToString\n});\n";

exports.builtins.Map = "function Map(iterable){}\n$__setupConstructor(Map, $__MapProto);\n";

exports.builtins.Number = "function Number(value){\n  value = $__ToNumber(value);\n  if ($__isConstructCall()) {\n    return $__NumberCreate(value);\n  } else {\n    return value;\n  }\n}\n\n$__setupConstructor(Number, $__NumberProto);\n\n$__defineConstants(Number, {\n  EPSILON: 2.220446049250313e-16,\n  MAX_INTEGER: 9007199254740992,\n  MAX_VALUE: 1.7976931348623157e+308,\n  MIN_VALUE: 5e-324,\n  NaN: NaN,\n  NEGATIVE_INFINITY: -Infinity,\n  POSITIVE_INFINITY: Infinity\n});\n\n$__defineProps(Number, {\n  isNaN(number){\n    return number !== number;\n  },\n  isFinite(number){\n    return typeof value === 'number'\n        && value === value\n        && value < Infinity\n        && value > -Infinity;\n  },\n  isInteger(value) {\n    return typeof value === 'number'\n        && value === value\n        && value > -9007199254740992\n        && value < 9007199254740992\n        && value | 0 === value;\n  },\n  toInteger(value){\n    return (value / 1 || 0) | 0;\n  }\n});\n\nvar isFinite = Number.isFinite;\n\n$__defineProps(Number.prototype, {\n  toString(radix){\n    if ($__getNativeBrand(this) === 'Number') {\n      return $__NumberToString(this, radix);\n    } else {\n      throw $__exception('not_generic', ['Number.prototype.toString']);\n    }\n  },\n  valueOf(){\n    if ($__getNativeBrand(this) === 'Number') {\n      return $__getPrimitiveValue(this);\n    } else {\n      throw $__exception('not_generic', ['Number.prototype.valueOf']);\n    }\n  },\n  clz() {\n    var x = $__ToNumber(this);\n    if (!x || !isFinite(x)) {\n      return 32;\n    } else {\n      x = x < 0 ? x + 1 | 0 : x | 0;\n      x -= (x / 0x100000000 | 0) * 0x100000000;\n      return 32 - $__NumberToString(x, 2).length;\n    }\n  }\n});\n";

exports.builtins.Object = "function Object(value){\n  if ($__isConstructCall()) {\n    return {};\n  } else if (value == null) {\n    return {};\n  } else {\n    return $__ToObject(value);\n  }\n}\n\n$__setupConstructor(Object, $__ObjectProto);\n\n$__defineProps(Object, {\n  create(prototype, properties){\n    if (typeof prototype !== 'object') {\n      throw $__exception('proto_object_or_null', [])\n    }\n\n    var object = $__ObjectCreate(prototype);\n\n    if (properties !== undefined) {\n      ensureDescriptor(properties);\n\n      for (var k in descs) {\n        var desc = properties[k];\n        ensureDescriptor(desc);\n        $__DefineOwnProperty(object, key, desc);\n      }\n    }\n\n    return object;\n  },\n  defineProperty(object, key, property){\n    ensureObject(object, 'Object.defineProperty');\n    ensureDescriptor(property);\n    key = $__ToPropertyName(key);\n    $__DefineOwnProperty(object, key, property);\n    return object;\n  },\n  defineProperties(object, properties){\n    ensureObject(object, 'Object.defineProperties');\n    ensureDescriptor(properties);\n\n    for (var key in properties) {\n      var desc = properties[key];\n      ensureDescriptor(desc);\n      $__DefineOwnProperty(object, key, desc);\n    }\n\n    return object;\n  },\n  freeze(object){\n    ensureObject(object, 'Object.freeze');\n    var props = $__Enumerate(object, false, false);\n\n    for (var i=0; i < props.length; i++) {\n      var desc = $__GetOwnProperty(object, props[i]);\n      if (desc.configurable) {\n        desc.configurable = false;\n        if ('writable' in desc) {\n          desc.writable = false;\n        }\n        $__DefineOwnProperty(object, props[i], desc);\n      }\n    }\n\n    $__SetExtensible(object, false);\n    return object;\n  },\n  getOwnPropertyDescriptor(object, key){\n    ensureObject(object, 'Object.getOwnPropertyDescriptor');\n    key = $__ToPropertyName(key);\n    return $__GetOwnProperty(object, key);\n  },\n  getOwnPropertyNames(object){\n    ensureObject(object, 'Object.getOwnPropertyNames');\n    return $__Enumerate(object, false, false);\n  },\n  getPropertyDescriptor(object, key){\n    ensureObject(object, 'Object.getPropertyDescriptor');\n    key = $__ToPropertyName(key);\n    return $__GetProperty(object, key);\n  },\n  getPropertyNames(object){\n    ensureObject(object, 'Object.getPropertyNames');\n    return $__Enumerate(object, true, false);\n  },\n  getPrototypeOf(object){\n    ensureObject(object, 'Object.getPrototypeOf');\n    return $__GetPrototype(object);\n  },\n  isExtensible(object){\n    ensureObject(object, 'Object.isExtensible');\n    return $__GetExtensible(object);\n  },\n  isFrozen(object){\n    ensureObject(object, 'Object.isFrozen');\n    if ($__GetExtensible(object)) {\n      return false;\n    }\n\n    var props = $__Enumerate(object, false, false);\n\n    for (var i=0; i < props.length; i++) {\n      var desc = $__GetOwnProperty(object, props[i]);\n      if (desc) {\n        if (desc.configurable || 'writable' in desc && desc.writable) {\n          return false;\n        }\n      }\n    }\n\n    return true;\n  },\n  isSealed(object){\n    ensureObject(object, 'Object.isSealed');\n    if ($__GetExtensible(object)) {\n      return false;\n    }\n\n    var props = $__Enumerate(object, false, false);\n\n    for (var i=0; i < props.length; i++) {\n      var desc = $__GetOwnProperty(object, props[i]);\n      if (desc && desc.configurable) {\n        return false;\n      }\n    }\n\n    return true;\n  },\n  keys(object){\n    ensureObject(object, 'Object.keys');\n    return $__Enumerate(object, false, true);\n  },\n  preventExtensions(object){\n    ensureObject(object, 'Object.preventExtensions');\n    $__SetExtensible(object, false);\n    return object;\n  }\n});\n\n$__defineProps(Object.prototype, {\n  toString(){\n    if (this === undefined) {\n      return '[object Undefined]';\n    } else if (this === null) {\n      return '[object Null]';\n    } else {\n      return '[object '+$__getNativeBrand($__ToObject(this))+']';\n    }\n  },\n  isPrototypeOf(object){\n    while (object) {\n      object = $__GetPrototype(object);\n      if (object === this) {\n        return true;\n      }\n    }\n    return false;\n  },\n  toLocaleString(){\n    return this.toString();\n  },\n  valueOf(){\n    return $__ToObject(this);\n  },\n  hasOwnProperty(key){\n    var object = $__ToObject(this);\n    return $__HasOwnProperty(object, key);\n  },\n  propertyIsEnumerable(key){\n    var object = $__ToObject(this);\n    return ($__GetPropertyAttributes(this, key) & E) !== 0;\n  }\n});\n\nvar E = 0x1,\n    C = 0x2,\n    W = 0x4,\n    A = 0x8;\n\nfunction ensureObject(o, name){\n  var type = typeof o;\n  if (type === 'object' ? o === null : type !== 'function') {\n    throw $__exception('called_on_non_object', [name]);\n  }\n}\n\nfunction ensureDescriptor(o){\n  if (o === null || typeof o !== 'object') {\n    throw $__exception('property_desc_object', [typeof o])\n  }\n}\n";

exports.builtins.RegExp = "function RegExp(pattern, flags){\n  if ($__isConstructCall()) {\n    if (pattern === undefined) {\n      pattern = '';\n    } else if (typeof pattern === 'string') {\n    } else if (typeof pattern === 'object' && $__getNativeBrand(pattern) === 'RegExp') {\n      if (flags !== undefined) {\n        throw $__exception('regexp_flags', []);\n      }\n    } else {\n      pattern = $__ToString(pattern);\n    }\n    return $__RegExpCreate(pattern, flags);\n  } else {\n    if (flags === undefined && pattern) {\n      if (typeof pattern === 'object' && $__getNativeBrand(pattern) === 'RegExp') {\n        return pattern;\n      }\n    }\n    return $__RegExpCreate(pattern, flags);\n  }\n}\n\n$__setupConstructor(RegExp, $__RegExpProto);\n$__wrapRegExpMethods(RegExp.prototype);\n\n$__defineProps(RegExp.prototype, {\n  toString(){\n    if ($__getNativeBrand(this) === 'RegExp') {\n      return $__RegExpToString(this);\n    } else {\n      throw $__exception('not_generic', ['RegExp.prototype.toString']);\n    }\n  }\n});\n";

exports.builtins.Set = "function Set(iterable){}\n$__setupConstructor(Set, $__SetProto);\n";

exports.builtins.String = "function String(string){\n  string = arguments.length ? $__ToString(string) : '';\n  if ($__isConstructCall()) {\n    return $__StringCreate(string);\n  } else {\n    return string;\n  }\n}\n\n$__setupConstructor(String, $__StringProto);\n$__wrapStringMethods(String.prototype);\n\n$__defineProps(String.prototype, {\n  repeat(count){\n    var s = $__ToString(this),\n        n = $__ToInteger(count),\n        o = '';\n\n    if (n <= 1 || n === Infinity || n === -Infinity) {\n      throw $__exception('invalid_repeat_count', []);\n    }\n\n    while (n > 0) {\n      n & 1 && (o += s);\n      n >>= 1;\n      s += s;\n    }\n\n    return o;\n  },\n  charAt(position){\n    var string = $__ToString(this);\n    position = $__ToInteger(position);\n    return position < 0 || position >= string.length ? '' : string[position];\n  },\n  charCodeAt(position){\n    var string = $__ToString(this);\n    position = $__ToInteger(position);\n    return position < 0 || position >= string.length ? NaN : $__CodeUnit(string[position]);\n  },\n  concat(...args){\n    var string = $__ToString(this);\n    for (var i=0; i < args.length; i++) {\n      string += $__ToString(args[i]);\n    }\n    return string;\n  },\n  indexOf(search){\n    return stringIndexOf(this, search, arguments[1]);\n  },\n  lastIndexOf(search){\n    var string = $__ToString(this),\n        len = string.length,\n        position = $__ToNumber(arguments[1]);\n\n    search = $__ToString(search);\n    var searchLen = search.length;\n\n    position = position !== position ? Infinity : $__ToInteger(position);\n    position -= searchLen;\n\n    var i = position > 0 ? position < len ? position : len : 0;\n\n    while (i--) {\n      var j = 0;\n      while (j < searchLen && search[j] === string[i + j]) {\n        if (j++ === searchLen - 1) {\n          return i;\n        }\n      }\n    }\n    return -1;\n  },\n  match(regexp){\n    return stringMatch(this, regexp);\n  },\n  replace(search, replace){\n    var string = $__ToString(this);\n\n    if (typeof replace === 'function') {\n      var match, count;\n      if (isRegExp(search)) {\n        match = stringMatch(string, search);\n        count = matches.length;\n      } else {\n        match = stringIndexOf(string, $__ToString(search));\n        count = 1;\n      }\n      //TODO\n    } else {\n      replace = $__ToString(replace);\n      if (!isRegExp(search)) {\n        search = $__ToString(search);\n      }\n      return $__StringReplace(string, search, replace);\n    }\n  },\n  slice(start, end){\n    var string = $__ToString(this);\n    start = $__ToInteger(start);\n    if (end !== undefined)\n      end = $_ToInteger(end);\n    }\n    return $__StringSlice(string, start, end);\n  },\n  toString(){\n    if ($__getNativeBrand(this) === 'String') {\n      return $__getPrimitiveValue(this);\n    } else {\n      throw $__exception('not_generic', ['String.prototype.toString']);\n    }\n  },\n  valueOf(){\n    if ($__getNativeBrand(this) === 'String') {\n      return $__getPrimitiveValue(this);\n    } else {\n      throw $__exception('not_generic', ['String.prototype.valueOf']);\n    }\n  },\n});\n\n\nfunction isRegExp(subject){\n  return subject != null && typeof subject === 'object' && $__getNativeBrand(subject) === 'RegExp';\n}\n\nfunction stringIndexOf(string, search, position){\n  string = $__ToString(string);\n  search = $__ToString(search);\n  position = $__ToInteger(position);\n\n  var len = string.length,\n      searchLen = search.length,\n      i = position > 0 ? position < len ? position : len : 0,\n      maxLen = len - searchLen;\n\n  while (i < maxLen) {\n    var j = 0;\n    while (j < searchLen && search[j] === string[i + j]) {\n      if (j++ === searchLen - 1) {\n        return i;\n      }\n    }\n  }\n  return -1;\n}\n\nfunction stringMatch(string, regexp){\n  string = $__ToString(string);\n  if (!isRegExp(regexp)) {\n    regexp = new RegExp(regexp);\n  }\n  if (!regexp.global) {\n    return regexp.exec(string);\n  }\n  regexp.lastIndex = 0;\n  var array = [],\n      previous = 0,\n      lastMatch = true,\n      n = 0;\n\n  while (lastMatch) {\n    var result = regexp.exec(string);\n    if (result === null) {\n      lastMatch = false;\n    } else {\n      var thisIndex = regexp.lastIndex;\n      if (thisIndex === lastIndex) {\n        previous = regexp.lastIndex = thisIndex + 1;\n      } else {\n        previous = thisIndex;\n      }\n      array[n++] = result[0];\n    }\n  }\n\n  return n === 0 ? null : array;\n}\n";

exports.builtins.WeakMap = "function WeakMap(iterable){}\n$__setupConstructor(WeakMap, $__WeakMapProto);\n";

exports.builtins.global = "$__defineProps(global, {\n  Math: $__MathCreate(),\n  JSON: $__JSONCreate(),\n  parseInt: $__parseInt,\n  parseFloat: $__parseFloat,\n  decodeURI: $__decodeURI,\n  encodeURI: $__encodeURI,\n  decodeURIComponent: $__decodeURIComponent,\n  encodeURIComponent: $__encodeURIComponent,\n  escape: $__escape,\n  eval: $__eval,\n  isNaN(number){\n    number = $__ToNumber(number);\n    return number !== number;\n  },\n  isFinite(number){\n    number = $__ToNumber(number);\n    return number === number && number !== Infinity && number !== -Infinity;\n  }\n});\n\n$__defineProps(global, {\n  stdout: {\n    write(text, color){\n      $__write(text, color);\n    },\n    clear(){\n      $__clear();\n    },\n    backspace(count){\n      $__backspace(count);\n    }\n  },\n  console: {\n    log(...values){\n      for (var i=0; i < values.length; i++) {\n        stdout.write(values[i] + ' ');\n      }\n      stdout.write('\\n');\n    }\n  }\n});\n";



return (function(Realm){
  function continuum(listener){
    return new Realm(listener);
  }

  continuum.debug = exports.debug;
  continuum.utility = exports.utility;
  continuum.constants = exports.constants;
  continuum.Realm = Realm;

  return continuum;
})(exports.runtime.Realm);

}).apply(this, function(){
  var exports = { builtins: {} };

  function require(request){
    request = request.slice(request.lastIndexOf('/') + 1);
    return exports[request];
  }

  return [exports, require];
}());
