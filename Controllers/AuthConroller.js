/**
 * @description All Authentication related functionalities are here in this Controller.
 * @author CodeClouds
 */


const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../Models/User");
const file_uploader = require("../Helpers/Uploader");
const _ = require("lodash");
const email_helper = require("../Helpers/Sendmail");
const Emailtemplate = require("../Models/Emailtemplate");
const { Validator } = require('node-input-validator');
require('../Helpers/extend-node-input-validator');
var base64 = require('base-64');
const AccountLog = require("../Helpers/AccountLog");
require("dotenv").config();
class AuthController {
    AuthController() {
        this.signup = this.signup.bind(this);
        this.validate = this.validate.bind(this);
    }

    /**
     * To get validation error list
     *
     * @param {object} req
     * @return {json} 
     */
    async validate(req) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
            });
        }
    }

    /**
     * User signup
     *
     * @param {object} req
     * @param {json} res
     * @return {json} 
     */
    async signup(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
            });
        }
        const {username, first_name, last_name, email, phone, password, roles } = req.body;
        try {
            let user = await User.findOne({
                email,
            });
            if (user) {
                return res.status(400).json({
                    message: "User Already Exists",
                });
            }
            user = new User({
                username,
                first_name,
                last_name,
                email,
                phone,
                password,
                roles,
            });
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();
            const payload = {
                user: {
                    id: user.id,
                },
            };
            jwt.sign(
                payload,
                process.env.JWT_SECRET_KEY,
                { expiresIn: 100000 },
                (err, token) => {
                    if (err) throw err;
                    res.status(200).json({
                        token,
                    });
                }
            );
        } catch (err) {
            console.log(err.message);
            res.status(500).json({
                status: false,
                message: "unable to save data",
            });
        }
    }

    /**
     * User signin
     *
     * @param {object} req
     * @param {json} res
     * @return {json} 
     */
    async  login(req, res) {
        // Create a new validator instance
        const v = new Validator(req.body, {
            email: 'required|email',
            password: 'required|minLength:6'
        });
    
        // Check if the validation passes
        const matched = await v.check();
        if (!matched) {
            return res.status(422).json({
                status: false,
                errors: v.errors
            });
        }
    
        const { email, password } = req.body;
    
        try {
            // Check if the user exists
            let user = await User.findOne({ email });
            if (!user) {
                return res.status(422).json({
                    status: false,
                    errors:{
                        'email':{
                            message: "This email is not registered with us."
                        }
                    }
                });
            }
    
            // Check if the password matches
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                user.attempt += 1;
                await user.save();
    
                return res.status(422).json({
                    status: false,
                    errors:{
                        'email':{
                            message: "Sorry, the credentials you entered are incorrect. Please try again."
                        }
                    }
                    
                });
            }
    
            // Check user account status
            if (user.status !== 'Active') {
                return res.status(422).json({
                    status: false,
                    errors:{
                        'email':{
                            message: "Please contact your account admin, as your account is locked."
                        }
                    }
                   
                });
            }
    
            // Check if the user has exceeded login attempts
            if (user.attempt >= 10) {
                return res.status(422).json({
                    status: false,
                    errors:{
                        'email':{
                            message: "Maximum attempt limit reached. Please contact your system admin."
                        }
                    }
                    
                });
            }
    
            // Reset attempt count
            user.attempt = 0;
    
            // Log account activity
            const accountLog = new AccountLog();
            await accountLog.saveLog("login", user, user);
    
            await user.save();
    
            // Create a JWT token
            const payload = {
                user: {
                    id: user.id
                }
            };
    
            // Sign and return JWT
            jwt.sign(
                payload,
                process.env.JWT_SECRET_KEY,
                { expiresIn: '1h' }, // Token expires in 1 hour
                (err, token) => {
                    if (err) throw err;
                    res.status(200).json({
                        status: true,
                        access_token: token,
                        data: user,
                        message: "Login Successful."
                    });
                }
            );
    
        } catch (error) {
            console.error(error.message);
            res.status(500).json({
                status: false,
                message: "Server error. Please try again later."
            });
        }
    }

    /**
     * To get user profile details
     *
     * @param {object} req
     * @param {json} res
     * @return {json} 
     */
    async profile(req, res) {
        try {
            let user = await User.findOne({
                _id: req.user._id,
            });
            res.status(200).json(user);
        } catch (e) {
            res.send({ message: "Error in Fetching user", trace: e.stack });
        }
    }

    /**
     * To update user password
     *
     * @param {object} req
     * @param {json} res
     * @return {json} 
     */
    async changePassword(req, res) {
       // Create validator instance
    const v = new Validator(req.body, {
        old_password: 'required',
        new_password: 'required|minLength:6',
        confirm_new_password: 'required|same:new_password',
    });

    const matched = await v.check();

    if (!matched) {
        // If validation fails, return error messages
        return res.status(400).json({
            status: false,
            errors: v.errors
        });
    }

    try {
        // Fetch the user by ID
        let user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found.",
            });
        }

        // Check if old password matches the one in the database
        const isMatch = await bcrypt.compare(req.body.old_password, user.password);
        if (!isMatch) {
            return res.status(422).json({
                status: false,
                errors:{
                    'old_password':{
                        message: "Wrong Old Password."
                    }
                }
            });
        }

        // Hash the new password and save it
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.new_password, salt);

        // Save the password change and log the action (if needed)
        await user.save();
        var accountLog = new AccountLog();
        await accountLog.saveLog("updated", user, req.user);

        // Send success response
        return res.status(200).json({
            status: true,
            message: "Password Changed Successfully",
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while updating the password.",
        });
    }
    }

    /**
     * To update user profile
     *
     * @param {object} req
     * @param {json} res
     * @return {json} 
     */
    async updateProfile(req, res) {
        const v = new Validator(req.body, {
            first_name: 'required',
            last_name: 'required',
            email: 'required|email|unique:user,email,'+req.user._id,
            phone: 'required|phoneNumber|digits:10'
          });
        const matched= await v.check();
        if(!matched){
            res.status(422).json({
                status: false,
                errors: v.errors
            });
          }else{
            try {
                let user = await User.findById(req.user._id);
                user.username = req.body.first_name+' '+req.body.last_name;
                user.first_name = req.body.first_name;
                user.last_name = req.body.last_name;
                user.email = req.body.email.toLowerCase();
                user.phone = req.body.phone;
                if (!_.isEmpty(req.body.enable_invoice_email)) {
                    user.enable_invoice_email = req.body.enable_invoice_email;
                    }
                if (!_.isEmpty(req.body.client_type)) {
                user.client_type = req.body.client_type;
                }
                if (!_.isEmpty(req.files)) {
                    var uploaded_file = await file_uploader.upload(req.files, "user");
                    if (!uploaded_file.status) {
                        res.status(200).json({
                            status: false,
                            message: uploaded_file.trace,
                        });
                    }
                    user.avatar = uploaded_file.files.files;
                }
                
                var accountLog = new AccountLog();
                await accountLog.saveLog("updated", user, req.user);
                await user.save();
                res.status(200).json({
                    status: true,
                    message: "Profile updated.",
                });
            } catch(error) {
                res.status(500).json({
                    message: "Server Error.",
                });
            }
        }
    }

    /**
     * To remove user profile picture
     *
     * @param {object} req
     * @param {json} res
     * @return {json} 
     */
    async removeAvatar(req, res) {
        let user = await User.findById(req.user._id);
        user.avatar = {};
        await user.save();
        res.status(200).json({
            status: true,
            message: "Avatar Removed",
        });
    }

    /**
     * To logout the user
     *
     * @param {object} req
     * @param {json} res
     * @return {json} 
     */
   async logout(req, res) {
    let user = await User.findById(req.user._id);
       
        var accountLog = new AccountLog();
        await accountLog.saveLog("saved", user, req.user);
        res.status(200).json({ status: true });
    }

    /**
     * To recover user password
     *
     * @param {object} req
     * @param {json} res
     * @return {json} 
     */
    async forgotPassword(req, res) {
        var response = {
            status: false,
            message: "Sorry! This Email is not registered with us",
        };
        let user_with_same_mail = await User.findOne({
            email: req.body.email,
        }).exec();
        if (_.isEmpty(user_with_same_mail)) {
            res.status(403).json(response);
        }
        var email_verification_template = await Emailtemplate.findOne({
            code: "FORGOT_PASSWORD",
        }).exec();
        if (!_.isEmpty(email_verification_template)) {
            let salt = await bcrypt.genSalt(10);
            let set_password_token = await bcrypt.hash(
                user_with_same_mail.email,
                salt
            );
            var url =
                process.env.URI + "set-password?hash=" + set_password_token;
            var body = email_verification_template.template.replace(
                "{{url}}",
                url
            );
            user_with_same_mail.set_password_token = set_password_token;
            await user_with_same_mail.save();
            // await email_helper.sendEmail({
            //     receivers: [user_with_same_mail.email],
            //     subject: email_verification_template.subject,
            //     context: { body_content: body },
            // });
            response.status = true;
            response.message =
                "Reset password link for your account has been sent to your email id";
            res.status(200).json(response);

        }
    }

     /**
     * To update user password
     *
     * @param {object} req
     * @param {json} res
     * @return {json} 
     */
    async setPassword(req, res){
        let user = await User.findOne({'set_password_token' : req.body.hash}).exec();
        if(!_.isEmpty(user)){
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
            user.email_verified = true;
            await user.save();
            res.status(200).json({
                status: true,
                message: 'Password saved. Please Login'
            });
        }else{
            res.status(404).json({
                status: false,
                message: 'Invalid Link'
            });
        }
    }

  
}

module.exports = AuthController;
