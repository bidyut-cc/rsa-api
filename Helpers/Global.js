/**
 * @description Module for global helpers
 * @author CodeClouds
 */

 /**
  * Description: Similar to asset() helper in laravel
  * @param {String} part_url
  */
require("dotenv").config();
exports.asset = (part_url = "") => {
    base_asset_url = process.env.URI;
    if (base_asset_url.slice(-1) !== "/") {
        base_asset_url += "/";
    }
    if (part_url[0] === "/") {
        part_url = part_url.substr(1);
    }
    return base_asset_url + part_url;
};

 /**
  * Description: Similar to asset() helper in laravel
  * @param {String} key
  * @param {any} value
  * @param {Array} arrayOfObjects
  */
exports.search = (key, value, arrayOfObjects) => {
    for (var i=0; i < arrayOfObjects.length; i++) {
        if (arrayOfObjects[i][key] === value) {
            return arrayOfObjects[i];
        }
    }
    return null;
}
