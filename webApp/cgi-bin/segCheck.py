#!/usr/bin/python3
# -*- coding: utf-8 -*-

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
