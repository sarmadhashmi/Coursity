var icalToolkit = require('ical-toolkit');


function dayOfWeekAsInteger(day) {
    return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(day);
}

function buildICS(timetable) {
  var builder = icalToolkit.createIcsFileBuilder();
  builder.tzid = 'america/toronto';
  builder.method = 'REQUEST';
  builder.calname = 'Coursity';
  for (i = 0; i < timetable.length; i++) {
    var curr = timetable[i];
    var day_index = dayOfWeekAsInteger(curr['day']);
    var class_start = new Date(curr['semester_start']['year'], 
                 curr['semester_start']['month'], 
                 curr['semester_start']['day'],
                 curr['start_time']['hour'],
                 curr['start_time']['minute'], 0, 0);
    class_start.setDate(class_start.getDate() - class_start.getDay() + day_index);
    
    var class_end = new Date(curr['semester_start']['year'], 
                 curr['semester_start']['month'], 
                 curr['semester_start']['day'],
                 curr['end_time']['hour'],
                 curr['end_time']['minute'], 0, 0);
    class_end.setDate(class_end.getDate() - class_end.getDay() + day_index);

    var semester_end = new Date(curr['semester_end']['year'], 
        curr['semester_end']['month'], 
        curr['semester_end']['day'], 24, 60, 0, 0);

    builder.events.push({
      start: class_start,
      end: class_end,
      summary: curr['course_code_faculty'] + " " + curr['course_code_number'] + " " + curr['course_name'],
      repeating: {
        freq: 'WEEKLY',
        byday: curr['day'].toUpperCase().substring(0,2),
        wkst: 'MO',
        until: semester_end
      },
      location: curr['where'],
      description: curr['course_code_faculty'] + " " + curr['course_code_number'] + +  " " +  curr['course_name']
    });
  }
  return builder.toString();
}

module.exports.buildICS = buildICS;
