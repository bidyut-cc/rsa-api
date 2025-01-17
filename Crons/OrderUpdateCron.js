const cron = require('node-cron');
const axios = require('axios');
const moment = require('moment');
const mongoose = require("mongoose");
const { Order } = require('../Models');
const Quotation = require('../Models/Quotation');
require("dotenv").config();

// MongoDB connection setup
const MONGO_URI = process.env.DB_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB successfully');
    const order_cron_time = '0 * * * *';
    const startDate = moment().subtract(1, 'hours').subtract(1, 'minutes').format("MM-DD-YYYY HH:mm:ss");
    const endDate = moment().format("MM-DD-YYYY HH:mm:ss");

    // Define Invoice Mail Cron
    cron.schedule(order_cron_time, async () => {
      try {
        const orders = await Order.find({
          createdAt: { $gte: startDate, $lte: endDate },
          order_id: { $ne: null }
        }).select('order_id cart_id quotation_id');

        if (orders.length > 0) {
          console.log(`Found ${orders.length} orders to process.`);

          // Collect all API request promises to handle them in parallel
          const orderPromises = orders.map(async (order) => {
            try {
              const orderResponse = await axios.get(
                `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}/v2/orders/${order.order_id}`,
                {
                  headers: {
                    'X-Auth-Token': process.env.BIGCOMMERCE_API_TOKEN,
                    'Accept': 'application/json',
                  },
                }
              );

              const orderData = orderResponse.data;
              if (orderData && orderData.cart_id) {
                // Directly use the existing order from the database
                const existingOrder = order;

                // Update payment and order status
                existingOrder.payment_status = await capitalizeWords(orderData.payment_status) || 'Pending';
                existingOrder.order_status = await capitalizeWords(orderData.status) || 'Pending';
                existingOrder.billing_address = orderData.billing_address || {};
               // existingOrder.order_id = orderData.id || null;
                existingOrder.paymentDate = new Date(orderData.date_modified) || null;

                await existingOrder.save();
                console.log(`Updated Order: ${existingOrder.order_id}`);

                // Update associated quotation if it exists
                if (existingOrder.quotation_id) {
                  const existingQuotation = await Quotation.findOne({ _id: existingOrder.quotation_id });
                  if (existingQuotation) {
                    existingQuotation.is_converted_to_deal = true;
                    await existingQuotation.save();
                    console.log(`Updated Quotation: ${existingQuotation._id}`);
                  } else {
                    console.log(`Quotation not found for Order: ${existingOrder.order_id}`);
                  }
                }
              }
            } catch (error) {
              console.error(`Error processing order ${order.order_id}:`, error);
            }
          });

          // Wait for all promises to complete
          await Promise.all(orderPromises);
          console.log('All orders processed.');
        } else {
          console.log('No orders found to process.');
        }
      } catch (error) {
        console.error('Error in cron job:', error);
      }
    }, {
      timezone: 'America/New_York', // Specify the timezone
    });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

// Capitalize the first letter of each word
async function capitalizeWords(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
