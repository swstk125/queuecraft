# Observability Features

This document describes the comprehensive observability features implemented in QueueCraft.

## Overview

QueueCraft now includes structured logging with trace IDs and a metrics system for monitoring job queue performance. All major events are logged with relevant context for debugging and monitoring.

## Features

### 1. Structured Logging with Trace IDs

#### What is Structured Logging?
All log entries are formatted as JSON with consistent fields, making them easy to parse, search, and analyze with log aggregation tools like ELK, Splunk, or Datadog.

#### Trace ID Support
Every API request receives a unique trace ID (UUID) that is:
- Generated automatically for each request
- Included in all logs related to that request
- Returned in the `X-Trace-Id` response header
- Can be passed in via `X-Trace-Id` request header for distributed tracing

#### Log Levels
- **INFO**: Normal operations (job submit, start, finish)
- **WARN**: Warnings (rate limits, retries)
- **ERROR**: Errors (job failures, exceptions)
- **DEBUG**: Detailed debugging information (only in development)

#### Log Format
```json
{
  "timestamp": "2025-11-23T14:39:08.538Z",
  "level": "INFO",
  "service": "queuecraft",
  "environment": "production",
  "message": "Job submitted",
  "event": "submit",
  "jobId": "69231c8c041c89c391ca705e",
  "jobName": "Process Data",
  "jobStatus": "pending",
  "ownerId": "user-123",
  "retryCount": 0,
  "userId": "user-123",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "pid": 12345
}
```

### 2. Job Event Logging

All major job lifecycle events are logged:

#### Job Submission
```json
{
  "event": "submit",
  "jobId": "...",
  "jobName": "...",
  "userId": "...",
  "traceId": "..."
}
```

#### Job Start
```json
{
  "event": "start",
  "jobId": "...",
  "jobName": "...",
  "ownerId": "...",
  "jobCounter": 42
}
```

#### Job Completion
```json
{
  "event": "finish",
  "jobId": "...",
  "processingTime": "10234ms"
}
```

#### Job Failure
```json
{
  "event": "fail",
  "jobId": "...",
  "reason": "Job execution failed",
  "retryCount": 2
}
```

#### Job Retry
```json
{
  "event": "retry",
  "jobId": "...",
  "retryCount": 1,
  "maxRetries": 3,
  "reason": "Job execution failed"
}
```

#### Job Moved to DLQ
```json
{
  "event": "dlq",
  "jobId": "...",
  "reason": "Max retries exceeded",
  "maxRetries": 3
}
```

### 3. Metrics System

QueueCraft exposes real-time metrics for monitoring system health and performance.

#### Available Metrics

| Metric | Description |
|--------|-------------|
| `jobs:total` | Total number of jobs submitted |
| `jobs:submitted` | Total jobs submitted (cumulative) |
| `jobs:pending` | Current number of pending jobs |
| `jobs:running` | Current number of running jobs |
| `jobs:completed` | Total completed jobs |
| `jobs:failed` | Total failed jobs |
| `jobs:retries` | Total retry attempts |
| `jobs:dlq` | Total jobs moved to DLQ |
| `jobs:active` | Current active jobs (pending + running) |
| `jobs:success_rate` | Success rate percentage |
| `jobs:failure_rate` | Failure rate percentage |
| `rate_limit:hits` | Number of rate limit hits |

#### Metrics API Endpoint

**GET /metrics**

Returns all system metrics:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/metrics
```

Response:
```json
{
  "success": true,
  "timestamp": "2025-11-23T14:39:08.538Z",
  "metrics": {
    "jobs:total": 1245,
    "jobs:submitted": 1245,
    "jobs:pending": 23,
    "jobs:running": 5,
    "jobs:completed": 1150,
    "jobs:failed": 67,
    "jobs:retries": 124,
    "jobs:dlq": 12,
    "jobs:active": 28,
    "jobs:success_rate": "92.37",
    "jobs:failure_rate": "5.38",
    "rate_limit:hits": 45
  }
}
```

**POST /metrics/reset**

Reset all metrics (for testing):

```bash
curl -X POST -H "Authorization: Bearer <token>" http://localhost:8080/metrics/reset
```

### 4. API Request Logging

All API requests and responses are automatically logged with:
- Request method and path
- User ID (if authenticated)
- Trace ID
- Response status code
- Request duration

Example:
```json
// Request
{
  "level": "INFO",
  "message": "API Request",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/job/create",
  "userId": "user-123",
  "ip": "127.0.0.1"
}

// Response
{
  "level": "INFO",
  "message": "API Response",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/job/create",
  "statusCode": 201,
  "duration": "45ms",
  "userId": "user-123"
}
```

## Usage

### Using Trace IDs

#### Client-side
You can pass your own trace ID for distributed tracing:

```bash
curl -H "X-Trace-Id: my-trace-id-123" \
     -H "Authorization: Bearer <token>" \
     http://localhost:8080/job/create
