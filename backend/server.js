const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { db } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Simple CORS setup
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.sqlite',
        dir: './'
    }),
    secret: 'real-estate-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Backend is working!',
        timestamp: new Date().toISOString()
    });
});

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const accountsRoutes = require('./routes/accounts');
const cashManagementRoutes = require('./routes/cashManagement');
const cashApprovalRoutes = require('./routes/cashApproval');
const receiptsRoutes = require('./routes/receipts');
const userManagementRoutes = require('./routes/userManagement');



// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/cash', cashManagementRoutes);
app.use('/api/cash', cashApprovalRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/user-management', userManagementRoutes);


// // Start server
// app.listen(PORT, () => {
//     console.log(`✅ Server running on http://localhost:${PORT}`);
//     console.log(`📊 Test: http://localhost:${PORT}/api/test`);
// });

// in render
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});