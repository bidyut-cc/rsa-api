/**
 * Dependencies/Modules
 */
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const InitiateMongoServer = require("./config/db");
const app = express();
const path = require("path");
InitiateMongoServer();
const ApiRoute = require("./routes/api");
require("dotenv").config();
const fileUpload = require("express-fileupload");
app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: "/tmp/",
    })
);

app.use(express.static(path.join(__dirname, "/public")));
/**
 * Initializing PORT
 */
const PORT = process.env.PORT || 4000;

/**
 * Middlewares
 */
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.options("*", cors());

/**
 * Routes
 */
app.get("/", async (req, res) => {
   res.status(200).json({
    status:true,
    message: "Server running...",
   
});
});
app.use("/api", ApiRoute);

app.use(function (err, req, res, next) {
    res.status(500).json({
        message: "Oops! Something went wrong",
        trace: err.stack,
    });
});
/**
 * Starting the App
 */
app.listen(PORT, (req, res) => {
    console.log(`Server Started at PORT ${PORT}`);
});
