const app = require("./api");
const { initializeDB } = require("./db");

app.initialize();
initializeDB();
