#!/usr/bin/env pwsh
param()
$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $outDir
$arch = 'amd64'
$url = "https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_windows_amd64.zip"
$zip = Join-Path $env:TEMP "pocketbase.zip"
Write-Host "Downloading PocketBase from $url to $zip"
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
Expand-Archive -LiteralPath $zip -DestinationPath $outDir -Force
Remove-Item $zip -Force
Write-Host "PocketBase binary downloaded to: $outDir\pocketbase.exe"
