
const email_helper = require("../Helpers/Mandrill.js");
const AbandonedOrder = require("../Models/AbandonedOrder");
const Emailtemplate = require('../Models/Emailtemplate.js');
const Order = require('../Models/Order');

module.exports = (agenda) => {
  agenda.define(
    "send_abandoned_order_mail",
    { shouldSaveResult: true },
    async (job) => {
      const { cartId,cart_amount} = job.attrs.data;
      const maxRetries = 4;
      const retryDelay = 10 * 1000; // 10 seconds

      try {
        const order = await Order.findOne(
            { cart_id: cartId },
            { first_name: 1, last_name: 1, email: 1, phone_number: 1 }
          ).sort({ _id: -1 }); // or .sort({ _id: -1 })
          
            var email_verification_template = await Emailtemplate.findOne({
              code: "ABANDONED_ORDER",
          }).exec();
          var body = email_verification_template.template;
          body = body
            .replace("{{name}}",`${order.first_name +' '+order.last_name}`)
            .replace("{{email}}", order.email || "NA")
            .replace("{{phone_number}}",order.phone_number || "NA")
            .replace("{{cart_amount}}",`$${cart_amount}` || "NA");
          if (email_verification_template) {
            let emails=[process.env.ORDER_EMAIL];
              // Email attachments
              const attachments = [];
              await email_helper.sendEmail({
                receivers: emails,
                subject: `Abandoned Order`,
                context: { body_content: body },
              },attachments);
          }

          await AbandonedOrder.findOneAndUpdate(
            { cart_id: cartId },
            { $set: { is_mail_send: true } }
          );

          await Order.updateMany(
            { cart_id: cartId },
            { $set: { is_abandoned_mail_send: true } }
          );
        job.attrs.result = {
          status: "success",
          message: "Abandoned Order Email sent successfully",
        };
        await job.save(); // Save job result in DB
      } catch (error) {
       // console.error(error);
        let failCount = job.attrs.failCount || 0;
        failCount += 1;
        job.attrs.failCount = failCount; // Store failCount in DB

        // Save error details
        job.attrs.result = {
          status: "failed",
          message: `Email sending failed for quotation ID: ${cartId}`,
          error: error.message,
          stack: error.stack, // Save stack trace for debugging
          attempt: failCount,
        };

        await job.save(); // Save the updated job details

      //  console.error(`Email Failed for Quotation ID: ${quotationId}. Attempt: ${failCount}`);

        if (failCount < maxRetries) {
         // console.log(`Retrying in 10 seconds... (Attempt ${failCount + 1}/${maxRetries})`);
          job.attrs.nextRunAt = new Date(Date.now() + retryDelay); // Reschedule after delay
          await job.save();
        } else {
          console.error(`Job Failed After ${maxRetries} Attempts.`);
        }
      }
    }
  );
};
