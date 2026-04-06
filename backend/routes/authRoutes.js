const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/auth/signup", authController.signup);
router.post("/auth/login", authController.login);
router.post("/auth/forgot-password", authController.forgotPassword);
router.put("/users/:id", authController.updateProfile);
router.delete("/users/:id", authController.deleteProfile);

module.exports = router;
