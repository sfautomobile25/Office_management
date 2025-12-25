const express = require('express');
const router = express.Router();
const { runAsync, getAsync, allAsync } = require('../database');

function getDhakaDateString(d = new Date()) {
  // YYYY-MM-DD in Asia/Dhaka
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);

  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${day}`;
}


// Get daily cash balance
router.get('/daily-cash', async (req, res) => {
    try {
        const { date, start_date, end_date } = req.query;
        
        let query = 'SELECT * FROM daily_cash_balance WHERE 1=1';
        const params = [];
        
        if (date) {
            query += ' AND date = ?';
            params.push(date);
        }
        
        if (start_date && end_date) {
            query += ' AND date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }
        
        query += ' ORDER BY date DESC';
        
        const balances = await allAsync(query, params);
        
        res.json({
            success: true,
            balances
        });
    } catch (error) {
        console.error('Error fetching daily cash:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch daily cash' });
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

// Update daily cash balance helper
// async function updateDailyCashBalance(date, type, amount) {
//     try {
//         const today = await getAsync('SELECT * FROM daily_cash_balance WHERE date = ?', [date]);
        
//         if (today) {
//             if (type === 'receipt') {
//                 await runAsync(
//                     `UPDATE daily_cash_balance 
//                      SET cash_received = cash_received + ?, 
//                          closing_balance = closing_balance + ?
//                      WHERE date = ?`,
//                     [amount, amount, date]
//                 );
//             } else if (type === 'payment') {
//                 await runAsync(
//                     `UPDATE daily_cash_balance 
//                      SET cash_paid = cash_paid + ?, 
//                          closing_balance = closing_balance - ?
//                      WHERE date = ?`,
//                     [amount, amount, date]
//                 );
//             }
//         } else {
//             // Create new entry for the day
//             const opening = await getLatestClosingBalance(date);
            
//             if (type === 'receipt') {
//                 await runAsync(
//                     `INSERT INTO daily_cash_balance 
//                      (date, opening_balance, cash_received, cash_paid, closing_balance)
//                      VALUES (?, ?, ?, ?, ?)`,
//                     [date, opening, amount, 0, parseFloat(opening) + parseFloat(amount)]
//                 );
//             } else if (type === 'payment') {
//                 await runAsync(
//                     `INSERT INTO daily_cash_balance 
//                      (date, opening_balance, cash_received, cash_paid, closing_balance)
//                      VALUES (?, ?, ?, ?, ?)`,
//                     [date, opening, 0, amount, parseFloat(opening) - parseFloat(amount)]
//                 );
//             }
//         }
//     } catch (error) {
//         console.error('Error updating daily cash balance:', error);
//     }
// }

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

// Get cash position overview (Dhaka timezone)
router.get('/cash-position', async (req, res) => {
    try {
        // Helper: get YYYY-MM-DD in Asia/Dhaka
        const getDhakaISODate = (d = new Date()) => {
            const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Dhaka',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).formatToParts(d);

            const y = parts.find(p => p.type === 'year')?.value;
            const m = parts.find(p => p.type === 'month')?.value;
            const day = parts.find(p => p.type === 'day')?.value;
            return `${y}-${m}-${day}`;
        };

        const today = getDhakaISODate(new Date());

        // Yesterday (Dhaka)
        const todayDateObj = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
        const yesterdayObj = new Date(todayDateObj.getTime() - 86400000);
        const yesterday = getDhakaISODate(yesterdayObj);

        // Weekly/monthly ranges (Dhaka)
        const weekAgoObj = new Date(todayDateObj.getTime() - 7 * 86400000);
        const monthAgoObj = new Date(todayDateObj.getTime() - 30 * 86400000);
        const weekAgo = getDhakaISODate(weekAgoObj);
        const monthAgo = getDhakaISODate(monthAgoObj);

        // Today's cash (approved-only logic is already ensured because daily_cash_balance updates on approval)
        const todayCash = await getAsync(
            'SELECT * FROM daily_cash_balance WHERE date = ?',
            [today]
        );

        // Yesterday's cash
        const yesterdayCash = await getAsync(
            'SELECT * FROM daily_cash_balance WHERE date = ?',
            [yesterday]
        );

        // Weekly cash flow
        const weeklyFlow = await getAsync(
            `SELECT SUM(cash_received) as total_in, SUM(cash_paid) as total_out
             FROM daily_cash_balance WHERE date >= ?`,
            [weekAgo]
        );

        // Monthly cash flow
        const monthlyFlow = await getAsync(
            `SELECT SUM(cash_received) as total_in, SUM(cash_paid) as total_out
             FROM daily_cash_balance WHERE date >= ?`,
            [monthAgo]
        );

        // Today's transactions count (approved only)
        const todayTransactions = await getAsync(
            `SELECT COUNT(*) as count,
                    SUM(CASE WHEN transaction_type = 'receipt' THEN amount ELSE 0 END) as receipts,
                    SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) as payments
             FROM cash_transactions
             WHERE date = ? AND status = 'approved'`,
            [today]
        );

        res.json({
            success: true,
            cashPosition: {
                today: todayCash || { closing_balance: 0 },
                yesterday: yesterdayCash || { closing_balance: 0 },
                dailyChange: todayCash
                    ? (parseFloat(todayCash.closing_balance || 0) - parseFloat(yesterdayCash?.closing_balance || 0))
                    : 0,
                weeklyFlow: {
                    in: weeklyFlow?.total_in || 0,
                    out: weeklyFlow?.total_out || 0,
                    net: (weeklyFlow?.total_in || 0) - (weeklyFlow?.total_out || 0)
                },
                monthlyFlow: {
                    in: monthlyFlow?.total_in || 0,
                    out: monthlyFlow?.total_out || 0,
                    net: (monthlyFlow?.total_in || 0) - (monthlyFlow?.total_out || 0)
                },
                todayTransactions: {
                    count: todayTransactions?.count || 0,
                    receipts: todayTransactions?.receipts || 0,
                    payments: todayTransactions?.payments || 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching cash position:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cash position' });
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

module.exports = router;