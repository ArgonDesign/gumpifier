var fg_selected = false;
var bg_selected = false;
var fg_url = "storage/Poirot_cutout_256x256.PNG";
var bg_url = "storage/Street_256x256.JPG";

function applyState(fg_changed, data) {
	// Deal with fg selected state
	if (fg_selected) {
		// Stop animations
		$('.borderLineL.borderLineLeft, .borderLineR.borderLineLeft, .borderLineT.borderLineLeft, .borderLineB.borderLineLeft').stop(true); // stopall=true
		resetAnimationState(".borderLineLeft");
		// Set the image to display if necessary
		if (fg_changed) {
			$('#option1Left').css({"display": "none"});
			$('#option2Left').css({"display": "flex"});
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
		if (!fg_changed) {
			$('#option1Right').css({"display": "none"});
			$('#option2Right').css({"display": "flex"});
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

	// Deal with both being true or either being false
	if (bg_selected && fg_selected) {
		// Enable the Gumpify button
		$('#gumpifyButton').prop('disabled', false);
		// Style the text to an appropriate colour
		$('#gumpifyPane').css({color: 'rgb(141,135,255)'});
		// Set the gumpify animations going
		sideSwoosh('.borderLineL', '.borderLineStep3');
		topBottomSwoosh	('.borderLineB', '.borderLineStep3');
	}
	else {
		// Disable the Gumpify button
		$('#gumpifyButton').prop('disabled', false); // TODO: replace false with true here to ensure button is disable when no images uploaded
		// Style the text to grey
		$('#gumpifyPane').css({color: 'rgb(135,135,135)'});
		// Stop the gumpify animations	
		$('.borderLineL.borderLineStep3, .borderLineR.borderLineStep3, .borderLineT.borderLineStep3, .borderLineB.borderLineStep3').stop(true); // stopall=true
		resetAnimationState(".borderLineStep3");
	}
}

function set_fg_false(data) {fg_selected = false; applyState(true, data);}
function set_fg_true(data) {fg_selected = true; applyState(true, data);}
function set_bg_false(data) {bg_selected = false; applyState(false, data);}
function set_bg_true(data) {bg_selected = true; applyState(false, data);}

$(document).ready(applyState);