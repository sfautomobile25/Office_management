const express = require("express");
const router = express.Router();
const { runAsync, getAsync, allAsync } = require("../database");
const ExcelJS = require("exceljs");

// ---------- Dhaka helpers ----------
const dhakaISODate = (offsetDays = 0) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dt);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
};

const formatDhakaNow = (date = new Date()) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

function requireReportAccess(req, res, next) {
  if (!req.session?.user)
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });

  const role = req.session.user.role;
  // allow admin, accounts_officer, manager
  if (!["admin", "accounts_officer", "manager"].includes(role)) {
    return res.status(403).json({ success: false, error: "Not allowed" });
  }
  next();
}

// ---------- Daily cash balance ----------
router.get("/daily-cash", async (req, res) => {
  try {
    const { date, start_date, end_date } = req.query;

    // Validate format YYYY-MM-DD (only if provided)
    const isISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

    if (date && !isISO(date))
      return res
        .status(400)
        .json({ success: false, error: "Invalid date format (YYYY-MM-DD)" });
    if (start_date && !isISO(start_date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid start_date format (YYYY-MM-DD)",
      });
    }

    if (end_date && !isISO(end_date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid end_date format (YYYY-MM-DD)",
      });
    }

    let query = "SELECT * FROM daily_cash_balance WHERE 1=1";
    const params = [];

    if (date) {
      query += " AND date = ?";
      params.push(date);
    } else if (start_date && end_date) {
      query += " AND date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }

    query += " ORDER BY date DESC";
    const balances = await allAsync(query, params);

    return res.json({ success: true, balances: balances || [] });
  } catch (error) {
    console.error("Error fetching daily cash:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch daily cash" });
  }
});

// POST daily cash: recalculates from approved transactions
router.post("/daily-cash", async (req, res) => {
  const { date, opening_balance } = req.body;

  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "").trim())) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid date format (YYYY-MM-DD)" });
    }

    // ✅ Always calculate from approved transactions
    const cashIn = await getAsync(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM cash_transactions
       WHERE date = ? AND transaction_type = 'receipt' AND status = 'approved'`,
      [date]
    );

    const cashOut = await getAsync(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM cash_transactions
       WHERE date = ? AND transaction_type = 'payment' AND status = 'approved'`,
      [date]
    );

    const received = Number(cashIn?.total || 0);
    const paid = Number(cashOut?.total || 0);
    const opening = Number(opening_balance || 0);
    const closing = opening + received - paid;

    await runAsync(
      `INSERT INTO daily_cash_balance
       (date, opening_balance, cash_received, cash_paid, closing_balance)
       VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (date) DO UPDATE SET
        opening_balance = EXCLUDED.opening_balance,
        cash_received = EXCLUDED.cash_received,
        cash_paid = EXCLUDED.cash_paid,
        closing_balance = EXCLUDED.closing_balance,
        reconciled = EXCLUDED.reconciled,
        reconciled_by = EXCLUDED.reconciled_by,
        reconciled_at = EXCLUDED.reconciled_at`,
      [date, opening, received, paid, closing]
    );

    res.json({
      success: true,
      message: "Daily cash recalculated from approved transactions",
      balance: {
        date,
        opening_balance: opening,
        cash_received: received,
        cash_paid: paid,
        closing_balance: closing,
      },
    });
  } catch (error) {
    console.error("Error updating daily cash:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update daily cash" });
  }
});

