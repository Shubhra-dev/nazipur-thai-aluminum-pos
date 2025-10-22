import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api.js";
import Modal from "../components/Modal.jsx";

const fmtBDT = (n) => `৳ ${Number(n || 0).toFixed(2)}`;
const ddMMyyyy = (iso) => new Date(iso).toLocaleDateString("en-GB");

function normType(raw) {
  const s = String(raw || "").toLowerCase();
  if (s.includes("glass")) return "glass";
  if (s.includes("thai")) return "thai";
  if (s.includes("ss") || s.includes("steel")) return "ss";
  return "other";
}
function baseUomForType(t) {
  if (t === "glass") return "sheet";
  if (t === "thai") return "bar";
  if (t === "ss") return "pipe";
  return "piece";
}
function uomsForItem(item) {
  const t = item._type;
  if (t === "glass")
    return item.price_alt != null ? ["sheet", "sqft"] : ["sheet"];
  if (t === "thai") return item.price_alt != null ? ["bar", "ft"] : ["bar"];
  if (t === "ss") return item.price_alt != null ? ["pipe", "ft"] : ["pipe"];
  return ["piece"];
}
function convertToBase(vf, t, fromUom, qty) {
  const q = Number(qty || 0);
  if (q === 0) return 0;
  if (t === "glass") {
    const area = (Number(vf.width_in || 0) * Number(vf.height_in || 0)) / 144;
    if (fromUom === "sqft") return q / (area || Infinity);
    if (fromUom === "sheet") return q;
  } else if (t === "thai") {
    const L = Number(vf.rod_length_ft || 0);
    if (fromUom === "ft") return L ? q / L : 0;
    if (fromUom === "bar") return q;
  } else if (t === "ss") {
    const L = Number(vf.pipe_length_ft || 20);
    if (fromUom === "ft") return q / L;
    if (fromUom === "pipe") return q;
  } else {
    if (fromUom === "piece") return q;
  }
  return 0;
}

