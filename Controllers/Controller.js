/**
 * @description This Particular controller is the parent class of all other controllers required for CRUD functionality.
 * @author CodeClouds
 */

const Models = require("../Models");
const assert = require("assert");
const uploader = require("../Helpers/Uploader");
const AccountLog = require("../Helpers/AccountLog");
const Exporter = require("../Helpers/Exporter");
const _ = require("lodash");
class Controller {
    constructor(model) {
        this.model_name = model;
        this.getModelObj = this.getModelObj.bind(this);
        this.list = this.list.bind(this);
        this.resolveValidationErrors = this.resolveValidationErrors.bind(this);
    }

    resolveValidationErrors(errorBag) {
        assert(typeof errorBag === "undefined", "Incorrect data");
    }

    getModelObj() {
        return eval("new Models." + this.model_name);
    }

    createView() {
        let fields = this.getModelObj().schema.customFields;
        return {
            fields: fields,
        };
    }

    async view(req) {
        var obj = this.getModelObj();
        let fields = obj.schema.customFields;
        obj = await eval(
            "Models." + this.model_name + ".findById('" + req.params.id + "')"
        );
        return {
            fields: fields,
            results: {
                result: obj,
            },
        };
    }

    async list(req) {
        let query = await this.getListQuery(req);
        // return query;
        var data = await this.fetchList(query);
        return data;
    }

    async fetchList(query) {
       // console.log(query);
        if (query.trash === false) {
            var data = await eval("Models." + this.model_name)
                .find(query.search, query.select)
                .limit(query.limit)
                .sort(query.sort)
                .skip(query.skip)
                .exec();
            var count = await eval("Models." + this.model_name)
                .countDocuments(query.search)
                .exec();
        } else {
            var data = await eval("Models." + this.model_name)
                .findDeleted(query.search, query.select)
                .limit(query.limit)
                .sort(query.sort)
                .skip(query.skip)
                .exec();
            var count = await eval("Models." + this.model_name)
                .countDocumentsDeleted(query.search)
                .exec();
        }
        var last_page = 1;
        if (parseInt(count) / query.per_page > 1) {
            last_page = parseInt(parseInt(count) / query.per_page);
            if (parseInt(count) % query.per_page > 0) {
                last_page++;
            }
        }
        return {
            fields: this.getModelObj().schema.customFields,
            results: {
                results_count: count,
                results: {
                    query: query,
                    data: data,
                    count: count,
                    current_page: query.current_page,
                    per_page: query.per_page,
                    last_page: last_page,
                    to: count,
                    total: count,
                },
            },
        };
    }

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
                var new_search_query = {
                    $and: [find_query],
                };
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

    async save(req) {
        let obj = this.getModelObj();
        for (var param in req.body) {
            if (obj.schema.fillable.indexOf(param) > -1)
                obj[param] = req.body[param];
        }
        var error = obj.validateSync();
        try {
            this.resolveValidationErrors(error);
            await obj.save();
            if (obj.schema.changeLog) {
                var accountLog = new AccountLog();
                const message = `${this.model_name} model data created.`
                accountLog.saveLog("saved", obj, req.user, message);
            }
            return {
                status: true,
                message: "Insertion successful.",
                object: obj,
            };
        } catch (error) {
            return {
                status: false,
                message: error,
            };
        }
    }

    async update(req) {
        let obj = await eval("Models." + this.model_name).findById(
            req.params.id
        );
        for (var param in req.body) {
            if (obj.schema.fillable.indexOf(param) > -1)
                obj[param] = req.body[param];
        }
        var error = obj.validateSync();
        try {
            this.resolveValidationErrors(error);
            if (obj.schema.changeLog) {
                var accountLog = new AccountLog();
                const message = `${this.model_name} model data updated.`
                await accountLog.saveLog("updated", obj, req.user, message);
            }
            await obj.save();
            return {
                status: true,
                message: "Updated Successfully.",
                object: obj,
            };
        } catch (error) {
            return {
                status: false,
                message: error.message,
            };
        }
    }

    async delete(req) {
        var records = await eval("Models." + this.model_name)
            .find({
                _id: {
                    $in: req.body.ids,
                },
            })
            .exec();
        await eval("Models." + this.model_name)
            .delete({
                _id: {
                    $in: req.body.ids,
                },
            })
            .exec();
        let obj = this.getModelObj();
        if (obj.schema.changeLog) {
            for (var record of records) {
                var accountLog = new AccountLog();
                const message = `${this.model_name} model data deleted.`
                await accountLog.saveLog("deleted", record, req.user, message);
            }
        }
        return {
            status: true,
            message: "Item(s) deleted",
        };
    }

    upload(req) {
        // return req.files;
        return uploader.upload(req.files, "temp");
    }

    async fetchDropdownOptions(req) {
        var column = req.query.column || "name";
        var search = req.query.search || "";
        var data = await eval("Models." + this.model_name)
            .find(
                {
                    [column]: { $regex: search },
                },
                "_id Name"
            )
            .lean()
            .exec();
        data = data.map((item) => {
            item["index"] = item._id;
            item["value"] = item.Name;
            return item;
        });
        return { results: data };
    }

    async export(req, res) {
        var obj = eval("new Models." + this.model_name);
        var exportHeader = obj.schema.exportFields;
        let filename = req.query.filename || "Report";
        var where_clause = req.query.where_clause;
        where_clause = JSON.parse(where_clause);
        var where_fields = where_clause.where_fields;
        var where_values = where_clause.where_values;
        var query = [];
        for (var i = 0; i < where_fields.length; i++) {
            query.push({
                [where_fields[i]]: { $in: where_values[i] },
            });
        }
        var records = await eval("Models." + this.model_name)
            .find({ $and: query })
            .exec();
        let exporter = new Exporter();
        let result = exporter.export(exportHeader, records);
        res.setHeader("Content-Type", "application/vnd.openxmlformats");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + filename + ".xlsx"
        );
        res.end(result, "binary");
    }

    async restore(req, res) {
        if (req.body.restore_all) {
            var records = await eval("Models." + this.model_name)
                .findDeleted({})
                .exec();
            await eval("Models." + this.model_name)
                .restore({})
                .exec();
        } else {
            var records = await eval("Models." + this.model_name)
                .findDeleted({
                    _id: {
                        $in: req.body.ids,
                    },
                })
                .exec();
            await eval("Models." + this.model_name)
                .restore({
                    _id: {
                        $in: req.body.ids,
                    },
                })
                .exec();
        }
        let obj = this.getModelObj();
        if (obj.schema.changeLog) {
            for (var record of records) {
                var accountLog = new AccountLog();
                const message = `${this.model_name} model data restored.`
                await accountLog.saveLog("created", record, req.user, message);
            }
        }
        return {
            status: true,
            message: "Item(s) restored",
        };
    }

    async deletePermanently(req, res) {
        await eval("Models." + this.model_name)
            .deleteMany({
                _id: {
                    $in: req.body.ids,
                },
            })
            .exec();
        return {
            status: true,
            message: "Item(s) deleted parmanently.",
        };
    }
}
module.exports = Controller;
