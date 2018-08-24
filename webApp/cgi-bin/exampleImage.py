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
This CGI script tells the TF server to use one of the example images.  Currently this just starts the
relevant image segmenting, but in the future could almost instantly return a pre-segmented image.

CGI args:
	JSON.  Either {'fg_url': int} or {'bg_url': int}
CGI preconditions:
	The argument value must be in range 0..3 inclusive.  It is use as an indec to the arrays below
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

# Set the list of images used
foregroundExampleURLs = [	"SharedResources/ExampleImages/FG_Poirot.jpg",
							"SharedResources/ExampleImages/FG_Patrick.jpg",
							"SharedResources/ExampleImages/FG_Mohammed.jpg",
							"SharedResources/ExampleImages/WIN_20180730_15_36_57_Pro.jpg"];
backgroundExampleURLs = [	"SharedResources/ExampleImages/BG_bikes.jpg",
							"SharedResources/ExampleImages/BG_bench_oblique.jpg",
							"SharedResources/ExampleImages/BG_lamp.jpg",
							"SharedResources/ExampleImages/BG_zebras.png"];

# Get the url
if 'fg_url' in form:
	index = int(form['fg_url'].value)
	url = foregroundExampleURLs[index]
	command = 'egFG'
elif 'bg_url' in form:
	index = int(form['bg_url'].value)
	url = backgroundExampleURLs[index]
	command = 'egBG'


hashName = hashlib.md5(str(time.time()).encode("utf8") + str(random.random()).encode("utf8")).hexdigest() + ".jpg"
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
