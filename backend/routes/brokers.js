const express = require("express");
const router = express.Router();
const { allAsync, runAsync } = require("../database");

router.get("/", async (req, res) => {
  try {
    const brokers = await allAsync(
      "SELECT id, name FROM brokers WHERE status='active' ORDER BY name"
    );
    res.json({ brokers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load brokers" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    await runAsync(
      "INSERT INTO brokers (name, phone, status) VALUES (?, ?, 'active')",
      [name, phone || null]
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create broker" });
  }
});

module.exports = router;
