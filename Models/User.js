const mongoose = require("mongoose");
const _ = require("lodash");
const { asset } = require("../Helpers/Global");
var mongoose_delete = require("mongoose-delete");
var UserSchema = mongoose.Schema({
    username: {
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
    phone: {
        type: String,
        required: false,
    },
    password: {
        type: String,
        required: false,
        default: 'default123',
    },
    roles: {
        type: Array,
        required: false,
    },
    roles: {
        type: Array,
        required: false,
    },
    attempt: {
        type: Number,
        required: false,
        default: 0,
    },
    email_verified: {
        type: Boolean,
        default: false,
    },
    set_password_token: {
        type: String,
        default: "",
        required: false,
    },
    status: {
        type: String,
        required: false,
        default: 'Active',
    },
    deleted: {
        type: Boolean,
        required: false,
        default: false,
    },
    avatar: {
        type: Object,
        get: function obfuscate(cc) {
            if (!_.isEmpty(cc)) {
                return asset("/uploads/user/" + cc.filename);
            } else {
                return asset("/uploads/user/default.png");
            }
        },
        default: {},
    },
    createdAt: {
        type: Date,
        default: () => Date.now(), 
    },
    
});
UserSchema.set("toObject", { getters: true });
UserSchema.set("toJSON", { getters: true });
UserSchema.changeLog = true;

UserSchema.plugin(mongoose_delete);
UserSchema.plugin(mongoose_delete, { overrideMethods: "all" });
UserSchema.fillable = ["username", "first_name", "last_name", "email","phone","roles","status", "attempt", "avatar", "password"];

UserSchema.customFields = {
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
    username: {
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
    phone: {
        field_name: "phone",
        db_name: "phone",
        type: "text",
        placeholder: "Phone",
        listing: true,
        sort: true,
        default_sort: false,
        required: false,
        value: "",
        width: "50",
        searchable: true,
    },
    roles: {
        field_name: "roles",
        db_name: "roles",
        type: "text",
        placeholder: "roles",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: "",
        width: "50",
        searchable: true,
    },
    status: {
        field_name: "status",
        db_name: "status",
        type: "text",
        placeholder: "status",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        value: 1,
        width: "50",
    },
    attempt: {
        field_name: "attempt",
        db_name: "attempt",
        type: "switch",
        placeholder: "Locked",
        listing: true,
        sort: true,
        default_sort: false,
        required: true,
        show_in_form: false,
        value: "",
        width: "50",
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
// User.findOne() return an object excluding the password field
UserSchema.methods.toJSON = function() {
    var obj = this.toObject(); //or var obj = this;
    delete obj.password;
    return obj;
   }
module.exports = mongoose.model("user", UserSchema);
