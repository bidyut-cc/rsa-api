const mongoose = require("mongoose");
const _ = require("lodash");
var mongoose_delete = require("mongoose-delete");
var BigcommerceOrderResponse = mongoose.Schema({
    order_id: {
        type: Number,
        required: true,
    },
    cart_id: {
        type: String,
        required: false,
    },
    response: {
        type: Object,
        required: true,
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
BigcommerceOrderResponse.set("toObject", { getters: true });
BigcommerceOrderResponse.set("toJSON", { getters: true });

BigcommerceOrderResponse.changeLog = true;

BigcommerceOrderResponse.plugin(mongoose_delete);
BigcommerceOrderResponse.plugin(mongoose_delete, { overrideMethods: "all" });
BigcommerceOrderResponse.fillable = ["order_id","cart_id","response"];

BigcommerceOrderResponse.customFields = {
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
    order_id: {
        field_name: "order_id",
        db_name: "order_id",
        type: "order_id",
        placeholder: "order_id",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
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
    response: {
        field_name: "response",
        db_name: "response",
        type: "text",
        placeholder: "response",
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

module.exports = mongoose.model("bigcommerce_order_response", BigcommerceOrderResponse);
