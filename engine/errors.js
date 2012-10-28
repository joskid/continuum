var errors = (function(errors, messages, exports){
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

