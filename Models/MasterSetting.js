const mongoose = require("mongoose");
const _ = require("lodash");
var mongoose_delete = require("mongoose-delete");
var MasterSettingSchema = mongoose.Schema({
    key: {
        type: String,
        required: true,
    },
    value: {
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
        default: Date.now(),
    },
    
});
MasterSettingSchema.set("toObject", { getters: true });
MasterSettingSchema.set("toJSON", { getters: true });

MasterSettingSchema.changeLog = true;

MasterSettingSchema.plugin(mongoose_delete);
MasterSettingSchema.plugin(mongoose_delete, { overrideMethods: "all" });
MasterSettingSchema.fillable = ["step","value"];

MasterSettingSchema.customFields = {
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
    key: {
        field_name: "key",
        db_name: "key",
        type: "text",
        placeholder: "key",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
    },
    value: {
        field_name: "value",
        db_name: "value",
        type: "text",
        placeholder: "value",
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

module.exports = mongoose.model("master_setting", MasterSettingSchema);
