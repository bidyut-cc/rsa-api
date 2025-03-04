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
          price_details: priceByProductAndRoom[productName].rooms, // detailed price per room
        };
      });
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
      quotation.is_mail_send = false;
      quotation.is_deal_create = false;

      if (!req.body.hasOwnProperty("isTest") || !req.body.isTest) {
        await agenda.schedule("in 5 seconds", "create_zendesk_lead", {
          quotationId: quotation._id,
        });
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
     // executablePath: '/usr/bin/chromium-browser',
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
        const oneMinuteAgo = new Date(Date.now() - 30 * 1000); // 30 seconds ago

        const existingOrder = await Order.findOne({
          quotation_id: id,
          createdAt: { $gt: oneMinuteAgo },
        });
    
        if (existingOrder) {
          return res.status(404).json({
            status: false,
            message: "Your other request is being processed. Please wait for thirty seconds.",
          });
        }
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
      const bigCommerceCart = await this.createBigCommerceCart(data.materials[0]);
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

/**
 * Creates a BigCommerce cart for the specified materials.
 *
 * @param {object} materials - The materials data containing details for the cart.
 * @param {number} materials.id - The material ID.
 * @param {number} materials.price - The price of the material.
 * @returns {Promise<object>} A promise resolving to an object containing the cart creation status and data or an error message.
 *
 * @description
 * - Fetches the material-to-product mapping configuration from the `Setting` collection.
 * - Validates the presence of the mapping configuration and the corresponding product ID for the material ID.
 * - Constructs a cart data payload with the product ID, price, and a redirect URL for checkout.
 * - Sends a POST request to the BigCommerce API to create the cart.
 * - On success:
 *   - Returns an object with `status: true` and the BigCommerce API response containing the cart and redirect URL.
 * - On failure:
 *   - Logs the error to the console.
 *   - Returns an object with `status: false` and a failure message.
 *
 * @throws
 * - Throws an error if the mapping document or configuration is missing or if no product ID is found for the material ID.
 *
 * @example
 * const materials = { id: 123, price: 299.99 };
 * const cart = await createBigCommerceCart(materials);
 * if (cart.status) {
 *   console.log('Cart created successfully:', cart.data);
 * } else {
 *   console.error('Error creating cart:', cart.message);
 * }
 */

  async createBigCommerceCart(materials) {
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
   
      const cartData = {
        "customer_id": 0,
        "line_items": [
          {
            "quantity": 1,
            "product_id": 111,
            "list_price": materials.price,
           // "name": "Restroom Stall"
          }
        ],
      //   "redirect_urls": {
      //     "return_url": process.env.BIGCOMMERCE_RETURN_URL
      // }
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

async order(req, res){
   

    let bigcommerceData = new BigcommerceOrderResponse;
    bigcommerceData.order_id=123
    bigcommerceData.cart_id=12345
    bigcommerceData.response=req.body
    await bigcommerceData.save();
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
        { submittedData: 1, roomData: 1, materials:1, _id: 1,quotation_no:1, phone_number:1, createdAt:1 }
      );
      const totalStalls = quotation.submittedData.rooms.reduce((sum, room) => sum + (room.stall?.noOfStalls || 0), 0);

    const totalUrinalScreens = quotation.submittedData.rooms.reduce((sum, room) => {
        return sum + (room.hasUrinalScreens ? (room.urinalScreen?.noOfUrinalScreens || 0) : 0);
    }, 0);
      const htmlContent = await this.QuotationPDFhtml(quotation._id,quotation.quotation_no,quotation.createdAt,quotation.phone_number,quotation.materials,quotation.submittedData.rooms,totalStalls,totalUrinalScreens);
      const pdfBuffer = await this.generatePDF(htmlContent); // Ensure this is called correctly
      res.status(200).json({
        status: true,
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

async updateDeal(id,color) {
  try {
      const dealResponse = await axios.put(
        `${process.env.ZENDESK_SELL_API_URL}/deals/${id}`,// Use the provided URL structure
          {
              data: {
                  stage_id: Number(process.env.ZENDESK_DEAL_FINAL_STAGE_ID), // Replace with the desired stage ID
                  "custom_fields": {
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
        `Stall ${index + 1}${stall?.type ? ' (ADA)' : ''} - Width: ${stall.stallWidth}"  Door: ${stall.doorOpening}"  Door Swing: ${stall.doorSwing.name}`
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
Room ${id}
Room Name: #${id}. ${title}
Stalls Details : 
Total : ${noOfStalls} Stalls
${stallsDetails}

Layout- ${layoutDirection}${urinalDetails}
`;
}

async QuotationPDFhtml(quotation_id,quotation_no,createdAt,phone_number,materials,rooms,totalStalls,totalUrinalScreens){
  const formattedPhone = await this.formatPhoneNumber(phone_number);
  const htmlContent = `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif;print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/pdf_watermark_top.png');background-repeat: no-repeat;background-size:auto;background-position: left top;table-layout: fixed;"><tr><td><table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
  <tr>
      <td style="padding: 10px; text-align: left;">
           <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
      </td>
      <td style="padding: 10px; text-align: right;">
          <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-8448178255" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
          <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
     </td>
  </tr>
  <tr>
      <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 30px; vertical-align: bottom;border: 1px solid #3d58a4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
               <tr>
                  <td colspan="2">
                       <h4 style="color:#fff; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation_no}</h4>
                       <p style="margin-top: 5px; margin-bottom: 0px;color:#fff">Date: ${moment(createdAt).format('MM/DD/YY')} </p>
                  </td>
               </tr>
          </table>
      </td>
     
  </tr>
  <tr>
      <td colspan="2" style="text-align: center; margin-top: 0px; ">
          <h4 style="font-size: 28px; color:#3d58a4; font-weight: 900; margin-bottom: 10px; font-family:Verdana, Geneva, Tahoma, sans-serif; margin-top: 10px;">Review your Pricing Options</h4>
          <div style="display: flex; align-items: center; justify-content:center; position: relative;">
           <p></p>
            <a href="${process.env.QUOTATION_PDF_LINK_URL}?id=${quotation_id}&abandoned=1" style="color:#fff; font-size: 12px; line-height: 18px; border: 1px solid #000; font-family: Verdana, Geneva, Tahoma, sans-serif; border-radius: 5px; padding: 6px 8px; text-decoration: none; margin-left: 0px; position: absolute; right: 0;background-color: #4e843d;">Return to Quote Builder</a>
          </div>
          
      </td>
      
  </tr>
  <tr>
      <td colspan="2" width="100%" style="width: 100%;">
          <div class="table_box" style="margin-top: 5px;">
              <div style="display: flex; align-items: center; width: 100%; justify-content: space-between;  flex-wrap: wrap; box-sizing: border-box; gap: 20px;">
                  ${materials.map(material => `
                  <div style="padding: 10px 20px 10px; text-align:left; border: 1px solid #3d58a4; border-radius: 15px;  width:48%; box-sizing: border-box;print-color-adjust: exact;  -webkit-print-color-adjust: exact;background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;">
                      <div width="100%"  >
                          <div style="display: flex; align-items: center;">
                           <div  style="width: 25% !important; margin-bottom: 0px;">
                               <img src="${material.src}" alt="pic" style="width:100%"/>
                           </div>
                           <div  style="width: 75% !important; padding: 0px 20px 5px; margin-bottom: 0px !important;color:#fff;">
                               <h4 style="color:#fff; font-size: 16px; font-weight: 700; margin-bottom:0; margin-top: 5px;">${material.name}</h4>
                               <h6 style="font-size: 14px; font-weight: 400; margin-top: 0; margin-bottom: 0;">3 years warranty</h6>
                               <h5 style="font-size:20px;  margin-top:4px;margin-bottom:4px;">$${Number(material.price).toLocaleString("en-US", { maximumFractionDigits: 0 })}</h5>
                       
                               <div>
                                  <span style="color:#fff;font-weight: 400; font-size: 11px; margin-top: 3px; margin-bottom: 3px;display: inline-block;vertical-align: top;">
                                  ${rooms.length > 0 ? `${rooms.length} Room${rooms.length > 1 ? 's' : ''}` : ''} 
                                  </span>
                                  <span style="color:#fff;font-weight: 400; font-size: 11px; margin-top: 3px; margin-bottom: 3px;display: inline-block;vertical-align: top;">
                                  ${totalStalls > 0 ? `${totalStalls} Stall${totalStalls > 1 ? 's' : ''}` : ''}
                                   </span>
                                  <span style="color:#fff;font-weight: 400;display:block; font-size: 11px; margin-top: 3px; margin-bottom: 0;">
                                  ${totalUrinalScreens > 0 
                                    ? `${totalUrinalScreens} Urinal Screen${totalUrinalScreens > 1 ? 's' : ''}` 
                                    : 'No Urinal Screens'}
                                </span>
                               </div>
                             
                               
                               
                           </div>
       
                          </div>
                          <div>
                             
                                  
                                       <div style="width:100%;">
                                       <p style="margin-top:0; line-height:1.4; margin-bottom: 7px; font-size: 10px; color:#fff; text-align:center;">Our Team will Confirm your Order Details at: <span style="cursor: default;    pointer-events: none;">${formattedPhone}</span></p>
                                          <div style="text-align: right; width: 100%;">
                                              <a href="${process.env.QUOTATION_PAYMENT_URL}?id=${quotation_id}&material_id=${material.id}" style="text-decoration: none; color:#000; padding: 4px 10px; border:1px solid #feda15; border-radius: 10px; width: 96%; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 0px; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-color: #feda15;"><img src="${process.env.URI}/uploads/images/cart.png" alt="pc" style="width:20px; margin-right: 5px;"/> Buy Now</a>
                                          </div>
                                         <p style="margin-top:7px; line-height: 1; margin-bottom: 0px; font-size:9px; color:#fff; text-align:center;">Shipped in 4-6 business days</p>

                                       </div>
                                  
                              
                           
                          </div>
                      </div>
                   </div>
                   `).join('')}
                   <div style="padding: 10px 40px; text-align:center; border: 1px solid #e4e8ef; border-radius: 15px;  print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;width:48%; box-sizing: border-box; min-height: 200px;" >
                      <p style="color:#fff; font-size:16px; line-height: 1.3; text-align: left; padding:0; margin-top: 5px;font-weight: 700;    margin-bottom: 10px;">What's included in my order?</p>
                      <ul style="color:#fff; font-size: 13px; line-height: 1.3; text-align: left; padding:0 0 0 15px;    margin: 0;">
                        <li style="margin:0 0 4px 0;">Prices include Shipping for all order components: doors, panels, pilasters, brackets, anchors, and screws.</li>
                        <li style="margin:0 0 4px 0;">Sales tax added at checkout.</li>
                        <li style="margin:0 0 4px 0;">Availability may change. </li>
                        <li style="margin:0 0 0 0;">Orders are subject to review by RSA.</li>
                      </ul>
                   </div> 
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
              <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
         </td>
      </tr>
      <tr>
          <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 30px; vertical-align: bottom;border: 1px solid #3d58a4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                   <tr>
                      <td colspan="2">
                           <h4 style="color:#fff; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation_no}</h4>
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
                                  <p style="margin-top: 0px; font-size: 12px; margin-bottom: 5px; line-height: 1;"><span style="color:#000; font-weight: 700; color:#0061a6; line-height: 1;">Stall ${stallIndex+1}${stall?.type ? '(ADA)' : ''} </span>- <span style="font-weight: 600; line-height: 1;">Width:</span> ${stall.stallWidth}"  <span style="font-weight: 600;">Door:</span> ${stall.doorOpening}"  <span style="font-weight: 600;">Door Swing:</span> ${stall.doorSwing?.name}
                                      </p>
                                      `).join('')}
                              </div>
                              
                          </div>
                          
                      </td>
                  </tr>
                  <tr>
                      <td colspan="2" width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
                          <div style=" padding: 13px; text-align: center; width:95%;  min-height: 140px; display: flex; align-items: center; justify-content: center;">
                              <img src="${room.image_2D}" alt="pic" style="width:auto;height:380px;max-width:100%; margin: 0 auto;"/>
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
                         <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need Something Bigger?</h5>
                          <p style="margin-top: 5px;">No problem! Our Partition Experts will help you Customize your Layout.</p>
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
              <p style=" font-size:16px;      font-style: italic; margin-top: 5px;"><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
         </td>
      </tr>
      <tr>
      <td colspan="2" style="padding: 3px 30px; text-align: left; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;border-radius: 30px; vertical-align: bottom;border: 1px solid #3d58a4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
               <tr>
                  <td colspan="2">
                       <h4 style="color:#fff; font-size:16px; line-height: 1; font-weight: 600; margin-bottom: 6px; margin-top: 6px;">Quote Number #${quotation_no}</h4>
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
                              <img src="${room.urinalScreen?.urinal_2D}" alt="pic" style="width:auto;height:420px;max-width:100%;transform: scale(1) ;"/>
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
                          <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need Something Bigger?</h5>
                          <p style="margin-top: 4px;">No problem! Our Partition Experts will help you Customize your Layout.</p>
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
        <a style="margin-top: 200px;display: block;width: 100%;" href="https://youtu.be/9gSqLqj7oqU?si=yvZ8bwE0Qv2P-ZiM" target="_blank">
            <img src="${process.env.URI}/uploads/images/youtube-video.png" alt="logo" style="width:100%">
        </a>
    </td>
</tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 20px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/pdf_watermark.png');background-repeat: no-repeat;background-size: auto 100%;background-position: right top;">
  <tr>
      <td colspan="2" style="width:100%; padding: 10px; ">
          <img src="${process.env.URI}/uploads/images/Logo.png" alt="alt" style="width:150px" />
      </td>
  </tr>
  <tr>
      <td colspan="2" style="width:100%; text-align: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 12px; padding: 10px 25px;border: 1px solid #3d58a4;">
          <h4 style="font-size: 22px; color:#fff; font-weight: 900; margin-top: 0; margin-bottom: 0px;">Thank You for Choosing Us!</h4>
      </td>
  </tr>
  <tr>
      <td colspan="2" style="width: 100%;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 0px; vertical-align: top;">
              
               <tr>
                  <td style="width: 100%; display: flex; justify-content: center; align-items:center;">
                      <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 10px; vertical-align: top; text-align: center; border: 1px solid #e3e8ef; padding: 10px;  width:100%; border-radius: 10px;">
                          <tr>
                              <td colspan="4" style="width: 100%;">
                                  <h3 style="font-size: 21px; font-weight: 900; font-family:Verdana, Geneva, Tahoma, sans-serif; color:#285fa1; margin-bottom: 10px; margin-top: 0px;">Meet the Partition Experts</h3>
                                  <h6 style="color:#285fa1; font-size: 18px; margin-top: 5px; font-weight: 400; margin-bottom: 10px;">The team behind making your dream ideas come true.</h6>
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
       <h4 style="display: flex; align-items: center; justify-content: center; margin-top: 10px; margin-bottom: 10px;"><a href="tel:1-8448178255" style="color:#285fa1; font-weight: 900; text-decoration: none; font-size: 24px; font-family:Verdana, Geneva, Tahoma, sans-serif; font-style:italic">1-844-81-STALL</a><a href="mailto:service@restroomstallsandall.com" style="font-size: 20px; color:#000; font-weight: 400; margin-left: 15px;">service@restroomstallsandall.com</a></h4>
      </td>
  </tr>
</table></td></tr></table>`; 
return htmlContent;
}

async OrderPDFhtml(order_id,amount,color,createdAt,materials,rooms,billing_address){
  const htmlContent = `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif;print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/pdf_watermark_top.png');background-repeat: no-repeat;background-size:auto;background-position: left top;table-layout: fixed;"><tr><td><table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 0px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;">
  <tr>
      <td style="padding: 10px; text-align: left;">
           <img src="${process.env.URI}/uploads/images/Logo.png" alt="logo" style="width:150px">
      </td>
      <td style="padding: 10px; text-align: right;">
          <h3 style="margin-top: 5px;  margin-bottom: 5px;"><a href="tel:1-8448178255" style="color:#0061a6; text-decoration:none;  font-style: italic; font-size: 25px; font-weight: 600;">1-844-81-STALL</a></h3>
          <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
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
          <h4 style="font-size: 28px; color:#3d58a4; font-weight: 900; margin-bottom: 30px; font-family:Verdana, Geneva, Tahoma, sans-serif; margin-top: 20px;">Order Details</h4>
          
          
      </td>
      
  </tr>
  <tr>
      <td colspan="2" width="100%" style="width: 100%;">
          <div class="table_box" style="margin-top: 5px;">
              <div style="display: flex; align-items: flex-start; width: 100%; justify-content: space-between;  flex-wrap: wrap; box-sizing: border-box; gap: 20px;">
                  ${materials.map(material => `
                  <div style="padding:40px 25px;min-height: 280px; text-align:left; border: 1px solid #3d58a4; border-radius: 15px;  width:48%; box-sizing: border-box;print-color-adjust: exact;  -webkit-print-color-adjust: exact;background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;">
                      <div  style="color:#fff;display: flex; align-items: flex-start;    flex-direction: column;    justify-content: flex-start;gap:15px;">
                               <h4 style="color:#fff; font-size: 18px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Material:</span> ${material.name}</h4>
                               <h4 style="color:#fff; font-size: 18px; font-weight: 700; margin-bottom:0; margin-top: 0;"><span style="    font-weight: 400;">Color:</span> ${color}</h4>
                               <h5 style="font-size:18px;  margin-top:0;margin-bottom:0;"><span style="    font-weight: 400;">Order Total:</span> $${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}</h5>
                       </div>
                   </div>
                   `).join('')}
                   <div style="padding: 40px 25px;min-height: 280px; text-align:center; border: 1px solid #e4e8ef; border-radius: 15px;  print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover;width:48%; box-sizing: border-box;" >
                      <p style="color:#fff; font-size:18px; line-height: 1.3; text-align: left; padding:0; margin-top: 0;font-weight: 700;    margin-bottom: 18px;">Contact Details:</p>
                      <ul style="color:#fff; font-size: 14px; line-height: 1.3; text-align: left; padding:0 0 0 0;    margin: 0;    list-style-type: none;">
                        <li style="margin:0 0 7px 0;">Name: ${billing_address.first_name} ${billing_address.last_name}</li>
                        <li style="margin:0 0 7px 0;">Email: ${billing_address.email}</li>
                        <li style="margin:0 0 7px 0;">City: ${billing_address.city}</li>
                        <li style="margin:0 0 7px 0;">State: ${billing_address.state}</li>
                        <li style="margin:0 0 7px 0;">Zip: ${billing_address.zip}</li>
                        <li style="margin:0 0 7px 0;">Country: ${billing_address.country}</li>
                      </ul>
                   </div> 
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
              <p style=" font-size:16px;      font-style: italic; margin-top: 5px; "><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
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
                                  <p style="margin-top: 0px; font-size: 12px; margin-bottom: 5px; line-height: 1;"><span style="color:#000; font-weight: 700; color:#0061a6; line-height: 1;">Stall ${stallIndex+1}${stall?.type ? '(ADA)' : ''} </span>- <span style="font-weight: 600; line-height: 1;">Width:</span> ${stall.stallWidth}"  <span style="font-weight: 600;">Door:</span> ${stall.doorOpening}"  <span style="font-weight: 600;">Door Swing:</span> ${stall.doorSwing?.name}
                                      </p>
                                      `).join('')}
                              </div>
                              
                          </div>
                          
                      </td>
                  </tr>
                  <tr>
                      <td colspan="2" width="100%" style="width: 100%; border: 1px solid #e3e8ef; border-radius: 10px;">
                          <div style=" padding: 13px; text-align: center; width:95%;  min-height: 140px; display: flex; align-items: center; justify-content: center;">
                              <img src="${room.image_2D}" alt="pic" style="width:auto;height:380px;max-width:100%; margin: 0 auto;"/>
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
                         <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need Something Bigger?</h5>
                          <p style="margin-top: 5px;">No problem! Our Partition Experts will help you Customize your Layout.</p>
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
              <p style=" font-size:16px;      font-style: italic; margin-top: 5px;"><a href="mailto:service@restroomstallsandall.com" style="color:#000;">service@restroomstallsandall.com</a></p>
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
                              <img src="${room.urinalScreen?.urinal_2D}" alt="pic" style="width:auto;height:420px;max-width:100%;transform: scale(1) ;"/>
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
                          <h5 style="color:#0061a6; font-size: 20px; font-weight: 600; margin-bottom: 0px; margin-top: 0px;">Need Something Bigger?</h5>
                          <p style="margin-top: 4px;">No problem! Our Partition Experts will help you Customize your Layout.</p>
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
        <a style="margin-top: 200px;display: block;width: 100%;" href="https://youtu.be/9gSqLqj7oqU?si=yvZ8bwE0Qv2P-ZiM" target="_blank">
            <img src="${process.env.URI}/uploads/images/youtube-video.png" alt="logo" style="width:100%">
        </a>
    </td>
 </tr>
 </table>
 <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; padding: 20px 20px; margin: 0 auto; page-break-before:always; table-layout: fixed; max-width: 1200px;print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/pdf_watermark.png');background-repeat: no-repeat;background-size: auto 100%;background-position: right top;">
  <tr>
      <td colspan="2" style="width:100%; padding: 10px; ">
          <img src="${process.env.URI}/uploads/images/Logo.png" alt="alt" style="width:150px" />
      </td>
  </tr>
  <tr>
      <td colspan="2" style="width:100%; text-align: center; print-color-adjust: exact;  -webkit-print-color-adjust: exact; background-image: url('${process.env.URI}/uploads/images/blue-pattern.png');background-repeat: no-repeat;background-size: cover; border-radius: 12px; padding: 10px 25px;border: 1px solid #3d58a4;">
          <h4 style="font-size: 22px; color:#fff; font-weight: 900; margin-top: 0; margin-bottom: 0px;">Thank You for Choosing Us!</h4>
      </td>
  </tr>
  <tr>
      <td colspan="2" style="width: 100%;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 0px; vertical-align: top;">
              
               <tr>
                  <td style="width: 100%; display: flex; justify-content: center; align-items:center;">
                      <table width="100%" cellpadding="0" cellspacing="10" style="margin-top: 10px; vertical-align: top; text-align: center; border: 1px solid #e3e8ef; padding: 10px;  width:100%; border-radius: 10px;">
                          <tr>
                              <td colspan="4" style="width: 100%;">
                                  <h3 style="font-size: 21px; font-weight: 900; font-family:Verdana, Geneva, Tahoma, sans-serif; color:#285fa1; margin-bottom: 10px; margin-top: 0px;">Meet the Partition Experts</h3>
                                  <h6 style="color:#285fa1; font-size: 18px; margin-top: 5px; font-weight: 400; margin-bottom: 10px;">The team behind making your dream ideas come true.</h6>
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
       <h4 style="display: flex; align-items: center; justify-content: center; margin-top: 10px; margin-bottom: 10px;"><a href="tel:1-8448178255" style="color:#285fa1; font-weight: 900; text-decoration: none; font-size: 24px; font-family:Verdana, Geneva, Tahoma, sans-serif; font-style:italic">1-844-81-STALL</a><a href="mailto:service@restroomstallsandall.com" style="font-size: 20px; color:#000; font-weight: 400; margin-left: 15px;">service@restroomstallsandall.com</a></h4>
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




}

module.exports = FrontendController;
