# Webserver

In principal, any reasonable webserver can be used.  In fact, we used Python's simpleHTTPServer module for development.  We use uWSGI in an slightly unintended way: it's the main http server, not a wsgi server which is called by another http server in front of it.  This rout was chosen in case the CGI scripts are later re-written to use wsgi.  If you do not use uWSGI as packaged here, see below.

## Detail on specific files

* `uwsgi` - the executable web server
* `cgi_plugin.so` - a plugin to allow CGI scripts to be run.
* `config.ini` - configuration file for the server

## Using uWSGI

Ensure the current directory is `uWSGI` and run `./uwsgi --http --ini config.ini`

* `--http` specifies we use uWSGI as the main http server.

`config.ini` is constructed from <http://uwsgi-docs.readthedocs.io/en/latest/CGI.html>.  An important line is `threads = 20`: this allows multiple CGI scripts to run concurrently, a necessity for smooth running of the frontend.

The following links explain the setup in more detail:

* <https://uwsgi-docs.readthedocs.io/en/latest/StaticFiles.html>
* <http://uwsgi-docs.readthedocs.io/en/latest/CGI.html>
* <https://uwsgi-docs.readthedocs.io/en/latest/Configuration.html>

## Upgrading uWSGI

The following steps were used to build uwsgi and cgi_plugin.so:

`wget https://projects.unbit.it/downloads/uwsgi-2.0.17.1.tar.gz`

`tar zxvf [file]`

`cd [extracted folder]`

`make`

`python uswgiconfig.py --plugins/cgi`

The following links are helpful:

* [https://uwsgi-docs.readthedocs.io/en/latest/Download.html](https://uwsgi-docs.readthedocs.io/en/latest/Download.html)

* <https://uwsgi-docs.readthedocs.io/en/latest/Install.html>
* 

## Not using uWSGI

If you prefer to use a different webserver make sure that:

* It serves static files from `repo/webApp`
* It can execute CGI scripts from `repo/webApp/cgi-bin`
* It can handle concurrent requests to CGI scripts.