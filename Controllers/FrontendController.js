const Setting = require("../Models/Setting.js");

const { Validator } = require("node-input-validator");

class FrontendController {
    async view(req,res){
    // Validate the input data
    const v = new Validator(req.query, {
        step: 'required|in:project,layout,measurement,quotation_builder',
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
        const { step } = req.query;
        try {
          const data = await Setting.findOne(
            { step: step },
            { step: 1, config: 1, _id: 1 }
          );
          res.status(200).json({
            status: true,
            data: data,
          });
        } catch (error) {
          res.status(500).json({
            status: false,
            message: error.message,
            encrypted:encryptedToken
          });
        }
    }
}



}

module.exports = FrontendController;
