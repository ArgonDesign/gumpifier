// Event handler binding
$(document).ready(function() {
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
});

function bindScreen2Functions() {
	// Post Process button
	$('#postProcessButton').click(postProcessFn);
}