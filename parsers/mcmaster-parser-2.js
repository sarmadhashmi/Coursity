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

            var where = locationProfPair[1];
            var professor = locationProfPair[2];
            var days = time[1].replace(_dayRegex, function myFunction(x){return _weekdays[x] + ",";})
            var daysArray = days.substring(0, days.length-1).split(",")

            for (var k = 0; k < daysArray.length ; k++) {
                var obj = {};
                var startTimeSplit = convertTo24Hour(time[2]).split(":")
                var startTimeObj = {'hour': parseInt(startTimeSplit[0], 10), 'minute': parseInt(startTimeSplit[1], 10)};
                var endTimeSplit = convertTo24Hour(time[3]).split(":")
                var endTimeObj = {'hour': parseInt(endTimeSplit[0], 10), 'minute': parseInt(endTimeSplit[1], 10)};
                var semesterStart = new Date(semester[1]);
                var semesterEnd = new Date(semester[2]);
                var semesterStartObj = { year: semesterStart.getFullYear(), month: semesterStart.getMonth(), day: semesterStart.getDate()};
                var semesterEndObj = { year: semesterEnd.getFullYear(), month: semesterEnd.getMonth(), day: semesterEnd.getDate()};
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
var fs = require('fs')
    , filename = process.argv[2];
fs.readFile(filename, 'utf8', function(err, data) {
    if (err) throw err;
    console.log(parse(data));
});

module.exports.parse = parse;

