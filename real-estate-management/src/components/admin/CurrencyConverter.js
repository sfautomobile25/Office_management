import React, { useState, useEffect } from 'react';

function CurrencyConverter() {
    const [currencies, setCurrencies] = useState([
        { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.00, enabled: true, default: true },
        { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.85, enabled: true, default: false },
        { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.73, enabled: true, default: false },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 110.50, enabled: true, default: false },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.25, enabled: false, default: false },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.35, enabled: false, default: false }
    ]);

    const [fromCurrency, setFromCurrency] = useState('USD');
    const [toCurrency, setToCurrency] = useState('EUR');
    const [amount, setAmount] = useState(100);
    const [convertedAmount, setConvertedAmount] = useState(0);
    const [conversionRate, setConversionRate] = useState(0);
    const [autoUpdate, setAutoUpdate] = useState(true);
    const [lastUpdated, setLastUpdated] = useState('');
    const [loading, setLoading] = useState(false);
    const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', rate: 1 });

    useEffect(() => {
        updateConversion();
        setLastUpdated(new Date().toLocaleString());
        
        // Auto-update rates every 24 hours
        const interval = setInterval(() => {
            if (autoUpdate) {
                fetchLatestRates();
            }
        }, 24 * 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        updateConversion();
    }, [fromCurrency, toCurrency, amount]);

    const updateConversion = () => {
        const from = currencies.find(c => c.code === fromCurrency);
        const to = currencies.find(c => c.code === toCurrency);
        
        if (from && to) {
            const rate = to.rate / from.rate;
            setConversionRate(rate);
            setConvertedAmount(amount * rate);
        }
    };

    const fetchLatestRates = async () => {
        setLoading(true);
        try {
            // Mock API call - in real app, call external API
            setTimeout(() => {
                const updatedCurrencies = currencies.map(currency => {
                    // Simulate small rate changes
                    const change = (Math.random() - 0.5) * 0.05; // ±5%
                    return {
                        ...currency,
                        rate: currency.code === 'USD' ? 1 : currency.rate * (1 + change)
                    };
                });
                
                setCurrencies(updatedCurrencies);
                setLastUpdated(new Date().toLocaleString());
                updateConversion();
                alert('Currency rates updated successfully!');
                setLoading(false);
            }, 1500);
        } catch (error) {
            alert('Failed to update currency rates');
            setLoading(false);
        }
    };

    const addCurrency = () => {
        if (!newCurrency.code || !newCurrency.name) {
            alert('Please enter currency code and name');
            return;
        }

        const currencyExists = currencies.some(c => c.code === newCurrency.code.toUpperCase());
        if (currencyExists) {
            alert('Currency already exists');
            return;
        }

        const newCurr = {
            code: newCurrency.code.toUpperCase(),
            name: newCurrency.name,
            symbol: newCurrency.symbol || newCurrency.code.toUpperCase(),
            rate: parseFloat(newCurrency.rate) || 1,
            enabled: true,
            default: false
        };

        setCurrencies([...currencies, newCurr]);
        setNewCurrency({ code: '', name: '', symbol: '', rate: 1 });
        alert(`Currency ${newCurrency.code} added successfully`);
    };

    const deleteCurrency = (code) => {
        if (currencies.find(c => c.code === code)?.default) {
            alert('Cannot delete the default currency');
            return;
        }

        if (window.confirm(`Delete currency ${code}?`)) {
            setCurrencies(currencies.filter(c => c.code !== code));
            if (fromCurrency === code) setFromCurrency('USD');
            if (toCurrency === code) setToCurrency('EUR');
        }
    };

    const toggleCurrency = (code) => {
        setCurrencies(currencies.map(currency => 
            currency.code === code ? { ...currency, enabled: !currency.enabled } : currency
        ));
    };

    const setDefaultCurrency = (code) => {
        setCurrencies(currencies.map(currency => ({
            ...currency,
            default: currency.code === code
        })));
        alert(`${getCurrencyName(code)} set as default currency`);
    };

    const getCurrencyName = (code) => {
        const currency = currencies.find(c => c.code === code);
        return currency ? currency.name : code;
    };

    const swapCurrencies = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const formatCurrency = (amount, currencyCode) => {
        const currency = currencies.find(c => c.code === currencyCode);
        if (!currency) return amount.toFixed(2);
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const updateCurrencyRate = (code, newRate) => {
        setCurrencies(currencies.map(currency => 
            currency.code === code ? { ...currency, rate: parseFloat(newRate) || 1 } : currency
        ));
        updateConversion();
    };

    const exportRates = () => {
        const data = {
            base_currency: 'USD',
            rates: currencies.reduce((obj, curr) => {
                obj[curr.code] = curr.rate;
                return obj;
            }, {}),
            last_updated: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `currency-rates-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const importRates = () => {
        alert('Currency rates import feature would open file dialog');
        // In real app: handle file upload and parsing
    };

    return (
        <div className="currency-converter">
            <div className="page-header">
                <h2>Currency Converter</h2>
                <div className="header-actions">
                    <button 
                        className="btn-primary" 
                        onClick={fetchLatestRates}
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : 'Update Rates'}
                    </button>
                    <button className="btn-secondary" onClick={exportRates}>
                        Export Rates
                    </button>
                    <button className="btn-secondary" onClick={importRates}>
                        Import Rates
                    </button>
                </div>
            </div>

            <div className="converter-sections">
                <div className="section converter-tool">
                    <h3>Currency Converter</h3>
                    <div className="converter-form">
                        <div className="converter-inputs">
                            <div className="input-group">
                                <label>From</label>
                                <div className="currency-selector">
                                    <select 
                                        value={fromCurrency}
                                        onChange={(e) => setFromCurrency(e.target.value)}
                                    >
                                        {currencies.filter(c => c.enabled).map(currency => (
                                            <option key={currency.code} value={currency.code}>
                                                {currency.code} - {currency.name}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="swap-button">
                                <button onClick={swapCurrencies} title="Swap currencies">
                                    ⇄
                                </button>
                            </div>

                            <div className="input-group">
                                <label>To</label>
                                <div className="currency-selector">
                                    <select 
                                        value={toCurrency}
                                        onChange={(e) => setToCurrency(e.target.value)}
                                    >
                                        {currencies.filter(c => c.enabled).map(currency => (
                                            <option key={currency.code} value={currency.code}>
                                                {currency.code} - {currency.name}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={formatCurrency(convertedAmount, toCurrency)}
                                        readOnly
                                        className="result-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="conversion-info">
                            <div className="rate-info">
                                <strong>Exchange Rate:</strong> 1 {fromCurrency} = {conversionRate.toFixed(6)} {toCurrency}
                            </div>
                            <div className="inverse-rate">
                                <strong>Inverse Rate:</strong> 1 {toCurrency} = {(1 / conversionRate).toFixed(6)} {fromCurrency}
                            </div>
                        </div>

                        <div className="converter-actions">
                            <button 
                                className="btn-primary"
                                onClick={() => {
                                    setAmount(convertedAmount);
                                    swapCurrencies();
                                }}
                            >
                                Swap and Convert
                            </button>
                            <button 
                                className="btn-secondary"
                                onClick={() => setAmount(100)}
                            >
                                Reset to 100
                            </button>
                        </div>
                    </div>

                    <div className="quick-conversions">
                        <h4>Quick Conversions</h4>
                        <div className="quick-buttons">
                            {[10, 50, 100, 500, 1000].map(value => (
                                <button
                                    key={value}
                                    className="btn-secondary"
                                    onClick={() => setAmount(value)}
                                >
                                    {value} {fromCurrency}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="section currency-list">
                    <h3>Supported Currencies</h3>
                    <div className="currencies-table">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Currency</th>
                                    <th>Symbol</th>
                                    <th>Rate (to USD)</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currencies.map(currency => (
                                    <tr key={currency.code}>
                                        <td>
                                            <strong>{currency.code}</strong>
                                            {currency.default && <span className="default-tag">Default</span>}
                                        </td>
                                        <td>{currency.name}</td>
                                        <td>{currency.symbol}</td>
                                        <td>
                                            {currency.code === 'USD' ? (
                                                <span>1.000000</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    value={currency.rate.toFixed(6)}
                                                    onChange={(e) => updateCurrencyRate(currency.code, e.target.value)}
                                                    step="0.000001"
                                                    min="0"
                                                    className="rate-input"
                                                />
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${currency.enabled ? 'enabled' : 'disabled'}`}>
                                                {currency.enabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                className="btn-sm btn-secondary"
                                                onClick={() => toggleCurrency(currency.code)}
                                            >
                                                {currency.enabled ? 'Disable' : 'Enable'}
                                            </button>
                                            {!currency.default && (
                                                <button 
                                                    className="btn-sm btn-primary"
                                                    onClick={() => setDefaultCurrency(currency.code)}
                                                >
                                                    Set Default
                                                </button>
                                            )}
                                            {!currency.default && (
                                                <button 
                                                    className="btn-sm btn-danger"
                                                    onClick={() => deleteCurrency(currency.code)}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="add-currency-form">
                        <h4>Add New Currency</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Currency Code (ISO 4217)</label>
                                <input
                                    type="text"
                                    value={newCurrency.code}
                                    onChange={(e) => setNewCurrency({...newCurrency, code: e.target.value})}
                                    placeholder="EUR, GBP, JPY"
                                    maxLength="3"
                                />
                            </div>
                            <div className="form-group">
                                <label>Currency Name</label>
                                <input
                                    type="text"
                                    value={newCurrency.name}
                                    onChange={(e) => setNewCurrency({...newCurrency, name: e.target.value})}
                                    placeholder="Euro, Pound, Yen"
                                />
                            </div>
                            <div className="form-group">
                                <label>Currency Symbol</label>
                                <input
                                    type="text"
                                    value={newCurrency.symbol}
                                    onChange={(e) => setNewCurrency({...newCurrency, symbol: e.target.value})}
                                    placeholder="€, £, ¥"
                                />
                            </div>
                            <div className="form-group">
                                <label>Exchange Rate (to USD)</label>
                                <input
                                    type="number"
                                    value={newCurrency.rate}
                                    onChange={(e) => setNewCurrency({...newCurrency, rate: e.target.value})}
                                    step="0.000001"
                                    min="0"
                                    placeholder="0.85"
                                />
                            </div>
                        </div>
                        <button className="btn-primary" onClick={addCurrency}>
                            Add Currency
                        </button>
                    </div>
                </div>
            </div>

            <div className="currency-settings">
                <h3>Currency Settings</h3>
                <div className="settings-form">
                    <div className="form-group">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={autoUpdate}
                                onChange={(e) => setAutoUpdate(e.target.checked)}
                            />
                            Auto-update currency rates daily
                        </label>
                    </div>
                    <div className="form-group">
                        <label>Rate Update Source</label>
                        <select defaultValue="ecb">
                            <option value="ecb">European Central Bank</option>
                            <option value="openexchangerates">Open Exchange Rates</option>
                            <option value="fixer">Fixer.io</option>
                            <option value="manual">Manual Entry</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Default Display Format</label>
                        <select defaultValue="symbol">
                            <option value="symbol">Symbol ($100.00)</option>
                            <option value="code">Code (100.00 USD)</option>
                            <option value="name">Name (100.00 US Dollars)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Rounding Method</label>
                        <select defaultValue="standard">
                            <option value="standard">Standard (2 decimals)</option>
                            <option value="no">No rounding</option>
                            <option value="up">Always round up</option>
                            <option value="down">Always round down</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Last Updated</label>
                        <input
                            type="text"
                            value={lastUpdated}
                            readOnly
                            className="readonly-input"
                        />
                    </div>
                    <button className="btn-primary">Save Settings</button>
                </div>
            </div>

            <div className="currency-info">
                <h4>Currency Information</h4>
                <div className="info-grid">
                    <div className="info-item">
                        <strong>Total Currencies:</strong> {currencies.length}
                    </div>
                    <div className="info-item">
                        <strong>Enabled Currencies:</strong> {currencies.filter(c => c.enabled).length}
                    </div>
                    <div className="info-item">
                        <strong>Default Currency:</strong> {currencies.find(c => c.default)?.code || 'USD'}
                    </div>
                    <div className="info-item">
                        <strong>Next Auto-update:</strong> Tomorrow 00:00
                    </div>
                </div>
                <p className="note">
                    Note: Exchange rates are for reference only. Real-time rates may vary.
                </p>
            </div>
        </div>
    );
}

export default CurrencyConverter;