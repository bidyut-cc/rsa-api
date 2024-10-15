const Controller = require("./Controller.js");
const Emailtemplate = require("../Models/Emailtemplate");
const { response } = require("../Helpers/Uploader.js");
const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
require("dotenv").config();
const email_helper = require("../Helpers/Sendmail");
const { Validator } = require('node-input-validator');
const AccountLog = require("../Helpers/AccountLog.js");
require('../Helpers/extend-node-input-validator');

class QuotationsController extends Controller {
    constructor() {
        super("Quotation");
    }
}

module.exports = QuotationsController;
