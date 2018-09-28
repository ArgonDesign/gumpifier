#!/bin/bash
# ******************************************************************************
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Module : gumpifier
# Author : Steve Barlow
#
# DESCRIPTION:
# Shell script to run a gumpifier Docker container locally. The docker container
# must have already been created with 'make dockerbuild'.
#
# This is primarily for testing. The container should be run in the cloud for
# production.
#
# The -it and --init flags ensure all output is visible and the container can
# be stopped with Ctrl-C in the window.
#
# Usage: ./docker_run.sh
# Then go in browser to http://localhost:8100
# ******************************************************************************

docker run -it --init --rm -p 8100:80 --name test gumpifier
