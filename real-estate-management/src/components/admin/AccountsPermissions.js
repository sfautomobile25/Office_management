import React, { useState, useEffect } from 'react';
import { adminAPI, accountsAPI } from '../../services/api';

function AccountsPermissions() {
    const [permissions, setPermissions] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGrantModal, setShowGrantModal] = useState(false);
    
    const [newPermission, setNewPermission] = useState({
        user_id: '',
        permission_type: 'view',
        resource_type: 'accounts',
        resource_id: '',
        expires_at: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [permsRes, usersRes] = await Promise.all([
                accountsAPI.getPermissions(),
                adminAPI.getUsers()
            ]);
            
            if (permsRes.data.success) {
                setPermissions(permsRes.data.permissions);
            }
            
            if (usersRes.data.success) {
                setUsers(usersRes.data.users);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGrantPermission = async (e) => {
        e.preventDefault();
        try {
            const response = await accountsAPI.grantPermission(newPermission);
            if (response.data.success) {
                setShowGrantModal(false);
                setNewPermission({
                    user_id: '',
                    permission_type: 'view',
                    resource_type: 'accounts',
                    resource_id: '',
                    expires_at: ''
                });
                fetchData();
            }
        } catch (error) {
            console.error('Error granting permission:', error);
        }
    };

    const revokePermission = async (permissionId) => {
        if (window.confirm('Are you sure you want to revoke this permission?')) {
            // Implement revoke permission endpoint
            console.log('Revoking permission:', permissionId);
        }
    };

    const resourceTypes = [
        { value: 'accounts', label: 'Accounts' },
        { value: 'transactions', label: 'Transactions' },
        { value: 'journal_entries', label: 'Journal Entries' },
        { value: 'invoices', label: 'Invoices' },
        { value: 'expenses', label: 'Expenses' },
        { value: 'reports', label: 'Reports' }
    ];

    const permissionTypes = [
        { value: 'view', label: 'View' },
        { value: 'create', label: 'Create' },
        { value: 'edit', label: 'Edit' },
        { value: 'delete', label: 'Delete' },
        { value: 'approve', label: 'Approve' }
    ];

    if (loading) {
        return <div className="loading">Loading permissions...</div>;
    }

    return (
        <div className="accounts-permissions">
            <div className="page-header">
                <h2>Accounts Permissions</h2>
                <button 
                    className="btn-primary"
                    onClick={() => setShowGrantModal(true)}
                >
                    + Grant Permission
                </button>
            </div>

            <div className="permissions-info">
                <p>Manage accounts access permissions for users. Admin users have full access by default.</p>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Permission</th>
                            <th>Resource</th>
                            <th>Granted By</th>
                            <th>Granted At</th>
                            <th>Expires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {permissions.map(permission => (
                            <tr key={permission.id}>
                                <td>
                                    <strong>{permission.user_name}</strong>
                                    <div className="text-muted">ID: {permission.user_id}</div>
                                </td>
                                <td>
                                    <span className={`permission-badge ${permission.permission_type}`}>
                                        {permission.permission_type}
                                    </span>
                                </td>
                                <td>
                                    {permission.resource_type}
                                    {permission.resource_id && (
                                        <div className="text-muted">ID: {permission.resource_id}</div>
                                    )}
                                </td>
                                <td>{permission.granted_by_name}</td>
                                <td>{new Date(permission.granted_at).toLocaleDateString()}</td>
                                <td>
                                    {permission.expires_at 
                                        ? new Date(permission.expires_at).toLocaleDateString()
                                        : 'Never'
                                    }
                                </td>
                                <td>
                                    <button 
                                        className="btn-sm btn-danger"
                                        onClick={() => revokePermission(permission.id)}
                                    >
                                        Revoke
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Grant Permission Modal */}
            {showGrantModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Grant Account Permission</h3>
                            <button onClick={() => setShowGrantModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleGrantPermission}>
                            <div className="form-group">
                                <label>User *</label>
                                <select
                                    value={newPermission.user_id}
                                    onChange={(e) => setNewPermission({...newPermission, user_id: e.target.value})}
                                    required
                                >
                                    <option value="">Select User</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.username} ({user.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Permission Type *</label>
                                    <select
                                        value={newPermission.permission_type}
                                        onChange={(e) => setNewPermission({...newPermission, permission_type: e.target.value})}
                                        required
                                    >
                                        {permissionTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Resource Type *</label>
                                    <select
                                        value={newPermission.resource_type}
                                        onChange={(e) => setNewPermission({...newPermission, resource_type: e.target.value})}
                                        required
                                    >
                                        {resourceTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Resource ID (Optional)</label>
                                <input
                                    type="number"
                                    value={newPermission.resource_id}
                                    onChange={(e) => setNewPermission({...newPermission, resource_id: e.target.value})}
                                    placeholder="Leave empty for all resources"
                                />
                                <div className="form-hint">
                                    Enter specific resource ID, or leave empty for all resources of this type
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Expiry Date (Optional)</label>
                                <input
                                    type="date"
                                    value={newPermission.expires_at}
                                    onChange={(e) => setNewPermission({...newPermission, expires_at: e.target.value})}
                                />
                                <div className="form-hint">
                                    Leave empty for permanent permission
                                </div>
                            </div>
                            
                            <div className="modal-actions">
                                <button 
                                    type="button" 
                                    className="btn-secondary"
                                    onClick={() => setShowGrantModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Grant Permission
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AccountsPermissions;