// ---------- Cash transactions ----------
router.get("/cash-transactions", async (req, res) => {
  try {
    const { date, type, category, status } = req.query;

    let query = `
      SELECT ct.*, u.username as created_by_name, v.username as verified_by_name
      FROM cash_transactions ct
      LEFT JOIN users u ON ct.created_by = u.id
      LEFT JOIN users v ON ct.verified_by = v.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += " AND ct.date = ?";
      params.push(date);
    }
    if (type) {
      query += " AND ct.transaction_type = ?";
      params.push(type);
    }
    if (category) {
      query += " AND ct.category = ?";
      params.push(category);
    }
    if (status) {
      query += " AND ct.status = ?";
      params.push(status);
    }

    query += " ORDER BY ct.date DESC, ct.time DESC";
    const transactions = await allAsync(query, params);

    const totals = transactions.reduce(
      (acc, t) => {
        if (t.transaction_type === "receipt")
          acc.total_receipts += parseFloat(t.amount || 0);
        if (t.transaction_type === "payment")
          acc.total_payments += parseFloat(t.amount || 0);
        return acc;
      },
      { total_receipts: 0, total_payments: 0 }
    );

    res.json({ success: true, transactions, totals });
  } catch (error) {
    console.error("Error fetching cash transactions:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch cash transactions" });
  }
});

router.post("/cash-transactions", async (req, res) => {
  const {
    date,
    time,
    description,
    amount,
    transaction_type,
    category,
    payment_method,
    reference_number,
    received_from,
    paid_to,
    notes,
    scope,
    party_type,
    party_id,
  } = req.body;

  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "").trim())) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid date format (YYYY-MM-DD)" });
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const timestamp = Date.now();
    const transaction_id = `CASH-${timestamp}-${Math.floor(
      Math.random() * 1000
    )}`;

    // 1) Create cash transaction
    const result = await runAsync(
      `INSERT INTO cash_transactions
       (transaction_id, date, time, description, amount, transaction_type, category,
        payment_method, reference_number, received_from, paid_to, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction_id,
        date,
        time || new Date().toTimeString().split(" ")[0],
        description || "",
        amt,
        transaction_type,
        category || "",
        payment_method || "",
        reference_number || "",
        received_from || "",
        paid_to || "",
        notes || "",
        req.session.user.id,
      ]
    );

    const cashTransactionId = result?.lastID;

    // Safety: if lastID not returned, fail loudly (prevents ghost receipts)
    if (!cashTransactionId) {
      return res.status(500).json({
        success: false,
        error: "Transaction saved but ID not returned (receipt not created).",
      });
    }

    // 2) Create money receipt row linked to this cash transaction
    // Receipt number format: MR-YYYYMMDD-000123
    const receipt_no = `MR-${String(date).replaceAll("-", "")}-${String(
      cashTransactionId
    ).padStart(6, "0")}`;

    await runAsync(
      `INSERT INTO money_receipts
       (cash_transaction_id, receipt_no, date, amount, transaction_type, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cashTransactionId,
        receipt_no,
        date,
        amt,
        transaction_type,
        description || "",
        req.session.user.id,
      ]
    );

    return res.json({
      success: true,
      message: "Cash transaction recorded + receipt created",
      transaction_id,
      transactionId: cashTransactionId,
      receipt_no,
    });
  } catch (error) {
    console.error("Error creating cash transaction:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to record cash transaction" });
  }
});

// ---------- Daily summary (from daily_cash_balance; auto-compute if empty) ----------
router.get("/daily-summary", async (req, res) => {
  try {
    const { date, start_date, end_date } = req.query;

    let query = `
      SELECT
        date,
        COALESCE(opening_balance, 0) AS opening_balance,
        COALESCE(cash_received, 0)   AS total_cash_in,
        COALESCE(cash_paid, 0)       AS total_cash_out,
        0                            AS total_bank_in,
        0                            AS total_bank_out,
        (COALESCE(cash_received, 0) - COALESCE(cash_paid, 0)) AS net_cash_flow,
        COALESCE(closing_balance, 0) AS closing_balance
      FROM daily_cash_balance
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += " AND date = ?";
      params.push(date);
    }
    if (start_date && end_date) {
      query += " AND date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }

    query += " ORDER BY date DESC LIMIT 30";
    let summaries = await allAsync(query, params);

    // ✅ If table is empty, compute from approved cash_transactions (last 7 days Dhaka)
    if (!summaries || summaries.length === 0) {
      let start = start_date;
      let end = end_date;

      if (date) {
        start = date;
        end = date;
      } else if (!start || !end) {
        end = dhakaISODate(0);
        start = dhakaISODate(-6);
      }

      const computed = await allAsync(
        `
        SELECT
          date,
          0 AS opening_balance,
          COALESCE(SUM(CASE WHEN transaction_type='receipt' THEN amount END), 0) AS total_cash_in,
          COALESCE(SUM(CASE WHEN transaction_type='payment' THEN amount END), 0) AS total_cash_out,
          0 AS total_bank_in,
          0 AS total_bank_out,
          (
            COALESCE(SUM(CASE WHEN transaction_type='receipt' THEN amount END), 0)
            - COALESCE(SUM(CASE WHEN transaction_type='payment' THEN amount END), 0)
          ) AS net_cash_flow,
          0 AS closing_balance
        FROM cash_transactions
        WHERE status='approved'
          AND date BETWEEN ? AND ?
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
        `,
        [start, end]
      );

      summaries = computed || [];
    }

    const periodTotals = (summaries || []).reduce(
      (acc, s) => ({
        total_cash_in: acc.total_cash_in + Number(s.total_cash_in || 0),
        total_cash_out: acc.total_cash_out + Number(s.total_cash_out || 0),
        total_bank_in: acc.total_bank_in + Number(s.total_bank_in || 0),
        total_bank_out: acc.total_bank_out + Number(s.total_bank_out || 0),
        net_cash_flow: acc.net_cash_flow + Number(s.net_cash_flow || 0),
      }),
      {
        total_cash_in: 0,
        total_cash_out: 0,
        total_bank_in: 0,
        total_bank_out: 0,
        net_cash_flow: 0,
      }
    );

    res.json({ success: true, summaries, periodTotals });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch daily summary" });
  }
});

