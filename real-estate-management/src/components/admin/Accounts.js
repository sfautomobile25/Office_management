import React, { useState, useEffect } from 'react';
import { accountsAPI, cashManagementAPI } from '../../services/api';

function Accounts() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    
    // New states for cash management
    const [cashPosition, setCashPosition] = useState(null);
    const [dailyTransactions, setDailyTransactions] = useState([]);
    const [dailySummary, setDailySummary] = useState([]);
    const [expenseAnalysis, setExpenseAnalysis] = useState(null);
    
    // Form states
    const [newCashTransaction, setNewCashTransaction] = useState({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        description: '',
        amount: '',
        transaction_type: 'receipt',
        category: '',
        payment_method: 'cash',
        reference_number: '',
        received_from: '',
        paid_to: '',
        notes: ''
    });
    
    const [dailyBalance, setDailyBalance] = useState({
        date: new Date().toISOString().split('T')[0],
        opening_balance: '',
        cash_received: '',
        cash_paid: ''
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'dashboard') {
                const [positionRes, summaryRes] = await Promise.all([
                    cashManagementAPI.getCashPosition(),
                    cashManagementAPI.getDailySummary({ limit: 7 })
                ]);
                
                if (positionRes.data.success) setCashPosition(positionRes.data.cashPosition);
                if (summaryRes.data.success) setDailySummary(summaryRes.data.summaries);
            }
            
            if (activeTab === 'daily-transactions') {
                const today = new Date().toISOString().split('T')[0];
                const transactionsRes = await cashManagementAPI.getCashTransactions({ date: today });
                if (transactionsRes.data.success) {
                    setDailyTransactions(transactionsRes.data.transactions);
                }
            }
            
            if (activeTab === 'expenses') {
                const analysisRes = await cashManagementAPI.getExpenseAnalysis({ period: 'month' });
                if (analysisRes.data.success) {
                    setExpenseAnalysis(analysisRes.data);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCashTransaction = async (e) => {
        e.preventDefault();
        try {
            const response = await cashManagementAPI.createCashTransaction(newCashTransaction);
            if (response.data.success) {
                alert('Cash transaction recorded!');
                setNewCashTransaction({
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                    description: '',
                    amount: '',
                    transaction_type: 'receipt',
                    category: '',
                    payment_method: 'cash',
                    reference_number: '',
                    received_from: '',
                    paid_to: '',
                    notes: ''
                });
                fetchData();
            }
        } catch (error) {
            console.error('Error recording transaction:', error);
            alert('Failed to record transaction');
        }
    };

    const updateDailyBalance = async () => {
        try {
            const response = await cashManagementAPI.updateDailyBalance(dailyBalance);
            if (response.data.success) {
                alert('Daily balance updated!');
                fetchData();
            }
        } catch (error) {
            console.error('Error updating balance:', error);
            alert('Failed to update balance');
        }
    };

    const generateDailyReport = async () => {
        try {
            const response = await cashManagementAPI.generateDailySummary({
                date: new Date().toISOString().split('T')[0]
            });
            if (response.data.success) {
                alert('Daily report generated!');
                fetchData();
            }
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report');
        }
    };

    const renderDashboard = () => {
        if (!cashPosition) return null;
        
        const { today, yesterday, dailyChange, weeklyFlow, monthlyFlow, todayTransactions } = cashPosition;
        
        return (
            <div className="accounts-dashboard">
                <div className="dashboard-header">
                    <h3>📊 Cash Flow Dashboard</h3>
                    <div className="dashboard-actions">
                        <button className="btn-primary" onClick={generateDailyReport}>
                            Generate Daily Report
                        </button>
                        <button className="btn-secondary" onClick={() => setActiveTab('daily-transactions')}>
                            Record Transaction
                        </button>
                    </div>
                </div>
                
                <div className="cash-position-cards">
                    <div className="cash-card primary">
                        <div className="card-header">
                            <h4>Today's Cash Balance</h4>
                            <span className="card-date">{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="card-body">
                            <div className="cash-amount">
                                ${today.closing_balance ? parseFloat(today.closing_balance).toFixed(2) : '0.00'}
                            </div>
                            <div className={`cash-change ${dailyChange >= 0 ? 'positive' : 'negative'}`}>
                                {dailyChange >= 0 ? '↗' : '↘'} ${Math.abs(dailyChange).toFixed(2)} 
                                <span> from yesterday</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="cash-card secondary">
                        <div className="card-header">
                            <h4>Today's Activity</h4>
                        </div>
                        <div className="card-body">
                            <div className="activity-stats">
                                <div className="activity-item">
                                    <span className="label">Transactions:</span>
                                    <span className="value">{todayTransactions.count}</span>
                                </div>
                                <div className="activity-item">
                                    <span className="label">Cash In:</span>
                                    <span className="value positive">${parseFloat(todayTransactions.receipts || 0).toFixed(2)}</span>
                                </div>
                                <div className="activity-item">
                                    <span className="label">Cash Out:</span>
                                    <span className="value negative">${parseFloat(todayTransactions.payments || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="cash-card info">
                        <div className="card-header">
                            <h4>Weekly Flow</h4>
                        </div>
                        <div className="card-body">
                            <div className="flow-stats">
                                <div className="flow-item">
                                    <span className="label">In:</span>
                                    <span className="value">${parseFloat(weeklyFlow.in || 0).toFixed(2)}</span>
                                </div>
                                <div className="flow-item">
                                    <span className="label">Out:</span>
                                    <span className="value">${parseFloat(weeklyFlow.out || 0).toFixed(2)}</span>
                                </div>
                                <div className="flow-item total">
                                    <span className="label">Net:</span>
                                    <span className={`value ${weeklyFlow.net >= 0 ? 'positive' : 'negative'}`}>
                                        ${parseFloat(weeklyFlow.net || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="dashboard-charts">
                    <div className="chart-section">
                        <h4>Daily Cash Flow (Last 7 Days)</h4>
                        <div className="cash-flow-chart">
                            {dailySummary.slice(0, 7).reverse().map((day, index) => (
                                <div key={index} className="chart-bar">
                                    <div className="bar-group">
                                        <div 
                                            className="bar in"
                                            style={{ height: `${(day.total_cash_in / Math.max(...dailySummary.map(d => d.total_cash_in))) * 80}%` }}
                                            title={`In: $${day.total_cash_in}`}
                                        ></div>
                                        <div 
                                            className="bar out"
                                            style={{ height: `${(day.total_cash_out / Math.max(...dailySummary.map(d => d.total_cash_out))) * 80}%` }}
                                            title={`Out: $${day.total_cash_out}`}
                                        ></div>
                                    </div>
                                    <div className="chart-label">
                                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="chart-legend">
                            <div className="legend-item">
                                <span className="color in"></span>
                                <span>Cash In</span>
                            </div>
                            <div className="legend-item">
                                <span className="color out"></span>
                                <span>Cash Out</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="chart-section">
                        <h4>Quick Actions</h4>
                        <div className="quick-actions-grid">
                            <button 
                                className="quick-action"
                                onClick={() => {
                                    setActiveTab('daily-transactions');
                                    setNewCashTransaction(prev => ({
                                        ...prev,
                                        transaction_type: 'receipt'
                                    }));
                                }}
                            >
                                <span className="icon">💰</span>
                                <span className="label">Record Receipt</span>
                            </button>
                            <button 
                                className="quick-action"
                                onClick={() => {
                                    setActiveTab('daily-transactions');
                                    setNewCashTransaction(prev => ({
                                        ...prev,
                                        transaction_type: 'payment'
                                    }));
                                }}
                            >
                                <span className="icon">💸</span>
                                <span className="label">Record Payment</span>
                            </button>
                            <button 
                                className="quick-action"
                                onClick={() => setActiveTab('balance-sheet')}
                            >
                                <span className="icon">📋</span>
                                <span className="label">Update Balance</span>
                            </button>
                            <button 
                                className="quick-action"
                                onClick={() => setActiveTab('reports')}
                            >
                                <span className="icon">📈</span>
                                <span className="label">View Reports</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="recent-transactions">
                    <h4>Recent Transactions</h4>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Description</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyTransactions.slice(0, 5).map(transaction => (
                                    <tr key={transaction.id}>
                                        <td>{transaction.time}</td>
                                        <td>{transaction.description}</td>
                                        <td>
                                            <span className={`transaction-type ${transaction.transaction_type}`}>
                                                {transaction.transaction_type}
                                            </span>
                                        </td>
                                        <td>${parseFloat(transaction.amount).toFixed(2)}</td>
                                        <td>
                                            <span className={`status-badge ${transaction.status}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderDailyTransactions = () => (
        <div className="daily-transactions-tab">
            <div className="page-header">
                <h3>💵 Daily Cash Transactions</h3>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={fetchData}>
                        Refresh
                    </button>
                </div>
            </div>
            
            <div className="transactions-layout">
                <div className="transaction-form-section">
                    <h4>Record New Transaction</h4>
                    <form onSubmit={handleCashTransaction} className="transaction-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Date *</label>
                                <input
                                    type="date"
                                    value={newCashTransaction.date}
                                    onChange={(e) => setNewCashTransaction({
                                        ...newCashTransaction,
                                        date: e.target.value
                                    })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Time *</label>
                                <input
                                    type="time"
                                    value={newCashTransaction.time}
                                    onChange={(e) => setNewCashTransaction({
                                        ...newCashTransaction,
                                        time: e.target.value
                                    })}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Description *</label>
                            <input
                                type="text"
                                value={newCashTransaction.description}
                                onChange={(e) => setNewCashTransaction({
                                    ...newCashTransaction,
                                    description: e.target.value
                                })}
                                placeholder="Enter transaction description"
                                required
                            />
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Amount *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newCashTransaction.amount}
                                    onChange={(e) => setNewCashTransaction({
                                        ...newCashTransaction,
                                        amount: e.target.value
                                    })}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Transaction Type *</label>
                                <select
                                    value={newCashTransaction.transaction_type}
                                    onChange={(e) => setNewCashTransaction({
                                        ...newCashTransaction,
                                        transaction_type: e.target.value
                                    })}
                                    required
                                >
                                    <option value="receipt">Receipt (Cash In)</option>
                                    <option value="payment">Payment (Cash Out)</option>
                                    <option value="transfer">Transfer</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Category *</label>
                                <select
                                    value={newCashTransaction.category}
                                    onChange={(e) => setNewCashTransaction({
                                        ...newCashTransaction,
                                        category: e.target.value
                                    })}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    <option value="Sales">Sales</option>
                                    <option value="Rent">Rent</option>
                                    <option value="Salary">Salary</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Supplies">Office Supplies</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Payment Method *</label>
                                <select
                                    value={newCashTransaction.payment_method}
                                    onChange={(e) => setNewCashTransaction({
                                        ...newCashTransaction,
                                        payment_method: e.target.value
                                    })}
                                    required
                                >
                                    <option value="cash">Cash</option>
                                    <option value="check">Check</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="card">Card</option>
                                </select>
                            </div>
                        </div>
                        
                        {newCashTransaction.transaction_type === 'receipt' && (
                            <div className="form-group">
                                <label>Received From</label>
                                <input
                                    type="text"
                                    value={newCashTransaction.received_from}
                                    onChange={(e) => setNewCashTransaction({
                                        ...newCashTransaction,
                                        received_from: e.target.value
                                    })}
                                    placeholder="Name of payer"
                                />
                            </div>
                        )}
                        
                        {newCashTransaction.transaction_type === 'payment' && (
                            <div className="form-group">
                                <label>Paid To</label>
                                <input
                                    type="text"
                                    value={newCashTransaction.paid_to}
                                    onChange={(e) => setNewCashTransaction({
                                        ...newCashTransaction,
                                        paid_to: e.target.value
                                    })}
                                    placeholder="Name of payee"
                                />
                            </div>
                        )}
                        
                        <div className="form-group">
                            <label>Reference Number</label>
                            <input
                                type="text"
                                value={newCashTransaction.reference_number}
                                onChange={(e) => setNewCashTransaction({
                                    ...newCashTransaction,
                                    reference_number: e.target.value
                                })}
                                placeholder="Receipt/Check number"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea
                                value={newCashTransaction.notes}
                                onChange={(e) => setNewCashTransaction({
                                    ...newCashTransaction,
                                    notes: e.target.value
                                })}
                                placeholder="Additional notes"
                                rows="3"
                            />
                        </div>
                        
                        <button type="submit" className="btn-primary">
                            Record Transaction
                        </button>
                    </form>
                </div>
                
                <div className="transactions-list-section">
                    <h4>Today's Transactions</h4>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Description</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyTransactions.map(transaction => (
                                    <tr key={transaction.id}>
                                        <td>{transaction.time}</td>
                                        <td>
                                            <div className="transaction-description">
                                                {transaction.description}
                                                {transaction.reference_number && (
                                                    <div className="text-muted">
                                                        Ref: {transaction.reference_number}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`transaction-type ${transaction.transaction_type}`}>
                                                {transaction.transaction_type}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`amount ${transaction.transaction_type === 'receipt' ? 'positive' : 'negative'}`}>
                                                {transaction.transaction_type === 'receipt' ? '+' : '-'}
                                                ${parseFloat(transaction.amount).toFixed(2)}
                                            </span>
                                        </td>
                                        <td>{transaction.category}</td>
                                        <td>
                                            <span className={`status-badge ${transaction.status}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {dailyTransactions.length === 0 && (
                        <div className="empty-state">
                            <p>No transactions recorded today.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderBalanceSheet = () => (
        <div className="balance-sheet-tab">
            <div className="page-header">
                <h3>📋 Daily Balance Sheet</h3>
            </div>
            
            <div className="balance-sheet-form">
                <div className="form-card">
                    <h4>Update Daily Cash Balance</h4>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Date *</label>
                            <input
                                type="date"
                                value={dailyBalance.date}
                                onChange={(e) => setDailyBalance({
                                    ...dailyBalance,
                                    date: e.target.value
                                })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Opening Balance *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={dailyBalance.opening_balance}
                                onChange={(e) => setDailyBalance({
                                    ...dailyBalance,
                                    opening_balance: e.target.value
                                })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>Cash Received Today</label>
                            <input
                                type="number"
                                step="0.01"
                                value={dailyBalance.cash_received}
                                onChange={(e) => setDailyBalance({
                                    ...dailyBalance,
                                    cash_received: e.target.value
                                })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="form-group">
                            <label>Cash Paid Today</label>
                            <input
                                type="number"
                                step="0.01"
                                value={dailyBalance.cash_paid}
                                onChange={(e) => setDailyBalance({
                                    ...dailyBalance,
                                    cash_paid: e.target.value
                                })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    
                    <div className="balance-preview">
                        <h5>Balance Preview:</h5>
                        <div className="preview-item">
                            <span>Opening Balance:</span>
                            <span>${parseFloat(dailyBalance.opening_balance || 0).toFixed(2)}</span>
                        </div>
                        <div className="preview-item">
                            <span>Add: Cash Received:</span>
                            <span className="positive">+${parseFloat(dailyBalance.cash_received || 0).toFixed(2)}</span>
                        </div>
                        <div className="preview-item">
                            <span>Less: Cash Paid:</span>
                            <span className="negative">-${parseFloat(dailyBalance.cash_paid || 0).toFixed(2)}</span>
                        </div>
                        <div className="preview-item total">
                            <span>Closing Balance:</span>
                            <span className="total-amount">
                                ${(parseFloat(dailyBalance.opening_balance || 0) + 
                                   parseFloat(dailyBalance.cash_received || 0) - 
                                   parseFloat(dailyBalance.cash_paid || 0)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    
                    <button onClick={updateDailyBalance} className="btn-primary">
                        Update Balance
                    </button>
                </div>
                
                <div className="recent-balances">
                    <h4>Recent Daily Balances</h4>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Opening</th>
                                    <th>Received</th>
                                    <th>Paid</th>
                                    <th>Closing</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* You would fetch and display recent balances here */}
                                <tr>
                                    <td colSpan="5" className="text-center">
                                        <button className="btn-secondary">
                                            Load Recent Balances
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderExpenseAnalysis = () => {
        if (!expenseAnalysis) return null;
        
        return (
            <div className="expense-analysis-tab">
                <div className="page-header">
                    <h3>📊 Expense Analysis</h3>
                    <div className="period-selector">
                        <select onChange={(e) => {
                            // Fetch data for selected period
                        }}>
                            <option value="month">This Month</option>
                            <option value="week">This Week</option>
                            <option value="year">This Year</option>
                        </select>
                    </div>
                </div>
                
                <div className="expense-overview">
                    <div className="overview-card">
                        <h4>Budget vs Actual</h4>
                        <div className="overview-stats">
                            <div className="stat-item">
                                <span className="label">Budget:</span>
                                <span className="value">${parseFloat(expenseAnalysis.totals.budget).toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                                <span className="label">Actual Spent:</span>
                                <span className="value">${parseFloat(expenseAnalysis.totals.spent).toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                                <span className="label">Variance:</span>
                                <span className={`value ${expenseAnalysis.variance >= 0 ? 'positive' : 'negative'}`}>
                                    ${Math.abs(expenseAnalysis.variance).toFixed(2)} 
                                    {expenseAnalysis.variance >= 0 ? ' under' : ' over'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="expense-breakdown">
                    <h4>Expense Breakdown by Category</h4>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Budget</th>
                                    <th>Actual</th>
                                    <th>Variance</th>
                                    <th>% of Total</th>
                                    <th>Transactions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenseAnalysis.expenses.map((expense, index) => {
                                    const variance = parseFloat(expense.budget_amount) - parseFloat(expense.actual_spent);
                                    const percent = (parseFloat(expense.actual_spent) / expenseAnalysis.totals.spent) * 100;
                                    
                                    return (
                                        <tr key={index}>
                                            <td>{expense.category_name}</td>
                                            <td>${parseFloat(expense.budget_amount).toFixed(2)}</td>
                                            <td>${parseFloat(expense.actual_spent).toFixed(2)}</td>
                                            <td>
                                                <span className={`variance ${variance >= 0 ? 'positive' : 'negative'}`}>
                                                    ${Math.abs(variance).toFixed(2)}
                                                    {variance >= 0 ? ' under' : ' over'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="percentage-bar">
                                                    <div 
                                                        className="bar-fill"
                                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                                    />
                                                    <span>{percent.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td>{expense.transaction_count}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="accounts-management">
            <div className="page-header">
                <h2>💰 Accounts & Cash Management</h2>
                <div className="accounts-quick-actions">
                    <button 
                        className="btn-primary"
                        onClick={() => setActiveTab('daily-transactions')}
                    >
                        + Quick Transaction
                    </button>
                    <button 
                        className="btn-secondary"
                        onClick={generateDailyReport}
                    >
                        📋 Daily Report
                    </button>
                </div>
            </div>

            <div className="accounts-tabs">
                <button 
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    📊 Dashboard
                </button>
                <button 
                    className={`tab ${activeTab === 'daily-transactions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('daily-transactions')}
                >
                    💵 Daily Transactions
                </button>
                <button 
                    className={`tab ${activeTab === 'balance-sheet' ? 'active' : ''}`}
                    onClick={() => setActiveTab('balance-sheet')}
                >
                    📋 Balance Sheet
                </button>
                <button 
                    className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('expenses')}
                >
                    📊 Expense Analysis
                </button>
                <button 
                    className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                >
                    📈 Reports
                </button>
                <button 
                    className={`tab ${activeTab === 'accounts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accounts')}
                >
                    🏦 Chart of Accounts
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading accounts data...</div>
            ) : (
                <>
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'daily-transactions' && renderDailyTransactions()}
                    {activeTab === 'balance-sheet' && renderBalanceSheet()}
                    {activeTab === 'expenses' && renderExpenseAnalysis()}
                    {/* Add other tab renderings as needed */}
                </>
            )}
        </div>
    );
}

export default Accounts;