const mongoose = require("mongoose");
const _ = require('lodash');
var EmailtemplateSchema = mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    template: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        required: true,
        default: true
    },
    subject: {
        type: String,
        required: true
    },
    receiver: {
        type: Array,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

EmailtemplateSchema.fillable = ['code', 'template', 'subject'];

EmailtemplateSchema.customFields = {
    "_id": {
        "field_name": "_id",
        "db_name": "_id",
        "type": "text",
        "placeholder": "Id",
        "listing": true,
        "show_in_form": false,
        "sort": true,
        "default_sort": true,
        "required": false,
        "value": "",
        "width": "50",
        "searchable": false
    },
    "code": {
        "field_name": "code",
        "db_name": "code",
        "type": "text",
        "placeholder": "Code",
        "listing": true,
        "sort": true,
        "default_sort": false,
        "required": true,
        "value": "",
        "width": "50",
        "searchable": true
    },
    "template": {
        "field_name": "template",
        "db_name": "template",
        "type": "text",
        "placeholder": "Template",
        "listing": true,
        "sort": true,
        "default_sort": false,
        "required": true,
        "value": "",
        "width": "50",
        "searchable": true
    },
    
}

module.exports = mongoose.model("emailtemplate", EmailtemplateSchema);