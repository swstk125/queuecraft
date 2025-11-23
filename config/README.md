# QueueCraft Configuration Management

This directory contains the centralized configuration management system for QueueCraft using [Convict](https://github.com/mozilla/node-convict).

## 📁 Directory Structure

```
config/
├── ConfigurationManager.js    # Configuration manager class
├── index.js                    # Main entry point
├── deployment.example.json     # Example production override file
├── README.md                   # This file
└── configs/                    # Configuration schema files
    ├── app.json               # Application settings
    ├── db.json                # MongoDB configuration
    ├── redis.json             # Redis configuration
    ├── jwt.json               # JWT authentication
    ├── server.json            # API server settings
    ├── job.json               # Job processor settings
    ├── websocket.json         # WebSocket configuration
    ├── rateLimit.json         # Rate limiting settings
    └── logging.json           # Logging configuration
```

## 🚀 Quick Start

### Basic Usage

```javascript
// Import configuration
const config = require('./config');

// Get configuration values
const port = config.get('server.api.port');
const mongoUri = config.get('db.uri');
const jwtSecret = config.get('jwt.secret');

console.log(`Server port: ${port}`);
console.log(`MongoDB URI: ${mongoUri}`);
```

### Get All Configuration

```javascript
const config = require('./config');
const allConfig = config.getProperties();
console.log(JSON.stringify(allConfig, null, 2));
```

## 🔧 Configuration Priority

Configuration values are loaded in the following priority order (highest to lowest):

1. **Command-line arguments** (e.g., `--jwt-secret=mysecret`)
2. **Environment variables** (e.g., `SECRET_KEY=mysecret`)
3. **Override file** (e.g., `config/deployment.json`)
4. **Default values** (defined in JSON schema files)

## 📝 Environment Variables

All configuration can be overridden using environment variables. See `.env.example` in the project root for a complete list.

### Example

```bash
# Set environment variables
export NODE_ENV=production
export PORT=3000
export MONGODB_URI=mongodb://localhost/queuecraft
export SECRET_KEY=your-secret-key

# Start the application
node appServer.js
```

## 🎯 Configuration Schema Files

Each JSON file in the `configs/` directory defines a configuration schema:

### app.json
Application-level settings including environment, name, version, and logging level.

```javascript
const env = config.get('app.env');          // 'development', 'production', 'staging'
const appName = config.get('app.name');     // 'queuecraft'
const logLevel = config.get('app.logLevel'); // 'info', 'debug', 'error'
```

### db.json
MongoDB connection and pool configuration.

```javascript
const mongoUri = config.get('db.uri');
const maxPoolSize = config.get('db.maxPoolSize');
const debugEnabled = config.get('db.debugEnabled');
```

### redis.json
Redis connection, pub/sub, and retry strategy.

```javascript
const redisUrl = config.get('redis.url');
const pubsubChannel = config.get('redis.pubsub.channel');
const maxRetries = config.get('redis.retryStrategy.maxRetries');
```

### jwt.json
JWT authentication settings.

```javascript
const jwtSecret = config.get('jwt.secret');
const expiresIn = config.get('jwt.expiresIn');
const algorithm = config.get('jwt.algorithm');
```

### server.json
API server configuration including ports, CORS, and middleware settings.

```javascript
const port = config.get('server.api.port');
const corsOrigin = config.get('server.api.cors.origin');
const trustProxy = config.get('server.api.trustProxy');
```

### job.json
Job processor settings including concurrency, retry logic, and DLQ.

```javascript
const concurrency = config.get('job.processor.concurrency');
const maxRetries = config.get('job.retry.maxAttempts');
const dlqEnabled = config.get('job.dlq.enabled');
```

### websocket.json
WebSocket server configuration.

```javascript
const wsEnabled = config.get('websocket.enabled');
const pingTimeout = config.get('websocket.pingTimeout');
const corsOrigin = config.get('websocket.cors.origin');
```

### rateLimit.json
Rate limiting configuration for time-based and concurrent limits.

```javascript
const maxRequests = config.get('rateLimit.timeBased.maxRequests');
const maxActiveJobs = config.get('rateLimit.concurrent.maxActiveJobs');
const windowMs = config.get('rateLimit.timeBased.windowMs');
```

### logging.json
Logging configuration including levels, formats, and output destinations.

```javascript
const logLevel = config.get('logging.level');
const logFormat = config.get('logging.format');
const fileEnabled = config.get('logging.file.enabled');
```

## 🌍 Environment-Specific Configuration

### Using Override Files

Create environment-specific override files:

#### 1. Create `config/deployment.json` for production

```json
{
  "app": {
    "env": "production"
  },
  "db": {
    "uri": "mongodb://prod-host:27017/queuecraft"
  },
  "jwt": {
    "secret": "production-secret"
  }
}
```

#### 2. Set the override file path

```bash
export CONFIG_OVERRIDE=./config/deployment.json
# or
node appServer.js --app-override=./config/deployment.json
```

#### 3. The configuration manager will automatically load the override file

### Example: Multiple Environments

```bash
# Development (default)
node appServer.js

# Staging
export CONFIG_OVERRIDE=./config/staging.json
node appServer.js

# Production
export CONFIG_OVERRIDE=./config/production.json
node appServer.js
```

## 🔐 Security Best Practices

### 1. Never Commit Secrets

- ✅ Use environment variables for secrets
- ✅ Add `deployment.json` to `.gitignore`
- ✅ Use `.env.example` as template
- ❌ Never commit actual `.env` or `deployment.json` with secrets

### 2. Production Checklist

```bash
# ✅ Change JWT secret
export SECRET_KEY=your-unique-production-secret

# ✅ Use strong database credentials
export DB_USERNAME=queuecraft_user
export DB_PASSWORD=strong-password-here

# ✅ Enable TLS for Redis
export REDIS_TLS=true

# ✅ Set proper CORS origins
export FRONTEND_URL=https://yourdomain.com

# ✅ Disable debug logging
export DB_DEBUG_ENABLED=false
export LOG_LEVEL=info
```

## 🛠️ CLI Commands

The ConfigurationManager supports CLI commands for generating sample configs and dumping current values:

### Generate Sample Configuration

```bash
node config/ConfigurationManager.js sample
```

Output: Complete configuration with all default values in JSON format.

### Dump Current Configuration

```bash
node config/ConfigurationManager.js dump
```

Output: Current configuration including environment variables and overrides.

## 📚 Advanced Usage

### Validation

The configuration system validates all values on load:

```javascript
const config = require('./config');

// Validation happens automatically on require
// Invalid values will throw an error

// Example: Port must be a valid port number (1-65535)
// Example: Log level must be one of: error, warn, info, debug, trace
```

### Schema Format

Each configuration property supports:

- `doc`: Description of the configuration
- `default`: Default value
- `env`: Environment variable name
- `arg`: Command-line argument name
- `format`: Value format/validation (e.g., 'port', 'int', array of allowed values)
- `sensitive`: Mark as sensitive (for security)

Example:

```json
{
  "port": {
    "doc": "API server port number",
    "format": "port",
    "default": 2000,
    "env": "PORT"
  }
}
```

### Nested Configuration

Access nested values using dot notation:

```javascript
// From redis.json
const retryEnabled = config.get('redis.retryStrategy.enabled');
const maxRetries = config.get('redis.retryStrategy.maxRetries');

// From server.json
const corsEnabled = config.get('server.api.cors.enabled');
const corsOrigin = config.get('server.api.cors.origin');
```

## 🧪 Testing Configuration

### Test with Different Values

```bash
# Test with custom port
PORT=3000 node appServer.js

# Test with debug logging
LOG_LEVEL=debug node appServer.js

# Test with custom MongoDB
MONGODB_URI=mongodb://testhost/testdb node appServer.js
```

### Verify Configuration

```javascript
// In your test file
const config = require('./config');

describe('Configuration', () => {
  it('should load MongoDB URI', () => {
    const uri = config.get('db.uri');
    expect(uri).toBeDefined();
    expect(uri).toContain('mongodb://');
  });

  it('should load JWT secret', () => {
    const secret = config.get('jwt.secret');
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThan(0);
  });
});
```

## 🔍 Debugging

### Enable Debug Logging

```bash
DEBUG=configurationmanager node appServer.js
```

This will show:
- Files being read
- Schema structure
- Override file loading
- Validation results

### Check Loaded Values

```javascript
const config = require('./config');

// Log specific value
console.log('Port:', config.get('server.api.port'));

// Log entire section
console.log('Database config:', config.get('db'));

// Log everything
console.log('All config:', config.getProperties());
```

## 📦 Dependencies

- **convict**: Schema-based configuration management
- **lodash**: Utility functions for object manipulation
- **debug**: Flexible debugging utility

Install dependencies:

```bash
npm install convict lodash debug
```

## 🎯 Migration Guide

### From Environment Variables Only

**Before:**

```javascript
const port = process.env.PORT || 2000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/queuecraft';
const jwtSecret = process.env.SECRET_KEY || 'secret';
```

**After:**

```javascript
const config = require('./config');

const port = config.get('server.api.port');
const mongoUri = config.get('db.uri');
const jwtSecret = config.get('jwt.secret');
```

### Benefits

- ✅ Centralized configuration
- ✅ Validation and type checking
- ✅ Documentation in schema
- ✅ Environment-specific overrides
- ✅ Default values
- ✅ CLI tools for inspection

## 🚦 Status

✅ **Production Ready**

All configuration files are complete and validated. The system supports:
- Development, staging, and production environments
- Environment variable overrides
- Configuration file overrides
- Validation and type checking
- Comprehensive documentation

## 📖 References

- [Convict Documentation](https://github.com/mozilla/node-convict)
- [12-Factor App Config](https://12factor.net/config)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🤝 Contributing

When adding new configuration:

1. Create or update JSON schema file in `configs/`
2. Add environment variable to `.env.example`
3. Update this README
4. Update `deployment.example.json`
5. Test with different values

---

For questions or issues, please open an issue on GitHub.

