const express = require('express');
const router = express.Router();
const { runAsync, getAsync, allAsync } = require('../database');
const ExcelJS = require('exceljs');


const formatDhakaNow = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date());

function requireReportAccess(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ success: false, error: 'Authentication required' });

  const role = req.session.user.role;
  // allow admin, accounts_officer, manager
  if (!['admin', 'accounts_officer', 'manager'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Not allowed' });
  }
  next();
}

// Get daily cash balance
router.get('/daily-cash', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }

    const rows = await allAsync(
      `
      SELECT
        ct.id,
        ct.transaction_id,
        ct.date,
        ct.amount,
        ct.transaction_type,
        ct.description,
        ct.verified_at,
        mr.receipt_no
      FROM cash_transactions ct
      LEFT JOIN money_receipts mr
        ON mr.cash_transaction_id = ct.id
      WHERE ct.status = 'approved'
        AND ct.date = ?
      ORDER BY ct.verified_at DESC, ct.id DESC
      `,
      [date]
    );

    res.json({ success: true, transactions: rows });
  } catch (error) {
    console.error('Daily transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load daily transactions'
    });
  }
});


router.post('/daily-cash', async (req, res) => {
  const { date, opening_balance } = req.body;

  try {
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

    const received = Number(cashIn.total || 0);
    const paid = Number(cashOut.total || 0);
    const opening = Number(opening_balance || 0);
    const closing = opening + received - paid;

    await runAsync(
      `INSERT OR REPLACE INTO daily_cash_balance
       (date, opening_balance, cash_received, cash_paid, closing_balance)
       VALUES (?, ?, ?, ?, ?)`,
      [date, opening, received, paid, closing]
    );

    res.json({
      success: true,
      message: 'Daily cash recalculated from approved transactions',
      balance: { date, opening_balance: opening, cash_received: received, cash_paid: paid, closing_balance: closing }
    });
  } catch (error) {
    console.error('Error updating daily cash:', error);
    res.status(500).json({ success: false, error: 'Failed to update daily cash' });
  }
});

// Get cash transactions
router.get('/cash-transactions', async (req, res) => {
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
            query += ' AND ct.date = ?';
            params.push(date);
        }
        
        if (type) {
            query += ' AND ct.transaction_type = ?';
            params.push(type);
        }
        
        if (category) {
            query += ' AND ct.category = ?';
            params.push(category);
        }
        
        if (status) {
            query += ' AND ct.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY ct.date DESC, ct.time DESC';
        
        const transactions = await allAsync(query, params);
        
        // Calculate totals
        const totals = transactions.reduce((acc, t) => {
            if (t.transaction_type === 'receipt') {
                acc.total_receipts += parseFloat(t.amount);
            } else if (t.transaction_type === 'payment') {
                acc.total_payments += parseFloat(t.amount);
            }
            return acc;
        }, { total_receipts: 0, total_payments: 0 });
        
        res.json({
            success: true,
            transactions,
            totals
        });
    } catch (error) {
        console.error('Error fetching cash transactions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cash transactions' });
    }
});

