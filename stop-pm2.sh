#!/bin/bash

# Stop LLMGateway services managed by PM2

echo "Stopping PM2 services..."

# Stop all apps defined in ecosystem.config.js
pm2 delete ecosystem.config.js 2>/dev/null || true

# Alternative: stop individual apps
pm2 delete llmgateway-gateway llmgateway-api llmgateway-ui llmgateway-docs 2>/dev/null || true

echo "✅ PM2 services stopped"