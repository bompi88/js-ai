// =============================================================================
// 
// Astar-GAC implementation
//
//
//

var hash = require('object-hash');
var Dict = require('dict');
var Queue = require('adt-queue');
var _ = require('underscore');

var TDA;
var notTDA;

var domains;

var variables;
var constraints;

var options;

var variableNames = {};
/**
 *
 */
// GAC = function(opts, cb) {

// 	// -- Used variables -------------------------------------------------------
	
var allowedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

	
	
// 	// -- Rerun ----------------------------------------------------------------
// 	//GAC();

// 	// -- Termination ----------------------------------------------------------

// 	//var res = createFunction(["a", "c"], "a == 2 * c");


// 	return true;
// };

var createVarName = function () {
	var str = "";

	for(var i = 0; i < 20; i++) {
		str = str + allowedChars[Math.floor(Math.random() * 51) + 0];
	}
	return str;
};

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

alldiff = function(a,b) {
	if(typeof a !== 'undefined' && typeof b !== 'undefined') {
		for (var i = 0; i < a.length; i++) {
			for (var j = 0; j < b.length; j++) {
				if(a[i] === b[j]) {
					return false;
				}
			}
		}
		return true;
	}

	return false;
}

domainOf = function(a) {
	return domains[a];
};

gacInitialize = function(opts) {
	options = opts;
	console.log('INITIALIZE');
	TDA = new Queue();
	notTDA = [];


	variables = _.isFunction(opts.start.variables) && opts.start.variables() || opts.start.variables;
	constraints = _.isFunction(opts.constraints) && opts.constraints() || opts.constraints;
	domains = opts.start.domains;


	// -- Initialization -------------------------------------------------------
	// data: createFunction(["a", "c"], "a == 2 * c")

	for(var i = 0; i < variables.length; i++) {
		var name = createVarName();
		variableNames[variables[i]] = name;
		variableNames[name] = variables[i];
	}
	//Add all variable & constraints pairs to queue
	for(var i = 0; i < variables.length; i++) {
		

		for(var j = 0; j < constraints.length; j++) {

			var expression = constraints[j].expression;

			var vars = [];
			for (var v in constraints[j]) {
				if(v !== 'expression') {
					vars.push(variableNames[constraints[j][v]]);
					expression = replaceAll(v, variableNames[constraints[j][v]], expression);
				}

			}
			// generate expression
			var func = createFunction(vars, expression);

			for (var v = 0; v < vars.length; v++) {
				var n = {
					variable: variables[v],
					constraint: {
						variables: vars,
						constraint: func
					}
				};
				TDA.enqueue(n);
			}
		}
	}
}

domainFiltering = function() {
	console.log('DOMAIN-FILTERING');
	var el;


	// -- Domain-filtering loop ------------------------------------------------
	while(!TDA.isEmpty()) {
		//console.log(domains);
		// pop a variable and constraint pair
		el = TDA.dequeue();

		// store to keep track of processed nodes.
		for (var o = 0; o < el.constraint.variables.length; o++) {
			if(!(notTDA[variableNames[el.constraint.variables[o]]] && notTDA[variableNames[el.constraint.variables[o]]].length)) {
				notTDA[variableNames[el.constraint.variables[o]]] = new Dict();
			}
			notTDA[variableNames[el.constraint.variables[o]]].set( generateHash(el),clone(el));
		}

		if(revise(el)) {
			//console.log('REVISED====')
			//console.log(domains)
			if(domains[el.variable].length == 0) {
				// it's no solution
				return false;
			}
			//console.log(notTDA[el.variable])
			if(notTDA[el.variable]) {
				var elems = notTDA[el.variable];

				elems.forEach(function (value, key) {
					if(el.constraint.expression !== value.constraint.expression) {
						TDA.enqueue(value);
					}
				});
				
			}
			// for(var i = 0; i < elems.length; i++) {
			// 	if(el.constraint.expression !== elems[i].constraint.expression) {
			// 		TDA.enqueue(elems[i]);
			// 	}
			// }

			// Push TODO-REVISE*(Xk,m,Ck) onto QUEUE for all Ck (k ̸= i) in which X* appears, and all Xk,m ̸= X*

			// for(var i = 0; i < variables.length; i++) {
		

			// 	for(var j = 0; j < constraints.length; j++) {

			// 		var expression = constraints[j].expression;

			// 		var isInConstraint = false;
					
			// 		var vars = [];
			// 		for (var v in constraints[j]) {
			// 			if(v !== 'expression') {
			// 				vars.push(variableNames[constraints[j][v]]);
			// 				expression = replaceAll(v, variableNames[constraints[j][v]], expression);
			// 			}
			// 			//console.log(el.variable)
			// 			if(variableNames[constraints[j][v]] === el.variable) {
			// 				isInConstraint = true;
			// 			}

			// 		}
			// 		if(!isInConstraint) {
			// 			continue;
			// 		}

			// 		// generate expression
			// 		var func = createFunction(vars, expression);

			// 		for (var v = 0; v < vars.length; v++) {
			// 			var n = {
			// 				variable: variables[v],
			// 				constraint: {
			// 					variables: vars,
			// 					constraint: func
			// 				}
			// 			};
			// 			TDA.enqueue(n);
			// 		}
			// 	}
			// }
		}
		//console.log(domains);
	}
	console.log({variables: variables, domains: domains})
	return {variables: variables, domains: domains};
};

