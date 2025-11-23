const express = require("express")
const config = require("../config");

const port = config.get('server.port');

const app = express();

// Register the routers
const loginRouter = require("./rest/login.rest");
const jobRouter = require("./rest/job.rest");
const userRouter = require("./rest/user.rest");
const metricsRouter = require("./rest/metrics.rest");
const prometheusRouter = require("./rest/prometheus.rest");

// Middleware to authenticate JWT tokens
const jwtMiddleware = require("./middleware/authmiddleware");
const traceMiddleware = require("./middleware/traceMiddleware");

// Middleware to parse JSON bodies
app.use(express.json());

// Add trace middleware to all requests
app.use(traceMiddleware());

// use the routers
app.use("/login", jwtMiddleware(), loginRouter);
app.use("/job", jwtMiddleware(), jobRouter);
app.use("/user", userRouter);
app.use("/metrics", jwtMiddleware(), metricsRouter);
// Prometheus endpoint (no auth required for Prometheus scraper)
app.use("/prometheus", prometheusRouter);
// health check
app.get("/sync", (req, res) => {
  try {
    res.send(Date.now());
  } catch (error) {
    res.status(500).send(error.message);
    console.error('Error sending file:', error);
  }
});

// initialize the app
app.initialize = (httpServer) => {
  try {
    if (httpServer) {
      // Used when HTTP server is provided (for WebSocket support)
      return httpServer.listen(port, () => {
        console.log('Listening on port ' + port);
      });
    } else {
      // Fallback: create server directly
      return app.listen(port, () => {
        console.log('Listening on port ' + port);
      });
    }
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions to prevent silent exits
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
module.exports.port = port;