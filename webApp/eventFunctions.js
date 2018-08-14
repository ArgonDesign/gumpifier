var fg_original_pos;
var fg_original_scale;
var fg_img_pos;
var fg_img_scale;
var bg_loaded = false;
var fg_loaded = false;
var selectedLayerDiv;
var overlay_pos = [0, 0];
var overlay_scale = [0.9, 0.1];

// Closure to represent the urls of the example images used
var exampleImageState = (function() {
	// Define which images we'll use for the example grid
	var foregroundExampleURLs = [	"SharedResources/ExampleImages/FG_Poirot.jpg",
									"SharedResources/ExampleImages/FG_Patrick.jpg",
									"SharedResources/ExampleImages/FG_Mohammed.jpg",
									"SharedResources/ExampleImages/WIN_20180730_15_36_57_Pro.jpg"];
	var backgroundExampleURLs = [	"SharedResources/ExampleImages/BG_bikes.jpg",
									"SharedResources/ExampleImages/BG_bench_oblique.jpg",
									"SharedResources/ExampleImages/BG_lamp.jpg",
									"SharedResources/ExampleImages/BG_zebras.png"];
	// Set the background-image CSS properties of the example divs to the above background images
	$(document).ready(function() {
		var toSetLeft = $(".grid-item.left");
		for (var i = 0; i < toSetLeft.length; i++) $(toSetLeft[i]).css("backgroundImage", "url("+foregroundExampleURLs[i]+")");
		var toSetRight = $(".grid-item.right");
		for (var i = 0; i < toSetRight.length; i++) $(toSetRight[i]).css("backgroundImage", "url("+backgroundExampleURLs[i]+")");
	});

	// Return some functions to access state in the closure
	return {
		getForegroundURL: function(i) {return foregroundExampleURLs[i]},
		getBackgroundURL: function(i) {return backgroundExampleURLs[i]}
	}
})()

