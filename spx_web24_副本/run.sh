#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $SCRIPT_DIR
# Check if port is provided as a command line argument
if [ -z "$1" ]
then
    PORT=8044
else
    PORT=$1
fi
echo "Killing run.py if running..."
PIDS=$(pgrep -f run.py); 
if [ -n "$PIDS" ]; then 
    echo "Killing process: $PIDS"; 
    kill -9 $PIDS; 
else 
    echo "No run.py process found."; 
fi	

# Start python in the background
python3 run.py -p $PORT &