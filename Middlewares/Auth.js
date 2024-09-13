/**
 * @description Middleware to check Authentication of a request.
 *              Adds the user of the request and his/her permissions alomg with the request
 * @author CodeClouds
 */

const jwt = require("jsonwebtoken");
const config = require("../config/acl");
const modactions = require("../config/actions");
const User = require("../Models/User");
const _ = require("lodash");
const { asset } = require("../Helpers/Global");

function generatePermissions(roles) {
    var permissions = [];
    for (role of roles) {
        for ([module, content] of Object.entries(config[role])) {
            for ([group, actions] of Object.entries(content)) {
                for (i = 0; i < actions.length; i++) {
                    permissions.push(module + "-" + actions[i] + "-" + group);
                }
            }
        }
    }
    permissions.filter((value, index, self) => {
        return self.indexOf(value) === index;
    });
    return permissions;
}

module.exports = async function (req, res, next) {
    const token = req.header("token");
    if (!token) {
        return res.status(401).json({ message: "Auth Error" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const decoded_user = decoded.user;
        let user = await User.findById(decoded_user.id).lean().exec();
        if (!_.isEmpty(user.avatar)) {
            user.avatar = asset("/uploads/user/" + user.avatar.filename);
        } else {
            user.avatar = asset("/uploads/user/default.png");
        }
        user.permissions = generatePermissions(user.roles);
        req.user = user;
        next();
    } catch (e) {
        console.error(e);
        res.status(401).send({token_expired: true, message: "Invalid Token" });
    }
};
