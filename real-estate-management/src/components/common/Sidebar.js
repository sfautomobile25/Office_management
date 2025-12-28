import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { cashApprovalAPI } from "../../services/api";
import { ROUTE_PERMS } from './permissionMap';


function Sidebar({ isOpen, user }) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let alive = true;

    const loadCount = async () => {
      try {
        const res = await cashApprovalAPI.getPendingCount();
        if (!alive) return;
        if (res.data?.success) setPendingCount(Number(res.data.count || 0));
      } catch (e) {
        // ignore if user doesn't have permission or not logged in
      }
    };

    loadCount();

    // ✅ refresh every 15 seconds
    const t = setInterval(loadCount, 15000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const getMe = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const canAccess = (path) => {
  const me = getMe();
  if (!me) return false;
  if (me.role === 'admin') return true;

  const required = ROUTE_PERMS[path];
  if (!required) return true; // if not mapped, allow (or set false if you want strict)
  const perms = Array.isArray(me.permissions) ? me.permissions : [];
  return perms.includes('all') || perms.includes(required);
};


  const menuItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/admin/accounts", label: "Accounts Management", icon: "💰" },
    { path: "/admin/cash-approval", label: "Cash Approval", icon: "✅" },
    { path: "/admin/ledger", label: "General Ledger", icon: "📒" },
    { path: "/admin/profit-loss", label: "Profit & Loss", icon: "📈" },
    { path: "/admin/balance-sheet", label: "Balance Sheet", icon: "📊" },
    { path: "/admin/users", label: "User Management", icon: "👥" },
    { path: "/admin/permissions", label: "Permission Settings", icon: "🔐" },
    { path: "/admin/config", label: "System Configuration", icon: "⚙️" },
    { path: "/admin/backup", label: "Backup & Restore", icon: "💾" },
    { path: "/admin/audit-logs", label: "Audit Logs", icon: "📋" },
    { path: "/admin/data-export", label: "Data Export/Import", icon: "📤" },
    { path: "/admin/database", label: "Database Management", icon: "🗄️" },
    { path: "/admin/content", label: "Content Management", icon: "📝" },
    { path: "/admin/seo", label: "SEO Tools", icon: "🔍" },
    { path: "/admin/analytics", label: "Analytics", icon: "📈" },
    { path: "/admin/security", label: "Security Monitoring", icon: "🛡️" },
    { path: "/admin/performance", label: "Performance", icon: "⚡" },
    { path: "/admin/languages", label: "Multi-language", icon: "🌐" },
    { path: "/admin/currency", label: "Currency Converter", icon: "💰" },
  ];

  const visibleMenuItems = menuItems.filter((item) => canAccess(item.path));


  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <nav className="sidebar-nav">
        <ul>
          {visibleMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                end
              >
                <span className="nav-icon">{item.icon}</span>
                {isOpen && (
                  <span
                    className="nav-label"
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {item.label}

                    {item.path === "/admin/cash-approval" &&
                      pendingCount > 0 && (
                        <span className="badge">{pendingCount}</span>
                      )}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {isOpen && (
          <div className="system-info">
            <p>Admin Panel v1.0</p>
            <p>Role: {user?.role}</p>
            <p>User: {user?.username}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
