#!/bin/bash

###############################################################################
# Test Prometheus Metrics Endpoint
# 
# This script tests the Prometheus metrics endpoint to verify it's working
###############################################################################

set -e

BASE_URL="http://localhost:2000"
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}🔍 Testing Prometheus Metrics Endpoint${NC}\n"

# Test 1: Check if endpoint is accessible
echo -e "${BLUE}Test 1: Checking Prometheus endpoint accessibility${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/prometheus/metrics)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Endpoint is accessible (HTTP 200)${NC}\n"
else
    echo -e "${RED}❌ Endpoint returned HTTP $HTTP_CODE${NC}\n"
    exit 1
fi

# Test 2: Verify Prometheus format
echo -e "${BLUE}Test 2: Verifying Prometheus text format${NC}"
if echo "$BODY" | grep -q "# HELP"; then
    echo -e "${GREEN}✅ Response contains Prometheus HELP comments${NC}"
else
    echo -e "${RED}❌ Missing Prometheus HELP comments${NC}"
fi

if echo "$BODY" | grep -q "# TYPE"; then
    echo -e "${GREEN}✅ Response contains Prometheus TYPE declarations${NC}"
else
    echo -e "${RED}❌ Missing Prometheus TYPE declarations${NC}"
fi
echo ""

# Test 3: Check for expected metrics
echo -e "${BLUE}Test 3: Checking for expected metrics${NC}"

EXPECTED_METRICS=(
    "queuecraft_jobs_total"
    "queuecraft_jobs_pending"
    "queuecraft_jobs_running"
    "queuecraft_jobs_completed_total"
    "queuecraft_jobs_failed_total"
    "queuecraft_jobs_success_rate"
    "queuecraft_jobs_dlq"
    "queuecraft_rate_limit_hits_total"
)

for metric in "${EXPECTED_METRICS[@]}"; do
    if echo "$BODY" | grep -q "$metric"; then
        echo -e "${GREEN}✅ Found: $metric${NC}"
    else
        echo -e "${YELLOW}⚠️  Missing: $metric${NC}"
    fi
done
echo ""

# Test 4: Display sample metrics
echo -e "${BLUE}Test 4: Sample metrics output${NC}"
echo -e "${YELLOW}First 20 lines of metrics:${NC}"
echo "$BODY" | head -20
echo ""

# Test 5: Check health endpoint
echo -e "${BLUE}Test 5: Testing health endpoint${NC}"
HEALTH=$(curl -s $BASE_URL/prometheus/health)
if echo "$HEALTH" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "$HEALTH" | jq .
else
    echo -e "${RED}❌ Health check failed${NC}"
fi
echo ""

# Test 6: Test with custom labels
echo -e "${BLUE}Test 6: Testing with custom labels${NC}"
CUSTOM_RESPONSE=$(curl -s "$BASE_URL/prometheus/metrics?environment=test&instance=api-1")
if echo "$CUSTOM_RESPONSE" | grep -q "environment=\"test\""; then
    echo -e "${GREEN}✅ Custom labels working${NC}"
else
    echo -e "${YELLOW}⚠️  Custom labels not found (might not be implemented)${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Summary:${NC}"
echo -e "Prometheus endpoint: ${GREEN}http://localhost:2000/prometheus/metrics${NC}"
echo -e "Health endpoint: ${GREEN}http://localhost:2000/prometheus/health${NC}"
echo -e ""
echo -e "Next steps:"
echo -e "1. Configure Prometheus to scrape this endpoint"
echo -e "2. Update prometheus.yml with the target"
echo -e "3. Start Prometheus: ${YELLOW}prometheus --config.file=prometheus.yml${NC}"
echo -e "4. View metrics: ${YELLOW}http://localhost:9090${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

