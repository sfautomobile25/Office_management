import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar({ isOpen, user }) {
    const menuItems = [
        { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/admin/users', label: 'User Management', icon: '👥' },
        { path: '/admin/permissions', label: 'Permission Settings', icon: '🔐' },
        { path: '/admin/config', label: 'System Configuration', icon: '⚙️' },
        { path: '/admin/backup', label: 'Backup & Restore', icon: '💾' },
        { path: '/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
        { path: '/admin/data-export', label: 'Data Export/Import', icon: '📤' },
        { path: '/admin/database', label: 'Database Management', icon: '🗄️' },
        { path: '/admin/content', label: 'Content Management', icon: '📝' },
        { path: '/admin/seo', label: 'SEO Tools', icon: '🔍' },
        { path: '/admin/analytics', label: 'Analytics', icon: '📈' },
        { path: '/admin/security', label: 'Security Monitoring', icon: '🛡️' },
        { path: '/admin/performance', label: 'Performance', icon: '⚡' },
        { path: '/admin/languages', label: 'Multi-language', icon: '🌐' },
        { path: '/admin/currency', label: 'Currency Converter', icon: '💰' }
    ];

    return (
        <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <nav className="sidebar-nav">
                <ul>
                    {menuItems.map((item) => (
                        <li key={item.path}>
                            <NavLink 
                                to={item.path} 
                                className={({ isActive }) => 
                                    `nav-link ${isActive ? 'active' : ''}`
                                }
                                end
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {isOpen && <span className="nav-label">{item.label}</span>}
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