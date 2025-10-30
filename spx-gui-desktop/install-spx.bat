@echo off
setlocal enabledelayedexpansion

set SPX_VERSION=2.0.0-pre.29
set SPX_NAME=spx_%SPX_VERSION%
set SPX_FILE_NAME=%SPX_NAME%.zip
set SPX_PLATFORM=windows-x64
set SPX_FILE_URL=https://github.com/goplus/spx/releases/download/v%SPX_VERSION%/spx-%SPX_PLATFORM%.zip
set SPX_DIR=.\spx

set MINGW_FILE_NAME=winlibs-mingw.zip
REM For other platforms, see https://winlibs.com/#download-release
set MINGW_FILE_URL=https://github.com/brechtsanders/winlibs_mingw/releases/download/15.2.0posix-13.0.0-ucrt-r2/winlibs-x86_64-posix-seh-gcc-15.2.0-mingw-w64ucrt-13.0.0-r2.zip
set MINGW_DIR=%SPX_DIR%\mingw64

REM Remove existing directory if it exists
if exist "%SPX_DIR%" (
    echo Removing existing directory...
    rmdir /s /q "%SPX_DIR%"
)

REM Download SPX with robust options
echo Downloading SPX from %SPX_FILE_URL%...
curl -L --max-redirs 10 --retry 3 --retry-delay 2 -o "%SPX_FILE_NAME%" "%SPX_FILE_URL%"
if errorlevel 1 (
    echo Error: SPX download failed with curl, trying PowerShell fallback...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SPX_FILE_URL%' -OutFile '%SPX_FILE_NAME%' -MaximumRedirection 10}"
    if errorlevel 1 (
        echo Error: SPX download failed
        exit /b 1
    )
)

REM Extract SPX
echo Extracting SPX to %SPX_DIR%...
mkdir "%SPX_DIR%"
tar -xf "%SPX_FILE_NAME%" -C "%SPX_DIR%"
if errorlevel 1 (
    echo Error: SPX extraction failed
    exit /b 1
)

REM Remove SPX zip file
echo Cleaning up SPX archive...
del "%SPX_FILE_NAME%"

REM Download MinGW with robust options
echo Downloading MinGW from %MINGW_FILE_URL%...
curl -L --max-redirs 10 --retry 3 --retry-delay 2 -o "%MINGW_FILE_NAME%" "%MINGW_FILE_URL%"
if errorlevel 1 (
    echo Error: MinGW download failed with curl, trying PowerShell fallback...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%MINGW_FILE_URL%' -OutFile '%MINGW_FILE_NAME%' -MaximumRedirection 10}"
    if errorlevel 1 (
        echo Error: MinGW download failed
        exit /b 1
    )
)

REM Extract MinGW to ./spx/mingw64
echo Extracting MinGW to %MINGW_DIR%...
mkdir "%MINGW_DIR%"
tar -xf "%MINGW_FILE_NAME%" -C "%MINGW_DIR%" --strip-components=1
if errorlevel 1 (
    echo Error: MinGW extraction failed
    exit /b 1
)

REM Remove MinGW zip file
echo Cleaning up MinGW archive...
del "%MINGW_FILE_NAME%"

echo.
echo Installation complete!
echo SPX installed to: %SPX_DIR%
echo MinGW installed to: %MINGW_DIR%
pause