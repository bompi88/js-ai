var process = require('child_process');
var Queue = require('adt-queue');
var fs = require("fs");

var Utils = require('./common/helpers.js');
var Astar = require('./common/astar.js');

var p;
var chooser;
var filePath = "./astar-gac/default.txt";

var pointXMin, pointXMax, pointYMin, pointYMax;

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
	start: {
		variables: [],
		domains: [],
		constraints: []
	}
};

astarGAC = function(opts, cb) {
	options = opts;
	var K = parseInt($('#k').val(),10) || 4;
	console.log(K)
	// set initial domains DUMNMY domains
	for (var i = 0; i < options.variables.length; i++) {
		options.start.domains[i] = [];
		for (var j = 0; j < K; j++) {
			options.start.domains[i].push(j);
		}
		console.log(options.start.domains)
	}

	options.start.variables = _.pluck(options.variables, 'index');
	options.start.constraints = options.constraints;
	options.nodeMap = {};

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

	child = process.fork('astar-gac/astar-gac.js');
	
	// Call the proper method in child process
	child.send({
		msg: 'start',
		options: options
	});

	child.on('message', function(m) {

		// Do DOM manipulations based on feedback from child process
	  	if(m.msg === 'visiting') {
	  		options.domains = m.node.content && m.node.content.domains;
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
	
	// set up the file loader
    chooser = document.querySelector('#fileDialog');
    chooser.addEventListener("change", function(evt) {
    	if(this.value) {
    		parseGACInput(readFile(this.value));	
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
		astarGAC(options, function(error, result) {
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
	parseGACInput(readFile(filePath));


	// Setup the draw loop for processing.js
	var dx = 0, dy = 0;
	var width = 800, height = 600;
	var scaleX = 1, scaleY = 1;

	function sketchProc(processing) {
		processing.setup = function() {
			// initialize canvas element
			processing.size(width, height);
			processing.frameRate(5);
		}

		processing.draw = function() {

			var estWidth = pointXMax - pointXMin;
			var estHeight = pointYMax - pointYMin;

			var estXScale = (width / estWidth) * 0.5;
			var estYScale = (height / estHeight) * 0.5;

			if(estXScale > estYScale) {
				scaleX = scaleY = estXScale;
			} else {
				scaleX = scaleY = estYScale;
			}

			dx = - (pointXMin * scaleX) + 200;
			dy = - (pointYMin * scaleY) + 80;

			var variables = options.variables;
			var constraints = options.constraints;

			processing.background(245);
			

			// Draw the edges
			for(var j = 0; j < constraints.length; j++) {
				var from = constraints[j].from;
				var to = constraints[j].to;

				if(variables[from] && variables[to]) {
					processing.line((variables[from].x * scaleX) + dx, (variables[from].y * scaleY) + dy, (variables[to].x * scaleX) + dx, (variables[to].y * scaleY) + dy);
				}
			}

			// Draw the vertices
			for(var i = 0; i < variables.length; i++) {
				var color = getColor(variables[i]);
				processing.fill(color.r || 200,
								color.g || 200,
								color.b || 200);
				processing.ellipse(dx + (variables[i].x * scaleX), dy + (variables[i].y * scaleY), 12, 12);
			}

		};
	};

	p = new Processing(document.getElementById('diagram'), sketchProc);
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

// Parses the input from file and sets the new puzzle
parseGACInput = function(buffer) {
	var lines = buffer.split('\n');
	var header = lines[0].split(' ');

	var nv = parseInt(header[0], 10);
	var ne = parseInt(header[1], 10);
	
	// reset the dataset
	options.variables = [];
	options.constraints = [];

	pointXMin = Infinity;
	pointXMax = -Infinity;
	pointYMin = Infinity;
	pointYMax = -Infinity;

	for(var i = 0; i < nv; i++) {
		var args = lines[i + 1].split(' ');
		var vert = {};

		vert.index = parseInt(args[0], 10);
		vert.x = parseInt(args[1], 10);
		vert.y = parseInt(args[2], 10);

		updateBoundary(vert.x, vert.y);

		options.variables.push(vert);
	}

	for(var j = nv + 1; j < (nv + ne + 1); j++) {
		var args = lines[j].split(' ');
		var edge = {};

		edge.from = parseInt(args[0], 10);
		edge.to = parseInt(args[1], 10);
		edge.expression = 'from !== to';

		options.constraints.push(edge);
	}
};

// Updates the boundary box which the graph is inside.
updateBoundary = function(x, y) {
	if(x < pointXMin) {
		pointXMin = x;
	}

	if(x > pointXMax) {
		pointXMax = x;
	}

	if(y < pointYMin) {
		pointYMin = y;
	}

	if(y > pointYMax) {
		pointYMax = y;
	}
};