function uploadPictureFn(form, fg) {
	// Submit the form
	form.ajaxSubmit(function(data) {
		// We can't get the path to the local file via the form because of security limitations
		// so we download the file uploaded to the server.
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

function chooseExamplePictureFn(event, fg) {
	var egNumber = parseInt(event.target.classList[1].slice(-1)) - 1;
	if (fg) {
		fg_segmented = false;
		var url = exampleImageState.getForegroundURL(egNumber);
		var toSend = {'fg_url': url};
		$.ajax({
			type: "POST",
			url: "cgi-bin/exampleImage.py",
			data: toSend,
			success: function(data) {
				set_fg_true(url);
			},
			error: function(xhr, status, error) {
				console.log(status);
				console.log(error);
			}
		});
	}
	else	{
		bg_segmented = false;
		var url = exampleImageState.getBackgroundURL(egNumber);
		var toSend = {'bg_url': url};
		$.ajax({
			type: "POST",
			url: "cgi-bin/exampleImage.py",
			data: toSend,
			success: function(data) {
				set_bg_true(url);
			},
			error: function(xhr, status, error) {
				console.log(status);
				console.log(error);
			}
		});
	}
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
				colourState.initialize(data.colour_correction.brightness, data.colour_correction.white_balance);
				$('#brightnessSlider').val(data.colour_correction.brightness);
				$('#whiteBalanceSlider').val(6000);
				// Load images
				loadImageSegments(data.BG_segment_URLs, data.FG_cutout_URL, data.layer, data.BG_mask_URLs, data.quotation);
				// Set instructions list text
				var foundList = $('#foundList');
				for (var url in data.labels) {
					var toAppend = $('<li />');
					toAppend.text(data.labels[url].name + " (" + Math.round(parseFloat(data.labels[url].confidence)*100) + "% confidence)");
					foundList.append(toAppend);
				}
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

function loadImageSegments(BG_segment_URLs, FG_cutout_URL, layer, BG_mask_URLs, quotation) {
	// Precondition: BG_segment_URLs.length = BG_mask_URLs.length + 1

	// === Insert background images and masks
	for (var i = 0; i<BG_segment_URLs.length; i++) {
		// === Overall containing div
		if (i <= layer) var bigusDivus = $("<div />", {"class": "resultBackground behind"});
		else			var bigusDivus = $("<div />", {"class": "resultBackground"});
		bigusDivus.hover(showMasks, hideMasks);

		if (i == 0) var onLoadFn = function() {bg_loaded = true; initWhenImagesLoaded();}
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
	$('.backgroundImage:eq(0)').attr('id', 'first'); // DO NOT change the id from "first" - stuff relies on it!

	// === Insert the foreground image (do in 'reverse': add divs first, then image)
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
	dragDiv.on("dragstart", function(event, ui) {
		undoManager.initUndoEvent(new moveUndo(fg_img_pos, function() {
			this.newPosition = fg_img_pos.slice();
		}));
	});
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
	widgetDiv.append($('<div />', {"id": "BRCornerScaleDiv", "class": "ui-resizable-handle ui-resizable-se"}));
	widgetDiv.append($('<div />', {"id": "RCornerScaleDiv", "class": "ui-resizable-handle ui-resizable-e"}));
	widgetDiv.append($('<div />', {"id": "TRCornerScaleDiv", "class": "ui-resizable-handle ui-resizable-ne"}));
	widgetDiv.append($('<div />', {"id": "TCornerScaleDiv", "class": "ui-resizable-handle ui-resizable-n"}));
	widgetDiv.append($('<div />', {"id": "TLCornerScaleDiv", "class": "ui-resizable-handle ui-resizable-nw"}));
	widgetDiv.append($('<div />', {"id": "LCornerScaleDiv", "class": "ui-resizable-handle ui-resizable-w"}));
	widgetDiv.append($('<div />', {"id": "BLCornerScaleDiv", "class": "ui-resizable-handle ui-resizable-sw"}));
	widgetDiv.append($('<div />', {"id": "BCornerScaleDiv", "class": "ui-resizable-handle ui-resizable-s"}));

	// Load the image and call windowScale to convert it to a canvas and add to the appropriate div
	hiddenImg = new Image(); // Yuck, global variable
	hiddenImg.onload = function() {
		fg_loaded = true;
		// Create a canvas
		var c = document.createElement("canvas");
		c.id = "foregroundImage";
		var cJQobject = $(c);
		cJQobject.on("mousedown", function(event) {getAndTriggerClickedImage(event, this);});

		dragDiv.append(c);
		initWhenImagesLoaded();
	}
	hiddenImg.src = FG_cutout_URL;

	// === Add the overlay text
	var overlayTextContainer = $('<div />', {"id": "overlayTextContainer"});
	var overlayTextDiv = $('<div />', {"id": "overlayTextDiv"});
	var overlayTextDragIcon = $('<div />', {"id": "overlayTextDragIcon", "data-html2canvas-ignore": "true"});
	var overlayText = $('<textarea />', {"id": "overlayText"});
	
	// Apply randomly generated quotation text and find appropriate dimensions for the textbox
	// Uses technique here: https://www.impressivewebs.com/textarea-auto-resize/
	$('#first').on("load", function() {
		overlayText.val(quotation);
		var clone = $('<div />', {"id": "clone"});
		$('body').append(clone);
		clone.css({fontSize: (0.086 * $('#first').height()) + "px", "width": 0.9 * $('#first').width()});
		clone.text(quotation);
		overlay_scale[1] = clone.height()/$('#first').height();
		scaleAndPositionOverlayText();
		clone.remove();
	});

	overlayText.on("focus", function() {
		undoManager.initUndoEvent(new textUndo(overlayText.val(), function() {
			this.newText = overlayText.val();
		}));
	});
	overlayTextDiv.draggable();
	overlayTextDiv.on("dragstart", function() {
		undoManager.initUndoEvent(new textMoveUndo(overlay_pos, function() {
			var bg = $('#first');
			this.newPosition[0] = overlay_pos[0];
			this.newPosition[1] = overlay_pos[1];
		}));
	});
	overlayTextDiv.on("dragstop", function() {
		var bg = $('#first');
		overlay_pos[0] = parseInt(overlayTextDiv.css("left").slice(0,-2))/bg.width();
		overlay_pos[1] = parseInt(overlayTextDiv.css("top").slice(0,-2))/bg.height();
	});
	overlayTextDiv.hover(showMasks, hideMasks);

	overlayTextDiv.append(overlayTextDragIcon);
	overlayTextDiv.append(overlayText);
	overlayTextContainer.append(overlayTextDiv);
	$('#resultPane').append(overlayTextContainer);

	overlayText.resizable({
		handles: "se",
		start: function(event, ui) {
			undoManager.initUndoEvent(new textScaleUndo(overlay_scale.slice(), function() {
							this.newScale = overlay_scale.slice();
						}));
		},
		resize: function(event, ui) {
			var newWidth = ui.originalSize.width + ((ui.size.width - ui.originalSize.width) * 2);

			var bg = $('#first');
			overlay_scale[0] = newWidth/bg.width();
			overlay_scale[1] = ui.size.height/bg.height();
			scaleAndPositionOverlayText();
		}
	});
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
		// var url;
		// Clicked a segmented part
		if (img.classList.contains("backgroundImage") && $(img).attr("id") != "first") {
			// Set the URL
			// url = img.src;
			// Toggle behind vs in front of foreground
			imgGrandparentJQ = $(img).parent().parent();
			if (imgGrandparentJQ.hasClass("behind")) {
				imgGrandparentJQ.removeClass("behind");
				bringToFrontButton();
				// Initialise undo event
				undoManager.initUndoEvent(new toggleLayerUndo(true, selectedLayerDiv, function() {}));
			}
			else {
				imgGrandparentJQ.addClass("behind");
				sendBehindButton();
				// Initialise Undo event
				undoManager.initUndoEvent(new toggleLayerUndo(false, selectedLayerDiv, function() {}));
			}
		}
		// Clicked the foreground image or the very background image
		else {
			// Set the URL
			// url = hiddenImg.src;
		}
		// $('#currentLayerPreviewContainer').css({
		// 	"background-image": "url(" + url + ")"
		// });
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
	$('#resultForegroundWidgets>.ui-resizable-handle').css({width: scaleHandleDim, height: scaleHandleDim});
	$("#BRCornerScaleDiv").css({top: bottom, left: right});
	$("#RCornerScaleDiv").css({top: "50%", left: right});
	$("#TRCornerScaleDiv").css({top: 0, left: right});
	$("#TCornerScaleDiv").css({top: 0, left: "50%"});
	$("#TLCornerScaleDiv").css({top: 0, left: 0});
	$("#LCornerScaleDiv").css({top: "50%", left: 0});
	$("#BLCornerScaleDiv").css({top: bottom, left: 0});
	$("#BCornerScaleDiv").css({top: bottom, left: "50%"});
}

function scaleAndPositionOverlayText() {
	var overlayText = $('#overlayText');
	var overlayTextUI = $('#overlayTextDiv>.ui-wrapper');
	var overlayTextDiv = $('#overlayTextDiv');

	var bg = $('#first');
	var bgWidth = bg.width();
	var bgHeight = bg.height();

	// Set location of the draggable div
	overlayTextDiv.css({left: (overlay_pos[0]*bgWidth) + "px", top: (overlay_pos[1]*bgHeight) + "px"});

	// Set the scale
	overlayText.width(overlay_scale[0]*bgWidth);
	overlayText.height(overlay_scale[1]*bgHeight);
	overlayTextUI.width(overlay_scale[0]*bgWidth);
	overlayTextUI.height(overlay_scale[1]*bgHeight);

	// Set the font size
	overlayText.css({fontSize: (0.086 * bgHeight) + "px"});
}

function reassertNormality() {
	/* When resizing the foreground (esp. towards the left or top), the image and the containing draggable div are
	offset from each other.  We want them to line up to click events go to the correct place.  We could try
	setting the CSS for the draggable div s.t. 'display: inline' or display: 'inline-block'.  Or, we call this
	function on stop resize to re-align the image and the draggable div */
	var image = $('#resultForegroundDragDiv>.ui-wrapper');
	var imageTop = image.position().top;
	var imageLeft = image.position().left;
	var imageWidth = image.width();
	var imageHeight = image.height();

	var dragDiv = $('#resultForegroundDragDiv');
	var dragDivTop = dragDiv.position().top;
	var dragDivLeft = dragDiv.position().left;

	dragDiv.css({top: dragDivTop + imageTop,
				left: dragDivLeft + imageLeft,
				width: imageWidth,
				height: imageHeight});
	image.css({top: 0, left: 0});
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

	// Size the instruction text
	var resultForeground = $('#resultForeground');
	$('#instructions').css({top: resultForeground.position().top + $('#vCenterPaneLeftTitle').height(),
						left: resultForeground.position().left,
						width: resultForeground.width(),
						height: resultForeground.height()});


	// Size the overlayTextContainer in a similar fashion
	var overlayTextContainer = $('#resultForeground');
	$('#overlayTextContainer').css({top: resultForeground.position().top,
									left: resultForeground.position().left,
									width: resultForeground.width(),
									height: resultForeground.height()});

	// Size the text
	scaleAndPositionOverlayText();
}
window.onresize = windowScale;

function initWhenImagesLoaded() {
	if (!(fg_loaded && bg_loaded)) {
		return;
	}

	windowScale();  // Both this and the call below are necessary.
	// Make canvas resizable
	cJQobject = $('#foregroundImage');
	cJQobject.resizable({
		alsoResize: "#resultForegroundWidgets",
		// handles: "all",
		handles: {
			se: $('#BRCornerScaleDiv'),
			e: $('#RCornerScaleDiv'),
			ne: $('#TRCornerScaleDiv'),
			n: $('#TCornerScaleDiv'),
			nw: $('#TLCornerScaleDiv'),
			w: $('#LCornerScaleDiv'),
			sw: $('#BLCornerScaleDiv'),
			s: $('#BCornerScaleDiv')
		},
		start: function(event, ui) {
			// https://stackoverflow.com/questions/3699125/jquery-ui-resize-only-one-handle-with-aspect-ratio
			if ($(event.originalEvent.target).attr('class').match(/\b(ui-resizable-se|ui-resizable-sw|ui-resizable-ne|ui-resizable-nw)\b/)) {
				cJQobject.resizable("option", "aspectRatio", true).data('uiResizable')._aspectRatio = true;
			}
			// Initialise undo event
			undoManager.initUndoEvent(new scaleUndo(fg_img_scale, fg_img_pos, function() {
				this.newScale = fg_img_scale.slice();
				this.newPosition = fg_img_scale.slice();
			}));
		},
		resize: function(event, ui) {
			// Set the intrinsic dimenstions of the canvas
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
			reassertNormality();
		}
	});
	windowScale(); // Both this and the call above are necessary.
	reassertNormality();
}

/* === Event handlers for the commands pane === */
function sendBehindButton() {
	$('#resultForeground').before(selectedLayerDiv);
	$('#resultPane').prepend($('#first').parent().parent());
}

function bringToFrontButton() {
	$('#resultForeground').after(selectedLayerDiv);
	$('#resultPane').prepend($('#first').parent().parent());
}

function downloadButtonFn() {
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
					html2canvas(document.getElementById('overlayTextContainer'), {backgroundColor: null}).then(function(textCanvas) {
						ctx.globalCompositeOperation = "source-over";
						ctx.drawImage(textCanvas, 0, 0);
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
							link.click();
						});
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

function showMasks() {
	$('.mask').css('visibility', 'visible');
	$('#resultForegroundWidgets').css('visibility', 'visible');
	$('#overlayTextDiv>.ui-wrapper').css({borderStyle: "solid"});
	$('#overlayTextDragIcon').css('visibility', 'visible');
}

function hideMasks() {
	$('.mask').css('visibility', 'hidden');
	$('#resultForegroundWidgets').css('visibility', 'hidden');
	$('#overlayTextDiv>.ui-wrapper').css({borderStyle: "none"});
	$('#overlayTextDragIcon').css('visibility', 'hidden');
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
	$('.resultBackground, #resultForeground, #overlayTextContainer').remove();
	$('#foundList').empty();
	$('#instructions').show();
	undoManager.clearHistory();
}

function gotItFn() {
	$('#instructions').hide();
}

function keyPressed(e) {
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

// === Probably remove
function resetPositionButton() {
	fg_img_pos = fg_original_pos.slice();
	windowScale();
}

function resetScaleButton() {
	fg_img_scale = fg_original_scale.slice();
	windowScale();
}