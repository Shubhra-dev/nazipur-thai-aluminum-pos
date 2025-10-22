import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api.js";

function todayInput() {
  const d = new Date();
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function weekStartInput() {
  const d = new Date();
  const jsDay = d.getDay();
  const diff = jsDay === 0 ? 6 : jsDay - 1;
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
function ddmmyyyy(iso) {
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

export default function SalesReport() {
  const [tab, setTab] = useState("Overview");
  const [from, setFrom] = useState(monthStartInput());
  const [to, setTo] = useState(todayInput());

  const activeShortcut = useShortcutActive(from, to);
  const btnCls = (active) =>
    `px-3 py-2 rounded-md border ${
      active ? "bg-black text-white" : "bg-white hover:bg-gray-50"
    }`;

  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);

  // by product
  const [qProd, setQProd] = useState("");
  const [bpRows, setBpRows] = useState([]);
  const [bpPage, setBpPage] = useState(1);
  const [bpTotal, setBpTotal] = useState(0);
  const bpPageSize = 10;

  async function loadSummary() {
    const params = new URLSearchParams({ from, to });
    const res = await apiGet(`/reports/sales/summary?${params.toString()}`);
    setSummary(res.data);
  }
  async function loadDaily() {
    const params = new URLSearchParams({ from, to });
    const res = await apiGet(`/reports/sales/daily?${params.toString()}`);
    setDaily(res.data);
  }
  async function loadByProduct(page = bpPage) {
    const params = new URLSearchParams({
      from,
      to,
      page,
      page_size: bpPageSize,
      q: qProd,
    });
    const res = await apiGet(`/reports/sales/by-product?${params.toString()}`);
    setBpRows(res.data);
    setBpTotal(res.pagination?.total || 0);
    setBpPage(page);
  }

  useEffect(() => {
    loadSummary();
    loadDaily();
    loadByProduct(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, qProd]);

  const bpPages = useMemo(
    () => Math.max(1, Math.ceil(bpTotal / bpPageSize)),
    [bpTotal]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["Overview", "By Product"].map((t) => (
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

      <div className="rounded-xl border bg-white p-3">
        <div className="flex flex-wrap items-end gap-3">
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

      {tab === "Overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card
              title="Invoices"
              value={summary ? summary.invoices_count : "..."}
            />
            <Card
              title="Revenue"
              value={summary ? fmtBDT(summary.revenue) : "..."}
            />
            <Card
              title="Refunds"
              value={summary ? fmtBDT(summary.refunds) : "..."}
            />
            <Card
              title="Net Revenue"
              value={summary ? fmtBDT(summary.net_revenue) : "..."}
            />
            <Card title="Paid" value={summary ? fmtBDT(summary.paid) : "..."} />
            <Card title="Due" value={summary ? fmtBDT(summary.due) : "..."} />
            <Card
              title="Avg Order Value"
              value={summary ? fmtBDT(summary.avg_order_value) : "..."}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2 text-right">Revenue</th>
                  <th className="p-2 text-right">Refunds</th>
                  <th className="p-2 text-right">Net Revenue</th>
                  <th className="p-2 text-right">Paid</th>
                  <th className="p-2 text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{ddmmyyyy(d.date)}</td>
                    <td className="p-2 text-right">{fmtBDT(d.revenue)}</td>
                    <td className="p-2 text-right">{fmtBDT(d.refunds)}</td>
                    <td className="p-2 text-right">{fmtBDT(d.net_revenue)}</td>
                    <td className="p-2 text-right">{fmtBDT(d.paid)}</td>
                    <td className="p-2 text-right">{fmtBDT(d.due)}</td>
                  </tr>
                ))}
                {daily.length === 0 && (
                  <tr>
                    <td className="p-3 text-center text-gray-500" colSpan={6}>
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "By Product" && (
        <div className="space-y-3">
          <div className="rounded-xl border bg-white p-3">
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Search product
                </label>
                <input
                  className="rounded border px-3 py-2"
                  value={qProd}
                  onChange={(e) => setQProd(e.target.value)}
                  placeholder="e.g., Clear Glass"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2 text-right">Invoices</th>
                  <th className="p-2 text-right">Qty (sum)</th>
                  <th className="p-2 text-right">Sales</th>
                  <th className="p-2 text-right">Refunds</th>
                  <th className="p-2 text-right">Net Sales</th>
                </tr>
              </thead>
              <tbody>
                {bpRows.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{r.product_name}</td>
                    <td className="p-2 text-right">{r.invoices}</td>
                    <td className="p-2 text-right">
                      {Number(r.qty).toFixed(3)}
                    </td>
                    <td className="p-2 text-right">{fmtBDT(r.sales)}</td>
                    <td className="p-2 text-right">{fmtBDT(r.refunds)}</td>
                    <td className="p-2 text-right">{fmtBDT(r.net_sales)}</td>
                  </tr>
                ))}
                {bpRows.length === 0 && (
                  <tr>
                    <td className="p-3 text-center text-gray-500" colSpan={6}>
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pager
            page={bpPage}
            pages={bpPages}
            onPrev={() => loadByProduct(bpPage - 1)}
            onNext={() => loadByProduct(bpPage + 1)}
          />
        </div>
      )}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function Pager({ page, pages, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-600">
        Page {page} / {pages}
      </div>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={onPrev}
          className="px-3 py-1 rounded border disabled:opacity-50"
        >
          Prev
        </button>
        <button
          disabled={page >= pages}
          onClick={onNext}
          className="px-3 py-1 rounded border disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
