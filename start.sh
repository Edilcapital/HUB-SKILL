#!/bin/bash
# AI Skill Hub - Quick Start Script
# This script installs dependencies, syncs skills, and starts the app.

set -e

echo "🚀 AI Skill Hub - Starting..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "   Install it from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

if [ ! -d "mcp-server/node_modules" ]; then
    echo "📦 Installing MCP server dependencies..."
    cd mcp-server && npm install && cd ..
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

# Initial sync if database doesn't exist
if [ ! -f "server/skills.db" ]; then
    echo "🔄 First run - syncing skill catalog from GitHub..."
    cd server && node sync.js && cd ..
    echo ""
fi

# Build client if dist doesn't exist
if [ ! -d "client/dist" ]; then
    echo "🔨 Building frontend..."
    cd client && npx vite build && cd ..
    echo ""
fi

echo "✅ Starting AI Skill Hub..."
echo "   Web UI:  http://localhost:3001"
echo "   API:     http://localhost:3001/api"
echo ""
echo "   Press Ctrl+C to stop."
echo ""

# Start server (serves built frontend)
node server/index.js
