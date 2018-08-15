#!/usr/bin/python3
# -*- coding: utf-8 -*-

################################################################################
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Author : Patrick Taylor
################################################################################

"""
This script provides an interface between the CGI scripts in cgi-bin and the Python 'server' script running the loaded TensorFlow (TF) model
and providing predictions from it (i.e. TF_server.py).  It simply transfers data, but does no semantic processing on it.
"""

import os
import sys
import socket
import json

def sendData(data, command):
	"""
	Sends 'data' and 'command' to the TF server along with necessary data such as the length of the transmission
	The transfer protocol is:
		Length: 5 bytes (= len(command) + len(data) = 4 + len(data)
		Command: 4 bytes
		Data: variable length

	Args:
		data (str): the data to send
		command (str):  one of 'sgtF', 'sgtB', 'gump', 'post' (for 'segment foreground', 'segment background', 'Gumpify', 'post process').
						The command we want the TF server to perform
	Returns:
		str: the response from teh TF server

	Raises:
		ConnectionAbortedError: Either data failed to send or be received because the socket is closed
		ValueError: something went wrong at the TensorFlow end of things

		ConnectionRefusedError: probably the TF server not started
	"""

	# === Marshall the overall string to send
	length = "{:0>5}".format(len(command) + len(data)) # Left align the length by padding zeros to 5 characters long
	toSend = length + command + data

	# === Set up the socket === #
	# https://docs.python.org/2/howto/sockets.html

	# Create the socket and connect to TF server
	f = open('../portConfig.txt', 'r')
	port = int(f.read())
	f.close()
	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	s.connect(('localhost', port))

	# === Send the data === #
	totalsent = 0
	while totalsent < len(toSend):
		sent = s.send(toSend[totalsent:].encode())
		if sent == 0:
			raise ConnectionAbortedError("Failed to send the data")
		totalsent = totalsent + sent

	# === Reveive response data === #
	chunks = []
	bytes_recd = 0
	while bytes_recd < 5:
		chunk = s.recv(5 - bytes_recd)
		if chunk == '':
			raise ConnectionAbortedError("Failed to receive length data")
		chunks.append(chunk.decode())
		bytes_recd += len(chunk)

	# Calculate the length we still need to receive and initialse a new chunks array
	combined = ''.join(chunks)
	length = int(combined[:5])
	chunks = [combined[5:]]
	length -= len(chunks[0])

	# Receive the rest of the message
	bytes_recd = 0
	while bytes_recd < length:
		chunk = s.recv(min(length - bytes_recd, 2048))
		if chunk == '':
			raise ConnectionAbortedError("Failed to receive payload data")
		chunks.append(chunk.decode())
		bytes_recd += len(chunk)

	s.close()

	response = ''.join(chunks)

	# Check for errors
	if response == "ERROR":
		raise ValueError("TF Server produced an exception")

	return response