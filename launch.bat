REM node --inspect-brk --unhandled-rejections=strict dawn_console.js
REM node --inspect dawn_console.js
@echo off
if "%1" == "1" node --inspect-brk dawn_console.js
if "%1" == "1" goto pass
node dawn_console.js
:pass

