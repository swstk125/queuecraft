const http = require("http");
const app = require("./api");
const { initializeDB, initializeRedis } = require("./db");
const { initializeWebSocket } = require("./websocket/websocketServer");

(async () => {
    await initializeDB();
    await initializeRedis();
    
    // Create HTTP server for WebSocket support
    const server = http.createServer(app);
    
    // Initialize WebSocket
    const io = initializeWebSocket(server);
    
    // Make io available to the app
    app.set('io', io);
    
    // Start server
    app.initialize(server);
    
    console.log('✅ Server started with WebSocket support');
})();
