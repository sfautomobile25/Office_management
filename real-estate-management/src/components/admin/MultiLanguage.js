import React, { useState, useEffect } from 'react';

function MultiLanguage() {
    const [languages, setLanguages] = useState([
        { code: 'en', name: 'English', native: 'English', enabled: true, default: true },
        { code: 'es', name: 'Spanish', native: 'Español', enabled: true, default: false },
        { code: 'fr', name: 'French', native: 'Français', enabled: true, default: false },
        { code: 'de', name: 'German', native: 'Deutsch', enabled: false, default: false },
        { code: 'zh', name: 'Chinese', native: '中文', enabled: false, default: false },
        { code: 'ar', name: 'Arabic', native: 'العربية', enabled: false, default: false }
    ]);

    const [translations, setTranslations] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [editingKey, setEditingKey] = useState(null);
    const [newTranslation, setNewTranslation] = useState('');
    const [loading, setLoading] = useState(false);
    const [newLanguage, setNewLanguage] = useState({ code: '', name: '', native: '' });

    // Mock translation data
    const mockTranslations = {
        en: [
            { key: 'welcome', text: 'Welcome to Real Estate Management', context: 'Home page greeting' },
            { key: 'dashboard', text: 'Dashboard', context: 'Navigation item' },
            { key: 'properties', text: 'Properties', context: 'Navigation item' },
            { key: 'contact', text: 'Contact Us', context: 'Navigation item' },
            { key: 'login', text: 'Login', context: 'Button text' },
            { key: 'logout', text: 'Logout', context: 'Button text' },
            { key: 'search', text: 'Search Properties', context: 'Search placeholder' },
            { key: 'footer', text: '© 2023 Real Estate Management', context: 'Footer text' }
        ],
        es: [
            { key: 'welcome', text: 'Bienvenido a Gestión Inmobiliaria', context: 'Home page greeting' },
            { key: 'dashboard', text: 'Panel de control', context: 'Navigation item' },
            { key: 'properties', text: 'Propiedades', context: 'Navigation item' },
            { key: 'contact', text: 'Contáctenos', context: 'Navigation item' },
            { key: 'login', text: 'Iniciar sesión', context: 'Button text' },
            { key: 'logout', text: 'Cerrar sesión', context: 'Button text' },
            { key: 'search', text: 'Buscar propiedades', context: 'Search placeholder' },
            { key: 'footer', text: '© 2023 Gestión Inmobiliaria', context: 'Footer text' }
        ],
        fr: [
            { key: 'welcome', text: 'Bienvenue dans Gestion Immobilière', context: 'Home page greeting' },
            { key: 'dashboard', text: 'Tableau de bord', context: 'Navigation item' },
            { key: 'properties', text: 'Propriétés', context: 'Navigation item' },
            { key: 'contact', text: 'Contactez-nous', context: 'Navigation item' },
            { key: 'login', text: 'Connexion', context: 'Button text' },
            { key: 'logout', text: 'Déconnexion', context: 'Button text' },
            { key: 'search', text: 'Rechercher des propriétés', context: 'Search placeholder' },
            { key: 'footer', text: '© 2023 Gestion Immobilière', context: 'Footer text' }
        ]
    };

    useEffect(() => {
        loadTranslations(selectedLanguage);
    }, [selectedLanguage]);

    const loadTranslations = (langCode) => {
        setLoading(true);
        setTimeout(() => {
            setTranslations(mockTranslations[langCode] || []);
            setLoading(false);
        }, 500);
    };

    const toggleLanguage = (langCode) => {
        setLanguages(languages.map(lang => 
            lang.code === langCode ? { ...lang, enabled: !lang.enabled } : lang
        ));
    };

    const setDefaultLanguage = (langCode) => {
        setLanguages(languages.map(lang => ({
            ...lang,
            default: lang.code === langCode
        })));
        alert(`${getLanguageName(langCode)} set as default language`);
    };

    const getLanguageName = (code) => {
        const lang = languages.find(l => l.code === code);
        return lang ? lang.name : code;
    };

    const addNewLanguage = () => {
        if (!newLanguage.code || !newLanguage.name) {
            alert('Please enter language code and name');
            return;
        }

        const languageExists = languages.some(l => l.code === newLanguage.code.toLowerCase());
        if (languageExists) {
            alert('Language code already exists');
            return;
        }

        const newLang = {
            code: newLanguage.code.toLowerCase(),
            name: newLanguage.name,
            native: newLanguage.native || newLanguage.name,
            enabled: true,
            default: false
        };

        setLanguages([...languages, newLang]);
        
        // Initialize empty translations for new language
        if (!mockTranslations[newLang.code]) {
            mockTranslations[newLang.code] = [];
        }

        setNewLanguage({ code: '', name: '', native: '' });
        alert(`Language ${newLanguage.name} added successfully`);
    };

    const deleteLanguage = (langCode) => {
        if (languages.find(l => l.code === langCode)?.default) {
            alert('Cannot delete the default language');
            return;
        }

        if (window.confirm(`Delete language ${getLanguageName(langCode)}?`)) {
            setLanguages(languages.filter(l => l.code !== langCode));
            if (selectedLanguage === langCode) {
                setSelectedLanguage('en');
            }
        }
    };

    const updateTranslation = (key, newText) => {
        const updated = translations.map(t => 
            t.key === key ? { ...t, text: newText } : t
        );
        setTranslations(updated);
        
        // In real app, save to backend
        console.log(`Updated ${selectedLanguage}.${key}: ${newText}`);
    };

    const addTranslation = () => {
        const key = prompt('Enter translation key:');
        if (key && !translations.some(t => t.key === key)) {
            const newEntry = {
                key,
                text: '',
                context: prompt('Enter context (optional):') || ''
            };
            setTranslations([...translations, newEntry]);
            setEditingKey(key);
            setNewTranslation('');
        }
    };

    const exportTranslations = () => {
        const data = {
            language: selectedLanguage,
            translations: translations.reduce((obj, t) => {
                obj[t.key] = t.text;
                return obj;
            }, {})
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations-${selectedLanguage}.json`;
        a.click();
    };

    const importTranslations = () => {
        alert('Translation import feature would open file dialog');
        // In real app: handle file upload and parsing
    };

    const autoTranslate = () => {
        if (window.confirm('Auto-translate missing translations using Google Translate?')) {
            alert('Auto-translation started. This may take a few minutes.');
            // In real app: call translation API
        }
    };

    return (
        <div className="multi-language">
            <div className="page-header">
                <h2>Multi-language Support</h2>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={exportTranslations}>
                        Export Translations
                    </button>
                    <button className="btn-secondary" onClick={importTranslations}>
                        Import Translations
                    </button>
                    <button className="btn-primary" onClick={autoTranslate}>
                        Auto-translate
                    </button>
                </div>
            </div>

            <div className="language-sections">
                <div className="section languages-list">
                    <h3>Available Languages</h3>
                    <div className="languages-grid">
                        {languages.map(lang => (
                            <div key={lang.code} className={`language-card ${lang.default ? 'default' : ''}`}>
                                <div className="language-header">
                                    <div className="language-info">
                                        <div className="language-code">{lang.code.toUpperCase()}</div>
                                        <div className="language-name">{lang.name}</div>
                                        <div className="language-native">{lang.native}</div>
                                    </div>
                                    <div className="language-status">
                                        {lang.default && <span className="default-badge">Default</span>}
                                        <span className={`enabled-badge ${lang.enabled ? 'enabled' : 'disabled'}`}>
                                            {lang.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                                <div className="language-actions">
                                    <button 
                                        className={`btn-sm ${lang.enabled ? 'btn-secondary' : 'btn-primary'}`}
                                        onClick={() => toggleLanguage(lang.code)}
                                    >
                                        {lang.enabled ? 'Disable' : 'Enable'}
                                    </button>
                                    {!lang.default && (
                                        <button 
                                            className="btn-sm btn-primary"
                                            onClick={() => setDefaultLanguage(lang.code)}
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    {!lang.default && (
                                        <button 
                                            className="btn-sm btn-danger"
                                            onClick={() => deleteLanguage(lang.code)}
                                        >
                                            Delete
                                        </button>
                                    )}
                                    <button 
                                        className="btn-sm btn-secondary"
                                        onClick={() => setSelectedLanguage(lang.code)}
                                    >
                                        Translate
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="add-language-form">
                        <h4>Add New Language</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Language Code (ISO 639-1)</label>
                                <input
                                    type="text"
                                    value={newLanguage.code}
                                    onChange={(e) => setNewLanguage({...newLanguage, code: e.target.value})}
                                    placeholder="en, es, fr, etc."
                                    maxLength="2"
                                />
                            </div>
                            <div className="form-group">
                                <label>Language Name (English)</label>
                                <input
                                    type="text"
                                    value={newLanguage.name}
                                    onChange={(e) => setNewLanguage({...newLanguage, name: e.target.value})}
                                    placeholder="English, Spanish, French"
                                />
                            </div>
                            <div className="form-group">
                                <label>Native Name (Optional)</label>
                                <input
                                    type="text"
                                    value={newLanguage.native}
                                    onChange={(e) => setNewLanguage({...newLanguage, native: e.target.value})}
                                    placeholder="English, Español, Français"
                                />
                            </div>
                        </div>
                        <button className="btn-primary" onClick={addNewLanguage}>
                            Add Language
                        </button>
                    </div>
                </div>

                <div className="section translations-editor">
                    <div className="translations-header">
                        <h3>
                            Translations: {getLanguageName(selectedLanguage)}
                            {languages.find(l => l.code === selectedLanguage)?.default && ' (Default)'}
                        </h3>
                        <div className="translations-actions">
                            <button className="btn-secondary" onClick={addTranslation}>
                                + Add Translation
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading">Loading translations...</div>
                    ) : translations.length === 0 ? (
                        <div className="no-translations">
                            <p>No translations found for this language.</p>
                            <button className="btn-primary" onClick={addTranslation}>
                                Add First Translation
                            </button>
                        </div>
                    ) : (
                        <div className="translations-table">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Key</th>
                                        <th>Translation</th>
                                        <th>Context</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {translations.map(trans => (
                                        <tr key={trans.key}>
                                            <td>
                                                <code>{trans.key}</code>
                                            </td>
                                            <td>
                                                {editingKey === trans.key ? (
                                                    <div className="editing-cell">
                                                        <input
                                                            type="text"
                                                            value={newTranslation}
                                                            onChange={(e) => setNewTranslation(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button 
                                                            className="btn-sm btn-primary"
                                                            onClick={() => {
                                                                updateTranslation(trans.key, newTranslation);
                                                                setEditingKey(null);
                                                                setNewTranslation('');
                                                            }}
                                                        >
                                                            Save
                                                        </button>
                                                        <button 
                                                            className="btn-sm btn-secondary"
                                                            onClick={() => setEditingKey(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="translation-text">
                                                        {trans.text || <em className="empty">(empty)</em>}
                                                        {!trans.text && (
                                                            <span className="missing-badge">MISSING</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className="context">{trans.context}</span>
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn-sm btn-secondary"
                                                    onClick={() => {
                                                        setEditingKey(trans.key);
                                                        setNewTranslation(trans.text);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    className="btn-sm btn-danger"
                                                    onClick={() => {
                                                        if (window.confirm(`Delete translation key "${trans.key}"?`)) {
                                                            setTranslations(translations.filter(t => t.key !== trans.key));
                                                        }
                                                    }}
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

                    <div className="translation-stats">
                        <div className="stat-item">
                            <span className="stat-label">Total Keys:</span>
                            <span className="stat-value">{translations.length}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Translated:</span>
                            <span className="stat-value">
                                {translations.filter(t => t.text.trim()).length}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Missing:</span>
                            <span className="stat-value">
                                {translations.filter(t => !t.text.trim()).length}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Completion:</span>
                            <span className="stat-value">
                                {translations.length > 0 
                                    ? `${Math.round((translations.filter(t => t.text.trim()).length / translations.length) * 100)}%`
                                    : '0%'
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="language-settings">
                <h3>Language Settings</h3>
                <div className="settings-form">
                    <div className="form-group">
                        <label>Language Detection Method</label>
                        <select defaultValue="browser">
                            <option value="browser">Browser Language</option>
                            <option value="ip">IP Address Location</option>
                            <option value="manual">Manual Selection</option>
                            <option value="cookie">Remember User Choice</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Default URL Structure</label>
                        <select defaultValue="subdirectory">
                            <option value="subdirectory">/en/page (Subdirectory)</option>
                            <option value="subdomain">en.example.com (Subdomain)</option>
                            <option value="parameter">example.com?lang=en (Parameter)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>
                            <input type="checkbox" defaultChecked />
                            Auto-redirect to browser language
                        </label>
                    </div>
                    <div className="form-group">
                        <label>
                            <input type="checkbox" defaultChecked />
                            Show language switcher in header
                        </label>
                    </div>
                    <div className="form-group">
                        <label>
                            <input type="checkbox" />
                            Enable RTL support
                        </label>
                    </div>
                    <button className="btn-primary">Save Language Settings</button>
                </div>
            </div>
        </div>
    );
}

export default MultiLanguage;