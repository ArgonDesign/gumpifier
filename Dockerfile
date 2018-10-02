# ******************************************************************************
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Module : gumpifier
# Author : Steve Barlow
#
# DESCRIPTION:
# Recipe for gumpifier Docker image
# *******************************************************************************

# Useful websites:
# https://docs.docker.com/get-started/part2/
# https://stackoverflow.com/questions/35594987/how-to-force-docker-for-clean-build-of-an-image
# https://forums.docker.com/t/how-to-delete-cache/5753/2
# https://forums.docker.com/t/error-in-docker-image-creation-invoke-rc-d-policy-rc-d-denied-execution-of-restart-start/880
# https://serverfault.com/questions/618994/when-building-from-dockerfile-debian-ubuntu-package-install-debconf-noninteract
# https://stackoverflow.com/questions/32646255/how-come-mount-command-is-disabled-inside-a-docker-container

# Attempts to reproduce package versions of gumpifier running on Athene
# N.B. Does not require 'make build' to have already been done

FROM ubuntu:14.04
# Includes python 3.4.3

ARG DEBIAN_FRONTEND=noninteractive
RUN echo exit 0 > /usr/sbin/policy-rc.d
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y python3.4-venv python3-dev python3-pip python3-tk git libglib2.0 libsm6 libxml2

# Add gumpifier files
# Uses .dockerignore to exclude files created when building and running locally and just keep the files in git
ADD . /gumpifier
WORKDIR /gumpifier

RUN bash -c "python3 -m venv venv; \
        source venv/bin/activate; \
        python -m pip install --upgrade pip; \
        pip install -r requirements.txt; \
        pip install git+https://github.com/waleedka/coco.git#subdirectory=PythonAPI; \
        cd API/Mask_RCNN/; \
        pip install -r requirements.txt; \
        python setup.py install"

LABEL maintainer="Steve Barlow <steve.barlow@argondesign.com>"

EXPOSE 80

# Run TF_server.py and uWSGI when the container launches
CMD ./container_cmd.sh
