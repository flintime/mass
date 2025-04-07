#!/bin/bash
set -e

# Create necessary directories
echo "=== Creating necessary directories ==="
mkdir -p logs
mkdir -p data/vector-store
mkdir -p backups/vector-store

# Set DO_APP_PLATFORM environment variable
export DO_APP_PLATFORM=true

# Start backend server in the background
echo "=== Starting backend server ==="
cd backend && node dist/server.js &
BACKEND_PID=$!

# Return to root
cd ..

# Start Next.js app
echo "=== Starting Next.js app ==="
npm run start &
FRONTEND_PID=$!

# Handle termination
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Keep script running
wait $BACKEND_PID $FRONTEND_PID 