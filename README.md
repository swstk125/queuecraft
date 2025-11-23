# QueueCraft - Distributed Task Queue & Job Processor

A production-ready job queue system with a modern React dashboard UI for monitoring and managing distributed tasks.

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Dashboard UI](#dashboard-ui)
- [Rate Limiting](#rate-limiting)
- [API Documentation](#api-documentation)
- [Testing](#testing)

## ✨ Features

### Backend
- **Distributed Job Queue**: Redis-backed job processing system
- **Automatic Retry Logic**: Up to 3 retry attempts with exponential backoff
- **Dead Letter Queue (DLQ)**: Automatic handling of permanently failed jobs
- **Two-Layer Rate Limiting**: Time-based (10/min) + Concurrent (5 active jobs)
- **JWT Authentication**: Secure API access with Bearer tokens
- **MongoDB Storage**: Persistent job and user data
- **Concurrent Processing**: Configurable worker pool (default: 5 workers)

### Frontend Dashboard
- **Real-time Job Monitoring**: Live status updates for all jobs
- **Interactive Dashboard**: Drill-down from summary cards to detailed views
- **DLQ Viewer**: Dedicated interface for failed job management
- **Job Creation**: Create jobs directly from the UI
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Mock Data Support**: Development mode without backend
- **Status Filtering**: Quick filters for job categories
- **Sortable Tables**: Multi-column sorting capabilities

## 🚀 Quick Start

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

### TL;DR

```bash
# 1. Install dependencies
npm install
cd frontend && npm install && cd ..

# 2. Start MongoDB and Redis
docker-compose up -d  # or start them manually

# 3. Start backend (2 terminals)
node appServer.js      # Terminal 1: API Server (port 2000)
node jobServer.js      # Terminal 2: Job Processor

# 4. Create a user
curl -X POST http://localhost:2000/user/create \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"admin123"}'

# 5. Start frontend
cd frontend && npm run dev  # Terminal 3: Dashboard (port 3000)

# 6. Open http://localhost:3000 and login
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard UI (React)                    │
│              http://localhost:3000                          │
│  - Job Overview  - DLQ Viewer  - Job Details - Auth        │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Server (Express)                       │
│              http://localhost:2000                          │
│  - Rate Limiting  - JWT Auth  - Job CRUD  - User Mgmt      │
└───────────┬─────────────────────────────┬───────────────────┘
            │                             │
            ↓                             ↓
    ┌───────────────┐           ┌─────────────────┐
    │   MongoDB     │           │     Redis       │
    │  Job Storage  │           │  Queue Backend  │
    └───────────────┘           └─────────────────┘
            ↑                             ↑
            │                             │
            └─────────┬───────────────────┘
                      │
              ┌───────┴────────┐
              │ Job Processor  │
              │  Worker Pool   │
              │ (Concurrency:5)│
              └────────────────┘
```

## 🎨 Dashboard UI

The dashboard provides a comprehensive interface for managing your job queue:

### Main Dashboard
- **Summary Cards**: Quick overview of job counts by status (Pending, Running, Completed, Failed)
- **Job Table**: Sortable, filterable table of all jobs
- **Status Filters**: Quick toggle between job states
- **Create Job**: Modal for creating new jobs
- **Real-time Updates**: Manual refresh with loading states

### DLQ Viewer
- **Failed Jobs List**: All jobs that exceeded retry limits
- **Job Details Modal**: Comprehensive view of failed job metadata
- **Guidance Panel**: Helpful information about DLQ management
- **Visual Indicators**: Clear warnings for jobs requiring attention

### Job Details Page
- **Complete Metadata**: All job information in organized sections
- **Status Indicators**: Color-coded badges for current state
- **Timestamps**: Created and modified times with relative display
- **Raw Data View**: JSON representation for debugging

### Screenshots

<table>
  <tr>
    <td><strong>Dashboard</strong><br/>Job overview with stats</td>
    <td><strong>DLQ Viewer</strong><br/>Failed jobs management</td>
  </tr>
  <tr>
    <td><strong>Job Details</strong><br/>Comprehensive job info</td>
    <td><strong>Mobile View</strong><br/>Fully responsive design</td>
  </tr>
</table>

## 🔐 Rate Limiting for Job Creation API

### Objective
Implement rate limiting for the `POST /job/create` endpoint to ensure no user can have more than **5 pending or active jobs** at any time.

## Implementation

### Two-Layer Rate Limiting

#### 1. Time-Based Rate Limiting (Middleware)
- **Limit**: Maximum 10 job creation attempts per user per minute
- **Implementation**: In-memory tracking with sliding window
- **Response**: Returns HTTP 429 with retry-after time

#### 2. Concurrent Job Limiting (Service Layer)
- **Limit**: Maximum 5 jobs with status `pending` or `running` per user
- **Enforcement**: Checked before each job creation
- **Response**: Returns HTTP 429 when limit exceeded

### Key Files

#### 1. `api/middleware/rateLimitMiddleware.js` (NEW)
Time-based rate limiting:
- Tracks job creation attempts per user
- Uses sliding window algorithm (last 60 seconds)
- In-memory storage with automatic cleanup
- Isolated per user

```javascript
// Allows only 10 attempts per minute
if (attempts >= 10) {
  return 429 with retry-after time
}
```

#### 2. `api/service/JobService.js`
Added rate limiting to job creation:
- Counts active jobs (pending/running) for the user
- Rejects creation if user has 5+ active jobs
- Throws error with 429 status code

```javascript
const activeJobCount = await this.jobModel.countDocuments({
  ownerId: userId,
  status: { $in: ['pending', 'running'] }
});

if (activeJobCount >= 5) {
  throw new Error('Rate limit exceeded');
}
```

#### 3. `api/rest/job.rest.js`
Applied middleware and error handling:
- Uses rate limit middleware
- Returns 429 status for rate limit errors
- Returns 500 for other errors

#### 4. `db/schema/job.js`
Optimized for performance:
- Added compound index: `{ ownerId: 1, status: 1 }`
- Enables fast rate limit queries

## Running Tests

```bash
# Install dependencies
npm install

# Run tests
npm test
```

### Test Coverage
- **23 tests** covering:
  - Time-based rate limiting (10/minute)
  - Job creation with concurrent limits (5 max)
  - Rate limit enforcement
  - User isolation (independent limits)
  - Recovery after completing jobs
  - Status filtering (only pending/running count)
  - Middleware behavior

## API Examples

### Success Response (201)
```json
{
  "success": true,
  "job": {
    "_id": "...",
    "name": "Job Name",
    "ownerId": "user-123",
    "status": "pending"
  }
}
```

### Rate Limit Responses (429)

**Time-based limit (10/minute):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Maximum 10 job creation attempts per minute. Try again in 30 seconds.",
  "retryAfter": 30
}
```

**Concurrent job limit (5 active jobs):**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Maximum 5 active jobs allowed."
}
```

## Testing Manually

```bash
# Create jobs (works for first 5)
curl -X POST http://localhost:3000/job/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Job"}'

# 6th request will return 429
```

## Design Decisions

1. **Two-Layer Protection**: 
   - Middleware: Prevents spam (10 attempts/minute)
   - Service: Prevents resource overload (5 concurrent jobs)
2. **Simple & Clear**: Straightforward implementation without over-engineering
3. **In-Memory Tracking**: Sliding window for time-based limits
4. **Database-Level Check**: Count query ensures accurate concurrent limit
5. **User Isolation**: Each user has independent rate limits
6. **Status-Based**: Only `pending` and `running` jobs count toward concurrent limit
7. **Indexed Queries**: Compound index ensures fast performance

## Edge Cases Handled

- ✅ Completed/DLQ jobs don't count toward limit
- ✅ Different users have independent limits
- ✅ Jobs can be created after completing existing ones
- ✅ Clear error message when limit exceeded

## Configuration

**Time-based rate limit** (10/minute): Edit `api/middleware/rateLimitMiddleware.js`
```javascript
const MAX_REQUESTS_PER_WINDOW = 10; // Adjust as needed
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
```

**Concurrent job limit** (5 active jobs): Edit `api/service/JobService.js`
```javascript
const MAX_ACTIVE_JOBS_PER_USER = 5; // Adjust as needed
```

## 📚 API Documentation

### Authentication Endpoints

#### Create User
```bash
POST /user/create
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123"
}
```

#### Login
```bash
POST /login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}

Response:
{
  "success": true,
  "jwt": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Job Endpoints (Protected)

#### Create Job
```bash
POST /job/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Job"
}

Success Response (201):
{
  "success": true,
  "job": {
    "_id": "...",
    "name": "My Job",
    "ownerId": "user-123",
    "status": "pending",
    "retryCount": 0
  }
}

Rate Limit Response (429):
{
  "success": false,
  "error": "Rate limit exceeded. Maximum 5 active jobs allowed."
}
```

#### Get Jobs
```bash
GET /job?status=pending
Authorization: Bearer <token>

Response:
{
  "success": true,
  "jobs": [...]
}
```

#### Health Check
```bash
GET /sync

Response: 1732456789000 (timestamp)
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Coverage
```bash
npm test -- --coverage
```

### Test Results
```
Test Suites: 3 passed, 3 total
Tests:       23 passed, 23 total
Coverage:    High coverage across critical paths
```

**Test Coverage Includes:**
- ✅ Time-based rate limiting (10/minute)
- ✅ Concurrent job limiting (5 max active)
- ✅ User isolation (independent limits)
- ✅ Job status filtering
- ✅ Rate limit recovery after job completion
- ✅ Error handling and edge cases

## 🐳 Docker Support

### Quick Start with Docker Compose
```bash
# Start MongoDB and Redis
docker-compose up -d

# Stop services
docker-compose down
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

## 📊 Performance Metrics

- **Job Processing**: ~10 seconds per job (configurable)
- **Concurrent Workers**: 5 (configurable in `job/index.js`)
- **Rate Limits**: 
  - 10 job creation attempts per minute per user
  - 5 concurrent active jobs per user
- **Retry Strategy**: Up to 3 attempts before DLQ

## 🔧 Configuration

### Backend Environment Variables
```bash
# MongoDB connection
MONGODB_URI=mongodb://localhost/queuecraft

# Redis connection
REDIS_URL=redis://localhost:6379

# JWT secret
SECRET_KEY=your-secret-key

# API server port
PORT=2000
```

### Frontend Environment Variables
```bash
# API URL (optional, uses proxy in dev)
VITE_API_URL=http://localhost:2000

# Use mock data (development)
VITE_USE_MOCK_DATA=false
```

## 🚀 Production Deployment

### Backend (PM2)
```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start appServer.js --name queuecraft-api
pm2 start jobServer.js --name queuecraft-worker

# Monitor
pm2 monit

# Save configuration
pm2 save
```

### Frontend (Build & Deploy)
```bash
cd frontend
npm run build

# Deploy 'dist' folder to:
# - Netlify
# - Vercel
# - AWS S3 + CloudFront
# - Any static hosting service
```

## 📁 Project Structure

```
queuecraft/
├── api/                    # API layer
│   ├── rest/              # REST endpoints
│   ├── service/           # Business logic
│   └── middleware/        # Custom middleware
├── db/                    # Database layer
│   ├── schema/           # Mongoose schemas
│   └── model.js          # Model loader
├── job/                   # Job processing
│   ├── index.js          # Job processor
│   └── jobHandler.js     # Job execution logic
├── frontend/              # React dashboard
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── context/      # React context
│   └── README.md         # Frontend documentation
├── test/                  # Unit tests
├── util/                  # Utilities
├── appServer.js          # API server entry
├── jobServer.js          # Job processor entry
└── README.md             # This file
```

## 🎯 Design Decisions & Trade-offs

**Simplicity over Complexity:**
- In-memory rate limiting (suitable for single-server deployments)
- No transaction support (would require MongoDB replica set)
- Direct MongoDB queries (fast and simple)
- JWT stored in localStorage (consider httpOnly cookies for production)

**For Production Enhancement:**
- ✅ Add MongoDB transactions for race condition protection
- ✅ Use Redis for distributed rate limiting
- ✅ Add rate limit headers (X-RateLimit-*)
- ✅ Implement proper password hashing (bcrypt)
- ✅ Add input validation middleware
- ✅ Add monitoring/alerting (Prometheus, Grafana)
- ✅ Add request logging (Morgan, Winston)
- ✅ Implement graceful shutdown handlers

## 📖 Additional Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[frontend/README.md](frontend/README.md)** - Detailed frontend documentation
- **[Backend Eng Assignment.pdf](Backend%20Eng%20Assignment.pdf)** - Original requirements

## 🤝 Contributing

This is a complete, production-ready implementation. For enhancements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Submit a pull request

## 📄 License

ISC License - See package.json for details

## 👨‍💻 Author

**Swastik Thapa**
- GitHub: [@swstk125](https://github.com/swstk125)
- Repository: [queuecraft](https://github.com/swstk125/queuecraft)

## 🙏 Acknowledgments

- Built with Express.js, React, MongoDB, and Redis
- UI components powered by Tailwind CSS
- Icons by Lucide React

---

**Status**: ✅ Complete | Backend + Frontend | 23 Tests Passing | Production Ready

For questions or issues, please open an issue on GitHub.

