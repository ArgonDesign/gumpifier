var fg_original_pos;
var fg_original_scale;
var fg_img_pos;
var fg_img_scale;
var bg_loaded = false;
var fg_loaded = false;
var selectedLayerDiv;

// This closure represents the state for the colour sliders.
var colourState = (function() {
	var brightness = 0;
	var whiteBalance = 8000;
	function applyState() {
		Caman(document.getElementById('foregroundImage'), function() {
			this.revert(false);
			this.brightness(brightness);
			this.whiteBalance(whiteBalance);
			this.render();
		})
	}
	return {
		setBrightness: function(newBrightness) {brightness = newBrightness; applyState()},
		setWhiteBalance: function(newWhiteBalance) {whiteBalance = newWhiteBalance; applyState();},
		applyState: applyState
	}
})();

function uploadPictureFn(form, fg) {
	// Submit the form
	form.ajaxSubmit(function(data) {
		// We can't get the path to the local file via the form because of security limitations
		// so we download the uploaded file to the server.
		if (fg) fg_segmented = false;
		else	bg_segmented = false;
		data = data.slice(0,-1); // Remove the training \n character
		if (data != "ERROR") {
			if (fg) set_fg_true(data);
			else	set_bg_true(data);
		}
		else {
			if (fg) set_fg_false();
			else	set_bg_false();
		}
	});
	// Return false to prevent normal browser submit and page navigation
	return false;
}

function gumpifyFn() {
	// Load the new UI
	$('.content').load('screen2.html', function() {
		// Change the title location to the top of the rectangles
		$('.vCenterPane').css({"justify-content": 'flex-start'});
		// Switch the flex-grow properties for the viewing and command pane
		$('#circlePaneLeft').css({"flex-grow": 7});
		$('#circlePaneRight').css({"flex-grow": 3});
		// Provide a loading message
		$('#vCenterPaneLeftTitle').text("Loading...");
		bindScreen2Functions();
		// Once UI is loaded it's now safe to send the AJAX request to the server and load the images
		$.ajax({
			type: "POST",
			url: "cgi-bin/getScreen2Data.py",
			data: {	"fg_url": fg_url,
					"bg_url": bg_url},
			success: function(data) {
				if (data.hasOwnProperty("ERROR")) {
					$('#resultPane').text("Something went wrong!");
					console.log(data.ERROR);
				}
				else {
					$('#vCenterPaneLeftTitle').text("Your Gumpified Image");
					fg_img_pos = data.position;
					fg_img_scale = data.scale;
					// We must create copies
					fg_original_pos = data.position.slice();
					fg_original_scale = data.scale.slice();
					loadImageSegments(data.BG_segment_URLs, data.FG_cutout_URL, data.layer, data.BG_mask_URLs);
				}
			},
			dataType: "json", // Could omit this because jquery correctly guesses JSON anyway
			error: function(xhr, status, error) {
				console.log(status);
				console.log(error);
			}
		});
	});
}

