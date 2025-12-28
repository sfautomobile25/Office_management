// backend/routes/cashApproval.js
const express = require("express");
const router = express.Router();
const { runAsync, getAsync, allAsync } = require("../database");

// Only admin / accounts_officer / manager can approve cash
function requireCashApprover(req, res, next) {
  if (!req.session?.user) {
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });
  }
  const role = req.session.user.role;
  if (role !== "admin" && role !== "accounts_officer" && role !== "manager") {
    return res.status(403).json({ success: false, error: "Not allowed" });
  }
  next();
}

async function updateDailyCashBalance(date, type, amount) {
  const today = await getAsync(
    "SELECT * FROM daily_cash_balance WHERE date = ?",
    [date]
  );
  const amt = parseFloat(amount || 0);

  const getLatestClosingBalance = async (d) => {
    const latest = await getAsync(
      "SELECT closing_balance FROM daily_cash_balance WHERE date < ? ORDER BY date DESC LIMIT 1",
      [d]
    );
    return latest ? latest.closing_balance : 0;
  };

  if (today) {
    if (type === "receipt") {
      await runAsync(
        `UPDATE daily_cash_balance
         SET cash_received = cash_received + ?,
             closing_balance = closing_balance + ?
         WHERE date = ?`,
        [amt, amt, date]
      );
    } else if (type === "payment") {
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

  if (type === "receipt") {
    await runAsync(
      `INSERT INTO daily_cash_balance
       (date, opening_balance, cash_received, cash_paid, closing_balance)
       VALUES (?, ?, ?, ?, ?)`,
      [date, opening, amt, 0, parseFloat(opening) + amt]
    );
  } else if (type === "payment") {
    await runAsync(
      `INSERT INTO daily_cash_balance
       (date, opening_balance, cash_received, cash_paid, closing_balance)
       VALUES (?, ?, ?, ?, ?)`,
      [date, opening, 0, amt, parseFloat(opening) - amt]
    );
  }
}

// ✅ Default currency changed to BDT
async function ensureAccount({
  account_number,
  account_name,
  account_type,
  currency = "BDT",
}) {
  const existing = await getAsync(
    `SELECT id FROM accounts WHERE account_number = ?`,
    [account_number]
  );
  if (existing) return existing.id;

  const result = await runAsync(
    `INSERT INTO accounts (account_number, account_name, account_type, balance, currency, status)
     VALUES (?, ?, ?, 0, ?, 'active')`,
    [account_number, account_name, account_type, currency]
  );
  return result.lastID;
}

async function postJournalEntry({
  date,
  description,
  total_amount,
  created_by,
  approved_by,
  lines,
}) {
  const entry_number = `JE-CASH-${Date.now()}`;

  const entryRes = await runAsync(
    `INSERT INTO journal_entries
     (entry_number, date, description, total_amount, status, created_by, approved_by, posted_at)
     VALUES (?, ?, ?, ?, 'posted', ?, ?, CURRENT_TIMESTAMP)`,
    [entry_number, date, description, total_amount, created_by, approved_by]
  );

  const journal_entry_id = entryRes.lastID;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];

    await runAsync(
      `INSERT INTO journal_entry_lines
       (journal_entry_id, account_id, description, debit, credit, line_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        journal_entry_id,
        ln.account_id,
        ln.description || "",
        ln.debit || 0,
        ln.credit || 0,
        i + 1,
      ]
    );

    // Update balances
    if ((ln.debit || 0) > 0) {
      await runAsync(
        `UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [ln.debit, ln.account_id]
      );
    }
    if ((ln.credit || 0) > 0) {
      await runAsync(
        `UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [ln.credit, ln.account_id]
      );
    }
  }

  return { journal_entry_id, entry_number };
}

// ✅ consistent receipt number format (unique + readable)
function makeReceiptNo(tx) {
  // MR-YYYYMMDD-000123
  const ymd = String(tx.date || "").replace(/-/g, "");
  const idPart = String(tx.id).padStart(6, "0");
  return `MR-${ymd}-${idPart}`;
}

// 1) List pending cash transactions
router.get("/pending-transactions", requireCashApprover, async (req, res) => {
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
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch pending transactions" });
  }
});

router.post(
  "/approve-transaction/:id",
  requireCashApprover,
  async (req, res) => {
    const { id } = req.params;

    try {
      await runAsync("BEGIN TRANSACTION");

      const tx = await getAsync(
        `SELECT * FROM cash_transactions WHERE id = ?`,
        [id]
      );
      if (!tx) {
        await runAsync("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, error: "Transaction not found" });
      }
      if (tx.status !== "pending") {
        await runAsync("ROLLBACK");
        return res
          .status(400)
          .json({
            success: false,
            error: "Only pending transactions can be approved",
          });
      }

      // ✅ Ensure default accounts exist
      const cashAccountId = await ensureAccount({
        account_number: "1010",
        account_name: "Cash",
        account_type: "asset",
      });

      const cashReceiptIncomeId = await ensureAccount({
        account_number: "4000",
        account_name: "Cash Receipts (Income)",
        account_type: "revenue",
      });

      const cashPaymentExpenseId = await ensureAccount({
        account_number: "5000",
        account_name: "Cash Payments (Expense)",
        account_type: "expense",
      });

      const amt = Number(tx.amount);

      // ✅ Build journal lines
      let lines = [];
      const jeDescription = `Cash ${tx.transaction_type}: ${tx.description} (CashTx: ${tx.transaction_id})`;

      if (tx.transaction_type === "receipt") {
        lines = [
          {
            account_id: cashAccountId,
            description: tx.description,
            debit: amt,
            credit: 0,
          },
          {
            account_id: cashReceiptIncomeId,
            description: tx.description,
            debit: 0,
            credit: amt,
          },
        ];
      } else if (tx.transaction_type === "payment") {
        lines = [
          {
            account_id: cashPaymentExpenseId,
            description: tx.description,
            debit: amt,
            credit: 0,
          },
          {
            account_id: cashAccountId,
            description: tx.description,
            debit: 0,
            credit: amt,
          },
        ];
      } else {
        await runAsync("ROLLBACK");
        return res
          .status(400)
          .json({ success: false, error: "Only receipt/payment supported" });
      }

      // ✅ Update daily cash balance
      await updateDailyCashBalance(tx.date, tx.transaction_type, tx.amount);

      // ✅ Create journal entry
      const je = await postJournalEntry({
        date: tx.date,
        description: jeDescription,
        total_amount: amt,
        created_by: tx.created_by || req.session.user.id,
        approved_by: req.session.user.id,
        lines,
      });

      // ✅ Mark cash transaction approved
      await runAsync(
        `UPDATE cash_transactions
       SET status = 'approved',
           verified_by = ?,
           verified_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
        [req.session.user.id, id]
      );

      /* ======================================================
       ✅ CREATE MONEY RECEIPT (matches your table columns)
       ====================================================== */
      const receiptNo = makeReceiptNo(tx);

      // Create only if not exists for this transaction
      const existingReceipt = await getAsync(
        `SELECT id FROM money_receipts WHERE cash_transaction_id = ?`,
        [tx.id]
      );

      if (!existingReceipt) {
        // NOTE: columns assumed:
        // receipt_no, cash_transaction_id, date, amount, receipt_type, description, created_by, approved_by
        await runAsync(
          `
        INSERT OR IGNORE INTO money_receipts
          (receipt_no, cash_transaction_id, date, received_from, paid_to,
          amount, transaction_type, description, created_by, approved_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            receiptNo,
            tx.id,
            tx.date,
            tx.transaction_type === "receipt" ? tx.received_from || "" : "",
            tx.transaction_type === "payment" ? tx.paid_to || "" : "",
            amt,
            tx.transaction_type,
            tx.description || "",
            tx.created_by || req.session.user.id,
            req.session.user.id,
          ]
        );
      }

      // ✅ Audit log
      await runAsync(
        `INSERT INTO audit_logs (user_id, action, details)
       VALUES (?, ?, ?)`,
        [
          req.session.user.id,
          "CASH_APPROVE",
          `Approved cash transaction #${id}, posted ${je.entry_number}, receipt ${receiptNo}`,
        ]
      );

      await runAsync("COMMIT");

      return res.json({
        success: true,
        message: "Transaction approved, journal posted, receipt created",
        journal_entry_number: je.entry_number,
        receipt_no: receiptNo,
      });
    } catch (e) {
      try {
        await runAsync("ROLLBACK");
      } catch (_) {}
      console.error("Approve failed:", e);
      return res
        .status(500)
        .json({ success: false, error: "Failed to approve transaction" });
    }
  }
);

