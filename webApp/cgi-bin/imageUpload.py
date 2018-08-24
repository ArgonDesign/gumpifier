#!/usr/bin/python3
# -*- coding: utf-8 -*-

################################################################################
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Module: Gumpifier
# Author : Patrick Taylor
################################################################################

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
import threading
import hashlib, time, random

form = cgi.FieldStorage()

os.chdir("..")

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
	extension = os.path.basename(fileitem.filename).split('.')[-1]
	# Try to guard against an insertion attack by testing that the extension is correct
	# E.g. extension might be "/../....../etc/passwd"
	if extension.lower() not in ['bmp', 'gif', 'ico', 'jpg', 'jpeg', 'png', 'svg', 'tif', 'tiff', 'webp']: # https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Complete_list_of_MIME_types
		extension = ""
	hashName = hashlib.md5(str(time.time()).encode("utf8") + str(random.random()).encode("utf8")).hexdigest() + "." + extension
	savedPath = os.path.join("storage", hashName)
	# Use technique here to ensure strict permissions: https://stackoverflow.com/a/45368120
	with open(os.open(savedPath, os.O_CREAT | os.O_WRONLY, 0o644), 'wb') as outputFile:
		outputFile.write(fileitem.file.read())

	# Set the TF server segmenting the image.  We're not waiting for a response from this one so use threading
	threading.Thread(target=sendData, args=(savedPath, command)).start()

	# Return the file where the image is stored
	message = savedPath
else:
	message = "ERROR"

# Return stuff to client
print("""Content-type: text/html

{}""".format(message))
