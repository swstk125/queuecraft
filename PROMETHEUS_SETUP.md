# Prometheus Integration for QueueCraft

This guide explains how to set up Prometheus monitoring for QueueCraft to visualize and alert on job queue metrics.

## Table of Contents

- [Overview](#overview)
- [Quick Start with Docker](#quick-start-with-docker)
- [Manual Setup](#manual-setup)
- [Available Metrics](#available-metrics)
- [Grafana Dashboards](#grafana-dashboards)
- [Alerting Rules](#alerting-rules)
- [Troubleshooting](#troubleshooting)

## Overview

QueueCraft exposes metrics in Prometheus format at `/prometheus/metrics`. This endpoint is **public** (no authentication required) to allow the Prometheus scraper to collect metrics.

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  QueueCraft │ scrape  │  Prometheus  │ query   │   Grafana   │
│   API:2000  │────────>│   :9090      │<────────│   :3001     │
│             │         │              │         │             │
│ /prometheus │         │  Time Series │         │ Dashboards  │
│  /metrics   │         │   Database   │         │   & Alerts  │
└─────────────┘         └──────────────┘         └─────────────┘
```

## Quick Start with Docker

The easiest way to run QueueCraft with Prometheus and Grafana:

```bash
# Start all services (QueueCraft + Prometheus + Grafana)
docker-compose -f docker-compose.prometheus.yml up -d

# Access the services:
# - QueueCraft API: http://localhost:2000
# - Prometheus UI: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
```

**Services included:**
- QueueCraft API (port 2000)
- QueueCraft Worker
- MongoDB
- Redis
- Prometheus (port 9090)
- Grafana (port 3001)

## Manual Setup

### 1. Start QueueCraft

Make sure QueueCraft is running:

```bash
# Start API server
node appServer.js

# Start worker (in another terminal)
node jobServer.js
```

### 2. Install Prometheus

**macOS:**
```bash
brew install prometheus
```

**Linux:**
```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

**Docker:**
```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 3. Configure Prometheus

Use the provided `prometheus.yml` configuration file:

```yaml
scrape_configs:
  - job_name: 'queuecraft-api'
    metrics_path: '/prometheus/metrics'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:2000']
        labels:
          service: 'queuecraft'
          environment: 'production'
```

### 4. Start Prometheus

```bash
# With config file
prometheus --config.file=prometheus.yml

# Or with Docker
docker run -d -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 5. Verify Metrics

Check that Prometheus is scraping metrics:

1. Open Prometheus UI: http://localhost:9090
2. Go to Status → Targets
3. Verify `queuecraft-api` target is **UP**
4. Try a query: `queuecraft_jobs_total`

## Available Metrics

### Counter Metrics (always increasing)

| Metric | Description |
|--------|-------------|
| `queuecraft_jobs_total` | Total number of jobs submitted |
| `queuecraft_jobs_submitted_total` | Total jobs submitted (cumulative) |
| `queuecraft_jobs_completed_total` | Total jobs completed successfully |
| `queuecraft_jobs_failed_total` | Total jobs failed |
| `queuecraft_jobs_retries_total` | Total job retry attempts |
| `queuecraft_rate_limit_hits_total` | Total rate limit violations |

### Gauge Metrics (current state)

| Metric | Description |
|--------|-------------|
| `queuecraft_jobs_pending` | Current number of pending jobs |
| `queuecraft_jobs_running` | Current number of running jobs |
| `queuecraft_jobs_active` | Current active jobs (pending + running) |
| `queuecraft_jobs_dlq` | Current jobs in Dead Letter Queue |
| `queuecraft_jobs_success_rate` | Job success rate percentage (0-100) |
| `queuecraft_jobs_failure_rate` | Job failure rate percentage (0-100) |

### Example Queries

**Total jobs processed:**
```promql
queuecraft_jobs_total
```

**Current job processing rate (jobs/sec):**
```promql
rate(queuecraft_jobs_completed_total[5m])
```

**Success rate over time:**
```promql
queuecraft_jobs_success_rate
```

**Jobs in each state:**
```promql
queuecraft_jobs_pending
queuecraft_jobs_running
queuecraft_jobs_completed_total
```

**Failed jobs rate:**
```promql
rate(queuecraft_jobs_failed_total[5m])
```

## Grafana Dashboards

### Install Grafana

**macOS:**
```bash
brew install grafana
brew services start grafana
```

**Docker:**
```bash
docker run -d \
  --name grafana \
  -p 3001:3000 \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  grafana/grafana
```

### Configure Grafana

1. **Open Grafana:** http://localhost:3001 (default: admin/admin)

2. **Add Prometheus Data Source:**
   - Go to Configuration → Data Sources
   - Click "Add data source"
   - Select "Prometheus"
   - URL: `http://localhost:9090` (or `http://prometheus:9090` in Docker)
   - Click "Save & Test"

3. **Create Dashboard:**

#### Example Dashboard Panels

**Total Jobs:**
```promql
queuecraft_jobs_total
```

**Job Processing Rate:**
```promql
rate(queuecraft_jobs_completed_total[5m])
```

**Success/Failure Rates:**
```promql
queuecraft_jobs_success_rate
queuecraft_jobs_failure_rate
```

**Active Jobs Breakdown:**
```promql
queuecraft_jobs_pending
queuecraft_jobs_running
```

**DLQ Growth:**
```promql
queuecraft_jobs_dlq
```

### Import Pre-built Dashboard

A pre-built Grafana dashboard JSON will be available in `grafana/dashboards/queuecraft.json` (coming soon).

## Alerting Rules

Create alerting rules in Prometheus to get notified of issues.

### Example Alert Rules

Create `alerts.yml`:

```yaml
groups:
  - name: queuecraft_alerts
    interval: 30s
    rules:
      # High failure rate
      - alert: HighJobFailureRate
        expr: queuecraft_jobs_failure_rate > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High job failure rate detected"
          description: "Job failure rate is {{ $value }}% (threshold: 10%)"
      
      # DLQ growing rapidly
      - alert: DLQGrowing
        expr: queuecraft_jobs_dlq > 100
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Dead Letter Queue is growing"
          description: "{{ $value }} jobs in DLQ (threshold: 100)"
      
      # Too many pending jobs
      - alert: HighPendingJobs
        expr: queuecraft_jobs_pending > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High number of pending jobs"
          description: "{{ $value }} jobs pending (threshold: 1000)"
      
      # Rate limit issues
      - alert: HighRateLimitHits
        expr: rate(queuecraft_rate_limit_hits_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate limit violations"
          description: "Rate limit hit {{ $value }} times/sec"
      
      # No jobs completed (system might be down)
      - alert: NoJobsCompleted
        expr: rate(queuecraft_jobs_completed_total[10m]) == 0
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "No jobs completed recently"
          description: "No jobs have completed in the last 15 minutes"
```

Update `prometheus.yml`:

```yaml
rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

## Troubleshooting

### Metrics endpoint returns 404

**Check the endpoint:**
```bash
curl http://localhost:2000/prometheus/metrics
```

**Verify API is running:**
```bash
curl http://localhost:2000/sync
```

### Prometheus shows target as DOWN

**Check Prometheus logs:**
```bash
docker logs queuecraft-prometheus
```

**Common issues:**
- Wrong URL in `prometheus.yml`
- Firewall blocking port 2000
- API server not running

### No data in Grafana

**Verify Prometheus is scraping:**
1. Open Prometheus: http://localhost:9090
2. Go to Status → Targets
3. Check if `queuecraft-api` is UP

**Test query in Prometheus:**
```promql
queuecraft_jobs_total
```

### Metrics are stale

Redis might have cleared the metrics (24-hour TTL). Wait for new jobs to be processed.

## Best Practices

1. **Scrape Interval:** 15 seconds is good for real-time monitoring
2. **Retention:** Configure Prometheus retention based on your needs
3. **Alerting:** Set up Alertmanager for notifications (email, Slack, PagerDuty)
4. **Labels:** Use custom labels for multi-instance deployments
5. **Dashboards:** Create separate dashboards for different stakeholders

## Advanced Configuration

### Multi-Instance Setup

If running multiple QueueCraft instances:

```yaml
scrape_configs:
  - job_name: 'queuecraft-cluster'
    metrics_path: '/prometheus/metrics'
    static_configs:
      - targets:
        - 'queuecraft-1:2000'
        - 'queuecraft-2:2000'
        - 'queuecraft-3:2000'
        labels:
          cluster: 'production'
```

### Custom Labels

Add custom labels via query parameters:

```yaml
scrape_configs:
  - job_name: 'queuecraft-api'
    metrics_path: '/prometheus/metrics'
    params:
      environment: ['production']
      instance: ['api-1']
    static_configs:
      - targets: ['localhost:2000']
```

### Service Discovery

For dynamic environments (Kubernetes, Docker Swarm):

```yaml
scrape_configs:
  - job_name: 'queuecraft-k8s'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: queuecraft
        action: keep
```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [QueueCraft Observability Guide](./OBSERVABILITY.md)

## Next Steps

1. ✅ Set up Prometheus scraping
2. ✅ Create Grafana dashboards
3. ✅ Configure alert rules
4. ⏳ Set up Alertmanager
5. ⏳ Create custom recording rules
6. ⏳ Export Grafana dashboard JSON

For questions or issues, see [OBSERVABILITY.md](./OBSERVABILITY.md) or open an issue on GitHub.

