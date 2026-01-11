const express = require("express");
const router = express.Router();
const { allAsync, runAsync } = require("../database");

// GET all active customers (for dropdowns)
router.get("/", async (req, res) => {
  try {
    const customers = await allAsync(
      "SELECT id, name FROM customers WHERE status = 'active' ORDER BY name"
    );
    res.json({ customers });
  } catch (err) {
    console.error("❌ Failed to load customers:", err);
    res.status(500).json({ error: "Failed to load customers" });
  }
});

// POST create customer (admin)
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    await runAsync(
      `
      INSERT INTO customers (name, phone, email, address)
      VALUES (?, ?, ?, ?)
      `,
      [name, phone || null, email || null, address || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to create customer:", err);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

module.exports = router;
