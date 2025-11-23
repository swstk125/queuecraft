# QueueCraft Deployment Guide

Complete guide for deploying QueueCraft to production environments.

## 📋 Pre-Deployment Checklist

### Security
- [ ] Change default `SECRET_KEY` environment variable
- [ ] Implement password hashing (bcrypt recommended)
- [ ] Enable HTTPS/SSL certificates
- [ ] Review and restrict CORS origins
- [ ] Set up firewall rules
- [ ] Enable MongoDB authentication
- [ ] Secure Redis with password

### Configuration
- [ ] Set production MongoDB URI
- [ ] Set production Redis URL
- [ ] Configure production API URL in frontend
- [ ] Set appropriate NODE_ENV
- [ ] Review rate limiting values
- [ ] Configure logging levels

### Testing
- [ ] Run full test suite: `npm test`
- [ ] Test in production-like environment
- [ ] Load testing with expected traffic
- [ ] Verify all API endpoints
- [ ] Test frontend build locally

---

## 🚀 Backend Deployment

### Option 1: Traditional Server (PM2)

#### Prerequisites
- Node.js 18+ installed
- MongoDB accessible
- Redis accessible
- PM2 installed globally

#### Steps

1. **Install PM2**
```bash
npm install -g pm2
```

2. **Set Environment Variables**
```bash
export NODE_ENV=production
export MONGODB_URI=mongodb://your-mongodb-host:27017/queuecraft
export REDIS_URL=redis://your-redis-host:6379
export SECRET_KEY=your-super-secret-key
export PORT=2000
```

Or create a `.env` file:
```env
NODE_ENV=production
MONGODB_URI=mongodb://your-mongodb-host:27017/queuecraft
REDIS_URL=redis://your-redis-host:6379
SECRET_KEY=your-super-secret-key
PORT=2000
```

3. **Start Services with PM2**
```bash
# Start API Server
pm2 start appServer.js --name queuecraft-api \
  --env production \
  --instances 2 \
  --max-memory-restart 500M

# Start Job Processor
pm2 start jobServer.js --name queuecraft-worker \
  --env production \
  --instances 1 \
  --max-memory-restart 500M

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

4. **Monitor Services**
```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Check status
pm2 status

# Restart services
pm2 restart all
```

### Option 2: Docker Deployment

#### Dockerfile for Backend
```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

EXPOSE 2000

# Start API server
CMD ["node", "appServer.js"]
```

#### Docker Compose (Full Stack)
```yaml
version: '3.8'

services:
  # MongoDB
  mongodb:
    image: mongo:latest
    restart: always
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    networks:
      - queuecraft-network

  # Redis
  redis:
    image: redis:latest
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - queuecraft-network

  # API Server
  api:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "2000:2000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/queuecraft?authSource=admin
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      SECRET_KEY: ${SECRET_KEY}
      PORT: 2000
    depends_on:
      - mongodb
      - redis
    networks:
      - queuecraft-network

  # Job Processor
  worker:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    command: node jobServer.js
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/queuecraft?authSource=admin
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      - mongodb
      - redis
    networks:
      - queuecraft-network

volumes:
  mongodb_data:
  redis_data:

networks:
  queuecraft-network:
    driver: bridge
```

#### Deploy with Docker Compose
```bash
# Create .env file
cat > .env << EOF
MONGO_PASSWORD=your-mongo-password
REDIS_PASSWORD=your-redis-password
SECRET_KEY=your-secret-key
EOF

# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 3: Cloud Platform Deployment

#### Heroku

1. **Create Heroku Apps**
```bash
# Create apps
heroku create queuecraft-api
heroku create queuecraft-worker

# Add MongoDB (MongoDB Atlas or Heroku addon)
heroku addons:create mongolab:sandbox -a queuecraft-api

# Add Redis
heroku addons:create heroku-redis:hobby-dev -a queuecraft-api

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key -a queuecraft-api
heroku config:set NODE_ENV=production -a queuecraft-api
```

2. **Create Procfile**
```
web: node appServer.js
worker: node jobServer.js
```

3. **Deploy**
```bash
git push heroku main
```

#### AWS (Elastic Beanstalk or ECS)

Use Docker deployment method with AWS ECS or deploy directly to Elastic Beanstalk.

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build and run commands
3. Set environment variables
4. Deploy

---

## 🎨 Frontend Deployment

### Build Frontend

```bash
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Output will be in 'dist/' folder
```

### Option 1: Static Hosting (Netlify)

#### Using Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

