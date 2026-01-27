# PowerShell script untuk Windows - versi Makefile
# Usage: .\Makefile.ps1 <target>
# Contoh: .\Makefile.ps1 install

param(
    [Parameter(Position=0)]
    [string]$Target = "help"
)

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Install-Dependencies {
    Write-Host "Checking and installing dependencies..." -ForegroundColor Cyan
    
    $dependencies = @{
        "docker" = "Docker is required but not installed. Visit https://docs.docker.com/get-docker/"
        "docker compose" = "Docker Compose is required but not installed. Visit https://docs.docker.com/compose/install/"
        "go" = "Go 1.24+ is required but not installed. Visit https://golang.org/dl/"
        "node" = "Node.js is required but not installed. Visit https://nodejs.org/"
        "npm" = "npm is required but not installed. Visit https://docs.npmjs.com/getting-started"
        "python" = "Python3 is required but not installed. Visit https://www.python.org/downloads/"
    }
    
    $allInstalled = $true
    foreach ($dep in $dependencies.Keys) {
        if ($dep -eq "docker compose") {
            # Check docker compose as separate command
            if (-not (Test-Command "docker")) {
                Write-ErrorMsg $dependencies[$dep]
                $allInstalled = $false
                continue
            }
            $composeCheck = docker compose version 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorMsg $dependencies[$dep]
                $allInstalled = $false
            }
        } elseif ($dep -eq "python") {
            # Check for python or python3
            if (-not ((Test-Command "python") -or (Test-Command "python3"))) {
                Write-ErrorMsg $dependencies[$dep]
                $allInstalled = $false
            }
        } else {
            if (-not (Test-Command $dep)) {
                Write-ErrorMsg $dependencies[$dep]
                $allInstalled = $false
            }
        }
    }
    
    if (-not $allInstalled) {
        exit 1
    }
    
    Write-Success "All system dependencies are installed"
    
    Push-Location source/app
    try {
        go mod download
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
    
    Push-Location specs
    try {
        npm install
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
    
    Write-Success "Project dependencies installed successfully"
    Write-Host ""
    Write-Host "Dependencies installed:"
    Write-Host '  - Docker & Docker Compose'
    Write-Host "  - Go modules"
    Write-Host "  - npm packages"
    Write-Host ""
    Write-Host 'Ready to run: .\Makefile.ps1 build'
}

function Invoke-Test {
    Invoke-Build
    Push-Location specs
    try {
        npm run test:no-build
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
}

function Invoke-TestOnly {
    Push-Location specs
    try {
        npm run test:no-build
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
}

function Invoke-TestUnit {
    Push-Location source/app
    try {
        go test -v ./...
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
}

function Invoke-TestUnitCoverage {
    Push-Location source/app
    try {
        go test -coverprofile=../../specs/coverage/unit.out ./...
        if ($LASTEXITCODE -ne 0) { exit 1 }
        go tool cover -func=../../specs/coverage/unit.out
    } finally {
        Pop-Location
    }
}

function Invoke-TestMutation {
    $gopath = go env GOPATH
    $gremlinsPath = Join-Path $gopath "bin\gremlins.exe"
    
    if (-not (Test-Path $gremlinsPath)) {
        Write-ErrorMsg "Gremlins is not installed. Install it with: go install github.com/go-gremlins/gremlins/cmd/gremlins@latest"
        exit 1
    }
    
    Push-Location source/app
    try {
        & $gremlinsPath unleash --exclude-files="vendor/.*" --exclude-files="internal/db/generated/.*" --exclude-files=".*_test\.go$$" --exclude-files="main\.go" --integration --timeout-coefficient=10 .
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
}

function Invoke-TestCoverage {
    Push-Location specs
    try {
        npm run test:coverage
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
}

function Invoke-MergeCoverage {
    Push-Location specs
    try {
        npm run coverage:merge
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
}

function Invoke-ServeCoverage {
    Write-Host "Serving coverage report at http://localhost:8181/report.html" -ForegroundColor Cyan
    Push-Location specs/coverage
    try {
        # Try python3 first, then python
        if (Test-Command "python3") {
            python3 -m http.server 8181
        } elseif (Test-Command "python") {
            python -m http.server 8181
        } else {
            Write-ErrorMsg "Python is not installed"
            exit 1
        }
    } finally {
        Pop-Location
    }
}

function Invoke-Build {
    Push-Location source
    try {
        docker compose build
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
    
    Push-Location specs
    try {
        npm install
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
}

function Invoke-WebUI {
    Push-Location source/webui
    try {
        docker compose up --build -d
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
}

function Invoke-WebUIDown {
    Push-Location source/webui
    try {
        docker compose down
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } finally {
        Pop-Location
    }
}

function Invoke-WebUILogs {
    Push-Location source/webui
    try {
        docker compose logs -f
    } finally {
        Pop-Location
    }
}

function Show-Help {
    Write-Host 'Usage: .\Makefile.ps1 <target>' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Available targets:" -ForegroundColor Yellow
    Write-Host "  install              - Check and install all dependencies"
    Write-Host "  build                - Build docker image and npm install"
    Write-Host "  test                 - Run integration tests (builds first)"
    Write-Host "  test-only            - Run integration tests without building"
    Write-Host "  test-unit            - Run Go unit tests"
    Write-Host "  test-unit-coverage   - Run Go unit tests with coverage"
    Write-Host "  test-mutation        - Run mutation tests"
    Write-Host "  test-coverage        - Run tests with coverage"
    Write-Host "  merge-coverage       - Merge coverage from unit and integration tests"
    Write-Host "  serve-coverage       - Serve coverage report at http://localhost:8181"
    Write-Host "  webui                - Start web UI for local development"
    Write-Host "  webui-down           - Stop web UI"
    Write-Host "  webui-logs           - Show web UI logs"
    Write-Host "  help                 - Show this help message"
}

# Main execution
switch ($Target.ToLower()) {
    "install" { Install-Dependencies }
    "build" { Invoke-Build }
    "test" { Invoke-Test }
    "test-only" { Invoke-TestOnly }
    "test-unit" { Invoke-TestUnit }
    "test-unit-coverage" { Invoke-TestUnitCoverage }
    "test-mutation" { Invoke-TestMutation }
    "test-coverage" { Invoke-TestCoverage }
    "merge-coverage" { Invoke-MergeCoverage }
    "serve-coverage" { Invoke-ServeCoverage }
    "webui" { Invoke-WebUI }
    "webui-down" { Invoke-WebUIDown }
    "webui-logs" { Invoke-WebUILogs }
    "help" { Show-Help }
    default {
        Write-Host "Unknown target: $Target" -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
}
