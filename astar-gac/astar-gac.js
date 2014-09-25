// =============================================================================
// 
// Astar-GAC implementation
//
//
//

/**
 *
 */
astarGAC = function(options, cb) {

	// -- Used variables -------------------------------------------------------

	var queue = options.init(options.data);

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

	// -- Domain-filtering loop ------------------------------------------------

	while(!queue.isEmpty()) {
		var el = queue.dequeue();

		console.log(el);
	}

	// -- Rerun ----------------------------------------------------------------


	// -- Termination ----------------------------------------------------------

	//var res = createFunction(["a", "c"], "a == 2 * c");


	cb(true, {
		error: "No solution found."
	});

	return;
};


createFunction = function(variableNames, expression) {
	var params = variableNames[0];

	for(var i = 1; i < variableNames.length; i++) {
		params = params + ", " + variableNames[i];
	}

	var funcString = "return function " + "xxx" + "(" + params + "){ return " + expression + "; };";

	return new Function(funcString)();
}