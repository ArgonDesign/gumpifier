#!/usr/bin/python3
# -*- coding: utf-8 -*-

# Some higher abstraction code from here: https://www.tutorialspoint.com/python/python_cgi_programming.htm

import cgi, os
import cgitb; cgitb.enable() # Traceback enable

form = cgi.FieldStorage()

# Get the file item (data and name)
fileitem = form['image']

# Test if the file was uploaded
if fileitem.filename: # fileitem.filename is actually a path
	name = os.path.basename(fileitem.filename)
	open('storage/{}'.format(name), 'wb').write(fileitem.file.read())

	message = "The file {} was uploaded sucessfully".format(name)
	message = 'storage/{}'.format(name)
else:
	message = "No file uploaded"
	message = "ERROR"


# Return stuff to server
# print("""Content-Type: text/html

# <html>
# <body>
# {}
# </body>
# </html>
# """.format(message))
print("""Content-type: text/html

{}""".format(message))
