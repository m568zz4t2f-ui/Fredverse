#!/bin/sh
cd "$(dirname "$0")" || exit 1
python3 server.py --open
result=$?
if [ "$result" -ne 0 ]; then
    echo "Install Python 3.12 or newer from python.org, then try again."
    echo "If another game host is already running, close it first."
    read -r _answer
fi
exit "$result"
