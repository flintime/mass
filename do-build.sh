#!/bin/bash
set -e

# Install dependencies for main app
echo "=== Installing frontend dependencies ==="
npm install

# Build Next.js app
echo "=== Building Next.js app ==="
npm run build

# Move to backend directory
cd backend

# Install backend dependencies
echo "=== Installing backend dependencies ==="
npm install

# Build backend
echo "=== Building backend ==="
npm run build

# Return to root
cd ..

echo "=== Build completed successfully ===" 