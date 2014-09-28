// =============================================================================
// 
// Astar-GAC implementation
//
//
//
var Dict = require('dict');
var Queue = require('adt-queue');
var _ = require('underscore');
var options;

var TDA;
var notTDA;

var domainOf;
var domains;

var variables;
var constraints;

/**
 *
 */
astarGAC = function(opts, cb) {

	// -- Used variables -------------------------------------------------------
	options = opts;
	
	TDA = new Queue();
	notTDA = new Dict();
	
	domainOf = options.domainOf;
	domains = {};

	variables = _.isFunction(options.variables) && options.variables() || options.variables;
	constraints = _.isFunction(options.constraints) && options.constraints() || options.constraints;

	// -- Validate options -----------------------------------------------------

	// if(!options.n) {
	// 	cb(true, { error: "The neighbor function is not present in the options. Form: function(node){}" });
	// 	return;
	// } else {
	// 	if(!_.isFunction(options.n)) {
	// 		cb(true, { error: "options.n is not a function at its accepted form: function(node){}" });
	// 		return;
	// 	}
	// }

	// -- Initialization -------------------------------------------------------
	// data: createFunction(["a", "c"], "a == 2 * c")

	// For each variable get the domain
	for(var i = 0, variable = variables[i]; i < variables.length; i++) {
		domains[variable] = domainOf(variable);
	}

	//Add all variable & constraints pairs to queue
	for(var i = 0; i < variables.length; i++) {
		for(var j = 0; j < constraints.length; j++) {
			// TODO: generalize this process
			for (var v in constraints[j]) {
				if(variables[i].index == constraints[j][v]) {
					var n = {
						variable: variables[i].index,
						constraint: j
					};
					TDA.enqueue(n);
				}	
			}
		}
	}

	// -- Domain-filtering loop ------------------------------------------------
	while(!TDA.isEmpty()) {

		// pop a variable and constraint pair
		var el = TDA.dequeue();

		// store to keep track of processed nodes.
		notTDA.set(generateHash(el), el);

		if(reviseStar(el)) {
			if(domains[el.variable].length == 0) {
				cb(true, {
					error: "No solution found."
				});

				return false;
			}

		}
	}
	
	// -- Rerun ----------------------------------------------------------------
	//GAC();

	// -- Termination ----------------------------------------------------------

	//var res = createFunction(["a", "c"], "a == 2 * c");


	return true;
};


reduceDomains = function(variables, domainOf, constraints) {
	
	


}

reviseStar = function(variable, constraint) {
	var revised = false;

	return revised;
}


createFunction = function(variableNames, expression) {
	var params = variableNames[0];

	for(var i = 1; i < variableNames.length; i++) {
		params = params + ", " + variableNames[i];
	}

	var funcString = "return function " + "xxx" + "(" + params + "){ return " + expression + "; };";

	return new Function(funcString)();
}

generateHash = function(o) {
	return o.toString();
};