const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const moment = require("moment");
require("dotenv").config();
const ChangelogSchema = mongoose.Schema({
    previousData: {
        type: Object,
        default: {},
    },
    currentData: {
        type: Object,
        default: {},
    },
    modelName: {
        type: String,
        required: true,
    },
    modelId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    event: {
        type: String,
        required: true,
    },
    user: {
        type: Object,
        required: true,
    },
    message: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: () => Date.now(), 
        get: (val) => {
            return moment(val).format('MM-DD-YYYY HH:mm:ss');
        },
    },
});
ChangelogSchema.set("toObject", { getters: true });
ChangelogSchema.set("toJSON", { getters: true });

ChangelogSchema.customFields = {
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
    previousData: { 
        field_name: "previousData",
        db_name: "previousData",
        type: "object",
        placeholder: "previousData",
        listing: true,
        sort: false,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    currentData: { 
        field_name: "currentData",
        db_name: "currentData",
        type: "object",
        placeholder: "currentData",
        listing: true,
        sort: false,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    modelName: { 
        field_name: "modelName",
        db_name: "modelName",
        type: "text",
        placeholder: "Module",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
    },
    modelId: {
        field_name: "modelId",
        db_name: "modelId",
        type: "text",
        placeholder: "Module ID",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: false,
    },
    event: {
        field_name: "event",
        db_name: "event",
        type: "text",
        placeholder: "Event",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
    },
    // user: {
    //     field_name: "user",
    //     db_name: "user",
    //     type: "objectId",
    //     placeholder: "user",
    //     listing: true,
    //     sort: true,
    //     default_sort: false,
    //     required: true,
    //     value: "",
    //     width: "50",
    //     searchable: true,
    // },
    "user.username": {
        field_name: "username",
        db_name: "username",
        type: "text",
        placeholder: "username",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
    },
 
    createdAt: {
        "field_name": "createdAt",
        "db_name": "createdAt",
        "type": Date,
        "placeholder": "createdAt",
        "listing": true,
        "sort": true,
        "default_sort": false,
        "required": true,
        "value": "",
        "width": "50",
        "searchable": false
    },
    message: {
        field_name: "message",
        db_name: "message",
        type: "text",
        placeholder: "message",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
    },
   
  
};

ChangelogSchema.exportFields = {
    modelName: {
        displayName: "Module Name",
        width: 120,
    },
    modelId: {
        width: 120,
        displayName: "Module ID",
    },
    event: {
        width: 120,
        displayName: "Event",
    },
    message: {
        width: 120,
        displayName: "Message",
    },
    createdAt: {
        width: 120,
        displayName: "Action Performed on",
    },
    
};

module.exports = mongoose.model("changelog", ChangelogSchema);
