/**
 * @description This Particular controller is responsible to route a particular request to the proper method of a controller
 * @author CodeClouds
 */

const Pluralize = require("pluralize");
let Controllers = require("./index");
class DynamicRouteController {
    async handel(req, res) {
        try {
            var module = req.params.module;
            var action = req.action || "list";
            let pluralized = Pluralize.plural(module);
            let controller_name =
                pluralized.charAt(0).toUpperCase() +
                pluralized.slice(1) +
                "Controller";
            const controller_obj = eval("new Controllers." + controller_name);
            var response = await controller_obj[action](req, res);
           // res.json(response);
           if (!res.headersSent) {
            res.json(response);
          }
        } catch (error) {
            res.status(500).json({
                message: error.message,
                trace: error.stack,
            });
        }
    }
}

module.exports = DynamicRouteController;
