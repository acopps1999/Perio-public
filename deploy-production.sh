#!/bin/bash

# 🚀 Production Deployment Script for LLM Database Chatbot
# This script performs pre-deployment checks and deploys to production

set -e  # Exit on any error

echo "🚀 Production Deployment Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REQUIRED_ENV_VARS=(
    "REACT_APP_OPENAI_API_KEY"
    "REACT_APP_SUPABASE_URL" 
    "REACT_APP_SUPABASE_ANON_KEY"
)

OPTIONAL_ENV_VARS=(
    "REACT_APP_ANTHROPIC_API_KEY"
    "REACT_APP_OLLAMA_BASE_URL"
    "REACT_APP_HUGGINGFACE_API_KEY"
)

# Functions
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

check_environment() {
    print_status "Checking environment variables..."
    
    local missing_required=0
    local missing_optional=0
    
    # Check required environment variables
    for var in "${REQUIRED_ENV_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            print_error "Required environment variable $var is not set"
            missing_required=1
        else
            print_success "$var is configured"
        fi
    done
    
    # Check optional environment variables
    for var in "${OPTIONAL_ENV_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            print_warning "Optional environment variable $var is not set"
            missing_optional=1
        else
            print_success "$var is configured"
        fi
    done
    
    if [[ $missing_required -eq 1 ]]; then
        print_error "Missing required environment variables. Please check your .env file."
        echo ""
        echo "Required variables:"
        printf '%s\n' "${REQUIRED_ENV_VARS[@]}"
        echo ""
        echo "See PRODUCTION_SETUP.md for configuration instructions."
        exit 1
    fi
    
    if [[ $missing_optional -eq 1 ]]; then
        print_warning "Some optional LLM providers are not configured."
        print_warning "The app will work with OpenAI only, but consider adding backups."
    fi
    
    print_success "Environment check completed"
}

check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE="18"
    
    if [[ $(echo "$NODE_VERSION < $REQUIRED_NODE" | bc -l) ]]; then
        print_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_NODE+"
        exit 1
    else
        print_success "Node.js version $NODE_VERSION is compatible"
    fi
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    else
        print_success "npm is available"
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm ci --only=production
    print_success "Dependencies installed"
}

run_tests() {
    print_status "Running production tests..."
    
    # Run tests without watch mode
    if npm run test:prod > /dev/null 2>&1; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed or no tests found"
        read -p "Continue deployment anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled"
            exit 1
        fi
    fi
}

build_application() {
    print_status "Building application for production..."
    
    # Clean previous builds
    if [[ -d "build" ]]; then
        rm -rf build
        print_status "Cleaned previous build"
    fi
    
    # Build with production optimizations
    if npm run build:prod; then
        print_success "Build completed successfully"
        
        # Check build size
        BUILD_SIZE=$(du -sh build | cut -f1)
        print_status "Build size: $BUILD_SIZE"
        
        # Warn if build is too large
        BUILD_SIZE_MB=$(du -sm build | cut -f1)
        if [[ $BUILD_SIZE_MB -gt 100 ]]; then
            print_warning "Build size is large ($BUILD_SIZE). Consider optimizing."
        fi
    else
        print_error "Build failed"
        exit 1
    fi
}

validate_build() {
    print_status "Validating build..."
    
    # Check if critical files exist
    CRITICAL_FILES=(
        "build/index.html"
        "build/static/js"
        "build/static/css"
    )
    
    for file in "${CRITICAL_FILES[@]}"; do
        if [[ -e "$file" ]]; then
            print_success "Found $file"
        else
            print_error "Missing critical file: $file"
            exit 1
        fi
    done
    
    # Check if service worker exists (optional)
    if [[ -f "build/service-worker.js" ]]; then
        print_success "Service worker found"
    else
        print_warning "No service worker found"
    fi
    
    print_success "Build validation completed"
}

security_check() {
    print_status "Running security checks..."
    
    # Check for exposed secrets in build
    if grep -r "sk-" build/ 2>/dev/null || grep -r "PRIVATE" build/ 2>/dev/null; then
        print_error "Potential secrets found in build files!"
        print_error "Review build contents before deploying"
        exit 1
    else
        print_success "No exposed secrets found"
    fi
    
    # Check if HTTPS is enforced (for production URLs)
    if [[ -n "$REACT_APP_SUPABASE_URL" ]] && [[ "$REACT_APP_SUPABASE_URL" != https://* ]]; then
        print_warning "Supabase URL is not HTTPS. This may cause issues in production."
    fi
    
    print_success "Security check completed"
}

deployment_summary() {
    echo ""
    echo "🎉 Pre-deployment checks completed successfully!"
    echo "=============================================="
    echo ""
    echo "📋 Deployment Summary:"
    echo "• Build size: $(du -sh build | cut -f1)"
    echo "• Node.js version: $(node --version)"
    echo "• Environment: Production"
    echo "• LLM Provider: OpenAI GPT-4o-mini"
    echo "• Database: Supabase"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Deploy the 'build' folder to your hosting platform"
    echo "2. Set environment variables in your hosting dashboard"
    echo "3. Configure custom domain and HTTPS"
    echo "4. Set up monitoring and error tracking"
    echo ""
    echo "📖 Deployment guides:"
    echo "• Vercel: vercel --prod"
    echo "• Netlify: drag 'build' folder to Netlify dashboard"
    echo "• AWS: aws s3 sync build/ s3://your-bucket"
    echo ""
    echo "📚 For detailed instructions, see PRODUCTION_SETUP.md"
    echo ""
}

post_deployment_check() {
    if [[ -n "$1" ]]; then
        DEPLOYMENT_URL="$1"
        print_status "Running post-deployment health check on $DEPLOYMENT_URL..."
        
        # Simple health check
        if curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL" | grep -q "200"; then
            print_success "Deployment is accessible at $DEPLOYMENT_URL"
        else
            print_error "Deployment health check failed"
            print_error "Please verify the deployment manually"
        fi
    else
        print_warning "No deployment URL provided. Skipping health check."
        print_warning "Please test your deployment manually after uploading."
    fi
}

# Main execution
main() {
    echo "Starting production deployment process..."
    echo ""
    
    # Load environment variables if .env exists
    if [[ -f ".env" ]]; then
        print_status "Loading environment variables from .env"
        source .env
    else
        print_warning "No .env file found. Make sure environment variables are set."
    fi
    
    # Run all checks
    check_environment
    echo ""
    
    check_dependencies
    echo ""
    
    run_tests
    echo ""
    
    build_application
    echo ""
    
    validate_build
    echo ""
    
    security_check
    echo ""
    
    deployment_summary
    
    # Optional: Post-deployment health check
    if [[ -n "$2" ]] && [[ "$2" == "--url" ]] && [[ -n "$3" ]]; then
        echo ""
        post_deployment_check "$3"
    fi
    
    print_success "Deployment preparation completed! 🎉"
}

# Help function
show_help() {
    echo "Production Deployment Script"
    echo ""
    echo "Usage:"
    echo "  ./deploy-production.sh              # Prepare for deployment"
    echo "  ./deploy-production.sh --url <URL>  # Include post-deployment check"
    echo ""
    echo "Examples:"
    echo "  ./deploy-production.sh"
    echo "  ./deploy-production.sh --url https://your-app.vercel.app"
    echo ""
    echo "Environment Variables Required:"
    printf '  %s\n' "${REQUIRED_ENV_VARS[@]}"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac 