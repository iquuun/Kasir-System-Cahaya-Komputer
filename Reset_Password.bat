@echo off
title Reset Password Owner - Cahaya Komputer
color 0B
echo ====================================================
echo             RESET PASSWORD OWNER KASIR
echo ====================================================
echo.
echo Script ini digunakan jika Anda lupa email / password
echo akun Owner untuk masuk ke Kasir Cahaya Komputer.
echo.

:: Check PHP installation
where php >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PHP tidak terdeteksi di komputer ini.
    echo Pastikan PHP sudah terinstal dan masuk ke PATH Environment.
    echo.
    pause
    exit /b
)

cd api
php reset_owner_password.php
echo.
pause
