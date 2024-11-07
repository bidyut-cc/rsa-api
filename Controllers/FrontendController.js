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

class FrontendController {
  constructor() {
    // Bind the method to ensure correct context
    this.quotationCreate = this.quotationCreate.bind(this);
    this.generatePaymentLink = this.generatePaymentLink.bind(this);
    this.updatePaymentResponse = this.updatePaymentResponse.bind(this);
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
                                  <p style="margin-top: 0px;"><span style="color:#000; font-weight: 500;">Privacy Screen 1 </span>- 24in Supported , Post</p>
                                  
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

      let quotation = new Quotation;
      quotation.quotation_no = Date.now();
      quotation.first_name = req.body.first_name;
      quotation.last_name = req.body.last_name;
      quotation.email = req.body.email;
      quotation.phone_number = req.body.phone_number;
      quotation.submittedData = req.body;
      quotation.roomData = results;
      quotation.materials = materials;
      await quotation.save();
 
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
                                                  <a href="${process.env.QUOTATION_PAYMENT_URL}?id=${quotation._id}&material_id=${material.id}&color=Blue" style="text-decoration: none; color:#000; padding: 8px 10px; border:1px solid #cbd5e1; border-radius: 10px; width: 96%; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px;"><img src="${process.env.URI}/uploads/images/cart.png" alt="pc" style="width:20px; margin-right: 5px;"/> Buy Now</a>
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
                                      <p style="margin-top: 0px;"><span style="color:#000; font-weight: 500;">Privacy Screen 1 </span>- 24in Supported , Post</p>
                                      
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

    //   const pdfBuffer = await this.generatePDF(htmlContent); // Ensure this is called correctly
    //   if (!pdfBuffer || pdfBuffer.length === 0) {
    //     console.error("Generated PDF buffer is empty or undefined.");
    //     return res
    //       .status(500)
    //       .json({ status: false, message: "Failed to generate PDF." });
    //   }

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
  
      res.status(200).json({
        status: true,
        data: {
          id:quotation._id,
          submittedData: req.body,
          roomData: results,
          materials,
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
            "name": "calendar"
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


}

module.exports = FrontendController;
