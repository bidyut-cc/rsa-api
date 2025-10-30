const mongoose = require("mongoose");
const _ = require("lodash");
var mongoose_delete = require("mongoose-delete");
var TokenSchema = mongoose.Schema({
    platform: {
        type: String,
        required: false,
    },
    access_token: {
        type: String,
        required: false,
        default:null
    },
    refresh_token: {
        type: String,
        required: false,
        default:null
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), 
    },
    createdAt: {
        type: Date,
        default: () => Date.now(), 
    },
    updatedAt: {
        type: Date,
        default: () => Date.now(), 
    },

    
});
TokenSchema.set("toObject", { getters: true });
TokenSchema.set("toJSON", { getters: true });

TokenSchema.changeLog = true;

TokenSchema.plugin(mongoose_delete);
TokenSchema.plugin(mongoose_delete, { overrideMethods: "all" });
TokenSchema.fillable = ["platform","access_token","refresh_token","expiresAt"];

TokenSchema.customFields = {
    _id: {
        field_name: "_id",
        db_name: "_id",
        type: "text",
        placeholder: "Id",
        listing: true,
        show_in_form: false,
        sort: true,
        default_sort: true,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    platform: {
        field_name: "platform",
        db_name: "platform",
        type: "text",
        placeholder: "platform",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    access_token: {
        field_name: "access_token",
        db_name: "access_token",
        type: "text",
        placeholder: "access_token",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    refresh_token: {
        field_name: "refresh_token",
        db_name: "refresh_token",
        type: "text",
        placeholder: "refresh_token",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    expiresAt: {
        "field_name": "expiresAt",
        "db_name": "expiresAt",
        "type": Date,
        "placeholder": "expiresAt",
        "listing": true,
        "sort": true,
        "default_sort": false,
        "required": false,
        "value": "",
        "width": "50",
        "searchable": false
    },
 

    createdAt: {
        "field_name": "createdAt",
        "db_name": "createdAt",
        "type": Date,
        "placeholder": "createdAt",
        "listing": true,
        "sort": true,
        "default_sort": false,
        "required": false,
        "value": "",
        "width": "50",
        "searchable": false
    },
};

module.exports = mongoose.model("tokens", TokenSchema);
