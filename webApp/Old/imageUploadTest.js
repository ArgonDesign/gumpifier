// Code e.g.s from here: http://malsup.com/jquery/form/
// other suggestions, some good, some not, can be found here: https://stackoverflow.com/questions/374644/how-do-i-capture-response-of-form-submit

$(document).ready(function() {
	// Attach handler to form's submit event
	$('#imageForm').submit(function() {
		// Submit the form
		$(this).ajaxSubmit(function(data) {
			// We can't get the path to the local file via the form because of security limitations
			// so we download the uploaded file to the server.
			if (data != 'ERROR') {
				console.log(data)
				$('#display').html("<img src=" + data + ">");
			}
		});
		// Return false to prevent normal browser submit and page navigation
		return false;
	});

	// Auto-submit when a file is chosen
	$('#foregroundUploadButton').change(function() {
		$('#imageForm').submit();
	});
});