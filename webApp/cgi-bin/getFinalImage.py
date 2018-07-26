#!/usr/bin/python3
# -*- coding: utf-8 -*-

"""
This CGI script takes the user tweaks to the suggested parameters, and returns a reference to the final, processed, image.
We do not parse the JSON here but pass it on directly to the server.

CGI args:
	JSON.	As specified in P8010-S-001.  User tweaked versions of original call to getScreen2Data.py.
			Keys: 'BG_segment_URLs', 'FG_cutout_URL', 'layer', 'position', 'scale'
CGI return:
	String.	URL reference to the final image.
"""

import os
import sys
from TF_interface import sendData
import traceback

# === Receive the data from the webpage === #
content_len = int(os.environ["CONTENT_LENGTH"]) # https://stackoverflow.com/questions/10718572/post-json-to-python-cgi
data = sys.stdin.read(content_len)

# === Send to the TF server === #
message = None
dataType = None

try:
	message = sendData(data, command='post')
	dataType = "application/json"
except ConnectionAbortedError:
	message = "ERROR\n{}".format(traceback.format_exc())
	dataType = "text/plain"
except ValueError:
	message = "ERROR\n{}".format(traceback.format_exc())
	dataType = "text/plain"
except ConnectionRefusedError:
	message = "ERROR\n{}".format(traceback.format_exc())
	dataType = "text/plain"

print("""Content-type: {}

{}""".format(dataType, message))