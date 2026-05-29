@echo off
:: RaktSetu PowerShell Launcher Wrapper
:: This file bypasses execution policies to run the advanced PowerShell controller.

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "run_raktsetu.ps1"