router.post(
  "/reject-transaction/:id",
  requireCashApprover,
  async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      await runAsync("BEGIN TRANSACTION");

      const tx = await getAsync(
        `SELECT * FROM cash_transactions WHERE id = ?`,
        [id]
      );
      if (!tx) {
        await runAsync("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, error: "Transaction not found" });
      }
      if (tx.status !== "pending") {
        await runAsync("ROLLBACK");
        return res
          .status(400)
          .json({
            success: false,
            error: "Only pending transactions can be rejected",
          });
      }

      const reasonText = (reason || "").trim();
      const newNotes = reasonText
        ? `${tx.notes || ""} | Rejected: ${reasonText}`
        : tx.notes || "";

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
        [req.session.user.id, "CASH_REJECT", `Rejected cash transaction #${id}`]
      );

      await runAsync("COMMIT");

      return res.json({ success: true, message: "Transaction rejected" });
    } catch (e) {
      try {
        await runAsync("ROLLBACK");
      } catch (_) {}
      console.error("Reject failed:", e);
      return res
        .status(500)
        .json({ success: false, error: "Failed to reject transaction" });
    }
  }
);

// GET /api/cash/transactions?status=approved|cancelled&month=YYYY-MM
router.get("/transactions", requireCashApprover, async (req, res) => {
  try {
    const status = (req.query.status || "").trim();
    const month = (req.query.month || "").trim(); // "2025-12"

    if (!["approved", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    let where = `WHERE ct.status = ?`;
    const params = [status];

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Invalid month format (use YYYY-MM)",
          });
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
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch transactions" });
  }
});

module.exports = router;
