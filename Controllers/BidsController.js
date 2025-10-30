
const Controller = require("./Controller.js");
const Models = require("../Models");
const _ = require("lodash");
const moment = require("moment");
const { Validator } = require('node-input-validator');
const Bid = require("../Models/Bid.js");
const Token = require("../Models/Token.js");
const axios = require('axios');
const MasterSetting = require("../Models/MasterSetting.js");

class BidsController extends Controller {
    constructor() {
        super("Bid");
    }
    async getListQuery(req) {
        var trash = req.query.trash || false;
        var limit = req.query.show || 10;
        var page = req.query.page || 1;
        var offset = (parseInt(page) - 1) * parseInt(limit);
        var search = req.query.search || "";
        var sort_field = req.query.sort || "_id";
        var sort_order = req.query.sort_order || "desc";
        var month = req.query.month || null; // 👈 NEW
        var where_clause = req.query.where_clause
            ? JSON.parse(req.query.where_clause)
            : {
                  where_fields: [],
                  where_values: [],
              };
    
        sort_order = sort_order == "asc" ? 1 : -1;
    
        var fields = this.getModelObj().schema.customFields;
        let select_fields = Object.keys(fields);
    
        let search_fields = select_fields.filter((item) => {
            if (fields[item]["searchable"]) return item;
        });
    
        var sort_order_obj = { [sort_field]: sort_order };
    
        let search_query = {};
        // 🔍 Search filter
        if (search.length > 0) {
            var search_arr = [];
            for (var field of search_fields) {
                search_arr.push({
                    [field]: {
                        $regex: search,
                        $options: "i",
                    },
                });
            }
            search_query = { $or: search_arr };
        }
    
        // 📝 Where clause filter
        let find_query = {};
        for (
            var field_key = 0;
            field_key < where_clause.where_fields.length;
            field_key++
        ) {
            find_query[where_clause.where_fields[field_key]] =
                where_clause.where_values[field_key];
        }
    
        // 📅 Month filter
        if (month) {
            const start = new Date(`${month}-01T00:00:00.000Z`);
            const end = new Date(moment(start).endOf("month").toISOString());
    
            find_query["createdAt"] = { $gte: start, $lte: end };
        }
    
        // Combine search + where + month
        if (!_.isEmpty(find_query)) {
            if (!_.isEmpty(search_query)) {
                var new_search_query = {
                    $and: [find_query, search_query],
                };
            } else {
                var new_search_query = {
                    $and: [find_query],
                };
            }
    
            search_query = new_search_query;
        }
    
        return {
            search: search_query,
            select: select_fields.join(" "),
            limit: parseInt(limit),
            skip: parseInt(offset),
            sort: sort_order_obj,
            current_page: page,
            per_page: limit,
            trash: trash,
        };
    }

    async export(req, res) {
        try {
          const Model = Models[this.model_name];
          const exportHeader = Model.schema.exportFields;
          const filename = req.query.filename || "Report";
          const month = req.query.month || null;
          const search = req.query.search || ""; // ✅ search
          const where_clause = req.query.where_clause
            ? JSON.parse(req.query.where_clause)
            : { where_fields: [], where_values: [] };
      
          const where_fields = where_clause.where_fields || [];
          const where_values = where_clause.where_values || [];
      
          // 🔍 Build search query
          const fields = Model.schema.customFields;
          const search_fields = Object.keys(fields).filter(f => fields[f]?.searchable);
          let search_query = {};
          if (search.length > 0 && search_fields.length) {
            const or_arr = search_fields.map(f => ({
              [f]: { $regex: search, $options: "i" },
            }));
            search_query = { $or: or_arr };
          }
      
          // 📝 Build where clause query
          let find_query = {};
          for (let i = 0; i < where_fields.length; i++) {
            find_query[where_fields[i]] = { $in: where_values[i] };
          }
      
          // 📅 Month filter
          if (month) {
            const start = new Date(`${month}-01T00:00:00.000Z`);
            const end = new Date(moment(start).endOf("month").toISOString());
            find_query["createdAt"] = { $gte: start, $lte: end };
          }
      
          // Combine search + where + month
          let finalQuery = {};
          if (!_.isEmpty(find_query) && !_.isEmpty(search_query)) {
            finalQuery = { $and: [find_query, search_query] };
          } else if (!_.isEmpty(find_query)) {
            finalQuery = find_query;
          } else if (!_.isEmpty(search_query)) {
            finalQuery = search_query;
          }
      
        //  console.log("Final Query for CSV export:", JSON.stringify(finalQuery, null, 2));
      
          // Fetch data
          const records = await Model.find(finalQuery).sort({ _id: -1 }).lean().exec();
      
          // Generate CSV
          const headers = Object.keys(exportHeader).map(k => exportHeader[k].displayName);
          const rows = records.map(r =>
            Object.keys(exportHeader)
              .map(k => {
                let value = r[k];
                // Format date fields
              if (value instanceof Date) {
                // Convert to EDT timezone and desired format
                value = moment(value).format("MM-DD-YYYY");
              }
                // Handle nested location object
                if (k === "location" && value) {
                  value = value.complete || ""; // use complete address
                }

                // --- Handle client name ---
                  if (k === "clientName") {
                    value = r.client?.lead
                      ? `${r.client.lead.firstName || ""} ${r.client.lead.lastName || ""}`.trim()
                      : "";
                  }

                  // --- Handle client email ---
                  if (k === "clientEmail") {
                    value = r.client?.lead?.email || "";
                  }
                  // --- Handle client email ---
                  if (k === "smartBidScore") {
                    value = `${r?.smartBidScore}%` || "0%";
                  }
          
                return `"${String(value ?? "").replace(/"/g, '""')}"`; // escape quotes
              })
              .join(",")
          );
          
      
          const csv = [headers.join(","), ...rows].join("\r\n");
      
          // Send CSV
          res.setHeader("Content-Type", "text/csv; charset=utf-8");
          res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
          return res.end(csv);
      
        } catch (err) {
          console.error("CSV export failed:", err);
          if (!res.headersSent) {
            return res.status(500).send("CSV export failed");
          }
        }
      }

