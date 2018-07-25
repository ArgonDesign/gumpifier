#!/usr/bin/python3
# -*- coding: utf-8 -*-

"""
This CGI script takes the foreground and background images uploaded by the user and saves them to disk.
It then sends a URL to the saved image to:
* The user - we can't access thei local version because of browser security features
* The TF server - to begin its processing (e.g. segmentation)

Refer to here for a CGI programming guide: https://www.tutorialspoint.com/python/python_cgi_programming.htm

CGI args:
	JSON.  Either {'fgimage': data} or {'bgimage': data}
CGI return:
	String.  URL to uploaded image.
"""

import cgi, os
import cgitb; cgitb.enable() # Traceback enable
from TF_interface import sendData

form = cgi.FieldStorage()

# Get the file item (data and name)
# Set the command keyword we send to the TF server
if 'fgimage' in form:
	fileitem = form['fgimage']
	command = 'sgtF'
elif 'bgimage' in form:
	fileitem = form['bgimage']
	command = 'sgtB'

# Test if the file was uploaded
if fileitem.filename: # fileitem.filename is actually a path
	# Save the photo
	name = os.path.basename(fileitem.filename)
	savedPath = 'storage/{}'.format(name)
	open(savedPath, 'wb').write(fileitem.file.read())

	# Set the TF server segmenting the image
	sendData(savedPath, command)

	# Return the file where the image is stored
	message = savedPath
else:
	message = "ERROR"

# Return stuff to client
print("""Content-type: text/html

{}""".format(message))
