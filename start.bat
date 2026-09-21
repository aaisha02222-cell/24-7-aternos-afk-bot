@echo off
title Cool SMP Bot
if not exist settings.json (echo Copy settings.example.json to settings.json and set your password.&pause&exit /b)
call npm install
node bot.js
pause
