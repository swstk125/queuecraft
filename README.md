# QueueCraft - Distributed Job Queue System

A production-ready job queue system with real-time monitoring, comprehensive observability, and a modern React dashboard.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Tests](https://img.shields.io/badge/tests-23%20passing-success)
![Coverage](https://img.shields.io/badge/coverage-high-brightgreen)

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#️-architecture)
- [API Documentation](#-api-documentation)
- [Observability & Monitoring](#-observability--monitoring)
- [Rate Limiting](#-rate-limiting)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)

## ✨ Features

### Core Features
- ✅ **Distributed Job Queue**: Redis-backed processing with configurable workers (default: 5)
- ✅ **Real-time Updates**: WebSocket (Socket.IO) + Redis Pub/Sub for live status changes
- ✅ **Automatic Retries**: Up to 3 attempts with exponential backoff before moving to DLQ
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

# Start all services (MongoDB, Redis, API, Worker, Frontend)
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

**Prerequisites:** Node.js 18+, MongoDB, Redis

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start infrastructure (if using Docker)
docker-compose up -d mongodb redis

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

# Access dashboard at http://localhost:3000
```

## 🏗️ Architecture

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
└─────┬───────────────────────────────┬───────────┘
      │                               │
      ↓                               ↓
┌──────────────┐            ┌─────────────────────┐
│   MongoDB    │            │      Redis          │
│  (Port 27017)│            │   (Port 6379)       │
│  Jobs + Users│            │  Queue + Pub/Sub    │
└──────┬───────┘            └──────┬──────────────┘
       │                           │
       └──────────┬────────────────┘
                  │
          ┌───────┴──────────┐
          │  Job Processor   │
          │  5 Workers       │
          └──────────────────┘
```

**Event Flow:**
1. Job Processor updates job status → MongoDB
2. Job Processor publishes event → Redis Pub/Sub
3. WebSocket Server receives event → Redis subscription
4. WebSocket Server emits → Connected dashboard clients
5. Dashboard UI updates automatically

**WebSocket Events:**
- `job:created` - New job submitted
- `job:status:updated` - Status changed (pending → running → completed)
- `job:completed` - Job finished successfully
- `job:movedToDLQ` - Job failed after 3 retries

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

Edit `api/middleware/rateLimitMiddleware.js`:
```javascript
const MAX_REQUESTS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
```

Edit `api/service/JobService.js`:
```javascript
const MAX_ACTIVE_JOBS_PER_USER = 5;
```

**Features:**
- User isolation (limits per user, not global)
- Only pending/running jobs count (completed/failed don't)
- Optimized with MongoDB compound indexes

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

### 4. Integration Support

Compatible with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**, **New Relic**
- **Prometheus** + **Grafana**
- **Splunk**

📖 **Detailed Documentation:**
- [OBSERVABILITY.md](./OBSERVABILITY.md) - Complete observability guide
- [PROMETHEUS_SETUP.md](./PROMETHEUS_SETUP.md) - Prometheus setup instructions

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
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
| Redis | 6379 | Queue + Pub/Sub |
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

**Docker Networking (if using Docker Compose):**
```bash
# Inside containers, use service names:
# - mongodb:27017 (not localhost:27017)
# - redis:6379 (not localhost:6379)
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
- Increase workers: Edit `MAX_WORKERS` in `job/index.js` (default: 5)
- Scale worker containers: `docker-compose up -d --scale worker=5`

**High memory usage:**
- Reduce worker pool size
- Add PM2 memory limits

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
│   ├── index.js                 # Job processor with worker pool
│   └── jobHandler.js            # Job execution logic
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
├── jobServer.js                 # Job processor entry point
└── OBSERVABILITY.md             # Detailed observability docs
```

## 📊 Performance & Configuration

- **Job Processing Time:** ~10 seconds per job (configurable in `jobHandler.js`)
- **Worker Pool Size:** 5 concurrent workers (configurable in `job/index.js`)
- **Rate Limits:**
  - Time-based: 10 requests/minute per user
  - Concurrent: 5 active jobs per user
- **Retry Strategy:** 3 attempts with exponential backoff before DLQ
- **WebSocket Latency:** < 100ms for real-time updates
- **Metrics Retention:** 24 hours in Redis

## 🎯 Key Design Decisions

**Socket.IO + Redis Pub/Sub:**
- Enables multi-process real-time communication
- Scales horizontally with multiple workers
- Decouples job processor from API server

**Two-Layer Rate Limiting:**
- Time-based: Prevents spam/abuse (10/min)
- Concurrent: Prevents resource overload (5 active)
- Works together for comprehensive protection

**Structured Logging with Trace IDs:**
- Every request gets unique trace ID
- Easy to track requests across services
- JSON format for easy parsing

**Prometheus Native Support:**
- Standard metrics format
- No auth required for scraping
- Ready for production monitoring

## 👨‍💻 Author

**Swastik Thapa**
- GitHub: [@swstk125](https://github.com/swstk125)

## 📄 License

ISC License

---

**Status:** ✅ Production Ready | Real-time WebSocket | 23 Tests Passing | Docker Ready | Prometheus Integrated
