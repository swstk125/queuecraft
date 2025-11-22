const initializeJobProcessor = require("./job/index");
const { initializeDB, initializeRedis } = require("./db");

(async () => {
  await initializeDB();
  await initializeRedis();
  await initializeJobProcessor();
})();