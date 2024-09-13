const Controller = require("./Controller.js");
const Emailtemplate = require("../Models/Emailtemplate");
const { response } = require("../Helpers/Uploader.js");
const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
require("dotenv").config();
const email_helper = require("../Helpers/Sendmail");

class UsersController extends Controller {
    constructor() {
        super("User");
    }

   
  

    /**
     * To add a user 
     *
     * @param {object} req
     * @return {json} 
     */
    async save(req) {
        let user_count_with_same_mail = await User.countDocuments({
            email: req.body.email,
        }).exec();
        if (user_count_with_same_mail > 0) {
            return {
                status: false,
                message: "This Email is already registered with us",
            };
        }
        let user = new User;
        user.username = req.body.username;
        user.email = req.body.email;
        user.active = !!req.body.active;
        user.roles = ['developer'];
        var email_verification_template = await Emailtemplate.findOne({
            code: "EMAIL_VERIFICATION",
        }).exec();
        if (!_.isEmpty(email_verification_template)) {
            let salt = await bcrypt.genSalt(10);
            let set_password_token = await bcrypt.hash(
                req.body.email,
                salt
            );
            var url =
                process.env.URI + "set-password?hash=" + set_password_token;
            var body = email_verification_template.template.replace(
                "{{url}}",
                url
            );
            await email_helper.sendEmail({
                receivers: [req.body.email],
                subject: email_verification_template.subject,
                context: { body_content: body },
            });
            user.set_password_token = set_password_token;
        }
        await user.save();
        return  {
            status: true,
            message: "Insertion successful",
            object: user,
        };
    }

    /**
     * To update a user 
     *
     * @param {object} req
     * @return {json} 
     */
    async update(req) {
        if(req.body.active){
            let obj = await User.findById(
                req.params.id
            ).exec();
            obj.active = !!req.body.active;
            await obj.save();
        }
        return await super.update(req);
    }
}

module.exports = UsersController;
