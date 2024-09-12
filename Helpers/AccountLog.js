/**
 * @description Module to store Change Logs
 * @author CodeClouds
 */
var axios = require("axios");
const Changelog = require("../Models/Changelog");
const Models = require("../Models");
class AccountLog {
    constructor() {
        this.logObj = new Changelog();
    }

/**
 * To save log
 *
 * @param {string} event
 * @param {object} obj
 * @param {object} user
 * @param {object} data
 */
    async saveLog(event, obj, user, message = null ,session = null) {
        var class_name = obj.constructor.modelName;
        class_name = class_name.replace("class ", "").trim();
        this.logObj.event = event.toLowerCase();
        this.logObj.modelName = class_name.charAt(0).toUpperCase() + class_name.slice(1);
        this.logObj.modelId = obj._id;
        this.logObj.message = message;
        this.logObj.user = {
            _id: user._id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
        };
        switch (event) {
            case "saved":
                this.saved(obj);
                break;
            case "updated":
                await this.updated(obj,session);
                break;
            case "deleted":
                this.deleted(obj);
                break;
            default:
                break;
        }
        await this.logObj.save(session ? { session } : undefined);
        return true;
    }

    saved(obj) {
        this.logObj.currentData = obj;
    }
/**
 * To update log
 *
 * @param {object} obj
 */
    async updated(obj, session = null) {
        // Dynamically find the model class based on the logObj's modelName
        const modelClass = Models[this.logObj.modelName];
        
        // Check if session is provided, and use it if available
        const query = modelClass.findById(this.logObj.modelId);
        if (session) {
            query.session(session);
        }

        const previousData = await query.exec();
        this.logObj.currentData = obj;
        this.logObj.previousData = previousData;
    }
/**
 * To delete log
 *
 * @param {object} obj
 */
    deleted(obj) {
        this.logObj.previousData = obj;
    }
}
module.exports = AccountLog;
