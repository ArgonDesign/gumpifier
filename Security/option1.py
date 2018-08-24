#!/usr/bin/python3
# -*- coding: utf-8 -*-
################################################################################
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Module: Gumpifier
# Author : Patrick Taylor
################################################################################

import cgi

form = cgi.FieldStorage()

with open("option1Log.txt", "w") as f:
	f.write("Bad")

print("""Content-type: text/plain

Bad""")