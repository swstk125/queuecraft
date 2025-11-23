# QueueCraft API Examples

Comprehensive guide to using the QueueCraft API.

## Base URL

```
http://localhost:2000
```

## Authentication

QueueCraft uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### 1. Create User

Create a new user account.

**Endpoint:** `POST /user/create`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:2000/user/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "_id": "6920b670c1afd03b72e31e73",
  "username": "admin",
  "email": "admin@example.com",
  "con": "2024-03-20T10:30:00.000Z",
  "mon": "2024-03-20T10:30:00.000Z"
}
```

### 2. Login

Authenticate and receive JWT token.

**Endpoint:** `POST /login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:2000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTIwYjY3MGMxYWZkMDNiNzJlMzFlNzMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaWF0IjoxNzMyNDU2Nzg5LCJleHAiOjE3MzI1NDMxODl9.xyz..."
}
```

**Error Response:**
```json
{
  "error": "User not found"
}
```

---

## 📋 Job Endpoints (Protected)

All job endpoints require authentication. Include JWT token in Authorization header.

### 3. Create Job

Create a new job in the queue.

**Endpoint:** `POST /job/create`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Data Processing Job"
}
```

**cURL Example:**
```bash
# Save token first
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:2000/job/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Data Processing Job"}'
```

**Success Response (201):**
```json
{
  "success": true,
  "job": {
    "_id": "6920b7f8c1afd03b72e31e74",
    "name": "Data Processing Job",
    "ownerId": "6920b670c1afd03b72e31e73",
    "status": "pending",
    "retryCount": 0,
    "con": "2024-03-20T10:35:00.000Z",
    "mon": "2024-03-20T10:35:00.000Z"
  }
}
```

**Rate Limit Response (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Maximum 5 active jobs allowed."
}
```

**Time-based Rate Limit (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Maximum 10 job creation attempts per minute. Try again in 30 seconds.",
  "retryAfter": 30
}
```

### 4. Get All Jobs

Retrieve all jobs for the authenticated user.

**Endpoint:** `GET /job`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, running, completed, dlq)

**cURL Examples:**

```bash
# Get all jobs
curl -X GET http://localhost:2000/job \
  -H "Authorization: Bearer $TOKEN"

# Get pending jobs only
curl -X GET "http://localhost:2000/job?status=pending" \
  -H "Authorization: Bearer $TOKEN"

# Get DLQ jobs
curl -X GET "http://localhost:2000/job?status=dlq" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "_id": "6920b7f8c1afd03b72e31e74",
      "name": "Data Processing Job",
      "ownerId": "6920b670c1afd03b72e31e73",
      "status": "pending",
      "retryCount": 0,
      "con": "2024-03-20T10:35:00.000Z",
      "mon": "2024-03-20T10:35:00.000Z"
    },
    {
      "_id": "6920b8a1c1afd03b72e31e75",
      "name": "Email Campaign",
      "ownerId": "6920b670c1afd03b72e31e73",
      "status": "running",
      "retryCount": 0,
      "con": "2024-03-20T10:40:00.000Z",
      "mon": "2024-03-20T10:42:00.000Z"
    }
  ]
}
```

---

## 🏥 Health Check

### 5. Health Check

Check if the API server is running.

**Endpoint:** `GET /sync`

**No authentication required**

**cURL Example:**
```bash
curl -X GET http://localhost:2000/sync
```

**Response:**
```
1732456789000
```
(Returns current timestamp)

---

## 📊 Complete Workflow Example

### Bash Script
```bash
#!/bin/bash

# Base URL
BASE_URL="http://localhost:2000"

# 1. Create a user
echo "Creating user..."
curl -X POST $BASE_URL/user/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "email": "demo@example.com",
    "password": "demo123"
  }'

echo -e "\n\n"

# 2. Login and get token
echo "Logging in..."
TOKEN=$(curl -s -X POST $BASE_URL/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo123"
  }' | jq -r '.jwt')

echo "Token: $TOKEN"
echo -e "\n"

# 3. Create jobs
echo "Creating jobs..."
for i in {1..3}; do
  echo "Creating job $i..."
  curl -s -X POST $BASE_URL/job/create \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Job $i\"}" | jq '.'
  echo -e "\n"
done

# 4. Get all jobs
echo "Fetching all jobs..."
curl -s -X GET $BASE_URL/job \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n"

# 5. Get pending jobs only
echo "Fetching pending jobs..."
curl -s -X GET "$BASE_URL/job?status=pending" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Python Script
```python
import requests
import json