      async update(req, res) {
        // Validate the input data
        const v = new Validator(req.body, {
            client: 'required|string',
            name: 'required|string',
            projectSize: 'required',
            smartBidScore: 'required',
            tradeName: 'required'
  
        },{
            'client.required': 'The client name field is mandatory.',
            'name.required': 'The project name field is mandatory.',
        });

        // Check if validation passes
        const matched = await v.check();
        if (!matched) {
            // If validation fails, respond with a 422 status and the validation errors
            res.status(422).json({
                status: false,
                errors: v.errors
            });
        } else {
     
            try {
                // Attempt to update the label using the inherited update method
              //  const result = await super.update(req);
               const data = {...req.body};
              const updatedBid = await Bid.findOneAndUpdate(
                { _id: req.params.id },
                { $set: { 
                          'client.company.name': data.client, 
                          name: data.name,
                          projectSize:data.projectSize,
                          smartBidScore:data.smartBidScore,
                          tradeName:data.tradeName
                        } 
                },
                { new: true }
            );
    
            if (!updatedBid) {
                return res.status(404).json({
                    status: false,
                    message: 'Bid not found'
                });
            }
    
            return res.status(200).json({
                status: true,
                message: 'Updated Successfully.'
            });

            } catch (error) {
                // If an error occurs, respond with a 500 status and an error message
                res.status(500).json({
                    status: false,
                    message: error.message,
                });
            }
        }
    }

