"""
This program provides a server which gives predictions from a Tensorflow (TF) model.  The model is loaded when the TF_socket class is instantiated
before it starts listening on localhost:1475 for commands.  The two levels of data transfer are:

* Socket level.  We transfer a command and arbitrarily sized data using the following format:
	Length: 5 bytes (= len(command) + len(data) = 4 + len(data)
	Command: 4 bytes
	Data: variable length
* Server level.  The command can be one of 'sgtF', 'sgtB', 'gump', 'post' (for 'segment foreground', 'segment background', 'Gumpify', 'post process').
	We use the command to decide how to process the data and what to send back to the client at the other end of the socket.
"""

import socket
import json
import API
import threading
import traceback
import os

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
			# self.dispatcher(data, command, clientsocket)

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
				-> 'gump' - Gumpify the segemented foreground and background.  Return suggested parameters to user
				-> 'post' - post process the user-tweaker parameters and return a reference to the final image
			socket (socket): the socket to send reply data along.
		"""
		prefix = "webApp"
		response = None

		print("Received command: {}".format(command))

		if command in ['sgtF', 'sgtB'] :
			# Signal that there is no return data to receive
			totalsent = 0
			while totalsent < 5:
				sent = socket.send("00000".encode())
				if sent == 0: break
				totalsent = totalsent + sent	
			socket.close()

		if command == 'sgtF':
			# Set the foreround segmenting
			try:
				url = os.path.join(prefix, data)
				self.api.load_foreground(url, fn=lambda: self.segObs.addStatus(url=url))
				print("Segmented foreground successfully")
			except:
				traceback.print_exc()
				print("Error segmenting foreground")
			return
		elif command == 'sgtB':
			# Set the background segmenting
			try:
				url = os.path.join(prefix, data)
				self.api.load_background(url, fn=lambda: self.segObs.addStatus(url=url))
				print("Segmented background successfully")
			except:
				traceback.print_exc()
				print("Error segmenting background")
			return
		elif command in ['chkF', 'chkB']:
			self.segObs.addFn(url=os.path.join(prefix, data), fn=lambda: self.sendResponse(json.dumps({"done": True}), socket))
			return
		elif command == 'gump':
			data = json.loads(data)
			try:
				response = self.api.build_response(os.path.join(prefix, data['fg_url']), os.path.join(prefix, data['bg_url']))
				# Remove the leading 'webApp/'
				print(response["cutout"], os.path.relpath(response["cutout"], prefix))
				response["foreground"] = [os.path.relpath(path, prefix) for path in response["foreground"]]
				response["background"] = [os.path.relpath(path, prefix) for path in response["background"]]
				response["cutout"] = os.path.relpath(response["cutout"], prefix)

				response = json.dumps(response)
			except Exception as err:
				traceback.print_exc()
				response = "ERROR"
		elif command == 'post':
			data = json.loads(data)
			# Marshall data
			cutout = os.path.join(prefix, data['FG_cutout_URL'])
			layer = data['layer']
			foreground = [os.path.join(prefix, postfix) for postfix in data['BG_segment_URLs'][layer:]]
			background = [os.path.join(prefix, postfix) for postfix in data['BG_segment_URLs'][:layer]]
			position = data['position']
			scale = data['scale']
			# Get response
			try:
				response = self.api.create_image(cutout, foreground, background, position, scale)
			except Exception as err:
				traceback.print_exc()
				response = "ERROR"
		else:
			response = "ERROR"


		# === Send the response if needed === #
		self.sendResponse(response, socket)

	def cleanUp():
		"""
		This function is run as a thread each time the a connection is accepted.  It checks for files in the uploads
		folder that are greater than 30 days old and deletes them.
		"""

	def sendResponse(self, response, socket):
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
		print(self.statusMap)
		print(self.fnMap)

		if url in self.statusMap:
			print("url is already present, deleting from statusMap")
			del self.statusMap[url]
			print(self.statusMap)
			self.fnMapLock.release()
			self.statusMapLock.release()
			print("locks released")
			fn()
		else:
			print("url not already present, registering fn")
			print(url)
			self.fnMap[url] = fn
			print(self.fnMap)
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