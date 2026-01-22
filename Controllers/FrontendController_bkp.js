const Setting = require("../Models/Setting.js");

const { Validator } = require("node-input-validator");
const email_helper = require("../Helpers/Sendmail.js");
const puppeteer = require("puppeteer");
const moment = require('moment');
const MasterSettingsController = require('./MasterSettingsController.js');
const Quotation = require("../Models/Quotation.js");
const mongoose = require('mongoose');
const { default: axios } = require("axios");
const Order = require("../Models/Order.js");
const Emailtemplate = require('../Models/Emailtemplate.js');
const BigcommerceOrderResponse = require("../Models/BigcommerceOrderResponse.js");
const fs = require('fs');
const path = require('path');
const Color = require("../Models/Color.js");
const MasterSetting = require("../Models/MasterSetting.js");
const agenda = require('../config/agendaConfig.js'); // Import the Agenda instance
const abandonedOrder = require("../Models/AbandonedOrder.js");
const Bid = require("../Models/Bid.js");

class FrontendController {
  
/**
 * Constructor for the class.
 *
 * @description
 * The constructor binds class methods to the class instance to ensure they maintain the correct context when called.
 * - `quotationCreate` is bound to the class instance.
 * - `generatePaymentLink` is bound to the class instance.
 * - `updatePaymentResponse` is bound to the class instance.
 * - `order` is bound to the class instance.
 */
  constructor() {
    // Bind the method to ensure correct context
    this.quotationCreate = this.quotationCreate.bind(this);
    this.generatePaymentLink = this.generatePaymentLink.bind(this);
    this.updatePaymentResponse = this.updatePaymentResponse.bind(this);
    this.order = this.order.bind(this);
    this.downloadPDF = this.downloadPDF.bind(this);
    this.checkZipCode = this.checkZipCode.bind(this);
    this.syncToMonday = this.syncToMonday.bind(this);
    
  }

/**
 * Retrieves configuration data based on the provided step.
 *
 * @param {object} req - The HTTP request object containing query parameters.
 * @param {object} req.query - The query parameters from the request.
 * @param {string} req.query.step - The step to retrieve data for. Must be one of: 'project', 'layout', 'measurement', 'color', 'quotation_builder'.
 * @param {object} res - The HTTP response object used to send the JSON response.
 * @returns {object} JSON response with the status and data or errors.
 *
 * @description
 * - Validates the `step` query parameter to ensure it is required and within allowed values.
 * - If validation fails, responds with a 422 status and validation errors.
 * - If validation passes, fetches the configuration data for the specified step from the database.
 * - Responds with the data on success or a 500 status with an error message on failure.
 */

