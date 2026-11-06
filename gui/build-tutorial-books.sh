#!/bin/bash

# GitBook build script wrapper
# This script calls the actual build script in the tutorial directory

set -e

# Execute the tutorial build script
( cd ../tutorial && ./build.sh )