// Auxillary functions for the above
function packageImageInDiv(onLoadFn, src, classes, onMouseDownFn, divClasses) {
	// Generate the new image
	var tmpImg = new Image();
	// Add the onLoadFn
	tmpImg.onload = onLoadFn;
	// Add src, class and onMouseDownFn
	tmpImg.src = src;
	$(tmpImg).addClass(classes);
	$(tmpImg).on("mousedown", function(event) {onMouseDownFn(event, this);});
	// Create the div
	var div = $("<div />", {"class": divClasses})
	// Add image to div
	div.append(tmpImg);
	// Return the div
	return div;
}
function loadImageSegments(BG_segment_URLs, FG_cutout_URL, layer, BG_mask_URLs) {
	// Precondition: BG_segment_URLs.length = BG_mask_URLs.length + 1

	// === Insert background images and masks
	for (i = 0; i<BG_segment_URLs.length; i++) {
		// === Overall containing div
		if (i <= layer) var bigusDivus = $("<div />", {"class": "resultBackground behind"});
		else			var bigusDivus = $("<div />", {"class": "resultBackground"});
		bigusDivus.hover(hideFinalImage, showFinalImage);

		if (i == 0) var onLoadFn = function() {bg_loaded = true; windowScale()}
		else		var onLoadFn = function() {}

		// === Background image
		var div = packageImageInDiv(function() {bg_loaded = true; windowScale();},	// onLoadFn
												BG_segment_URLs[i],					// src
												"backgroundImage",					// classes
												getAndTriggerClickedImage,			// onMouseDownFn
												"resultBackgroundInner");			// divClasses
		// Add image div to outer div
		bigusDivus.append(div);

		// === Mask
		if (i != 0) {
			var div = packageImageInDiv(function() {},						// onLoadFn
										BG_mask_URLs[i-1],					// src
										'backgroundImage mask',				// classes
										function() {},						// onMouseDownfn
										'resultBackgroundInner maskDiv')	// divClasses
			// Add mask div to outer div
			bigusDivus.append(div);
		}
		// === Add outer div to pane
		$('#resultPane').append(bigusDivus);
	}
	// Set the id of the first background image
	$('.backgroundImage:eq(0)').attr('id', 'first');

	// ===Insert the foreground image
	// Create a canvas
	var c = document.createElement("canvas");

	// Set some attributes
	c.id = "foregroundImage";

	// Draw the image
	var ctx = c.getContext("2d");
	hiddenImg = new Image(); // Yuck, global variable
	hiddenImg.onload = function() {
		fg_loaded = true;
		windowScale();
		// Some test Caman things
		// Caman(c, function(){
		// 	this.brightness(10);
		// 	this.contrast(30);
		// 	this.sepia(60);
		// 	this.saturation(-38);
		// 	this.render();
		// });
	}
	hiddenImg.src = FG_cutout_URL;

	// Make draggable
	cJQobject = $(c);
	cJQobject.draggable({containment: "#containerForeground", scroll: false});
	cJQobject.on("dragstop", function(event, ui) {
		var bg = $('#first');
		var bgWidth = bg.width();
		var bgHeight = bg.height();
		var bgX = bg.position().left;
		var bgY = bg.position().top;

		// ui.position.{top,left} is the current CSS position of the helped, according to API linked above
		fg_img_pos = [(ui.position.left)/bgWidth, (ui.position.top)/bgHeight];

		// Set values of the spinners to match.
		document.getElementById('xPosSpinner').value = fg_img_pos[0];
		document.getElementById('yPosSpinner').value = fg_img_pos[1];
		document.getElementById('xScaleSpinner').value = fg_img_scale[0];
		document.getElementById('yScaleSpinner').value = fg_img_scale[1];

		return true;
	});
	cJQobject.css({"position": "absolute"});
	cJQobject.on("mousedown", function(event) {getAndTriggerClickedImage(event, this);});

	tmpImg = c;
	tmpImgJQobject = cJQobject;

	// Create the containing divs
	var outerDiv = $("<div />", {"id": "resultForeground", "class": "result"});
	outerDiv.hover(
		function() {
			hideFinalImage();
		},
		function() {
			showFinalImage();
		});
	var innerDiv = $("<div />", {"id": "resultForegroundInner"});

	// The image must have pointer events for dragging but the containing div must not to allow click through to background layers
	$(tmpImgJQobject).css({"pointer-events": "auto"});
	$(innerDiv).css({"pointer-events": "none"});
	$(outerDiv).css({"pointer-events": "none"});

	// Add image and scale icon icon to div
	innerDiv.append(tmpImg);
	outerDiv.append(innerDiv);

	// Add div in correct place in pane
	var selector = '#resultPane>.resultBackground:eq('+layer+')';
	$(outerDiv).insertAfter(selector);
}

