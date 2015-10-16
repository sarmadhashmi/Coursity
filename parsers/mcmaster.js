var fs = require('fs');
var icalToolkit = require('ical-toolkit');
var moment = require('moment');
var cheerio = require('cheerio');

var convert = function(filePath) { 
	$ = cheerio.load(fs.readFileSync(filePath), {
	    	ignoreWhitespace: true
		});

	/**
	 * The beginning chunk of this code, takes in a McMaster Timetable HTML, and remakes the Calender so
	 * all the classes are only 1 hour chunks. This solves the issue that cause class to be inserts in the
	 * wrong day. Now one can be sure that the timetable has 7 columns and 22 rows.
	 */

	var count = 0;
	var HTMLstring = []; //An array of the HTML string (i.e <tag>Stuff</tag>)
	var HTMLobject = []; //An Array of the HTML object (DOM)
	$$ = require('cheerio'); //cheerio parser used to turn HTML string to a DOM object
	$$$ = require('cheerio');
	//var times = {"8:00AM":0, "9:00AM":1,"10:00AM":2,"11:00AM":3,"12:00PM":4,"1:00PM":5,"2:00PM":6,"3:00PM":7,"4:00PM":8,"5:00PM":9,"6:00PM":10}
// find where the class are, they are stored in table > #WEEKLY_SCHED_HTMLAREA > .SSSTEXTWEEKLY
	$('#WEEKLY_SCHED_HTMLAREA').find('tr').each(function(i, elem) {
		HTMLstring[i] = $(this).html();
		HTMLobject[i] = $$(HTMLstring[i]);
	});
	var parts = [];
	var index;
	var classRowIndex = [];
	var classColIndex = [];
	var classIndexDetails = [];
	var content = "";
	var ClassOccupiedCells;

	//Split the HTML string into an array of [rows][cells], it has 22 rows (times of the week) and 7 cells (days of the week)
	/*
	 * At the end of these for loops, the result will look something like
	 * HTMLstring =
	 *   '<td class="SSSWEEKLYTIMEBACKGROUND" rowspan="2"><span class="SSSTEXTWEEKLYTIME">8:00AM</span></td><td class="SSSWEEKLYLTLINE"> </td><td class="SSSWEEKLYLTLINE"> </td><td class="SSSWEEKLYLTLINE"> </td><td class="SSSWEEKLYLTLINE"> </td><td class="SSSWEEKLYLTLINE"> </td><td class="SSSWEEKLYLTLINE"> </td><td class="SSSWEEKLYLTLINE"> </td>',
	 '<td class="PSLEVEL3GRID"> </td><td class="PSLEVEL3GRID"> </td><td class="PSLEVEL3GRID"> </td><td class="PSLEVEL3GRID"> </td><td class="PSLEVEL3GRID"> </td><td class="PSLEVEL3GRID"> </td><td class="PSLEVEL3GRID"> </td>',
	 * parts[][] =
	 *  [[ '<td class="SSSWEEKLYTIMEBACKGROUND" rowspan="2"><span class="SSSTEXTWEEKLYTIME">8:00AM</span></td>',
	 '<td class="SSSWEEKLYLTLINE"> </td>',
	 '<td class="SSSWEEKLYLTLINE"> </td>',
	 '<td class="SSSWEEKLYLTLINE"> </td>',
	 '<td class="SSSWEEKLYLTLINE"> </td>',
	 '<td class="SSSWEEKLYLTLINE"> </td>',
	 '<td class="SSSWEEKLYLTLINE"> </td>',
	 '<td class="SSSWEEKLYLTLINE"> </td>',
	 '' ],[.....],[.....]]
	 * */
	for (i = 0; i < HTMLstring.length; i++){
		parts[i]= HTMLstring[i].split('</td>');

		//add the closing tag back into the cells
		for (j=0; j < parts[i].length-1; j++){
			parts[i][j] = parts[i][j].toString() + "</td>"
		}
	}

	// Basically it finds te time of every class and makes a list of all your classes that are over an hour long.

	for (i = 0; i < parts.length; i++){
		for (j = 0; j < parts[i].length; j++){

			if (parts[i][j].indexOf('class="SSSTEXTWEEKLY"') > -1){
				time = parts[i][j].split("<br>")[2].split("-")[0].split(":") + "," + parts[i][j].split("<br>")[2].split("-")[1].split(":"); //find the time and get the different to see how long the class is
				start_end_class = time.split(",");
				diff = start_end_class[2]-start_end_class[0];
				if (diff>1 || diff<0 && diff > -11){
					classRowIndex.push(i);
					classColIndex.push(j);
					classIndexDetails.push(parts[i][j])
				}
			}
		}
	}
	console.log("new parser")
	// It checks every row for all the cells that have class, then it checks for all the classes with rowspan > 2
	// (class that are more that an hour) and breaks the timeslot up into hours chunks

	var rowCounter = 0;
	var findRowspan,rowSpanValue,rowSpanIntValue;
	for (i = 0; i < classRowIndex.length; i++){
		//find the word rowspan, and check how large the cell is.
		findRowspan = classIndexDetails[i].search("rowspan=\"");
		//remove the word rowspan and ="(8 chars)
		rowSpanValue = classIndexDetails[i].slice(findRowspan+9,findRowspan+11);
		rowSpanIntValue = parseInt(rowSpanValue);
		while (rowSpanIntValue > 2) {
			//it skips 2 rows because 1 row is only 30mins, and we need to split the class up into 1 hours chunks
			rowCounter = rowCounter + 2;
			nextRow = classRowIndex[i] +rowCounter;
			parts[nextRow].splice(classColIndex[i], 0, '<td class="BUFFER"> </td>');
			rowSpanIntValue = rowSpanIntValue - 2; //The rowspan is alway multiples of 2, keep dividing the number the split it evenly
		}
		rowCounter = 0
	}
	// Turns all the rows back into table rows
	for (i = 0; i < parts.length; i++){
		content = content + "<tr>" + parts[i].join("") + "</tr>"
	}

	// Turn all the rows into a table
	content = "<table>" + content + "</table>";
	// Makes sure all the classes are only 1 hour chunks
	content = content.replace(/rowspan="\d"/gi, 'rowspan="2"');

	var courseInfo = [];
	var courseInfoMatch= [];
	var days = [];
	var re = /([A-Z]+\s\d\w{2}\d\w*\s[-]\s\w{3})([A-Za-z]*)(\d{1,2}[:]\d{2}[A-Z]*\s[-]\s\d{0,2}[:]\d{2}(?:(?:A|P)M)?)(\w.*)/;	//reg ex to find the course data
	//  Output SFWRENG 3BB4 - T02Tutorial2:30PM - 4:20PMJohn Hodgins Engineer Bldg A102
	//Example of the reg ex and the groups it matched
	// group 1 = SFWRENG 3BB4A - T02
	// group 2 = Tutorial
	// group 3 = 2:30PM - 4:20AM
	// group 4 = John Hodgins Engineer Bldg A102

	// find where the class are, they are stored in table > #WEEKLY_SCHED_HTMLAREA > .SSSTEXTWEEKLY
	$$$(content).find('.SSSTEXTWEEKLY').each(function(i, elem) {
	  days[i] = $$$(this).closest('table').find('th')[$(this).parent().index()+1].children[0].data; //found on github, this find the cell header,which is the weekday
	  courseInfo[i] = $$$(this).text(); //store the string data of the cell details
	  courseInfoMatch[i] = re.exec(courseInfo[i]); //Match the details with the regualar exp
	});
	return [days, courseInfoMatch]
};


