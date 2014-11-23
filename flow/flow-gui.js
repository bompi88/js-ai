var process = require('child_process');
var Queue = require('adt-queue');
var fs = require("fs");

var Utils = require('./common/helpers.js');
var Astar = require('./common/astar.js');

var p;
var chooser;
var filePath = "./flow/default.txt";

var pointXMin, pointXMax, pointYMin, pointYMax;
var boardMap = [];

// -- Example data -------------------------------------------------------------

var options = {
	// K: 4,
	// //creates domain for a given variable
	// domainOf: function(variable) {
	// 	var domain = [];
	// 	for (var i = 0; i < options.K; i++) {
	// 		domain.push(i);
	// 	}
	// 	return domain;
	// },
	delay: 0,
	type: 'astar-gac',
	size: [6, 6],
	start: {
		variables: [],
		domains: [],
		constraints: []
	}
};

flow = function(opts, cb) {
	options = opts;
	
	options.start.variables = _.pluck(options.variables, 'index');
	options.start.constraints = options.constraints;
	options.nodeMap = {};

	// generate domains
	generateDomains();

	for (var i = 0; i < options.constraints.length; i++) {
		if(!options.nodeMap[options.constraints[i].from]) {
			options.nodeMap[options.constraints[i].from] = [];
		}
		if(!options.nodeMap[options.constraints[i].to]) {
			options.nodeMap[options.constraints[i].to] = [];
		}
		
		options.nodeMap[options.constraints[i].from].push(options.constraints[i].to);
		options.nodeMap[options.constraints[i].to].push(options.constraints[i].from);
	}

	child = process.fork('flow/flow.js');
	
	// Call the proper method in child process
	child.send({
		msg: 'start',
		options: options
	});

	child.on('message', function(m) {

		// Do DOM manipulations based on feedback from child process
	  	if(m.msg === 'visiting') {
	  		options.domains = m.node.content && m.node.content.domains;
	  		resetGrid();
	  	} else if(m.msg === 'bailing') {
	  	} else if(m.msg === 'expanding') {
	  	} else if(m.msg === 'expanded') {
	  		//options.domains = m.node.content && m.node.content.domains;
	  	} else if(m.msg === 'visited') {
	  		document.getElementById('visited').innerHTML = m.data.expanded;
	  		//options.domains = m.node.content && m.node.content.domains;
	  	} else if(m.msg === 'path') {
	  		
	  	} else if(m.msg === 'callback') {
			
			// The solver is either finished or an error occured
			if(m.cb.error) {
			    cb(true, {
			    	error: m.cb.msg
			    });
			} else {

				cb(false, {});
			}
	  	}
	});
}

// -- On document load ---------------------------------------------------------

onload = function() {
	resetGrid();

	// set up the file loader
    chooser = document.querySelector('#fileDialog');
    chooser.addEventListener("change", function(evt) {
    	if(this.value) {
    		parseFlowInput(readFile(this.value));	
    	}
    }, false);

	// get all GUI elements
	var openFileButton = document.getElementById('open-file-btn');
	var runSolverButton = document.getElementById('run-solver-btn');

	// attach listeners to buttons
	openFileButton.addEventListener("click", function(event) {
		event.preventDefault();
		chooser.click();
	});

	runSolverButton.addEventListener("click", function(event) {
		flow(options, function(error, result) {
			if(error) {
				new PNotify({
			    title: 'Ooooops...',
			    text: result.error,
			    type: 'error'
				});
			} else {
				new PNotify({
				    title: 'Problem solved',
				    text: 'Let\' see how good it went',
				    type: 'success'
				});
			}
		});
	});

	// load and parse default example
	parseFlowInput(readFile(filePath));

	resetGrid();
};

resetGrid = function() {
	var size = options.size;

	board = $('.board');

	// empty the current board
	board[0].innerHTML = '';

	// Set CSS width of the board
	board.css({ 'width': 20 * size[0] });
	console.log(boardMap)
	// append all cells in the grid
	for(var i = 0; i < size[0]; i++) {
		for(var j = 0; j < size[1]; j++) {
			board[0].innerHTML += '<div class="square" id="' + i + '-' + j +'" style="' + getColorCSS(boardMap[i] && boardMap[i][j] && boardMap[i][j].index)+ '"></div>';
		}
	}
};

colors = [
	{ r: 255, g: 0, b: 0 },
	{ r: 0, g: 255, b: 0 },
	{ r: 0, g: 0, b: 255 },
	{ r: 255, g: 255, b: 0 },
	{ r: 255, g: 0, b: 255 },
	{ r: 0, g: 255, b: 255 },
	{ r: 127, g: 0, b: 0 },
	{ r: 0, g: 127, b: 0 },
	{ r: 0, g: 0, b: 127 },
	{ r: 127, g: 127, b: 0 },
	{ r: 127, g: 0, b: 127 },
	{ r: 0, g: 127, b: 127 }
]

