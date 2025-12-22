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