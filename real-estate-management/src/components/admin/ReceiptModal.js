import React, { useMemo } from 'react';

const formatBDT = (v) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(Number(v || 0));

export default function ReceiptModal({ open, onClose, receipt, onPrint }) {
  const title = useMemo(() => {
    if (!receipt) return '';
    return receipt.transaction_type === 'receipt' ? 'Money Receipt' : 'Payment Voucher';
  }, [receipt]);

  if (!open || !receipt) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div id="print-receipt">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Your Company Name</div>
              <div style={{ opacity: 0.8 }}>Dhaka, Bangladesh</div>
              <div style={{ opacity: 0.8 }}>Phone: __________</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><b>Receipt No:</b> {receipt.receipt_no}</div>
              <div><b>Date:</b> {receipt.date}</div>
            </div>
          </div>

          <hr style={{ margin: '12px 0' }} />

          {receipt.transaction_type === 'receipt' ? (
            <div><b>Received From:</b> {receipt.received_from || '—'}</div>
          ) : (
            <div><b>Paid To:</b> {receipt.paid_to || '—'}</div>
          )}

          <div style={{ marginTop: 8 }}><b>Description:</b> {receipt.description || '—'}</div>
          <div style={{ marginTop: 8, fontSize: 18 }}>
            <b>Amount:</b> {formatBDT(receipt.amount)}
          </div>

          <hr style={{ margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <div>
              <div style={{ marginTop: 30 }}>____________________</div>
              <div style={{ opacity: 0.85 }}>Prepared By</div>
              <div style={{ opacity: 0.85 }}>{receipt.created_by_name || ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginTop: 30 }}>____________________</div>
              <div style={{ opacity: 0.85 }}>Approved By</div>
              <div style={{ opacity: 0.85 }}>{receipt.approved_by_name || ''}</div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={onPrint}>Print</button>
        </div>
      </div>
    </div>
  );
}
