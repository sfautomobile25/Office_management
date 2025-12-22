import React, { useState, useEffect } from 'react';

function PerformanceOptimizer() {
    const [performanceData, setPerformanceData] = useState({
        pageLoadTime: 0,
        serverResponse: 0,
        databaseQueries: 0,
        cacheHitRate: 0
    });
    const [optimizations, setOptimizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const performanceMetrics = [
        { id: 'pageLoad', label: 'Page Load Time', value: '1.2s', target: '< 2s', status: 'good' },
        { id: 'serverResponse', label: 'Server Response', value: '120ms', target: '< 200ms', status: 'good' },
        { id: 'database', label: 'Database Queries', value: '45', target: '< 50', status: 'warning' },
        { id: 'cache', label: 'Cache Hit Rate', value: '85%', target: '> 80%', status: 'good' },
        { id: 'uptime', label: 'System Uptime', value: '99.9%', target: '> 99.5%', status: 'excellent' },
        { id: 'memory', label: 'Memory Usage', value: '65%', target: '< 80%', status: 'good' }
    ];

    const suggestedOptimizations = [
        { id: 1, title: 'Enable Gzip Compression', impact: 'high', effort: 'low', description: 'Reduce page size by compressing assets' },
        { id: 2, title: 'Optimize Database Queries', impact: 'high', effort: 'medium', description: 'Add indexes to frequently queried tables' },
        { id: 3, title: 'Implement Caching', impact: 'medium', effort: 'medium', description: 'Cache frequently accessed data' },
        { id: 4, title: 'Minify CSS/JS', impact: 'medium', effort: 'low', description: 'Reduce file sizes of static assets' },
        { id: 5, title: 'Enable CDN', impact: 'medium', effort: 'medium', description: 'Use CDN for static assets' },
        { id: 6, title: 'Optimize Images', impact: 'low', effort: 'low', description: 'Compress and resize images' }
    ];

    useEffect(() => {
        fetchPerformanceData();
    }, []);

    const fetchPerformanceData = () => {
        setLoading(true);
        setTimeout(() => {
            setPerformanceData({
                pageLoadTime: 1.2,
                serverResponse: 120,
                databaseQueries: 45,
                cacheHitRate: 85
            });
            setOptimizations(suggestedOptimizations);
            setLoading(false);
        }, 1500);
    };

    const runPerformanceScan = () => {
        setScanning(true);
        setTimeout(() => {
            alert('Performance scan completed! Recommendations updated.');
            setScanning(false);
        }, 2000);
    };

    const applyOptimization = (optimizationId) => {
        const optimization = optimizations.find(opt => opt.id === optimizationId);
        if (optimization) {
            if (window.confirm(`Apply "${optimization.title}"?`)) {
                alert(`Optimization "${optimization.title}" applied successfully!`);
                // Update optimizations list
                setOptimizations(optimizations.filter(opt => opt.id !== optimizationId));
            }
        }
    };

    const clearCache = (type) => {
        if (window.confirm(`Clear ${type} cache?`)) {
            alert(`${type} cache cleared successfully!`);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'excellent': return '#10b981';
            case 'good': return '#059669';
            case 'warning': return '#d97706';
            case 'poor': return '#dc2626';
            default: return '#6b7280';
        }
    };

    const getImpactColor = (impact) => {
        switch(impact) {
            case 'high': return '#dc2626';
            case 'medium': return '#d97706';
            case 'low': return '#059669';
            default: return '#6b7280';
        }
    };

    return (
        <div className="performance-optimizer">
            <div className="page-header">
                <h2>Performance Optimization</h2>
                <div className="header-actions">
                    <button 
                        className="btn-primary" 
                        onClick={runPerformanceScan}
                        disabled={scanning}
                    >
                        {scanning ? 'Scanning...' : 'Run Performance Scan'}
                    </button>
                </div>
            </div>

            <div className="performance-tabs">
                <button 
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button 
                    className={`tab ${activeTab === 'optimizations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('optimizations')}
                >
                    Optimizations
                </button>
                <button 
                    className={`tab ${activeTab === 'cache' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cache')}
                >
                    Cache Management
                </button>
                <button 
                    className={`tab ${activeTab === 'monitoring' ? 'active' : ''}`}
                    onClick={() => setActiveTab('monitoring')}
                >
                    Monitoring
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading performance data...</div>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <div className="overview-tab">
                            <div className="performance-stats">
                                {performanceMetrics.map(metric => (
                                    <div key={metric.id} className="metric-card">
                                        <div className="metric-header">
                                            <h4>{metric.label}</h4>
                                            <span 
                                                className="status-badge"
                                                style={{ backgroundColor: getStatusColor(metric.status) }}
                                            >
                                                {metric.status}
                                            </span>
                                        </div>
                                        <div className="metric-value">{metric.value}</div>
                                        <div className="metric-target">
                                            Target: {metric.target}
                                        </div>
                                        <div className="metric-bar">
                                            <div 
                                                className="bar-fill"
                                                style={{ 
                                                    width: metric.id === 'cache' ? metric.value : 
                                                           metric.id === 'memory' ? metric.value :
                                                           '100%',
                                                    backgroundColor: getStatusColor(metric.status)
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="performance-summary">
                                <h3>Performance Summary</h3>
                                <div className="summary-content">
                                    <p>Overall performance: <strong>Good</strong></p>
                                    <p>Page load times are within acceptable limits.</p>
                                    <p>Database queries could be optimized for better performance.</p>
                                    <p>Cache hit rate is excellent, reducing server load.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'optimizations' && (
                        <div className="optimizations-tab">
                            <h3>Suggested Optimizations</h3>
                            <p className="section-description">
                                Apply these optimizations to improve system performance:
                            </p>
                            
                            <div className="optimizations-grid">
                                {optimizations.map(optimization => (
                                    <div key={optimization.id} className="optimization-card">
                                        <div className="optimization-header">
                                            <h4>{optimization.title}</h4>
                                            <span 
                                                className="impact-badge"
                                                style={{ backgroundColor: getImpactColor(optimization.impact) }}
                                            >
                                                {optimization.impact.toUpperCase()} IMPACT
                                            </span>
                                        </div>
                                        <p className="optimization-description">{optimization.description}</p>
                                        <div className="optimization-meta">
                                            <span className="effort">Effort: {optimization.effort}</span>
                                            <span className="priority">Priority: {optimization.impact}</span>
                                        </div>
                                        <button 
                                            className="btn-primary"
                                            onClick={() => applyOptimization(optimization.id)}
                                        >
                                            Apply Optimization
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {optimizations.length === 0 && (
                                <div className="no-optimizations">
                                    <p>🎉 All optimizations have been applied!</p>
                                    <p>Your system is running at optimal performance.</p>
                                </div>
                            )}

                            <div className="quick-optimizations">
                                <h4>Quick Actions</h4>
                                <div className="quick-buttons">
                                    <button className="btn-secondary" onClick={() => clearCache('database')}>
                                        Clear Query Cache
                                    </button>
                                    <button className="btn-secondary" onClick={() => clearCache('page')}>
                                        Clear Page Cache
                                    </button>
                                    <button className="btn-secondary" onClick={() => clearCache('image')}>
                                        Clear Image Cache
                                    </button>
                                    <button className="btn-primary" onClick={runPerformanceScan}>
                                        Re-scan Performance
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cache' && (
                        <div className="cache-tab">
                            <h3>Cache Management</h3>
                            
                            <div className="cache-stats">
                                <div className="cache-stat">
                                    <h4>Cache Hit Rate</h4>
                                    <div className="stat-value">{performanceData.cacheHitRate}%</div>
                                    <div className="cache-bar">
                                        <div 
                                            className="bar-fill"
                                            style={{ width: `${performanceData.cacheHitRate}%` }}
                                        />
                                    </div>
                                </div>
                                
                                <div className="cache-stat">
                                    <h4>Cache Size</h4>
                                    <div className="stat-value">45.2 MB</div>
                                    <div className="cache-info">
                                        <span>Files: 1,234</span>
                                        <span>Expired: 45</span>
                                    </div>
                                </div>
                            </div>

                            <div className="cache-controls">
                                <h4>Cache Control</h4>
                                <div className="control-buttons">
                                    <button className="btn-primary" onClick={() => clearCache('all')}>
                                        Clear All Cache
                                    </button>
                                    <button className="btn-secondary" onClick={() => clearCache('opcode')}>
                                        Clear Opcode Cache
                                    </button>
                                    <button className="btn-secondary" onClick={() => clearCache('object')}>
                                        Clear Object Cache
                                    </button>
                                    <button className="btn-secondary" onClick={() => clearCache('transient')}>
                                        Clear Transient Cache
                                    </button>
                                </div>
                            </div>

                            <div className="cache-settings">
                                <h4>Cache Settings</h4>
                                <div className="settings-form">
                                    <div className="setting-item">
                                        <label>
                                            <input type="checkbox" defaultChecked />
                                            Enable Page Caching
                                        </label>
                                        <span className="setting-value">Enabled</span>
                                    </div>
                                    <div className="setting-item">
                                        <label>
                                            <input type="checkbox" defaultChecked />
                                            Enable Database Query Caching
                                        </label>
                                        <span className="setting-value">Enabled</span>
                                    </div>
                                    <div className="setting-item">
                                        <label>
                                            <input type="checkbox" />
                                            Enable Browser Caching
                                        </label>
                                        <span className="setting-value">Disabled</span>
                                    </div>
                                    <div className="setting-item">
                                        <label>
                                            <input type="checkbox" defaultChecked />
                                            Enable Object Caching
                                        </label>
                                        <span className="setting-value">Enabled</span>
                                    </div>
                                    <div className="setting-item">
                                        <label>Cache Expiration Time</label>
                                        <select defaultValue="3600">
                                            <option value="900">15 minutes</option>
                                            <option value="1800">30 minutes</option>
                                            <option value="3600">1 hour</option>
                                            <option value="7200">2 hours</option>
                                            <option value="86400">1 day</option>
                                        </select>
                                    </div>
                                    <button className="btn-primary">Save Cache Settings</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'monitoring' && (
                        <div className="monitoring-tab">
                            <h3>Performance Monitoring</h3>
                            
                            <div className="monitoring-stats">
                                <div className="monitor-card">
                                    <h4>Real-time Monitoring</h4>
                                    <div className="monitor-value">Active</div>
                                    <p>Tracking system performance</p>
                                    <button className="btn-secondary">View Live Stats</button>
                                </div>
                                
                                <div className="monitor-card">
                                    <h4>Performance Alerts</h4>
                                    <div className="monitor-value">3 Active</div>
                                    <p>Threshold alerts configured</p>
                                    <button className="btn-secondary">Configure Alerts</button>
                                </div>
                                
                                <div className="monitor-card">
                                    <h4>Uptime Monitor</h4>
                                    <div className="monitor-value">99.9%</div>
                                    <p>Last 30 days uptime</p>
                                    <button className="btn-secondary">View History</button>
                                </div>
                            </div>

                            <div className="monitoring-chart">
                                <h4>Performance History (Last 7 Days)</h4>
                                <div className="chart-container">
                                    <div className="chart">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                                            <div key={index} className="chart-column">
                                                <div 
                                                    className="column-fill"
                                                    style={{ height: `${60 + Math.random() * 40}%` }}
                                                    title={`Page Load: ${(1 + Math.random()).toFixed(1)}s`}
                                                />
                                                <div className="chart-label">{day}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="chart-legend">
                                        <div className="legend-item">
                                            <span className="color"></span>
                                            <span>Page Load Time (seconds)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="monitoring-settings">
                                <h4>Monitoring Settings</h4>
                                <div className="settings-grid">
                                    <div className="setting-item">
                                        <label>Performance Threshold</label>
                                        <input type="number" defaultValue="2" min="0" step="0.1" />
                                        <span className="setting-desc">Page load time threshold (seconds)</span>
                                    </div>
                                    <div className="setting-item">
                                        <label>Alert Frequency</label>
                                        <select defaultValue="hourly">
                                            <option value="realtime">Real-time</option>
                                            <option value="hourly">Hourly</option>
                                            <option value="daily">Daily</option>
                                        </select>
                                    </div>
                                    <div className="setting-item">
                                        <label>Notification Method</label>
                                        <select defaultValue="email">
                                            <option value="email">Email</option>
                                            <option value="dashboard">Dashboard Only</option>
                                            <option value="both">Both</option>
                                        </select>
                                    </div>
                                </div>
                                <button className="btn-primary">Save Monitoring Settings</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default PerformanceOptimizer;