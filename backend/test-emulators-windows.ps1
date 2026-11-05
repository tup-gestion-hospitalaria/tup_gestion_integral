$ErrorActionPreference = 'Stop'

function Get-JavaMajorVersion($javaPath) {
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo.FileName = $javaPath
  $process.StartInfo.Arguments = '-version'
  $process.StartInfo.UseShellExecute = $false
  $process.StartInfo.RedirectStandardError = $true
  $process.StartInfo.RedirectStandardOutput = $true
  [void]$process.Start()
  $versionOutput = $process.StandardError.ReadToEnd() +
    $process.StandardOutput.ReadToEnd()
  $process.WaitForExit()

  if ($versionOutput -match 'version "(\d+)') {
    return [int]$Matches[1]
  }
  return 0
}

$javaHomes = @()
if ($env:JAVA_HOME) {
  $javaHomes += $env:JAVA_HOME
}

foreach ($root in @(
  (Join-Path $env:ProgramFiles 'Eclipse Adoptium'),
  (Join-Path $env:ProgramFiles 'Java')
)) {
  if (Test-Path -LiteralPath $root) {
    $javaHomes += Get-ChildItem -LiteralPath $root -Directory |
      Where-Object { $_.Name -match '^(jdk|temurin)-?21|^jdk-' } |
      Sort-Object Name -Descending |
      ForEach-Object { $_.FullName }
  }
}

$javaCommand = Get-Command java.exe -ErrorAction SilentlyContinue
if ($javaCommand) {
  $javaHomes += Split-Path -Parent (Split-Path -Parent $javaCommand.Source)
}

$javaHome = $null
$javaMajorVersion = 0
foreach ($candidate in ($javaHomes | Select-Object -Unique)) {
  $candidateJava = Join-Path $candidate 'bin\java.exe'
  if (Test-Path -LiteralPath $candidateJava) {
    $candidateMajorVersion = Get-JavaMajorVersion $candidateJava
    if ($candidateMajorVersion -ge 21) {
      $javaHome = $candidate
      $javaMajorVersion = $candidateMajorVersion
      break
    }
  }
}

if (-not $javaHome) {
  throw 'No encontre un JDK 21 o superior. Instalalo desde https://adoptium.net/ y volve a ejecutar este comando.'
}

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"

Write-Host "Usando Java $javaMajorVersion desde $javaHome"

$backendRoot = $PSScriptRoot
Push-Location $backendRoot
try {
  & npm.cmd run test:emulators
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
