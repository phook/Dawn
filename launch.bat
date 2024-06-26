REM node --inspect-brk --unhandled-rejections=strict dawn_console.js
REM node --inspect dawn_console.js
@echo off
if "%2" == "1" node --inspect-brk dawn_console.js
if "%2" == "1" goto pass
node dawn_console.js
:pass