export default function Returns() {
  const [tab, setTab] = useState("Create");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["Create", "List"].map((t) => (
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
      {tab === "Create" ? (
        <CreateReturn onDone={() => setTab("List")} />
      ) : (
        <ReturnsList />
      )}
    </div>
  );
}

function CreateReturn({ onDone }) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [data, setData] = useState(null); // { invoice, items: [...] }
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [newDiscount, setNewDiscount] = useState("");

  async function loadByInvoiceNo() {
    if (!invoiceNo.trim()) return;
    const search = await apiGet(
      `/invoices?page=1&page_size=10&q=${encodeURIComponent(
        invoiceNo
      )}&from=1970-01-01&to=2999-12-31`
    );
    const found =
      (search.data || []).find((r) => r.invoice_no === invoiceNo) || null;
    if (!found) {
      alert("Invoice not found");
      return;
    }
    const prep = await apiGet(`/returns/prepare/${found.id}`);

    const items = (prep.data.items || []).map((it) => {
      const t = normType(it.product_type);
      const base = baseUomForType(t);
      const price_base = Number(it.variant_price_base || 0);
      const price_alt =
        it.variant_price_alt !== null ? Number(it.variant_price_alt) : null;
      const choices = uomsForItem({ _type: t, price_alt });

      // default line (prefer original sale uom if valid)
      const defaultUom = choices.includes(it.uom) ? it.uom : base;
      const defaultRate = defaultUom === base ? price_base : price_alt ?? 0;

      return {
        ...it,
        _type: t,
        price_base,
        price_alt,
        uom_choices: choices,
        // line has editable refund
        return_lines: [
          { uom: defaultUom, qty: 0, autoRate: defaultRate, refund: 0 },
        ],
        _exceeds: false,
      };
    });

    setData({ invoice: prep.data.invoice, items });
    setNewDiscount(
      prep.data.invoice?.discount_bdt != null
        ? String(Number(prep.data.invoice.discount_bdt).toFixed(2))
        : "0.00"
    );
  }

  function updateLine(idx, lineIdx, patch) {
    const items = [...data.items];
    const it = items[idx];
    const lines = [...it.return_lines];
    const next = { ...lines[lineIdx], ...patch };

    const base = baseUomForType(it._type);

    // Enforce integer qty for base UoM
    if (next.uom === base && next.qty != null) {
      next.qty = parseInt(String(next.qty).split(".")[0] || "0", 10);
    }

    // If UoM changed, update the autoRate (for display only)
    if (patch.uom && patch.uom !== lines[lineIdx].uom) {
      next.autoRate = next.uom === base ? it.price_base : it.price_alt ?? 0;
      // Do NOT auto-change refund here; user can edit refund explicitly
    }

    // If qty changed and user hasn't edited refund, default to qty * autoRate
    if (patch.qty != null && (lines[lineIdx].refund || 0) === 0) {
      const q = Number(next.qty || 0);
      const rate = Number(next.autoRate || 0);
      next.refund = Number((q * rate).toFixed(2));
    }

    // If refund changed, keep it as-is (editable)
    if (patch.refund != null) {
      next.refund = Number(patch.refund || 0);
    }

    lines[lineIdx] = next;

    // Compute combined base returned (for guard)
    const totalBase = lines.reduce(
      (s, l) => s + convertToBase(it.variant_fields, it._type, l.uom, l.qty),
      0
    );
    const exceeds = totalBase > Number(it.remaining_base_qty) + 1e-9;

    items[idx] = { ...it, return_lines: lines, _exceeds: exceeds };
    setData({ ...data, items });
  }

  function addLine(idx) {
    const it = data.items[idx];
    if (it.return_lines.length >= 2) return;
    const base = baseUomForType(it._type);
    const alt = it.uom_choices.find((u) => u !== base) || base;
    const autoRate = alt === base ? it.price_base : it.price_alt ?? 0;

    const items = [...data.items];
    items[idx] = {
      ...it,
      return_lines: [
        ...it.return_lines,
        { uom: alt, qty: 0, autoRate, refund: 0 },
      ],
    };
    setData({ ...data, items });
  }

  function removeLine(idx, lineIdx) {
    const items = [...data.items];
    const it = items[idx];
    const lines = it.return_lines.filter((_, i) => i !== lineIdx);

    const totalBase = lines.reduce(
      (s, l) => s + convertToBase(it.variant_fields, it._type, l.uom, l.qty),
      0
    );
    const exceeds = totalBase > Number(it.remaining_base_qty) + 1e-9;

    items[idx] = {
      ...it,
      return_lines: lines.length
        ? lines
        : [{ ...it.return_lines[0], qty: 0, refund: 0 }],
      _exceeds: exceeds,
    };
    setData({ ...data, items });
  }

  const subtotalRefund = useMemo(() => {
    if (!data) return 0;
    return data.items.reduce(
      (sum, it) =>
        sum + it.return_lines.reduce((s, l) => s + Number(l.refund || 0), 0),
      0
    );
  }, [data]);

  const hasExceed = useMemo(
    () => (data?.items || []).some((it) => it._exceeds),
    [data]
  );

  async function submitConfirm() {
    try {
      if (!data) return;
      if (hasExceed) {
        alert(
          "One or more items exceed remaining allowable quantity. Please adjust."
        );
        return;
      }

      const itemsPayload = [];
      data.items.forEach((it) => {
        it.return_lines.forEach((l) => {
          const qty = Number(l.qty || 0);
          const refund = Number(l.refund || 0);
          if (qty > 0) {
            itemsPayload.push({
              invoice_item_id: it.id,
              uom: l.uom,
              qty,
              refund_override: refund, // editable line total
              note: null,
            });
          }
        });
      });

      if (itemsPayload.length === 0) {
        alert("Add at least one return line.");
        return;
      }

      const newDisc = Number(newDiscount || 0);
      if (newDisc < 0) {
        alert("Discount cannot be negative.");
        return;
      }

      setSaving(true);
      await apiPost("/returns", {
        invoice_id: data.invoice.id,
        note: note || null,
        items: itemsPayload,
        new_discount_bdt: newDisc, // update invoice discount directly
      });

      // reset and go to list
      setInvoiceNo("");
      setData(null);
      setNote("");
      setNewDiscount("");
      setSaving(false);
      onDone?.();
    } catch (e) {
      setSaving(false);
      alert(e?.message || "Failed to create return");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">
              Invoice No
            </label>
            <input
              className="w-full rounded border px-3 py-2"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g., INV-20251009-0003"
            />
          </div>
          <button
            onClick={loadByInvoiceNo}
            className="px-3 py-2 rounded-md border"
          >
            Find
          </button>
        </div>
      </div>

      {data && (
        <div className="rounded-xl border bg-white">
          <div className="p-3 border-b">
            <div className="font-semibold">{data.invoice.invoice_no}</div>
            <div className="text-sm text-gray-600">
              {data.invoice.customer_name || "Walk-in"} •{" "}
              {data.invoice.customer_phone || "N/A"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2">UoM</th>
                  <th className="p-2 text-right">Sold Qty</th>
                  <th className="p-2 text-right">Already Returned (base)</th>
                  <th className="p-2 text-right">Return Qty</th>
                  <th className="p-2 text-right">Auto Rate</th>
                  <th className="p-2 text-right">Line Refund (editable)</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, idx) => {
                  const base = baseUomForType(it._type);
                  return it.return_lines.map((line, lineIdx) => {
                    const isFirst = lineIdx === 0;
                    return (
                      <tr
                        key={`${it.id}-${lineIdx}`}
                        className="border-b align-top"
                      >
                        <td className="p-2">
                          {isFirst ? (
                            <>
                              <div className="font-medium">
                                {it.product_name} ({it.variant_label})
                              </div>
                              <div className="text-xs text-gray-600">
                                SKU: {it.sku}
                              </div>
                              {it._exceeds && (
                                <div className="text-xs text-red-600 mt-1">
                                  Exceeds remaining quantity (combined lines)
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-gray-500">
                              (additional line)
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <select
                            value={line.uom}
                            onChange={(e) =>
                              updateLine(idx, lineIdx, { uom: e.target.value })
                            }
                            className="rounded border px-2 py-1"
                          >
                            {it.uom_choices.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        {isFirst ? (
                          <>
                            <td className="p-2 text-right">
                              {Number(it.qty).toFixed(3)} {it.uom}
                            </td>
                            <td className="p-2 text-right">
                              {Number(it.already_returned_base_qty).toFixed(3)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 text-right text-gray-400">—</td>
                            <td className="p-2 text-right text-gray-400">—</td>
                          </>
                        )}
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step={line.uom === base ? 1 : "0.001"}
                            min="0"
                            className="w-28 rounded border px-2 py-1 text-right"
                            value={line.qty}
                            onChange={(e) =>
                              updateLine(idx, lineIdx, { qty: e.target.value })
                            }
                          />
                          {line.uom === base && (
                            <div className="text-[11px] text-gray-500 mt-1">
                              Base qty is whole number only
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {fmtBDT(line.autoRate)}
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-32 rounded border px-2 py-1 text-right"
                            value={line.refund}
                            onChange={(e) =>
                              updateLine(idx, lineIdx, {
                                refund: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="p-2 text-right">
                          {lineIdx === 0 &&
                            it.uom_choices.length > 1 &&
                            it.return_lines.length < 2 && (
                              <button
                                className="px-2 py-1 rounded border text-xs"
                                onClick={() => addLine(idx)}
                                title="Add another line (e.g., sqft)"
                              >
                                + Add Line
                              </button>
                            )}
                          {lineIdx > 0 && (
                            <button
                              className="ml-2 px-2 py-1 rounded border text-xs"
                              onClick={() => removeLine(idx, lineIdx)}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          {/* Discount + Note + Totals */}
          <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">
                Adjust Invoice Discount (BDT)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded border px-3 py-2"
                value={newDiscount}
                onChange={(e) => setNewDiscount(e.target.value)}
                placeholder="e.g., 150.00"
              />
              <div className="mt-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Note (optional)
                </label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason / remarks"
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Subtotal Refund</div>
              <div className="text-2xl font-bold">{fmtBDT(subtotalRefund)}</div>
            </div>
          </div>

          <div className="p-3 flex flex-wrap justify-end gap-2">
            <button
              className="px-3 py-2 rounded-md border"
              onClick={() => {
                setInvoiceNo("");
                setData(null);
                setNote("");
                setNewDiscount("");
              }}
            >
              Cancel
            </button>
            <button
              className="px-3 py-2 rounded-md border"
              onClick={submitConfirm}
              disabled={saving || hasExceed}
              title={hasExceed ? "Fix exceeding items first" : ""}
            >
              {saving ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReturnsList() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewId, setViewId] = useState(null);

  async function load(p = page) {
    const params = new URLSearchParams({
      page: p,
      page_size: 10,
      q,
      from,
      to,
    });
    const res = await apiGet(`/returns?${params.toString()}`);
    setRows(res.data || []);
    setTotal(res.pagination?.total || 0);
    setPage(p);
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, from, to]);

  const pages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-3">
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
              onClick={() => {
                setFrom("");
                setTo("");
                setQ("");
              }}
            >
              Reset
            </button>
            <button
              className="px-3 py-2 rounded-md border"
              onClick={() => load(1)}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-2">Return No</th>
              <th className="p-2">Date</th>
              <th className="p-2">Invoice</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Phone</th>
              <th className="p-2 text-right">Refund</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.return_no}</td>
                <td className="p-2">{ddMMyyyy(r.created_at)}</td>
                <td className="p-2">{r.invoice_no}</td>
                <td className="p-2">{r.customer_name || "Walk-in"}</td>
                <td className="p-2">{r.customer_phone || "N/A"}</td>
                <td className="p-2 text-right">{fmtBDT(r.subtotal_refund)}</td>
                <td className="p-2">
                  <button
                    className="px-2 py-1 rounded border text-xs"
                    onClick={() => setViewId(r.id)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-3 text-center text-gray-500" colSpan={7}>
                  No returns
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

      <ReturnDetailModal id={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}

/* ---------- Detail Modal ---------- */
/* … top of file remains exactly as you have it … */

function ReturnDetailModal({ id, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      const res = await apiGet(`/returns/${id}`);
      const payload = res.data || res;
      const head = payload.head || payload.return || payload;
      const items = payload.items || head.items || [];
      if (mounted) setData({ head, items });
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (!id) return null;

  const h = data?.head || {};
  const items = data?.items || [];

  return (
    <Modal
      open={!!id}
      onClose={onClose}
      title={h.return_no ? `Return — ${h.return_no}` : "Return"}
      maxWidth="max-w-3xl"
    >
      {!data ? (
        <div className="p-4">Loading…</div>
      ) : (
        <div className="p-3 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-1">Linked Invoice</div>
              <div>
                <span className="font-semibold">Invoice No:</span>{" "}
                {h.invoice_no}
              </div>
              <div>
                <span className="font-semibold">Date:</span>{" "}
                {ddMMyyyy(h.created_at)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold mb-1">Return Summary</div>
              <div>
                <span className="font-semibold">Return No:</span> {h.return_no}
              </div>
              <div>
                <span className="font-semibold">Refund:</span>{" "}
                {fmtBDT(h.subtotal_refund)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-2 w-10">#</th>
                  <th className="p-2">Item</th>
                  <th className="p-2">UoM</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-right">Refund</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id || idx} className="border-b">
                    <td className="p-2">{idx + 1}</td>
                    <td className="p-2">
                      <div className="font-medium">{it.product_name}</div>
                      {it.variant_label ? (
                        <div className="text-xs text-gray-600">
                          {it.variant_label}
                        </div>
                      ) : null}
                      {it.sku ? (
                        <div className="text-xs text-gray-400">
                          SKU: {it.sku}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-2">{it.uom}</td>
                    <td className="p-2 text-right">
                      {Number(it.qty).toFixed(
                        it.uom === "sqft" || it.uom === "ft" ? 3 : 0
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {fmtBDT(it.effective_rate ?? 0)}
                    </td>
                    <td className="p-2 text-right">
                      {fmtBDT(it.refund_amount ?? 0)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="p-3 text-center text-gray-500" colSpan={6}>
                      No items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {h.note ? (
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Note:</span> {h.note}
            </div>
          ) : null}
        </div>
      )}
      <div className="px-3 pb-3 flex justify-end gap-2">
        <button className="px-3 py-1 rounded border" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