// ---------- Cash position (FULL object expected by frontend dashboard) ----------
router.get("/cash-position", async (req, res) => {
  try {
    if (!req.session?.user)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const todayDate = dhakaISODate(0);
    const yesterdayDate = dhakaISODate(-1);
    const weekStart = dhakaISODate(-6);
    const monthStart = dhakaISODate(-29);

    // today row (daily_cash_balance) OR fallback to last closing
    let todayRow = await getAsync(
      `SELECT * FROM daily_cash_balance WHERE date = ?`,
      [todayDate]
    );

    if (!todayRow) {
      const prev = await getAsync(
        `SELECT date, closing_balance
         FROM daily_cash_balance
         WHERE date < ?
         ORDER BY date DESC
         LIMIT 1`,
        [todayDate]
      );

      const opening = prev ? Number(prev.closing_balance || 0) : 0;

      todayRow = {
        date: todayDate,
        opening_balance: opening,
        cash_received: 0,
        cash_paid: 0,
        closing_balance: opening,
        last_balance_date: prev ? prev.date : null,
      };
    }

    const yesterdayRow = await getAsync(
      `SELECT closing_balance FROM daily_cash_balance WHERE date = ?`,
      [yesterdayDate]
    );
    const dailyChange =
      Number(todayRow.closing_balance || 0) -
      Number(yesterdayRow?.closing_balance || 0);

    // weekly/monthly flow from APPROVED transactions
    const weekAgg = await getAsync(
      `
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type='receipt' THEN amount END), 0) AS cash_in,
        COALESCE(SUM(CASE WHEN transaction_type='payment' THEN amount END), 0) AS cash_out
      FROM cash_transactions
      WHERE status='approved'
        AND date BETWEEN ? AND ?
      `,
      [weekStart, todayDate]
    );

    const monthAgg = await getAsync(
      `
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type='receipt' THEN amount END), 0) AS cash_in,
        COALESCE(SUM(CASE WHEN transaction_type='payment' THEN amount END), 0) AS cash_out
      FROM cash_transactions
      WHERE status='approved'
        AND date BETWEEN ? AND ?
      `,
      [monthStart, todayDate]
    );

    const weeklyFlow = {
      in: Number(weekAgg?.cash_in || 0),
      out: Number(weekAgg?.cash_out || 0),
      net: Number(weekAgg?.cash_in || 0) - Number(weekAgg?.cash_out || 0),
    };

    const monthlyFlow = {
      in: Number(monthAgg?.cash_in || 0),
      out: Number(monthAgg?.cash_out || 0),
      net: Number(monthAgg?.cash_in || 0) - Number(monthAgg?.cash_out || 0),
    };

    // today activity
    const todayAgg = await getAsync(
      `
      SELECT
        COUNT(*) AS count,
        COALESCE(SUM(CASE WHEN transaction_type='receipt' THEN amount END), 0) AS receipts,
        COALESCE(SUM(CASE WHEN transaction_type='payment' THEN amount END), 0) AS payments
      FROM cash_transactions
      WHERE status='approved'
        AND date = ?
      `,
      [todayDate]
    );

    const todayTransactions = {
      count: Number(todayAgg?.count || 0),
      receipts: Number(todayAgg?.receipts || 0),
      payments: Number(todayAgg?.payments || 0),
    };

    return res.json({
      success: true,
      cashPosition: {
        today: todayRow,
        dailyChange,
        weeklyFlow,
        monthlyFlow,
        todayTransactions,
        meta: {
          todayDate,
          yesterdayDate,
          weekStart,
          monthStart,
          timezone: "Asia/Dhaka",
        },
      },
    });
  } catch (e) {
    console.error("Cash position error:", e);
    res
      .status(500)
      .json({ success: false, error: "Failed to load cash position" });
  }
});

