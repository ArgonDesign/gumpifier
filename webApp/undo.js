/*****************************************************************************
Argon Design Ltd. Project P8010 Spock
(c) Copyright 2018 Argon Design Ltd. All rights reserved.

Author : Patrick Taylor
*******************************************************************************/

/*
This file is the undo manager and associated functions.  It is split into two parts:
 1. An undo manager closure exposes the following API:
 	- undo()
 	- redo()
 	- initUndoEvent(event: see below)
	- clearHistory()
	- peek() (can used for debugging)
 2. A list of events which can be passed to initUndoEvent().  An instance of each event object is created when an event
 	starts, and is provided with a 'finalise operation': a function taking no arguments but acts on internal state of
 	the event object to provide redo information and is run either:
 		a) When 'undo' is called, or
 		b) When the initUndoEvent() is next called

 	The list of undo events is as follows:
 	- moveUndo(originalPosition: Array(2), finaliseOp) - undo move of the foreground
	- scaleUndo(originalScale: Array(2), originalPosition: Array(2), finaliseOp) - undo scale of the foreground
	- toggleLayerUndo(originallyBehind: bool, layer: Jquery object, finaliseOp)
	- textUndo(originalText: string, finaliseOp)
	- textMoveUndo(originalPosition: Array(2), finaliseOp) - undo move of the meme textarea
	- textScaleUndo(originalScale: Array(2), finaliseOp) - undo scale of the meme textarea
	- brightnessUndo(originalBrightness: number, finaliseOp)
	- whiteBalanaceUndo(originalWhiteBalance: number, finaliseOp)

	Each of the above objects provides the following API:
	- undo()
	- redo() 
*/

// Global undo manager closure
var undoManager = (function() {
	/*
	Initialize undo/redo queues.  currentEvent is an event which has been started but not yet finalized.
	*/
	var undoQueue = new Array();
	var redoQueue = new Array();
	var currentEvent = null;

	var undo = function() {
		/*
		Finalises currentEvent, undoes the last event (if available) and flips it to the redo queue
		*/
		if (currentEvent != null) {
			finaliseCurrentEvent();
		}
		if (undoQueue.length) {
			var toUndo = undoQueue.pop();
			toUndo.undo();
			redoQueue.push(toUndo);
			windowScale();
		}
	}; 
	var redo = function() {
		/*
		Redoes the last undone event (if available) and flips it to the undo queue
		*/
		if (redoQueue.length) {
			var toRedo = redoQueue.pop();
			toRedo.redo();
			undoQueue.push(toRedo);
			windowScale();
		}
	};
	var initUndoEvent = function(event) {
		/*
		Finalises the current event if there is one, clears the redo queue then sets currentEvent to 'event'.
		*/
		if (currentEvent != null) {
			finaliseCurrentEvent();
		}
		redoQueue.length = 0;
		currentEvent = event;
	};
	var finaliseCurrentEvent = function() {
		/*
		Runs the finaliseOp of the object pointed to by curretnEvent, transfers it to the undo queue.
		*/
		currentEvent.finaliseOp();
		undoQueue.push(currentEvent);
		currentEvent = null;
	};
	var clearHistory = function() {
		/*
		Clears both undo and redo queues
		*/
		undoQueue.length = 0;
		redoQueue.length = 0;
	};
	/*
	Return certain functions representing the undo manager's API
	*/
	return {
		undo: undo,
		redo: redo,
		initUndoEvent: initUndoEvent,
		clearHistory: clearHistory,
		peek: function() {
			console.log(undoQueue);
			console.log(redoQueue);
			console.log(currentEvent);
		}
	};
})();

/* === Functions to construct the undo objects === */
var moveUndo = function(originalPosition, finaliseOp) {
	this.originalPosition = originalPosition.slice();
	this.newPosition = new Array(2);
	this.undo = function() {
		fg_img_pos = this.originalPosition.slice();
	};
	this.redo = function() {
		fg_img_pos = this.newPosition.slice();
	};
	this.finaliseOp = finaliseOp;
};

var scaleUndo = function(originalScale, originalPosition, finaliseOp) {
	this.originalScale = originalScale.slice();
	this.originalPosition = originalPosition.slice();
	this.newScale = new Array(2);
	this.newPosition = new Array(2);
	this.undo = function() {
		fg_img_scale = this.originalScale.slice();
		fg_img_pos = this.originalPosition.slice();
	};
	this.redo = function() {
		fg_img_scale = this.newScale.slice();
		fg_img_pos = this.newPosition.slice();
	};
	this.finaliseOp = finaliseOp;;
};

var toggleLayerUndo = function(originallyBehind, layer, finaliseOp) {
	// originallyBehind is of type bool.
	this.originallyBehind = originallyBehind;
	this.layer = layer;
	this.undo = function() {
		selectedLayerDiv = this.layer;
		if (this.originallyBehind) {
			selectedLayerDiv.addClass("behind");
			sendBehind()
		}
		else {
			selectedLayerDiv.removeClass("behind");
			bringToFront()	
		}
	};
	this.redo = function() {
		this.originallyBehind = !this.originallyBehind;
		this.undo();
		this.originallyBehind = !this.originallyBehind;
	};
	this.finaliseOp = finaliseOp;
};

var textUndo = function(originalText, finaliseOp) {
	this.originalText = originalText;
	this.newText = null;
	this.undo = function() {
		$('#overlayText').val(this.originalText);
	};
	this.redo = function() {
		$('#overlayText').val(this.newText)
	};
	this.finaliseOp = finaliseOp;;
};

var textMoveUndo = function(originalPosition, finaliseOp) {
	this.originalPosition = originalPosition.slice();
	this.newPosition = new Array(2);
	this.undo = function() {
		overlay_pos = this.originalPosition.slice();
	};
	this.redo = function() {
		overlay_pos = this.newPosition.slice();
	};
	this.finaliseOp = finaliseOp;
};

var textScaleUndo = function(originalScale, finaliseOp) {
	this.originalScale = originalScale;
	this.newScale = null;
	this.undo = function() {
		overlay_scale = this.originalScale.slice();
	};
	this.redo = function() {
		overlay_scale = this.newScale.slice();
	};
	this.finaliseOp = finaliseOp;
}

var brightnessUndo = function(originalBrightness, finaliseOp) {
	this.originalBrightness = originalBrightness;
	this.newBrightness = null;
	this.undo = function() {
		colourState.setBrightness(this.originalBrightness);
	};
	this.redo = function() {
		colourState.setBrightness(this.newBrightness);
	};
	this.finaliseOp = finaliseOp;
}

var whiteBalanceUndo = function(originalWhiteBalance, finaliseOp) {
	this.originalWhiteBalance = originalWhiteBalance;
	this.newWhiteBalance = null;
	this.undo = function() {
		colourState.setWhiteBalance(this.originalWhiteBalance);
	};
	this.redo = function() {
		colourState.setWhiteBalance(this.newWhiteBalance);
	};
	this.finaliseOp = finaliseOp;
}