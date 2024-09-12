const Controller = require("./Controller.js");
const { response } = require("../Helpers/Uploader.js");
const User = require("../Models/User.js");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
require("dotenv").config();

class ChangelogsController extends Controller {
    constructor() {
        super("Changelog");
    }

     /**
     * To get log list
     *
     * @param {object} req
     * @return {json} 
     */
    async getListQuery(req) {
        var trash = req.query.trash || false;
        var limit = req.query.show || 10;
        var page = req.query.page || 1;
        var offset = (parseInt(page) - 1) * parseInt(limit);
        var search = req.query.search || "";
        var sort_field = req.query.sort || "_id";
        var sort_order = req.query.sort_order || "desc";
        
        var where_clause = req.query.where_clause
            ? JSON.parse(req.query.where_clause)
            : {
                  where_fields: [],
                  where_values: [],
              };
        sort_order = sort_order == "asc" ? 1 : -1;
        var fields = this.getModelObj().schema.customFields;
        let select_fields = Object.keys(fields);
        let search_fields = select_fields.filter((item) => {
            if (fields[item]["searchable"]) return item;
        });
        var sort_order_obj = { [sort_field]: sort_order };
        let search_query = {};
        if (search.length > 0) {
            var search_arr = [];
            for (var field of search_fields) {
                search_arr.push({
                    [field]: {
                        $regex: search,
                        $options: "i",
                    },
                });
            }
            search_query = { $or: search_arr };
        }

        let find_query = {};
        for (
            var field_key = 0;
            field_key < where_clause.where_fields.length;
            field_key++
        ) {
            find_query[where_clause.where_fields[field_key]] =
                where_clause.where_values[field_key];
        }
        if (!_.isEmpty(find_query)) {
            if (!_.isEmpty(search_query)) {
                var new_search_query = {
                    $and: [find_query, search_query],
                };
            } else {
                let start_date_check = find_query.hasOwnProperty('start_date');
                let end_date_check = find_query.hasOwnProperty('end_date');
                if(start_date_check && end_date_check){
                    var new_search_query = {
                        $and: [{
                            'createdAt': { 
                                $gte: new Date(find_query.start_date),
                                $lte: new Date(find_query.end_date+'T23:59:59.000Z')
                                 }
                          }],
                    };
                }else{
                    var new_search_query = {
                        $and: [find_query],
                    };
                }
                
                
            }
            search_query = new_search_query;
        }
        return {
            search: search_query,
            select: select_fields.join(" "),
            limit: parseInt(limit),
            skip: parseInt(offset),
            sort: sort_order_obj,
            current_page: page,
            per_page: limit,
            trash: trash,
        };
    }
}

module.exports = ChangelogsController;