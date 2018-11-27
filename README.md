# The Gumpifier
The Gumpifier is a collaborative project between Argon Design and Dovetailed which allows the automatic insertion of a picture of a person into a background scene.  It uses convolutional neural networks to segment images into 'person' and a list of other objects before using this information to do the composition.

## Cloning the repository

The gumpifier repository contains a large file (weights for the neural
network), which doesn't play very well with native git. As such, we
use [Git LFS](https://git-lfs.github.com/) to store it.

To clone the repository, you'll need Git LFS installed in advance. On
a Debian derivative, you can install it with `apt-get install
git-lfs`. Once this is installed, the usual command should work:

    git clone https://github.com/ArgonDesign/gumpifier.git

## Running as a web app

### First time: Setup the Python virtual environment and MaskRCNN Dataset

1. `cd path/to/repo/`

2. `python3 -m venv venv`

3. `source venv/bin/activate`

4. `python -m pip install --upgrade pip`

5. `pip install -r requirements.txt`

6. For windows: (Ensure you have Visual C++ 2015 build tools) `pip install git+https://github.com/philferriere/cocoapi.git#subdirectory=PythonAPI`

   Linux: `pip install git+https://github.com/waleedka/coco.git#subdirectory=PythonAPI`

7. `cd API/Mask_RCNN/`

8.  `pip install -r requirements.txt`

9. `python setup.py install`

10. `cd ../..`

11. Build the blog post and copy it to webApp:
    ```bash
    cd GumpifierBlog
    python generate.py
	cd output
	cp -r blogPost.html blogPost.css images ../../webApp
    cd ../..
    ```

### Set the Tensorflow server running

1. `python TF_server.py`

TF_server.py will search for a free port and save it in portConfig.txt.  TF_interface.py reads this value and uses it to communicate with TF_server.py.  If you want to run TF_server.py on a different port, you can change portConfig.txt and restart TF_server.py.

### Set the http server going (built on Ubuntu)

See information in repo/uWSGI/README.md for help on building uWSGI for a different system.

1. In a different console window: `cd` into the repo and activate the venv
2. `cd uWSGI`
3. `./uwsgi --http --ini config.ini`.  You can configure the port from which the website is served be changing 'config.ini'.

## Files and directory listing

Each directory has a README.md file which documents, in the detail, its purpose.

* `API/` - contains the backend code
* `DocumenttationResource` - contains diagrams for the documentation.
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

## Overall Operation

The series of events when the user presses a button on the front end is show in the diagram below.  The white boxes name what module handles the request, the coloured boxes depict where in the repo the associated code resides: each location has its own README.md providing more details.

![](DocumentationResources/HighLevelDiagram.svg)
