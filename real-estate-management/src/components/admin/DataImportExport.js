import React, { useState } from 'react';

function DataImportExport() {
    const [exportFormat, setExportFormat] = useState('csv');
    const [importFile, setImportFile] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    const exportData = async (dataType) => {
        setExporting(true);
        // Simulate export process
        setTimeout(() => {
            alert(`${dataType} exported successfully as ${exportFormat.toUpperCase()}`);
            setExporting(false);
        }, 1500);
    };

    const importData = async () => {
        if (!importFile) {
            alert('Please select a file to import');
            return;
        }

        setImporting(true);
        // Simulate import process
        setTimeout(() => {
            alert(`Data imported successfully from ${importFile.name}`);
            setImporting(false);
            setImportFile(null);
        }, 2000);
    };

    const dataTypes = [
        { id: 'users', label: 'Users', description: 'Export all user data' },
        { id: 'properties', label: 'Properties', description: 'Export property listings' },
        { id: 'content', label: 'Content', description: 'Export website content' },
        { id: 'config', label: 'Configuration', description: 'Export system settings' },
        { id: 'logs', label: 'Logs', description: 'Export audit and security logs' },
        { id: 'all', label: 'Everything', description: 'Full database export' }
    ];

    return (
        <div className="data-import-export">
            <div className="page-header">
                <h2>Data Import & Export</h2>
            </div>

            <div className="data-section">
                <h3>Export Data</h3>
                <div className="export-controls">
                    <div className="format-selector">
                        <label>Export Format:</label>
                        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                            <option value="csv">CSV</option>
                            <option value="json">JSON</option>
                            <option value="excel">Excel</option>
                            <option value="sql">SQL</option>
                        </select>
                    </div>
                </div>

                <div className="data-types-grid">
                    {dataTypes.map(dataType => (
                        <div key={dataType.id} className="data-type-card">
                            <h4>{dataType.label}</h4>
                            <p>{dataType.description}</p>
                            <button
                                className="btn-primary"
                                onClick={() => exportData(dataType.label)}
                                disabled={exporting}
                            >
                                {exporting ? 'Exporting...' : 'Export'}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="bulk-export">
                    <button className="btn-primary" disabled={exporting}>
                        {exporting ? 'Exporting All...' : 'Export All Data'}
                    </button>
                </div>
            </div>

            <div className="data-section">
                <h3>Import Data</h3>
                <div className="import-area">
                    <div className="file-upload">
                        <input
                            type="file"
                            accept=".csv,.json,.xlsx,.sql"
                            onChange={(e) => setImportFile(e.target.files[0])}
                        />
                        {importFile && (
                            <div className="file-info">
                                <p>Selected: {importFile.name}</p>
                                <p>Size: {(importFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                        )}
                    </div>

                    <div className="import-options">
                        <label>
                            <input type="checkbox" /> Clear existing data before import
                        </label>
                        <label>
                            <input type="checkbox" /> Preserve user IDs
                        </label>
                    </div>

                    <button
                        className="btn-primary"
                        onClick={importData}
                        disabled={importing || !importFile}
                    >
                        {importing ? 'Importing...' : 'Import Data'}
                    </button>

                    <div className="import-note">
                        <p>Supported formats: CSV, JSON, Excel (.xlsx), SQL</p>
                        <p>Maximum file size: 10MB</p>
                    </div>
                </div>
            </div>

            <div className="data-section danger-zone">
                <h3>⚠️ Data Operations</h3>
                <div className="danger-actions">
                    <button className="btn-danger">
                        Reset All Data
                    </button>
                    <button className="btn-danger">
                        Delete All Users
                    </button>
                    <button className="btn-danger">
                        Clear All Logs
                    </button>
                </div>
                <p className="warning">
                    These operations are irreversible. Backup your data first.
                </p>
            </div>
        </div>
    );
}

export default DataImportExport;