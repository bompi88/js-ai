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
var Utils = require('../common/helpers.js');

var TDA;
var notTDA;

var domains;

var variables;
var constraints;

var options;

var variableNames = {};

// -- Used variables -------------------------------------------------------
	
var allowedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

module.exports.gacInitialize = function(opts) {
	console.log('================================ INITIALIZE ================================');
	
	options = opts;
	TDA = new Queue();
	notTDA = [];

	variables = _.isFunction(opts.start.variables) && opts.start.variables() || opts.start.variables;
	constraints = _.isFunction(opts.constraints) && opts.constraints() || opts.constraints;
	domains = opts.start.domains;


	// -- Initialization -------------------------------------------------------

	// Generate variable names and map them to argument list
	for(var i = 0; i < variables.length; i++) {
		var name = createVarName();
		variableNames[variables[i]] = name;
		variableNames[name] = variables[i];
	}
	
	//Generate and add all variable & constraints pairs to queue
	for(var k = 0; k < constraints.length; k++) {

		var expression = constraints[k].expression;

		var vars = [];
		
		// get generated variable names and replace constraint with these,
		// so that the dynamic functions will work properly
		for (var l in constraints[k]) {
			if(l !== 'expression') {		
				vars.push(variableNames[constraints[k][l]]);
				expression = replaceAll(l, variableNames[constraints[k][l]], expression);
			}
		}

		// create the constraint function
		var func = createFunction(vars, expression);

		// create each variable and constraint pair
		for (var l in constraints[k]) {
			if(l !== 'expression') {
				var n = {
					variable: variableNames[variableNames[constraints[k][l]]],
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

module.exports.domainFiltering = function() {
	console.log('================================ DOMAIN-FILTERING ================================');
	var el;


	// -- Domain-filtering loop ------------------------------------------------
	while(!TDA.isEmpty()) {

		// pop a variable and constraint pair
		el = TDA.dequeue();

		// store to keep track of processed nodes.
		for (var o = 0; o < el.constraint.variables.length; o++) {
			if(!(notTDA[variableNames[el.constraint.variables[o]]] && notTDA[variableNames[el.constraint.variables[o]]].length)) {
				notTDA[variableNames[el.constraint.variables[o]]] = new Dict();
			}
			notTDA[variableNames[el.constraint.variables[o]]].set(generateHash(el), Utils.clone(el));
		}

		if(revise(el)) {
			if(domains[el.variable].length == 0) {
				// it's no solution
				return false;
			}

			if(notTDA[el.variable]) {
				var elems = notTDA[el.variable];

				elems.forEach(function (value, key) {
					if(el.constraint.expression !== value.constraint.expression) {
						TDA.enqueue(value);
					}
				});	
			}
		}
	}
	//console.log(constraints)
	console.log('================================ END DOMAIN-FILTERING ================================');
	return {variables: variables, domains: domains, constraints: constraints};
};

var revise = function(pair) {
	//console.log('================================ REVISE ================================');

	var revised = false;
	var domain = domains[pair.variable];
	var variableDomains = [];
	
	// get all other variable domains
	for(var j = 0; j < pair.constraint.variables.length; j++) {
		if(variableNames[pair.constraint.variables[j]] !== pair.variable) {
				variableDomains[pair.constraint.variables[j]] = domains[variableNames[pair.constraint.variables[j]]];
			}
		}

	// Test if 
	for(var i = 0; i < domain.length; i++) {
		var retain = true;
		for(var variableDomain in variableDomains) {
			for (var k = 0; k < variableDomains[variableDomain].length; k++) {
						
				// For every value in the focus variables domain
				var varValues = [];

				varValues.push(domain[i]);
				varValues.push(variableDomains[variableDomain][k]);
				if(!pair.constraint.constraint.apply(this, varValues)) {
					retain = false;
				}			
			}
		}

		if(!retain) {
			//console.log(domains)
			// remove from domain
			domains[pair.variable].splice(domain[i], 1);

			revised = true;
		}
	}
	
	//console.log('================================ END REVISE ================================');
	return revised;
};

module.exports.rerun = function(node) {
	console.log('================================ !!! RERUN !!! ================================');

	variables = node.content.variables;
	domains = node.content.domains;
	//console.log(constraints)
	var variable = node.content.lastVar;
	//Add all variable & constraints pairs to queue
	// for (var i = 0; i < variables.length; i++) {
	// 	var variable = variables[i];
		if(notTDA[variable]) {
			var elems = notTDA[variable];

			elems.forEach(function (value, key) {
				TDA.enqueue(value);
			});
		}
	// }

	return this.domainFiltering();
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