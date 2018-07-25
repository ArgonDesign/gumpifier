import socket
import json

class TF_Socket():
	def __init__(self, TF_fn):
		# Create the socket and bind to a port
		self.serversocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		self.serversocket.bind(('localhost', 1475))

		# Store a reference to the TF tensors to run and a callback function when they have been run
		self.TF_fn = TF_fn

	def startListening(self):
		# Start listening
		self.serversocket.listen(5)

		# Main loop
		while 1:
			# Accept a connection
			(clientsocket, address) = serversocket.accept()

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
			data = json.loads(data)
			print(data,)

			# Do Tensorflow stuff and return
			return self.TF_fn(data)

if __name__ == "__main__":
	tfs = TF_Socket()
	tfs.startListening()