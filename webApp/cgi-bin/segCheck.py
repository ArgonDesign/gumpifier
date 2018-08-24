#!/usr/bin/python3
# -*- coding: utf-8 -*-

################################################################################
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Author : Patrick Taylor
################################################################################

"""
This CGI script asks the TF server to tell it when a certain image has finished segementing

CGI args:
	JSON.  Either {'fg_url': url} or {'bg_url': url}
CGI return:
	JSON.  {done: url} - returned when the TF server says segmentation is finished.
"""

import cgi, os
import cgitb; cgitb.enable() # Traceback enable
from TF_interface import sendData

form = cgi.FieldStorage()

os.chdir("..")

if 'fg_url' in form:
	url = form['fg_url'].value
	command = 'chkF'
elif 'bg_url' in form:
	url = form['bg_url'].value
	command = 'chkB'

message = sendData(url, command)

print("""Content-type: text/html

{}""".format(message))
