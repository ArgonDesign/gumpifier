################################################################################
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Author : Patrick Taylor
################################################################################

"""
This program provides a server which gives predictions from a Tensorflow (TF) model.  The model is loaded when the TF_socket class is instantiated
before it starts listening on localhost (port defined in portConfig.txt) for commands.  The two levels of data transfer are:

* Socket level.  We transfer a command and arbitrarily sized data using the following format:
	Length: 5 bytes (= len(command) + len(data) = 4 + len(data))
	Command: 4 bytes
	Data: variable length
* Server level.  The command can be one of 'sgtF', 'sgtB', 'egFG', 'egBG', 'chkF', 'chkB', 'gump', 'post' (for 'segment 
	foreground', 'segment background', 'example foreground', 'example background', 'check foreground', 'check background',
	'Gumpify', 'post process').
	We use the command to decide how to process the data and what to send back to the client at the other end of the socket.
"""

import socket
import json
import API
import threading
import traceback
import os
import time

PREFIX = "webApp"

class TF_Socket():
	def __init__(self):
		"""
		Create a server socket and initialise the TF model
		"""

		# Create the socket and bind to a port
		with open('portConfig.txt', 'r') as f:
			port = int(f.read())
		self.serversocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		self.serversocket.bind(('localhost', port))

		# Initialise the observer pattern for segmenting completion callback registering
		self.segObs = SegmentObserver()

		# Initialize the TF model
		self.api = API.API.API()

	def startListening(self):
		"""
		Begin the main loop of the server.  Receive data, parse it and hand over to the dispatcher.
		"""

		# Start listening
		self.serversocket.listen(5)
		print("Ready to accept connections")

		# Main loop
		while 1:
			# Accept a connection
			(clientsocket, address) = self.serversocket.accept()

			# Data format is:
			# 	Length: 5 bytes (= len(command) + len(data) = 4 + len(data)
			# 	Command: 4 bytes
			# 	Data: variable

			# Make sure we receive at least 5 bytes to get the length
			chunks = []
			bytes_recd = 0
			while bytes_recd < 5:
				chunk = clientsocket.recv(5 - bytes_recd)
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
				chunk = clientsocket.recv(min(length - bytes_recd, 2048))
				if chunk == '':
					break
				chunks.append(chunk.decode())
				bytes_recd += len(chunk)

			# Print the data
			data = ''.join(chunks)
			command = data[:4]
			data = data[4:]

			# Call the dispatcher in a new thread to start the relevent process running
			threading.Thread(target=self.dispatcher, args=(data, command, clientsocket)).start()

			# Delete old files in the storage/ folder
			self.cleanUp()

	def dispatcher(self, data, command, socket):
		"""
		Dec
		Decide what to do with the data depending on the command; do it and return a result along the socket before destroying the socket.
		For 'sgtF' and 'sgtB' we send the null response, close the socket then start TF processing.
		For 'gump' and 'post' we do the processing then send the response.
		The implementations for each command are in separate methods below

		Args:
			data (str): data sent from the client
			command (str): one of 'sgtF', 'sgtB', 'gump', 'post'
				-> 'sgtF' - segment the foreground.
				-> 'sgtB' - segment the background
				-> 'chk{F,B}' - use the Observer to tell the client when an image has been segmented
				-> 'eg{F,B}G' - use an example image
				-> 'gump' - Gumpify the segemented foreground and background.  Return suggested parameters to user
				-> 'post' - post process the user-tweaker parameters and return a reference to the final image
			socket (socket): the socket to send reply data along.
		Returns:
			None
		"""
		print("Received command: {}".format(command))

		switchDict = {
			'sgtF': self.segmentForeground,
			'egFG': self.segmentForeground,
			'sgtB': self.segmentBackground,
			'egBG': self.segmentBackground,
			'chkF': self.checkImage,
			'chkB': self.checkImage,
			'gump': self.gumpify,
			'post': self.postProcess
		}

		# Run the relevant command, or produce an error if an unrecognised command is received
		if command not in switchDict:
			self.sendResponse("ERROR", socket)
		else:
			switchDict[command](data, socket)

	def cleanUp(self):
		"""
		This function is run each time a connection is accepted.  It checks for files in the uploads
		folder for which the modification time is greater than 5 days old and deletes them.
		Then it runs an API function to clean up the internal dictionaries there.
		Finally runs a cleanup function for the Observer pattern
		"""
		# Remove old files
		for file in os.listdir(os.path.join(PREFIX, "storage")):
			fiveDaysInSeconds = 5*24*60*60
			if file == ".gitkeep": continue
			path = os.path.join(PREFIX, "storage", file)
			timeDifference = time.time() - os.path.getmtime(path)
			if timeDifference > fiveDaysInSeconds:
				try: # Concurrency means the file might have already been deleted
					os.remove(path)
				except:
					traceback.print_exc()

		# Clean up API internals
		self.api.clear_dict()

		# Clean up the segment observer - uses code similar to the above API call
		files_remaining = set(os.path.join(PREFIX, "storage", x) for x in os.listdir(os.path.join(PREFIX, "storage")))
		self.segObs.intersect(files_remaining)

	def sendResponse(self, response, socket):
		"""
		Sends response to socket, with a 5 byte length field at the start, then destroys the socket
		"""
		toSend = "{:0>5}".format(len(response)) + response
		print("Sending this: {}".format(toSend))
		totalsent = 0
		while totalsent < len(toSend):
			sent = socket.send(toSend[totalsent:].encode())
			if sent == 0:
				break
			totalsent = totalsent + sent

		socket.close()

	"""
	The following methods are the implementations for the each command w emight receive
	Each takes the same args are returns None, as follows:
	Args:
		data: variable type - the data from the client.
		socket - the socket to which to send a reply
	"""
	def segmentForeground(self, data, socket):
		"""
		Calls the API to set the given foreground segmenting
		"""
		# Signal that there is no return data to receive
		self.sendResponse("", socket)
		# Set the foreround segmenting
		try:
			url = os.path.join(PREFIX, data)
			self.api.load_foreground(url, fn=lambda: self.segObs.addStatus(url=url))
			print("Segmented foreground successfully")
		except:
			traceback.print_exc()
			print("Error segmenting foreground")

	def segmentBackground(self, data, socket):
		"""
		Calls the API to set the given background segmenting
		"""
		# Signal that there is no return data to receive
		self.sendResponse("", socket)
		# Set the foreround segmenting
		try:
			url = os.path.join(PREFIX, data)
			self.api.load_background(url, fn=lambda: self.segObs.addStatus(url=url))
			print("Segmented foreground successfully")
		except:
			traceback.print_exc()
			print("Error segmenting foreground")		

	def checkImage(self, data, socket):
		"""
		Registers a callback function with the Observer pattern.  When the image given in 'data' has been segmented,
		the callback function is run.  This function returns 'true' to the front end client to signal that the image
		has finished segementing.
		"""
		imageURL = os.path.join(PREFIX, data)
		callbackFunction = lambda: self.sendResponse(json.dumps({"done": True}), socket)
		self.segObs.addFn(url=imageURL, fn=callbackFunction)

	def gumpify(self, data, socket):
		"""
		Calls the API to build the appropriate response to the gumpify button.  Due to slight differences in JSON
		format between what the API returns and what the front end expects, we do some processing of the JSON here.
		"""
		data = json.loads(data)
		try:
			response = self.api.build_response(os.path.join(PREFIX, data['fg_url']), os.path.join(PREFIX, data['bg_url']))
			# Remove the leading 'webApp/'
			response["foreground"] = [os.path.relpath(path, PREFIX) for path in response["foreground"]]
			response["background"] = [os.path.relpath(path, PREFIX) for path in response["background"]]
			response["cutout"] = os.path.relpath(response["cutout"], PREFIX)
			response["background_masks"] = [os.path.relpath(path, PREFIX) for path in response["background_masks"]]

			response = json.dumps(response)
		except Exception as err:
			traceback.print_exc()
			response = "ERROR"

		self.sendResponse(response, socket)

	def postProcess(self, data, socket):
		"""
		Calls the API to perform post-processing on the given data when the front end 'Download' button is pressed.
		As in the gumpify() function, we do some processing on the JSON we pass to the API.
		"""
		data = json.loads(data)
		# Marshall data
		cutout = os.path.join(PREFIX, data['FG_cutout_URL'])
		layer = data['layer']
		foreground = [os.path.join(PREFIX, postfix) for postfix in data['BG_segment_URLs'][layer:]]
		background = [os.path.join(PREFIX, postfix) for postfix in data['BG_segment_URLs'][:layer]]
		position = data['position']
		scale = data['scale']
		original_BG_URL = os.path.join(PREFIX, data['original_BG_URL'])

		print(cutout, foreground, background, position, scale, original_BG_URL)

		# Get response
		try:
			response = self.api.create_image(cutout, foreground, background, position, scale, original_BG_URL)
			response = os.path.relpath(response, PREFIX)
		except Exception as err:
			traceback.print_exc()
			response = "ERROR"

		self.sendResponse(response, socket)


