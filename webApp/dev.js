$(document).ready(function() {
	// Initially hide devMore
	$('#devMore').hide();

	// Bind toggle of devMore to first checkbox
	$('#devEnable').click(function() {
		if (this.checked)	$('#devMore').show();
		else				$('#devMore').hide();
	});

	// Bind contain/cover properties
	$('#devContainOrCoverR').click(function() {
		if (this.checked)	$('#opt2ImageLeft').css("background-size", "cover");
		else				$('#opt2ImageLeft').css("background-size", "contain");
	});
	$('#devContainOrCoverL').click(function() {
		if (this.checked)	$('#opt2ImageRight').css("background-size", "cover");
		else				$('#opt2ImageRight').css("background-size", "contain");
	});

	// Widget border outline
	$('#devWidgetBorder').click(function() {
		if (this.checked)	$('#resultForegroundWidgets').css({"border-image-source": "unset", "border-color": "rgb(70, 127, 215)"});
		else				$('#resultForegroundWidgets').css({"border-image-source": "url(SharedResources/border.png)"});
	})

	// Widget border thickness
	$('#devWidgetBorderThickness').on("change", function() {
		$('#resultForegroundWidgets').css("border-width", this.value + "px");
	});

	// Handle colour
	$('#devScaleColour').click(function() {
		if (this.checked)	$('#resultForegroundWidgets>.ui-resizable-handle').css({"background-color": "white", "border-width": "0px"});
		else				$('#resultForegroundWidgets>.ui-resizable-handle').css({"background-color": "rgb(165,75,255)", "border-width": "1px"});
	});
});