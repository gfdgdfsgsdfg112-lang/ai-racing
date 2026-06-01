@echo off
echo ==========================================
echo    Building AI Racing EXE
echo ==========================================
echo.

:: Создаем папку для сборки
if not exist "release" mkdir release

:: Собираем EXE (64-bit)
echo [1/2] Building 64-bit EXE...
npx pkg . --target node18-win-x64 --output release\AI-Racing-x64.exe
if %errorlevel% neq 0 (
    echo ERROR: Build failed for x64
    pause
    exit /b 1
)

:: Собираем EXE (32-bit) для старых Windows
echo [2/2] Building 32-bit EXE...
npx pkg . --target node18-win-x86 --output release\AI-Racing-x86.exe
if %errorlevel% neq 0 (
    echo WARNING: Build failed for x86, skipping
)

:: Копируем статику рядом (на случай проблем с virtual FS)
echo.
echo Copying static files...
copy /Y index.html release\ >nul
copy /Y style.css release\ >nul
copy /Y .env release\ >nul
if not exist "release\js" mkdir release\js
copy /Y js\*.js release\js\ >nul

echo.
echo ==========================================
echo    BUILD COMPLETE!
echo ==========================================
echo.
echo Output: release\AI-Racing-x64.exe
echo.
echo Run AI-Racing-x64.exe to start the game!
echo.
pause