// Create cash transaction
router.post('/cash-transactions', async (req, res) => {
    const {
        date, time, description, amount, transaction_type, category,
        payment_method, reference_number, received_from, paid_to, notes
    } = req.body;
    
    try {
        // Generate transaction ID
        const timestamp = Date.now();
        const transaction_id = `CASH-${timestamp}-${Math.floor(Math.random() * 1000)}`;
        
        const result = await runAsync(
            `INSERT INTO cash_transactions 
             (transaction_id, date, time, description, amount, transaction_type, category,
              payment_method, reference_number, received_from, paid_to, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [transaction_id, date, time || new Date().toTimeString().split(' ')[0], 
             description, amount, transaction_type, category, payment_method, 
             reference_number, received_from, paid_to, notes, req.session.user.id]
        );
        
        
        res.json({
            success: true,
            message: 'Cash transaction recorded',
            transaction_id,
            transactionId: result.lastID
        });
    } catch (error) {
        console.error('Error creating cash transaction:', error);
        res.status(500).json({ success: false, error: 'Failed to record cash transaction' });
    }
});

// Get latest closing balance
async function getLatestClosingBalance(date) {
    try {
        const latest = await getAsync(
            'SELECT closing_balance FROM daily_cash_balance WHERE date < ? ORDER BY date DESC LIMIT 1',
            [date]
        );
        return latest ? latest.closing_balance : 0;
    } catch (error) {
        return 0;
    }
}

// Get daily summary (APPROVED-ONLY cash summary)
router.get('/daily-summary', async (req, res) => {
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
      query += ' AND date = ?';
      params.push(date);
    }

    if (start_date && end_date) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY date DESC LIMIT 30';

    const summaries = await allAsync(query, params);

    // Calculate period totals
    const periodTotals = summaries.reduce(
      (acc, s) => ({
        total_cash_in: acc.total_cash_in + Number(s.total_cash_in || 0),
        total_cash_out: acc.total_cash_out + Number(s.total_cash_out || 0),
        total_bank_in: acc.total_bank_in + Number(s.total_bank_in || 0),
        total_bank_out: acc.total_bank_out + Number(s.total_bank_out || 0),
        net_cash_flow: acc.net_cash_flow + Number(s.net_cash_flow || 0)
      }),
      {
        total_cash_in: 0,
        total_cash_out: 0,
        total_bank_in: 0,
        total_bank_out: 0,
        net_cash_flow: 0
      }
    );

    res.json({
      success: true,
      summaries,
      periodTotals
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch daily summary' });
  }
});

// Generate daily summary
router.post('/generate-daily-summary', async (req, res) => {
    const { date } = req.body;
    
    try {
        // Calculate totals for the day
        const cashIn = await getAsync(
            `SELECT SUM(amount) as total FROM cash_transactions 
             WHERE date = ? AND transaction_type = 'receipt' AND status = 'approved'`,
            [date]
        );
        
        const cashOut = await getAsync(
            `SELECT SUM(amount) as total FROM cash_transactions 
             WHERE date = ? AND transaction_type = 'payment' AND status = 'approved'`,
            [date]
        );
        
        const cashBalance = await getAsync(
            'SELECT * FROM daily_cash_balance WHERE date = ?',
            [date]
        );
        
        // Calculate net cash flow
        const netCashFlow = (cashIn.total || 0) - (cashOut.total || 0);
        
        // Update or create daily summary
        await runAsync(
            `INSERT OR REPLACE INTO daily_summary 
             (date, total_cash_in, total_cash_out, net_cash_flow, 
              opening_cash, closing_cash)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [date, cashIn.total || 0, cashOut.total || 0, netCashFlow,
             cashBalance ? cashBalance.opening_balance : 0,
             cashBalance ? cashBalance.closing_balance : 0]
        );
        
        res.json({
            success: true,
            message: 'Daily summary generated',
            summary: {
                date,
                total_cash_in: cashIn.total || 0,
                total_cash_out: cashOut.total || 0,
                net_cash_flow: netCashFlow,
                opening_cash: cashBalance ? cashBalance.opening_balance : 0,
                closing_cash: cashBalance ? cashBalance.closing_balance : 0
            }
        });
    } catch (error) {
        console.error('Error generating daily summary:', error);
        res.status(500).json({ success: false, error: 'Failed to generate daily summary' });
    }
});

router.get('/cash-position', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const today = new Date().toISOString().slice(0, 10);

    // 1) today row
    let row = await getAsync(`SELECT * FROM daily_cash_balance WHERE date = ?`, [today]);

    // 2) fallback to latest previous closing balance
    if (!row) {
      const prev = await getAsync(
        `SELECT date, closing_balance
         FROM daily_cash_balance
         WHERE date < ?
         ORDER BY date DESC
         LIMIT 1`,
        [today]
      );

      if (prev) {
        row = {
          date: today,
          opening_balance: prev.closing_balance,
          cash_received: 0,
          cash_paid: 0,
          closing_balance: prev.closing_balance,
          last_balance_date: prev.date
        };
      }
    }

    // 3) still nothing
    if (!row) {
      row = {
        date: today,
        opening_balance: 0,
        cash_received: 0,
        cash_paid: 0,
        closing_balance: 0,
        last_balance_date: null
      };
    }

    res.json({ success: true, cashPosition: row });
  } catch (e) {
    console.error('Cash position error:', e);
    res.status(500).json({ success: false, error: 'Failed to load cash position' });
  }
});

// Get expense categories with spending
router.get('/expense-analysis', async (req, res) => {
    try {
        const { period } = req.query; // 'day', 'week', 'month', 'year'
        
        let dateFilter = '';
        const now = new Date();
        
        switch(period) {
            case 'day':
                dateFilter = `AND ct.date = '${now.toISOString().split('T')[0]}'`;
                break;
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 86400000);
                dateFilter = `AND ct.date >= '${weekAgo.toISOString().split('T')[0]}'`;
                break;
            case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 86400000);
                dateFilter = `AND ct.date >= '${monthAgo.toISOString().split('T')[0]}'`;
                break;
            case 'year':
                const yearAgo = new Date(now.getTime() - 365 * 86400000);
                dateFilter = `AND ct.date >= '${yearAgo.toISOString().split('T')[0]}'`;
                break;
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
        
        // Calculate totals
        const totals = expenses.reduce((acc, exp) => ({
            budget: acc.budget + parseFloat(exp.budget_amount),
            spent: acc.spent + parseFloat(exp.actual_spent),
            count: acc.count + exp.transaction_count
        }), { budget: 0, spent: 0, count: 0 });
        
        res.json({
            success: true,
            period,
            expenses,
            totals,
            variance: totals.budget - totals.spent
        });
    } catch (error) {
        console.error('Error fetching expense analysis:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch expense analysis' });
    }
});

