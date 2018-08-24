/*****************************************************************************
Argon Design Ltd. Project P8010 Spock
(c) Copyright 2018 Argon Design Ltd. All rights reserved.

Module: Gumpifier
Author : Patrick Taylor
*******************************************************************************/

// $(document).ready(function() {
// 	$("#foregroundUploadButton").click(function() {
// 		// $("#vCenterPaneLeft").hide();
// 		// $('#vCenterPaneLeft').load("ajaxTest.txt")
// 	});
// });

// Seems that functions don't work if not wrapped in the document ready bit
// $(document).ready(function() {
// 	$("#backgroundUploadButton").click(function() {
// 		alert("Switching to red");
// 		$(this).css("background-color", "red"); // 'this' selects the #backgroundUploadButton button
// 	});
// });


// Initial overlay animations
$(document).ready(function() {
	var speed = 1500
	$('#initArgonLogoContainer').animate({width: "90%"}, speed);
	$('#initArgonLogo').animate({opacity: 0.0}, speed, function() {
		$('#initDovetailedContainer').delay(1000).animate({width: "40%"}, speed);
		$('#initDovetailedLogo').delay(1000).animate({opacity: 1.0}, 200).animate({opacity: 0.0}, speed, function() {
			$('#initGumpifierLogo').delay(1000).animate({opacity: 1.0}, 500).delay(2000).animate({opacity: 0.0}, 700);
			$('#initOverlay').delay(3500).animate({opacity: 0.0}, 700, function() {
				$('#initOverlay').hide();
			})
		});
	});
});

function sideSwoosh(verticalLine, side) {
	// Animate a vertical line
	var borderLineL = $(verticalLine+side);
	borderLineL.css({top: ''});
	borderLineL.animate({height: '100%'}, 'fast', function() {
		borderLineL.css({top: 0, bottom: ''});
	});
	borderLineL.animate({height: '0%'}, 'fast', function() {
		if (verticalLine == '.borderLineL') {topBottomSwoosh('.borderLineT', side);}
		else {topBottomSwoosh('.borderLineB', side)}
	}).delay(3000);
}

function topBottomSwoosh(horizontalLine, side) {
	// Animate a horizontal line
	var borderLineB = $(horizontalLine+side);
	borderLineB.css({right: ''});
	borderLineB.animate({width: '100%'}, 'fast', function() {
		borderLineB.css({right: 0, left: ''});
	});
	borderLineB.animate({width: '0%'}, 'fast', function() {
		if (horizontalLine == '.borderLineB') {sideSwoosh('.borderLineR', side);}
		else {sideSwoosh('.borderLineL', side)}
	}).delay(3000);
}

function resetAnimationState(side) {
	$('.borderLineL'+side).css({top: '', bottom: 0, height: 0});
	$('.borderLineR'+side).css({top: '', bottom: 0, height: 0});
	$('.borderLineT'+side).css({right: '', left: 0, width: 0});
	$('.borderLineB'+side).css({right: '', left: 0, width: 0});
}

// Animate the centre text in the left pane to gently expand and contract every 5 seconds
$(document).ready(function() {
	// Note the following:
	//   * Use of a variable for the selected element,
	//   * Queued animations using JQuery's internal queue
	//   * The callback function loop executed after the current animation has finished
	//     If we don't use a callback but simply call loop() at the end of the function, we recurse to
	//     maximum depth very quickly as the animations are simply added to a queue.
	var pane = $('#vCenterPaneLeft');
	function loop() {
		console.log("Entered");
		pane.animate({fontSize: '140%'});
		pane.animate({fontSize: '130%'}, "slow", loop).delay(5000);
	}
	// loop();
});

