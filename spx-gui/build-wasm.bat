@echo off
setlocal
echo Run this script from 'spx-gui' directory

REM Change directory to ../tools/fmt
cd ..\tools\fmt

REM Call build script
call build.bat

REM Change directory to ../ispx
cd ..\ispx

REM Call build script
call build.bat

REM Change directory to ..
cd ..

REM Copy files to the destination
copy fmt\static\main.wasm ..\spx-gui\src\assets\format.wasm
copy ispx\main.wasm ..\spx-gui\src\assets\ispx\main.wasm

REM Get GOROOT environment variable
for /f "tokens=*" %%i in ('go env GOROOT') do set GOROOT=%%i

echo Build WASM complete
endlocal
