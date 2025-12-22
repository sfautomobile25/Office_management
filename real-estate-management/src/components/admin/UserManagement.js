import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user',
        permissions: []
    });

    const availableRoles = ['admin', 'manager', 'user', 'guest'];
    const availablePermissions = [
        'dashboard_view',
        'user_manage',
        'content_manage',
        'config_manage',
        'backup_manage',
        'seo_manage',
        'analytics_view',
        'security_view'
    ];

    useEffect(() => {
        fetchUsers();
    }, []);
    

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getUsers();
            if (response.data.success) {
                setUsers(response.data.users);
            }
        } catch (err) {
            setError('Failed to fetch users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (newUser.password !== newUser.confirmPassword) {
        setError('Passwords do not match');
        return;
    }
    
    try {
        const response = await adminAPI.createUser({
            username: newUser.username,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role,
            permissions: newUser.permissions
        });
        
        if (response.data.success) {
            setShowAddModal(false);
            setNewUser({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'user',
                permissions: []
            });
            fetchUsers(); // Refresh user list
            alert('User created successfully!');
        }
    } catch (err) {
        setError(err.response?.data?.error || 'Failed to create user');
    }
};

    const handleUpdateUser = async (userId, updates) => {
        try {
            await adminAPI.updateUser(userId, updates);
            fetchUsers();
        } catch (err) {
            setError('Failed to update user');
        }
    };

const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
        try {
            const response = await adminAPI.deleteUser(userId);
            if (response.data.success) {
                fetchUsers(); // Refresh user list
                alert('User deleted successfully!');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete user');
        }
    }
};

    const handlePermissionToggle = (userId, permission) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const permissions = user.permissions ? JSON.parse(user.permissions) : [];
        const newPermissions = permissions.includes(permission)
            ? permissions.filter(p => p !== permission)
            : [...permissions, permission];

        handleUpdateUser(userId, { permissions: newPermissions });
    };

    if (loading) {
        return <div className="loading">Loading users...</div>;
    }

    return (
        <div className="user-management">
            <div className="page-header">
                <h2>User Management</h2>
                <button 
                    className="btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    + Add New User
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Permissions</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.username}</td>
                                <td>{user.email}</td>
                                <td>
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                                        className="role-select"
                                    >
                                        {availableRoles.map(role => (
                                            <option key={role} value={role}>
                                                {role}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <div className="permissions-list">
                                        {availablePermissions.map(perm => {
                                            const userPerms = user.permissions ? JSON.parse(user.permissions) : [];
                                            return (
                                                <label key={perm} className="permission-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={userPerms.includes(perm)}
                                                        onChange={() => handlePermissionToggle(user.id, perm)}
                                                    />
                                                    <span className="permission-label">{perm}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button
                                        className="btn-danger btn-sm"
                                        onClick={() => handleDeleteUser(user.id)}
                                        disabled={user.username === 'admin'}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

                                {showAddModal && (
                        <div className="modal-overlay">
                            <div className="modal">
                                <div className="modal-header">
                                    <h3>Add New User</h3>
                                    <button onClick={() => setShowAddModal(false)}>×</button>
                                </div>
                                <form onSubmit={handleAddUser}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Username *</label>
                                            <input
                                                type="text"
                                                value={newUser.username}
                                                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                                required
                                                minLength="3"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email *</label>
                                            <input
                                                type="email"
                                                value={newUser.email}
                                                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Password *</label>
                                            <input
                                                type="password"
                                                value={newUser.password}
                                                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                                required
                                                minLength="6"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Confirm Password *</label>
                                            <input
                                                type="password"
                                                value={newUser.confirmPassword}
                                                onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})}
                                                required
                                                minLength="6"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Role</label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                        >
                                            <option value="admin">Administrator</option>
                                            <option value="manager">Manager</option>
                                            <option value="agent">Real Estate Agent</option>
                                            <option value="user">Regular User</option>
                                            <option value="guest">Guest</option>
                                        </select>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Permissions</label>
                                        <div className="permissions-grid">
                                            {availablePermissions.map(perm => (
                                                <label key={perm} className="permission-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={newUser.permissions.includes(perm)}
                                                        onChange={(e) => {
                                                            const newPerms = e.target.checked
                                                                ? [...newUser.permissions, perm]
                                                                : newUser.permissions.filter(p => p !== perm);
                                                            setNewUser({...newUser, permissions: newPerms});
                                                        }}
                                                    />
                                                    <span className="permission-label">{perm.replace(/_/g, ' ')}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="modal-actions">
                                        <button 
                                            type="button" 
                                            className="btn-secondary"
                                            onClick={() => setShowAddModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn-primary">
                                            Create User
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    

            {/* Add User Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Add New User</h3>
                            <button onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="form-group">
                                <label>Username *</label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password *</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                >
                                    {availableRoles.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Add User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
        
    );
}

export default UserManagement;