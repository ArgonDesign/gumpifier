/*****************************************************************************
Argon Design Ltd. Project P8010 Spock
(c) Copyright 2018 Argon Design Ltd. All rights reserved.

Author : Patrick Taylor
*******************************************************************************/

/*
This file tracks the state of the first screen.  It sets/disables animations, enables/disables the gumpify button,
shows the selection pane or selected image, all with respect to what the user has done.
*/


/*
Some global tracking state
*/
var fg_selected = false;
var bg_selected = false;
var fg_segmented = false;
var bg_segmented = false;
var fg_url = "storage/Poirot_cutout_256x256.PNG";
var bg_url = "storage/Street_256x256.JPG";

function applyState(fg_changed, bg_changed, data) {
	/*
	Args:
		fg_changed: bool - whether the user has selected a different foreground image since the last invocation
		bg_changed: bool - whether the user has selected a different background image since the last invocation
		data: string - url of a foreground or background image
	Returns:
		None
	Precondition:
		!(fg_changed ^ bg_changed)
	Operation:
		Deals with the following states:
			- fg_selected
			- bg_selected
			- fg_selected && !bg_selected
			- bg_selected && fg_selected && fg_segmented && bg_segmented
	*/

	if (fg_selected) {
	// If the foreground is selected: stop animations, and display selected image
		// Stop animations
		$('.borderLineL.borderLineLeft, .borderLineR.borderLineLeft, .borderLineT.borderLineLeft, .borderLineB.borderLineLeft').stop(true); // stopall=true
		resetAnimationState(".borderLineLeft");
		// Set the image to display if necessary
		if (fg_changed) {
			$('#option1Left').css({"display": "none"});
			$('#option2Left').css({"display": "flex"});
			$('#opt2ImageLeft').attr("src", data);
			fg_url = data;
			console.log(fg_url);
		}
	}
	else {
	// If the foreground isn't selected: reset the form, show the selection pane, set animations going
		// Reset the form
		document.getElementById("foregroundForm").reset();
		// Revert layout
		$('#option1Left').css({"display": "block"});
		$('#option2Left').css({"display": "none"});
		// Start animations
		sideSwoosh('.borderLineL', '.borderLineLeft');
		topBottomSwoosh('.borderLineB', '.borderLineLeft');
	}

	if (bg_selected) {
	// If the background image is selected: display the image
		// Set the image to display if necessary
		if (bg_changed) {
			$('#option1Right').css({"display": "none"});
			$('#option2Right').css({"display": "flex"});
			$('#opt2ImageRight').attr("src", data);
			bg_url = data;
		}
	}
	else {
	// If the background image isn't selected: reset the form, show the selection pane, set animations going
		// Reset the form
		document.getElementById("backgroundForm").reset();
		// Revert layout
		$('#option1Right').css({"display": "block"});
		$('#option2Right').css({"display": "none"});
		// Start animations
		sideSwoosh('.borderLineL', '.borderLineRight');
		topBottomSwoosh('.borderLineB', '.borderLineRight');
	}

	// Deal with fg selected bg not selected
	if (fg_selected && !bg_selected) {
	/* If the foreground is selected, but the background isn't: set background animations going (we don't set them
	going when checking for just background because we don't want both the foreground and background animations going
	at once) */
		// Start animations
		sideSwoosh('.borderLineL', '.borderLineRight');
		topBottomSwoosh('.borderLineB', '.borderLineRight');
	}
	else {
	// If the foreground isn't selected or the background is selected: stop the background animations
		// Stop animations
		$('.borderLineL.borderLineRight, .borderLineR.borderLineRight, .borderLineT.borderLineRight, .borderLineB.borderLineRight').stop(true); // stopall=true
		resetAnimationState(".borderLineRight");
	}

	// Check if we can enable the Gumpify button - only when both images are both selected and segmented
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
		$('#gumpifyButton').prop('disabled', false); // TODO: replace false with true here to ensure button is disable when no images uploaded
		// Style the text and circles to grey
		$('#gumpifyPane').css({color: 'rgb(135,135,135)'});
		$('.cornerCircleStep3').css({"background-color": 'rgb(135,135,135)'});
		// Set text
		if (fg_selected && bg_selected) $('#Step3').text("Step 3... (just a sec, we're processing your images)");
		else 							$('#Step3').text("Step 3 ...");
		// Stop the gumpify animations	
		$('.borderLineL.borderLineStep3, .borderLineR.borderLineStep3, .borderLineT.borderLineStep3, .borderLineB.borderLineStep3').stop(true); // stopall=true
		resetAnimationState(".borderLineStep3");
	}
}