    async processOpportunity(req,res){
      const v = new Validator(req.body, {
        start_date: 'required|dateFormat:YYYY-MM-DD',
        hours: 'required|integer',
    });

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
        // If validation fails, respond with a 422 status and the validation errors
        res.status(422).json({
            status: false,
            errors: v.errors
        });
    } else {
      try {
        // Convert last 1 day to EDT (optional, or keep UTC if API expects UTC)
        const data = {...req.body}
   
        
        const end = moment(data.start_date).utc();
        const start = moment(end).subtract(data.hours, "hours");

        const lastDayRange = `${start.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]")}..${end.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]")}`;
       
     console.log(lastDayRange);
      
        const token = await this.getAutodeskToken();
        let nextUrl = `/construction/buildingconnected/v2/opportunities?filter[updatedAt]=${lastDayRange}&limit=100`;
        const baseUrl = 'https://developer.api.autodesk.com';
        let totalInserted = 0;
        // 👇 Create a rate-limited queue for HubSpot calls
        let queue = Promise.resolve();
        const limit = 4; // 4 per second
        const interval = 1000 / limit; // 250ms between each HubSpot call

        while (nextUrl) {
          const response = await axios.get(baseUrl + nextUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
      
          const opportunities = response.data.results;
        
      
          if (opportunities && opportunities.length > 0) {
            let bulkOps = await Promise.all(opportunities.map(async (opp) => {
              let clientData = opp.client;
                    // If client missing, create a demo client with incremented number
              if (
                      !clientData ||
                      !clientData?.lead ||
                      !clientData?.lead?.email ||
                      !clientData?.lead?.firstName ||
                      !clientData?.lead?.lastName
                    ) {
                const clientNum = await this.getNextClientNumber();
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
                LinkURL:`https://app.buildingconnected.com/opportunities/${opp.id}/info`,
                projectInformation: opp.projectInformation,
                submissionState:opp.submissionState,
                createdAt:new Date(opp.createdAt),
                updatedAt:new Date(opp.updatedAt),
              };
      
              // Calculate smartBidScore
              bid.smartBidScore = await this.calculateSmartBidScore(bid);
               // Upsert lead in HubSpot and get contactId
               const contactData = {
                "email": clientData?.lead?.email,
                "firstname": clientData?.lead?.firstName,
                "lastname": clientData?.lead?.lastName,
               // "phone": clientData?.lead?.phoneNumber
               }
               queue = queue.then(async () => {
                const hubspotIds = await this.upsertHubspotLead(bid, contactData);
                await this.delay(interval); // wait before next HubSpot call
                if (hubspotIds) {
                  bid.hubspotContactId = hubspotIds.hubspotContactId;
                  bid.hubspotLeadId = hubspotIds.hubspotLeadId;
                }
              });
              // const hubspotIds = await this.upsertHubspotLead(bid,contactData);
              // if (hubspotIds) {
              //   bid.hubspotContactId = hubspotIds.hubspotContactId;
              //   bid.hubspotLeadId = hubspotIds.hubspotLeadId; // save HubSpot ID
              // }
      
              return {
                updateOne: {
                  filter: { opportunities_id: bid.opportunities_id }, // check if exists
                  update: { $set: bid },  // update with new data
                  upsert: true,           // insert if not exists
                }
              };
            }));
            // Wait for all rate-limited upserts to finish
            await queue;
           const result = await Bid.bulkWrite(bulkOps);
           totalInserted += result.upsertedCount + result.modifiedCount;
           console.log(`Inserted/Updated this page: ${result.upsertedCount + result.modifiedCount}`);

       
          } else {
            console.log("No opportunities found in this page.");
         
          }
      
          nextUrl = response.data.pagination?.nextUrl || null;
          
          if (!nextUrl) {
            console.log("No more pages, stopping API calls.");
            break;
          }
        }
      
        console.log('Finished fetching all opportunities. Total inserted/updated:', totalInserted);
        res.status(200).json({
          status: true,
          message: "Finished fetching all opportunities",
          totalInserted
      });
      
      } catch (error) {
        console.error('Error in cron job:', error.response?.data || error.message);
        res.status(500).json({
          status: false,
          message: error.message,
      });
      }
    }

    }

