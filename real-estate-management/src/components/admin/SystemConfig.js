import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

function SystemConfig() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await adminAPI.getConfig();
            if (response.data.success) {
                setConfigs(response.data.config);
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (key, value) => {
        setConfigs(configs.map(config => 
            config.config_key === key ? { ...config, config_value: value } : config
        ));
    };

    const saveConfig = async () => {
        setSaving(true);
        setMessage('');
        
        try {
            // Save each config
            for (const config of configs) {
                await adminAPI.updateConfig(config.config_key, config.config_value);
            }
            
            setMessage('Configuration saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const configGroups = {
        general: ['site_name', 'site_url', 'default_language', 'default_currency'],
        features: ['maintenance_mode', 'registration_enabled', 'email_notifications'],
        security: ['session_timeout', 'max_login_attempts', 'password_min_length'],
        backup: ['backup_frequency', 'backup_retention_days', 'auto_backup'],
        email: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password']
    };

    const renderConfigInput = (config) => {
        const { config_key, config_value, description } = config;
        
        // Boolean values
        if (config_value === 'true' || config_value === 'false') {
            return (
                <div className="config-item">
                    <label>
                        <input
                            type="checkbox"
                            checked={config_value === 'true'}
                            onChange={(e) => handleConfigChange(config_key, e.target.checked.toString())}
                        />
                        {description}
                    </label>
                    <div className="config-key">{config_key}</div>
                </div>
            );
        }

        // Number values
        if (!isNaN(config_value) && config_value !== '') {
            return (
                <div className="config-item">
                    <label>{description}</label>
                    <input
                        type="number"
                        value={config_value}
                        onChange={(e) => handleConfigChange(config_key, e.target.value)}
                    />
                    <div className="config-key">{config_key}</div>
                </div>
            );
        }

        // Select for known options
        if (config_key === 'default_language') {
            return (
                <div className="config-item">
                    <label>{description}</label>
                    <select
                        value={config_value}
                        onChange={(e) => handleConfigChange(config_key, e.target.value)}
                    >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="zh">Chinese</option>
                    </select>
                    <div className="config-key">{config_key}</div>
                </div>
            );
        }

        if (config_key === 'default_currency') {
            return (
                <div className="config-item">
                    <label>{description}</label>
                    <select
                        value={config_value}
                        onChange={(e) => handleConfigChange(config_key, e.target.value)}
                    >
                        <option value="USD">US Dollar</option>
                        <option value="EUR">Euro</option>
                        <option value="GBP">British Pound</option>
                        <option value="JPY">Japanese Yen</option>
                        <option value="CAD">Canadian Dollar</option>
                    </select>
                    <div className="config-key">{config_key}</div>
                </div>
            );
        }

        if (config_key === 'backup_frequency') {
            return (
                <div className="config-item">
                    <label>{description}</label>
                    <select
                        value={config_value}
                        onChange={(e) => handleConfigChange(config_key, e.target.value)}
                    >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="never">Never</option>
                    </select>
                    <div className="config-key">{config_key}</div>
                </div>
            );
        }

        // Text input for everything else
        return (
            <div className="config-item">
                <label>{description}</label>
                <input
                    type="text"
                    value={config_value || ''}
                    onChange={(e) => handleConfigChange(config_key, e.target.value)}
                    placeholder={`Enter ${description.toLowerCase()}`}
                />
                <div className="config-key">{config_key}</div>
            </div>
        );
    };

    if (loading) {
        return <div className="loading">Loading configuration...</div>;
    }

    return (
        <div className="system-config">
            <div className="page-header">
                <h2>System Configuration</h2>
                <button 
                    className="btn-primary"
                    onClick={saveConfig}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            {message && (
                <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="config-tabs">
                <div className="tab active">General</div>
                <div className="tab">Features</div>
                <div className="tab">Security</div>
                <div className="tab">Backup</div>
                <div className="tab">Email</div>
            </div>

            <div className="config-sections">
                {Object.entries(configGroups).map(([groupName, configKeys]) => {
                    const groupConfigs = configs.filter(config => 
                        configKeys.includes(config.config_key)
                    );
                    
                    if (groupConfigs.length === 0) return null;

                    return (
                        <div key={groupName} className="config-section">
                            <h3>{groupName.charAt(0).toUpperCase() + groupName.slice(1)} Settings</h3>
                            <div className="config-grid">
                                {groupConfigs.map(config => (
                                    <div key={config.config_key} className="config-card">
                                        {renderConfigInput(config)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="config-actions">
                <button className="btn-secondary" onClick={() => window.location.reload()}>
                    Reset Changes
                </button>
                <button className="btn-secondary" onClick={() => {
                    // Add new config item
                    const key = prompt('Enter config key:');
                    const value = prompt('Enter config value:');
                    const desc = prompt('Enter description:');
                    
                    if (key && value) {
                        setConfigs([...configs, {
                            config_key: key,
                            config_value: value,
                            description: desc || key
                        }]);
                    }
                }}>
                    Add Custom Config
                </button>
            </div>

            <div className="config-info">
                <h4>Configuration Information</h4>
                <p>Total configuration items: {configs.length}</p>
                <p>Last loaded: {new Date().toLocaleString()}</p>
                <p className="note">
                    Note: Changes will take effect after saving. Some changes may require a system restart.
                </p>
            </div>
        </div>
    );
}

export default SystemConfig;