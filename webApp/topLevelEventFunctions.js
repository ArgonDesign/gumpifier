/*****************************************************************************
Argon Design Ltd. Project P8010 Spock
(c) Copyright 2018 Argon Design Ltd. All rights reserved.

Module: Gumpifier
Author : Patrick Taylor
*******************************************************************************/

/*
This file implements the top level events bound in eventHandlers.js.  They are presented here in roughly chronological
of the actions the end-user will take.  Each has a description of its own, but here is a summary list:
 === Screen 1 ===
 - uploadPictureFn - called when the user uploads a picture of their own
 - checkSegmentation - called when the above functions return so we know when the images have been segmented
 - set_fg_false - calls the state tracker and sets that the foreground has not been selected.
 - set_fg_true - similar
 - set_bg_false - similar
 - set_bg_true = similar
 - gumpifyFn - called when the user presses the 'Gumpify' button.  Transitions to screen 2.

 === Screen 2 ===
 - downloadButtonFn - called when the user presses the 'Download button'.  Downloads their final image.
 - editButtonFn - called when the user presses 'Edit'.  Toggles visibility of colour correction sliders.
 - changeImagesFn - called when the user presses 'Change Images'.  Resets some state and transitions to screen 1.
 - clickThroughHover - called when the hover detector is clicked.  NOT USED.

 === General ===
 - keyPressed - called when a key is pressed.  Used to implement undo/redo key capture.
 - detectTouchscreen - called when the document loads, detects if the device is a touchscreen
 - showPrivacyNotice - function used to construct a closure used when the privacy notice/blog post needs to be shown
*/

function uploadPictureFn(form, fg) {
	/*
	Args:
		form - the hidden form for the image upload
		fg: bool - whether the image chosen is for the foreground or background
	Returns:
		false - to stop the default operation
	Operation:
		Sends AJAX request to server, uploading the image and telling the server to start procesing it.
		AJAX will return wil URL of uploaded image, which is then downloaded to be shown to the user.
		Modifies state and calls the state tracker.
	*/
	// Submit the form
	if (fg) {
		$("#prgsfg").remove();
		var progressDiv = $("<div />", {id: "prgsfg"})
		$("#uploadForeground").append(progressDiv)
	}
	else {
		$("#prgsbg").remove();
		var progressDiv = $("<div />", {id: "prgsbg"})
		$("#uploadBackground").append(progressDiv)
	}
	progressDiv.append("<br><span style='text-align: center; font-family: \"Lato\", sans-serif; display:block; float:none;'>Uploading your image...</span><br>")
	var loadingbar = $("<div />")
	progressDiv.append(loadingbar)
	loadingbar.progressbar({
		value: false
	}) 
	if (fg) fg_errorFlag = 0;
	else	bg_errorFlag = 0;
	form.ajaxSubmit(function(data) {
		console.log(data)
		if (fg) fg_segmented = false;
		else	bg_segmented = false;
		// We can't get the path to the local file via the form because of security limitations
		// so we download the file uploaded to the server.
		data = data.slice(0,-1); // Remove the training \n character
		if (data.slice(0,5) != "ERROR") {
			if (fg) set_fg_true(data);
			else	set_bg_true(data);
		}
		else {
			if (data.slice(6) == 'Filetype') {
				if (fg) {fg_errorFlag = 1; applyState(true, false, null);}
				else	{bg_errorFlag = 1; applyState(false, true, null);}

			}
			else if (data.slice(6) == 'No file uploaded') {
				if (fg) set_fg_false();
				else	set_bg_false();	
			}
		}
		setTimeout(function() { progressDiv.remove(); }, 750);
	});
	// Return false to prevent normal browser submit and page navigation
	return false;
}

