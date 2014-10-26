var Utils = require('../common/helpers.js');
var Astar = require('../common/astar.js');
var GAC = require('../common/gac.js');

/**
 * Neighbor function for map coloring problem
 */
var neighborColor = function(node) {
	//console.log('================================ GENERATE NEIGHBORS ================================');

	var neighbors = [];
	
	// create a new node by looping over all variables and pick a value from the domain,
	// Then exclude the value from the neigbors domains
	for (var i = 0; i < node.variables.length; i++) {
		var vert = node.variables[i];
		
		for (var j = 0; j < node.domains[vert].length; j++) {

			if(node.domains[vert].length <= 1) {
				break;
			}

			var val = node.domains[vert][j];
			var newNode = Utils.clone(node);

			newNode.lastVar = vert;
			// Choose a value for the domain
			newNode.domains[vert] = Utils.clone([val]);
			
			var connectedNodes = nodeMap[vert];

			var valid = true;

			// Remove the value chosen from neighbor vertices domains.
			for (var k = 0; k < connectedNodes.length; k++) {
				var index = newNode.domains[connectedNodes[k]].indexOf(val);
				if (index > -1) {
					if(newNode.domains[connectedNodes[k]].length > 1) {
						newNode.domains[connectedNodes[k]].splice(index, 1);
					} else {
						valid = false;
					
						break;
					}
				}
			}

			if(!checkConsistency(newNode)) {

				valid = false;
			}

			if(valid) {
				
				neighbors.push(newNode);
			}
		}
	}

	//console.log('================================ END GENERATE NEIGHBORS ================================');
	return neighbors;
};

checkConsistency = function(node) {
	for(var i = 0; i < node.constraints.length; i++) {
		if (node.domains[node.constraints[i]["from"]].length === 1 && node.domains[node.constraints[i]["to"]].length === 1) {
			if(node.domains[node.constraints[i]["from"]][0] === node.domains[node.constraints[i]["to"]][0]) {
				return false;
			}
		}
	}
	return true;
}

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
					var varCount = 0;

					// 
					for (var i = 0; i < node.variables.length; i++) {
						var vert = node.variables[i];
						varCount = varCount + node.domains[vert].length;
					}

					//
					if (varCount === node.variables.length) {
						//console.log(varCount)
						return checkConsistency(node);
					}
					return false;
				},
				// Less domain variables => closer to goal
				// Stupid but it solves the puzzles faster.
				h: function(node) {
					var varCount = 0;

					for (var i = 0; i < node.variables.length; i++) {
						var vert = node.variables[i];
						varCount = varCount + node.domains[vert].length - 1;
					}

					return varCount;
				},
				d: function(node) {
					// var varCount = 0;

					// for (var i = 0; i < node.variables.length; i++) {
					// 	var vert = node.variables[i];
					// 	varCount = varCount + Math.log(node.domains[vert].length - 1);
					// }

					return -1; //varCount;
				},
				n: neighborColor
			});
		}
	}
});