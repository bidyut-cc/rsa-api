const mongoose = require("mongoose");
const InitiateMongoServer = require("../config/db"); // Ensure correct path
const sendQuotationJob = require("./sendQuotationJob");
const createZendeskLeadJob = require("./createZendeskLeadJob");
const sendOrderJob = require("./sendOrderJob");

module.exports = async (agenda) => {
  try {
    await InitiateMongoServer(); // Wait for MongoDB connection
    console.log("✅ MongoDB connected, initializing Agenda jobs...");

    sendQuotationJob(agenda); // Load quotation email job
    createZendeskLeadJob(agenda); // Load another job
    sendOrderJob(agenda); // Load another job

    console.log("✅ All Agenda jobs initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize MongoDB:", error);
    process.exit(1); // Exit the process if DB connection fails
  }
};
