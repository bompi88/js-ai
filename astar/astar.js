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
	console.log(options)
	// -- Used variables -------------------------------------------------------

	var open, closed, successorList;

	var h, d, n, isEnd, startNode, bestNode;
	
	var startTime;

	// -- Validate options -----------------------------------------------------

	// Check if start node exists
	if(!(options.startNode)) {
		cb(true, { error: "Start node is not defined." });
		return;
	}

	if(!options.isEnd) {
		cb(true, { error: "It's no functions isEnd which validates if the current state is an acceptable solution. Form: function(node){}" });
		return;
	} else {
		if(!_.isFunction(options.isEnd)) {
			cb(true, { error: "options.isEnd is not a function at its accepted form: function(node){}" });
			return;
		}
	}

	if(!options.h) {
		cb(true, { error: "The heuristics function is not present in the options. Form: function(node){}" });
		return;
	} else {
		if(!_.isFunction(options.h)) {
			cb(true, { error: "options.h is not a function at its accepted form: function(node){}" });
			return;
		}
	}

	if(!options.d) {
		cb(true, { error: "The distance calculating function is not present in the options. Form: function(a, b){}" });
		return;
	} else {
		if(!_.isFunction(options.d)) {
			cb(true, { error: "options.d is not a function at its accepted form: function(a, b){}" });
			return;
		}
	}

	if(!options.n) {
		cb(true, { error: "The neighbor function is not present in the options. Form: function(node){}" });
		return;
	} else {
		if(!_.isFunction(options.n)) {
			cb(true, { error: "options.n is not a function at its accepted form: function(node){}" });
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
			cb && cb(false, {
				error: null,
				path: generatePath(currentNode),
				cost: currentNode.f,
				time: new Date() - startTime
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
				//console.log("expand node" + successorData)
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

	cb && cb(true, {
		error: "No solution found",
		path: generatePath(bestNode),
		cost: bestNode.f
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
		cb(true, { error: "Start point or end point is not defined." });
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
};

process.on('message', function(m) {
	if(m.msg === 'start' && m.options) {
		var options = m.options;
		bestFirstSearch({
			startNode: options.start,
			isEnd: function(node) {
				return node[0] === options.end[0] && node[1] === options.end[1];
			},
			h: function(node) {
				return euclideanDist(node, options.end);
			},
			d: euclideanDist,
			n: neighbors
		},
		function(error, result) {
			if(error) {
				new PNotify({
				    title: 'Hmmm...',
				    text: result.error,
				    type: 'error'
				});
			} else {
				new PNotify({
				    title: 'Solver completed',
				    text: 'An optimal path was found, and the solver is finished. It took: ' + result.time + ' ms.',
				    type: 'success'
				});		
			}
			document.getElementById('result-time').innerHTML = 'The search took: ' + result.time + ' ms.';
		});
	}
});