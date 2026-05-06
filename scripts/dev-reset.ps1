$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$ports = @(3000, 3001)

function Stop-NodeProcess([int]$processId) {
  if ($processId -le 0) {
    return
  }

  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process -and $process.ProcessName -eq "node") {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

foreach ($port in $ports) {
  $listeners = netstat -ano | Select-String ":$port\s+.*LISTENING"

  foreach ($listener in $listeners) {
    $parts = ($listener.Line -split "\s+") | Where-Object { $_ }
    $processId = $parts[-1]

    if ($processId -match "^\d+$") {
      Stop-NodeProcess ([int]$processId)
    }
  }
}

try {
  $escapedRoot = [Regex]::Escape($projectRoot)
  $projectNodeProcesses = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
    Where-Object {
      $_.CommandLine -and (
        $_.CommandLine -match $escapedRoot -or
        $_.CommandLine -match "next[\\/]dist[\\/]bin[\\/]next"
      )
    }

  foreach ($process in $projectNodeProcesses) {
    Stop-NodeProcess $process.ProcessId
  }
} catch {
  Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-NodeProcess $_.Id
  }
}

$nextDir = Join-Path $projectRoot ".next"
$devLog = Join-Path $projectRoot "next-dev.log"

if (Test-Path -LiteralPath $nextDir) {
  attrib -R "$nextDir\*" /S /D 2>$null

  $removed = $false
  for ($attempt = 1; $attempt -le 5 -and -not $removed; $attempt++) {
    try {
      Remove-Item -LiteralPath $nextDir -Recurse -Force -ErrorAction Stop
      $removed = $true
    } catch {
      Start-Sleep -Milliseconds 400
    }
  }

  if (-not $removed -and (Test-Path -LiteralPath $nextDir)) {
    throw "Unable to remove $nextDir after multiple attempts. Please close any running Next.js or Node process and try again."
  }
}

if (Test-Path -LiteralPath $devLog) {
  Remove-Item -LiteralPath $devLog -Force
}

Set-Location $projectRoot
& npm.cmd run dev:next
