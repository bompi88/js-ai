var process = require('child_process');
var child;

var newObstacleButton, runButton, setSizeButton;

var status = 'idle';

var board;
var mapSize = { x: 10, y: 10};

var options;

var state = null;

// -- Helper functions ---------------------------------------------------------

/**
 * Returns true if the solver is idle and the user can edit the options.
 */
canEdit = function() {
	if(status === 'idle') {
		return true;
	} else {
		new PNotify({
		    title: 'Unable to apply changes',
		    text: 'The solver is still running. You have to stop it before making any changes.',
		    type: 'error'
		});
		return false;
	}
};

/**
 * Returns true if a point is on the positive y and x axis.
 */
pointIsPositive = function(point) {
	if( point.x < 0 ||
		point.y < 0) {
		return false;
	}
	
	return true;
};

/**
 * Returns true if a point is defined inside the grid.
 */
pointIsInsideGrid = function(point) {
	// Check if point is on both positive axis
	if(pointIsPositive(point)) {

		// The point is inside the grid upper limit?
		if( obstacle.x <= options.size.x ||
			obstacle.y <= options.size.y) {
			return true
		} else {
			return false
		}
	}

	return false;
};

// -- Event Handles ------------------------------------------------------------

/**
 * Is triggered whenever the 'Add obstacle'-button is clicked.
 */
handleObstacleButton = function() {

	// If the solver isn't running
	if(canEdit()) {
		var obstacle = {
			from: {
				x: document.getElementById('obstacle-x-from').value,
				y: document.getElementById('obstacle-y-from').value
			},
			to: {
				x: document.getElementById('obstacle-x-to').value,
				y: document.getElementById('obstacle-y-to').value
			}
		};

		// validate the obstacle before adding it to the list
		validateObstacle(obstacle, function(err, msg) {
			if(err) {
				new PNotify({
				    title: msg.title,
				    text: msg.text,
				    type: 'error'
				});
			} else {
				// Add obstacle to the options
				options.obstacles.push(obstacle);

				// Update the UI grid


				// Notify that the obstacle was created
				new PNotify({
				    title: 'New obstacle',
				    text: 'You have successfully created a new obstacle! Click the \"Run\"-button so we can check whether the solver finds a solution or not!',
				    type: 'success'
				});
			}	
		});
	}
};

/**
 * Is triggered whenever the 'Run'-button is clicked.
 */
handleRunButton = function(event) {
	event.preventDefault();

	new PNotify({
	    title: 'Let\'s begin the diggin\'',
	    text: 'The solver has started, you may take a coffee break or two.',
	    type: 'info'
	});

	resetGrid();

	child = process.fork('astar/astar.js');
	
	child.on('message', function(m) {

		// Do DOM manipulations based on feedback from child process
	  	if(m.msg === 'visiting') {
	  		$('#' + m.node.content[0] + '-' + m.node.content[1]).addClass('visiting');
	  	} else if(m.msg === 'bailing') {
			$('#' + m.node.content[0] + '-' + m.node.content[1]).removeClass('visiting');
	  	} else if(m.msg === 'expanding') {
	  		$('#' + m.node[0] + '-' + m.node[1]).addClass('expanded');
	  	} else if(m.msg === 'visited') {
	  		$('#' + m.node.content[0] + '-' + m.node.content[1]).removeClass('visiting');
			$('#' + m.node.content[0] + '-' + m.node.content[1]).addClass('visited');
	  	} else if(m.msg === 'path') {
	  		$('#' + m.node.content[0] + '-' + m.node.content[1]).addClass('path');
	  	}
	});

	child.send({
		msg: 'start',
		options: options
	});
};

/**
 * Is triggered whenever the 'Edit size'-button is clicked.
 */
handleSetSizeButton = function() {

	// Can we edit the grid?
	if(canEdit()) {
		var size = {
			x: document.getElementById('size-x-value').value,
			y: document.getElementById('size-y-value').value
		};

		validateSize(size, function(err, msg) {
			if(err) {
				new PNotify({
				    title: msg.title,
				    text: msg.text,
				    type: 'error'
				});
			} else {
				// Update the size in the options
				options.size = [size.x, size.y];
				options.start = null;
				options.end = null;
				options.neighbors = [];
				// Update the UI grid
				resetGrid();

				// Notify that the size was adjusted
				new PNotify({
				    title: 'Size adjusted',
				    text: 'Size is now adjusted, please reassign your start and end point. Obstacles must also be created once more.',
				    type: 'success'
				});
			}
		});
	}
};

// -- On document load ---------------------------------------------------------

onload = function() {
	
	// Get all buttons
	newObstacleButton = document.getElementById('add-obstacle');
	runButton = document.getElementById('run');
	resetButton = document.getElementById('reset');
	setSizeButton = document.getElementById('set-size');

	setStartButton = document.getElementById('set-start');
	setEndButton = document.getElementById('set-end');
	drawObstaclesButton = document.getElementById('draw-obstacles');

	// attach listeners to each button
	newObstacleButton.addEventListener('click', handleObstacleButton);
	runButton.addEventListener('click', handleRunButton);
	reset.addEventListener('click', resetGrid);
	setSizeButton.addEventListener('click', handleSetSizeButton);

	setStartButton.addEventListener('click', function(event) {
		event.preventDefault();
		state = 'setStart';
	});

	setEndButton.addEventListener('click', function(event) {
		event.preventDefault();
		state = 'setEnd';
	});

	drawObstaclesButton.addEventListener('click', function(event) {
		event.preventDefault();
		if(state == null) {
			state = 'drawObstacles';
			$(this).addClass('active');
		} else {
			state = null;
			$(this).removeClass('active');
		}
	});

	// create default options
	createInitialOptions();

	// update form input values in GUI

	// reset the grid
	resetGrid();
};

