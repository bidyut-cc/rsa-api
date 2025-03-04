const Agenda = require("agenda");
require("dotenv").config(); // Load environment variables

const mongoConnectionString = process.env.DB_URI; // Your MongoDB URI

const agenda = new Agenda({
  db: { address: mongoConnectionString, collection: "agendaJobs" },
  processEvery: "10 seconds", // Adjust as needed
});

module.exports = agenda;
