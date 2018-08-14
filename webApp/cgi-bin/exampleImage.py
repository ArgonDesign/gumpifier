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

form = cgi.FieldStorage()

os.chdir("..")

# Get the url
if 'fg_url' in form:
	url = form['fg_url'].value
	command = 'egFG'
elif 'bg_url' in form:
	url = form['bg_url'].value
	command = 'egBG'

# Set the TF server segmenting the image.  We're not waiting for a response from this one so use threading
threading.Thread(target=sendData, args=(url, command)).start()

# Return nothing
message = ""

# Return stuff to client
print("""Content-type: text/html

{}""".format(message))
