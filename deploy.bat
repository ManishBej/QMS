@echo off
REM 🚀 QMS Production Deployment Script for Windows
REM This script handles the complete deployment process for both frontend and backend

echo 🚀 Starting QMS Production Deployment...

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Vercel CLI is not installed. Installing now...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Vercel CLI. Please install manually: npm install -g vercel
        exit /b 1
    )
    echo [SUCCESS] Vercel CLI installed successfully
) else (
    echo [SUCCESS] Vercel CLI is already installed
)

REM Check Vercel authentication
echo [INFO] Checking Vercel authentication...
vercel whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Not logged in to Vercel. Please login:
    vercel login
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to login to Vercel
        exit /b 1
    )
)
echo [SUCCESS] Logged in to Vercel

REM Deploy backend
echo [INFO] 📡 Step 1: Deploying Backend...
cd backend

echo [INFO] Running production tests...
npm run test
if %errorlevel% neq 0 (
    echo [WARNING] Tests failed, but continuing with deployment...
)

echo [INFO] Deploying backend to Vercel...
vercel --prod --yes
if %errorlevel% neq 0 (
    echo [ERROR] Backend deployment failed
    exit /b 1
)

echo [SUCCESS] Backend deployed successfully
cd ..

REM Deploy frontend
echo [INFO] 🎨 Step 2: Deploying Frontend...
cd frontend

echo [INFO] Installing dependencies...
npm ci
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    exit /b 1
)

echo [INFO] Building for production...
npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed
    exit /b 1
)

echo [INFO] Running tests...
npm run test
if %errorlevel% neq 0 (
    echo [WARNING] Tests failed, but continuing with deployment...
)

echo [INFO] Deploying frontend to Vercel...
vercel --prod --yes
if %errorlevel% neq 0 (
    echo [ERROR] Frontend deployment failed
    exit /b 1
)

echo [SUCCESS] Frontend deployed successfully
cd ..

REM Post-deployment
echo ================================================
echo [SUCCESS] 🎉 QMS Deployment Completed Successfully!
echo ================================================

echo [INFO] 📋 Next Steps:
echo 1. Update your DNS settings if using custom domain
echo 2. Configure environment variables in Vercel dashboard
echo 3. Set up monitoring and alerts
echo 4. Run post-deployment tests

echo [INFO] 🔗 Useful Commands:
echo • View deployment logs: vercel logs
echo • Check deployment status: vercel ls
echo • Access Vercel dashboard: https://vercel.com/dashboard

pause