function checkSegmentation(what) {
	/*
	Args:
		what: string - either 'fg_url' or 'bg_url'.  The image type of which we are checking the segmentation
	Returns:
		None
	Operation:
		chooseExamplePictureFn and uploadPictureFn both return immediately with the url of an image, but their
		segmentation is started in the background.  Segmentation must finish before the 'Gumpify' button is
		enabled.  This function sends an AJAX request to the server for a specific image: the request only
		returns when the image has finished segmenting.  When is does so, we call the state tracker.  Also deals
		with errors from the server.
	*/
	console.log("Check Segmentation called on " + what);
	// We now make another AJAX call with returns when the image has finished segmenting
	var toSend;
	if (what == 'fg_url') toSend = {'fg_url': $(tmpFGimg).attr("src")}
	else if (what == 'bg_url') toSend = {'bg_url': $(tmpBGimg).attr("src")}
	console.log(toSend);
	$.ajax({
		type: "POST",
		url: "cgi-bin/segCheck.py",
		data: toSend,
		success: function(data) {
				if (what == 'fg_url')	fg_segErr_flag = 0;
				else					bg_segErr_flag = 0;

				if (data.done.slice(0,5) == "ERROR") {
					console.log("There was an error in segmentation!");
					if (what == 'fg_url')	fg_segErr_flag = 1;
					else					bg_segErr_flag = 1; 
				}
				else {
					if (what == 'fg_url' && data.done == fg_url) fg_segmented = true;
					else if (what == 'bg_url' && data.done == bg_url ) bg_segmented = true;
				}
				applyState(false, false, null);
			},
		dataType: "json", // Could omit this because jquery correctly guesses JSON anyway
		error: function(xhr, status, error) {
			console.log(status);
			console.log(error);
		}
	});
}

/*
These functions are used above to call into the state tracker
Args:
	data: string - the url of the chosen image
Returns:
	None
Operation:
	See state tracker.
	set_bg_false and set_fg_false in reality cause no change.  These functions are called if the user presses 'cancel'
	on the upload form, or if the server returns a custom error.  Either way, we keep the currently selected photo
	if there is one, or stay in an unselected state.
*/
function set_fg_false(data) {applyState(true, false, data);}
function set_fg_true(data) {fg_selected = true; applyState(true, false, data);}
function set_bg_false(data) {applyState(false, true, data);}
function set_bg_true(data) {bg_selected = true; applyState(false, true, data);}

function gumpifyFn() {
	/*
	Args:
		None
	Returns:
		None
	Operation:
		This is a real powerhouse, especially in the auxillary functions it calls.  Overall, though, it sends and AJAX
		request to the server, which responds with a JSON blob.  This blob contains the mixture of primitive values and
		URLs which are required to construct screen 2.  The functions called when AJAX returns perform this
		construction.  The main function which does this is loadImageSegments(...).
	*/
	// Hide screen 1; unhide screen 2
	$('#content-screen1').hide();
	$('#content-screen2').css("display", "flex");
	changeScreens.showScreen2();
	// Change the title location to the top of the rectangles
	$('.vCenterPane').css({"justify-content": 'flex-start'});
	// Hide the header sub text and change height of header
	$('#headerSubText').hide()
	// Hide the canvas commands and download button until things have loaded
	$("#canvasCommands").css("visibility", "hidden") // To keep things from jumping around
	$("#downloadButton").hide()
	$('header').css("height", "10vh");
	// Provide a loading message
	$('#resultPaneOuter').prepend($('<div />', {"id": "loadingMessage"}));
	// Removes error messages if one appeared before
	$("#errorMessageDiv").remove();
	$('#loadingMessage').text("Loading...");
	// Once the basics of screen 2 have been set it's now safe to send the AJAX request to the server and load the
	// images
	$.ajax({
		type: "POST",
		url: "cgi-bin/getScreen2Data.py",
		data: {	"fg_url": fg_url,
				"bg_url": bg_url},
		success: function(data) {
			// Remove loading message
			$('#loadingMessage').remove();
			
			// Continue
			if (data.hasOwnProperty("ERROR")) {
				// If there's a custom error (not an http error), display a message to the user
				$('#resultPane').html($('<div />', {"id": "errorMessageDiv"}));
				console.log(data.ERROR.slice(0,9))
				if (data.ERROR.slice(0,9) == "No person")	$('#errorMessageDiv').text("We didn't detect any people in the foreground");
				else										$('#errorMessageDiv').text("Something went wrong!");
				console.log(data.ERROR);
			}
			else {
				// If AJAX succeeded:
				// Set some global state representing certain parts of the response
				$('#vCenterPaneLeftTitle').text("Your Gumpified Image");
				fg_img_pos = data.position;
				fg_img_scale = data.scale;
				// We must create copies
				fg_original_pos = data.position.slice();
				fg_original_scale = data.scale.slice();
				// Initialize colourState
				colourState.initialize(data.colour_correction.brightness, data.colour_correction.white_balance);
				$('#brightnessSlider').val(data.colour_correction.brightness);
				$('#whiteBalanceSlider').val(data.colour_correction.white_balance);
				// Load images and construct screen 2. Also shows the hidden buttons
				loadImageSegments(data.BG_segment_URLs, data.FG_cutout_URL, data.layer, data.BG_mask_URLs, data.quotation);

				// === Set and display instructions text
				// Set instructions list text
				var foundList = $('#foundList');
				var totalObjects = 0;
				for (var url in data.labels) {
					// Get name
					var name = data.labels[url].name
					// Capitalise first latter
					name = name.charAt(0).toUpperCase() + name.slice(1);
					// Get confidence
					var conf = Math.round(parseFloat(data.labels[url].confidence)*100);
					// Put together
					var appendText = name + ": " + conf + "% confident; "
					// Append to list
					var toAppend = $('<li />');
					toAppend.text(appendText);
					foundList.append(toAppend);
					// Increment totalObjects
					totalObjects++;
				}
				if (totalObjects == 1)	$('#singularOrPlural').text("object");
				else					$('#singularOrPlural').text("objects");
				$('#numberOfObjects').text(totalObjects);

				

				// === Set and display purple header instructions text
				// var foundList = $('#headerTextSub');
				// for (var url in data.labels) {
				// 	// Get name
				// 	var name = data.labels[url].name
				// 	// Capitalise first latter
				// 	name = name.charAt(0).toUpperCase() + name.slice(1);
				// 	// Get confidence
				// 	var conf = Math.round(parseFloat(data.labels[url].confidence)*100);
				// 	// Put together
				// 	var toAppend = name + ": " + conf + "% confident; "
				// 	// Append to list
				// 	foundList.text(foundList.text() + toAppend);
				// 	// Increment totalObjects
				// 	totalObjects++;
				// }
				// Remove the tailing "; " and replace with ".".
				// foundList.text(foundList.text().slice(0, -2) + ".");
				// Set the main heading text
				// if (totalObjects == 1)	word = " object";
				// else					word = " objects";
				// $('#headerTextMain').text("We've found " + totalObjects  + word + " in the background.  Click on the objects to send them forwards and back.")
				// // Show the appropriate header
				// $('#headerOption1').hide();
				// $('#headerOption2').show();
			}
		},
		dataType: "json", // Could omit this because jquery correctly guesses JSON anyway
		error: function(xhr, status, error) {
			console.log(status);
			console.log(error);
		}
	});
}

