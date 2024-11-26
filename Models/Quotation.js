const mongoose = require("mongoose");
const _ = require("lodash");
var mongoose_delete = require("mongoose-delete");
var QuotationSchema = mongoose.Schema({
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
    deleted: {
        type: Boolean,
        required: false,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    
});
QuotationSchema.set("toObject", { getters: true });
QuotationSchema.set("toJSON", { getters: true });

QuotationSchema.changeLog = true;

QuotationSchema.plugin(mongoose_delete);
QuotationSchema.plugin(mongoose_delete, { overrideMethods: "all" });
QuotationSchema.fillable = ["quotation_no","first_name","last_name","email","phone_number","submittedData","roomData","materials"];

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
        searchable: true,
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
        searchable: true,
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
        "required": false,
        "value": "",
        "width": "50",
        "searchable": false
    },
};

module.exports = mongoose.model("quotation", QuotationSchema);
