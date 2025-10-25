import React, { useEffect, useRef, useState } from "react";
import POSCustomerBox from "../components/POSCustomerBox.jsx";
import POSLineItemRow from "../components/POSLineItemRow.jsx";
import InvoicePrint from "../components/InvoicePrint.jsx";
import Modal from "../components/Modal.jsx";
import { apiGet, apiPost } from "../api.js";
import { displayUomForProductType } from "../lib/uom.js";

function fmt2(n) {
  return Number(Number(n || 0).toFixed(2));
}

function POS() {
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");

  // Preview/print modal
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef(null);

  // This holds the object passed to <InvoicePrint> (draft or saved)
  const [previewInvoice, setPreviewInvoice] = useState(null);

  // Search product/variant/SKU
  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await apiGet(`/search/variants?q=${encodeURIComponent(q)}`);
        setResults(res.data);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function addVariant(v) {
    const uoms = displayUomForProductType(v.product_type);
    const line = {
      variant_id: v.id,
      sku: v.sku,
      product_name: v.product_name,
      product_type: v.product_type,
      group_name: v.group_name,
      rod_length_ft: v.rod_length_ft,
      pipe_length_ft: v.pipe_length_ft,
      width_in: v.width_in,
      height_in: v.height_in,
      size_label: v.size_label,
      color: v.color,
      on_hand: v.on_hand || 0,
      price_base: v.price_base ?? 0,
      price_alt: v.price_alt ?? null,
      uom: uoms.alt ? "alt" : "base",
      qty: "",
      unit_price: (uoms.alt ? v.price_alt ?? v.price_base : v.price_base) ?? 0,
      line_total: 0,
    };
    setItems((arr) => [line, ...arr]);
    setQ("");
    setResults([]);
  }

  function updateItem(idx, updated) {
    const arr = [...items];
    arr[idx] = { ...arr[idx], ...updated };
    setItems(arr);
  }

  function removeItem(idx) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce(
    (acc, it) => acc + Number(it.line_total || 0),
    0
  );
  const grandTotal = Math.max(0, subtotal - Number(discount || 0));
  const paidAmount = Number(paid || 0);
  const status =
    paidAmount >= grandTotal ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

  /** Build a DRAFT invoice object from the cart for preview */
  function buildDraftInvoice() {
    const lines = items.map((it, idx) => ({
      id: idx + 1,
      variant_id: it.variant_id,
      sku: it.sku,
      product_name: it.product_name,
      product_type: it.product_type,
      group_name: it.group_name,
      variant_label:
        it.size_label ||
        it.color ||
        (it.thickness_mm ? `${it.thickness_mm}mm` : "") ||
        "",
      uom: it.uom, // "base" or "alt"
      qty: Number(it.qty || 0),
      base_qty: null, // not needed for print
      unit_price: Number(it.unit_price || 0),
      line_total: Number(it.line_total || 0),
      cost_at_sale: 0,
    }));

    return {
      invoice_no: "DRAFT",
      created_at: new Date().toISOString(),
      subtotal: fmt2(subtotal),
      discount_bdt: fmt2(discount || 0),
      grand_total: fmt2(grandTotal),
      paid_amount: fmt2(paid || 0),
      status,
      shop_name: "নজিপুর থাই অ্যালুমিনিয়াম এন্ড গ্লাস",
      shop_address: "নজিপুর, পত্নীতলা, নওগাঁ",
      shop_phone: "01XXXXXXXXX",
      customer_name: customer.name || "",
      customer_phone: customer.phone || "",
      customer_address: customer.address || "",
      items: lines,
      refund_total: 0,
    };
  }

  /** Open preview WITHOUT saving anything */
  function openPreview() {
    if (items.length === 0) return alert("Add at least one item");
    const draft = buildDraftInvoice();
    setPreviewInvoice(draft);
    setShowPreview(true);
  }

  /** Complete & Print: create invoice on server, then print & clear cart */
  async function completeAndPrint() {
    try {
      if (items.length === 0) return alert("Add at least one item");
      for (const it of items) {
        if (!it.qty || Number(it.qty) <= 0) return alert("Quantity required");
        if (Number.isNaN(Number(it.unit_price)))
          return alert("Invalid unit price");
        if (Number.isNaN(Number(it.line_total)))
          return alert("Invalid line total");
      }

      const payload = {
        customer: customer.phone ? customer : null,
        lines: items.map((it) => ({
          variant_id: it.variant_id,
          uom: it.uom, // "base" | "alt"
          qty: Number(it.qty),
          unit_price: Number(it.unit_price),
          line_total: Number(it.line_total),
        })),
        discount_bdt: Number(discount || 0),
        paid_amount: Number(paid || 0),
        shop_name: "Nazipur Thai Aluminum & Glass",
        shop_address: "Nazipur, Patnitala, Naogaon",
        shop_phone: "01XXXXXXXXX",
      };

      const res = await apiPost("/invoices", payload);

      // Build a print object mixing server head + current cart items
      const savedForPrint = {
        ...res.data,
        customer_name: customer.name || "",
        customer_phone: customer.phone || "",
        customer_address: customer.address || "",
        items: buildDraftInvoice().items, // the exact lines that were sold
        refund_total: 0,
      };

      setPreviewInvoice(savedForPrint);
      // Ensure modal is open
      if (!showPreview) setShowPreview(true);

      // Print, then clear cart and close preview
      setTimeout(() => {
        if (printRef.current) window.print();
        // clear cart
        setItems([]);
        setDiscount("");
        setPaid("");
        setShowPreview(false);
      }, 50);
    } catch (e) {
      alert(e?.message || "Failed to save invoice");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-white p-3">
            <div className="mb-2 font-medium">Search Product / SKU</div>
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Type product/variant/SKU..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {results.length > 0 && (
              <div className="mt-2 border rounded max-h-64 overflow-y-auto">
                {results.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => addVariant(v)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    <div className="font-medium">
                      {v.product_name}{" "}
                      {v.group_name && v.group_name !== "Default"
                        ? `(${v.group_name})`
                        : ""}
                      {v.size_label ? ` — ${v.size_label}` : ""}
                    </div>
                    <div className="text-xs text-gray-600">SKU: {v.sku}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2">UoM</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Unit Price</th>
                  <th className="p-2">Line Total (editable)</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <POSLineItemRow
                    key={idx}
                    item={it}
                    onChange={(updated) => updateItem(idx, updated)}
                    onRemove={() => removeItem(idx)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <POSCustomerBox value={customer} onChange={setCustomer} />

          <div className="rounded-xl border p-3 bg-white">
            <div className="flex justify-between">
              <div>Subtotal</div>
              <div className="font-semibold">{subtotal.toFixed(2)} BDT</div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <div>Discount</div>
              <input
                type="number"
                step="0.01"
                className="rounded border px-3 py-1 w-32 text-right"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="mt-2 flex justify-between">
              <div>Grand Total</div>
              <div className="font-semibold">{grandTotal.toFixed(2)} BDT</div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <div>Paid</div>
              <input
                type="number"
                step="0.01"
                className="rounded border px-3 py-1 w-32 text-right"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
              />
            </div>
            <div className="mt-2 flex justify-between">
              <div>Status</div>
              <div className="font-semibold">
                {paidAmount >= grandTotal
                  ? "PAID"
                  : paidAmount > 0
                  ? "PARTIAL"
                  : "UNPAID"}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={openPreview}
                className="flex-1 rounded border px-3 py-2 bg-black text-white"
                disabled={items.length === 0}
                title={items.length === 0 ? "Add items first" : ""}
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview / Print Modal (no DB write until Complete) */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Invoice Preview"
        maxWidth="max-w-3xl"
      >
        <div className="bg-white">
          <InvoicePrint ref={printRef} invoice={previewInvoice} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="px-3 py-1 rounded-md border"
            onClick={() => setShowPreview(false)}
          >
            Close
          </button>
          <button
            className="px-3 py-1 rounded-md border bg-black text-white"
            onClick={completeAndPrint}
          >
            Complete & Print
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default POS;
