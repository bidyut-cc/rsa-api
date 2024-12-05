const Controller = require("./Controller.js");
const { response } = require("../Helpers/Uploader.js");
const User = require("../Models/User.js");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
require("dotenv").config();

class ChangelogsController extends Controller {
    constructor() {
        super("Changelog");
    }

     /**
     * To get log list
     *
     * @param {object} req
     * @return {json} 
     */
  
}

module.exports = ChangelogsController;