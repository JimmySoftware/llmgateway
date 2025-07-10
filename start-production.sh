#!/bin/bash

# Start all services in production mode
# Make sure to run 'pnpm build' first!

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env"
else
    echo "⚠️  Warning: .env file not found. Using default environment variables."
fi

echo "Starting LLMGateway in production mode..."

# Check if build artifacts exist
if [ ! -d "apps/api/dist" ] || [ ! -d "apps/gateway/dist" ] || [ ! -d "apps/ui/.output" ]; then
    echo "Build artifacts not found. Please run 'pnpm build' first."
    exit 1
fi

# Export NODE_PATH to help with module resolution
export NODE_PATH="$SCRIPT_DIR/node_modules:$SCRIPT_DIR/packages"

# Start all services
echo "Starting Gateway on port 4001..."
(cd "$SCRIPT_DIR/apps/gateway" && NODE_ENV=production PORT=4001 NODE_PATH="$NODE_PATH:$SCRIPT_DIR/apps/gateway/node_modules" pnpm start) &

echo "Starting API on port 4002..."  
(cd "$SCRIPT_DIR/apps/api" && NODE_ENV=production PORT=4002 NODE_PATH="$NODE_PATH:$SCRIPT_DIR/apps/api/node_modules" pnpm start) &

echo "Starting UI on port 3002..."
(cd "$SCRIPT_DIR/apps/ui" && NODE_ENV=production PORT=3002 NODE_PATH="$NODE_PATH:$SCRIPT_DIR/apps/ui/node_modules" pnpm start) &

echo "Starting Docs on port 3005..."
(cd "$SCRIPT_DIR/apps/docs" && NODE_ENV=production PORT=3005 NODE_PATH="$NODE_PATH:$SCRIPT_DIR/apps/docs/node_modules" pnpm start) &

echo "All services started!"
echo "Gateway: http://localhost:4001"
echo "API: http://localhost:4002"  
echo "UI: http://localhost:3002"
echo "Docs: http://localhost:3005"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?