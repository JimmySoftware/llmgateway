#!/bin/bash

# Script to stop all LLMGateway services

echo "Stopping all LLMGateway services..."

# Stop development servers
echo "Stopping development servers..."
pkill -f "turbo run dev" 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true
pkill -f "nodemon.*tsx" 2>/dev/null || true
pkill -f "tsx.*serve\.ts" 2>/dev/null || true
pkill -f "tsx src/serve.ts" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true

# Stop production servers
echo "Stopping production servers..."
pkill -f "node dist/serve.js" 2>/dev/null || true
pkill -f "vinxi start" 2>/dev/null || true
pkill -f "vinxi dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Stop any remaining node processes on our ports
echo "Stopping any remaining processes on ports 4000, 4001, 4002, 3000, 3002, 3005..."
for port in 4000 4001 4002 3000 3002 3005; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done

# Give processes time to clean up
sleep 2

# Check if any processes are still running
echo ""
echo "Checking for remaining processes..."
remaining=0

for port in 4000 4001 4002 3000 3002 3005; do
    if lsof -ti :$port >/dev/null 2>&1; then
        echo "⚠️  Port $port is still in use"
        remaining=1
    else
        echo "✓ Port $port is free"
    fi
done

if [ $remaining -eq 0 ]; then
    echo ""
    echo "✅ All services stopped successfully!"
else
    echo ""
    echo "⚠️  Some services may still be running. You may need to stop them manually."
fi