function getAndTriggerClickedImage(event, img) {
	// https://stackoverflow.com/questions/38487569/click-through-png-image-only-if-clicked-coordinate-is-transparent
	var ctx = document.createElement("canvas").getContext("2d");	
	var co = cumulativeOffset(img)
	var x = event.pageX - co.left,
		y = event.pageY - co.top,
		w = ctx.canvas.width = img.width,
		h = ctx.canvas.height = img.height,
		alpha;

	// We may have clicked on a background image, or the foreground canvas, get the alpha in a different way depending
	if (img.classList.contains("backgroundImage")) {
		console.log("bg");
		ctx.drawImage(img, 0, 0, w, h); // This should work even if img is a canvas (i.e. the foreground)
		alpha=ctx.getImageData(x, y, 1, 1).data[3]; // 3=alpha
	}
	else { // We're dealing with the foreground canvas
		console.log("fg");
		alpha=img.getContext("2d").getImageData(x, y, 1, 1).data[3];
	}

	// Clickthrough
	if (alpha===0) {
		$(img).parent().parent().hide();
		// $(img).parent().parent().css({"pointer-events": "none"}); // Click through: https://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements?rq=1

		var nextElement = document.elementFromPoint(event.clientX, event.clientY);

		$(nextElement).trigger(event);

		$(img).parent().parent().show();
		var grandparent = $(img).parent().parent();
		// grandparent.css({"pointer-events": "auto"});
	}
	// Click this layer
	else {
		selectedLayerDiv = $(img).parent().parent();
		var url;
		// Clicked a segmented part
		if (img.classList.contains("backgroundImage")) {
			// Set the URL
			url = img.src;
			// Toggle behind vs in front of foreground
			imgGrandparentJQ = $(img).parent().parent();
			if (imgGrandparentJQ.hasClass("behind")) {
				imgGrandparentJQ.removeClass("behind");
				bringToFrontButton();
			}
			else {
				imgGrandparentJQ.addClass("behind");
				sendBehindButton();
			}
		}
		// Clicked the foreground image
		else {
			// Set the URL
			url = hiddenImg.src;
		}
		$('#currentLayerPreviewContainer').css({
			"background-image": "url(" + url + ")"
		});
	}
}

function cumulativeOffset(element) {
	// https://stackoverflow.com/questions/1480133/how-can-i-get-an-objects-absolute-position-on-the-page-in-javascript
	var top = 0, left = 0;
	do {
		top += element.offsetTop || 0;
		left += element.offsetLeft || 0;
		element = element.offsetParent;
	} while(element);
	return {
		top: top,
		left: left
	};
}

function scaleAndPositionForeground() {
	// Get the fg and bg images and the width and height of the bg image
	var fg = $('#foregroundImage');
	var bg = $('#first');

	var bgWidth = bg.width();
	var bgHeight = bg.height();

	// Set the intrinsic (and extrinsic?) dimensions of the fg image
	document.getElementById('foregroundImage').width = bgWidth * fg_img_scale[0];
	document.getElementById('foregroundImage').height = bgHeight * fg_img_scale[1];

	// Set the position of the fg image.  API notes a potential problem with user zooming in.
	var bgX = bg.position().left;
	var bgY = bg.position().top;
	fg.css({top: fg_img_pos[1]*bgHeight, left: fg_img_pos[0]*bgWidth});
}

function setForegroundPane() {
	// Get some necessary variables
	var fg = $('#foregroundImage');
	var bg = $('#first');
	var bgX = bg.position().left;
	var bgY = bg.position().top;
	var bgWidth = bg.width();
	var bgHeight = bg.height();
	var fgWidth = fg.width();
	var fgHeight = fg.height();

	// Set the dimensions and position of the container to constrain the FG draggable area
	var fgPane = $('#containerForeground');
	fgPane.css({top: bgY - fgHeight,
				left: bgX - fgWidth,
				width: bgWidth + 2*fgWidth,
				height: bgHeight + 2*fgHeight});

	// Set the minimum and maximum position values for the number spinners.  Use the same values as for the draggable area
	var xPosSpinner = document.getElementById('xPosSpinner');
	var yPosSpinner = document.getElementById('yPosSpinner');
	var xScaleSpinner = document.getElementById('xScaleSpinner');
	var yScaleSpinner = document.getElementById('yScaleSpinner');
	xPosSpinner.min = -fgWidth/bgWidth;
	yPosSpinner.min = -fgHeight/bgHeight;
	xPosSpinner.value = fg_img_pos[0];
	yPosSpinner.value = fg_img_pos[1];
	xScaleSpinner.value = fg_img_scale[0];
	yScaleSpinner.value = fg_img_scale[1];

	// Set the dimensions and position of resultForeground to make foreground overflowing background hidden
	var resultForeground = $('#resultForeground');
	resultForeground.css({top: bgY, left: bgX, width: bgWidth, height: bgHeight});
}

