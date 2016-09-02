// Relevant regular expressions
var unknownValue = "N/A";
var _locationRegex = /\b[A-Z]{3,5}\s[A-Z0-9]{2,6}\b/;
var _courseRegex = /\b([A-Z]{3})([1-9]{1}[0-9]{3})([A-Z])?\s+(\b([A-Z.-]+\s([A-Z.&-]+\s?)+)\b)/;
var _courseRegexLookAhead = /(?=\b[A-Z]{3}[1-9]{1}[0-9]{3}[A-Z]?\b)/g;
var _timeRegexLookAhead = /(?=\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+[0-9]{1,2}:[0-9]{2}\s+to\s+[0-9]{2}:[0-9]{2}\s+[A-Za-z]*\b)/g;
var _timeRegex = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+([0-9]{1,2}):([0-9]{2})\s+to\s+([0-9]{2}):([0-9]{2})\s+([A-Za-z]*)\b/;
var _professorRegex = /\b[A-Za-z\-.]+\s(?:[A-Za-z\-.]+\s?)+\b/;
var _semesterRegex = /([0-9]{2}\s[A-Z]{1}[a-z]{2,8})\sto\s([0-9]{2}\s[A-Z]{1}[a-z]{2,8})\s([0-9]{4})/;

/**
 * Returns a timetable array consisting of class section objects which
 * are parsed and generated from the raw uOttawa timetable text.
 * @param {String} text Raw timetable text.
 * @return {Object[]} Returns an array of JSON objects for each parsed class
 *                    section.
 */
function parse(text) {
  var timetable = [];
  // Split lines by course code
  var courses = text.split(_courseRegexLookAhead);
  for (var i = 0; i < courses.length; i++) {
    var courseText = courses[i];
    var semester = _semesterRegex.exec(courseText);
    var course = _courseRegex.exec(courseText);
    if (!course || !semester) continue;
    // Split lines by class sections
    var classes = courseText.split(_timeRegexLookAhead);
    for (var j = 0; j < classes.length; j++) {
      var professor = _professorRegex.exec(classes[j]);
      var time = _timeRegex.exec(classes[j]);
      var where = _locationRegex.exec(classes[j]);
      if (!time) continue;
      var sem_start = new Date(semester[1] + ' ' + semester[3]);
      var sem_end = new Date(semester[2] + ' ' + semester[3]);
      // Build object for this section and push it to the timetable array
      timetable.push({
        'course_code_faculty': course[1],
        'course_code_number': course[2],
        'section': course[3] ? course[3] : '',
        'course_name': course[4],
        'professor': professor ? professor[0] : unknownValue,
        'semester_start':  {
          'year': sem_start.getFullYear(),
          'month': sem_start.getMonth(),
          'day': sem_start.getDate()
        },
        'semester_end': {
          'year': sem_end.getFullYear(),
          'month': sem_end.getMonth(),
          'day': sem_end.getDate()
        },
        'where': where ? where[0] : unknownValue,
        'day': time[1],
        'start_time': {
          'hour': parseInt(time[2], 10),
          'minute': parseInt(time[3], 10)
        },
        'end_time': {
          'hour': parseInt(time[4], 10),
          'minute': parseInt(time[5], 10)
        },
        'class_type': time[6]
      });
    }
  }
  return timetable;
}

module.exports.parse = parse;
