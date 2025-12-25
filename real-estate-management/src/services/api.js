import axios from 'axios';

const API = axios.create({
    baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => API.post('/auth/login', credentials),
    register: (userData) => API.post('/auth/register', userData),
    logout: () => API.post('/auth/logout'),
    checkSession: () => API.get('/auth/check'),
    checkAdmin: () => API.get('/auth/check-admin'),
    forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => API.post('/auth/reset-password', { token, newPassword })
};

// Admin API
export const adminAPI = {
    getUsers: () => API.get('/admin/users'),
    createUser: (userData) => API.post('/admin/users', userData),
    updateUser: (id, userData) => API.put(`/admin/users/${id}`, userData),
    deleteUser: (id) => API.delete(`/admin/users/${id}`),
    
        // System Config
    getConfig: () => API.get('/admin/config'),
    updateConfig: (key, value) => API.put(`/admin/config/${key}`, { value }),

        // Stats
    getStats: () => API.get('/admin/stats'),

        // Audit Logs
    getAuditLogs: () => API.get('/admin/audit-logs'),

        // Backup
    createBackup: () => API.post('/admin/backup'),

        // Database
    getDatabaseStats: () => API.get('/admin/database/stats'),

        // Content Management
    getContent: () => API.get('/admin/content'),
    getPageContent: (page) => API.get(`/admin/content/${page}`),
    saveContent: (contentData) => API.post('/admin/content', contentData),

        // SEO Tools
    getSEOSettings: () => API.get('/admin/seo'),
    updateSEOSettings: (seoData) => API.put('/admin/seo', seoData),

        // Security
    getSecurityLogs: () => API.get('/admin/security/logs'),

        // Currency
    getCurrencies: () => API.get('/admin/currencies'),
    updateCurrency: (id, rate) => API.put(`/admin/currencies/${id}`, { rate }),

        // Export
    exportUsers: () => API.get('/admin/export/users'),
    exportConfig: () => API.get('/admin/export/config'),
    exportLogs: () => API.get('/admin/export/logs')
    
};

// Add accounts API methods
export const accountsAPI = {
    // Accounts
    getAccounts: () => API.get('/accounts/accounts'),
    createAccount: (accountData) => API.post('/accounts/accounts', accountData),
    
    // Transactions
    getTransactions: (params) => API.get('/accounts/transactions', { params }),
    createTransaction: (transactionData) => API.post('/accounts/transactions', transactionData),
    
    // Journal Entries
    createJournalEntry: (entryData) => API.post('/accounts/journal-entries', entryData),
    
    // Invoices
    getInvoices: () => API.get('/accounts/invoices'),
    
    // Reports
    getReports: (params) => API.get('/accounts/reports', { params }),
    
    // Permissions
    getPermissions: () => API.get('/accounts/permissions'),
    getMyPermissions: () => API.get('/accounts/my-permissions'),
    grantPermission: (permissionData) => API.post('/accounts/permissions', permissionData),
    downloadLedger: (params) =>
    API.get('/accounts/ledger/export', {
      params,
      responseType: 'blob'
    })
};

export const cashManagementAPI = {
    // Daily Cash Balance
    getDailyCash: (params) => API.get('/cash/daily-cash', { params }),
    updateDailyBalance: (data) => API.post('/cash/daily-cash', data),
    
    // Cash Transactions
    getCashTransactions: (params) => API.get('/cash/cash-transactions', { params }),
    createCashTransaction: (data) => API.post('/cash/cash-transactions', data),
    
    // Daily Summary
    getDailySummary: (params) => API.get('/cash/daily-summary', { params }),
    generateDailySummary: (data) => API.post('/cash/generate-daily-summary', data),
    
    // Cash Position
    getCashPosition: () => API.get('/cash/cash-position'),
    
    // Expense Analysis
    getExpenseAnalysis: (params) => API.get('/cash/expense-analysis', { params }),

    downloadDailyReport: (params) =>
    API.get('/cash/daily-report/export', {
    params,
    responseType: 'blob'
  }),

};

// System API
export const systemAPI = {
    healthCheck: () => API.get('/health'),
    test: () => API.get('/test')
};

export const cashApprovalAPI = {
  getPending: () => API.get('/cash/pending-transactions'),
  approve: (id) => API.post(`/cash/approve-transaction/${id}`),
  reject: (id, reason) => API.post(`/cash/reject-transaction/${id}`, { reason }),
  getMonthlyByStatus: (status, month) =>
    API.get(`/cash/transactions?status=${encodeURIComponent(status)}&month=${encodeURIComponent(month)}`)
};



export default API;