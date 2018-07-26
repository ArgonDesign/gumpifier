// Event handler for the upload foreground button
$(document).ready(function() {
	// Attach handler to form's submit event
	$('#foregroundForm').submit(function() {
		// Submit the form
		$(this).ajaxSubmit(function(data) {
			// We can't get the path to the local file via the form because of security limitations
			// so we download the uploaded file to the server.
			if (data.slice(0,-1) != "ERROR") {
				set_fg_true(data);
			}
			else {
				set_fg_false();
			}
		});
		// Return false to prevent normal browser submit and page navigation
		return false;
	});

	// Auto-submit when a file is chosen
	$('#foregroundUploadButton').change(function() {
		$('#foregroundForm').submit();
	});
});

// Event handler for the upload background button
$(document).ready(function() {
	// Attach handler to form's submit event
	$('#backgroundForm').submit(function() {
		// Submit the form
		$(this).ajaxSubmit(function(data) {
			// We can't get the path to the local file via the form because of security limitations
			// so we download the uploaded file to the server.
			if (data.slice(0,-1) != 'ERROR') {
				set_bg_true(data);
			}
			else {
				set_bg_false();
			}
		});
		// Return false to prevent normal browser submit and page navigation
		return false;
	});

	// Auto-submit when a file is chosen
	$('#backgroundUploadButton').change(function() {
		$('#backgroundForm').submit();
	});
});


// Event handler for the Gumpify button
var fg_original_pos;
var fg_original_scale;
var fg_img_pos;
var fg_img_scale;
var bg_loaded = false;
var fg_loaded = false;
// var selectedLayer;
var selectedLayerDiv;
$(document).ready(function() {
	$('#gumpifyButton').click(function() {
		// Load the new UI
		$('.content').load('screen2.html', function() {
			// Change the title location to the top of the rectangles
			$('.vCenterPane').css({"justify-content": 'flex-start'});
			// Switch the flex-grow properties for the viewing and command pane
			$('#circlePaneLeft').css({"flex-grow": 7});
			$('#circlePaneRight').css({"flex-grow": 3});
			// Once UI is loaded it's now safe to send the AJAX request to the server and load the images
			$.ajax({
				type: "POST",
				url: "cgi-bin/getScreen2Data.py",
				data: {	"fg_url": fg_url,
						"bg_url": bg_url},
				success: function(data) {
					fg_img_pos = data.position;
					fg_img_scale = data.scale;
					// We must create copies
					fg_original_pos = data.position.slice();
					fg_original_scale = data.scale.slice();
					loadImageSegments(data.BG_segment_URLs, data.FG_cutout_URL, data.layer);
				},
				dataType: "json", // Could omit this because jquery correctly guesses JSON anyway
				error: function(xhr, status, error) {
					console.log(status);
					console.log(error);
				}
			});
		});
	});
});

