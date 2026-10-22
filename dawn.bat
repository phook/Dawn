@echo off
if "%2" == "1" node --inspect-brk dawn.js %1
if "%2" == "1" goto pass
node dawn.js %1
:pass

