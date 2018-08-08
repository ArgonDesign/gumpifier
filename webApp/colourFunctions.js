// This closure represents the state for the colour sliders.
var colourState = (function() {
	var brightness = 0;
	var whiteBalance = 8000;
	var initWhiteBalanceColour = {r: null, g: null, b: null};
	function applyState() {
		resetCanvas();
		adjustBrightness(brightness);
		adjustWhiteBalance(whiteBalance);
	}
	return {
		setBrightness: function(newBrightness) {brightness = newBrightness; applyState();},
		setWhiteBalance: function(newWhiteBalance) {whiteBalance = newWhiteBalance; applyState();},
		initialize: function(initBrightness, thisInitWhiteBalanceColour, initWhiteBalanceTemp) {
			console.log(brightness);
			brightness = initBrightness;
			console.log(brightness);
			whiteBalance = initWhiteBalanceTemp;
			initWhiteBalanceColour.r = thisInitWhiteBalanceColour[0];
			initWhiteBalanceColour.g = thisInitWhiteBalanceColour[1];
			initWhiteBalanceColour.b = thisInitWhiteBalanceColour[2];
		},
		initApply: function() {
			resetCanvas();
			adjustBrightness(brightness);
			// adjustWhiteBalanceColour(initWhiteBalanceColour); // Doesn't work well
		},
		applyState: applyState
	}
})();

function brightnessSliderFn() {
	newBrightness = $('#brightnessSlider').val();
	colourState.setBrightness(newBrightness);
};

function whiteBalanceSliderFn() {
	newWhiteBalance = $('#whiteBalanceSlider').val();
	colourState.setWhiteBalance(newWhiteBalance);
};

function resetCanvas() {
	var canvas = document.getElementById('foregroundImage');
	canvas.getContext('2d').drawImage(hiddenImg, 0, 0, canvas.width, canvas.height);
}


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
		data[i+1] = data[i+1] * (255/colour.g); // Red
		data[i+2] = data[i+2] * (255/colour.b); // Red
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