#!/bin/bash

# This script installs the dependencies needed for the RAG (Retrieval Augmented Generation) system

echo "Installing LangChain and OpenAI packages for RAG system..."

# Install main dependencies with legacy peer deps to resolve conflicts
npm install @langchain/openai @langchain/core --legacy-peer-deps

# Install community packages with legacy peer deps
npm install @langchain/community --legacy-peer-deps

# Ensure OpenAI is properly installed
npm install openai --legacy-peer-deps

echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. Run 'npx ts-node scripts/initialize-vector-stores.ts' to initialize vector stores for all businesses"
echo ""
echo "Note: You may need to restart your development server for the changes to take effect." 