#!/bin/bash

###############################################################################
# QueueCraft Observability Demo
# 
# This script demonstrates the observability features:
# 1. Structured logging with trace IDs
# 2. Job event logging
# 3. Metrics tracking
# 4. Request/response logging
###############################################################################

set -e

BASE_URL="http://localhost:2000"
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed. Please install jq first."
    exit 1
fi

echo -e "${BOLD}🔍 QueueCraft Observability Demo${NC}\n"

# Step 1: Login and get token
echo -e "${BLUE}Step 1: Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.jwt')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Make sure you have created a user first."
    echo "Run: curl -X POST $BASE_URL/user/create -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"admin123\"}'"
    exit 1
fi

echo -e "✅ Logged in successfully\n"

# Step 2: Create jobs with custom trace ID
echo -e "${BLUE}Step 2: Creating jobs with trace IDs${NC}"
TRACE_ID="demo-trace-$(date +%s)"

echo "Using trace ID: $TRACE_ID"
echo ""

for i in {1..3}; do
    echo -e "${YELLOW}Creating Job $i...${NC}"
    RESPONSE=$(curl -s -X POST $BASE_URL/job/create \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -H "X-Trace-Id: $TRACE_ID-job-$i" \
      -d "{\"name\":\"Demo Job $i\"}")
    
    JOB_ID=$(echo $RESPONSE | jq -r '.job._id')
    echo "  ✅ Job created: $JOB_ID"
    echo "  📝 Trace ID: $TRACE_ID-job-$i"
    echo ""
done

# Step 3: View metrics
echo -e "${BLUE}Step 3: Fetching system metrics${NC}"
METRICS=$(curl -s -X GET $BASE_URL/metrics \
  -H "Authorization: Bearer $TOKEN")

echo "$METRICS" | jq '.metrics'
echo ""

# Step 4: Display key metrics
echo -e "${BLUE}Step 4: Key Metrics Summary${NC}"
echo -e "${GREEN}Total Jobs:${NC}        $(echo $METRICS | jq -r '.metrics["jobs:total"]')"
echo -e "${GREEN}Pending:${NC}           $(echo $METRICS | jq -r '.metrics["jobs:pending"]')"
echo -e "${GREEN}Running:${NC}           $(echo $METRICS | jq -r '.metrics["jobs:running"]')"
echo -e "${GREEN}Completed:${NC}         $(echo $METRICS | jq -r '.metrics["jobs:completed"]')"
echo -e "${GREEN}Failed:${NC}            $(echo $METRICS | jq -r '.metrics["jobs:failed"]')"
echo -e "${GREEN}Success Rate:${NC}      $(echo $METRICS | jq -r '.metrics["jobs:success_rate"]')%"
echo -e "${GREEN}Failure Rate:${NC}      $(echo $METRICS | jq -r '.metrics["jobs:failure_rate"]')%"
echo ""

# Step 5: Demonstrate rate limiting
echo -e "${BLUE}Step 5: Testing rate limiting (with observability)${NC}"
echo "Creating 6 jobs rapidly to trigger rate limit..."
echo ""

for i in {1..6}; do
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST $BASE_URL/job/create \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -H "X-Trace-Id: rate-limit-test-$i" \
      -d "{\"name\":\"Rate Limit Test $i\"}")
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
    BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")
    
    if [ "$HTTP_CODE" == "429" ]; then
        echo -e "${YELLOW}  ⚠️  Job $i: Rate limit exceeded (HTTP 429)${NC}"
        TRACE_ID_RESP=$(echo "$BODY" | jq -r '.traceId')
        echo "      Trace ID: $TRACE_ID_RESP (check logs for details)"
    else
        JOB_ID=$(echo "$BODY" | jq -r '.job._id')
        echo -e "${GREEN}  ✅ Job $i: Created successfully ($JOB_ID)${NC}"
    fi
done
echo ""

# Step 6: Instructions for viewing logs
echo -e "${BLUE}Step 6: How to search logs${NC}"
echo ""
echo "Search logs by trace ID:"
echo -e "${YELLOW}  grep \"$TRACE_ID\" <log-file> | jq .${NC}"
echo ""
echo "Search logs by job event:"
echo -e "${YELLOW}  grep '\"event\":\"submit\"' <log-file> | jq .${NC}"
echo -e "${YELLOW}  grep '\"event\":\"start\"' <log-file> | jq .${NC}"
echo -e "${YELLOW}  grep '\"event\":\"finish\"' <log-file> | jq .${NC}"
echo ""
echo "Search logs by log level:"
echo -e "${YELLOW}  grep '\"level\":\"ERROR\"' <log-file> | jq .${NC}"
echo -e "${YELLOW}  grep '\"level\":\"WARN\"' <log-file> | jq .${NC}"
echo ""

# Step 7: Watch metrics in real-time
echo -e "${BLUE}Step 7: Watch metrics in real-time${NC}"
echo ""
echo "To monitor metrics continuously, run:"
echo -e "${YELLOW}  watch -n 5 'curl -s -H \"Authorization: Bearer $TOKEN\" $BASE_URL/metrics | jq .metrics'${NC}"
echo ""
echo "Or use this one-liner:"
echo -e "${YELLOW}  while true; do clear; curl -s -H \"Authorization: Bearer $TOKEN\" $BASE_URL/metrics | jq .metrics; sleep 5; done${NC}"
echo ""

echo -e "${GREEN}✅ Observability demo complete!${NC}"
echo ""
echo "📖 For more information, see OBSERVABILITY.md"

