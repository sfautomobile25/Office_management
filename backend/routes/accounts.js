const express = require('express');
const router = express.Router();
const { runAsync, getAsync, allAsync } = require('../database');
const ExcelJS = require('exceljs');


// Middleware to check accounts permissions
const checkAccountsPermission = (permissionType, resourceType) => {
    return async (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const user = req.session.user;
        
        // Admin has all permissions
        if (user.role === 'admin') {
            return next();
        }

        // Check if user has accounts officer role
        if (user.role !== 'accounts_officer' && user.role !== 'manager') {
            return res.status(403).json({ success: false, error: 'Accounts access required' });
        }

        // Check specific permission if provided
        if (permissionType && resourceType) {
            try {
                const permission = await getAsync(
                    `SELECT * FROM account_permissions 
                     WHERE user_id = ? 
                     AND permission_type = ? 
                     AND resource_type = ? 
                     AND (resource_id IS NULL OR resource_id = ?)
                     AND (expires_at IS NULL OR expires_at > DATETIME('now'))`,
                    [user.id, permissionType, resourceType, req.params.id || null]
                );

                if (!permission) {
                    return res.status(403).json({ success: false, error: 'Permission denied' });
                }
            } catch (error) {
                console.error('Permission check error:', error);
                return res.status(500).json({ success: false, error: 'Permission check failed' });
            }
        }

        next();
    };
};

function pad2(n) { return String(n).padStart(2, '0'); }

