@echo off
REM Batch file untuk Windows - versi Makefile
REM Usage: Makefile.bat <target>
REM Contoh: Makefile.bat install

setlocal enabledelayedexpansion

if "%1"=="" goto help
if /i "%1"=="help" goto help
if /i "%1"=="install" goto install
if /i "%1"=="build" goto build
if /i "%1"=="test" goto test
if /i "%1"=="test-only" goto test-only
if /i "%1"=="test-unit" goto test-unit
if /i "%1"=="test-unit-coverage" goto test-unit-coverage
if /i "%1"=="test-mutation" goto test-mutation
if /i "%1"=="test-coverage" goto test-coverage
if /i "%1"=="merge-coverage" goto merge-coverage
if /i "%1"=="serve-coverage" goto serve-coverage
if /i "%1"=="webui" goto webui
if /i "%1"=="webui-down" goto webui-down
if /i "%1"=="webui-logs" goto webui-logs

echo Unknown target: %1
goto help

:install
echo Checking and installing dependencies...
where docker >nul 2>&1
if errorlevel 1 (
    echo Docker is required but not installed. Visit https://docs.docker.com/get-docker/
    exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo Docker Compose is required but not installed. Visit https://docs.docker.com/compose/install/
    exit /b 1
)

where go >nul 2>&1
if errorlevel 1 (
    echo Go 1.24+ is required but not installed. Visit https://golang.org/dl/
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js is required but not installed. Visit https://nodejs.org/
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo npm is required but not installed. Visit https://docs.npmjs.com/getting-started
    exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
    where python3 >nul 2>&1
    if errorlevel 1 (
        echo Python3 is required but not installed. Visit https://www.python.org/downloads/
        exit /b 1
    )
)

echo [OK] All system dependencies are installed

cd source\app
go mod download
if errorlevel 1 exit /b 1
cd ..\..

cd specs
npm install
if errorlevel 1 exit /b 1
cd ..

echo [OK] Project dependencies installed successfully
echo.
echo Dependencies installed:
echo   - Docker ^& Docker Compose
echo   - Go modules
echo   - npm packages
echo.
echo Ready to run: Makefile.bat build
goto end

:build
cd source
docker compose build
if errorlevel 1 exit /b 1
cd ..

cd specs
npm install
if errorlevel 1 exit /b 1
cd ..
goto end

:test
call :build
cd specs
npm run test:no-build
if errorlevel 1 exit /b 1
cd ..
goto end

:test-only
cd specs
npm run test:no-build
if errorlevel 1 exit /b 1
cd ..
goto end

:test-unit
cd source\app
go test -v ./...
if errorlevel 1 exit /b 1
cd ..\..
goto end

:test-unit-coverage
cd source\app
go test -coverprofile=../../specs/coverage/unit.out ./...
if errorlevel 1 exit /b 1
go tool cover -func=../../specs/coverage/unit.out
cd ..\..
goto end

:test-mutation
set GOPATH=
for /f "tokens=*" %%i in ('go env GOPATH') do set GOPATH=%%i
set GREMLINS=%GOPATH%\bin\gremlins.exe

if not exist "%GREMLINS%" (
    echo Gremlins is not installed. Install it with: go install github.com/go-gremlins/gremlins/cmd/gremlins@latest
    exit /b 1
)

cd source\app
"%GREMLINS%" unleash --exclude-files="vendor/.*" --exclude-files="internal/db/generated/.*" --exclude-files=".*_test\.go$$" --exclude-files="main\.go" --integration --timeout-coefficient=10 .
if errorlevel 1 exit /b 1
cd ..\..
goto end

:test-coverage
cd specs
npm run test:coverage
if errorlevel 1 exit /b 1
cd ..
goto end

:merge-coverage
cd specs
npm run coverage:merge
if errorlevel 1 exit /b 1
cd ..
goto end

:serve-coverage
echo Serving coverage report at http://localhost:8181/report.html
cd specs\coverage
where python3 >nul 2>&1
if not errorlevel 1 (
    python3 -m http.server 8181
) else (
    python -m http.server 8181
)
cd ..\..
goto end

:webui
cd source\webui
docker compose up --build -d
if errorlevel 1 exit /b 1
cd ..\..
goto end

:webui-down
cd source\webui
docker compose down
if errorlevel 1 exit /b 1
cd ..\..
goto end

:webui-logs
cd source\webui
docker compose logs -f
cd ..\..
goto end

:help
echo Usage: Makefile.bat ^<target^>
echo.
echo Available targets:
echo   install              - Check and install all dependencies
echo   build                - Build docker image and npm install
echo   test                 - Run integration tests (builds first)
echo   test-only            - Run integration tests without building
echo   test-unit            - Run Go unit tests
echo   test-unit-coverage   - Run Go unit tests with coverage
echo   test-mutation        - Run mutation tests
echo   test-coverage        - Run tests with coverage
echo   merge-coverage       - Merge coverage from unit and integration tests
echo   serve-coverage       - Serve coverage report at http://localhost:8181
echo   webui                - Start web UI for local development
echo   webui-down           - Stop web UI
echo   webui-logs           - Show web UI logs
echo   help                 - Show this help message

:end
endlocal
