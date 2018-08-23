/*****************************************************************************
Argon Design Ltd. Project P8010 Spock
(c) Copyright 2018 Argon Design Ltd. All rights reserved.

Author : Patrick Taylor
*******************************************************************************/

/*
This file tracks the state of the first screen.  Enables/disables the gumpify button,
shows the selection pane or selected image, all with respect to what the user has done.
*/


/*
Some global tracking state
*/
var tmpBGimg = new Image();
var tmpFGimg = new Image();
var fg_selected = false;
var bg_selected = false;
var fg_segmented = false;
var bg_segmented = false;
var fg_url = "storage/Poirot_cutout_256x256.PNG";
var bg_url = "storage/Street_256x256.JPG";
var isTouchscreen;

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
			- bg_selected && fg_selected && fg_segmented && bg_segmented
	*/

	if (fg_selected) {
	// If the foreground is selected: stop animations, and display selected image
		// Set the image to display if necessary
		if (fg_changed) {
			$('#option1Right').css({"display": "none"});
			$('#option2Right').css({"display": "flex"});
			// Set internal state
			fg_url = data;
			console.log(fg_url);
			// Load the image
			tmpFGimg.onload = function() {
				$('#opt2ImageRight').css("background-image", "url(\""+tmpFGimg.src+"\")");	
				checkSegmentation('fg_url');
			};
			tmpFGimg.src = data;
		}
		// Set colour of box
		$('#uploadForeground').css("background-color", "rgb(237, 237, 237)");
	}
	else {
	// If the foreground isn't selected: reset the form, show the selection pane, set animations going
		// Reset the form
		document.getElementById("foregroundForm").reset();
		// Revert layout
		$('#option1Right').css({"display": "block"});
		$('#option2Right').css({"display": "none"});
		// Set colour of box
		$('#uploadForeground').css("background-color", "rgb(194, 145, 229)");
	}

	if (bg_selected) {
	// If the background image is selected: display the image
		// Set the image to display if necessary
		if (bg_changed) {
			$('#option1Left').css({"display": "none"});
			$('#option2Left').css({"display": "flex"});
			// Set internal state
			bg_url = data;
			// Load the background image
			tmpBGimg.onload = function() {
				$('#opt2ImageLeft').css("background-image", "url(\""+tmpBGimg.src+"\")");	
				checkSegmentation('bg_url');
			};
			tmpBGimg.src = data;
		}
		// Set colour of box
		$('#uploadBackground').css("background-color", "rgb(237, 237, 237)");
	}
	else {
	// If the background image isn't selected: reset the form, show the selection pane, set animations going
		// Reset the form
		document.getElementById("backgroundForm").reset();
		// Revert layout
		$('#option1Left').css({"display": "block"});
		$('#option2Left').css({"display": "none"});
		// Set colour of box
		$('#uploadBackground').css("background-color", "rgb(194, 145, 229)");
	}

	// Check if we can enable the Gumpify button - only when both images are both selected and segmented
	if (bg_selected && fg_selected && fg_segmented && bg_segmented) {
		// Enable the Gumpify button
		$('#gumpifyButton').click(gumpifyFn);
		// Style the button to an appropriate colour
		$('#gumpifyButton').css({"background-color": 'rgb(194, 145, 229)'});
		// Set cursor style
		$('#gumpifyButton').css("cursor", "pointer");
		// Set text
		$('#gumpifyButtonText').text("Gumpify!");
	}
	else {
		// Disable the Gumpify button
		$('#gumpifyButton').off();
		// Style the button to grey
		$('#gumpifyButton').css({"background-color": 'rgb(237,237,237)'});
		// Set cursor style
		$('#gumpifyButton').css("cursor", "not-allowed");
		// Set text
		if (fg_selected && bg_selected) $('#gumpifyButtonText').text("Just a min, we're processing your images");
		else 							$('#gumpifyButtonText').text("Upload images to Gumpify");
	}
}