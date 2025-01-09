/**
 * @description Module to send Email
 * @author CodeClouds
 */

var nodemailer = require("nodemailer");
require("dotenv").config();
var hbs = require("nodemailer-express-handlebars");
var sgTransport = require('nodemailer-sendgrid-transport');
class Sendmail {
    constructor() {
        this.transporter = nodemailer.createTransport(sgTransport({
            auth: {
                api_key: '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'
            }
        }));
        this.transporter.use(
            "compile",
            hbs({
                viewEngine: {
                    extname: ".hbs", // handlebars extension
                    layoutsDir: "views/email-templates/", // location of handlebars templates
                    defaultLayout: "test", // name of main template
                    partialsDir: "views/email-templates/", // location of your subtemplates aka. header, footer etc
                },
                viewPath: "views/email-templates",
                extName: ".hbs",
            })
        );
        this.fetchRecieverString = this.fetchRecieverString.bind(this);
        this.sendEmail = this.sendEmail.bind(this);
    }

    /**
     * To convert array to string
     *
     * @param {array} reciever_arr
     * @return {string} 
     */
    fetchRecieverString(reciever_arr) {
        return reciever_arr.join(",");
    }

    /**
     * To send an email
     *
     * @param {object} options
     * @param {array} attachmets
     * @return {json} 
     */
    sendEmail(options, attachmets = []) {
        var mailOptions = {
            from: process.env.FROM_MAIL,
            to: this.fetchRecieverString(options.receivers),
            subject: options.subject,
            template: "test",
            context: options.context,
        };
        if (attachmets.length > 0) {
            mailOptions["attachments"] = attachmets;
        }

        this.transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return {
                    status: false,
                    message: error,
                };
            } else {
                return {
                    status: true,
                    message: "Email sent: " + info.response,
                };
            }
        });
    }
}

module.exports = new Sendmail();