    // ---------------------------
// Autodesk Token functions
// ---------------------------
async  getAutodeskToken() {
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
  return await this.refreshToken(platform, tokenDoc?.refresh_token);
}

async  refreshToken(platform, oldRefreshToken) {
  const response = await axios.post(
    'https://developer.api.autodesk.com/authentication/v2/token',
    new URLSearchParams({
      client_id: process.env.AUTODESK_CLIENT_ID,
      client_secret: process.env.AUTODESK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: oldRefreshToken
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, refresh_token } = response.data;

  await Token.findOneAndUpdate(
    { platform },
    { access_token, refresh_token, expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), updatedAt: new Date() },
    { upsert: true, new: true }
  );

  return access_token;
}
      

// ---------------------------
// Smart Bid Score calculation
// ---------------------------
async  calculateSmartBidScore(bid) {
  const settings = await MasterSetting.findOne({ key: "bids" });
  if (!settings) return 0;

  const weights = settings.value;
  let score = 0;

  // Client
  const clientWeight = weights.clients.find(c => c.name?.toLowerCase() === bid.client?.company?.name?.toLowerCase());
  if (clientWeight) {
   // console.log('client',clientWeight.percentage);
    score += clientWeight.percentage;
  }

  // State
  const stateName = bid.location?.state;
  const stateWeight = weights.states.find(s => s.name === stateName);
  if (stateWeight) {
   // console.log('state',stateWeight.percentage);
    score += stateWeight.percentage;
  }

  // Distance (assume bid.distance in miles if available)
  if (bid.location) {
    const bidDistance = await this.getDistanceInMiles(bid.location.zip, process.env.SOURCE_ZIP_CODE); // example
    const distanceArray = weights.distance;
  
    const matchedRange = distanceArray.find(range => 
      (range.max === null && bidDistance > range.min) ||
      (bidDistance >= range.min && bidDistance < range.max)
    );
  
    if (matchedRange) {
     // console.log("location", matchedRange.percentage);
      score += matchedRange.percentage;
    }
  }
  

  // TradeName
  const tradeWeight = weights.tradeNames.find(t => t.name?.toLowerCase() === bid.tradeName?.toLowerCase());
  if (tradeWeight) {
  //  console.log('trade',tradeWeight.percentage);
    score += tradeWeight.percentage;
  }

  // ProjectName
  //const projectWeight = weights.projectNames.find(p => p.name === bid.name);
  const projectWeight = weights.projectNames.find(p =>
    bid.name?.toLowerCase().includes(p.name?.toLowerCase())
  );
  if (projectWeight) {
   // console.log('project',projectWeight.percentage);
    score += projectWeight.percentage;
  }

 // ProjectTimeline
 const demoDeadline = bid.deadline 
 ? moment(bid.deadline) 
 : moment(); // moment object (not formatted yet)
//const demoDeadline = moment("2025-10-20");

if (demoDeadline) {
 const today = moment(); // moment object for current date
 const diffDays = demoDeadline.diff(today, "days"); // difference in days
//  console.log("Today:", today.format("YYYY-MM-DD"));
//  console.log("Deadline:", demoDeadline.format("YYYY-MM-DD"));
//  console.log("diffDays:", diffDays);

 const matchedTimeline = weights.projectTimeline.find(t => 
   (t.max === null && diffDays > t.min) ||
   (diffDays >= t.min && diffDays <= t.max)
 );

 if (matchedTimeline) {
   //console.log("deadline percentage", matchedTimeline.percentage);
   score += matchedTimeline.percentage;
 }
}

 

  // ProjectSize
  if (bid.projectSize) {
    const matchedSize = weights.projectSize.find(range => 
      (range.max === null && bid.projectSize > range.min) ||
      (bid.projectSize >= range.min && bid.projectSize <= range.max)
    );
  
    if (matchedSize) {
     // console.log("project size", matchedSize.percentage);
      score += matchedSize.percentage;
    }
  }
  
  
  return score;
}

async  getDistanceInMiles(zip1, zip2) {
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

async  upsertHubspotLead(bid,contactData){

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
      }
    );
  
    const accessToken = tokenResponse.data.access_token;

    // 2️⃣ Upsert Contact
    let hubspotContactId = null;
    const existingBid = await Bid.findOne({ opportunities_id: bid.opportunities_id });

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
                value:  contactData?.email,
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
        }
      );
    
      if (searchResponse.data.results && searchResponse.data.results.length > 0) {
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
          }
        );
    
        hubspotContactId = contactResponse.data.id;
      }
    }
    
        // 2️⃣ Prepare the payload
        const leadPayload = {
          properties: {
            hubspot_owner_id:process.env.HUBSPOT_OWNER_ID,
            hs_lead_type:"NEW_BUSINESS",
            hs_lead_name: bid.name,
            due_at: bid.dueAt,
            project_size: bid.projectSize,
            location: bid.location?.complete,
            client: `${bid.client?.lead?.firstName} ${bid.client?.lead?.lastName}`,
            trade_name: bid.tradeName,
            dead_line: bid.deadline,
            project_information: bid.projectInformation,
            smart_bid_score: `${bid.smartBidScore}%`,
            link_url: bid.LinkURL,
            created_at:new Date(bid.createdAt),
            updated_at:new Date(bid.updatedAt),
          },
          associations: [
            {
              "to": { "id": hubspotContactId},
              "types": [
                {
                  "associationCategory": "HUBSPOT_DEFINED",
                  "associationTypeId": 578
                }
              ]
            }
          ]
          
         
        };
         // 4️⃣ Upsert Lead
    let leadId = existingBid?.hubspotLeadId;
    const url = leadId
      ? `https://api.hubapi.com/crm/v3/objects/leads/${leadId}`
      : `https://api.hubapi.com/crm/v3/objects/leads`;
    const method = leadId ? "patch" : "post";

    //console.log(url,method,leadPayload);

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


async  getNextClientNumber() {
  const counter = await MasterSetting.findOneAndUpdate(
    { key: "clientCounter" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
}

// 👇 delay helper
async delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

      
      
    







  
  
      
    

}

module.exports = BidsController;