var calParser  = function (dates, classDetails, start_date,end_date, directory, filename, callback){
	//Create a builder 
	var builder = icalToolkit.createIcsFileBuilder();
 
	/*
	 * Settings (All Default values shown below. It is optional to specify)
	 * */
	builder.spacers = true; //Add space in ICS file, better human reading. Default: true 
	builder.NEWLINE_CHAR = '\r\n'; //Newline char to use. 
	builder.throwError = false; //If true throws errors, else returns error when you do .toString() to generate the file contents. 
	builder.ignoreTZIDMismatch =  false; //If TZID is invalid, ignore or not to ignore! 
	 
	 //Cal timezone 'X-WR-TIMEZONE' tag. Optional. We recommend it to be same as tzid.
	builder.timezone = 'america/new_york';

	//Time Zone ID. This will automatically add VTIMEZONE info.
	builder.tzid = 'america/new_york';

	/**
	 * Build ICS
	 * */
	 
	//Name of calander 'X-WR-CALNAME' tag. 
	builder.calname = 'Coursity';
	  for (i = 0; i < classDetails.length; i++) { 
	//Add events
	start = start_end_time(classDetails[i][3],dates[i], start_date)[0];
	end = start_end_time(classDetails[i][3],dates[i], start_date)[1];
			
	builder.events.push({
	 
	//Event start time, Required: type Date() 
	  start: moment.utc(start).toDate(),
	  //start: new Date(start[0],start[1],start[2],start[3],start[4]), //start_end_time(classDetails[i][3],dates[i])[0],
	  
	  //Event end time, Required: type Date() 
	  end: moment.utc(end).toDate(),
	  //end: new Date(end[0],end[1],end[2],end[3],end[4]), //start_end_time(classDetails[i][3],dates[i])[1],
	  
	  //Event summary, Required: type String 
	  summary: classDetails[i][1],
	  //Event identifier, Optional, default auto generated 
	  //uid: dates[i] + classDetails[i][3],
	  alarms: [10],
	  //Optional if repeating event 
	  repeating: {
	    freq: 'WEEKLY',
	    byday: dates[i].substring(0,2),
	    wkst: "MO",
	    until: end_date
	  },
	  //Location of event, optional. 
	  location: classDetails[i][4],
	  //Optional, floating time.
	  floating: true,
	  //Optional description of event. 
	  description: classDetails[i][1] + " " + classDetails[i][2]
	  
	});
	 }
	 
	//Try to build 
	var icsFileContent = builder.toString();
	 
	//Check if there was an error (Only required if yu configured to return error, else error will be thrown.) 
	if (icsFileContent instanceof Error) {
	  console.log('Returned Error, you can also configure to throw errors!');
	  //handle error 
	}
	//Here is the ics file content. 		
	fs.mkdir(directory, function(err) {
		if (err && err.code !== 'EEXIST') {
			return callback(err);
		}
		fs.writeFile(directory + filename, icsFileContent)	
		callback(null, filename);
	});		
}

