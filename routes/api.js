/**
 * @description Routes enlisted here are used for API Endpoints where our frontend App connects.
 * @author CodeClouds
 */

const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const AuthMiddleware = require("../Middlewares/Auth");
const CheckPermissionMiddleware = require("../Middlewares/CheckPermission");
var AuthControllerClass = require("../Controllers/AuthConroller");
var DynamicRouteControllerClass = require("../Controllers/DynamicRouteController");
const DynamicRouteController = new DynamicRouteControllerClass();
const AuthController = new AuthControllerClass();
router.get("/", (req, res) => {
    res.json({ message: "API Works" });
});

router.post(
    "/auth/signup",
    [
        check("username", "Please Enter a Valid Name").not().isEmpty(),
        check("email", "Please enter a valid email").isEmail(),
        check("phone", "Please Enter a Valid Phone No").not().isEmpty(),
        check("password", "Please enter a valid password").isLength({ min: 6 }),
        check("roles", "Please select a valid role").isArray({ min: 1 }),
    ],
    AuthController.signup
);

router.post(
    "/auth/login",
    AuthController.login
);

router.post(
    "/auth/change-password",
    [
        check("new_password", "Please enter a valid new_password").isLength({
            min: 8,
        }),
        check("old_password", "Please enter a valid old_password").isLength({
            min: 8,
        }),
        check(
            "confirm_new_password",
            "Please enter a valid confirm_new_password"
        ).isLength({ min: 8 }),
        AuthMiddleware,
    ],
    AuthController.changePassword
);

router.post(
    "/auth/update-profile",
    [
        check("username", "Please enter a valid User name").not().isEmpty(),
        AuthMiddleware,
    ],
    AuthController.updateProfile
);
router.get(
    "/auth/remove-avatar",
    [AuthMiddleware],
    AuthController.removeAvatar
);
router.get("/auth/profile", [AuthMiddleware], AuthController.profile);
router.get("/auth/logout", [AuthMiddleware],AuthController.logout);
router.post("/auth/forgot-password", AuthController.forgotPassword);
router.post("/auth/set-password", AuthController.setPassword);



router.all(
    "/:module/:action?/:id?",
    [AuthMiddleware, CheckPermissionMiddleware],
    DynamicRouteController.handel
);
module.exports = router;
