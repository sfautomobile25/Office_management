import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        user: '',
        action: '',
        dateFrom: '',
        dateTo: ''
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const response = await adminAPI.getAuditLogs();
            if (response.data.success) {
                setLogs(response.data.logs);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (filters.user && !log.username?.toLowerCase().includes(filters.user.toLowerCase())) return false;
        if (filters.action && !log.action?.toLowerCase().includes(filters.action.toLowerCase())) return false;
        if (filters.dateFrom && new Date(log.created_at) < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && new Date(log.created_at) > new Date(filters.dateTo)) return false;
        return true;
    });

    const clearLogs = async () => {
        if (window.confirm('Clear all audit logs? This cannot be undone.')) {
            // Implement clear logs functionality
            console.log('Clearing audit logs...');
        }
    };

    const exportLogs = () => {
        const csvContent = [
            ['ID', 'User', 'Action', 'Details', 'IP Address', 'Date'],
            ...filteredLogs.map(log => [
                log.id,
                log.username || 'N/A',
                log.action,
                log.details || '',
                log.ip_address || '',
                new Date(log.created_at).toLocaleString()
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return <div className="loading">Loading audit logs...</div>;
    }

    return (
        <div className="audit-logs">
            <div className="page-header">
                <h2>Audit Logs</h2>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={exportLogs}>
                        Export CSV
                    </button>
                    <button className="btn-danger" onClick={clearLogs}>
                        Clear All Logs
                    </button>
                </div>
            </div>

            <div className="filters">
                <input
                    type="text"
                    placeholder="Filter by user..."
                    value={filters.user}
                    onChange={(e) => setFilters({...filters, user: e.target.value})}
                />
                <input
                    type="text"
                    placeholder="Filter by action..."
                    value={filters.action}
                    onChange={(e) => setFilters({...filters, action: e.target.value})}
                />
                <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                />
                <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                />
                <button onClick={() => setFilters({ user: '', action: '', dateFrom: '', dateTo: '' })}>
                    Clear Filters
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Details</th>
                            <th>IP Address</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map(log => (
                            <tr key={log.id}>
                                <td>{log.id}</td>
                                <td>{log.username || 'System'}</td>
                                <td>
                                    <span className={`log-action ${log.action.toLowerCase()}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td>{log.details}</td>
                                <td>{log.ip_address || 'N/A'}</td>
                                <td>{new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="stats">
                <p>Showing {filteredLogs.length} of {logs.length} total logs</p>
            </div>
        </div>
    );
}

export default AuditLogs;