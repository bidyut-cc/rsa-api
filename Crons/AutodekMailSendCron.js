const cron = require("node-cron");
const axios = require("axios");
const moment = require("moment");
const mongoose = require("mongoose");
const Token = require("../Models/Token");
const Bid = require("../Models/Bid");
const MasterSetting = require("../Models/MasterSetting.js");
require("dotenv").config();

// MongoDB connection setup
const MONGO_URI = process.env.DB_URI;

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB successfully");

    // Schedule cron every minute (adjust as needed)
    const autodesk_cron_time = "0 * * * *";
    // const autodesk_cron_time = '*/30 * * * *';

    cron.schedule(
      autodesk_cron_time,
      async () => {
        try {
          // Convert last 1 day to EDT (optional, or keep UTC if API expects UTC)
          const end = moment().utc();
          const start = moment(end).subtract(1, "hours");
          const lastDayRange = `${start.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]")}..${end.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]")}`;

          console.log(lastDayRange);

          const token = await getAutodeskToken();
          let nextUrl = `/construction/buildingconnected/v2/opportunities?filter[updatedAt]=${lastDayRange}`;
          const baseUrl = "https://developer.api.autodesk.com";
          let totalInserted = 0;
          // 👇 Rate limit for HubSpot calls
          const limit = 4; // 4 per second
          const interval = 1000 / limit; // 250ms between each HubSpot call
          while (nextUrl) {
            const response = await axios.get(baseUrl + nextUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            // const opportunities = response.data.results;
            const opportunities = response.data.results.filter((oppt) =>
              moment
                .utc(oppt.createdAt)
                .isSameOrAfter("2026-07-01T00:00:00.000Z"),
            );
      
            // Remove duplicates
            const uniqueMap = new Map();

            for (const opp of opportunities) {
              const key = [
                opp.client?.company?.id || "",
                opp.client?.lead?.id || "",
                String(opp.projectSize ?? ""),
              ].join("_");

              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, opp);
              }
            }

            const uniqueOpportunities = [...uniqueMap.values()];
            if (uniqueOpportunities && uniqueOpportunities.length > 0) {
              const bulkOps = await Promise.all(
                opportunities.map(async (opp) => {
                  let clientData = opp.client;

                  // If client missing, create a demo client
                  if (
                    !clientData ||
                    !clientData?.lead ||
                    !clientData?.lead?.email ||
                    !clientData?.lead?.firstName ||
                    !clientData?.lead?.lastName
                  ) {
                    const clientNum = await getNextClientNumber();

                    clientData = {
                      company: {
                        id: `company${clientNum}`,
                        name: `Name${clientNum}`,
                      },
                      lead: {
                        id: `lead${clientNum}`,
                        email: `needtoknow${clientNum}@gmail.com`,
                        firstName: `FirstName${clientNum}`,
                        lastName: `LastName${clientNum}`,
                        phoneNumber: "NA",
                      },
                      office: {
                        id: `office${clientNum}`,
                        name: `name${clientNum}`,
                        location: {
                          country: `country${clientNum}`,
                          state: `state${clientNum}`,
                          streetName: null,
                          streetNumber: null,
                          suite: null,
                          city: `city${clientNum}`,
                          zip: null,
                          complete: `address${clientNum}`,
                          coords: {
                            lat: 44.86489599999999,
                            lng: -93.2880534,
                          },
                          precisionLevel: null,
                        },
                      },
                    };
                  }

                  const bid = {
                    opportunities_id: opp.id,
                    name: opp.name,
                    dueAt: opp.dueAt,
                    projectSize: opp.projectSize,
                    location: opp.location,
                    client: clientData,
                    tradeName: opp.tradeName,
                    deadline: opp.dueAt,
                    LinkURL: `https://app.buildingconnected.com/opportunities/${opp.id}/info`,
                    projectInformation: opp.projectInformation,
                    submissionState: opp.submissionState,
                    createdAt: new Date(opp.createdAt),
                    updatedAt: new Date(opp.updatedAt),
                  };

                  // Calculate Smart Bid Score
                  bid.smartBidScore = await calculateSmartBidScore(bid);

                  const filter = {
                    // opportunities_id: bid.opportunities_id,
                  };

                  if (bid?.client?.company?.id) {
                    filter["client.company.id"] = bid.client.company.id;
                  }

                  if (bid?.client?.lead?.id) {
                    filter["client.lead.id"] = bid.client.lead.id;
                  }

                  if (bid?.projectSize != null) {
                    filter.projectSize = String(bid.projectSize);
                  }

                  return {
                    updateOne: {
                      filter,
                      update: {
                        $setOnInsert: bid,
                      },
                      upsert: true,
                    },
                  };
                }),
              );

              const result = await Bid.bulkWrite(bulkOps);
              totalInserted += result.upsertedCount + result.modifiedCount;
              const insertedIds = Object.values(result.upsertedIds);

              const insertedBids = await Bid.find({
                _id: { $in: insertedIds },
              });
              for (const bid of insertedBids) {
                const contactData = {
                  email: bid.client?.lead?.email,
                  firstname: bid.client?.lead?.firstName,
                  lastname: bid.client?.lead?.lastName,
                  tags: "BUILDINGCONNECTED",
                };

                const canUpdateBC = bid.submissionState === "UNDECIDED";
                let submissionState = bid.submissionState;

                if (canUpdateBC) {
                  try {
                    if (bid.smartBidScore <= 15) {
                      await updateBuildingConnectedStatus(
                        bid.opportunities_id,
                        token,
                        "DECLINED",
                      );
                      submissionState = "DECLINED";
                    } else if (bid.smartBidScore >= 60) {
                      await updateBuildingConnectedStatus(
                        bid.opportunities_id,
                        token,
                        "WILL_SUBMIT",
                      );
                      submissionState = "WILL_SUBMIT";
                    }
                  } catch (err) {
                    console.error(
                      `Failed to update BuildingConnected status for ${bid.opportunities_id}:`,
                      err.message,
                    );
                    // keep going with existing submissionState, don't abort the batch
                  }
                }

                const hubspotIds = await upsertHubspotDeal(bid, contactData);

                if (hubspotIds) {
                  await Bid.updateOne(
                    { _id: bid._id },
                    {
                      $set: {
                        hubspotContactId: hubspotIds.hubspotContactId,
                        hubspotLeadId: hubspotIds.hubspotLeadId,
                        submissionState: submissionState,
                      },
                    },
                  );
                }

                await delay(interval);
              }
            } else {
              console.log("No opportunities found in this page.");
            }

            nextUrl = response.data.pagination?.nextUrl || null;

            if (!nextUrl) {
              console.log("No more pages, stopping API calls.");
              break;
            }
          }

          console.log(
            "Finished fetching all opportunities. Total inserted/updated:",
            totalInserted,
          );
        } catch (error) {
          console.error(
            "Error in cron job:",
            error.response?.data || error.message,
          );
        }
      },
      {
        timezone: "America/New_York",
      },
    );
  })
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// ---------------------------
// Autodesk Token functions
// ---------------------------
async function getAutodeskToken() {
  const platform = "Autodesk";
  let tokenDoc = await Token.findOne({ platform });
  const now = new Date();

  // if (!tokenDoc || tokenDoc.expiresAt > now) {
  //   console.log("Token expired or missing, refreshing...");
  //   return await refreshToken(platform, tokenDoc?.refresh_token);
  // }

  // console.log("Using existing valid token.");
  // return tokenDoc.access_token;
  // Always refresh token, ignoring expiry
  console.log("Generating new access token...");
   return await refreshToken(platform, tokenDoc?.refresh_token);
}

