import React, { useEffect, useMemo, useState } from 'react';
import { accountsAPI } from '../../services/api';

const formatBDT = (v) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(Number(v || 0));
const pad2 = (n) => String(n).padStart(2, '0');

export default function ProfitLoss() {
  const now = new Date();
  const [period, setPeriod] = useState('monthly'); // monthly|quarterly|yearly|custom
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(1);
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`);
  const [endDate, setEndDate] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())}`);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const params = useMemo(() => {
    if (period === 'custom') return { period: 'custom', start_date: startDate, end_date: endDate };
    if (period === 'monthly') return { period: 'monthly', year, month };
    if (period === 'quarterly') return { period: 'quarterly', year, quarter };
    return { period: 'yearly', year };
  }, [period, year, month, quarter, startDate, endDate]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await accountsAPI.getPnL(params);
      if (res.data?.success) setData(res.data);
      else setError(res.data?.error || 'Failed to load P&L');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load P&L');
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await accountsAPI.downloadPnL(params);
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'profit-loss.xlsx';
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

  useEffect(() => { load(); /* auto */ }, [params]); // eslint-disable-line

  return (
    <div className="accounts-management">
      <div className="page-header">
        <h2>Profit & Loss</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
          <button className="btn-primary" onClick={download} disabled={loading}>Download Excel</button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="ledger-export-controls">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>

          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 110 }} />

          {period === 'monthly' && (
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{pad2(m)}</option>)}
            </select>
          )}

          {period === 'quarterly' && (
            <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
              <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
            </select>
          )}

          {period === 'custom' && (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {data && (
        <>
          <div className="card" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div><b>Total Revenue:</b> {formatBDT(data.totals.revenue)}</div>
              <div><b>Total Expense:</b> {formatBDT(data.totals.expense)}</div>
              <div><b>Net Profit:</b> {formatBDT(data.totals.net_profit)}</div>
            </div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>
              Period: <b>{data.start_date}</b> → <b>{data.end_date}</b>
            </div>
          </div>

          <div className="table-container" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr><th colSpan="3">Revenue</th></tr>
                <tr><th>Account</th><th>Name</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {(data.revenue || []).map((r, i) => (
                  <tr key={`rev-${i}`}>
                    <td>{r.account_number}</td>
                    <td>{r.account_name}</td>
                    <td>{formatBDT(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-container" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr><th colSpan="3">Expenses</th></tr>
                <tr><th>Account</th><th>Name</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {(data.expenses || []).map((r, i) => (
                  <tr key={`exp-${i}`}>
                    <td>{r.account_number}</td>
                    <td>{r.account_name}</td>
                    <td>{formatBDT(r.amount)}</td>
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
