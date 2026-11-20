param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$demoProject = $PSScriptRoot
$demoUrl = 'http://127.0.0.1:4173'
$demoNode = (Get-Command node -ErrorAction Stop).Source
& $demoNode (Join-Path $demoProject 'scripts\build-demo.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the demo.' }
$demoHealth = $null
try { $demoHealth = Invoke-RestMethod -Uri "$demoUrl/__health" -TimeoutSec 2 } catch {}
if ($demoHealth -and ($demoHealth.app -ne 'moojai-local-demo' -or $demoHealth.project -ne $demoProject)) { throw 'Port 4173 belongs to another application. No process was stopped.' }
if (-not $demoHealth) {
  $demoStateDir = Join-Path $demoProject '.local'
  New-Item -ItemType Directory -Path $demoStateDir -Force | Out-Null
  $demoServer = Join-Path $demoProject 'server.cjs'
  $demoProcess = Start-Process -FilePath $demoNode -ArgumentList @('"' + $demoServer + '"') -WorkingDirectory $demoProject -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $demoStateDir 'server.out.log') -RedirectStandardError (Join-Path $demoStateDir 'server.err.log')
  @{pid=$demoProcess.Id;project=$demoProject;url=$demoUrl} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $demoStateDir 'server-state.json') -Encoding utf8
  for ($demoAttempt=0; $demoAttempt -lt 25; $demoAttempt++) {
    Start-Sleep -Milliseconds 200
    try { $demoHealth=Invoke-RestMethod -Uri "$demoUrl/__health" -TimeoutSec 1; break } catch {}
    if ($demoProcess.HasExited) { break }
  }
  if (-not $demoHealth -or $demoHealth.app -ne 'moojai-local-demo' -or $demoHealth.project -ne $demoProject) { throw 'The local server did not start. Check .local\server.err.log.' }
}
Write-Output "Demo running locally: $demoUrl"
if (-not $NoBrowser) { Start-Process $demoUrl }
