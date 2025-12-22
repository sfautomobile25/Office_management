import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

function PermissionSettings() {
    const [roles, setRoles] = useState([
        { id: 'admin', name: 'Administrator', permissions: ['all'] },
        { id: 'manager', name: 'Manager', permissions: ['dashboard_view', 'content_manage', 'analytics_view'] },
        { id: 'editor', name: 'Editor', permissions: ['content_manage'] },
        { id: 'user', name: 'User', permissions: ['dashboard_view'] },
        { id: 'guest', name: 'Guest', permissions: [] }
    ]);
    
    const [permissions, setPermissions] = useState([
        { id: 'all', name: 'All Permissions', description: 'Full system access' },
        { id: 'dashboard_view', name: 'View Dashboard', description: 'Access to dashboard' },
        { id: 'user_manage', name: 'Manage Users', description: 'Create, edit, delete users' },
        { id: 'content_manage', name: 'Manage Content', description: 'Edit website content' },
        { id: 'config_manage', name: 'Manage Config', description: 'Change system settings' },
        { id: 'backup_manage', name: 'Manage Backups', description: 'Create and restore backups' },
        { id: 'seo_manage', name: 'Manage SEO', description: 'Edit SEO settings' },
        { id: 'analytics_view', name: 'View Analytics', description: 'Access to analytics data' },
        { id: 'security_view', name: 'View Security', description: 'Access security logs' },
        { id: 'database_manage', name: 'Manage Database', description: 'Database operations' }
    ]);

    const handlePermissionToggle = (roleId, permissionId) => {
        setRoles(roles.map(role => {
            if (role.id === roleId) {
                const currentPerms = role.permissions;
                let newPerms;
                
                if (permissionId === 'all') {
                    // Toggle all permissions
                    newPerms = currentPerms.includes('all') 
                        ? [] 
                        : permissions.map(p => p.id);
                } else {
                    // Toggle specific permission
                    newPerms = currentPerms.includes(permissionId)
                        ? currentPerms.filter(p => p !== permissionId && p !== 'all')
                        : [...currentPerms, permissionId];
                }
                
                return { ...role, permissions: newPerms };
            }
            return role;
        }));
    };

    const handleSavePermissions = async () => {
        try {
            // Save to backend (you'll need to implement this endpoint)
            console.log('Saving permissions:', roles);
            alert('Permissions saved successfully!');
        } catch (error) {
            console.error('Failed to save permissions:', error);
            alert('Failed to save permissions');
        }
    };

    const handleAddRole = () => {
        const roleName = prompt('Enter new role name:');
        if (roleName) {
            setRoles([...roles, {
                id: roleName.toLowerCase().replace(/\s+/g, '_'),
                name: roleName,
                permissions: []
            }]);
        }
    };

    const hasPermission = (rolePermissions, permissionId) => {
        return rolePermissions.includes('all') || rolePermissions.includes(permissionId);
    };

    return (
        <div className="permission-settings">
            <div className="page-header">
                <h2>Permission Settings</h2>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={handleAddRole}>
                        + Add Role
                    </button>
                    <button className="btn-primary" onClick={handleSavePermissions}>
                        Save Permissions
                    </button>
                </div>
            </div>

            <div className="permission-grid">
                <div className="roles-column">
                    <h3>Roles</h3>
                    <div className="roles-list">
                        {roles.map(role => (
                            <div key={role.id} className="role-item">
                                <div className="role-header">
                                    <strong>{role.name}</strong>
                                    <span className="role-id">({role.id})</span>
                                </div>
                                <div className="role-permissions-summary">
                                    {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="permissions-column">
                    <h3>Permissions Matrix</h3>
                    <div className="permissions-table-container">
                        <table className="permissions-table">
                            <thead>
                                <tr>
                                    <th>Permission</th>
                                    {roles.map(role => (
                                        <th key={role.id}>{role.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {permissions.map(permission => (
                                    <tr key={permission.id}>
                                        <td className="permission-info">
                                            <div className="permission-name">{permission.name}</div>
                                            <div className="permission-desc">{permission.description}</div>
                                        </td>
                                        {roles.map(role => (
                                            <td key={role.id} className="permission-cell">
                                                <input
                                                    type="checkbox"
                                                    checked={hasPermission(role.permissions, permission.id)}
                                                    onChange={() => handlePermissionToggle(role.id, permission.id)}
                                                    disabled={role.id === 'admin'}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="quick-actions-section">
                <h3>Quick Actions</h3>
                <div className="quick-permission-actions">
                    <button 
                        className="btn-secondary"
                        onClick={() => {
                            // Grant all permissions to all roles
                            setRoles(roles.map(role => ({
                                ...role,
                                permissions: permissions.map(p => p.id)
                            })));
                        }}
                    >
                        Grant All Permissions
                    </button>
                    <button 
                        className="btn-secondary"
                        onClick={() => {
                            // Revoke all permissions (except admin)
                            setRoles(roles.map(role => ({
                                ...role,
                                permissions: role.id === 'admin' ? ['all'] : []
                            })));
                        }}
                    >
                        Revoke All Permissions
                    </button>
                    <button 
                        className="btn-secondary"
                        onClick={() => {
                            // Reset to defaults
                            setRoles([
                                { id: 'admin', name: 'Administrator', permissions: ['all'] },
                                { id: 'manager', name: 'Manager', permissions: ['dashboard_view', 'content_manage', 'analytics_view'] },
                                { id: 'editor', name: 'Editor', permissions: ['content_manage'] },
                                { id: 'user', name: 'User', permissions: ['dashboard_view'] },
                                { id: 'guest', name: 'Guest', permissions: [] }
                            ]);
                        }}
                    >
                        Reset to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PermissionSettings;