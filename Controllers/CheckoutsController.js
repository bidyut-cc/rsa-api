const Controller = require("./Controller.js");
const Emailtemplate = require("../Models/Emailtemplate");
const { response } = require("../Helpers/Uploader.js");
const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
require("dotenv").config();
const email_helper = require("../Helpers/Sendmail");

const axios = require('axios');

class CheckoutsController {
  constructor() {
    this.BIGCOMMERCE_API_URL = 'https://api.bigcommerce.com/stores/ikryvquhh8/v3';
    this.ACCESS_TOKEN = '5tcaifp3did6y1bcuxzepirol9jcln3';

    // Bind methods to the instance
    this.checkout = this.checkout.bind(this);
    this.createCart = this.createCart.bind(this);
    this.createCheckout = this.createCheckout.bind(this);
  }

  async checkout(req, res) {
    try {
      // Define your line items here
      const lineItems = [
        {
          product_id: 111,
          quantity: 1,
        },
      ];

      // Create a cart
      const cart = await this.createCart(lineItems);
console.log(cart);
      // Generate a checkout session
      const checkout = await this.createCheckout(cart.id);

      // Redirect the user to the checkout page
      const redirectUrl = checkout.data.redirect_url;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      res.status(500).send('An error occurred during checkout.');
    }
  }

  async createCart(lineItems) {
    const response = await axios.post(`${this.BIGCOMMERCE_API_URL}/carts`, {
      line_items: lineItems,
    }, {
      headers: {
        'X-Auth-Token': this.ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }

  async createCheckout(cartId) {
    try {
      const response = await axios.post(`${this.BIGCOMMERCE_API_URL}/checkouts`, {
        cart_id: cartId,
      }, {
        headers: {
          'X-Auth-Token': this.ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error during checkout creation:', error.response ? error.response.data : error.message);
      throw error;
    }
  }
  
}

module.exports = CheckoutsController;
