import React, { useState, useEffect } from "react";
import { accountsAPI, cashManagementAPI } from "../../services/api";
import { receiptsAPI } from "../../services/api";
import ReceiptModal from "./ReceiptModal";

function Accounts() {
  const getDhakaTodayISO = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${d}`;
  };

  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  // New states for cash management
  const [cashPosition, setCashPosition] = useState(null);
  const [dailyTransactions, setDailyTransactions] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [expenseAnalysis, setExpenseAnalysis] = useState(null);
  const [recentBalances, setRecentBalances] = useState([]);
  const [recentBalancesLoading, setRecentBalancesLoading] = useState(false);
  const [recentBalancesError, setRecentBalancesError] = useState("");
  // Expense analysis UI states
  const [expensePeriod, setExpensePeriod] = useState("month");
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [ledgerPeriod, setLedgerPeriod] = useState("monthly"); // monthly|quarterly|yearly
  const [ledgerYear, setLedgerYear] = useState(new Date().getFullYear());
  const [ledgerMonth, setLedgerMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [ledgerQuarter, setLedgerQuarter] = useState(1); // 1-4
  const [ledgerDownloading, setLedgerDownloading] = useState(false);
  const [reportDate, setReportDate] = useState(getDhakaTodayISO());
  const [reportLoading, setReportLoading] = useState(false);
  const [dailyReceipts, setDailyReceipts] = useState([]);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Form states
  const [newCashTransaction, setNewCashTransaction] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().split(" ")[0].substring(0, 5),
    description: "",
    amount: "",
    transaction_type: "receipt",
    category: "",
    payment_method: "cash",
    reference_number: "",
    received_from: "",
    paid_to: "",
    notes: "",
  });

  const [dailyBalance, setDailyBalance] = useState({
    date: new Date().toISOString().split("T")[0],
    opening_balance: "",
    cash_received: "",
    cash_paid: "",
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const openReceipt = async (id) => {
    try {
      setReceiptLoading(true);
      setReceiptData(null);
      setReceiptModalOpen(true);

      const res = await cashManagementAPI.getMoneyReceipt(id);
      if (res.data?.success) setReceiptData(res.data.receipt);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to load receipt");
      setReceiptModalOpen(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  const printReceipt = () => {
    const el = document.getElementById("receipt-print-area");
    if (!el) return;

    const printWindow = window.open("", "PRINT", "height=650,width=900");
    printWindow.document.write(`<html><head><title>Money Receipt</title>`);
    printWindow.document.write(`<style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .box { border: 1px solid #ddd; padding: 16px; border-radius: 10px; }
    .row { display:flex; justify-content:space-between; gap:12px; margin: 8px 0; }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
    .muted { color:#666; font-size: 12px; }
    .amount { font-size: 20px; font-weight: 800; margin-top: 10px; }
    hr { border:none; border-top: 1px solid #eee; margin: 12px 0; }
  </style></head><body>`);
    printWindow.document.write(el.innerHTML);
    printWindow.document.write(`</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const generateDailyReport = async () => {
    try {
      setReportLoading(true);
      const res = await cashManagementAPI.downloadDailyReport({
        date: reportDate,
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily-report-${reportDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // your existing message/toast can stay:
      // setMessage('Report generated and downloaded');
    } catch (e) {
      alert(e.response?.data?.error || "Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  const loadExpenseAnalysis = async (period = expensePeriod) => {
    try {
      const res = await cashManagementAPI.getExpenseAnalysis({ period });
      if (res.data?.success) setExpenseAnalysis(res.data);
    } catch (err) {
      console.error("Error fetching expense analysis:", err);
    }
  };

  const downloadLedgerExcel = async () => {
    try {
      setLedgerDownloading(true);

      const params =
        ledgerPeriod === "monthly"
          ? { period: "monthly", year: ledgerYear, month: ledgerMonth }
          : ledgerPeriod === "quarterly"
          ? { period: "quarterly", year: ledgerYear, quarter: ledgerQuarter }
          : { period: "yearly", year: ledgerYear };

      const res = await accountsAPI.downloadLedger(params);

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const tag =
        ledgerPeriod === "monthly"
          ? `${ledgerYear}-${String(ledgerMonth).padStart(2, "0")}`
          : ledgerPeriod === "quarterly"
          ? `${ledgerYear}-Q${ledgerQuarter}`
          : `${ledgerYear}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-${tag}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.response?.data?.error || "Ledger download failed");
    } finally {
      setLedgerDownloading(false);
    }
  };

  const getDhakaDateString = (date = new Date()) => {
    // Always format date as YYYY-MM-DD in Asia/Dhaka
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${d}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        const [positionRes, summaryRes] = await Promise.all([
          cashManagementAPI.getCashPosition(),
          cashManagementAPI.getDailySummary({ limit: 7 }),
        ]);

        if (positionRes.data?.success)
          setCashPosition(positionRes.data.cashPosition);

        if (summaryRes.data?.success) {
          const summaries = summaryRes.data.summaries || [];

          // ✅ Auto-generate if empty
          if (summaries.length === 0) {
            try {
              await cashManagementAPI.generateDailySummary(); // creates today's (or latest) summary in DB
              const refreshed = await cashManagementAPI.getDailySummary({
                limit: 7,
              });
              if (refreshed.data?.success)
                setDailySummary(refreshed.data.summaries || []);
              else setDailySummary([]);
            } catch (e) {
              console.error("Auto-generate daily summary failed:", e);
              setDailySummary([]);
            }
          } else {
            setDailySummary(summaries);
          }
        } else {
          setDailySummary([]);
        }
      }

      if (activeTab === "daily-transactions") {
        const today = getDhakaDateString(); // ✅ Dhaka date
        const transactionsRes = await cashManagementAPI.getCashTransactions({
          date: today,
        });
        if (transactionsRes.data?.success) {
          setDailyTransactions(transactionsRes.data.transactions || []);
        } else {
          setDailyTransactions([]);
        }
        const receiptsRes = await cashManagementAPI.getMoneyReceipts({
          date: today,
        });
        if (receiptsRes.data?.success) {
          setDailyTransactions(receiptsRes.data.receipts || []);
        } else {
          setDailyTransactions([]);
        }
      }

      if (activeTab === "expenses") {
        // ✅ loads whatever period user selected
        await loadExpenseAnalysis(expensePeriod);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCashTransaction = async (e) => {
    e.preventDefault();
    try {
      const response = await cashManagementAPI.createCashTransaction(
        newCashTransaction
      );
      if (response.data.success) {
        alert("Cash transaction recorded!");
        setNewCashTransaction({
          date: new Date().toISOString().split("T")[0],
          time: new Date().toTimeString().split(" ")[0].substring(0, 5),
          description: "",
          amount: "",
          transaction_type: "receipt",
          category: "",
          payment_method: "cash",
          reference_number: "",
          received_from: "",
          paid_to: "",
          notes: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error recording transaction:", error);
      alert("Failed to record transaction");
    }
  };

  const updateDailyBalance = async () => {
    try {
      const response = await cashManagementAPI.updateDailyBalance(dailyBalance);
      if (response.data.success) {
        alert("Daily balance updated!");
        fetchData();
      }
    } catch (error) {
      console.error("Error updating balance:", error);
      alert("Failed to update balance");
    }
  };

  const loadRecentDailyBalances = async () => {
    try {
      setRecentBalancesError("");
      setRecentBalancesLoading(true);

      // last 30 days (Dhaka time)
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      const params = {
        start_date: getDhakaDateString(start),
        end_date: getDhakaDateString(end),
      };

      const res = await cashManagementAPI.getDailyCash(params);

      if (res.data?.success) {
        // backend returns balances ordered DESC by date already
        setRecentBalances(res.data.balances || []);
      } else {
        setRecentBalances([]);
        setRecentBalancesError(
          res.data?.error || "Failed to load recent balances"
        );
      }
    } catch (err) {
      setRecentBalances([]);
      setRecentBalancesError(
        err.response?.data?.error || "Failed to load recent balances"
      );
    } finally {
      setRecentBalancesLoading(false);
    }
  };

  const renderDashboard = () => {
    if (!cashPosition) return null;

    const {
      today,
      yesterday,
      dailyChange,
      weeklyFlow,
      monthlyFlow,
      todayTransactions,
    } = cashPosition;

    // Dhaka date-time label
    const dhakaNowLabel = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());

    // BDT formatter
    const formatBDT = (value) =>
      new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 2,
      }).format(Number(value || 0));

    const todayBalance = Number(today?.closing_balance || 0);
    const change = Number(dailyChange || 0);

    return (
      <div className="accounts-dashboard">
        <div className="dashboard-header">
          <h3>📊 Cash Flow Dashboard</h3>
          <div className="dashboard-actions">
            <button
              className="btn-primary"
              onClick={generateDailyReport}
              disabled={reportLoading}
            >
              {reportLoading ? "Generating..." : "Generate Daily Report"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setActiveTab("daily-transactions")}
            >
              Record Transaction
            </button>
          </div>
        </div>

        <div className="cash-position-cards">
          <div className="cash-card primary">
            <div className="card-header">
              <h4>Today's Cash Balance</h4>
              <span className="card-date">{dhakaNowLabel} (Dhaka)</span>
            </div>
            <div className="card-body">
              <div className="cash-amount">{formatBDT(todayBalance)}</div>
              <div
                className={formatBDT`cash-change {change >= 0 ? 'positive' : 'negative'}`}
              >
                {change >= 0 ? "↗" : "↘"} {formatBDT(Math.abs(change))}
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
                  <span className="value">{todayTransactions?.count || 0}</span>
                </div>
                <div className="activity-item">
                  <span className="label">Cash In:</span>
                  <span className="value positive">
                    {formatBDT(todayTransactions?.receipts || 0)}
                  </span>
                </div>
                <div className="activity-item">
                  <span className="label">Cash Out:</span>
                  <span className="value negative">
                    {formatBDT(todayTransactions?.payments || 0)}
                  </span>
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
                  <span className="value">
                    {formatBDT(weeklyFlow?.in || 0)}
                  </span>
                </div>
                <div className="flow-item">
                  <span className="label">Out:</span>
                  <span className="value">
                    {formatBDT(weeklyFlow?.out || 0)}
                  </span>
                </div>
                <div className="flow-item total">
                  <span className="label">Net:</span>
                  <span
                    className={`value ${
                      (weeklyFlow?.net || 0) >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {formatBDT(weeklyFlow?.net || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="cash-card info">
            <div className="card-header">
              <h4>Monthly Flow</h4>
            </div>
            <div className="card-body">
              <div className="flow-stats">
                <div className="flow-item">
                  <span className="label">In:</span>
                  <span className="value">
                    {formatBDT(monthlyFlow?.in || 0)}
                  </span>
                </div>
                <div className="flow-item">
                  <span className="label">Out:</span>
                  <span className="value">
                    {formatBDT(monthlyFlow?.out || 0)}
                  </span>
                </div>
                <div className="flow-item total">
                  <span className="label">Net:</span>
                  <span
                    className={`value ${
                      (monthlyFlow?.net || 0) >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {formatBDT(monthlyFlow?.net || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keep the rest of your dashboard below as-is */}
        <div className="dashboard-charts">
          <div className="chart-section">
            <h4>Daily Cash Flow (Last 7 Days)</h4>
            <div className="cash-flow-chart">
              {(() => {
                const last7 = (dailySummary || []).slice(0, 7).reverse();

                const maxIn = Math.max(
                  1,
                  ...last7.map((d) => Number(d.total_cash_in || 0))
                );
                const maxOut = Math.max(
                  1,
                  ...last7.map((d) => Number(d.total_cash_out || 0))
                );

                return last7.map((day, index) => {
                  const cashIn = Number(day.total_cash_in || 0);
                  const cashOut = Number(day.total_cash_out || 0);

                  return (
                    <div key={index} className="chart-bar">
                      <div className="bar-group">
                        <div
                          className="bar in"
                          style={{ height: `${(cashIn / maxIn) * 80}%` }}
                          title={`In: ৳${cashIn.toFixed(2)}`}
                        />
                        <div
                          className="bar out"
                          style={{ height: `${(cashOut / maxOut) * 80}%` }}
                          title={`Out: ৳${cashOut.toFixed(2)}`}
                        />
                      </div>

                      <div className="chart-label">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
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
                  onChange={(e) =>
                    setNewCashTransaction({
                      ...newCashTransaction,
                      date: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Time *</label>
                <input
                  type="time"
                  value={newCashTransaction.time}
                  onChange={(e) =>
                    setNewCashTransaction({
                      ...newCashTransaction,
                      time: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <input
                type="text"
                value={newCashTransaction.description}
                onChange={(e) =>
                  setNewCashTransaction({
                    ...newCashTransaction,
                    description: e.target.value,
                  })
                }
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
                  onChange={(e) =>
                    setNewCashTransaction({
                      ...newCashTransaction,
                      amount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-group">
                <label>Transaction Type *</label>
                <select
                  value={newCashTransaction.transaction_type}
                  onChange={(e) =>
                    setNewCashTransaction({
                      ...newCashTransaction,
                      transaction_type: e.target.value,
                    })
                  }
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
                  onChange={(e) =>
                    setNewCashTransaction({
                      ...newCashTransaction,
                      category: e.target.value,
                    })
                  }
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
                  onChange={(e) =>
                    setNewCashTransaction({
                      ...newCashTransaction,
                      payment_method: e.target.value,
                    })
                  }
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            {newCashTransaction.transaction_type === "receipt" && (
              <div className="form-group">
                <label>Received From</label>
                <input
                  type="text"
                  value={newCashTransaction.received_from}
                  onChange={(e) =>
                    setNewCashTransaction({
                      ...newCashTransaction,
                      received_from: e.target.value,
                    })
                  }
                  placeholder="Name of payer"
                />
              </div>
            )}

            {newCashTransaction.transaction_type === "payment" && (
              <div className="form-group">
                <label>Paid To</label>
                <input
                  type="text"
                  value={newCashTransaction.paid_to}
                  onChange={(e) =>
                    setNewCashTransaction({
                      ...newCashTransaction,
                      paid_to: e.target.value,
                    })
                  }
                  placeholder="Name of payee"
                />
              </div>
            )}

            <div className="form-group">
              <label>Reference Number</label>
              <input
                type="text"
                value={newCashTransaction.reference_number}
                onChange={(e) =>
                  setNewCashTransaction({
                    ...newCashTransaction,
                    reference_number: e.target.value,
                  })
                }
                placeholder="Receipt/Check number"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={newCashTransaction.notes}
                onChange={(e) =>
                  setNewCashTransaction({
                    ...newCashTransaction,
                    notes: e.target.value,
                  })
                }
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
                  <th>View</th>
                  <th>Print</th>
                </tr>
              </thead>
              <tbody>
                {dailyTransactions.map((r) => (
                  <tr key={r.id}>
                    <td>{r.time}</td>
                    <td>
                      <div className="transaction-description">
                        {r.description}
                        {r.reference_number && (
                          <div className="text-muted">
                            Ref: {r.reference_number}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`transaction-type ${r.transaction_type}`}
                      >
                        {r.transaction_type}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`amount ${
                          r.transaction_type === "receipt"
                            ? "positive"
                            : "negative"
                        }`}
                      >
                        {r.transaction_type === "receipt" ? "+" : "-"}$
                        {parseFloat(r.amount).toFixed(2)}
                      </span>
                    </td>
                    <td>{r.category}</td>
                    <td>
                      <span className={`status-badge ${r.status}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        onClick={() => openReceipt(r.id)}
                        title="View"
                      >
                        👁️
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        onClick={async () => {
                          await openReceipt(r.id);
                          setTimeout(printReceipt, 200);
                        }}
                        title="Print"
                        style={{ marginLeft: 8 }}
                      >
                        🖨️
                      </button>
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
                onChange={(e) =>
                  setDailyBalance({
                    ...dailyBalance,
                    date: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Opening Balance *</label>
              <input
                type="number"
                step="0.01"
                value={dailyBalance.opening_balance}
                onChange={(e) =>
                  setDailyBalance({
                    ...dailyBalance,
                    opening_balance: e.target.value,
                  })
                }
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
                onChange={(e) =>
                  setDailyBalance({
                    ...dailyBalance,
                    cash_received: e.target.value,
                  })
                }
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Cash Paid Today</label>
              <input
                type="number"
                step="0.01"
                value={dailyBalance.cash_paid}
                onChange={(e) =>
                  setDailyBalance({
                    ...dailyBalance,
                    cash_paid: e.target.value,
                  })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="balance-preview">
            <h5>Balance Preview:</h5>
            <div className="preview-item">
              <span>Opening Balance:</span>
              <span>
                {" "}
                {parseFloat(dailyBalance.opening_balance || 0).toFixed(2)}
              </span>
            </div>
            <div className="preview-item">
              <span>Add: Cash Received:</span>
              <span className="positive">
                + {parseFloat(dailyBalance.cash_received || 0).toFixed(2)}
              </span>
            </div>
            <div className="preview-item">
              <span>Less: Cash Paid:</span>
              <span className="negative">
                - {parseFloat(dailyBalance.cash_paid || 0).toFixed(2)}
              </span>
            </div>
            <div className="preview-item total">
              <span>Closing Balance:</span>
              <span className="total-amount">
                BDT{" "}
                {(
                  parseFloat(dailyBalance.opening_balance || 0) +
                  parseFloat(dailyBalance.cash_received || 0) -
                  parseFloat(dailyBalance.cash_paid || 0)
                ).toFixed(2)}
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
            <div className="recent-balance-toolbar">
              <button
                className="btn-secondary"
                onClick={loadRecentDailyBalances}
                disabled={recentBalancesLoading}
              >
                {recentBalancesLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
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
                {recentBalancesError && (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center"
                      style={{ color: "#f56565" }}
                    >
                      {recentBalancesError}
                    </td>
                  </tr>
                )}

                {!recentBalancesError && recentBalances.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center">
                      <button
                        className="btn-secondary"
                        onClick={loadRecentDailyBalances}
                        disabled={recentBalancesLoading}
                      >
                        {recentBalancesLoading
                          ? "Loading..."
                          : "Load Recent Balances"}
                      </button>
                    </td>
                  </tr>
                )}

                {recentBalances.length > 0 &&
                  recentBalances.map((b) => (
                    <tr key={b.date}>
                      <td>{b.date}</td>
                      <td className="text-right">
                        ৳{parseFloat(b.opening_balance || 0).toFixed(2)}
                      </td>
                      <td className="text-right">
                        ৳{parseFloat(b.cash_received || 0).toFixed(2)}
                      </td>
                      <td className="text-right">
                        ৳{parseFloat(b.cash_paid || 0).toFixed(2)}
                      </td>
                      <td className="text-right">
                        ৳{parseFloat(b.closing_balance || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
  const renderReport = () => (
    <div className="card">
      <h3>📥 Ledger Export (Excel)</h3>

      <div className="ledger-export-controls">
        <select
          value={ledgerPeriod}
          onChange={(e) => setLedgerPeriod(e.target.value)}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>

        <input
          type="number"
          min="2000"
          max="2100"
          value={ledgerYear}
          onChange={(e) => setLedgerYear(Number(e.target.value))}
          style={{ width: 110 }}
        />

        {ledgerPeriod === "monthly" && (
          <select
            value={ledgerMonth}
            onChange={(e) => setLedgerMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        )}

        {ledgerPeriod === "quarterly" && (
          <select
            value={ledgerQuarter}
            onChange={(e) => setLedgerQuarter(Number(e.target.value))}
          >
            <option value={1}>Q1</option>
            <option value={2}>Q2</option>
            <option value={3}>Q3</option>
            <option value={4}>Q4</option>
          </select>
        )}

        <button
          className="btn-primary"
          onClick={downloadLedgerExcel}
          disabled={ledgerDownloading}
        >
          {ledgerDownloading ? "Preparing..." : "Download Excel"}
        </button>
      </div>

      <div className="text-muted" style={{ marginTop: 10 }}>
        Export includes Summary + per-account running ledger. Time shown in
        Asia/Dhaka.
      </div>
    </div>
  );

  const renderExpenseAnalysis = () => {
    // Allow UI to render even if null (so we can show loading/error nicely)
    const totals = expenseAnalysis?.totals || { budget: 0, spent: 0, count: 0 };
    const varianceValue =
      typeof expenseAnalysis?.variance === "number"
        ? expenseAnalysis.variance
        : parseFloat(totals.budget || 0) - parseFloat(totals.spent || 0);

    const budget = parseFloat(totals.budget || 0);
    const spent = parseFloat(totals.spent || 0);
    const usagePct = budget > 0 ? (spent / budget) * 100 : 0;

    return (
      <div className="expense-analysis-tab">
        <div className="page-header expense-header">
          <h3>📊 Expense Analysis</h3>

          <div className="expense-controls">
            <select
              value={expensePeriod}
              onChange={(e) => {
                const p = e.target.value;
                setExpensePeriod(p);
                loadExpenseAnalysis(p);
              }}
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>

            <button
              className="btn-secondary"
              onClick={() => loadExpenseAnalysis(expensePeriod)}
              disabled={expenseLoading}
            >
              {expenseLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {expenseError && (
          <div className="error-message" style={{ marginTop: 12 }}>
            {expenseError}
          </div>
        )}

        <div className="expense-overview">
          <div className="overview-card">
            <h4>Budget vs Actual</h4>

            <div className="overview-stats">
              <div className="stat-item">
                <span className="label">Budget</span>
                <span className="value">৳ {budget.toFixed(2)}</span>
              </div>

              <div className="stat-item">
                <span className="label">Spent</span>
                <span className="value">৳ {spent.toFixed(2)}</span>
              </div>

              <div className="stat-item">
                <span className="label">Variance</span>
                <span
                  className={`value variance ${
                    varianceValue >= 0 ? "positive" : "negative"
                  }`}
                >
                  ৳ {Math.abs(varianceValue).toFixed(2)}{" "}
                  {varianceValue >= 0 ? "under" : "over"}
                </span>
              </div>

              <div className="stat-item">
                <span className="label">Usage</span>
                <div className="usage-row">
                  <div className="usage-track">
                    <div
                      className="usage-fill"
                      style={{ width: `${Math.min(usagePct, 100)}%` }}
                    />
                  </div>
                  <span className="usage-text">{usagePct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="text-muted" style={{ marginTop: 10 }}>
              Approved payments are counted (based on backend expense analysis).
            </div>
          </div>
        </div>

        <div className="expense-breakdown">
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
                {expenseLoading && !expenseAnalysis && (
                  <tr>
                    <td colSpan="6" className="text-center">
                      Loading expense analysis...
                    </td>
                  </tr>
                )}

                {!expenseLoading && expenseAnalysis?.expenses?.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center">
                      No expense data found for this period.
                    </td>
                  </tr>
                )}

                {expenseAnalysis?.expenses?.map((expense, index) => {
                  const b = parseFloat(expense.budget_amount || 0);
                  const a = parseFloat(expense.actual_spent || 0);
                  const variance = b - a;

                  const percent = spent > 0 ? (a / spent) * 100 : 0;

                  return (
                    <tr key={index}>
                      <td>{expense.category_name}</td>
                      <td>৳ {b.toFixed(2)}</td>
                      <td>৳ {a.toFixed(2)}</td>
                      <td>
                        <span
                          className={`variance ${
                            variance >= 0 ? "positive" : "negative"
                          }`}
                        >
                          ৳ {Math.abs(variance).toFixed(2)}{" "}
                          {variance >= 0 ? "under" : "over"}
                        </span>
                      </td>
                      <td>
                        <div className="percentage-ui">
                          <div className="percentage-track">
                            <div
                              className="percentage-fill"
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                          <span className="percentage-text">
                            {percent.toFixed(1)}%
                          </span>
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
            onClick={() => setActiveTab("daily-transactions")}
          >
            + Quick Transaction
          </button>
        </div>
      </div>

      <div className="accounts-tabs">
        <button
          className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab ${
            activeTab === "daily-transactions" ? "active" : ""
          }`}
          onClick={() => setActiveTab("daily-transactions")}
        >
          💵 Daily Transactions
        </button>
        <button
          className={`tab ${activeTab === "balance-sheet" ? "active" : ""}`}
          onClick={() => setActiveTab("balance-sheet")}
        >
          📋 Balance Sheet
        </button>
        <button
          className={`tab ${activeTab === "expenses" ? "active" : ""}`}
          onClick={() => setActiveTab("expenses")}
        >
          📊 Expense Analysis
        </button>
        <button
          className={`tab ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          📈 Reports
        </button>
        <button
          className={`tab ${activeTab === "accounts" ? "active" : ""}`}
          onClick={() => setActiveTab("accounts")}
        >
          🏦 Chart of Accounts
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading accounts data...</div>
      ) : (
        <>
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "daily-transactions" && renderDailyTransactions()}
          {activeTab === "balance-sheet" && renderBalanceSheet()}
          {activeTab === "expenses" && renderExpenseAnalysis()}
          {activeTab === "reports" && renderReport()}
        </>
      )}
      <ReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={selectedReceipt}
        onPrint={printReceipt}
      />
      {receiptModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setReceiptModalOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>Money Receipt</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-secondary"
                  onClick={printReceipt}
                  disabled={!receiptData || receiptLoading}
                >
                  🖨️ Print
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setReceiptModalOpen(false)}
                >
                  ✖
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {receiptLoading && <div>Loading receipt...</div>}

              {receiptData && (
                <div id="receipt-print-area" className="box">
                  <div className="title">Money Receipt</div>
                  <div className="muted">
                    Timezone: Asia/Dhaka • Currency: BDT
                  </div>
                  <hr />

                  <div className="row">
                    <div>
                      <b>Receipt No:</b> {receiptData.receipt_no}
                    </div>
                    <div>
                      <b>Date:</b> {receiptData.date}
                    </div>
                  </div>

                  <div className="row">
                    <div>
                      <b>Type:</b> {receiptData.receipt_type}
                    </div>
                    <div>
                      <b>Transaction ID:</b> {receiptData.transaction_id}
                    </div>
                  </div>

                  <div className="row">
                    <div>
                      <b>Description:</b> {receiptData.description || "-"}
                    </div>
                  </div>

                  <div className="amount">
                    Amount: ৳ {Number(receiptData.amount || 0).toFixed(2)}
                  </div>

                  <hr />
                  <div className="row">
                    <div>
                      <b>Created By:</b>{" "}
                      {receiptData.created_by_name ||
                        receiptData.created_by ||
                        "-"}
                    </div>
                    <div>
                      <b>Approved By:</b>{" "}
                      {receiptData.approved_by_name ||
                        receiptData.approved_by ||
                        "-"}
                    </div>
                  </div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    Generated from approved cash transaction.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Accounts;
