// =============================================================================
// common/helpers.js
// -----------------------------------------------------------------------------
// All helper methods used, is gathered inside this file. These methods is
// typically used by several modules.
//
// =============================================================================

var hash = require('object-hash');
var _ = require('underscore');

module.exports = {
	/**
	 * Returns the Euclidean distance from node A to node B
	 */
	euclideanDist: function(a, b) {
		if (a.length && b.length) {

			var dx = b[0] - a[0];
			var dy = b[1] - a[1];

			return Math.sqrt((dx * dx) + (dy * dy));
		}

		return 0;
	},

	/**
	 * Returns the Manhattan distance from node A to node B
	 */
	manhattanDist: function(a, b) {
		if (a.length && b.length) {

			var dx = Math.abs(b[0] - a[0]);
			var dy = Math.abs(b[1] - a[1]);

			return dx + dy;
		} else {
			throw new Error('manhattanDist: A or/and B not a 2D point on the form [x, y]');
		}

		return 0;
	},
		/**
	 * Returns the Manhattan distance from node A to node B
	 */
	manhattanDist2: function(a, b) {
		if (a.point.length && b.point.length) {

			var dx = Math.abs(b.point[0] - a.point[0]);
			var dy = Math.abs(b.point[1] - a.point[1]);

			return dx + dy;
		} else {
			throw new Error('manhattanDist: A or/and B not a 2D point on the form [x, y]');
		}

		return 0;
	},

	/**
	 * Hash function for dictionary
	 */
	generateHash: function(o) {
		return hash(o);
	},

	/**
	 * Hash function for dictionary, using only toString()
	 */
	generateHashToString: function(o) {
		return o.toString();
	},

	/**
	 * Deep clones an object
	 */
	clone: function(obj) {
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
	            copy[i] = this.clone(obj[i]);
	        }
	        return copy;
	    }

	    // Handle Object
	    if (obj instanceof Object) {
	        copy = {};
	        for (var attr in obj) {
	            if (obj.hasOwnProperty(attr)) copy[attr] = this.clone(obj[attr]);
	        }
	        return copy;
	    }

	    throw new Error("Unable to copy object! Its type isn't supported.");
	}

};