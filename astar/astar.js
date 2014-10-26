// =============================================================================
// 
// -----------------------------------------------------------------------------
//
//
// =============================================================================

// -- Modules ------------------------------------------------------------------

var hash = require('object-hash');
var Heap = require('heap');
var Queue = require('adt-queue');
var Stack = require('stack-adt');
var Set = require('Set');
var Dict = require('dict');
var sleep = require('sleep');
var _ = require('underscore');

// -- Local modules ------------------------------------------------------------

var Utils = require('../common/helpers.js');
var Astar = require('../common/astar.js');

var options;
var type;
var nodeMap;

var expanded = {
	astar: 0,
	dfs: 0,
	bfs: 0
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
			[x + 1, y - 1]
		];
	} else {
		// Strict movement 
		return [
			[x - 1, y + 0],
			[x + 0, y - 1],

			[x + 0, y + 1],
			[x + 1, y + 0]
		];
	}
};



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
	    	Astar.run({
				delay: m.options.delay,
				startNode: options.start,
				hashFunction: Utils.generateHashToString,
				isEnd: function(node) {
					return node[0] === options.end[0] && node[1] === options.end[1];
				},
				h: function(node) {
					return options.diagonal ? Utils.euclideanDist(node, options.end) : Utils.manhattanDist(node, options.end);
				},
				d: options.diagonal ? Utils.euclideanDist : Utils.manhattanDist,
				n: m.options.map ? neighborsMap : neighborsFunc
			});

		// Else do a heuristics function that always returns 1
	    } else {
	    	Astar.run({
				delay: m.options.delay,
				startNode: options.start,
				hashFunction: Utils.generateHashToString,
				type: options.type,
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