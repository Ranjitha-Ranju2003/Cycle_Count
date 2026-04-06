const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/auth/signup/request-otp", authController.requestSignupOtp);
router.post("/auth/signup/verify-otp", authController.verifySignupOtp);
router.post("/auth/login", authController.login);
router.post("/auth/forgot-password/request-otp", authController.requestForgotPasswordOtp);
router.post("/auth/forgot-password/verify-otp", authController.verifyForgotPasswordOtp);
router.put("/users/:id", authController.updateProfile);
router.delete("/users/:id", authController.deleteProfile);

module.exports = router;
