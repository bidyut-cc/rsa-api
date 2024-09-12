/**
 * @description Middleware to check permissions of the user who sent the request. Request without enough privilage will result 403 error
 * @author CodeClouds
 */

// const rules = require("../config/acl");
function checkPermission(permissions, module, action) {
    for (permission of permissions) {
        if (
            action == "deletePermanently" &&
            permission.indexOf(module + "-" + "delete") > -1
        ) {
            return true;
        } else if (permission.indexOf(module + "-" + action) > -1) return true;
    }
    return false;
}

module.exports = function (req, res, next) {
    const user = req.user;
    const permissions = user.permissions;
    let partial_path = req.originalUrl.replace("api/", "").split("?").shift();
    var [, module, action] = partial_path.split("/");
    if (typeof action === "undefined") {
        action = "list";
    }
    if (checkPermission(permissions, module, action)) {
        req.action = action;
        next();
    } else {
        res.status(403).send({ message: "You don't have adequate privilege" });
    }
};