// Auxillary functions for the above
function loadImageSegments(BG_segment_URLs, FG_cutout_URL, layer) {
	// === Insert background images
	var first_bg_added = false
	BG_segment_URLs.forEach(function(element) {
		// Generate a new image
		var tmpImg = new Image()
		// If first image, add appropriate handler
		if (!first_bg_added) {
			tmpImg.onload = function() {
				bg_loaded = true;
				windowScale();
			};
			first_bg_added = true;
		}
		// Add the src and class
		tmpImg.src = element;
		$(tmpImg).addClass('backgroundImage');
		$(tmpImg).on("mousedown", function(event) {getClickedImage(event, this);});

		// Create the containing div
		var div = $("<div />", {"class": 'resultBackground'});

		// Add image to div
		div.append(tmpImg);

		// Add div to pane
		$('#resultPane').append(div);
	});
	$('.backgroundImage:eq(0)').attr('id', 'first');

	// ===Insert the foreground image
	// Generator new image
	var tmpImg = new Image();
	tmpImg.onload = function() {
		fg_loaded = true;
		windowScale();
	};
	// Add the src and id
	tmpImg.src = FG_cutout_URL;
	tmpImg.id = "foregroundImage";

	// Make draggable
	tmpImgJQobject = $(tmpImg);
	tmpImgJQobject.draggable({containment: "#containerForeground", scroll: false});
	tmpImgJQobject.on("dragstop", function(event, ui) { // http://api.jqueryui.com/draggable/#event-stop
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
	tmpImgJQobject.css({"position": "absolute"});

	tmpImgJQobject.on("mousedown", function(event) {getClickedImage(event, this);});
	

	// Create the containing div
	var div = $("<div />", {"id": "resultForeground"});

	// The image must have pointer events for dragging but the containing div must not to allow click through to background layers
	$(tmpImgJQobject).css({"pointer-events": "auto"});
	$(div).css({"pointer-events": "none"});

	// Add image and scale icon icon to div
	div.append(tmpImg);

	// Add div in correct place in pane
	var selector = '#resultPane>.resultBackground:eq('+layer+')';
	$(div).insertAfter(selector);
}


function getClickedImage(event, img) {
	// https://stackoverflow.com/questions/38487569/click-through-png-image-only-if-clicked-coordinate-is-transparent
	var ctx = document.createElement("canvas").getContext("2d");	
	var co = cumulativeOffset(img)
	var x = event.pageX - co.left,
		y = event.pageY - co.top,
		w = ctx.canvas.width = img.width,
		h = ctx.canvas.height = img.height,
		alpha;

	ctx.drawImage(img, 0, 0, w, h);
	alpha=ctx.getImageData(x, y, 1, 1).data[3]; // 3=alpha

	if (alpha===0) {
		$(img).parent().hide();
		$(img).parent().css({"pointer-events": "none"}); // Click through: https://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements?rq=1

		var nextElement = document.elementFromPoint(event.clientX, event.clientY);

		$(nextElement).trigger(event);

		$(img).parent().show();
		var parent = $(img).parent()
		parent.css({"pointer-events": "auto"});
	}
	else {
		// document.getElementById('currentLayerPreview').src = img.src;
		$('#currentLayerPreviewContainer').css({
			"background-image": "url(" + img.src + ")"
		});
		selectedLayerDiv = $(img).parent();
		// console.log(img.src + " was clicked");
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

	// Set the dimensions of the fg image
	fg.width(bgWidth * fg_img_scale[0]);
	fg.height(bgHeight * fg_img_scale[1]);

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
}
window.onresize = windowScale;

/* === Event handlers for the commands pane === */
function resetPositionButton() {
	fg_img_pos = fg_original_pos.slice();
	windowScale();
}

function resetScaleButton() {
	fg_img_scale = fg_original_scale.slice();
	windowScale();
}

function changePositionSpinner() {
	fg_img_pos[0] = document.getElementById('xPosSpinner').value;
	fg_img_pos[1] = document.getElementById('yPosSpinner').value;
	windowScale();
}

function changeScaleSpinnerX() {
	if (document.getElementById('scaleLink').checked){
		var newX = document.getElementById('xScaleSpinner').value;
		var newY = document.getElementById('xScaleSpinner').value * (fg_img_scale[1]/fg_img_scale[0]) // newY = newX * (oldY/oldX)
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
		var newY = document.getElementById('yScaleSpinner').value;
		var newX = document.getElementById('yScaleSpinner').value * (fg_img_scale[0]/fg_img_scale[1]) // newX = newY * (oldX/oldY)
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

function sendBehindButton() {
	$('#resultForeground').before(selectedLayerDiv);
	$('#first').parent().insertAfter($('#containerForeground'));
}

function bringToFrontButton() {
	$('#resultForeground').after(selectedLayerDiv);
	$('#first').parent().insertAfter($('#containerForeground'));
}

function postProcessButton() {
	// Bundle up data
	var BG_segment_URLs = new Array();
	$('.backgroundImage').each(function(index) {
		BG_segment_URLs.push($(this).attr('src')); // 'this' refers to the current element.  We use $(this).attr('src') instead of this.src to give relative, not absolute, paths
	});
	var FG_cutout_URL = $('#foregroundImage').attr('src');
	var layer = $(".resultBackground, #resultForeground").index($('#resultForeground')) - 1;
	var position = fg_img_pos;
	var scale = fg_img_scale;

	var toSend = {
		"BG_segment_URLs": BG_segment_URLs,
		"FG_cutout_URL": FG_cutout_URL,
		"layer" : layer,
		"position": position,
		"scale" : scale
	};

	// Send the data to the server
	$.ajax({
		type: "POST",
		url: "cgi-bin/getFinalImage.py",
		data: JSON.stringify(toSend),
		success: function(data) {
			console.log("Success");
		},
		dataType: "json",
		error: function(xhr, status, error) {
			console.log(status);
			console.log(error);
		}
	});	
}