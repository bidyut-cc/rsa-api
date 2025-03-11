const FrontendController = require("../Controllers/FrontendController"); // Adjust path as needed
const quotationController = new FrontendController();
const Quotation = require("../Models/Quotation.js");

module.exports = (agenda) => {
  agenda.define(
    "create_zendesk_lead",
    { shouldSaveResult: true },
    async (job, done) => {
      const { quotationId } = job.attrs.data;
      const maxRetries = 4;
      const retryDelay = 10 * 1000; // 10 seconds

      try {
        const quotation = await Quotation.findOne(
          { _id: quotationId },
          { submittedData: 1, project_name:1, roomData: 1, materials: 1, _id: 1, quotation_no: 1, phone_number: 1, createdAt: 1 }
        );

        if (!quotation) {
          throw new Error(`Quotation not found for ID: ${quotationId}`);
        }
        const isAnyMaterialQuoteTrue = quotation.submittedData.rooms.some(room => room.materialQuote === "true");
        const contactData = {
          first_name: quotation.submittedData.first_name,
          last_name: quotation.submittedData.last_name,
          email: quotation.submittedData.email,
          phone: quotation.submittedData.phone_number,
        };

         const contact_id = await quotationController.checkEmailAndCreateContact(contactData);
       // const contact_id = 223; // Placeholder ID

        const materialDetailsString = quotation.materials
          .map((material) => `${material.name}: $${material.price}`)
          .join("\n"); // Use newline character for each item

        const dealData = {
          data: {
            name: `${contactData.first_name} ${contactData.last_name}`,
            value: await quotationController.getSmallestOuterPrice(quotation.materials),
            hot: true,
            contact_id: contact_id,
            stage_id: Number(process.env.ZENDESK_DEAL_INITIAL_STAGE_ID),
            tags: ["important"],
            custom_fields: {
              "Document URL": `${process.env.QUOTATION_GENERATE_URL}?id=${quotation._id}`,
              "Room Details": await quotationController.formatAllRoomsData(quotation.submittedData.rooms),
              "Material Details": materialDetailsString,
              "Quote Number":`#${quotation.quotation_no}`,
              "Project Name": quotation.project_name && quotation.project_name.trim() !== "" ? quotation.project_name : "NA",
              "Installation Services":isAnyMaterialQuoteTrue ? "Yes" : "No",
              "Color": "No color selected",
            },
          },
          meta: {
            type: "deal",
          },
        };

       // console.log("Creating Zendesk deal:", dealData);

        // Create deal in Zendesk
        const deal = await quotationController.createDeal(dealData);
      //  const deal = {
      //   id:12234
      //  }

        if (deal?.id) {
          // Update zendesk_ticket_id in Quotation model
          await Quotation.updateOne(
            { _id: quotationId },
            { $set: { zendesk_ticket_id: deal.id , is_deal_create:true} }
          );

        //  console.log(`Updated zendesk_ticket_id for quotation ${quotationId} with ${deal.id}`);
          job.attrs.result = { success: true, message: "Deal created successfully", dealId: deal.id };
          await job.save();
          return done(); // Job successful
        } else {
          throw new Error("Failed to create Zendesk deal, deal ID not returned.");
        }
      } catch (error) {
        let failCount = job.attrs.failCount || 0;
        failCount += 1;
        job.attrs.failCount = failCount; // Store failCount in DB

        // Save error details
        job.attrs.result = {
          status: "failed",
          message: `Zendesk lead creation failed for quotation ID: ${quotationId}`,
          error: error.message,
          stack: error.stack, // Save stack trace for debugging
          attempt: failCount,
        };

        await job.save(); // Save the updated job details

       // console.error(`Job failed for Quotation ID: ${quotationId}. Attempt: ${failCount}/${maxRetries}`);

        if (failCount < maxRetries) {
          console.log(`Retrying in ${retryDelay / 1000} seconds... (Attempt ${failCount}/${maxRetries})`);
          job.attrs.nextRunAt = new Date(Date.now() + retryDelay); // Reschedule after delay
          await job.save();
        } else {
          console.error(`Job failed after ${maxRetries} attempts.`);
          return done(error); // Mark job as failed
        }
      }
    }
  );
};
