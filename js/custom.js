$(document).ready(function() {

	// check if html is provided
	$('#timetable-submit').submit(function(e) {			
		e.preventDefault();
		var ext = $(this).val().split(".").pop().toLowerCase();	
		if(ext !== "html") {
			alert("Invalid file uploaded (must be HTML).");
			return false;
		}
		return true;		
	});

});