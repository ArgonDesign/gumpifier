/*****************************************************************************
Argon Design Ltd. Project P8010 Spock
(c) Copyright 2018 Argon Design Ltd. All rights reserved.

Author : Patrick Taylor
*******************************************************************************/

/*
The sole purpose of this file is to bind handlers to events in a way which makes it easy to see what functions are called when user input
is detected.
* Functions which are trivially a single line are implemented directly here.
* Functions relating to the colourState of the foreground and to the undo manager are implemented in the appropriate files.
* Other functions are implemented in topLevelEventFunctions.js, and are documented there.
*/

// Event handler binding
$(document).ready(function() {
	// Initialization
	applyState();
	detectTouchscreen();

	/* === Screen 1 === */
	// Choose example images
	$('.grid-item.left').click(function(event) {chooseExamplePictureFn(event, true);});
	$('.grid-item.right').click(function(event) {chooseExamplePictureFn(event, false);});

	// Upload own foreground image button
	$('#foregroundForm').submit(function() {return uploadPictureFn($('#foregroundForm'), true);});

	// Auto-submit when a file is chosen
	$('#foregroundUploadButton').change(function() {$('#foregroundForm').submit();});

	// Upload own background image button
	$('#backgroundForm').submit(function() {return uploadPictureFn($('#backgroundForm'), false);});

	// Auto-submit when a file is chosen
	$('#backgroundUploadButton').change(function() {$('#backgroundForm').submit();});

	// Check segmentation of images
	document.getElementById('opt2ImageLeft').onload = function() {checkSegmentation('fg_url');}
	document.getElementById('opt2ImageRight').onload = function() {checkSegmentation('bg_url');}

	// Choose again buttons
	$('#chooseAgainFG').click(set_fg_false);
	$('#chooseAgainBG').click(set_bg_false);

	// Gumpify button
	$('#gumpifyButton').click(gumpifyFn);

	/* === Screen 2 === */
	// 'Got it!' button to make the instruction text disappear
	$('#gotItButton').click(function() {$('#instructions').hide()});

	// Edit button
	$('#editButton').click(editButtonFn);

	// Brightness slider - function not in topLevelEventFunctions.js
	$('#brightnessSlider').on('input', brightnessSliderFn);
	$('#brightnessSlider').on('mousedown', function() {
		undoManager.initUndoEvent(new brightnessUndo(colourState.getBrightness(), function() {this.newBrightness = colourState.getBrightness();}));
	});

	// Temperature slider - function not in topLevelEventFunctions.js
	$('#whiteBalanceSlider').on('input', whiteBalanceSliderFn);
	$('#whiteBalanceSlider').on('mousedown', function() {
		undoManager.initUndoEvent(new whiteBalanceUndo(colourState.getWhiteBalance(), function() {this.newWhiteBalance = colourState.getWhiteBalance();}));
	});

	// Undo button - function not in topLevelEventFunctions.js
	$('#undoButton').click(undoManager.undo);

	// Redo button - function not in topLevelEventFunctions.js
	$('#redoButton').click(undoManager.redo);

	// Capture undo and redo key combos
	document.onkeydown = function(e) {keyPressed(e)};

	// Download button
	$('#downloadButton').click(downloadButtonFn);

	// Change Images button
	$('#changeImagesButton').click(changeImagesFn);

	// When screen size changes
	window.onresize = windowScale;
});