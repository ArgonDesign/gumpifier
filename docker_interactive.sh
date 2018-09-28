# ******************************************************************************
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Module : gumpifier
# Author : Steve Barlow
#
# DESCRIPTION:
# Shell script to start an interactive shell with a gumpifier Docker container.
# Note that this must be used with source, not executed as a command.
#
# Usage: source docker_interactive.sh
# ******************************************************************************

docker run -it gumpifier /bin/bash
