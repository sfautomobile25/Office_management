import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

function BackupRestore() {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [message, setMessage] = useState('');
    const [autoBackup, setAutoBackup] = useState(true);
    const [backupSchedule, setBackupSchedule] = useState('daily');

    // Mock backup data (in real app, fetch from API)
    const mockBackups = [
        { id: 1, name: 'backup_2023_10_15.sqlite', size: '2.5 MB', date: '2023-10-15 14:30:00', type: 'full' },
        { id: 2, name: 'backup_2023_10_14.sqlite', size: '2.4 MB', date: '2023-10-14 14:30:00', type: 'full' },
        { id: 3, name: 'backup_2023_10_13.sqlite', size: '2.3 MB', date: '2023-10-13 14:30:00', type: 'full' },
        { id: 4, name: 'backup_incremental_2023_10_15_18.sqlite', size: '150 KB', date: '2023-10-15 18:00:00', type: 'incremental' }
    ];

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            // Simulate API call
            setTimeout(() => {
                setBackups(mockBackups);
                setLoading(false);
            }, 1000);
        } catch (error) {
            setMessage('Failed to fetch backups');
            setLoading(false);
        }
    };

    const createBackup = async () => {
        setCreatingBackup(true);
        setMessage('');
        
        try {
            const response = await adminAPI.createBackup();
            if (response.data.success) {
                setMessage(`Backup created successfully: ${response.data.file}`);
                
                // Add new backup to list
                const newBackup = {
                    id: backups.length + 1,
                    name: response.data.file,
                    size: 'Calculating...',
                    date: new Date().toISOString(),
                    type: 'full'
                };
                setBackups([newBackup, ...backups]);
                
                setTimeout(() => setMessage(''), 5000);
            }
        } catch (error) {
            setMessage('Failed to create backup');
        } finally {
            setCreatingBackup(false);
        }
    };

    const restoreBackup = async (backupName) => {
        if (!window.confirm(`Are you sure you want to restore ${backupName}? This will overwrite current data.`)) {
            return;
        }

        setRestoring(true);
        setMessage(`Restoring ${backupName}...`);
        
        try {
            // Simulate restore process
            await new Promise(resolve => setTimeout(resolve, 2000));
            setMessage('Backup restored successfully! System will reload...');
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            setMessage('Failed to restore backup');
        } finally {
            setRestoring(false);
        }
    };

    const deleteBackup = async (backupId) => {
        if (!window.confirm('Are you sure you want to delete this backup?')) {
            return;
        }

        try {
            setBackups(backups.filter(b => b.id !== backupId));
            setMessage('Backup deleted successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to delete backup');
        }
    };

    const downloadBackup = (backupName) => {
        // In a real app, this would download the file
        setMessage(`Downloading ${backupName}...`);
        setTimeout(() => setMessage('Download started'), 1000);
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const calculateStorageUsage = () => {
        const totalSize = backups.reduce((sum, backup) => {
            const sizeStr = backup.size;
            const sizeNum = parseFloat(sizeStr);
            const unit = sizeStr.split(' ')[1];
            
            let multiplier = 1;
            if (unit === 'KB') multiplier = 1024;
            if (unit === 'MB') multiplier = 1024 * 1024;
            if (unit === 'GB') multiplier = 1024 * 1024 * 1024;
            
            return sum + (sizeNum * multiplier);
        }, 0);
        
        return formatBytes(totalSize);
    };

    return (
        <div className="backup-restore">
            <div className="page-header">
                <h2>Backup & Restore</h2>
                <button 
                    className="btn-primary"
                    onClick={createBackup}
                    disabled={creatingBackup || restoring}
                >
                    {creatingBackup ? 'Creating Backup...' : 'Create New Backup'}
                </button>
            </div>

            {message && (
                <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="backup-stats">
                <div className="stat-card">
                    <h3>Total Backups</h3>
                    <div className="stat-value">{backups.length}</div>
                    <p>Storage used: {calculateStorageUsage()}</p>
                </div>
                <div className="stat-card">
                    <h3>Last Backup</h3>
                    <div className="stat-value">
                        {backups.length > 0 
                            ? new Date(backups[0].date).toLocaleDateString()
                            : 'Never'
                        }
                    </div>
                    <p>Auto backup: {autoBackup ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="stat-card">
                    <h3>Schedule</h3>
                    <div className="stat-value">{backupSchedule}</div>
                    <p>Next backup: Tomorrow 2:00 AM</p>
                </div>
            </div>

            <div className="backup-settings">
                <h3>Backup Settings</h3>
                <div className="settings-grid">
                    <div className="setting-item">
                        <label>
                            <input
                                type="checkbox"
                                checked={autoBackup}
                                onChange={(e) => setAutoBackup(e.target.checked)}
                            />
                            Enable Automatic Backups
                        </label>
                    </div>
                    <div className="setting-item">
                        <label>Backup Frequency</label>
                        <select 
                            value={backupSchedule}
                            onChange={(e) => setBackupSchedule(e.target.value)}
                            disabled={!autoBackup}
                        >
                            <option value="hourly">Every Hour</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div className="setting-item">
                        <label>Retention Period</label>
                        <select>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                            <option value="forever">Forever</option>
                        </select>
                    </div>
                </div>
                <button className="btn-secondary">Save Settings</button>
            </div>

            <div className="backup-list-section">
                <h3>Available Backups</h3>
                {loading ? (
                    <div className="loading">Loading backups...</div>
                ) : backups.length === 0 ? (
                    <div className="empty-state">
                        <p>No backups available. Create your first backup!</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backups.map(backup => (
                                    <tr key={backup.id}>
                                        <td>{backup.name}</td>
                                        <td>{backup.size}</td>
                                        <td>{new Date(backup.date).toLocaleString()}</td>
                                        <td>
                                            <span className={`backup-type ${backup.type}`}>
                                                {backup.type}
                                            </span>
                                        </td>
                                        <td className="actions">
                                            <button
                                                className="btn-secondary btn-sm"
                                                onClick={() => downloadBackup(backup.name)}
                                                disabled={restoring}
                                            >
                                                Download
                                            </button>
                                            <button
                                                className="btn-primary btn-sm"
                                                onClick={() => restoreBackup(backup.name)}
                                                disabled={restoring}
                                            >
                                                {restoring ? 'Restoring...' : 'Restore'}
                                            </button>
                                            <button
                                                className="btn-danger btn-sm"
                                                onClick={() => deleteBackup(backup.id)}
                                                disabled={restoring}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="restore-section">
                <h3>Restore from File</h3>
                <div className="restore-upload">
                    <input type="file" accept=".sqlite,.db,.backup" />
                    <button className="btn-primary" disabled={restoring}>
                        Upload & Restore
                    </button>
                    <p className="note">
                        Select a backup file (.sqlite, .db, .backup) to restore. This will replace current data.
                    </p>
                </div>
            </div>

            <div className="danger-zone">
                <h3>⚠️ Danger Zone</h3>
                <div className="danger-actions">
                    <button className="btn-danger">
                        Delete All Backups
                    </button>
                    <button className="btn-danger">
                        Reset Database to Defaults
                    </button>
                </div>
                <p className="warning">
                    These actions cannot be undone. Proceed with extreme caution.
                </p>
            </div>
        </div>
    );
}

export default BackupRestore;