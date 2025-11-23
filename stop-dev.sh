#!/bin/bash

# QueueCraft Development Shutdown Script
# This script stops all Docker services

echo "🛑 Stopping QueueCraft Development Environment..."

# Stop Docker Compose services
docker-compose down

echo "✅ All services stopped!"
echo ""
echo "To remove volumes (MongoDB and Redis data), run:"
echo "  docker-compose down -v"