// We must scale and position the fg image when the window is resized
function windowScale() {
	// Check if both the fg and bg images have loaded before trying to proceed
	if (!(fg_loaded && bg_loaded)) {
		return;
	}

	scaleAndPositionForeground();
	setForegroundPane();

	// Draw the foreground image onto the canvas
	var w = document.getElementById('foregroundImage').width; // Using JQuery here doesn't work for some reason
	var h = document.getElementById('foregroundImage').height;
	var ctx = document.getElementById('foregroundImage').getContext("2d");
	ctx.drawImage(hiddenImg, 0, 0, w, h);
	colourState.applyState();

	// Size the finalResult image
	var resultForeground = $('#resultForeground');
	$('#finalImage').css({top: resultForeground.position().top + $('#vCenterPaneLeftTitle').height(),
						left: resultForeground.position().left,
						width: resultForeground.width(),
						height: resultForeground.height()});
}
window.onresize = windowScale;

/* === Event handlers for the commands pane === */
function sendBehindButton() {
	$('#resultForeground').before(selectedLayerDiv);
	$('#first').parent().parent().insertAfter($('#containerForeground'));
}

function bringToFrontButton() {
	$('#resultForeground').after(selectedLayerDiv);
	$('#first').parent().parent().insertAfter($('#containerForeground'));
}

function postProcessFn() {
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
		"FG_cutout_URL": FG_cutout_URL,
		"layer" : layer,
		"position": position,
		"scale" : scale,
		"original_BG_URL": original_BG_URL
	};

	console.log(toSend);

	// Send the data to the server
	$.ajax({
		type: "POST",
		url: "cgi-bin/getFinalImage.py",
		data: JSON.stringify(toSend),
		success: function(data) {
			if (data.hasOwnProperty("ERROR")) {
				$('#resultPane').text("Something went wrong!");
				$('#finalImage').remove();
				console.log(data.ERROR);
			}
			else {
				$('#finalImage').remove()
				// Generate a new image
				var tmpImg = new Image()
				// Add the src and class
				tmpImg.onload = function() {
					windowScale();
				}
				tmpImg.src = data;
				tmpImg.id = 'finalImage';

				// Add image
				$('#vCenterPaneLeft').append(tmpImg);
			}
		},
		dataType: "json",
		error: function(xhr, status, error) {
			console.log(status);
			console.log(error);
		}
	});
}

function hideFinalImage() {
	document.getElementById('finalImage').style.visibility = "hidden";
	$('.mask').css('visibility', 'visible');
}

function showFinalImage() {
	document.getElementById('finalImage').style.visibility = "visible";
	$('.mask').css('visibility', 'hidden');
}

function brightnessSliderFn() {
	newBrightness = $('#brightnessSlider').val();
	colourState.setBrightness(newBrightness);
};

function whiteBalanceSliderFn() {
	newWhiteBalance = $('#whiteBalanceSlider').val();
	colourState.setWhiteBalance(newWhiteBalance);
};

function resetPositionButton() {
	fg_img_pos = fg_original_pos.slice();
	windowScale();
}

function resetScaleButton() {
	fg_img_scale = fg_original_scale.slice();
	windowScale();
}

/* === Potentially old functions which may be removed === */
function changePositionSpinner() {
	fg_img_pos[0] = parseFloat(document.getElementById('xPosSpinner').value);
	fg_img_pos[1] = parseFloat(document.getElementById('yPosSpinner').value);
	windowScale();
}

function changeScaleSpinnerX() {
	if (document.getElementById('scaleLink').checked){
		var newX = parseFloat(document.getElementById('xScaleSpinner').value);
		var newY = parseFloat(document.getElementById('xScaleSpinner').value) * (fg_img_scale[1]/fg_img_scale[0]) // newY = newX * (oldY/oldX)
		fg_img_scale[0] = newX;
		fg_img_scale[1] = newY;
	}
	else {
		fg_img_scale[0] = document.getElementById('xScaleSpinner').value;
		
	}
	windowScale();
}

function changeScaleSpinnerY() {
	if (document.getElementById('scaleLink').checked){
		var newY = parseFloat(document.getElementById('yScaleSpinner').value);
		var newX = parseFloat(document.getElementById('yScaleSpinner').value) * (fg_img_scale[0]/fg_img_scale[1]) // newX = newY * (oldX/oldY)
		fg_img_scale[0] = newX;
		fg_img_scale[1] = newY;	
	}
	else {
		fg_img_scale[1] = document.getElementById('yScaleSpinner').value;	
		
	}
	windowScale();
}

function newButton() {
	location.reload();
}