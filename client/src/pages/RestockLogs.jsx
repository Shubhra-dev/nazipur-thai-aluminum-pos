import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api.js";

/**
 * Utility: format to dd/mm/yyyy
 */
function formatDateDDMMYYYY(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Utility: parse yyyy-mm-dd from <input type="date" /> into a real Date at
 * start-of-day (for from) or end-of-day (for to)
 */
function parseDateInput(value, endOfDay = false) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  const dt = new Date(
    Date.UTC(
      y,
      m - 1,
      d,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      999
    )
  );
  return dt;
}

/**
 * Display helper for variant name
 * Prefers size_label, then color, then thickness (e.g., "8mm").
 */
function variantName(row) {
  return (
    row.size_label ||
    row.color ||
    (row.thickness_mm ? `${row.thickness_mm}mm` : "")
  );
}

/**
 * Display helper for product + variant
 */
function productVariantDisplay(row) {
  const vName = variantName(row);
  const sku = row.sku ? ` [${row.sku}]` : "";
  if (vName) {
    return `${row.product_name} — ${vName}${sku}`;
  }
  // fallback
  return `${row.product_name}${sku}`;
}

function RestockLogs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState(""); // yyyy-mm-dd
  const [skuQuery, setSkuQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      // Server supports /restocks with optional product_id.
      // We’ll filter by date & SKU on the client for now (keeps backend unchanged).
      const res = await apiGet("/restocks");
      setRows(res.data || []);
    } catch (e) {
      // Fallback alias if needed
      try {
        const res2 = await apiGet("/products/0/restocks"); // harmless; will return latest logs
        setRows(res2.data || []);
      } catch (ee) {
        alert(ee.message || "Failed to load restock logs");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = rows;

    // Date filtering
    const from = parseDateInput(fromDate, false);
    const to = parseDateInput(toDate, true);

    if (from) {
      result = result.filter((r) => {
        const t = new Date(r.created_at);
        return t >= from;
      });
    }
    if (to) {
      result = result.filter((r) => {
        const t = new Date(r.created_at);
        return t <= to;
      });
    }

    // SKU filtering
    const q = (skuQuery || "").trim().toLowerCase();
    if (q) {
      result = result.filter((r) => (r.sku || "").toLowerCase().includes(q));
    }

    return result;
  }, [rows, fromDate, toDate, skuQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-lg font-semibold">Restock Logs</div>
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">SKU</label>
            <input
              type="text"
              value={skuQuery}
              onChange={(e) => setSkuQuery(e.target.value)}
              placeholder="Search by SKU..."
              className="rounded border px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Showing <span className="font-medium">{filtered.length}</span> of{" "}
        {rows.length} record(s)
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        {loading ? (
          <div className="p-4">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">
            No restock logs match your filters.
          </div>
        ) : (
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Product / Variant</th>
                <th className="p-2">Qty (base)</th>
                <th className="p-2">Cost / Unit (BDT)</th>
                <th className="p-2">Note</th>
                <th className="p-2">SKU</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 whitespace-nowrap">
                    {formatDateDDMMYYYY(r.created_at)}
                  </td>
                  <td className="p-2">
                    <div className="font-medium">
                      {productVariantDisplay(r)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.product_type ? `(${r.product_type})` : ""}
                    </div>
                  </td>
                  <td className="p-2">{Number(r.qty_base)}</td>
                  <td className="p-2">{Number(r.cost_per_unit).toFixed(2)}</td>
                  <td className="p-2">{r.note || "—"}</td>
                  <td className="p-2">{r.sku || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default RestockLogs;
