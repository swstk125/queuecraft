#!/bin/bash

# QueueCraft Development Startup Script
# This script starts all required services for development

set -e

echo "🚀 Starting QueueCraft Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Start MongoDB and Redis
echo -e "${YELLOW}📦 Starting MongoDB and Redis with Docker Compose...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Check if MongoDB is ready
until docker exec queuecraft-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    echo -e "${YELLOW}Waiting for MongoDB...${NC}"
    sleep 2
done
echo -e "${GREEN}✅ MongoDB is ready${NC}"

# Check if Redis is ready
until docker exec queuecraft-redis redis-cli ping > /dev/null 2>&1; do
    echo -e "${YELLOW}Waiting for Redis...${NC}"
    sleep 2
done
echo -e "${GREEN}✅ Redis is ready${NC}"

# Install backend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📥 Installing backend dependencies...${NC}"
    npm install
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📥 Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

echo ""
echo -e "${GREEN}✅ All services are ready!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To start the application, open 3 separate terminals and run:"
echo ""
echo -e "${YELLOW}Terminal 1 - API Server:${NC}"
echo "  node appServer.js"
echo ""
echo -e "${YELLOW}Terminal 2 - Job Processor:${NC}"
echo "  node jobServer.js"
echo ""
echo -e "${YELLOW}Terminal 3 - Frontend:${NC}"
echo "  cd frontend && npm run dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}📝 Don't forget to create a user first!${NC}"
echo ""
echo "Run this command to create a demo user:"
echo ""
echo "curl -X POST http://localhost:2000/user/create \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"admin123\"}'"
echo ""
echo "Then login at: http://localhost:3000"
echo "  Email: admin@example.com"
echo "  Password: admin123"
echo ""
echo -e "${GREEN}🎉 Happy coding!${NC}"

