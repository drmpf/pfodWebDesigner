#!/bin/bash

echo "Starting pfodWeb Designer Server..."
echo
echo "This will install dependencies if needed and start the server"
echo "Press Ctrl+C to stop the server when finished"
echo

#   pfodWebDesigner.sh
# * (c)2025 Forward Computing and Control Pty. Ltd.
# * NSW Australia, www.forward.com.au
# * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
# * This generated code may be freely used for both private and commercial use
# * provided this copyright is maintained.

cd src

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in your PATH"
    echo "Please install Node.js from https://nodejs.org/"
    echo
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed or not in your PATH"
    echo "Please install Node.js from https://nodejs.org/"
    echo
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error installing dependencies"
        exit 1
    fi
    echo "Dependencies installed successfully"
    echo
fi

# Ensure express is installed
echo "Checking for express..."
npm install express
if [ $? -ne 0 ]; then
    echo "Warning: Could not install express"
fi

# Ensure express-session is installed
echo "Checking for express-session..."
npm install express-session
if [ $? -ne 0 ]; then
    echo "Warning: Could not install express-session"
fi

# Start the server
echo "Starting server..."
echo "The server will automatically find an available port, starting with 3000"
echo
echo "Once the server has started, it will display the URL to access it"
echo
echo "Available URLs after server start:"
echo "- Control Panel: http://localhost:<PORT>/control"
echo
echo "To create and view a drawing:"
echo "- Go to Control Panel, create a drawing named \"mydrawing\""
echo "- View it at: http://localhost:<PORT>/mydrawing"
echo
echo "Note: <PORT> will be shown in the server output"
echo
npm start