// ---------- Expense analysis ----------
router.get("/expense-analysis", async (req, res) => {
  try {
    const { period } = req.query; // 'day', 'week', 'month', 'year'
    let dateFilter = "";
    const now = new Date();

    switch (period) {
      case "day": {
        dateFilter = `AND ct.date = '${dhakaISODate(0)}'`;
        break;
      }
      case "week": {
        dateFilter = `AND ct.date >= '${dhakaISODate(-6)}'`;
        break;
      }
      case "month": {
        dateFilter = `AND ct.date >= '${dhakaISODate(-29)}'`;
        break;
      }
      case "year": {
        // approx 365
        const dt = new Date();
        dt.setDate(dt.getDate() - 365);
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Dhaka",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(dt);
        const y = parts.find((p) => p.type === "year")?.value;
        const m = parts.find((p) => p.type === "month")?.value;
        const d = parts.find((p) => p.type === "day")?.value;
        dateFilter = `AND ct.date >= '${y}-${m}-${d}'`;
        break;
      }
      default:
        // month default
        dateFilter = `AND ct.date >= '${dhakaISODate(-29)}'`;
    }

    const expenses = await allAsync(`
      SELECT ec.category_name, ec.budget_amount,
             COALESCE(SUM(ct.amount), 0) as actual_spent,
             COUNT(ct.id) as transaction_count
      FROM expense_categories ec
      LEFT JOIN cash_transactions ct ON ec.category_name = ct.category
        AND ct.transaction_type = 'payment'
        AND ct.status = 'approved'
        ${dateFilter}
      WHERE ec.status = 'active'
      GROUP BY ec.id
      ORDER BY actual_spent DESC
    `);

    const totals = expenses.reduce(
      (acc, exp) => ({
        budget: acc.budget + parseFloat(exp.budget_amount || 0),
        spent: acc.spent + parseFloat(exp.actual_spent || 0),
        count: acc.count + Number(exp.transaction_count || 0),
      }),
      { budget: 0, spent: 0, count: 0 }
    );

    res.json({
      success: true,
      period: period || "month",
      expenses,
      totals,
      variance: totals.budget - totals.spent,
    });
  } catch (error) {
    console.error("Error fetching expense analysis:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch expense analysis" });
  }
});

