const express = require('express');
const router = express.Router();
const { allAsync, getAsync } = require('../database'); // adjust if your exports differ

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ success: false, error: 'Auth required' });
  next();
}

// GET /api/receipts?date=YYYY-MM-DD
router.get('/', requireAuth, async (req, res) => {
  try {
    const date = (req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Invalid date' });
    }

    const rows = await allAsync(
      `
      SELECT
        mr.*,
        u1.username AS created_by_name,
        u2.username AS approved_by_name
      FROM money_receipts mr
      LEFT JOIN users u1 ON u1.id = mr.created_by
      LEFT JOIN users u2 ON u2.id = mr.approved_by
      WHERE mr.date = ?
      ORDER BY mr.created_at DESC
      `,
      [date]
    );

    res.json({ success: true, receipts: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to load receipts' });
  }
});

// GET /api/receipts/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await getAsync(
      `
      SELECT
        mr.*,
        u1.username AS created_by_name,
        u2.username AS approved_by_name
      FROM money_receipts mr
      LEFT JOIN users u1 ON u1.id = mr.created_by
      LEFT JOIN users u2 ON u2.id = mr.approved_by
      WHERE mr.id = ?
      `,
      [id]
    );

    if (!row) return res.status(404).json({ success: false, error: 'Receipt not found' });

    res.json({ success: true, receipt: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to load receipt' });
  }
});

module.exports = router;
