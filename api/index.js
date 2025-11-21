const express = require("express")
const port = process.env.PORT || 2000;

const app = express();

// Register the routers
const loginRouter = require("./rest/login.rest");
const jobRouter = require("./rest/job.rest");

// Middleware to authenticate JWT tokens
const jwtMiddleware = require("./middleware/authmiddleware");

// Middleware to parse JSON bodies
app.use(express.json());
// app.use(jwtMiddleware);


// use the routers
app.use("/login", jwtMiddleware(), loginRouter);
app.use("/job", jwtMiddleware(), jobRouter);

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
app.initialize = () => {
  try {
    app.listen(port, () => {
      console.log('Listening on port ' + port);
    });
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