const mongoose = require("mongoose");
const _ = require("lodash");
var mongoose_delete = require("mongoose-delete");
var ColorSchema = mongoose.Schema({
    material_id: {
        type: Number,
        required: true,
    },
    colors: {
        type: Object,
        required: true,
        
    },
    textures: {
        type: Object,
        required: false,
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
ColorSchema.set("toObject", { getters: true });
ColorSchema.set("toJSON", { getters: true });

ColorSchema.changeLog = true;

ColorSchema.plugin(mongoose_delete);
ColorSchema.plugin(mongoose_delete, { overrideMethods: "all" });
ColorSchema.fillable = ["material_id","colors","textures"];

ColorSchema.customFields = {
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

    material_id: {
        field_name: "material_id",
        db_name: "material_id",
        type: "text",
        placeholder: "material_id",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
    },

    colors: {
        field_name: "colors",
        db_name: "colors",
        type: "text",
        placeholder: "colors",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },

    textures: {
        field_name: "textures",
        db_name: "textures",
        type: "text",
        placeholder: "material_id",
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

module.exports = mongoose.model("color", ColorSchema);
