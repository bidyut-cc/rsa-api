const Setting = require("../Models/Setting.js");

const { Validator } = require("node-input-validator");
const email_helper = require("../Helpers/Sendmail");
const puppeteer = require("puppeteer");
const moment = require('moment');
const MasterSettingsController = require('./MasterSettingsController');
const Quotation = require("../Models/Quotation.js");
const mongoose = require('mongoose');
const { default: axios } = require("axios");
const Order = require("../Models/Order.js");
const Emailtemplate = require('../Models/Emailtemplate');
const querystring = require("querystring");
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { generateQuotePDF } = require("../Helpers/GeneratePdf.js");
const { imageUrlToDataUrl } = require("../Helpers/Base64Image.js");
const path = require('path');
class FrontendController {
  constructor() {
    // Bind the method to ensure correct context
    this.quotationCreate = this.quotationCreate.bind(this);
    this.generatePaymentLink = this.generatePaymentLink.bind(this);
    this.updatePaymentResponse = this.updatePaymentResponse.bind(this);
    this.generateQuotationPDF = this.generateQuotationPDF.bind(this);
    this.uploadAttachment = this.uploadAttachment.bind(this);
    this.quotationCreateNew = this.quotationCreateNew.bind(this);
  }

  async view(req, res) {
    // Validate the input data
    const v = new Validator(req.query, {
      step: "required|in:project,layout,measurement,quotation_builder",
    });

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      const { step } = req.query;
      try {
        const data = await Setting.findOne(
          { step: step },
          { step: 1, config: 1, _id: 1 }
        );
        res.status(200).json({
          status: true,
          data: data,
        });
      } catch (error) {
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }

  async config(req, res) {
    // Validate the input data
    const v = new Validator(req.body, {
      step: "required|array|minLength:1",  // Ensure step is an array with at least 1 element
      "step.*": "in:project,layout,measurement,quotation_builder",  // Validate each element in the array
    },{
        "step.*.in": "Each step must be one of the following: project, layout, measurement, or quotation_builder.",  // Custom message for invalid step values
      });
  
    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      const { step } = req.body;
      try {
        // Find data for each step in the array
        const data = await Setting.find(
          { step: { $in: step } },  // Use MongoDB's $in operator to find multiple steps
          { step: 1, config: 1, _id: 1 }
        );
        
        res.status(200).json({
          status: true,
          data: data,
        });
      } catch (error) {
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }
  

  async quotationCreateBkp(req, res) {
    const v = new Validator(
      req.body,
      {
        type: "required|string|in:IC,BW,ALIC,ALBW",
        no_of_stall: "required|integer|min:1|max:7",
        is_include_ada: "required|in:Yes,No",
      },
      {
        "type.in":
          "The type field must be one of the following: IC, BW, ALIC or ALBW.",
        "is_include_ada.required": "The is ada include field is mandatory.",
        "is_include_ada.in":
          "The ada include field must be one of the following: Yes or No.",
      }
    );

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      const { type, no_of_stall, is_include_ada } = req.body;
      try {
        const data = await Setting.findOne(
          {
            [`config.${type}.${no_of_stall}`]: { $exists: true },
          },
          {
            [`config.${type}.${no_of_stall}`]: 1,
            "config.ADA_price": 1,
            _id: 1, // Include or exclude as needed
          }
        );

        if (!data) {
          res.status(404).json({
            status: false,
            message: "Data not found",
          });
          return;
        }
        const ada_price = parseFloat(data.config.ADA_price) || 0; // Default to 0 if ADA_price is not defined
        // Prepare response data with ADA_price added to each item
        const stalls = data.config[type][no_of_stall].map((item) => {
          const itemPrice = parseFloat(item.price);
          return {
            ...item,
            price: itemPrice + (is_include_ada === "Yes" ? ada_price : 0), // Adjust price based on ADA inclusion
          };
        });
        const htmlContent = `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
        <tr>
            <td style="padding: 5px 10px; text-align: left;">
                 <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo">
            </td>
            <td style="padding: 5px 10px; text-align: right;">
                <h3><a href="tel:1-844-81-STALL" style="color:#3d58a4; text-decoration:none;  font-style: italic; font-size: 40px; font-weight: 600;">1-844-81-STALL</a></h3>
                <p style=" font-size:20px;      font-style: italic; margin-top: 5px;"><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
           </td>
        </tr>
        <tr>
            <td colspan="2" style="padding: 5px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact;  background: #edf5fb; border-radius: 30px; vertical-align: bottom;">
                <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                     <tr>
                        <td >
                             <h4 style="color:#3d58a4; font-size:35px; line-height: 1; font-weight: 600; margin-bottom: 10px; margin-top: 15px;">Your Quote</h4>
                             <p>Date: ${moment().format('MM/DD/YY')} </p>
                        </td>
                        <td align="right" style="text-align: right;">
                            <h4 style="border:4px solid #cbd5e1; padding: 5px 15px; background: #fff; display: inline-block; border-radius: 15px; color:#0061a5; font-size: 20px;">JOB NUMBER #${quotation.quotation_no}</h4>
                        </td>
                     </tr>
                </table>
            </td>
           
        </tr>
        <tr>
            <td colspan="2" style="text-align: center; margin-top: 0px;">
                <h4 style="font-size: 35px; color:#3d58a4; font-weight: 900; margin-bottom: 10px; font-family:Verdana, Geneva, Tahoma, sans-serif; margin-top: 15px;">Review the Prices for your Rooms</h4>
                <p style="font-size: 15px; line-height: 1.2; color:#000; font-weight: 400;">Prices and delivery times are subject to review by RSA. Add sales tax if applicable.</p>
            </td>
            
        </tr>
        <tr>
            <td colspan="2" width="100%" style="width: 100%;">
                <div class="table_box" style="margin-top: 20px;">
                    <div style="display: flex; align-items: center; width: 100%; justify-content: space-between;  flex-wrap: wrap; box-sizing: border-box; gap: 20px;">
                        ${materials.map(material => `
                        <div style="padding: 10px 40px 20px; text-align:left; border: 1px solid #3d58a4; border-radius: 15px;  width:48%; box-sizing: border-box;">
                            <div width="100%"  >
                                <div style="display: flex; align-items: center;">
                                 <div  style="width: 25% !important; margin-bottom: 0px;">
                                     <img src="${material.src}" alt="pic" style="width:100%"/>
                                 </div>
                                 <div  style="width: 75% !important; padding: 10px 20px 10px; margin-bottom: 0px !important;">
                                     <h4 style="color:#3d58a4; font-size: 20px; font-weight: 500; margin-bottom: 10px; margin-top: 5px;">${material.name}</h4>
                                     <h5 style="font-size: 28px; font-weight: 700; margin-top: 10px; margin-bottom: 10px;">$${material.price}</h5>
                              
                                     <h6 style="font-size: 22px; font-weight: 700; margin-top: 10px; margin-bottom: 10px;">3 years warranty</h6>
                                     <h6 style="margin-top: 10px; margin-bottom: 10px; display: flex; align-items: center;">
                                      ${results.map(room_data => `
                                      <span style="color:#0061a6; margin-right:10px; font-weight: 400; ">Room ${room_data.roomId}: <strong style="color:#000; display: block;">${room_data.full_type_name}</strong>
                                      </span>
                                      `).join('')}
                                      </h6>
                                     <p style="vertical-align: middle; margin-top:15px; display: flex; align-items: flex-start; justify-content: flex-start; line-height: 1.5;"><img src="${process.env.URI}/uploads/images/delevary.png" alt="pic" style="width: 20px; margin-right: 5px; "/> Delivered in 4 - 6 business days to
                                         ZIP 30549</p>
                                 </div>
             
                                </div>
                                <div>
                                   
                                        
                                             <div style="width:100%; display: flex; align-items: center; gap:25px">
                                                <div style="text-align: right; width: 50%;">
                                                    <a href="${process.env.QUOTATION_PDF_LINK_URL}?id=${quotation._id}" style="text-decoration: none; color:#000; padding: 14px 20px; border:1px solid #cbd5e1; border-radius: 10px; width: 80%; display: block; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px;"><img src="${process.env.URI}/uploads/images/videoicon1.png" alt="pc" style="width:20px; margin-right: 5px;"/> Videos</a>
                                                </div>
                                                <div  style="text-align: right; width: 50%;">
                                                    <a href="${process.env.QUOTATION_PDF_LINK_URL}?id=${quotation._id}" style="text-decoration: none; color:#000; padding: 14px 20px; border:1px solid #cbd5e1; border-radius: 10px; width: 80%; display: block; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px; margin-left: auto;"><img src="${process.env.URI}/uploads/images/color.png" alt="pc" style="width:20px; margin-right: 5px;"/> Colours</a>
                                                </div>
                                             </div>
                                        
                                    
                                 
                                </div>
                            </div>
                         </div>
                         `).join('')}
                         <div style="padding: 10px 40px; text-align:center; border: 1px solid #e4e8ef; border-radius: 15px; print-color-adjust: exact;  -webkit-print-color-adjust: exact;  background: #eef5fa; width:48%; box-sizing: border-box; min-height: 200px;" >
                            <img src="${process.env.URI}/uploads/images/on.png" alt="alt"/>
                            <p style="color:#000; font-size: 16px; line-height: 1.3; text-align: left; padding: 0px 30px; margin-top: 5px;">All doors, panels, pilaster, screws, brackets, and
                                anchors for a typical install are included.</p>
                            <p style="color:#000; font-size: 16px; line-height: 1.3; text-align: left; padding: 0px 30px;">Delivery from our local terminal to anywhere within
                                your specified zip code are also included. Please add
                                sales tax if applicable.</p>
                         </div> 
                    </div>
                </div>
               
            </td>
            
        </tr>
        
       
    </table>
    ${req.body.rooms.map((room, index) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px; margin-top: 40px;">
        <tr>
            <td style="padding: 10px; text-align: left;">
                 <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" >
            </td>
            <td style="padding: 10px; text-align: right;">
                <h3><a href="tel:1-844-81-STALL" style="color:#3d58a4; text-decoration:none;  font-style: italic; font-size: 40px; font-weight: 600;">1-844-81-STALL</a></h3>
                <p style=" font-size:20px;      font-style: italic; margin-top: 5px;"><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
           </td>
        </tr>
        <tr>
            <td colspan="2" style="padding: 10px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #edf5fb; border-radius: 30px; vertical-align: bottom;">
                <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                     <tr>
                        <td >
                             <h4 style="color:#3d58a4; font-size:35px; line-height: 1; font-weight: 600; margin-bottom: 10px; margin-top: 15px;">Your Quote</h4>
                             <p>Date: ${moment().format('MM/DD/YY')} </p>
                        </td>
                        <td align="right" style="text-align: right;">
                            <h4 style="border:4px solid #cbd5e1; padding: 5px 15px; background: #fff; display: inline-block; border-radius: 15px; color:#0061a5; font-size: 20px;">JOB NUMBER #${quotation.quotation_no}</h4>
                        </td>
                     </tr>
                </table>
            </td>
           
        </tr>
        <tr>
            <td colspan="2" style="padding-left: 50px;">
                <h5 style="color:#285fa1; font-size: 20px; line-height: 1.1; margin-top: 20px; margin-bottom: 0px;">Review your Layout</h5>
                
            </td>
        </tr>
        <tr>
            <td colspan="2" style="padding-left: 18px;">
                <table width="100%" cellpadding="0" cellspacing="30" style="table-layout: fixed;">
                    <tr>
                        <td width="35%" style="width: 35%; vertical-align: top;">
                            <h4 style="color:#000; font-size: 25px; font-weight: 900; margin-top: 10px;">Room ${index+1}</h4>
                            <span style="display: block; color:#000; font-size: 15px;">Room Name</span>
                            <h3 style="border: 1px solid #e3e8ef; padding: 10px; border-radius: 10px; font-weight: 400;      margin-top: 10px;">${room.title}</h3>
    
                            <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
                                <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 15px 20px; margin-bottom: 0px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; margin-bottom: 0px;"> Stalls</h4>
                                <h5 style="padding: 15px 20px; display: flex; align-items: center; margin-bottom: 0px; font-weight: 500; font-size: 16px; margin-top: 15px;"><img src="${process.env.URI}/uploads/images/home.png" alt="pic" style="margin-right: 10px; width: 15px; "/> ${room.stall.noOfStalls} Stalls</h5>
                                <div style="padding: 0px 20px 15px 20px; margin-top: 0px;">
                                    ${room?.stall?.stallConfig?.map((stall, stallIndex) => `
                                    <p style="margin-top: 0px; font-size: 15px;"><span style="color:#000; font-weight: 500;">Stall ${stallIndex+1} </span>- Width: ${stall.stallWidth}"; Door: ${stall.doorOpening}"; Door Swing: ${stall.doorSwing}
                                        .</p>
                                        `).join('')}
                                    <p style="display: flex; align-items: center; font-size: 14px;"><img src="${process.env.URI}/uploads/images/layout.png" alt="pic" style="width: 15px; margin-right:10px;"/><span style="color:#000; font-weight: 500;">Layout </span>- ${room.stall?.layout?.layoutDirection}</p>
                                </div>
                                
                            </div>
                            <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #eef5fa; padding:10px 20px; border-radius: 10px; margin-top: 40px;">
                                <span><img src="${process.env.URI}/uploads/images/on.png" alt="pic" style="margin-right: 10px; width:40px"/></span>
                                <p style="font-size: 15px;">Stall widths are to the centerline. Stall depths are to
                                    the face. Alcove depths are wall to wall. This layout is
                                    included in the price.</p>
                            </div>
                            <h5 style="color:#3d58a4; font-size: 20px; font-weight: 600; margin-bottom: 0px;">Need this layout bigger?</h5>
                            <p>No problem! Our partition Experts will design it to fit
                                your restroom.</p>
                        </td>
                        <td width="65%" style="width: 65%;">
                            <div style="border: 1px solid #e3e8ef; padding: 30px; text-align: center; width:90%; border-radius: 10px; min-height: 414px; display: flex; align-items: center; justify-content: center;">
                                <img src="${room.image_2D}" alt="pic" style="width:65%; margin: 0 auto;"/>
                            </div>
                            <div style="border: 1px solid #e3e8ef; padding: 30px; text-align: center; width:90%; border-radius: 10px; margin-top: 20px;">
                                <img src="${room.image_3D}" alt="pic" style="width:65%; margin: 0 auto;"/>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    ${room.hasUrinalScreens ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
      <tr>
          <td style="padding: 10px; text-align: left;">
               <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo">
          </td>
          <td style="padding: 10px; text-align: right;">
              <h3><a href="tel:1-844-81-STALL" style="color:#3d58a4; text-decoration:none;  font-style: italic; font-size: 40px; font-weight: 600;">1-844-81-STALL</a></h3>
              <p style=" font-size:20px;      font-style: italic; margin-top: 5px;"><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
         </td>
      </tr>
      <tr>
          <td colspan="2" style="padding: 10px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #edf5fb; border-radius: 30px; vertical-align: bottom;">
              <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                   <tr>
                      <td >
                           <h4 style="color:#3d58a4; font-size:35px; line-height: 1; font-weight: 600; margin-bottom: 10px; margin-top: 15px;">Your Quote</h4>
                           <p>Date: ${moment().format('MM/DD/YY')} </p>
                      </td>
                      <td align="right" style="text-align: right;">
                          <h4 style="border:4px solid #cbd5e1; padding: 5px 15px; background: #fff; display: inline-block; border-radius: 15px; color:#0061a5; font-size: 20px;">JOB NUMBER #${quotation.quotation_no}</h4>
                      </td>
                   </tr>
              </table>
          </td>
         
      </tr>
      <tr>
          <td colspan="2" style="padding-left: 28px;">
              <h5 style="color:#285fa1; font-size: 20px; line-height: 1.1; margin-top: 20px; margin-bottom: 0px;">Review your Layout</h5>
              
          </td>
      </tr>
      <tr>
          <td colspan="2" style="padding-left: 0px;">
              <table width="100%" cellpadding="0" cellspacing="30" style="table-layout: fixed;">
                  <tr>
                      <td width="35%" style="width: 35%; vertical-align: top;">
                          <h4 style="color:#000; font-size: 25px; font-weight: 900; margin-top: 10px;">Room ${index+1}</h4>
                          <span style="display: block; color:#000; font-size: 15px;">Room Name</span>
                          <h3 style="border: 1px solid #e3e8ef; padding: 10px; border-radius: 10px; font-weight: 400;      margin-top: 10px;">${room.title}</h3>
  
                          <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
                              <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 15px 20px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; "> Privacy screens/urinals</h4>
                              <h5 style="padding: 15px 20px; display: flex; align-items: center; margin-bottom: 0px; font-weight: 500; font-size: 16px; margin-top: 0px;"><img src="${process.env.URI}/uploads/images/home.png" alt="pic" style="margin-right: 10px; width: 15px;"/> 1 Privacy Screens / Urinals</h5>
                              <div style="padding: 0px 20px 15px 20px; margin-top: 0px;">
                                  <p style="margin-top: 0px;"><span style="color:#000; font-weight: 500;">Screen Depth </span>- ${room.urinalScreen?.urinalScreenConfig[0]?.screenDepth}"</p>
                                  
                              </div>
                              
                          </div>
                          <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #eef5fa; padding:10px 20px; border-radius: 10px; margin-top: 40px;">
                              <span><img src="${process.env.URI}/uploads/images/on.png" alt="pic" style="margin-right: 10px; width:40px"/></span>
                              <p style="font-size: 15px;">Stall widths are to the centerline. Stall depths are to
                                  the face. Alcove depths are wall to wall. This layout is
                                  included in the price.</p>
                          </div>
                          <h5 style="color:#3d58a4; font-size: 20px; font-weight: 600; margin-bottom: 0px;">Need this layout bigger?</h5>
                          <p>No problem! Our partition Experts will design it to fit
                              your restroom.</p>
                      </td>
                      <td width="65%" style="width: 65%;">
                          <div style="border: 1px solid #e3e8ef; padding: 15px; text-align: left; width:95%; border-radius: 10px; ">
                              <img src="${room.urinalScreen?.urinal_2D}" alt="pic" style="width:auto;  transform: scale(0.8) translateX(-75px);"/>
                          </div>
                          <div style="border: 1px solid #e3e8ef; padding: 15px; text-align: center; width:95%; border-radius: 10px; margin-top: 20px;">
                              <img src="${room.urinalScreen?.urinal_3D}" alt="pic" style="width:auto; margin: 0 auto;"/>
                          </div>
                      </td>
                  </tr>
              </table>
          </td>
      </tr>
  </table>
  ` : ''}
    `).join('')}
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 20px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
        <tr>
            <td colspan="2" style="width:100%; text-align: center;  border-radius: 12px; padding: 25px; ">
                <img src="${process.env.URI}/uploads/images/Logo.png" alt="alt"  />
            </td>
        </tr>
        <tr>
            <td colspan="2" style="width:100%; text-align: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #eef5fa; border-radius: 12px; padding: 15px 25px;">
                <img src="${process.env.URI}/uploads/images/clap.png" alt="alt" style="width: 50px;"/>
                <h4 style="font-size: 30px; color:#285fa1; font-weight: 900; margin-top: 10px; margin-bottom: 0px;">Thank You for Choosing Us!</h4>
            </td>
        </tr>
        <tr>
            <td colspan="2" style="width: 100%;">
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; vertical-align: top;">
                    
                     <tr>
                        <td style="width: 100%; display: flex; justify-content: center; align-items:center;">
                            <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 10px; vertical-align: top; text-align: center; border: 1px solid #e3e8ef; padding: 30px;  width:100%; border-radius: 10px; ">
                                <tr>
                                    <td colspan="4" style="width: 100%;">
                                        <h3 style="font-size: 34px; font-weight: 900; font-family:Verdana, Geneva, Tahoma, sans-serif; color:#285fa1; margin-bottom: 10px; margin-top: 0px;">Meet the Partition Experts</h3>
                                        <h6 style="color:#285fa1; font-size: 21px; margin-top: 10px; font-weight: 400;">The team behind making your dream ideas come true</h6>
                                    </td>
                                 </tr>
                                <tr>
                                    <td>
                                        <div>
                                            <img src="${process.env.URI}/uploads/images/Jim_Southard.png" alt="pic" style="margin-bottom: 15px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1;">Jim Southard</h4>
    
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <img src="${process.env.URI}/uploads/images/Josh_Williams.png" alt="pic" style="margin-bottom: 15px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1;">Josh Williams
                                            </h4>
    
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <img src="${process.env.URI}/uploads/images/DJ_Bunn.png" alt="pic" style="margin-bottom: 15px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1;">DJ Bunn</h4>
    
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <img src="${process.env.URI}/uploads/images/Jennifer_Hollis.png" alt="pic" style="margin-bottom: 15px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1;">Jennifer Hollis</h4>
    
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div>
                                            <img src="${process.env.URI}/uploads/images/Jim_Artman.png" alt="pic" style="margin-bottom: 15px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1;">Jim Artman</h4>
    
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <img src="${process.env.URI}/uploads/images/Megan_Schroeder.png" alt="pic" style="margin-bottom: 15px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1;">Megan Schroeder
                                            </h4>
    
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <img src="${process.env.URI}/uploads/images/Peyton_Cape.png" alt="pic" style="margin-bottom: 15px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1;">Peyton Cape
                                            </h4>
    
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <img src="${process.env.URI}/uploads/images/Rob_Watkins.png" alt="pic" style="margin-bottom: 15px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1;">Rob Watkins
                                            </h4>
    
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="4" style="width: 100%;">
                                        <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 0px; vertical-align: top; text-align: center;">
                                            <tr>
                                                <td>
                                                    <div>
                                                        <img src="${process.env.URI}/uploads/images/Tracy_Hanson.png" alt="pic" style="margin-bottom: 15px;"/>
                                                        <h4 style="margin-top: 0px; color:#285fa1;">Tracy Hanson
                                                        </h4>
            
                                                    </div>
                                                </td>
                                                <td>
                                                    <div>
                                                        <img src="${process.env.URI}/uploads/images/Travis_Perdue.png" alt="pic" style="margin-bottom: 15px;"/>
                                                        <h4 style="margin-top: 0px; color:#285fa1;">Travis Perdue
                                                        </h4>
            
                                                    </div>
                                                </td>
                                                <td>
                                                    <div>
                                                        <img src="${process.env.URI}/uploads/images/CJ_Cooper.png" alt="pic" style="margin-bottom: 15px;"/>
                                                        <h4 style="margin-top: 0px; color:#285fa1;">CJ Cooper
                                                        </h4>
            
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                   
                                    
                                </tr>
                            </table>
                        </td>
                     </tr>
                </table>
            </td>
            
        </tr>
        <tr>
            <td colspan="2" style="text-align: center;">
                <h5 style="color:#000; font-size: 20px; font-weight: 600; margin-bottom: 5px; margin-top: 10px;">Do you have questions?</h5>
                <p style="color:#000; font-size: 22px; ">Call us or email us and we'd be happy to assist you.</p>
             <h4 style="display: flex; align-items: center; justify-content: center;"><a href="tel:1-844-81-STALL" style="color:#285fa1; font-weight: 900; text-decoration: none; font-size: 30px; font-family:Verdana, Geneva, Tahoma, sans-serif; font-style:italic">1-844-81-STALL</a><a href="mailto:service@restroomstallsandall.com" style="font-size: 20px; color:#000; font-weight: 400; margin-left: 15px;">service@restroomstallsandall.com</a></h4>
            </td>
        </tr>
    </table>`;

        const pdfBuffer = await this.generatePDF(htmlContent); // Ensure this is called correctly
        if (!pdfBuffer || pdfBuffer.length === 0) {
          console.error("Generated PDF buffer is empty or undefined.");
          return res
            .status(500)
            .json({ status: false, message: "Failed to generate PDF." });
        }
        // Send email with PDF attachment
        await email_helper.sendEmail(
          {
            receivers: ["bidyut.patra@codeclouds.com"],
            subject: "Quotation PDF",
            context: { body_content: `<h2>Hello, Bidyut </h2>` },
          },
          [
            {
              filename: "quotation.pdf",
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ]
        );

        res.status(200).json({
          status: true,
          data: stalls,
        });
      } catch (error) {
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }

  async quotationCreate(req, res) {
    const v = new Validator(req.body, {
      first_name: "required",
      last_name: "required",
      email: "required",
      phone_number: "required",
      rooms: "required|array",
    });
  
    // Validate request body
    const matched = await v.check();
    if (!matched) {
      return res.status(422).json({
        status: false,
        errors: v.errors,
      });
    }
  
    try {
      const promises = req.body.rooms.map(async ({ id: roomId, stall }) => {
        const { type, noOfStalls: no_of_stall, adaStall: is_include_ada } = stall;
        let full_type_name = 
        type === 'IC' ? 'In Corner' :
        type === 'BW' ? 'Between Wall' :
        type === 'ALIC' ? 'Alcove Corner' :
        type === 'ALBW' ? 'Alcove Between Wall' : '';
  
        const data = await Setting.findOne(
          { [`config.${type}.${no_of_stall}`]: { $exists: true } },
          { [`config.${type}.${no_of_stall}`]: 1, "config.ADA_price": 1 }
        );
  
        if (!data) {
          throw new Error(`No configuration found for type: ${type}, no_of_stall: ${no_of_stall}`);
        }
  
        const ada_price = Number(data.config.ADA_price) || 0; 
  
        const stalls = data.config[type][no_of_stall].map((item) => ({
          ...item,
          price: Number(item.price) + (is_include_ada ? ada_price : 0),
        }));
  
        return { roomId, type, full_type_name ,stalls };
      });
  
      const results = await Promise.all(promises);
  
      // Aggregate prices and map materials in one pass
      const priceByProductAndRoom = {};
      const reqQuery = { query: { key: 'materials' } };
      const masterSettingResponse = await new MasterSettingsController().materialView(reqQuery, res);
      const masterSettings = masterSettingResponse; 
  
      if (!masterSettings || masterSettings.length === 0) {
        throw new Error('No active materials found');
      }
  
    //   results.forEach(({ stalls }) => {
    //     stalls.forEach(({ name, id, price }) => {
    //       if (!priceByProduct[name]) {
    //         priceByProduct[name] = { price: 0, id }; 
    //       }
    //       priceByProduct[name].price += price;
    //     });
    //   });
  
    //   const materials = Object.keys(priceByProduct).map((productName) => {
    //     const matchingMaterial = masterSettings.find((material) => material.name === productName);
    //     return {
    //       id: priceByProduct[productName].id,
    //       name: productName,
    //       price: priceByProduct[productName].price.toFixed(2),
    //       src: matchingMaterial ? matchingMaterial.src : null
    //     };
    //   });

      results.forEach(({ roomId, stalls }) => {
        stalls.forEach(({ name, id, price }) => {
          if (!priceByProductAndRoom[name]) {
            priceByProductAndRoom[name] = { id, totalPrice: 0, rooms: [] }; 
          }
          priceByProductAndRoom[name].totalPrice += price;
      
          // Track price details for each room
          priceByProductAndRoom[name].rooms.push({ room_id: roomId, price: price.toFixed(2) });
        });
      });
      
      // Build materials array with price details per room
      const materials = Object.keys(priceByProductAndRoom).map((productName) => {
        const matchingMaterial = masterSettings.find((material) => material.name === productName);
        return {
          id: priceByProductAndRoom[productName].id,
          name: productName,
          price: priceByProductAndRoom[productName].totalPrice.toFixed(2), // total aggregated price
          src: matchingMaterial ? matchingMaterial.src : null,
          price_details: priceByProductAndRoom[productName].rooms, // detailed price per room
        };
      });
      let zendesk_ticket_id = '';
      let quotation = new Quotation;
      quotation.quotation_no = Date.now();
      quotation.first_name = req.body.first_name;
      quotation.last_name = req.body.last_name;
      quotation.email = req.body.email;
      quotation.phone_number = req.body.phone_number;
      quotation.submittedData = req.body;
      quotation.roomData = results;
      quotation.materials = materials;
 
      const htmlContent = `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
      <tr>
          <td style="padding: 10px; text-align: left;">
               <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
          </td>
          <td style="padding: 10px; text-align: right;">
              <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-844-81-STALL" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
              <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
         </td>
      </tr>
      <tr>
          <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #edf5fb; border-radius: 30px; vertical-align: bottom;">
              <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                   <tr>
                      <td colspan="2">
                           <h4 style="color:#0061a6; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation.quotation_no}</h4>
                           <p style="margin-top: 5px; margin-bottom: 0px;">Date: ${moment().format('MM/DD/YY')} </p>
                      </td>
                   </tr>
              </table>
          </td>
         
      </tr>
      <tr>
          <td colspan="2" style="text-align: center; margin-top: 0px;">
              <h4 style="font-size: 28px; color:#3d58a4; font-weight: 900; margin-bottom: 10px; font-family:Verdana, Geneva, Tahoma, sans-serif; margin-top: 10px;">Review the Prices for your Rooms</h4>
              <div style="display: flex; align-items: center; justify-content:center; position: relative;">
                <p style="font-size: 12px; line-height: 1.2; color:#000; font-weight: 400;">Prices and delivery times are subject to review by RSA. Add sales tax if applicable.</p>
                <a href="${process.env.QUOTATION_PDF_LINK_URL}?id=${quotation._id}&abandoned=1" style="color:#000; font-size: 15px; line-height: 18px; border: 1px solid #000; font-family: Verdana, Geneva, Tahoma, sans-serif; border-radius: 5px; padding: 6px 20px; text-decoration: none; margin-left: 0px; position: absolute; right: 0;">Buy</a>
              </div>
              
          </td>
          
      </tr>
      <tr>
          <td colspan="2" width="100%" style="width: 100%;">
              <div class="table_box" style="margin-top: 5px;">
                  <div style="display: flex; align-items: center; width: 100%; justify-content: space-between;  flex-wrap: wrap; box-sizing: border-box; gap: 20px;">
                      ${materials.map(material => `
                      <div style="padding: 10px 20px 20px; text-align:left; border: 1px solid #3d58a4; border-radius: 15px;  width:48%; box-sizing: border-box;">
                          <div width="100%"  >
                              <div style="display: flex; align-items: center;">
                               <div  style="width: 25% !important; margin-bottom: 0px;">
                                   <img src="${material.src}" alt="pic" style="width:100%"/>
                               </div>
                               <div  style="width: 75% !important; padding: 0px 20px 10px; margin-bottom: 0px !important;">
                                   <h4 style="color:#3d58a4; font-size: 16px; font-weight: 500; margin-bottom: 10px; margin-top: 5px;">${material.name}</h4>
                                   <h5 style="font-size: 22px; font-weight: 700; margin-top: 10px; margin-bottom: 5px;">$${material.price}</h5>
                            
                                   <h6 style="font-size: 16px; font-weight: 700; margin-top: 5px; margin-bottom: 10px;">3 years warranty</h6>
                                   <h6 style="margin-top: 10px; margin-bottom: 5px; display: flex; align-items: center;">
                                    ${results.map(room_data => `
                                    <span style="color:#0061a6; margin-right:10px; font-weight: 400; ">Room ${room_data.roomId}: <strong style="color:#000; display: block;">${room_data.full_type_name}</strong>
                                    </span>
                                    `).join('')}
                                    </h6>
                                   <p style="vertical-align: middle; margin-top:15px; display: flex; align-items: flex-start; justify-content: flex-start; line-height: 1.1; margin-bottom: 0px; font-size: 13px;"><img src="${process.env.URI}/uploads/images/delevary.png" alt="pic" style="width: 20px; margin-right: 5px; "/> Delivered in 4 - 6 business days to
                                       ZIP 30549</p>
                               </div>
           
                              </div>
                              <div>
                                 
                                      
                                           <div style="width:100%; display: flex; align-items: center; gap:0px">
                                              <div style="text-align: right; width: 100%;">
                                                  <a href="${process.env.QUOTATION_PAYMENT_URL}?id=${quotation._id}&material_id=${material.id}&color=3d58a4" style="text-decoration: none; color:#000; padding: 8px 10px; border:1px solid #cbd5e1; border-radius: 10px; width: 96%; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px;"><img src="${process.env.URI}/uploads/images/cart.png" alt="pc" style="width:20px; margin-right: 5px;"/> Buy Now</a>
                                              </div>
                                              <!-- <div  style="text-align: right; width: 50%;">
                                                  <a href="${process.env.QUOTATION_PDF_LINK_URL}?id=${quotation._id}" style="text-decoration: none; color:#000; padding: 8px 10px; border:1px solid #cbd5e1; border-radius: 10px; width: 80%; display: block; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px; margin-left: auto;"><img src="${process.env.URI}/uploads/images/color.png" alt="pc" style="width:20px; margin-right: 5px;"/> Colours</a>
                                              </div> -->
  
                                           </div>
                                      
                                  
                               
                              </div>
                          </div>
                       </div>
                       `).join('')}
                       <div style="padding: 10px 40px; text-align:center; border: 1px solid #e4e8ef; border-radius: 15px; print-color-adjust: exact;  -webkit-print-color-adjust: exact;  background: #eef5fa; width:48%; box-sizing: border-box; min-height: 200px;" >
                          <img src="${process.env.URI}/uploads/images/on.png" alt="alt" style="width:30px"/>
                          <p style="color:#000; font-size: 14px; line-height: 1.3; text-align: left; padding: 0px 30px; margin-top: 5px;">All doors, panels, pilaster, screws, brackets, and
                              anchors for a typical install are included.</p>
                          <p style="color:#000; font-size: 14px; line-height: 1.3; text-align: left; padding: 0px 30px;">Delivery from our local terminal to anywhere within
                              your specified zip code are also included. Please add
                              sales tax if applicable.</p>
                       </div> 
                  </div>
              </div>
             
          </td>
          
      </tr>
      
     
  </table>
  ${req.body.rooms.map((room, index) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px; margin-top: 40px;">
          <tr>
              <td style="padding: 10px; text-align: left;">
                   <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
              </td>
              <td style="padding: 10px; text-align: right;">
                  <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-844-81-STALL" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
                  <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
             </td>
          </tr>
          <tr>
              <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #edf5fb; border-radius: 30px; vertical-align: bottom;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                       <tr>
                          <td colspan="2">
                               <h4 style="color:#0061a6; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation.quotation_no}</h4>
                               <p style="margin-top: 5px; margin-bottom: 0px;">Date: ${moment().format('MM/DD/YY')} </p>
                          </td>
                       </tr>
                  </table>
              </td>
             
          </tr>
          <tr>
              <td colspan="2" style="padding-left: 10px;">
                  <h5 style="color:#285fa1; font-size: 20px; line-height: 1; margin-top: 10px; margin-bottom: 0px;">Review your Layout</h5>
                  
              </td>
          </tr>
          <tr>
              <td colspan="2" >
                  <table width="100%" cellpadding="0" cellspacing="20" style="table-layout: fixed;">
                      <tr>
                          <td width="100%" style="width: 100%; vertical-align: top;" colspan="2">
                              <h4 style="color:#000; font-size: 20px; font-weight: 900; margin-top: 0px; margin-bottom: 10px;">Room ${index+1}</h4>
                              <div style="display: flex; align-items:center;">
                              <span style="display: block; color:#000; font-size: 15px;  width:50%">Room Name</span>
                              <h3 style="border: 1px solid #e3e8ef; padding: 7px; border-radius: 10px; font-weight: 400;      margin-top: 10px; font-size: 13px; width:50%; margin-bottom: 10px; margin-top: 0px;">#${index+1}. ${room.title}</h3>
                              </div>
  
                              <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
                                  <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 7px 14px; margin-bottom: 0px; font-size: 13px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; margin-bottom: 0px;"> Stalls</h4>
                                  <h5 style="padding: 5px 20px 12px; display: flex; align-items: center; margin-bottom: 0px; font-weight: 500; font-size: 15px; margin-top: 5px;"><img src="${process.env.URI}/uploads/images/home.png" alt="pic" style="margin-right: 10px; width: 15px; "/> ${room.stall.noOfStalls} Stalls</h5>
                                  <div style="padding: 0px 20px 15px 20px; margin-top: 0px; display: flex; flex-wrap: wrap; justify-content: space-between;">
                                      ${room?.stall?.stallConfig?.map((stall, stallIndex) =>`
                                      <p style="margin-top: 0px; font-size: 13px; width:48%; margin-bottom: 0; line-height: 1;"><span style="color:#000; font-weight: 700; color:#0061a6; line-height: 1;">Stall ${stallIndex+1} </span>- <span style="font-weight: 600; line-height: 1;">Width:</span> ${stall.stallWidth}"; <span style="font-weight: 600;">Door:</span> ${stall.doorOpening}"; <span style="font-weight: 600;">Door Swing:</span> ${stall.doorSwing?.name}
                                          .</p>
                                          `).join('')}        
                                      <p style="display: flex; align-items: center; font-size: 14px; width:100%; line-height: 1;"><img src="${process.env.URI}/uploads/images/layout.png" alt="pic" style="width: 15px; margin-right:10px;"/><span style="color:#000; font-weight: 500; font-weight: 700; line-height: 1;color:#0061a6;">Layout </span>- ${room.stall?.layout?.layoutDirection}</p>
                                  </div>
                                  
                              </div>
                              
                          </td>
                      </tr>
                      <tr>
                          <td colspan="2" width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
                              <div style=" padding: 13px; text-align: center; width:95%;  min-height: 140px; display: flex; align-items: center; justify-content: center;">
                                  <img src="${room.image_2D}" alt="pic" style="width:100%; margin: 0 auto;"/>
                              </div>
                              
                          </td>
                          <!-- <td width="50%" style="width: 50%; border: 1px solid #e3e8ef; border-radius: 10px;">
                              <div style=" padding: 13px; text-align: center; width:95%;  margin-top: 10px;">
                                  <img src="${room.image_3D}" alt="pic" style="width:100%; margin: 0 auto;"/>
                              </div>
                          </td> -->
                      </tr>
                      <tr>
                          <td width="50%" style="width: 50%;">
                              <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #eef5fa; padding:10px 20px; border-radius: 10px; margin-top: 0px; ">
                              <span><img src="${process.env.URI}/uploads/images/on.png" alt="pic" style="margin-right: 10px; width:40px"/></span>
                              <p style="font-size: 15px; margin: 0px;">Stall widths are to the centerline. Stall depths are to
                                  the face. Alcove depths are wall to wall. This layout is
                                  included in the price.</p>
                              </div>
                          </td>
                          <td width="50%" style="width: 50%;">
                              <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need this layout bigger?</h5>
                              <p style="margin-top: 5px; margin-bottom: 5px;">No problem! Our partition Experts will design it to fit
                              your restroom.</p>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
  </table>
  ${room.hasUrinalScreens ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
          <tr>
              <td style="padding: 10px; text-align: left;">
                   <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
              </td>
              <td style="padding: 10px; text-align: right;">
                  <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-844-81-STALL" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
                  <p style=" font-size:16px;      font-style: italic; margin-top: 5px;"><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
             </td>
          </tr>
          <tr>
              <td colspan="2" style="padding: 10px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #edf5fb; border-radius: 30px; vertical-align: bottom;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                       <tr>
                          <td colspan="2">
                               <h4 style="color:#0061a6; font-size:26px; line-height: 1; font-weight: 600; margin-bottom: 10px; margin-top: 15px;">Quote Number #${quotation.quotation_no}</h4>
                               <p>Date: ${moment().format('MM/DD/YY')} </p>
                          </td>
                       </tr>
                  </table>
              </td>
             
          </tr>
          <tr>
              <td colspan="2" style="padding-left: 0px;">
                  <h5 style="color:#285fa1; font-size: 20px; line-height: 1; margin-top: 10px; margin-bottom: 0px;">Review your Layout</h5>
                  
              </td>
          </tr>
          <tr>
              <td colspan="2" style="padding-left: 0px;">
                  <table width="100%" cellpadding="0" cellspacing="30" style="table-layout: fixed;">
                      <tr>
                          <td width="100%" style="width: 100%; vertical-align: top;" colspan="2">
                              <h4 style="color:#000; font-size: 20px; font-weight: 900; margin-top: 0px; margin-bottom: 10px;">Room ${index+1}</h4>
                              <div style="display: flex; align-items:center;">
                                  <span style="display: block; color:#000; font-size: 15px; width:50%">Room Name</span>
                                  <h3 style="border: 1px solid #e3e8ef; padding: 10px; border-radius: 10px; font-weight: 400;      margin-top: 1px; width:50%">#${index+1}. ${room.title}</h3>
                              </div>
                              <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
                                  <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 15px 20px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; "> Privacy screens/urinals</h4>
                                  <h5 style="padding: 15px 20px; display: flex; align-items: center; margin-bottom: 0px; font-weight: 500; font-size: 16px; margin-top: 0px;"><img src="${process.env.URI}/uploads/images/home.png" alt="pic" style="margin-right: 10px; width: 15px;"/> ${room.urinalScreen?.noOfUrinalScreens} Privacy Screens / Urinals</h5>
                                  <div style="padding: 0px 20px 15px 20px; margin-top: 0px;">
                                      <p style="margin-top: 0px;"><span style="color:#000; font-weight: 500;">Screen Depth </span>- ${room.urinalScreen?.urinalScreenConfig[0]?.screenDepth}"</p>
                                      
                                  </div>
                                  
                              </div>
                              
                          </td>
                          </tr>
                          <tr>
                          <td colspan="2"  width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
                              <div style=" padding: 3px; text-align: center; width:97%;  ">
                                  <img src="${room.urinalScreen?.urinal_2D}" alt="pic" style="width:100%;  transform: scale(1) ;"/>
                              </div>
                              
                          </td>
                          <!-- <td width="50%" style="width: 50%; border: 1px solid #e3e8ef; border-radius: 10px;">
                              <div style=" padding: 3px; text-align: center; width:97%;  margin-top: 10px;">
                                  <img src="${room.urinalScreen?.urinal_3D}" alt="pic" style="width:100%; margin: 0 auto; transform: scale(1)"/>
                              </div>
                          </td> -->
                      </tr>
                      <tr>
                          <td width="50%" style="width: 50%;">
                              <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #eef5fa; padding:10px 20px; border-radius: 10px; margin-top: 0px;">
                              <span><img src="${process.env.URI}/uploads/images/on.png" alt="pic" style="margin-right: 10px; width:40px"/></span>
                              <p style="font-size: 15px; margin: 0px;">Stall widths are to the centerline. Stall depths are to
                                  the face. Alcove depths are wall to wall. This layout is
                                  included in the price.</p>
                              </div>
                          </td>
                          <td width="50%" style="width: 50%;">
                              <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need this layout bigger?</h5>
                              <p style="margin-top: 0px;">No problem! Our partition Experts will design it to fit
                              your restroom.</p>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
  </table>
  ` : ''}
  `).join('')}
  <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 20px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
      <tr>
          <td colspan="2" style="width:100%; text-align: center;  border-radius: 12px; padding: 10px; ">
              <img src="${process.env.URI}/uploads/images/Logo.png" alt="alt" style="width:150px" />
          </td>
      </tr>
      <tr>
          <td colspan="2" style="width:100%; text-align: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #eef5fa; border-radius: 12px; padding: 10px 25px;">
              <img src="${process.env.URI}/uploads/images/clap.png" alt="alt" style="width: 50px;"/>
              <h4 style="font-size: 22px; color:#285fa1; font-weight: 900; margin-top: 10px; margin-bottom: 0px;">Thank You for Choosing Us!</h4>
          </td>
      </tr>
      <tr>
          <td colspan="2" style="width: 100%;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 0px; vertical-align: top;">
                  
                   <tr>
                      <td style="width: 100%; display: flex; justify-content: center; align-items:center;">
                          <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 10px; vertical-align: top; text-align: center; border: 1px solid #e3e8ef; padding: 10px;  width:100%; border-radius: 10px; ">
                              <tr>
                                  <td colspan="4" style="width: 100%;">
                                      <h3 style="font-size: 21px; font-weight: 900; font-family:Verdana, Geneva, Tahoma, sans-serif; color:#285fa1; margin-bottom: 10px; margin-top: 0px;">Meet the Partition Experts</h3>
                                      <h6 style="color:#285fa1; font-size: 18px; margin-top: 5px; font-weight: 400; margin-bottom: 10px;">The team behind making your dream ideas come true</h6>
                                  </td>
                               </tr>
                              <tr>
                                  <td>
                                      <div>
                                          <img src="${process.env.URI}/uploads/images/Jim_Southard.png" alt="pic" style="margin-bottom: 10px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Jim Southard</h4>
  
                                      </div>
                                  </td>
                                  <td>
                                      <div>
                                          <img src="${process.env.URI}/uploads/images/Josh_Williams.png" alt="pic" style="margin-bottom: 10px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Josh Williams
                                          </h4>
  
                                      </div>
                                  </td>
                                  <td>
                                      <div>
                                          <img src="${process.env.URI}/uploads/images/DJ_Bunn.png" alt="pic" style="margin-bottom: 10px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">DJ Bunn</h4>
  
                                      </div>
                                  </td>
                                  <td>
                                      <div>
                                          <img src="${process.env.URI}/uploads/images/Jennifer_Hollis.png" alt="pic" style="margin-bottom: 10px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Jennifer Hollis</h4>
  
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div>
                                          <img src="${process.env.URI}/uploads/images/Jim_Artman.png" alt="pic" style="margin-bottom: 10px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Jim Artman</h4>
  
                                      </div>
                                  </td>
                                  <td>
                                      <div>
                                          <img src="${process.env.URI}/uploads/images/Megan_Schroeder.png" alt="pic" style="margin-bottom: 10px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Megan Schroeder
                                          </h4>
  
                                      </div>
                                  </td>
                                  <td>
                                      <div>
                                          <img src="${process.env.URI}/uploads/images/Peyton_Cape.png" alt="pic" style="margin-bottom: 10px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Peyton Cape
                                          </h4>
  
                                      </div>
                                  </td>
                                  <td>
                                      <div>
                                          <img src="${process.env.URI}/uploads/images/Rob_Watkins.png" alt="pic" style="margin-bottom: 10px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Rob Watkins
                                          </h4>
  
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colspan="4" style="width: 100%;">
                                      <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 0px; vertical-align: top; text-align: center;">
                                          <tr>
                                              <td>
                                                  <div>
                                                      <img src="${process.env.URI}/uploads/images/Tracy_Hanson.png" alt="pic" style="margin-bottom: 10px;"/>
                                                      <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Tracy Hanson
                                                      </h4>
          
                                                  </div>
                                              </td>
                                              <td>
                                                  <div>
                                                      <img src="${process.env.URI}/uploads/images/Travis_Perdue.png" alt="pic" style="margin-bottom: 10px;"/>
                                                      <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Travis Perdue
                                                      </h4>
          
                                                  </div>
                                              </td>
                                              <td>
                                                  <div>
                                                      <img src="${process.env.URI}/uploads/images/CJ_Cooper.png" alt="pic" style="margin-bottom: 10px;"/>
                                                      <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">CJ Cooper
                                                      </h4>
          
                                                  </div>
                                              </td>
                                          </tr>
                                      </table>
                                  </td>
                                 
                                  
                              </tr>
                          </table>
                      </td>
                   </tr>
              </table>
          </td>
          
      </tr>
      <tr>
          <td colspan="2" style="text-align: center;">
              <h5 style="color:#000; font-size: 20px; font-weight: 600; margin-bottom: 5px; margin-top: 10px;">Do you have questions?</h5>
              <p style="color:#000; font-size: 18px; margin-top: 10px; margin-bottom: 10px;">Call us or email us and we'd be happy to assist you.</p>
           <h4 style="display: flex; align-items: center; justify-content: center; margin-top: 10px; margin-bottom: 10px;"><a href="tel:1-844-81-STALL" style="color:#285fa1; font-weight: 900; text-decoration: none; font-size: 24px; font-family:Verdana, Geneva, Tahoma, sans-serif; font-style:italic">1-844-81-STALL</a><a href="mailto:service@restroomstallsandall.com" style="font-size: 20px; color:#000; font-weight: 400; margin-left: 15px;">service@restroomstallsandall.com</a></h4>
          </td>
      </tr>
  </table>`;

      const pdfBuffer = await this.generatePDF(htmlContent); // Ensure this is called correctly
      if (!pdfBuffer || pdfBuffer.length === 0) {
        console.error("Generated PDF buffer is empty or undefined.");
        return res
          .status(500)
          .json({ status: false, message: "Failed to generate PDF." });
      }

    //   var email_verification_template = await Emailtemplate.findOne({
    //     code: "QUOTATION",
    // }).exec();
    // var template = email_verification_template.template;
    // let body = template.replace("{{name}}", `${quotation.first_name} ${quotation.last_name}`);
      // Send email with PDF attachment
      // await email_helper.sendEmail(
      //   {
      //     receivers: ["bidyut.patra@codeclouds.com",quotation.email],
      //     subject: "Quotation PDF",
      //     context: { body_content: body },
      //   },
      //   [
      //     {
      //       filename: "quotation.pdf",
      //       content: pdfBuffer,
      //       contentType: "application/pdf",
      //     },
      //   ]
      // );







    const uploadToken = await this.uploadAttachment(Buffer.from(pdfBuffer, 'base64'),'quotation.pdf');
    const ticketData = {
      ticket: {
        subject: `New Quotation #${quotation.quotation_no}`,
        requester: {
          email: quotation.email,
          name: `${quotation.first_name} ${quotation.last_name}`,
      },
        // custom_fields: [
        //   {
        //     id: 22019106776722,  // Replace with your Zendesk custom field ID for order number
        //     value: 123,
        //   },
        //   {
        //     id: 22019094465938,  // Replace with your Zendesk custom field ID for order total
        //     value: 1234,
        //   },
        // ],
        comment: {
          body:`Quotation Details:
          - Quotation No: ${quotation.quotation_no}
          - Name: ${quotation.first_name} ${quotation.last_name}
          - Email: ${quotation.email}
          - Phone: ${quotation.phone_number}`,
          
          uploads: [uploadToken], // Attach the upload token here
      },
        tags: ['Quotation'],
      },
    };
    const ticket=await this.createTicket(ticketData);
    zendesk_ticket_id=ticket.id;

    quotation.zendesk_ticket_id = zendesk_ticket_id;
   await quotation.save();
  
      res.status(200).json({
        status: true,
        data: {
          id:quotation._id,
          submittedData: req.body,
          roomData: results,
          materials,
         uploadToken:uploadToken,
         ticket:ticket
        
        },
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }

  async quotationCreateNew(req, res) {
    const v = new Validator(req.body, {
      first_name: "required",
      last_name: "required",
      email: "required",
      phone_number: "required",
      rooms: "required|array",
    });
  
    // Validate request body
    const matched = await v.check();
    if (!matched) {
      return res.status(422).json({
        status: false,
        errors: v.errors,
      });
    }
  
    try {
      const promises = req.body.rooms.map(async ({ id: roomId, stall }) => {
        const { type, noOfStalls: no_of_stall, adaStall: is_include_ada } = stall;
        let full_type_name = 
        type === 'IC' ? 'In Corner' :
        type === 'BW' ? 'Between Wall' :
        type === 'ALIC' ? 'Alcove Corner' :
        type === 'ALBW' ? 'Alcove Between Wall' : '';
  
        const data = await Setting.findOne(
          { [`config.${type}.${no_of_stall}`]: { $exists: true } },
          { [`config.${type}.${no_of_stall}`]: 1, "config.ADA_price": 1 }
        );
  
        if (!data) {
          throw new Error(`No configuration found for type: ${type}, no_of_stall: ${no_of_stall}`);
        }
  
        const ada_price = Number(data.config.ADA_price) || 0; 
  
        const stalls = data.config[type][no_of_stall].map((item) => ({
          ...item,
          price: Number(item.price) + (is_include_ada ? ada_price : 0),
        }));
  
        return { roomId, type, full_type_name ,stalls };
      });
  
      const results = await Promise.all(promises);
  
      // Aggregate prices and map materials in one pass
      const priceByProductAndRoom = {};
      const reqQuery = { query: { key: 'materials' } };
      const masterSettingResponse = await new MasterSettingsController().materialView(reqQuery, res);
      const masterSettings = masterSettingResponse; 
  
      if (!masterSettings || masterSettings.length === 0) {
        throw new Error('No active materials found');
      }
  
    //   results.forEach(({ stalls }) => {
    //     stalls.forEach(({ name, id, price }) => {
    //       if (!priceByProduct[name]) {
    //         priceByProduct[name] = { price: 0, id }; 
    //       }
    //       priceByProduct[name].price += price;
    //     });
    //   });
  
    //   const materials = Object.keys(priceByProduct).map((productName) => {
    //     const matchingMaterial = masterSettings.find((material) => material.name === productName);
    //     return {
    //       id: priceByProduct[productName].id,
    //       name: productName,
    //       price: priceByProduct[productName].price.toFixed(2),
    //       src: matchingMaterial ? matchingMaterial.src : null
    //     };
    //   });

      results.forEach(({ roomId, stalls }) => {
        stalls.forEach(({ name, id, price }) => {
          if (!priceByProductAndRoom[name]) {
            priceByProductAndRoom[name] = { id, totalPrice: 0, rooms: [] }; 
          }
          priceByProductAndRoom[name].totalPrice += price;
      
          // Track price details for each room
          priceByProductAndRoom[name].rooms.push({ room_id: roomId, price: price.toFixed(2) });
        });
      });
      
      // Build materials array with price details per room
      const materials = Object.keys(priceByProductAndRoom).map((productName) => {
        const matchingMaterial = masterSettings.find((material) => material.name === productName);
        return {
          id: priceByProductAndRoom[productName].id,
          name: productName,
          price: priceByProductAndRoom[productName].totalPrice.toFixed(2), // total aggregated price
          src: matchingMaterial ? matchingMaterial.src : null,
          price_details: priceByProductAndRoom[productName].rooms, // detailed price per room
        };
      });
      let zendesk_ticket_id = '';
      let quotation = new Quotation;
      quotation.quotation_no = Date.now();
      quotation.first_name = req.body.first_name;
      quotation.last_name = req.body.last_name;
      quotation.email = req.body.email;
      quotation.phone_number = req.body.phone_number;
      quotation.submittedData = req.body;
      quotation.roomData = results;
      quotation.materials = materials;
 
  //     const htmlContent = `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
  //     <tr>
  //         <td style="padding: 10px; text-align: left;">
  //              <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
  //         </td>
  //         <td style="padding: 10px; text-align: right;">
  //             <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-844-81-STALL" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
  //             <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
  //        </td>
  //     </tr>
  //     <tr>
  //         <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #edf5fb; border-radius: 30px; vertical-align: bottom;">
  //             <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
  //                  <tr>
  //                     <td colspan="2">
  //                          <h4 style="color:#0061a6; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation.quotation_no}</h4>
  //                          <p style="margin-top: 5px; margin-bottom: 0px;">Date: ${moment().format('MM/DD/YY')} </p>
  //                     </td>
  //                  </tr>
  //             </table>
  //         </td>
         
  //     </tr>
  //     <tr>
  //         <td colspan="2" style="text-align: center; margin-top: 0px;">
  //             <h4 style="font-size: 28px; color:#3d58a4; font-weight: 900; margin-bottom: 10px; font-family:Verdana, Geneva, Tahoma, sans-serif; margin-top: 10px;">Review the Prices for your Rooms</h4>
  //             <div style="display: flex; align-items: center; justify-content:center; position: relative;">
  //               <p style="font-size: 12px; line-height: 1.2; color:#000; font-weight: 400;">Prices and delivery times are subject to review by RSA. Add sales tax if applicable.</p>
  //               <a href="${process.env.QUOTATION_PDF_LINK_URL}?id=${quotation._id}&abandoned=1" style="color:#000; font-size: 15px; line-height: 18px; border: 1px solid #000; font-family: Verdana, Geneva, Tahoma, sans-serif; border-radius: 5px; padding: 6px 20px; text-decoration: none; margin-left: 0px; position: absolute; right: 0;">Buy</a>
  //             </div>
              
  //         </td>
          
  //     </tr>
  //     <tr>
  //         <td colspan="2" width="100%" style="width: 100%;">
  //             <div class="table_box" style="margin-top: 5px;">
  //                 <div style="display: flex; align-items: center; width: 100%; justify-content: space-between;  flex-wrap: wrap; box-sizing: border-box; gap: 20px;">
  //                     ${materials.map(material => `
  //                     <div style="padding: 10px 20px 20px; text-align:left; border: 1px solid #3d58a4; border-radius: 15px;  width:48%; box-sizing: border-box;">
  //                         <div width="100%"  >
  //                             <div style="display: flex; align-items: center;">
  //                              <div  style="width: 25% !important; margin-bottom: 0px;">
  //                                  <img src="${material.src}" alt="pic" style="width:100%"/>
  //                              </div>
  //                              <div  style="width: 75% !important; padding: 0px 20px 10px; margin-bottom: 0px !important;">
  //                                  <h4 style="color:#3d58a4; font-size: 16px; font-weight: 500; margin-bottom: 10px; margin-top: 5px;">${material.name}</h4>
  //                                  <h5 style="font-size: 22px; font-weight: 700; margin-top: 10px; margin-bottom: 5px;">$${material.price}</h5>
                            
  //                                  <h6 style="font-size: 16px; font-weight: 700; margin-top: 5px; margin-bottom: 10px;">3 years warranty</h6>
  //                                  <h6 style="margin-top: 10px; margin-bottom: 5px; display: flex; align-items: center;">
  //                                   ${results.map(room_data => `
  //                                   <span style="color:#0061a6; margin-right:10px; font-weight: 400; ">Room ${room_data.roomId}: <strong style="color:#000; display: block;">${room_data.full_type_name}</strong>
  //                                   </span>
  //                                   `).join('')}
  //                                   </h6>
  //                                  <p style="vertical-align: middle; margin-top:15px; display: flex; align-items: flex-start; justify-content: flex-start; line-height: 1.1; margin-bottom: 0px; font-size: 13px;"><img src="${process.env.URI}/uploads/images/delevary.png" alt="pic" style="width: 20px; margin-right: 5px; "/> Delivered in 4 - 6 business days to
  //                                      ZIP 30549</p>
  //                              </div>
           
  //                             </div>
  //                             <div>
                                 
                                      
  //                                          <div style="width:100%; display: flex; align-items: center; gap:0px">
  //                                             <div style="text-align: right; width: 100%;">
  //                                                 <a href="${process.env.QUOTATION_PAYMENT_URL}?id=${quotation._id}&material_id=${material.id}&color=3d58a4" style="text-decoration: none; color:#000; padding: 8px 10px; border:1px solid #cbd5e1; border-radius: 10px; width: 96%; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px;"><img src="${process.env.URI}/uploads/images/cart.png" alt="pc" style="width:20px; margin-right: 5px;"/> Buy Now</a>
  //                                             </div>
  //                                             <!-- <div  style="text-align: right; width: 50%;">
  //                                                 <a href="${process.env.QUOTATION_PDF_LINK_URL}?id=${quotation._id}" style="text-decoration: none; color:#000; padding: 8px 10px; border:1px solid #cbd5e1; border-radius: 10px; width: 80%; display: block; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px; margin-left: auto;"><img src="${process.env.URI}/uploads/images/color.png" alt="pc" style="width:20px; margin-right: 5px;"/> Colours</a>
  //                                             </div> -->
  
  //                                          </div>
                                      
                                  
                               
  //                             </div>
  //                         </div>
  //                      </div>
  //                      `).join('')}
  //                      <div style="padding: 10px 40px; text-align:center; border: 1px solid #e4e8ef; border-radius: 15px; print-color-adjust: exact;  -webkit-print-color-adjust: exact;  background: #eef5fa; width:48%; box-sizing: border-box; min-height: 200px;" >
  //                         <img src="${process.env.URI}/uploads/images/on.png" alt="alt" style="width:30px"/>
  //                         <p style="color:#000; font-size: 14px; line-height: 1.3; text-align: left; padding: 0px 30px; margin-top: 5px;">All doors, panels, pilaster, screws, brackets, and
  //                             anchors for a typical install are included.</p>
  //                         <p style="color:#000; font-size: 14px; line-height: 1.3; text-align: left; padding: 0px 30px;">Delivery from our local terminal to anywhere within
  //                             your specified zip code are also included. Please add
  //                             sales tax if applicable.</p>
  //                      </div> 
  //                 </div>
  //             </div>
             
  //         </td>
          
  //     </tr>
      
     
  // </table>
  // ${req.body.rooms.map((room, index) => `
  // <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px; margin-top: 40px;">
  //         <tr>
  //             <td style="padding: 10px; text-align: left;">
  //                  <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
  //             </td>
  //             <td style="padding: 10px; text-align: right;">
  //                 <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-844-81-STALL" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
  //                 <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
  //            </td>
  //         </tr>
  //         <tr>
  //             <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #edf5fb; border-radius: 30px; vertical-align: bottom;">
  //                 <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
  //                      <tr>
  //                         <td colspan="2">
  //                              <h4 style="color:#0061a6; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation.quotation_no}</h4>
  //                              <p style="margin-top: 5px; margin-bottom: 0px;">Date: ${moment().format('MM/DD/YY')} </p>
  //                         </td>
  //                      </tr>
  //                 </table>
  //             </td>
             
  //         </tr>
  //         <tr>
  //             <td colspan="2" style="padding-left: 10px;">
  //                 <h5 style="color:#285fa1; font-size: 20px; line-height: 1; margin-top: 10px; margin-bottom: 0px;">Review your Layout</h5>
                  
  //             </td>
  //         </tr>
  //         <tr>
  //             <td colspan="2" >
  //                 <table width="100%" cellpadding="0" cellspacing="20" style="table-layout: fixed;">
  //                     <tr>
  //                         <td width="100%" style="width: 100%; vertical-align: top;" colspan="2">
  //                             <h4 style="color:#000; font-size: 20px; font-weight: 900; margin-top: 0px; margin-bottom: 10px;">Room ${index+1}</h4>
  //                             <div style="display: flex; align-items:center;">
  //                             <span style="display: block; color:#000; font-size: 15px;  width:50%">Room Name</span>
  //                             <h3 style="border: 1px solid #e3e8ef; padding: 7px; border-radius: 10px; font-weight: 400;      margin-top: 10px; font-size: 13px; width:50%; margin-bottom: 10px; margin-top: 0px;">#${index+1}. ${room.title}</h3>
  //                             </div>
  
  //                             <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
  //                                 <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 7px 14px; margin-bottom: 0px; font-size: 13px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; margin-bottom: 0px;"> Stalls</h4>
  //                                 <h5 style="padding: 5px 20px 12px; display: flex; align-items: center; margin-bottom: 0px; font-weight: 500; font-size: 15px; margin-top: 5px;"><img src="${process.env.URI}/uploads/images/home.png" alt="pic" style="margin-right: 10px; width: 15px; "/> ${room.stall.noOfStalls} Stalls</h5>
  //                                 <div style="padding: 0px 20px 15px 20px; margin-top: 0px; display: flex; flex-wrap: wrap; justify-content: space-between;">
  //                                     ${room?.stall?.stallConfig?.map((stall, stallIndex) =>`
  //                                     <p style="margin-top: 0px; font-size: 13px; width:48%; margin-bottom: 0; line-height: 1;"><span style="color:#000; font-weight: 700; color:#0061a6; line-height: 1;">Stall ${stallIndex+1} </span>- <span style="font-weight: 600; line-height: 1;">Width:</span> ${stall.stallWidth}"; <span style="font-weight: 600;">Door:</span> ${stall.doorOpening}"; <span style="font-weight: 600;">Door Swing:</span> ${stall.doorSwing?.name}
  //                                         .</p>
  //                                         `).join('')}        
  //                                     <p style="display: flex; align-items: center; font-size: 14px; width:100%; line-height: 1;"><img src="${process.env.URI}/uploads/images/layout.png" alt="pic" style="width: 15px; margin-right:10px;"/><span style="color:#000; font-weight: 500; font-weight: 700; line-height: 1;color:#0061a6;">Layout </span>- ${room.stall?.layout?.layoutDirection}</p>
  //                                 </div>
                                  
  //                             </div>
                              
  //                         </td>
  //                     </tr>
  //                     <tr>
  //                         <td colspan="2" width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
  //                             <div style=" padding: 13px; text-align: center; width:95%;  min-height: 140px; display: flex; align-items: center; justify-content: center;">
  //                                 <img src="${room.image_2D}" alt="pic" style="width:100%; margin: 0 auto;"/>
  //                             </div>
                              
  //                         </td>
  //                         <!-- <td width="50%" style="width: 50%; border: 1px solid #e3e8ef; border-radius: 10px;">
  //                             <div style=" padding: 13px; text-align: center; width:95%;  margin-top: 10px;">
  //                                 <img src="${room.image_3D}" alt="pic" style="width:100%; margin: 0 auto;"/>
  //                             </div>
  //                         </td> -->
  //                     </tr>
  //                     <tr>
  //                         <td width="50%" style="width: 50%;">
  //                             <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #eef5fa; padding:10px 20px; border-radius: 10px; margin-top: 0px; ">
  //                             <span><img src="${process.env.URI}/uploads/images/on.png" alt="pic" style="margin-right: 10px; width:40px"/></span>
  //                             <p style="font-size: 15px; margin: 0px;">Stall widths are to the centerline. Stall depths are to
  //                                 the face. Alcove depths are wall to wall. This layout is
  //                                 included in the price.</p>
  //                             </div>
  //                         </td>
  //                         <td width="50%" style="width: 50%;">
  //                             <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need this layout bigger?</h5>
  //                             <p style="margin-top: 5px; margin-bottom: 5px;">No problem! Our partition Experts will design it to fit
  //                             your restroom.</p>
  //                         </td>
  //                     </tr>
  //                 </table>
  //             </td>
  //         </tr>
  // </table>
  // ${room.hasUrinalScreens ? `
  // <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
  //         <tr>
  //             <td style="padding: 10px; text-align: left;">
  //                  <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
  //             </td>
  //             <td style="padding: 10px; text-align: right;">
  //                 <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-844-81-STALL" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
  //                 <p style=" font-size:16px;      font-style: italic; margin-top: 5px;"><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
  //            </td>
  //         </tr>
  //         <tr>
  //             <td colspan="2" style="padding: 10px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #edf5fb; border-radius: 30px; vertical-align: bottom;">
  //                 <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
  //                      <tr>
  //                         <td colspan="2">
  //                              <h4 style="color:#0061a6; font-size:26px; line-height: 1; font-weight: 600; margin-bottom: 10px; margin-top: 15px;">Quote Number #${quotation.quotation_no}</h4>
  //                              <p>Date: ${moment().format('MM/DD/YY')} </p>
  //                         </td>
  //                      </tr>
  //                 </table>
  //             </td>
             
  //         </tr>
  //         <tr>
  //             <td colspan="2" style="padding-left: 0px;">
  //                 <h5 style="color:#285fa1; font-size: 20px; line-height: 1; margin-top: 10px; margin-bottom: 0px;">Review your Layout</h5>
                  
  //             </td>
  //         </tr>
  //         <tr>
  //             <td colspan="2" style="padding-left: 0px;">
  //                 <table width="100%" cellpadding="0" cellspacing="30" style="table-layout: fixed;">
  //                     <tr>
  //                         <td width="100%" style="width: 100%; vertical-align: top;" colspan="2">
  //                             <h4 style="color:#000; font-size: 20px; font-weight: 900; margin-top: 0px; margin-bottom: 10px;">Room ${index+1}</h4>
  //                             <div style="display: flex; align-items:center;">
  //                                 <span style="display: block; color:#000; font-size: 15px; width:50%">Room Name</span>
  //                                 <h3 style="border: 1px solid #e3e8ef; padding: 10px; border-radius: 10px; font-weight: 400;      margin-top: 1px; width:50%">#${index+1}. ${room.title}</h3>
  //                             </div>
  //                             <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
  //                                 <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 15px 20px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; "> Privacy screens/urinals</h4>
  //                                 <h5 style="padding: 15px 20px; display: flex; align-items: center; margin-bottom: 0px; font-weight: 500; font-size: 16px; margin-top: 0px;"><img src="${process.env.URI}/uploads/images/home.png" alt="pic" style="margin-right: 10px; width: 15px;"/> ${room.urinalScreen?.noOfUrinalScreens} Privacy Screens / Urinals</h5>
  //                                 <div style="padding: 0px 20px 15px 20px; margin-top: 0px;">
  //                                     <p style="margin-top: 0px;"><span style="color:#000; font-weight: 500;">Screen Depth </span>- ${room.urinalScreen?.urinalScreenConfig[0]?.screenDepth}"</p>
                                      
  //                                 </div>
                                  
  //                             </div>
                              
  //                         </td>
  //                         </tr>
  //                         <tr>
  //                         <td colspan="2"  width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
  //                             <div style=" padding: 3px; text-align: center; width:97%;  ">
  //                                 <img src="${room.urinalScreen?.urinal_2D}" alt="pic" style="width:100%;  transform: scale(1) ;"/>
  //                             </div>
                              
  //                         </td>
  //                         <!-- <td width="50%" style="width: 50%; border: 1px solid #e3e8ef; border-radius: 10px;">
  //                             <div style=" padding: 3px; text-align: center; width:97%;  margin-top: 10px;">
  //                                 <img src="${room.urinalScreen?.urinal_3D}" alt="pic" style="width:100%; margin: 0 auto; transform: scale(1)"/>
  //                             </div>
  //                         </td> -->
  //                     </tr>
  //                     <tr>
  //                         <td width="50%" style="width: 50%;">
  //                             <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #eef5fa; padding:10px 20px; border-radius: 10px; margin-top: 0px;">
  //                             <span><img src="${process.env.URI}/uploads/images/on.png" alt="pic" style="margin-right: 10px; width:40px"/></span>
  //                             <p style="font-size: 15px; margin: 0px;">Stall widths are to the centerline. Stall depths are to
  //                                 the face. Alcove depths are wall to wall. This layout is
  //                                 included in the price.</p>
  //                             </div>
  //                         </td>
  //                         <td width="50%" style="width: 50%;">
  //                             <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need this layout bigger?</h5>
  //                             <p style="margin-top: 0px;">No problem! Our partition Experts will design it to fit
  //                             your restroom.</p>
  //                         </td>
  //                     </tr>
  //                 </table>
  //             </td>
  //         </tr>
  // </table>
  // ` : ''}
  // `).join('')}
  // <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 20px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
  //     <tr>
  //         <td colspan="2" style="width:100%; text-align: center;  border-radius: 12px; padding: 10px; ">
  //             <img src="${process.env.URI}/uploads/images/Logo.png" alt="alt" style="width:150px" />
  //         </td>
  //     </tr>
  //     <tr>
  //         <td colspan="2" style="width:100%; text-align: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background: #eef5fa; border-radius: 12px; padding: 10px 25px;">
  //             <img src="${process.env.URI}/uploads/images/clap.png" alt="alt" style="width: 50px;"/>
  //             <h4 style="font-size: 22px; color:#285fa1; font-weight: 900; margin-top: 10px; margin-bottom: 0px;">Thank You for Choosing Us!</h4>
  //         </td>
  //     </tr>
  //     <tr>
  //         <td colspan="2" style="width: 100%;">
  //             <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 0px; vertical-align: top;">
                  
  //                  <tr>
  //                     <td style="width: 100%; display: flex; justify-content: center; align-items:center;">
  //                         <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 10px; vertical-align: top; text-align: center; border: 1px solid #e3e8ef; padding: 10px;  width:100%; border-radius: 10px; ">
  //                             <tr>
  //                                 <td colspan="4" style="width: 100%;">
  //                                     <h3 style="font-size: 21px; font-weight: 900; font-family:Verdana, Geneva, Tahoma, sans-serif; color:#285fa1; margin-bottom: 10px; margin-top: 0px;">Meet the Partition Experts</h3>
  //                                     <h6 style="color:#285fa1; font-size: 18px; margin-top: 5px; font-weight: 400; margin-bottom: 10px;">The team behind making your dream ideas come true</h6>
  //                                 </td>
  //                              </tr>
  //                             <tr>
  //                                 <td>
  //                                     <div>
  //                                         <img src="${process.env.URI}/uploads/images/Jim_Southard.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                         <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Jim Southard</h4>
  
  //                                     </div>
  //                                 </td>
  //                                 <td>
  //                                     <div>
  //                                         <img src="${process.env.URI}/uploads/images/Josh_Williams.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                         <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Josh Williams
  //                                         </h4>
  
  //                                     </div>
  //                                 </td>
  //                                 <td>
  //                                     <div>
  //                                         <img src="${process.env.URI}/uploads/images/DJ_Bunn.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                         <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">DJ Bunn</h4>
  
  //                                     </div>
  //                                 </td>
  //                                 <td>
  //                                     <div>
  //                                         <img src="${process.env.URI}/uploads/images/Jennifer_Hollis.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                         <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Jennifer Hollis</h4>
  
  //                                     </div>
  //                                 </td>
  //                             </tr>
  //                             <tr>
  //                                 <td>
  //                                     <div>
  //                                         <img src="${process.env.URI}/uploads/images/Jim_Artman.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                         <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Jim Artman</h4>
  
  //                                     </div>
  //                                 </td>
  //                                 <td>
  //                                     <div>
  //                                         <img src="${process.env.URI}/uploads/images/Megan_Schroeder.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                         <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Megan Schroeder
  //                                         </h4>
  
  //                                     </div>
  //                                 </td>
  //                                 <td>
  //                                     <div>
  //                                         <img src="${process.env.URI}/uploads/images/Peyton_Cape.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                         <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Peyton Cape
  //                                         </h4>
  
  //                                     </div>
  //                                 </td>
  //                                 <td>
  //                                     <div>
  //                                         <img src="${process.env.URI}/uploads/images/Rob_Watkins.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                         <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Rob Watkins
  //                                         </h4>
  
  //                                     </div>
  //                                 </td>
  //                             </tr>
  //                             <tr>
  //                                 <td colspan="4" style="width: 100%;">
  //                                     <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 0px; vertical-align: top; text-align: center;">
  //                                         <tr>
  //                                             <td>
  //                                                 <div>
  //                                                     <img src="${process.env.URI}/uploads/images/Tracy_Hanson.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                                     <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Tracy Hanson
  //                                                     </h4>
          
  //                                                 </div>
  //                                             </td>
  //                                             <td>
  //                                                 <div>
  //                                                     <img src="${process.env.URI}/uploads/images/Travis_Perdue.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                                     <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">Travis Perdue
  //                                                     </h4>
          
  //                                                 </div>
  //                                             </td>
  //                                             <td>
  //                                                 <div>
  //                                                     <img src="${process.env.URI}/uploads/images/CJ_Cooper.png" alt="pic" style="margin-bottom: 10px;"/>
  //                                                     <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;">CJ Cooper
  //                                                     </h4>
          
  //                                                 </div>
  //                                             </td>
  //                                         </tr>
  //                                     </table>
  //                                 </td>
                                 
                                  
  //                             </tr>
  //                         </table>
  //                     </td>
  //                  </tr>
  //             </table>
  //         </td>
          
  //     </tr>
  //     <tr>
  //         <td colspan="2" style="text-align: center;">
  //             <h5 style="color:#000; font-size: 20px; font-weight: 600; margin-bottom: 5px; margin-top: 10px;">Do you have questions?</h5>
  //             <p style="color:#000; font-size: 18px; margin-top: 10px; margin-bottom: 10px;">Call us or email us and we'd be happy to assist you.</p>
  //          <h4 style="display: flex; align-items: center; justify-content: center; margin-top: 10px; margin-bottom: 10px;"><a href="tel:1-844-81-STALL" style="color:#285fa1; font-weight: 900; text-decoration: none; font-size: 24px; font-family:Verdana, Geneva, Tahoma, sans-serif; font-style:italic">1-844-81-STALL</a><a href="mailto:service@restroomstallsandall.com" style="font-size: 20px; color:#000; font-weight: 400; margin-left: 15px;">service@restroomstallsandall.com</a></h4>
  //         </td>
  //     </tr>
  // </table>`;

      // const pdfBuffer = await this.generatePDF(htmlContent); // Ensure this is called correctly
      // if (!pdfBuffer || pdfBuffer.length === 0) {
      //   console.error("Generated PDF buffer is empty or undefined.");
      //   return res
      //     .status(500)
      //     .json({ status: false, message: "Failed to generate PDF." });
      // }

    //   var email_verification_template = await Emailtemplate.findOne({
    //     code: "QUOTATION",
    // }).exec();
    // var template = email_verification_template.template;
    // let body = template.replace("{{name}}", `${quotation.first_name} ${quotation.last_name}`);
    //   // Send email with PDF attachment
    //   await email_helper.sendEmail(
    //     {
    //       receivers: ["bidyut.patra@codeclouds.com",quotation.email],
    //       subject: "Quotation PDF",
    //       context: { body_content: body },
    //     },
    //     [
    //       {
    //         filename: "quotation.pdf",
    //         content: pdfBuffer,
    //         contentType: "application/pdf",
    //       },
    //     ]
    //   );

// Chunk the materials array into groups of two
const chunkedData = await this.chunkArray(materials, 2);
const countUrinalScreens = req.body.rooms.filter(room => room.hasUrinalScreens).length;
// const base64 = await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Logo.png`);
// console.log('Base64 Image String:', base64); 
const materialData = await this.generateMaterialData(chunkedData,results,quotation);
materialData[2][1]=  {
  layout: 'noBorders',
  style: 'productBox',
  table: {
    body: [
      [
        {
          style: 'productTextBoxInr',
          layout: 'noBorders',
          table: {
            body: [
              [{ image: 'infoImage', width: 40, alignment: 'center', style: 'infoIcon' }],
              [{ text: 'All doors, panels, pilaster, screws, brackets, and anchors for a typical install are included.', style: 'productText' }],
              [{ text: 'Delivery from our local terminal to anywhere within your specified zip code are also included. Please add sales tax if applicable.', style: 'productTextLast' }]
            ]
          }
        }
      ]
    ]
  }
}


let lastPageNo= 2 + countUrinalScreens + req.body.rooms.length;



var htmlObj = {
	header: function (currentPage) {
		  let data;
		  currentPage === lastPageNo ? data = {
			  margin: [20, 60, 20, 0],
			  image: 'logo',
			  width: 110,
			  link: '#',
			  alignment: 'center'
		  } : data = [
			  {
				  margin: [20, 20],
				  style: 'mainHeader',
				  table: {
					  widths: ['*', 'auto'],
					  body: [
						  [{
							  image: 'logo',
							  width: 110,
							  link: '#'
						  }, {
							  style: 'mainHeaderRight',
							  table: {
								  body: [
									  [
										  [{ text: '1-844-81-STALL', link: 'tel:1-844-81-STALL', style: 'headerPhone' }, { text: 'service@restroomstallsandall.com', link: 'mailto:service@restroomstallsandall.com', style: 'headerEmail' }]
									  ]
								  ]
							  },
							  layout: 'noBorders'
						  }],
					  ]
				  },
				  layout: 'noBorders'
			  },
			  {
				  margin: [20, 0],
				  style: 'tableQuoteNum',
				  table: {
					  widths: ['*'],
					  body: [
						  [{ text: `Quote Number #${quotation.quotation_no}`, style: 'quoteNum' }],
						  [{ text: `Date: ${moment().format('MM/DD/YY')}`, style: 'quoteDate' }]
					  ]
				  },
				  layout: 'noBorders'
			  }
		  ]
		  return data
	  },
	  content: [
		  [
		{ text: 'Review the Prices for your Rooms', style: 'bigHeading' },
		{ text: 'Prices and delivery times are subject to review by RSA. Add sales tax if applicable.', style: 'smallSubHeading' },
		{
		  style: 'btnBuyTbl',
		  table: {
			widths: ['*'],
			body: [
			  [{ image: 'buyBtnSmall', width: 60, link: `${process.env.QUOTATION_PDF_LINK_URL}?id=${quotation._id}&abandoned=1`, style: 'btnBuy', }],
			]
		  },
		  layout: 'noBorders'
		},
		{
		  style: 'productList',
		  layout: 'noBorders',
		  table: {
			widths: ['50%', '50%'],
			body: materialData,
		  }
		}
	  ],
	  // [
		// ...req.body.rooms.map((room, index) => [
		// 		  {
		// 			  text: 'Review your Layout', style: 'reviewHeding'
		// 		  },
		// 		  {
		// 			  text: `Room ${index + 1}`, style: 'reviewSubHeding'
		// 		  },
		// 		  {
		// 			  style: 'reviewHdr',
		// 			  layout: 'noBorders',
		// 			  table: {
		// 				  widths: ['50%', '50%'],
		// 				  body: [
		// 					  [{
		// 						  text: 'Room Name',
		// 					  }, {
		// 						  layout: {
		// 							  hLineColor: '#e3e8ef',
		// 							  vLineColor: '#e3e8ef'
		// 						  },
		// 						  widths: ['*'],
		// 						  table: {
		// 							  body: [
		// 								  [{ text: `#${index + 1}. ${room.title}` }]
		// 							  ]
		// 						  }
		// 					  }],
		// 				  ]
		// 			  }
		// 		  },
		// 		  {
		// 			  style: 'revieTbl',
		// 			  layout: {
		// 				  hLineColor: '#e3e8ef',
		// 				  vLineColor: '#e3e8ef',
		// 			  },
		// 			  widths: ['*'],
		// 			  table: {
		// 				  body: [
		// 					  [{
		// 						  layout: 'noBorders',
		// 						  table: {
		// 							  body: [
		// 								  [{
		// 									  image: 'iconSales',
		// 									  style: 'iconWithHeading',
		// 									  width: 20
		// 								  }, {
		// 									  text: 'Stalls',
		// 									  style: 'iconHeading'
		// 								  }],
		// 							  ]
		// 						  }
		// 					  }],
		// 					  [
		// 						  {
		// 							  border: [true, false, true, false],
		// 							  layout: 'noBorders',
		// 							  margin: [10, 4, 0, 0],
		// 							  table: {
		// 								  body: [
		// 									  [{
		// 										  image: 'iconHome',
		// 										  style: 'iconWithHeading',
		// 										  width: 14
		// 									  }, {
		// 										  text: `${room.stall.noOfStalls} Stalls`,
		// 										  style: 'iconHeading'
		// 									  }],
		// 								  ]
		// 							  }
		// 						  }
		// 					  ],
		// 					  [
		// 						  {
		// 							  border: [true, false, true, false],
		// 							  margin: [20, 0, 0, 0],
		// 							  layout: 'noBorders',
		// 							  widths: ['50%', '50%'],
		// 							  table: {
		// 			  body: [
		// 				...room?.stall?.stallConfig.reduce((acc, stall, index) => {
		// 				  // Determine the current chunk index
		// 				  const chunkIndex = Math.floor(index / 2);
					  
		// 				  // Initialize the chunk if it doesn't exist
		// 				  if (!acc[chunkIndex]) {
		// 					acc[chunkIndex] = [];
		// 				  }
					  
		// 				  // Push the current stall into the appropriate chunk
		// 				  acc[chunkIndex].push({
		// 					text: [
		// 					  { text: `Stall ${index + 1}`, color: '#0061a6', bold: true },
		// 					  ' - ',
		// 					  { text: 'Width', bold: true },
		// 					  `: ${stall.stallWidth || 'undefined'}"; `,
		// 					  { text: 'Door', bold: true },
		// 					  `: ${stall.doorOpening || 'undefined'}"; `,
		// 					  { text: 'Door Swing', bold: true },
		// 					  `: ${stall.doorSwing?.name || 'undefined'}.`
		// 					]
		// 				  });
					  
		// 				  return acc;
		// 				}, [])
		// 				// Ensure each chunk has exactly 2 items by filling with blank objects
		// 				.map(chunk => {
		// 				  while (chunk.length < 2) {
		// 					chunk.push({
		// 					  text: [{ text: '', color: '#000000', bold: false }] // Blank object
		// 					});
		// 				  }
		// 				  return chunk;
		// 				})
		// 				// Map chunks into the desired structure
		// 				.map(chunk => [
		// 				  // Add the chunk (group of two stalls) to the table
		// 				  ...chunk
		// 				])
		// 			  ]
					  
					  
				  
		// 							  }
		// 						  }
		// 					  ],
		// 					  [
		// 						  {
		// 							  border: [true, false, true, true],
		// 							  layout: 'noBorders',
		// 							  margin: [10, 0, 0, 10],
		// 							  table: {
		// 								  body: [
		// 									  [{
		// 										  image: 'iconLayout',
		// 										  style: 'iconWithHeading',
		// 										  width: 14
		// 									  }, {
		// 										  text: [{ text: 'Layout', color: '#0061a6', bold: true }, '-', ' ', `${room.stall?.layout?.layoutDirection}`],
		// 										  margin: [0, 4, 0, 0]
		// 									  }],
		// 								  ]
		// 							  }
		// 						  }
		// 					  ],
		// 				  ]
		// 			  }
		// 		  },
		// 		  {
		// 			  style: 'sampleLayoutTbl',
		// 			  layout: {
		// 				  hLineColor: '#e3e8ef',
		// 				  vLineColor: '#e3e8ef',
		// 			  },
		// 			  table: {
		// 				  widths: ['*'],
		// 				  body: [
		// 					  [
		// 						  {
		// 							  image: `${room.image_2D}`,
		// 							  width: 350,
		// 							  alignment: 'center',
		// 						  }
		// 					  ],
		// 				  ]
		// 			  }
		// 		  },
		// 		  {
		// 			  style: 'commonFooter',
		// 			  layout: 'noBorders',
		// 			  table: {
		// 				  widths: ['50%', '50%'],
		// 				  body: [
		// 					  [
		// 						  {
		// 							  style: 'commonFooterLeft',
		// 							  layout: 'noBorders',
		// 							  table: {
		// 								  widths: ['*', 'auto'],
		// 								  body: [
		// 									  [
		// 										  {
		// 											  image: 'infoImage',
		// 											  width: 30,
		// 											  margin: [0, 12, 0, 0]
		// 										  }, {
		// 											  text: 'Stall widths are to the centerline. Stall depths are to the face. Alcove depths are wall to wall. This layout is included in the price.'
		// 										  }
		// 									  ],
		// 								  ]
		// 							  }
		// 						  }, {
		// 							  style: 'commonFooterRight',
		// 							  layout: 'noBorders',
		// 							  table: {
		// 								  widths: ['*'],
		// 								  body: [
		// 									  [{
		// 										  text: 'Need this layout bigger?',
		// 										  style: 'bigHeading',
		// 										  alignment: 'left',
		// 										  fontSize: 18
		// 									  }
		// 									  ],
		// 									  [
		// 										  { text: 'No problem! Our partition Experts will design it to fit your restroom.' }
		// 									  ]
		// 								  ]
		// 							  }
		// 						  }
		// 					  ],
		// 				  ]
		// 			  }
		// 		  },
		// 	room.hasUrinalScreens // Add the condition here
		// 		? [
		// 		  {
		// 			text: 'Review your Layout', style: 'reviewHeding'
		// 		  },
		// 		  {
		// 			text: `Room ${index}`, style: 'reviewSubHeding'
		// 		  },
		// 		  {
		// 			style: 'reviewHdr',
		// 			layout: 'noBorders',
		// 			table: {
		// 			  widths: ['50%', '50%'],
		// 			  body: [
		// 				[{
		// 				  text: 'Room Name',
		// 				}, {
		// 				  layout: {
		// 					hLineColor: '#e3e8ef',
		// 					vLineColor: '#e3e8ef'
		// 				  },
		// 				  widths: ['*'],
		// 				  table: {
		// 					body: [
		// 					  [{ text: `#${index + 1}. ${room.title}` }]
		// 					]
		// 				  }
		// 				}],
		// 			  ]
		// 			}
		// 		  },
		// 		  {
		// 			style: 'revieTbl',
		// 			layout: {
		// 			  hLineColor: '#e3e8ef',
		// 			  vLineColor: '#e3e8ef',
		// 			  paddingRight: function () {
		// 				return 200;
		// 			  }
		// 			},
		// 			widths: ['100%'],
		// 			table: {
		// 			  body: [
		// 				[{
		// 				  layout: 'noBorders',
		// 				  table: {
		// 					body: [
		// 					  [{
		// 						image: 'iconSales',
		// 						style: 'iconWithHeading',
		// 						width: 20
		// 					  }, {
		// 						text: 'Privacy screens/urinals',
		// 						style: 'iconHeading'
		// 					  }],
		// 					]
		// 				  }
		// 				}],
		// 				[
		// 				  {
		// 					border: [true, false, true, false],
		// 					layout: 'noBorders',
		// 					margin: [10, 4, 0, 0],
		// 					table: {
		// 					  body: [
		// 						[{
		// 						  image: 'iconHome',
		// 						  style: 'iconWithHeading',
		// 						  width: 14
		// 						}, {
		// 						  text: `${room.urinalScreen?.noOfUrinalScreens} Privacy Screens / Urinals`,
		// 						  style: 'iconHeading'
		// 						}],
		// 					  ]
		// 					}
		// 				  }
		// 				],
		// 				[
		// 				  {
		// 					border: [true, false, true, true],
		// 					margin: [20, 0, 0, 20],
		// 					layout: 'noBorders',
		// 					table: {
		// 					  body: [
		// 						[{
		// 						  text: [{ text: 'Screen Depth', bold: true }, '- ', `${room.urinalScreen?.urinalScreenConfig[0]?.screenDepth};`]
		// 						}],
		// 					  ]
		// 					}
		// 				  }
		// 				]
		// 			  ]
		// 			}
		// 		  },
		// 		  {
		// 			style: 'sampleLayoutTbl',
		// 			layout: {
		// 			  hLineColor: '#e3e8ef',
		// 			  vLineColor: '#e3e8ef',
		// 			},
		// 			table: {
		// 			  widths: ['*'],
		// 			  body: [
		// 				[
		// 				  {
		// 					image: `${room.urinalScreen?.urinal_2D}`,
		// 					width: 350,
		// 					alignment: 'center',
		// 				  }
		// 				],
		// 			  ]
		// 			}
		// 		  },
		// 		  {
		// 			style: 'commonFooter',
		// 			layout: 'noBorders',
		// 			table: {
		// 			  widths: ['50%', '50%'],
		// 			  body: [
		// 				[
		// 				  {
		// 					style: 'commonFooterLeft',
		// 					layout: 'noBorders',
		// 					table: {
		// 					  widths: ['*', 'auto'],
		// 					  body: [
		// 						[
		// 						  {
		// 							image: 'infoImage',
		// 							width: 30,
		// 							margin: [0, 12, 0, 0]
		// 						  }, {
		// 							text: 'Stall widths are to the centerline. Stall depths are to the face. Alcove depths are wall to wall. This layout is included in the price.'
		// 						  }
		// 						],
		// 					  ]
		// 					}
		// 				  }, {
		// 					style: 'commonFooterRight',
		// 					layout: 'noBorders',
		// 					table: {
		// 					  widths: ['*'],
		// 					  body: [
		// 						[{
		// 						  text: 'Need this layout bigger?',
		// 						  style: 'bigHeading',
		// 						  alignment: 'left',
		// 						  fontSize: 18
		// 						}
		// 						],
		// 						[
		// 						  { text: 'No problem! Our partition Experts will design it to fit your restroom.' }
		// 						]
		// 					  ]
		// 					}
		// 				  }
		// 				],
		// 			  ]
		// 			}
		// 		  },
		// 		]
		// 		: {}
		// 	  ]),
		//   ],
		  // [
			//   {
			// 	  margin: [0, 140, 0, 0],
			// 	  style: 'thankYouTbl',
			// 	  layout: 'noBorders',
			// 	  table: {
			// 		  widths: ['*'],
			// 		  body: [
			// 			  [
			// 				  {
			// 					  style: 'thankYouInr',
			// 					  layout: 'noBorders',
			// 					  table: {
			// 						  widths: ['*'],
			// 						  body: [
			// 							  [{ image: 'iconHandShake', width: 40, alignment: 'center' }],
			// 							  [{ text: 'Thank You for Choosing Us!', style: 'bigHeading', fontSize: 18 }]
			// 						  ]
			// 					  }
			// 				  }
			// 			  ]
			// 		  ]
			// 	  }
			//   },
			//   {
			// 	  margin: [0, 10, 0, 0],
			// 	  style: 'teamTbl',
			// 	  layout: {
			// 		  hLineColor: '#e3e8ef',
			// 		  vLineColor: '#e3e8ef',
			// 	  },
			// 	  table: {
			// 		  widths: ['*'],
			// 		  body: [
			// 			  [
			// 				  {
			// 					  border: [true, true, true, false],
			// 					  style: 'teamTblHdr',
			// 					  layout: 'noBorders',
			// 					  table: {
			// 						  widths: ['*'],
			// 						  body: [
			// 							  [
			// 								  [{ text: 'Meet the Partition Experts', style: 'bigHeading', fontSize: 18 },
			// 								  { text: 'The team behind making your dream ideas come true', style: 'teamSubHeading' }
			// 								  ],
			// 							  ]
			// 						  ]
			// 					  }
			// 				  }
			// 			  ],
			// 			  [
			// 				  {
			// 					  border: [true, false, true, true],
			// 					  margin: [10, 0, 10, 20],
			// 					  style: 'teamList',
			// 					  layout: 'noBorders',
			// 					  table: {
			// 						  widths: ['25%', '25%', '25%', '25%'],
			// 						  body: [
			// 							  [
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Jim_Southard.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'Jim Southard', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  },
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Josh_Williams.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'Josh Williams', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  },
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/DJ_Bunn.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'DJ Bunn', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  },
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Jennifer_Hollis.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'Jennifer Hollis', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  }
			// 							  ],
			// 							  [
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Jim_Artman.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'Jim Artman', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  },
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Megan_Schroeder.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'Megan Schroeder', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  },
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Peyton_Cape.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'Peyton Cape', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  },
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Rob_Watkins.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'Rob Watkins', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  }
			// 							  ],
			// 							  [
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Tracy_Hanson.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'Tracy Hanson', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  },
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Travis_Perdue.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'Travis Perdue', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  },
			// 								  {
			// 									  style: 'teamSingle',
			// 									  layout: 'noBorders',
			// 									  table: {
			// 										  widths: ['*'],
			// 										  body: [
			// 											  [{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/CJ_Cooper.png`), width: 90, style: 'teamImg' }],
			// 											  [{ text: 'CJ Cooper', style: 'teamName' }]
			// 										  ]
			// 									  }
			// 								  },
			// 								  {
			// 								  }
			// 							  ],
			// 						  ]
			// 					  }
			// 				  }
			// 			  ]
			// 		  ]
			// 	  }
			//   },
			//   {
			// 	  style: 'questionsTbl',
			// 	  layout: 'noBorders',
			// 	  table: {
			// 		  widths: ['*'],
			// 		  body: [
			// 			  [{ text: 'Do you have questions?', style: 'qHdng1' }],
			// 			  [{ text: 'Call us or email us and we"d be happy to assist you.', style: 'qHdng2' }],
			// 			  [{ text: [{ text: '1-844-81-STALL', style: 'qPhn', link: 'tel:1-844-81-STALL' }, ' ', { text: 'service@restroomstallsandall.com', style: 'qEmail', link: 'mailto:service@restroomstallsandall.com' }] }],
			// 		  ]
			// 	  }
			//   }
		  // ]
	
	  ],
	  styles: {
		  mainHeader: {
			  margin: [0, 0, 0, 10]
		  },
		  mainHeaderRight: {
			  alignment: 'right'
		  },
		  headerPhone: {
			  color: "#0061a6",
			  bold: true,
			  italics: true,
			  fontSize: 18,
		  },
		  headerEmail: {
			  italics: true,
			  decoration: 'underline'
		  },
		  tableQuoteNum: {
			  fillColor: '#edf5fb',
		  },
		  quoteNum: {
			  margin: [16, 2, 16, 0],
			  color: "#0061a6",
			  bold: true,
			  fontSize: 14,
		  },
		  quoteDate: {
			  margin: [16, 0, 16, 2],
		  },
		  bigHeading: {
			  margin: [0, 0, 0, 0],
			  color: "#3d58a4",
			  bold: true,
			  fontSize: 22,
			  alignment: 'center'
		  },
		  smallSubHeading: {
			  margin: [0, 6, 0, 0],
			  fontSize: 9,
			  alignment: 'center'
		  },
		  btnBuyTbl: {
			  alignment: 'right',
			  margin: [0, 0, 0, 10]
		  },
		  btnBuy: {
			  margin: [0, -20, 0, 0]
		  },
		  productBox: {
			  margin: [4, 6]
		  },
		  pImg: {
			  margin: [10, 40, 0, 0]
		  },
		  pCatName: {
			  margin: [0, 0],
			  color: "#3d58a4",
		  },
		  pPrice: {
			  margin: [0, 0],
			  fontSize: 16,
			  bold: true
		  },
		  pWarranty: {
			  fontSize: 14,
			  bold: true,
			  margin: [0, 0],
		  },
		  roomHdr: {
			  fontSize: 9,
			  margin: [0, 0],
			  color: "#0061a6",
		  },
		  roomBdy: {
			  fontSize: 9,
			  margin: [0, 0],
			  bold: true,
		  },
		  pDelivery: {
			  fontSize: 10,
			  margin: [0, 0, 0, 0],
		  },
		  pBuyNow: {
			  alignment: 'center',
			  margin: [0, 4]
		  },
		  productTextBoxInr: {
			  fillColor: '#eef5fa'
		  },
		  infoIcon: {
			  margin: [0, 20, 0, 6]
		  },
		  productText: {
			  margin: [24, 3],
			  fontSize: 10
		  },
		  productTextLast: {
			  fontSize: 10,
			  margin: [24, 0, 24, 20],
		  },
		  reviewHeding: {
			  margin: [0, 90, 0, 0],
			  color: "#3d58a4",
			  bold: true,
			  fontSize: 18,
		  },
		  reviewSubHeding: {
			  margin: [10, 10, 0, 0],
			  fontSize: 16,
			  bold: true
		  },
		  reviewHdr: {
			  margin: [10, 4, 0, 0],
		  },
		  revieTbl: {
			  margin: [10, 6, 0, 0],
		  },
		  iconHeading: {
			  margin: [0, 6, 0, 0]
		  },
		  iconWithHeading: {
			  margin: [10, 4, 2, 4]
		  },
		  sampleLayoutTbl: {
			  margin: [10, 10, 0, 0]
		  },
		  commonFooter: {
			  margin: [10, 20, 0, 0]
		  },
		  commonFooterLeft: {
			  fillColor: '#eef5fa',
			  margin: [20, 20]
		  },
		  commonFooterRight: {
			  margin: [20, 20]
		  },
		  thankYouInr: {
			  fillColor: '#eef5fa',
			  margin: 5
		  },
		  teamTblHdr: {
			  margin: 10
		  },
		  teamSubHeading: {
			  color: "#3d58a4",
			  fontSize: 13,
			  alignment: 'center',
			  margin: [0, 6, 0, 0]
		  },
		  teamImg: {
			  alignment: 'center'
		  },
		  teamName: {
			  bold: true,
			  color: "#3d58a4",
			  fontSize: 13,
			  alignment: 'center',
			  margin: [0, 4, 0, 10]
		  },
		  questionsTbl:{
			  margin:[0, 10, 0, 0]
		  },
		  qHdng1:{
			  alignment:'center',
			  bold: true,
			  fontSize: 14
		  },
		  qHdng2:{
			  alignment:'center',
		  },
		  qPhn:{
			  alignment:'center',
			  bold: true,
			  color: "#3d58a4",
			  fontSize: 15,
			  margin:[0, 4]
		  },
			  qEmail:{
			  alignment:'center',
			  bold: true,
			  fontSize: 14
		  }
	  },
	  defaultStyle: {
		  fontSize: 12,
	  },
	  pageSize: 'A4',
	  pageOrientation: 'portrait',
	  pageMargins: [20, 140, 20, 20],
	  images: {
		  logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQgAAABXCAYAAAD4WdtpAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4RTNBMDk3OUEzNjQxMUVGQjM2OEZBRTkyMzYzNDBFNCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4RTNBMDk3QUEzNjQxMUVGQjM2OEZBRTkyMzYzNDBFNCI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0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',
		  buyNowBig: 'data:image/png;base64,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',
		  buyBtnSmall: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAABACAYAAABWUJhRAAAACXBIWXMAACxLAAAsSwGlPZapAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAARFSURBVHgB7d2Ncds2AIbhL70MkBHQCepOUHSCaoOwE7SdoOoEbScwM0HiCaQN4kxgZYJkA4c4ijEAgiQgmbRlvs8d7kSKkhhSH/HHyK8k3QtAlh8EIBuBAQoQGKDA68S6VwLQCfr41DBAAQIDFCAwQAECAxQgMEABAgMUIDBAAQIDFCAwQAECAxR4LQx505R/VeZrUz435bYpe+FFuo8KWkb9Y1NS7pryt3DpevkgMGlG5wWmKx/V1la4TMH5pEmWzzW3bie2uVI/HG7d+6b8KrwI1DBpRuFx2RW87k/1j2slXCKaZJmMTgtMpzrz9XgeCEwmo/O/8B+j96Avc3mCfDAPM69P0TKBuXB0+p8HN99zdXzsBhb+ynhN1ZS33rI/qGCacu0t3zTlP+VxoX7vLb9rSi18R5Mszej8JtlO4bxMzna5n7PV+Hn7otP2vYre12jdaJItxNUY1lt+p2X5n2cV7ssYv9baN+UgfEdg5rFReFU/aPlmzYdo2Wqa0dOG/NmjD5PP1RjXE9u49r9V2Lk/qO1fHLSs/bHY4/IfaptxYzbeYzdR+0HooQ+TZnT+bTEuYDkjY3P0YZx4AtVq3J3CfQd9mEVVakecjJ5Grbam6GxGtrUK95PmWAJNsnw595IZ9cNh1V65Ky3/Jez22R6XXYd+qzBE8p7rHMR/TxhEkyzN6PRhZav26h4fWzuw/VxNsm5f/O2Gahm/OZY7Z7MGvXwQmDSj0wPT2UbvcTew3ZyBcabmZDZi7mUIfZgFbRWOjhnlz4c8pv+9x1b9gYi33uO9mHsZRGDmdxMtX2l58fBw5T02CptpdPZHEJj5xQMFT3EDZvwbA795j220LXMvIwjM/OYKSOn7+jWd1UM/xW+O1UqPoOGIwMzvl2g5Z2g6x08qU6s/J2PErTDFGCVLMzp/lMyof3xNYrvae96NaE3VHkannbda4b+n0vQI3toxSrYQq37IaqVHoPwrvwvL2Iy8U/p7af7nd6zC5tiNMMn9Pcv7xDq0V3H/qntoyj8Zr3NNpfjWfseF4melA+O23UXb/q5+B9yoDUsqULnnbagG+1EMJ6fcp1bQJOszKrvRcqpM1Rq7xGvcOheQ68TztU47b9uBz0FaLx8EJs3ocYLivow5cy9G4e0pY2Wb2L9cbxLvVwlDCEwmo/JwuOaO+9K7O5S3Kp/VN2prji8D7+9+hWYzsH8ldtFrn2Ju6FIE54C7lYcdtHx/7qD2au++wFd6+CVNt/5W4ZC0W/cY+1eLuZci1DDrYhSebyuMoUm2cpUezvWdMIXArJhr3rmQ0NnPR2BWxB+dswp/utYFxwhTCMyK+LVJamga0wjMiuw0PDyNPMGx416yl+1zYp27I5k/7nQi7iV72br5HHNc3ov7xUoF+SAwwLggHzTJgAIEBihAYIACBAYoQGCAAgQGKJAaVgYwgBoGKEBggAIEBijwDQvtNUXk2ExLAAAAAElFTkSuQmCC',
		  infoImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEsAAABLCAIAAAC3LO29AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowNTZBQUU4N0EzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDowNTZBQUU4OEEzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowNTZBQUU4NUEzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowNTZBQUU4NkEzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvCSd34AAArzSURBVHja3FsJVJNXFs4OhAAiawTCKmGQHQmLAz2KW4tFq47KSB2pVepYR6sz7dE6QOtSrVR7nJm61RbrFNwXFMUFRAXZZBHZkX0JYU/CEkhI5kEWIoYk/0uAOPccz3nqn/e/77/v3ft9972H7ujjoqbE+HzBEI/PEwiIeCwGg0ZNleEmo1Muj1/U1F1Q311OZ1bQWa8Z7B4Ol8fjj70Vg9YhYClGJCpZ34ms72JhQLMzNiASJmMwaDX6sLlr4FJObVp5W0FdJ0cKj5JGNdcPcDBZ7UPxsTNCo9EahBB4LLGg6ffM2meVbWoZk40xKczPOjzAzlRfe5oRMvuHzmfU/JxWRWdy1D67CFjMn2jWWxc4gpk8DQiHh/lnnrw+klTSN8ib7FCxci7lwCp3Ez3tqUNYUN+1KyGvuKlnyuKhgQ4+arlbeIAtRBBGhhC4LvZe6bH7ZXwBauot0NH0Pxto5Bk6k4WwvoMdGZeTV9eFmj4zJBJ+XD/3A3cL9SPMrekIO5nOHOCiNMC+CnHevdRZyYyCUeah1LLW1f96qiHwgB1JKo268VIgEKgHYXJRy/qT6f3cYZQm2anUKhDt+ErEAwUIn1YwNp3L5E1LYFFk/31eG3VdsSflIcyr6ww/nTE0zEdpqp1Oq4q9VwaJsI3FCT+VMTA0jNJs+/5uSWJ+I2KEYH5vu5DT0TuIehdsZ3weIP3IEJ5Jq0orY6DeEWNzuJ+dz5oo6shAWNfeezDxFeqdsqzqjp+fvlZKAYPQ9OWlAgh1J8eA2AUy18FUj6SFA1mawx2m9wyUNDPb2OpcBYduFy9zt5hlSFSA8GZe4+PyVrW80s6U9JcA2xA3CzcrAxwWI4sG9qWWMeKz61JK1bAigMr5+mrhr5sD5LE2MJV9v71X19Gn4sv+ONtkT4jzUleyksSqisH+Ibnsl2c1qifeh/8I9rCeOSHC2wVNn5zLVOUFM3UJx8O8Pg6wlRmf+4d4w3wBkYDD42S49FVTz5a4nOyaTlUGsMLb6myEn2yEYAUuiU0F2k8VdRMf6W8htRIAosSC5vsl9JzqzopWtoQ8UIyInhTD+U5ma2gUc4MxNQQ+QMytV4fulEKPAYNG58V8YGlElIGwsL5r0dEU6K5XeVv+HhlAwGGFf2UNcGPvlwH22NE7JH9Aq+da7Qud42IxQ/KP555VR8bl8gWQM/bzxdToUDcZ2SIhqw4aXqiHRcJn8yTw7hQ2O3+ddCCxRD68kakrEFzObfCKTt57tZArDuCbAu3PbqRBD+ZKVv2wFNMUIRzkDl970QDXo6e14aWt84TRciTZXM4PPfG0pWdA+R5AgDl8tyzwu4ftLFFFKyLQLnq5C9x4GCzO43LGeIQppa1w8g/kuoTIAC28yHtbf8uNTa6AG1lObVfQ4UcSkPs+nANiMqQbcxvGI8x43Q7XV8xyV0dzUbUv5uarM0+qVYmEIBotPZ42OKpFsRgMmKsELAain8yqdomqwkhYD0RHtia6Xyymir5RVfuB28Xyn3c00wuiKnBLQX33vutFwjaVrL8teDbEwOjMgZbu/jGE/YO84kaY0uAXi52Eyw8Eic1xOfLTtQfFsPy7ZWlfLTy4yl1+t8cflOfXdUteQcDCVPgzxT4bGV9pCxMiNIMVuEGc2QHzKqez5D/vYSXKB3NtDBUFWFTMLZEbLWcSEVXWJFYk9tkIQoWDmyhD6Ovghe0TjyoVPn8tr/Hsk9fZ1R3RNxULlzsvW2raeoXtcH8bmCVNZ48x74pWGITBzubCRmkzEyweJVQcL/J8LoIyTGZd1GjCmO9kCjG8ylbmmA+BIITows/eSNiQTj5qtFSxxDHU1aKa6yH9eVN3/9BoTMYIdQfS3+MwaKqZKEnk109KFVx6XrhYGED0MCBByOEhLjeZ6mtL9EEVQ9kpsHfZnDMbaRQjXeVqEzzAQsTxRhcC4eAoDRxZh0NcxIpem4CVtHuVmwLL3GcdWDlCiA108GtPZijzE0nP2niYvD84JPahAHm+QQsUFbPeMm8bkTCdM0vZKYdBoSXKDkZJYcTD08Fhkf4YaFlJW19nUk4YjHibiBO/DqZuRBhly5jRKYf4RAbg7wPiKUQl600GPGMSwYgk2vet64CJ9lo4MUI9LcQ+BLSjuEWURWm2RpOB0Eeq26ImJnKxjyISxAjtzWCckCmWI8HOZpOBcNEcEaMAHLqhE3FxzNqYJOTMI3+o5jCHHe4X08VFF121gwRsO8xPRNYelMBUNyWgRhA6QR3neFjSKslXOxZSFedfcXDqU2K3Z62vtZn4MM2F57UwCMlSCAFcbRzihMPjC86kifRuiPsshXr82oum7r5BEPdPpiqg6UQ8FghrYbukpedxOcxBJE/KzDGEIKqOq6IqaT+lVvZyRmofaDQa6HEdgryIVd3eS/l7otXuW3EZCnyyf6WbrQlJ2D6SVAY3z30djN5I1772xhC9tLEHo8RSCMyKUxt85D8PCLDCChUQZTvFdYP0ynagMKCKDyRjcaYRIQx0NIX7VCceVoJxCNsfB9geW+epSoABEevS1nnCvQDwOT79NRuuH2k4YwhnITyJI06MgvCzzzvEu0g7Fzudi/CFWNXA1vla39nxnqRst+3Ci0oGGw4h6Go8QgwGvYZmDdddQ2f/0h8eM/tFxd+IQLuc6CW+dghoAKAv5z/1i5eqSu65WvgbVAhFjex56c2VYgtjH1uSfyAsv6F7wdFUiSddLGZk7F2UEBmgECfZQPubFa7lh0KkN3O+vJx/5G4Z9GD+7Gcjvef1xt5T2Mn0RyV06K5tTXQTIufR3kRV2swE3CC7prOczgKye5gv0CVgAYvypBi+RzUFCw+LGfvKXb2cLXG51/Ob4KkCHlu8P8SQpCUbYUZl24oTT1QJFUD771pCjQ511dFCzOavvWjcEZ+HaDvgbdsUZH94jdcbQk8aIUjHC4+mFDV0o1QzS0Odvy2ibg6yV+boNp8vSHrZfDS5PL2qXcX3AradHfW+jTiXykCoFjdKU5NQL8v3Xcn+Dsb2JqRx+8GdvZzsmq608taL2Q1N3QNqeeOmIIfDa8anKxlnE7dfyL2YXYdSq5EIWGsTEgkoNjS6f/SkAoOl5oPTIGil71sqKeHKQ9jVO0jbn8zsG0K9U/bLJv8PPS1llULespkkrePrvN8teB95Wy3zsJig2CPLwMcIl3XaQDPN0pAYu857onMfE9Krg6s8HMz0NB8eBo0+vdH37eWnGCFRC3flr0FkAx0NR/jTBhpNrjCSR5EtjYhXtwcZ6BI0Ft73a71W+VAUOFn+fzua61/fpqEgv/3IPSLQXvE0VviEG8Uwaed8TZuuP4Z5bw12VGqhKlnVubtrgZ0pSROw4XCYc5/4rZ9np+TzCG6UsDncPVcKLmXXTyM8qrn+2Qi/PyDZbEN87+nGi4bdF/PZnGm4ewF0Q8wKd20Csgo9zM2uNhZn37XCG3mNU4bN0UzvWJi3rwPMASL4+4epZa3/vFoIXUpR0vS0cdsXOX0eTMVD1X5QKt6wBNIupZT+75TK5ypLO5lcbMv82ev9beXwlUlHKLHipp74rNrLuQ2qKxLAwha7kNf52ixxJeOwGNXHps6bzlwe/0Ex/WkFI6u6o7QF2X4YUHc+dsb+DibLvSyhr4tOOkJpY/YPvWzsrqCzKlpZVQw2a4A7xB3m8PhgYhPwGB08VhuPtTYmUc31nMgGrhYzAENU4/3tqUCoQeID9f9u/xNgAK5Bjqvr1b8fAAAAAElFTkSuQmCC',
		  iconSales: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAkCAIAAABjfH+IAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozRjA1MTYyQUE0MTgxMUVGQTExNEM5MUM0QjY2NkFFNSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDozRjA1MTYyQkE0MTgxMUVGQTExNEM5MUM0QjY2NkFFNSI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowNTZBQUU4OUEzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowNTZBQUU4QUEzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pn7prQIAAALJSURBVHjaYvz//z8D7QETA10AijVAn+18dv31zy/E6Nz+9Nq7n19Jtubbn1/1F7c1X9lx/cMLYnTOuH0k8fjSy++fEaOYBUI9+PK2+sKWh9/eAdmn3jx8++sbQZ3f//769vd39plVuWr2IXIGjIyMeBQzAgPq468fIYdmf//3h+ygz1O3D5M3IuAbPlb2NFWbybcO/gOnOmVuEQE2LoJGX3z/5A/DPyDDQFDGVUIDv2JGeIK+/P5p9YWt735/bdP3tRNXIWiN/4FZb399jVEwSVGxZmEilGL/I4E3P75UnN0ATAL/iQC157ccfHH7P3GAccCy53+iAS5DX/348g9VlgXOWvng3LIHZ4DBTbwbWRiYrMWUCjQdRdl54IL3v7xNO7EsXME4RcUK3TdrHl0ApjSS7AACYEo7+OpO8Zl1cLcD83jVhc3AvLHg3snjrx+g+2bNw/NAMkLeKFBWn4mJkUhrXnz7XHFu472vb8+9e2QiLA8MxrYrOx9/ew+Rbb60bY5VtBQnP8Kat+ByzF1SS5pLgHjfSHLwK/EKX/74/A24cNv74taBV3fgsp/+/uy4snuSaQhK3IAyESMZiYgRnGpALDMR+YnGQaffPlry4IwSt3C+hr0gOzd6EqAc8LFyGAvLv/oB8hkPCzuQPaD1zag1o9aMWjMCraFmmbbr2fXua3t+/wM1dy59fOa6Z7IWv9RE02CEb9iZWYHk46/vSTL3+5/fr3+AahAOZpBzrUSVhNl5IK0qkOy/PyHyBigNqJ6rezY8vQysdGW5BImvDj78+gFscHEysWxwSONmYQeK3Pv8JvXEsp///wLZsQpm6WrWKNZ8/fOz/PymC++fkBpQPMzsDXpeFqIKSEF3o+nKdmNBuT6TQGZGJvTmIBDc/PTy1Y/PxLeo2JhYDISkOcABjgx2PLtmIaIowMaJpdU5mm+IBgABBgC8L7XM+d8mWQAAAABJRU5ErkJggg==',
		  iconHome: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAZCAIAAABRt/K6AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1OUQyNjQ3OUE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo1OUQyNjQ3QUE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1OUQyNjQ3N0E0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1OUQyNjQ3OEE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PkhAgt0AAAIUSURBVHjaYvz//z8DBYCJgTKAT/+ff/9WPji3/8UtPGpYcEm8/vml/sK2Sx+fAtnur+6VabuwM2NRzIjV/xffP629sOXd729wEWVukTZDX2kuAcL6Vz44O/X24X///xsJyjbqe3349b3y/OYn39/zMLNX67rbiinj1P/tz6+2KzsPvLoDZMcomKaqWjEzMkHEW6/sPAgWj1UwA4ozMTKi63/w5W31hS0Pv73jYmat1fWwFVNBc9eK+2en3QG5y1hQDuguATZOhP59L261X9n5/d8fJW7hNgM/GW4BrIF64d2TmotbP/z+JsbO06LvqyUgAdI/9/ax+fdPAqVdJTTKtV04mFnxRBgwXuoubL388RkLA1ONrgfjl98/3PdNA0oUaTgFyekTk2aA6aLn2p4tz65KcvAz/fr3FyjEy8JGpGZQmmFiSla1AjJ+/v3NAkuGzMgqNj+5cvXDMzRtduIqVqJKhNPfp98/Oq/txhQ/++4xUfr/gH0EBOVarhDG+59fZ9099v3vHxLSvwArp6+MDoT9Fqyf7vl3ROiH5tB/v/7+/0e8tq+/f4ITIjMLHyuHJAff8x+f0k+uUOQWBqdKUDx//fur9fJOiGqYyE+4yGVw6lTnFQXlvysfnpedXf/p70+SXC7FyT/FNBSa/9///Hb+/ZMff35DM+mPL2xMzPzgEgJTBFj28LBymAjJcbKwAgQYABO9+oB7uy0BAAAAAElFTkSuQmCC',
		  iconLayout: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAZCAIAAACkSXkKAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1OUQyNjQ3REE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo1OUQyNjQ3RUE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1OUQyNjQ3QkE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1OUQyNjQ3Q0E0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvVocMoAAAG1SURBVHjaYvz//z8DNQATA5UAC4S68uH53DvHP/3+gSwnwcGTo2kvycEPVvBs7p0T6Ao4eXPV7SU4+YBsRqDX/v7/539g1off3zHt0ReQnmoW9ucfUMHMj39+YCowEJSZYhoKddHn3z+BprAyMU8zDYOrePPzS+WFzQ+/vgcr+AE0BU3Bqx9fqi9ufvTlPcJr/xlA4c3FxKbJLwFX9+7nVzD9H66Am5kdWYEIxxe4AmoG9uAziIUYRRzMrEDyw+9vyceXwgW//vkFkmJhJcEgLha2UDmj1Y/O3fz8Clmc+T9jgqI5CQYBQb6GfYicPjChwEUYGRlE2HmE2blJMwgIpLkEKA0jILj8/umcOyc+I2URoItEOfjyNe0geYgog4BZpOL8JswsAgyyr79/TDYLJdYgSBZhZ2SeahYOF3z98zM8DxFrECSLcLKwa/CLwwWFf3KPoCzCwQRK5h//fE84tgQu8ePvb1C4MLMhZxFkBd/+/oIkeoRBnCyskfLGyx+evfPlNVoOSFQyh6iOkDda8fAcpoJ4JTNosoLXIs9/fPzy6yeyOmDyF4LlAIIKGAdddQQQYABjRsFQXUaKAgAAAABJRU5ErkJggg==',
		  iconShipping: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAAyCAIAAABzgQSfAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpBOEJCMzJBNEE0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpBOEJCMzJBNUE0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBOEJCMzJBMkE0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBOEJCMzJBM0E0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PuKgopEAAATPSURBVHjaYvz//z/DIAZMDIMbjLqPMsCCxv/z58+KFSvXrVt/7dr1jx8/kmGisLCwkZFhVFSEu7s7IyMjhe5jRM4fT548SUhIunr1GlW87uLiPHXqFD4+Xuq4Dxhanp7e9+8/oGLs2NhYL1++lIWFhQrpr6enl7qOA4IjR44CUwsVwu/Hjx+amjpAEiLKysoSERGhqqpCqnH//v07f/7Cxo2b4CJqamoHD+6jNH8ADYU7DghaW1tiY2PINlRUVGTOnHkQ9q1bt96/fy8oKEhR/L548QJZ1M3NjcKcgcx9+fIVpenv169fyKKcnByUuI+VlQ2Z+/fvH6qVf7QAR48ee/z4MZzLzMwiKSmhra1NTOlID/fV1zdiCioqKkyY0GdmZjYA9dvTp08JqgGWZeHhUefOnR8A97GzE5V8gSVGcnLKq1ev6e0+ERFhIlW+ePEyJSXt9+/fA5n+lixZpKamilzcREZGf/nyBcI9ffp0bW19R0fbgLWvJCTEZZGAiYnxlCmTkBUsXLho2bLlg6j95+7uVlxchCxSUVGFNa8MWPu0uLjQzc0VzgUmQax5ZcDcByycgbGsrKyMP68MZPuel5d3wYK5PDw8cBFIXhlE/Q8VFRX8eWXg+0eYeaW6uvb58+eDqP+GlleA9QqwgzaI3AfJK6KionCRBw8eDq7+LzCviIkh3Advj46OH1B3/AArAHaNFy9eevDgwWfPnnFz8+joaIeGhlhaWhBvDbC1t2TJ0lOnTr19+1ZISAjYLI2JiVJSUqKC+3bs2JmfX/Dp02e4yOXLl5cvX+Hj4w1sAHNzcxM0YenSZYsWLfn79y/crWfPnps1a3ZBQT4w5+Jv5ROI3127dicnpyI7Dg62bNkaGxv/+zfhvs/8+QvhjkPqNP3t7e1rbW0nP/19/vy5oKAI2OXGpeD48RNz5syhJHlNnTrtzJmzhOMXrUc4efIUYBsd2OABdq2Ret2ibm4ujx8/OXToMFywt7f/y5evaHGE3FtDBhoa6qampsBK9saNm3DBoqISPz9fIAO58cLKyooyvgHU4+cXiMcffHx8R44chBShra1tU6ZMIzWogM3SdevWsrKy/PnzJzg49NSp03gUV1SU5+fnIuLXyMgI2OHDo0FcXBxevgNrTDKiUl1dDeg4UJSxsGhoaODt3rP4+/uhpD9mZuapU6cAC3Fcer59+wYfiQM21Mhw37dv35HYX/GobGlpVlCQR4lfCHj06NHEiZNPnjz18+dPSLEHzCJw2YiI8MjIcGD6A/a3gcUYvOqUkpLCLCO+f//+6dMnYFTCzQcGQXl5mZWVJTBXdXZ2AaUg4mxsbGJiYmAFTMBwzchIt7AwRx9fwwquXbvu4uKGfwIiMDBg2rQpuGQXLVpcXl6JP1zb21sTEuLJKV+0tDTj4+PwZ5rKynI8CqKiIvX19fAo0NHRiY6OIr98bmpq8PX1wSrFz8+/aNF8YH8RX+nFwrJgwXygP3HlGKAJ8KIEO/hPCADL5xUrVtrY2EtISEOQkpJqfn7h06dP/xMHvn792tPTq6dnADdBV9egq6sH2EUnqJeR+PktYOPg6dNnwDwOLInY2dlJzb9AfwJbnW/fvgG2DxQVFZmYiGo6MY7Ov426b9R9Q9Z9AAEGAFtUZ/IOlPLZAAAAAElFTkSuQmCC',
		  iconHandShake: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAA8AAD/4QQYaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA5LjEtYzAwMiA3OS5iN2M2NGNjZjksIDIwMjQvMDcvMTYtMTI6Mzk6MDQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iTW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgSGVhZGxlc3NDaHJvbWUvMTI5LjAuMC4wIFNhZmFyaS81MzcuMzYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6M0Q5MzQwMDlBNEMzMTFFRkFEMzlFMzQ5QkU2QzdGQkIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6M0Q5MzQwMEFBNEMzMTFFRkFEMzlFMzQ5QkU2QzdGQkIiPiA8ZGM6dGl0bGU+IDxyZGY6QWx0PiA8cmRmOmxpIHhtbDpsYW5nPSJ4LWRlZmF1bHQiPmFib3V0OmJsYW5rPC9yZGY6bGk+IDwvcmRmOkFsdD4gPC9kYzp0aXRsZT4gPHhtcE1N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',
	  }
  }

     const pdfBuffer = await generateQuotePDF(htmlObj);


    const uploadToken = await this.uploadAttachment(Buffer.from(pdfBuffer, 'base64'),'quotation.pdf');
    const ticketData = {
      ticket: {
        subject: `New Quotation #${quotation.quotation_no}`,
        requester: {
          email: quotation.email,
          name: `${quotation.first_name} ${quotation.last_name}`,
      },
        // custom_fields: [
        //   {
        //     id: 22019106776722,  // Replace with your Zendesk custom field ID for order number
        //     value: 123,
        //   },
        //   {
        //     id: 22019094465938,  // Replace with your Zendesk custom field ID for order total
        //     value: 1234,
        //   },
        // ],
        comment: {
          body:`Quotation Details:
          - Quotation No: ${quotation.quotation_no}
          - Name: ${quotation.first_name} ${quotation.last_name}
          - Email: ${quotation.email}
          - Phone: ${quotation.phone_number}`,
          
          uploads: [uploadToken], // Attach the upload token here
      },
        tags: ['Quotation'],
      },
    };
    const ticket=await this.createTicket(ticketData);
    zendesk_ticket_id=ticket.id;

    quotation.zendesk_ticket_id = zendesk_ticket_id;
   await quotation.save();
  
      res.status(200).json({
        status: true,
        data: {
          id:quotation._id,
          submittedData: req.body,
          roomData: results,
          materials,
         uploadToken:uploadToken,
         ticket:ticket,
        dd:htmlObj
        
        },
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }

  async generatePDF(htmlContent) {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox', // Disable sandboxing
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Overcome limited resource problems
      ],
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    
    await browser.close();
    return pdfBuffer
  }

  async quotationView(req, res) {
    // Validate the input data
    const v = new Validator(req.query, {
      id: "required",
    });

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      const { id } = req.query;
      // Validate if 'id' is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(422).json({
        status: false,
        errors:{
            'id':{
                message: "Invalid MongoDB ObjectId",
            }
        }
        });
        return
    }
      try {
        const data = await Quotation.findOne(
          { _id: id },
          { submittedData: 1, roomData: 1, materials:1, _id: 1 }
        );
        res.status(200).json({
          status: true,
          data: data,
        });
        return;
      } catch (error) {
        res.status(500).json({
          status: false,
          message: error.message,
        });
      }
    }
  }
  
  async generatePaymentLink(req, res) {
    // Validate the input data
    const v = new Validator(req.body, {
      id: "required",
      material_id: "required|integer",
      colors: "required|array",
    });

    // Check if validation passes
    const matched = await v.check();
    if (!matched) {
      // If validation fails, respond with a 422 status and the validation errors
      res.status(422).json({
        status: false,
        errors: v.errors,
      });
    } else {
      const { id, material_id, colors } = req.body;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(422).json({
         status: false,
         errors:{
           'id':{
               message: "Invalid MongoDB ObjectId",
           }
       }
       });
       return
     }

      try {
        const data = await Quotation.findOne(
            { _id: id, materials: { $elemMatch: { id: Number(material_id) } } },
            { "materials.$": 1, _id: 1,first_name:1,last_name:1,email:1,phone_number:1 } // Return only the matched material
          );
      
          if (!data) {
             res.status(404).json({
              status: false,
              message: 'Quotation or material not found with provided ID',
            });
            return;
          }
      const bigCommerceCart = await this.createBigCommerceCart(data.materials[0]);
    if(bigCommerceCart.status){
      let order = new Order;
      order.quotation_id=id
      order.material_id=material_id
      order.cart_id=bigCommerceCart.data.data.id
      order.order_id=null
      order.transaction_id=null
      order.zendesk_ticket_id=null
      order.first_name = data.first_name;
      order.last_name =data.last_name;
      order.email = data.email;
      order.phone_number = data.phone_number;
      order.colors=colors
      order.amount = bigCommerceCart.data.data.base_amount;
      await order.save();
        res.status(200).json({
            status: true,
            id:order._id,
            checkoutUrl:bigCommerceCart.data.data.redirect_urls.checkout_url
          });
          return;
    }else{
        res.status(500).json({
            status: false,
            message: bigCommerceCart.message,
          });
          return; 
    }
       
        
      } catch (error) {
        res.status(500).json({
          status: false,
          message: error.message,
        });
        return;
      }
    }
  }

  async createBigCommerceCart(materials) {
    try {
      // Prepare the data for BigCommerce cart (example: passing materials and prices)
      const cartData = {
        "customer_id": 0,
        "line_items": [
          {
            "quantity": 1,
            "product_id": 5194,
            "list_price": materials.price,
            "name": "Restroom Stall"
          }
        ],
        "redirect_urls": {
          "return_url": process.env.BIGCOMMERCE_RETURN_URL
      }
      }
      const bigCommerceApiUrl = `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}/v3/carts?include=redirect_urls`;
      const bigCommerceHeaders = {
        'X-Auth-Token': process.env.BIGCOMMERCE_API_TOKEN,  // Replace with your BigCommerce API token
        'Content-Type': 'application/json',
      };
  
      // Make POST request to BigCommerce API
      const bigCommerceResponse = await axios.post(bigCommerceApiUrl, cartData, { headers: bigCommerceHeaders });
 
      // Extract checkout URL from the response
     // const checkoutUrl = bigCommerceResponse.data.data.redirect_urls.checkout_url;
      return {
        status:true,
        data:bigCommerceResponse.data
      }
    } catch (error) {
      console.error('BigCommerce Error:', error);
      return {
        status:false,
        message:'Failed to create cart in BigCommerce'
      }
    }
  }

  async updatePaymentResponse(req,res){
        // Validate the input data
        const v = new Validator(req.body, {
          id: "required",
          transaction_id: "required",
          order_id: "required",
          payment_status: "required",
        });
    
        // Check if validation passes
        const matched = await v.check();
        if (!matched) {
          // If validation fails, respond with a 422 status and the validation errors
          res.status(422).json({
            status: false,
            errors: v.errors,
          });
        } else {
          const { id, transaction_id, order_id, payment_status} = req.body;
          if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(422).json({
             status: false,
             errors:{
               'id':{
                   message: "Invalid MongoDB ObjectId",
               }
           }
           });
           return
         }
          try {
            const order = await Order.findOne({ _id: id });
                  order.order_id=order_id
                  order.transaction_id=transaction_id
                  order.payment_status=payment_status
                  const zendesk_ticket=await this.createZendeskTicket(order);
                  if(zendesk_ticket){
                    order.zendesk_ticket_id=zendesk_ticket.ticket_id
                    await order.save();
                    res.status(200).json({
                      status: true,
                      zendesk_ticket:zendesk_ticket.ticket_id,
                      message:"Order Updated successfully."
                    });
                    return;
                  }else{
                    res.status(500).json({
                      status: false,
                      message:"Server error."
                    });
                    return;
                  }

              
            
          } catch (error) {
            res.status(500).json({
              status: false,
              message: error.message,
            });
            return;
          }
        }
  }

  // Create a Zendesk ticket with order data
  async createZendeskTicket (orderData){
  try {
    const ticketData = {
      ticket: {
        subject: `New Order #${orderData.id}`,
        description: `Order ID: ${orderData.order_id}\nCustomer Name: ${orderData.first_name} ${orderData.last_name}\nTotal Amount: ${orderData.amount}`,
        priority: 'normal',
        custom_fields: [
          {
            id: 22019106776722,  // Replace with your Zendesk custom field ID for order number
            value: orderData.order_id,
          },
          {
            id: 22019094465938,  // Replace with your Zendesk custom field ID for order total
            value: orderData.amount,
          },
        ],
        tags: ['bigcommerce', 'order'],
      },
    };

    const response = await axios.post(
      `${process.env.ZENDESK_DOMAIN}/api/v2/tickets.json`,
      ticketData,
      {
        auth: {
          username: `${process.env.ZENDESK_EMAIL}/token`,
          password: process.env.ZENDESK_API_TOKEN,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return {
      status:true,
      ticket_id:response.data.ticket.id
    }
  } catch (error) {
    console.error('Error creating Zendesk ticket:', error);
    throw error;
  }
};

async  uploadAttachment(pdfBuffer, fileName) {
  const url = `${process.env.ZENDESK_DOMAIN}/api/v2/uploads.json?filename=${encodeURIComponent(fileName)}`;
  try {
    const response = await axios.post(url, pdfBuffer, {
      auth: {
          username: `${process.env.ZENDESK_EMAIL}/token`,
          password: process.env.ZENDESK_API_TOKEN,
      },
      headers: {
          'Content-Type': 'application/pdf', // Specify the correct content type for PDF
      },
  });
     // console.log('Attachment uploaded successfully:', response.data.upload.token);
      return response.data.upload.token;
  } catch (error) {
     // console.error('Error uploading attachment:', error.response?.data || error.message);
      throw error;
  }
}

// Function to create the ticket
async createTicket(ticketData) {
  const url = `${process.env.ZENDESK_DOMAIN}/api/v2/tickets.json`;
  try {
      const response = await axios.post(url, ticketData, {
        auth: {
          username: `${process.env.ZENDESK_EMAIL}/token`,
          password: process.env.ZENDESK_API_TOKEN,
      },
      headers: {
        'Content-Type': 'application/json', // Correct content type for JSON
    },
      });
      return response.data.ticket;
  } catch (error) {
      throw error;
  }
}

async order(req, res){
//   const logger = winston.createLogger({
//     transports: [
//         new DailyRotateFile({
//             filename: 'logs/order-%DATE%.log',
//             datePattern: 'YYYY-MM-DD',
//             zippedArchive: true,
//             maxSize: '20m',
//             maxFiles: '14d',
//         }),
//     ],
// });

// logger.info("Request Data: " + querystring.stringify(req.body));
// res.status(200).json({
//   status: true,
//   data: req.body,
// });
//   let order = new Order;
// order.quotation_id=123
// order.material_id=1
// order.cart_id=1
// order.order_id=null
// order.transaction_id=null
// order.zendesk_ticket_id=null
// order.first_name = 1;
// order.last_name =1;
// order.email = 1;
// order.phone_number = 1;
// order.colors=req.body
// order.amount = 1;
// await order.save();
}

async generateQuotationPDF(req,res){
  var htmlObj = req.body.htmlObj;
  const pdfBuffer = await generateQuotePDF(htmlObj);

    const uploadToken = await this.uploadAttachment(Buffer.from(pdfBuffer, 'base64'),'quotation.pdf');
    console.log(uploadToken);
    const ticketData = {
      ticket: {
        subject: `New Ticket #111`,
        requester: {
          email: 'bidyut.patra@codeclouds.com',
          name: 'Bidyut',
      },
        // custom_fields: [
        //   {
        //     id: 22019106776722,  // Replace with your Zendesk custom field ID for order number
        //     value: 123,
        //   },
        //   {
        //     id: 22019094465938,  // Replace with your Zendesk custom field ID for order total
        //     value: 1234,
        //   },
        // ],
        comment: {
          body: 'The smoke is very colorful.',
          uploads: [uploadToken], // Attach the upload token here
      },
        tags: ['bigcommerce', 'order'],
      },
    };
    const ticket=await this.createTicket(ticketData);

  res.status(200).json({
    status: true,
    uploadToken:uploadToken,
    ticket:ticket
  });
}

// Utility to chunk an array into smaller groups
async chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async generateMaterialData(materialData,rooms,quotation) {
  const result = await Promise.all(materialData.map(async (chunk) => {
    return Promise.all(chunk.map(async (material) => {
      return {
        layout: {
          hLineColor: '#3d58a4',
          vLineColor: '#3d58a4'
        },
        style: 'productBox',
        table: {
          body: [
            [
              {
                style: 'productBoxInr',
                layout: 'noBorders',
                table: {
                  widths: [80, 'auto'],
                  body: [
                    [
                      {
                      image: await imageUrlToDataUrl(`${material.src}`),
                      fit: [60, 60],
                      style: 'pImg'
                    },
                    {
                      layout: 'noBorders',
                      table: {
                        body: [
                          [{ text: `${material.name}`, style: 'pCatName' }],
                          [{
                            text: `$${material.price}`, style: 'pPrice'
                          }],
                          [{
                            text: '3 years warranty', style: 'pWarranty'
                          }],
                          [{
                            layout: 'noBorders', // optional
                            table: {
                              headerRows: 1,
                              widths: ['auto', 'auto', 'auto','auto','auto'],
                              body: [
                               // Header row
                                  [
                                    ...rooms.map((_, index) => ({ text: `Room ${index + 1}:`, style: 'roomHdr' })),
                                    ...Array(5 - rooms.length).fill({ text: '' }),
                                  ],
                                  // Body row
                                  [
                                    ...rooms.map((room) => ({ text: room.full_type_name || '', style: 'roomBdy' })),
                                    ...Array(5 - rooms.length).fill({ text: '' }),
                                  ]
                              ]
                            }
                          }],
                          [
                            {
                              layout: 'noBorders', // optional
                              table: {
                                widths: ['auto', 'auto'],
                                body: [
                                  [{
                                    image: 'iconShipping', width: 16
                                  }, { text: 'Delivered in 4 - 6 business days to ZIP 30549', style: 'pDelivery' }],
                                ]
                              }
                            }
                          ]
                        ]
                      }
                    }
                    ],
                  ]
                }
              }
            ],
            [
              { image: 'buyNowBig', link: `${process.env.QUOTATION_PAYMENT_URL}?id=${quotation._id}&material_id=${material.id}&color=3d58a4`, width: 80, style: 'pBuyNow' }
            ]
          ]
        }
      };
    }));
  }));

  return result;
}









}

module.exports = FrontendController;
