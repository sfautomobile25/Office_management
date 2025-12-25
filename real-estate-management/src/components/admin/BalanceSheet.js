import React, { useEffect, useState } from 'react';
import { accountsAPI } from '../../services/api';

const formatBDT = (v) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(Number(v || 0));

const getDhakaTodayISO = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
};

export default function BalanceSheet() {
  const [asOf, setAsOf] = useState(getDhakaTodayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await accountsAPI.getBalanceSheet({ as_of: asOf });
      if (res.data?.success) setData(res.data);
      else setError(res.data?.error || 'Failed to load Balance Sheet');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load Balance Sheet');
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await accountsAPI.downloadBalanceSheet({ as_of: asOf });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance-sheet-${asOf}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.error || 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* auto */ }, [asOf]); // eslint-disable-line

  return (
    <div className="accounts-management">
      <div className="page-header">
        <h2>Balance Sheet</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
          <button className="btn-primary" onClick={download} disabled={loading}>Download Excel</button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label><b>As of</b></label>
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          <div style={{ opacity: 0.8 }}>Timezone: Asia/Dhaka • Currency: BDT</div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {data && (
        <>
          <div className="card" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div><b>Total Assets:</b> {formatBDT(data.totals.assets)}</div>
              <div><b>Total Liabilities:</b> {formatBDT(data.totals.liabilities)}</div>
              <div><b>Total Equity:</b> {formatBDT(data.totals.equity)}</div>
              <div><b>L + E:</b> {formatBDT(data.totals.liabilities_plus_equity)}</div>
            </div>
            <div style={{ marginTop: 6 }}>
              Status: <b>{data.totals.balanced ? 'BALANCED ✅' : 'NOT BALANCED ❌'}</b>
            </div>
          </div>

          <div className="table-container" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead><tr><th colSpan="3">Assets</th></tr><tr><th>Account</th><th>Name</th><th>Balance</th></tr></thead>
              <tbody>
                {(data.assets || []).map((r, i) => (
                  <tr key={`a-${i}`}>
                    <td>{r.account_number}</td>
                    <td>{r.account_name}</td>
                    <td>{formatBDT(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-container" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead><tr><th colSpan="3">Liabilities</th></tr><tr><th>Account</th><th>Name</th><th>Balance</th></tr></thead>
              <tbody>
                {(data.liabilities || []).map((r, i) => (
                  <tr key={`l-${i}`}>
                    <td>{r.account_number}</td>
                    <td>{r.account_name}</td>
                    <td>{formatBDT(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-container" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead><tr><th colSpan="3">Equity</th></tr><tr><th>Account</th><th>Name</th><th>Balance</th></tr></thead>
              <tbody>
                {(data.equity || []).map((r, i) => (
                  <tr key={`e-${i}`}>
                    <td>{r.account_number}</td>
                    <td>{r.account_name}</td>
                    <td>{formatBDT(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
