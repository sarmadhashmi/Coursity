var fs = require('fs');
var icalToolkit = require('ical-toolkit');
var moment = require('moment');
var cheerio = require('cheerio');

var convert = function(filePath) { 
	$ = cheerio.load(fs.readFileSync(filePath), {
	    	ignoreWhitespace: true
		});


	var courseInfo = [];
	var courseInfoMatch= [];
	var days = [];
	var re = /([A-Z]+\s\d{4}\s[A-Z]\s\w{3}\s(?:[(]\d[)]))(\d{1,2}[:]\d{2}[A-Z]*\s[-]\s\d{0,2}[:]\d{2}(?:(?:A|P)M)?)(\w.*\d)(\w.*)/;	//reg ex to find the course data
	//  Output SEG 3102 A LEC (1)13:00 - 14:30LPR 155Some, StéphaneREGISTERED
	//Example of the reg ex and the groups it matched
	// group 1 = SEG 3102 A LEC (1)
	// group 2 = 13:00 - 14:30
	// group 3 = LPR 155
	// group 4 = Some, StéphaneREGISTERED

	// find where the class are, they are stored in table > #WEEKLY_SCHED_HTMLAREA > .SSSTEXTWEEKLY
	$('#frameContents').find('.TimeTableRegularTime').each(function(i, elem) {
	  days[i] = $(this).closest('table').find('.DeAcDataGridListHeader')[0].children[$(this).index()+1].children[0].data; //found on github, this find the cell header,which is the weekday
	  courseInfo[i] = $(this).text(); //store the string data of the cell details
	  courseInfoMatch[i] = re.exec(courseInfo[i]); //Match the details with the regualar exp
	});

	return [days, courseInfoMatch]
}


var calParser  = function (dates, classDetails, start_date,end_date, directory, callback){
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
	builder.calname = 'Course 2 Cal';
	  for (i = 0; i < classDetails.length; i++) { 
	//Add events
	start = start_end_time(classDetails[i][2],dates[i], start_date)[0];
	end = start_end_time(classDetails[i][2],dates[i], start_date)[1];
			
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
	  //uid: dates[i] + classDetails[i][4],
	  alarms: [10],
	  //Optional if repeating event 
	  repeating: {
	    freq: 'WEEKLY',
	    byday: dates[i].substring(0,2),
	    wkst: "MO",
	    until: end_date
	  },
	  //Location of event, optional. 
	  location: classDetails[i][3],
	  //Optional, floating time.
	  floating: true,
	  //Optional description of event. 
	  description: classDetails[i][1] + " " + classDetails[i][4].replace('REGISTERED','')
	  
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
	var filename = getFileName();
	fs.mkdir(directory, function(err) {
		if (err && err.code !== 'EEXIST') {
			return callback(err);
		}
		fs.writeFile(directory + filename, icsFileContent)	
		callback(null, filename);
	});		
}

var getFileName = function() {	
	return "someHash.ics";
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

var convertToCal = function(filePath, start_date,end_date, directory, callback) {
	var converted = convert(filePath);
	return calParser(converted[0], converted[1], start_date,end_date, directory, callback);
}
module.exports.convertToCal = convertToCal;
