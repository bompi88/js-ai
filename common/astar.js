// =============================================================================
// astar.js
// -----------------------------------------------------------------------------
//  Astar module. 
//
// =============================================================================

// -- Modules ------------------------------------------------------------------


var Heap = require('heap');
var Queue = require('adt-queue');
var Stack = require('stack-adt');
var Set = require('Set');
var Dict = require('dict');
var sleep = require('sleep');
var _ = require('underscore');

// -- Local modules ------------------------------------------------------------

var Utils = require('../common/helpers.js');
var GAC = require('../common/gac.js');

// -- Used variables -----------------------------------------------------------

var options;
var nodeMap;

var expanded = {
	astar: 0,
	dfs: 0,
	bfs: 0
};

var open, closed, successorList;

var h, d, n, isEnd, hashFunction, startNode, bestNode;

var startTime;
var kids;

/**
 * Implementation of the Astar algorithm. Must be run as a child process.
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
 * 	{
 * 		msg: 'callback', 						// Return type
 *		cb: {									// Callback data
 *			error: true,						// Error present?
 *			msg: "No solution found",			// Message
 *			type: options.type,					// type of search done, astar, dfs or bfs
 *			data: {								// Result data
 *				path: generatePath(bestNode),	// Path from start to goal
 *				cost: bestNode.f,				// The cost to get to goal
 *				time: new Date() - startTime,	// Time it took to find a path
 *				expanded: expanded.astar 		// Total amount of nodes expanded
 *			}
 *		}
 *	}
 * -----------------------------------------------------------------------------
 */
