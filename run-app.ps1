# Load environment variables from .env.sample
Get-Content source\.env.sample | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        Set-Item -Path "env:$name" -Value $value
        Write-Host "Set $name"
    }
}

# Change to app directory and run
Set-Location source\app
Write-Host "`nStarting application..."
go run main.go
