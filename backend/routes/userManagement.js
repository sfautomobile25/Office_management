const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { allAsync, getAsync, runAsync } = require("../database");

// --- Middleware ---
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res
    .status(401)
    .json({ success: false, error: "Authentication required" });
}

function hasPermission(user, perm) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes("all") || perms.includes(perm);
}

function requirePermission(perm) {
  return (req, res, next) => {
    if (hasPermission(req.session.user, perm)) return next();
    return res.status(403).json({ success: false, error: "Permission denied" });
  };
}

router.use(requireAuth);
router.use(requirePermission("user_manage"));

// GET: list users
router.get("/users", async (req, res) => {
  try {
    const users = await allAsync(
      "SELECT id, username, email, role, permissions, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// POST: create user
router.post("/users", async (req, res) => {
  const { username, email, password, role, permissions } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "username, email and password are required",
      });
    }

    // Only admin can create/assign admin
    if (role === "admin" && req.session.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, error: "Only admin can assign admin role" });
    }

    const existingUser = await getAsync(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await runAsync(
      `INSERT INTO users (username, email, password, role, permissions)
       VALUES (?, ?, ?, ?, ?)`,
      [
        username,
        email,
        hashedPassword,
        role || "user",
        JSON.stringify(permissions || []),
      ]
    );

    await runAsync(
      "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
      [
        req.session.user.id,
        "CREATE_USER",
        `Created user: ${username} with role: ${role || "user"}`,
      ]
    );

    res.json({
      success: true,
      message: "User created successfully",
      userId: result.lastID,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ success: false, error: "Failed to create user" });
  }
});

// PUT: update user
router.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { username, email, role, permissions } = req.body;
  try {
    // Only admin can promote/demote admin
    if (role === "admin" && req.session.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, error: "Only admin can assign admin role" });
    }

    if (username || email) {
      const existingUser = await getAsync(
        "SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?",
        [username || "", email || "", id]
      );
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, error: "Username or email already exists" });
      }
    }

    const updates = [];
    const params = [];
    if (username) {
      updates.push("username = ?");
      params.push(username);
    }
    if (email) {
      updates.push("email = ?");
      params.push(email);
    }
    if (role) {
      updates.push("role = ?");
      params.push(role);
    }
    if (permissions !== undefined) {
      updates.push("permissions = ?");
      params.push(JSON.stringify(permissions));
    }

    if (!updates.length) {
      return res
        .status(400)
        .json({ success: false, error: "No fields to update" });
    }

    params.push(id);
    await runAsync(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    // ✅ invalidate sessions for that user by bumping session_version
    await runAsync(
      `UPDATE users SET session_version = COALESCE(session_version, 1) + 1 WHERE id = ?`,
      [id]
    );

    // If updating yourself, refresh session permissions so UI reflects immediately
    if (parseInt(id, 10) === req.session.user.id) {
      if (role) req.session.user.role = role;
      if (permissions !== undefined) req.session.user.permissions = permissions;
      if (username) req.session.user.username = username;
      if (email) req.session.user.email = email;
    }

    await runAsync(
      "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.session.user.id, "UPDATE_USER", `Updated user ID: ${id}`]
    );

    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
});

// DELETE: delete user
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (parseInt(id, 10) === req.session.user.id) {
      return res
        .status(400)
        .json({ success: false, error: "Cannot delete your own account" });
    }

    const user = await getAsync("SELECT * FROM users WHERE id = ?", [id]);
    if (user && user.role === "admin") {
      const admins = await allAsync('SELECT * FROM users WHERE role = "admin"');
      if (admins.length <= 1) {
        return res
          .status(400)
          .json({ success: false, error: "Cannot delete the only admin user" });
      }
      if (req.session.user.role !== "admin") {
        return res
          .status(403)
          .json({ success: false, error: "Only admin can delete admin users" });
      }
    }

    await runAsync("DELETE FROM users WHERE id = ?", [id]);

    await runAsync(
      "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
      [
        req.session.user.id,
        "DELETE_USER",
        `Deleted user: ${user?.username || id}`,
      ]
    );

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

// GET: users by role (for dropdowns)
router.get("/users/by-role/:role", async (req, res) => {
  try {
    const role = String(req.params.role || "").trim();

    // allow only certain roles to prevent weird queries
    const allowed = [
      "staff",
      "customer",
      "broker",
      "supplier",
      "admin",
      "manager",
      "accounts_officer",
      "user",
    ];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }

    const users = await allAsync(
      "SELECT id, username AS name, email, role FROM users WHERE role = ? ORDER BY username ASC",
      [role]
    );

    res.json({ success: true, users });
  } catch (err) {
    console.error("by-role error:", err);
    res.status(500).json({ success: false, error: "Failed to load users" });
  }
});

module.exports = router;
