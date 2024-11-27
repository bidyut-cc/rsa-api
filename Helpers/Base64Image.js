const fs = require('fs');
const mime = require('mime-types');
const axios = require('axios');
/**
 * Generate data url from image path
 *
 * @param {string} imagePath
 * @return {string} 
 */
const  imageUrlToDataUrl = async (imageUrl=null) => {
  try {
   // Fetch the image data from the URL
   const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

   // Get the MIME type from the response headers
   const mimeType = response.headers['content-type'] || 'image/png'; // Default to image/png if MIME is not present

   // Convert the binary data to a Base64 string
   const base64Image = Buffer.from(response.data, 'binary').toString('base64');

   // Prefix with MIME type to create a complete data URI
   return `data:${mimeType};base64,${base64Image}`;
} catch (err) {
    throw new Error(`Error fetching image: ${err.message}`);
}
  }

  module.exports = {
    imageUrlToDataUrl
}

