"""
This program provides a server which gives predictions from a Tensorflow (TF) model.  The model is loaded when the TF_socket class is instantiated
before it starts listening on localhost:1475 for commands.  The two levels of data transfer are:

* Socket level.  We transfer a command and arbitrarily sized data using the following format:
	Length: 5 bytes (= len(command) + len(data) = 4 + len(data)
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
		f = open('portConfig.txt', 'r')
		port = int(f.read())
		f.close()
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

			threading.Thread(target=self.dispatcher, args=(data, command, clientsocket)).start()

			self.cleanUp()

	def dispatcher(self, data, command, socket):
		"""
		Decide what to do with the data depending on the command; do it and return a result along the socket before destroying the socket.
		For 'sgtF' and 'sgtB' we send the null response, close the socket then start TF processing.
		For 'gump' and 'post' we do the processing then send the response.

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
		"""
		response = None

		print("Received command: {}".format(command))

		if command in ['sgtF', 'sgtB', 'egFG', 'egBG']:
			# Signal that there is no return data to receive
			totalsent = 0
			while totalsent < 5:
				sent = socket.send("00000".encode())
				if sent == 0: break
				totalsent = totalsent + sent
			socket.close()

		if command in ['sgtF', 'egFG']:
			# Set the foreround segmenting
			try:
				url = os.path.join(PREFIX, data)
				self.api.load_foreground(url, fn=lambda: self.segObs.addStatus(url=url))
				print("Segmented foreground successfully")
			except:
				traceback.print_exc()
				print("Error segmenting foreground")
			return
		elif command in ['sgtB', 'egBG']:
			# Set the background segmenting
			try:
				url = os.path.join(PREFIX, data)
				self.api.load_background(url, fn=lambda: self.segObs.addStatus(url=url))
				print("Segmented background successfully")
			except:
				traceback.print_exc()
				print("Error segmenting background")
			return
		elif command in ['chkF', 'chkB']:
			self.segObs.addFn(url=os.path.join(PREFIX, data), fn=lambda: self.sendResponse(json.dumps({"done": True}), socket))
			return
		elif command == 'gump':
			data = json.loads(data)
			try:
				response = self.api.build_response(os.path.join(PREFIX, data['fg_url']), os.path.join(PREFIX, data['bg_url']))
				# Remove the leading 'webApp/'
				response["foreground"] = [os.path.relpath(path, PREFIX) for path in response["foreground"]]
				response["background"] = [os.path.relpath(path, PREFIX) for path in response["background"]]
				response["cutout"] = os.path.relpath(response["cutout"], PREFIX)
				response["background_masks"] = [os.path.relpath(path, PREFIX) for path in response["background_masks"]]
				response["background_outlines"] = [os.path.relpath(path, PREFIX) for path in response["background_outlines"]]

				response = json.dumps(response)
			except Exception as err:
				traceback.print_exc()
				response = "ERROR"
		elif command == 'post':
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
		else:
			response = "ERROR"


		# === Send the response if needed === #
		self.sendResponse(response, socket)

	def cleanUp(self):
		"""
		This function is run each time a connection is accepted.  It checks for files in the uploads
		folder for which the modification time is greater than 30 days old and deletes them.
		"""
		for file in os.listdir(os.path.join(PREFIX, "storage")):
			fiveDaysInSeconds = 5*24*60*60
			path = os.path.join(PREFIX, "storage", file)
			timeDifference = time.time() - os.path.getmtime(path)
			if timeDifference > fiveDaysInSeconds:
				try: # Concurrency means the file might have already been deleted
					os.remove(path)
				except:
					traceback.print_exc()

	def sendResponse(self, response, socket):
		"""
		Sends response to socket, with a 5 byte length field at the start.
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


if __name__ == "__main__":
	tfs = TF_Socket()
	tfs.startListening()