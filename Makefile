# *******************************************************************************
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Module : gumpifier
# Author : Steve Barlow
#
# DESCRIPTION:
# Makefile to install packages required to run gumpifier, starting from the
# files in version control. Valid targets are:
#
# make build        (This is the default if you just run make.) Creates
#                   a Python3 virtual environment. Installs required Python
#                   packages using pip. Clones and installs pycocotools
#                   to segment images.
#
#                   Once built, gumpifier can be run as described in
#                   README.md
#
# make clean        Remove all files created by make build or running
#                   gumpifier, leaving just the files under version
#                   control.
#
# The Makefile also includes targets to create a Docker image that can be
# deployed in the cloud:
#
# make dockerbuild  Create a docker image named gumpifier. Does not
#                   require make build to have been called beforehand.
#                   The recipe is specified in Dockerfile. The image is
#                   built without using the cache to assure its
#                   integrity.
#
# make dockerclean  Kill all running Docker containers, remove all images
#                   and all containers. Note that this is much more invasive
#                   than just this application and affects all uses of Docker
#                   on the machine.
#
# Things that must be already installed to build an Docker image:
#
# 1. docker (https://www.docker.com/)
#    To install on Ubuntu see https://docs.docker.com/install/linux/docker-ce/ubuntu/
# *******************************************************************************

.PHONY: all build clean standard dockerimage dockerclean

default: build

build:
	bash -c "python3 -m venv venv; \
		source venv/bin/activate; \
		python -m pip install --upgrade pip; \
		pip install -r requirements.txt; \
		pip install git+https://github.com/waleedka/coco.git#subdirectory=PythonAPI; \
		cd API/Mask_RCNN/; \
		pip install -r requirements.txt; \
		python setup.py install"

clean:
	rm -rf webApp/cgi-bin/__pycache__ \
		webApp/storage/*.png \
		webApp/storage/*.jpg \
		API/__pycache__ \
		API/Mask_RCNN/dist \
		API/Mask_RCNN/build \
		API/Mask_RCNN/mask_rcnn.egg-info \
		Logs \
		portConfig.txt \
		venv

dockerbuild:
	docker build --no-cache -t gumpifier .

dockerclean:
	-docker kill $$(docker ps -q)
	-docker rm $$(docker ps --filter=status=exited --filter=status=created -q)
	-docker rmi --force $$(docker images -a -q)
