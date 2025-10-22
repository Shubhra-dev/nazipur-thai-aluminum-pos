import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { apiGet, apiPost } from "../api.js";

function RestockModal({ open, onClose, product }) {
  const [variants, setVariants] = useState([]);
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !product?.id) return;
    // Load latest variants to choose from
    (async () => {
      try {
        const res = await apiGet(`/products/${product.id}`);
        setVariants(res.data.variants.filter((v) => v.active === 1));
        setVariantId("");
        setQty("");
        setNote("");
        setCostPerUnit("");
      } catch (e) {
        alert(e.message);
      }
    })();
  }, [open, product?.id]);

  async function submit() {
    if (!variantId) return alert("Select a variant");
    if (qty === "" || isNaN(Number(qty)))
      return alert("Enter quantity (can be negative for adjustment)");

    setSaving(true);
    try {
      // Primary endpoint
      await apiPost(`/restocks`, {
        variant_id: Number(variantId),
        qty_base: Number(qty),
        note: note || undefined,
        cost_per_unit: costPerUnit === "" ? undefined : Number(costPerUnit),
      });
      onClose(true);
    } catch (e) {
      // Fallback alias if needed
      try {
        await apiPost(`/products/${product.id}/restocks`, {
          variant_id: Number(variantId),
          qty_base: Number(qty),
          note: note || undefined,
          cost_per_unit: costPerUnit === "" ? undefined : Number(costPerUnit),
        });
        onClose(true);
      } catch (ee) {
        alert(ee.message || "Failed to restock");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={() => onClose(false)}
      title={`Restock / Adjust — ${product?.name || ""}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Variant</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            <option value="">Select a variant...</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.sku} —{" "}
                {v.size_label ||
                  v.color ||
                  (v.thickness_mm ? `${v.thickness_mm}mm` : "")}{" "}
                (on hand: {v.on_hand})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Qty (base unit)</label>
            <input
              type="number"
              className="w-full rounded border px-3 py-2"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g., 5 or -2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
              Cost per unit (optional)
            </label>
            <input
              type="number"
              className="w-full rounded border px-3 py-2"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              placeholder="e.g., 1200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Note (optional)</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="reason or remark"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => onClose(false)}
            className="px-3 py-1 rounded-md border"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-3 py-1 rounded-md border bg-black text-white"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default RestockModal;
