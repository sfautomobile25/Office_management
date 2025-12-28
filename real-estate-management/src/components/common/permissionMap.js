export const PERMS = {
  DASHBOARD: 'dashboard_view',
  USER_MANAGE: 'user_manage',
  CONFIG: 'config_manage',
  BACKUP: 'backup_manage',
  AUDIT: 'audit_view',
  DATA: 'data_manage',
  DATABASE: 'database_manage',
  CONTENT: 'content_manage',
  SEO: 'seo_manage',
  ANALYTICS: 'analytics_view',
  SECURITY: 'security_view',
  PERFORMANCE: 'performance_view',
  LANGUAGE: 'language_manage',
  CURRENCY: 'currency_manage',

  // Accounts
  ACCOUNTS: 'accounts_view',
  REPORTS: 'reports_view',
  CASH_APPROVE: 'cash_approve'
};

// path → required permission
export const ROUTE_PERMS = {
  '/admin/dashboard': PERMS.DASHBOARD,
  '/admin/users': PERMS.USER_MANAGE,
  '/admin/permissions': PERMS.USER_MANAGE,

  '/admin/config': PERMS.CONFIG,
  '/admin/backup': PERMS.BACKUP,
  '/admin/audit-logs': PERMS.AUDIT,
  '/admin/data-export': PERMS.DATA,
  '/admin/database': PERMS.DATABASE,
  '/admin/content': PERMS.CONTENT,
  '/admin/seo': PERMS.SEO,
  '/admin/analytics': PERMS.ANALYTICS,
  '/admin/security': PERMS.SECURITY,
  '/admin/performance': PERMS.PERFORMANCE,
  '/admin/languages': PERMS.LANGUAGE,
  '/admin/currency': PERMS.CURRENCY,

  '/admin/accounts': PERMS.ACCOUNTS,
  '/admin/ledger': PERMS.REPORTS,
  '/admin/profit-loss': PERMS.REPORTS,
  '/admin/balance-sheet': PERMS.REPORTS,
  '/admin/cash-approval': PERMS.CASH_APPROVE
};
