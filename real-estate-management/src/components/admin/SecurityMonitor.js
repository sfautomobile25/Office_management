import React, { useState, useEffect } from 'react';

function SecurityMonitor() {
    const [securityLogs, setSecurityLogs] = useState([]);
    const [threatLevel, setThreatLevel] = useState('low');
    const [failedLogins, setFailedLogins] = useState(0);
    const [blockedIPs, setBlockedIPs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        fetchSecurityData();
    }, []);

    const fetchSecurityData = () => {
        setLoading(true);
        
        // Mock security logs
        const mockLogs = [
            { id: 1, type: 'failed_login', severity: 'high', ip: '192.168.1.100', timestamp: '2023-10-15 14:30:00', details: 'Failed login attempt for user: admin' },
            { id: 2, type: 'brute_force', severity: 'critical', ip: '203.0.113.5', timestamp: '2023-10-15 13:15:00', details: 'Multiple failed login attempts from same IP' },
            { id: 3, type: 'sql_injection', severity: 'critical', ip: '198.51.100.23', timestamp: '2023-10-15 12:45:00', details: 'Possible SQL injection attempt detected' },
            { id: 4, type: 'xss_attempt', severity: 'medium', ip: '203.0.113.42', timestamp: '2023-10-15 11:20:00', details: 'Cross-site scripting attempt blocked' },
            { id: 5, type: 'file_upload', severity: 'medium', ip: '192.168.1.150', timestamp: '2023-10-15 10:10:00', details: 'Suspicious file upload attempt' },
            { id: 6, type: 'access_denied', severity: 'low', ip: '192.168.1.200', timestamp: '2023-10-15 09:30:00', details: 'Unauthorized access attempt' }
        ];

        // Mock blocked IPs
        const mockBlockedIPs = ['203.0.113.5', '198.51.100.23'];

        setTimeout(() => {
            setSecurityLogs(mockLogs);
            setFailedLogins(mockLogs.filter(log => log.type === 'failed_login').length);
            setBlockedIPs(mockBlockedIPs);
            setThreatLevel(mockLogs.some(log => log.severity === 'critical') ? 'high' : 'low');
            setLoading(false);
        }, 1000);
    };

    const runSecurityScan = () => {
        setScanning(true);
        setTimeout(() => {
            alert('Security scan completed! No new threats detected.');
            setScanning(false);
        }, 2000);
    };

    const blockIP = () => {
        const ip = prompt('Enter IP address to block:');
        if (ip && !blockedIPs.includes(ip)) {
            setBlockedIPs([...blockedIPs, ip]);
            alert(`IP ${ip} has been blocked.`);
        }
    };

    const unblockIP = (ip) => {
        setBlockedIPs(blockedIPs.filter(blockedIp => blockedIp !== ip));
    };

    const clearLogs = () => {
        if (window.confirm('Clear all security logs?')) {
            setSecurityLogs([]);
        }
    };

    const getSeverityColor = (severity) => {
        switch(severity) {
            case 'critical': return '#dc2626';
            case 'high': return '#ea580c';
            case 'medium': return '#d97706';
            case 'low': return '#059669';
            default: return '#6b7280';
        }
    };

    return (
        <div className="security-monitor">
            <div className="page-header">
                <h2>Security Monitoring</h2>
                <div className="header-actions">
                    <button 
                        className="btn-primary" 
                        onClick={runSecurityScan}
                        disabled={scanning}
                    >
                        {scanning ? 'Scanning...' : 'Run Security Scan'}
                    </button>
                    <button className="btn-secondary" onClick={blockIP}>
                        Block IP
                    </button>
                    <button className="btn-danger" onClick={clearLogs}>
                        Clear Logs
                    </button>
                </div>
            </div>

            <div className="security-overview">
                <div className="threat-level">
                    <h3>Current Threat Level</h3>
                    <div className={`threat-indicator ${threatLevel}`}>
                        <div className="threat-value">{threatLevel.toUpperCase()}</div>
                        <div className="threat-description">
                            {threatLevel === 'high' ? 'High threat activity detected' : 
                             threatLevel === 'medium' ? 'Moderate threat level' : 
                             'Low threat level'}
                        </div>
                    </div>
                </div>

                <div className="security-stats">
                    <div className="stat-card">
                        <h3>Failed Logins</h3>
                        <div className="stat-value">{failedLogins}</div>
                        <p>Last 24 hours</p>
                    </div>
                    <div className="stat-card">
                        <h3>Blocked IPs</h3>
                        <div className="stat-value">{blockedIPs.length}</div>
                        <p>Currently blocked</p>
                    </div>
                    <div className="stat-card">
                        <h3>Security Logs</h3>
                        <div className="stat-value">{securityLogs.length}</div>
                        <p>Total entries</p>
                    </div>
                    <div className="stat-card">
                        <h3>Last Scan</h3>
                        <div className="stat-value">Today</div>
                        <p>14:30 PM</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading security data...</div>
            ) : (
                <>
                    <div className="security-logs">
                        <h3>Security Events</h3>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Severity</th>
                                        <th>IP Address</th>
                                        <th>Timestamp</th>
                                        <th>Details</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {securityLogs.map(log => (
                                        <tr key={log.id}>
                                            <td>
                                                <span className="log-type">{log.type.replace('_', ' ')}</span>
                                            </td>
                                            <td>
                                                <span 
                                                    className="severity-badge"
                                                    style={{ backgroundColor: getSeverityColor(log.severity) }}
                                                >
                                                    {log.severity}
                                                </span>
                                            </td>
                                            <td>
                                                <code>{log.ip}</code>
                                                {blockedIPs.includes(log.ip) && (
                                                    <span className="blocked-tag">BLOCKED</span>
                                                )}
                                            </td>
                                            <td>{log.timestamp}</td>
                                            <td>{log.details}</td>
                                            <td>
                                                <button 
                                                    className="btn-secondary btn-sm"
                                                    onClick={() => {
                                                        if (!blockedIPs.includes(log.ip)) {
                                                            setBlockedIPs([...blockedIPs, log.ip]);
                                                        }
                                                    }}
                                                >
                                                    Block IP
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="security-sections">
                        <div className="section">
                            <h3>Blocked IP Addresses</h3>
                            <div className="blocked-ips">
                                {blockedIPs.length === 0 ? (
                                    <p className="no-data">No IPs are currently blocked.</p>
                                ) : (
                                    <div className="ip-list">
                                        {blockedIPs.map((ip, index) => (
                                            <div key={index} className="ip-item">
                                                <code>{ip}</code>
                                                <button 
                                                    className="btn-danger btn-sm"
                                                    onClick={() => unblockIP(ip)}
                                                >
                                                    Unblock
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="section">
                            <h3>Security Settings</h3>
                            <div className="security-settings">
                                <div className="setting-item">
                                    <label>
                                        <input type="checkbox" defaultChecked />
                                        Enable brute force protection
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <label>
                                        <input type="checkbox" defaultChecked />
                                        Enable SQL injection protection
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <label>
                                        <input type="checkbox" defaultChecked />
                                        Enable XSS protection
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <label>
                                        <input type="checkbox" />
                                        Enable two-factor authentication
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <label>
                                        <input type="checkbox" defaultChecked />
                                        Auto-block suspicious IPs
                                    </label>
                                </div>
                                <button className="btn-primary">Save Settings</button>
                            </div>
                        </div>
                    </div>

                    <div className="security-tools">
                        <h3>Security Tools</h3>
                        <div className="tools-grid">
                            <div className="tool-card">
                                <h4>Vulnerability Scanner</h4>
                                <p>Scan for security vulnerabilities</p>
                                <button className="btn-secondary">Start Scan</button>
                            </div>
                            <div className="tool-card">
                                <h4>Firewall Logs</h4>
                                <p>View firewall activity</p>
                                <button className="btn-secondary">View Logs</button>
                            </div>
                            <div className="tool-card">
                                <h4>Malware Scan</h4>
                                <p>Scan for malware</p>
                                <button className="btn-secondary">Scan Now</button>
                            </div>
                            <div className="tool-card">
                                <h4>SSL Certificate</h4>
                                <p>Check SSL status</p>
                                <button className="btn-secondary">Check SSL</button>
                            </div>
                        </div>
                    </div>

                    <div className="danger-zone">
                        <h3>⚠️ Security Actions</h3>
                        <div className="danger-actions">
                            <button className="btn-danger">
                                Lock System
                            </button>
                            <button className="btn-danger">
                                Terminate All Sessions
                            </button>
                            <button className="btn-danger">
                                Emergency Shutdown
                            </button>
                        </div>
                        <p className="warning">
                            These actions will immediately affect all users. Use with caution.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}

export default SecurityMonitor;