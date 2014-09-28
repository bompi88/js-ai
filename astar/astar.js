// =============================================================================
// 
//
//
//
//

var Heap = require('heap');
var Set = require('Set');
var Dict = require('dict');
var sleep = require('sleep');

var _ = require('underscore');

var options;

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

	// creates open and closed "lists"
	open = new Heap(heapEvaluator);
	closed = new Set();
	successorList = Dict();

	// creates a start node
	startNode = {
		content: options.startNode,
		h: h(options.startNode),
		g: 0
	};

	bestNode = startNode;
	// initially sets the estimate distance
	startNode.f = startNode.g + startNode.h;

	// pushes the start node onto the heap
	open.push(startNode);
	successorList.set(generateHash(startNode.content), startNode);

	// -- Do the loop ----------------------------------------------------------
	startTime = new Date();

	// As long as it has nodes in the open list, process the list
	while(open.size()) {
		
		if(options.delay) {
			sleep.usleep(options.delay);
		}

		// pop a node from the top of the heap
		var currentNode = open.pop();
		successorList.delete(generateHash(currentNode.content));
		// Mark 2d cell as the processing node - program specific code
		
		process.send({
			msg: 'visiting',
			node: currentNode
		});
		
		// push the processing node to the closed list
		closed.add(generateHash(currentNode.content));

		// is the current node an acceptable goal?
		if(isEnd(currentNode.content)) {
			process.send({
				msg: 'callback',
				cb: {
					error: false,
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
				expanded.astar++;
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

					//attachAndEval(successor, currentNode, d, h);
					successorList.set(generateHash(successor.content), successor);
					
				} else {

					if (successor.g < currentNode.g + d(currentNode.content, successorData)) {
						continue;
					}
					 //attachAndEval(successor, currentNode, d, h);

					// if(closed.contains(generateHash(successorData))) {

					// }

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
					open.heapify();
				} else {
					open.push(successor);
				}
			}
		}

		// Changes the cell to be visited
		process.send({
			msg: 'visited',
			node: currentNode
		});
	}

	process.send({
		msg: 'callback',
		cb: {
			error: true,
			msg: "No solution found",
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

attachAndEval = function(successor, parent, d, h) {
	successor.g = parent.g + d(parent, successor);
	successor.f = successor.g + h(successor);
};

propagatePathImprovements = function(node) {

};

generatePath = function(node) {
if (node.parent !== undefined) {
    var pathSoFar = generatePath(node.parent);
    pathSoFar.push(node.content);
    process.send({
		msg: 'path',
		node: node
	});
    return pathSoFar;
  } else {
  	process.send({
		msg: 'path',
		node: node
	});
    // this is the starting node
    return [node.content];
  }
};

dephtFirstSearch = function(options, cb) {

};

breadthFirstSearch = function(options, cb) {

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

generateHash = function(o) {
	return o.toString();
};

/**
 * Defines how the heap arrange the nodes
 */
heapEvaluator = function(x, y) {
	return x.f - y.f;
};

var euclideanDist = function(a, b) {
	if (a.length && b.length) {

		var dx = b[0] - a[0];
		var dy = b[1] - a[1];

		return Math.sqrt(dx * dx + dy * dy);
	}

	//return 0;
};

var manhattanDist = function(a, b) {
	if (a.length && b.length) {

		var dx = Math.abs(b[0] - a[0]);
		var dy = Math.abs(b[1] - a[1]);

		return dx + dy;
	}

	return 0;
};

var neighbors = function(xy) {
  var x = xy[0], y = xy[1];

  if(options.diagonal) {
	  return [
	    [x - 1, y - 1],
	    [x - 1, y + 0],
	    [x - 1, y + 1],
	    [x + 0, y - 1],

	    [x + 0, y + 1],
	    [x + 1, y - 1],
	    [x + 1, y + 0],
	    [x + 1, y + 1],
	  ];
  } else {
  	return [
	    [x - 1, y + 0],
	    [x + 0, y - 1],

	    [x + 0, y + 1],
	    [x + 1, y + 0],
	];
  }
};

process.on('message', function(m) {
	if(m.msg === 'start' && m.options) {
		options = m.options;

		function neighborsMap(xy) {
			return neighbors(xy).filter(function(xy) {
				var obstacles = m.options.obstacles;

				if(xy[0] >= 0 && xy[0] < obstacles[0].length && xy[1] >= 0 && xy[1] < obstacles.length) {
					return m.options.obstacles[xy[0]][xy[1]] !== 1;
				} else {
					return false;
				}
			});
	    }
		
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
			n: m.options.map ? neighborsMap : neighbors
		});
	}
});