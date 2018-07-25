#!/usr/bin/python3
# -*- coding: utf-8 -*-

# Some higher abstraction code from here: https://www.tutorialspoint.com/python/python_cgi_programming.htm
import cgi, os
import cgitb; cgitb.enable() # Traceback enable
from TF_interface import sendData

form = cgi.FieldStorage()

# Get the file item (data and name)
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
	message = "The file {} was uploaded sucessfully".format(name)
	message = savedPath
else:
	message = "No file uploaded"
	message = "ERROR"


# Return stuff to server
print("""Content-type: text/html

{}""".format(message))
