// =============================================================================
// 
//
//
//
//

var hash = require('object-hash');
var Heap = require('heap');
var Queue = require('adt-queue');
var Stack = require('stack-adt');
var Set = require('Set');
var Dict = require('dict');
var sleep = require('sleep');

var _ = require('underscore');

// Quick and dirty
// TODO: export as node module
var fs = require('fs');

// file is included here:
eval(fs.readFileSync('astar-gac/astar-gac.js')+'');

var options;
var type;
var nodeMap;

var expanded = {
	astar: 0,
	dfs: 0,
	bfs: 0
};

/**
 * Implementation of the Astar algorithm.
 *
 * =============================================================================
 * Params:
 * -----------------------------------------------------------------------------
 * @options.startNode - the data for the start node
 * @options.isEnd - a function which decides if the node is a goal or not
 * @options.h - the heuristics function to estimate distance to the goal
 * @options.d - a distance function to calculate the actual distance to a node
 * @options.n - a function which generates successors nodes
 * -----------------------------------------------------------------------------
 * Return value:
 * -----------------------------------------------------------------------------
 * {
 *		error: null, // or "No path found"
 *		path: [] // list of nodes from start to goal
 *		cost: X // The cost of the path from start to end
 * }
 * -----------------------------------------------------------------------------
 */
bestFirstSearch = function(options, cb) {

	// -- Used variables -------------------------------------------------------

	var open, closed, successorList;

	var h, d, n, isEnd, startNode, bestNode;
	
	var startTime;

	// -- Validate options -----------------------------------------------------

	// Check if start node exists
	if(!(options.startNode)) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "Start node is not defined."
			}
		});
		return;
	}

	if(!options.isEnd) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "It's no functions isEnd which validates if the current state is an acceptable solution. Form: function(node){}"
			}
		});
		return;
	} else {
		if(!_.isFunction(options.isEnd)) {
			process.send({
				msg: 'callback',
				cb: {
					error: true,
					msg: "options.isEnd is not a function at its accepted form: function(node){}"
				}
			});
			return;
		}
	}

	if(!options.h) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "The heuristics function is not present in the options. Form: function(node){}" 
			}
		});
		return;
	} else {
		if(!_.isFunction(options.h)) {
			process.send({
				msg: 'callback',
				cb: {
					error: true,
					msg: "options.h is not a function at its accepted form: function(node){}"
				}
			});
			return;
		}
	}

	if(!options.d) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "The distance calculating function is not present in the options. Form: function(a, b){}"
			}
		});
		return;
	} else {
		if(!_.isFunction(options.d)) {
			process.send({
				msg: 'callback',
				cb: {
					error: true,
					msg: "options.d is not a function at its accepted form: function(a, b){}"
				}
			});
			return;
		}
	}

	if(!options.n) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "The neighbor function is not present in the options. Form: function(node){}"
			}
		});
		return;
	} else {
		if(!_.isFunction(options.n)) {
			process.send({
				msg: 'callback',
				cb: {
					error: true,
					msg: "options.n is not a function at its accepted form: function(node){}"
				}
			});
			return;
		}
	}

	// -- Set initial values ---------------------------------------------------

	// copies over the needed functions from the options object
	h = options.h, d = options.d, n = options.n, isEnd = options.isEnd;
	gac = options.gac;
	options.type = type;

	if(options.type === 'dfs') {
		open = new Stack();
	} else if(options.type === 'bfs') {
		open = new Queue();
	} else {
		open = new Heap(heapEvaluator);
	}

	closed = new Set();
	successorList = Dict();

	// creates a start node
	startNode = {
		content: options.startNode,
		h: h(options.startNode),
		g: 0
	};

	// Set startnode as the best node 
	bestNode = startNode;

	// initially sets the estimate distance
	startNode.f = startNode.g + startNode.h;

	// Pushes nodes onto the agenda
	function push(node) {
		if(options.type === 'bfs') {
			open.enqueue(node);
		} else {
			open.push(node);
		}
	};

	// Checks whether the agenda is empty
	function isEmpty() {
		if(options.type === 'bfs' || options.type === 'dfs') {
			return open.isEmpty();
		} else {
			return open.empty();
		}
	};

	// Pops an element off the agenda
	function pop() {
		if(options.type === 'bfs') {
			return open.dequeue();
		} else {
			return open.pop();
		}
	};

	// pushes the start node onto the agenda
	push(startNode);

	successorList.set(generateHash(startNode.content), startNode);

	// -- Do the loop ----------------------------------------------------------
	startTime = new Date();

	// As long as it has nodes in the open list, process the list
	while(!isEmpty()) {
		
		if(options.delay) {
			sleep.usleep(options.delay);
		}

		// pop a node from the top of the heap
		var currentNode = pop();
		successorList.delete(generateHash(currentNode.content));
		// Mark 2d cell as the processing node - program specific code
		
		process.send({
			msg: 'visiting',
			node: currentNode
		});
		
		// push the processing node to the closed list
		closed.add(generateHash(currentNode.content));
		
		//GAC
		if(gac) {

			var gacNode = rerun(currentNode);
			currentNode.content.domains = gacNode.domains;
			var parentG = currentNode.parent && currentNode.parent.g || 0;
			var parentContent = currentNode.parent && currentNode.parent.content || currentNode;
			
			currentNode.g = parentG + d(parentContent, currentNode.content);
			currentNode.h = h(currentNode.content);
			currentNode.f = currentNode.g + currentNode.h;
			// console.log(gacNode)
			// console.log(currentNode.content)
		}


		// is the current node an acceptable goal?
		if(isEnd(currentNode.content)) {
			console.log(currentNode.content)
			process.send({
				msg: 'callback',
				cb: {
					error: false,
					type: options.type,
					data: {
						path: generatePath(currentNode),
						cost: currentNode.f,
						time: new Date() - startTime,
						expanded: expanded.astar
					}
				}
			});

			// Changes the cell to be visited
			process.send({
				msg: 'bailing',
				node: currentNode
			});

			return;
		}

		// Current node is not a goal and children nodes must be expanded
		var successors = n(currentNode.content);

		if (successors) {		
			// For all successors 
			for(var i = 0, successorData; successorData = successors[i]; i++) {

				if(closed.contains(generateHash(successorData))) {
					continue;
				}

				// Tell about the expanding of node
				process.send({
					msg: 'expanding',
					node: successorData
				});
				
				var successor = successorList.get(generateHash(successorData));
				var update = false;

				if(typeof successor === "undefined") {
					successor = {
						content: successorData
					};

					successorList.set(generateHash(successor.content), successor);
					
				} else {

					if (successor.g < currentNode.g + d(currentNode.content, successorData)) {
						continue;
					}

					update = true;
				}

				successor.g = currentNode.g + d(currentNode.content, successorData);
				successor.h = h(successorData);
				successor.f = successor.g + successor.h;
				
				if(successor.h < bestNode.h) {
					bestNode = successor;
				}
				
				successor.parent = currentNode;

				if(update) {
					open.heapify && open.heapify();
				} else {
					push(successor);
				}
			}
		}

		expanded.astar++;

		// Changes the cell to be visited
		process.send({
			msg: 'visited',
			node: currentNode,
			data: {
				expanded: expanded.astar
			}
		});
	}

	process.send({
		msg: 'callback',
		cb: {
			error: true,
			msg: "No solution found",
			type: options.type,
			data: {
				path: generatePath(bestNode),
				cost: bestNode.f,
				time: new Date() - startTime,
				expanded: expanded.astar
			}
		}
	});

	return;
};

