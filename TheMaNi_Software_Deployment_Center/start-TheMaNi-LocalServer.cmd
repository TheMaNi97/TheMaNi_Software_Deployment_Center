@echo off
setlocal
title TheMaNi Lokaler Webserver
cd /d "%~dp0"

where py >nul 2>&1
if errorlevel 1 (
    echo FEHLER: Der Python Launcher "py" wurde nicht gefunden.
    pause
    exit /b 1
)

echo Starte TheMaNi Backend auf Port 8765...
start "" py "%~dp0backend\main.py"

echo Starte lokalen Webserver auf Port 5500...
start "" py -m http.server 5500 --bind 127.0.0.1

timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5500/index.html"

endlocal
