const mongoose = require("mongoose");
const _ = require("lodash");
var mongoose_delete = require("mongoose-delete");
var SettingSchema = mongoose.Schema({
    step: {
        type: String,
        required: true,
    },
    config: {
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
SettingSchema.set("toObject", { getters: true });
SettingSchema.set("toJSON", { getters: true });

SettingSchema.changeLog = true;

SettingSchema.plugin(mongoose_delete);
SettingSchema.plugin(mongoose_delete, { overrideMethods: "all" });
SettingSchema.fillable = ["step","config"];

SettingSchema.customFields = {
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
    step: {
        field_name: "step",
        db_name: "step",
        type: "text",
        placeholder: "step",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
    },
    config: {
        field_name: "config",
        db_name: "config",
        type: "text",
        placeholder: "config",
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

module.exports = mongoose.model("setting", SettingSchema);