function getDateRangeFromQuery(q) {
  const period = (q.period || 'monthly').toLowerCase(); // monthly|quarterly|yearly
  const year = Number(q.year);
  const month = Number(q.month);       // 1-12 (for monthly)
  const quarter = Number(q.quarter);   // 1-4  (for quarterly)

  if (!year || year < 1900 || year > 3000) throw new Error('Invalid year');

  let start, end;

  if (period === 'monthly') {
    if (!month || month < 1 || month > 12) throw new Error('Invalid month');
    start = `${year}-${pad2(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  } else if (period === 'quarterly') {
    if (!quarter || quarter < 1 || quarter > 4) throw new Error('Invalid quarter');
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    start = `${year}-${pad2(startMonth)}-01`;
    const lastDay = new Date(year, endMonth, 0).getDate();
    end = `${year}-${pad2(endMonth)}-${pad2(lastDay)}`;
  } else if (period === 'yearly') {
    start = `${year}-01-01`;
    end = `${year}-12-31`;
  } else {
    throw new Error('Invalid period (monthly|quarterly|yearly)');
  }

  return { period, year, month, quarter, start, end };
}

function formatDhakaDateTime(value) {
  if (!value) return '';
  const dt = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return String(value);

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(dt);
}

function pad2(n) { return String(n).padStart(2, '0'); }

function getRangeFromQuery(q) {
  const period = (q.period || 'monthly').toLowerCase(); // monthly|quarterly|yearly|custom
  const year = q.year ? Number(q.year) : null;
  const month = q.month ? Number(q.month) : null;       // 1-12
  const quarter = q.quarter ? Number(q.quarter) : null; // 1-4

  const start_date = (q.start_date || '').trim();
  const end_date = (q.end_date || '').trim();

  if (period === 'custom') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      throw new Error('Invalid custom date range (use start_date/end_date as YYYY-MM-DD)');
    }
    return { period, start: start_date, end: end_date, year, month, quarter };
  }

  if (!year || year < 1900 || year > 3000) throw new Error('Invalid year');

  if (period === 'monthly') {
    if (!month || month < 1 || month > 12) throw new Error('Invalid month');
    const start = `${year}-${pad2(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
    return { period, start, end, year, month, quarter };
  }

  if (period === 'quarterly') {
    if (!quarter || quarter < 1 || quarter > 4) throw new Error('Invalid quarter');
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const start = `${year}-${pad2(startMonth)}-01`;
    const lastDay = new Date(year, endMonth, 0).getDate();
    const end = `${year}-${pad2(endMonth)}-${pad2(lastDay)}`;
    return { period, start, end, year, month, quarter };
  }

  if (period === 'yearly') {
    return { period, start: `${year}-01-01`, end: `${year}-12-31`, year, month, quarter };
  }

  throw new Error('Invalid period');
}

// Apply accounts access middleware to all routes
router.use(checkAccountsPermission());

// Accounts Management
router.get('/accounts', async (req, res) => {
    try {
        const accounts = await allAsync(`
            SELECT a.*, u.username as created_by_name 
            FROM accounts a 
            LEFT JOIN users u ON a.created_by = u.id 
            ORDER BY a.account_number
        `);
        
        // Calculate total balances by type
        const totals = await allAsync(`
            SELECT account_type, SUM(balance) as total
            FROM accounts 
            WHERE status = 'active'
            GROUP BY account_type
        `);
        
        res.json({
            success: true,
            accounts,
            totals
        });
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
    }
});

router.post('/accounts', checkAccountsPermission('create', 'accounts'), async (req, res) => {
    const { account_number, account_name, account_type, currency, initial_balance } = req.body;
    
    try {
        // Validate account number uniqueness
        const existing = await getAsync('SELECT * FROM accounts WHERE account_number = ?', [account_number]);
        if (existing) {
            return res.status(400).json({ success: false, error: 'Account number already exists' });
        }
        
        const result = await runAsync(
            `INSERT INTO accounts 
             (account_number, account_name, account_type, balance, currency, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [account_number, account_name, account_type, initial_balance || 0, currency || 'USD', req.session.user.id]
        );
        
        // Log the action
        await runAsync(
            'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'CREATE_ACCOUNT', `Created account: ${account_number} - ${account_name}`]
        );
        
        res.json({
            success: true,
            message: 'Account created successfully',
            accountId: result.lastID
        });
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ success: false, error: 'Failed to create account' });
    }
});

// Transactions
router.get('/transactions', async (req, res) => {
    try {
        const { account_id, start_date, end_date, status } = req.query;
        
        let query = `
            SELECT t.*, a.account_number, a.account_name, 
                   u1.username as created_by_name, u2.username as approved_by_name
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN users u1 ON t.created_by = u1.id
            LEFT JOIN users u2 ON t.approved_by = u2.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (account_id) {
            query += ' AND t.account_id = ?';
            params.push(account_id);
        }
        
        if (start_date) {
            query += ' AND t.date >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND t.date <= ?';
            params.push(end_date);
        }
        
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY t.date DESC, t.created_at DESC';
        
        const transactions = await allAsync(query, params);
        
        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
});

router.post('/transactions', checkAccountsPermission('create', 'transactions'), async (req, res) => {
    const { date, description, amount, transaction_type, account_id, reference_number, category } = req.body;
    
    try {
        // Generate transaction ID
        const prefix = transaction_type === 'debit' ? 'DR' : 'CR';
        const timestamp = Date.now();
        const transaction_id = `${prefix}-${timestamp}-${Math.floor(Math.random() * 1000)}`;
        
        const result = await runAsync(
            `INSERT INTO transactions 
             (transaction_id, date, description, amount, transaction_type, account_id, 
              reference_number, category, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [transaction_id, date, description, amount, transaction_type, account_id, 
             reference_number, category, req.session.user.id]
        );
        
        // Update account balance
        const account = await getAsync('SELECT * FROM accounts WHERE id = ?', [account_id]);
        if (account) {
            const newBalance = transaction_type === 'debit' 
                ? parseFloat(account.balance) + parseFloat(amount)
                : parseFloat(account.balance) - parseFloat(amount);
            
            await runAsync(
                'UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newBalance, account_id]
            );
        }
        
        // Log the action
        await runAsync(
            'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'CREATE_TRANSACTION', `Created transaction: ${transaction_id} - ${description}`]
        );
        
        res.json({
            success: true,
            message: 'Transaction recorded successfully',
            transactionId: result.lastID,
            transaction_id
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ success: false, error: 'Failed to record transaction' });
    }
});

// Journal Entries
router.post('/journal-entries', checkAccountsPermission('create', 'journal_entries'), async (req, res) => {
    const { date, description, lines } = req.body;
    
    try {
        // Validate double-entry accounting
        let totalDebit = 0;
        let totalCredit = 0;
        
        lines.forEach(line => {
            totalDebit += parseFloat(line.debit) || 0;
            totalCredit += parseFloat(line.credit) || 0;
        });
        
        if (totalDebit.toFixed(2) !== totalCredit.toFixed(2)) {
            return res.status(400).json({ 
                success: false, 
                error: `Debits (${totalDebit}) must equal credits (${totalCredit})` 
            });
        }
        
        // Generate entry number
        const timestamp = Date.now();
        const entry_number = `JE-${timestamp}`;
        
        // Create journal entry
        const entryResult = await runAsync(
            `INSERT INTO journal_entries 
             (entry_number, date, description, total_amount, created_by)
             VALUES (?, ?, ?, ?, ?)`,
            [entry_number, date, description, totalDebit, req.session.user.id]
        );
        
        const entryId = entryResult.lastID;
        
        // Create journal entry lines
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            await runAsync(
                `INSERT INTO journal_entry_lines 
                 (journal_entry_id, account_id, description, debit, credit, line_number)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [entryId, line.account_id, line.description, line.debit || 0, line.credit || 0, i + 1]
            );
            
            // Update account balances
            if (line.debit > 0) {
                await runAsync(
                    `UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [line.debit, line.account_id]
                );
            }
            
            if (line.credit > 0) {
                await runAsync(
                    `UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [line.credit, line.account_id]
                );
            }
        }
        
        // Log the action
        await runAsync(
            'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'CREATE_JOURNAL_ENTRY', `Created journal entry: ${entry_number}`]
        );
        
        res.json({
            success: true,
            message: 'Journal entry created successfully',
            entryId,
            entry_number
        });
    } catch (error) {
        console.error('Error creating journal entry:', error);
        res.status(500).json({ success: false, error: 'Failed to create journal entry' });
    }
});

// Invoices
router.get('/invoices', async (req, res) => {
    try {
        const invoices = await allAsync(`
            SELECT i.*, u.username as created_by_name
            FROM invoices i
            LEFT JOIN users u ON i.created_by = u.id
            ORDER BY i.date DESC
        `);
        
        res.json({
            success: true,
            invoices
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
    }
});

// Financial Reports
router.get('/reports', async (req, res) => {
    try {
        const { report_type, period_start, period_end } = req.query;
        
                if (report_type === 'trial_balance') {
                const trialBalance = await allAsync(
                    `
                    SELECT
                    a.account_number,
                    a.account_name,
                    a.account_type,
                    COALESCE(SUM(jel.debit), 0) AS total_debit,
                    COALESCE(SUM(jel.credit), 0) AS total_credit,
                    (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) AS net_movement,
                    a.balance
                    FROM accounts a
                    LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
                    LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
                    AND je.status = 'posted'
                    AND (? IS NULL OR je.date >= ?)
                    AND (? IS NULL OR je.date <= ?)
                    WHERE a.status = 'active'
                    GROUP BY a.id
                    ORDER BY a.account_number
                    `,
                    [period_start, period_start, period_end, period_end]
                );
            
            return res.json({
                success: true,
                report_type: 'trial_balance',
                data: trialBalance,
                period_start,
                period_end
            });
        }
        
        if (report_type === 'balance_sheet') {
            const assets = await allAsync(`
                SELECT * FROM accounts 
                WHERE account_type = 'asset' AND status = 'active'
                ORDER BY account_number
            `);
            
            const liabilities = await allAsync(`
                SELECT * FROM accounts 
                WHERE account_type = 'liability' AND status = 'active'
                ORDER BY account_number
            `);
            
            const equity = await allAsync(`
                SELECT * FROM accounts 
                WHERE account_type = 'equity' AND status = 'active'
                ORDER BY account_number
            `);
            
            const totalAssets = assets.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
            const totalLiabilities = liabilities.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
            const totalEquity = equity.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
            
            return res.json({
                success: true,
                report_type: 'balance_sheet',
                data: {
                    assets,
                    liabilities,
                    equity,
                    totals: {
                        totalAssets,
                        totalLiabilities,
                        totalEquity
                    }
                },
                period_end
            });
        }
        
        res.status(400).json({ success: false, error: 'Invalid report type' });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});

// Account Permissions Management (Admin only)
router.get('/permissions', async (req, res) => {
    try {
        const permissions = await allAsync(`
            SELECT ap.*, u.username as user_name, g.username as granted_by_name
            FROM account_permissions ap
            LEFT JOIN users u ON ap.user_id = u.id
            LEFT JOIN users g ON ap.granted_by = g.id
            ORDER BY ap.granted_at DESC
        `);
        
        res.json({
            success: true,
            permissions
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
    }
});

router.post('/permissions', async (req, res) => {
    // Only admin can manage permissions
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const { user_id, permission_type, resource_type, resource_id, expires_at } = req.body;
    
    try {
        const result = await runAsync(
            `INSERT INTO account_permissions 
             (user_id, permission_type, resource_type, resource_id, granted_by, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, permission_type, resource_type, resource_id || null, req.session.user.id, expires_at || null]
        );
        
        res.json({
            success: true,
            message: 'Permission granted successfully',
            permissionId: result.lastID
        });
    } catch (error) {
        console.error('Error granting permission:', error);
        res.status(500).json({ success: false, error: 'Failed to grant permission' });
    }
});

// Get user's accounts permissions
router.get('/my-permissions', async (req, res) => {
    try {
        const permissions = await allAsync(`
            SELECT * FROM account_permissions 
            WHERE user_id = ? 
            AND (expires_at IS NULL OR expires_at > DATETIME('now'))
        `, [req.session.user.id]);
        
        res.json({
            success: true,
            permissions
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
    }
});

router.get('/ledger/export', checkAccountsPermission('reports'), async (req, res) => {
  try {
    const { start, end, period, year, month, quarter } = getDateRangeFromQuery(req.query);
    const accountId = req.query.account_id ? Number(req.query.account_id) : null;

    // Load accounts
    const accounts = await allAsync(
      `SELECT id, account_number, account_name, account_type, currency
       FROM accounts
       WHERE status = 'active'
       ${accountId ? 'AND id = ?' : ''}
       ORDER BY account_number`,
      accountId ? [accountId] : []
    );

    if (!accounts.length) {
      return res.status(404).json({ success: false, error: 'No accounts found' });
    }

    // Workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Real Estate Management';
    wb.created = new Date();

    // Summary sheet
    const wsSummary = wb.addWorksheet('Summary');
    wsSummary.columns = [
      { header: 'Account No', key: 'account_number', width: 14 },
      { header: 'Account Name', key: 'account_name', width: 30 },
      { header: 'Type', key: 'account_type', width: 14 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Opening', key: 'opening', width: 16 },
      { header: 'Debit', key: 'debit', width: 16 },
      { header: 'Credit', key: 'credit', width: 16 },
      { header: 'Closing', key: 'closing', width: 16 }
    ];
    wsSummary.getRow(1).font = { bold: true };

    // For each account, build a ledger sheet
    for (const acc of accounts) {
      // Opening balance = all posted movements before start
      const openingRow = await getAsync(
        `
        SELECT
          COALESCE(SUM(jel.debit), 0) AS d,
          COALESCE(SUM(jel.credit), 0) AS c
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id
        WHERE jel.account_id = ?
          AND je.status = 'posted'
          AND je.date < ?
        `,
        [acc.id, start]
      );
      const opening = Number(openingRow?.d || 0) - Number(openingRow?.c || 0);

      // Period lines
      const lines = await allAsync(
        `
        SELECT
          je.date,
          je.entry_number,
          je.description AS entry_description,
          je.posted_at,
          jel.description AS line_description,
          jel.debit,
          jel.credit
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id
        WHERE jel.account_id = ?
          AND je.status = 'posted'
          AND je.date >= ?
          AND je.date <= ?
        ORDER BY je.date ASC, je.id ASC, jel.line_number ASC
        `,
        [acc.id, start, end]
      );

      // Totals + running
      let running = opening;
      let totalDebit = 0;
      let totalCredit = 0;

      // Sheet name safe
      const sheetName = `${acc.account_number} ${acc.account_name}`.slice(0, 28);
      const ws = wb.addWorksheet(sheetName);

      ws.addRow([`Ledger: ${acc.account_number} - ${acc.account_name}`]);
      ws.addRow([`Period: ${start} to ${end} (${period})`]);
      ws.addRow([`Currency: BDT`]);
      ws.addRow([]);

      ws.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Entry No', key: 'entry_number', width: 18 },
        { header: 'Posted (Dhaka)', key: 'posted_at', width: 22 },
        { header: 'Description', key: 'desc', width: 40 },
        { header: 'Debit', key: 'debit', width: 14 },
        { header: 'Credit', key: 'credit', width: 14 },
        { header: 'Running Balance', key: 'running', width: 18 }
      ];

      ws.getRow(5).font = { bold: true }; // header row after meta rows

      // Opening row
      ws.addRow({
        date: start,
        entry_number: '',
        posted_at: '',
        desc: 'Opening Balance',
        debit: '',
        credit: '',
        running: opening
      });

      for (const r of lines) {
        const d = Number(r.debit || 0);
        const c = Number(r.credit || 0);

        totalDebit += d;
        totalCredit += c;
        running += (d - c);

        ws.addRow({
          date: r.date,
          entry_number: r.entry_number,
          posted_at: formatDhakaDateTime(r.posted_at),
          desc: (r.line_description || r.entry_description || '').slice(0, 300),
          debit: d || '',
          credit: c || '',
          running
        });
      }

      // Closing row
      ws.addRow({});
      ws.addRow({
        date: end,
        entry_number: '',
        posted_at: '',
        desc: 'Closing Balance',
        debit: '',
        credit: '',
        running
      });

      // Number formatting
      ['E','F','G'].forEach(col => {
        ws.getColumn(col).numFmt = '#,##0.00';
      });

      // Summary row
      wsSummary.addRow({
        account_number: acc.account_number,
        account_name: acc.account_name,
        account_type: acc.account_type,
        currency: 'BDT',
        opening,
        debit: totalDebit,
        credit: totalCredit,
        closing: running
      });
    }

    // Format summary numeric columns
    ['E','F','G','H'].forEach(col => {
      wsSummary.getColumn(col).numFmt = '#,##0.00';
    });

    // Response download
    const fileTag =
      period === 'monthly' ? `${year}-${pad2(month)}` :
      period === 'quarterly' ? `${year}-Q${quarter}` :
      `${year}`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ledger-${fileTag}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, error: e.message || 'Failed to export ledger' });
  }
});

// GET /api/accounts/ledger?account_id=1&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
router.get('/ledger', checkAccountsPermission('reports'), async (req, res) => {
  try {
    const account_id = Number(req.query.account_id);
    const start_date = (req.query.start_date || '').trim();
    const end_date = (req.query.end_date || '').trim();

    if (!account_id) {
      return res.status(400).json({ success: false, error: 'account_id is required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return res.status(400).json({ success: false, error: 'start_date and end_date must be YYYY-MM-DD' });
    }

    const acc = await getAsync(
      `SELECT id, account_number, account_name, account_type, currency
       FROM accounts
       WHERE id = ?`,
      [account_id]
    );
    if (!acc) return res.status(404).json({ success: false, error: 'Account not found' });

    // Opening = sum(debit-credit) before start_date (posted only)
    const openingRow = await getAsync(
      `
      SELECT
        COALESCE(SUM(jel.debit), 0) AS d,
        COALESCE(SUM(jel.credit), 0) AS c
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = ?
        AND je.status = 'posted'
        AND je.date < ?
      `,
      [account_id, start_date]
    );
    const opening_balance = Number(openingRow?.d || 0) - Number(openingRow?.c || 0);

    // Lines in range
    const lines = await allAsync(
      `
      SELECT
        je.id AS journal_entry_id,
        je.date,
        je.entry_number,
        je.description AS entry_description,
        je.posted_at,
        jel.description AS line_description,
        jel.debit,
        jel.credit,
        jel.line_number
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = ?
        AND je.status = 'posted'
        AND je.date >= ?
        AND je.date <= ?
      ORDER BY je.date ASC, je.id ASC, jel.line_number ASC
      `,
      [account_id, start_date, end_date]
    );

    let running = opening_balance;
    const formatted = lines.map((r) => {
      const d = Number(r.debit || 0);
      const c = Number(r.credit || 0);
      running += (d - c);
      return {
        journal_entry_id: r.journal_entry_id,
        date: r.date,
        entry_number: r.entry_number,
        posted_at: r.posted_at,
        description: (r.line_description || r.entry_description || '').trim(),
        debit: d,
        credit: c,
        running_balance: running
      };
    });

    res.json({
      success: true,
      account: acc,
      start_date,
      end_date,
      opening_balance,
      closing_balance: running,
      lines: formatted
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to load ledger' });
  }
});

// GET /api/accounts/reports/pnl?period=monthly&year=2025&month=12
router.get('/reports/pnl', checkAccountsPermission('reports'), async (req, res) => {
  try {
    const { start, end, period, year, month, quarter } = getRangeFromQuery(req.query);

    // Revenue: credit - debit
    const revenueRows = await allAsync(
      `
      SELECT
        a.id,
        a.account_number,
        a.account_name,
        COALESCE(SUM(jel.debit), 0) AS debit,
        COALESCE(SUM(jel.credit), 0) AS credit,
        (COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)) AS amount
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.date >= ?
        AND je.date <= ?
      WHERE a.status = 'active'
        AND a.account_type IN ('revenue', 'income')
      GROUP BY a.id
      ORDER BY a.account_number
      `,
      [start, end]
    );

    // Expense: debit - credit
    const expenseRows = await allAsync(
      `
      SELECT
        a.id,
        a.account_number,
        a.account_name,
        COALESCE(SUM(jel.debit), 0) AS debit,
        COALESCE(SUM(jel.credit), 0) AS credit,
        (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) AS amount
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.date >= ?
        AND je.date <= ?
      WHERE a.status = 'active'
        AND a.account_type IN ('expense', 'expenses')
      GROUP BY a.id
      ORDER BY a.account_number
      `,
      [start, end]
    );

    const totalRevenue = revenueRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalExpense = expenseRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const netProfit = totalRevenue - totalExpense;

    res.json({
      success: true,
      report_type: 'pnl',
      period,
      year,
      month,
      quarter,
      start_date: start,
      end_date: end,
      totals: {
        revenue: totalRevenue,
        expense: totalExpense,
        net_profit: netProfit
      },
      revenue: revenueRows,
      expenses: expenseRows
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, error: e.message || 'Failed to generate P&L' });
  }
});

// GET /api/accounts/reports/pnl/export?... -> xlsx
router.get('/reports/pnl/export', checkAccountsPermission('reports'), async (req, res) => {
  try {
    const dataRes = await new Promise((resolve, reject) => {
      // reuse same logic by calling handler code directly (simple approach: re-run query)
      resolve(null);
    });

    const { start, end, period, year, month, quarter } = getRangeFromQuery(req.query);

    const revenueRows = await allAsync(
      `
      SELECT a.account_number, a.account_name,
             (COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)) AS amount
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.date >= ?
        AND je.date <= ?
      WHERE a.status = 'active'
        AND a.account_type IN ('revenue', 'income')
      GROUP BY a.id
      ORDER BY a.account_number
      `,
      [start, end]
    );

    const expenseRows = await allAsync(
      `
      SELECT a.account_number, a.account_name,
             (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) AS amount
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.date >= ?
        AND je.date <= ?
      WHERE a.status = 'active'
        AND a.account_type IN ('expense', 'expenses')
      GROUP BY a.id
      ORDER BY a.account_number
      `,
      [start, end]
    );

    const totalRevenue = revenueRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalExpense = expenseRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const netProfit = totalRevenue - totalExpense;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Real Estate Management';
    wb.created = new Date();

    const ws = wb.addWorksheet('Profit & Loss');
    ws.addRow([`Profit & Loss (BDT)`]);
    ws.addRow([`Period: ${start} to ${end} (${period})`]);
    ws.addRow([`Generated (Dhaka): ${formatDhakaDateTime(new Date().toISOString())}`]);
    ws.addRow([]);

    ws.addRow(['REVENUE']);
    ws.addRow(['Account No', 'Account Name', 'Amount (BDT)']).font = { bold: true };
    revenueRows.forEach(r => ws.addRow([r.account_number, r.account_name, Number(r.amount || 0)]));
    ws.addRow(['', 'Total Revenue', totalRevenue]).font = { bold: true };
    ws.addRow([]);

    ws.addRow(['EXPENSES']);
    ws.addRow(['Account No', 'Account Name', 'Amount (BDT)']).font = { bold: true };
    expenseRows.forEach(r => ws.addRow([r.account_number, r.account_name, Number(r.amount || 0)]));
    ws.addRow(['', 'Total Expense', totalExpense]).font = { bold: true };
    ws.addRow([]);

    ws.addRow(['', 'NET PROFIT', netProfit]).font = { bold: true };

    ws.getColumn(3).numFmt = '#,##0.00';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pnl-${start}-to-${end}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, error: e.message || 'Failed to export P&L' });
  }
});

// GET /api/accounts/reports/balance-sheet?as_of=YYYY-MM-DD
router.get('/reports/balance-sheet', checkAccountsPermission('reports'), async (req, res) => {
  try {
    const as_of = (req.query.as_of || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(as_of)) {
      return res.status(400).json({ success: false, error: 'as_of must be YYYY-MM-DD' });
    }

    // Movements up to as_of (posted only)
    const rows = await allAsync(
      `
      SELECT
        a.id,
        a.account_number,
        a.account_name,
        a.account_type,
        COALESCE(SUM(jel.debit), 0) AS debit,
        COALESCE(SUM(jel.credit), 0) AS credit
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.date <= ?
      WHERE a.status = 'active'
        AND a.account_type IN ('asset','liability','equity')
      GROUP BY a.id
      ORDER BY a.account_number
      `,
      [as_of]
    );

    // Normalize balances:
    // Asset normal debit => debit - credit
    // Liability/Equity normal credit => credit - debit
    const assets = [];
    const liabilities = [];
    const equity = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const r of rows) {
      const d = Number(r.debit || 0);
      const c = Number(r.credit || 0);
      let balance = 0;

      if (r.account_type === 'asset') balance = d - c;
      else balance = c - d; // liability/equity

      const item = {
        account_number: r.account_number,
        account_name: r.account_name,
        balance
      };

      if (r.account_type === 'asset') {
        assets.push(item);
        totalAssets += balance;
      } else if (r.account_type === 'liability') {
        liabilities.push(item);
        totalLiabilities += balance;
      } else if (r.account_type === 'equity') {
        equity.push(item);
        totalEquity += balance;
      }
    }

    res.json({
      success: true,
      report_type: 'balance_sheet',
      as_of,
      currency: 'BDT',
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        liabilities_plus_equity: totalLiabilities + totalEquity,
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      },
      assets,
      liabilities,
      equity
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to generate Balance Sheet' });
  }
});

// GET /api/accounts/reports/balance-sheet/export?as_of=YYYY-MM-DD
router.get('/reports/balance-sheet/export', checkAccountsPermission('reports'), async (req, res) => {
  try {
    const as_of = (req.query.as_of || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(as_of)) {
      return res.status(400).json({ success: false, error: 'as_of must be YYYY-MM-DD' });
    }

    const rows = await allAsync(
      `
      SELECT
        a.account_number,
        a.account_name,
        a.account_type,
        COALESCE(SUM(jel.debit), 0) AS debit,
        COALESCE(SUM(jel.credit), 0) AS credit
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.date <= ?
      WHERE a.status = 'active'
        AND a.account_type IN ('asset','liability','equity')
      GROUP BY a.id
      ORDER BY a.account_number
      `,
      [as_of]
    );

    const assets = [];
    const liabilities = [];
    const equity = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const r of rows) {
      const d = Number(r.debit || 0);
      const c = Number(r.credit || 0);
      let balance = 0;

      if (r.account_type === 'asset') balance = d - c;
      else balance = c - d;

      const item = [r.account_number, r.account_name, balance];

      if (r.account_type === 'asset') { assets.push(item); totalAssets += balance; }
      if (r.account_type === 'liability') { liabilities.push(item); totalLiabilities += balance; }
      if (r.account_type === 'equity') { equity.push(item); totalEquity += balance; }
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Real Estate Management';
    wb.created = new Date();

    const ws = wb.addWorksheet('Balance Sheet');
    ws.addRow([`Balance Sheet (BDT)`]);
    ws.addRow([`As of: ${as_of}`]);
    ws.addRow([`Generated (Dhaka): ${formatDhakaDateTime(new Date().toISOString())}`]);
    ws.addRow([]);

    const addSection = (title, items, total) => {
      ws.addRow([title]).font = { bold: true };
      ws.addRow(['Account No', 'Account Name', 'Balance (BDT)']).font = { bold: true };
      items.forEach(r => ws.addRow(r));
      ws.addRow(['', `Total ${title}`, total]).font = { bold: true };
      ws.addRow([]);
    };

    addSection('Assets', assets, totalAssets);
    addSection('Liabilities', liabilities, totalLiabilities);
    addSection('Equity', equity, totalEquity);

    ws.addRow(['', 'Liabilities + Equity', totalLiabilities + totalEquity]).font = { bold: true };
    ws.addRow(['', 'Balanced?', Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 ? 'YES' : 'NO']).font = { bold: true };

    ws.getColumn(3).numFmt = '#,##0.00';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="balance-sheet-as-of-${as_of}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, error: e.message || 'Failed to export Balance Sheet' });
  }
});



module.exports = router;