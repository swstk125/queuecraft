# QueueCraft - Quick Start Guide

Get QueueCraft up and running in 5 minutes!

## Prerequisites

- Node.js v18+ installed
- MongoDB running locally or connection string
- Redis running locally or connection string

## Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 2: Start MongoDB and Redis

### Option A: Using Docker
```bash
# Start MongoDB
docker run -d -p 27017:27017 --name queuecraft-mongo mongo:latest

# Start Redis
docker run -d -p 6379:6379 --name queuecraft-redis redis:latest
```

### Option B: Using Local Installation
```bash
# Start MongoDB (if installed locally)
mongod

# Start Redis (if installed locally)
redis-server
```

## Step 3: Start Backend Services

### Terminal 1: API Server
```bash
node appServer.js
```

You should see:
```
connected to mongodb : mongodb://localhost/queuecraft
connected to redis : redis://localhost:6379
Listening on port 2000
```

### Terminal 2: Job Processor
```bash
node jobServer.js
```

You should see:
```
connected to mongodb : mongodb://localhost/queuecraft
connected to redis : redis://localhost:6379
Job processor initialized
```

## Step 4: Create a User

```bash
curl -X POST http://localhost:2000/user/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

## Step 5: Start Frontend Dashboard

### Terminal 3: Frontend Dev Server
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:3000/
```

## Step 6: Access the Dashboard

1. Open your browser to `http://localhost:3000`
2. Login with:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Explore the dashboard!

## Quick Test

### Create a Job via Dashboard
1. Click "Create Job" button
2. Enter job name: "Test Job"
3. Click "Create"
4. Watch it appear in the job list!

### Create a Job via API
```bash
# First, login to get token
TOKEN=$(curl -X POST http://localhost:2000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.jwt')

# Create a job
curl -X POST http://localhost:2000/job/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test Job"}'
```

## Verify Everything Works

1. **Dashboard**: Should show job counts in summary cards
2. **Job Table**: Should display created jobs
3. **Job Processor**: Terminal 2 should show job processing logs
4. **DLQ Viewer**: Navigate to DLQ tab to see failed jobs

## Common Issues

### "Error connecting to MongoDB"
- Ensure MongoDB is running: `mongod` or check Docker container
- Check connection string in code (default: `mongodb://localhost/queuecraft`)

### "Error connecting to Redis"
- Ensure Redis is running: `redis-server` or check Docker container
- Check connection string in code (default: `redis://localhost:6379`)

### "401 Unauthorized" in Dashboard
- Make sure you created a user first (Step 4)
- Check login credentials match the created user
- Clear localStorage and login again

### Frontend won't connect to backend
- Verify API server is running on port 2000
- Check browser console for CORS errors
- Ensure proxy is configured in `frontend/vite.config.js`

## Next Steps

- ✅ Explore the Dashboard UI
- ✅ Create multiple jobs and watch them process
- ✅ Test rate limiting (try creating 6+ jobs quickly)
- ✅ View DLQ jobs (create jobs with "fail" in the name)
- ✅ Run tests: `npm test`
- ✅ Check test coverage: `npm test -- --coverage`

## Architecture Overview

```
┌─────────────────┐
│   Dashboard UI  │ (Port 3000)
│   React + Vite  │
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│   API Server    │ (Port 2000)
│   Express.js    │
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐ ┌──────┐
│MongoDB │ │Redis │
└────────┘ └──────┘
    ↑
    │
┌───┴──────────┐
│ Job Processor│
│  Worker Pool │
└──────────────┘
```

## Production Deployment

See `frontend/README.md` for frontend deployment instructions.

For backend:
```bash
# Set environment variables
export MONGODB_URI=mongodb://your-mongo-url
export REDIS_URL=redis://your-redis-url
export SECRET_KEY=your-secret-key
export PORT=2000

# Start services (use PM2 or similar for production)
pm2 start appServer.js --name queuecraft-api
pm2 start jobServer.js --name queuecraft-worker
```

---

**You're all set! 🎉**

Need help? Check the main README.md or individual component documentation.

