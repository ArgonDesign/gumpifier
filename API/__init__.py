# See here for a good tutorial on imports: https://chrisyeh96.github.io/2017/08/08/definitive-guide-python-imports.html
# We use a modified version of workaround 2 in case example 2.

import sys, os
sys.path.append(os.path.dirname(os.path.realpath(__file__)))

from . import API