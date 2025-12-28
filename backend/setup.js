const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const path = require("path");

// Create database connection
const dbPath = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath);

console.log("Setting up database at:", dbPath);

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// Drop existing tables if they exist (optional - remove this in production)
const dropTables = false; // Set to true only for development

if (dropTables) {
  const tables = [
    "users",
    "system_config",
    "audit_logs",
    "website_content",
    "seo_settings",
    "security_logs",
    "currency_rates",
  ];

  tables.forEach((table) => {
    db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
      if (err) console.error(`Error dropping ${table}:`, err.message);
      else console.log(`Dropped table: ${table}`);
    });
  });
}

// Create tables sequentially
db.serialize(() => {
  // 1. Users table
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        permissions TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) console.error("Error creating users table:", err.message);
      else console.log("Users table created/verified");
    }
  );

  // 2. System Configuration
  db.run(
    `CREATE TABLE IF NOT EXISTS system_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT,
        description TEXT
    )`,
    (err) => {
      if (err)
        console.error("Error creating system_config table:", err.message);
      else console.log("System_config table created/verified");
    }
  );

  // 3. Audit Logs
  db.run(
    `CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) console.error("Error creating audit_logs table:", err.message);
      else console.log("Audit_logs table created/verified");
    }
  );

  // 4. Website Content
  db.run(
    `CREATE TABLE IF NOT EXISTS website_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_name TEXT NOT NULL,
        content TEXT,
        seo_title TEXT,
        seo_description TEXT,
        seo_keywords TEXT,
        language TEXT DEFAULT 'en',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err)
        console.error("Error creating website_content table:", err.message);
      else console.log("Website_content table created/verified");
    }
  );

  // 5. SEO Settings
  db.run(
    `CREATE TABLE IF NOT EXISTS seo_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meta_title TEXT,
        meta_description TEXT,
        meta_keywords TEXT,
        google_analytics_id TEXT,
        robots_txt TEXT,
        sitemap_url TEXT
    )`,
    (err) => {
      if (err) console.error("Error creating seo_settings table:", err.message);
      else console.log("SEO_settings table created/verified");
    }
  );

  // 6. Security Logs
  db.run(
    `CREATE TABLE IF NOT EXISTS security_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'low',
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err)
        console.error("Error creating security_logs table:", err.message);
      else console.log("Security_logs table created/verified");
    }
  );

  // 7. Currency Rates
  db.run(
    `CREATE TABLE IF NOT EXISTS currency_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_currency TEXT DEFAULT 'USD',
        target_currency TEXT NOT NULL,
        rate REAL NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err)
        console.error("Error creating currency_rates table:", err.message);
      else console.log("Currency_rates table created/verified");
    }
  );
  // 8. money_receipts
  db.run(`
CREATE TABLE IF NOT EXISTS money_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no TEXT UNIQUE NOT NULL,
    cash_transaction_id INTEGER UNIQUE NOT NULL,

    date TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'receipt' | 'payment'
    received_from TEXT,
    paid_to TEXT,

    amount REAL NOT NULL,
    description TEXT,

    created_by INTEGER,
    approved_by INTEGER,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cash_transaction_id) REFERENCES cash_transactions(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);`);

  // After all tables are created, insert default data
  db.parallelize(() => {
    // Insert default admin user
    const defaultPassword = "admin123";
    bcrypt.hash(defaultPassword, 10, (err, hash) => {
      if (err) {
        console.error("Error hashing password:", err.message);
        return;
      }

      db.run(
        `INSERT OR IGNORE INTO users (username, email, password, role, permissions) 
                    VALUES (?, ?, ?, ?, ?)`,
        [
          "admin",
          "admin@realestate.com",
          hash,
          "admin",
          JSON.stringify(["all"]),
        ],
        (err) => {
          if (err) console.error("Error creating admin user:", err.message);
          else console.log("✓ Default admin user created");
        }
      );
    });

    // Insert default system configuration
    const defaultConfig = [
      ["site_name", "Real Estate Management", "Website Name"],
      ["site_url", "http://localhost:3000", "Website URL"],
      ["default_language", "en", "Default Language"],
      ["default_currency", "USD", "Default Currency"],
      ["maintenance_mode", "false", "Maintenance Mode"],
      ["backup_frequency", "daily", "Backup Frequency"],
    ];

    defaultConfig.forEach(([key, value, desc]) => {
      db.run(
        `INSERT OR IGNORE INTO system_config (config_key, config_value, description) 
                    VALUES (?, ?, ?)`,
        [key, value, desc],
        (err) => {
          if (err) console.error(`Error inserting config ${key}:`, err.message);
        }
      );
    });

    // Insert sample currency rates
    const currencies = [
      ["USD", "EUR", 0.85],
      ["USD", "GBP", 0.73],
      ["USD", "JPY", 110.5],
    ];

    currencies.forEach(([base, target, rate]) => {
      db.run(
        `INSERT OR IGNORE INTO currency_rates (base_currency, target_currency, rate) 
                    VALUES (?, ?, ?)`,
        [base, target, rate],
        (err) => {
          if (err)
            console.error(
              `Error inserting currency ${base}-${target}:`,
              err.message
            );
        }
      );
    });
  });
});

// Close database after setup
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("\n✅ Database setup completed successfully!");
      console.log("\n📋 Default login credentials:");
      console.log("   Username: admin");
      console.log("   Password: admin123");
      console.log("\n🚀 Start the application with:");
      console.log("   1. cd backend && npm start (for backend)");
      console.log("   2. cd .. && npm start (for frontend)");
    }
  });
}, 1000);
