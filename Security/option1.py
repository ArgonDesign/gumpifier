#!/usr/bin/python3
# -*- coding: utf-8 -*-

import cgi

form = cgi.FieldStorage()

with open("option1Log.txt", "w") as f:
	f.write("Bad")

print("""Content-type: text/plain

Bad""")