```

The same trace ID will be included in all logs for that request.

#### Response Headers
Every API response includes the trace ID in headers:

```
X-Trace-Id: 550e8400-e29b-41d4-a716-446655440000
```

### Searching Logs

Since all logs are structured JSON, you can easily filter them:

#### Find all logs for a specific job
```bash
grep "jobId.*abc123" logs.json | jq .
```

#### Find all logs for a specific trace
```bash
grep "traceId.*550e8400" logs.json | jq .
```

#### Find all failed jobs
```bash
grep "event.*fail" logs.json | jq .
```

#### Find all rate limit errors
```bash
grep "rate limit" logs.json | jq .
```

### Monitoring with Metrics

#### Dashboard Setup
You can build a monitoring dashboard by polling the metrics endpoint:

```javascript
// Example: Fetch metrics every 30 seconds
setInterval(async () => {
  const response = await fetch('http://localhost:8080/metrics', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  updateDashboard(data.metrics);
}, 30000);
```

#### Alert Rules Examples

**High Failure Rate**
```javascript
if (parseFloat(metrics['jobs:failure_rate']) > 10) {
  alert('Job failure rate is above 10%!');
}
```

**DLQ Growing**
```javascript
if (metrics['jobs:dlq'] > 100) {
  alert('Dead Letter Queue has over 100 jobs!');
}
```

**Rate Limit Issues**
```javascript
if (metrics['rate_limit:hits'] > 1000) {
  alert('High rate limit hit count detected!');
}
```

## Integration with Monitoring Tools

### ELK Stack (Elasticsearch, Logstash, Kibana)

1. Configure Logstash to parse JSON logs
2. Create Kibana dashboards with filters on:
   - `jobId`
   - `traceId`
   - `userId`
   - `event`
   - `level`

### Datadog / New Relic

1. Configure log forwarding
2. Set up custom metrics based on log patterns
3. Create alerts based on error rates

### Prometheus

You can create a Prometheus exporter that polls the `/metrics` endpoint and exposes the data in Prometheus format.

## Logger API Reference

### Using the Logger in Code

```javascript
const logger = require('./util/logger');

// Info logging
logger.info('User logged in', { 
  userId: 'user-123',
  traceId: req.traceId 
});

// Error logging
logger.error('Database connection failed', error, { 
  database: 'primary',
  traceId: req.traceId 
});

// Warning logging
logger.warn('Cache miss', { 
  key: 'user:123',
  traceId: req.traceId 
});

// Debug logging (only in development)
logger.debug('Cache hit', { 
  key: 'user:123',
  value: data 
});

// Job event logging
logger.logJobEvent('submit', job, { 
  userId: 'user-123',
  traceId: req.traceId 
});
```

## Metrics Service API Reference

### Using Metrics in Code

```javascript
const metricsService = require('./util/metricsService');

// Record job submission
await metricsService.recordJobSubmitted();

// Record job start
await metricsService.recordJobStarted();

// Record job completion
await metricsService.recordJobCompleted();

// Record job failure
await metricsService.recordJobFailed();

// Record job retry
await metricsService.recordJobRetry();

// Record job moved to DLQ
await metricsService.recordJobDLQ();

// Record rate limit hit
await metricsService.recordRateLimitHit();

// Record processing time
await metricsService.recordJobProcessingTime(jobId, durationMs);

// Get all metrics
const metrics = await metricsService.getAllMetrics();

// Get specific metric
const total = await metricsService.getMetric('jobs:total');
```

## Best Practices

1. **Always include trace IDs**: Pass trace IDs from client to server for end-to-end tracing
2. **Use structured context**: Include relevant context (userId, jobId, etc.) in logs
3. **Monitor metrics regularly**: Set up dashboards to track key metrics
4. **Set up alerts**: Configure alerts for critical thresholds
5. **Aggregate logs centrally**: Use a log aggregation service for production
6. **Keep metrics retention reasonable**: Old metrics can be archived or aggregated

## Performance Considerations

- Structured logging has minimal overhead (<1ms per log entry)
- Metrics are stored in Redis with TTL (24 hours by default)
- Trace middleware adds ~1ms latency per request
- Debug logs are automatically disabled in production

## Environment Variables

Configure observability features via environment variables:

```bash
# Service name for logs
SERVICE_NAME=queuecraft

# Environment (affects debug logging)
NODE_ENV=production

# Log level (not implemented yet, but recommended)
LOG_LEVEL=info
```

## Troubleshooting

### No logs appearing
- Check that you're not filtering out JSON logs
- Verify environment is set correctly
- Check stdout/stderr redirection

### Metrics not updating
- Verify Redis connection is working
- Check that metrics TTL hasn't expired
- Ensure metrics service is properly initialized

### Trace IDs not appearing
- Verify trace middleware is installed
- Check middleware order in Express
- Ensure X-Trace-Id header is being set

## Future Enhancements

- [ ] OpenTelemetry integration
- [ ] Prometheus exporter
- [ ] Grafana dashboard templates
- [ ] Custom metric aggregations
- [ ] Log sampling for high-volume environments
- [ ] Performance profiling
- [ ] Distributed tracing spans

