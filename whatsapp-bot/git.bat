@echo off
if "%1"=="clone" (
    echo [SHIM] Fake cloning %2 to %3
    mkdir %3
    exit /b 0
)
if "%1"=="rev-parse" (
    echo master
    exit /b 0
)
if "%1"=="status" (
    echo on branch master
    exit /b 0
)
exit /b 0
