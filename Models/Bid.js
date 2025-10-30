const mongoose = require("mongoose");
const _ = require("lodash");
var mongoose_delete = require("mongoose-delete");
var BidSchema = mongoose.Schema({
    opportunities_id: {
        type: String,
        required: false,
        default:null
    },
    name: {
        type: String,
        required: false,
        default:null
    },
    dueAt: {
        type: Date,
        required: false,
        default:null
    },
    projectSize: {
        type: String,
        required: false,
        default:null
    },
    location: {
        type: Object,
        required: false
    },
    client: {
        type: Object,
        required: false,
        default:null
    },
    tradeName: {
        type: String,
        required: false,
        default:null
    },
    deadline: {
        type: Date,
        required: false,
        default:null
    },
  
    projectInformation: {
        type: String,
        required: false,
        default:null
    },
    smartBidScore: {
        type: String,
        required: false,
        default:0
    },
    LinkURL: {
        type: String,
        required: false,
        default:null
    },
    submissionState: {
        type: String,
        required: false,
        default:null
    },
    hubspotLeadId: {
        type: String,
        required: false,
        default:null
    },
    hubspotContactId: {
        type: String,
        required: false,
        default:null
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
BidSchema.set("toObject", { getters: true });
BidSchema.set("toJSON", { getters: true });

BidSchema.changeLog = true;

BidSchema.plugin(mongoose_delete);
BidSchema.plugin(mongoose_delete, { overrideMethods: "all" });
BidSchema.fillable = ["opportunities_id","name","dueAt","projectSize","location","client","tradeName","deadline","projectInformation","smartBidScore","LinkURL","submissionState","hubspotLeadId","hubspotContactId"];

BidSchema.customFields = {
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
    opportunities_id: {
        field_name: "opportunities_id",
        db_name: "opportunities_id",
        type: "text",
        placeholder: "opportunities_id",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    name: {
        field_name: "name",
        db_name: "name",
        type: "text",
        placeholder: "name",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    dueAt: {
        field_name: "dueAt",
        db_name: "dueAt",
        type: "text",
        placeholder: "dueAt",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    projectSize: {
        field_name: "projectSize",
        db_name: "projectSize",
        type: "text",
        placeholder: "projectSize",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    location: {
        field_name: "location",
        db_name: "location",
        type: "text",
        placeholder: "location",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    "client.lead.email": {
        field_name: "email",
        db_name: "email",
        type: "text",
        placeholder: "email",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    "client.lead.firstName": {
        field_name: "firstName",
        db_name: "firstName",
        type: "text",
        placeholder: "firstName",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    "client.lead.lastName": {
        field_name: "lastName",
        db_name: "lastName",
        type: "text",
        placeholder: "lastName",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    "client.lead.phoneNumber": {
        field_name: "phoneNumber",
        db_name: "phoneNumber",
        type: "text",
        placeholder: "phoneNumber",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    tradeName: {
        field_name: "tradeName",
        db_name: "tradeName",
        type: "text",
        placeholder: "tradeName",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    deadline: {
        field_name: "deadline",
        db_name: "deadline",
        type: "text",
        placeholder: "deadline",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    projectInformation: {
        field_name: "projectInformation",
        db_name: "projectInformation",
        type: "text",
        placeholder: "projectInformation",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    submissionState: {
        field_name: "submissionState",
        db_name: "submissionState",
        type: "text",
        placeholder: "submissionState",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },
    smartBidScore: {
        "field_name": "smartBidScore",
        "db_name": "smartBidScore",
        "type": "text",
        "placeholder": "smartBidScore",
        "listing": true,
        "sort": true,
        "default_sort": false,
        "required": false,
        "value": "",
        "width": "50",
        "searchable": false
    },
    LinkURL: {
        "field_name": "LinkURL",
        "db_name": "LinkURL",
        "type": "text",
        "placeholder": "LinkURL",
        "listing": true,
        "sort": true,
        "default_sort": false,
        "required": false,
        "value": "",
        "width": "50",
        "searchable": false
    },
    hubspotLeadId: {
        "field_name": "hubspotLeadId",
        "db_name": "hubspotLeadId",
        "type": "text",
        "placeholder": "hubspotLeadId",
        "listing": true,
        "sort": true,
        "default_sort": false,
        "required": false,
        "value": "",
        "width": "50",
        "searchable": false
    },
    hubspotContactId: {
        "field_name": "hubspotContactId",
        "db_name": "hubspotContactId",
        "type": "text",
        "placeholder": "hubspotContactId",
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
        "type": "text",
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

BidSchema.exportFields = {
    name: {
        displayName: "Project Name",
        width: 120,
    },
    projectSize: {
        width: 120,
        displayName: "Project Size",
    },
    tradeName: {
        width: 120,
        displayName: "Trade Name",
    },
    clientName: {
        width: 120,
        displayName: "Client Name",
    },
    clientEmail: {
        width: 120,
        displayName: "Client Email",
    },
    location: {
        width: 120,
        displayName: "Location",
    },
    smartBidScore: {
        width: 120,
        displayName: "Smart Bid Score",
    },
    LinkURL: {
        width: 120,
        displayName: "Link URL",
    },
    deadline: {
        width: 120,
        displayName: "Dead Line",
    },
    createdAt: {
        width: 120,
        displayName: "Created At",
    },
    
};

module.exports = mongoose.model("bid", BidSchema);
