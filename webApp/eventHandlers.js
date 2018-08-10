// Event handler binding
$(document).ready(function() {
	/* === Screen 1 === */
	// Choose example images
	$('.grid-item.left').click(function(event) {chooseExamplePictureFn(event, true);});
	$('.grid-item.right').click(function(event) {chooseExamplePictureFn(event, false);});

	// Foreground button
	$('#foregroundForm').submit(function() {return uploadPictureFn($('#foregroundForm'), true);});

	// Auto-submit when a file is chosen
	$('#foregroundUploadButton').change(function() {$('#foregroundForm').submit();});

	// Background button
	$('#backgroundForm').submit(function() {return uploadPictureFn($('#backgroundForm'), false);});

	// Auto-submit when a file is chosen
	$('#backgroundUploadButton').change(function() {$('#backgroundForm').submit();});

	// Check segmentation
	document.getElementById('opt2ImageLeft').onload = function() {checkSegmentation('fg_url');}
	document.getElementById('opt2ImageRight').onload = function() {checkSegmentation('bg_url');}

	// Choose again buttons
	$('#chooseAgainFG').click(set_fg_false);
	$('#chooseAgainBG').click(set_bg_false);

	// Gumpify button
	$('#gumpifyButton').click(gumpifyFn);

	/* === Screen 2 === */
	// Got it button
	$('#gotItButton').click(gotItFn);

	// Edit button
	$('#editButton').click(editButtonFn);

	// Brightness slider
	$('#brightnessSlider').on('input', brightnessSliderFn);

	// Temperature slider
	$('#whiteBalanceSlider').on('input', whiteBalanceSliderFn);

	// Undo button
	$('#undoButton').click(undoManager.undo);

	// Redo button
	$('#redoButton').click(undoManager.redo);

	// Capture undo and redo key combos
	document.onkeydown = function(e) {keyPressed(e)};

	// Download button
	$('#downloadButton').click(downloadButtonFn);

	// Change Images button
	$('#changeImagesButton').click(changeImagesFn);
});