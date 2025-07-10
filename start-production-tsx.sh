#!/bin/bash

# Start all services in production mode using tsx
# This avoids complex module resolution issues

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Starting LLMGateway in production mode (using tsx)..."

# Kill any existing processes
echo "Stopping any existing services..."
pkill -f "tsx src/serve.ts" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "vinxi start" 2>/dev/null || true
sleep 2

# Start all services
echo "Starting Gateway on port 4001..."
(cd "$SCRIPT_DIR/apps/gateway" && NODE_ENV=production PORT=4001 npx tsx src/serve.ts) &

echo "Starting API on port 4002..."  
(cd "$SCRIPT_DIR/apps/api" && NODE_ENV=production PORT=4002 npx tsx src/serve.ts) &

echo "Starting UI on port 3002..."
(cd "$SCRIPT_DIR/apps/ui" && NODE_ENV=production PORT=3002 pnpm start) &

echo "Starting Docs on port 3005..."
(cd "$SCRIPT_DIR/apps/docs" && NODE_ENV=production PORT=3005 pnpm start) &

echo "All services started!"
echo "Gateway: http://localhost:4001"
echo "API: http://localhost:4002"  
echo "UI: http://localhost:3002"
echo "Docs: http://localhost:3005"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?