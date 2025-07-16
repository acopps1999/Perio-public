#!/bin/bash

# 🤖 Free LLM Setup Script for Database Chatbot
# This script helps you set up Ollama with a good model for SQL generation

echo "🤖 Setting up free LLM for your database chatbot..."
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "📦 Ollama not found. Installing Ollama..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ollama
        else
            echo "Please install Homebrew first: https://brew.sh"
            echo "Then run: brew install ollama"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "Please install Ollama manually from: https://ollama.ai/download"
        exit 1
    fi
else
    echo "✅ Ollama is already installed"
fi

echo ""
echo "🚀 Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wait a bit for Ollama to start
sleep 3

echo ""
echo "📥 Downloading recommended model for SQL generation..."
echo "This will download ~7GB. Please be patient..."

# Download the best model for SQL
ollama pull codellama:7b

if [ $? -eq 0 ]; then
    echo "✅ Model downloaded successfully!"
else
    echo "❌ Failed to download model. Please check your internet connection."
    kill $OLLAMA_PID 2>/dev/null
    exit 1
fi

echo ""
echo "⚙️ Creating environment configuration..."

# Create or update .env file
ENV_FILE=".env"

# Remove old LLM configurations if they exist
if [ -f "$ENV_FILE" ]; then
    # Create backup
    cp "$ENV_FILE" "$ENV_FILE.backup"
    echo "📄 Backed up existing .env to .env.backup"
    
    # Remove old LLM configs
    grep -v "REACT_APP_OLLAMA\|REACT_APP_HUGGINGFACE\|REACT_APP_OPENAI\|REACT_APP_ANTHROPIC" "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
fi

# Add Ollama configuration
cat >> "$ENV_FILE" << EOL

# 🤖 Free LLM Configuration (Ollama)
REACT_APP_OLLAMA_MODEL=codellama:7b
REACT_APP_OLLAMA_BASE_URL=http://localhost:11434

# Alternative free option (Hugging Face)
# REACT_APP_HUGGINGFACE_API_KEY=your_free_hf_token_here
# REACT_APP_HUGGINGFACE_MODEL=microsoft/DialoGPT-medium

# Paid options (uncomment if you prefer)
# REACT_APP_OPENAI_API_KEY=your_openai_key_here
# REACT_APP_ANTHROPIC_API_KEY=your_anthropic_key_here
EOL

echo "✅ Environment configured successfully!"

echo ""
echo "🧪 Testing the setup..."

# Test if Ollama is responding
sleep 2
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama is running and accessible"
    
    # Show available models
    echo ""
    echo "📋 Available models:"
    ollama list
else
    echo "⚠️  Ollama might not be ready yet. You may need to run 'ollama serve' manually."
fi

echo ""
echo "🎉 Setup complete! Here's what to do next:"
echo ""
echo "1. 🏃 Start your React app:"
echo "   npm start"
echo ""
echo "2. 🔐 Log into your application"
echo ""
echo "3. 💬 Look for the blue database icon in the bottom-left corner"
echo ""
echo "4. 🧪 Try asking: 'What products are used for gingivitis treatment?'"
echo ""
echo "📚 For more help, see: LLM_INTEGRATION_README.md"
echo ""
echo "💡 Pro tip: If you want to try a different model:"
echo "   ollama pull mistral:7b     # Lighter alternative"
echo "   ollama pull sqlcoder:7b    # SQL-specialized model"
echo ""

# Keep Ollama running
echo "🔄 Ollama is running in the background (PID: $OLLAMA_PID)"
echo "   To stop it later: kill $OLLAMA_PID"
echo "   To restart it: ollama serve"

echo ""
echo "Happy querying! 🦷✨" 