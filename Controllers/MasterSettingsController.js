const MasterSetting = require("../Models/MasterSetting.js");
const Controller = require("./Controller.js");

const { Validator } = require('node-input-validator');

class MasterSettingsController extends Controller {
    constructor() {
        super("MasterSetting");
    }
    async materialView(req,res) {
        const {key} = req.query;
        try {
            const data = await MasterSetting.aggregate([
                { $match: { key: key } }, // Match the document by the key
                { 
                    $project: { 
                        key: 1, 
                        value: {
                            $filter: {
                                input: "$value",
                                as: "item",
                                cond: { $eq: ["$$item.status", "Active"] }
                            }
                        }
                    }
                }
            ]);
            if (data && data.length > 0 && data[0].value.length > 0) {
            return data[0].value;
            }else{
                return {}
            }
          } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message,
            });
          }
    }

}

module.exports = MasterSettingsController;
