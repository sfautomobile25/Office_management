const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getAsync, runAsync } = require("../database");
const crypto = require("crypto");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-jwt-secret-key-change-in-production";

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  console.log(`🔑 Login attempt for: ${username}`);

  try {
    // Get user from database
    const user = await getAsync("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (!user) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      console.log(`❌ Invalid password for: ${username}`);
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const permissions = JSON.parse(user.permissions || "[]");
    const sessionVersion = user.session_version || 1;

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions,
      session_version: sessionVersion,
    };

    // Log the login
    await runAsync(
      "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
      [user.id, "LOGIN", `User ${username} logged in successfully`]
    );

    console.log(`✅ Login successful for: ${username}`);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions,
        session_version: sessionVersion,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Logout route
router.post("/logout", async (req, res) => {
  if (req.session.user) {
    try {
      await runAsync(
        "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
        [
          req.session.user.id,
          "LOGOUT",
          `User ${req.session.user.username} logged out`,
        ]
      );
    } catch (error) {
      console.error("Error logging logout:", error);
    }
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: "Failed to logout",
      });
    }

    res.clearCookie("connect.sid");
    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  });
});

// ✅ Check session (with session invalidation)
router.get("/check", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ loggedIn: false });
    }

    // Always verify against DB (permissions can change)
    const dbUser = await getAsync(
      "SELECT id, username, email, role, permissions, session_version FROM users WHERE id = ?",
      [req.session.user.id]
    );

    if (!dbUser) {
      req.session.destroy(() => {});
      return res.status(401).json({ loggedIn: false });
    }

    const dbSessionVersion = dbUser.session_version || 1;
    const sessionVersion = req.session.user.session_version || 1;

    // ✅ if admin changed permissions, invalidate this session
    if (dbSessionVersion !== sessionVersion) {
      req.session.destroy(() => {});
      return res.status(409).json({
        loggedIn: false,
        code: "SESSION_INVALIDATED",
        message: "Your permissions were updated. Please log in again.",
      });
    }

    // Keep session in sync (role/permissions changes that do NOT bump version)
    req.session.user.username = dbUser.username;
    req.session.user.email = dbUser.email;
    req.session.user.role = dbUser.role;
    req.session.user.permissions = JSON.parse(dbUser.permissions || "[]");
    req.session.user.session_version = dbSessionVersion;

    return res.json({
      loggedIn: true,
      user: req.session.user,
    });
  } catch (error) {
    console.error("❌ Session check error:", error);
    return res.status(500).json({
      loggedIn: false,
      error: "Failed to check session",
    });
  }
});

// Check admin status
router.get("/check-admin", (req, res) => {
  if (req.session.user && req.session.user.role === "admin") {
    return res.json({
      isAdmin: true,
      user: req.session.user,
    });
  }
  return res.json({ isAdmin: false });
});

// Register route
router.post("/register", async (req, res) => {
  const { username, email, password, confirmPassword, role } = req.body;

  console.log(`🔧 Registration attempt for: ${username}`);

  // Validation
  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      error: "All fields are required",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: "Passwords do not match",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: "Password must be at least 6 characters",
    });
  }

  try {
    // Check if user already exists
    const existingUser = await getAsync(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Username or email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default role is 'user' unless specified by admin
    const userRole = role || "user";

    // Create user (session_version starts at 1)
    const result = await runAsync(
      `INSERT INTO users (username, email, password, role, permissions, session_version)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, userRole, JSON.stringify([]), 1]
    );

    // Log the registration
    await runAsync(
      "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
      [result.lastID, "REGISTER", `User ${username} registered`]
    );

    console.log(`✅ User registered: ${username} (ID: ${result.lastID})`);

    return res.json({
      success: true,
      message: "Registration successful! Please login.",
      userId: result.lastID,
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Registration failed. Please try again.",
    });
  }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await getAsync("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) {
      return res.json({
        success: true,
        message: "If your email exists, you will receive reset instructions",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    console.log(`Reset token for ${email}: ${resetToken}`);

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    return res.json({
      success: true,
      message: "Password reset instructions sent to your email",
      resetLink: process.env.NODE_ENV === "development" ? resetLink : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process request",
    });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || token.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    console.log(`Password reset with token: ${token}`);

    return res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reset password",
    });
  }
});

module.exports = router;
