// Event handler binding
$(document).ready(function() {
	// === Screen 1
	// Foreground button
	$('#foregroundForm').submit(function() {return uploadPictureFn($('#foregroundForm'), true);});

	// Auto-submit when a file is chosen
	$('#foregroundUploadButton').change(function() {$('#foregroundForm').submit();});

	// Background button
	$('#backgroundForm').submit(function() {return uploadPictureFn($('#backgroundForm'), false);});

	// Auto-submit when a file is chosen
	$('#backgroundUploadButton').change(function() {$('#backgroundForm').submit();});

	// Gumpify button
	$('#gumpifyButton').click(gumpifyFn);

	// === Screen 2
	// Edit button
	$('#editButton').click(editButtonFn);

	// Brightness slider
	$('#brightnessSlider').on('input', brightnessSliderFn);

	// Temperature slider
	$('#whiteBalanceSlider').on('input', whiteBalanceSliderFn);

	// Undo button

	// Redo button

	// Change Images button
	$('#changeImagesButton').click(changeImagesFn);
});