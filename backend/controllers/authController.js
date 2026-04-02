const userModel = require("../models/userModel");

const normalizeString = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => normalizeString(value).toLowerCase();

const signup = async (req, res, next) => {
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

    const user = await userModel.createUser({ fullName, company, email, password });

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

const forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = normalizeString(req.body.password);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password should be at least 6 characters" });
    }

    const updatedUser = await userModel.updatePasswordByEmail(email, password);

    if (!updatedUser) {
      return res.status(404).json({ message: "No account found with this email." });
    }

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
  forgotPassword,
  login,
  signup,
  updateProfile,
};
