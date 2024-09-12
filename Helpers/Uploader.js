/**
 * @description Module to upload files to server. Folder name can also be specified here
 * @author CodeClouds
 */

require("dotenv").config();
const assert = require("assert");
class Uploader {
    constructor() {
        this.storage_path = process.env.STORAGE_PATH || "public/uploads/";
        this.getPath = this.getPath.bind(this);
        this.response = {
            status: false,
            files: [],
        };
    }

    /**
     * To upload a file
     *
     * @param {object} files
     * @param {string} model
     * @return {json} 
     */
    async upload(files, model) {
        var path = await this.getPath(model);
        for (var key of Object.keys(files)) {
            var file = files[key];
            var new_filename = Date.now() + file.name;
            try {
                await file.mv(path + new_filename, async (err) => {
                    if (err) assert(true, err);
                });
                this.response.status = true;
                this.response.files[key] = {
                    filename: new_filename,
                    mimetype: file.mimetype,
                };
            } catch (e) {
                this.response.trace = e;
            }
        }
        return this.response;
    }

     /**
     * To get file path
     *
     * @param {string} model
     * @return {string} 
     */
    getPath(model) {
        var base_path = process.env.STORAGE_PATH;
        if (model.trim().length > 0) {
            base_path += model + "/";
        }
        return base_path;
    }
}

module.exports = new Uploader();
