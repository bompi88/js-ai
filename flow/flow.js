var Utils = require('../common/helpers.js');
var Astar = require('../common/astar.js');
var GAC = require('../common/gac.js');

/**
 * Neighbor function for flow problem
 */
var neighbors = function(node) {
	var neighbors = [];

	return neighbors;
};

/**
 * Checks whether the node given, is a solution or not.
 */
gotSolution = function(node) {
	if(node === false) {
		return false;
	}

	// If there is a domain which is not the size of one, return that this is not a viable solution
	for(var i = 0; i < node.variables.length; i++) {
		if(node.domains[node.variables[i]].length > 1 || node.domains[node.variables[i]].length == 0) {
			return false;
		}
	}
}

/**
 * Takes care of messages triggered from the GUI process.
 */
process.on('message', function(m) {
	var options = m.options;

	if(m.msg === 'start' && m.options) {
    	nodeMap = options.nodeMap;
    	options.delay = 0;
    	// -- Initialize the GAC -----------------------------------------------
    	GAC.gacInitialize(Utils.clone(options));

    	// -- Do one iteration of domainfiltering ------------------------------
    	var s0 = GAC.domainFiltering();

    	// If no solution found, we have to guess.
    	// Use Astar for this.
    	if(!gotSolution(s0)) {
	    	Astar.run({
	    		gac: true, // Use GAC on each successor
				delay: options.delay,
				startNode: options.start,
				hashFunction: Utils.generateHash,
				isEnd: function(node) {
					return gotSolution(node);
				},
				// Less domain variables => closer to goal
				h: function(node) {
					var varCount = 0;

					for (var i = 0; i < node.variables.length; i++) {
						var vert = node.variables[i];
						varCount = varCount + node.domains[vert].length - 1;
					}

					return varCount;
				},
				d: function(node) {
					return -1;
				},
				n: neighbors
			});
		}
	}
});