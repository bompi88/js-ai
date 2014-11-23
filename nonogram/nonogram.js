var Utils = require('../common/helpers.js');
var Astar = require('../common/astar.js');
var GAC = require('../common/gac.js');

/**
 * Neighbor function for flow problem
 */
var neighbors = function(node) {
	var neighbors = [];
	var neighborSuccess = 0;

	// A modified neighbor function
	function neighborsMap(n) {
		return neighborsFunc(n).filter(function(node) {
			var obstacles = m.options.obstacles;

			// Filter out the outside of the grid and the obstacles
			if(node[0] >= 0  && node[1] >= 0 && node[0] < m.options.size[0]  && node[1] < m.options.size[1]) {
				if(node[1] < obstacles.length && node[0] < obstacles[0].length) {
					return m.options.obstacles[node[0]][node[1]] == null;
				} else {
					return true;
				}
			} else {
				return false;
			}
		});
    }

	for (var i = 0; i < node.variables.length; i++) {
		var st = {
			start: [node.variables[i].from[0], node.variables[i].from[1]],
			end: [node.variables[i].to[0], node.variables[i].to[1]]
		};

		var retVal = Astar.run({
			delay: 0,
			startNode: st,
			hashFunction: Utils.generateHashToString,
			isEnd: function(node) {
				return node[0] === st.end[0] && node[1] === st.end[1];
			},
			h: function(node) {
				return Utils.manhattanDist(node, st.end);
			},
			d: Utils.manhattanDist,
			n: neighborsMap
		});

		if(!retVal.cb.error) {
			var newNode = {
				retVal
			}

			neighborSuccess = neighborSuccess + 1;
		}
	}

	return neighbors;
};

var neighborsFunc = function(node) {
  	var x = node[0];
  	var y = node[1];
	// Strict movement 
	return [
		[x - 1, y + 0],
		[x + 0, y - 1],

		[x + 0, y + 1],
		[x + 1, y + 0]
	];
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
	    		gac: false, // Use GAC on each successor
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