/*
dayString: Put in Monday - Sunday.
Uses to get the time in a format that an ical file can read. It take in the
class time and adds 12 hours is the time has a PM
Example: YYYY,MM,DD,HH,MM   -   [2015,08,07,09,30] is monday sept 7th at 9 30am
*/
var start_end_time = function(classtime,dayString,start_date) {
		//get the time
		//store the start and end time
		require("datejs");
		classtime = classtime.toString().split("-")
		//start_date = [2015,8,7] //when school starts
		//end_date = [2015,11,08] //when school ends
		times = []
		hour = [] //start and stop}

		if (classtime[0].indexOf("PM") > 0){
		 hour[0] = parseInt(classtime[0].split(":")[0]) + parseInt("12");
			if (hour[0] == 24){
						hour[0] = 12;
					}
				}
				else {
					hour[0] = parseInt(classtime[0].split(":")[0]);
				}
				if (classtime[1].indexOf("PM") > 0){
				hour[1] = parseInt(classtime[1].split(":")[0]) + parseInt("12");
					if (hour[1] == 24){
						hour[1] = 12;
					}
				}
				else {
					hour[1] = parseInt(classtime[1].split(":")[0]);
				}
		
		var AM_PM = /(\s*[A-Z]{2}\s*)/;
  		classtime[0] = classtime[0].replace(AM_PM,""); //Match the details with the regualar exp
		classtime[1] = classtime[1].replace(AM_PM,"");
		stminute = classtime[0].split(":")[1];
		etminute = classtime[1].split(":")[1];

		date = Date.today().set({year:start_date[0],month:start_date[1],day:start_date[2]}) //.parse(dayString.toLowerCase())
		if (dayString === "Monday"){
			date = date.monday()
		}
		if (dayString === "Tuesday"){
			date = date.tuesday()
		}
		if (dayString === "Wednesday"){
			date = date.wed()
		}
		if (dayString === "Thursday"){
			date = date.thursday()
		}
		if (dayString === "Friday"){
			date = date.fri()
		}
		if (dayString === "Saturday"){
			date = date.sat()
		}
		if (dayString === "Sunday") {
			date = date.sunday()
		}
		times[0]=  [date.getFullYear(),date.getMonth(),date.getDate(), hour[0] , parseInt(stminute)];
		times[1] = [date.getFullYear(),date.getMonth(),date.getDate(), hour[1] , parseInt(etminute)];
		return times;
}

var convertToCal = function(filePath, start_date,end_date, directory, filename, callback) {
	var converted = convert(filePath);
	return calParser(converted[0], converted[1], start_date,end_date, directory, filename, callback);
}

module.exports.convertToCal = convertToCal;
