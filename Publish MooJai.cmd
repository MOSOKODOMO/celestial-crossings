@echo off
setlocal
rem Run from a temporary copy so git can never delete or change this script mid-run.
if not "%~1"=="--from-temp" (
  copy /y "%~f0" "%TEMP%\moojai-publish.cmd" >nul
  "%TEMP%\moojai-publish.cmd" --from-temp "%~dp0"
  exit /b
)
cd /d "%~2"
title Publish MooJai
echo ==================================================================
echo   Publishing MooJai to https://mosokodomo.github.io/celestial-crossings/
echo ==================================================================
echo.
where git >nul 2>nul || (echo Git was not found on this computer. & goto :fail)
where npm >nul 2>nul || (echo Node.js / npm was not found on this computer. & goto :fail)

if exist "publish-extras\site-check.yml" (
  if not exist ".github\workflows" mkdir ".github\workflows"
  if not exist ".github\ISSUE_TEMPLATE" mkdir ".github\ISSUE_TEMPLATE"
  copy /y "publish-extras\site-check.yml" ".github\workflows\site-check.yml" >nul
  copy /y "publish-extras\bug_report.yml" ".github\ISSUE_TEMPLATE\bug_report.yml" >nul
  if exist "publish-extras\pages.yml" copy /y "publish-extras\pages.yml" ".github\workflows\pages.yml" >nul
)

echo [1/4] Checking the code (npm test)...
call npm test
if errorlevel 1 goto :fail

echo.
echo [2/4] Saving all changes in a commit...
git checkout codex/website-publish
if errorlevel 1 goto :fail
git add -A
if errorlevel 1 goto :fail
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "Update MooJai website" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015MBpDDsY4WCWbcpuYPcTjM"
  if errorlevel 1 goto :fail
) else (
  echo No new changes to commit.
)

echo.
echo [3/4] Including any changes already on GitHub...
git fetch origin
if errorlevel 1 goto :fail
git merge --no-edit origin/main
if errorlevel 1 goto :fail

echo.
echo [4/4] Publishing (this starts the website build)...
git push origin codex/website-publish
if errorlevel 1 goto :fail
git push origin codex/website-publish:main
if errorlevel 1 goto :fail
git branch -f main codex/website-publish >nul 2>nul

echo.
echo ==================================================================
echo   DONE. GitHub is now building the site. It is usually live in 3-5 minutes:
echo   https://mosokodomo.github.io/celestial-crossings/
echo ==================================================================
start "" "https://github.com/MOSOKODOMO/celestial-crossings/actions"
pause
exit /b 0

:fail
echo.
echo ------------------------------------------------------------------
echo   Publishing stopped. Nothing was lost. Take a screenshot of this
echo   window and send it to Claude.
echo ------------------------------------------------------------------
git merge --abort >nul 2>nul
pause
exit /b 1
