const FrontendController = require('../Controllers/FrontendController'); // Adjust path as needed
const quotationController = new FrontendController();
const email_helper = require("../Helpers/Mandrill.js");
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

        // **Customer Email**
        const isAnyMaterialQuoteTrue = quotation.submittedData.rooms.some(room => room.materialQuote === "true");
        const templateCode = isAnyMaterialQuoteTrue ? "QUOTATION_YES" : "QUOTATION_NO";

        const customerTemplate = await Emailtemplate.findOne({ code: templateCode }).exec();
        var customerEmailBody = customerTemplate.template;
        customerEmailBody = customerEmailBody.replace("{{name}}", `${quotation.submittedData.first_name} ${quotation.submittedData.last_name}`)
        .replace("{{quotation_no}}", `${quotation.quotation_no}`);
        let customersEmails = [quotation.email];

        // **Admin Email**
        const adminTemplate = await Emailtemplate.findOne({ code: "QUOTATION_ADMIN" }).exec();
        var adminEmailBody = adminTemplate.template;
        adminEmailBody = adminEmailBody
          .replace("{{project_name}}", quotation.submittedData.project_name && quotation.submittedData.project_name.trim() !== '' ? quotation.submittedData.project_name : "NA")
          .replace("{{first_name}}", quotation.submittedData.first_name || "NA")
          .replace("{{last_name}}", quotation.submittedData.last_name || "NA")
          .replace("{{email}}", quotation.email || "NA")
          .replace("{{phone_number}}", quotation.phone_number || "NA")
          .replace("{{installation_services}}", isAnyMaterialQuoteTrue ? "Yes" : "No");

         let adminEmails = [process.env.QUOTATION_EMAIL];

       

        // Email attachments
        const attachments = [
          {
            type: "application/pdf", // MIME type for PDF
            name: `Quote-${quotation.quotation_no}.pdf`, // File name
            content: Buffer.from(pdfBuffer).toString("base64"), // Base64 encoded content
          },
        ];
        // **Send Customer Email**
        await email_helper.sendEmail(
          {
            receivers: customersEmails,
            subject: `Restroom Stalls & All Quote #${quotation.quotation_no}`,
            context: { body_content: customerEmailBody },
          },
          attachments
        );


        // **Send Admin Email**
        await email_helper.sendEmail(
          {
            receivers: adminEmails,
            subject: `Restroom Stalls & All Quote - #${quotation.quotation_no}`,
            context: { body_content: adminEmailBody },
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
