const app = require("./api");
const { initializeDB, initializeRedis } = require("./db");

(async () => {
    await initializeDB();
    await initializeRedis();
    app.initialize();
})();
