#!/usr/bin/python3
# -*- coding: utf-8 -*-

import os
import sys
from TF_interface import sendData

# === Receive the data from the webpage === #
content_len = int(os.environ["CONTENT_LENGTH"]) # https://stackoverflow.com/questions/10718572/post-json-to-python-cgi
data = sys.stdin.read(content_len)

# === Option 1: Create some data to send === #
# BG_segment_URLs = ['Resources/BGTest1.png', 'Resources/BGTest2.png', 'Resources/BGTest3.png', 'Resources/BGTest4.png']
# FG_cutout_URL = "storage/Poirot_cutout_original.png"
# layer = 2
# position = (0.0, 0.5)
# scale = (0.5, 0.5)

# returnDict = {
# 	"BG_segment_URLs": BG_segment_URLs,
# 	"FG_cutout_URL": FG_cutout_URL,
# 	"layer": layer,
# 	"position": position,
# 	"scale": scale
# }

# jsonString = json.dumps(returnDict)

# === Option 2: Directly use the CGI data we're given === #
jsonString = data;

message = sendData(data, command='post')

print("""Content-type: application/json

{}""".format(message))