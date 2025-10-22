import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api.js";
import ProfitDetailModal from "../components/ProfitDetailModal.jsx";
import InvoiceViewModal from "../components/InvoiceViewModal.jsx";

function todayInput() {
  const d = new Date();
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function weekStartInput() {
  const d = new Date();
  const jsDay = d.getDay(); // 0..6 (Sun..Sat)
  const diff = jsDay === 0 ? 6 : jsDay - 1; // days since Monday
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function monthStartInput() {
  const d = new Date();
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
function fmtBDT(n) {
  return `৳ ${Number(n || 0).toFixed(2)}`;
}
function formatDateDDMMYYYY(iso) {
  return new Date(iso).toLocaleDateString("en-GB");
}

function useShortcutActive(from, to) {
  const today = todayInput();
  const week = weekStartInput();
  const month = monthStartInput();
  return useMemo(() => {
    if (from === today && to === today) return "today";
    if (from === week && to === today) return "week";
    if (from === month && to === today) return "month";
    return null;
  }, [from, to, today, week, month]);
}

function Sales() {
  const [tab, setTab] = useState("Invoices");

  const [q, setQ] = useState("");
  const [from, setFrom] = useState(monthStartInput());
  const [to, setTo] = useState(todayInput());

  const activeShortcut = useShortcutActive(from, to);
  const btnCls = (active) =>
    `px-3 py-2 rounded-md border ${
      active ? "bg-black text-white" : "bg-white hover:bg-gray-50"
    }`;

  // Invoices state
  const [invRows, setInvRows] = useState([]);
  const [invPage, setInvPage] = useState(1);
  const [invTotal, setInvTotal] = useState(0);
  const invPageSize = 10;
  const [viewInvoiceId, setViewInvoiceId] = useState(null);

  // Profit state
  const [pfRows, setPfRows] = useState([]);
  const [pfSummary, setPfSummary] = useState({ total_net_profit: 0 });
  const [pfPage, setPfPage] = useState(1);
  const [pfTotal, setPfTotal] = useState(0);
  const pfPageSize = 10;
  const [detailId, setDetailId] = useState(null);

  async function loadInvoices(page = invPage) {
    const params = new URLSearchParams({
      page,
      page_size: invPageSize,
      q,
      from,
      to,
    });
    const res = await apiGet(`/invoices?${params.toString()}`);
    setInvRows(res.data || []);
    setInvTotal(res.pagination?.total || 0);
    setInvPage(page);
  }

  async function loadProfit(page = pfPage) {
    const params = new URLSearchParams({
      page,
      page_size: pfPageSize,
      q,
      from,
      to,
    });
    const res = await apiGet(`/reports/profit?${params.toString()}`);
    // Backend already returns returns-aware net profit and refund_total
    setPfRows(res.data || []);
    setPfSummary(res.summary || { total_net_profit: 0 });
    setPfTotal(res.pagination?.total || 0);
    setPfPage(page);
  }

  useEffect(() => {
    loadInvoices(1);
    loadProfit(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, from, to]);

  const invPages = useMemo(
    () => Math.max(1, Math.ceil(invTotal / invPageSize)),
    [invTotal]
  );
  const pfPages = useMemo(
    () => Math.max(1, Math.ceil(pfTotal / pfPageSize)),
    [pfTotal]
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {["Invoices", "Profit"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-md border ${
              tab === t ? "bg-black text-white" : "bg-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-white p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Search (name/phone/invoice)
            </label>
            <input
              className="rounded border px-3 py-2"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g., 017..., Akij, INV-..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <input
              type="date"
              className="rounded border px-3 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <input
              type="date"
              className="rounded border px-3 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                setFrom(todayInput());
                setTo(todayInput());
              }}
              className={btnCls(activeShortcut === "today")}
            >
              Today
            </button>
            <button
              onClick={() => {
                setFrom(weekStartInput());
                setTo(todayInput());
              }}
              className={btnCls(activeShortcut === "week")}
            >
              This Week
            </button>
            <button
              onClick={() => {
                setFrom(monthStartInput());
                setTo(todayInput());
              }}
              className={btnCls(activeShortcut === "month")}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Invoices */}
      {tab === "Invoices" ? (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Date</th>
                  {/* <th className="p-2">Customer</th> */}
                  <th className="p-2">Phone</th>
                  <th className="p-2 text-right">Subtotal</th>
                  <th className="p-2 text-right">Discount</th>
                  <th className="p-2 text-right">Return</th>
                  <th className="p-2 text-right">Grand</th>
                  <th className="p-2 text-right">Paid</th>
                  <th className="p-2 text-right">Due</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invRows.map((r) => {
                  const refund = Number(r.refund_total || 0);
                  const revisedGrand = Number(r.grand_total || 0) - refund;
                  const due = Math.max(
                    0,
                    Number(
                      (revisedGrand - Number(r.paid_amount || 0)).toFixed(2)
                    )
                  );
                  return (
                    <tr key={r.id} className="border-b">
                      <td className="p-2">{r.invoice_no}</td>
                      <td className="p-2">
                        {formatDateDDMMYYYY(r.created_at)}
                      </td>
                      {/* <td className="p-2">{r.customer_name || "Walk-in"}</td> */}
                      <td className="p-2">{r.customer_phone || "N/A"}</td>
                      <td className="p-2 text-right">{fmtBDT(r.subtotal)}</td>
                      <td className="p-2 text-right">
                        {fmtBDT(r.discount_bdt)}
                      </td>
                      <td className="p-2 text-right">{fmtBDT(refund)}</td>
                      <td className="p-2 text-right">{fmtBDT(revisedGrand)}</td>
                      <td className="p-2 text-right">
                        {fmtBDT(r.paid_amount)}
                      </td>
                      <td className="p-2 text-right">{fmtBDT(due)}</td>
                      <td className="p-2">{r.status}</td>
                      <td className="p-2">
                        <button
                          className="px-3 py-1 rounded border"
                          onClick={() => setViewInvoiceId(r.id)}
                        >
                          View / Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {invRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-3 text-center text-gray-500">
                      No invoices
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {invPage} / {invPages} — {invTotal} record(s)
            </div>
            <div className="flex gap-2">
              <button
                disabled={invPage <= 1}
                onClick={() => loadInvoices(invPage - 1)}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={invPage >= invPages}
                onClick={() => loadInvoices(invPage + 1)}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Profit */
        <div className="space-y-3">
          <div className="rounded-xl border bg-white p-3">
            <div className="text-sm text-gray-600">Net Profit (filtered)</div>
            <div className="text-2xl font-bold">
              {fmtBDT(pfSummary.total_net_profit)}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2 text-right">Subtotal</th>
                  <th className="p-2 text-right">Discount</th>
                  <th className="p-2 text-right">Returns</th>
                  <th className="p-2 text-right">Net Profit</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pfRows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2">{r.invoice_no}</td>
                    <td className="p-2">{formatDateDDMMYYYY(r.created_at)}</td>
                    <td className="p-2">{r.customer_name || "Walk-in"}</td>
                    <td className="p-2 text-right">{fmtBDT(r.subtotal)}</td>
                    <td className="p-2 text-right">{fmtBDT(r.discount_bdt)}</td>
                    {/* returns-aware column (refund_total) */}
                    <td className="p-2 text-right">{fmtBDT(r.refund_total)}</td>
                    {/* net_profit already adjusted by returns impact on backend */}
                    <td className="p-2 text-right">{fmtBDT(r.net_profit)}</td>
                    <td className="p-2">
                      <button
                        className="px-3 py-1 rounded border"
                        onClick={() => setDetailId(r.id)}
                      >
                        Profit Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {pfRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-3 text-center text-gray-500">
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pfPage} / {pfPages} — {pfTotal} invoice(s)
            </div>
            <div className="flex gap-2">
              <button
                disabled={pfPage <= 1}
                onClick={() => loadProfit(pfPage - 1)}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={pfPage >= pfPages}
                onClick={() => loadProfit(pfPage + 1)}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          <ProfitDetailModal
            invoiceId={detailId}
            onClose={() => setDetailId(null)}
          />
        </div>
      )}

      <InvoiceViewModal
        invoiceId={viewInvoiceId}
        onClose={() => setViewInvoiceId(null)}
      />
    </div>
  );
}

export default Sales;
