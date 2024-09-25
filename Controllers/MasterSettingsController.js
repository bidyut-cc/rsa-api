const MasterSetting = require("../Models/MasterSetting.js");
const Controller = require("./Controller.js");

const { Validator } = require('node-input-validator');

class MasterSettingsController extends Controller {
    constructor() {
        super("MasterSetting");
    }
    async view(req,res) {
        const {key} = req.query;
        try {
            const data = await MasterSetting.findOne({ key: key }, { key: 1, value: 1, _id: 1 });
            return data;
          } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message,
            });
          }
    }

}

module.exports = MasterSettingsController;
