@echo off
cd /d "%~dp0"

start "PHP API" cmd /k "C:\xampp\php\php.exe -S localhost:8000 -t backend"
start "React Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 4 >nul
start http://localhost:5173