const Controller = require("./Controller.js");
const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');

class QuotationsController extends Controller {
    constructor() {
        super("Quotation");
    }



    async generateQuotationPDF(req,res){
        try {
            const {id,quotation_no,submittedData,roomData,materials} = req.body
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                  '--no-sandbox', // Disable sandboxing
                  '--disable-setuid-sandbox',
                  '--disable-dev-shm-usage', // Overcome limited resource problems
                ],
              });
              const page = await browser.newPage();
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
                                <h4 style="border:4px solid #cbd5e1; padding: 5px 15px; background: #fff; display: inline-block; border-radius: 15px; color:#0061a5; font-size: 20px;">JOB NUMBER #${quotation_no}</h4>
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
                                          ${roomData.map(room_data => `
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
                                                        <a href="${process.env.QUOTATION_PDF_LINK_URL}?id=${id}" style="text-decoration: none; color:#000; padding: 14px 20px; border:1px solid #cbd5e1; border-radius: 10px; width: 80%; display: block; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px;"><img src="${process.env.URI}/uploads/images/videoicon1.png" alt="pc" style="width:20px; margin-right: 5px;"/> Videos</a>
                                                    </div>
                                                    <div  style="text-align: right; width: 50%;">
                                                        <a href="${process.env.QUOTATION_PDF_LINK_URL}?id=${id}" style="text-decoration: none; color:#000; padding: 14px 20px; border:1px solid #cbd5e1; border-radius: 10px; width: 80%; display: block; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px; margin-left: auto;"><img src="${process.env.URI}/uploads/images/color.png" alt="pc" style="width:20px; margin-right: 5px;"/> Colours</a>
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
        ${submittedData.rooms.map((room, index) => `
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
                                <h4 style="border:4px solid #cbd5e1; padding: 5px 15px; background: #fff; display: inline-block; border-radius: 15px; color:#0061a5; font-size: 20px;">JOB NUMBER #${quotation_no}</h4>
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
                              <h4 style="border:4px solid #cbd5e1; padding: 5px 15px; background: #fff; display: inline-block; border-radius: 15px; color:#0061a5; font-size: 20px;">JOB NUMBER #${quotation_no}</h4>
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
          res.status(200).json({
            status: true,
            htmlContent:htmlContent
          });
          return;
          } catch (error) {
            res.status(500).json({
              status: false,
              message:'An error occurred while generating the PDF.'
            });
          }
          return;
    }
}

module.exports = QuotationsController;
