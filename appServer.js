const http = require("http");
const app = require("./api");
const { initializeDB, initializeRedis } = require("./db");
const { initializeWebSocket } = require("./websocket/websocketServer");
const rabbitmq = require("./job/rabbitmqConnection");
const logger = require("./util/logger");

(async () => {
    try {
        // Initialize database and cache
        await initializeDB();
        await initializeRedis();
        
        // Initialize RabbitMQ connection
        await rabbitmq.connect();
        logger.info('RabbitMQ connection initialized for API server');
        
        // Create HTTP server for WebSocket support
        const server = http.createServer(app);
        
        // Initialize WebSocket
        const io = initializeWebSocket(server);
        
        // Make io available to the app
        app.set('io', io);
        
        // Start server
        app.initialize(server);
        
        console.log('✅ Server started with WebSocket support');
        logger.info('API server fully initialized', {
            services: ['MongoDB', 'Redis', 'RabbitMQ', 'WebSocket']
        });
        
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, closing connections');
            await rabbitmq.close();
            process.exit(0);
        });
        
        process.on('SIGINT', async () => {
            logger.info('SIGINT received, closing connections');
            await rabbitmq.close();
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('Failed to initialize API server', error);
        process.exit(1);
    }
})();
