__author__ = 'Abe'
import json
from unicodedata import normalize
import re

# Run the command below with the correct IP address to retrieve the updated log file
## scp root@<IP ADDRESS>:~/master/logs/main.log ~/Documents/Coursity/Coursity/testing/log_processor/"

f = open("main.log",'r')
output = open("Readable Error Text.txt",'w')
log = f.readlines()
calendar_page_count = 0
choose_semester_page_count = 0
different_timetable_page_count = 0
count = 0
for line in log:
    parsed_json = json.loads(line)
    if parsed_json.get("message"):
        error_raw_text = parsed_json.get("message").replace("\\n","\n")
        if "Text" in error_raw_text:
            if "Choose a date" in error_raw_text:
                calendar_page_count = calendar_page_count + 1
                continue
            elif re.search("(Sep)|(Oct)",error_raw_text):
                calendar_page_count = calendar_page_count + 1
                continue
            elif "Career" in error_raw_text:
                choose_semester_page_count = choose_semester_page_count + 1
                continue
            elif re.search("[(]\d+[)]",error_raw_text):
                different_timetable_page_count = different_timetable_page_count + 1
                continue
            else:
                count = count + 1
                output.write("="*30+"\n")
                output.write("Error Text " + str(count)+"\n")
                output.write("="*30+"\n")
                output.write(normalize('NFKD', error_raw_text).encode('ASCII', 'ignore'))
                output.write("\n"+"="*30+"\n")

print calendar_page_count
print choose_semester_page_count
print different_timetable_page_count