BASE_URL = "http://localhost:2000"

# 1. Create user
user_data = {
    "username": "demo",
    "email": "demo@example.com",
    "password": "demo123"
}

response = requests.post(f"{BASE_URL}/user/create", json=user_data)
print("User created:", response.json())

# 2. Login
login_data = {
    "email": "demo@example.com",
    "password": "demo123"
}

response = requests.post(f"{BASE_URL}/login", json=login_data)
token = response.json()["jwt"]
print(f"Token: {token}\n")

# 3. Create jobs
headers = {"Authorization": f"Bearer {token}"}

for i in range(1, 4):
    job_data = {"name": f"Job {i}"}
    response = requests.post(f"{BASE_URL}/job/create", json=job_data, headers=headers)
    print(f"Job {i} created:", response.json())

# 4. Get all jobs
response = requests.get(f"{BASE_URL}/job", headers=headers)
jobs = response.json()
print(f"\nTotal jobs: {len(jobs['jobs'])}")
print(json.dumps(jobs, indent=2))

# 5. Get DLQ jobs
response = requests.get(f"{BASE_URL}/job?status=dlq", headers=headers)
dlq_jobs = response.json()
print(f"\nDLQ jobs: {len(dlq_jobs['jobs'])}")
```

### JavaScript (Node.js)
```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:2000';

async function main() {
  try {
    // 1. Create user
    const userResponse = await axios.post(`${BASE_URL}/user/create`, {
      username: 'demo',
      email: 'demo@example.com',
      password: 'demo123'
    });
    console.log('User created:', userResponse.data);

    // 2. Login
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'demo@example.com',
      password: 'demo123'
    });
    const token = loginResponse.data.jwt;
    console.log('Token:', token);

    // 3. Create jobs
    const headers = { Authorization: `Bearer ${token}` };
    
    for (let i = 1; i <= 3; i++) {
      const jobResponse = await axios.post(
        `${BASE_URL}/job/create`,
        { name: `Job ${i}` },
        { headers }
      );
      console.log(`Job ${i} created:`, jobResponse.data);
    }

    // 4. Get all jobs
    const jobsResponse = await axios.get(`${BASE_URL}/job`, { headers });
    console.log('\nAll jobs:', jobsResponse.data);

    // 5. Get pending jobs
    const pendingResponse = await axios.get(
      `${BASE_URL}/job?status=pending`,
      { headers }
    );
    console.log('\nPending jobs:', pendingResponse.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
```

---

## 🚨 Error Responses

### 401 Unauthorized
```json
{
  "error": "Invalid token"
}
```

### 429 Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded. Maximum 5 active jobs allowed."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## 📝 Job Status Values

- **pending**: Job created and waiting to be processed
- **running**: Job is currently being processed
- **completed**: Job finished successfully
- **dlq**: Job failed after 3 retry attempts (Dead Letter Queue)

---

## 🎯 Rate Limiting Rules

1. **Time-based**: Maximum 10 job creation attempts per minute per user
2. **Concurrent**: Maximum 5 active (pending/running) jobs per user

Jobs with status `completed` or `dlq` do not count toward the concurrent limit.

---

## 💡 Tips

1. **Save your token**: Store the JWT token after login to use in subsequent requests
2. **Check rate limits**: If you get 429 errors, wait before creating more jobs
3. **Monitor DLQ**: Check for jobs in DLQ status to identify issues
4. **Use filters**: Use query parameters to filter jobs by status
5. **Health checks**: Use `/sync` endpoint to verify API availability

---

For more information, see the main README.md or try the interactive dashboard at `http://localhost:3000`