module.exports.run = function(opts, cb) {

	// Set the options
	options = opts;

	// -- Validate options -----------------------------------------------------

	validateOptions(options);

	console.log("================================ STARTING ASTAR ================================");

	// -- Set initial values ---------------------------------------------------
	kids = {};

	// copies over the needed functions from the options object
	h = options.h, d = options.d, n = options.n, isEnd = options.isEnd, gac = options.gac, hashFunction = options.hashFunction;

	// initialize the open list based on search type
	if(options.type === 'dfs') {
		open = new Stack();
	} else if(options.type === 'bfs') {
		open = new Queue();
	} else {
		open = new Heap(heapEvaluator);
	}

	// initialize closed and successor list
	closed = new Set();
	successorList = Dict();

	// creates a start node to start with
	startNode = {
		content: options.startNode,
		h: h(options.startNode),
		g: 0
	};

	// Set startnode as the best node, because it's the only node
	bestNode = startNode;

	// initially set the estimate distance
	startNode.f = startNode.g + startNode.h;

	// pushes the start node onto the agenda
	push(startNode);

	successorList.set(hashFunction(startNode.content), startNode);

	// Start the "stopwatch"
	startTime = new Date();
	
	// -- Do the loop ----------------------------------------------------------

	// As long as it has nodes in the open list, process the list
	while(!isEmpty()) {
		
		// If delay specified, wait some
		if(options.delay) {
			sleep.usleep(options.delay);
		}

		// pop a node from the top of the heap
		var currentNode = pop();
		successorList.delete(hashFunction(currentNode.content));
		
		// Tell main process that we are visiting a node
		process.send({
			msg: 'visiting',
			node: currentNode
		});
		
		// push the processing node to the closed list
		closed.add(hashFunction(currentNode.content));
		
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
			for(var i = 0, successorData = null; successorData = successors[i]; i++) {

				if(closed.contains(hashFunction(successorData))) {
					continue;
				}

				// Tell about the expanding of node
				process.send({
					msg: 'expanding',
					node: successorData
				});

				console.log("================================ EXPANDING ================================");

				
				var successor = successorList.get(hashFunction(successorData));
				var update = false;

				if(typeof successor === "undefined") {
					successor = {
						content: successorData
					};

					successorList.set(hashFunction(successor.content), successor);
					
				} else {

					if (successor.g < currentNode.g + d(currentNode.content, successorData)) {
						// There is allready a node which is better
						continue;
					}

					update = true;
				}

				// if(!kids[hashFunction(currentNode.content)]) {
				// 	kids[hashFunction(currentNode.content)] = [];
				// }

				// kids[hashFunction(currentNode.content)].push(successor);

				successor.g = currentNode.g + d(currentNode.content, successorData);
				successor.h = h(successorData);
				successor.f = successor.g + successor.h;
				
				if(successor.h < bestNode.h) {
					bestNode = successor;
				}
				
				successor.parent = currentNode;

				if(update) {
					// if(closed.contains(hashFunction(successor.content))) {
					//  	propagatePathimprovements(successor);
					// }

					open.heapify && open.heapify();
				} else {

					if(gac) {
						var gacNode = GAC.rerun(successor);

						if(gacNode) {
							successor.content = gacNode;
							if(gotSolution(successor.content)) {
								process.send({
									msg: 'callback',
									cb: {
										error: false,
										type: options.type,
										data: {
											path: generatePath(successor),
											cost: successor.f,
											time: new Date() - startTime,
											expanded: expanded.astar
										}
									}
								});

								// Changes the cell to be visited
								process.send({
									msg: 'bailing',
									node: successor
								});

								return;
							}
							//successor.content.constraints = gacNode.constraints;
							successor.g = currentNode.g + d(currentNode.content, successor.content);
							successor.h = h(successor.content);
							successor.f = successor.g + successor.h;
							push(successor);
							open.heapify && open.heapify();
						}
					} else {
						push(successor);

					}	
				}
				// Tell about the expanding of node
				process.send({
					msg: 'expanded',
					node: successor.content
				});
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

	// If no solution found, return the best path
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

var propagatePathimprovements = function(node) {
	if (!node) {
		return;
	}

	var k = kids[hashFunction(node.content)];

	if(k && k.length) {
		for(var i = 0; i < k.length; i++) {
			if(node.g + d(node.content, k[i].content) < k[i].g) {
				k[i].parent = node;
				k[i].g = node.g + d(node.content, k[i].content);
				k[i].f = k[i].g + h(k[i].content);
				propagatePathimprovements(k[i]);
			}
		}
	}
};

/**
 * Pushes nodes onto the agenda
 */
var push = function(node) {
	if(options.type === 'bfs') {
		open.enqueue(node);
	} else {
		open.push(node);
	}
};

/**
 * Checks whether the agenda is empty
 */
var isEmpty = function() {
	if(options.type === 'bfs' || options.type === 'dfs') {
		return open.isEmpty();
	} else {
		return open.empty();
	}
};

/**
 * Pops an element off the agenda
 */
var pop = function() {
	if(options.type === 'bfs') {
		return open.dequeue();
	} else {
		return open.pop();
	}
};

/**
 * Defines how the heap arrange the nodes
 */
var heapEvaluator = function(x, y) {
	return x.f - y.f;
};

/**
 * Recursively generates the path from leaf to root
 */
var generatePath = function(node) {
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
}

/**
 * Validates the options passed into Astar run method
 */
var validateOptions = function(opts) {
	
	// Check if start node exists
	if(!(opts.startNode)) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "Start node is not defined."
			}
		});
		return;
	}

	// Check if end function exists
	if(!opts.isEnd) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "It's no functions isEnd which validates if the current state is an acceptable solution. Form: function(node){}"
			}
		});
		return;
	} else {
		if(!_.isFunction(opts.isEnd)) {
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

	// Check whether a heuristic function exists
	if(!opts.h) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "The heuristics function is not present in the options. Form: function(node){}" 
			}
		});
		return;
	} else {
		if(!_.isFunction(opts.h)) {
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

	// Check if there is a distance function
	if(!opts.d) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "The distance calculating function is not present in the options. Form: function(a, b){}"
			}
		});
		return;
	} else {
		if(!_.isFunction(opts.d)) {
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

	// Check if there exists a neighbor function specified
	if(!opts.n) {
		process.send({
			msg: 'callback',
			cb: {
				error: true,
				msg: "The neighbor function is not present in the options. Form: function(node){}"
			}
		});
		return;
	} else {
		if(!_.isFunction(opts.n)) {
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
};