const Controller = require("./Controller.js");
const Emailtemplate = require("../Models/Emailtemplate");
const { response } = require("../Helpers/Uploader.js");
const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
require("dotenv").config();
const email_helper = require("../Helpers/Sendmail");
const { Validator } = require('node-input-validator');
require('../Helpers/extend-node-input-validator');

class UsersController extends Controller {
    constructor() {
        super("User");
    }

    /**
     * To get user list
     *
     * @param {object} req
     * @return {json} 
     */
    
    // async getListQuery(req) {
    //     var trash = req.query.trash || false;
    //     var limit = req.query.show || 500000;
    //     var page = req.query.page || 1;
    //     var offset = (parseInt(page) - 1) * parseInt(limit);
    //     var search = req.query.search || "";
    //     var sort_field = req.query.sort || "_id";
    //     var sort_order = req.query.sort_order || "desc";
    //     var where_clause = req.query.where_clause
    //         ? JSON.parse(req.query.where_clause)
    //         : {
    //               where_fields: [],
    //               where_values: [],
    //           };
    //     sort_order = sort_order == "asc" ? 1 : -1;
    //     var fields = this.getModelObj().schema.customFields;
    //     let select_fields = Object.keys(fields);
    //     let search_fields = select_fields.filter((item) => {
    //         if (fields[item]["searchable"]) return item;
    //     });
    //     var sort_order_obj = { [sort_field]: sort_order };
    //     let search_query = {};
    //     if (search.length > 0) {
    //         var search_arr = [];
    //         for (var field of search_fields) {
    //             search_arr.push({
    //                 [field]: {
    //                     $regex: search,
    //                     $options: "i",
    //                 },
    //             });
    //         }
    //         search_query = { $or: search_arr };
    //     }

    //     let find_query = {};
    //     for (
    //         var field_key = 0;
    //         field_key < where_clause.where_fields.length;
    //         field_key++
    //     ) {
    //         find_query[where_clause.where_fields[field_key]] =
    //             where_clause.where_values[field_key];
    //     }
    //     if (!_.isEmpty(find_query)) {
    //         if (!_.isEmpty(search_query)) {
    //             var new_search_query = {
    //                 $and: [find_query, search_query],
    //             };
    //         } else {
    //             var new_search_query = {
    //                 $and: [find_query],
    //             };
    //         }

    //         search_query = new_search_query;
    //     }
    //     return {
    //         search: search_query,
    //         select: select_fields.join(" "),
    //         limit: parseInt(limit),
    //         skip: parseInt(offset),
    //         sort: sort_order_obj,
    //         current_page: page,
    //         per_page: limit,
    //         trash: trash,
    //     };
    // }

    /**
     * To add a user 
     *
     * @param {object} req
     * @return {json} 
     */
    async save(req,res) {
        const v = new Validator(req.body, {
            first_name: 'required|string|minLength:2|maxLength:50',
            last_name: 'required|string|minLength:2|maxLength:50',
            email: 'required|unique:user,email',
            phone: 'required|phoneNumber|digits:10',
            roles: 'required|in:user,super_admin,admin,developer',
            status: 'required|in:Active,Inactive',
        },{
            'roles.required': 'The role field is mandatory.',
        });
    
        const matched = await v.check();
    
        if (!matched) {
            // If validation fails, return error messages
             res.status(422).json({
                status: false,
                errors: v.errors
            });
            return ;
        }
        try{
            let user_count_with_same_mail = await User.countDocuments({
                email: req.body.email,
            }).exec();
            if (user_count_with_same_mail > 0) {
                res.status(422).json({
                    status: false,
                    errors:{
                        'email':{
                            message: "This Email is already registered with us",
                        }
                    }
                });
                return ;
                
            }
            let user = new User;
            user.first_name = req.body.first_name;
            user.last_name = req.body.last_name;
            user.username = req.body.first_name +' '+ req.body.last_name;
            user.email = req.body.email;
            user.phone = req.body.phone;
            user.roles = [req.body.roles];
            user.status = req.body.status;
            // var email_verification_template = await Emailtemplate.findOne({
            //     code: "EMAIL_VERIFICATION",
            // }).exec();
            // if (!_.isEmpty(email_verification_template)) {
            //     let salt = await bcrypt.genSalt(10);
            //     let set_password_token = await bcrypt.hash(
            //         req.body.email,
            //         salt
            //     );
            //     var url =
            //         process.env.URI + "set-password?hash=" + set_password_token;
            //     var body = email_verification_template.template.replace(
            //         "{{url}}",
            //         url
            //     );
            //     await email_helper.sendEmail({
            //         receivers: [req.body.email],
            //         subject: email_verification_template.subject,
            //         context: { body_content: body },
            //     });
            //     user.set_password_token = set_password_token;
            // }
            await user.save();
            
            res.status(200).json({
                status: true,
                data: user,
                message: "User added successfully."
            });
            return ;
        }catch (error) {
            res.status(500).json({
                status: false,
                message: error.message,
            });
        }
     
    }

    /**
     * To update a user 
     *
     * @param {object} req
     * @return {json} 
     */
    async update(req, res) {
        // Validate the input data
        const v = new Validator(req.body, {
            first_name: 'required|string|minLength:2|maxLength:50',
            last_name: 'required|string|minLength:2|maxLength:50',
            email: 'required|email|unique:user,email,' + req.params.id,
            phone: 'required|phoneNumber|digits:10',
            roles: 'required|in:user,super_admin,admin,developer',
            status: 'required|in:Active,Inactive',
        },{
            'roles.required': 'The role field is mandatory.',
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


    async delete(req, res) {
        // Validate the input data
        const v = new Validator(req.body, {
            ids: 'required|array', // ids is required and should be an array
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
                // Attempt to delete the item(s) using the inherited delete method
                const result = await super.delete(req);
                // Respond with a 200 status and the result
                res.status(200).json(result);
            } catch (error) {
                // If an error occurs, respond with a 500 status and a server error message
                res.status(500).json({
                    status: false,
                    message: "Server error."
                });
            }
        }
    }
}

module.exports = UsersController;
