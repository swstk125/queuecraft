const initializeJobProcessor = require("./job/index");
const { initializeDB } = require("./db");

(async () => {
  await initializeDB();
  await initializeJobProcessor();
})();