# QueueCraft - Distributed Job Queue System

A production-ready distributed job queue system powered by RabbitMQ with proper lease+ack+retry semantics, real-time monitoring, and a modern React dashboard.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Queue](https://img.shields.io/badge/queue-RabbitMQ-orange)
![Tests](https://img.shields.io/badge/tests-23%20passing-success)
![Coverage](https://img.shields.io/badge/coverage-high-brightgreen)
![Docker](https://img.shields.io/badge/docker-ready-blue)

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#️-architecture)
- [RabbitMQ Job Queue](#-rabbitmq-job-queue)
- [API Documentation](#-api-documentation)
- [Observability & Monitoring](#-observability--monitoring)
- [Rate Limiting](#-rate-limiting)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)

## ✨ Features

### Core Features
- ✅ **Distributed Job Queue**: RabbitMQ-based message queue with proper lease + ack + retry semantics
- ✅ **Real-time Updates**: WebSocket (Socket.IO) + Redis Pub/Sub for live status changes
- ✅ **Automatic Retries**: Up to 3 attempts with exponential backoff before moving to DLQ
- ✅ **Dead Letter Queue (DLQ)**: Native RabbitMQ DLQ for failed jobs after max retries
- ✅ **Two-Layer Rate Limiting**: 
  - Time-based: 10 requests/minute per user
  - Concurrent: 5 active jobs per user max
- ✅ **JWT Authentication**: Secure API with Bearer token authentication
- ✅ **MongoDB Storage**: Persistent job and user data with optimized indexes

### Observability & Monitoring
- ✅ **Structured JSON Logging**: Every event logged with trace IDs for request tracking
- ✅ **Real-time Metrics**: Redis-backed metrics with 24-hour retention
- ✅ **Prometheus Integration**: Native Prometheus format for advanced monitoring
- ✅ **Grafana Ready**: Pre-configured for visualization dashboards
- ✅ **Health Checks**: Built-in health endpoints for all services

### Dashboard (React)
- ✅ **Live Monitoring**: Real-time job updates via WebSocket
- ✅ **Job Management**: Create, view, and filter jobs by status
- ✅ **DLQ Viewer**: Dedicated interface for failed job analysis
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Using Docker (Recommended) 🐳

```bash
# Clone and navigate
git clone https://github.com/swstk125/queuecraft.git
cd queuecraft

# Start all services (MongoDB, Redis, RabbitMQ, API, Worker, Frontend)
docker-compose up -d

# Create a user
docker exec -it queuecraft-api sh -c '
curl -X POST http://localhost:2000/user/create \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"admin123\"}"
'

# Access the services:
# - Dashboard: http://localhost:3000
# - API: http://localhost:2000
# - RabbitMQ Management: http://localhost:15672 (queuecraft/queuecraft)
# - Prometheus: http://localhost:9090 (if using docker-compose.prometheus.yml)
# - Grafana: http://localhost:3001 (admin/admin)
```

**Common Commands:**
```bash
docker-compose logs -f              # View logs
docker-compose logs -f api worker   # View specific service logs
docker-compose down                 # Stop all services
docker-compose up -d --build        # Rebuild and restart
```

### Using Docker with Prometheus & Grafana

```bash
# Start with monitoring stack
docker-compose -f docker-compose.prometheus.yml up -d

# Access monitoring:
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (login: admin/admin)
```

### Local Development

**Prerequisites:** Node.js 18+, MongoDB, Redis, RabbitMQ

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start infrastructure (if using Docker)
docker-compose up -d mongodb redis rabbitmq

# Wait for RabbitMQ to be ready
docker logs -f queuecraft-rabbitmq | grep "Server startup complete"

# Terminal 1: API Server
node appServer.js

# Terminal 2: Job Processor
node jobServer.js

# Terminal 3: Frontend
cd frontend && npm run dev

# Create user
curl -X POST http://localhost:2000/user/create \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"admin123"}'

# Access services:
# - Dashboard: http://localhost:3000
# - RabbitMQ Management: http://localhost:15672 (queuecraft/queuecraft)
```

## 🏗️ Architecture

![QueueCraft High-Level Architecture](./queue_craft_arch.png)

```
┌─────────────────────────────────────────────────┐
│   React Dashboard (localhost:3000)              │
│   WebSocket + REST API Client                   │
└────────────────┬────────────────────────────────┘
                 │ HTTP + WebSocket
                 ↓
┌─────────────────────────────────────────────────┐
│   API Server (localhost:2000)                   │
│   Express + Socket.IO + JWT Auth                │
└─────┬───────────────┬───────────────┬───────────┘
      │               │               │
      ↓               ↓               ↓
┌──────────┐   ┌──────────┐   ┌─────────────────┐
│ MongoDB  │   │  Redis   │   │   RabbitMQ      │
│(Port     │   │(Port     │   │  (Port 5672)    │
│ 27017)   │   │ 6379)    │   │  Job Queue      │
│Jobs +    │   │Cache +   │   │  + DLQ          │
│Users     │   │Pub/Sub   │   │                 │
└────┬─────┘   └────┬─────┘   └────┬────────────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
            ┌───────┴──────────┐
            │  Job Processor   │
            │  (Worker Pool)   │
            │  RabbitMQ Consumer│
            └──────────────────┘
```

**Job Processing Flow (Lease + Ack + Retry):**
1. User submits job → API saves to MongoDB + publishes to RabbitMQ
2. Worker leases job from RabbitMQ (message becomes invisible)
3. Worker updates status to "running" in MongoDB
4. Worker processes job (10 seconds simulated work)
5. **Success**: Worker acks message → job marked "completed" in MongoDB
6. **Failure**: Worker nacks message → RabbitMQ retries with exponential backoff
7. **Max retries exceeded**: RabbitMQ moves to Dead Letter Queue (DLQ)
8. **Worker crash**: Unacked messages automatically requeue after timeout

**Real-time Updates Flow:**
1. Worker updates job status → MongoDB
2. Worker publishes event → Redis Pub/Sub
3. WebSocket Server receives event → Redis subscription
4. WebSocket Server emits → Connected dashboard clients
5. Dashboard UI updates automatically

**WebSocket Events:**
- `job:created` - New job submitted (saved to DB + published to RabbitMQ)
- `job:status:updated` - Status changed (pending → running → completed/failed)
- `job:completed` - Job finished successfully (acked in RabbitMQ)
- `job:movedToDLQ` - Job failed after 3 retries (moved to DLQ)

**Job Status Lifecycle:**
```
1. pending   → Job created, in RabbitMQ queue
2. running   → Job leased by worker (message invisible to others)
3. completed → Success, message acked and removed from queue
   OR
3. failed    → Error, message nacked and requeued with delay
4. dlq       → Max retries exceeded, moved to dead letter queue
```

## 🐰 RabbitMQ Job Queue

QueueCraft uses RabbitMQ for reliable job queue management with proper **lease + ack + retry** semantics.

### Key Features

#### 1. Lease Mechanism
When a worker picks up a job, the message becomes **invisible to other consumers**:
```javascript
// Message is automatically "leased" when consumed
channel.consume('job-queue', async (msg) => {
  // Only this worker can see this message
  // Other workers cannot pick it up
}, { noAck: false }); // Manual ack required
```

**Benefits:**
- ✅ No race conditions between workers
- ✅ Prevents duplicate processing
- ✅ Safe to scale workers horizontally

#### 2. Acknowledgement (Ack/Nack)
Workers must explicitly acknowledge message processing:

```javascript
// Success: Ack removes message from queue
channel.ack(msg);

// Failure: Nack requeues for retry
channel.nack(msg, false, false); // Don't requeue immediately
```

**Benefits:**
- ✅ At-least-once delivery guarantee
- ✅ Messages not lost on processing failure
- ✅ Explicit control over message lifecycle

#### 3. Automatic Retry with Exponential Backoff
Failed jobs automatically retry with increasing delays:

```
Attempt 1: Immediate
Attempt 2: 5 seconds delay
Attempt 3: 10 seconds delay
Attempt 4: 20 seconds delay
After 3 retries: → Dead Letter Queue
```

**Configuration:**
```javascript
// job/rabbitmqConnection.js
const retryDelay = 5000 * Math.pow(2, retryCount);
```

#### 4. Dead Letter Queue (DLQ)
Jobs that fail after 3 retries automatically move to DLQ:

```javascript
// Queue configuration with DLQ
await channel.assertQueue('job-queue', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'dlx',
    'x-dead-letter-routing-key': 'job-routing-key'
  }
});
```

**Benefits:**
- ✅ Failed jobs don't block the queue
- ✅ Easy to inspect and debug failures
- ✅ Can manually retry from DLQ
- ✅ Alerts can be set on DLQ depth

#### 5. Automatic Requeue on Worker Crash
If a worker crashes, unacked messages automatically requeue:

```
Worker picks message → Starts processing → Worker crashes
                                          ↓
                          Message unacked, RabbitMQ requeues
                                          ↓
                              Another worker picks it up
```

**Benefits:**
- ✅ No job loss on worker failure
- ✅ Self-healing system
- ✅ Safe to kill/restart workers anytime

#### 6. Concurrency Control
Control how many jobs each worker processes simultaneously:

```javascript
// Prefetch: Max concurrent jobs per worker
await channel.prefetch(5); // 5 jobs at a time
```

**Benefits:**
- ✅ Prevents worker overload
- ✅ Predictable memory usage
- ✅ Fine-tune performance per worker

### Monitoring RabbitMQ

#### Management UI
Access at **http://localhost:15672** (queuecraft/queuecraft)

**Queue Statistics:**
- Message count (ready, unacked, total)
- Message rates (incoming, delivered, ack rate)
- Consumer count and connection info

**Get Messages:**
- Inspect message content without removing
- View message headers (retry count, timestamp)
- Peek at DLQ contents

#### CLI Commands
```bash
# List all queues with message counts
docker exec queuecraft-rabbitmq rabbitmqctl list_queues

# List consumers
docker exec queuecraft-rabbitmq rabbitmqctl list_consumers

# Queue details
docker exec queuecraft-rabbitmq rabbitmqctl list_queues name messages consumers

# Connection info
docker exec queuecraft-rabbitmq rabbitmqctl list_connections
```

#### Programmatic Monitoring
```javascript
// Get queue stats via rabbitmqConnection
const stats = await rabbitmq.getQueueStats();
console.log(stats);
// {
//   mainQueue: { messageCount: 10, consumerCount: 2 },
//   dlq: { messageCount: 3, consumerCount: 0 }
// }
```

### Scaling Workers

#### Horizontal Scaling (Recommended)
```bash
# Scale to 5 workers
docker-compose up -d --scale worker=5

# Each worker processes up to 5 concurrent jobs (prefetch)
# Total capacity: 5 workers × 5 jobs = 25 concurrent jobs
```

#### Adjust Per-Worker Concurrency
Edit `config/configs/job.json`:
```json
{
  "concurrency": 10
}
```

This changes prefetch from 5 to 10 jobs per worker.

### Message Persistence

**Durable Queues:**
```javascript
await channel.assertQueue('job-queue', { durable: true });
```
Queue survives RabbitMQ restart.

**Persistent Messages:**
```javascript
channel.sendToQueue('job-queue', message, { persistent: true });
```
Messages written to disk before acknowledgment.

**Result:** Jobs survive:
- ✅ Worker crashes
- ✅ RabbitMQ restarts
- ✅ Server reboots (if RabbitMQ data persisted)

## 📚 API Documentation

**Base URL:** `http://localhost:2000`

**Authentication:** All protected endpoints require JWT token
```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/user/create` | No | Create new user |
| POST | `/login` | No | Login and get JWT token |
| POST | `/job/create` | Yes | Create new job (rate limited) |
| GET | `/job` | Yes | Get all jobs (supports `?status=pending` filter) |
| GET | `/job/stats` | Yes | Get job statistics |
| GET | `/metrics` | Yes | Get real-time system metrics |
| GET | `/prometheus/metrics` | No | Prometheus format metrics |
| GET | `/prometheus/health` | No | Prometheus health check |
| GET | `/sync` | No | Health check (returns timestamp) |

### Example Workflow

```bash
BASE_URL="http://localhost:2000"

# 1. Create user
curl -X POST $BASE_URL/user/create \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"admin123"}'

# 2. Login and get token
TOKEN=$(curl -s -X POST $BASE_URL/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq -r '.jwt')

# 3. Create a job
curl -X POST $BASE_URL/job/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Test Job"}'

# 4. Get all jobs
curl -H "Authorization: Bearer $TOKEN" $BASE_URL/job | jq .

# 5. Get statistics
curl -H "Authorization: Bearer $TOKEN" $BASE_URL/job/stats | jq .

# 6. Get metrics
curl -H "Authorization: Bearer $TOKEN" $BASE_URL/metrics | jq .
```

### Rate Limit Responses

**Time-based limit exceeded (10/min):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Maximum 10 job creation attempts per minute. Try again in 30 seconds.",
  "retryAfter": 30
}
```

**Concurrent limit exceeded (5 active jobs):**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Maximum 5 active jobs allowed."
}
```

## 🔐 Rate Limiting

QueueCraft implements **two-layer rate limiting** for robust protection:

### 1. Time-Based Limiting (Middleware)
- **Limit:** 10 job creation attempts per minute per user
- **Implementation:** In-memory sliding window
- **Response:** HTTP 429 with retry-after seconds

### 2. Concurrent Job Limiting (Service Layer)
- **Limit:** Maximum 5 active jobs (pending + running) per user
- **Implementation:** Database query before job creation
- **Response:** HTTP 429 when exceeded

### Configuration

**Time-based Rate Limit** - Edit `config/configs/rateLimit.json`:
```json
{
  "maxRequestsPerWindow": 10,
  "windowMs": 60000
}
```

**Concurrent Job Limit** - Edit `config/configs/job.json`:
```json
{
  "maxActiveJobsPerUser": 5,
  "activeJobStatuses": ["pending", "running"]
}
```

**Features:**
- User isolation (limits per user, not global)
- Only pending/running jobs count (completed/failed don't)
- Optimized with MongoDB compound indexes
- Cached active job counts (30s TTL) for performance

## 📊 Observability & Monitoring

QueueCraft provides comprehensive observability for production monitoring and debugging.

### 1. Structured JSON Logging

Every event is logged in JSON format with trace IDs:

```json
{
  "timestamp": "2025-11-23T14:39:08.538Z",
  "level": "INFO",
  "service": "queuecraft",
  "message": "Job submitted",
  "event": "submit",
  "jobId": "69231c8c041c89c391ca705e",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123"
}
```

**Logged Events:** submit, start, finish, fail, retry, dlq

**Usage:**
```bash
# Search by job ID
grep "jobId.*abc123" logs.json | jq .

# Search by trace ID (tracks entire request lifecycle)
grep "traceId.*550e8400" logs.json | jq .

# Pass custom trace ID
curl -H "X-Trace-Id: my-custom-trace" -H "Authorization: Bearer $TOKEN" \
  http://localhost:2000/job/create
```

### 2. Real-time Metrics API

**Endpoint:** `GET /metrics` (requires authentication)

**Available Metrics:**
- `jobs:total`, `jobs:pending`, `jobs:running`, `jobs:completed`, `jobs:failed`
- `jobs:retries`, `jobs:dlq`
- `jobs:success_rate`, `jobs:failure_rate`
- `rate_limit:hits`

**Usage:**
```bash
# Get current metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:2000/metrics | jq .

# Watch in real-time
watch -n 5 'curl -s -H "Authorization: Bearer $TOKEN" http://localhost:2000/metrics | jq .metrics'
```

### 3. Prometheus Integration

**Endpoint:** `GET /prometheus/metrics` (no authentication required)

**Quick Start:**
```bash
# Start with Prometheus + Grafana
docker-compose -f docker-compose.prometheus.yml up -d

# Access monitoring:
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
```

**Prometheus Metrics:**
- `queuecraft_jobs_total` - Total jobs submitted
- `queuecraft_jobs_pending` - Current pending jobs
- `queuecraft_jobs_running` - Currently processing
- `queuecraft_jobs_completed_total` - Successfully completed
- `queuecraft_jobs_failed_total` - Failed jobs
- `queuecraft_jobs_success_rate` - Success percentage
- `queuecraft_jobs_dlq` - Dead letter queue count
- `queuecraft_rate_limit_hits_total` - Rate limit violations

**Grafana Configuration:**
1. Open Grafana at `http://localhost:3001`
2. Login with `admin/admin`
3. Add Prometheus data source: `http://prometheus:9090`
4. Create dashboards or import existing ones

### 4. RabbitMQ Management UI

**Access:** http://localhost:15672  
**Credentials:** queuecraft/queuecraft

**Key Features:**
- **Queue Monitoring:** Real-time message counts, rates, and consumer info
- **Message Browser:** Inspect messages in queues without removing them
- **DLQ Viewer:** See failed jobs in the dead letter queue
- **Connection Tracking:** Monitor active connections and channels
- **Performance Metrics:** Message rates, memory usage, queue depth trends

**Useful Views:**
```bash
# View queue statistics
Queues → job-queue → Overview
  - Total messages
  - Ready messages
  - Unacked messages
  - Consumer count

# View DLQ
Queues → job-dlq → Overview
  - Failed jobs after 3 retries
  - Get messages to inspect failures

# Monitor connections
Connections → View all active connections from API and Workers
```

### 5. Integration Support

Compatible with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**, **New Relic**
- **Prometheus** + **Grafana**
- **Splunk**
- **RabbitMQ Native Monitoring** (Management UI + Prometheus plugin)

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- job.rest.test.js
```

**Test Results:**
- Test Suites: 3 passed, 3 total
- Tests: 23 passed, 23 total
- Coverage: High across critical paths

**Coverage Includes:**
- Rate limiting (time-based + concurrent)
- Job service operations
- User isolation
- Error handling and edge cases

### Integration Testing with RabbitMQ

**Test Successful Job:**
```bash
# Create a normal job (should succeed)
curl -X POST http://localhost:2000/job/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Success Job"}'

# Watch RabbitMQ queue
# http://localhost:15672 → Queues → job-queue
# Message should appear, then be processed and disappear

# Check job status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:2000/job?status=completed" | jq .
```

**Test Retry Logic:**
```bash
# Every 3rd job fails (see jobHandler.js)
# Create 3 jobs to trigger a failure
for i in {1..3}; do
  curl -X POST http://localhost:2000/job/create \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Job $i\"}"
  sleep 1
done

# Watch worker logs for retry attempts
docker-compose logs -f worker | grep -i retry
```

**Test DLQ (Dead Letter Queue):**
```bash
# Create a job with "fail" in name (always fails)
curl -X POST http://localhost:2000/job/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"fail test job"}'

# After 3 retries (~40 seconds), check DLQ
# http://localhost:15672 → Queues → job-dlq
# Should see 1 message in DLQ

# Check job status in DB
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:2000/job?status=dlq" | jq .
```

**Test Worker Crash Recovery:**
```bash
# Create a job
curl -X POST http://localhost:2000/job/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Crash Test"}'

# Kill worker during processing (within 10 seconds)
docker-compose kill worker

# Message should requeue automatically
# http://localhost:15672 → Queues → job-queue
# Shows message back in "Ready" state

# Restart worker
docker-compose up -d worker

# Job should be processed again
```

## 🚀 Deployment

### Docker (Recommended)

**Production:**
```bash
# 1. Create .env file
echo "SECRET_KEY=your-secure-secret-key" > .env
echo "FRONTEND_URL=https://your-domain.com" >> .env

# 2. Start all services
docker-compose up -d --build

# 3. Create admin user
docker exec -it queuecraft-api sh -c '
curl -X POST http://localhost:2000/user/create \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"admin123\"}"
'

# 4. Scale workers if needed
docker-compose up -d --scale worker=3
```

**Development:**
```bash
# Hot-reload for all services
docker-compose -f docker-compose.dev.yml up
```

**Docker Services:**
| Service | Port | Description |
|---------|------|-------------|
| MongoDB | 27017 | Database |
| Redis | 6379 | Cache + Pub/Sub |
| RabbitMQ | 5672, 15672 | Message Queue + Management UI |
| API | 2000 | Express + WebSocket |
| Worker | - | Job Processor (scalable) |
| Frontend | 3000 | React Dashboard |
| Prometheus | 9090 | Metrics (optional) |
| Grafana | 3001 | Dashboards (optional) |

### Traditional Deployment (PM2)

**Environment Variables:**
```bash
# Backend
MONGODB_URI=mongodb://your-mongo-url/queuecraft
REDIS_URL=redis://your-redis-url:6379
RABBITMQ_URL=amqp://username:password@your-rabbitmq-url:5672
SECRET_KEY=your-secure-secret-key
PORT=2000
FRONTEND_URL=https://your-frontend-domain.com

# Frontend
VITE_API_BASE_URL=https://api.yourdomain.com
```

**Deploy:**
```bash
# Install PM2
npm install -g pm2

# Start backend services
pm2 start appServer.js --name queuecraft-api
pm2 start jobServer.js --name queuecraft-worker
pm2 save && pm2 startup

# Build and deploy frontend
cd frontend && npm run build
# Deploy 'dist' folder to Netlify/Vercel/S3/CloudFront
```

## 🔧 Troubleshooting

### Connection Issues

**MongoDB Connection Error:**
```bash
docker ps | grep mongo          # Check if running
mongosh mongodb://localhost:27017/queuecraft  # Test connection
```

**Redis Connection Error:**
```bash
docker ps | grep redis          # Check if running
redis-cli ping                  # Should return "PONG"
```

**RabbitMQ Connection Error:**
```bash
docker ps | grep rabbitmq       # Check if running
docker logs queuecraft-rabbitmq # Check logs
# Access management UI: http://localhost:15672
# Default credentials: queuecraft/queuecraft
```

**Docker Networking (if using Docker Compose):**
```bash
# Inside containers, use service names:
# - mongodb:27017 (not localhost:27017)
# - redis:6379 (not localhost:6379)
# - rabbitmq:5672 (not localhost:5672)
# - api:2000 (not localhost:2000)
# - prometheus:9090 (not localhost:9090)
```

### Frontend Issues

**401 Unauthorized:**
1. Create user via `/user/create`
2. Login with correct credentials
3. Clear localStorage if needed

**WebSocket "Disconnected":**
1. Verify both `appServer.js` and `jobServer.js` are running
2. Check Redis is running (`redis-cli ping`)
3. Check browser console for errors
4. Verify `FRONTEND_URL` environment variable is set correctly

**CORS Errors:**
- Set correct `FRONTEND_URL` in backend environment
- Check CORS middleware in `api/index.js`

### Prometheus/Grafana Issues

**Empty metrics in Prometheus:**
- Ensure Prometheus scrape target uses service name: `api:2000` (not `localhost:2000`)
- Check `/prometheus/metrics` endpoint is accessible
- Verify API service is running

**Grafana can't connect to Prometheus:**
- Use `http://prometheus:9090` as data source URL (not `localhost:9090`)
- Ensure both containers are on the same Docker network

### Performance

**Slow job processing:**
- Increase concurrency: Edit `prefetch` value in `job/rabbitmqConnection.js` (default: 5)
- Scale worker containers: `docker-compose up -d --scale worker=5`
- Monitor queue depth: Check RabbitMQ Management UI at http://localhost:15672

**High memory usage:**
- Reduce prefetch count (fewer concurrent jobs per worker)
- Scale horizontally (more workers with lower prefetch)
- Add PM2 memory limits

**Jobs stuck in queue:**
- Check worker is running: `docker ps | grep worker`
- Check RabbitMQ consumers: RabbitMQ Management UI → Queues → job-queue → Consumers
- View worker logs: `docker-compose logs -f worker`

## 📁 Project Structure

```
queuecraft/
├── api/
│   ├── rest/                    # REST endpoints (job, user, login, metrics, prometheus)
│   ├── service/                 # Business logic (JobService, UserService, LoginService)
│   ├── middleware/              # Auth, rate limiting, trace ID injection
│   └── index.js                 # Express app setup
├── db/
│   ├── schema/                  # Mongoose schemas (job, user)
│   ├── model.js                 # Model loader
│   └── index.js                 # DB connection
├── job/
│   ├── index.js                 # RabbitMQ consumer with worker pool
│   ├── jobHandler.js            # Job execution logic (lease/ack)
│   └── rabbitmqConnection.js    # RabbitMQ publisher/consumer module
├── websocket/
│   ├── websocketServer.js       # Socket.IO server + Redis subscriber
│   └── jobEventBridge.js        # Redis publisher for events
├── util/
│   ├── logger.js                # Structured JSON logging with trace IDs
│   ├── metricsService.js        # Real-time metrics (Redis-backed)
│   ├── prometheusExporter.js    # Prometheus format exporter
│   ├── jwtUtils.js              # JWT helpers
│   └── cacheUtils.js            # Redis caching
├── frontend/                    # React dashboard
│   ├── src/
│   │   ├── components/          # StatusBadge, JobTable, DLQTable, etc.
│   │   ├── pages/               # Dashboard, DLQViewer, JobDetails, Login
│   │   ├── services/            # API clients
│   │   ├── hooks/               # useWebSocket, usePolling, useJobs
│   │   └── context/             # AuthContext
│   └── vite.config.js
├── test/unit/                   # Unit tests (23 passing)
├── config/                      # Configuration files
├── docker-compose.yml           # Production Docker setup
├── docker-compose.prometheus.yml # With Prometheus + Grafana
├── prometheus.yml               # Prometheus configuration
├── appServer.js                 # API server entry point
└── jobServer.js                 # Job processor entry point
```

## 📊 Performance & Configuration

### Job Processing
- **Job Processing Time:** ~10 seconds per job (configurable in `jobHandler.js`)
- **Concurrency per Worker:** 5 jobs (configurable via RabbitMQ `prefetch` in `rabbitmqConnection.js`)
- **Horizontal Scaling:** Unlimited workers via `docker-compose up -d --scale worker=N`
- **Queue Type:** Durable (messages survive RabbitMQ restart)
- **Message Persistence:** Enabled (jobs not lost on broker crash)

### Rate Limits
- **Time-based:** 10 requests/minute per user
- **Concurrent Jobs:** 5 active jobs per user max
- **Enforcement:** Two-layer (middleware + service layer)

### Retry & Failure Handling
- **Max Retries:** 3 attempts
- **Retry Delays:** 5s, 10s, 20s (exponential backoff)
- **DLQ:** Automatic after max retries exceeded
- **Worker Crash:** Unacked messages automatically requeue

### Real-time & Caching
- **WebSocket Latency:** < 100ms for real-time updates
- **Cache TTL:** Job lists (60s), Active counts (30s), Individual jobs (5min)
- **Metrics Retention:** 24 hours in Redis

### RabbitMQ Configuration
Edit `config/configs/rabbitmq.json`:
```json
{
  "url": "amqp://queuecraft:queuecraft@rabbitmq:5672",
  "reconnectDelay": 5000,
  "maxRetries": 3,
  "retryDelayBase": 5000
}
```

Adjust concurrency in `job/rabbitmqConnection.js`:
```javascript
const concurrency = config.get('job.concurrency') || 5;
await this.channel.prefetch(concurrency);
```

## 🎯 Design Trade-offs

### 1. RabbitMQ vs Redis/Kafka for Job Queue
**Chose RabbitMQ:**
- **Pros:** Native lease + ack + retry semantics, built-in DLQ, message durability, automatic requeue on worker crash
- **Cons:** Additional service to manage, slightly more complex than Redis
- **Trade-off:** Robust message queue semantics over simplicity. RabbitMQ provides proper job queue guarantees with lease + ack + retry

### 2. MongoDB vs PostgreSQL for Persistence
**Chose MongoDB:**
- **Pros:** Flexible schema, fast writes, easy to scale horizontally, JSON-native
- **Cons:** No built-in joins, eventual consistency options less mature than SQL
- **Trade-off:** Schema flexibility and horizontal scaling over relational integrity

### 3. Real-time Updates: WebSocket vs Polling
**Chose WebSocket (Socket.IO) + Redis Pub/Sub:**
- **Pros:** True real-time updates, low latency (<100ms), efficient (no repeated requests)
- **Cons:** More complex than polling, requires persistent connections, harder to debug
- **Trade-off:** Better UX and efficiency over simplicity

### 4. Two-Layer Rate Limiting vs Single Layer
**Chose Two Layers (Time-based + Concurrent):**
- **Pros:** Comprehensive protection against both spam and resource exhaustion
- **Cons:** More complex logic, two potential failure points
- **Trade-off:** Robust protection over simplicity

### 5. Stateless Workers vs Stateful Workers
**Chose Stateless (Jobs in RabbitMQ + MongoDB, not memory):**
- **Pros:** Easy to scale/restart, no data loss on crashes, simple auto-scaling, workers can be killed safely
- **Cons:** Slightly higher latency (RabbitMQ + DB network calls), requires external state store
- **Trade-off:** Scalability and resilience over marginal performance gains

### 6. JWT vs Session-based Authentication
**Chose JWT:**
- **Pros:** Stateless, no server-side session storage, works across distributed systems
- **Cons:** Cannot revoke tokens before expiry, larger payload than session IDs
- **Trade-off:** Scalability over fine-grained session control

### 7. Structured JSON Logging vs Plain Text
**Chose JSON with Trace IDs:**
- **Pros:** Machine-parseable, easy integration with log aggregators (ELK, Datadog)
- **Cons:** Less human-readable in raw form, slightly larger log size
- **Trade-off:** Tooling integration and searchability over readability

### 8. Redis Role: Queue + Cache vs Cache Only
**Chose Cache Only (with RabbitMQ as Queue):**
- **Pros:** Separation of concerns, Redis optimized for caching, RabbitMQ optimized for queuing
- **Cons:** One additional service to manage
- **Trade-off:** Using right tool for the job over minimizing service count

### Summary
The system prioritizes **correctness, scalability, and resilience** while using industry-standard patterns (RabbitMQ for queuing, Redis for caching). The architecture provides proper lease + ack + retry semantics for reliable job processing.

## 🔄 Auto-Scaling Workers (Design Overview)

### Current State
The system uses a **fixed worker pool** (configurable via `prefetch` in RabbitMQ, default: 5 concurrent jobs per worker). This is simple, predictable, and suitable for consistent workloads.

### How Auto-Scaling Would Work

**Scaling Triggers:**
1. **Queue Depth-Based (Recommended):** Monitor pending jobs in RabbitMQ queue
   - Scale up when queue > 20 jobs, scale down when < 5 jobs
   - Simple to implement and understand

2. **Worker Utilization-Based:** Monitor percentage of busy workers
   - Scale up when >80% busy, scale down when <20% busy
   - Better adapts to varying job durations

3. **Job Wait Time-Based:** Monitor how long jobs wait before processing
   - Scale up when wait time exceeds threshold (e.g., 30 seconds)
   - Most user-centric, but reactive


### Fixed vs Auto-Scaling Comparison

| Aspect | Fixed Pool (Current) | Auto-Scaling |
|--------|---------------------|--------------|
| **Complexity** | Simple, easy to debug | Requires monitoring infrastructure |
| **Cost** | Pays for idle capacity | Only pay for what you use |
| **Stability** | Very stable | Risk of thrashing if not tuned |
| **Best For** | Consistent traffic patterns | Variable traffic (>3x variance) |

### Implementation Considerations

**1. Scaling Metrics Comparison:**
- **Queue Depth:** Simplest to implement, but doesn't account for job complexity
- **Worker Utilization:** More accurate, but requires worker instrumentation
- **Job Wait Time:** User-focused, but reactive (problems already occurring)
- **Composite:** Most robust, but complex to tune

**2. Thrashing Prevention:**
- Use cooldown periods (1-5 minutes) between scaling decisions
- Implement stabilization windows to avoid rapid up/down cycles
- Set min/max worker bounds (e.g., 2-20 workers)

**3. State Management:**
- Current implementation is **stateless** ✅ (jobs in RabbitMQ queue + MongoDB, not worker memory)
- Workers can be safely killed/started without data loss
- Unacked messages automatically requeue when worker crashes
- This makes QueueCraft ideal for auto-scaling

**4. Scaling Speed:**
- Container startup time: 5-30 seconds depending on platform
- Always maintain minimum workers to handle burst traffic
- Consider pre-warming strategies for predictable peaks

**5. Cost Implications:**
- Fixed pool: Simple cost prediction (N workers × $X/hour)
- Auto-scaling: Variable costs, but potential 30-50% savings for variable workloads
- Factor in orchestration platform costs (K8s cluster, monitoring tools)

### Monitoring Requirements

Key metrics to track if implementing auto-scaling:
- Scaling events frequency and timing
- Queue depth at time of scaling
- Worker count over time
- Cost per job processed
- Scaling latency (decision to new worker ready)

### Current Manual Scaling

Until auto-scaling is implemented, scale manually based on traffic patterns:
- Kubernetes: `kubectl scale deployment queuecraft-worker --replicas=10`
- Docker Compose: `docker-compose up -d --scale worker=10`
- Docker Swarm: `docker service scale queuecraft-worker=10`

### Recommendation

Start with **fixed pool** for initial deployment. Consider auto-scaling when:
1. Traffic varies significantly (>3x) throughout the day/week
2. Cost optimization becomes a priority
3. You have monitoring infrastructure in place
4. Team has operational bandwidth to manage complexity

## 👨‍💻 Author

**Swastik Thapa**
- GitHub: [@swstk125](https://github.com/swstk125)

## 📄 License

ISC License

---

**Status:** ✅ Production Ready | RabbitMQ Queue | Lease+Ack+Retry | Real-time WebSocket | 23 Tests Passing | Docker Ready