async function refreshToken(platform, oldRefreshToken) {
  const response = await axios.post(
    "https://developer.api.autodesk.com/authentication/v2/token",
    new URLSearchParams({
      client_id: process.env.AUTODESK_CLIENT_ID,
      client_secret: process.env.AUTODESK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: oldRefreshToken,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  const { access_token, refresh_token } = response.data;

  await Token.findOneAndUpdate(
    { platform },
    {
      access_token,
      refresh_token,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    { upsert: true, new: true },
  );

  return access_token;
}

// ---------------------------
// Smart Bid Score calculation
// ---------------------------
async function calculateSmartBidScore(bid) {
  const settings = await MasterSetting.findOne({ key: "bids" });
  if (!settings) return 0;

  const weights = settings.value;
  let score = 0;

  // Client
  const clientWeight = weights.clients.find(
    (c) => c.name?.toLowerCase() === bid.client?.company?.name?.toLowerCase(),
  );
  if (clientWeight) {
    // console.log('client',clientWeight.percentage);
    score += clientWeight.percentage;
  }

  // State
  const stateName = bid.location?.state;
  const stateWeight = weights.states.find((s) => s.name === stateName);
  if (stateWeight) {
    // console.log('state',stateWeight.percentage);
    score += stateWeight.percentage;
  }

  // Distance (assume bid.distance in miles if available)
  if (bid.location) {
    let bidDistance = await getDistanceInMiles(
      bid.location.zip,
      process.env.SOURCE_ZIP_CODE,
    ); // example
    // Round up to nearest integer
    bidDistance = Math.ceil(bidDistance);
    const distanceArray = weights.distance;

    // const matchedRange = distanceArray.find(range =>
    //   (range.max === null && bidDistance > range.min) ||
    //   (bidDistance >= range.min && bidDistance < range.max)
    // );
    const matchedRange = distanceArray.find(
      (range) =>
        (range.max === null && bidDistance >= range.min) ||
        (bidDistance >= range.min && bidDistance <= range.max),
    );

    if (matchedRange) {
      // console.log("location", matchedRange.percentage);
      score += matchedRange.percentage;
    }
  }

  // TradeName
  const tradeWeight = weights.tradeNames.find(
    (t) => t.name?.toLowerCase() === bid.tradeName?.toLowerCase(),
  );
  if (tradeWeight) {
    //  console.log('trade',tradeWeight.percentage);
    score += tradeWeight.percentage;
  }

  // ProjectName
  //const projectWeight = weights.projectNames.find(p => p.name === bid.name);
  const projectWeight = weights.projectNames.find((p) =>
    bid.name?.toLowerCase().includes(p.name?.toLowerCase()),
  );
  if (projectWeight) {
    // console.log('project',projectWeight.percentage);
    score += projectWeight.percentage;
  }

  // ProjectTimeline
  const demoDeadline = bid.deadline ? moment(bid.deadline) : moment(); // moment object (not formatted yet)
  //const demoDeadline = moment("2025-10-20");

  if (demoDeadline) {
    const today = moment(); // moment object for current date
    const diffDays = demoDeadline.diff(today, "days"); // difference in days
    //  console.log("Today:", today.format("YYYY-MM-DD"));
    //  console.log("Deadline:", demoDeadline.format("YYYY-MM-DD"));
    //  console.log("diffDays:", diffDays);

    const matchedTimeline = weights.projectTimeline.find(
      (t) =>
        (t.max === null && diffDays >= t.min) ||
        (diffDays >= t.min && diffDays <= t.max),
    );

    if (matchedTimeline) {
      //console.log("deadline percentage", matchedTimeline.percentage);
      score += matchedTimeline.percentage;
    }
  }

  // ProjectSize
  if (bid.projectSize) {
    // Round up project size to nearest integer
    const roundedSize = Math.ceil(bid.projectSize);

    const matchedSize = weights.projectSize.find(
      (range) =>
        (range.max === null && roundedSize >= range.min) || // last range
        (roundedSize >= range.min && roundedSize <= range.max), // other ranges
    );

    if (matchedSize) {
      // console.log("project size", matchedSize.percentage);
      score += matchedSize.percentage;
    }
  }

  return score;
}

async function getDistanceInMiles(zip1, zip2) {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${zip1}&destinations=${zip2}&key=${process.env.GOOGLE_MAP_API_KEY}`;

    const response = await axios.get(url);

    if (
      response.data.status !== "OK" ||
      response.data.rows[0].elements[0].status !== "OK"
    ) {
      // console.error("Google API error response:", response.data);
      //  throw new Error("Failed to fetch distance from Google API");
      return 0;
    }

    const distanceText = response.data.rows[0].elements[0].distance.text;
    const distanceInMiles = parseFloat(distanceText.replace(/[^\d.]/g, ""));
    return distanceInMiles;
  } catch (err) {
    // console.error("Google Distance Matrix API request failed:", err.message);
    // throw new Error("Google Distance Matrix API request failed");
    return 0;
  }
}

async function upsertHubspotLead(bid, contactData) {
  try {
    const tokenResponse = await axios.post(
      "https://api.hubapi.com/oauth/v1/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        refresh_token: process.env.HUBSPOT_REFRESH_TOKEN,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const accessToken = tokenResponse.data.access_token;

    // 2️⃣ Upsert Contact
    let hubspotContactId = null;
    const existingBid = await Bid.findOne({
      opportunities_id: bid.opportunities_id,
    });

    if (existingBid?.hubspotContactId) {
      hubspotContactId = existingBid.hubspotContactId;
    } else {
      // 1️⃣ Try to find contact by email
      const searchPayload = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: contactData.email,
              },
            ],
          },
        ],
        properties: ["email", "firstname", "lastname", "phone"],
        limit: 1,
      };

      const searchResponse = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        searchPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (
        searchResponse.data.results &&
        searchResponse.data.results.length > 0
      ) {
        hubspotContactId = searchResponse.data.results[0].id; // Found existing contact
      } else {
        // 2️⃣ Create new contact if not found
        const contactPayload = {
          properties: contactData,
        };

        const contactResponse = await axios.post(
          "https://api.hubapi.com/crm/v3/objects/contacts",
          contactPayload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        hubspotContactId = contactResponse.data.id;
      }
    }

    // 2️⃣ Prepare the payload
    const leadPayload = {
      properties: {
        //  hubspot_owner_id:process.env.HUBSPOT_OWNER_ID,
        hs_lead_type: "NEW_BUSINESS",
        hs_lead_name: bid.name,
        company_name: `${bid.client?.company?.name}`,
        due_at: bid.dueAt,
        project_size: bid.projectSize,
        location: bid.location?.complete,
        client: `${bid.client?.lead?.firstName} ${bid.client?.lead?.lastName}`,
        trade_name: bid.tradeName,
        dead_line: bid.deadline,
        project_information: bid.projectInformation,
        smart_bid_score: `${bid.smartBidScore}%`,
        link_url: bid.LinkURL,
        created_at: new Date(bid.createdAt),
        updated_at: new Date(bid.updatedAt),
      },
      associations: [
        {
          to: { id: hubspotContactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 578,
            },
          ],
        },
      ],
    };
    // 4️⃣ Upsert Lead
    let leadId = existingBid?.hubspotLeadId;
    const url = leadId
      ? `https://api.hubapi.com/crm/v3/objects/leads/${leadId}`
      : `https://api.hubapi.com/crm/v3/objects/leads`;
    const method = leadId ? "patch" : "post";

    // console.log(url,method,leadPayload);

    const leadResponse = await axios({
      method,
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: leadPayload,
    });

    const hubspotLeadId = leadResponse.data.id;
    return { hubspotContactId, hubspotLeadId };
  } catch (err) {
    console.error("HubSpot upsert error:", err.response?.data || err.message);
    return null;
  }
}

async function upsertHubspotDeal(bid, contactData) {
  try {
    /* ---------------------------------------------------
     1️⃣ Get HubSpot Access Token
    --------------------------------------------------- */
    const tokenResponse = await axios.post(
      "https://api.hubapi.com/oauth/v1/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        refresh_token: process.env.HUBSPOT_REFRESH_TOKEN,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const accessToken = tokenResponse.data.access_token;

    /* ---------------------------------------------------
     2️⃣ Check existing bid in DB
    --------------------------------------------------- */
    //const existingBid = await Bid.findOne({ opportunities_id: bid.opportunities_id });

    const query = {
      opportunities_id: bid?.opportunities_id,
    };

    if (bid?.client?.company?.id) {
      query["client.company.id"] = bid.client.company.id;
    }

    if (bid?.client?.lead?.id) {
      query["client.lead.id"] = bid.client.lead.id;
    }

    if (bid?.projectSize != null) {
      query.projectSize = String(bid.projectSize);
    }

    const existingBid = await Bid.findOne(query);

    /* ---------------------------------------------------
     3️⃣ Resolve / Create Contact
    --------------------------------------------------- */
    let hubspotContactId = existingBid?.hubspotContactId || null;

    if (!hubspotContactId) {
      // 🔍 Search contact by email
      const searchPayload = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: contactData.email,
              },
            ],
          },
        ],
        properties: ["email", "firstname", "lastname", "phone"],
        limit: 1,
      };

      const searchResponse = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        searchPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (searchResponse.data.results?.length > 0) {
        hubspotContactId = searchResponse.data.results[0].id;
      } else {
        // ➕ Create contact
        const contactResponse = await axios.post(
          "https://api.hubapi.com/crm/v3/objects/contacts",
          { properties: contactData },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        hubspotContactId = contactResponse.data.id;
      }
    }
    /* ---------------------------------------------------
     4️⃣ If Deal Already Exists → SKIP
    --------------------------------------------------- */
    if (existingBid?.hubspotLeadId) {
      console.log(
        `⏭️ Deal already exists for opportunity ${bid.opportunities_id}, skipping`,
      );

      return {
        hubspotContactId,
        hubspotLeadId: existingBid.hubspotLeadId,
      };
    }

    /* ---------------------------------------------------
     5️⃣ Decide Pipeline & Stage
    --------------------------------------------------- */

    const smartBidScore = Number(bid.smartBidScore || 0);
    const threshold = Number(process.env.SMARTBID_THRESHOLD); // 15

    let selectedPipelineId;
    let selectedStageId;

    if (smartBidScore <= threshold) {
      // Unqualified (0 - 15)
      selectedPipelineId = process.env.SMARTBID_LOW_SCORE_PIPELINE_ID;
      selectedStageId = process.env.SMARTBID_LOW_SCORE_STAGE_ID;
    } else {
      // SmartBid (16+)
      selectedPipelineId = process.env.SMARTBID_HIGH_SCORE_PIPELINE_ID;
      selectedStageId = process.env.SMARTBID_HIGH_SCORE_STAGE_ID;
    }

    /* ---------------------------------------------------
     6️⃣ Create Deal (POST ONLY)
    --------------------------------------------------- */
    // 2️⃣ Prepare the payload
    const dealPayload = {
      properties: {
        //  hubspot_owner_id:process.env.HUBSPOT_OWNER_ID,
        pipeline: selectedPipelineId,
        dealstage: selectedStageId,
        dealname: bid.name,
        company_name: `${bid.client?.company?.name}`,
        due_at: bid.dueAt,
        project_size: bid.projectSize,
        location: bid.location?.complete,
        client: `${bid.client?.lead?.firstName} ${bid.client?.lead?.lastName}`,
        trade_name: bid.tradeName,
        dead_line: bid.deadline,
        project_information: bid.projectInformation,
        smart_bid_score: `${bid.smartBidScore}%`,
        link_url: bid.LinkURL,
        created_at: new Date(bid.createdAt),
        updated_at: new Date(bid.updatedAt),
        zipcode: bid.location?.zip,
        send_followup_emails: false,
      },
      associations: [
        {
          to: { id: hubspotContactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 3,
            },
          ],
        },
      ],
    };

    const dealResponse = await axios.post(
      "https://api.hubapi.com/crm/v3/objects/deals",
      dealPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const hubspotLeadId = dealResponse.data.id;
    return { hubspotContactId, hubspotLeadId };
  } catch (err) {
    console.error("HubSpot upsert error:", err.response?.data || err.message);
    return null;
  }
}

async function getNextClientNumber() {
  const counter = await MasterSetting.findOneAndUpdate(
    { key: "clientCounter" },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );
  return counter.value;
}

// 👇 delay helper
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------------------------------------------------------
// Helper to Update BuildingConnected Opportunity Status
// -------------------------------------------------------------
async function updateBuildingConnectedStatus(opportunityId, token, state) {
  try {
    // If token wasn't passed or expired, fetch it again dynamically
    if (!token) {
      token = await getAutodeskToken();
    }

    const baseUrl = "https://developer.api.autodesk.com";
    const url = `${baseUrl}/construction/buildingconnected/v2/opportunities/${opportunityId}`;

    await axios.patch(
      url,
      {
        submissionState: state,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    // This will print the exact error Autodesk gives us (e.g. invalid token, 403 Forbidden, 400 Bad Request)
    const apiError = error.response?.data
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error(
      `Autodesk API Error updating opportunity ${opportunityId} to ${state}:`,
      apiError,
    );
    throw new Error(apiError); // Throw it back to the loop so it can catch it
  }
}
