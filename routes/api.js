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
var FrontendControllerClass = require("../Controllers/FrontendController");
var DynamicRouteControllerClass = require("../Controllers/DynamicRouteController");
const VerifyEncryptedTokenMiddleware = require("../Middlewares/VerifyEncryptedToken");
const DynamicRouteController = new DynamicRouteControllerClass();
const AuthController = new AuthControllerClass();
const FrontendController = new FrontendControllerClass();
router.get("/", (req, res) => {
    res.json({ message: "API Works..." });
});

router.post(
    "/auth/signup",
    AuthController.signup
);

router.post(
    "/auth/login",
    AuthController.login
);

router.post(
    "/auth/change-password",
    [
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
router.get("/app-setting/view",[VerifyEncryptedTokenMiddleware],FrontendController.view);
router.post("/app-setting/config",[VerifyEncryptedTokenMiddleware],FrontendController.config);
router.post("/quotation/create",[VerifyEncryptedTokenMiddleware],FrontendController.quotationCreate);
router.get("/quotation/view",[VerifyEncryptedTokenMiddleware],FrontendController.quotationView);
router.post("/quotation/generatePaymentLink",[VerifyEncryptedTokenMiddleware],FrontendController.generatePaymentLink);
router.post("/quotation/updatePaymentResponse",[VerifyEncryptedTokenMiddleware],FrontendController.updatePaymentResponse);
router.get("/quotation/downloadPDF",[VerifyEncryptedTokenMiddleware],FrontendController.downloadPDF);
router.post("/webhook/order",FrontendController.order);




router.all(
    "/:module/:action?/:id?",
    [AuthMiddleware, CheckPermissionMiddleware],
    DynamicRouteController.handel
);
module.exports = router;