resetGrid = function() {
	var size = options.size;

	board = $('.board');

	// empty the current board
	board[0].innerHTML = '';
	document.getElementById('result-time').innerHTML = '';

	// Set CSS width of the board
	board.css({ 'width': 20 * size[0] });

	// append all cells in the grid
	for(var i = 0; i < size[0]; i++) {
		for(var j = 0; j < size[1]; j++) {
			board[0].innerHTML += '<div class="square" id="' + i + '-' + j +'"></div>';
		}
	}

	// color start and end node
	var start = options.start;
	var end = options.end;

	if(!start || !end) {
		return;
	}

	if(start || end) {
		var startCell = $('#' + start[0] + '-' + start[1]);
		var endCell = $('#' + end[0] + '-' + end[1]);

		startCell.toggleClass('startpoint');
		endCell.toggleClass('endpoint');		
	}

	// Color the cells which is occupied by an obstacle.
	var obstacles = options.obstacles;

	if(obstacles.length) {
		for(var k = 0; k < obstacles.length; k++) {
			var cell = $('#' + obstacles[k][0] + '-' + obstacles[k][1]);
			cell.toggleClass('obstacle');
		}
	}


	// set click listeners on each cell.
	$('div.square').on('click', function() {
		var el = $(this);
		var xy = el.attr('id').split('-');
		var point = [xy[0], xy[1]];
		console.log("clickedyclick")
		
		if(state === 'setStart') {
			$('.startpoint').removeClass('startpoint');
			el.addClass('startpoint');
			state = null;
			options.start = point;
		} else if(state === 'setEnd') {
			$('.endpoint').removeClass('endpoint');
			el.addClass('endpoint');
			state = null;
			options.end = point;
		} else if(state === 'drawObstacles') {
			if(el.hasClass('obstacle')) {
				for(var i = options.obstacles.length - 1; i >= 0; i--) {
				    if(parseInt(options.obstacles[i][0],10) === parseInt(point[0],10) && parseInt(options.obstacles[i][1],10) === parseInt(point[1],10)) {
				       options.obstacles.splice(i, 1);
				    }
				}
				el.removeClass('obstacle');
			} else {
				el.addClass('obstacle');
				options.obstacles.push(point);
			}
		}
	});
}

// -- Validators ---------------------------------------------------------------

/**
 * Validates an obstacle and gives feedback
 */
validateObstacle = function(obstacle, cb) {

	if( !obstacle.from.x ||
		!obstacle.from.y ||
		!obstacle.to.x ||
		!obstacle.to.y ) {
		cb(true, {
			title: 'Invalid obstacle',
			text: 'Necessary fields are not filled in yet.' 
		});
		return;
	}

	if( !parseInt(obstacle.from.x, 10) ||
		!parseInt(obstacle.from.y, 10) ||
		!parseInt(obstacle.to.x, 10) ||
		!parseInt(obstacle.to.y, 10)) {
		cb(true, {
			title: 'Invalid obstacle',
			text: 'Some of the values is non-integers.' 
		});
		return;
	}

	// Check whether the points is on the positive axis
	if( !pointIsInsideGrid(obstacle.from) ||
		!pointIsInsideGrid(obstacle.to)) {
		cb(true, {
			title: 'Invalid obstacle',
			text: 'Points specified has to be inside the grid.' 
		});
		return;
	}

	cb(false, null);
};

/**
 * Validates the size and gives feedback if possible.
 */
validateSize = function(size, cb) {

	// Has all input values been entered?
	if( !size.x ||
		!size.y ) {
		cb(true, {
			title: 'Invalid size',
			text: 'Necessary fields are not filled in yet.' 
		});
		return;
	}

	//  Can we parse the values to integers?
	if( !parseInt(size.x, 10) ||
		!parseInt(size.y, 10)) {
		cb(true, {
			title: 'Invalid size',
			text: 'Some of the values is non-integers.' 
		});
		return;
	}

	// Check whether the points is on the positive axis
	if( !pointIsPositive(size) ||
		!pointIsPositive(size)) {
		cb(true, {
			title: 'Invalid size',
			text: 'The size specified is negative.' 
		});
		return;
	}

	// If grid is one dimensional
	if(size.x < 2 || size.y < 2) {
		cb(true, {
			title: 'Invalid size',
			text: 'The size in one or more directions is to small to be reasonable.' 
		});
		return;
	}

	// If grid is relatively large, give a warning
	if(size.x > 30 && size.y > 30 || size.x > 200 || size.y > 200) {
		cb(false, null);
		new PNotify({
		    title: 'Size adjusted, but...',
		    text: 'The size specified is quite large, this puzzle may never be solved in time.'
		});
		return;
	}

	cb(false, null);
};

// -- Initialization -----------------------------------------------------------

/**
 * Creates some basic and initial options for the solver
 */
createInitialOptions = function() {
	options = {
		size: [20, 20],
		start: [0, 0],
		end: [12, 15],
		diagonal: false,
		obstacles: [
			[8, 6],
			[9, 7],
			[10, 6]
		]
	};
};