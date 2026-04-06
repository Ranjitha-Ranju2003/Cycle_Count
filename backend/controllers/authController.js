const userModel = require("../models/userModel");
const { isEmailConfigured, sendOtpEmail } = require("../utils/emailService");

const normalizeString = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => normalizeString(value).toLowerCase();
const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const OTP_PURPOSE = {
  SIGNUP: "signup",
  RESET_PASSWORD: "reset_password",
};

const generateOtpCode = () =>
  String(Math.floor(Math.random() * 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

const getOtpExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES);
  return expiresAt;
};

const deliverOtp = async ({ email, otpCode, purpose }) => {
  if (isEmailConfigured()) {
    await sendOtpEmail({ email, otpCode, purpose });
    return {
      message: "OTP sent to your email.",
    };
  }

  console.log(`[OTP:${purpose}] ${email} -> ${otpCode}`);

  return {
    message: "Email OTP is not configured, so the OTP is shown here for testing.",
    otpPreview: otpCode,
  };
};

const requestSignupOtp = async (req, res, next) => {
  try {
    const fullName = normalizeString(req.body.fullName);
    const company = normalizeString(req.body.company);
    const email = normalizeEmail(req.body.email);
    const password = normalizeString(req.body.password);

    if (!fullName || !company || !email || !password) {
      return res.status(400).json({ message: "All signup fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password should be at least 6 characters" });
    }

    const existingUser = await userModel.findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const otpCode = generateOtpCode();
    await userModel.storeEmailOtp({
      email,
      purpose: OTP_PURPOSE.SIGNUP,
      otpCode,
      payload: {
        fullName,
        company,
        email,
        password,
      },
      expiresAt: getOtpExpiryDate(),
    });

    const deliveryResult = await deliverOtp({
      email,
      otpCode,
      purpose: OTP_PURPOSE.SIGNUP,
    });

    res.status(201).json({
      message: `${deliveryResult.message} Enter it to complete signup.`,
      otpPreview: deliveryResult.otpPreview || null,
    });
  } catch (error) {
    next(error);
  }
};

const verifySignupOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = normalizeString(req.body.otp);

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const existingUser = await userModel.findUserByEmail(email);

    if (existingUser) {
      await userModel.deleteEmailOtps(email, OTP_PURPOSE.SIGNUP);
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const otpEntry = await userModel.findValidEmailOtp({
      email,
      purpose: OTP_PURPOSE.SIGNUP,
      otpCode: otp,
    });

    if (!otpEntry?.payload) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const user = await userModel.createUser({
      fullName: normalizeString(otpEntry.payload.fullName),
      company: normalizeString(otpEntry.payload.company),
      email: normalizeEmail(otpEntry.payload.email),
      password: normalizeString(otpEntry.payload.password),
    });

    await userModel.deleteEmailOtps(email, OTP_PURPOSE.SIGNUP);

    res.status(201).json({
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = normalizeString(req.body.password);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await userModel.findUserByEmail(email);

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        fullName: user.fullName,
        company: user.company,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

const requestForgotPasswordOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingUser = await userModel.findUserByEmail(email);

    if (!existingUser) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    const otpCode = generateOtpCode();
    await userModel.storeEmailOtp({
      email,
      purpose: OTP_PURPOSE.RESET_PASSWORD,
      otpCode,
      payload: null,
      expiresAt: getOtpExpiryDate(),
    });

    const deliveryResult = await deliverOtp({
      email,
      otpCode,
      purpose: OTP_PURPOSE.RESET_PASSWORD,
    });

    res.json({
      message: `${deliveryResult.message} Verify it to reset your password.`,
      otpPreview: deliveryResult.otpPreview || null,
    });
  } catch (error) {
    next(error);
  }
};

const verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = normalizeString(req.body.otp);
    const password = normalizeString(req.body.password);

    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password should be at least 6 characters" });
    }

    const otpEntry = await userModel.findValidEmailOtp({
      email,
      purpose: OTP_PURPOSE.RESET_PASSWORD,
      otpCode: otp,
    });

    if (!otpEntry) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const updatedUser = await userModel.updatePasswordByEmail(email, password);

    if (!updatedUser) {
      await userModel.deleteEmailOtps(email, OTP_PURPOSE.RESET_PASSWORD);
      return res.status(404).json({ message: "No account found with this email." });
    }

    await userModel.deleteEmailOtps(email, OTP_PURPOSE.RESET_PASSWORD);

    res.json({
      message: "Password updated successfully. You can now sign in.",
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const fullName = normalizeString(req.body.fullName);
    const company = normalizeString(req.body.company);
    const email = normalizeEmail(req.body.email);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Valid user id is required" });
    }

    if (!fullName || !company || !email) {
      return res.status(400).json({ message: "Full name, company, and email are required" });
    }

    const existingUser = await userModel.findUserByEmail(email);

    if (existingUser && existingUser.id !== id) {
      return res.status(409).json({ message: "Another account already uses this email." });
    }

    const updatedUser = await userModel.updateUserById(id, { fullName, company, email });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProfile = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Valid user id is required" });
    }

    const deletedUser = await userModel.deleteUserById(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile deleted successfully",
      user: deletedUser,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  deleteProfile,
  login,
  requestForgotPasswordOtp,
  requestSignupOtp,
  updateProfile,
  verifyForgotPasswordOtp,
  verifySignupOtp,
};