  async view(req, res) {
    // Validate the input data
    const v = new Validator(req.query, {
      step: "required|in:project,layout,measurement,color,quotation_builder",
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

/**
 * Retrieves configuration data for multiple steps.
 *
 * @param {object} req - The HTTP request object containing the request body.
 * @param {object} req.body - The body of the request.
 * @param {string[]} req.body.step - An array of steps to retrieve data for. 
 *                                    Each step must be one of: 'project', 'layout', 'measurement', 'color', 'quotation_builder'.
 * @param {object} res - The HTTP response object used to send the JSON response.
 * @returns {object} JSON response with the status and data or validation errors.
 *
 * @description
 * - Validates the `step` array to ensure it is provided, contains at least one element, and all elements are valid step values.
 * - If validation fails, responds with a 422 status and custom validation error messages.
 * - If validation passes, retrieves configuration data for all provided steps from the database using MongoDB's `$in` operator.
 * - Responds with the retrieved data on success or a 500 status with an error message on failure.
 */

  async config(req, res) {
    // Validate the input data
    const v = new Validator(req.body, {
      step: "required|array|minLength:1",  // Ensure step is an array with at least 1 element
      "step.*": "in:project,layout,measurement,color,quotation_builder",  // Validate each element in the array
    },{
        "step.*.in": "Each step must be one of the following: project, layout, measurement, color or quotation_builder.",  // Custom message for invalid step values
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

/**
 * Handles the creation of a new quotation.
 *
 * @param {object} req - The HTTP request object containing the request body.
 * @param {object} req.body - The body of the request.
 * @param {string} req.body.first_name - The first name of the user creating the quotation. (Required)
 * @param {string} req.body.last_name - The last name of the user creating the quotation. (Required)
 * @param {string} req.body.email - The email address of the user creating the quotation. (Required)
 * @param {string} req.body.phone_number - The phone number of the user creating the quotation. (Required)
 * @param {object[]} req.body.rooms - An array of room details required for the quotation. (Required)
 * @param {object} res - The HTTP response object used to send the JSON response.
 * @returns {object} JSON response with validation errors or a status indicating success or failure.
 *
 * @description
 * - Validates the request body to ensure all required fields (`first_name`, `last_name`, `email`, `phone_number`, and `rooms`) are present.
 * - Ensures `rooms` is an array.
 * - Responds with a 422 status and validation errors if the input data is invalid.
 * - If validation passes, the function logic proceeds to handle the creation of the quotation (not shown in this snippet).
 */

  async quotationCreate(req, res) {
    const v = new Validator(req.body, {
    //  project_name: "required",
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
        //  price: priceByProductAndRoom[productName].totalPrice.toFixed(2), // total aggregated price
          price: Math.round(priceByProductAndRoom[productName].totalPrice),
          src: matchingMaterial ? matchingMaterial.src : null,
          warranty: matchingMaterial ? matchingMaterial.warranty : null,
          price_details: priceByProductAndRoom[productName].rooms, // detailed price per room
        };
      });
      const calculateInstallationPayload = {
        is_within_max_distance:req.body.is_within_max_distance,
        distance:req.body.distance,
        submittedData:req.body


      }
      let zendesk_ticket_id = '';
      let quotation = new Quotation;
      quotation.quotation_no = Date.now();
      quotation.project_name = req.body.project_name;
      quotation.first_name = req.body.first_name;
      quotation.last_name = req.body.last_name;
      quotation.email = req.body.email;
      quotation.phone_number = req.body.phone_number;
      quotation.submittedData = req.body;
      quotation.roomData = results;
      quotation.materials = materials;
      quotation.zendesk_ticket_id = zendesk_ticket_id;
      quotation.zip_code = req.body.zip_code;
      quotation.distance = req.body.distance;
      quotation.installation_price = await this.calculateInstallationPrice(calculateInstallationPayload);
      quotation.is_within_max_distance = req.body.is_within_max_distance;
      quotation.is_mail_send = false;
      quotation.is_deal_create = false;
      quotation.is_zendesk_deal_create = false;
      quotation.is_hubspot_deal_create = false;

     if (!req.body.hasOwnProperty("isTest") || !req.body.isTest) {
        // Check ENABLE_ZENDESK
          // if (process.env.ENABLE_ZENDESK === "true") {
          //   await agenda.schedule("in 5 seconds", "create_zendesk_lead", {
          //     quotationId: quotation._id,
          //   });
          // }

          // Check ENABLE_HUBSPOT
          if (process.env.ENABLE_HUBSPOT === "true") {
            await agenda.schedule("in 5 seconds", "create_hubspot_lead", {
              quotationId: quotation._id,
            });
          }
     }

      // **Schedule email sending via Agenda**
      await agenda.schedule("in 10 seconds", "send_quotation_email", {
        quotationId: quotation._id,
      });
      await quotation.save();
  
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

/**
 * Generates a PDF from the given HTML content using Puppeteer.
 *
 * @param {string} htmlContent - The HTML content to be rendered as a PDF.
 * @returns {Promise<Buffer>} A promise that resolves to a buffer containing the generated PDF.
 *
 * @description
 * - Launches a headless Chromium browser instance with specific configurations:
 *   - `--no-sandbox` and `--disable-setuid-sandbox` for security settings.
 *   - `--disable-dev-shm-usage` to handle resource limitations.
 * - Opens a new page and sets the provided HTML content to it.
 * - Waits until the network is idle (`networkidle0`) before generating the PDF.
 * - Generates a PDF in A4 format and returns it as a buffer.
 * - Ensures the browser is closed after PDF generation.
 */

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
        // Inject the trimImage function into the browser context
        await page.evaluate(() => {
          window.trimImage = function trimImage(imageElement) {
              const image = new Image();
              image.crossOrigin = "anonymous";
              image.src = imageElement.src;
  
              image.onload = () => {
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
  
                  canvas.width = image.width;
                  canvas.height = image.height;
                  ctx.drawImage(image, 0, 0);
  
                  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  let top = 0, left = 0, right = canvas.width, bottom = canvas.height;
  
                  while (top < bottom && isRowWhite(imgData, top)) top++;
                  while (bottom > top && isRowWhite(imgData, bottom - 1)) bottom--;
                  while (left < right && isColumnWhite(imgData, left)) left++;
                  while (right > left && isColumnWhite(imgData, right - 1)) right--;
  
                  const newWidth = right - left;
                  const newHeight = bottom - top;
  
                  const trimmedCanvas = document.createElement("canvas");
                  trimmedCanvas.width = newWidth;
                  trimmedCanvas.height = newHeight;
                  const trimmedCtx = trimmedCanvas.getContext("2d");
                  trimmedCtx.drawImage(canvas, left, top, newWidth, newHeight, 0, 0, newWidth, newHeight);
  
                  imageElement.src = trimmedCanvas.toDataURL();
              };
  
              function isRowWhite(imgData, y) {
                  for (let x = 0; x < imgData.width; x++) {
                      const i = (y * imgData.width + x) * 4;
                      if (!isWhite(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2], imgData.data[i + 3])) return false;
                  }
                  return true;
              }
  
              function isColumnWhite(imgData, x) {
                  for (let y = 0; y < imgData.height; y++) {
                      const i = (y * imgData.width + x) * 4;
                      if (!isWhite(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2], imgData.data[i + 3])) return false;
                  }
                  return true;
              }
  
              function isWhite(r, g, b, a) {
                  return (r > 250 && g > 250 && b > 250) || a === 0;
              }
          };
      });
  
      // Run trimImage on all images with class "roomImage"
      await page.evaluate(() => {
          const images = document.querySelectorAll(".roomImage");
          images.forEach(imageElement => {
              window.trimImage(imageElement);
          });
      });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      displayHeaderFooter: true,
      headerTemplate: '<div></div>', // Empty header
      footerTemplate: `
          <div style="width: 100%; font-size: 10px; text-align: center; padding: 5px 0;">
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
      `,
      margin: {
          top: "20px",
          bottom: "40px", // Space for footer
      },
  });
    
    await browser.close();
    return pdfBuffer
  }

/**
 * Retrieves a specific quotation by its ID.
 *
 * @param {object} req - The HTTP request object containing the query parameters.
 * @param {object} req.query - The query parameters of the request.
 * @param {string} req.query.id - The ID of the quotation to retrieve. (Required)
 * @param {object} res - The HTTP response object used to send the JSON response.
 * @returns {object} JSON response containing the quotation data or validation errors.
 *
 * @description
 * - Validates the `id` query parameter to ensure it is provided.
 * - Checks if the `id` is a valid MongoDB ObjectId.
 * - Responds with a 422 status and validation error if the input data is invalid or the ID format is incorrect.
 * - If validation passes, attempts to retrieve the quotation from the database by its ID.
 * - Retrieves specific fields: `submittedData`, `roomData`, and `materials`.
 * - Responds with the retrieved data on success or a 500 status with an error message on failure.
 */

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
          { installation_price:1,is_within_max_distance:1,zip_code:1,submittedData: 1, roomData: 1, materials:1, _id: 1 }
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
  
/**
 * Generates a payment link for a specific quotation and material.
 *
 * @param {object} req - The HTTP request object containing the request body.
 * @param {object} req.body - The body parameters of the request.
 * @param {string} req.body.id - The ID of the quotation. (Required)
 * @param {number} req.body.material_id - The ID of the material associated with the quotation. (Required)
 * @param {Array<string>} req.body.colors - The array of selected colors. (Required)
 * @param {object} res - The HTTP response object used to send the JSON response.
 * @returns {object} JSON response containing the payment link or validation errors.
 *
 * @description
 * - Validates the request body to ensure required parameters (`id`, `material_id`, and `colors`) are provided and correctly formatted.
 * - Checks if the `id` is a valid MongoDB ObjectId.
 * - Searches for the specified quotation and verifies the existence of the provided material ID.
 * - Responds with a 404 status if no matching quotation or material is found.
 * - Calls `createBigCommerceCart` to generate a cart in BigCommerce for the selected material.
 * - On success:
 *   - Creates an order record in the database with details like `quotation_id`, `material_id`, `cart_id`, customer information, and the selected colors.
 *   - Responds with a 200 status containing the order ID and the BigCommerce checkout URL.
 * - Handles errors:
 *   - Responds with a 422 status for validation issues or invalid MongoDB ObjectId.
 *   - Responds with a 500 status if an error occurs during the process or BigCommerce cart creation fails.
 */

  // async generatePaymentLink(req, res) {
  //   // Validate the input data
  //   const v = new Validator(req.body, {
  //     id: "required",
  //     material_id: "required|integer",
  //    // colors: "required|array",
  //   });

  //   // Check if validation passes
  //   const matched = await v.check();
  //   if (!matched) {
  //     // If validation fails, respond with a 422 status and the validation errors
  //     res.status(422).json({
  //       status: false,
  //       errors: v.errors,
  //     });
  //   } else {
  //     const { id, material_id, colors } = req.body;
  //     if (!mongoose.Types.ObjectId.isValid(id)) {
  //       res.status(422).json({
  //        status: false,
  //        errors:{
  //          'id':{
  //              message: "Invalid MongoDB ObjectId",
  //          }
  //      }
  //      });
  //      return
  //    }

  //     try {

  //       // 🔹 Check if an order with status "Completed" (status_id: 11) exists
  //       const completedOrder = await Order.findOne({
  //         quotation_id: id,
  //         payment_status: "Captured", // Ensure this matches your DB status field
  //       });

  //       if (completedOrder) {
  //         return res.status(404).json({
  //           status: false,
  //           message: "An order for this quotation has already been completed.",
  //         });
  //       }


  //       const oneMinuteAgo = new Date(Date.now() - 30 * 1000); // 30 seconds ago

  //       const existingOrder = await Order.findOne({
  //         quotation_id: id,
  //         createdAt: { $gt: oneMinuteAgo },
  //       });
    
  //       if (existingOrder) {
  //         return res.status(404).json({
  //           status: false,
  //           message: "Another request is already being processed. Please try again in a minute.",
  //         });
  //       }
  //       const data = await Quotation.findOne(
  //           { _id: id, materials: { $elemMatch: { id: Number(material_id) } } },
  //           { "materials.$": 1, _id: 1,quotation_no:1,first_name:1,last_name:1,email:1,phone_number:1,submittedData:1,is_within_max_distance:1,distance:1,zip_code:1,installation_price:1 } // Return only the matched material
  //         );
      
  //         if (!data) {
  //            res.status(404).json({
  //             status: false,
  //             message: 'Quotation or material not found with provided ID',
  //           });
  //           return;
  //         }
  //         // Save order before calling the cart API
  //   let order = new Order({
  //     quotation_id: id,
  //     material_id,
  //     cart_id: null, // Cart ID will be updated later
  //     order_id: null,
  //     first_name: data.first_name,
  //     last_name: data.last_name,
  //     email: data.email,
  //     phone_number: data.phone_number,
  //     colors,
  //     amount: 0.00, // Amount will be updated after the API call
  //   });

  //   const savedOrder = await order.save();
  //   let additional_product = {}
  //   if (typeof data.is_within_max_distance !== 'undefined' && data.is_within_max_distance === true) {
  //       additional_product.variantId= `gid://shopify/ProductVariant/${process.env.SHOPIFY_CUSTOM_PRODUCT_ID}`,
  //       additional_product.quantity= 1,
  //       additional_product.priceOverride= {
  //         amount: data.installation_price,
  //         currencyCode: process.env.SHOPIFY_CURRENCY_CODE
  //       },
  //       additional_product.customAttributes= [
  //           { key: "Zip", value: data?.zip_code },
  //       ]
  //   }
  //   const totalStalls = data?.submittedData?.rooms?.reduce((sum, room) => sum + (room.stall?.noOfStalls || 0), 0);

  //   const totalUrinalScreens = data?.submittedData?.rooms?.reduce((sum, room) => {
  //       return sum + (room.hasUrinalScreens ? (room.urinalScreen?.noOfUrinalScreens || 0) : 0);
  //   }, 0);
    
  //    const shopifyCart = await this.createShopifyCart(data.materials[0],additional_product,data.quotation_no,totalStalls,totalUrinalScreens,savedOrder._id);

  //    if(shopifyCart.status){
  //       // Update the saved order with cart_id and amount
  //       await Order.findByIdAndUpdate(savedOrder._id, {
  //         cart_id: shopifyCart.data.id,
  //         amount: Number(shopifyCart?.data?.totalPriceSet?.shopMoney?.amount)-250,
  //         shipping_amount:250,
  //         tax_amount:0,
  //         total_amount:Number(shopifyCart?.data?.totalPriceSet?.shopMoney?.amount)
  //       });
  //       res.status(200).json({
  //           status: true,
  //           id:order._id,
  //           checkoutUrl:shopifyCart.data?.invoiceUrl
  //         });
  //         return;
  //   }else{
  //       res.status(500).json({
  //           status: false,
  //           message: shopifyCart.message,
  //         });
  //         return; 
  //   }
       
        
  //     } catch (error) {
  //       res.status(500).json({
  //         status: false,
  //         message: error.message,
  //       });
  //       return;
  //     }
  //   }
  // }


  async generatePaymentLink(req, res) {
    // Validate the input data
    const v = new Validator(req.body, {
      id: "required",
      material_id: "required|integer",
     // colors: "required|array",
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

        // 🔹 Check if an order with status "Completed" (status_id: 11) exists
        const completedOrder = await Order.findOne({
          quotation_id: id,
          payment_status: "Captured", // Ensure this matches your DB status field
        });

        if (completedOrder) {
          return res.status(404).json({
            status: false,
            message: "An order for this quotation has already been completed.",
          });
        }


        const oneMinuteAgo = new Date(Date.now() - 30 * 1000); // 30 seconds ago

        const existingOrder = await Order.findOne({
          quotation_id: id,
          createdAt: { $gt: oneMinuteAgo },
        });
    
        if (existingOrder) {
          return res.status(404).json({
            status: false,
            message: "Another request is already being processed. Please try again in a minute.",
          });
        }
        const data = await Quotation.findOne(
            { _id: id, materials: { $elemMatch: { id: Number(material_id) } } },
            { "materials.$": 1, _id: 1,quotation_no:1,first_name:1,last_name:1,email:1,phone_number:1,submittedData:1,is_within_max_distance:1,distance:1,zip_code:1,installation_price:1 } // Return only the matched material
          );
      
          if (!data) {
             res.status(404).json({
              status: false,
              message: 'Quotation or material not found with provided ID',
            });
            return;
          }
          // Save order before calling the cart API
    let order = new Order({
      quotation_id: id,
      material_id,
      cart_id: null, // Cart ID will be updated later
      order_id: null,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone_number: data.phone_number,
      colors,
      amount: 0.00, // Amount will be updated after the API call
    });

    const savedOrder = await order.save();
    let additional_product = {}
    if (typeof data.is_within_max_distance !== 'undefined' && data.is_within_max_distance === true) {
        additional_product.quantity = 1;
        additional_product.product_id = process.env.CUSTOM_PRODUCT_ID;
        additional_product.list_price = data.installation_price;
        additional_product.name = `Installation Services (Zip: ${data?.zip_code})`
    }
    const totalStalls = data?.submittedData?.rooms?.reduce((sum, room) => sum + (room.stall?.noOfStalls || 0), 0);

    const totalUrinalScreens = data?.submittedData?.rooms?.reduce((sum, room) => {
        return sum + (room.hasUrinalScreens ? (room.urinalScreen?.noOfUrinalScreens || 0) : 0);
    }, 0);
      const bigCommerceCart = await this.createBigCommerceCart(data.materials[0],additional_product,data.quotation_no,totalStalls,totalUrinalScreens);
    if(bigCommerceCart.status){
      // let order = new Order;
      // order.quotation_id=id
      // order.material_id=material_id
      // order.cart_id=bigCommerceCart.data.data.id
      // order.order_id=null
      // order.first_name = data.first_name;
      // order.last_name =data.last_name;
      // order.email = data.email;
      // order.phone_number = data.phone_number;
      // order.colors=colors;
      // order.amount = bigCommerceCart.data.data.base_amount;
      // await order.save();
        // Update the saved order with cart_id and amount
        await Order.findByIdAndUpdate(savedOrder._id, {
          cart_id: bigCommerceCart.data.data.id,
          amount: bigCommerceCart.data.data.base_amount,
          shipping_amount:250,
          tax_amount:0,
          total_amount: bigCommerceCart.data.data.base_amount + 250,
        });
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

  async createBigCommerceCart(materials,additional_product,quotation_no,totalStalls,totalUrinalScreens) {
    try {
      // Prepare the data for BigCommerce cart (example: passing materials and prices)
        const mappingDoc = await Setting.findOne({ step: 'product_material_mapping', deleted: false });
        if (!mappingDoc || !mappingDoc.config || !mappingDoc.config.mapping) {
          throw new Error('Mapping document or config is missing.');
        }
        const material_id = materials.id;
       // Retrieve the product_id based on the material_id
    const product_id = mappingDoc.config.mapping[material_id.toString()];
    if (!product_id) {
      throw new Error(`No product ID found for material ID: ${material_id}`);
    }
    const line_items = [
      {
        quantity: 1,
        product_id: product_id, // from mapping 
        list_price: materials.price,
        name: `${materials.name} Partition Package \n (Quote #${quotation_no.slice(-5)}) (Total Stalls: ${totalStalls})` 
              + (totalUrinalScreens > 0 ? ` (Total Screens: ${totalUrinalScreens})` : "")
      },
    ];
    
    
    // Only add additional_product if it has properties
    if (additional_product && Object.keys(additional_product).length > 0) {
      line_items.push(additional_product);
    }
      const cartData = {
        "customer_id": 0,
        line_items
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

  async createShopifyCart(
    materials,
    additional_product,
    quotation_no,
    totalStalls,
    totalUrinalScreens,
    order_id
  ) {
    try {
      const mappingDoc = await Setting.findOne({
        step: "product_material_mapping",
        deleted: false
      });
  
      if (!mappingDoc?.config?.mapping) {
        throw new Error("Mapping document or config is missing.");
      }
  
      const material_id = materials.id;
      const productVariantId = mappingDoc.config.mapping[material_id.toString()];
  
      if (!productVariantId) {
        throw new Error(`No product ID found for material ID: ${material_id}`);
      }
  
      /* ---------------- Line Items ---------------- */
      const lineItems = [
        {
          variantId: `gid://shopify/ProductVariant/${productVariantId}`,
          quantity: 1,
          priceOverride: {
            amount: String(materials.price),
            currencyCode: process.env.SHOPIFY_CURRENCY_CODE
          },
          customAttributes: [
            { key: "Quote", value: `#${quotation_no.slice(-5)}` },
            { key: "Total Stalls", value: String(totalStalls) },
            { key: "Total Screens", value: String(totalUrinalScreens) }
          ]
        }
      ];
  
      if (additional_product && Object.keys(additional_product).length > 0) {
        lineItems.push(additional_product);
      }
  
      /* ---------------- GraphQL ---------------- */
      const query = `
        mutation DraftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id
              invoiceUrl
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              shippingLine {
                title
                price
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
  
      const variables = {
        input: {
          lineItems,
          shippingLine: {
            title: "Standard Shipping",
            priceWithCurrency: {
              amount: "250.00",
              currencyCode: process.env.SHOPIFY_CURRENCY_CODE
            }
          },
          note: `${order_id}`,
          taxExempt: true
        }
      };
  
      const response = await axios.post(
        `${process.env.SHOPIFY_DOMAIN_NAME}/admin/api/2025-10/graphql.json`,
        { query, variables },
        {
          headers: {
            "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
            "Content-Type": "application/json"
          }
        }
      );
  
      const result = response.data.data?.draftOrderCreate;
  
      if (result?.userErrors?.length) {
        throw new Error(result.userErrors.map(e => e.message).join(", "));
      }
  
      return {
        status: true,
        data: result.draftOrder
      };
    } catch (error) {
      console.error("Shopify Error:", error.message);
      return {
        status: false,
        message: "Failed to create draft order in Shopify"
      };
    }
  }
  

/**
 * Updates the payment response details in the order.
 *
 * @param {object} req - The request object containing the payment response data.
 * @param {object} req.body - The request body with the payment details.
 * @param {string} req.body.id - The MongoDB ObjectId of the order to be updated.
 * @param {string} req.body.transaction_id - The transaction ID of the payment.
 * @param {string} req.body.order_id - The order ID associated with the payment.
 * @param {string} req.body.payment_status - The payment status (e.g., 'success', 'failed').
 * @param {object} res - The response object to send the response.
 * @returns {json} A JSON response containing the status and any relevant message or error details.
 *
 * @description
 * - Validates the required fields (`id`, `transaction_id`, `order_id`, `payment_status`) from the request body.
 * - Verifies that the `id` is a valid MongoDB ObjectId.
 * - Searches for the order using the provided `id`.
 * - Updates the order with the payment details (`order_id`, `transaction_id`, `payment_status`) and clears the `zendesk_ticket_id`.
 * - On success, returns a 200 status with a success message.
 * - On failure, returns a 422 status with validation errors or a 500 status with error details.
 *
 * @throws
 * - Throws an error if the provided `id` is not a valid MongoDB ObjectId.
 *
 * @example
 * const paymentDetails = {
 *   id: "60c72b2f9f1b2c1d08c83e6f",
 *   transaction_id: "txn_12345",
 *   order_id: "order_67890",
 *   payment_status: "success"
 * };
 * const response = await updatePaymentResponse(paymentDetails);
 * if (response.status) {
 *   console.log('Order updated successfully:', response.message);
 * } else {
 *   console.error('Error:', response.errors);
 * }
 */

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
                  order.zendesk_ticket_id="";
                    await order.save();
                    res.status(200).json({
                      status: true,
                      message:"Order Updated successfully."
                    });
                    return;
            
          } catch (error) {
            res.status(500).json({
              status: false,
              message: error.message,
            });
            return;
          }
        }
  }




/**
 * Handles the order status update based on a webhook payload from BigCommerce.
 *
 * @param {Object} req - The request object, containing the webhook payload.
 * @param {Object} req.body.data - The data sent in the webhook payload.
 * @param {string} req.body.data.type - The type of the event, must be 'order'.
 * @param {string} req.body.data.id - The order ID from BigCommerce.
 * @param {Object} res - The response object, used to send the response back.
 * @returns {Promise<void>} A promise that resolves when the order is processed.
 *
 * @description
 * - Validates the incoming request to ensure the type is 'order' and the order ID exists.
 * - Fetches order details from the BigCommerce API using the provided order ID.
 * - Updates the corresponding order record in the database, setting payment and order status.
 * - Marks the related quotation as converted to a deal.
 * - Returns a success message if the order status is updated successfully.
 * - Throws an error if the order data is invalid, not found in the database, or if the webhook payload is incorrect.
 *
 * @throws {Error} If there is an issue processing the order, an error with a message is thrown.
 *
 * @example
 * const orderPayload = {
 *   type: 'order',
 *   id: '12345',
 * };
 * try {
 *   await order(orderPayload);
 *   console.log('Order processed successfully');
 * } catch (error) {
 *   console.error('Error processing order:', error.message);
 * }
 */

// async order(req, res){
//   try {
//     const { id, note, email, admin_graphql_api_id,financial_status,billing_address,created_at } = req.body;
//       let bigcommerceData = new BigcommerceOrderResponse;
//           bigcommerceData.order_id=id
//           bigcommerceData.cart_id=admin_graphql_api_id
//           bigcommerceData.response=req.body
//           await bigcommerceData.save();

   
//         // Check if order exists in your database
//         const existingOrder = await Order.findOne({ _id:note });

        
//         if (existingOrder) {

//           // Check if payment is successful
//           const isSuccessfulPayment = financial_status == "paid" ? true : false;
//           billing_address.first_name=existingOrder.first_name;
//           billing_address.last_name=existingOrder.last_name;
//           billing_address.email=email;

//           // Fields to update in Order
//           const updateFields = {
//             payment_status: await this.capitalizeWords(financial_status) || 'Pending',
//             order_status: financial_status == "paid" ? "Awaiting Fulfillment" : "Pending",
//             billing_address: billing_address || {},
//             order_id: id || null,
//             // shipping_amount: orderData.base_shipping_cost || existingOrder.shipping_amount,
//             // total_tax: orderData.total_tax || existingOrder.total_tax,
//             // total_amount: orderData.total_inc_tax || existingOrder.amount,
//             paymentDate: new Date(created_at) || null,
//             updatedAt: Date.now(),
//           };

//           if (isSuccessfulPayment && !existingOrder.is_mail_send) {
//             updateFields.is_mail_send = true;
//           }

//           // Update Order
//           await Order.findByIdAndUpdate(existingOrder._id, { $set: updateFields }, { new: true });
      
//             // Find and update Quotation
//     const existingQuotation = await Quotation.findById(existingOrder.quotation_id);
    
//     if (!existingQuotation) {
//       throw new Error('Quotation not found in the database');
//     }
// // Determine the color value first
//       const selectedColor =
//         existingOrder.material_id !== '4' && existingOrder?.colors?.data?.length
//           ? existingOrder.colors.data[0].name
//           : 'No color selected';
//     if (isSuccessfulPayment && !existingOrder.is_mail_send) {
//           await Quotation.findByIdAndUpdate(existingQuotation._id, { $set: { is_converted_to_deal: true } }, { new: true });
//           const alreadyScheduled = await agenda._collection.findOne({
//             name: "send_order_email",
//             "data.quotationId": existingOrder.quotation_id,
//             "data.orderId": existingOrder._id
//           });

//           if (!alreadyScheduled) {
      
//             const formattedTotalAmount = Number(existingOrder.total_amount).toLocaleString("en-US", {
//               maximumFractionDigits: 0,
//             });
//             const formatted_quote_amount = Number(existingOrder.amount).toLocaleString("en-US", {
//               maximumFractionDigits: 0,
//             });
//             const formatted_shipping_amount = Number(existingOrder.shipping_amount).toLocaleString("en-US", {
//               maximumFractionDigits: 0,
//             });
           
//             const formatted_tax_amount = Number(existingOrder.total_tax).toLocaleString("en-US", {
//               maximumFractionDigits: 0,
//             });
//          // Schedule an email after 5 seconds
//           await agenda.schedule("in 5 seconds", "send_order_email", {
//             quotationId: existingOrder.quotation_id,
//             bigcommerceOrderId: id,
//             orderId: existingOrder._id,
//             color: selectedColor,
//             quote_amount:existingOrder.amount,
//             formatted_quote_amount:formatted_quote_amount,
//             shipping_amount:existingOrder.shipping_amount,
//             formatted_shipping_amount:formatted_shipping_amount,
//             tax_amount:existingOrder.total_tax,
//             formatted_tax_amount:formatted_tax_amount,
//             amount: existingOrder.total_amount,
//             total_amount: formattedTotalAmount,
//           });
//         }
//         }

  
//            res.status(200).json({
//             success: true,
//             message: 'Order status updated successfully',
//             data: {
//               payment_status: existingOrder.payment_status,
//               order_status: existingOrder.order_status,
//               //dealData:dealData
//             },
//           });
//           return;
//         } else {
//           throw new Error('Order not found in the database');
//         }
     
   
//   } catch (error) {
//     console.error('Error processing order:', error.message);
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }

async order(req, res){
  try {
    const { type, id, status } = req.body.data;

    // Validate if type is 'order' and id exists
    if (type === 'order' && id) {
      // Fetch order details using BigCommerce API
      const orderResponse = await axios.get(
        `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}/v2/orders/${id}`,
        {
          headers: {
            'X-Auth-Token': process.env.BIGCOMMERCE_API_TOKEN, // Use token from environment variables
            'Accept': 'application/json',
          },
        }
      );

      const orderData = orderResponse.data;

      let bigcommerceData = new BigcommerceOrderResponse;
          bigcommerceData.order_id=id
          bigcommerceData.cart_id=orderData?.cart_id
          bigcommerceData.response=req.body.data
          await bigcommerceData.save();

      if (orderData && orderData.cart_id && status.new_status_id === 11) {
        // Check if order exists in your database
        const existingOrder = await Order.findOne({ cart_id: orderData.cart_id });

        if (existingOrder) {

          // Check if payment is successful
          const isSuccessfulPayment = [11].includes(status.new_status_id);


          // Fields to update in Order
          const updateFields = {
            payment_status: await this.capitalizeWords(orderData.payment_status) || 'Pending',
            order_status: await this.capitalizeWords(orderData.status) || 'Pending',
            billing_address: orderData.billing_address || {},
            order_id: orderData.id || null,
            shipping_amount: orderData.base_shipping_cost || existingOrder.shipping_amount,
            total_tax: orderData.total_tax || existingOrder.total_tax,
            total_amount: orderData.total_inc_tax || existingOrder.amount,
            paymentDate: new Date(orderData.date_modified) || null,
            updatedAt: Date.now(),
          };

          if (isSuccessfulPayment && !existingOrder.is_mail_send) {
            updateFields.is_mail_send = true;
          }

          // Update Order
          await Order.findByIdAndUpdate(existingOrder._id, { $set: updateFields }, { new: true });
      
            // Find and update Quotation
    const existingQuotation = await Quotation.findById(existingOrder.quotation_id);
    
    if (!existingQuotation) {
      throw new Error('Quotation not found in the database');
    }
// Determine the color value first
      const selectedColor =
        existingOrder.material_id !== '4' && existingOrder?.colors?.data?.length
          ? existingOrder.colors.data[0].name
          : 'No color selected';
    if (isSuccessfulPayment && !existingOrder.is_mail_send) {
          await Quotation.findByIdAndUpdate(existingQuotation._id, { $set: { is_converted_to_deal: true } }, { new: true });
          const alreadyScheduled = await agenda._collection.findOne({
            name: "send_order_email",
            "data.quotationId": existingOrder.quotation_id,
            "data.orderId": existingOrder._id
          });

          if (!alreadyScheduled) {
      
            const formattedTotalAmount = Number(orderData.total_inc_tax).toLocaleString("en-US", {
              maximumFractionDigits: 0,
            });
            const formatted_quote_amount = Number(existingOrder.amount).toLocaleString("en-US", {
              maximumFractionDigits: 0,
            });
            const formatted_shipping_amount = Number(orderData.base_shipping_cost).toLocaleString("en-US", {
              maximumFractionDigits: 0,
            });
           
            const formatted_tax_amount = Number(orderData.total_tax).toLocaleString("en-US", {
              maximumFractionDigits: 0,
            });
         // Schedule an email after 5 seconds
          await agenda.schedule("in 5 seconds", "send_order_email", {
            quotationId: existingOrder.quotation_id,
            bigcommerceOrderId: orderData.id,
            orderId: existingOrder._id,
            color: selectedColor,
            quote_amount:existingOrder.amount,
            formatted_quote_amount:formatted_quote_amount,
            shipping_amount:orderData.base_shipping_cost,
            formatted_shipping_amount:formatted_shipping_amount,
            tax_amount:orderData.total_tax,
            formatted_tax_amount:formatted_tax_amount,
            amount: orderData.subtotal_inc_tax,
            total_amount: formattedTotalAmount,
          });
        }
        }

  
           res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: {
              cart_id:orderData.cart_id,
              order_id: existingOrder.id,
              payment_status: existingOrder.payment_status,
              order_status: existingOrder.order_status,
              //dealData:dealData
            },
          });
          return;
        } else {
          throw new Error('Order not found in the database');
        }
      } else {
        throw new Error('Cart ID not found in order data');
      }
    } else {
      throw new Error('Invalid webhook payload');
    }
  } catch (error) {
    console.error('Error processing order:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param {string} str - The input string to capitalize.
 * @returns {string} The string with the first letter of each word capitalized.
 *
 * @description
 * - The function ensures that the string is in lowercase before capitalizing the first letter of each word.
 * - It splits the string into words, capitalizes the first letter of each word, and joins them back together.
 * - If the input string is empty or falsy, it returns an empty string.
 *
 * @example
 * const result = capitalizeWords('hello world');
 * console.log(result); // 'Hello World'
 * 
 * @example
 * const result = capitalizeWords('capitalize first letter');
 * console.log(result); // 'Capitalize First Letter'
 */

async capitalizeWords(str) {
  if (!str) return '';
  return str
    .toLowerCase() // Ensure the string is in lowercase to handle mixed cases
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async checkEmailAndCreateContact(contactData) {
  try {
      // Step 1: Check if the contact exists
      const contactResponse = await axios.get(`${process.env.ZENDESK_SELL_API_URL}/contacts`, {
          headers: {
              Authorization: `Bearer ${process.env.ZENDESK_SELL_API_TOKEN}`,
              'Content-Type': 'application/json',
          },
          params: {
              email: contactData.email, // Check contact by email
          },
      });

      const contacts = contactResponse.data.items;

      if (contacts.length > 0) {
          // Contact exists, return the ID
          const contactId = contacts[0].data.id;
          console.log(`Contact exists with ID: ${contactId}`);
          return contactId;
      } else {
          // Step 2: Create a new contact
          const createContactResponse = await axios.post(
              `${process.env.ZENDESK_SELL_API_URL}/contacts`,
              {
                  data: contactData, // Include required fields for the contact
              },
              {
                  headers: {
                      Authorization: `Bearer ${process.env.ZENDESK_SELL_API_TOKEN}`,
                      'Content-Type': 'application/json',
                  },
              }
          );

          const contactId = createContactResponse.data.data.id;
          console.log(`New contact created with ID: ${contactId}`);
          return contactId;
      }
  } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      throw new Error(
          error.response?.data?.error || 'Failed to check or create contact'
      );
  }
}

async  createDeal(dealData) {
  try {
      const dealResponse = await axios.post(
          `${process.env.ZENDESK_SELL_API_URL}/deals`,
          dealData,
          {
              headers: {
                  Authorization: `Bearer ${process.env.ZENDESK_SELL_API_TOKEN}`,
                  'Content-Type': 'application/json',
              },
          }
      );

      console.log(`Deal created successfully with ID: ${dealResponse.data.data.id}`);
      return dealResponse.data.data; // Return the deal data
  } catch (error) {
      console.error('Error in createDeal:', error.response?.data || error.message);
      throw new Error(
          error.response?.data?.error || 'Failed to create deal'
      );
  }
}

async createHubspotDeal(contactData,dealData){
  try {
    // 1. Get a fresh access token
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
    let hubspotContactId = null;

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
// -----------------------------
    // 3️⃣ Add association IF contact exists
    // -----------------------------
    if (hubspotContactId) {
      dealData.associations = [
        {
          to: { id: hubspotContactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 3, // Contact → Deal default association
            },
          ],
        },
      ];
    }
    
    // 2. Create the deal
    const dealResponse = await axios.post(
      "https://api.hubapi.com/crm/v3/objects/0-3",
       dealData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return dealResponse.data;
  } catch (error) {
    console.error("Error creating HubSpot deal:", error.response?.data || error.message);
    throw error;
  }
}

async getSmallestOuterPrice(materials) {
  let smallestPrice = Infinity;
  materials.forEach(material => {
    const price = parseFloat(material.price); // Access the outer price
    if (price < smallestPrice) {
      smallestPrice = price;
    }
  });
  return smallestPrice;
}

async downloadPDF(req, res) {
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
      const quotation = await Quotation.findOne(
        { _id: id },
        { submittedData: 1, roomData: 1, materials:1, _id: 1,quotation_no:1, phone_number:1, createdAt:1,is_within_max_distance:1,distance:1,zip_code:1 }
      );
      const totalStalls = quotation.submittedData.rooms.reduce((sum, room) => sum + (room.stall?.noOfStalls || 0), 0);

    const totalUrinalScreens = quotation.submittedData.rooms.reduce((sum, room) => {
        return sum + (room.hasUrinalScreens ? (room.urinalScreen?.noOfUrinalScreens || 0) : 0);
    }, 0);
      const instalation_price = await this.calculateInstallationPrice(quotation);
      const htmlContent = await this.QuotationPDFhtml(quotation._id,quotation.quotation_no,quotation.createdAt,quotation.phone_number,quotation.materials,quotation.submittedData.rooms,totalStalls,totalUrinalScreens,instalation_price);
       // Define the file path
//   const filePath = path.join(__dirname, `quotation_${quotation.quotation_no}.html`);

// await fs.promises.writeFile(filePath, htmlContent);

      const pdfBuffer = await this.generatePDF(htmlContent); // Ensure this is called correctly
      res.status(200).json({
        status: true,
        instalation_price:instalation_price,
        data: Buffer.from(pdfBuffer),
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

async updateDeal(id,color,amount,total_amount) {
  try {
      const dealResponse = await axios.put(
        `${process.env.ZENDESK_SELL_API_URL}/deals/${id}`,// Use the provided URL structure
          {
              data: {
                  value: amount,
                  stage_id: Number(process.env.ZENDESK_DEAL_FINAL_STAGE_ID), // Replace with the desired stage ID
                  "custom_fields": {
                    "Order Total": `$${total_amount}`,
                    "Color": color,
                  }
              },
          },
          {
              headers: {
                  Authorization: `Bearer ${process.env.ZENDESK_SELL_API_TOKEN}`,
                  'Content-Type': 'application/json',
              },
          }
      );

      console.log(`Deal updated successfully with ID: ${dealResponse.data.data.id}`);
      return dealResponse.data.data; // Return the updated deal data
  } catch (error) {
      console.error('Error in updateDeal:', error.response?.data || error.message);
      throw new Error(
          error.response?.data?.error || 'Failed to update deal'
      );
  }
}
async updateHubspotDeal(id,color,amount,total_amount) {
  try {
    // 1. Get a fresh access token
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
   
        // Build update payload
        const updatePayload = {
          properties: {
            color: color || "No color selected",
            amount: amount || null,
            order_total: total_amount ? `$${total_amount}` : null,
            dealstage: process.env.QUOTE_TOOL_FINAL_STAGE_ID, // hardcoded pipeline as per your example
          },
        };
  
        const response = await axios.patch(
          `https://api.hubapi.com/crm/v3/objects/deals/${id}`,
          updatePayload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
  
        return response.data;
  } catch (error) {
    console.error("Error creating HubSpot deal:", error.response?.data || error.message);
    throw error;
  }
}

async createMondayItem(quotation,order) {
  try {
    // -----------------------------
    // 1) CREATE ITEM
    // -----------------------------
    const columnValues = {
      // Status
      // status: {
      //   label: quotation?.status || "Working on it",
      // },
    
      // Person
      person: {
        personsAndTeams: [
          {
            id: Number(process.env.MONDAY_OWNER_ID), // 90289175
            kind: "person",
          },
        ],
      },
    
      // Install Date
      // date4: {
      //   date: quotation?.install_date || "2025-11-18",
      // },
    
      // Sales Order #
      text_mkz5kwbx: `${quotation.quotation_no}`,
    
      // Client
      text_mkz5b0g0: quotation?.first_name +' '+quotation?.last_name,
    
      // Type
      text_mkz5kc6z: "QUOTE",
    
      // Sent To RSA PM
      // date_mkz52gsp: {
      //   date: quotation?.sent_to_rsa_pm || "2025-01-07",
      // },
    
      // Sent To GC PM
      // date_mkz53p8w: {
      //   date: quotation?.sent_to_gc_pm || "2025-01-08",
      // },
    
      // Approved Submittals Received
      // date_mkz5g7sj: {
      //   date: quotation?.approved_submittals || "2025-01-09",
      // },
    
      // Measure Date
      // date_mkz5e546: {
      //   date: quotation?.measure_date || "2025-01-10",
      // },
    
      // Measurement Complete
      // date_mkz5c1aw: {
      //   date: quotation?.measurement_complete || "2025-01-11",
      // },
    
      // Site Address
      text_mkz5y50q: order?.billing_address?.street_1,
    
      // Site Contact Name
      text_mkz586r: quotation?.first_name +' '+quotation?.last_name,
    
      // Site Contact #
      text_mkz5atqk: quotation?.phone_number,
    
      // RSA PM Name
      //text_mkz5k1hp: quotation?.rsa_pm_name || "Jane Smith",
    
      // Prep Date
      // date_mkz5xxfq: {
      //   date: quotation?.prep_date || "2025-01-12",
      // },
    
      // Days in Project Queue
      //text_mkz55j9j: String(quotation?.days_in_queue || 5),
    
      // Added to Project Queue
      // date_mkz52mkn: {
      //   date:
      //     quotation?.added_to_queue ||
      //     new Date().toISOString().split("T")[0],
      // },
    };
    
    
    const createItemQuery = `
      mutation {
        create_item (
          board_id: ${process.env.MONDAY_BOARD_ID},
          group_id: "${process.env.MONDAY_GROUP_ID}",
          item_name: "${quotation?.project_name} - (Quote Tool)",
          column_values: ${JSON.stringify(JSON.stringify(columnValues))}
        ) {
          id
          name
        }
      }
    `;

    const createItemRes = await axios.post(
      "https://api.monday.com/v2",
      { query: createItemQuery },
      {
        headers: {
          Authorization: process.env.MONDAY_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const itemId =
      createItemRes?.data?.data?.create_item?.id ||
      createItemRes?.data?.data?.create_item?.[0]?.id;

    if (!itemId) {
      throw new Error("Failed to fetch created Monday item ID");
    }

    console.log("✔ Item created:", itemId);

    // -----------------------------
    // 2) CREATE UPDATE FOR THAT ITEM
    // -----------------------------
    const room_details = await this.formatAllRoomsData(quotation.submittedData.rooms);
    const materialDetailsString = quotation.materials
    .map(
      (material) =>
        `${material.name}: $${Number(material.price).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`
    )
    .join("\n");
    const roomDetailsHtml = String(room_details).replace(/\n/g, "<br>");
    const materialDetailsHtml = materialDetailsString.replace(/\n/g, "<br>");
    

    const updateBody = `
        <b>Project Name:</b> ${quotation?.project_name} - (Quote Tool)<br>

        <b>Client Details</b><br>
        Name: ${quotation?.first_name} ${quotation?.last_name}<br>
        Email: ${quotation?.email}<br>
        Phone: ${quotation?.phone_number}<br>

        <b>Room Details</b><br>
        ${roomDetailsHtml}<br>

        <b>Material Details</b>
        ${materialDetailsHtml}
        `;
    const updateQuery = `
    mutation {
      create_update(
        item_id: ${itemId},
        body: ${JSON.stringify(updateBody)}
      ) {
        id
      }
    }
  `;
  

    const updateRes = await axios.post(
      "https://api.monday.com/v2",
      { query: updateQuery },
      {
        headers: {
          Authorization: process.env.MONDAY_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✔ Update created:", updateRes.data);

    return {
      item: createItemRes.data,
      update: updateRes.data,
    };
  } catch (error) {
    console.error(
      "Monday API ERROR:",
      error.response?.data || error.message
    );
    throw error;
  }
}


async  formatAllRoomsData(roomsData) {
  const formattedRooms = await Promise.all(
    roomsData.map(async (room) => this.formatRoomData(room))
  );
  return formattedRooms.join("\n\n");
}


async formatRoomData(roomData) {
  const { id, title, stall, urinalScreen, hasUrinalScreens } = roomData;
  const { noOfStalls, stallConfig, layout } = stall;

  // Format stall details
  const stallsDetails = stallConfig
    .map(
      (stall, index) =>
        `Stall ${index + 1}${stall?.type ? ' (ADA)' : ''} - Width: ${stall?.totalStallWidth}"  Door: ${stall.doorOpening}"  Door Swing: ${stall.doorSwing.name}`
    )
    .join("\n\n");

  // Format layout direction
  const layoutDirection =
    stall.type === "IC"
      ? "In Corner"
      : stall.type === "BW"
      ? "Between Wall"
      : stall.type === "ALIC"
      ? "Alcove Corner"
      : stall.type === "ALBW"
      ? "Alcove Between Wall"
      : "N/A";

  // Format urinal screen details if hasUrinalScreens is true
  const urinalDetails =
    hasUrinalScreens && urinalScreen
      ? `\nUrinal Screens: ${urinalScreen.noOfUrinalScreens}\nScreen Depth: ${urinalScreen.urinalScreenConfig[0]?.screenDepth || "N/A"}`
      : "";

  // Final formatted string
  return `
Room Name: ${title}
Stalls Details : 
Total : ${noOfStalls} Stalls
${stallsDetails}

Layout- ${layout?.layoutName}${urinalDetails}
`;
}

async QuotationPDFhtml(quotation_id,quotation_no,createdAt,phone_number,materials,rooms,totalStalls,totalUrinalScreens,instalation_price){
  const formattedPhone = await this.formatPhoneNumber(phone_number);
  const htmlContent = `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif;print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/pdf_watermark_top.png');background-repeat: no-repeat;background-size:auto;background-position: left top;table-layout: fixed;"><tr><td><table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
  <tr>
      <td style="padding: 10px; text-align: left;">
           <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
      </td>
      <td style="padding: 10px; text-align: right;">
          <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-8448178255" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
          <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:cs@restroomstallsandall.com" style="color:#000;">cs@restroomstallsandall.com</a></p>
     </td>
  </tr>
  <tr>
      <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 30px; vertical-align: bottom;border: 1px solid #3d58a4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
               <tr>
                  <td colspan="2">
                       <h4 style="color:#fff; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation_no.slice(-6)}</h4>
                       <p style="margin-top: 5px; margin-bottom: 0px;color:#fff">Date: ${moment(createdAt).format('MM/DD/YY')} </p>
                  </td>
               </tr>
          </table>
      </td>
     
  </tr>
  <tr>
  <td colspan="2" style="text-align: center; margin-top: 0px;">
      <h4 style="font-size: 28px; color:#3d58a4; font-weight: 900; margin-bottom: 10px; font-family:Verdana, Geneva, Tahoma, sans-serif; margin-top: 10px;">
         Select Your Material & Purchase Now
      </h4>
      <h5 style="font-size: 14px; color:#3d58a4; font-weight: 500; margin-bottom: 10px; font-family:Verdana, Geneva, Tahoma, sans-serif; margin-top: 10px;">
      Choose the partition material that best fits your project. Click <a style="font-weight:700;" href="${process.env.FRONTEND_UI_URL}/choose-materials?id=${quotation_id}&abandoned=1">Purchase Now</a> to check
      out securely—our team will confirm details before production.
      </h5>
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; position: relative;">
          <!-- Left Button -->
          <a href="${process.env.FRONTEND_UI_URL}/create-a-project?new-quote=1" 
             style="color:#fff; font-size: 12px; line-height: 18px; border: 1px solid #000; font-family: Verdana, Geneva, Tahoma, sans-serif; 
                    border-radius: 5px; padding: 6px 8px; text-decoration: none; background-color: #4e843d;">
              Start New Quote
          </a>
          
          <!-- Spacer -->
          <p></p>

          <!-- Right Button -->
          <!-- a href="${process.env.FRONTEND_UI_URL}/choose-materials?id=${quotation_id}&abandoned=1" 
             style="color:#fff; font-size: 12px; line-height: 18px; border: 1px solid #000; font-family: Verdana, Geneva, Tahoma, sans-serif; 
                    border-radius: 5px; padding: 6px 8px; text-decoration: none; background-color: #4e843d;">
              Continue Order Process
          </a -->
          ${instalation_price > 0 ? `
                    <p style="color:#fff; font-size: 12px; line-height: 18px; border: 1px solid #000; font-family: Verdana, Geneva, Tahoma, sans-serif; border-radius: 5px; padding: 6px 8px; text-decoration: none; background-color: #4e843d;">
                      Installation Price : $${instalation_price.toFixed(2)}
                    </p>` : ``}
      </div>
  </td>
</tr>

  <tr>
      <td colspan="2" width="100%" style="width: 100%;">
          <div class="table_box" style="margin-top: 5px;">
              <div style="display: flex; align-items: center; width: 100%; justify-content: space-between;  flex-wrap: wrap; box-sizing: border-box; gap:10px;">
                  ${materials.map(material => `
                  <div style="position:relative;padding: 10px 20px 10px; text-align:left; border: 1px solid #3d58a4; border-radius: 15px;  width:48%; box-sizing: border-box;print-color-adjust: exact;  -webkit-print-color-adjust: exact;background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;">
                      <a href="${process.env.FRONTEND_UI_URL}/choose-materials?id=${quotation_id}&abandoned=1&material_id=${material.id}" style="position:absolute;right:10px;top:10px;border:1px solid #fff;border-radius:30px;width:17px;text-align: center;color: #fff;text-decoration:none;font-size:16px">i</a>
                      <div width="100%"  >
                          <div style="display: flex; align-items: center;">
                           <div  style="width: 25% !important; margin-bottom: 0px;">
                               <img src="${process.env.URI}/${material.src}" alt="pic" style="width:100%"/>
                           </div>
                           <div  style="width: 75% !important; padding: 0px 20px 5px; margin-bottom: 0px !important;color:#fff;">
                               <h4 style="color:#fff; font-size: 12px; font-weight: 700; margin-bottom:0; margin-top: 3px;">${material.name}</h4>
                               ${(() => {
                                if (material.id === 1) {
                                  return `
                                  <div style="font-size: 8px; margin-top: 3px;">Best for: <span>Low-to-moderate traffic offices, Tenant Improvements, Church’s</span></div>
                                  <div style="font-size: 8px; margin-top: 3px;">Pros: <span>cost-effective, many color options</span></div>
                                  <div style="font-size: 8px; margin-top: 3px;">Cons: <span>not ideal for constant moisture/abuse areas</span></div>
                                  `;
                                } else if (material.id === 2) {
                                  return `
                                    <div style="font-size:8px;margin-top:3px;">Best for: Offices, Retail Stores, Low - to- medium-traffic commercial restrooms</div>
                                    <div style="font-size:8px;margin-top:3px;">Pros: durable finish, easy to clean</div>
                                    <div style="font-size:8px;margin-top:3px;">Cons: can scratch/dent in high-abuse spaces</div>
                                  `;
                                }
                                else if (material.id === 3) {
                                  return `
                                    <div style="font-size:8px;margin-top:3px;">Best for: School, Gyms, Water parks, Public Parks, wet environments</div>
                                    <div style="font-size:8px;margin-top:3px;">Pros: won’t rust, rot, or delaminate; easy maintenance</div>
                                    <div style="font-size:8px;margin-top:3px;">Cons: higher upfront cost, long-term value</div>
                                  `;
                                }
                                else if (material.id === 4) {
                                  return `
                                    <div style="font-size:8px;margin-top:3px;">Best for: Airports, Hospitals, High-end commercial Buildings</div>
                                    <div style="font-size:8px;margin-top:3px;">Pros: premium look, strong durability</div>
                                    <div style="font-size:8px;margin-top:3px;">Cons: higher cost; fingerprints may show</div>
                                  `;
                                }
                                else if (material.id === 5) {
                                  return `
                                    <div style="font-size:8px;margin-top:3px;">Best for: Schools, Corporate Campuses, Healthcare, Upscale public restrooms</div>
                                    <div style="font-size:8px;margin-top:3px;">Pros: extremely durable, highly moisture resistant</div>
                                    <div style="font-size:8px;margin-top:3px;">Cons: premium price, premium lifespan</div>
                                  `;
                                }else{
                                  return `
                                    <div style="font-size:8px;margin-top:3px;">Best for: High-traffic commercial environments</div>
                                    <div style="font-size:8px;margin-top:3px;">Pros: Extremely durable and moisture resistant</div>
                                    <div style="font-size:8px;margin-top:3px;">Cons: Higher cost compared to Laminate</div>
                                  `;
                                }
                              })()}
                             
                               <h5 style="font-size:12px;  margin-top:3px;margin-bottom:0;">Cost: $${Number(material.price).toLocaleString("en-US", { maximumFractionDigits: 0 })}</h5>
                       
                               <div>
                                  <span style="color:#fff;font-weight: 400; font-size: 8px;display: inline-block;vertical-align:middle;">
                                  Rooms stalls: ${rooms.length > 0 ? `${rooms.length} Room${rooms.length > 1 ? 's' : ''}` : ''} 
                                  </span>
                                  <span style="color:#fff;font-weight: 400; font-size: 8px;display: inline-block;vertical-align:middle;">
                                  ${totalStalls > 0 ? `${totalStalls} Stall${totalStalls > 1 ? 's' : ''}` : ''}
                                  </span>
                                  <span style="color:#fff;font-weight: 400;display:block; font-size: 8px;">
                                  Urinal screens: ${totalUrinalScreens > 0 
                                    ? `${totalUrinalScreens} Urinal Screen${totalUrinalScreens > 1 ? 's' : ''}` 
                                    : 'No Urinal Screens'}
                                </span>
                               </div>
                               <h6 style="font-size: 8px; font-weight: 400; margin-top:3px; margin-bottom: 0;">Warranty: ${material.warranty} </h6>
                             
                               
                               
                           </div>
       
                          </div>
                          <div>
                             
                                  
                                       <div style="width:100%;">
                                       <p style="margin-top:0; line-height:1.4; margin-bottom: 7px; font-size: 8px; color:#fff; text-align:center;">A partition expert will confirm your order details: <span style="cursor: default;    pointer-events: none;">${formattedPhone}</span></p>
                                          <div style="text-align: right; width: 100%;">
                                              <a href="${process.env.FRONTEND_UI_URL}/choose-materials?id=${quotation_id}&abandoned=1&material_id=${material.id}" style="font-size:13px;text-decoration: none; color:#000; padding: 2px 10px; border:1px solid #feda15; border-radius: 10px; width: 96%; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-color: #feda15;"><img src="${process.env.URI}/uploads/images/cart.png" alt="pc" style="width:16px; margin-right: 5px;"/>Purchase Now</a>
                                          </div>
                                         <p style="margin-top:7px; line-height: 1; margin-bottom: 0px; font-size:9px; color:#fff; text-align:center;">Ships in approx. 4–6 business days</p>

                                       </div>
                                  
                              
                           
                          </div>
                      </div>
                   </div>
                   `).join('')}
                   <div style="padding: 10px 40px; text-align:center; border: 1px solid #e4e8ef; border-radius: 15px;  print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;width:48%; box-sizing: border-box; min-height: 200px;" >
                      <p style="color:#fff;font-size:12px;line-height:1.3;text-align:left;padding:0;margin-top:5px;font-weight:700;margin-bottom:5px;">What’s Included With Your Partition Package?</p>
                      <ul style="color:#fff; font-size: 11px; line-height: 1.3; text-align: left; padding:0 0 0 15px;margin: 0;">
                        <li style="margin:0 0 4px 0;">Complete partition package: doors, panels, pilasters, brackets, anchors, and crews.</li>
                        <li style="margin:0 0 4px 0;">Sales tax and shipping are calculated at checkout.</li>
                        <li style="margin:0 0 4px 0;">Lead times and availability may change.</li>
                        <li style="margin:0 0 0 0;">All orders are reviewed by RSA prior to production.</li>
                      </ul>
                   </div> 
              </div>
              <div style="margin-top:10px;padding: 10px 40px; text-align:center; border: 1px solid #e4e8ef; border-radius: 15px;  print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;width:100%; box-sizing: border-box;">
              <p style="color:#fff;font-size:12px;line-height:1.3;text-align:left;padding:0;margin-top:5px;font-weight:700;margin-bottom:5px;">Trusted Support From Quote to Install</p>
                <ul style="color:#fff; font-size: 11px; line-height: 1.3; text-align: left; padding:0 0 0 15px;margin: 0;">
                  <li style="margin:0 0 4px 0;">Learn More about the Install Team</li>
                  <li style="margin:0 0 4px 0;">Order Reviewed by Experts</li>
                  <li style="margin:0 0 4px 0;">Commercial-Grade Materials</li>
                  <li style="margin:0 0 0 0;">Dedicated Phone + Email Support</li>
                </ul>
              </div>
          </div>
 
         
      </td>
      
  </tr>
  
 
</table>
${rooms.map((room, index) => `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px; margin-top: 40px;">
      <tr>
          <td style="padding: 10px; text-align: left;">
               <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
          </td>
          <td style="padding: 10px; text-align: right;">
              <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-8448178255" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
              <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:cs@restroomstallsandall.com" style="color:#000;">cs@restroomstallsandall.com</a></p>
         </td>
      </tr>
      <tr>
          <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 30px; vertical-align: bottom;border: 1px solid #3d58a4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                   <tr>
                      <td colspan="2">
                           <h4 style="color:#fff; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation_no.slice(-6)}</h4>
                           <p style="margin-top: 5px; margin-bottom: 0px;color:#fff">Date: ${moment(createdAt).format('MM/DD/YY')} </p>
                      </td>
                   </tr>
              </table>
          </td>
         
      </tr>
      <tr>
          <td colspan="2" style="padding-left: 10px;">
              <h5 style="color:#285fa1; font-size: 20px; line-height: 1; margin-top: 10px; margin-bottom: 0px;">Room: ${room.title}</h5>
              
          </td>
      </tr>
      <tr>
          <td colspan="2" >
              <table width="100%" cellpadding="0" cellspacing="20" style="table-layout: fixed;">
                  <tr>
                      <td width="100%" style="width: 100%; vertical-align: top;" colspan="2">
                          <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
                              <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 7px 14px; margin-bottom: 0px; font-size: 15px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; margin-bottom: 0px;"> Stalls: ${room?.stall?.noOfStalls}</h4>
                             <p style="display: flex; align-items: center; font-size: 15px; width:100%; line-height: 1;padding-left:20px;"><img src="${process.env.URI}/uploads/images/layout.png" alt="pic" style="width: 17px; margin-right:10px;"/><span style="color:#000; font-weight: 500; font-weight: 700; line-height: 1;color:#0061a6;">Layout </span>- ${room.stall?.layout?.layoutName}</p>
                              <div style="padding: 0px 20px 15px 20px; margin-top: 0px;">
                                  ${room?.stall?.stallConfig?.map((stall, stallIndex) =>`
                                  <p style="margin-top: 0px; font-size: 12px; margin-bottom: 5px; line-height: 1;"><span style="color:#000; font-weight: 700; color:#0061a6; line-height: 1;">Stall ${stallIndex+1}${stall?.type ? '(ADA)' : ''} </span>- <span style="font-weight: 600; line-height: 1;">Width:</span> ${stall?.totalStallWidth}"  <span style="font-weight: 600;">Door:</span> ${stall.doorOpening}"  <span style="font-weight: 600;">Door Swing:</span> ${stall.doorSwing?.name}
                                      </p>
                                      `).join('')}
                              </div>
                              
                          </div>
                          
                      </td>
                  </tr>
                  <tr>
                      <td colspan="2" width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
                          <div style=" padding: 13px; text-align: center; width:95%;  min-height: 140px; display: flex; align-items: center; justify-content: center;">
                              <img class="roomImage" src="${room.image_2D}" alt="pic" style="width:auto;height:380px;max-width:100%; filter: contrast(120%) brightness(100%);object-fit: contain; margin: 0 auto;"/>
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
                          <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; padding:10px 20px; border-radius: 10px; margin-top: 0px; ">
                              <ul style="font-size: 14px; margin: 0px;color:#fff;padding:0 0 0 15px;">
                              <li style="margin:0 0 3px 0;">All stall widths are to the centerline.</li>
                              <li style="margin:0 0 3px 0;">All stall depths are to the face.</li>
                              <li>All alcove depths are wall to wall.</li>
                              </ul>
                          </div>
                      </td>
                      <td width="50%" style="width: 50%;">
                         <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need something bigger?</h5>
                          <p style="margin-top: 5px;">No problem! Our partition experts will help you
                          customize your layout.</p>
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
              <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-8448178255" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
              <p style=" font-size:16px;      font-style: italic; margin-top: 5px;"><a href="mailto:cs@restroomstallsandall.com" style="color:#000;">cs@restroomstallsandall.com</a></p>
         </td>
      </tr>
      <tr>
      <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;border-radius: 30px; vertical-align: bottom;border: 1px solid #3d58a4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
               <tr>
                  <td colspan="2">
                       <h4 style="color:#fff; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation_no.slice(-6)}</h4>
                       <p style="margin-top: 5px; margin-bottom: 0px;color:#fff">Date: ${moment(createdAt).format('MM/DD/YY')} </p>
                  </td>
               </tr>
          </table>
      </td>
  </tr>
      <tr>
          <td colspan="2" style="padding-left: 0px;">
              <h5 style="color:#285fa1; font-size: 20px; line-height: 1; margin-top: 10px; margin-bottom: 0px;">Room: ${room.title}</h5>
              
          </td>
      </tr>
      <tr>
          <td colspan="2" style="padding-left: 0px;">
              <table width="100%" cellpadding="0" cellspacing="30" style="table-layout: fixed;">
                  <tr>
                      <td width="100%" style="width: 100%; vertical-align: top;" colspan="2">
                          <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
                              <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 7px 14px; margin-bottom: 0px; font-size: 15px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; margin-bottom: 0px;"> Urinal screens: ${room?.urinalScreen?.noOfUrinalScreens}</h4>
                              <div style="padding: 15px 20px 15px 20px; margin-top: 0px;">
                                  <p style="margin-top: 0px; font-size: 15px; margin-bottom: 4px; line-height: 1;"><span style="color:#000; font-weight: 700; color:#0061a6; line-height: 1;">Screen Depth </span>- ${room.urinalScreen?.urinalScreenConfig[0]?.screenDepth}"</p>
                              </div>
                          </div>
                          
                      </td>
                      </tr>
                      <tr>
                      <td colspan="2"  width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
                          <div style=" padding: 3px; text-align: center; width:97%;  ">
                              <img class="roomImage" src="${room.urinalScreen?.urinal_2D}" alt="pic" style="width:auto;height:420px; max-width:100%; filter: contrast(120%) brightness(100%);object-fit: contain;transform: scale(1) ;"/>
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
                          <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;padding:10px 20px; border-radius: 10px; margin-top: 0px;">
                         <ul style="font-size: 14px; margin: 0px;color:#fff;padding:0 0 0 15px;">
                              <li style="margin:0 0 3px 0;">All stall widths are to the centerline.</li>
                              <li style="margin:0 0 3px 0;">All stall depths are to the face.</li>
                              <li>All alcove depths are wall to wall.</li>
                              </ul>
                          </div>
                      </td>
                      <td width="50%" style="width: 50%;">
                          <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need something bigger?</h5>
                          <p style="margin-top: 4px;">No problem! Our partition experts will help you
                          customize your layout.</p>
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
    <td colspan="2" style="width:100%; padding: 10px; ">
        <img src="${process.env.URI}/uploads/images/Logo.png" alt="alt" style="width:150px" />
    </td>
</tr>


<tr>
    <td colspan="2" style="text-align: center;">
        <a style="margin-top: 20px;display: block;width: 100%;" href="https://youtu.be/8wErfrWcWOE?si=B3eXSFxPd4hbMBQE" target="_blank">
            <img src="${process.env.URI}/uploads/images/youtube-video-new.jpg" alt="logo" style="width:100%; height:220px;object-fit: contain;">
        </a>
    </td>
</tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 20px 20px; margin: 0 auto; table-layout: fixed; max-width: 1200px;print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/pdf_watermark.png');background-repeat: no-repeat;background-size: auto 100%;background-position: right top;">
  <tr>
      <td colspan="2" style="width:100%; text-align: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 12px; padding: 10px 25px;border: 1px solid #3d58a4;">
          <h4 style="font-size: 22px; color:#fff; font-weight: 900; margin-top: 0; margin-bottom: 0px;">Thank You for Choosing Us!</h4>
      </td>
  </tr>
  <tr>
      <td colspan="2" style="width: 100%;">
          <table width="70%" cellpadding="0" cellspacing="0" style="margin-top: 0px;margin-left:auto;margin-right:auto; vertical-align: top;">
               <tr>
                  <td style="width: 100%; display: flex; justify-content: center; align-items:center;">
                      <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 10px; vertical-align: top; text-align: center; border: 1px solid #e3e8ef; padding: 10px;  width:100%; border-radius: 10px;">
                          <tr>
                              <td colspan="6" style="width: 100%;">
                                  <h3 style="font-size: 21px; font-weight: 900; font-family:Verdana, Geneva, Tahoma, sans-serif; color:#285fa1; margin-bottom: 10px; margin-top: 0px;">Meet the Partition Experts</h3>
                                  <h6 style="color:#285fa1; font-size: 18px; margin-top: 5px; font-weight: 400; margin-bottom: 10px;">Real people. Fast answers. Expert guidance from quote through installation.</h6>
                              </td>
                           </tr>
                          <tr>
                              <td style="width: 15%;">
                                  <div>
                                  <a href="https://www.linkedin.com/in/jimwsouthard" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                      <img src="${process.env.URI}/uploads/images/Jim_Southard.png" alt="pic" style="margin-bottom: 10px; width:80px;height:80px;"/>
                                      <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px; font-size:10px;white-space: nowrap;">Jim Southard</h4>
                                      </a>
                                  </div>
                              </td>
                              <td style="width: 15%;">
                                  <div>
                                  <a href="https://www.linkedin.com/in/josh-williams-64a0815b" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                      <img src="${process.env.URI}/uploads/images/Josh_Williams.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                      <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Josh Williams
                                      </h4>
                                  </a>
                                  </div>
                              </td>
                              <td style="width: 15%;">
                                  <div>
                                  <a href="https://www.linkedin.com/in/jennifer-hollis-2068bb177" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                      <img src="${process.env.URI}/uploads/images/Jennifer_Hollis.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                      <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Jennifer Hollis</h4>
                                  </a>
                                  </div>
                              </td>
                              <td style="width: 15%;">
                              <div>
                              <a href="https://www.linkedin.com/in/peyton-cape-5b139b209" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                  <img src="${process.env.URI}/uploads/images/Peyton_Cape.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                  <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Peyton Cape
                                  </h4>
                                  </a>
                              </div>
                            </td>
                       
                          </tr>
                          <tr>
                              <td style="width:100%;" colspan="6">
                                 <table width="100%" cellpadding="0" cellspacing="10" style="text-align: center; margin:0 auto;border:none;">
                                  <tr>
                                  <td style="width: 7.5%;">&nbsp;</td>
                                    <td style="width: 15%;">
                                      <div>
                                      <a href="https://www.linkedin.com/in/travis-perdue-abb18182" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                          <img src="${process.env.URI}/uploads/images/Travis_Perdue.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Travis Perdue
                                          </h4>
                                      </a>
                                      </div>
                                    </td>
                                    <td style="width: 15%;">
                                      <div>
                                      <a href="https://www.linkedin.com/in/jim-artman-77a24820a" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                          <img src="${process.env.URI}/uploads/images/Jim_Artman.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                          <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Jim Artman
                                          </h4>
                                      </a>
                                      </div>
                                    </td>
                                    <td style="width: 15%;">
                                      <div>
                                        <a href="https://www.linkedin.com/in/courtney-underwood-8177a3131/" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                            <img src="${process.env.URI}/uploads/images/Courtney_Underwood.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Courtney Underwood
                                            </h4>
                                        </a>
                                      </div>
                                    </td>
                                    <td style="width: 7.5%;">&nbsp;</td>
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
          <p style="color:#000; font-size: 18px; margin-top: 10px; margin-bottom: 10px;">We are here to help. Call or email us today.</p>
       <h4 style="display: flex; align-items: center; justify-content: center; margin-top: 10px; margin-bottom: 10px;"><a href="tel:1-8448178255" style="color:#285fa1; font-weight: 900; text-decoration: none; font-size: 24px; font-family:Verdana, Geneva, Tahoma, sans-serif; font-style:italic">1-844-81-STALL</a><a href="mailto:cs@restroomstallsandall.com" style="font-size: 20px; color:#000; font-weight: 400; margin-left: 15px;">cs@restroomstallsandall.com</a></h4>
      </td>
  </tr>
</table></td></tr></table>`; 
return htmlContent;
}

async OrderPDFhtml(quotation_no,order_id,amount,phone_number,createdAt,materials,rooms,billing_address,color,installation,project_name,shipping_amount,tax_amount,total_amount){
  
  const htmlContent = `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif;print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/pdf_watermark_top.png');background-repeat: no-repeat;background-size:auto;background-position: left top;table-layout: fixed;"><tr><td><table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
  <tr>
      <td style="padding: 10px; text-align: left;">
           <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
      </td>
      <td style="padding: 10px; text-align: right;">
          <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-8448178255" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
          <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:cs@restroomstallsandall.com" style="color:#000;">cs@restroomstallsandall.com</a></p>
     </td>
  </tr>
  <tr>
      <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 30px; vertical-align: bottom;border: 1px solid #3d58a4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
               <tr>
                  <td colspan="2">
                       <h4 style="color:#fff; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Order ID #${order_id}</h4>
                       <p style="margin-top: 5px; margin-bottom: 0px;color:#fff">Date: ${moment(createdAt).format('MM/DD/YY')} </p>
                  </td>
               </tr>
          </table>
      </td>
     
  </tr>

  <tr>
    <td colspan="2" style="text-align: center; margin-top: 0px; ">
        <h4 style="font-size: 28px; color:#3d58a4; font-weight: 900; margin-bottom:20px; font-family:Verdana, Geneva, Tahoma, sans-serif; margin-top:30px;">Customer Details</h4>
        
        
    </td>
    
</tr>
<tr>
    <td colspan="2" width="100%" style="width: 100%;">
        <div class="table_box" style="margin-top: 5px;">
            <div style="display: flex; align-items: flex-start; width: 100%; justify-content: space-between;  flex-wrap: wrap; box-sizing: border-box;border: 1px solid #3d58a4; border-radius: 15px;background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;">
                
                <div style="padding:40px 0 40px 25px;min-height: 280px; text-align:left; width:50%; box-sizing: border-box;print-color-adjust: exact;  -webkit-print-color-adjust: exact;">
                    <div  style="color:#fff;display: flex; align-items: flex-start;    flex-direction: column;    justify-content: flex-start;gap:15px;">
                             <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Name:</span> ${billing_address.first_name} ${billing_address.last_name}</h4>
                             <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Email:</span> ${billing_address.email}</h4>
                             <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Phone:</span> ${phone_number}</h4>
                             <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Quote:</span> #${quotation_no}</h4>
                     </div>
                 </div>
                 
                 <div style="padding: 40px 25px 40px 0;min-height: 280px; text-align:center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; width:50%;box-sizing: border-box;" >
                    <div  style="color:#fff;display: flex; align-items: flex-start;    flex-direction: column;    justify-content: flex-start;gap:15px;">
                        <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Address:</span> ${billing_address.street_1}</h4>
                        <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">City:</span> ${billing_address.city}</h4>
                        <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">State:</span> ${billing_address.state}</h4>
                        <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Zip:</span> ${billing_address.zip}</h4>
                    </div>
                 </div> 
            </div>
        </div>

       
    </td>
    
</tr>
  <tr>
      <td colspan="2" style="text-align: center; margin-top: 0px; ">
          <h4 style="font-size: 28px; color:#3d58a4; font-weight: 900; margin-bottom: 20px; font-family:Verdana, Geneva, Tahoma, sans-serif; margin-top:30px;">Order Details</h4>
          
          
      </td>
      
  </tr>
  <tr>
      <td colspan="2" width="100%" style="width: 100%;">
          <div class="table_box" style="margin-top: 5px;">
              <div style="display: flex; align-items: flex-start; width: 100%; justify-content: space-between;  flex-wrap: wrap; box-sizing: border-box;border: 1px solid #3d58a4; border-radius: 15px;background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;">
                  
                  <div style="padding:40px 0 40px 25px;min-height: 280px; text-align:left; width:50%; box-sizing: border-box;print-color-adjust: exact;  -webkit-print-color-adjust: exact;">
                      <div  style="color:#fff;display: flex; align-items: flex-start;    flex-direction: column;    justify-content: flex-start;gap:15px;">
                               <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Project Name:</span> ${project_name}</h4>
                               <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Order:</span> #${order_id}</h4>
                               <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Quote Amount:</span> $${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}</h4>
                               <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Shipping Cost:</span> $${Number(shipping_amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}</h4>
                               <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Tax:</span> $${Number(tax_amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}</h4>
                               <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Order Total:</span> $${Number(total_amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}</h4>
                       </div>
                   </div>
                   ${materials.map(material => `
                   <div style="padding: 40px 25px 40px 0;min-height: 280px; text-align:center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; width:50%; box-sizing: border-box;" >
                        <div  style="color:#fff;display: flex; align-items: flex-start;    flex-direction: column;    justify-content: flex-start;gap:15px;">
                            <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Material:</span> ${material.name}</h4>
                            <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Color:</span> ${color}</h4>
                            <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Installation:</span> ${installation}</h4>
                        </div>
                   </div> 
                   `).join('')}
              </div>
          </div>
 
         
      </td>
      
  </tr>
  
 
 </table>
 ${rooms.map((room, index) => `
 <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px; margin-top: 40px;">
      <tr>
          <td style="padding: 10px; text-align: left;">
               <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
          </td>
          <td style="padding: 10px; text-align: right;">
              <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-8448178255" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
              <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:cs@restroomstallsandall.com" style="color:#000;">cs@restroomstallsandall.com</a></p>
         </td>
      </tr>
      <tr>
          <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 30px; vertical-align: bottom;border: 1px solid #3d58a4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                   <tr>
                      <td colspan="2">
                           <h4 style="color:#fff; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Order ID #${order_id}</h4>
                           <p style="margin-top: 5px; margin-bottom: 0px;color:#fff">Date: ${moment(createdAt).format('MM/DD/YY')} </p>
                      </td>
                   </tr>
              </table>
          </td>
         
      </tr>
      <tr>
          <td colspan="2" style="padding-left: 10px;">
              <h5 style="color:#285fa1; font-size: 20px; line-height: 1; margin-top: 10px; margin-bottom: 0px;">Room: ${room.title}</h5>
              
          </td>
      </tr>
      <tr>
          <td colspan="2" >
              <table width="100%" cellpadding="0" cellspacing="20" style="table-layout: fixed;">
                  <tr>
                      <td width="100%" style="width: 100%; vertical-align: top;" colspan="2">
                          <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
                              <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 7px 14px; margin-bottom: 0px; font-size: 15px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; margin-bottom: 0px;"> Stalls: ${room?.stall?.noOfStalls}</h4>
                             <p style="display: flex; align-items: center; font-size: 15px; width:100%; line-height: 1;padding-left:20px;"><img src="${process.env.URI}/uploads/images/layout.png" alt="pic" style="width: 17px; margin-right:10px;"/><span style="color:#000; font-weight: 500; font-weight: 700; line-height: 1;color:#0061a6;">Layout </span>- ${room.stall?.layout?.layoutName}</p>
                              <div style="padding: 0px 20px 15px 20px; margin-top: 0px;">
                                  ${room?.stall?.stallConfig?.map((stall, stallIndex) =>`
                                  <p style="margin-top: 0px; font-size: 12px; margin-bottom: 5px; line-height: 1;"><span style="color:#000; font-weight: 700; color:#0061a6; line-height: 1;">Stall ${stallIndex+1}${stall?.type ? '(ADA)' : ''} </span>- <span style="font-weight: 600; line-height: 1;">Width:</span> ${stall?.totalStallWidth}"  <span style="font-weight: 600;">Door:</span> ${stall.doorOpening}"  <span style="font-weight: 600;">Door Swing:</span> ${stall.doorSwing?.name}
                                      </p>
                                      `).join('')}
                              </div>
                              
                          </div>
                          
                      </td>
                  </tr>
                  <tr>
                      <td colspan="2" width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
                          <div style=" padding: 13px; text-align: center; width:95%;  min-height: 140px; display: flex; align-items: center; justify-content: center;">
                              <img class="roomImage" src="${room.image_2D}" alt="pic" style="width:auto;height:380px;max-width:100%; filter: contrast(120%) brightness(100%);object-fit: contain; margin: 0 auto;"/>
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
                          <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; padding:10px 20px; border-radius: 10px; margin-top: 0px; ">
                              <ul style="font-size: 14px; margin: 0px;color:#fff;padding:0 0 0 15px;">
                              <li style="margin:0 0 3px 0;">All stall widths are to the centerline.</li>
                              <li style="margin:0 0 3px 0;">All stall depths are to the face.</li>
                              <li>All alcove depths are wall to wall.</li>
                              </ul>
                          </div>
                      </td>
                      <td width="50%" style="width: 50%;">
                         <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need something bigger?</h5>
                          <p style="margin-top: 5px;">No problem! Our partition experts will help you
                          customize your layout.</p>
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
              <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-8448178255" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
              <p style=" font-size:16px;      font-style: italic; margin-top: 5px;"><a href="mailto:cs@restroomstallsandall.com" style="color:#000;">cs@restroomstallsandall.com</a></p>
         </td>
      </tr>
      <tr>
      <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;border-radius: 30px; vertical-align: bottom;border: 1px solid #3d58a4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
               <tr>
                  <td colspan="2">
                       <h4 style="color:#fff; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Order ID #${order_id}</h4>
                       <p style="margin-top: 5px; margin-bottom: 0px;color:#fff">Date: ${moment(createdAt).format('MM/DD/YY')} </p>
                  </td>
               </tr>
          </table>
      </td>
  </tr>
      <tr>
          <td colspan="2" style="padding-left: 0px;">
              <h5 style="color:#285fa1; font-size: 20px; line-height: 1; margin-top: 10px; margin-bottom: 0px;">Room: ${room.title}</h5>
              
          </td>
      </tr>
      <tr>
          <td colspan="2" style="padding-left: 0px;">
              <table width="100%" cellpadding="0" cellspacing="30" style="table-layout: fixed;">
                  <tr>
                      <td width="100%" style="width: 100%; vertical-align: top;" colspan="2">
                          <div style="border: 1px solid #e3e8ef;  border-radius: 10px; font-weight: 400; ">
                              <h4 style="color:#000; display: flex; align-items: center; margin-top: 0; border-bottom: 1px solid #e3e8ef; padding: 7px 14px; margin-bottom: 0px; font-size: 15px;"><img src="${process.env.URI}/uploads/images/lenght.png" alt="pic" style="width: 20px; margin-right: 5px; margin-bottom: 0px;"> Urinal screens: ${room?.urinalScreen?.noOfUrinalScreens}</h4>
                              <div style="padding: 15px 20px 15px 20px; margin-top: 0px;">
                                  <p style="margin-top: 0px; font-size: 15px; margin-bottom: 4px; line-height: 1;"><span style="color:#000; font-weight: 700; color:#0061a6; line-height: 1;">Screen Depth </span>- ${room.urinalScreen?.urinalScreenConfig[0]?.screenDepth}"</p>
                              </div>
                          </div>
                          
                      </td>
                      </tr>
                      <tr>
                      <td colspan="2"  width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
                          <div style=" padding: 3px; text-align: center; width:97%;  ">
                              <img class="roomImage" src="${room.urinalScreen?.urinal_2D}" alt="pic" style="width:auto;height:420px;max-width:100%; filter: contrast(120%) brightness(100%);object-fit: contain;transform: scale(1) ;"/>
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
                          <div style="display: flex; align-items: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;padding:10px 20px; border-radius: 10px; margin-top: 0px;">
                         <ul style="font-size: 14px; margin: 0px;color:#fff;padding:0 0 0 15px;">
                              <li style="margin:0 0 3px 0;">All stall widths are to the centerline.</li>
                              <li style="margin:0 0 3px 0;">All stall depths are to the face.</li>
                              <li>All alcove depths are wall to wall.</li>
                              </ul>
                          </div>
                      </td>
                      <td width="50%" style="width: 50%;">
                          <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need something bigger?</h5>
                          <p style="margin-top: 4px;">No problem! Our partition experts will help you
                          customize your layout.</p>
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
    <td colspan="2" style="width:100%; padding: 10px; ">
        <img src="${process.env.URI}/uploads/images/Logo.png" alt="alt" style="width:150px" />
    </td>
</tr>


<tr>
    <td colspan="2" style="text-align: center;">
        <a style="margin-top: 20px;display: block;width: 100%;" href="https://youtu.be/8wErfrWcWOE?si=B3eXSFxPd4hbMBQE" target="_blank">
            <img src="${process.env.URI}/uploads/images/youtube-video-new.jpg" alt="logo" style="width:100%; height:220px;object-fit: contain;">
        </a>
    </td>
</tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 20px 20px; margin: 0 auto; table-layout: fixed; max-width: 1200px;print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/pdf_watermark.png');background-repeat: no-repeat;background-size: auto 100%;background-position: right top;">
  <tr>
      <td colspan="2" style="width:100%; text-align: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 12px; padding: 10px 25px;border: 1px solid #3d58a4;">
          <h4 style="font-size: 22px; color:#fff; font-weight: 900; margin-top: 0; margin-bottom: 0px;">Thank You for Choosing Us!</h4>
      </td>
  </tr>
  <tr>
      <td colspan="2" style="width: 100%;">
          <table width="70%" cellpadding="0" cellspacing="0" style="margin-top: 0px;margin-left:auto;margin-right:auto; vertical-align: top;">
               <tr>
                  <td style="width: 100%; display: flex; justify-content: center; align-items:center;">
                      <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 10px; vertical-align: top; text-align: center; border: 1px solid #e3e8ef; padding: 10px;  width:100%; border-radius: 10px;">
                          <tr>
                              <td colspan="6" style="width: 100%;">
                                  <h3 style="font-size: 21px; font-weight: 900; font-family:Verdana, Geneva, Tahoma, sans-serif; color:#285fa1; margin-bottom: 10px; margin-top: 0px;">Meet the Partition Experts</h3>
                                  <h6 style="color:#285fa1; font-size: 18px; margin-top: 5px; font-weight: 400; margin-bottom: 10px;">Real people. Fast answers. Expert guidance from quote through installation.</h6>
                              </td>
                           </tr>
                          <tr>
                              <td style="width: 15%;">
                                  <div>
                                  <a href="https://www.linkedin.com/in/jimwsouthard" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                      <img src="${process.env.URI}/uploads/images/Jim_Southard.png" alt="pic" style="margin-bottom: 10px; width:80px;height:80px;"/>
                                      <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px; font-size:10px;white-space: nowrap;">Jim Southard</h4>
                                      </a>
                                  </div>
                              </td>
                              <td style="width: 15%;">
                                  <div>
                                  <a href="https://www.linkedin.com/in/josh-williams-64a0815b" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                      <img src="${process.env.URI}/uploads/images/Josh_Williams.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                      <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Josh Williams
                                      </h4>
                                  </a>
                                  </div>
                              </td>
                             
                              <td style="width: 15%;">
                                  <div>
                                  <a href="https://www.linkedin.com/in/jennifer-hollis-2068bb177" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                      <img src="${process.env.URI}/uploads/images/Jennifer_Hollis.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                      <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Jennifer Hollis</h4>
                                  </a>
                                  </div>
                              </td>
                              <td style="width: 15%;">
                              <div>
                              <a href="https://www.linkedin.com/in/peyton-cape-5b139b209" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                  <img src="${process.env.URI}/uploads/images/Peyton_Cape.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                  <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Peyton Cape</h4>
                                  </a>
                              </div>
                            </td>
                          </tr>
                          <tr>
                              <td style="width:100%;" colspan="6">
                                 <table width="100%" cellpadding="0" cellspacing="10" style="text-align: center; margin:0 auto;border:none;">
                                  <tr>
                                    <td style="width: 7.5%;">&nbsp;</td>
                                    <td style="width: 15%;">
                                      <div>
                                        <a href="https://www.linkedin.com/in/travis-perdue-abb18182" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                            <img src="${process.env.URI}/uploads/images/Travis_Perdue.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Travis Perdue
                                            </h4>
                                        </a>
                                      </div>
                                    </td>
                                    <td style="width: 15%;">
                                      <div>
                                        <a href="https://www.linkedin.com/in/jim-artman-77a24820a" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                            <img src="${process.env.URI}/uploads/images/Jim_Artman.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Jim Artman</h4>
                                        </a>
                                      </div>
                                    </td>
                                    <td style="width: 15%;">
                                      <div>
                                        <a href="https://www.linkedin.com/in/courtney-underwood-8177a3131/" style="text-decoration: none;display: inline-block;color:#285fa1;">
                                            <img src="${process.env.URI}/uploads/images/Courtney_Underwood.png" alt="pic" style="margin-bottom: 10px;width:80px;height:80px;"/>
                                            <h4 style="margin-top: 0px; color:#285fa1; margin-bottom: 5px;font-size:10px;white-space: nowrap;">Courtney Underwood
                                            </h4>
                                        </a>
                                      </div>
                                    </td>
                                    <td style="width: 7.5%;">&nbsp;</td>
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
       <h4 style="display: flex; align-items: center; justify-content: center; margin-top: 10px; margin-bottom: 10px;"><a href="tel:1-8448178255" style="color:#285fa1; font-weight: 900; text-decoration: none; font-size: 24px; font-family:Verdana, Geneva, Tahoma, sans-serif; font-style:italic">1-844-81-STALL</a><a href="mailto:cs@restroomstallsandall.com" style="font-size: 20px; color:#000; font-weight: 400; margin-left: 15px;">cs@restroomstallsandall.com</a></h4>
      </td>
  </tr>
</table></td></tr></table>`; 
 return htmlContent;
 }





async colorAndtextures(req, res) {
    try {
      const data = await Color.find();
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

async materials(req,res){
  try {
    const data = await MasterSetting.findOne(
      { key: 'materials' }
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

async formatPhoneNumber(number) {
  let cleaned = number.toString().replace(/\D/g, '');
  if (cleaned.length !== 10) return number; // Return original if not 10 digits
  return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
}


async abandoned(req, res) {
  try {
    const { type, id } = req.body.data;

    if (type === 'cart' && id) {
      const cartResponse = await axios.get(
        `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}/v3/carts/${id}`,
        {
          headers: {
            'X-Auth-Token': process.env.BIGCOMMERCE_API_TOKEN,
            'Accept': 'application/json',
          },
        }
      );

      const cartData = cartResponse.data?.data;

      if (cartData && cartData.id) {
        // Check if abandoned order already exists and mail not sent
        const existing = await abandonedOrder.findOne({
          cart_id: cartData.id,
        });

        if (!existing) {
          // Create new abandoned order record
          const abandoned_orders = new abandonedOrder({
            cart_id: cartData.id,
            email: cartData?.email,
            cart_amount: cartData?.base_amount,
            line_items: cartData?.line_items,
          });

         await abandoned_orders.save();

         // Schedule email job
          await agenda.schedule("in 5 seconds", "send_abandoned_order_mail", {
            cartId: cartData.id,
            cart_amount: cartData?.base_amount
          });

          return res.status(200).json({
            success: true,
            cartData
          });
        } else {
          return res.status(200).json({
            success: false,
            message: "Email already sent or job already scheduled for this cart."
          });
        }
      } else {
        throw new Error('Cart ID not found in order data');
      }
    } else {
      throw new Error('Invalid webhook payload');
    }
  } catch (error) {
    console.error('Error processing order:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async checkZipCode(req,res){
  try {
    const { zip_code } = req.body;
    const fixedZip = process.env.SOURCE_ZIP_CODE;
    let installation_setup_setting = await Setting.findOne(
      { step: "installation_setup" },
      { step: 1, config: 1, _id: 1 }
    );
    let max_distance = parseFloat(installation_setup_setting?.config?.max_distance_limit);
    if (!zip_code) {
      return res.status(400).json({
        success: false,
        message: "zip_code is required",
      });
    }
    const distance = await this.getDistanceInMiles(zip_code, fixedZip);
    const is_within_max = distance <= max_distance;
      return res.status(200).json({
        success: is_within_max,
        is_within_max_distance: is_within_max,
        distance:distance,
        max_distance:max_distance
      });
   
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

}



async  getDistanceInMiles(zip1, zip2) {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${zip1},US&destinations=${zip2},US&key=${process.env.GOOGLE_MAP_API_KEY}`;
    

    const response = await axios.get(url);

    if (
      response.data.status !== "OK" ||
      response.data.rows[0].elements[0].status !== "OK"
    ) {
      console.error("Google API error response:", response.data);
      throw new Error("Failed to fetch distance from Google API");
    }

    const distanceText = response.data.rows[0].elements[0].distance.text;
    const distanceInMiles = parseFloat(distanceText.replace(/[^\d.]/g, ""));
    return distanceInMiles;
  } catch (err) {
    throw new Error("Google Distance Matrix API request failed");
  }
  
}

async  calculateInstallationPrice(data) {
  if (typeof data.is_within_max_distance !== 'undefined' && data.is_within_max_distance === true) {
    let installation_setup_setting = await Setting.findOne(
      { step: "installation_setup" },
      { step: 1, config: 1, _id: 1 }
    );
    let distance = parseFloat(data.distance);
    const totalStalls = data?.submittedData?.rooms.reduce((sum, room) => {
      return sum + (room.stall?.noOfStalls || 0);
    }, 0);
    const totalScreens =data?.submittedData?.rooms.reduce((screenSum, room) => {
      return screenSum + (room.urinalScreen?.noOfUrinalScreens || 0);
    }, 0);
   
    let charge_per_stalls = parseFloat(installation_setup_setting.config.charge_per_stalls);
    let charge_per_screens = parseFloat(installation_setup_setting.config.charge_per_screens);
    let charge_per_mile = parseFloat(installation_setup_setting.config.charge_per_mile);
    let charge_per_hotel_night = parseFloat(installation_setup_setting.config.charge_per_hotel_night);
    let charge_per_diem = parseFloat(installation_setup_setting.config.charge_per_diem);
    var price = 0;
    if(distance <= 175){
      price = charge_per_diem + (charge_per_mile * distance ) + (charge_per_stalls * totalStalls) + (charge_per_screens * totalScreens)
    }else if(distance > 175 && distance <= 300){
      price = (charge_per_diem * 2)  + charge_per_hotel_night  + (charge_per_mile * distance ) + (charge_per_stalls * totalStalls) + (charge_per_screens * totalScreens)
    }else if(distance > 300 && distance <= 500){
      price = (charge_per_diem * 3) + (charge_per_hotel_night * 2)  + (charge_per_mile * distance ) + (charge_per_stalls * totalStalls) + (charge_per_screens * totalScreens)
    }

    if (totalStalls >= 10) {
      price += charge_per_hotel_night + charge_per_diem; // One more night + one more diem
    }
  return price; 
}else{
  return null;
}
}

async syncToMonday(req, res) {
  try {
    const events = Array.isArray(req.body) ? req.body : [];

    for (const event of events) {
      const {
        subscriptionType,
        objectId,
        propertyName,
        propertyValue
      } = event;

      const finalStages = [
        process.env.SMARTBID_SCORE_FINAL_STAGE_ID,
        process.env.QUOTE_TOOL_FINAL_STAGE_ID
      ];
      console.log(finalStages,propertyValue);

      /**
       * 1️⃣ Deal Stage Change → Create Monday Item
       */
      if (
        subscriptionType === "deal.propertyChange" &&
        propertyName === "dealstage" &&
        finalStages.includes(propertyValue)
      ) {
        console.log("✔ Deal moved to target stage:", objectId);
        await this.createMondayItemForDeal(objectId);
        continue;
      }

      /**
       * 2️⃣ Deal Created → Sync to DB (Only specific pipeline)
       */
      if (subscriptionType === "deal.creation") {
        console.log("✔ New deal created:", objectId);

        const deal = await this.getHubspotDealDetails(objectId);
        if (!deal || !deal.properties) continue;

        // ✅ Only sync deals from required pipeline
        // if (deal.properties.pipeline !== process.env.SMARTBID_HIGH_SCORE_PIPELINE_ID) {
        //   continue;
        // }

          // ✅ Allow only specific pipelines
        const allowedPipelines = [
          process.env.SMARTBID_HIGH_SCORE_PIPELINE_ID,
          process.env.QUOTE_TOOL_PIPELINE_ID
        ];

        if (!allowedPipelines.includes(deal.properties.pipeline)) {
          continue;
        }

        // ❗ Prevent duplicate inserts
        const alreadyExists = await Bid.findOne({
          hubspotLeadId: deal.id
        });

        if (alreadyExists) {
          console.log("⚠ Deal already synced:", deal.id);
          continue;
        }
        const data = {
          opportunities_id: deal.properties?.opportunities_id ?? null,
        
          LinkURL: deal.properties?.link_url ?? null,
        
          client: {
            company: {
              id: deal.associations?.companies?.results?.[0]?.id ?? null,
              name: deal.properties?.company_name ?? null
            },
            lead: {
              id: deal.associations?.contacts?.results?.[0]?.id ?? null,
              email: null,
              firstName: null,
              lastName: null,
              phoneNumber: ""
            },
            office: null
          },
        
          hubspotLeadId: deal.id ?? null,
          hubspotContactId:
            deal.associations?.contacts?.results?.[0]?.id ?? null,
        
          name: deal.properties?.dealname ?? null,
          tradeName: deal.properties?.trade_name ?? null,
          projectInformation: deal.properties?.project_information ?? null,
          projectSize: deal.properties?.project_size ?? null,
          smartBidScore: deal.properties?.smart_bid_score ?? null,
        
          deadline:
            deal.properties?.deadline
              ? new Date(deal.properties.deadline)
              : null,
        
          dueAt:
            deal.properties?.due_at
              ? new Date(deal.properties.due_at)
              : null,
        
          createdAt: deal.createdAt ? new Date(deal.createdAt) : new Date(),
          updatedAt: deal.updatedAt ? new Date(deal.updatedAt) : new Date(),
        
          deleted: false,
          submissionState: "UNDECIDED"
        };
        
        await Bid.create(data);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.sendStatus(500);
  }
}



async createMondayItemForDeal(hubspotDealId) {
  try {

    const bid = await Bid.findOne({ hubspotLeadId: hubspotDealId });
    // 1️⃣ Fetch deal directly from HubSpot
    const deal = await this.getHubspotDealDetails(hubspotDealId);

    if (!deal || !deal.properties) {
      console.log("❌ No deal data received from HubSpot");
      return;
    }

    const props = deal.properties;

    // 2️⃣ Prepare column values for Monday
    const columnValues = {
      // Owner / Person column
      person: {
        personsAndTeams: [
          {
            id: Number(process.env.MONDAY_OWNER_ID),
            kind: "person",
          },
        ],
      },

      // Install Date (deadline)
      date4: props.deadline
        ? { date: props.deadline.split("T")[0] }
        : null,

      // Sales Order #
      text_mkz5kwbx: props.opportunities_id ?? "",

      // Client Name
      text_mkz5b0g0: props.client ?? "",

      // Type
      text_mkz5kc6z: bid?.opportunities_id
      ? "BUILDINGCONNECTED"
      : "MANUAL",

      // Site Address
      text_mkz5y50q: props.location ?? "",

      // Site Contact Name
      text_mkz586r: props.client ?? "",

      // Site Contact #
      text_mkz5atqk: "", // Not available from HubSpot deal
    };

    // Remove null values (Monday hates nulls)
    Object.keys(columnValues).forEach(
      key => columnValues[key] === null && delete columnValues[key]
    );

    // 3️⃣ Create Monday Item
    const itemName = `${props.dealname || "New Deal"}`;

    const createItemQuery = `
      mutation {
        create_item(
          board_id: ${process.env.MONDAY_BOARD_ID},
          group_id: "${process.env.MONDAY_GROUP_ID}",
          item_name: "${itemName.replace(/"/g, '\\"')}",
          column_values: ${JSON.stringify(JSON.stringify(columnValues))}
        ) {
          id
        }
      }
    `;

    const createItemRes = await axios.post(
      "https://api.monday.com/v2",
      { query: createItemQuery },
      {
        headers: {
          Authorization: process.env.MONDAY_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const itemId = createItemRes.data.data.create_item.id;
    console.log("✔ Monday item created:", itemId);

    // 4️⃣ Add Update / Description
    const updateBody = `
Project Name: ${props.dealname || "N/A"}
Project Size: ${props.project_size || "N/A"}
Project Information: ${props.project_information || "N/A"}
Client Name: ${props.client || "N/A"}
Trade Name: ${props.trade_name || "N/A"}
Smart Bid Score: ${props.smart_bid_score || "N/A"}
Link: ${props.link_url || "N/A"}
Created At: ${deal.createdAt}
    `
      .trim()
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");

    const updateQuery = `
      mutation {
        create_update(
          item_id: ${itemId},
          body: "${updateBody}"
        ) {
          id
        }
      }
    `;

    await axios.post(
      "https://api.monday.com/v2",
      { query: updateQuery },
      {
        headers: {
          Authorization: process.env.MONDAY_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✔ Monday update added");

    if (bid) {
      await Bid.updateOne(
        { hubspotLeadId: hubspotDealId },
        { $set: { mondayItemCreated: true } }
      );
    }

  } catch (err) {
    console.error("❌ Monday API Error:", err.response?.data || err);
  }
}


async getHubspotDealDetails(dealId){
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
  const hubspotURL = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;

  const response = await axios.get(hubspotURL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    params: {
      properties: [
        "link_url",
        "dealstage",
        "pipeline",
        "client",
        "company_name",
        "document_url",
        "dealname",
        "deadline",
        "created_at",
        "updated_at",
        "due_at",
        "project_information",
        "project_size",
        "smart_bid_score",
        "trade_name"
      ].join(","),

      associations: "contacts,companies"
    }
  });
  return response.data;
}






}

module.exports = FrontendController;