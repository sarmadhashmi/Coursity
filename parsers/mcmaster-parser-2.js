var ics = require('./ics-builder');
var fs = require('fs')
    , filename = process.argv[2];
/**
 * Takes in any time and converts it from a 12HR format to the 24HR format for 7:00PM is 19:00 etc
 * @param {String} time
 * @return {String} 24HR formatted time
 */
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
/**
 * Takes any date and turns it into the correct format, so javascript gets the right date.
 * MM/DD/YYYY is the format the javascript object reads or YYYY/MM/DD
 * @param {String} startDate
 * @param {String} endDate
 * @return {String Array} [startDate, endDate]  with format MM/DD/YYYY or YYYY/MM/DD or YYYY-MM-DD
 */
function fixDateFormat(sem_start, sem_end) {
    var startDateSplit = sem_start.split("/");
    var endDateSplit = sem_end.split("/");

    var startMonth = parseInt(startDateSplit[0]);
    var startDay = parseInt(startDateSplit[1]);
    var startYear = parseInt(startDateSplit[2]);

    var endMonth = parseInt(endDateSplit[0]);
    var endDay = parseInt(endDateSplit[1]);
    var endYear = parseInt(endDateSplit[2]);

    var monthDiff = endMonth - startMonth;
    var dayDiff = endDay - startDay;
    // If it contains the '-' or the first slot is YYYY it is already in correct format
    if (sem_start.indexOf('-') > -1 || startMonth.toString().length === 4) {
        return [sem_start, sem_end]
    } else
        // Date is DD/MM/YYYY because month can't be > 12, so switch the month and day around or
        // If the difference is 3 months (Fall/Winter), 1 month (Spring/Summer) or -5 months (multi-semester(Sept-Apr)),
        // in this case the day is in the month slot and the semester starts in [1,5,7,9], Check is month is Jan,May,July or Sept
        if (startMonth > 12 || endMonth > 12 || (startYear === endYear && startMonth > endMonth) ||
    ((dayDiff === 3 || dayDiff === 1 || dayDiff === -5) && [1, 5, 7, 9].indexOf(startDay) > -1)) {
        return [[startDay, startMonth, startYear].join("/"),[endDay, endMonth, endYear].join("/")];
    } 
    return [sem_start, sem_end]
}
/**
 * Takes in the raw data of timetable and get all the important details including, course name, professor, times etc.
 * @param {String} text
 * @return {Object/JSON} timetable
 */
function parse(text){
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
    var _weekdays = {"Mo":"Monday", "Tu":"Tuesday", "We":"Wednesday", "Th":"Thursday", "Fr":"Friday", "Sa":"Saturday", "Su":"Sunday"};
    var timetable = [];
    // Breaks all the courses up. Looks at all the detail after a course name
    var courses = text.split(_courseTitleLookAhead);

    for (var i = 0; i < courses.length; i++) {
        var courseText = courses[i];
        var course = _courseTitleRegex.exec(courseText);
        // Breaks all classes up, looks at all the details after the Course Code or time in a course
        var classes = courseText.split(_timeDayPairOrCourseCodeLookAhead);

        if (!course) continue;

        var currentSection = _sectionTypeRegex.exec(courseText);

        for (var j = 0; j < classes.length; j++) {
            var locationProfPair = _locationProfPair.exec(classes[j]);
            var time = _timeDayPairRegex.exec(classes[j]);
            var semester = _semesterPairRegex.exec(classes[j]);
            var section = _sectionTypeRegex.exec(classes[j]);
            // Check is the current classes segment is a section if it is update the current Section
            currentSection = section ? section : currentSection;

            if (!locationProfPair || !time || !semester) continue;

            semester = fixDateFormat(semester[1], semester[2]);
            var where = locationProfPair[1];
            var professor = locationProfPair[2];
            // Changes McMasters MoTuWe format to full weekdays
            var days = time[1].replace(_dayRegex, function fullWeekday(x){return _weekdays[x] + ",";});
            var daysArray = days.substring(0, days.length-1).split(",");

            for (var k = 0; k < daysArray.length ; k++) {
                var startTimeSplit = convertTo24Hour(time[2]).split(":");
                var startTimeObj = {'hour': parseInt(startTimeSplit[0], 10), 'minute': parseInt(startTimeSplit[1], 10)};
                var endTimeSplit = convertTo24Hour(time[3]).split(":");
                var endTimeObj = {'hour': parseInt(endTimeSplit[0], 10), 'minute': parseInt(endTimeSplit[1], 10)};
                var sem_start = new Date(semester[0]);
                var sem_end = new Date(semester[1]);
                var semesterStartObj = { year: sem_start.getFullYear(), month: sem_start.getMonth(), day: sem_start.getDate()};
                var semesterEndObj = { year: sem_end.getFullYear(), month: sem_end.getMonth(), day: sem_end.getDate()};
                var courseSplit = course[1].split(" ");
                timetable.push({
                    'course_code_faculty' : courseSplit[0],
                    'course_code_number' : courseSplit[1],
                    'course_number' : currentSection[1],
                    'course_name' : course[2],
                    'semester_start' : semesterStartObj,
                    'semester_end' : semesterEndObj,
                    'where' : where,
                    'professor': professor,
                    'day' : daysArray[k],
                    'start_time' : startTimeObj,
                    'end_time' : endTimeObj,
                    'class_section' : currentSection[2],
                    'class_type' : currentSection[3]
                });
            }}
    }
    return timetable;
}

fs.readFile(filename, 'utf8', function(err, data) {
    if (err) throw err;
    console.log(ics.buildICS(parse(data)));
});

module.exports.parse = parse;