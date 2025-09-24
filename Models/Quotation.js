const mongoose = require("mongoose");
const _ = require("lodash");
var mongoose_delete = require("mongoose-delete");
var QuotationSchema = mongoose.Schema({
    project_name: {
        type: String,
        required: false,
    },
    quotation_no: {
        type: String,
        required: true,
    },
    first_name: {
        type: String,
        required: false,
    },
    last_name: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: true,
    },
    phone_number: {
        type: String,
        required: false,
    },
    submittedData: {
        type: Object,
        required: true,
    },
    roomData: {
        type: Object,
        required: true,
    },
    materials: {
        type: Object,
        required: true,
    },
    zendesk_ticket_id: {
        type: String,
        required: false,
    },
    hubspot_deal_id: {
        type: String,
        required: false,
    },
    is_converted_to_deal: {
        type: Boolean,
        required: false,
        default: false,
        get: function(value) {
            return value ? 'Yes' : 'No'; // Return "Yes" if true, "No" if false
        }
    },
    is_mail_send: {
        type: Boolean,
        required: false,
        default: false
    },
    is_deal_create: {
        type: Boolean,
        required: false,
        default: false
    },
    is_zendesk_deal_create: {
        type: Boolean,
        required: false,
        default: false
    },
    is_hubspot_deal_create: {
        type: Boolean,
        required: false,
        default: false
    },
    zip_code: {
        type: String,
        required: false,
    },
    distance: {
        type: String,
        required: false,
        default: 0
    },
    installation_price: {
        type: Number,
        required: false,
        default:0
    },
    is_within_max_distance: {
        type: Boolean,
        required: false,
        default: false
    },
    deleted: {
        type: Boolean,
        required: false,
        default: false,
    },
    createdAt: {
        type: Date,
        default: () => Date.now(), 
    },
    
});
QuotationSchema.set("toObject", { getters: true });
QuotationSchema.set("toJSON", { getters: true });

QuotationSchema.changeLog = true;

QuotationSchema.plugin(mongoose_delete);
QuotationSchema.plugin(mongoose_delete, { overrideMethods: "all" });
QuotationSchema.fillable = ["project_name","quotation_no","first_name","last_name","email","phone_number","submittedData","roomData","materials"];

QuotationSchema.customFields = {
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
    project_name: {
        field_name: "project_name",
        db_name: "project_name",
        type: "text",
        placeholder: "project_name",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    quotation_no: {
        field_name: "quotation_no",
        db_name: "quotation_no",
        type: "text",
        placeholder: "quotation_no",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    first_name: {
        field_name: "first_name",
        db_name: "first_name",
        type: "text",
        placeholder: "first_name",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    last_name: {
        field_name: "last_name",
        db_name: "last_name",
        type: "text",
        placeholder: "last_name",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    email: {
        field_name: "email",
        db_name: "email",
        type: "text",
        placeholder: "Email",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
    },
    phone_number: {
        field_name: "phone_number",
        db_name: "phone_number",
        type: "text",
        placeholder: "phone_number",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    submittedData: {
        field_name: "submittedData",
        db_name: "submittedData",
        type: "object",
        placeholder: "submittedData",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    roomData: {
        field_name: "roomData",
        db_name: "object",
        type: "text",
        placeholder: "roomData",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    materials: {
        field_name: "materials",
        db_name: "materials",
        type: "object",
        placeholder: "materials",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    is_converted_to_deal: {
        field_name: "is_converted_to_deal",
        db_name: "is_converted_to_deal",
        type: "boolean",
        placeholder: "is_converted_to_deal",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    distance: {
        field_name: "distance",
        db_name: "distance",
        type: "text",
        placeholder: "distance",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    installation_price: {
        field_name: "installation_price",
        db_name: "installation_price",
        type: "text",
        placeholder: "installation_price",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    is_within_max_distance: {
        field_name: "is_within_max_distance",
        db_name: "is_within_max_distance",
        type: "text",
        placeholder: "is_within_max_distance",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
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

module.exports = mongoose.model("quotation", QuotationSchema);