/**
 * Recursively generates the path from leaf to root
 */
generatePath = function(node) {
	process.send({
		msg: 'path',
		node: node
	});

	if (node.parent !== undefined) {
		var pathSoFar = generatePath(node.parent);
		pathSoFar.push(node.content);

		return pathSoFar;
	} else {
		return [node.content];
	}
};

/**
 * Validates the options passed
 */
validateOptions = function(options, cb) {

	if(!(options.start && options.end)) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "Start point or end point is not defined.",
			}
		});
		return;
	}
};

/**
 * Hash function for dictionary
 */
generateHash = function(o) {
	return options.type === 'astar-gac' ? hash(o) : o.toString();
};

/**
 * Defines how the heap arrange the nodes
 */
heapEvaluator = function(x, y) {
	return x.f - y.f;
};

/**
 * Returns the Euclidean distance from node A to node B
 */
var euclideanDist = function(a, b) {
	if (a.length && b.length) {

		var dx = b[0] - a[0];
		var dy = b[1] - a[1];

		return Math.sqrt((dx * dx) + (dy * dy));
	}

	return 0;
};

/**
 * Returns the Manhattan distance from node A to node B
 */
var manhattanDist = function(a, b) {
	if (a.length && b.length) {

		var dx = Math.abs(b[0] - a[0]);
		var dy = Math.abs(b[1] - a[1]);

		return dx + dy;
	}

	return 0;
};

/**
 * Returns the neighbors to a given node
 */
