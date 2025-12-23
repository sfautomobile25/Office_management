import React, { useEffect, useMemo, useState } from 'react';
import { cashApprovalAPI } from '../../services/api';

function getCurrentMonthYYYYMM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default function CashApproval() {
  const [activeTab, setActiveTab] = useState('pending'); // pending | approved | cancelled
  const [month, setMonth] = useState(getCurrentMonthYYYYMM());

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
const [message, setMessage] = useState({ type: '', text: '' });

  const title = useMemo(() => {
    if (activeTab === 'pending') return 'Pending Transactions';
    if (activeTab === 'approved') return 'Monthly Approved Transactions';
    return 'Monthly Cancelled Transactions';
  }, [activeTab]);

const load = async (tab = activeTab, monthValue = month, { preserveMessage = false } = {}) => {
  setLoading(true);
  if (!preserveMessage) setMessage({ type: '', text: '' });
    try {
      let res;
      if (tab === 'pending') {
        res = await cashApprovalAPI.getPending();
      } else {
        res = await cashApprovalAPI.getMonthlyByStatus(tab, monthValue);
      }
      setTransactions(res.data.transactions || []);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to load transactions' });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'pending') load(activeTab, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

const approve = async (id) => {
  // 1) approve (main action)
  try {
    const res = await cashApprovalAPI.approve(id);

    // remove instantly
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // show success right away (do NOT wait for refresh)
    setMessage({ type: 'success', text: res.data?.message || 'Transaction approved' });
  } catch (e) {
    setMessage({ type: 'error', text: e.response?.data?.error || 'Approval failed' });
    return; // stop here
  }

  // 2) refresh (secondary action)
  try {
    await load('pending', month, { preserveMessage: true });
  } catch (e) {
    // keep success message; optionally show a small warning message if you want
    // setMessage({ type: 'success', text: 'Approved ✅ (Refresh failed, please click Refresh)' });
  }
};



const reject = async (id) => {
  const reason = prompt('Reject reason (optional):') || '';

  // 1) reject (main action)
  try {
    const res = await cashApprovalAPI.reject(id, reason);

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setMessage({ type: 'success', text: res.data?.message || 'Transaction rejected' });
  } catch (e) {
    setMessage({ type: 'error', text: e.response?.data?.error || 'Rejection failed' });
    return;
  }

  // 2) refresh (secondary action)
  try {
    await load('pending', month, { preserveMessage: true });
  } catch (e) {}
};




  return (
    <div className="cash-approval-page">
      <div className="page-header">
        <div>
          <h2>Cash Approval</h2>
          <div className="muted">{title}</div>
        </div>

        <button className="btn-secondary" onClick={() => load()} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="cash-approval-controls">
        <div className="tab-row">
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </button>
          <button
            className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved (Monthly)
          </button>
          <button
            className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled (Monthly)
          </button>
        </div>

        {activeTab !== 'pending' && (
          <div className="month-filter">
            <label>Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        )}
      </div>

      {message.text && (
        <div className={`message ${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
        </div>
        )}


      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner-large"></div>
          <div className="loading-text">Loading...</div>
        </div>
      ) : (
        <>
          {/* Desktop / Tablet table */}
          <div className="table-container responsive-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Created By</th>
                  <th>Status</th>
                  {activeTab === 'pending' && <th style={{ width: 220 }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'pending' ? 7 : 6} style={{ textAlign: 'center', padding: 20 }}>
                      No transactions found ✅
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>{t.transaction_type}</td>
                      <td>{Number(t.amount).toFixed(2)}</td>
                      <td>{t.description}</td>
                      <td>{t.created_by_name || t.created_by}</td>
                      <td>
                        <span className={`status-pill ${t.status}`}>{t.status}</span>
                      </td>
                      {activeTab === 'pending' && (
                        <td>
                          <button className="btn-primary" onClick={() => approve(t.id)}>
                            Approve
                          </button>{' '}
                          <button className="btn-danger" onClick={() => reject(t.id)}>
                            Reject
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-cards">
            {transactions.map((t) => (
              <div className="mobile-card" key={`m-${t.id}`}>
                <div className="mobile-card-row">
                  <div className="mobile-card-title">{t.description}</div>
                  <span className={`status-pill ${t.status}`}>{t.status}</span>
                </div>

                <div className="mobile-card-grid">
                  <div><span className="k">Date:</span> {t.date}</div>
                  <div><span className="k">Type:</span> {t.transaction_type}</div>
                  <div><span className="k">Amount:</span> {Number(t.amount).toFixed(2)}</div>
                  <div><span className="k">Created:</span> {t.created_by_name || t.created_by}</div>
                </div>

                {activeTab === 'pending' && (
                  <div className="mobile-card-actions">
                    <button className="btn-primary" onClick={() => approve(t.id)}>Approve</button>
                    <button className="btn-danger" onClick={() => reject(t.id)}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
