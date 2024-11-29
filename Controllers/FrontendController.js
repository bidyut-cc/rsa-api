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
const formattedData = await this.formatRoomData(results);
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
  // header: [
	// 	{
	// 		margin: [20, 20],
	// 		style: 'mainHeader',
	// 		table: {
	// 			widths: ['*', 'auto'],
	// 			body: [
	// 				[{
	// 					image: 'logo',
	// 					width: 110,
	// 					link: '#'
	// 				}, {
	// 					style: 'mainHeaderRight',
	// 					table: {
	// 						body: [
	// 							[
	// 								[{ text: '1-844-81-STALL', link: 'tel:1-844-81-STALL', style: 'headerPhone' }, { text: 'service@restroomstallsandall.com', link: 'mailto:service@restroomstallsandall.com', style: 'headerEmail' }]
	// 							]
	// 						]
	// 					},
	// 					layout: 'noBorders'
	// 				}],
	// 			]
	// 		},
	// 		layout: 'noBorders'
	// 	},
	// 	{
	// 		margin: [20, 0],
	// 		style: 'tableQuoteNum',
	// 		table: {
	// 			widths: ['*'],
	// 			body: [
	// 				[{ text: `Quote Number #${quotation.quotation_no}`, style: 'quoteNum' }],
	// 				[{ text: `Date: ${moment().format('MM/DD/YY')}`, style: 'quoteDate' }]
	// 			]
	// 		},
	// 		layout: 'noBorders'
	// 	}
	// ],
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
    [
      ...req.body.rooms.map((room, index) => [
				{
					text: 'Review your Layout', style: 'reviewHeding'
				},
				{
					text: `Room ${index + 1}`, style: 'reviewSubHeding'
				},
				{
					style: 'reviewHdr',
					layout: 'noBorders',
					table: {
						widths: ['50%', '50%'],
						body: [
							[{
								text: 'Room Name',
							}, {
								layout: {
									hLineColor: '#e3e8ef',
									vLineColor: '#e3e8ef'
								},
								widths: ['*'],
								table: {
									body: [
										[{ text: `#${index + 1}. ${room.title}` }]
									]
								}
							}],
						]
					}
				},
				{
					style: 'revieTbl',
					layout: {
						hLineColor: '#e3e8ef',
						vLineColor: '#e3e8ef',
					},
					widths: ['*'],
					table: {
						body: [
							[{
								layout: 'noBorders',
								table: {
									body: [
										[{
											image: 'iconSales',
											style: 'iconWithHeading',
											width: 20
										}, {
											text: 'Stalls',
											style: 'iconHeading'
										}],
									]
								}
							}],
							[
								{
									border: [true, false, true, false],
									layout: 'noBorders',
									margin: [10, 4, 0, 0],
									table: {
										body: [
											[{
												image: 'iconHome',
												style: 'iconWithHeading',
												width: 14
											}, {
												text: `${room.stall.noOfStalls} Stalls`,
												style: 'iconHeading'
											}],
										]
									}
								}
							],
							[
								{
									border: [true, false, true, false],
									margin: [20, 0, 0, 0],
									layout: 'noBorders',
									widths: ['50%', '50%'],
									table: {
                    body: [
                      ...room?.stall?.stallConfig.reduce((acc, stall, index) => {
                        // Determine the current chunk index
                        const chunkIndex = Math.floor(index / 2);
                    
                        // Initialize the chunk if it doesn't exist
                        if (!acc[chunkIndex]) {
                          acc[chunkIndex] = [];
                        }
                    
                        // Push the current stall into the appropriate chunk
                        acc[chunkIndex].push({
                          text: [
                            { text: `Stall ${index + 1}`, color: '#0061a6', bold: true },
                            ' - ',
                            { text: 'Width', bold: true },
                            `: ${stall.stallWidth || 'undefined'}"; `,
                            { text: 'Door', bold: true },
                            `: ${stall.doorOpening || 'undefined'}"; `,
                            { text: 'Door Swing', bold: true },
                            `: ${stall.doorSwing?.name || 'undefined'}.`
                          ]
                        });
                    
                        return acc;
                      }, [])
                      // Ensure each chunk has exactly 2 items by filling with blank objects
                      .map(chunk => {
                        while (chunk.length < 2) {
                          chunk.push({
                            text: [{ text: '', color: '#000000', bold: false }] // Blank object
                          });
                        }
                        return chunk;
                      })
                      // Map chunks into the desired structure
                      .map(chunk => [
                        // Add the chunk (group of two stalls) to the table
                        ...chunk
                      ])
                    ]
                    
                    
                
									}
								}
							],
							[
								{
									border: [true, false, true, true],
									layout: 'noBorders',
									margin: [10, 0, 0, 10],
									table: {
										body: [
											[{
												image: 'iconLayout',
												style: 'iconWithHeading',
												width: 14
											}, {
												text: [{ text: 'Layout', color: '#0061a6', bold: true }, '-', ' ', `${room.stall?.layout?.layoutDirection}`],
												margin: [0, 4, 0, 0]
											}],
										]
									}
								}
							],
						]
					}
				},
				{
					style: 'sampleLayoutTbl',
					layout: {
						hLineColor: '#e3e8ef',
						vLineColor: '#e3e8ef',
					},
					table: {
						widths: ['*'],
						body: [
							[
								{
									image: `${room.image_2D}`,
									width: 350,
									alignment: 'center',
								}
							],
						]
					}
				},
				{
					style: 'commonFooter',
					layout: 'noBorders',
					table: {
						widths: ['50%', '50%'],
						body: [
							[
								{
									style: 'commonFooterLeft',
									layout: 'noBorders',
									table: {
										widths: ['*', 'auto'],
										body: [
											[
												{
													image: 'infoImage',
													width: 30,
													margin: [0, 12, 0, 0]
												}, {
													text: 'Stall widths are to the centerline. Stall depths are to the face. Alcove depths are wall to wall. This layout is included in the price.'
												}
											],
										]
									}
								}, {
									style: 'commonFooterRight',
									layout: 'noBorders',
									table: {
										widths: ['*'],
										body: [
											[{
												text: 'Need this layout bigger?',
												style: 'bigHeading',
												alignment: 'left',
												fontSize: 18
											}
											],
											[
												{ text: 'No problem! Our partition Experts will design it to fit your restroom.' }
											]
										]
									}
								}
							],
						]
					}
				},
          room.hasUrinalScreens // Add the condition here
              ? [
                {
                  text: 'Review your Layout', style: 'reviewHeding'
                },
                {
                  text: `Room ${index}`, style: 'reviewSubHeding'
                },
                {
                  style: 'reviewHdr',
                  layout: 'noBorders',
                  table: {
                    widths: ['50%', '50%'],
                    body: [
                      [{
                        text: 'Room Name',
                      }, {
                        layout: {
                          hLineColor: '#e3e8ef',
                          vLineColor: '#e3e8ef'
                        },
                        widths: ['*'],
                        table: {
                          body: [
                            [{ text: `#${index + 1}. ${room.title}` }]
                          ]
                        }
                      }],
                    ]
                  }
                },
                {
                  style: 'revieTbl',
                  layout: {
                    hLineColor: '#e3e8ef',
                    vLineColor: '#e3e8ef',
                    paddingRight: function () {
                      return 200;
                    }
                  },
                  widths: ['100%'],
                  table: {
                    body: [
                      [{
                        layout: 'noBorders',
                        table: {
                          body: [
                            [{
                              image: 'iconSales',
                              style: 'iconWithHeading',
                              width: 20
                            }, {
                              text: 'Privacy screens/urinals',
                              style: 'iconHeading'
                            }],
                          ]
                        }
                      }],
                      [
                        {
                          border: [true, false, true, false],
                          layout: 'noBorders',
                          margin: [10, 4, 0, 0],
                          table: {
                            body: [
                              [{
                                image: 'iconHome',
                                style: 'iconWithHeading',
                                width: 14
                              }, {
                                text: `${room.urinalScreen?.noOfUrinalScreens} Privacy Screens / Urinals`,
                                style: 'iconHeading'
                              }],
                            ]
                          }
                        }
                      ],
                      [
                        {
                          border: [true, false, true, true],
                          margin: [20, 0, 0, 20],
                          layout: 'noBorders',
                          table: {
                            body: [
                              [{
                                text: [{ text: 'Screen Depth', bold: true }, '- ', `${room.urinalScreen?.urinalScreenConfig[0]?.screenDepth};`]
                              }],
                            ]
                          }
                        }
                      ]
                    ]
                  }
                },
                {
                  style: 'sampleLayoutTbl',
                  layout: {
                    hLineColor: '#e3e8ef',
                    vLineColor: '#e3e8ef',
                  },
                  table: {
                    widths: ['*'],
                    body: [
                      [
                        {
                          image: `${room.urinalScreen?.urinal_2D}`,
                          width: 350,
                          alignment: 'center',
                        }
                      ],
                    ]
                  }
                },
                {
                  style: 'commonFooter',
                  layout: 'noBorders',
                  table: {
                    widths: ['50%', '50%'],
                    body: [
                      [
                        {
                          style: 'commonFooterLeft',
                          layout: 'noBorders',
                          table: {
                            widths: ['*', 'auto'],
                            body: [
                              [
                                {
                                  image: 'infoImage',
                                  width: 30,
                                  margin: [0, 12, 0, 0]
                                }, {
                                  text: 'Stall widths are to the centerline. Stall depths are to the face. Alcove depths are wall to wall. This layout is included in the price.'
                                }
                              ],
                            ]
                          }
                        }, {
                          style: 'commonFooterRight',
                          layout: 'noBorders',
                          table: {
                            widths: ['*'],
                            body: [
                              [{
                                text: 'Need this layout bigger?',
                                style: 'bigHeading',
                                alignment: 'left',
                                fontSize: 18
                              }
                              ],
                              [
                                { text: 'No problem! Our partition Experts will design it to fit your restroom.' }
                              ]
                            ]
                          }
                        }
                      ],
                    ]
                  }
                },
              ]
              : {}
			]),
		],
		[
			{
				margin: [0, 140, 0, 0],
				style: 'thankYouTbl',
				layout: 'noBorders',
				table: {
					widths: ['*'],
					body: [
						[
							{
								style: 'thankYouInr',
								layout: 'noBorders',
								table: {
									widths: ['*'],
									body: [
										[{ image: 'iconHandShake', width: 40, alignment: 'center' }],
										[{ text: 'Thank You for Choosing Us!', style: 'bigHeading', fontSize: 18 }]
									]
								}
							}
						]
					]
				}
			},
			{
				margin: [0, 10, 0, 0],
				style: 'teamTbl',
				layout: {
					hLineColor: '#e3e8ef',
					vLineColor: '#e3e8ef',
				},
				table: {
					widths: ['*'],
					body: [
						[
							{
								border: [true, true, true, false],
								style: 'teamTblHdr',
								layout: 'noBorders',
								table: {
									widths: ['*'],
									body: [
										[
											[{ text: 'Meet the Partition Experts', style: 'bigHeading', fontSize: 18 },
											{ text: 'The team behind making your dream ideas come true', style: 'teamSubHeading' }
											],
										]
									]
								}
							}
						],
						[
							{
								border: [true, false, true, true],
								margin: [10, 0, 10, 20],
								style: 'teamList',
								layout: 'noBorders',
								table: {
									widths: ['25%', '25%', '25%', '25%'],
									body: [
										[
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Jim_Southard.png`), width: 90, style: 'teamImg' }],
														[{ text: 'Jim Southard', style: 'teamName' }]
													]
												}
											},
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Josh_Williams.png`), width: 90, style: 'teamImg' }],
														[{ text: 'Josh Williams', style: 'teamName' }]
													]
												}
											},
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/DJ_Bunn.png`), width: 90, style: 'teamImg' }],
														[{ text: 'DJ Bunn', style: 'teamName' }]
													]
												}
											},
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Jennifer_Hollis.png`), width: 90, style: 'teamImg' }],
														[{ text: 'Jennifer Hollis', style: 'teamName' }]
													]
												}
											}
										],
										[
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Jim_Artman.png`), width: 90, style: 'teamImg' }],
														[{ text: 'Jim Artman', style: 'teamName' }]
													]
												}
											},
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Megan_Schroeder.png`), width: 90, style: 'teamImg' }],
														[{ text: 'Megan Schroeder', style: 'teamName' }]
													]
												}
											},
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Peyton_Cape.png`), width: 90, style: 'teamImg' }],
														[{ text: 'Peyton Cape', style: 'teamName' }]
													]
												}
											},
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Rob_Watkins.png`), width: 90, style: 'teamImg' }],
														[{ text: 'Rob Watkins', style: 'teamName' }]
													]
												}
											}
										],
										[
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Tracy_Hanson.png`), width: 90, style: 'teamImg' }],
														[{ text: 'Tracy Hanson', style: 'teamName' }]
													]
												}
											},
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/Travis_Perdue.png`), width: 90, style: 'teamImg' }],
														[{ text: 'Travis Perdue', style: 'teamName' }]
													]
												}
											},
											{
												style: 'teamSingle',
												layout: 'noBorders',
												table: {
													widths: ['*'],
													body: [
														[{ image: await imageUrlToDataUrl(`${process.env.URI}/uploads/images/CJ_Cooper.png`), width: 90, style: 'teamImg' }],
														[{ text: 'CJ Cooper', style: 'teamName' }]
													]
												}
											},
											{
											}
										],
									]
								}
							}
						]
					]
				}
			},
			{
				style: 'questionsTbl',
				layout: 'noBorders',
				table: {
					widths: ['*'],
					body: [
						[{ text: 'Do you have questions?', style: 'qHdng1' }],
						[{ text: 'Call us or email us and we"d be happy to assist you.', style: 'qHdng2' }],
						[{ text: [{ text: '1-844-81-STALL', style: 'qPhn', link: 'tel:1-844-81-STALL' }, ' ', { text: 'service@restroomstallsandall.com', style: 'qEmail', link: 'mailto:service@restroomstallsandall.com' }] }],
					]
				}
			}
		]
  
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
		sampleProduct: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOkAAAC/CAIAAACUgmxeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowNTZBQUU4M0EzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDowNTZBQUU4NEEzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0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',
		buyNowBig: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOgAAAA4CAYAAAD3l7RXAAAACXBIWXMAACxLAAAsSwGlPZapAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAABbhSURBVHgB7V1tjBxFen6rZ3dtY8OuDebD2NBGBFvhEnxBRHdKJJpIiU5nLC+KQDr+sPzLnSKdT5GAyx+vo4sOlB9wJ6ILyg+GRAmX8OOM7IPkoohx4A4uHMHmMByOg5vdvcVrwN61vbZ3d6Yr71Nd70xNT8/XemZ2ue1Hqu2q6urq3pl+6v2ot2qIMmTIkCFDhgwZMmTIkCFDhgwZMqx4KLfg+8ND0ZrSiC5ROH7swH7KkCHDkqKKoJu33fsKH4L4hJomTfu1p5+b+NXBAmXIkKHn8Oqd0KSHtNIjnHlly7ZdJ7Zs3zVCGTJk6ClybmHDxt8+FFGkGNdzccg5hfzwVVffRmc/O3aIMmTI0BMorbVRc5mUmqzKy3W09Qv33VEqlfawBL2bpalfuYLuyVTeDBl6g7KKOzo66oGYghPv/ujI+K8OPJxTuXu4WCif0LSXLLHdRBkyZOg4FDmOIiEoS1MpG6m6det9g8VVxTO22fTEBwc34JTTTiRwhgwZOoga6QcDlKWpye/du1fv27cPZc2OotNwHNlm3/OUN832qil4VhB7OW9/eHT/4Xo3g6OpSl1uA55S0yVdmlbkhZmKnWGlwEhQJqAh6dGjR83xhRde0Pfff7+6/fbbNciK9Pc/fPP/lFZ+k/6mvQF9y0fvHIS0Va5UNeTU+lnqyEOrae7rqYljB/dRhgy/wfBATiEhAHJKHgBRhbgtQCSsOJvERqVOwkhyRaNbbtvVEcJnyLBc0Yc/QkiosiCkQ1D1ySefqI0bNyYZ9n2onJViLCn576GH//T3ZmCbgviOiozTeZaitFgVly8cUp66mbXqHdIH5mk3b7/3ufH3D5ipnw7bwRhsnqT2gM/kI05Q8wuU4SlOg04ZGk9Ii4M7GOP7ztMKgCGoSMggCEBIHKlQKNCHH36o3nrrLY16j64EucxFqlT6/tjxl0PUczuQGpLXEBx9uRLYwlzIXuE8dQBM9DxL5YdsMaD4C+u0kwoEHaHFI6T4JVrJavhuTr5TRv4eWhxGEuU8rQD0ueorSCnkxPHcuXOoBglBivJFXq4vknqQlPOGpOgLREWySCPrZYMHitAtG2M3BrKuN3opPcs+p1FOwxS/lNOUIeC0h2LJmqEFGAlqCaXuvPNOBVLykaDarl69WiPPUlSZCCM7I6NUDi9+iZ1I/dxeC6GhCoOofK1n1WKkiDoNTXdLlp8pjJ9JibPLJWWyfDkAwQ43abODqiOwpO5HtHjJ8ZsGzKNjIUZIGZqDCYVwvz4mGMjaj8TEG0DiPNKqW2+9ddWN23eGm7fdq5H87cO+vdyTa+R6e+yz/XY8gAH3ludAuvl3d221z2FSBwMofIrJLemVNq7bk7gWaYRWHk5Q7efQzmfpwr1+xTgHPUhKq9ZiWkUxGT1H7UWZjh8/XpaeCUA6RrgO10PaWmiWyiXqvF1IJSoF5YKiQx+9c2BMHFtIcEpJAMUSIaRYhXs4Uf8QZRAEFA9iGZrAYxVVCTmZmKYSpJydnfV831fFYlFt3ry50RtfYnUWRPWgCkPdpW6otYI41NCAReQ/4AgV3bWloeouMUmBPFWrxAHVqr8rCUkbHN+jTxkawrvyyis1yIkCE1OxtCSQEikMQ5OPoqjh286kLFJsk6LYFckJ8JRK4EzTfHTtupP/yFLbg90rcKaMFKQpLS2OJMormaAYrL7nlPFZ9FJV9Sn2BwT0ORoYjASFM0gqRGoiv2nTJg/knJycbKWvIkuxBeoSOQGl1TfLBU3/denSJYUBhiWoKz2pjcCK5QLMt75iU6tzryPONUmbzk+ca0edHEpcO0KdwyhVO4cC6q6qG1A8CCCyDfbw2xT/Tyds3bO2TT2MUPVn0WyA9an9z30vNfjujRcXL7p9qU1ilZYmJiZM/rrrriMkzIGq5j6frpETzqGiLg6Xb1S8+J2jx45ijtZ4kGFLi4qOaCgrzZcaNzv5kOp7LmVkbwd+g2tCqvUotzq1MZzo92HqHKZtf+6A0g2vrgSZjDRpM2JTntKDKFAOnPIwNZ5/DRLtfWr+ue+hyvf0XPIk7MaqCpagWlRaEHNqaoqaqbi9ADuHyranVtGBX3/4n4jYgZPLROrDjoYktdJ0OUjQJOmeo97CvV9ArQ8ArjOrQJ2fDilQd1Vdn2JJOZKon7b3RgoT59D2FapVfQtUbTvfTY2xO+VZGkndIHG+kGzgiecVjiFA1FsA5CT7svOU/5jUF6noUw9hpnV05QXzivppqOJIKDM5zf+BeVxIUwAawRKquhhpXSkRUu8jX5KbvgXUHD71ZlAZpe6puphz9p1ySPEc9Hp7RNpqj6HTDtekDRQvOvlhaowgpa7RNe65w5QyGNZIUAfm5WYPrQ16XzqpFOlot+McGhs//vKr4sSCtxnOLWkLm9oGS3T6eSERn22S8HKcsUcZGUOqfRl6gQJVj8jfbOEa94WB5NhP3YGoui464dUdofh7EuCl/yKlx0UX7Lmkp31PSjsBvlOf0hFQurRsJHVdiftiWoM+GylkCiyRiF96xc4ho966qi1nZip5Fl6VYIWuYSE3P8S67Q4eIEbLlbr01/x88CwTbGXUwPOM+dvBwcEI/wume5ik2gk57AQWE5ub5/QtWrowP3zpgc0P2XyhQXuXxCBnN5+7QLGqK/cUVfceWjz2Jsr3UeP/Ydq2eZsq5EIfrt2Iz+FJ5/wwpduV7uBWoMrnHlA6fKome+pgaJxE1qGirUqoS6WSZ9Vbuuaaa+JpFlX5R7Guk9Vc6jZUMV4Iriu+p7GJYy//M06xZFf9/f0RS1IzsKAZE9PDGlb2SkOCUhdI2i5GKP4SIC1C6j3yFL9w7stVqNM2oOoXphc28yhVB9QHtPhY3R1U/fx5au0zRxsMFELu5EAmIZ6BLe+u83x3OPl9TnvfpjDRfjjxDIcpBeU9iebm5kxAAqRTLpfTkKBQb4HTp0+zmlkap6XF2MKF0zsxYJBVv3kgqVJjQU7J24CJTsJ1MtRLYcp1AcVu/Yeo95CXS4BnqOe0cJ8vpN4sl+ukqhskyu0MMIVEeUei/GLiXPIzFFID8p6EVP/ZgN0N7l+GLDczTiKeWtFQGyExHQlK69evV1Fx7jWvv698IVulIbUHVVth9zSi9JhZdkzNcJMxFel3Zs+P/YAuTc5QIgAe00FW1aVVq1aZeqi54izqIPCit6p+BRRLT/elz1O8VrRAvYU7msuLlKZOBU4+1R7qEgrUGVXXT5QPU+soJMp3JMp5qsxR4vl2JK4JnPwh5+jb/N1U7SQcohadcX14maHisgStOiFTLJ9++ilt2LBBz1069cv+/ltmmExmAa4Xed9q8+chQKwBeF7ZzjWSG7YupCDfR4kzCvUYICC1+b7mQjcPQIpCheVn1NKeHBUddjWcRbR0KFBlFHXtIrx4W6m3KFA8qsuoDyIkvzeoW75TXoyKeTkYpctXdZNSrV37OXTu76f0VaAKqZKmgisN5bPF+Yec9q6mECTuW6A68FjSmJccjhbYciyRhDQk6iQTRJ2ZPDpT0gs/kAtZgj7b5m7zuM88k1ODmEiTk5NlTzG8rhgMACEkjkj2GeIH9jxt22k8I/pBHby6dtoFi8xVA+90LzFKta78gHoPd94xoNqXudtzn83QSVUXCKnzOOTkk57ZwMmL5HYHwaT3tyX1FugTSQMVFw4Xq+LCBoVzyJAXKi6O+tzU39HgjQ8y1W7CTeEs2rJt116WqodZPh6Rnfca3RDTNVqX+rwIXuHJH0P6QRpClRYYabl60+ANv3XnTkjVXM7jQSMyC7BViWY2RG/9mElptv3kwcQQtK+vzyS7+oaclTVLDaiLrnc0qR71AnhZXEk+QhXp5FO1w6IXzqE0FKhzXt0h6jwKVPkMxQ6dpmrnVEgVgk5TtVR2vb+B029Dc6Ks4or95gYqWKgzZ85okPTixRMzA7mBXQNrNx7gepBU9hhCIMFwZCZLvUb3s1EPnvnRic3bdr46d/q/v2olqDnP5DTScvO2Lz3O8vLB8oPKj1TwpWuu+fJrc6d//lUU4dACyTG4gKBMzm46ihaDpC3UjZenlWcoULonMki0bcds6TRGqVbVHbWpHQxRhUCtwnfyYcr5AlWbCiBcnqodSoXENe7gHFD8mQfUwvSKANMSJlge9hvICRXXBaQZyCkLoE9N/Hz8/NRrd5AufptPj9FlAE6ixKLqcp6pflODCw1AalGTQU48PwYbJMQXd8FRtBh0i5Dt9uuO1AFVXpKkI6td262TqKfq7mjh2uRA6FPrSPb/UZ12rnYhaq6rrh5KtC+ktHe1labOuD6s5YSaiykK6ygqkwQEAEHd3QkGBwdN+dzU689w8ZkrNuz4glL9W5ghv8MK6KDn5QZ1eTloZU8gVki5tjqWfuHi9HftdkLGdpR78YBAxYXT3+jvX/9Y/EAeaWeJafHC9HfFXoUzC6ttbJCFzOkSBp0ldhQJkvZKM++iT63hDmoPeaqdE8XoHThtlkq9dVGgalUXaCVWN/m5DlPrntwdTfoS7HeeSxw/jSSoWxbP7d2J/hrCzJtYh4qSeFxZXmZVT6i3eno6HliZoLJHlzlePHPkl5x/l/MvuZt0QS0G4WAfms7tOZBeVFpxQkFFdb20aDt3+v3xBc/7Ou7DfZl6ENfpS1m7tayaI9AfmgAGG/s/aVpa+FQbi5n25bsjdivqmU/tO5vQH0ZskZi7qfoeIfXeNq6HUapWdVuRoAWq9VY/Ra1pBHtT+krDYeceSHucZ8S5MNE+6f3F/9SI0DUoG4zsVImsJ9fs+8LeUZds5ghyzszMEJPVSFQ5midx8gDUYtiSLOmUdQRVeWwtOcvhhO61khdyCjGRl2fBae5bwwaFJ1ecRDghm50tsYobUO06zTyl2zfuS4Qvfpgao9U1o5Ryf0FA1eptL+c+myFN1W0FyVUye1u4JuktzlN9UssgJ3Cl/KE617j1I06+QC14m40ExVQLVoS4JzDV4jhuNKZa5NzQ0JBxzAxdv31w9bobd3qqb8vajXqseHH6p3PnPzB2KRM54nYeE1c2ejKEg2oKyQfi2qkUHLUlnlq/6fbBVVfcsNPz+m5i9o4PrD336tTE64higiQvExTOJIT64TlxRJ21QSORnh0mqE+txeJC9cQoGSTq8eXuq3ONqzoBT1J6sLpvzzUjcD0UqFrKBM65p2h5oUC1qm4z4H/AoOPb8h57RD9hoq0QeI9Thzb1viP3uWRg8xP19dq7YYSClswJOFL64O3EUi3MH7IE9WSbk4WFBbNLHvKcQDYFGxRYd92Xvu6pgUckcEEQRQtPzJ564wmooaIWkyWoJXq5LQiKftGWiac23/aVP2N79rGaPkvFxyeP/9sTVCFphG09oX5D0osazQ6uiKp3fwMWGzTsUxyi1ykgKLuRzQFpGyTqChSrTjKP5p7HF+xKwFbt7VFKV+kWM53RDPj8/Mu4B/7vt6nWLs9TfQmLwTG5+0Fo7y9b0NxM8WDrtpm2z9fMbsU1Z1Lq11N9yXuGap16W6kFCYovFStazJeLYHOKd1SoIiiC50EgqLgor7vuy496Xv8j9Tot6fm/nD35xjNnz57VkLaos2QtS8HEUW267SuPsiR+rF6fkZ7/9uSxnyBQQrMENn2yehtNTU0hPFFU2wjTRbKFyy233BLZ3QUXA586Q9ACxStaWnEOpS0aTgNG+TxVP1+rBE17wR6m7qxXvVyCAgGlmwqNVGCfWv8sgZDiAbTZdyRIDqYFavy/JdvjPl+kFoANtzT29UEBzhWJJjInHQcPE83Urb56+5Yqcip+OGVemPI/l1P9j6o1NwxeddVVRvKiDtdzMgTH0daZ8rVbf//mKnKm9OmxZIX6a6Wu+zKaZxT7E8D/I/9TjyGT05CUeP57qLVRmaiybvQ5qj8Sox+8SKN0ec9YSNTtp+WLAlXblq0gpJgA+6ixlBKzI7kutBmS9vqRNtu3bO9j3WROtgnBmkrZ0Q8kgH0H6Ql70dqTatOtf/ygl1v1tL3+8MQHB8sjweZt95ZHiqg09+eTx//jh0zSGqJAsoqqDKfTplv/5GtebuBvm/WpS/PfuHj6F/+EgQODBlRcVPOgEtkplgjS0/6ejNnp/jIk6FICo+EOqkSshBS/QO28RI3gjuh56uy+Q8sR+Bx9qnhQQ+rs59k19GG9JKQofiiJJ/e1RBLJVIuE4FkVVbGkqwQQqMRIoNhjJVuTKA/tFJPRBLAniApvMOoUJ4jqLa30ycZm+d42WB5qrinz4LLUUyqdhEi5AnUePi2/uc9uQ8i4nDWFVBj1090eBMHsoi7CAQOvq8TiMnSkipXoIZ2YhNdOVEVUgp6s1q1bZ6Qzq7IeyAqVltVP1HmWvHAsTbTSJ4v1MTt1U16rOjAwUI5gkF39AEhPd31ohjICJx/S8pn7zJCCPrt/jylAPZTNq2UpGFfDwwobFPOeNDsdvnzV+u2y7CxgFfRtI/ViYokKQfMXz/yUyWnylqSwC82PM1kbEfl4udjZUy+r9X7TPouXzr0GBxEI6qi3NfbnMgnxW45Izg02m1LIsMTIsZTxXnrpJbVt2zbYhh5ICdVzfHzcEGvNmjUeE1eJFzdaODc/sOaGeeXl/sj2cT0lA4Cj+b859+nb/y4/v3D+/HkE48vPGZo8Q/HREHZ29tTclUN+4z519PjczJGDn332mSE7qjCIIFABK1vgvb322mvpzTffNGF//D+ZrThp6aOJlhIY3E7afMDpeU7bbTmkmKDTlGHZIvfAAw8YFRRxq0eOHDGBA5CWIOfHH39MFy5c8JikhkxkXflzs+P/M7B2E/Mv9wduZ3zyrI7mv/Pr//3J06x6muVgTE5lJSn6oPn5ebJ9ARp1SHOzE79YvXaLZtv1D6v7VDOl0vxfXfjkjackSAHqK0tKOnnyJAYRE4MLLQAJEUTo76677iL+3xCAsZIJ+jrFk/ejFM/7Xe+cg2f0c2eTrTTk+GWHBCVI0KuvvtpE9/D8pxobG4MTxrviiivKIXf84pejjebPT/yM+gb+lZ1GR5lERxdKF//l/NTxRy6eff8NkJOhZmdnzRFlEBXkBLEwGIgUlQSv7KXzYz9TA2ue5ymVd1nd5VR8fvbUib8oXvjgNTTmgQKrVDQ/k4InF57g/v5+BEQYexME5f/D/F4pguZhW7/33nsrmaDDlD4XCIfJ1yjDsoeyv+NpXmarEmKfWRDBsz//4CFuFtMtmNO0K1sMUWUVCsi3du1alBEVVHbaWIJCyrmRPQZQexNzleW8G4wvZYQOIo9oJJDTDVKQOFysBWX7M7LTK/idFs2pe7+0tvyRp9rNyuC13UOZavu5AKZZzMoQcawgaB4RRQiaxw5/TEwtu+dhzhLTInDuwMkDkrlwVrMY2w+kFYiqy0eNI5J1GOG0lmtsnUrrk8kZsQrukt0QE55nSFB+9lTCr2CAiHmqjuYJKcPnBp78XB8g24TI9ATmQuGEwaoRSxSNIAOrppIlmqmX827nqGMpqi2R0SayJDXnpB+KbWBzjVMHp5UZFAAseYNURZC8nWIxpMZG27JMzoX7f61gyHxqnlrfJzbDMoJRYfEyYzWL/JAv9si1P60gNqLHxCj/vLyoumTnN90OraQsSzhbZ8gs0lAksM2bdlaSxg+FvYcSai5UXFFvMWDYviNIepbUkcTf2mmWCP+T7SCTpBk+t+iTn44nuzwLtiimLPCz9/ZnCMsLt7mNkphccwG//0w+2HjG6yuS0hLSXaitHKJUHa3ELKu2aAfJSU7wN5xBNn63TDgEUbDzqUw++xOKpoxd52F/LoNf2c6Q4bLw/3XfGcPdZijUAAAAAElFTkSuQmCC',
		buyBtnSmall: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAABACAYAAABWUJhRAAAACXBIWXMAACxLAAAsSwGlPZapAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAARFSURBVHgB7d2Ncds2AIbhL70MkBHQCepOUHSCaoOwE7SdoOoEbScwM0HiCaQN4kxgZYJkA4c4ijEAgiQgmbRlvs8d7kSKkhhSH/HHyK8k3QtAlh8EIBuBAQoQGKDA68S6VwLQCfr41DBAAQIDFCAwQAECAxQgMEABAgMUIDBAAQIDFCAwQAECAxR4LQx505R/VeZrUz435bYpe+FFuo8KWkb9Y1NS7pryt3DpevkgMGlG5wWmKx/V1la4TMH5pEmWzzW3bie2uVI/HG7d+6b8KrwI1DBpRuFx2RW87k/1j2slXCKaZJmMTgtMpzrz9XgeCEwmo/O/8B+j96Avc3mCfDAPM69P0TKBuXB0+p8HN99zdXzsBhb+ynhN1ZS33rI/qGCacu0t3zTlP+VxoX7vLb9rSi18R5Mszej8JtlO4bxMzna5n7PV+Hn7otP2vYre12jdaJItxNUY1lt+p2X5n2cV7ssYv9baN+UgfEdg5rFReFU/aPlmzYdo2Wqa0dOG/NmjD5PP1RjXE9u49r9V2Lk/qO1fHLSs/bHY4/IfaptxYzbeYzdR+0HooQ+TZnT+bTEuYDkjY3P0YZx4AtVq3J3CfQd9mEVVakecjJ5Grbam6GxGtrUK95PmWAJNsnw595IZ9cNh1V65Ky3/Jez22R6XXYd+qzBE8p7rHMR/TxhEkyzN6PRhZav26h4fWzuw/VxNsm5f/O2Gahm/OZY7Z7MGvXwQmDSj0wPT2UbvcTew3ZyBcabmZDZi7mUIfZgFbRWOjhnlz4c8pv+9x1b9gYi33uO9mHsZRGDmdxMtX2l58fBw5T02CptpdPZHEJj5xQMFT3EDZvwbA795j220LXMvIwjM/OYKSOn7+jWd1UM/xW+O1UqPoOGIwMzvl2g5Z2g6x08qU6s/J2PErTDFGCVLMzp/lMyof3xNYrvae96NaE3VHkannbda4b+n0vQI3toxSrYQq37IaqVHoPwrvwvL2Iy8U/p7af7nd6zC5tiNMMn9Pcv7xDq0V3H/qntoyj8Zr3NNpfjWfseF4melA+O23UXb/q5+B9yoDUsqULnnbagG+1EMJ6fcp1bQJOszKrvRcqpM1Rq7xGvcOheQ68TztU47b9uBz0FaLx8EJs3ocYLivow5cy9G4e0pY2Wb2L9cbxLvVwlDCEwmo/JwuOaO+9K7O5S3Kp/VN2prji8D7+9+hWYzsH8ldtFrn2Ju6FIE54C7lYcdtHx/7qD2au++wFd6+CVNt/5W4ZC0W/cY+1eLuZci1DDrYhSebyuMoUm2cpUezvWdMIXArJhr3rmQ0NnPR2BWxB+dswp/utYFxwhTCMyK+LVJamga0wjMiuw0PDyNPMGx416yl+1zYp27I5k/7nQi7iV72br5HHNc3ov7xUoF+SAwwLggHzTJgAIEBihAYIACBAYoQGCAAgQGKJAaVgYwgBoGKEBggAIEBijwDQvtNUXk2ExLAAAAAElFTkSuQmCC',
		infoImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEsAAABLCAIAAAC3LO29AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowNTZBQUU4N0EzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDowNTZBQUU4OEEzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0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',
		iconSales: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAkCAIAAABjfH+IAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozRjA1MTYyQUE0MTgxMUVGQTExNEM5MUM0QjY2NkFFNSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDozRjA1MTYyQkE0MTgxMUVGQTExNEM5MUM0QjY2NkFFNSI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowNTZBQUU4OUEzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowNTZBQUU4QUEzRjQxMUVGQTExNEM5MUM0QjY2NkFFNSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pn7prQIAAALJSURBVHjaYvz//z8D7QETA10AijVAn+18dv31zy/E6Nz+9Nq7n19Jtubbn1/1F7c1X9lx/cMLYnTOuH0k8fjSy++fEaOYBUI9+PK2+sKWh9/eAdmn3jx8++sbQZ3f//769vd39plVuWr2IXIGjIyMeBQzAgPq468fIYdmf//3h+ygz1O3D5M3IuAbPlb2NFWbybcO/gOnOmVuEQE2LoJGX3z/5A/DPyDDQFDGVUIDv2JGeIK+/P5p9YWt735/bdP3tRNXIWiN/4FZb399jVEwSVGxZmEilGL/I4E3P75UnN0ATAL/iQC157ccfHH7P3GAccCy53+iAS5DX/348g9VlgXOWvng3LIHZ4DBTbwbWRiYrMWUCjQdRdl54IL3v7xNO7EsXME4RcUK3TdrHl0ApjSS7AACYEo7+OpO8Zl1cLcD83jVhc3AvLHg3snjrx+g+2bNw/NAMkLeKFBWn4mJkUhrXnz7XHFu472vb8+9e2QiLA8MxrYrOx9/ew+Rbb60bY5VtBQnP8Kat+ByzF1SS5pLgHjfSHLwK/EKX/74/A24cNv74taBV3fgsp/+/uy4snuSaQhK3IAyESMZiYgRnGpALDMR+YnGQaffPlry4IwSt3C+hr0gOzd6EqAc8LFyGAvLv/oB8hkPCzuQPaD1zag1o9aMWjMCraFmmbbr2fXua3t+/wM1dy59fOa6Z7IWv9RE02CEb9iZWYHk46/vSTL3+5/fr3+AahAOZpBzrUSVhNl5IK0qkOy/PyHyBigNqJ6rezY8vQysdGW5BImvDj78+gFscHEysWxwSONmYQeK3Pv8JvXEsp///wLZsQpm6WrWKNZ8/fOz/PymC++fkBpQPMzsDXpeFqIKSEF3o+nKdmNBuT6TQGZGJvTmIBDc/PTy1Y/PxLeo2JhYDISkOcABjgx2PLtmIaIowMaJpdU5mm+IBgABBgC8L7XM+d8mWQAAAABJRU5ErkJggg==',
		iconHome: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAZCAIAAABRt/K6AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1OUQyNjQ3OUE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo1OUQyNjQ3QUE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1OUQyNjQ3N0E0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1OUQyNjQ3OEE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PkhAgt0AAAIUSURBVHjaYvz//z8DBYCJgTKAT/+ff/9WPji3/8UtPGpYcEm8/vml/sK2Sx+fAtnur+6VabuwM2NRzIjV/xffP629sOXd729wEWVukTZDX2kuAcL6Vz44O/X24X///xsJyjbqe3349b3y/OYn39/zMLNX67rbiinj1P/tz6+2KzsPvLoDZMcomKaqWjEzMkHEW6/sPAgWj1UwA4ozMTKi63/w5W31hS0Pv73jYmat1fWwFVNBc9eK+2en3QG5y1hQDuguATZOhP59L261X9n5/d8fJW7hNgM/GW4BrIF64d2TmotbP/z+JsbO06LvqyUgAdI/9/ax+fdPAqVdJTTKtV04mFnxRBgwXuoubL388RkLA1ONrgfjl98/3PdNA0oUaTgFyekTk2aA6aLn2p4tz65KcvAz/fr3FyjEy8JGpGZQmmFiSla1AjJ+/v3NAkuGzMgqNj+5cvXDMzRtduIqVqJKhNPfp98/Oq/txhQ/++4xUfr/gH0EBOVarhDG+59fZ9099v3vHxLSvwArp6+MDoT9Fqyf7vl3ROiH5tB/v/7+/0e8tq+/f4ITIjMLHyuHJAff8x+f0k+uUOQWBqdKUDx//fur9fJOiGqYyE+4yGVw6lTnFQXlvysfnpedXf/p70+SXC7FyT/FNBSa/9///Hb+/ZMff35DM+mPL2xMzPzgEgJTBFj28LBymAjJcbKwAgQYABO9+oB7uy0BAAAAAElFTkSuQmCC',
		iconLayout: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAZCAIAAACkSXkKAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1OUQyNjQ3REE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo1OUQyNjQ3RUE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1OUQyNjQ3QkE0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1OUQyNjQ3Q0E0QUUxMUVGQUQzOUUzNDlCRTZDN0ZCQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvVocMoAAAG1SURBVHjaYvz//z8DNQATA5UAC4S68uH53DvHP/3+gSwnwcGTo2kvycEPVvBs7p0T6Ao4eXPV7SU4+YBsRqDX/v7/539g1off3zHt0ReQnmoW9ucfUMHMj39+YCowEJSZYhoKddHn3z+BprAyMU8zDYOrePPzS+WFzQ+/vgcr+AE0BU3Bqx9fqi9ufvTlPcJr/xlA4c3FxKbJLwFX9+7nVzD9H66Am5kdWYEIxxe4AmoG9uAziIUYRRzMrEDyw+9vyceXwgW//vkFkmJhJcEgLha2UDmj1Y/O3fz8Clmc+T9jgqI5CQYBQb6GfYicPjChwEUYGRlE2HmE2blJMwgIpLkEKA0jILj8/umcOyc+I2URoItEOfjyNe0geYgog4BZpOL8JswsAgyyr79/TDYLJdYgSBZhZ2SeahYOF3z98zM8DxFrECSLcLKwa/CLwwWFf3KPoCzCwQRK5h//fE84tgQu8ePvb1C4MLMhZxFkBd/+/oIkeoRBnCyskfLGyx+evfPlNVoOSFQyh6iOkDda8fAcpoJ4JTNosoLXIs9/fPzy6yeyOmDyF4LlAIIKGAdddQQQYABjRsFQXUaKAgAAAABJRU5ErkJggg==',
		sampleLayout: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAo4AAAGFCAIAAAD8Q+XpAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpBOEJCMzJBMEE0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpBOEJCMzJBMUE0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0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J7R2FsK2HIzm+kuKCluZZVMBtNSixPz58zdu3Lh9+/bi4uZFknQ63QsvvOD0AVGqhQKmP61ZqnVavc7AopPPdj96npTJ23o7nPTbO4DcKLclCePArFael+s0s9wR+HPP+UTvtwDTa+YWdTbfWDNRzDFLd8Qs4Qiz4SRJtjKLBWWiRVBQEEj1t99++/vvv9fX1yckJNxyyy2pqc4nXmKSajrYLFVeuToym7FOdsWsnylp6fw8AOexkgyzbTM8nKHMO7Cb7w8E2+7WtUuYxfMsXsjl8pks1Gq107eobcAKcMEk6W6blFtSk2OIk1n3rZnmW2VHQqoDh4C69roZ7luvGiw1DqcWKYxG43PPPZeent6XRVpa2v/93/913ksqLam2UA2St19uCvs8dhgu3vTyIrNE21FbaKmlodYF+fl2M5e5MAnDzhKRgqKou+6667XXXsvPz69jARvLli274YYbanhzFnWILsrORdMBTtaqJNwBbrNfWzdvdItaJKdgCHmXWaYb3A2pmC/epebUmvb+D4EkrKLiMtDqFmbHYv2BKPEDC5VK9cADD4wbN04mkx05cuSjjz7at2/fu++++/zzzzt3WBGXlQUfLw07XRagVedcI5H1HJnILy9nRs26FJWVlRIrKGtYuVqmkCkyMuTDh4voZyckJrn2gIUF+b5mvOpXrpLJGeoVI0YIQa3DwyMhvlzOLLTv4mb2zEliwGDflOrt27fD89KlS5988kluz6233jp58uTp06d///33S5YssVUOSl+q+/7nIIRr4n+PK1TK0j+PlRLNmeMncBs/bd7oqqKSxsaGgIBAr1mgsycV//w7nTaIuulWOr230duwajVQT2/4jFQpZaNHiSgJ425wuGodTK7qO33AQCH/qxU/fiXLPmWZdYs1bZALLuPVQL3c+vlnMpVCPmZUs732tlprtLqAgIDqqipXdRiMHTteAu2YavmL1tSB1Kxbeh/yokNpaSk8T5kyhb8TpLpv377FxcWNjY1wwUhfqhmRVsiTNp0CkVYEByr8lPBSknynpKZRlNUFDVxDPeg0wGtSTZJypYIoyFa8+TJEr+WGm60pzghM46o15vWfKFQKaKlVDPUKeUmeachQEXGq0WorKio0GhesFE7TIqgTBGVVFuYo33kVfi6VOtA0c56T1/CaNZZ164B6UqUICA6A2CfkcrpF21rO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',
		iconShipping: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAAyCAIAAABzgQSfAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpBOEJCMzJBNEE0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpBOEJCMzJBNUE0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBOEJCMzJBMkE0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBOEJCMzJBM0E0QjQxMUVGQUQzOUUzNDlCRTZDN0ZCQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PuKgopEAAATPSURBVHjaYvz//z/DIAZMDIMbjLqPMsCCxv/z58+KFSvXrVt/7dr1jx8/kmGisLCwkZFhVFSEu7s7IyMjhe5jRM4fT548SUhIunr1GlW87uLiPHXqFD4+Xuq4Dxhanp7e9+8/oGLs2NhYL1++lIWFhQrpr6enl7qOA4IjR44CUwsVwu/Hjx+amjpAEiLKysoSERGhqqpCqnH//v07f/7Cxo2b4CJqamoHD+6jNH8ADYU7DghaW1tiY2PINlRUVGTOnHkQ9q1bt96/fy8oKEhR/L548QJZ1M3NjcKcgcx9+fIVpenv169fyKKcnByUuI+VlQ2Z+/fvH6qVf7QAR48ee/z4MZzLzMwiKSmhra1NTOlID/fV1zdiCioqKkyY0GdmZjYA9dvTp08JqgGWZeHhUefOnR8A97GzE5V8gSVGcnLKq1ev6e0+ERFhIlW+ePEyJSXt9+/fA5n+lixZpKamilzcREZGf/nyBcI9ffp0bW19R0fbgLWvJCTEZZGAiYnxlCmTkBUsXLho2bLlg6j95+7uVlxchCxSUVGFNa8MWPu0uLjQzc0VzgUmQax5ZcDcByycgbGsrKyMP68MZPuel5d3wYK5PDw8cBFIXhlE/Q8VFRX8eWXg+0eYeaW6uvb58+eDqP+GlleA9QqwgzaI3AfJK6KionCRBw8eDq7+LzCviIkh3Advj46OH1B3/AArAHaNFy9eevDgwWfPnnFz8+joaIeGhlhaWhBvDbC1t2TJ0lOnTr19+1ZISAjYLI2JiVJSUqKC+3bs2JmfX/Dp02e4yOXLl5cvX+Hj4w1sAHNzcxM0YenSZYsWLfn79y/crWfPnps1a3ZBQT4w5+Jv5ROI3127dicnpyI7Dg62bNkaGxv/+zfhvs/8+QvhjkPqNP3t7e1rbW0nP/19/vy5oKAI2OXGpeD48RNz5syhJHlNnTrtzJmzhOMXrUc4efIUYBsd2OABdq2Ret2ibm4ujx8/OXToMFywt7f/y5evaHGE3FtDBhoa6qampsBK9saNm3DBoqISPz9fIAO58cLKyooyvgHU4+cXiMcffHx8R44chBShra1tU6ZMIzWogM3SdevWsrKy/PnzJzg49NSp03gUV1SU5+fnIuLXyMgI2OHDo0FcXBxevgNrTDKiUl1dDeg4UJSxsGhoaODt3rP4+/uhpD9mZuapU6cAC3Fcer59+wYfiQM21Mhw37dv35HYX/GobGlpVlCQR4lfCHj06NHEiZNPnjz18+dPSLEHzCJw2YiI8MjIcGD6A/a3gcUYvOqUkpLCLCO+f//+6dMnYFTCzQcGQXl5mZWVJTBXdXZ2AaUg4mxsbGJiYmAFTMBwzchIt7AwRx9fwwquXbvu4uKGfwIiMDBg2rQpuGQXLVpcXl6JP1zb21sTEuLJKV+0tDTj4+PwZ5rKynI8CqKiIvX19fAo0NHRiY6OIr98bmpq8PX1wSrFz8+/aNF8YH8RX+nFwrJgwXygP3HlGKAJ8KIEO/hPCADL5xUrVtrY2EtISEOQkpJqfn7h06dP/xMHvn792tPTq6dnADdBV9egq6sH2EUnqJeR+PktYOPg6dNnwDwOLInY2dlJzb9AfwJbnW/fvgG2DxQVFZmYiGo6MY7Ov426b9R9Q9Z9AAEGAFtUZ/IOlPLZAAAAAElFTkSuQmCC',
		sampleUrinal: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAA8AAD/4QQYaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA5LjEtYzAwMiA3OS5iN2M2NGNjZjksIDIwMjQvMDcvMTYtMTI6Mzk6MDQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iTW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgSGVhZGxlc3NDaHJvbWUvMTI5LjAuMC4wIFNhZmFyaS81MzcuMzYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6M0Q5MzQwMDVBNEMzMTFFRkFEMzlFMzQ5QkU2QzdGQkIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6M0Q5MzQwMDZBNEMzMTFFRkFEMzlFMzQ5QkU2QzdGQkIiPiA8ZGM6dGl0bGU+IDxyZGY6QWx0PiA8cmRmOmxpIHhtbDpsYW5nPSJ4LWRlZmF1bHQiPmFib3V0OmJsYW5rPC9yZGY6bGk+IDwvcmRmOkFsdD4gPC9kYzp0aXRsZT4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QThCQjMyQTZBNEI0MTFFRkFEMzlFMzQ5QkU2QzdGQkIiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6M0Q5MzQwMDRBNEMzMTFFRkFEMzlFMzQ5QkU2QzdGQkIiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7/7QBIUGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAA8cAVoAAxslRxwCAAACAAIAOEJJTQQlAAAAAAAQ/OEfici3yXgvNGI0B1h36//uAA5BZG9iZQBkwAAAAAH/2wCEAAYEBAQFBAYFBQYJBgUGCQsIBgYICwwKCgsKCgwQDAwMDAwMEAwODxAPDgwTExQUExMcGxsbHB8fHx8fHx8fHx8BBwcHDQwNGBAQGBoVERUaHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fH//AABEIAZACqAMBEQACEQEDEQH/xACVAAEAAwEBAQEAAAAAAAAAAAAAAgQFAwEGCAEBAQEBAQAAAAAAAAAAAAAAAAMCAQQQAQABAgMFAwgGBggEBwAAAAABAgNRBBQRMZESUiFhBUFxgbITM3M0obHBIjJyQsIjU7M1YpKik6PDdDaCgyQG8NHh0kQVFhEBAQADAQACAwEAAAAAAAAAABEBMQIDQTLwIVES/9oADAMBAAIRAxEAPwD9UgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjcuUW6eaqdkbiDlrcv1Twl2OU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCmty/VPCSFNbl+qeEkKa3L9U8JIU1uX6p4SQprcv1TwkhTW5fqnhJCvYzliZiIntnsjskhXZx0AAAAABXz3uPTDvLmWe2yAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9o/HT54BrptgAAAAAK+fn9jHfVH1S7y5lntsgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPaPx0+eAa6bYAAAAACF+zTetzRV2bd0xviQYmYtXrFyaK5nunyTDdZcuarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQOarGQe81WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgc1WMgv+HZSquYvXNvJH4Ynyzi5nLuMNNl0AAAAAABxzWWpzFrlnsqjtpqwl3GRiXbVdquaK42VQ0yiAAAAABsA2AbANgGwDYBsABwzMVe1y00zPZd7YxibdcdvHa7ztnrStXduz43TRNfLZotbIpjb96quZnt80Uy71j9ucZ/TQZbAAAAAAAAAAAAAAAVs5NdNWXrpntpvU7YxiuJonb/WdxtzrTyqq5V4tFPNst27EzFGNVyuNs+j2bve2fPS0y2AAAAAAAAAAAAAAAo+J1XqJylVq5FExfoiqJj8VNW2mY/tGNudZ/TvXFU+IW/vTy02q/u+TbVVT2/2W+2PN3YUAAAAAAAAAAAAAAAZnjGYvW5sxYriKqKue7T/AEI7/JLuMMddT9Llz56x2zEezuzsx7aIa7Z83dhUABbyOTm9Xz1x+yp3984OZy7jDYiIiNkbmXQAAAAAAAAFfOZSnMW+zsuU/hq+x3GRi1U1U1TTVGyqOyYlpl4AAAAAAAAAAAADldmPa2O+udn93U7ztnvSlmbU152/NM7K4ptTROFVPNMSpnFRsi3ls3bzE1009ldrZF2nCqY27Nvckvh3HQAAAAAAAAAAAAAFbPfgtdm39ta9eHcbc6043L1FvxyiirbtvWYop2YxNdXb6KXe9seel9lQAAAAAAAAAAAAAABk5rNUZmu3Vaq+7bu0UdvXTeiJ2xHb+jGxvnH6qXef3F+r5+n4VXrQdu+buwoAAAAAAAAAAAAAAq5nP2rFc2fxX+Tnot7ubt5XcYuXOszFZ17mi1XXVMzXV96qrb5e77FpMPLjNy1Lnz1n4V31rafa3m7sKgO+Uytd+5s3UR+KpzORt0U00UxTTGymOyIZaegAAAAAAAAAAq53L2q5pqqp+9u2w7hzKrpLGE8XXDSWMJ4gaSxhPEDSWMJ4gaSxhPEDSWMJ4gaOxhPEDR2cJ4gaOzhPEDR2cJ4gaOzhPEDR2cJ4gaOzhPEFPxHL27deUqp27fbTH+Fca52z3pnV/PX/AMtH2q/KGdLvhOVs11ZmuadlVVdMVVR2TMxTG+e6Eu9reel+cpZiN08WW3mms4fSBprOH0gaazh9IJaSxhPEDSWMJ4gaSxhPEDSWMJ4gaOzhPEDR2cJ4gaOzhPEDR2cJ4gaOzhPEDR2cJ4gaOzhPEFPxTK2qbFuad8XrW/8APDvO3OtKdqzau+O089MTy2YmmfLE7a47Gu2PNrzlLMRuniwo801nD6QNNZw+kDTWcPpBLSWMJ4gaSxhPEDSWMJ4gaSxhPEDR2cJ4gaOzhPEDR2cJ4gaOzhPEDR2cJ4gaOzhPEDR2cJ4gaOzhPEHzObt0Wr9dNERRTGYicI97GC2Pq8/X3a1m3TXn/veS1Oz+tDPanku6a1h9LCpprWH0gaa1h9IJaSzhPFwe6SzhPEDSWcJ4gaSzhPEHmks4TxA0lnCeIGjs9/EDR2e/iBo7PfxA0dnv4gaOz38QNJZ7+IMbxfL2qM9TVTT972URzeXZzVK+aHt8KGYnZZqnds8sN9aR5227Nqi5nrfN5LVzZ/WoT7X8l3SWcJ4prGks9/EGjl6KKLNNNEbI2fSzl10AAAAAAAAAAABxzO6n0u4cy4OgAAAAAAAAAAACj4p/8X40/wAKt3jbHemRVO3P5iMItx9EytjaGdNTwX3WY+N/l0Jd7W89L9W5lREAAHQAAAAAAAAAAFLxWZjL0bP3tv1neds9aUcr/Pf+RT61bXbHm2atzCqIAAOgAAAAAAAAAAAPlPEPmbk7dmzMR2zt/exgtj6vN19/z+NfK/zCfgz68MdqeS+wqAAnG4HoAAAAAAAAAAMPxv5yn4cetUr5oe/wy838tc83/jc31pHnbfyvz9HwrnrUJ+i/k0U1gFuz7unzMupgAAAAAAAAAAA45ndT6XcOZcHQAAAAAAAAAAABS8Tp26aem7t/w64+1rjbHemNP8wzPmt+qpjaGdYavgvusx8b/LoT72t56X6tzKiIAAOgAAAAAAAAAAKXiszGXo2fvbfrO87Z60oZSY/+/wBnljL0+tW12x5tqrcwqiAADoAAAAAAAAAAAD5TxD5m5O3ZszETtnb+9jBbH1ebr7/n8a+V/mE/Bn14Y7U82gwq8ABONwPQAAAAAAAAAAYfjfzlPw49apXzQ9/hl5qnmy12P6M9m/dDfWkedt/K/P0fCuetQn6L+TRTWAW7Pu6fMy6mAAAAAAAAAAADjmd1Ppdw5lwdAAAAAAAAAAAAFHxOrZpo2fivbP8ACrn7GuNsd6ZM/OZjz0+rCuEMtPwX3WY+N/l0Jd7W89L9W5lREACN4OgAAAAAAAAAAKXis7MvR8W3u/M7ztnrTOyn+4qv9NR61xrtjzblW5hVEAAHQAAAAAAAAAAAHyniHzNyduzZmInbO397GC2Pq83X3/P418r/ADCfgz68MdqebQYVAASjcD0AAAAAAAAAAGJ45GzN25xtzE+ir/1U80Pf4ZWZ+Wvdm37lXZj2K50jzvDcsTMeI2O+i5t/spei/k1E1gFuz7unzMupgAAAAAAAAAAA4Zn9H0/Y7hzLi6AAAAAAAAAAAAKHisTtyndenb/dXGuNsd6ZU/OZjz0+rCuEMtPwaJ9lmO+72f3dCXe1vPS/VuZURAAjeDoAAAAAAAAAACl4rOzL0fFt7vzO87Z60zsp/uKr/TUetca7Y825VuYVRAAB0AAAAAAAAAAAB8p4h8zcnbs2ZiJ2zt/exgtj6vN19/z+NfK/zCfgz60MdqebQYVAATjcAAAAAAAAAAADE8d+as/kq+uFPND2+GVmomcreiO2Zoq+qVc6R53ht2f5jY/Jc/VS9F/JqprALdn3VLOXUwAAAAAAAAAAAcMz+j6fsdw5lxdAAAAAAAAAAAAFDxWJ25TuvTt/urjXG2O9MiJnW5vuqo/h0q4Q6+Gt4P7m98X9SlLva3npeq3MqIgARvB0AAAAAAAAAABS8V+Xo+Lb7v0neds9aZ+Sjb/3Hc2+TKUzHn9pVH2td7Y823VuYVRAAB0AAAAAAAAAAAB8p4h8zcnbs2ZiJ2zt/fRgtz9Xm6+7Xyv8wn4M+tDHanm0GFQAE43A9B4AAAAAAAAADE8d+as/kq+uFPND2+GVm4mcpeiN/s6vqlTrSPO8N6xEa2zPdX2+iE+1/LbSTWAW7PuqWcupgAAAAAAAAAAA4ZnfT6XcOZcXQAAAAAAAAAAABS8TiNmW7rvZ/d1tcbY9NMaInW5ufJz0x/h0q4Q6+Gt4P7m98X9SlLva3npeq3MqIgARvB0AAAAAAAAAABS8V+Xo+Lb7v0neds9aUclEf/oK58ukj+JLXbHm2atzCqIAAOgAAAAAAAAAAAPlPEPmbk7dmzMRO2dv76MFufq83X3a+V/mE/Bn1oY7U82gwqAAnG4HoAPAAAAAAAAAYnjvzVn8lX1wp5oe3wyc58nf7dn7Ovt/4ZU60jzvDey3zdn8tX1Qn2v5baaawC3Z91Szl1MAAAAAAAAAAAHDM76XcOZcXQAAAAAAAAAAABn+Ke9yn56vUlrjbHpplx81mviR/CoVwhlqeD+5vfF/UpS72t56XqtzKiIAEbwdAAAAAAAAAAAZ/jHusv8AHo7sXeds9aVcl/uCv/SR/Ea7Y82xVuYVRAAB0AAAAAAAAAAAB8p4ht1NzZ5MxTPl/fRgtz9Xm6+7Xyv8wn4M+tDHanm0GFQAE43QD0AAAHgAAAAAAMTx35qz+Sr64U80Pb4ZWb+Uvb/d1buyd0q50jzvDdy8xGbsRPliqI4bUvRfy2001gFuz7qlnLqYAAAAAAAAAAAOGZ30u4cy4ugAAAAAAAAAAADP8T2e1yv56tn9SWuNsemmVExqs38Sn+FQrhDLV8HjZZvd939SlLva/nperZbRAAjfAOgAAAAAAAAAAM/xj3Vjs2/t6Ozi7ztnrSrkv9wV/wCkj+I12x5tircwqiAADoAAAAAAAAAAAD5XP/M3fL+33f8AMW5+rzdfdr5Wn/rebG1VGzzVU/8Amz6Kea+mqAAnG6AegAAAA8AAAAABi+PRszOXnqorjZ+Waf8A3KeaPtrDKzUzGVvTG/kq+qVc6Q522bXzuV/4/UlL0X8ttZNYBbse6p9P1s5dTAAAAAAAAAAABXzP4o8zuHMuToAAAAAAAAAAAAp+IWoqpt3ZnZ7GqapjftiYmn7WuNsemmHNXJnr238GZqiq3V/SiiKaqeFG2PSrrKGf3hs+Ee5u/E/VpR72v56Xa3G0QAI3wDoAAAAAAAAAACl4rsixRcn8Nu5TM+n7v11O87Y70z/D7lNX/cFezdpOyfNc7fra9GfNt1bmFUQAAdAAAAAAAAAAAAfKZ+r/AK6bcRtqrvzOz+jTXzVT9C3Onm7+2ctvJUxXXN6meymmaNmzfNUxP0bGfRTyXE1QAE43QD0AAAAAAHgAAAMbx/3+V/Ld+uhTz2j7aYuarruROVsxzXLkbKp/Ropns2z9kKZz8I84+cvoslbpu3qLvbstROzs7JmY2J+i3k0U1gFux7qn0/Wzl1MAAAAAAAAAAAFfM/ijzO4cy5OgAAAAAAAAAAADyYiY2TuBheKZCKdtETMUVdtuuN9NXk2d8LYz/rDzdc/5yveC03oylVV6jkqrrmYiJiYmIiKdsbMdiXW1uNL1bjaIAEb4B0AAAAAAAAAABW8Qt1V5K7FMbaojmiMeWebZ9DuNs9aZXhdiufFovxH3Iy9duqrCZrommPTslv0S8c7blW5NdEAAHQAAAAAAAAAAAHzNzL3o8UzNVdOz7802o37Yqnm2x59scFuNPN67fQZezFnL00eWO2qe+Uus3K/PMwk40AAnG6AegAAAAAAA8AABif8AcdN+bmV9jT2zFyma53U7eSdvfu7G+EvXSHhfhUTHli3t211zvqny9rfXUT44/wBNyiimimKaY2UxuhF6cYiQALdj3VPp+tnLqYAAAAAAAAAAAK+Z/FHmdw5lydAAAAAAAAAAAAAEa6KK42V0xVGExtK5nFe0000xFNMRERuiOyAjysdRAAjfAOgAAAAAAAAAAPARotWqNvJRTTt37IiPqM5cxjGHtW4dRAAB0AAAAAAAAAAABCbVqa+eaKZr6tkbeJXJhKrcOoAAAnG6AegAAAAAAAAA8BGu3br2c9MVbN22In6zGXM4xl7TTTTERTEREbojsgdegAAt2PdU+n62cupgAAAAAAAAAAAr5n8ceZ3DmXJ0AAAAAAAAAAAAAAARr8gIgARvgHQAAAAAAAAAAAAEatwIgAA6AAAAAAAAAAAAA8q3AgAACcboB6AAAAAAAAAADwAAAAFrL+6j0uZddHAAAAAAAAAAABXzP448zuHMuToAAAAAAAAAAAAAAAjX5ARAAjfAOgAAAAAAAAAAAAI1bgRAAB0AAAAAAAAAAAAB5VuBAAAE43QD0AAAAAAAAAAAAHgAALWX91Hpcy66OAAAAAAAAAAACvmfxx5ncOZcnQAAAAAAAAAAAAAABGvyAiABG+AdAAAAAAAAAAAAARq3AiAADoAAAAAAAAAAAADyrcCAAAJxugHoAAAAAAAAAAAAAPAAWsv7qPS5l10cAAAAAAAAAAAFfM+8jzO4cy5OgAAAAAAAAAAAAAACNYIgARvgHQAAAAAAAAAAAAEatwIgAA6AAAAAAAAAAAAA8q3AgAACcboB6AAAAAAAAAAAAAADwFqx7uPSzl10AAAAAAAAAAABxvWqq6omMNjriGnudxSGnudxSGnudxSGnudxSGnudxSGnudxSGnudxSGnudxSGnudxSGnudxSHsLmBQ9hcwKHsLmBQ9hcwKHsLmBQ9hcwKI1Ze7PkjiUjzTXcI4lIaW7hHEpHsZa7t8nEpEtPc7ikNPc7ikNPc7ikNPc7ikNPc7ikNPc7ikNPc7ikNPc7ih7C5gUPYXMCh7C5gUPYXMCh7C5gUeVZe7MbvpKRHTXcI4lIaW7hHEpDS3e7iUienudxSGnudxSGnudxSGnudxSGnudxSGnudxSGnudxSGnudxSHsLmBQ9hcwKHsLmBQ9hcwKHsLmBR5OXuzG4pEdNdwjiUhpruEcSkNLd7uJSJxl7mzyFIae53FIae53FIae53FIae53FIae53FIae53FIae53FIewuYFD2FzAoewuYFD2FzAoewuYFD2FzAoewuYFD2FzAoae5gUdrVM00bJ3uOpgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//Z',
		iconHandShake: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAA8AAD/4QQYaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA5LjEtYzAwMiA3OS5iN2M2NGNjZjksIDIwMjQvMDcvMTYtMTI6Mzk6MDQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iTW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgSGVhZGxlc3NDaHJvbWUvMTI5LjAuMC4wIFNhZmFyaS81MzcuMzYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6M0Q5MzQwMDlBNEMzMTFFRkFEMzlFMzQ5QkU2QzdGQkIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6M0Q5MzQwMEFBNEMzMTFFRkFEMzlFMzQ5QkU2QzdGQkIiPiA8ZGM6dGl0bGU+IDxyZGY6QWx0PiA8cmRmOmxpIHhtbDpsYW5nPSJ4LWRlZmF1bHQiPmFib3V0OmJsYW5rPC9yZGY6bGk+IDwvcmRmOkFsdD4gPC9kYzp0aXRsZT4gPHhtcE1N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',
		teamMemberSample: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAACUCAYAAAB1PADUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBIZWFkbGVzc0Nocm9tZS8xMjkuMC4wLjAgU2FmYXJpLzUzNy4zNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozRDkzNDAwREE0QzMxMUVGQUQzOUUzNDlCRTZDN0ZCQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDozRDkzNDAwRUE0QzMxMUVGQUQzOUUzNDlCRTZDN0ZCQiI+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+YWJvdXQ6Ymxhbms8L3JkZjpsaT4gPC9yZGY6QWx0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'
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
            "product_id": 111,
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
async formatRoomData (rooms){
  // Create the header row
  const headerRow = rooms.map((room, index) => ({
    text: `Room ${index + 1}:`,
    style: 'roomHdr',
  }));

  // Create the body row
  const bodyRow = rooms.map((room) => ({
    text: room.full_type_name, // Replace 'location' with the actual property for the description
    style: 'roomBdy',
  }));

  return {
    body: [[...headerRow,{},{}], [...bodyRow,{},{}]],
  };
};








}

module.exports = FrontendController;
