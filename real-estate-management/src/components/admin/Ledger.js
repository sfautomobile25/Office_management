import React, { useEffect, useMemo, useState } from 'react';
import { accountsAPI } from '../../services/api';

const formatBDT = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2
  }).format(num);
};

const formatDhakaDateTime = (value) => {
  if (!value) return '';
  const dt = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return String(value);

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(dt);
};

const pad2 = (n) => String(n).padStart(2, '0');

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

const getRangeFromPeriod = ({ period, year, month, quarter }) => {
  if (period === 'custom') return null;

  if (period === 'monthly') {
    const start = `${year}-${pad2(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
    return { start, end };
  }

  if (period === 'quarterly') {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const start = `${year}-${pad2(startMonth)}-01`;
    const lastDay = new Date(year, endMonth, 0).getDate();
    const end = `${year}-${pad2(endMonth)}-${pad2(lastDay)}`;
    return { start, end };
  }

  // yearly
  return { start: `${year}-01-01`, end: `${year}-12-31` };
};

export default function Ledger() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');

  const [period, setPeriod] = useState('monthly'); // monthly|quarterly|yearly|custom
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(1);

  const [startDate, setStartDate] = useState(getDhakaTodayISO());
  const [endDate, setEndDate] = useState(getDhakaTodayISO());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ledger, setLedger] = useState(null);

  const effectiveRange = useMemo(() => {
    if (period === 'custom') return { start: startDate, end: endDate };
    const r = getRangeFromPeriod({ period, year, month, quarter });
    return r;
  }, [period, year, month, quarter, startDate, endDate]);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await accountsAPI.getAccounts();
        const list = res.data?.accounts || res.data || [];
        setAccounts(list);

        if (!accountId && list.length) setAccountId(String(list[0].id));
      } catch (e) {
        setError('Failed to load accounts list');
      }
    };
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLedger = async () => {
    if (!accountId) return;

    const { start, end } = effectiveRange || {};
    if (!start || !end) return;

    try {
      setLoading(true);
      setError('');
      const res = await accountsAPI.getLedger({
        account_id: accountId,
        start_date: start,
        end_date: end
      });

      if (res.data?.success) setLedger(res.data);
      else setError(res.data?.error || 'Failed to load ledger');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load ledger');
      setLedger(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    // We reuse your export endpoint: monthly/quarterly/yearly only
    try {
      setLoading(true);
      setError('');

      let params;
      if (period === 'monthly') params = { period: 'monthly', year, month, account_id: accountId };
      else if (period === 'quarterly') params = { period: 'quarterly', year, quarter, account_id: accountId };
      else if (period === 'yearly') params = { period: 'yearly', year, account_id: accountId };
      else {
        // custom: export not supported by export endpoint (by design)
        setError('Excel export supports monthly/quarterly/yearly only. Use those periods to export.');
        setLoading(false);
        return;
      }

      const res = await accountsAPI.downloadLedger(params);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const tag =
        period === 'monthly' ? `${year}-${pad2(month)}` :
        period === 'quarterly' ? `${year}-Q${quarter}` :
        `${year}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger-${tag}-account-${accountId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.error || 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-load when inputs change (only if account selected)
    if (accountId) loadLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, effectiveRange?.start, effectiveRange?.end]);

  return (
    <div className="ledger-page">
      <div className="page-header">
        <h2>General Ledger</h2>
        <div className="ledger-actions">
          <button className="btn-secondary" onClick={loadLedger} disabled={loading || !accountId}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button className="btn-primary" onClick={downloadExcel} disabled={loading || !accountId}>
            Download Excel
          </button>
        </div>
      </div>

      <div className="ledger-controls card">
        <div className="ledger-grid">
          <div>
            <label>Account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_number} - {a.account_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom (View only)</option>
            </select>
          </div>

          <div>
            <label>Year</label>
            <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>

          {period === 'monthly' && (
            <div>
              <label>Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{pad2(m)}</option>
                ))}
              </select>
            </div>
          )}

          {period === 'quarterly' && (
            <div>
              <label>Quarter</label>
              <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
                <option value={1}>Q1</option>
                <option value={2}>Q2</option>
                <option value={3}>Q3</option>
                <option value={4}>Q4</option>
              </select>
            </div>
          )}

          {period === 'custom' && (
            <>
              <div>
                <label>Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label>End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}
        </div>

        {effectiveRange?.start && effectiveRange?.end && (
          <div className="ledger-range">
            Showing: <b>{effectiveRange.start}</b> → <b>{effectiveRange.end}</b> (Timezone: Asia/Dhaka)
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {ledger && (
        <>
          <div className="ledger-summary card">
            <div><b>Opening:</b> {formatBDT(ledger.opening_balance)}</div>
            <div><b>Closing:</b> {formatBDT(ledger.closing_balance)}</div>
            <div className="muted">
              Account: {ledger.account?.account_number} - {ledger.account?.account_name}
            </div>
          </div>

          {/* Desktop table */}
          <div className="table-container ledger-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entry No</th>
                  <th>Posted (Dhaka)</th>
                  <th>Description</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Running</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{ledger.start_date}</td>
                  <td></td>
                  <td></td>
                  <td><b>Opening Balance</b></td>
                  <td></td>
                  <td></td>
                  <td><b>{formatBDT(ledger.opening_balance)}</b></td>
                </tr>

                {(ledger.lines || []).length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 18 }}>
                      No ledger entries in this period.
                    </td>
                  </tr>
                ) : (
                  ledger.lines.map((l, idx) => (
                    <tr key={idx}>
                      <td>{l.date}</td>
                      <td>{l.entry_number}</td>
                      <td>{formatDhakaDateTime(l.posted_at)}</td>
                      <td>{l.description}</td>
                      <td>{l.debit ? formatBDT(l.debit) : ''}</td>
                      <td>{l.credit ? formatBDT(l.credit) : ''}</td>
                      <td>{formatBDT(l.running_balance)}</td>
                    </tr>
                  ))
                )}

                <tr>
                  <td>{ledger.end_date}</td>
                  <td></td>
                  <td></td>
                  <td><b>Closing Balance</b></td>
                  <td></td>
                  <td></td>
                  <td><b>{formatBDT(ledger.closing_balance)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="ledger-cards">
            {(ledger.lines || []).map((l, idx) => (
              <div className="ledger-card" key={`m-${idx}`}>
                <div className="ledger-card-top">
                  <div className="ledger-card-title">{l.entry_number}</div>
                  <div className="ledger-card-date">{l.date}</div>
                </div>
                <div className="ledger-card-desc">{l.description}</div>
                <div className="ledger-card-grid">
                  <div><span className="k">Debit:</span> {l.debit ? formatBDT(l.debit) : '-'}</div>
                  <div><span className="k">Credit:</span> {l.credit ? formatBDT(l.credit) : '-'}</div>
                  <div><span className="k">Running:</span> {formatBDT(l.running_balance)}</div>
                  <div><span className="k">Posted:</span> {formatDhakaDateTime(l.posted_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
