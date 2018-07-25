import socket
import json
# import API
import threading

class TF_Socket():
	def __init__(self):
		# Create the socket and bind to a port
		self.serversocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		self.serversocket.bind(('localhost', 1475))

		# Initialize the TF model
		# TF_init()

	# def TF_init():
		# self.api = API.API()

	def startListening(self):
		# Start listening
		self.serversocket.listen(5)

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

	def dispatcher(self, data, command, socket):
		if command == 'smgF':
			socket.close()
			# self.api.load_foreground(data)
			return
		elif command == 'smgB':
			socket.close()
			# self.api.load_background(data)
		elif command == 'gump':
			data = json.loads(data)
			toSend = self.api.build_response(data['fg_url'], data['bg_url'])
		elif command == 'post':
			data = json.loads(data)
			print(data.keys())
			# Marshall data
			cutout = data['FG_cutout_URL']
			layer = data['layer']
			foreground = data['BG_segment_URLs'][layer:]
			background = data['BG_segment_URLs'][:layer]
			position = data['position']
			scale = data['scale']
			# Get response
			toSend = self.api.create_image(cutout, foreground, background, position, scale)

		# === Send the response if needed === #
		totalsent = 0
		while totalsent < len(toSend):
			sent = socket.send(toSend[totalsent:].encode())
			if sent == 0:
				break
			totalsent = totalsent + sent

		socket.close()

if __name__ == "__main__":
	tfs = TF_Socket()
	tfs.startListening()