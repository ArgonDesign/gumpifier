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
	/* === Both screens and initialisation === */
	// Initialisation
	applyState();
	detectTouchscreen();

	// Load the privacy notice and bind the event to show it
	changeScreens = changeScreensFn();
	$.get("privacyNotice.html", function(data) {$('#content-screenP').append(data)});
	$.get("blogPost.html", function(data) {$('#content-screenB').append(data)});
	$('#footerRight').click(changeScreens.showScreenP);
	$('#blogPostButton').click(changeScreens.showScreenB);
	$('.returnFromSubScreen').click(changeScreens.returnFromLetter);
	
	/* === Screen 1 === */
	// Choose example images
	// $('.grid-item.left').click(function(event) {chooseExamplePictureFn(event, true);});
	// $('.grid-item.right').click(function(event) {chooseExamplePictureFn(event, false);});

	// Upload own foreground image button
	$('#foregroundForm').submit(function() {return uploadPictureFn($('#foregroundForm'), true);});

	// Auto-submit when a file is chosen
	$('#foregroundUploadInput').change(function() {$('#foregroundForm').submit();});

	// Upload own background image button
	$('#backgroundForm').submit(function() {return uploadPictureFn($('#backgroundForm'), false);});

	// Auto-submit when a file is chosen
	$('#backgroundUploadInput').change(function() {$('#backgroundForm').submit();});

	// Bring up 'upload own image' form when clicking on the upload icon as well
	$('#backgroundUploadIcon').click(function() {$('#backgroundUploadButton').click();});
	$('#foregroundUploadIcon').click(function() {$('#foregroundUploadButton').click();});

	// Bring up 'upload own image' form when the user chooses a new image, having chosen one already
	$('#opt2OverlayRight').click(function() {$('#foregroundUploadButton').click();});
	$('#opt2OverlayLeft').click(function() {$('#backgroundUploadButton').click();});

	// Gumpify button
	// We do not bind this here as it is dynamically bound and unbound depending on whether both images are selected
	// and segmented.  The function you want, though, is gumpifyFn() in topLevelEventFunctions.js.

	/* === Screen 2 === */
	// 'Got it!' button to make the instruction text disappear
	$('#instructionsCloseIcon').click(function() {$('#instructions').hide()});

	// The hover detector show and hides the UI elements, but must pass clicks through
	// $('#hoverDetector').hover(function(event) {showMasks; clickThroughHover(event);}, function(event) {hideMasks; clickThroughHover(event);});
	// $('#hoverDetector').on("mousedown", clickThroughHover); // clickThroughHover is automatically passed the click event

	// 'X' button to make the instruction text disappear
	$('#headerClose').click(function() {$('#headerOption2').hide(); $('#headerOption1').css("display", "flex");});

	// Edit button
	$('#commandIconEdit, #commandTextEdit').click(editButtonFn);
	// $('#commandButtonEdit').not('#editCommands *, #triangle').click(editButtonFn);

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
	$('#commandButtonUndo').click(undoManager.undo);

	// Redo button - function not in topLevelEventFunctions.js
	$('#commandButtonRedo').click(undoManager.redo);

	// Capture undo and redo key combos
	document.onkeydown = function(e) {keyPressed(e)};

	// Download button
	$('#downloadButton').click(downloadButtonFn);

	// Change Images button
	$('#changeImagesButton').click(changeImagesFn);

	// When screen size changes
	window.onresize = windowScale;
});