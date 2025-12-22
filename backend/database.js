const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');

// Create a promise for database initialization
const db = new Promise((resolve, reject) => {
    const database = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            reject(err);
            return;
        }
        
        console.log('✅ Connected to SQLite database');
        
        // Initialize database
        initializeDatabase(database)
            .then(() => resolve(database))
            .catch(reject);
    });
});

async function initializeDatabase(db) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Enable foreign keys
            db.run('PRAGMA foreign_keys = ON');
            
            // Create tables if they don't exist
            const createTablesSQL = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    permissions TEXT DEFAULT '[]',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS system_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    config_key TEXT UNIQUE NOT NULL,
                    config_value TEXT,
                    description TEXT
                );

                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    details TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS website_content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    page_name TEXT NOT NULL,
                    content TEXT,
                    seo_title TEXT,
                    seo_description TEXT,
                    seo_keywords TEXT,
                    language TEXT DEFAULT 'en',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS seo_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    meta_title TEXT,
                    meta_description TEXT,
                    meta_keywords TEXT,
                    google_analytics_id TEXT,
                    robots_txt TEXT,
                    sitemap_url TEXT
                );

                CREATE TABLE IF NOT EXISTS security_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    severity TEXT DEFAULT 'low',
                    details TEXT,
                    ip_address TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS currency_rates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    base_currency TEXT DEFAULT 'USD',
                    target_currency TEXT NOT NULL,
                    rate REAL NOT NULL,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Accounts Module Tables
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_number TEXT UNIQUE NOT NULL,
                    account_name TEXT NOT NULL,
                    account_type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
                    balance DECIMAL(15,2) DEFAULT 0.00,
                    currency TEXT DEFAULT 'USD',
                    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'frozen'
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id TEXT UNIQUE NOT NULL,
                    date DATE NOT NULL,
                    description TEXT NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    transaction_type TEXT NOT NULL, -- 'debit', 'credit'
                    account_id INTEGER NOT NULL,
                    reference_number TEXT,
                    category TEXT,
                    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'reconciled'
                    created_by INTEGER,
                    approved_by INTEGER,
                    approved_at DATETIME,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (account_id) REFERENCES accounts(id),
                    FOREIGN KEY (created_by) REFERENCES users(id),
                    FOREIGN KEY (approved_by) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS journal_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entry_number TEXT UNIQUE NOT NULL,
                    date DATE NOT NULL,
                    description TEXT NOT NULL,
                    total_amount DECIMAL(15,2) NOT NULL,
                    status TEXT DEFAULT 'draft', -- 'draft', 'posted', 'void'
                    created_by INTEGER,
                    approved_by INTEGER,
                    posted_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id),
                    FOREIGN KEY (approved_by) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS journal_entry_lines (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    journal_entry_id INTEGER NOT NULL,
                    account_id INTEGER NOT NULL,
                    description TEXT,
                    debit DECIMAL(15,2) DEFAULT 0.00,
                    credit DECIMAL(15,2) DEFAULT 0.00,
                    line_number INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
                    FOREIGN KEY (account_id) REFERENCES accounts(id)
                );

                CREATE TABLE IF NOT EXISTS invoices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    invoice_number TEXT UNIQUE NOT NULL,
                    client_id INTEGER,
                    date DATE NOT NULL,
                    due_date DATE NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    tax_amount DECIMAL(15,2) DEFAULT 0.00,
                    total_amount DECIMAL(15,2) NOT NULL,
                    status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
                    payment_method TEXT,
                    paid_date DATE,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payment_number TEXT UNIQUE NOT NULL,
                    invoice_id INTEGER,
                    date DATE NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    payment_method TEXT NOT NULL, -- 'cash', 'check', 'bank_transfer', 'credit_card'
                    reference_number TEXT,
                    status TEXT DEFAULT 'received', -- 'pending', 'received', 'cleared', 'bounced'
                    received_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
                    FOREIGN KEY (received_by) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS expenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    expense_number TEXT UNIQUE NOT NULL,
                    date DATE NOT NULL,
                    vendor_name TEXT,
                    description TEXT NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    category TEXT NOT NULL, -- 'office', 'travel', 'utilities', 'salary', 'other'
                    payment_method TEXT,
                    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
                    approved_by INTEGER,
                    paid_date DATE,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (approved_by) REFERENCES users(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS financial_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_name TEXT NOT NULL,
                    report_type TEXT NOT NULL, -- 'income_statement', 'balance_sheet', 'cash_flow', 'trial_balance'
                    period_start DATE NOT NULL,
                    period_end DATE NOT NULL,
                    generated_by INTEGER,
                    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    file_path TEXT,
                    FOREIGN KEY (generated_by) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS account_permissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    permission_type TEXT NOT NULL, -- 'view', 'create', 'edit', 'delete', 'approve'
                    resource_type TEXT NOT NULL, -- 'accounts', 'transactions', 'invoices', 'expenses', 'reports'
                    resource_id INTEGER, -- NULL for all resources of this type
                    granted_by INTEGER,
                    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (granted_by) REFERENCES users(id),
                    UNIQUE(user_id, permission_type, resource_type, resource_id)
                );

                -- Insert default chart of accounts
                INSERT OR IGNORE INTO accounts (account_number, account_name, account_type) VALUES
                    ('1000', 'Cash', 'asset'),
                    ('1100', 'Accounts Receivable', 'asset'),
                    ('1200', 'Inventory', 'asset'),
                    ('1300', 'Property, Plant & Equipment', 'asset'),
                    ('2000', 'Accounts Payable', 'liability'),
                    ('2100', 'Loans Payable', 'liability'),
                    ('3000', 'Owner''s Equity', 'equity'),
                    ('3100', 'Retained Earnings', 'equity'),
                    ('4000', 'Sales Revenue', 'revenue'),
                    ('4100', 'Service Revenue', 'revenue'),
                    ('5000', 'Cost of Goods Sold', 'expense'),
                    ('5100', 'Salary Expense', 'expense'),
                    ('5200', 'Rent Expense', 'expense'),
                    ('5300', 'Utilities Expense', 'expense'),
                    ('5400', 'Marketing Expense', 'expense');

                                    -- Enhanced Accounts Tables
                    CREATE TABLE IF NOT EXISTS daily_cash_balance (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        date DATE UNIQUE NOT NULL,
                        opening_balance DECIMAL(15,2) DEFAULT 0.00,
                        cash_received DECIMAL(15,2) DEFAULT 0.00,
                        cash_paid DECIMAL(15,2) DEFAULT 0.00,
                        closing_balance DECIMAL(15,2) DEFAULT 0.00,
                        reconciled BOOLEAN DEFAULT FALSE,
                        reconciled_by INTEGER,
                        reconciled_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (reconciled_by) REFERENCES users(id)
                    );

                    CREATE TABLE IF NOT EXISTS cash_transactions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        transaction_id TEXT UNIQUE NOT NULL,
                        date DATE NOT NULL,
                        time TIME,
                        description TEXT NOT NULL,
                        amount DECIMAL(15,2) NOT NULL,
                        transaction_type TEXT NOT NULL, -- 'receipt', 'payment', 'transfer'
                        category TEXT NOT NULL,
                        payment_method TEXT NOT NULL, -- 'cash', 'check', 'bank_transfer', 'card'
                        reference_number TEXT,
                        received_from TEXT,
                        paid_to TEXT,
                        status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'cancelled'
                        verified_by INTEGER,
                        verified_at DATETIME,
                        created_by INTEGER,
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (verified_by) REFERENCES users(id),
                        FOREIGN KEY (created_by) REFERENCES users(id)
                    );

                    CREATE TABLE IF NOT EXISTS bank_accounts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        bank_name TEXT NOT NULL,
                        account_name TEXT NOT NULL,
                        account_number TEXT UNIQUE NOT NULL,
                        account_type TEXT NOT NULL, -- 'savings', 'current', 'credit_card'
                        currency TEXT DEFAULT 'USD',
                        opening_balance DECIMAL(15,2) DEFAULT 0.00,
                        current_balance DECIMAL(15,2) DEFAULT 0.00,
                        last_reconciled DATE,
                        status TEXT DEFAULT 'active',
                        created_by INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (created_by) REFERENCES users(id)
                    );

                    CREATE TABLE IF NOT EXISTS bank_transactions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        bank_account_id INTEGER NOT NULL,
                        transaction_date DATE NOT NULL,
                        value_date DATE,
                        description TEXT NOT NULL,
                        reference TEXT,
                        debit DECIMAL(15,2) DEFAULT 0.00,
                        credit DECIMAL(15,2) DEFAULT 0.00,
                        balance DECIMAL(15,2),
                        transaction_type TEXT, -- 'deposit', 'withdrawal', 'transfer', 'charge'
                        status TEXT DEFAULT 'uncleared', -- 'cleared', 'uncleared', 'void'
                        reconciled BOOLEAN DEFAULT FALSE,
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
                    );

                    CREATE TABLE IF NOT EXISTS expense_categories (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        category_code TEXT UNIQUE NOT NULL,
                        category_name TEXT NOT NULL,
                        parent_category_id INTEGER,
                        budget_amount DECIMAL(15,2) DEFAULT 0.00,
                        budget_period TEXT DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'yearly'
                        status TEXT DEFAULT 'active',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (parent_category_id) REFERENCES expense_categories(id)
                    );

                    CREATE TABLE IF NOT EXISTS daily_summary (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        date DATE UNIQUE NOT NULL,
                        total_cash_in DECIMAL(15,2) DEFAULT 0.00,
                        total_cash_out DECIMAL(15,2) DEFAULT 0.00,
                        total_bank_in DECIMAL(15,2) DEFAULT 0.00,
                        total_bank_out DECIMAL(15,2) DEFAULT 0.00,
                        total_invoices DECIMAL(15,2) DEFAULT 0.00,
                        total_expenses DECIMAL(15,2) DEFAULT 0.00,
                        net_cash_flow DECIMAL(15,2) DEFAULT 0.00,
                        opening_cash DECIMAL(15,2) DEFAULT 0.00,
                        closing_cash DECIMAL(15,2) DEFAULT 0.00,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS petty_cash (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        date DATE NOT NULL,
                        description TEXT NOT NULL,
                        amount DECIMAL(15,2) NOT NULL,
                        category TEXT NOT NULL,
                        approved_by INTEGER,
                        received_by TEXT,
                        status TEXT DEFAULT 'pending',
                        created_by INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (approved_by) REFERENCES users(id),
                        FOREIGN KEY (created_by) REFERENCES users(id)
                    );

                    -- Insert default expense categories
                    INSERT OR IGNORE INTO expense_categories (category_code, category_name, budget_period) VALUES
                        ('OFFICE', 'Office Supplies', 'monthly'),
                        ('TRAVEL', 'Travel & Transportation', 'monthly'),
                        ('UTILITY', 'Utilities', 'monthly'),
                        ('SALARY', 'Salaries & Wages', 'monthly'),
                        ('RENT', 'Rent & Lease', 'monthly'),
                        ('MARKETING', 'Marketing & Advertising', 'monthly'),
                        ('MAINTENANCE', 'Maintenance & Repairs', 'monthly'),
                        ('INSURANCE', 'Insurance', 'monthly'),
                        ('TAX', 'Taxes & Licenses', 'monthly'),
                        ('BANK', 'Bank Charges', 'monthly'),
                        ('OTHER', 'Other Expenses', 'monthly');
            `;
            
            db.exec(createTablesSQL, async (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log('📊 Database tables created/verified');
                
                // Create default admin user
                try {
                    const adminPassword = 'admin123';
                    const hashedPassword = await bcrypt.hash(adminPassword, 10);
                    
                    db.run(
                        `INSERT OR IGNORE INTO users (username, email, password, role, permissions) VALUES (?, ?, ?, ?, ?)`,
                        ['admin', 'admin@realestate.com', hashedPassword, 'admin', JSON.stringify(['all'])],
                        (err) => {
                            if (err) {
                                console.error('Error creating admin user:', err.message);
                            } else {
                                console.log('👤 Default admin user created: admin / admin123');
                            }
                            resolve();
                        }
                    );
                } catch (error) {
                    console.error('Error setting up default data:', error);
                    resolve(); // Continue even if default data fails
                }
            });
        });
    });
}

// Export database promise and helper functions
module.exports = {
    db,
    runAsync: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.then(database => {
                database.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            }).catch(reject);
        });
    },
    getAsync: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.then(database => {
                database.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            }).catch(reject);
        });
    },
    allAsync: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.then(database => {
                database.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }).catch(reject);
        }); }
};