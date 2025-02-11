const Changelog = require("../Models/Changelog.js");
const MasterSetting = require("../Models/MasterSetting.js");
const Controller = require("./Controller.js");

const { Validator } = require("node-input-validator");

class MasterSettingsController extends Controller {
  constructor() {
    super("MasterSetting");
  }

  /**
   * Fetches and returns active material settings based on the provided key.
   *
   * @async
   * @function materialView
   * @param {Object} req - The request object, containing the `key` query parameter.
   * @param {Object} res - The response object, used to send the result or error response.
   * @returns {Object} - An object containing active material values for the specified key, or an empty object if no data is found.
   *
   * @throws {Error} - If there is an issue fetching the data from the database.
   *
   * @description
   * This method:
   * - Accepts a `key` query parameter to filter material settings from the `MasterSetting` collection.
   * - Only includes items with a status of "Active" in the returned value array.
   * - Returns the filtered data if available, or an empty object if no active items are found.
   */

  async materialView(req, res) {
    const { key } = req.query;
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
                cond: { $eq: ["$$item.status", "Active"] },
              },
            },
          },
        },
      ]);
      if (data && data.length > 0 && data[0].value.length > 0) {
        return data[0].value;
      } else {
        return {};
      }
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }

  /**
   * Fetches and returns material settings for a specified key.
   *
   * @async
   * @function view
   * @param {Object} req - The request object, containing the `key` query parameter.
   * @param {Object} res - The response object, used to send the result or error response.
   * @returns {Object} - An object containing the material settings for the specified key.
   *
   * @throws {Error} - If there is an issue fetching the data from the database.
   *
   * @description
   * This method:
   * - Accepts a `key` query parameter to fetch material settings from the `MasterSetting` collection.
   * - Returns the matching document, including the `key`, `value`, and `_id` fields.
   */

  async view(req, res) {
    const { key } = req.query;
    try {
      const data = await MasterSetting.findOne(
        { key: key },
        { key: 1, value: 1, _id: 1 }
      );
      return data;
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }

  async updateMaterialDescription(req, res) {
    try {
        const { key, value } = req.body;

        // Find the MasterSetting record
        const result = await MasterSetting.findOne({ key: "materials" });

        if (!result) {
             res.status(404).json({
                status: false,
                message: "Material setting not found",
            });
        }

        // Check if change log is enabled
        if (MasterSetting.schema.changeLog) {
            // Create a deep copy of the previous data
            const previousData = result.toObject(); 

            // Update the field
            result.value = value;

            // Create and save the change log
            const log = new Changelog({
                event: "updated",
                modelName: "MasterSetting",
                modelId: result._id, 
                user: {
                  _id: req.user._id,
                  username: req.user.username,
                  first_name: req.user.first_name,
                  last_name: req.user.last_name,
                }, 
                previousData: previousData, // Old data before update
                currentData: result.toObject(), // New data after update
                message: "updated Material Description.",
            });

            await log.save();
        }

        // Save the updated document
        await result.save();

        // Respond with a success message and updated result
         res.status(200).json({
            status: true,
            message: "Material description updated successfully",
            data: result,
        });
    } catch (error) {
        console.error("Error updating material description:", error);
         res.status(500).json({
            status: false,
            message: "An error occurred while updating material description",
            error: error.message,
        });
    }
}

}

module.exports = MasterSettingsController;
