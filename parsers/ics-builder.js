var icalToolkit = require('ical-toolkit');

// Converts days of week to integer from 0-6
function dayOfWeekAsInteger(day) {
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(day);
}

// Given a timetable return raw ICS
function buildICS(timetable) {
  var builder = icalToolkit.createIcsFileBuilder();
  builder.tzid = 'america/toronto';
  builder.method = 'PUBLISH';
  builder.calname = 'Coursity';
  // Create events for each entry in the timetable
  for (i = 0; i < timetable.length; i++) {
    var curr = timetable[i];
    var day_index = dayOfWeekAsInteger(curr['day']);
    // Get the class start time and end time on the first day after the semester starts
    var class_start = new Date(Date.UTC(curr['semester_start']['year'], 
                 curr['semester_start']['month'], 
                 curr['semester_start']['day'],
                 curr['start_time']['hour'],
                 curr['start_time']['minute'], 0, 0));
    // Go to the first day after semester start (e.g: first Mon, tue, wed, etc)
    class_start.setDate(class_start.getDate() - class_start.getDay() + day_index);
    
    var class_end = new Date(Date.UTC(curr['semester_start']['year'], 
                 curr['semester_start']['month'], 
                 curr['semester_start']['day'],
                 curr['end_time']['hour'],
                 curr['end_time']['minute'], 0, 0));
    class_end.setDate(class_end.getDate() - class_end.getDay() + day_index);

    // Semester ends at 12 am on the last day
    var semester_end = new Date(Date.UTC(curr['semester_end']['year'], 
        curr['semester_end']['month'], 
        curr['semester_end']['day'], 24, 60, 0, 0));

    // Build the event object and push it to the builder
    builder.events.push({
      start: class_start,
      end: class_end,
        alarms: [10],
      summary: curr['course_code_faculty'] + " " + curr['course_code_number'] + " " + curr['course_name'],
      floating: true,
      repeating: {
        freq: 'WEEKLY',
        byday: curr['day'].toUpperCase().substring(0,2),
        wkst: 'MO',
        until: semester_end
      },
      location: curr['where'],
      description: curr['course_code_faculty'] + " " + curr['course_code_number'] + " " +  curr['course_name']
    });
  }
  return builder.toString();
}

module.exports.buildICS = buildICS;
