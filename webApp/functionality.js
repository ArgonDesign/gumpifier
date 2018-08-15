/*****************************************************************************
Argon Design Ltd. Project P8010 Spock
(c) Copyright 2018 Argon Design Ltd. All rights reserved.

Author : Patrick Taylor
*******************************************************************************/

/*
This file contains most of the functionality for constructing and running screen 2.  There's a lot in it, but here's a
map of what's here:

== Initialization ==
Some global variable declarations
exampleImageState(...) - a closure representing information and functions about the example images

== High level functions called early on or throughout running ==
loadImageSegments(...) - constructs the viewer/editor area by loading the segment images and masks, the foreground
	image, setting the meme textarea, binding event handlers etc etc.
windowScale(...) - called at various points (e.g.s: during screen 2 construction; when the window is resized)
initWhenImagesLoaded(...) - run when both the foreground, and very background image, have both loaded.  Both are
	needed for sizing.

== Functions which are called often ==
scaleAndPositionForeground
setForegroundPane
scaleAndPositionWidgetDiv
scaleAndPositionOverlayText

== Functions which are bound to events ==
getAndTriggerClickedImage - works out what segement image of foreground image the user has clicked
sendBehind - sends a segment behind the foreground
bringToFront - brings a segment in front of the foreground
showMasks - shows masks, foreground bounding box/scale icons, textarea border when the main area is hovered over
hideMasks - reverse of the above
reassertNormality - explained below, but makes draggable() and resizable() on foreground play nicely.

== Auxillary functions ==
packageImageInDiv
cumulativeOffset
*/

/* ===========
Initialization
============*/

/*
Set global state:
 - *_pos and *_scale variables are both Array(2) and represent a fraction of the size of the background image.
 	E.g. [0.5, 1.0] is half the width of the background image and the full height.
*/
var fg_original_pos;				// Copy of the original position of the foreground
var fg_original_scale;				// Copy of the original scale of the foreground
var fg_img_pos;						// Current position of the foreground
var fg_img_scale;					// Current scale of the foreground
var bg_loaded = false;				// Has the very background image loaded
var fg_loaded = false;				// Has the foreground image loaded
var selectedLayerDiv;				// The last clicked segment
var overlay_pos = [0, 0];			// Position of the meme textarea.  It's centered horizontally so [0,0] means center
var overlay_scale = [0.9, 0.1];		// Scale of the meme textarea

/* Closure to represent the urls of the example images used.  Exposes the following API:
	- getForegroundURL(i: number) - returns the foreground URL at index i-1 in the array
	- getBackgroundAPI(i: number) - similar
*/
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
})();

