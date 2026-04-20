@echo off
title STIGA - Iniciando sistema...

echo.
echo   STIGA - Sistema de Triaje Inteligente
echo.

:: Backend
start "STIGA Backend" cmd /k "cd /d %~dp0backend && python main.py"

:: Espera 3 segundos para que el backend levante
timeout /t 3 /nobreak >nul

:: Frontend
start "STIGA Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo  Backend : http://localhost:8000
echo  Frontend: http://localhost:5173
echo.
pause
