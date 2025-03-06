const FrontendController = require('../Controllers/FrontendController'); // Adjust path as needed
const quotationController = new FrontendController();
const email_helper = require("../Helpers/Sendmail.js");
const Quotation = require("../Models/Quotation.js");
const Emailtemplate = require('../Models/Emailtemplate.js');
const Setting = require("../Models/Setting.js");
const fs = require('fs');
const path = require('path');
const Order = require('../Models/Order');

module.exports = (agenda) => {
  agenda.define(
    "send_order_email",
    { shouldSaveResult: true },
    async (job) => {
      const { quotationId, bigcommerceOrderId, orderId, color } = job.attrs.data;
      const maxRetries = 4;
      const retryDelay = 10 * 1000; // 10 seconds

      try {
        const quotation = await Quotation.findOne(
          { _id: quotationId },
          { submittedData: 1, email:1, roomData: 1, materials: 1, _id: 1, quotation_no: 1, phone_number: 1, createdAt: 1,is_mail_send:1,zendesk_ticket_id:1 }
        );
        const order = await Order.findOne({ _id: orderId });
        const matchedMaterials = quotation.materials.filter(material => material.id === Number(order.material_id));
        const htmlContent = await quotationController.OrderPDFhtml(
            bigcommerceOrderId,
            order.amount,
            color,
            quotation.createdAt,
            matchedMaterials,
            quotation.submittedData.rooms,
            order.billing_address
            );
         
            const pdfBuffer = await quotationController.generatePDF(htmlContent); // Ensure this is called correctly
            var email_verification_template = await Emailtemplate.findOne({
              code: "ORDER",
          }).exec();
          var template = email_verification_template.template;
          let body = template.replace("{{name}}", `${order.first_name +' '+order.last_name}`);
          if (email_verification_template) {
            let emails=[quotation.email,process.env.ORDER_EMAIL];
              // Email attachments
              const attachments = [
                {
                  content: Buffer.from(pdfBuffer), // Directly use the buffer
                  filename: `Order-${quotation.quotation_no}.pdf`,            // Set file name
                  type: 'application/pdf',              // Set MIME type
                  disposition: 'attachment',            // Disposition type
                },
              ];
              await email_helper.sendEmail({
                receivers: emails,
                subject: `Restroom Stalls & All Order #${quotation.quotation_no}`,
                context: { body_content: body },
              },attachments);
             

          }
          const dealData = await quotationController.updateDeal(quotation.zendesk_ticket_id,color);
       // console.log(`Email successfully sent for order ID: ${orderId}`);

        job.attrs.result = {
          status: "success",
          message: "Order Email sent successfully",
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
          message: `Email sending failed for quotation ID: ${quotationId}`,
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
