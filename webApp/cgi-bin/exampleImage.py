#!/usr/bin/python3
# -*- coding: utf-8 -*-

"""
This CGI script tells the TF server to use one of the example images.  Currently this just starts the
relevant image segmenting, but in the future could almost instantly return a pre-segmented image.

CGI args:
	JSON.  Either {'fg_url': url} or {'bg_url': url}
CGI return:
	Nothing
"""

import cgi, os
import cgitb; cgitb.enable() # Traceback enable
from TF_interface import sendData
import threading
import hashlib, time, random
from shutil import copyfile

form = cgi.FieldStorage()

os.chdir("..")

# Get the url
if 'fg_url' in form:
	url = form['fg_url'].value
	command = 'egFG'
elif 'bg_url' in form:
	url = form['bg_url'].value
	command = 'egBG'

# Copy the example image to a unique instance in storage/
extension = os.path.basename(url).split('.')[-1]
# Try to guard against an insertion attack by testing that the extension is correct
# E.g. extension might be "/../....../etc/passwd"
if extension.lower() not in ['bmp', 'gif', 'ico', 'jpg', 'jpeg', 'png', 'svg', 'tif', 'tiff', 'webp']: # https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Complete_list_of_MIME_types
	extension = ""
hashName = hashlib.md5(str(time.time()).encode("utf8") + str(random.random()).encode("utf8")).hexdigest() + "." + extension
dest = 'storage/{}'.format(hashName)
try:
	copyfile(url, dest)
	message = dest
except:
	message = "ERROR"

# Set the TF server segmenting the image.  We're not waiting for a response from this one so use threading
threading.Thread(target=sendData, args=(dest, command)).start()

# Return stuff to client
print("""Content-type: text/html

{}""".format(message))
