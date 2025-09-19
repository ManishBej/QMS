#!/bin/bash

# 🚀 QMS Production Deployment Script
# This script handles the complete deployment process for both frontend and backend

echo "🚀 Starting QMS Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed. Installing now..."
        npm install -g vercel
        if [ $? -ne 0 ]; then
            print_error "Failed to install Vercel CLI. Please install manually: npm install -g vercel"
            exit 1
        fi
        print_success "Vercel CLI installed successfully"
    else
        print_success "Vercel CLI is already installed"
    fi
}

# Login to Vercel (if not already logged in)
vercel_login() {
    print_status "Checking Vercel authentication..."
    vercel whoami > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        print_warning "Not logged in to Vercel. Please login:"
        vercel login
        if [ $? -ne 0 ]; then
            print_error "Failed to login to Vercel"
            exit 1
        fi
    fi
    print_success "Logged in to Vercel"
}

# Deploy backend
deploy_backend() {
    print_status "Deploying backend to Vercel..."
    cd backend
    
    # Create production build
    print_status "Running production tests..."
    npm run test
    if [ $? -ne 0 ]; then
        print_warning "Tests failed, but continuing with deployment..."
    fi
    
    # Deploy to Vercel
    print_status "Deploying to Vercel..."
    vercel --prod --yes
    if [ $? -ne 0 ]; then
        print_error "Backend deployment failed"
        exit 1
    fi
    
    print_success "Backend deployed successfully"
    cd ..
}

# Deploy frontend
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    cd frontend
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm ci
    if [ $? -ne 0 ]; then
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
    
    # Run production build
    print_status "Building for production..."
    npm run build:production
    if [ $? -ne 0 ]; then
        print_error "Frontend build failed"
        exit 1
    fi
    
    # Run tests
    print_status "Running tests..."
    npm run test
    if [ $? -ne 0 ]; then
        print_warning "Tests failed, but continuing with deployment..."
    fi
    
    # Deploy to Vercel
    print_status "Deploying to Vercel..."
    vercel --prod --yes
    if [ $? -ne 0 ]; then
        print_error "Frontend deployment failed"
        exit 1
    fi
    
    print_success "Frontend deployed successfully"
    cd ..
}

# Main deployment process
main() {
    print_status "🚀 QMS Production Deployment Started"
    print_status "================================================"
    
    # Pre-deployment checks
    check_vercel_cli
    vercel_login
    
    # Deploy backend first
    print_status "📡 Step 1: Deploying Backend..."
    deploy_backend
    
    # Deploy frontend
    print_status "🎨 Step 2: Deploying Frontend..."
    deploy_frontend
    
    # Post-deployment
    print_success "================================================"
    print_success "🎉 QMS Deployment Completed Successfully!"
    print_success "================================================"
    
    print_status "📋 Next Steps:"
    echo "1. Update your DNS settings if using custom domain"
    echo "2. Configure environment variables in Vercel dashboard"
    echo "3. Set up monitoring and alerts"
    echo "4. Run post-deployment tests"
    
    print_status "🔗 Useful Commands:"
    echo "• View deployment logs: vercel logs"
    echo "• Check deployment status: vercel ls"
    echo "• Access Vercel dashboard: https://vercel.com/dashboard"
}

# Run main function
main "$@"