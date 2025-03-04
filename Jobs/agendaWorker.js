const agenda = require("../config/agendaConfig"); // Import agenda instance
const defineJobs = require("./agendaJobs"); // Import job definitions

// Load job definitions
defineJobs(agenda);

// Start agenda processing
(async function () {
  await agenda.start();
  console.log("🚀 Agenda worker started...");
})();
