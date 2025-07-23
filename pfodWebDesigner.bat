@echo off
echo Starting pfodWeb Designer Server...
echo.
echo This will install dependencies if needed and start the server
echo Press Ctrl+C to stop the server when finished
echo.
::   pfodWebDesigner.bat
:: * (c)2025 Forward Computing and Control Pty. Ltd.
:: * NSW Australia, www.forward.com.au
:: * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
:: * This generated code may be freely used for both private and commercial use
:: * provided this copyright is maintained.

cd src

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in your PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing dependencies
        pause
        exit /b 1
    )
    echo Dependencies installed successfully
    echo.
)

:: Ensure express-session is installed
echo Checking for express...
call npm install express
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Could not install express-session
)

:: Ensure express-session is installed
echo Checking for express-session...
call npm install express-session
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Could not install express-session
)

::Start the server
echo Starting server...
echo The server will automatically find an available port, starting with 3000
echo.
echo Once the server has started, it will display the URL to access it
echo.
echo Available URLs after server start:
echo - Control Panel: http://localhost:^<PORT^>/control
echo.
echo To create and view a drawing:
echo - Go to Control Panel, create a drawing named "mydrawing"
echo - View it at: http://localhost:^<PORT^>/mydrawing
echo.
echo Note: ^<PORT^> will be shown in the server output
echo.
call npm start

pause