function downloadButtonFn() {
	/*
	Args:
		None
	Returns:
		None
	Operation:
		When the user presses the download button, we send their modifications to the server in an AJAX request, which
		does most of the processing of the final image.  When this returns, we must still layer on the meme text,
		which we do mostly using an external library (html2canvas), before setting the image downloading.
	*/
	var modal = $("<div>", {
		id: 'downloadModal',
	})
	modal.appendTo($("#containerForeground"))
	modal.dialog({
		open: function(event, ui) {
        	$(".ui-dialog-titlebar-close", ui.dialog | ui).hide();
		},
		create: function(e, ui) {
			$(this).dialog('widget')
				.find('.ui-dialog-titlebar')
				.removeClass('ui-corner-all')
				.addClass('ui-corner-top');
		},
		close: function(event, ui) { $(this).remove(); }, 
		closeOnEscape: false,
		draggable: false,
		show: "fadeIn",
		hide: "slideUp",
		modal: true,
		resizable: false,
		title: "Please wait..."
	})
	var containerDiv = $("<div>")
	containerDiv.appendTo(modal)
	$("<span style='text-align: center; font-family: \"Lato\", sans-serif; display:block; float:none;'>Generating your image...</span><br>").appendTo(containerDiv)
	var loadingBar = $("<div>")
	loadingBar.appendTo(containerDiv)
	loadingBar.progressbar({
		value: false
	}) 
	// Marshall the data
	var BG_segment_URLs = new Array();
	$('.backgroundImage').not('.mask').each(function(index) {
		BG_segment_URLs.push($(this).attr('src')); // 'this' refers to the current element.  We use $(this).attr('src') instead of this.src to give relative, not absolute, paths
	});
	var FG_cutout_URL = $(hiddenImg).attr('src');
	var layer = $(".resultBackground, #resultForeground").index($('#resultForeground'));
	var position = fg_img_pos;
	var scale = fg_img_scale;
	var original_BG_URL = bg_url;

	var toSend = {
		"BG_segment_URLs": BG_segment_URLs,
		"FG_cutout_URL": document.getElementById('foregroundImage').toDataURL("image/png"), // Gives the canvas data instead
		"layer" : layer,
		"position": position,
		"scale" : scale,
		"original_BG_URL": original_BG_URL,
		"colour_correction": {
			"brightness": parseFloat($('#brightnessSlider').val()),
			"white_balance": colorTemperatureToRgb($('#whiteBalanceSlider').val())
		}
	};

	console.log(toSend);
	var canvasPromise = html2canvas($('#overlayTextDiv>.ui-wrapper')[0], {backgroundColor: null})
	// Send the data to the server
	$.ajax({
		type: "POST",
		url: "cgi-bin/getFinalImage.py",
		data: JSON.stringify(toSend),
		success: function(data) {
			if (data.hasOwnProperty("ERROR")) {
				$('#resultPane').text("Something went wrong!");
				console.log(data.ERROR);
			}
			else {
				// Generate a new image
				var tmpImg = new Image()
				// What happens when the image loads
				tmpImg.onload = function() {
					// Create a canvas for the image to go on
					var canvas = document.createElement("canvas");
					// Set dimensions of canvas
					canvas.width = tmpImg.width;
					canvas.height = tmpImg.height;
					// Get the canvas context
					var ctx = canvas.getContext('2d');
					// Draw the result image to the canvas
					ctx.drawImage(tmpImg, 0, 0, tmpImg.width, tmpImg.height);
					// Add the meme-like text
					$('#overlayTextDiv>.ui-wrapper').css({borderStyle: "none"});
					// Completely detaching the ui resizable handles from the dom because it interferes with the canvas construction
					// It is much nicer than switching off all the event handlers and doesn't include an overlaying element
					var pos = $("#overlayTextWidgets").position()
					var overlayTextWidgetDiv = $("#overlayTextWidgets").detach();

					console.log(canvas.height)
					console.log(canvas.width)
					$.when(canvasPromise).then(function(textCanvas) {
						ctx.globalCompositeOperation = "source-over";
						var img = $('.backgroundImage').first()[0]
						var x = ((pos.left) / img.clientWidth) * img.naturalWidth;
						var y = ((pos.top) / img.clientHeight) * img.naturalHeight;

						// Resizing textCanvas proportionally
						var height = overlayTextWidgetDiv.height()
						var width = overlayTextWidgetDiv.width()

						var newWidth = (width / img.clientWidth) * img.naturalWidth;
						var newHeight = (height / img.clientHeight) * img.naturalHeight;
						
						ctx.drawImage(textCanvas, x, y, newWidth, newHeight);
						/*
						Some browsers (e.g. Edge) don't support canvas.toBlob, which is used below to download stuff.
						We use a polyfill to define a custom version.  See here:
						https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
						*/
						if (!HTMLCanvasElement.prototype.toBlob) {
						  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
						    value: function (callback, type, quality) {
						      var canvas = this;
						      setTimeout(function() {

						        var binStr = atob( canvas.toDataURL(type, quality).split(',')[1] ),
						            len = binStr.length,
						            arr = new Uint8Array(len);

						        for (var i = 0; i < len; i++ ) {
						          arr[i] = binStr.charCodeAt(i);
						        }

						        callback( new Blob( [arr], {type: type || 'image/png'} ) );

						      });
						    }
						  });
						}
						/* Download the image as per these links.  Chrome has a 2MB size limit (it would seem) on <a> download
						size, so we convert to a blob instead.
							-> https://jsfiddle.net/AbdiasSoftware/7PRNN/
							-> https://stackoverflow.com/questions/38781968/problems-downloading-big-filemax-15-mb-on-google-chrome
								-> https://stackoverflow.com/questions/36918075/is-it-possible-to-programmatically-detect-size-limit-for-data-url
						*/
						var link = $('<a />')[0];
						canvas.toBlob(function(blob){
							link.href = URL.createObjectURL(blob);
							link.download = "Gumpified.png";
							// We must add and remove the <a> from the DOM to allow clicking Firefox
							// https://stackoverflow.com/questions/32225904/programmatical-click-on-a-tag-not-working-in-firefox#
							console.log(link.href);
							link.setAttribute("type", "hidden");
							document.body.appendChild(link);
							link.click();
							link.remove();
						});
						$('#overlayTextDiv').after(overlayTextWidgetDiv);
						modal.dialog("close");
					});
				}
				// Add the src to set the processing going
				tmpImg.src = data;

			}
		},
		dataType: "json",
		error: function(xhr, status, error) {
			console.log(status);
			console.log(error);
		}
	});

}

