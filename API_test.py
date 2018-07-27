# from API import API
import API
import os
import threading

class TF_Socket():
	def __init__(self):
		# api = API()
		self.api = API.API.API()

		threading.Thread(target=self.dispatcher).start()

	def dispatcher(self):
		# api.load_foreground("../webApp/storage/1baed4a9e4c65e1789e1a2ce40330e16.png")
		# api.load_foreground("webApp/storage/1baed4a9e4c65e1789e1a2ce40330e16.png")
		prefix = "webApp"
		data = "storage/1baed4a9e4c65e1789e1a2ce40330e16.png"
		self.api.load_foreground(os.path.join(prefix, data))

		print("Success!")


tfs = TF_Socket()