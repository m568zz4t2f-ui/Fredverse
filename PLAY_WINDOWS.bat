@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
    py -3 server.py --open
) else (
    python server.py --open
)
if errorlevel 1 (
    echo.
    echo Install Python 3.12 or newer from python.org, then try again.
    echo If another game host is already running, close it first.
    pause
)
