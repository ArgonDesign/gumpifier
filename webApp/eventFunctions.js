var fg_original_pos;
var fg_original_scale;
var fg_img_pos;
var fg_img_scale;
var bg_loaded = false;
var fg_loaded = false;
var selectedLayerDiv;

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
	// Hide screen 1; unhide screen 2
	$('#content-screen1').hide();
	$('#content-screen2').css("display", "flex");
	// Change the title location to the top of the rectangles
	$('.vCenterPane').css({"justify-content": 'flex-start'});
	// Provide a loading message
	$('#vCenterPaneLeftTitle').text("Loading...");
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
				// Force initialize colourState
				colourState.initialize(data.colour_correction.brightness, data.colour_correction.white_balance, 6000);
				$('#brightnessSlider').val(data.colour_correction.brightness);
				$('#whiteBalanceSlider').val(6000);
				// Load images
				loadImageSegments(data.BG_segment_URLs, data.FG_cutout_URL, data.layer, data.BG_mask_URLs);
			}
		},
		dataType: "json", // Could omit this because jquery correctly guesses JSON anyway
		error: function(xhr, status, error) {
			console.log(status);
			console.log(error);
		}
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
		bigusDivus.hover(showMasks, hideMasks);

		if (i == 0) var onLoadFn = function() {bg_loaded = true; windowScale()}
		else		var onLoadFn = function() {}

		// === Background image
		var div = packageImageInDiv(onLoadFn,							// onLoadFn
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

	// ===Insert the foreground image (do in 'reverse': add divs first, then image)
	// Create the containing divs
	var outerDiv = $("<div />", {"id": "resultForeground", "class": "result"});
	outerDiv.hover(showMasks, hideMasks);
	var innerDiv = $("<div />", {"id": "resultForegroundInner"});
	var dragDiv = $("<div />", {"id": "resultForegroundDragDiv"});
	var widgetDiv = $("<div />", {"id": "resultForegroundWidgets"});

	// The image must have pointer events for dragging but the containing div must not to allow click through to background layers
	innerDiv.css({"pointer-events": "none"});
	outerDiv.css({"pointer-events": "none"});
	widgetDiv.css({"pointer-events": "none"});

	// Make the drag div draggable
	dragDiv.draggable({scroll: false});
	dragDiv.on("dragstop", function(event, ui) {
		var bg = $('#first');
		var bgWidth = bg.width();
		var bgHeight = bg.height();
		var bgX = bg.position().left;
		var bgY = bg.position().top;
		var offsetH = parseInt($('#resultForegroundDragDiv>.ui-wrapper').css("left"));
		var offsetV = parseInt($('#resultForegroundDragDiv>.ui-wrapper').css("top"));

		// ui.position.{top,left} is the current CSS position of the helper, according to API linked above
		fg_img_pos = [(ui.position.left + offsetH)/bgWidth, (ui.position.top + offsetV)/bgHeight];

		return true;
	});
	dragDiv.on("drag", function(event, ui) { // Drag the widgets at the same time
		var offsetH = parseInt($('#resultForegroundDragDiv>.ui-wrapper').css("left"));
		var offsetV = parseInt($('#resultForegroundDragDiv>.ui-wrapper').css("top"));
		$('#resultForegroundWidgets').css({top: (ui.position.top + offsetV), left: (ui.position.left + offsetH)});
	});
	$(dragDiv).css({"pointer-events": "auto"});
	// dragDiv.css({"position": "absolute"});

	// Add image and wigets to div
	innerDiv.append(dragDiv);
	outerDiv.append(innerDiv);
	outerDiv.append(widgetDiv);

	// Add div in correct place in pane
	var selector = '#resultPane>.resultBackground:eq('+layer+')';
	$(outerDiv).insertAfter(selector);

	// Add scale icons
	widgetDiv.append($('<div />', {"id": "BRCornerScaleDiv"}));
	widgetDiv.append($('<div />', {"id": "RCornerScaleDiv"}));
	widgetDiv.append($('<div />', {"id": "TRCornerScaleDiv"}));
	widgetDiv.append($('<div />', {"id": "TCornerScaleDiv"}));
	widgetDiv.append($('<div />', {"id": "TLCornerScaleDiv"}));
	widgetDiv.append($('<div />', {"id": "LCornerScaleDiv"}));
	widgetDiv.append($('<div />', {"id": "BLCornerScaleDiv"}));
	widgetDiv.append($('<div />', {"id": "BCornerScaleDiv"}));

	// Load the image and call windowScale to convert it to a canvas and add to the appropriate div
	hiddenImg = new Image(); // Yuck, global variable
	hiddenImg.onload = function() {
		fg_loaded = true;
		var c = createForegroundCanvas()
		dragDiv.append(c);
		cJQobject = $(c);
		windowScale();  // Both this and the call below are necessary.
		// Make canvas resizable
		cJQobject.resizable({
			alsoResize: "#resultForegroundWidgets",
			handles: "all",
			start: function(event, ui) {
				// https://stackoverflow.com/questions/3699125/jquery-ui-resize-only-one-handle-with-aspect-ratio
				if ($(event.originalEvent.target).attr('class').match(/\b(ui-resizable-se|ui-resizable-sw|ui-resizable-ne|ui-resizable-nw)\b/)) {
					cJQobject.resizable("option", "aspectRatio", true).data('uiResizable')._aspectRatio = true;
				}
			},
			resize: function(event, ui) {
				// Se the intrinsic dimenstions of the canvas
				document.getElementById('foregroundImage').width = ui.size.width;
				document.getElementById('foregroundImage').height = ui.size.height;
				// Set the new scale
				var bg = $('#first');
				var bgWidth = bg.width();
				var bgHeight = bg.height();
				fg_img_scale[0] = ui.size.width / bgWidth;
				fg_img_scale[1] = ui.size.height / bgHeight;
				// Set position
				var dragLeft = parseInt($("#resultForegroundDragDiv").css("left"));
				var dragTop = parseInt($('#resultForegroundDragDiv').css("top"));
				fg_img_pos[0] = ((dragLeft + ui.position.left)/bgWidth);
				fg_img_pos[1] = ((dragTop + ui.position.top)/bgHeight);
				// Redraw
				colourState.applyState();
				scaleAndPositionWidgetDiv();
			},
			stop: function(event, ui) {
				cJQobject.resizable("option", "aspectRatio", false).data('uiResizable')._aspectRatio = false;
			}
		});
		windowScale(); // Both this and the call above are necessary.
		colourState.initApply();
	}
	hiddenImg.src = FG_cutout_URL;
}

