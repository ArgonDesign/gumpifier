#!/usr/bin/python3
# -*- coding: utf-8 -*-

import cgi, os
import cgitb; cgitb.enable() # Traceback enable
import json
from TF_interface import sendData

form = cgi.FieldStorage()

# Get the URLs for the foreground and background images
fg_url = form['fg_url'].value
bg_url = form['bg_url'].value

# === Option 1 Hacky thing to allow uploading of zip files and JSON file === #
# Unzip fg stuff
# import sys
# print("""Content-type: text/plain

# {}""".format(fg_url))
# sys.exit()
if fg_url != 'storage/Poirot_cutout_256x256.PNG':
	import zipfile
	zip_ref = zipfile.ZipFile(fg_url[:-1])
	zip_ref.extractall("Resources/patrick_json_dynamic")
	zip_ref.close()

	prefix = "Resources/patrick_json_dynamic/"
else:
	prefix = "Resources/patrick_json_static/"
	# prefix = "Resources/patrick_json_dynamic/"

# === Option 2 === #
# Ignore the above URLs for the minute, and return a list of URLs to the background images
# Package up some JSON stuff
# prefix = "Resources/patrick_json/"
f = open(prefix + "patrick.json", "r")
importedJSON = json.loads(f.read())
f.close()

BG_segment_URLs = [prefix + path for path in importedJSON['background'] + importedJSON['foreground']]
FG_cutout_URL = prefix + importedJSON['cutout']
layer = len(importedJSON['background']) - 1
position = importedJSON['position']
scale = importedJSON['scale']

# === Option 3 Make up some data === #
# BG_segment_URLs = ['Resources/BGTest1.png', 'Resources/BGTest2.png', 'Resources/BGTest3.png', 'Resources/BGTest4.png']
# FG_cutout_URL = "storage/Poirot_cutout_original.png"
# layer = 2
# position = (0.0, 0.5)
# scale = (0.5, 0.5)

# === Option 4 Ask the TF server to give us the data === #
# returnJSON = sendData(json.dumps({"fg_url": fg_url, "bg_url": bg_url}), "gump")

# === Create the dictionary to return === #
returnDict = {
	"BG_segment_URLs": BG_segment_URLs,
	"FG_cutout_URL": FG_cutout_URL,
	"layer": layer,
	"position": position,
	"scale": scale
}

returnJSON = json.dumps(returnDict)

# Return stuff to server
dataType = "application/json"
# dataType = "text/plain"

print("""Content-type: {}

{}""".format(dataType, returnJSON))