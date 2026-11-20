@echo off
setlocal
rem Run from a temporary copy so switching branches can never delete this script mid-run.
if not "%~1"=="--from-temp" (
  copy /y "%~f0" "%TEMP%\moojai-finish-publish.cmd" >nul
  "%TEMP%\moojai-finish-publish.cmd" --from-temp "%~dp0"
  exit /b
)
cd /d "%~2"
title Finish publishing MooJai
echo ==================================================================
echo   Finishing the MooJai publish
echo ==================================================================
echo.
echo [1/3] Returning to the MooJai working branch...
git checkout codex/website-publish
if errorlevel 1 goto :fail
echo.
echo [2/3] Publishing the new version to main (this starts the website build)...
git push origin codex/website-publish:main
if errorlevel 1 goto :fail
git branch -f main codex/website-publish >nul 2>nul
echo.
echo [3/3] Done.
echo ==================================================================
echo   SUCCESS. GitHub is building the site now. It is usually live in
echo   3-5 minutes: https://mosokodomo.github.io/celestial-crossings/
echo ==================================================================
start "" "https://github.com/MOSOKODOMO/celestial-crossings/actions"
pause
exit /b 0
:fail
echo.
echo   Something stopped the publish. Nothing was lost. Take a screenshot
echo   of this window and send it to Claude.
pause
exit /b 1
