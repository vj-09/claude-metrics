#!/bin/bash

# Claude Metrics Dashboard Launcher
# Usage: ./scripts/start-dashboard.sh [port]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PORT="${1:-3456}"

cd "$PROJECT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Set port and start server
export PORT="$PORT"
node server/index.js