/*========================================================
High level functions called early on or throughout running
========================================================*/
function loadImageSegments(BG_segment_URLs, FG_cutout_URL, layer, BG_mask_URLs, quotation) {
	/*
	Args:
		BG_segment_URLs: string Array - the URLs for the background segements images
		FG_cutout_URL: string - the URL for the foreground image
		BG_mask_URLs: string Array - the URLs for the background segement mask images
		quotation: string - the text for the meme textarea
	Precondition:
		BG_segment_URLs.length = BG_mask_URLs.length + 1
	Returns:
		None
	Operation:
		- Inserts the nested div structure for each background images and asssociated mask
		- Adds an onload function and id "first" to the very background image.  The background images are scalled using
		  css and the resulting size of the very background one is used a reference for other things.
		- Inserts the nested div structure for the foreground image and its 'widget box' (the div for the dashed 
		  outline and scaling handles). 
		- Binds event functions (e.g. clicking, dragging, hovering, resizing) or defers binding until both the very
		  background and foreground images have loaded.
		- Inserts the meme textarea.
		- Adds everything to the screen
	Notes:
		See the comments in the HTML file for the final structure that is created by this function.
	*/
	// === Insert background images and masks
	for (var i = 0; i<BG_segment_URLs.length; i++) {
		// === Overall containing div
		if (i <= layer) var bigusDivus = $("<div />", {"class": "resultBackground behind"});
		else			var bigusDivus = $("<div />", {"class": "resultBackground"});

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
	dragDiv.draggable({containment: $('#containerForeground'), scroll: false});
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

	// Add div in correct rank in pane
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

	// Undo event for overlay tet
	overlayText.on("focus", function() {
		undoManager.initUndoEvent(new textUndo(overlayText.val(), function() {
			this.newText = overlayText.val();
		}));
	});

	// Make overlay text draggable
	overlayTextDiv.draggable({containment: "parent"});
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

	// Show and hide masks etc when hovered on overlay text
	overlayTextDiv.hover(showMasks, hideMasks);

	// Create overlay text div structure and add
	overlayTextDiv.append(overlayTextDragIcon);
	overlayTextDiv.append(overlayText);
	overlayTextContainer.append(overlayTextDiv);
	$('#resultPane').append(overlayTextContainer);

	// Make overlay text JQueryUI resizable (default resiable implementation does not allow capture of resize events)
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

// We must scale and position the fg image when the window is resized
function windowScale(possibleEvent) {
	/*
	Args:
		[possibleEvent]: resize event - sometimes an event is passed, sometimes we call manually without an event
	Returns:
		None
	Operation:
		- If the event is not a window resize, return
		- If both the foreground and very background iamge havn't loaded, return.
		- Scale and position relevent overlays with respect to the very background image
	*/
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

function initWhenImagesLoaded() {
	/*
	Args:
		None
	Returns:
		None
	Operation:
		- If both the foreground and very background iamge havn't loaded, return.
		- Make the foreground image resizable.
	*/
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
				this.newPosition = fg_img_pos.slice();
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

/*==============================
Functions which are called often
==============================*/
function scaleAndPositionForeground() {
	// Get the fg and bg images and the width and height of the bg image
	var fg = $('#foregroundImage');
	var bg = $('#first');
	var bgWidth = bg.width();
	var bgHeight = bg.height();

	var finalWidth = fg_img_scale[0] * bgWidth;
	var finalHeight = fg_img_scale[1] * bgHeight;

	// Set the intrinsic and extrinsic dimensions of the fg image canvas
	document.getElementById('foregroundImage').width = finalWidth;
	document.getElementById('foregroundImage').height = finalHeight;
	$('#foregroundImage').css({width: finalWidth, height: finalHeight});

	// Set the scales for the resize and drag divs
	$('#resultForegroundDragDiv>.ui-wrapper').css({width: finalWidth, height: finalHeight});
	$('#resultForegroundDragDiv').css({width: finalWidth, height: finalHeight});

	// Set the position of the fg image.  API notes a potential problem with user zooming in.
	var bgX = bg.position().left;
	var bgY = bg.position().top;
	fgDragDiv = $('#resultForegroundDragDiv');
	fgDragDiv.css({top: fg_img_pos[1] * bgHeight, left: fg_img_pos[0] * bgWidth});

	// Now for the widget div
	scaleAndPositionWidgetDiv();
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
	var containerForeground = $('#containerForeground');
	var leeway = 0.01 * Math.max(bgWidth, bgHeight); // 1% of the largest background dimension keeps windowScale happy
	containerForeground.css({top: bgY - fgHeight + leeway,
				left: bgX - fgWidth + leeway,
				width: bgWidth + 2*fgWidth - 2*leeway,
				height: bgHeight + 2*fgHeight - 2*leeway});

	// Set the dimensions and position of resultForeground to make foreground overflowing background hidden
	var resultForeground = $('#resultForeground');
	resultForeground.css({top: bgY, left: bgX, width: bgWidth, height: bgHeight});
}

function scaleAndPositionWidgetDiv() {
	/*
	The widget div shows the dashed outline and scale handles for the foreground.
	*/
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
	var scaleHandleDim = parseInt($('#resultForegroundWidgets>.ui-resizable-handle').css("width").slice(0,-2));
	var halfScaleHandleDim = scaleHandleDim/2;
	var bottom = "calc(100% - "+halfScaleHandleDim+"px)";
	var right = "calc(100% - "+halfScaleHandleDim+"px)";
	var left = (-halfScaleHandleDim) + "px";
	var top = (-halfScaleHandleDim) + "px";
	$('#resultForegroundWidgets>.ui-resizable-handle').css({width: scaleHandleDim + "px", height: scaleHandleDim + "px"});
	$("#BRCornerScaleDiv").css({top: bottom, left: right});
	$("#RCornerScaleDiv").css({top: "50%", left: right});
	$("#TRCornerScaleDiv").css({top: top, left: right});
	$("#TCornerScaleDiv").css({top: top, left: "50%"});
	$("#TLCornerScaleDiv").css({top: top, left: left});
	$("#LCornerScaleDiv").css({top: "50%", left: left});
	$("#BLCornerScaleDiv").css({top: bottom, left: left});
	$("#BCornerScaleDiv").css({top: bottom, left: "50%"});
}

function scaleAndPositionOverlayText() {
	// Get the necessary divs
	var overlayText = $('#overlayText');
	var overlayTextUI = $('#overlayTextDiv>.ui-wrapper');
	var overlayTextDiv = $('#overlayTextDiv');

	// Get the background width and height
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

/*=================================
Functions which are bound to events
=================================*/
function getAndTriggerClickedImage(event, img) {
	/*
	Args:
		event - the click event
		img: JQuery object - the image clicked on
	Returns:
		None
	Operation:
		This function works out what has been clicked on (the foreground, a background segment, of the very background)
		We do this by percollating click events backwards, calling this function recursively, until the click event
		occurs on an non-transparent pixel.  We work out transparency by converting to a canvas and getting the pixel
		data from that.
		See: https://stackoverflow.com/questions/38487569/click-through-png-image-only-if-clicked-coordinate-is-transparent
	*/
	// Create a canvas, and get some necessary coordinates
	var ctx = document.createElement("canvas").getContext("2d");	
	var co = cumulativeOffset(img)
	var x = event.pageX - co.left,
		y = event.pageY - co.top,
		w = ctx.canvas.width = img.width,
		h = ctx.canvas.height = img.height,
		alpha;

	// We may have clicked on a background image, or the foreground canvas, get the alpha in a different way depending
	if (img.classList.contains("backgroundImage")) {
	// We're dealing with a background image so convert to canvas
		console.log("bg");
		ctx.drawImage(img, 0, 0, w, h); // This should work even if img is a canvas (i.e. the foreground)
		alpha=ctx.getImageData(x, y, 1, 1).data[3]; // 3=alpha
	}
	else {
	// We're dealing with the foreground canvas so take immediate from its canvas
		console.log("fg");
		alpha=img.getContext("2d").getImageData(x, y, 1, 1).data[3];
	}

	// Either percolate the click backwards or take the necessary click action on the current layer
	if (alpha===0) {
	// Percolate the click backwards
		$(img).parent().parent().hide();
		// $(img).parent().parent().css({"pointer-events": "none"}); // Click through: https://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements?rq=1

		var nextElement = document.elementFromPoint(event.clientX, event.clientY);

		$(nextElement).trigger(event);

		$(img).parent().parent().show();
		var grandparent = $(img).parent().parent();
		// grandparent.css({"pointer-events": "auto"});
	}
	else {
	// Click on this layer so take necessary action
		selectedLayerDiv = $(img).parent().parent();
		// var url;
		if (img.classList.contains("backgroundImage") && $(img).attr("id") != "first") {
		// Clicked a segmented part
			// Set the URL
			// url = img.src;
			// Toggle behind vs in front of foreground
			imgGrandparentJQ = $(img).parent().parent();
			if (imgGrandparentJQ.hasClass("behind")) {
			// If the image is behing, flip to in front
				imgGrandparentJQ.removeClass("behind");
				bringToFront();
				// Initialise undo event
				undoManager.initUndoEvent(new toggleLayerUndo(true, selectedLayerDiv, function() {}));
			}
			else {
			// If the image is in front, flip to behind
				imgGrandparentJQ.addClass("behind");
				sendBehind();
				// Initialise Undo event
				undoManager.initUndoEvent(new toggleLayerUndo(false, selectedLayerDiv, function() {}));
			}
		}
		else {
		// Clicked the foreground image or the very background image
			// Set the URL
			// url = hiddenImg.src;
		}
		// $('#currentLayerPreviewContainer').css({
		// 	"background-image": "url(" + url + ")"
		// });
	}
}

function sendBehind() {
	/*
	Send the selected layer behind the foreground layer
	*/
	$('#resultForeground').before(selectedLayerDiv);
	$('#resultPane').prepend($('#first').parent().parent());
}

function bringToFront() {
	/*
	Set the selected layer behind the foreground layer
	*/
	$('#resultForeground').after(selectedLayerDiv);
	$('#resultPane').prepend($('#first').parent().parent());
}

function showMasks() {
	/*
	Show: the masks, the widget div and the meme textarea widgets
	*/
	$('.mask').css('visibility', 'visible');
	$('#resultForegroundWidgets').css('visibility', 'visible');
	$('#overlayTextDiv>.ui-wrapper').css({borderStyle: "solid"});
	$('#overlayTextDragIcon').css('visibility', 'visible');
}

function hideMasks() {
	/*
	Hide: the masks, the widget div and the meme textarea widgets
	*/
	$('.mask').css('visibility', 'hidden');
	$('#resultForegroundWidgets').css('visibility', 'hidden');
	$('#overlayTextDiv>.ui-wrapper').css({borderStyle: "none"});
	$('#overlayTextDragIcon').css('visibility', 'hidden');
}

function reassertNormality() {
	/*
	When resizing the foreground (esp. towards the left or top), the image and the containing draggable div are
	offset from each other.  We want them to line up so click events go to the correct place.  We could try
	setting the CSS for the draggable div s.t. 'display: inline' or display: 'inline-block'.  Or, we call this
	function on stop resize to re-align the image and the draggable div
	*/
	// Get some necessary variables
	var image = $('#resultForegroundDragDiv>.ui-wrapper');
	var imageTop = image.position().top;
	var imageLeft = image.position().left;
	var imageWidth = image.width();
	var imageHeight = image.height();

	var dragDiv = $('#resultForegroundDragDiv');
	var dragDivTop = dragDiv.position().top;
	var dragDivLeft = dragDiv.position().left;

	// Set the relative positions
	dragDiv.css({top: dragDivTop + imageTop,
				left: dragDivLeft + imageLeft,
				width: imageWidth,
				height: imageHeight});
	image.css({top: 0, left: 0});
}

/*=================
Auxillary functions
=================*/
function packageImageInDiv(onLoadFn, src, classes, onMouseDownFn, divClasses) {
	/*
	Args:
		onLoadFn: function - function to be run when the image loads
		src: string - the src for the image
		classes: string - the classes for the image
		onMouseDownFn: function - event to be bound to the image's mousedown handler
		divClasses: string - the classes for the containing div
	Returns:
		JQuery object - image packaged in a div.
	*/
	// Generate the new image
	var tmpImg = new Image();
	// Add the onLoadFn
	tmpImg.onload = onLoadFn;
	// Add src, class, onMouseDownFn and hover function to the image
	tmpImg.src = src;
	$(tmpImg).addClass(classes);
	$(tmpImg).on("mousedown", function(event) {onMouseDownFn(event, this);});
	$(tmpImg).hover(showMasks, hideMasks);
	// Create the div
	var div = $("<div />", {"class": divClasses})
	// Add image to div
	div.append(tmpImg);
	// Return the div
	return div;
}

function cumulativeOffset(element) {
	/*
	Used to find the offset of 'element' from the edges of the screen
	*/
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