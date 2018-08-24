/*****************************************************************************
Argon Design Ltd. Project P8010 Spock
(c) Copyright 2018 Argon Design Ltd. All rights reserved.

Module: Gumpifier
Author : Patrick Taylor
*******************************************************************************/

/*
This file deals with colour modifications to the freground image.  It is split into two parts:
 1. A colour state closure which exposes the following API:
 	- setBrightness(newBrightness: number)
 	- getBrightness(): number
 	- setWhiteBalance(newWhiteBalance: number)
 	- getWhiteBalance(): number
 	- initialize(initBrightness: number, initWhiteBalance: number)
 	- applyState() - applies the current brightess/white balance settings to the foreground
 2. Auxillary functions
 	- To receive input from the brightness and white balance sliders
 	- To redraw the original, unmodified image to the canvas (is called from within applyState())
 	- Logic to perform the brightness and white balance adjustement - inspired by the CamanJS library.
*/

// This closure represents the state for the colour sliders.
var colourState = (function() {
	/*
	Initialize brightness and white balance values.  They will be re-initialized when initialize(...) is called.
	Also define applyState()
	*/
	var brightness = 0;
	var whiteBalance = 8000;
	function applyState() {
		resetCanvas();
		adjustBrightness(brightness);
		adjustWhiteBalance(whiteBalance);
	}
	/*
	Return our API - the code is fairly self explanatory
	*/
	return {
		setBrightness: function(newBrightness) {			
			brightness = newBrightness; applyState();
			$('#brightnessSlider').val(brightness);
		},
		getBrightness: function() {
			return brightness;
		},
		setWhiteBalance: function(newWhiteBalance) {
			whiteBalance = newWhiteBalance; applyState();
			$('#whiteBalanceSlider').val(whiteBalance);
		},
		getWhiteBalance: function() {
			return whiteBalance;
		},
		initialize: function(initBrightness, initWhiteBalanceTemp) {
			brightness = initBrightness;
			whiteBalance = initWhiteBalanceTemp;
		},
		applyState: applyState
	}
})();

/* Functions for taking input from the sliders and re-drawing */
function brightnessSliderFn() {
	newBrightness = $('#brightnessSlider').val();
	colourState.setBrightness(newBrightness);
};

function whiteBalanceSliderFn() {
	newWhiteBalance = $('#whiteBalanceSlider').val();
	colourState.setWhiteBalance(newWhiteBalance);
};

function resetCanvas() {
	/* Redraws the original, unaltered image to the canvas */
	var canvas = document.getElementById('foregroundImage');
	canvas.getContext('2d').drawImage(hiddenImg, 0, 0, canvas.width, canvas.height);
}

/* The implementations which perform the colour changes */
function adjustBrightness(newBrightness) {
	// Algorithm from CamanJS library
	var adjust = Math.floor(255 * (newBrightness / 100));
	
	var canvas = document.getElementById('foregroundImage');
	var ctx = canvas.getContext('2d');
	var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var data = imageData.data;

	for (var i = 0; i < data.length; i += 4) {
		data[i] = data[i] + adjust; // Red
		data[i+1] = data[i+1] + adjust; // Green
		data[i+2] = data[i+2] + adjust; // Blue
	}
	ctx.putImageData(imageData, 0, 0);
}

function adjustWhiteBalance(temp) {
	// Algorithm from CamanJS library
	var colour = colorTemperatureToRgb(temp);
	adjustWhiteBalanceColour(colour);	
}

function adjustWhiteBalanceColour(colour) {
	var canvas = document.getElementById('foregroundImage');
	var ctx = canvas.getContext('2d');
	var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var data = imageData.data;

	for (var i = 0; i < data.length; i += 4) {
		data[i] = data[i] * (255/colour.r); // Red
		data[i+1] = data[i+1] * (255/colour.g); // Green
		data[i+2] = data[i+2] * (255/colour.b); // Blue
	}

	ctx.putImageData(imageData, 0, 0);	
}

function colorTemperatureToRgb(temp) {
	// Verbatim From CamanJS library
    var m = window.Math;
    temp /= 100;
    var r, g, b;

    if (temp <= 66) {
        r = 255;
        g = m.min(m.max(99.4708025861 * m.log(temp) - 161.1195681661, 0), 255);
    } else {
        r = m.min(m.max(329.698727446 * m.pow(temp - 60, -0.1332047592), 0), 255);
        g = m.min(m.max(288.1221695283 * m.pow(temp - 60, -0.0755148492), 0), 255);
    }

    if (temp >= 66) {
        b = 255;
    } else if (temp <= 19) {
        b = 0;
    } else {
        b = temp - 10;
        b = m.min(m.max(138.5177312231 * m.log(b) - 305.0447927307, 0), 255);
    }

    return {
        r: r,
        g: g,
        b: b
    }
}