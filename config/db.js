/**
 * @description Module to establish connection to the Database
 * @author CodeClouds
 */

const mongoose = require("mongoose");
require("dotenv").config();
const MONGO_URI = process.env.DB_URI;
const InitiateMongoServer = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          //  autoReconnect: true,
            
            // server:{auto_reconnect:true}
        });
        console.log("Connected to DB");
    } catch (e) {
        console.log("DB Connection error: ", e);
    }
};

module.exports = InitiateMongoServer;