#### Using Netlify UI
1. Connect GitHub repository
2. Configure build settings:
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/dist`
3. Set environment variables:
   - `VITE_API_URL`: Your API URL
4. Deploy

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

Or connect repository through Vercel UI.

### Option 3: AWS S3 + CloudFront

```bash
# Build
cd frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Option 4: Nginx (Traditional Server)

```nginx
# /etc/nginx/sites-available/queuecraft
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/queuecraft/frontend/dist;
    index index.html;

    # Frontend routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:2000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/queuecraft /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 SSL/HTTPS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

### Using Cloudflare

1. Add domain to Cloudflare
2. Enable "Full (strict)" SSL mode
3. Configure origin certificates
4. Enable "Always Use HTTPS"

---

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create free cluster
   - Choose region closest to your app

2. **Configure Access**
   - Add IP address to whitelist (0.0.0.0/0 for all)
   - Create database user

3. **Get Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/queuecraft
   ```

4. **Update Environment Variable**
   ```bash
   export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/queuecraft"
   ```

### Self-Hosted MongoDB

```bash
# Install MongoDB
sudo apt install mongodb

# Enable authentication
sudo nano /etc/mongod.conf
# Add: security.authorization: enabled

# Create admin user
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
```

### Redis Cloud (Recommended)

1. Create account at [Redis Cloud](https://redis.com/try-free/)
2. Create database
3. Get connection string
4. Update `REDIS_URL` environment variable

---

## 📊 Monitoring & Logging

### Application Monitoring

#### PM2 Plus (Recommended)
```bash
# Link PM2 to PM2 Plus
pm2 link your-secret-key your-public-key

# Monitor at: https://app.pm2.io
```

#### New Relic
1. Install New Relic agent
2. Configure in `newrelic.js`
3. Monitor at New Relic dashboard

### Log Management

#### Winston Logger Setup
```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}

module.exports = logger;
```

#### Log Aggregation
- **Papertrail**: Log aggregation service
- **Loggly**: Cloud-based log management
- **ELK Stack**: Self-hosted logging (Elasticsearch, Logstash, Kibana)

---

## 🔍 Health Checks

### Implement Health Endpoint
```javascript
// Add to appServer.js
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB
    await mongoose.connection.db.admin().ping();
    
    // Check Redis
    await redisClient.ping();
    
    res.json({
      status: 'healthy',
      mongodb: 'connected',
      redis: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Monitoring Tools
- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Advanced monitoring
- **Datadog**: Comprehensive monitoring

---

## 🚨 Backup Strategy

### MongoDB Backups
```bash
# Manual backup
mongodump --uri="mongodb://..." --out=/backup/$(date +%Y%m%d)

# Automated daily backup
0 2 * * * mongodump --uri="$MONGODB_URI" --out=/backup/$(date +\%Y\%m\%d)
```

### Redis Backups
```bash
# Redis automatically saves to dump.rdb
# Copy periodically
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        run: |
          # SSH and deploy commands
          
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd frontend && npm ci && npm run build
      - name: Deploy to Netlify
        run: netlify deploy --prod --dir=frontend/dist
```

---

## 📈 Scaling Strategies

### Horizontal Scaling
- Deploy multiple API server instances behind load balancer
- Increase worker instances for job processing
- Use Redis for session storage (stateless servers)

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize MongoDB indexes
- Tune Redis configuration

### Database Scaling
- MongoDB replica sets for high availability
- Read replicas for read-heavy workloads
- Sharding for very large datasets

---

## ✅ Post-Deployment Checklist

- [ ] Verify all services are running
- [ ] Test API endpoints
- [ ] Test frontend application
- [ ] Verify database connections
- [ ] Check logs for errors
- [ ] Test user login and job creation
- [ ] Verify rate limiting works
- [ ] Test DLQ functionality
- [ ] Set up monitoring alerts
- [ ] Document deployment configuration
- [ ] Create rollback plan

---

## 🆘 Troubleshooting

### Common Issues

**Services won't start**
- Check environment variables
- Verify database connections
- Review logs: `pm2 logs` or `docker-compose logs`

**High memory usage**
- Check for memory leaks
- Review PM2 max-memory-restart settings
- Monitor with `pm2 monit`

**Database connection errors**
- Verify connection strings
- Check network/firewall rules
- Ensure database is running

**Frontend can't connect to API**
- Verify CORS settings
- Check API URL configuration
- Ensure API server is accessible

---

**For additional help, refer to:**
- Main README.md
- QUICKSTART.md
- API_EXAMPLES.md
- Frontend documentation

Good luck with your deployment! 🚀

