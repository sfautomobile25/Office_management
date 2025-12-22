const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Create and setup database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error creating database:', err);
        return;
    }
    console.log('Connected to SQLite database');
});

// Create tables
db.serialize(() => {
    console.log('Creating tables...');

    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        permissions TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating users table:', err);
        else console.log('✓ Users table created');
    });

    // System Configuration
    db.run(`CREATE TABLE IF NOT EXISTS system_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT,
        description TEXT
    )`, (err) => {
        if (err) console.error('Error creating system_config table:', err);
        else console.log('✓ System config table created');
    });

    // Audit Logs
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating audit_logs table:', err);
        else console.log('✓ Audit logs table created');
    });

    // Website Content
    db.run(`CREATE TABLE IF NOT EXISTS website_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_name TEXT NOT NULL,
        content TEXT,
        seo_title TEXT,
        seo_description TEXT,
        seo_keywords TEXT,
        language TEXT DEFAULT 'en',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating website_content table:', err);
        else console.log('✓ Website content table created');
    });

    // SEO Settings
    db.run(`CREATE TABLE IF NOT EXISTS seo_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meta_title TEXT,
        meta_description TEXT,
        meta_keywords TEXT,
        google_analytics_id TEXT,
        robots_txt TEXT,
        sitemap_url TEXT
    )`, (err) => {
        if (err) console.error('Error creating seo_settings table:', err);
        else console.log('✓ SEO settings table created');
    });

    // Security Logs
    db.run(`CREATE TABLE IF NOT EXISTS security_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'low',
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating security_logs table:', err);
        else console.log('✓ Security logs table created');
    });

    // Currency Rates
    db.run(`CREATE TABLE IF NOT EXISTS currency_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_currency TEXT DEFAULT 'USD',
        target_currency TEXT NOT NULL,
        rate REAL NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating currency_rates table:', err);
        else console.log('✓ Currency rates table created');
    });

    // Wait for tables to be created, then insert data
    setTimeout(() => {
        insertDefaultData();
    }, 1000);
});

function insertDefaultData() {
    console.log('\nInserting default data...');

    // Create default admin user
    const defaultPassword = 'admin123';
    bcrypt.hash(defaultPassword, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return;
        }
        
        db.run(`INSERT OR IGNORE INTO users (username, email, password, role, permissions) 
                VALUES (?, ?, ?, ?, ?)`,
            ['admin', 'admin@realestate.com', hash, 'admin', 
             JSON.stringify(['all'])],
            (err) => {
                if (err) console.error('Error creating admin user:', err);
                else console.log('✓ Default admin user created (username: admin, password: admin123)');
            });
    });

    // Insert default system configuration
    const defaultConfig = [
        ['site_name', 'Real Estate Management', 'Website Name'],
        ['site_url', 'http://localhost:3000', 'Website URL'],
        ['default_language', 'en', 'Default Language'],
        ['default_currency', 'USD', 'Default Currency'],
        ['maintenance_mode', 'false', 'Maintenance Mode'],
        ['backup_frequency', 'daily', 'Backup Frequency'],
        ['contact_email', 'contact@realestate.com', 'Contact Email'],
        ['site_description', 'Professional Real Estate Management System', 'Site Description']
    ];

    let configCount = 0;
    defaultConfig.forEach(([key, value, desc]) => {
        db.run(`INSERT OR IGNORE INTO system_config (config_key, config_value, description) 
                VALUES (?, ?, ?)`, [key, value, desc], (err) => {
            if (err) console.error(`Error inserting config ${key}:`, err);
            else {
                configCount++;
                if (configCount === defaultConfig.length) {
                    console.log('✓ Default system configuration inserted');
                }
            }
        });
    });

    // Insert sample currency rates
    const currencies = [
        ['USD', 'EUR', 0.85],
        ['USD', 'GBP', 0.73],
        ['USD', 'JPY', 110.50],
        ['USD', 'CAD', 1.32],
        ['USD', 'AUD', 1.48]
    ];

    let currencyCount = 0;
    currencies.forEach(([base, target, rate]) => {
        db.run(`INSERT OR IGNORE INTO currency_rates (base_currency, target_currency, rate) 
                VALUES (?, ?, ?)`, [base, target, rate], (err) => {
            if (err) console.error(`Error inserting currency ${base}-${target}:`, err);
            else {
                currencyCount++;
                if (currencyCount === currencies.length) {
                    console.log('✓ Sample currency rates inserted');
                }
            }
        });
    });

    // Insert sample website content
    const sampleContent = [
        ['home', '<h1>Welcome to Real Estate Management</h1><p>Professional property management solutions.</p>', 'Real Estate Management - Home', 'Professional real estate management system', 'real estate, property management, real estate software', 'en'],
        ['about', '<h1>About Us</h1><p>We provide top-notch real estate management services.</p>', 'About Our Company', 'Learn about our real estate management services', 'about, company, real estate services', 'en'],
        ['contact', '<h1>Contact Us</h1><p>Get in touch for more information.</p>', 'Contact Real Estate Management', 'Contact our team for real estate solutions', 'contact, support, real estate help', 'en']
    ];

    let contentCount = 0;
    sampleContent.forEach(([page, content, title, desc, keywords, lang]) => {
        db.run(`INSERT OR IGNORE INTO website_content 
                (page_name, content, seo_title, seo_description, seo_keywords, language) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [page, content, title, desc, keywords, lang], (err) => {
                if (err) console.error(`Error inserting content for ${page}:`, err);
                else {
                    contentCount++;
                    if (contentCount === sampleContent.length) {
                        console.log('✓ Sample website content inserted');
                    }
                }
            });
    });

    // Insert SEO settings
    db.run(`INSERT OR IGNORE INTO seo_settings 
            (meta_title, meta_description, meta_keywords, google_analytics_id) 
            VALUES (?, ?, ?, ?)`,
        ['Real Estate Management System', 'Professional real estate property management software', 'real estate, property management, real estate software', 'UA-XXXXX-Y'],
        (err) => {
            if (err) console.error('Error inserting SEO settings:', err);
            else console.log('✓ Default SEO settings inserted');
        });

    // Close database after all operations
    setTimeout(() => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('\n✅ Database setup completed successfully!');
                console.log('\n📋 Next steps:');
                console.log('1. Start backend: npm run dev');
                console.log('2. Start frontend: npm start (from root directory)');
                console.log('3. Login with:');
                console.log('   - Username: admin');
                console.log('   - Password: admin123');
            }
        });
    }, 2000);
}