class SegmentObserver():
	"""
	We associate a SegmentObserver instance with the TF_Socket object to track which images have been segmented.
	Implements the Observer patter.

	The client needs to asynchronously know when an image has finishe segmenting.  To this end, it sends a request to 
	the TF_server with the url of the image is was given asking if the image has been segmented yet.  When the TF_server
	reveives this request, the segmenting may, or may not, be complete.  Thus, we use a callback function with the open
	socket from the request, which is called immediately if the segmenting has finished, or is registered to this
	observer if not.  When the segmentation has finished, the segmentation method calls the Observer and the callback
	function is called.

	Note the use of locks to avoid race conditions between the reqest and the segmentation methods, and the ordering of
	lock acquisition to prevent deadlock.

	Most of this function, admittedly, consists of print statements to aid debugging.
	"""
	def __init__(self):
		# Create a map of {url: status}
		self.statusMap = {}
		self.statusMapLock = threading.Lock()
		# Create a map of {url: fn}
		self.fnMap = {}
		self.fnMapLock = threading.Lock()

	def addFn(self, url, fn):
		"""
		Args:
			url: string - the url of the resource for which we register a callback
			fn: function - the callback function executed once the image at url has been segmented
		Returns:
			None
		Operation:
			Locks both maps to ensure correct concurrent execution
			If the URL has already been segmented: remove entry from the status map, releases locks and executes function
			If not: registers the (url, fn) pair in the function map then releases locks
		"""
		print("addFn acquiring locks")
		self.statusMapLock.acquire()
		self.fnMapLock.acquire()
		print("addFn acquired locks")
		print("statusMap: {}".format(self.statusMap))
		print("fnMap: {}".format(self.fnMap))

		if url in self.statusMap:
			print("url is already present, deleting from statusMap")
			del self.statusMap[url]
			print("statusMap: {}".format(self.statusMap))
			self.fnMapLock.release()
			self.statusMapLock.release()
			print("locks released")
			fn()
		else:
			print("url not already present, registering fn")
			print("Here's the URL: {}".format(url))
			self.fnMap[url] = fn
			print("statusMap: {}".format(self.statusMap))
			print("fnMap: {}".format(self.fnMap))
			self.fnMapLock.release()
			self.statusMapLock.release()
			print("locks released")

	def addStatus(self, url):
		"""
		Args:
			url: string - the url of the resource which has been segmented
		Returns:
			None
		Operation:
			Locks both maps to ensure correct concurrent execution.
			If the URL already has a callback function registered, removes the entry from the function map, releases
			locks and executes the callback.
			If not: registers the (url, True) pair in the status map
		"""
		print("addStatus acquiring locks")
		self.statusMapLock.acquire()
		self.fnMapLock.acquire()

		print("addStatus acquired locks")
		print(self.statusMap)
		print(self.fnMap)

		if url in self.fnMap:
			print("Fn is already present, deleting from fnMap")
			toRun = self.fnMap[url]
			del self.fnMap[url]
			print(self.fnMap)
			self.fnMapLock.release()
			self.statusMapLock.release()
			print("locks released")
			toRun()
		else:
			print("fn not already present, registering status")
			self.statusMap[url] = True
			print(self.statusMap)
			self.fnMapLock.release()
			self.statusMapLock.release()
			print("locks released")

	def intersect(self, urlSet):
		"""
		Args:
			urlSet: set - a set of urls which are still present in the storage/ directory
		Returns:
			None
		Operation:
			Removes entries from the maps which are no longer in the storage/ directory
		"""
		# Acquire locks
		print("Cleaning up Segment Observer")
		self.statusMapLock.acquire()
		self.fnMapLock.acquire()

		# Find the files to remove
		for theMap in [self.statusMap, self.fnMap]:
			uniqueKeys = set(theMap.keys())
			commonPathNames = uniqueKeys & urlSet
			toDelete = uniqueKeys - commonPathNames

			print("Originally: {}".format(theMap))
			for path in toDelete:
				del(theMap[path])
			print("Now: {}".format(theMap))

		# Release locks
		self.fnMapLock.release()
		self.statusMapLock.release()

if __name__ == "__main__":
	tfs = TF_Socket()
	tfs.startListening()