function createForegroundCanvas() {
	// Create a canvas
	var c = document.createElement("canvas");

	// Set some attributes
	c.id = "foregroundImage";

	// Draw the image
	var ctx = c.getContext("2d");

	// Make draggable
	var cJQobject = $(c);
	cJQobject.on("mousedown", function(event) {getAndTriggerClickedImage(event, this);});

	return c;
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

	// Set the intrinsic and extrinsic dimensions of the fg image
	document.getElementById('foregroundImage').width = bgWidth * fg_img_scale[0];
	document.getElementById('foregroundImage').height = bgHeight * fg_img_scale[1];
	$('#foregroundImage').css({width: bgWidth * fg_img_scale[0], height: bgHeight * fg_img_scale[1]});

	// Set the position of the fg image.  API notes a potential problem with user zooming in.
	var bgX = bg.position().left;
	var bgY = bg.position().top;
	fg.css({top: 0, left: 0, right: 0, bottom: 0});
	fgResizeDiv = $('#resultForegroundDragDiv>.ui-wrapper');
	var offsetH = parseInt(fgResizeDiv.css("left"));
	var offsetV = parseInt(fgResizeDiv.css("top"));
	fgDragDiv = $('#resultForegroundDragDiv');
	fgDragDiv.css({top: fg_img_pos[1]*bgHeight - offsetV, left: fg_img_pos[0]*bgWidth - offsetH});

	// Now for the widget div
	scaleAndPositionWidgetDiv();
}

