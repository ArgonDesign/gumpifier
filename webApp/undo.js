// Undo manager closure
var undoManager = (function() {
	var undoQueue = new Array();
	var redoQueue = new Array();
	var currentEvent = null;

	var undo = function() {
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
		if (redoQueue.length) {
			var toRedo = redoQueue.pop();
			toRedo.redo();
			undoQueue.push(toRedo);
			windowScale();
		}
	};
	var initUndoEvent = function(event) {
		if (currentEvent != null) {
			finaliseCurrentEvent();
		}
		currentEvent = event;
	};
	var finaliseCurrentEvent = function() {
		currentEvent.finaliseOp();
		undoQueue.push(currentEvent);
		currentEvent = null;
		redoQueue.length = 0;
	};
	var clearHistory = function() {
		undoQueue.length = 0;
		redoQueue.length = 0;
	};
	return {
		undo: undo,
		redo: redo,
		initUndoEvent: initUndoEvent,
		finaliseCurrentEvent: finaliseCurrentEvent,
		clearHistory: clearHistory,
		peek: function() {
			console.log(undoQueue);
			console.log(redoQueue);
			console.log(currentEvent);
		}
	};
})();

// Various undo objects
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
			sendBehindButton()
		}
		else {
			selectedLayerDiv.removeClass("behind");
			bringToFrontButton()	
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