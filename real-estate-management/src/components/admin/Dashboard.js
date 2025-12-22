import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

function Dashboard({ user }) {
    const [stats, setStats] = useState({
        users: 0,
        logs: 0,
        content: 0,
        config: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []); // Empty dependency array means this runs once on mount

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getStats();
            if (response.data.success) {
                setStats(response.data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard">
                <h2>Dashboard</h2>
                <div className="loading">Loading dashboard data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard">
                <h2>Dashboard</h2>
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <h2>Dashboard</h2>
            <p className="dashboard-welcome">
                Welcome back, <strong>{user?.username}</strong>! Here's what's happening with your real estate management system.
            </p>
            
            <div className="dashboard-grid">
                <div className="stat-card">
                    <h3>Total Users</h3>
                    <div className="stat-value">{stats.users}</div>
                    <p>Registered system users</p>
                </div>
                
                <div className="stat-card">
                    <h3>Audit Logs</h3>
                    <div className="stat-value">{stats.logs}</div>
                    <p>System activities recorded</p>
                </div>
                
                <div className="stat-card">
                    <h3>Content Pages</h3>
                    <div className="stat-value">{stats.content}</div>
                    <p>Website content pages</p>
                </div>
                
                <div className="stat-card">
                    <h3>Configuration</h3>
                    <div className="stat-value">{stats.config}</div>
                    <p>System settings</p>
                </div>
            </div>

            <div className="dashboard-section">
                <h3>Quick Actions</h3>
                <div className="quick-actions">
                    <button 
                        className="action-btn"
                        onClick={() => window.location.href = '#/admin/users'}
                    >
                        <span>👥</span> Manage Users
                    </button>
                    <button 
                        className="action-btn"
                        onClick={() => window.location.href = '#/admin/config'}
                    >
                        <span>⚙️</span> System Settings
                    </button>
                    <button 
                        className="action-btn"
                        onClick={() => window.location.href = '#/admin/audit-logs'}
                    >
                        <span>📋</span> View Audit Logs
                    </button>
                    <button 
                        className="action-btn"
                        onClick={() => window.location.href = '#/admin/content'}
                    >
                        <span>📝</span> Edit Content
                    </button>
                </div>
            </div>

            <div className="dashboard-section">
                <h3>System Information</h3>
                <div className="status-info">
                    <p>
                        <strong>Current User:</strong> {user?.username} ({user?.role})
                    </p>
                    <p>
                        <strong>Permissions:</strong> {user?.permissions?.length || 0} granted
                    </p>
                    <p>
                        <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;