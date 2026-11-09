@echo off
setlocal EnableExtensions
title TARIKELER PORTFOLIO

echo ============================================
echo   TARIKELER PORTFOLIO
echo   Site yukleniyor...
echo ============================================
echo.

cd /d "%~dp0site"
if errorlevel 1 goto errdir

where node >nul 2>&1
if errorlevel 1 goto errnode

if not exist "package.json" goto errpkg

if exist "node_modules" goto run

echo Ilk kurulum yapiliyor (npm install)...
echo Bu islem birkac dakika surebilir.
call npm install --legacy-peer-deps
if errorlevel 1 goto errinstall

:run
echo.
echo Sunucu baslatiliyor...
echo Site acildiginda tarayicida gorunecektir.
echo Bu pencereyi kapatmayin, sunucu bu pencerede calisir.
echo ============================================
echo.

start "" http://localhost:3000
call npm run dev
set "DEV_ERROR=%ERRORLEVEL%"

echo.
if not "%DEV_ERROR%"=="0" goto errdev

echo Sunucu kapatildi.
pause
exit /b 0

:errnode
echo.
echo [HATA] Node.js bulunamadi.
echo Lutfen https://nodejs.org adresinden kurun ve tekrar deneyin.
pause
exit /b 1

:errdir
echo.
echo [HATA] site klasoru bulunamadi.
echo Beklenen konum: %~dp0site
pause
exit /b 1

:errpkg
echo.
echo [HATA] package.json bulunamadi.
echo site klasorunun icerigini kontrol edin.
pause
exit /b 1

:errinstall
echo.
echo [HATA] Kurulum basarisiz oldu.
echo Yukaridaki hata mesajini okuyun.
pause
exit /b 1

:errdev
echo.
echo [HATA] Sunucu calisirken bir hata olustu (kod: %DEV_ERROR%).
echo Yukaridaki mesajlari kontrol edin.
echo Ornek nedenler:
echo   - 3000 portu baska bir program tarafindan kullaniliyor
echo   - Eksik veya bozuk bagimliliklar
pause
exit /b 1
