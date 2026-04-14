$desktop = [Environment]::GetFolderPath("Desktop")
Copy-Item ".\start-egram.bat" -Destination "$desktop\Start Egram.bat"
Write-Host "Success"
