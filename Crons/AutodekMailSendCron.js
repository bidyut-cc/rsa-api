const cron = require('node-cron');
const axios = require('axios');
const moment = require("moment");
const mongoose = require("mongoose");
const Token = require('../Models/Token');
const Bid = require('../Models/Bid');
const MasterSetting = require("../Models/MasterSetting.js");
require("dotenv").config();

// MongoDB connection setup
const MONGO_URI = process.env.DB_URI;

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB successfully');

    // Schedule cron every minute (adjust as needed)
    const autodesk_cron_time = '0 * * * *';
   // const autodesk_cron_time = '*/30 * * * *';

    cron.schedule(autodesk_cron_time, async () => {
      try {
        // Convert last 1 day to EDT (optional, or keep UTC if API expects UTC)
        const end = moment().utc();
        const start = moment(end).subtract(1, "hours");
        const lastDayRange = `${start.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]")}..${end.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]")}`;

      console.log(lastDayRange);
      
        const token = await getAutodeskToken();
        let nextUrl = `/construction/buildingconnected/v2/opportunities?filter[updatedAt]=${lastDayRange}`;
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
        // const opportunities  =[     
        //   {
        //       "id": "68c2f83f8b8f920032eee2a2",
        //       "name": "Buena Vista - GMP Set 9.5.25 school",
        //       "number": null,
        //     //   "client": {
        //     //     "company": {
        //     //         "id": "59139839ce945d0a00d2ade2",
        //     //         "name": "Reeves Young"
        //     //     },
        //     //     "lead": {
        //     //         "id": "5b3422cb093dab0013bdc75d",
        //     //         "email": "nathanbrenner@weisbuilders.com",
        //     //         "firstName": "Nathan",
        //     //         "lastName": "Brenner",
        //     //         "phoneNumber": "+1 612-243-4618"
        //     //     },
        //     //     "office": {
        //     //         "id": "59cbaf5efa4c33000d7c1730",
        //     //         "name": "Minneapolis",
        //     //         "location": {
        //     //             "country": "US",
        //     //             "state": "MN",
        //     //             "streetName": null,
        //     //             "streetNumber": null,
        //     //             "suite": null,
        //     //             "city": "Minneapolis",
        //     //             "zip": null,
        //     //             "complete": "7645 Lyndale Ave S #300, Minneapolis, MN 55423, USA",
        //     //             "coords": {
        //     //                 "lat": 44.86489599999999,
        //     //                 "lng": -93.2880534
        //     //             },
        //     //             "precisionLevel": null
        //     //         }
        //     //     }
        //     // },
        //     "client": null,
        //       "competitors": [],
        //       "customTags": [],
        //       "createdAt": "2025-09-11T16:26:39.723Z",
        //       "updatedAt": "2025-10-05T19:56:25.461Z",
        //       "defaultCurrency": "USD",
        //       "source": "BUILDINGCONNECTED",
        //       "isNdaRequired": false,
        //       "projectIsPublic": false,
        //       "outcome": {
        //           "state": "UNKNOWN",
        //           "otherReason": null,
        //           "updatedAt": null,
        //           "updatedBy": null
        //       },
        //       "requestType": "PROPOSAL",
        //       "submissionState": "DECLINED",
        //       "workflowBucket": "DECLINED_ARCHIVED_ORPHAN",
        //       "isParent": false,
        //       "parentId": null,
        //       "groupChildren": null,
        //       "bid": null,
        //       "members": [
        //           {
        //               "viewedAt": null,
        //               "userId": "58e4ffd42d61fe1000e4a5ac",
        //               "type": "FOLLOWER"
        //           },
        //           {
        //               "viewedAt": "2025-10-05T19:56:25.454Z",
        //               "userId": "666d99d9d2634801b4205047",
        //               "type": "ASSIGNEE"
        //           }
        //       ],
        //       "dueAt": "2025-10-15T17:00:00.000Z",
        //       "jobWalkAt": null,
        //       "rfisDueAt": null,
        //       "expectedStartAt": null,
        //       "expectedFinishAt": null,
        //       "invitedAt": "2025-09-11T17:05:00.555Z",
        //       "tradeName": "Specialties",
        //       "projectSize": 401618,
        //       "projectInformation": "<div>Please review the project documents for Buena Vista Family Apartments in Nashville, TN. Project documents include the 100% Construction Documents prepared by Smith Gee Studio. Documents include Civil, Landscape, Architectural, Structural, Interiors, MEPs, Geotech report, Phase 1 ESA, and a <b><u>FOR REFERENCE</u></b> Project Specifications. The final project specifications will be available on or around 9/19/25. </div><br /><div>Buena Vista Family Apartments consists of 244 units.</div><br /><div>Weis Builders has multiple projects underway for this client in other markets across the country.</div><br /><div>The anticipated start for this project is December 1st, 2025</div><br /><div>Proposals are due 10/3/2025.  Weis Builders will be awarding subcontractors on this round of pricing. </div><br /><div>If you have any questions, please contact:</div><div>Nathan Brenner - Sr. Assistant Estimator at (612) 243-4618 or nathanbrenner@weisbuilders.com</div><br /><div>Dave Peterson – Senior Estimator at (612) 243-4651 or davepeterson@weisbuilders.com </div><br /><div>Please send all proposals to Nathan Brenner at nathanbrenner@weisbuilders.com</div><br /><div>PLEASE RESPOND CONFIRMING WHETHER OR NOT YOU WILL SUBMIT A QUOTE AND INCLUDE THE SECTIONS YOU WILL BE QUOTING. By submitting a bid, you agree to the following: I recognize that I am promising to perform for the amount submitted. I also understand that Weis Builders will be relying upon this bid. I recognize that I am responsible to review all drawings, specifications and addenda required to submit a complete and accurate bid. I recognize this project is subject to Textura charges and all related fees. (If you reflect additional costs they are to be broken out accordingly.) As a bidder, I agree to meet Weis Builders' standard insurance requirements including an umbrella of $5 million Commercial Liability, and I shall provide higher limits if required by Weis Builders. A copy of Weis Builders' Subcontract Agreement is available upon request.</div>",
        //       "location": {
        //           "country": "US",
        //           "state": "NC",
        //           "streetName": "Buena Vista Pike",
        //           "streetNumber": "2500",
        //           "suite": "",
        //           "city": "Nashville",
        //           "zip": "37218",
        //           "complete": "2500 Buena Vista Pike, Nashville, TN 37218, United States of America",
        //           "coords": {
        //               "lat": 36.2011515,
        //               "lng": -86.8220125
        //           },
        //           "precisionLevel": null
        //       },
        //       "tradeSpecificInstructions": null,
        //       "architect": "Smith Gee Studio",
        //       "engineer": null,
        //       "propertyOwner": null,
        //       "propertyTenant": null,
        //       "declineReasons": [],
        //       "additionalInfo": null,
        //       "priority": "UNKNOWN",
        //       "marketSector": "NONE",
        //       "rom": null,
        //       "winProbability": null,
        //       "followUpAt": null,
        //       "contractStartAt": null,
        //       "contractDuration": null,
        //       "averageCrewSize": null,
        //       "estimatingHours": null,
        //       "feePercentage": null,
        //       "profitMargin": null,
        //       "finalValue": null,
        //       "isArchived": true,
        //       "owningOfficeId": "58ed31a8e2646810005a9b6f",
        //       "isSealedBidding": false,
        //       "clientValues": {
        //           "name": "Buena Vista - GMP Set 9.5.25",
        //           "dueAt": "2025-10-03T17:00:00.000Z",
        //           "jobWalkAt": null,
        //           "rfisDueAt": null,
        //           "expectedStartAt": null,
        //           "expectedFinishAt": null,
        //           "tradeName": "Specialties",
        //           "projectSize": 401618,
        //           "projectInformation": "<div>Please review the project documents for Buena Vista Family Apartments in Nashville, TN. Project documents include the 100% Construction Documents prepared by Smith Gee Studio. Documents include Civil, Landscape, Architectural, Structural, Interiors, MEPs, Geotech report, Phase 1 ESA, and a <b><u>FOR REFERENCE</u></b> Project Specifications. The final project specifications will be available on or around 9/19/25. </div><br /><div>Buena Vista Family Apartments consists of 244 units.</div><br /><div>Weis Builders has multiple projects underway for this client in other markets across the country.</div><br /><div>The anticipated start for this project is December 1st, 2025</div><br /><div>Proposals are due 10/3/2025.  Weis Builders will be awarding subcontractors on this round of pricing. </div><br /><div>If you have any questions, please contact:</div><div>Nathan Brenner - Sr. Assistant Estimator at (612) 243-4618 or nathanbrenner@weisbuilders.com</div><br /><div>Dave Peterson – Senior Estimator at (612) 243-4651 or davepeterson@weisbuilders.com </div><br /><div>Please send all proposals to Nathan Brenner at nathanbrenner@weisbuilders.com</div><br /><div>PLEASE RESPOND CONFIRMING WHETHER OR NOT YOU WILL SUBMIT A QUOTE AND INCLUDE THE SECTIONS YOU WILL BE QUOTING. By submitting a bid, you agree to the following: I recognize that I am promising to perform for the amount submitted. I also understand that Weis Builders will be relying upon this bid. I recognize that I am responsible to review all drawings, specifications and addenda required to submit a complete and accurate bid. I recognize this project is subject to Textura charges and all related fees. (If you reflect additional costs they are to be broken out accordingly.) As a bidder, I agree to meet Weis Builders' standard insurance requirements including an umbrella of $5 million Commercial Liability, and I shall provide higher limits if required by Weis Builders. A copy of Weis Builders' Subcontract Agreement is available upon request.</div>",
        //           "location": {
        //               "country": "US",
        //               "state": "TN",
        //               "streetName": "Buena Vista Pike",
        //               "streetNumber": "2500",
        //               "suite": "",
        //               "city": "Nashville",
        //               "zip": "37218",
        //               "complete": "2500 Buena Vista Pike, Nashville, TN 37218, United States of America",
        //               "coords": {
        //                   "lat": 36.2011515,
        //                   "lng": -86.8220125
        //               },
        //               "precisionLevel": null
        //           },
        //           "tradeSpecificInstructions": null,
        //           "architect": "Smith Gee Studio"
        //       }
        //   },
        //   {
        //     "id": "6259b220436c4400c7f67f06",
        //     "name": "Popeye's  - Carolina Place - Pineville, NC (NEGOTIATED)",
        //     "number": null,
        //     "client": {
        //         "company": {
        //             "id": "55e8c5581499480a00146d9b",
        //             "name": "Westwood Contractors, Inc."
        //         },
        //         "lead": {
        //             "id": "5866aae6855e2f1000426bdc",
        //             "email": "leeanne.branscome@westwoodcontractors.com",
        //             "firstName": "Lee Anne",
        //             "lastName": "Branscome",
        //             "phoneNumber": "+1 817-302-2069"
        //         },
        //         "office": {
        //             "id": "55e8c5581499480a00146d9c",
        //             "name": "Fort Worth",
        //             "location": {
        //                 "country": "US",
        //                 "state": "TX",
        //                 "streetName": "Beach Street",
        //                 "streetNumber": "2001",
        //                 "suite": "Suite 400",
        //                 "city": "Fort Worth",
        //                 "zip": "76103",
        //                 "complete": "2001 Beach Street, Suite 400, Fort Worth, TX 76103, United States of America",
        //                 "coords": {
        //                     "lat": 32.748296,
        //                     "lng": -97.288818
        //                 },
        //                 "precisionLevel": null
        //             }
        //         }
        //     },
        //     "competitors": [],
        //     "customTags": [],
        //     "createdAt": "2022-04-15T17:57:52.701Z",
        //     "updatedAt": "2025-10-14T14:01:09.842Z",
        //     "defaultCurrency": "USD",
        //     "source": "BUILDINGCONNECTED",
        //     "isNdaRequired": false,
        //     "projectIsPublic": false,
        //     "outcome": {
        //         "state": "UNKNOWN",
        //         "otherReason": null,
        //         "updatedAt": null,
        //         "updatedBy": null
        //     },
        //     "requestType": "PROPOSAL",
        //     "submissionState": "UNDECIDED",
        //     "workflowBucket": "UNDECIDED_ARCHIVED_ORPHAN",
        //     "isParent": false,
        //     "parentId": null,
        //     "groupChildren": null,
        //     "bid": null,
        //     "members": [
        //         {
        //             "viewedAt": null,
        //             "userId": "58e4ffd42d61fe1000e4a5ac",
        //             "type": "FOLLOWER"
        //         }
        //     ],
        //     "dueAt": "2022-04-29T22:00:00.000Z",
        //     "jobWalkAt": null,
        //     "rfisDueAt": null,
        //     "expectedStartAt": "2022-05-30T17:00:00.000Z",
        //     "expectedFinishAt": "2022-08-15T17:00:00.000Z",
        //     "invitedAt": "2022-04-15T17:59:19.690Z",
        //     "tradeName": "Fire Sprinkler",
        //     "projectSize": 666,
        //     "projectInformation": "<div><br /></div>",
        //     "location": {
        //         "country": "US",
        //         "state": "NC",
        //         "streetName": "Carolina Place Parkway",
        //         "streetNumber": "11025",
        //         "suite": "FC-06",
        //         "city": "Pineville",
        //         "zip": "28134",
        //         "complete": "11025 Carolina Place Parkway, FC-06, Pineville, NC 28134, United States of America",
        //         "coords": {
        //             "lat": 35.0820235,
        //             "lng": -80.8768772
        //         },
        //         "precisionLevel": null
        //     },
        //     "tradeSpecificInstructions": null,
        //     "architect": null,
        //     "engineer": null,
        //     "propertyOwner": null,
        //     "propertyTenant": null,
        //     "declineReasons": [],
        //     "additionalInfo": null,
        //     "priority": "UNKNOWN",
        //     "marketSector": "NONE",
        //     "rom": null,
        //     "winProbability": null,
        //     "followUpAt": null,
        //     "contractStartAt": null,
        //     "contractDuration": null,
        //     "averageCrewSize": null,
        //     "estimatingHours": null,
        //     "feePercentage": null,
        //     "profitMargin": null,
        //     "finalValue": null,
        //     "isArchived": true,
        //     "owningOfficeId": "58ed31a8e2646810005a9b6f",
        //     "isSealedBidding": false,
        //     "clientValues": {
        //         "name": "Popeye's  - Carolina Place - Pineville, NC (NEGOTIATED)",
        //         "dueAt": "2022-04-29T22:00:00.000Z",
        //         "jobWalkAt": null,
        //         "rfisDueAt": null,
        //         "expectedStartAt": "2022-05-30T17:00:00.000Z",
        //         "expectedFinishAt": "2022-08-15T17:00:00.000Z",
        //         "tradeName": "Fire Sprinkler",
        //         "projectSize": 666,
        //         "projectInformation": "<div><br /></div>",
        //         "location": {
        //             "country": "US",
        //             "state": "NC",
        //             "streetName": "Carolina Place Parkway",
        //             "streetNumber": "11025",
        //             "suite": "FC-06",
        //             "city": "Pineville",
        //             "zip": "28134",
        //             "complete": "11025 Carolina Place Parkway, FC-06, Pineville, NC 28134, United States of America",
        //             "coords": {
        //                 "lat": 35.0820235,
        //                 "lng": -80.8768772
        //             },
        //             "precisionLevel": null
        //         },
        //         "tradeSpecificInstructions": null,
        //         "architect": null
        //     }
        // }
        //         ];
      
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
                LinkURL:`https://app.buildingconnected.com/opportunities/${opp.id}/info`,
                projectInformation: opp.projectInformation,
                submissionState:opp.submissionState,
                createdAt:new Date(opp.createdAt),
                updatedAt:new Date(opp.updatedAt),
              };
      
              // Calculate smartBidScore
              bid.smartBidScore = await calculateSmartBidScore(bid);
               // Upsert lead in HubSpot and get contactId
               const contactData = {
                "email": clientData?.lead?.email,
                "firstname": clientData?.lead?.firstName,
                "lastname": clientData?.lead?.lastName,
               // "phone": clientData?.lead?.phoneNumber
               }
              // const hubspotIds = await upsertHubspotLead(bid,contactData);
              // if (hubspotIds) {
              //   bid.hubspotContactId = hubspotIds.hubspotContactId;
              //   bid.hubspotLeadId = hubspotIds.hubspotLeadId; // save HubSpot ID
              // }

              queue = queue.then(async () => {
                const hubspotIds = await upsertHubspotLead(bid, contactData);
                await delay(interval); // wait before next HubSpot call
                if (hubspotIds) {
                  bid.hubspotContactId = hubspotIds.hubspotContactId;
                  bid.hubspotLeadId = hubspotIds.hubspotLeadId;
                }
              });
      
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
      
      } catch (error) {
        console.error('Error in cron job:', error.response?.data || error.message);
      }
    }, {
      timezone: 'America/New_York',
    });
  })
  .catch(err => console.error('Error connecting to MongoDB:', err));

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
async function calculateSmartBidScore(bid) {
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
    let bidDistance = await getDistanceInMiles(bid.location.zip, process.env.SOURCE_ZIP_CODE); // example
    // Round up to nearest integer
    bidDistance = Math.ceil(bidDistance);
    const distanceArray = weights.distance;
  
    // const matchedRange = distanceArray.find(range => 
    //   (range.max === null && bidDistance > range.min) ||
    //   (bidDistance >= range.min && bidDistance < range.max)
    // );
    const matchedRange = distanceArray.find(range =>
      (range.max === null && bidDistance >= range.min) ||
      (bidDistance >= range.min && bidDistance <= range.max)
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
   (t.max === null && diffDays >= t.min) ||
   (diffDays >= t.min && diffDays <= t.max)
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
  
    const matchedSize = weights.projectSize.find(range => 
      (range.max === null && roundedSize >= range.min) ||          // last range
      (roundedSize >= range.min && roundedSize <= range.max)      // other ranges
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

async function upsertHubspotLead(bid,contactData){
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
                value:  contactData.email,
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
            company_name:`${bid.client?.company?.name}`,
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


async function getNextClientNumber() {
  const counter = await MasterSetting.findOneAndUpdate(
    { key: "clientCounter" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
}

// 👇 delay helper
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
