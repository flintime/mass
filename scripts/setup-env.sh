#!/bin/bash

echo "Setting up environment for RAG system..."

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "Creating .env file..."
  touch .env
else
  echo ".env file already exists."
fi

# Check if OPENAI_API_KEY is in .env file
if grep -q "OPENAI_API_KEY" .env; then
  echo "OPENAI_API_KEY already exists in .env file."
else
  echo ""
  echo "OPENAI_API_KEY is not set in .env file."
  echo "Please enter your OpenAI API key (it will be saved to .env):"
  read -r OPENAI_API_KEY
  echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> .env
  echo "Added OPENAI_API_KEY to .env file."
fi

echo ""
echo "Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run install:rag' to install dependencies"
echo "2. Run 'npm run rag:local:init' to initialize local vector stores"
echo "3. Run 'npm run rag:test' to test the RAG system"
echo "" 