// ---------- Daily report export ----------
router.get("/daily-report/export", requireReportAccess, async (req, res) => {
  try {
    const date = (req.query.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid date format (YYYY-MM-DD)" });
    }

    const daily = await getAsync(
      `SELECT date, opening_balance, cash_received, cash_paid, closing_balance
       FROM daily_cash_balance
       WHERE date = ?`,
      [date]
    );

    const dailyRow = daily || {
      date,
      opening_balance: 0,
      cash_received: 0,
      cash_paid: 0,
      closing_balance: 0,
    };

    const transactions = await allAsync(
      `SELECT ct.*, u.username AS created_by_name
       FROM cash_transactions ct
       LEFT JOIN users u ON u.id = ct.created_by
       WHERE ct.date = ?
         AND ct.status = 'approved'
       ORDER BY ct.created_at ASC`,
      [date]
    );

    const expenseBreakdown = await allAsync(
      `
      SELECT
        'Payments (Approved)' AS category_name,
        COUNT(*) AS transaction_count,
        COALESCE(SUM(ct.amount), 0) AS total_amount
      FROM cash_transactions ct
      WHERE ct.date = ?
        AND ct.status = 'approved'
        AND ct.transaction_type = 'payment'
      `,
      [date]
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = "Real Estate Management";
    wb.created = new Date();

    const ws1 = wb.addWorksheet("Summary");
    ws1.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Opening Balance (BDT)", key: "opening", width: 22 },
      { header: "Cash Received (BDT)", key: "received", width: 22 },
      { header: "Cash Paid (BDT)", key: "paid", width: 20 },
      { header: "Closing Balance (BDT)", key: "closing", width: 22 },
      { header: "Generated At (Dhaka)", key },
      { key: "generated", width: 24 },
      { header: "Generated By", key: "by", width: 18 },
    ];
    ws1.getRow(1).font = { bold: true };

    ws1.addRow({
      date: dailyRow.date,
      opening: Number(dailyRow.opening_balance || 0),
      received: Number(dailyRow.cash_received || 0),
      paid: Number(dailyRow.cash_paid || 0),
      closing: Number(dailyRow.closing_balance || 0),
      generated: formatDhakaNow(),
      by: req.session.user.username || req.session.user.id,
    });

    ["B", "C", "D", "E"].forEach(
      (col) => (ws1.getColumn(col).numFmt = "#,##0.00")
    );

    const ws2 = wb.addWorksheet("Transactions");
    ws2.columns = [
      { header: "Transaction ID", key: "transaction_id", width: 18 },
      { header: "Time (Dhaka)", key: "time", width: 20 },
      { header: "Type", key: "type", width: 12 },
      { header: "Amount (BDT)", key: "amount", width: 16 },
      { header: "Description", key: "desc", width: 40 },
      { header: "Category", key: "category", width: 20 },
      { header: "Created By", key: "created_by", width: 16 },
      { header: "Approved By", key: "approved_by", width: 16 },
    ];
    ws2.getRow(1).font = { bold: true };
    ws2.getColumn("D").numFmt = "#,##0.00";

    for (const t of transactions) {
      ws2.addRow({
        transaction_id: t.transaction_id,
        time: t.verified_at
          ? formatDhakaNow(new Date(t.verified_at))
          : t.time || "",
        type: t.transaction_type,
        amount: Number(t.amount || 0),
        desc: t.description || "",
        category: t.category || "",
        created_by: t.created_by_name || t.created_by || "",
        approved_by: t.verified_by_name || t.verified_by || "",
      });
    }

    const ws3 = wb.addWorksheet("Expense Breakdown");
    ws3.columns = [
      { header: "Category", key: "category", width: 26 },
      { header: "Transactions", key: "count", width: 14 },
      { header: "Total Paid (BDT)", key: "total", width: 18 },
    ];
    ws3.getRow(1).font = { bold: true };
    ws3.getColumn("C").numFmt = "#,##0.00";

    for (const r of expenseBreakdown) {
      ws3.addRow({
        category: r.category_name,
        count: Number(r.transaction_count || 0),
        total: Number(r.total_amount || 0),
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="daily-report-${date}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate daily report" });
  }
});

// ---------- Money receipts ----------
// ✅ List receipts by date
// ✅ List receipts by date (always return approved items)
// - First try money_receipts (printable receipts)
// - If empty, fallback to approved cash_transactions for that date

router.get("/money-receipts", async (req, res) => {
  try {
    if (!req.session?.user)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const date = (req.query.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid date (YYYY-MM-DD)" });
    }

    // 1) Preferred: actual receipt rows (for view/print)
    let rows = await allAsync(
      `
  SELECT
    mr.id,
    mr.cash_transaction_id,
    mr.receipt_no,
    mr.date,
    mr.amount,
    mr.transaction_type AS receipt_type,
    mr.description,
    mr.created_at,
    ct.transaction_id,
    ct.status,
    ct.category
  FROM money_receipts mr
  LEFT JOIN cash_transactions ct ON ct.id = mr.cash_transaction_id
  WHERE mr.date = ?
    AND (ct.status = 'approved' OR ct.status IS NULL)
  ORDER BY mr.created_at DESC, mr.id DESC
  `,
      [date]
    );

    // 2) Fallback: if receipt table empty, show approved cash transactions as “daily transactions”
    if (!rows || rows.length === 0) {
      const tx = await allAsync(
        `
  SELECT
    ct.id AS cash_transaction_id,
    ct.date,
    ct.amount,
    ct.transaction_type AS receipt_type,
    ct.description,
    ct.transaction_id,
    ct.status,
    ct.created_at,
    ct.category,
    ('AUTO-' || ct.transaction_id) AS receipt_no
  FROM cash_transactions ct
  WHERE ct.date = ?
    AND ct.status = 'approved'
  ORDER BY ct.created_at DESC, ct.id DESC
  `,
        [date]
      );

      rows = (tx || []).map((t, i) => ({
        id: 0 - (i + 1), // negative to avoid conflict with real receipt ids
        ...t,
      }));
    }

    return res.json({ success: true, receipts: rows });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load receipts" });
  }
});

// ✅ Get receipt by RECEIPT ID
router.get("/money-receipts/:id", async (req, res) => {
  try {
    if (!req.session?.user)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const id = Number(req.params.id);
    const row = await getAsync(
      `
      SELECT
        mr.*,
        ct.transaction_id,
        ct.status,
        u1.username AS created_by_name,
        u2.username AS approved_by_name
      FROM money_receipts mr
      LEFT JOIN cash_transactions ct ON ct.id = mr.cash_transaction_id
      LEFT JOIN users u1 ON u1.id = mr.created_by
      LEFT JOIN users u2 ON u2.id = mr.approved_by
      WHERE mr.id = ?
      `,
      [id]
    );

    if (!row)
      return res
        .status(404)
        .json({ success: false, error: "Receipt not found" });

    res.json({ success: true, receipt: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to load receipt" });
  }
});

// ✅ Get receipt by CASH TRANSACTION ID (no route conflict)
router.get(
  "/money-receipts/by-transaction/:cashTransactionId",
  async (req, res) => {
    try {
      if (!req.session?.user)
        return res.status(401).json({ success: false, error: "Unauthorized" });

      const cashTransactionId = Number(req.params.cashTransactionId);
      const receipt = await getAsync(
        `SELECT mr.*,
              u1.username AS created_by_name,
              u2.username AS approved_by_name
       FROM money_receipts mr
       LEFT JOIN users u1 ON mr.created_by = u1.id
       LEFT JOIN users u2 ON mr.approved_by = u2.id
       WHERE mr.cash_transaction_id = ?`,
        [cashTransactionId]
      );

      if (!receipt)
        return res
          .status(404)
          .json({ success: false, error: "Receipt not found" });

      res.json({ success: true, receipt });
    } catch (error) {
      console.error("Error fetching receipt:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch receipt" });
    }
  }
);

// ✅ Bank-style statement export (Excel)
// URL: /api/cash/statement/export?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
router.get("/statement/export", async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { start_date, end_date } = req.query;

    const isISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: "start_date and end_date are required (YYYY-MM-DD)",
      });
    }

    if (!isISO(start_date) || !isISO(end_date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Pull transactions in date range
    const rows = await allAsync(
      `
  SELECT
    ct.id,
    ct.transaction_id,
    ct.date,
    ct.time,
    ct.description,
    ct.amount,
    ct.transaction_type,
    ct.category,
    ct.payment_method,
    ct.reference_number,
    ct.received_from,
    ct.paid_to,
    ct.status,
    u.username  AS created_by_name,
    v.username  AS verified_by_name
  FROM cash_transactions ct
  LEFT JOIN users u ON ct.created_by = u.id
  LEFT JOIN users v ON ct.verified_by = v.id
  WHERE ct.date >= ? AND ct.date <= ?
    AND (ct.status IS NULL OR LOWER(ct.status) NOT IN ('cancelled', 'canceled', 'rejected'))
    AND (ct.verified_by IS NOT NULL OR LOWER(ct.status) IN ('approved', 'verified'))
  ORDER BY ct.date ASC, ct.time ASC, ct.id ASC
  `,
      [start_date, end_date]
    );

    // Running balance
    let balance = 0;

    const normalizeType = (t) => String(t || "").toLowerCase();
    const isCreditType = (t) =>
      t.includes("in") || t.includes("receive") || t.includes("credit");

    const statement = rows.map((r, idx) => {
      const amt = Number(r.amount || 0);
      const isReceipt =
        String(r.transaction_type || "").toLowerCase() === "receipt";

      const credit = isReceipt ? amt : 0;
      const debit = isReceipt ? 0 : amt;

      balance = balance + credit - debit;

      const particularsParts = [
        r.description || "",
        r.received_from ? `From: ${r.received_from}` : "",
        r.paid_to ? `To: ${r.paid_to}` : "",
      ].filter(Boolean);

      return {
        sl: idx + 1,
        date: r.date,
        time: r.time || "",
        transNo: r.transaction_id || r.id,
        particulars: particularsParts.join(" | "),
        refNo: r.reference_number || "",
        category: r.category || "",
        method: r.payment_method || "",
        debit,
        credit,
        balance,
        status: r.status || "",
        createdBy: r.created_by_name || "",
        verifiedBy: r.verified_by_name || "",
      };
    });

    // Excel
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Statement");

    ws.mergeCells("A1:K1");
    ws.getCell("A1").value = "Cash Statement (Bank Style)";
    ws.getCell("A1").font = { bold: true, size: 14 };
    ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

    ws.mergeCells("A2:K2");
    ws.getCell("A2").value = `Period: ${start_date} to ${end_date}`;
    ws.getCell("A2").font = { bold: true, size: 11 };
    ws.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };

    ws.addRow([]);

    ws.columns = [
      { header: "SL", key: "sl", width: 6 },
      { header: "Date", key: "date", width: 12 },
      { header: "Time", key: "time", width: 10 },
      { header: "Trans No", key: "transNo", width: 18 },
      { header: "Particulars", key: "particulars", width: 40 },
      { header: "Ref No", key: "refNo", width: 16 },
      { header: "Category", key: "category", width: 16 },
      { header: "Method", key: "method", width: 14 },
      { header: "Debit", key: "debit", width: 14 },
      { header: "Credit", key: "credit", width: 14 },
      { header: "Balance", key: "balance", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Created By", key: "createdBy", width: 16 },
      { header: "Verified By", key: "verifiedBy", width: 16 },
    ];

    // header row
    const headerRow = ws.addRow(ws.columns.map((c) => c.header));
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };
    });

    // data rows
    statement.forEach((s) => {
      ws.addRow([
        s.sl,
        s.date,
        s.time,
        s.transNo,
        s.particulars,
        s.refNo,
        s.category,
        s.method,
        s.debit,
        s.credit,
        s.balance,
        s.status,
        s.createdBy,
        s.verifiedBy,
      ]);
    });

    // number format
    ["F", "G", "H", "I", "J", "K"].forEach((col) => {
      ws.getColumn(col).numFmt = "#,##0.00";
    });

    // freeze header
    ws.views = [
      { state: "frozen", ySplit: ws.lastRow.number - statement.length },
    ];

    const filename = `Cash_Statement_${start_date}_to_${end_date}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("statement/export error:", e);
    res
      .status(500)
      .json({ success: false, error: "Failed to export statement" });
  }
});

// ✅ Bank-style statement (JSON for UI table)
router.get("/statement", async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: "start_date and end_date are required",
      });
    }

    const rows = await allAsync(
      `
      SELECT
        ct.id,
        ct.transaction_id,
        ct.date,
        ct.time,
        ct.description,
        ct.amount,
        ct.transaction_type,
        ct.category,
        ct.payment_method,
        ct.reference_number,
        ct.received_from,
        ct.paid_to,
        ct.status,
        u.username AS created_by_name,
        v.username AS verified_by_name
      FROM cash_transactions ct
      LEFT JOIN users u ON ct.created_by = u.id
      LEFT JOIN users v ON ct.verified_by = v.id
      WHERE ct.date >= ? AND ct.date <= ?
        AND (ct.status IS NULL OR LOWER(ct.status) NOT IN ('cancelled', 'canceled', 'rejected'))
        AND (ct.verified_by IS NOT NULL OR LOWER(ct.status) IN ('approved', 'verified'))
      ORDER BY ct.date ASC, ct.time ASC, ct.id ASC
      `,
      [start_date, end_date]
    );

    let balance = 0;

    const statement = rows.map((r, idx) => {
      const amt = Number(r.amount || 0);
      const isReceipt =
        String(r.transaction_type || "").toLowerCase() === "receipt";

      const credit = isReceipt ? amt : 0;
      const debit = isReceipt ? 0 : amt;

      balance = balance + credit - debit;

      return {
        sl: idx + 1,
        date: r.date,
        time: r.time,
        transaction_no: r.transaction_id || r.id,
        particulars: r.description,
        category: r.category,
        method: r.payment_method,
        debit,
        credit,
        balance,
        status: r.status,
        created_by: r.created_by_name,
        verified_by: r.verified_by_name,
      };
    });

    res.json({
      success: true,
      statement,
      summary: {
        total_debit: statement.reduce((s, r) => s + r.debit, 0),
        total_credit: statement.reduce((s, r) => s + r.credit, 0),
        closing_balance: balance,
      },
    });
  } catch (e) {
    console.error("statement error:", e);
    res.status(500).json({ success: false, error: "Failed to load statement" });
  }
});

module.exports = router;
