import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { apiGet, apiPost } from "../api.js";
import DueReceiptPrint from "./DueReceiptPrint.jsx";

const fmtBDT = (n) => `৳ ${Number(n || 0).toFixed(2)}`;
const ddmmyyyy = (iso) => new Date(iso).toLocaleDateString("en-GB");

export default function DueDetailModal({ invoiceId, onClose, onUpdated }) {
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const printRef = useRef(null);
  const [receipt, setReceipt] = useState(null);

  async function load() {
    if (!invoiceId) return;
    const res = await apiGet(`/dues/${invoiceId}`);
    setData(res.data);
  }

  useEffect(() => {
    if (invoiceId) load();
  }, [invoiceId]);

  if (!invoiceId) return null;

  const inv = data?.invoice || {};
  const comp = data?.computed || {};
  const payments = data?.payments || [];
  const remaining = Number(data?.remaining || 0);

  async function handlePay(printAfter = false) {
    try {
      const amt = Number(amount || 0);
      if (amt <= 0) {
        alert("Enter a valid amount.");
        return;
      }
      if (amt > remaining + 1e-9) {
        alert("Amount exceeds remaining due.");
        return;
      }
      setSaving(true);
      const res = await apiPost(`/dues/${invoiceId}/payments`, {
        amount: amt,
        note: note || null,
      });
      setSaving(false);
      setAmount("");
      setNote("");
      setReceipt({
        ...res.data,
        amount: amt,
      });
      await load();
      onUpdated?.();
      if (printAfter) setTimeout(() => window.print(), 30);
    } catch (e) {
      setSaving(false);
      alert(e?.message || "Failed");
    }
  }

  return (
    <>
      <Modal
        open={!!invoiceId}
        onClose={onClose}
        title={inv.invoice_no ? `Due — ${inv.invoice_no}` : "Due"}
        maxWidth="max-w-3xl"
      >
        {!data ? (
          <div className="p-4">Loading…</div>
        ) : (
          <div className="p-3 space-y-4">
            {/* Minimal header */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold mb-1">Invoice</div>
                <div>No: {inv.invoice_no}</div>
                <div>Date: {ddmmyyyy(inv.created_at)}</div>
                <div>Customer: {data.customer?.name || "Walk-in"}</div>
                <div>Phone: {data.customer?.phone || "N/A"}</div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-gray-600">Grand Total</div>
                  <div className="text-lg font-semibold">
                    {fmtBDT(comp.grand_total)}
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-gray-600">Paid</div>
                  <div className="text-lg font-semibold">
                    {fmtBDT(inv.paid_amount)}
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-gray-600">Remaining</div>
                  <div className="text-lg font-semibold text-red-600">
                    {fmtBDT(remaining)}
                  </div>
                </div>
              </div>
            </div>

            {/* Installments */}
            <div className="rounded-xl border overflow-hidden">
              <div className="px-3 py-2 border-b font-semibold bg-gray-50">
                Installments
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-white text-left text-gray-600">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Receipt</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="p-3">{ddmmyyyy(p.created_at)}</td>
                        <td className="p-3">
                          <span className="inline-block rounded-full bg-gray-100 border px-2 py-0.5 text-xs font-semibold">
                            {p.receipt_no}
                          </span>
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {fmtBDT(p.amount)}
                        </td>
                        <td className="p-3 text-gray-700">{p.note || ""}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-4 text-center text-gray-500"
                        >
                          No installments yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add payment */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="e.g., 1000"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">
                  Note (optional)
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Cash / bKash / Ref…"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={onClose}>
                Close
              </button>
              <button
                className="px-3 py-1 rounded border"
                disabled={saving}
                onClick={() => handlePay(false)}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                className="px-3 py-1 rounded border"
                disabled={saving}
                onClick={() => handlePay(true)}
              >
                {saving ? "Saving…" : "Save & Print"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print-only receipt */}
      <div
        className="print-area"
        style={{ display: receipt ? "block" : "none" }}
      >
        {receipt && (
          <DueReceiptPrint
            ref={printRef}
            receipt={receipt.receipt}
            invoice={receipt.invoice}
            amount={receipt.amount}
            remainingAfter={receipt.remaining_after}
          />
        )}
      </div>
    </>
  );
}
