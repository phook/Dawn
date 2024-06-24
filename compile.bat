@echo off
if "%2" == "1" node --inspect-brk dawn_compiler.js %1
if "%2" == "1" goto pass
node dawn_compiler.js %1
:pass
