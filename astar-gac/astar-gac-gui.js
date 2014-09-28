
var Queue = require('adt-queue');
var fs = require("fs");
var gui = require('nw.gui');

var p;
var chooser;
var filePath = "./astar-gac/default.txt";

var pointXMin, pointXMax, pointYMin, pointYMax;

// -- Example data -------------------------------------------------------------

var options = {
	K: 4,
	//creates domain for a given variable
	domainOf: function(variable) {
		var domain = [];
		for (var i = 0; i < options.K; i++) {
			domain.push(i);
		}
		return domain;
	},
	variables: [],
	constraints: []
};

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
				processing.fill(variables[i].color && variables[i].color.r || 200,
								variables[i].color && variables[i].color.g || 200,
								variables[i].color && variables[i].color.b || 200);
				processing.ellipse(dx + (variables[i].x * scaleX), dy + (variables[i].y * scaleY), 12, 12);
			}

		};
	};

	p = new Processing(document.getElementById('diagram'), sketchProc);
};

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