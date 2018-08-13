#!/usr/bin/python3
# -*- coding: utf-8 -*-

"""
This CGI script returns data to the client necessary for it to set up the second screen.
There are a number of commented out options used for testing (e.g. uploading a zip file with the necessary data bundled)
However the main option (option 4) goes to the TF server to get the data specific to the images passed.

CGI args:
	JSON.  {'fg_url': url of foreground image from imageUpload.py call,
			'bg_url': url of background image from imageUpload.py call}
CGI return:
	JSON.	As specified in P8010-S-001
			Keys: 'BG_segment_URLs', 'FG_cutout_URL', 'layer', 'position', 'scale'
"""

import cgi, os
import cgitb; cgitb.enable() # Traceback enable
import json
from TF_interface import sendData
import traceback

form = cgi.FieldStorage()

# Get the URLs for the foreground and background image URLs
fg_url = form['fg_url'].value
bg_url = form['bg_url'].value

# === Option 1 Hacky thing to allow uploading of zip files and JSON file === #
# Unzip fg stuff
# import sys
# print("""Content-type: text/plain

# {}""".format(fg_url))
# sys.exit()
# if fg_url != 'storage/Poirot_cutout_256x256.PNG':
# 	import zipfile
# 	zip_ref = zipfile.ZipFile(fg_url[:-1])
# 	zip_ref.extractall("Resources/patrick_json_dynamic")
# 	zip_ref.close()

# 	prefix = "Resources/patrick_json_dynamic/"
# else:
# 	prefix = "Resources/patrick_json_static/"
	# prefix = "Resources/patrick_json_dynamic/"

# === Option 2 Package up JSON from a file (either uploade from option 1 or from a different, specified, file === #
DEBUG = False
if DEBUG:
	prefix = "Resources/Eg2/"
	f = open(prefix + "patrick.json", "r")
	importedJSON = json.loads(f.read())
	f.close()

	BG_segment_URLs = [prefix + path for path in importedJSON['background'] + importedJSON['foreground']]
	FG_cutout_URL = prefix + importedJSON['cutout']
	layer = len(importedJSON['background']) - 1
	position = importedJSON['position']
	scale = importedJSON['scale']
	BG_mask_URLs = [prefix + path for path in importedJSON['background_masks']]
	# BG_outline_URLs = [prefix + path for path in importedJSON['background_masks']]
	colour_correction = importedJSON["colour_correction"]

# === Option 3 Make up some data === #
# BG_segment_URLs = ['Resources/BGTest1.png', 'Resources/BGTest2.png', 'Resources/BGTest3.png', 'Resources/BGTest4.png']
# FG_cutout_URL = "storage/Poirot_cutout_original.png"
# layer = 2
# position = (0.0, 0.5)
# scale = (0.5, 0.5)

# === Create the dictionary to return for the above options === #
if DEBUG:
	returnDict = {
		"BG_segment_URLs": BG_segment_URLs,
		"FG_cutout_URL": FG_cutout_URL,
		"layer": layer,
		"position": position,
		"scale": scale,
		"BG_mask_URLs": BG_mask_URLs,
		"colour_correction": colour_correction,
		"labels": None,
		"quotation": "Open the pod bay doors, Hal.  I'm sorry Dave, I'm afraid I can't do that."
	}

# returnJSON = json.dumps(returnDict) # Remove this in production

# === Option 4 Ask the TF server to give us the data === #
def jsonConverter(importedJSON):
	importedJSON = json.loads(importedJSON)
	""" From combinations of the commented out code above """
	BG_segment_URLs = importedJSON['background'] + importedJSON['foreground']
	FG_cutout_URL = importedJSON['cutout']
	layer = len(importedJSON['background']) - 1
	position = importedJSON['position']
	scale = importedJSON['scale']
	BG_mask_URLs = importedJSON['background_masks']
	colour_correction = importedJSON['colour_correction']
	labels = importedJSON["labels"]
	quotation = importedJSON["quote"]

	returnDict = {
		"BG_segment_URLs": BG_segment_URLs,
		"FG_cutout_URL": FG_cutout_URL,
		"layer": layer,
		"position": position,
		"scale": scale,
		"BG_mask_URLs": BG_mask_URLs,
		"colour_correction": colour_correction,
		"labels": labels,
		"quotation": quotation
	}

	return json.dumps(returnDict) # Remove this in production

returnJSON = None

dataType = "application/json" # Keep this in production
try:
	if not DEBUG:
		importedJSON = sendData(json.dumps({"fg_url": fg_url, "bg_url": bg_url}), "gump")
		returnJSON = jsonConverter(importedJSON)
	else:
		returnJSON = json.dumps(returnDict)
except ConnectionAbortedError as err: # TODO: catch all in one like (ConnectionAbortedError, ValueError, ConnectionRefusedError)
	returnJSON = json.dumps({"ERROR": "{}".format(traceback.format_exc())})
except ValueError as err:
	returnJSON = json.dumps({"ERROR": "{}".format(traceback.format_exc())})
except ConnectionRefusedError:
	returnJSON = json.dumps({"ERROR": "{}".format(traceback.format_exc())})

# Return stuff to server
print("""Content-type: {}

{}""".format(dataType, returnJSON))