# The Gumpifier
The Gumpifier is a collaborative project between Argon Design and Dovetailed which allows the automatic insertion of a picture of a person into a background scene.  It uses convolutional neural networks to segment images into 'person' and a list of other objects before using this information to do the composition.

## Running as a web app

### First time: Setup the Python virtual environment and MaskRCNN Dataset

1. `cd path/to/repo/`

2. `python3 -m venv venv`

3. `source venv/bin/activate`

4. `python3 -m pip install --upgrade pip`

5. `pip install -r requirements.txt`

6. For windows: (Ensure you have Visual C++ 2015 build tools) `pip install git+https://github.com/philferriere/cocoapi.git#subdirectory=PythonAPI`

   Linux: `pip install git+https://github.com/waleedka/coco.git#subdirectory=PythonAPI`

7. `python3 API/Mask_RCNN/setup.py install`

   

### Set the Tensorflow server running

1. `python TF_server.py`

If the port TF_server.py attempts to use is in use, you can change it in `portConfig.txt`.

### Set the http server going

1. In a different console window: `cd` into the repo and activate the venv
2. `cd uWSGI`
3. `./uwsgi --http --ini config.ini`

## Files and directory listing

Each directory has a README.md file which documents, in the detail, its purpose.

* `API/` - contains the backend code.
* `Logs/` - 
* `uWSGI/` - a basic webserver and config file for the webapp.
* `webApp/` - frontend code (HTML, CSS, JS) and CGI scripts (PY) which provide interface between the backend API and frontend.
* `portConfig.txt` - what port the TF_server.py listens on.
* `TF_server.py` - a local middleware server which provides an interface for the CGI scripts to access the backend API.

## Detail on specific files

### TF_server.py

The neural network model is complex and there is overhead into loading the weights into memory.  TF_server.py takes the hit of this overhead once, when it is loaded, before allowing multiple socket connections to request predictions.  These socket connections come from the CGI scripts, requested by user actions on the front end and run by the web server.

### portConfig.txt

TF_server.py listens on this port for incoming connections from the CGI scripts.  The CGI scripts themselves need to know what port is used, hence the presence of this file.
