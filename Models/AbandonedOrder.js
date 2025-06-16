const mongoose = require("mongoose");
const _ = require("lodash");
var mongoose_delete = require("mongoose-delete");
var AbandonedOrderSchema = mongoose.Schema({
    cart_id: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: false,
    },
    cart_amount: {
        type: Number,
        required: false,
        default:0
    },
    line_items: {
        type: Object,
        required: false,
    },
    is_mail_send: {
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
    updatedAt: {
        type: Date,
        default: () => Date.now(), 
    },

    
});
AbandonedOrderSchema.set("toObject", { getters: true });
AbandonedOrderSchema.set("toJSON", { getters: true });

AbandonedOrderSchema.changeLog = true;

AbandonedOrderSchema.plugin(mongoose_delete);
AbandonedOrderSchema.plugin(mongoose_delete, { overrideMethods: "all" });
AbandonedOrderSchema.fillable = ["cart_id","email","cart_amount","line_items"];

AbandonedOrderSchema.customFields = {
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
    cart_id: {
        field_name: "cart_id",
        db_name: "cart_id",
        type: "text",
        placeholder: "cart_id",
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
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    cart_amount: {
        field_name: "cart_amount",
        db_name: "cart_amount",
        type: "text",
        placeholder: "cart_amount",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: false,
    },

    line_items: {
        field_name: "line_items",
        db_name: "line_items",
        type: "text",
        placeholder: "line_items",
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

module.exports = mongoose.model("abandoned_orders", AbandonedOrderSchema);
