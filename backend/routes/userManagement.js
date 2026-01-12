const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { allAsync, getAsync, runAsync } = require("../database");

// -----------------------------
// Auth + Permission Middleware
// -----------------------------
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.status(401).json({ success: false, error: "Authentication required" });
}

function requirePermission(perm) {
  return (req, res, next) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ success: false, error: "Authentication required" });

    // Admin always allowed
    if (user.role === "admin") return next();

    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    if (perms.includes("all") || perms.includes(perm)) return next();

    return res.status(403).json({ success: false, error: "Permission denied" });
  };
}

router.use(requireAuth);
router.use(requirePermission("user_manage"));

// -----------------------------
// Helpers
// -----------------------------
const ALLOWED_ROLES = new Set([
  "admin",
  "manager",
  "accounts_officer",
  "staff",
  "customer",
  "broker",
  "supplier",
  "user",
  "guest",
]);

const SCOPE_TO_ROLES = {
  general: [], // no party list needed
  staff: ["admin", "manager", "accounts_officer", "staff"], // ✅ FIX YOUR ISSUE
  customer: ["customer"],
  broker: ["broker"],
  supplier: ["supplier"],
};

function normalizeRole(role) {
  const r = String(role || "").trim().toLowerCase();
  // normalize common variations
  if (r === "accounts officer") return "accounts_officer";
  if (r === "account officer") return "accounts_officer";
  if (r === "brocker") return "broker"; // common typo
  return r;
}

async function assertUniqueUsernameEmail({ username, email, excludeId }) {
  const clauses = [];
  const params = [];

  if (username) {
    clauses.push("username = ?");
    params.push(username);
  }
  if (email) {
    clauses.push("email = ?");
    params.push(email);
  }

  if (!clauses.length) return null;

  let sql = `SELECT id FROM users WHERE (${clauses.join(" OR ")})`;
  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }

  return await getAsync(sql, params);
}

// -----------------------------
// GET: list users
// -----------------------------
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

// -----------------------------
// POST: create user
// -----------------------------
router.post("/users", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = normalizeRole(req.body.role || "user");
    const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "username, email and password are required",
      });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }

    // Only admin can create/assign admin
    if (role === "admin" && req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only admin can assign admin role" });
    }

    const existingUser = await assertUniqueUsernameEmail({ username, email });
    if (existingUser) {
      return res.status(409).json({ success: false, error: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await runAsync(
      `INSERT INTO users (username, email, password, role, permissions)
       VALUES (?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, role, JSON.stringify(permissions)]
    );

    await runAsync(
      "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.session.user.id, "CREATE_USER", `Created user: ${username} with role: ${role}`]
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

// -----------------------------
// PUT: update user
// -----------------------------
router.put("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const username = req.body.username !== undefined ? String(req.body.username || "").trim() : undefined;
    const email =
      req.body.email !== undefined ? String(req.body.email || "").trim().toLowerCase() : undefined;
    const role = req.body.role !== undefined ? normalizeRole(req.body.role) : undefined;
    const permissions = req.body.permissions;

    // Only admin can promote/demote admin
    if (role === "admin" && req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only admin can assign admin role" });
    }

    if (role && !ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }

    const existingUser = await assertUniqueUsernameEmail({
      username: username || undefined,
      email: email || undefined,
      excludeId: id,
    });

    if (existingUser) {
      return res.status(409).json({ success: false, error: "Username or email already exists" });
    }

    const updates = [];
    const params = [];

    if (username !== undefined && username !== "") {
      updates.push("username = ?");
      params.push(username);
    }
    if (email !== undefined && email !== "") {
      updates.push("email = ?");
      params.push(email);
    }
    if (role !== undefined && role !== "") {
      updates.push("role = ?");
      params.push(role);
    }
    if (permissions !== undefined) {
      updates.push("permissions = ?");
      params.push(JSON.stringify(Array.isArray(permissions) ? permissions : []));
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    params.push(id);
    await runAsync(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

    // invalidate sessions for that user by bumping session_version (if column exists)
    try {
      await runAsync(
        `UPDATE users SET session_version = COALESCE(session_version, 1) + 1 WHERE id = ?`,
        [id]
      );
    } catch (_) {
      // ignore if session_version column doesn't exist
    }

    // If updating yourself, refresh session
    if (parseInt(id, 10) === req.session.user.id) {
      if (role) req.session.user.role = role;
      if (permissions !== undefined) req.session.user.permissions = Array.isArray(permissions) ? permissions : [];
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

// -----------------------------
// DELETE: delete user
// -----------------------------
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (parseInt(id, 10) === req.session.user.id) {
      return res.status(400).json({ success: false, error: "Cannot delete your own account" });
    }

    const user = await getAsync("SELECT id, username, role FROM users WHERE id = ?", [id]);
    if (user && user.role === "admin") {
      const admins = await allAsync('SELECT id FROM users WHERE role = "admin"');
      if (admins.length <= 1) {
        return res.status(400).json({ success: false, error: "Cannot delete the only admin user" });
      }
      if (req.session.user.role !== "admin") {
        return res.status(403).json({ success: false, error: "Only admin can delete admin users" });
      }
    }

    await runAsync("DELETE FROM users WHERE id = ?", [id]);

    await runAsync(
      "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.session.user.id, "DELETE_USER", `Deleted user: ${user?.username || id}`]
    );

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

// -----------------------------
// GET: users by role (keep for compatibility)
// -----------------------------
router.get("/users/by-role/:role", async (req, res) => {
  try {
    const role = normalizeRole(req.params.role);

    if (!ALLOWED_ROLES.has(role)) {
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

// -----------------------------
// ✅ NEW: GET users by scope (what your Transaction Scope needs)
// -----------------------------
router.get("/users/by-scope/:scope", async (req, res) => {
  try {
    const scope = String(req.params.scope || "").trim().toLowerCase();
    const roles = SCOPE_TO_ROLES[scope];

    if (!roles) {
      return res.status(400).json({ success: false, error: "Invalid scope" });
    }

    if (roles.length === 0) {
      return res.json({ success: true, users: [] });
    }

    const placeholders = roles.map(() => "?").join(",");
    const users = await allAsync(
      `SELECT id, username AS name, email, role
       FROM users
       WHERE role IN (${placeholders})
       ORDER BY username ASC`,
      roles
    );

    res.json({ success: true, users });
  } catch (err) {
    console.error("by-scope error:", err);
    res.status(500).json({ success: false, error: "Failed to load users" });
  }
});

module.exports = router;
