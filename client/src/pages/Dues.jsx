import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api.js";
import DueDetailModal from "../components/DueDetailModal.jsx";

const fmtBDT = (n) => `৳ ${Number(n || 0).toFixed(2)}`;
const ddmmyyyy = (iso) => new Date(iso).toLocaleDateString("en-GB");

function todayInput() {
  const d = new Date();
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

export default function Dues() {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(monthStartInput());
  const [to, setTo] = useState(todayInput());

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [detailId, setDetailId] = useState(null);

  async function load(p = page) {
    const params = new URLSearchParams({
      q,
      from,
      to,
      page: p,
      page_size: pageSize,
    });
    const res = await apiGet(`/dues?${params.toString()}`);
    setRows(res.data || []);
    setTotal(res.pagination?.total || 0);
    setPage(p);
  }

  useEffect(() => {
    load(1);
  }, [q, from, to]);

  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total]
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl border bg-white p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Search (invoice / phone / name)
            </label>
            <input
              className="rounded border px-3 py-2"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="INV-..., 017..., Customer"
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
              className="px-3 py-2 rounded-md border"
              onClick={() => load(1)}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-2">Invoice</th>
              <th className="p-2">Date</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Phone</th>
              <th className="p-2 text-right">Grand Total</th>
              <th className="p-2 text-right">Paid</th>
              <th className="p-2 text-right">Due</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.invoice_no}</td>
                <td className="p-2">{ddmmyyyy(r.created_at)}</td>
                <td className="p-2">{r.customer_name || "Walk-in"}</td>
                <td className="p-2">{r.customer_phone || "N/A"}</td>
                <td className="p-2 text-right">{fmtBDT(r.grand_total)}</td>
                <td className="p-2 text-right">{fmtBDT(r.paid_amount)}</td>
                <td className="p-2 text-right font-semibold text-red-600">
                  {fmtBDT(r.due)}
                </td>
                <td className="p-2">
                  <button
                    className="px-3 py-1 rounded border"
                    onClick={() => setDetailId(r.id)}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3 text-center text-gray-500">
                  No dues found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Page {page} / {pages} — {total} record(s)
        </div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Prev
          </button>
          <button
            disabled={page >= pages}
            onClick={() => load(page + 1)}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <DueDetailModal
        invoiceId={detailId}
        onClose={() => setDetailId(null)}
        onUpdated={() => load(page)}
      />
    </div>
  );
}

