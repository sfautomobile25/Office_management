// backend/routes/cashApproval.js
const express = require('express');
const router = express.Router();
const { runAsync, getAsync, allAsync } = require('../database');

// Only admin / accounts_officer / manager can approve cash
function requireCashApprover(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const role = req.session.user.role;
  if (role !== 'admin' && role !== 'accounts_officer' && role !== 'manager') {
    return res.status(403).json({ success: false, error: 'Not allowed' });
  }
  next();
}

async function updateDailyCashBalance(date, type, amount) {
  const today = await getAsync('SELECT * FROM daily_cash_balance WHERE date = ?', [date]);
  const amt = parseFloat(amount || 0);

  // helper to get opening from previous day
  const getLatestClosingBalance = async (d) => {
    const latest = await getAsync(
      'SELECT closing_balance FROM daily_cash_balance WHERE date < ? ORDER BY date DESC LIMIT 1',
      [d]
    );
    return latest ? latest.closing_balance : 0;
  };

  if (today) {
    if (type === 'receipt') {
      await runAsync(
        `UPDATE daily_cash_balance
         SET cash_received = cash_received + ?,
             closing_balance = closing_balance + ?
         WHERE date = ?`,
        [amt, amt, date]
      );
    } else if (type === 'payment') {
      await runAsync(
        `UPDATE daily_cash_balance
         SET cash_paid = cash_paid + ?,
             closing_balance = closing_balance - ?
         WHERE date = ?`,
        [amt, amt, date]
      );
    }
    return;
  }

  const opening = await getLatestClosingBalance(date);

  if (type === 'receipt') {
    await runAsync(
      `INSERT INTO daily_cash_balance
       (date, opening_balance, cash_received, cash_paid, closing_balance)
       VALUES (?, ?, ?, ?, ?)`,
      [date, opening, amt, 0, parseFloat(opening) + amt]
    );
  } else if (type === 'payment') {
    await runAsync(
      `INSERT INTO daily_cash_balance
       (date, opening_balance, cash_received, cash_paid, closing_balance)
       VALUES (?, ?, ?, ?, ?)`,
      [date, opening, 0, amt, parseFloat(opening) - amt]
    );
  }
}

// 1) List pending cash transactions
router.get('/pending-transactions', requireCashApprover, async (req, res) => {
  try {
    const rows = await allAsync(
      `SELECT ct.*, u.username AS created_by_name
       FROM cash_transactions ct
       LEFT JOIN users u ON ct.created_by = u.id
       WHERE ct.status = 'pending'
       ORDER BY ct.date DESC, ct.created_at DESC`
    );
    res.json({ success: true, transactions: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to fetch pending transactions' });
  }
});

router.post('/approve-transaction/:id', requireCashApprover, async (req, res) => {
  const { id } = req.params;

  try {
    await runAsync('BEGIN TRANSACTION');

    const tx = await getAsync(`SELECT * FROM cash_transactions WHERE id = ?`, [id]);
    if (!tx) {
      await runAsync('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    if (tx.status !== 'pending') {
      await runAsync('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Only pending transactions can be approved' });
    }

    await runAsync(
      `UPDATE cash_transactions
       SET status = 'approved',
           verified_by = ?,
           verified_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.session.user.id, id]
    );

    // Only update balance inside the same transaction
    await updateDailyCashBalance(tx.date, tx.transaction_type, tx.amount);

    await runAsync(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES (?, ?, ?)`,
      [req.session.user.id, 'CASH_APPROVE', `Approved cash transaction #${id}`]
    );

    await runAsync('COMMIT');

    return res.json({ success: true, message: 'Transaction approved' });
  } catch (e) {
    try { await runAsync('ROLLBACK'); } catch (_) {}
    console.error('Approve failed:', e);
    return res.status(500).json({ success: false, error: 'Failed to approve transaction' });
  }
});


router.post('/reject-transaction/:id', requireCashApprover, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    await runAsync('BEGIN TRANSACTION');

    const tx = await getAsync(`SELECT * FROM cash_transactions WHERE id = ?`, [id]);
    if (!tx) {
      await runAsync('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    if (tx.status !== 'pending') {
      await runAsync('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Only pending transactions can be rejected' });
    }

    const reasonText = (reason || '').trim();
    const newNotes = reasonText ? `${tx.notes || ''} | Rejected: ${reasonText}` : (tx.notes || '');

    await runAsync(
      `UPDATE cash_transactions
       SET status = 'cancelled',
           verified_by = ?,
           verified_at = CURRENT_TIMESTAMP,
           notes = ?
       WHERE id = ?`,
      [req.session.user.id, newNotes, id]
    );

    await runAsync(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES (?, ?, ?)`,
      [req.session.user.id, 'CASH_REJECT', `Rejected cash transaction #${id}`]
    );

    await runAsync('COMMIT');

    return res.json({ success: true, message: 'Transaction rejected' });
  } catch (e) {
    try { await runAsync('ROLLBACK'); } catch (_) {}
    console.error('Reject failed:', e);
    return res.status(500).json({ success: false, error: 'Failed to reject transaction' });
  }
});


// GET /api/cash/transactions?status=approved|cancelled&month=YYYY-MM
router.get('/transactions', requireCashApprover, async (req, res) => {
  try {
    const status = (req.query.status || '').trim();
    const month = (req.query.month || '').trim(); // "2025-12"

    if (!['approved', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // month filter optional; if provided must be YYYY-MM
    let where = `WHERE ct.status = ?`;
    const params = [status];

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ success: false, error: 'Invalid month format (use YYYY-MM)' });
      }
      where += ` AND ct.date LIKE ?`;
      params.push(`${month}%`);
    }

    const rows = await allAsync(
      `SELECT ct.*, u.username AS created_by_name
       FROM cash_transactions ct
       LEFT JOIN users u ON ct.created_by = u.id
       ${where}
       ORDER BY ct.date DESC, ct.created_at DESC`,
      params
    );

    res.json({ success: true, transactions: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});


module.exports = router;
