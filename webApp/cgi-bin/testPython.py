#!/usr/bin/python3

# Note: must have Unix line endings for direct execution to work.  In Sublime: View->Line Endings->Unix
# Code inspired from e.g. here: https://computer.howstuffworks.com/cgi4.htm

import os
import sys

print("Content-type: text/html\r\n\r\n")
# print("<html><body><h1>Hello World</h1></body></html>\r\n")

faff = """
<html>
	<body>
		You entered: <code>{}</code>
		The method was: <code>{}</code
	</body>
</html>\r\n
"""


if os.environ.get('REQUEST_METHOD') == 'GET':
	# Method is GET so look in QUERY_STRING environment variable
	print(faff.format(os.environ.get('QUERY_STRING'), os.environ.get('REQUEST_METHOD')))

else:
	# Method is POST so read from stdin
	# print(faff.format(sys.stdin.read(int(os.environ.get('CONTENT_LENGTH'))), os.environ.get('REQUEST_METHOD')))

	# Read raw binary instead
	print(faff.format(sys.stdin.buffer.read(int(os.environ.get('CONTENT_LENGTH'))), os.environ.get('REQUEST_METHOD')))