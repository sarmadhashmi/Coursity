var fs = require('fs');
var icalToolkit = require('ical-toolkit');
var moment = require('moment');

var parse = function parse(text){
    var _wsRegex = /\s+/;
    var _ampm = /:\d{2}[aAPp][mM]/;
    var _courseTitleLookAhead = /(?=\b(?:\w{2,}\ \w{1,5})\ -\ (?:[^\r\n]+)\b)/g;
    var _courseTitleRegex = /(?:\b(\w{2,}\ \w{1,5})\ -\ ([^\r\n]+)\b)/;
    var _dayOfWeekRegex = /([MoTuhWeFrSaS]{2,6})/;
    var _timeRegex  =  _ampm.exec(text) ? /([012]?\d\:[0-5]\d[AP]M)/ : /([012]?\d\:[0-5]\d)/;
    var _timeDayPairRegex = new RegExp(_dayOfWeekRegex.source + _wsRegex.source + _timeRegex.source +  _wsRegex.source + "-" +  _wsRegex.source + _timeRegex.source);
    var _timeDayPairLookAhead =  _ampm.exec(text) ? /(?=\b(?:[MoTuhWeFrSaS]{2,6})\s+(?:[012]?\d\:[0-5]\d[AP]M)\s+-\s+(?:[012]?\d\:[0-5]\d[AP]M)\b)/ : /(?=\b(?:[MoTuhWeFrSaS]{2,6})\s+(?:[012]?\d\:[0-5]\d)\s+-\s+(?:[012]?\d\:[0-5]\d)\b)/;
    var _courseCodeLookAhead = /(?=\b\d{5}\b)/;
    var _timeDayPairOrCourseCodeLookAhead = new RegExp(_courseCodeLookAhead.source + "|" + _timeDayPairLookAhead.source ,"g");
    var _locationRegex = /([A-Z0-9]{2,5}\s+[A-Z0-9]{2,5})/;
    var _profRegex = /((\b[A-Za-z]+\s)(?:[A-Za-z\-.]+\s?)+|(\b[A-Za-z]+\s))/;
    var _locationProfPair = new RegExp(_locationRegex.source + _wsRegex.source + _profRegex.source);
    var _semesterRegex = /((?:\d{2}\/\d{2}\/\d{4})|(?:\d{4}\/\d{2}\/\d{2})|(?:\d{4}-\d{2}-\d{2}))/;
    var _semesterPairRegex = new RegExp(_semesterRegex.source +  _wsRegex.source + "-" +  _wsRegex.source +  _semesterRegex.source);
    var _sectionTypeRegex = /(\d+)\s+([A-Z]{1}\d+)\s+(?=Lecture|Tutorial|Laboratory)([A-Za-z]{3,}\b)/;
    var _dayRegex = /(Mo)|(Tu)|(We)|(Th)|(Fr)|(Sa)|(Su)/g;
    var _weekdays = {"Mo":"Monday","Tu":"Tuesday","We":"Wednesday","Th":"Thursday","Fr":"Friday","Sa":"Saturday","Su":"Sunday"};

    function convertTo24Hour(time) {
        var hours = parseInt(time.substr(0, 2));
        if(time.indexOf('AM') != -1 && hours == 12) {
            time = time.replace('12', '0');
        }
        if(time.indexOf('PM')  != -1 && hours < 12) {
            time = time.replace(hours, (hours + 12));
        }
        return time.replace(/(AM|PM)/, '');
    }

    var timetable = [];
    var courses = text.split(_courseTitleLookAhead);
    for (var i = 0; i < courses.length; i++) {
        var courseText = courses[i];
        var course = _courseTitleRegex.exec(courseText);
        var classes = courseText.split(_timeDayPairOrCourseCodeLookAhead);
        if (!course) continue;
        var currentSection = _sectionTypeRegex.exec(courseText);

        /*
         Example classes output
         0:"ECON 2X03 - Appld Business Ec.
         Status	Units	Grading	Grade	Deadlines
         Enrolled
         3.00
         Graded

         Academic Calendar Deadlines
         Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
         "
         1:"14227
         T02
         Tutorial
         "
         2:"We 10:30AM - 11:20AM
         CNH B107
         Anastasios Papanastasiou
         2016/09/06 - 2016/12/07
         "
         3:"14228
         C03
         Lecture
         "
         4:"MoWeTh 4:30PM - 5:20PM
         TSH B105
         Anastasios Papanastasiou
         2016/09/06 - 2016/12/07

         "
         5:"MoWeTh 4:30PM - 5:20PM
         TSH B105
         Anastasios Papanastasiou
         2016/09/06 - 2
         */

        for (var j = 0; j < classes.length; j++) {
            var locationProfPair = _locationProfPair.exec(classes[j]);
            var time = _timeDayPairRegex.exec(classes[j]);
            var semester = _semesterPairRegex.exec(classes[j]);
            var section = _sectionTypeRegex.exec(classes[j]);
            currentSection = section ? section : currentSection; // Check is the current classes segment is a section if it is update the current Section

            if (!locationProfPair || !time || !semester) continue;

            function pad(n) {
                return (n.toString().length < 2) ? ("0" + n) : n;
            }

            var where = locationProfPair[1];
            var professor = locationProfPair[2];
            var days = time[1].replace(_dayRegex, function myFunction(x){return _weekdays[x] + ",";})
            var daysArray = days.substring(0, days.length-1).split(",")

            for (var k = 0; k < daysArray.length ; k++) {
                var obj = {};
                var startTimeSplit = convertTo24Hour(time[2]).split(":")
                var startTimeObj = {'hour': pad(parseInt(startTimeSplit[0], 10)), 'minute': pad(parseInt(startTimeSplit[1], 10))};
                var endTimeSplit = convertTo24Hour(time[3]).split(":")
                var endTimeObj = {'hour': pad(parseInt(endTimeSplit[0], 10)), 'minute': pad(parseInt(endTimeSplit[1], 10))};
                var semesterStartSplit = semester[1].split("/");
                var semesterEndSplit = semester[2].split("/");
                var semesterStartObj = { year: semesterStartSplit[0], month: semesterStartSplit[1], day: semesterStartSplit[2]};
                var semesterEndObj = { year: semesterEndSplit[0], month: semesterEndSplit[1], day: semesterEndSplit[2]};
                var courseSplit = course[1].split(" ");
                obj['course_code_faculty'] = courseSplit[0];
                obj['course_code_number'] = courseSplit[1];
                obj['course_number'] = currentSection[1];
                obj['course_name'] = course[2];
                obj['semester_start'] = semesterStartObj;
                obj['semester_end'] = semesterEndObj;
                obj['where'] = where;
                obj['professor'] = professor;
                obj['day'] = daysArray[k];
                obj['start_time'] = startTimeObj;
                obj['end_time'] = endTimeObj;
                obj['class_section'] = currentSection[2];
                obj['class_type'] = currentSection[3];
                timetable.push(obj);
            }}
    }

    return timetable;

};
var calParser  = function (timetable, directory, filename, callback){
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
    for (i = 0; i < timetable.length; i++) {
        //Add events

        start_date = [timetable[i]["semester_start"]["year"],timetable[i]["semester_start"]["month"],timetable[i]["semester_start"]["day"]] ;
        end_date = [timetable[i]["semester_end"]["year"],timetable[i]["semester_end"]["month"],timetable[i]["semester_end"]["day"]];
        start_time = [timetable[i]["start_time"]["hour"],timetable[i]["start_time"]["minute"],"00"];
        end_time = [timetable[i]["end_time"]["hour"],timetable[i]["end_time"]["minute"],"00"];
        //console.log(timetable[i]["day"].toUpperCase().substring(0,2));
        builder.events.push({

            //Event start time, Required: type Date()
            start: moment.utc(new Date(start_date.join("-")+ "T" + start_time.join(":") )).day(timetable[i]["day"]).toDate(),

            //start: new Date(start[0],start[1],start[2],start[3],start[4]), //start_end_time(classDetails[i][3],dates[i])[0],

            //Event end time, Required: type Date()
            end: moment.utc(new Date(start_date.join("-")+ "T" + end_time.join(":") )).day(timetable[i]["day"]).toDate(),
            //end: new Date(end[0],end[1],end[2],end[3],end[4]), //start_end_time(classDetails[i][3],dates[i])[1],

            //Event summary, Required: type String
            summary: timetable[i]["course_code_faculty"] + " " + timetable[i]["course_code_number"] + " " + timetable[i]["course_name"] ,
            //Event identifier, Optional, default auto generated
            //uid: dates[i] + classDetails[i][3],
            alarms: [10],
            //Optional if repeating event
            repeating: {
                freq: 'WEEKLY',
                byday: timetable[i]["day"].toUpperCase().substring(0,2),
                wkst: "MO",
                until: moment.utc(new Date(end_date.join("-")+ "T" + end_time.join(":") )).toDate()
            },
            //Location of event, optional.
            location: timetable[i]["where"],
            //Optional, floating time.
            floating: true,
            //Optional description of event.
            description: timetable[i]["course_code_faculty"] + " " + timetable[i]["course_code_number"] + " " + timetable[i]["course_number"]  + " " + timetable[i]["course_name"]

        });
    }

    //Try to build
    var icsFileContent = builder.toString();
   console.log(icsFileContent);
/*
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
    });*/
}


var convertToCal = function(filePath, start_date,end_date, directory, filename, callback) {

    var timetable = parse(text);
    console.log(timetable);
    console.log(calParser(timetable));
    //return calParser(timetable, directory, filename, callback);
};

var timetable = Ajaxfunc(parse)
function Ajaxfunc(cb){
   var http = require('http');
    http.get({
        host: 'localhost',
        port: 8000,
        path: '/Courses_RAW.txt',
        method: 'GET'
    }, function(response) {
        response.setEncoding('utf8')
        response.on('data', function(data){
            timetable = cb(data);
            calParser(timetable);
        });
    });
}
module.exports.convertToCal = convertToCal;