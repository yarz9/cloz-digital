@echo off
REM ─────────────────────────────────────────────
REM Cloz Digital — Railway Deployment Script
REM ─────────────────────────────────────────────

echo.
echo === Cloz Digital Deploy ===
echo.

REM 1. Pre-flight checks
echo [1/6] Checking prerequisites...

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed.
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm is not installed.
    exit /b 1
)

where railway >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Railway CLI is not installed.
    echo Install it: npm install -g @railway/cli
    echo Then login:  railway login
    exit /b 1
)

where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: git is not installed.
    exit /b 1
)

echo   Prerequisites OK
echo.

REM 2. Install dependencies
echo [2/6] Installing dependencies...
call npm install --production=false
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install failed
    exit /b 1
)
echo.

REM 3. Build React frontend
echo [3/6] Building React frontend...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)
echo.

REM 4. Git commit
echo [4/6] Checking git status...
if not exist .git (
    echo   Initializing git repository...
    git init
    git add -A
    git commit -m "Initial commit — Cloz Digital"
) else (
    git diff --quiet --exit-code >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo   Committing changes...
        git add -A
        git commit -m "Deploy update"
    ) else (
        git diff --cached --quiet --exit-code >nul 2>nul
        if %ERRORLEVEL% neq 0 (
            echo   Committing staged changes...
            git commit -m "Deploy update"
        ) else (
            echo   No changes to commit.
        )
    )
)
echo.

REM 5. Check Railway link
echo [5/6] Checking Railway project...
railway status >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo   No Railway project linked. Setting up...
    echo.
    echo   Options:
    echo     1. Link to existing project: railway link
    echo     2. Create new project:       railway init
    echo.
    echo   After linking, set your environment variables:
    echo     railway variables set CEREBRAS_API_KEY=your_key_here
    echo     railway variables set ADMIN_PASSWORD=your_password
    echo     railway variables set NODE_ENV=production
    echo.
    echo   Then run this script again.
    exit /b 0
)

REM 6. Deploy
echo [6/6] Deploying to Railway...
railway up --detach

echo.
echo === Deployment started! ===
echo.
echo   View logs:     railway logs
echo   Open app:      railway open
echo   View status:   railway status
echo.
echo   Environment variables (set in Railway dashboard or CLI):
echo     CEREBRAS_API_KEY   - Your Cerebras API key
echo     ADMIN_PASSWORD   - Admin panel password
echo     NODE_ENV         - production
echo.
