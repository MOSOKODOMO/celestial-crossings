@echo off
setlocal
cd /d "%~dp0"
title MooJai checks
echo ==================================================================
echo   Running every MooJai test on this computer (takes a few minutes)
echo   Please do not close this window.
echo ==================================================================
if not exist output mkdir output
set WORLD_PERF_GATE=1
set MOOJAI_PORT=4174
set QA_BASE_URL=http://127.0.0.1:4174
call npm run build > "output\check-log.txt" 2>&1
call npm run check >> "output\check-log.txt" 2>&1
set RESULT=%ERRORLEVEL%
echo.
findstr /C:"# pass" /C:"# fail" /C:"browser QA scripts" "output\check-log.txt"
echo.
if %RESULT%==0 (
  echo   ALL CHECKS PASSED.
) else (
  echo   SOME CHECKS FAILED. Tell Claude "checks finished" - the full log is
  echo   saved in output\check-log.txt
)
echo.
pause
exit /b %RESULT%
