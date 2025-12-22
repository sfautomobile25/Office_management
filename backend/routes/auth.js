const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAsync, runAsync } = require('../database');
const crypto = require('crypto');


// Login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log(`🔑 Login attempt for: ${username}`);
    
    try {
        // Get user from database
        const user = await getAsync('SELECT * FROM users WHERE username = ?', [username]);
        
        if (!user) {
            console.log(`❌ User not found: ${username}`);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password' 
            });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            console.log(`❌ Invalid password for: ${username}`);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password' 
            });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role 
            },
            'your-jwt-secret-key-change-in-production',
            { expiresIn: '24h' }
        );
        
        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: JSON.parse(user.permissions || '[]')
        };
        
        // Log the login
        await runAsync(
            'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
            [user.id, 'LOGIN', `User ${username} logged in successfully`]
        );
        
        console.log(`✅ Login successful for: ${username}`);
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: req.session.user
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Logout route
router.post('/logout', async (req, res) => {
    if (req.session.user) {
        try {
            await runAsync(
                'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
                [req.session.user.id, 'LOGOUT', `User ${req.session.user.username} logged out`]
            );
        } catch (error) {
            console.error('Error logging logout:', error);
        }
    }
    
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to logout' 
            });
        }
        
        res.clearCookie('connect.sid');
        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    });
});

// Check session
router.get('/check', (req, res) => {
    if (req.session.user) {
        res.json({ 
            loggedIn: true, 
            user: req.session.user 
        });
    } else {
        res.json({ 
            loggedIn: false 
        });
    }
});

// Check admin status
router.get('/check-admin', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        res.json({ 
            isAdmin: true, 
            user: req.session.user 
        });
    } else {
        res.json({ 
            isAdmin: false 
        });
    }
});

// Add after login route in auth.js
router.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword, role } = req.body;
    
    console.log(`🔧 Registration attempt for: ${username}`);
    
    // Validation
    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({ 
            success: false, 
            error: 'All fields are required' 
        });
    }
    
    if (password !== confirmPassword) {
        return res.status(400).json({ 
            success: false, 
            error: 'Passwords do not match' 
        });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ 
            success: false, 
            error: 'Password must be at least 6 characters' 
        });
    }
    
    try {
        // Check if user already exists
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
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Default role is 'user' unless specified by admin
        const userRole = role || 'user';
        
        // Create user
        const result = await runAsync(
            `INSERT INTO users (username, email, password, role, permissions) 
             VALUES (?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, userRole, JSON.stringify([])]
        );
        
        // Log the registration
        await runAsync(
            'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
            [result.lastID, 'REGISTER', `User ${username} registered`]
        );
        
        console.log(`✅ User registered: ${username} (ID: ${result.lastID})`);
        
        res.json({
            success: true,
            message: 'Registration successful! Please login.',
            userId: result.lastID
        });
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed. Please try again.' 
        });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const user = await getAsync('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user) {
            // Don't reveal if email exists or not
            return res.json({
                success: true,
                message: 'If your email exists, you will receive reset instructions'
            });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour
        
        // Store token in database (in real app)
        // For now, we'll log it
        console.log(`Reset token for ${email}: ${resetToken}`);
        
        // In real app, send email with reset link
        // For now, we'll return the token in development
        const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
        
        res.json({
            success: true,
            message: 'Password reset instructions sent to your email',
            // Only include in development
            resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
        });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process request' 
        });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    try {
        // In real app, verify token from database
        // For now, we'll just check token format
        if (!token || token.length < 10) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid or expired reset token' 
            });
        }
        
        // In real app, you would:
        // 1. Verify token exists and isn't expired
        // 2. Find user by token
        // 3. Hash new password
        // 4. Update user password
        // 5. Delete/invalidate used token
        
        // For demo purposes, we'll simulate success
        console.log(`Password reset with token: ${token}`);
        
        res.json({
            success: true,
            message: 'Password has been reset successfully'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to reset password' 
        });
    }
});
module.exports = router;