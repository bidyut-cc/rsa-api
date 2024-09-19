const Setting = require("../Models/Setting.js");
const Controller = require("./Controller.js");

const { Validator } = require('node-input-validator');

class SettingsController extends Controller {
    constructor() {
        super("Setting");
    }
    async view(req,res) {
        const {step} = req.query;
        try {
            const data = await Setting.findOne({ step: step }, { step: 1, config: 1, _id: 1 });
            return data;
          } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message,
            });
          }
    }
    async updateStep1(req,res) {
        // Validate the input data
        const v = new Validator(req.body, {
            show_number_of_stall: 'required|integer|min:1|max:10',
            show_number_of_urinal: 'required|integer|min:1|max:10',
            interested_for_material_installation_quote: 'required|in:Yes,No',
        });

        // Check if validation passes
        const matched = await v.check();
        if (!matched) {
            // If validation fails, respond with a 422 status and the validation errors
            res.status(422).json({
                status: false,
                errors: v.errors
            });
        } else {
            try {
                const config = {
                    show_number_of_stall:req.body.show_number_of_stall,
                    show_number_of_urinal:req.body.show_number_of_urinal,
                    interested_for_material_installation_quote:req.body.interested_for_material_installation_quote
                }
                delete(req.body.show_number_of_stall)
                delete(req.body.show_number_of_urinal)
                delete(req.body.interested_for_material_installation_quote)
                req.body.config=config;
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

    async updateStep2(req,res) {
        // Validate the input data
        const v = new Validator(req.body, {
            layouts: 'required|array',
            'layouts.*': 'required|object',
            is_include_handicap_accessible_stall: 'required|in:Yes,No',
        });

        // Check if validation passes
        const matched = await v.check();
        if (!matched) {
            // If validation fails, respond with a 422 status and the validation errors
            res.status(422).json({
                status: false,
                errors: v.errors
            });
        } else {
            try {
                const config = {
                    layouts:req.body.layouts,
                    is_include_handicap_accessible_stall:req.body.is_include_handicap_accessible_stall
                }
                delete(req.body.layouts)
                delete(req.body.is_include_handicap_accessible_stall)
                req.body.config=config;
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

    async updateStep3(req,res) {
        // Validate the input data
        const v = new Validator(req.body, {
            swings: 'required|array',
            'swings.*': 'required|object',
            show_maximum_room_no: 'required|integer|min:1|max:5',
        },{
            'swings.required': 'The door swings field is mandatory.',
        });

        // Check if validation passes
        const matched = await v.check();
        if (!matched) {
            // If validation fails, respond with a 422 status and the validation errors
            res.status(422).json({
                status: false,
                errors: v.errors
            });
        } else {
            try {
                const config = {
                    swings:req.body.swings,
                    show_maximum_room_no:req.body.show_maximum_room_no
                }
                delete(req.body.swings)
                delete(req.body.show_maximum_room_no)
                req.body.config=config;
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
