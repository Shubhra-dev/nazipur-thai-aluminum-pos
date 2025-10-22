import React, { forwardRef } from "react";
import { displayUomForProductType } from "../lib/uom.js";

function formatDDMMYYYY(dateLike) {
  const d = new Date(dateLike);
  return d.toLocaleDateString("en-GB");
}
function fmtBDT(n) {
  const num = Number(n || 0);
  return `৳ ${num.toFixed(2)}`;
}

const InvoicePrint = forwardRef(({ invoice }, ref) => {
  if (!invoice) return null;

  const shopName = invoice.shop_name || "Nazipur Thai Aluminum & Glass";
  const shopAddress =
    invoice.shop_address || "Naogaon Road, Nazipur, Patnitala, Naogaon.";
  const shopPhone = invoice.shop_phone || "01XXXXXXXXX";
  const proprietor = "Chandan Kumar";

  const subtotal = Number(invoice.subtotal || 0);
  const discount = Number(invoice.discount_bdt || 0);
  const refunds = Number(invoice.refund_total || 0); // NEW
  const baseGrand = subtotal - discount;
  const grand = baseGrand - refunds; // NEW: subtract refunds
  const paid = Number(invoice.paid_amount || 0);
  const due = Math.max(0, grand - paid);

  return (
    <div ref={ref} className="print-area p-6 text-[13px] bg-white">
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: fixed !important;
            top: 0 !important; left: 0 !important; right: 0 !important;
            margin: 0 !important; background: #fff !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
            padding: 10mm !important;
          }
        }
        .hdr-title { font-size: 22px; font-weight: 800; letter-spacing: .2px; }
        .muted { color: #555 }
        .muted-2 { color: #666 }
        .meta { font-size: 12px }
        .tbl { border-collapse: collapse; width: 100% }
        .tbl th, .tbl td { border: 1px solid #ddd; padding: 6px }
        .tbl th { background: #f7f7f7; text-align: left }
        .section-title { font-weight: 700; font-size: 14px; margin: 12px 0 6px }
        .totals { width: 320px; margin-left: auto }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0 }
        .totals-row strong { font-weight: 700 }
        .divider { height: 1px; background: #e5e7eb; margin: 10px 0 }
        .footer { margin-top: 18px; font-size: 12px; color: #555 }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700 }
        .badge-paid { background:#e8f5e9; color:#1b5e20 }
        .badge-unpaid { background:#ffebee; color:#b71c1c }
        .badge-partial { background:#fff8e1; color:#e65100 }
      `}</style>

      {/* Center header */}
      <div className="text-center">
        <div className="hdr-title">{shopName}</div>
        <div className="meta muted-2">{shopAddress}</div>
        <div className="meta muted">
          <b>Phone:</b> {shopPhone}
        </div>
        <div className="meta muted">
          <b>Proprietor:</b> {proprietor}
        </div>
      </div>

      <div className="divider" />

      {/* Bill To + Meta */}
      <div className="grid grid-cols-2 gap-4 meta">
        <div>
          <div className="section-title">Bill To</div>
          <div>
            <b>Customer:</b> {invoice.customer_name || "Walk-in"}
          </div>
          <div>
            <b>Phone:</b> {invoice.customer_phone || "N/A"}
          </div>
          {invoice.customer_address ? (
            <div>
              <b>Address:</b> {invoice.customer_address}
            </div>
          ) : null}
          {invoice.remark ? (
            <div className="mt-1">
              <b>Remarks:</b> {invoice.remark}
            </div>
          ) : null}
        </div>
        <div className="text-right">
          <div className="section-title">Invoice</div>
          <div>
            <b>No:</b> {invoice.invoice_no}
          </div>
          <div>
            <b>Date:</b> {formatDDMMYYYY(invoice.created_at || new Date())}
          </div>
          <div>
            <b>Status:</b>{" "}
            <span
              className={`badge ${
                invoice.status === "PAID"
                  ? "badge-paid"
                  : invoice.status === "PARTIAL"
                  ? "badge-partial"
                  : "badge-unpaid"
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="section-title">Items</div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Item</th>
            <th style={{ width: 100 }}>UoM</th>
            <th style={{ width: 100, textAlign: "right" }}>Qty</th>
            <th style={{ width: 120, textAlign: "right" }}>Unit Price</th>
            <th style={{ width: 130, textAlign: "right" }}>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((it, idx) => {
            const uoms = displayUomForProductType(it.product_type);
            const uomLabel = it.uom === "base" ? uoms.base : uoms.alt;
            const group =
              it.group_name && it.group_name !== "Default"
                ? ` (${it.group_name})`
                : "";
            const line1 = `${it.product_name}${group}`;
            const line2 = it.variant_label || "";

            return (
              <tr key={it.id || idx}>
                <td>{idx + 1}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{line1}</div>
                  {line2 ? <div className="muted meta">{line2}</div> : null}
                </td>
                <td>{uomLabel}</td>
                <td style={{ textAlign: "right" }}>
                  {Number(it.qty).toFixed(3)}
                </td>
                <td style={{ textAlign: "right" }}>{fmtBDT(it.unit_price)}</td>
                <td style={{ textAlign: "right" }}>{fmtBDT(it.line_total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="totals mt-3">
        <div className="totals-row">
          <div>Subtotal</div>
          <div>
            <strong>{fmtBDT(subtotal)}</strong>
          </div>
        </div>
        <div className="totals-row">
          <div>Discount</div>
          <div>
            <strong>{fmtBDT(discount)}</strong>
          </div>
        </div>
        <div className="totals-row">
          <div>Return (−)</div>
          <div>
            <strong>{fmtBDT(refunds)}</strong>
          </div>
        </div>
        <div className="totals-row" style={{ fontSize: 16 }}>
          <div>Grand Total</div>
          <div>
            <strong>{fmtBDT(grand)}</strong>
          </div>
        </div>
        <div className="totals-row">
          <div>Paid</div>
          <div>
            <strong>{fmtBDT(paid)}</strong>
          </div>
        </div>
        <div className="totals-row">
          <div>Due</div>
          <div>
            <strong>{fmtBDT(due)}</strong>
          </div>
        </div>
      </div>

      <div className="footer text-center">Thank you for your business.</div>
    </div>
  );
});

export default InvoicePrint;
