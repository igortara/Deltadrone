@echo off
title Python Flask Web Server (Waitress)

REM Проверяем, установлен ли Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python не найден. Пожалуйста, установите Python, прежде чем запускать этот батник.
    echo Скачать можно здесь: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Проверяем, установлен ли Flask и Waitress
pip show Flask >nul 2>nul
if %errorlevel% neq 0 (
    echo Flask не установлен. Установка...
    pip install Flask
)
pip show Waitress >nul 2>nul
if %errorlevel% neq 0 (
    echo Waitress не установлен. Установка...
    pip install Waitress
)

set PORT=8000

echo.
echo Запуск Flask-сервера с Waitress на порту %PORT%...
echo Откроется index.html в браузере.
echo Для остановки сервера нажмите Ctrl+C в этом окне.
echo.

REM Запускаем приложение Flask
start /B python app.py

REM Даем серверу немного времени на запуск
timeout /t 2 >nul

REM Открываем index.html в браузере
start http://localhost:%PORT%/

REM Оставляем окно консоли открытым
pause