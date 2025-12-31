const express = require('express');
const router = express.Router();
const { allAsync, getAsync, runAsync } = require('../database');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ 
            success: false, 
            error: 'Admin access required' 
        });
    }
};

// Apply admin middleware to all routes
router.use(requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await allAsync(
            'SELECT id, username, email, role, permissions, created_at FROM users ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch users' 
        });
    }
});

// Create new user (admin only)
router.post('/users', async (req, res) => {
    const { username, email, password, role, permissions } = req.body;
    
    try {
        // Check if user exists
        const existingUser = await getAsync(
            'SELECT * FROM users WHERE username = ? OR email = ?', 
            [username, email]
        );
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username or email already exists' 
            });
        }
        
        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await runAsync(
            `INSERT INTO users (username, email, password, role, permissions) 
             VALUES (?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, role || 'user', JSON.stringify(permissions || [])]
        );
        
        // Log the action
        await runAsync(
            'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'CREATE_USER', `Created user: ${username} with role: ${role}`]
        );
        
        res.json({
            success: true,
            message: 'User created successfully',
            userId: result.lastID
        });
        
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create user' 
        });
    }
});

// Update user
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { username, email, role, permissions } = req.body;
    
    try {
        // Check if updating to existing username/email
        if (username || email) {
            const existingUser = await getAsync(
                'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?', 
                [username || '', email || '', id]
            );
            
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Username or email already exists' 
                });
            }
        }
        
        // Build update query
        const updates = [];
        const params = [];
        
        if (username) {
            updates.push('username = ?');
            params.push(username);
        }
        
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        
        if (role) {
            updates.push('role = ?');
            params.push(role);
        }
        
        if (permissions !== undefined) {
            updates.push('permissions = ?');
            params.push(JSON.stringify(permissions));
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No fields to update' 
            });
        }
        
        params.push(id);
        
        await runAsync(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        
        // Log the action
        await runAsync(
            'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'UPDATE_USER', `Updated user ID: ${id}`]
        );
        
        res.json({
            success: true,
            message: 'User updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update user' 
        });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Prevent deleting yourself
        if (parseInt(id) === req.session.user.id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete your own account' 
            });
        }
        
        // Prevent deleting admin if it's the only admin
        const user = await getAsync('SELECT * FROM users WHERE id = ?', [id]);
        if (user && user.role === 'admin') {
            const admins = await allAsync('SELECT * FROM users WHERE role = "admin"');
            if (admins.length <= 1) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Cannot delete the only admin user' 
                });
            }
        }
        
        await runAsync('DELETE FROM users WHERE id = ?', [id]);
        
        // Log the action
        await runAsync(
            'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'DELETE_USER', `Deleted user: ${user?.username || id}`]
        );
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete user' 
        });
    }
});

// Get system stats
router.get('/stats', async (req, res) => {
    try {
        const [users, logs, content] = await Promise.all([
            getAsync('SELECT COUNT(*) as count FROM users'),
            getAsync('SELECT COUNT(*) as count FROM audit_logs'),
            getAsync('SELECT COUNT(*) as count FROM website_content')
        ]);
        
        res.json({
            success: true,
            stats: {
                users: users.count,
                logs: logs.count,
                content: content.count
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch stats' 
        });
    }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
    try {
        const logs = await allAsync(
            `SELECT al.*, u.username 
             FROM audit_logs al 
             LEFT JOIN users u ON al.user_id = u.id 
             ORDER BY al.created_at DESC 
             LIMIT 50`
        );
        
        res.json({
            success: true,
            logs
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch audit logs' 
        });
    }
});

// Get system configuration
router.get('/config', async (req, res) => {
    try {
        const config = await allAsync('SELECT * FROM system_config');
        
        res.json({
            success: true,
            config
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch configuration' 
        });
    }
});

// Update system configuration
router.put('/config/:key', async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    
    try {
        await runAsync(
            'UPDATE system_config SET config_value = ? WHERE config_key = ?',
            [value, key]
        );
        
        res.json({
            success: true,
            message: 'Configuration updated'
        });
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update configuration' 
        });
    }
});

// Create backup
router.post('/backup', async (req, res) => {
    try {
        const fs = require('fs');
        const date = new Date().toISOString().split('T')[0];
        const backupFile = `backup-${date}.sqlite`;
        
        // In a real application, you would copy the database file
        // For simplicity, we're just creating a log entry
        await runAsync(
            'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'BACKUP', `Backup created: ${backupFile}`]
        );
        
        res.json({ 
            success: true,
            message: 'Backup initiated', 
            file: backupFile 
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create backup' 
        });
    }
});

// Data Export endpoints
router.get('/export/users', async (req, res) => {
    try {
        const data = await allAsync('SELECT id, username, email, role, created_at FROM users');
        res.json({
            success: true,
            data,
            format: 'json',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error exporting users:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to export users' 
        });
    }
});

router.get('/export/config', async (req, res) => {
    try {
        const data = await allAsync('SELECT * FROM system_config');
        res.json({
            success: true,
            data,
            format: 'json',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error exporting config:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to export config' 
        });
    }
});

router.get('/export/logs', async (req, res) => {
    try {
        const data = await allAsync('SELECT * FROM audit_logs');
        res.json({
            success: true,
            data,
            format: 'json',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error exporting logs:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to export logs' 
        });
    }
});

// Database Management - Get Table Info
router.get('/database/tables', async (req, res) => {
    try {
        // List public tables (Postgres)
        const tables = await allAsync(
            `SELECT table_name AS name
             FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
             ORDER BY table_name`
        );

        const tableInfo = [];
        for (const table of tables) {
            const cols = await allAsync(
                `SELECT column_name, data_type, is_nullable, column_default
                 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = ?
                 ORDER BY ordinal_position`,
                [table.name]
            );

            const countRow = await getAsync(`SELECT COUNT(*)::int AS count FROM ${table.name}`);
            tableInfo.push({
                name: table.name,
                columns: cols,
                rowCount: countRow ? countRow.count : 0
            });
        }

        res.json({ success: true, tables: tableInfo });
    } catch (error) {
        console.error('Error fetching table info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch table information'
        });
    }
});

// Content Management - Get All Content
router.get('/content', async (req, res) => {
    try {
        const content = await allAsync('SELECT * FROM website_content');
        res.json({
            success: true,
            content
        });
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch content' 
        });
    }
});

// Content Management - Get Specific Page
router.get('/content/:page', async (req, res) => {
    const { page } = req.params;
    
    try {
        const content = await allAsync(
            'SELECT * FROM website_content WHERE page_name = ?',
            [page]
        );
        
        res.json({
            success: true,
            content
        });
    } catch (error) {
        console.error('Error fetching page content:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch page content' 
        });
    }
});

// Content Management - Save Content
router.post('/content', async (req, res) => {
    const { page_name, content, seo_title, seo_description, seo_keywords, language } = req.body;
    
    try {
        await runAsync(
            `INSERT INTO website_content (page_name, content, seo_title, seo_description, seo_keywords, language)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (page_name, language) DO UPDATE SET
               content = EXCLUDED.content,
               seo_title = EXCLUDED.seo_title,
               seo_description = EXCLUDED.seo_description,
               seo_keywords = EXCLUDED.seo_keywords,
               updated_at = CURRENT_TIMESTAMP`,
            [page_name, content, seo_title, seo_description, seo_keywords, language || 'en']
        );
        
        res.json({
            success: true,
            message: 'Content saved successfully'
        });
    } catch (error) {
        console.error('Error saving content:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to save content' 
        });
    }
});

// SEO Settings - Get
router.get('/seo', async (req, res) => {
    try {
        const seo = await allAsync('SELECT * FROM seo_settings LIMIT 1');
        
        res.json({
            success: true,
            seo: seo[0] || {}
        });
    } catch (error) {
        console.error('Error fetching SEO settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch SEO settings' 
        });
    }
});

// SEO Settings - Update
router.put('/seo', async (req, res) => {
    const { meta_title, meta_description, meta_keywords, google_analytics_id } = req.body;
    
    try {
        const existing = await getAsync('SELECT * FROM seo_settings LIMIT 1');
        
        if (existing) {
            await runAsync(
                `UPDATE seo_settings SET 
                 meta_title = ?, meta_description = ?, meta_keywords = ?, google_analytics_id = ?`,
                [meta_title, meta_description, meta_keywords, google_analytics_id]
            );
        } else {
            await runAsync(
                `INSERT INTO seo_settings 
                 (meta_title, meta_description, meta_keywords, google_analytics_id)
                 VALUES (?, ?, ?, ?)`,
                [meta_title, meta_description, meta_keywords, google_analytics_id]
            );
        }
        
        res.json({
            success: true,
            message: 'SEO settings updated'
        });
    } catch (error) {
        console.error('Error updating SEO settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update SEO settings' 
        });
    }
});

// Get currencies
router.get('/currencies', async (req, res) => {
    try {
        const currencies = await allAsync('SELECT * FROM currency_rates');
        res.json({
            success: true,
            currencies
        });
    } catch (error) {
        console.error('Error fetching currencies:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch currencies' 
        });
    }
});

// Update currency
router.put('/currencies/:id', async (req, res) => {
    const { id } = req.params;
    const { rate } = req.body;
    
    try {
        await runAsync(
            'UPDATE currency_rates SET rate = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
            [rate, id]
        );
        
        res.json({
            success: true,
            message: 'Currency rate updated'
        });
    } catch (error) {
        console.error('Error updating currency:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update currency' 
        });
    }
});

// Get security logs
router.get('/security/logs', async (req, res) => {
    try {
        const logs = await allAsync(
            'SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 50'
        );
        res.json({
            success: true,
            logs
        });
    } catch (error) {
        console.error('Error fetching security logs:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch security logs' 
        });
    }
});

module.exports = router;