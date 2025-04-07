/**
 * @description Module to send Email via Mandrill
 * @author CodeClouds
 */

const mailchimpClient = require("@mailchimp/mailchimp_transactional")(process.env.USER_PASSWORD);

class Sendmail {
    constructor() {
        this.sendEmail = this.sendEmail.bind(this);
        this.fetchRecieverString = this.fetchRecieverString.bind(this);
    }

    /**
     * Convert array of recipients to a string (Not needed for Mandrill but kept for consistency)
     * @param {array} reciever_arr
     * @return {array} 
     */
    fetchRecieverString(reciever_arr) {
        return reciever_arr.map(email => ({
            email,
            type: "to", // Always set "to" for all recipients
        }));
    }
    

    /**
     * To send an email via Mandrill
     * @param {object} options
     * @param {array} attachments
     * @return {Promise<object>} 
     */
    async sendEmail(options, attachments = []) {
        try {
            const message = {
                from_email: process.env.FROM_MAIL,
                to: this.fetchRecieverString(options.receivers),
                subject: options.subject,
                text: "This is a fallback text version",
                html: options.context.body_content, // Assuming HTML body from context
            };

            // Add attachments if available
            if (attachments.length > 0) {
                message.attachments = attachments;
            }

            const response = await mailchimpClient.messages.send({ message });

            return {
                status: true,
                message: "Email sent successfully",
                response: response,
            };
        } catch (error) {
            console.error("Error sending email:", error);
            return {
                status: false,
                message: error.message || "Failed to send email",
            };
        }
    }
}

module.exports = new Sendmail();
