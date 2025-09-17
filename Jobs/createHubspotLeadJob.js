const FrontendController = require("../Controllers/FrontendController"); // Adjust path as needed
const quotationController = new FrontendController();
const Quotation = require("../Models/Quotation.js");

module.exports = (agenda) => {
  agenda.define(
    "create_hubspot_lead",
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

      //   const contact_id = await quotationController.checkEmailAndCreateContact(contactData);
       // const contact_id = 223; // Placeholder ID


          const materialDetailsString = quotation.materials
          .map(
            (material) =>
              `${material.name}: $${Number(material.price).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}`
          )
          .join("\n");
        const amount = await quotationController.getSmallestOuterPrice(quotation.materials);
        const formattedAmount = Number(amount).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        });
        const dealData = {
          properties: {
            dealname: `#${quotation.quotation_no}`,
            amount: amount,
            dealstage: process.env.HUBSPOT_DEAL_INITIAL_STAGE, // stage id from pipeline
            pipeline: "default", // or another pipeline ID
            // Standard HubSpot properties
           // description: `Quote #: #${quotation.quotation_no}, Project: ${quotation.project_name || "NA"}`,
            // Custom properties (you need to create these in HubSpot beforehand with same internal names)
            order_total: `$${formattedAmount}`,
            document_url: `${process.env.FRONTEND_UI_URL}/create-quotation?id=${quotation._id}`,
            room_details: await quotationController.formatAllRoomsData(quotation.submittedData.rooms),
            material_details: materialDetailsString,
            quote_number: `#${quotation.quotation_no}`,
            project_name: quotation.project_name && quotation.project_name.trim() !== "" ? quotation.project_name : "NA",
            installation_services: isAnyMaterialQuoteTrue ? "Yes" : "No",
            color: "No color selected",
            hubspot_owner_id:process.env.HUBSPOT_OWNER_ID
          }
        };
 

        // Create deal in Hubspot
        const deal = await quotationController.createHubspotDeal(dealData);
     
  
        if (deal?.id) {
          await Quotation.updateOne(
            { _id: quotationId },
            { $set: { zendesk_ticket_id: deal.id , is_deal_create:true} }
          );

        
          job.attrs.result = { success: true, message: "Deal created successfully", dealId: deal.id };
          await job.save();
          return done(); // Job successful
        } else {
          throw new Error("Failed to create Hubspot deal, deal ID not returned.");
        }
      } catch (error) {
        let failCount = job.attrs.failCount || 0;
        failCount += 1;
        job.attrs.failCount = failCount; // Store failCount in DB

        // Save error details
        job.attrs.result = {
          status: "failed",
          message: `Hubspot lead creation failed for quotation ID: ${quotationId}`,
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
