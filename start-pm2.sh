#!/bin/bash

# Start LLMGateway services with PM2

cd "$(dirname "$0")"

echo "Building all applications..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before starting."
    exit 1
fi

echo "Starting services with PM2..."
pm2 start ecosystem.config.js

echo "✅ Services started! Check status with: pm2 status"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status         - Check service status"
echo "  pm2 logs           - View all logs"
echo "  pm2 logs <app>     - View specific app logs"
echo "  pm2 restart all    - Restart all services"
echo "  pm2 reload all     - Zero-downtime reload"
echo "  pm2 monit          - Real-time monitoring"
echo "  pm2 save           - Save current process list"
echo "  pm2 startup        - Generate startup script"