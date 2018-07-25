#!/usr/bin/python3
# -*- coding: utf-8 -*-

import os
import sys
import socket
import json

def sendData(data, command):
	# Data format is:
	# 	Length: 5 bytes (= len(command) + len(data) = 4 + len(data)
	# 	Command: 4 bytes
	# 	Data: variable
	length = "{:0>5}".format(len(command) + len(data)) # Left align the length by padding zeros to 5 characters long
	toSend = length + command + data

	# === Set up the socket === #
	# https://docs.python.org/2/howto/sockets.html

	# Create the socket and connect to TF server
	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	s.connect(('localhost', 1475))

	# === Send the data === #
	totalsent = 0
	while totalsent < len(toSend):
		sent = s.send(toSend[totalsent:].encode())
		if sent == 0:
			break
		totalsent = totalsent + sent

	# === Reveive response data === #
	chunks = []
	bytes_recd = 0
	while bytes_recd < 5:
		chunk = s.recv(5 - bytes_recd)
		if chunk == '':
			break
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
			break
		chunks.append(chunk.decode())
		bytes_recd += len(chunk)

	response = ''.join(chunks)

	return response