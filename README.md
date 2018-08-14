## Running

### Setup the Python virtual environment

1. `cd path/to/repo/`
2. `python3 -m venv venv`
3. `source venv/bin/activate`
4. `pip install -r requirements.txt`

### Set the Tensorflow server running

1. `python TF_server.py`

### Set the http server going

1. In a different console window: `cd` into the repo and activate the venv
2. `cd uWSGI`
3. `./uwsgi --http --ini config.ini`