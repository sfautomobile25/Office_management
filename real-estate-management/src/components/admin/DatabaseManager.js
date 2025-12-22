import React, { useState, useEffect } from 'react';

function DatabaseManager() {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [queryResult, setQueryResult] = useState(null);

    // Mock data for demonstration
    const mockTables = [
        { name: 'users', rows: 5, size: '45KB' },
        { name: 'properties', rows: 12, size: '120KB' },
        { name: 'transactions', rows: 8, size: '80KB' },
        { name: 'audit_logs', rows: 150, size: '2MB' },
        { name: 'system_config', rows: 10, size: '15KB' }
    ];

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setTables(mockTables);
            setLoading(false);
        }, 1000);
    };

    const viewTable = (tableName) => {
        setSelectedTable(tableName);
        // Simulate fetching table data
        const mockData = Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            name: `Sample ${tableName} ${i + 1}`,
            created: new Date().toISOString()
        }));
        setTableData(mockData);
    };

    const executeQuery = () => {
        if (!query.trim()) return;
        
        setLoading(true);
        // Simulate query execution
        setTimeout(() => {
            setQueryResult({
                success: true,
                rows: 3,
                data: [
                    { id: 1, result: 'Query executed successfully' },
                    { id: 2, result: 'Rows affected: 0' },
                    { id: 3, result: 'Execution time: 0.05s' }
                ]
            });
            setLoading(false);
        }, 1500);
    };

    const optimizeDatabase = () => {
        if (window.confirm('Optimize database? This will improve performance.')) {
            alert('Database optimization completed!');
        }
    };

    const repairDatabase = () => {
        if (window.confirm('Repair database? This will fix any corruption issues.')) {
            alert('Database repair completed!');
        }
    };

    return (
        <div className="database-manager">
            <div className="page-header">
                <h2>Database Management</h2>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={optimizeDatabase}>
                        Optimize DB
                    </button>
                    <button className="btn-secondary" onClick={repairDatabase}>
                        Repair DB
                    </button>
                    <button className="btn-primary" onClick={fetchTables}>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="database-stats">
                <div className="stat-card">
                    <h3>Total Tables</h3>
                    <div className="stat-value">{tables.length}</div>
                    <p>Database size: ~2.3MB</p>
                </div>
                <div className="stat-card">
                    <h3>Total Rows</h3>
                    <div className="stat-value">{tables.reduce((sum, t) => sum + t.rows, 0)}</div>
                    <p>All tables combined</p>
                </div>
                <div className="stat-card">
                    <h3>Last Backup</h3>
                    <div className="stat-value">Today</div>
                    <p>2:00 AM</p>
                </div>
            </div>

            <div className="database-sections">
                <div className="section">
                    <h3>Database Tables</h3>
                    {loading ? (
                        <div className="loading">Loading tables...</div>
                    ) : (
                        <div className="table-list">
                            {tables.map(table => (
                                <div 
                                    key={table.name} 
                                    className={`table-item ${selectedTable === table.name ? 'selected' : ''}`}
                                    onClick={() => viewTable(table.name)}
                                >
                                    <div className="table-name">{table.name}</div>
                                    <div className="table-info">
                                        <span>{table.rows} rows</span>
                                        <span>{table.size}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="section">
                    <h3>SQL Query Editor</h3>
                    <div className="query-editor">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Enter SQL query (e.g., SELECT * FROM users)"
                            rows={4}
                        />
                        <button 
                            className="btn-primary" 
                            onClick={executeQuery}
                            disabled={loading || !query.trim()}
                        >
                            {loading ? 'Executing...' : 'Execute Query'}
                        </button>
                        
                        {queryResult && (
                            <div className="query-result">
                                <h4>Query Results</h4>
                                <div className="result-info">
                                    Query successful. {queryResult.rows} rows returned.
                                </div>
                                <pre>{JSON.stringify(queryResult.data, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedTable && (
                <div className="table-data-section">
                    <h3>Table Data: {selectedTable}</h3>
                    <div className="table-actions">
                        <button className="btn-secondary">Export Table</button>
                        <button className="btn-secondary">Truncate Table</button>
                        <button className="btn-danger">Drop Table</button>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map(row => (
                                    <tr key={row.id}>
                                        <td>{row.id}</td>
                                        <td>{row.name}</td>
                                        <td>{new Date(row.created).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="danger-zone">
                <h3>⚠️ Database Operations</h3>
                <div className="danger-actions">
                    <button className="btn-danger">
                        Reset Entire Database
                    </button>
                    <button className="btn-danger">
                        Delete All Data
                    </button>
                    <button className="btn-danger">
                        Drop All Tables
                    </button>
                </div>
                <p className="warning">
                    These operations will delete ALL data and cannot be undone!
                </p>
            </div>
        </div>
    );
}

export default DatabaseManager;