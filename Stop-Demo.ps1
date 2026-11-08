$ErrorActionPreference = 'Stop'
$demoStateFile = Join-Path $PSScriptRoot '.local\server-state.json'
if (-not (Test-Path -LiteralPath $demoStateFile)) { Write-Output 'No saved demo process.'; exit 0 }
$demoState = Get-Content -LiteralPath $demoStateFile -Raw | ConvertFrom-Json
if ($demoState.project -ne $PSScriptRoot) { throw 'The saved process belongs to another project.' }
$demoProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($demoState.pid)" -ErrorAction SilentlyContinue
$demoServerPath = Join-Path $PSScriptRoot 'server.cjs'
if ($demoProcess -and $demoProcess.Name -eq 'node.exe' -and $demoProcess.CommandLine.Contains($demoServerPath)) {
  Stop-Process -Id $demoState.pid
  Write-Output 'Local demo stopped.'
} elseif ($demoProcess) { throw 'The process ID has been reused. It was not stopped.' }
Remove-Item -LiteralPath $demoStateFile
