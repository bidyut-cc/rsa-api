const Setting = require("../Models/Setting.js");
const Controller = require("./Controller.js");

const { Validator } = require("node-input-validator");
const _ = require("lodash");

class SettingsController extends Controller {
  constructor() {
    super("Setting");
  }
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
  async updateProject(req, res) {
    // Validate the input data
    const v = new Validator(req.body, {
      maximum_number_of_stalls: "required|integer|min:1|max:10",
      maximum_number_of_urinal_screens: "required|integer|min:1|max:10",
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
          maximum_room_no: req.body.maximum_room_no,
        };
        delete req.body.swings;
        delete req.body.maximum_room_no;
        delete req.body.ada_stall_min_width;
        delete req.body.ada_stall_max_width;
        delete req.body.standard_stall_min_width;
        delete req.body.standard_stall_max_width;
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

  //  async updateQuotationBuilder1(req, res) {
  //     // Extract type from request body
  //     const { type, result } = req.body;

  //     // Define validation rules based on the type
  //     let validationRules = {
  //         result: 'required|object', // Check for result object
  //     };

  //     // Add specific rules based on the type
  //     switch (type) {
  //         case 'IC':
  //             validationRules['result.IC'] = 'required|object'; // Check for IC object
  //           //  validationRules['result.IC.*'] = 'required|array'; // Ensure each item in IC is an array
  //             break;
  //         case 'BW':
  //             validationRules['result.BW'] = 'required|object'; // Check for BW object
  //            // validationRules['result.BW.*'] = 'required|array'; // Ensure each item in BW is an array
  //             break;
  //         case 'ALIC':
  //             validationRules['result.ALIC'] = 'required|object'; // Check for ALIC object
  //            // validationRules['result.ALIC.*'] = 'required|array'; // Ensure each item in ALIC is an array
  //             break;
  //         case 'ALBW':
  //             validationRules['result.ALBW'] = 'required|object'; // Check for ALBW object
  //          //   validationRules['result.ALBW.*'] = 'required|array'; // Ensure each item in ALBW is an array
  //             break;
  //         default:
  //             return res.status(422).json({
  //                 status: false,
  //                 message: 'Invalid type provided.',
  //             });
  //     }

  //     // Define custom messages for each validation rule
  //     const customMessages = {
  //         'result.IC.*': 'The IC field is required.',
  //         'result.BW.*': 'The BW field is required.',
  //         'result.ALIC.*': 'The ALIC field is required.',
  //         'result.ALBW.*': 'The ALBW field is required.',
  //     };

  //     // Initialize validator with dynamic rules and custom messages
  //     const v = new Validator(req.body, validationRules, customMessages);

  //     // Check if validation passes
  //     const matched = await v.check();
  //     if (!matched) {
  //         // If validation fails, respond with a 422 status and the validation errors

  //         res.status(422).json({
  //             status: false,
  //             errors: v.errors,
  //         });
  //         return;
  //     }

  //     try {
  //         console.log(type);
  //          // Prepare the update object dynamically
  //   const update = {
  //     $set: {}
  //   };

  //   let basePath = '';

  //   if (type === 'IC') {
  //     basePath = 'config.IC';
  //   } else if (type === 'BW') {
  //     basePath = 'config.BW';
  //   } else if (type === 'ALIC') {
  //     basePath = 'config.ALIC';
  //   } else if (type === 'ALBW') {
  //     basePath = 'config.ALBW';
  //   }

  //     // Check if basePath was set
  //     if (basePath) {
  //         // Loop through the result based on the type and update dynamically
  //         for (const key in result[type]) {
  //           if (result[type].hasOwnProperty(key)) {
  //             const path = `${basePath}.${key}`; // Construct the full path
  //             update.$set[path] = result[type][key]; // Set the update value
  //           }
  //         }
  //       }
  //         if (basePath!='') {
  //             const updateResult = await Setting.updateOne(
  //             { "step": "quotation_builder" }, // Add additional criteria as needed
  //             update
  //           );

  //         res.status(200).json({
  //             status: true,
  //             message: 'Quotation updated successfully',
  //             result: update
  //         });
  //         }else{
  //             res.status(422).json({
  //                 status: false,
  //                 message: 'No valid type provided for update.',
  //             });
  //             return;
  //         }

  //     } catch (error) {
  //         // If an error occurs, respond with a 500 status and an error message
  //          res.status(500).json({
  //             status: false,
  //             message: error.message,
  //         });
  //         return
  //     }
  // }

  // async updateQuotationBuilder(req, res) {
  //     const { type, result } = req.body;

  //     // Define validation rules based on the type
  //     let validationRules = {
  //         result: 'required|object', // Ensure result is an object
  //     };

  //     // Add specific rules based on the type
  //     switch (type) {
  //         case 'IC':
  //             validationRules['result.IC'] = 'required|object';
  //           //  validationRules['result.IC.*'] = 'required|array'; // Ensure each key in IC is an array
  //             break;
  //         case 'BW':
  //             validationRules['result.BW'] = 'required|object';
  //           //  validationRules['result.BW.*'] = 'required|array';
  //             break;
  //         case 'ALIC':
  //             validationRules['result.ALIC'] = 'required|object';
  //            // validationRules['result.ALIC.*'] = 'required|array';
  //             break;
  //         case 'ALBW':
  //             validationRules['result.ALBW'] = 'required|object';
  //            // validationRules['result.ALBW.*'] = 'required|array';
  //             break;
  //         default:
  //              res.status(422).json({
  //                 status: false,
  //                 message: 'Invalid type provided.',
  //             });
  //             return;
  //     }

  //     // Custom error messages
  //     const customMessages = {
  //         'result.IC.*': 'Each IC field is required and should be an array.',
  //         'result.BW.*': 'Each BW field is required and should be an array.',
  //         'result.ALIC.*': 'Each ALIC field is required and should be an array.',
  //         'result.ALBW.*': 'Each ALBW field is required and should be an array.',
  //     };

  //     // Initialize validator
  //     const v = new Validator(req.body, validationRules, customMessages);

  //     // Validate the request
  //     const matched = await v.check();
  //     if (!matched) {
  //          res.status(422).json({
  //             status: false,
  //             errors: v.errors,
  //         });
  //         return;
  //     }

  //     try {
  //         // Prepare the update object dynamically
  //         const update = { $set: {} };

  //         // Base path for the database update
  //         let basePath = '';
  //         if (type === 'IC') {
  //             basePath = 'config.IC';
  //         } else if (type === 'BW') {
  //             basePath = 'config.BW';
  //         } else if (type === 'ALIC') {
  //             basePath = 'config.ALIC';
  //         } else if (type === 'ALBW') {
  //             basePath = 'config.ALBW';
  //         }

  //         // Ensure basePath is valid
  //         if (!basePath) {
  //              res.status(422).json({
  //                 status: false,
  //                 message: 'No valid type provided for update.',
  //             });
  //             return;
  //         }

  //         // Ensure result[type] exists and is an object
  //         if (!result[type] || typeof result[type] !== 'object') {
  //              res.status(422).json({
  //                 status: false,
  //                 message: `The result for type ${type} is invalid.`,
  //             });
  //             return;
  //         }

  //         // Dynamically loop through the result and build the update object
  //         for (const key in result[type]) {
  //             if (result[type].hasOwnProperty(key)) {
  //                 const path = `${basePath}.${key}`;
  //                 update.$set[path] = result[type][key];
  //             }
  //         }
  //         // Perform the database update
  //         const updateResult = await Setting.updateOne(
  //             { "step": "quotation_builder" },
  //             update
  //         );

  //         res.status(200).json({
  //             status: true,
  //             message: 'Quotation updated successfully',
  //             result: updateResult, // Include the result of the update
  //         });
  //         return;

  //     } catch (error) {
  //         // Handle any errors
  //          res.status(500).json({
  //             status: false,
  //             message: error.message,
  //         });
  //         return;
  //     }
  // }

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

      const updateResult = await Setting.updateOne(
        { step: "quotation_builder" },
        { $set: updateData }
      );
      // Perform your update logic here...
      res.status(200).json({
        status: true,
        message: "Quotation builder updated successfully.",
      });
      return;
    } catch (error) {
      // Handle any error during the update process
      res.status(500).json({
        status: false,
        message: error.message,
      });
      return;
    }
  }
}

module.exports = SettingsController;
