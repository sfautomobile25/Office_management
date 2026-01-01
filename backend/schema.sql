-- Auto-generated Postgres schema (converted from SQLite)

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user',
  permissions TEXT DEFAULT '[]',
  session_version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS system_config (
  id BIGSERIAL PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS website_content (
  id BIGSERIAL PRIMARY KEY,
  page_name TEXT NOT NULL,
  content TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  language TEXT DEFAULT 'en',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (page_name, language)
);

CREATE TABLE IF NOT EXISTS seo_settings (
  id BIGSERIAL PRIMARY KEY,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  google_analytics_id TEXT,
  robots_txt TEXT,
  sitemap_url TEXT
);

CREATE TABLE IF NOT EXISTS security_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'low',
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS currency_rates (
  id BIGSERIAL PRIMARY KEY,
  base_currency TEXT DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  account_number TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cash_transactions (
  id BIGSERIAL PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  time TIME,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type TEXT NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  received_from TEXT,
  paid_to TEXT,
  status TEXT DEFAULT 'pending',
  verified_by INTEGER,
  verified_at TIMESTAMP,
  created_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (verified_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS money_receipts (
    id BIGSERIAL PRIMARY KEY,
    receipt_no TEXT UNIQUE NOT NULL,
    cash_transaction_id INTEGER UNIQUE NOT NULL,

    date DATE NOT NULL,
    transaction_type TEXT NOT NULL, -- 'receipt' | 'payment'
    received_from TEXT,
    paid_to TEXT,

    amount DOUBLE PRECISION NOT NULL,
    description TEXT,

    created_by INTEGER,
    approved_by INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cash_transaction_id) REFERENCES cash_transactions(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);


CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  reference_number TEXT,
  category TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  approved_by INTEGER,
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGSERIAL PRIMARY KEY,
  entry_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  created_by INTEGER,
  approved_by INTEGER,
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id BIGSERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  description TEXT,
  debit DECIMAL(15,2) DEFAULT 0.00,
  credit DECIMAL(15,2) DEFAULT 0.00,
  line_number INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  client_id INTEGER,
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0.00,
  total_amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  payment_method TEXT,
  paid_date DATE,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  invoice_id INTEGER,
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  status TEXT DEFAULT 'received',
  received_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  expense_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  vendor_name TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  approved_by INTEGER,
  paid_date DATE,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS financial_reports (
  id BIGSERIAL PRIMARY KEY,
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_by INTEGER,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  file_path TEXT,
  FOREIGN KEY (generated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS account_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  permission_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  granted_by INTEGER,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE(user_id, permission_type, resource_type, resource_id)
);

INSERT INTO accounts (account_number, account_name, account_type)
VALUES
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
  ('5400', 'Marketing Expense', 'expense')
ON CONFLICT (account_number) DO NOTHING;


CREATE TABLE IF NOT EXISTS daily_cash_balance (
  id BIGSERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  opening_balance DECIMAL(15,2) DEFAULT 0.00,
  cash_received DECIMAL(15,2) DEFAULT 0.00,
  cash_paid DECIMAL(15,2) DEFAULT 0.00,
  closing_balance DECIMAL(15,2) DEFAULT 0.00,
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_by INTEGER,
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reconciled_by) REFERENCES users(id)
);


CREATE TABLE IF NOT EXISTS bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  opening_balance DECIMAL(15,2) DEFAULT 0.00,
  current_balance DECIMAL(15,2) DEFAULT 0.00,
  last_reconciled DATE,
  status TEXT DEFAULT 'active',
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id BIGSERIAL PRIMARY KEY,
  bank_account_id INTEGER NOT NULL,
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT NOT NULL,
  reference TEXT,
  debit DECIMAL(15,2) DEFAULT 0.00,
  credit DECIMAL(15,2) DEFAULT 0.00,
  balance DECIMAL(15,2),
  transaction_type TEXT,
  status TEXT DEFAULT 'uncleared',
  reconciled BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id BIGSERIAL PRIMARY KEY,
  category_code TEXT UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  parent_category_id INTEGER,
  budget_amount DECIMAL(15,2) DEFAULT 0.00,
  budget_period TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_category_id) REFERENCES expense_categories(id)
);

CREATE TABLE IF NOT EXISTS daily_summary (
  id BIGSERIAL PRIMARY KEY,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS petty_cash (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category TEXT NOT NULL,
  approved_by INTEGER,
  received_by TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

INSERT INTO expense_categories (category_code, category_name, budget_period)
VALUES
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
  ('OTHER', 'Other Expenses', 'monthly')
ON CONFLICT (category_code) DO NOTHING;

