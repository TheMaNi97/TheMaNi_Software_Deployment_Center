@echo off
setlocal EnableExtensions
title TheMaNi Lokaler Webserver
cd /d "%~dp0"

rem Python Interpreter automatisch ermitteln.
rem Bevorzugt wird der Python Launcher "py". Falls dieser fehlt,
rem werden "python" sowie typische Benutzerinstallationen geprüft.
set "PYTHON_CMD="

where py >nul 2>&1
if not errorlevel 1 (
    py --version >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=py"
)

if not defined PYTHON_CMD (
    where python >nul 2>&1
    if not errorlevel 1 (
        python --version >nul 2>&1
        if not errorlevel 1 set "PYTHON_CMD=python"
    )
)

if not defined PYTHON_CMD if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "PYTHON_CMD=%LocalAppData%\Programs\Python\Python313\python.exe"
if not defined PYTHON_CMD if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "PYTHON_CMD=%LocalAppData%\Programs\Python\Python312\python.exe"
if not defined PYTHON_CMD if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "PYTHON_CMD=%LocalAppData%\Programs\Python\Python311\python.exe"

if not defined PYTHON_CMD (
    echo.
    echo ==========================================
    echo   FEHLER: Python wurde nicht gefunden.
    echo ==========================================
    echo.
    echo TheMaNi benoetigt eine installierte Python-3-Version.
    echo Der Python Launcher ^(py^) ist NICHT zwingend erforderlich.
    echo.
    echo Falls Python bereits installiert ist, pruefe bitte,
    echo ob "python --version" in einer Eingabeaufforderung funktioniert.
    echo.
    pause
    exit /b 1
)

echo Verwendeter Python-Interpreter: %PYTHON_CMD%
echo.
echo Starte TheMaNi Backend auf Port 8765...
start "" "%PYTHON_CMD%" "%~dp0backend\main.py"

echo Starte lokalen Webserver auf Port 5500...
start "" "%PYTHON_CMD%" -m http.server 5500 --bind 127.0.0.1

timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5500/index.html"

endlocal