function editButtonFn() {
	/*
	Args:
		None
	Returns:
		None
	Operation:
		Simply toggles the visibility of the colour correction sliders.
	*/
	var toToggle = $('#editCommands, #triangle');
	if (toToggle.css("visibility") == "hidden") {
		toToggle.css("visibility", "visible");
	}
	else {
		toToggle.css("visibility", "hidden");	
	}
}

function changeImagesFn() {
	/*
	Args:
		None
	Returns:
		None
	Operation:
		Clears the state of screen 2 and resets the view to screen 1.
	*/
	// Unhide screen 1; hide screen 2
	$('#content-screen1').css("display", "flex");
	$('#content-screen2').hide();
	changeScreens.showScreen1();
	// Reset the title bar
	$('#headerOption2').hide();
	$('#headerOption1').css("display", "flex");
	// Hide the header sub text and change height of header
	$('#headerSubText').show()
	$('header').css("height", "15vh");
	// Reset screen 2 to original
	$('.resultBackground, #resultForeground, #overlayTextContainer, #overlayTextPosition').remove();
	$('#foundList').empty();
	$('#instructions').hide();
	overlay_pos = [0.05, 0];
	overlay_scale = [0.9, 0.1];
	// $('#headerTextSub').text("");
	// Reset some state
	fg_loaded = false;
	bg_loaded = false;
	undoManager.clearHistory();
}

