const Setting = require("../Models/Setting.js");
const Controller = require("./Controller.js");

const { Validator } = require("node-input-validator");
const _ = require("lodash");
const AccountLog = require("../Helpers/AccountLog.js");
const MasterSetting = require("../Models/MasterSetting.js");
const file_uploader = require("../Helpers/Uploader");

class SettingsController extends Controller {
  constructor() {
    super("Setting");
  }
  /**
 * Fetches and returns settings for a specified step.
 *
 * @async
 * @function view
 * @param {Object} req - The request object, containing the `step` query parameter.
 * @param {Object} res - The response object, used to send the result or error response.
 * @returns {Object} - An object containing the settings for the specified step.
 * 
 * @throws {Error} - If there is an issue fetching the data from the database.
 * 
 * @description
 * This method:
 * - Accepts a `step` query parameter to fetch settings from the `Setting` collection.
 * - Returns the matching document, including the `step`, `config`, and `_id` fields.
 */

  async view(req, res) {
    const { step } = req.query;
    try {
      const data = await Setting.findOne(
        { step: step },
        { step: 1, config: 1, _id: 1 }
      );
      return data;
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }

/**
 * Updates the project settings based on the provided input.
 *
 * @async
 * @function updateProject
 * @param {Object} req - The request object containing the project settings to be updated.
 * @param {Object} res - The response object used to send the result or error response.
 * @returns {Object} - The result of the update operation.
 * 
 * @throws {Error} - If there is an issue with validation or updating the project.
 * 
 * @description
 * This method:
 * - Fetches the maximum number of stalls and urinal screens from the `MasterSetting` collection.
 * - Validates the input data for the number of stalls, urinal screens, and material installation quote.
 * - If validation passes, it updates the project settings and responds with the result.
 * - If validation fails, it responds with the validation errors.
 * - If an error occurs during the update process, it responds with a 500 status and an error message.
 */

  async updateProject(req, res) {
    const maximum_number_of_stalls = await MasterSetting.findOne(
      { key: 'maximum_number_of_stalls' },
      { key: 1, value: 1, _id: 1 }
    );
    const maximum_number_of_urinal_screens = await MasterSetting.findOne(
      { key: 'maximum_number_of_urinal_screens' },
      { key: 1, value: 1, _id: 1 }
    );
    // Validate the input data
    const v = new Validator(req.body, {
      maximum_number_of_stalls: `required|integer|min:1|max:${maximum_number_of_stalls.value}`,
      maximum_number_of_urinal_screens: `required|integer|min:1|max:${maximum_number_of_urinal_screens.value}`,
      interested_for_material_installation_quote: "required|in:Yes,No",
    });

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      try {
        const config = {
          maximum_number_of_stalls: req.body.maximum_number_of_stalls,
          maximum_number_of_urinal_screens:
            req.body.maximum_number_of_urinal_screens,
          interested_for_material_installation_quote:
            req.body.interested_for_material_installation_quote,
        };
        delete req.body.maximum_number_of_stalls;
        delete req.body.maximum_number_of_urinal_screens;
        delete req.body.interested_for_material_installation_quote;
        req.body.config = config;
        // Attempt to update the label using the inherited update method
        const result = await super.update(req);

        // Respond with a 200 status and the result
        res.status(200).json(result);
      } catch (error) {
        // If an error occurs, respond with a 500 status and an error message
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }

/**
 * Updates the layout settings based on the provided input.
 *
 * @async
 * @function updateLayout
 * @param {Object} req - The request object containing the layout settings to be updated.
 * @param {Object} res - The response object used to send the result or error response.
 * @returns {Object} - The result of the update operation.
 * 
 * @throws {Error} - If there is an issue with validation or updating the layout settings.
 * 
 * @description
 * This method:
 * - Validates the input data for the layout configuration, including the layouts array and the visibility of the handicap-accessible stall.
 * - If validation passes, it updates the layout settings and responds with the result.
 * - If validation fails, it responds with a 422 status and the validation errors.
 * - If an error occurs during the update process, it responds with a 500 status and an error message.
 */

  async updateLayout(req, res) {
    // Validate the input data
    const v = new Validator(req.body, {
      layouts: "required|array",
      "layouts.*": "required|object",
      show_handicap_accessible_stall: "required|in:Yes,No",
    });

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      try {
        const config = {
          layouts: req.body.layouts,
          show_handicap_accessible_stall:
            req.body.show_handicap_accessible_stall,
        };
        delete req.body.layouts;
        delete req.body.show_handicap_accessible_stall;
        req.body.config = config;
        // Attempt to update the label using the inherited update method
        const result = await super.update(req);

        // Respond with a 200 status and the result
        res.status(200).json(result);
      } catch (error) {
        // If an error occurs, respond with a 500 status and an error message
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }

/**
 * Updates the measurement settings based on the provided input.
 *
 * @async
 * @function updateMeasurement
 * @param {Object} req - The request object containing the measurement settings to be updated.
 * @param {Object} res - The response object used to send the result or error response.
 * @returns {Object} - The result of the update operation.
 * 
 * @throws {Error} - If there is an issue with validation or updating the measurement settings.
 * 
 * @description
 * This method:
 * - Validates the input data for the measurement configuration, including stall dimensions, door openings, swings, and room number limits.
 * - If validation passes, it updates the measurement settings and responds with the result.
 * - If validation fails, it responds with a 422 status and the validation errors.
 * - If an error occurs during the update process, it responds with a 500 status and an error message.
 */

  async updateMeasurement(req, res) {
    // Validate the input data
    const v = new Validator(
      req.body,
      {
        swings: "required|array",
        "swings.*": "required|object",
        ada_stall_min_width: "required|numeric",
        ada_stall_max_width: "required|numeric",
        standard_stall_min_width: "required|numeric",
        standard_stall_max_width: "required|numeric",
        ada_stall_min_depth: "required|numeric",
        ada_stall_max_depth: "required|numeric",
        standard_stall_min_depth: "required|numeric",
        standard_stall_max_depth: "required|numeric",
        ada_stall_min_door_opening: "required|numeric",
        ada_stall_max_door_opening: "required|numeric",
        standard_stall_min_door_opening: "required|numeric",
        standard_stall_max_door_opening: "required|numeric",
        maximum_room_no: "required|integer|min:1|max:4",
      },
      {
        "swings.required": "The door swings field is mandatory.",
      }
    );

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      try {
        const config = {
          swings: req.body.swings,
          ada_stall_min_width: req.body.ada_stall_min_width,
          ada_stall_max_width: req.body.ada_stall_max_width,
          standard_stall_min_width: req.body.standard_stall_min_width,
          standard_stall_max_width: req.body.standard_stall_max_width,
          ada_stall_min_depth: req.body.ada_stall_min_depth,
          ada_stall_max_depth: req.body.ada_stall_max_depth,
          standard_stall_min_depth: req.body.standard_stall_min_depth,
          standard_stall_max_depth: req.body.standard_stall_max_depth,
          ada_stall_min_door_opening: req.body.ada_stall_min_door_opening,
          ada_stall_max_door_opening: req.body.ada_stall_max_door_opening,
          standard_stall_min_door_opening: req.body.standard_stall_min_door_opening,
          standard_stall_max_door_opening: req.body.standard_stall_max_door_opening,
          maximum_room_no: req.body.maximum_room_no,
        };
        delete req.body.swings;
        delete req.body.maximum_room_no;
        delete req.body.ada_stall_min_width;
        delete req.body.ada_stall_max_width;
        delete req.body.standard_stall_min_width;
        delete req.body.standard_stall_max_width;
        delete req.body.ada_stall_min_depth;
        delete req.body.ada_stall_max_depth;
        delete req.body.standard_stall_min_depth;
        delete req.body.standard_stall_max_depth;
        delete req.body.ada_stall_min_door_opening;
        delete req.body.ada_stall_max_door_opening;
        delete req.body.standard_stall_min_door_opening;
        delete req.body.standard_stall_max_door_opening;
        req.body.config = config;
        // Attempt to update the label using the inherited update method
        const result = await super.update(req);

        // Respond with a 200 status and the result
        res.status(200).json(result);
      } catch (error) {
        // If an error occurs, respond with a 500 status and an error message
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }

/**
 * Updates the color settings based on the provided input.
 *
 * @async
 * @function updateColor
 * @param {Object} req - The request object containing the color settings to be updated.
 * @param {Object} res - The response object used to send the result or error response.
 * @returns {Object} - The result of the update operation.
 * 
 * @throws {Error} - If there is an issue with validation or updating the color settings.
 * 
 * @description
 * This method:
 * - Validates the input data for the color configuration, ensuring that the colors field is provided as an array.
 * - If validation passes, it updates the color settings and responds with the result.
 * - If validation fails, it responds with a 422 status and the validation errors.
 * - If an error occurs during the update process, it responds with a 500 status and an error message.
 */

  async updateColor(req, res) {
    // Validate the input data
    const v = new Validator(req.body, {
      colors: `required|array`,
    });

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      try {
        const config = {
          colors: req.body.colors,
        };
        req.body.config = config;
        // Attempt to update the label using the inherited update method
        const result = await super.update(req);

        // Respond with a 200 status and the result
        res.status(200).json(result);
      } catch (error) {
        // If an error occurs, respond with a 500 status and an error message
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }

/**
 * Updates the quotation builder settings based on the provided input.
 *
 * @async
 * @function updateQuotationBuilder
 * @param {Object} req - The request object containing the type and config for updating the quotation builder.
 * @param {Object} res - The response object used to send the result or error response.
 * @returns {Object} - The result of the update operation or error response.
 * 
 * @throws {Error} - If there is an issue with validation or updating the quotation builder settings.
 * 
 * @description
 * This method:
 * - Validates the input data based on the type and its associated configuration.
 * - Dynamically adds validation rules for the specific configuration fields based on the provided type.
 * - If validation fails, responds with a 422 status and detailed error messages.
 * - If validation passes, updates the quotation builder configuration in the database and logs the change if applicable.
 * - If an error occurs during the update process, responds with a 500 status and an error message.
 * - If the specified type is not recognized, responds with a 422 status and an error message.
 */

  async updateQuotationBuilder(req, res) {
    // Extract type and result from request body
    const { type, config } = req.body;

    // Define base validation rules
    let validationRules = {
      type: "required|string",
      config: "required|object",
    };

    // Dynamically add validation rules based on the provided type
    if (config[type]) {
      // Validate the specific config type object
      validationRules[`config.${type}`] = "required|object";

      // Loop through the config[type] keys and add validation for each
      for (let key in config[type]) {
        if (config[type].hasOwnProperty(key)) {
          validationRules[`config.${type}.${key}`] = "required|array";

          // Update validation for each item in the array
          config[type][key].forEach((item, index) => {
            validationRules[`config.${type}.${key}.${index}.id`] =
              "required|integer";
            validationRules[`config.${type}.${key}.${index}.name`] =
              "required|string";
            validationRules[`config.${type}.${key}.${index}.price`] =
              "required|numeric|min:1"; // Ensure price is not empty and a number
          });
        }
      }
    } else {
      // Handle cases where the type is not recognized
      res.status(422).json({
        status: false,
        message: "Invalid type provided.",
      });
      return;
    }

    // Initialize the validator
    const v = new Validator(req.body, validationRules);

    // Check if the validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and validation errors
      const errorMessages = {};

      // Loop through the errors to modify keys and messages
      for (const [key, value] of Object.entries(v.errors)) {
        // Simplify the error message
        if (key.includes("price")) {
          errorMessages[key] = {
            message: `The price field ${value.rule === 'min' ? 'must be greater than 0' : value.rule === 'numeric' ? 'must be a number' : 'is mandatory'}.`,
            rule: value.rule, // Add the validation rule that failed
          };
        } else if (key.includes("id")) {
          errorMessages[key] = {
            message: `The id field is mandatory.`,
            rule: value.rule, // Add the validation rule that failed
          };
        } else if (key.includes("name")) {
          errorMessages[key] = {
            message: `The name field is mandatory.`,
            rule: value.rule, // Add the validation rule that failed
          };
        } else {
          errorMessages[key] = value.message; // Fallback for other errors
        }
      }
      // If validation fails, respond with a 422 status and validation errors
      res.status(422).json({
        status: false,
        errors: errorMessages,
      });
      return;
    }

    // Proceed with your update logic if validation passes
    try {
      const updateData = {};
      updateData[`config.${type}`] = config[type];

        const foundData = await Setting.findOne({
          _id: req.params.id,
          step: "quotation_builder"
        });
        
        if (foundData) {
          foundData.set(updateData); // Update fields using the updateData object
           // Log the change if changeLog is enabled in the schema
        if (Setting.schema.changeLog) {
              const accountLog = new AccountLog();
              const message = `${type} price`;
              await accountLog.saveLog("updated", foundData, req.user, message); // Log the change
          }
          await foundData.save();
                // Perform your update logic here...
      res.status(200).json({
        status: true,
        message: "Quotation builder updated successfully.",
      });
      return;
        }else{
          res.status(404).json({
            status: true,
            message: "Source not found."
        });
        return; // Exit function
        }
    } catch (error) {
      // Handle any error during the update process
      res.status(500).json({
        status: false,
        message: error.message,
      });
      return;
    }
  }

/**
 * Updates the ADA price in the quotation builder settings.
 *
 * @async
 * @function updateQuotationBuilderADAprice
 * @param {Object} req - The request object containing the ADA price to update.
 * @param {Object} res - The response object used to send the result or error response.
 * @returns {Object} - The result of the update operation or error response.
 * 
 * @throws {Error} - If there is an issue with validation or updating the ADA price in the quotation builder.
 * 
 * @description
 * This method:
 * - Validates the input data, ensuring that ADA price is a numeric value and does not contain spaces.
 * - If validation fails, responds with a 422 status and detailed error messages.
 * - If validation passes, updates the ADA price in the quotation builder configuration in the database and logs the change if applicable.
 * - If an error occurs during the update process, responds with a 500 status and an error message.
 * - If the specified source is not found, responds with a 404 status and an error message.
 */

  async updateQuotationBuilderADAprice(req, res) {
    // Validate the input data
    const v = new Validator(
      req.body,
      {
        ADA_price: "required|numeric|min:1",
      }
    );

  // Custom validation to check if ADA_price contains spaces
  v.addPostRule(async (provider) => {
    if (provider.inputs.ADA_price && provider.inputs.ADA_price.includes(" ")) {
      provider.error("ADA_price", "spaces", "ADA price cannot contain spaces.");
    }
  });
    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      try {
        const updateData = {};
        updateData[`config.ADA_price`] = req.body.ADA_price;

        const foundData = await Setting.findOne({
          _id: req.params.id,
          step: "quotation_builder"
        });
        
        if (foundData) {
          foundData.set(updateData); // Update fields using the updateData object
           // Log the change if changeLog is enabled in the schema
        if (Setting.schema.changeLog) {
              const accountLog = new AccountLog();
              const message = `ADA price`;
              await accountLog.saveLog("updated", foundData, req.user, message); // Log the change
          }
          await foundData.save();
          res.status(200).json({
            status: true,
            message: "Quotation builder ADA price updated successfully.",
          });
          return;
        }else{
          res.status(404).json({
            status: true,
            message: "Source not found."
        });
        return; // Exit function
        }

      } catch (error) {
        // If an error occurs, respond with a 500 status and an error message
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }

  async updateMaterialInstallationQuote(req, res){
 // Setup validation rules
 const v = new Validator(req.files, {
  file: 'required|mime:pdf', // 'required' ensures the file is uploaded, 'fileType:pdf' ensures the file is a PDF
});

// Validate the request
const matched = await v.check();

// If validation fails, return the error message
if (!matched) {
   res.status(400).json({
    status: false,
    message: v.errors, // returns the validation errors
  });
  return;
} else {
  try {
    if (!_.isEmpty(req.files)) {
      const uploaded_file = await file_uploader.upload(req.files, 'pdf');
    if (!uploaded_file.status) {
      return res.status(200).json({
        status: false,
        message: uploaded_file.trace,
      });
    }
    const config = {
      file: uploaded_file.files.file,
    };
    req.body.config = config;
    // Attempt to update the label using the inherited update method
    const result = await super.update(req);

    // Respond with a 200 status and the result
    res.status(200).json(result);
    }
  } catch (error) {
    // If an error occurs, respond with a 500 status and an error message
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
}
  }

  async updateInstallationSetup(req, res) {
    // Validate the input data
    const v = new Validator(
      req.body,
      {
        material_types: "required|array",
        "material_types.*": "required|object",
        charge_per_stalls: "required|numeric",
        charge_per_screens: "required|numeric",
        charge_per_mile: "required|numeric",
        max_distance_limit: "required|numeric",
        charge_per_hotel_night: "required|numeric",
        charge_per_diem: "required|numeric"
      },
      {
        "material_types.required": "The material types field is mandatory.",
      }
    );

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      try {
        const config = {
          material_types: req.body.material_types,
          charge_per_stalls: req.body.charge_per_stalls,
          charge_per_screens: req.body.charge_per_screens,
          charge_per_mile: req.body.charge_per_mile,
          max_distance_limit: req.body.max_distance_limit,
          charge_per_hotel_night: req.body.charge_per_hotel_night,
          charge_per_diem: req.body.charge_per_diem
        };
        delete req.body.material_types;
        delete req.body.charge_per_stalls;
        delete req.body.charge_per_screens;
        delete req.body.charge_per_mile;
        delete req.body.max_distance_limit;
        delete req.body.charge_per_hotel_night;
        delete req.body.charge_per_diem;
        req.body.config = config;
        // Attempt to update the label using the inherited update method
        const result = await super.update(req);

        // Respond with a 200 status and the result
        res.status(200).json(result);
      } catch (error) {
        // If an error occurs, respond with a 500 status and an error message
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }
}

module.exports = SettingsController;
