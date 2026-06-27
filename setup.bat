@echo off
REM NeuroGraph Quick Start Script for Windows
REM This script sets up both backend and frontend for development

echo.
echo 🧠 NeuroGraph Quick Start
echo ========================
echo.

REM Check Python
echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8 or higher.
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✓ %PYTHON_VERSION%

REM Check Node
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 16 or higher.
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION%
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm %NPM_VERSION%

REM Setup Python environment
echo.
echo Setting up Python environment...
if not exist "venv" (
    python -m venv venv
    echo ✓ Virtual environment created
) else (
    echo ✓ Virtual environment already exists
)

REM Activate venv and install dependencies
call venv\Scripts\activate.bat
echo Installing Python dependencies...
pip install -q -r requirements.txt
echo ✓ Python dependencies installed

REM Setup Node environment
echo.
echo Installing Node dependencies...
call npm install -q
echo ✓ Node dependencies installed

REM Copy env file if needed
if not exist ".env" (
    echo Note: Copy .env.example to .env and update with your settings
)

REM Create run scripts
echo.
echo Creating convenience scripts...

REM Backend run script
(
echo @echo off
echo call venv\Scripts\activate.bat
echo echo Starting NeuroGraph Backend...
echo echo API will be available at http://localhost:5000
echo python backend.py
) > run-backend.bat

REM Frontend run script
(
echo @echo off
echo echo Starting NeuroGraph Frontend...
echo echo Frontend will be available at http://localhost:3000
echo call npm run dev
) > run-frontend.bat

echo ✓ Convenience scripts created

REM Summary
echo.
echo ========================================
echo Setup Complete! 🎉
echo ========================================
echo.
echo Quick Start (open 2 terminals^):
echo.
echo Terminal 1 - Backend:
echo   run-backend.bat
echo.
echo Terminal 2 - Frontend:
echo   run-frontend.bat
echo.
echo Demo Credentials:
echo   Email: demo@neurograph.ai
echo   Password: demo123
echo.
echo For more info, see README_SETUP.md
echo.
pause