function clickThroughHover(event) {
	/*
	Args:
		event - the click event
	Returns:
		None
	Operation:
		Hides the hover detector and sends the click to an element behind before showing the detector again.
		Similar logic to when we click through alpha in the actual images (see getAndTriggerClickedImage())
	*/
	console.log(event);
	$('#hoverDetector').hide();
	var nextElement = document.elementFromPoint(event.clientX, event.clientY);
	$(nextElement).trigger(event);
	$('#hoverDetector').show();
}

function keyPressed(e) {
	/*
	Args:
		e - the key press event
	Returns:
		None
	Operation:
		Tests for Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y to implement undo and redo key combos.
	*/
	var key = e.which || e.keyCode;
	if (e.ctrlKey && e.shiftKey && key == 90) {
	// Ctrl+Shift+Z -> Redo.  Must come before Ctrl+Z otherwise captured!
		console.log("Redoing");
		undoManager.redo();
	}
	else if (e.ctrlKey && key == 90) {
	// Ctrl+Z -> Undo
		undoManager.undo();
	}
	else if (e.ctrlKey && key == 89) {
	// Ctrl+Y -> Redo
		undoManager.redo();
	}
}

function detectTouchscreen() {
	/*
	Args:
		None
	Returns:
		None
	Operation:
		See here update 2018 here:
		https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript/4819886#4819886
	*/
	var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
	var mq = function(query) {
		return window.matchMedia(query).matches;
	}
	if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
		return true;
	}
	// include the 'heartz' as a way to have a non matching MQ to help terminate the join
	// https://git.io/vznFH
	var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
	console.log(mq(query));
	isTouchscreen = mq(query);
}

var screen1;
var screen2;
var screenP;
var screenB;
var changeScreens;

var changeScreensFn = (function() {
	var screen1 = $('#content-screen1');
	var screen2 = $('#content-screen2');
	var screenP = $('#content-screenP');
	var screenB = $('#content-screenB');

	var currentlyShown = screen1;
	var lastNumberedScreen = screen1;

	function applyState() {
		currentlyShown.css("display", "flex");
		screen1.not(currentlyShown).hide();
		screen2.not(currentlyShown).hide();
		screenP.not(currentlyShown).hide();
		screenB.not(currentlyShown).hide();
	}

	return {
		showScreenP: function() {
			if (currentlyShown == screen1 || currentlyShown == screen2) lastNumberedScreen = currentlyShown;
			currentlyShown = screenP;
			applyState();
		},
		showScreenB: function() {
			if (currentlyShown == screen1 || currentlyShown == screen2) lastNumberedScreen = currentlyShown;
			currentlyShown = screenB;
			applyState();
		},
		showScreen1: function() {
			currentlyShown = screen1;
		},
		showScreen2: function() {
			currentlyShown = screen2;
		},
		returnFromLetter: function() {
			currentlyShown = lastNumberedScreen;
			applyState();
		},
		peek: function() {
			console.log(currentlyShown, lastNumberedScreen);
		}
	};
});