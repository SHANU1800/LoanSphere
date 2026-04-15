@echo off
title LoanSphere

echo Starting Backend (Django)...
start "Backend - Django" cmd /k "cd /d ""%~dp0backend"" && python manage.py runserver 8005"

echo Starting Frontend (Vite)...
start "Frontend - Vite" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo Both servers are starting:
echo   Backend:  http://127.0.0.1:8005
echo   Frontend: http://localhost:7171
echo.
timeout /t 3 /nobreak >nul
start "" http://localhost:7171
