@echo off
title Egram Server
echo Starting Egram...
cd /d "c:\new project\Egram- project"
start http://localhost:3000
npm run dev
pause
