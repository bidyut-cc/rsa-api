const FrontendController = require('../Controllers/FrontendController'); // Adjust path as needed
const quotationController = new FrontendController();
const email_helper = require("../Helpers/Sendmail.js");
const Quotation = require("../Models/Quotation.js");
const Emailtemplate = require('../Models/Emailtemplate.js');
const Setting = require("../Models/Setting.js");
const fs = require('fs');
const path = require('path');

module.exports = (agenda) => {
  agenda.define(
    "send_quotation_email",
    { shouldSaveResult: true },
    async (job) => {
      const { quotationId } = job.attrs.data;
      const maxRetries = 4;
      const retryDelay = 10 * 1000; // 10 seconds

      try {
        const quotation = await Quotation.findOne(
          { _id: quotationId },
          { submittedData: 1, email:1, roomData: 1, materials: 1, _id: 1, quotation_no: 1, phone_number: 1, createdAt: 1,is_mail_send:1 }
        );

        const totalStalls = quotation.submittedData.rooms.reduce(
          (sum, room) => sum + (room.stall?.noOfStalls || 0),
          0
        );

        const totalUrinalScreens = quotation.submittedData.rooms.reduce(
          (sum, room) => sum + (room.hasUrinalScreens ? (room.urinalScreen?.noOfUrinalScreens || 0) : 0),
          0
        );

        const htmlContent = await quotationController.QuotationPDFhtml(
          quotation._id,
          quotation.quotation_no,
          quotation.createdAt,
          quotation.phone_number,
          quotation.materials,
          quotation.submittedData.rooms,
          totalStalls,
          totalUrinalScreens
        );

        const pdfBuffer = await quotationController.generatePDF(htmlContent);

        let body = '';
        const isAnyMaterialQuoteTrue = quotation.submittedData.rooms.some(room => room.materialQuote === "true");
        const templateCode = isAnyMaterialQuoteTrue ? "QUOTATION_YES" : "QUOTATION_NO";

        const email_verification_template = await Emailtemplate.findOne({ code: templateCode }).exec();
        var template = email_verification_template.template;
        body = template.replace("{{name}}", `${quotation.submittedData.first_name} ${quotation.submittedData.last_name}`)
        .replace("{{quotation_no}}", `${quotation.quotation_no}`);

        let emails = [quotation.email, process.env.QUOTATION_EMAIL];

        // Email attachments
        const attachments = [
          {
            content: Buffer.from(pdfBuffer), // Directly use the buffer
            filename: `Quotation-${quotation.quotation_no}.pdf`, // Set file name
            type: 'application/pdf', // Set MIME type
            disposition: 'attachment', // Disposition type
          },
        ];

        await email_helper.sendEmail(
          {
            receivers: emails,
            subject: `Restroom Stalls & All Quotation #${quotation.quotation_no}`,
            context: { body_content: body },
          },
          attachments
        );

        if (quotation) {
          // Update the phone_number
          quotation.is_mail_send = true;
          await quotation.save(); // Save the updated document
        }

       // console.log(`Email successfully sent for quotation ID: ${quotationId}`);

        job.attrs.result = {
          status: "success",
          message: "Quotation Email sent successfully",
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
