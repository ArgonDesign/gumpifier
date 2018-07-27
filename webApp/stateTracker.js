var fg_selected = false;
var bg_selected = false;
var fg_segmented = false;
var bg_segmented = false;
var fg_url = "storage/Poirot_cutout_256x256.PNG";
var bg_url = "storage/Street_256x256.JPG";

function applyState(fg_changed, bg_changed, data) {
	// Deal with fg selected state
	if (fg_selected) {
		// Stop animations
		$('.borderLineL.borderLineLeft, .borderLineR.borderLineLeft, .borderLineT.borderLineLeft, .borderLineB.borderLineLeft').stop(true); // stopall=true
		resetAnimationState(".borderLineLeft");
		// Set the image to display if necessary
		if (fg_changed) {
			$('#option1Left').css({"display": "none"});
			$('#option2Left').css({"display": "flex"});
			// var tmpImg = new Image();
			// tmpImg.onload = function() {checkSegmentation('fg_url', data)};
			// tmpImg.src = data;
			// $(tmpImg).addClass('opt2ImageLeft');
			// $('#opt2ImageLeftDiv').html(tmpImg);
			$('#opt2ImageLeft').attr("src", data);
			$('#foregroundForm').appendTo('#opt2vLeft');
			fg_url = data;
			console.log(fg_url);
		}
	}
	else {
		// Start animations
		sideSwoosh('.borderLineL', '.borderLineLeft');
		topBottomSwoosh('.borderLineB', '.borderLineLeft');
	}

	// Deal with bg selected state
	if (bg_selected) {
		// Set the image to display if necessary
		if (bg_changed) {
			$('#option1Right').css({"display": "none"});
			$('#option2Right').css({"display": "flex"});
			// var tmpImg = new Image();
			// tmpImg.onload = function() {checkSegmentation('bg_url', data)};
			// tmpImg.src = data;
			// $(tmpImg).addClass('opt2ImageRight');
			// $('#opt2ImageRightDiv').html(tmpImg);
			$('#opt2ImageRight').attr("src", data);
			$('#backgroundForm').appendTo('#opt2vRight');
			bg_url = data;
		}
	}
	else {
		// Start animations
	}

	// Deal with fg selected bg not selected
	if (fg_selected && !bg_selected) {
		// Start animations
		sideSwoosh('.borderLineL', '.borderLineRight');
		topBottomSwoosh('.borderLineB', '.borderLineRight');
	}
	else {
		// Stop animations
		$('.borderLineL.borderLineRight, .borderLineR.borderLineRight, .borderLineT.borderLineRight, .borderLineB.borderLineRight').stop(true); // stopall=true
		resetAnimationState(".borderLineRight");
	}

	// Check if we can enable the Gumpify button
	if (bg_selected && fg_selected && fg_segmented && bg_segmented) {
		// Enable the Gumpify button
		$('#gumpifyButton').prop('disabled', false);
		// Style the text and circles to an appropriate colour
		$('#gumpifyPane').css({color: 'rgb(141,135,255)'});
		$('.cornerCircleStep3').css({"background-color": 'rgb(141,135,255)'})
		// Set text
		$('#Step3').text("Step 3...");
		// Set the gumpify animations going
		sideSwoosh('.borderLineL', '.borderLineStep3');
		topBottomSwoosh	('.borderLineB', '.borderLineStep3');
	}
	else {
		// Disable the Gumpify button
		$('#gumpifyButton').prop('disabled', true); // TODO: replace false with true here to ensure button is disable when no images uploaded
		// Style the text and circles to grey
		$('#gumpifyPane').css({color: 'rgb(135,135,135)'});
		$('.cornerCircleStep3').css({"background-color": 'rgb(135,135,135)'});
		// Set text
		if (fg_selected && bg_selected) $('#Step3').text("Step 3... (just a sec, we're processing your images)");
		// Stop the gumpify animations	
		$('.borderLineL.borderLineStep3, .borderLineR.borderLineStep3, .borderLineT.borderLineStep3, .borderLineB.borderLineStep3').stop(true); // stopall=true
		resetAnimationState(".borderLineStep3");
	}
}

function checkSegmentation(what) {
	console.log("Check Segmentation called")
	// what is either 'fg_url' or 'bg_url'
	// We now make another AJAX call with returns when the FG image has finished segmenting
	var toSend;
	if (what == 'fg_url') toSend = {'fg_url': $('#opt2ImageLeft').attr('src')}
	else if (what == 'bg_url') toSend = {'bg_url': $('#opt2ImageRight').attr('src')}
	$.ajax({
		type: "POST",
		url: "cgi-bin/segCheck.py",
		data: toSend,
		success: function(data) {
				console.log(data);
				if (what == 'fg_url') fg_segmented = true;
				else if (what == 'bg_url') bg_segmented = true;
				applyState(false, false, null);
			},
		dataType: "json", // Could omit this because jquery correctly guesses JSON anyway
		error: function(xhr, status, error) {
			console.log(status);
			console.log(error);
		}
	});
}

function set_fg_false(data) {fg_selected = false; applyState(true, false, data);}
function set_fg_true(data) {fg_selected = true; applyState(true, false, data);}
function set_bg_false(data) {bg_selected = false; applyState(false, true, data);}
function set_bg_true(data) {bg_selected = true; applyState(false, true, data);}

$(document).ready(applyState);