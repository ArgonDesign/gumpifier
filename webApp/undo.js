// Undo manager closure
var undoManager = (function() {
	var undoQueue = new Array();
	var redoQueue = new Array();
	var currentEvent = null;
	return {
		undo: function() {
			if (undoQueue.length) {
				var toUndo = undoQueue.pop();
				toUndo.undo();
				redoQueue.push(toUndo);
				windowScale();
			}
		},
		redo: function() {
			if (redoQueue.length) {
				var toRedo = redoQueue.pop();
				toRedo.redo();
				undoQueue.push(toRedo);
				windowScale();
			}
		},
		initUndoEvent: function(event){
			currentEvent = event;
		},
		finaliseEvent: function(fn) {
			fn(currentEvent);
			undoQueue.push(currentEvent);
			currentEvent = null;
			redoQueue.length = 0;
		},
		clearHistory: function() {
			undoQueue.length = 0;
			redoQueue.length = 0;
		}
	}
})();

// Various undo objects
var moveUndo = function(originalPosition) {
	this.originalPosition = originalPosition.slice();
	this.newPosition = new Array(2);
	this.undo = function() {
		fg_img_pos = this.originalPosition.slice();
	};
	this.redo = function() {
		fg_img_pos = this.newPosition.slice();
	};
};

var scaleUndo = function(originalScale, originalPosition) {
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
};

var toggleLayerUndo = function(originallyBehind, layer) {
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
};

var textUndo = function(originalText) {
	this.originalText = originalText;
	this.newText = null;
	this.undo = function() {
		$('#overlayText').val(this.newText);
	}
	this.redo = function() {
		$('#overlayText').val(this.newText)
	}
}