getColorCSS = function(index) {

	if(typeof index !== "undefined" && index != -1) {
			console.log("COLOR:" + index)
		return "background-color: rgb(" + colors[index].r + "," + colors[index].g + "," + colors[index].b + ");";
	} else {
		return "";
	}
};

getColor = function(variable) {
	if(options.domains && options.domains[variable.index] && options.domains[variable.index].length == 1) {
		return colors[options.domains[variable.index][0]];
	} else {
		return { r: 200,g: 200, b: 200 }
	} 
}

// Read a file at path
readFile = function(path) {
	return fs.readFileSync(path, "utf8");
}

var neighborsFunc = function(node) {
  	var x = node.point[0];
  	var y = node.point[1];
	// Strict movement 
	return [
		{ point: [x - 1, y + 0], variable: node.variable, obstacles: node.obstacles },
		{ point: [x + 0, y - 1], variable: node.variable, obstacles: node.obstacles },

		{ point: [x + 0, y + 1], variable: node.variable, obstacles: node.obstacles },
		{ point: [x + 1, y + 0], variable: node.variable, obstacles: node.obstacles }
	];
};

generateDomains = function() {
	// A modified neighbor function
	function neighborsMap(n) {
		return neighborsFunc(n).filter(function(node) {
			var obstacles = node.obstacles;
			
			// Filter out the outside of the grid and the obstacles
			if(node.point[0] >= 0 && node.point[1] >= 0 && node.point[0] < options.size[0]  && node.point[1] < options.size[1]) {
				if(node.point[1] < obstacles.length && node.point[0] < obstacles[0].length) {
					return ((obstacles[node.point[0]][node.point[1]] && obstacles[node.point[0]][node.point[1]].index == -1) || (obstacles[node.point[0]][node.point[1]] && obstacles[node.point[0]][node.point[1]].index == node.variable));
				} else {
					return true;
				}
			} else {
				return false;
			}
		});
    }

	for (var i = 0; i < options.variables.length; i++) {
		var st = {
			start: { point: [options.variables[i].from[0], options.variables[i].from[1]], variable: options.variables[i].index, obstacles: boardMap },
			end: { point: [options.variables[i].to[0], options.variables[i].to[1]], variable: options.variables[i].index, obstacles: boardMap }
		};

		var retVal = Astar.run({
			delay: 0,
			getAllPaths: true,
			startNode: st.start,
			hashFunction: Utils.generateHash,
			isEnd: function(node) {
				return node.point[0] === st.end.point[0] && node.point[1] === st.end.point[1];
			},
			h: function(node) {
				return Utils.manhattanDist2(node, st.end);
			},
			d: Utils.manhattanDist2,
			n: neighborsFunc
		});
		
		console.log(retVal)
		if(retVal.length > 0) {

			options.domains[options.variables[i].index] = retVal;
		}
	}
	console.log(options.domains)
}

// Parses the input from file and sets the new puzzle
parseFlowInput = function(buffer) {
	var lines = buffer.split('\n');
	var header = lines[0].split(' ');

	var nv = parseInt(header[0], 10);
	var ne = parseInt(header[1], 10);
	
	options.size = [nv, nv];
	console.log(ne)
	// reset the dataset
	options.variables = [];
	options.constraints = [];

	boardMap = [];

	for (var t = 0; t < options.size[0]; t++) {
		boardMap[t] = [];
		for (var s = 0; s < nv; s++) {
			boardMap[t][s] = { index: -1};
		}
	}

	for(var i = 0; i < ne; i++) {

		var args = lines[i + 1].split(' ');
		console.log(args)
		var vert = {
			index: parseInt(args[0], 10),
			from: [parseInt(args[1], 10), parseInt(args[2], 10)],
			to: [parseInt(args[3], 10), parseInt(args[4], 10)]
		};

		boardMap[vert.from[0]][vert.from[1]] = { index: vert.index };
		boardMap[vert.to[0]][vert.to[1]] = { index: vert.index };

		options.variables.push(vert);
	}
	console.log(boardMap)

	for(var j = 0; j < ne; j++) {
		var args = lines[j + 1].split(' ');
		var edge = {};

		edge.from = [parseInt(args[1], 10), parseInt(args[2], 10)];
		edge.to = [parseInt(args[3], 10), parseInt(args[4], 10)];
		edge.expression = 'from !== to';

		options.constraints.push(edge);
	}

	for (var i = 0; i < options.variables.length; i++) {
		options.start.domains[i] = [];
		for (var j = 0; j < ne; j++) {
			options.start.domains[i].push(j);
		}
		console.log(options.start.domains)
	}

	resetGrid();
};
