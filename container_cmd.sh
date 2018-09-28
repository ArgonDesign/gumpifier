#!/bin/bash
# ******************************************************************************
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Module : gumpifier
# Author : Steve Barlow
#
# DESCRIPTION:
# The commands run in the container
# ******************************************************************************

# Useful websites:
# https://docs.docker.com/config/containers/multi-service_container/

# Start the first process
source venv/bin/activate; python TF_server.py &

# Start the second process
# N.B. For uWSGI, override port specified in config.ini
source venv/bin/activate; sleep 3; cd uWSGI; ./uwsgi --ini config.ini --http :80 &

# Naive check runs checks once every 60s to see if either of the processes
# exited. This illustrates part of the heavy lifting you need to do if you want
# to run more than one service in a container. The container exits with an
# error if it detects that either of the processes has exited. Otherwise it
# loops forever, waking up every 60 seconds

while sleep 60; do
    ps aux | grep "python TF_server.py" | grep -q -v grep
    PROCESS_1_STATUS=$?
    ps aux | grep "./uwsgi --ini config.ini --http :80" | grep -q -v grep
    PROCESS_2_STATUS=$?
    # If the greps above find anything, they exit with 0 status
    # If they are not both 0, then something is wrong
    if [ $PROCESS_1_STATUS -ne 0 -o $PROCESS_2_STATUS -ne 0 ]; then
        echo "One of the processes has already exited."
        exit 1
    fi
done