revise = function(pair) {
	//console.log("REVISE")
	var revised = false;
	var domain = domains[pair.variable];
			var variableDomains = [];
	for(var j = 0; j < pair.constraint.variables.length; j++) {
		if(variableNames[pair.constraint.variables[j]] !== pair.variable) {
				//console.log(j)
				variableDomains[pair.constraint.variables[j]] = domains[variableNames[pair.constraint.variables[j]]];
			}
		}

	for(var i = 0; i < domain.length; i++) {
		var shouldKeep = false;
		for(var variableDomain in variableDomains) {
			//console.log(variableDomains[variableNames[1]])
			// if(variableDomains[variableNames[1]]) {

			for (var k = 0; k < variableDomains[variableDomain].length; k++) {
						
		// For every value in the focus variables domain





			//console.log(pair.constraint.variables)
			// get all values in the domains
			
	//console.log(variableDomains)
			// run through all possible combinations of variables and domain values
			

			var varValues = [];

			varValues.push(domain[i]);
			varValues.push(variableDomains[variableDomain][k]);
			if(pair.constraint.constraint.apply(this, varValues)) {
				shouldNotKeep = !true;
			}			
		}
			// } else {
			// 	return revised;
			// }
		}

			if(shouldNotKeep) {
				// console.log("TAKEAWAY");
				// console.log(domains)
				// console.log(pair.variable + ":" + i);
				// //console.log(i)
				// remove from domain
				domains[pair.variable].splice(domain[i], 1);
				// console.log(domains)
				revised = true;
			}

	}

	return revised;
};

// revise = function(pair) {
// 	var revised = false;
// 	var domain = domains[pair.variable];

// 	// For every value in the focus variables domain
// 	for(var i = 0; i < domain.length; i++) {

// 		var shouldKeep = false;

// 		var variableDomains = [];
// 		//console.log(pair.constraint.variables)
// 		// get all values in the domains
// 		for(var j = 0; j < pair.constraint.variables.length; j++) {
// 			if(variableNames[pair.constraint.variables[j]] !== pair.variable) {
// 				//console.log(j)
// 				variableDomains[pair.constraint.variables[j]] = domains[variableNames[pair.constraint.variables[j]]];
// 			}
// 		}
// //console.log(variableDomains)
// 		// run through all possible combinations of variables and domain values
		
// 		for(var variableDomain in variableDomains) {
// 			//console.log(variableDomains[variableNames[1]])
// 			// if(variableDomains[variableNames[1]]) {

// 				for (var k = 0; k < variableDomains[variableDomain].length; k++) {
// 					var varValues = [];
					
// 					varValues.push(domain[i]);
// 					varValues.push(variableDomains[variableDomain][k]);
// 					console.log('NEW==========')
// 					console.log(variableDomains)
// 					console.log(domains);
// 					console.log(pair.constraint.constraint.apply(this, varValues));
// 					//console.log(varValues);
// 					if(pair.constraint.constraint.apply(this, varValues)) {
// 						shouldKeep = true;
// 					}			
// 				}
// 			// } else {
// 			// 	return revised;
// 			// }
// 		}

// 		if(!shouldKeep) {
// 			console.log('REMOVED');

// 			// remove from domain
//     		domain.splice(i, 1);
//     		revised = true;
// 		}
// 	}

// 	return revised;
// };

rerun = function(node) {
	console.log('RERUN')
	console.log(node.content.domains)
	variables = node.content.variables;
	domains = node.content.domains;
	//Add all variable & constraints pairs to queue
	for(var i = 0; i < variables.length; i++) {
		

		for(var j = 0; j < constraints.length; j++) {

			var expression = constraints[j].expression;

			var vars = [];
			for (var v in constraints[j]) {
				if(v !== 'expression') {
					vars.push(variableNames[constraints[j][v]]);
					expression = replaceAll(v, variableNames[constraints[j][v]], expression);
				}

			}
			// generate expression
			var func = createFunction(vars, expression);

			for (var v = 0; v < vars.length; v++) {
				var n = {
					variable: variables[v],
					constraint: {
						variables: vars,
						constraint: func
					}
				};
				TDA.enqueue(n);
			}
		}
	}
	// Push TODO-REVISE*(Xk,m,Ck) onto QUEUE for all Ck in which X* appears, and all Xk,m ̸= X∗.

	return domainFiltering();
};


createFunction = function(variableNames, expression) {
	var params = variableNames[0];

	for(var i = 1; i < variableNames.length; i++) {
		params = params + ", " + variableNames[i];
	}

	var funcString = "return function " + "xxx" + "(" + params + "){ return " + expression + "; };";

	return new Function(funcString)();
}

generateHash = function(o) {
	return hash(o);
};