function scaleAndPositionWidgetDiv() {
	var fg = $('#foregroundImage');
	var bg = $('#first');
	var bgWidth = bg.width();
	var bgHeight = bg.height();
	// Set the location and scale of the widget box
	$("#resultForegroundWidgets").css({	top: fg_img_pos[1]*bgHeight,
										left: fg_img_pos[0]*bgWidth,
										width: fg.width(),
										height: fg.height()});
	// Set the location of the grabable scale buttons
	var scaleHandleDim = "10px"; // Change this if the CSS changes
	var bottom = "calc(100% - "+scaleHandleDim+")";
	var right = "calc(100% - "+scaleHandleDim+")";
	$("#BRCornerScaleDiv").css({top: bottom, left: right});
	$("#RCornerScaleDiv").css({top: "50%", left: right});
	$("#TRCornerScaleDiv").css({top: 0, left: right});
	$("#TCornerScaleDiv").css({top: 0, left: "50%"});
	$("#TLCornerScaleDiv").css({top: 0, left: 0});
	$("#LCornerScaleDiv").css({top: "50%", left: 0});
	$("#BLCornerScaleDiv").css({top: bottom, left: 0});
	$("#BCornerScaleDiv").css({top: bottom, left: "50%"});
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
	// var fgPane = $('#containerForeground');
	// fgPane.css({top: bgY - fgHeight,
	// 			left: bgX - fgWidth,
	// 			width: bgWidth + 2*fgWidth,
	// 			height: bgHeight + 2*fgHeight});

	// Set the dimensions and position of resultForeground to make foreground overflowing background hidden
	var resultForeground = $('#resultForeground');
	resultForeground.css({top: bgY, left: bgX, width: bgWidth, height: bgHeight});
}

// We must scale and position the fg image when the window is resized
function windowScale(possibleEvent) {
	if (possibleEvent != null) {
		if (possibleEvent.target.classList != null) {
			// But returning because a bogus event was passed
			return;
		}
		// The event passed was a genuine window resize
	}
	// Check if both the fg and bg images have loaded before trying to proceed
	if (!(fg_loaded && bg_loaded)) {
		return;
	}

	// Position and scaling
	scaleAndPositionForeground();
	setForegroundPane();

	// Draw the foreground image onto the canvas
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
	$('#resultPane').prepend($('#first').parent().parent())
}

function bringToFrontButton() {
	$('#resultForeground').after(selectedLayerDiv);
	$('#resultPane').prepend($('#first').parent().parent())
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
		"original_BG_URL": original_BG_URL,
		"colour_correction": {
			"brightness": colourState.brightness,
			"white_balance": colourState.whiteBalance
		}
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

function showMasks() {
	$('.mask').css('visibility', 'visible');
	$('#resultForegroundWidgets').css('visibility', 'visible');
}

function hideMasks() {
	$('.mask').css('visibility', 'hidden');
	$('#resultForegroundWidgets').css('visibility', 'hidden');
}

function toggleFinalImage() {
	checked = document.getElementById('finalImageCheckbox').checked;
	if (checked)	finalImage.style.visibility = "visible";
	else			finalImage.style.visibility = "hidden";
}

function editButtonFn() {
	var toToggle = $('#editCommands');
	if (toToggle.css("visibility") == "hidden") {
		toToggle.css("visibility", "visible");
	}
	else {
		toToggle.css("visibility", "hidden");	
	}
}

function changeImagesFn() {
	// Unhide screen 1; hide screen 2
	$('#content-screen1').css("display", "flex");
	$('#content-screen2').hide();
	// Reset title location to original
	$('.vCenterPane').css({"justify-content": 'center'});
	// Reset screen 2 to original
	$('.resultBackground, #resultForeground').remove();
}

// === Probably remove
function resetPositionButton() {
	fg_img_pos = fg_original_pos.slice();
	windowScale();
}

function resetScaleButton() {
	fg_img_scale = fg_original_scale.slice();
	windowScale();
}