var neighborsFunc = function(node) {
  var x = node[0];
  var y = node[1];
	
	if(options.diagonal) {
		// Diagonal movement
		return [
			[x - 1, y + 1],
			[x + 0, y - 1],
			[x - 1, y - 1],
			[x - 1, y + 0],

			[x + 1, y + 0],
			[x + 1, y + 1],
			[x + 0, y + 1],
			[x + 1, y - 1],
		];
	} else {
		// Strict movement 
		return [
			[x - 1, y + 0],
			[x + 0, y - 1],

			[x + 0, y + 1],
			[x + 1, y + 0],
		];
	}
};

var neighborColor = function(node) {
	var neighbors = [];
	
	// create a new node by looping over all variables and pick a value from the domain,
	// Then exclude the value from the neigbors domains
	for (var i = 0; i < node.variables.length; i++) {
		var vert = node.variables[i];
		
		for (var j = 0; j < node.domains[vert].length; j++) {

			var val = node.domains[vert][j];
			var newNode = clone(node);
			newNode.domains[vert] = clone([val]);
			
			var connectedNodes = nodeMap[vert];

			var valid = true;
			// Remove val from neighbor vertices domains.
			for (var k = 0, n = connectedNodes[k]; k < connectedNodes.length; k++) {
				var index = newNode.domains[connectedNodes[k]].indexOf(val);
				if (index > -1) {
				    newNode.domains[connectedNodes[k]].splice(index, 1);
				}

				if(newNode.domains[connectedNodes[k]].length < 1) {
					valid = false;
				}
			}
			if(valid) {
				neighbors.push(newNode);
			}
		}
	}
	return neighbors;
};

clone = function(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

/**
 * Handles messages from GUI process
 */
process.on('message', function(m) {
	if(m.msg === 'start' && m.options) {
		type = m.options.type;
		options = m.options;

		// A modified neighbor function
		function neighborsMap(n) {
			return neighborsFunc(n).filter(function(node) {
				var obstacles = m.options.obstacles;

				// Filter out the outside of the grid and the obstacles
				if(node[0] >= 0  && node[1] >= 0 && node[0] < m.options.size[0]  && node[1] < m.options.size[1]) {
					if(node[1] < obstacles.length && node[0] < obstacles[0].length) {
						return m.options.obstacles[node[0]][node[1]] !== 1;
					} else {
						return true;
					}
				} else {
					return false;
				}
			});
	    }

	    // If Astar was requested include heuristics
	    if(options.type === 'astar') {
	    	bestFirstSearch({
				delay: m.options.delay,
				startNode: options.start,
				isEnd: function(node) {
					return node[0] === options.end[0] && node[1] === options.end[1];
				},
				h: function(node) {
					return options.diagonal ? euclideanDist(node, options.end) : manhattanDist(node, options.end);
				},
				d: options.diagonal ? euclideanDist : manhattanDist,
				n: m.options.map ? neighborsMap : neighborsFunc
			});

		// Else do a heuristics function that always returns 1
	    } else if(options.type === 'astar-gac') {
	    	nodeMap = options.nodeMap;

	    	gacInitialize(options);

	    	// var s0 = domainFiltering();

	    	// if(!gotSolution(s0)) {
		    	bestFirstSearch({
		    		gac: true,
					delay: options.delay,
					startNode: options.start,
					isEnd: function(node) {
						//console.log(node.domains)
						var varCount = 0;

						// 
						for (var i = 0; i < node.variables.length; i++) {
							var vert = node.variables[i];
							varCount = varCount + node.domains[vert].length;
						}

						//
						if (varCount == node.variables.length) {
							for (var s = 0; s < node.variables.length; s++) {
								var edges = nodeMap[node.variables[s]];

								for (var t = 0; t < edges.length; t++) {
									if(node.domains[node.variables[s]][0] === node.domains[edges[t]][0]) {
										return false;
									}
								}
							}
							return true;
						}
					},
					// Less domain variables => closer to goal
					// Stupid but it solves the puzzles faster.
					h: function(node) {
						var varCount = 0;

						for (var i = 0; i < node.variables.length; i++) {
							var vert = node.variables[i];
							varCount = varCount + node.domains[vert].length;
						}

						return varCount;
					},
					d: function(a, b) {
						return true;
					},
					n: neighborColor
				});
	    	// }
	    } else {
	    	bestFirstSearch({
				delay: m.options.delay,
				startNode: options.start,
				isEnd: function(node) {
					return node[0] === options.end[0] && node[1] === options.end[1];
				},
				h: function(node) {
					return 1;
				},
				d: function() { return 1; },
				n: m.options.map ? neighborsMap : neighborsFunc
			});
	    }
	}
});

gotSolution = function(node) {
	if(node === false) {
		return false;
	}

	for(var i = 0; i < node.variables.length; i++) {
		if(node.domains[node.variables[i]].length > 1) {
			return false;
		}
	}
}