@echo off
chcp 65001 > nul
title Tiệm Nhà Nhỏ - E-Commerce AI System Launcher
color 0F

echo ===============================================================================
echo     TIEM NHA NHO - E-COMMERCE FULLSTACK (DATABASE + API + FRONTEND)
echo ===============================================================================
echo.
echo  Dang khoi chay he thong bao gom:
echo    1. Backend API & Co So Du Lieu (Port 5000)
echo    2. Frontend Web React & Tro Ly AI (Port 5173)
echo.
echo ===============================================================================

REM Khoi chay Backend Server trong cua so rieng
start "1. Backend Database API Server (Port 5000)" cmd /k "node server/index.js"

REM Cho 2 giay de Server khoi dong san sang
timeout /t 2 /nobreak > nul

REM Khoi chay Frontend Vite Dev Server
start "2. Frontend Web Application (Port 5173)" cmd /k "npm.cmd run dev"

echo.
echo  [OK] Khoi dong hoan tat!
echo  Web Khach & Quan tri:   http://localhost:5173
echo  Backend REST API:       http://localhost:5000/api/health
echo.
echo  Tai khoan thu nghiem:
echo    - Chu Shop (Admin):    admin@tiemnhanho.vn  / admin123
echo    - Nhan Vien (Staff):   staff@tiemnhanho.vn  / staff123
echo    - Khach Hang:          khachhang@gmail.com  / khach123
echo.
echo  Nhan phim bat ky de dong cua so nay (cac dich vu van chay binh thuong)...
pause > nul