router.get('/today-balance', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const row = await getAsync(
      `SELECT date, opening_balance, cash_received, cash_paid, closing_balance
       FROM daily_cash_balance
       WHERE date = ?`,
      [today]
    );

    res.json({
      success: true,
      date: today,
      balance: row ? row.closing_balance : 0,
      details: row || {
        date: today,
        opening_balance: 0,
        cash_received: 0,
        cash_paid: 0,
        closing_balance: 0
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to load today balance' });
  }
});

// GET /api/cash/daily-report/export?date=YYYY-MM-DD
router.get('/daily-report/export', requireReportAccess, async (req, res) => {
  try {
    const date = (req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Invalid date format (YYYY-MM-DD)' });
    }

    // 1) Daily balances (approved-only, because you update this only on approval)
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
      closing_balance: 0
    };

    // 2) Approved transactions of the day
    const transactions = await allAsync(
      `SELECT ct.*, u.username AS created_by_name
       FROM cash_transactions ct
       LEFT JOIN users u ON u.id = ct.created_by
       WHERE ct.date = ?
         AND ct.status = 'approved'
       ORDER BY ct.created_at ASC`,
      [date]
    );

    // 3) Expense breakdown (approved payments grouped)
    // If your cash transaction has category_id, it will use it; otherwise it falls back to "Uncategorized"
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


    // ---- Build Excel ----
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Real Estate Management';
    wb.created = new Date();

    // Sheet 1: Summary
    const ws1 = wb.addWorksheet('Summary');
    ws1.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Opening Balance (BDT)', key: 'opening', width: 22 },
      { header: 'Cash Received (BDT)', key: 'received', width: 22 },
      { header: 'Cash Paid (BDT)', key: 'paid', width: 20 },
      { header: 'Closing Balance (BDT)', key: 'closing', width: 22 },
      { header: 'Generated At (Dhaka)', key: 'generated', width: 24 },
      { header: 'Generated By', key: 'by', width: 18 }
    ];
    ws1.getRow(1).font = { bold: true };

    ws1.addRow({
      date: dailyRow.date,
      opening: Number(dailyRow.opening_balance || 0),
      received: Number(dailyRow.cash_received || 0),
      paid: Number(dailyRow.cash_paid || 0),
      closing: Number(dailyRow.closing_balance || 0),
      generated: formatDhakaNow(),
      by: req.session.user.username || req.session.user.id
    });

    ['B', 'C', 'D', 'E'].forEach((col) => (ws1.getColumn(col).numFmt = '#,##0.00'));

    // Sheet 2: Transactions
    const ws2 = wb.addWorksheet('Transactions');
    ws2.columns = [
      { header: 'Transaction ID', key: 'transaction_id', width: 18 },
      { header: 'Time (Dhaka)', key: 'time', width: 20 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Amount (BDT)', key: 'amount', width: 16 },
      { header: 'Description', key: 'desc', width: 40 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Created By', key: 'created_by', width: 16 },
      { header: 'Approved By', key: 'approved_by', width: 16 }
    ];
    ws2.getRow(1).font = { bold: true };
    ws2.getColumn('D').numFmt = '#,##0.00';

    for (const t of transactions) {
      ws2.addRow({
        transaction_id: t.transaction_id,
        time: t.verified_at ? formatDhakaNow(new Date(t.verified_at)) : '',
        type: t.transaction_type,
        amount: Number(t.amount || 0),
        desc: t.description || '',
        category: t.category_name || '',
        created_by: t.created_by_name || t.created_by || '',
        approved_by: t.verified_by || ''
      });
    }

    // Sheet 3: Expense Breakdown
    const ws3 = wb.addWorksheet('Expense Breakdown');
    ws3.columns = [
      { header: 'Category', key: 'category', width: 26 },
      { header: 'Transactions', key: 'count', width: 14 },
      { header: 'Total Paid (BDT)', key: 'total', width: 18 }
    ];
    ws3.getRow(1).font = { bold: true };
    ws3.getColumn('C').numFmt = '#,##0.00';

    for (const r of expenseBreakdown) {
      ws3.addRow({
        category: r.category_name,
        count: Number(r.transaction_count || 0),
        total: Number(r.total_amount || 0)
      });
    }

    // Download response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="daily-report-${date}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to generate daily report' });
  }
});

// GET /api/cash/money-receipts?date=YYYY-MM-DD
router.get('/money-receipts', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const date = (req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Invalid date (YYYY-MM-DD)' });
    }

    const rows = await allAsync(
      `
      SELECT
        mr.id,
        mr.receipt_no,
        mr.date,
        mr.amount,
        mr.transaction_type AS receipt_type,
        mr.description,
        mr.created_at,
        ct.transaction_id,
        ct.status
      FROM money_receipts mr
      JOIN cash_transactions ct ON ct.id = mr.cash_transaction_id
      WHERE mr.date = ?
      ORDER BY mr.created_at DESC, mr.id DESC

      `,
      [date]
    );

    res.json({ success: true, receipts: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to load receipts' });
  }
});

router.get('/money-receipts/:id', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

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
      JOIN cash_transactions ct ON ct.id = mr.cash_transaction_id
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

// Get money receipt by cash transaction id
router.get('/money-receipts/:cashTransactionId', async (req, res) => {
    try {
        const { cashTransactionId } = req.params;

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

        if (!receipt) {
            return res.status(404).json({ success: false, error: 'Receipt not found' });
        }

        res.json({ success: true, receipt });
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch receipt' });
    }
});





module.exports = router;