import React, { useEffect, useState } from "react";
import { apiDelete, apiPost, apiPut } from "../api.js";

/**
 * Rules:
 * - isNew === true → show dimension/length inputs (Glass width/height, Thai rod_length, SS thickness/pipe_length), and Opening Stock field.
 * - After creation → dimension/length fields become read-only (locked).
 * - On create:
 *    Glass group = thickness "Xmm"
 *    SS Pipe group = thickness "Xmm" (pipe_length fixed 20 by rule; we set default 20)
 *    Thai group = provided `groupName` (optional); label remains variant label
 *    Others group = "Default"
 * - on_hand is set from opening_stock at create; later always read-only.
 */
function VariantFormRow({
  product,
  variant,
  onSaved,
  showInactive,
  isNew = false,
  onCancel,
  groupName = "Default",
}) {
  // Pre-fill create defaults based on product type and group
  const initial = (() => {
    const base = {
      sku: variant.sku || "",
      label: variant.size_label || "",
      thickness_mm: variant.thickness_mm ?? "",
      width_in: variant.width_in ?? "",
      height_in: variant.height_in ?? "",
      color: variant.color || "",
      rod_length_ft: variant.rod_length_ft ?? "",
      pipe_length_ft: variant.pipe_length_ft ?? "",
      cost_price: variant.cost_price ?? "",
      price_base: variant.price_base ?? "",
      price_alt: variant.price_alt ?? (product.type === "Others" ? null : ""),
      low_stock_threshold: variant.low_stock_threshold ?? "",
      opening_stock: isNew ? "" : undefined,
      active: variant.active === 1 || isNew,
    };

    if (isNew) {
      if (product.type === "Glass") {
        // If group is like "5mm" → parse thickness
        const mm = parseFloat(
          (groupName || "").toLowerCase().replace("mm", "")
        );
        if (!isNaN(mm)) base.thickness_mm = mm;
      }
      if (product.type === "SS Pipe") {
        const mm = parseFloat(
          (groupName || "").toLowerCase().replace("mm", "")
        );
        if (!isNaN(mm)) base.thickness_mm = mm;
        base.pipe_length_ft = base.pipe_length_ft || 20; // fixed 20 ft
      }
      if (product.type === "Thai Aluminum") {
        // groupName is optional; label stays free text
        // rod_length_ft: they must choose (21 or 18.5); keep editable in create
      }
    }
    return base;
  })();

  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) setEditing(true);
  }, [isNew]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  }

  async function save() {
    setSaving(true);
    try {
      // Build payload
      const payload = {
        sku: form.sku,
        label: form.label,
        thickness_mm:
          form.thickness_mm === "" ? null : Number(form.thickness_mm),
        width_in: form.width_in === "" ? null : Number(form.width_in),
        height_in: form.height_in === "" ? null : Number(form.height_in),
        color: form.color || null,
        rod_length_ft:
          form.rod_length_ft === "" ? null : Number(form.rod_length_ft),
        pipe_length_ft:
          form.pipe_length_ft === "" ? null : Number(form.pipe_length_ft),
        cost_price: form.cost_price === "" ? 0 : Number(form.cost_price),
        price_base: form.price_base === "" ? null : Number(form.price_base),
        price_alt:
          product.type === "Others"
            ? null
            : form.price_alt === ""
            ? null
            : Number(form.price_alt),
        low_stock_threshold:
          form.low_stock_threshold === ""
            ? 0
            : Number(form.low_stock_threshold),
        active: form.active,
      };

      // Opening stock maps to on_hand at create
      if (isNew) {
        payload.opening_stock = Number(form.opening_stock || 0);

        // Ensure group_name is set consistently
        if (product.type === "Glass" && payload.thickness_mm != null) {
          payload.group_name = `${payload.thickness_mm}mm`;
        } else if (product.type === "SS Pipe" && payload.thickness_mm != null) {
          payload.group_name = `${payload.thickness_mm}mm`;
          // SS Pipe length fixed 20
          payload.pipe_length_ft = 20;
        } else if (product.type === "Thai Aluminum") {
          payload.group_name = groupName || "Default";
        } else {
          payload.group_name = "Default";
        }

        await apiPost(`/products/${product.id}/variants`, payload);
      } else {
        // Editing: lock dimensions/lengths -> do not send changes if we made them read-only
        await apiPut(`/products/${product.id}/variants/${variant.id}`, payload);
      }

      setEditing(false);
      onSaved();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function softDelete() {
    if (!confirm("Soft-delete this variant?")) return;
    try {
      await apiDelete(`/products/${product.id}/variants/${variant.id}`);
      onSaved();
    } catch (e) {
      alert(e.message);
    }
  }

  async function restore() {
    try {
      await fetch(
        `${
          import.meta.env.VITE_API_BASE || "http://localhost:4000/api"
        }/products/${product.id}/variants/${variant.id}/restore`,
        { method: "POST" }
      );
      onSaved();
    } catch (e) {
      alert(e.message);
    }
  }

  if (!showInactive && variant.active === 0 && !isNew) return null;

  // ---------- READ-ONLY ----------
  if (!editing) {
    return (
      <tr
        className={`border-b ${variant.active ? "" : "opacity-60 bg-gray-50"}`}
      >
        <td className="p-2">{variant.sku}</td>
        <td className="p-2">{variant.size_label || variant.color || ""}</td>

        {product.type === "Glass" && (
          <>
            <td className="p-2">{variant.thickness_mm}</td>
            <td className="p-2">{variant.width_in}</td>
            <td className="p-2">{variant.height_in}</td>
          </>
        )}
        {product.type === "Thai Aluminum" && (
          <>
            <td className="p-2">{variant.color}</td>
            <td className="p-2">{variant.rod_length_ft}</td>
          </>
        )}
        {product.type === "SS Pipe" && (
          <>
            <td className="p-2">{variant.thickness_mm}</td>
            <td className="p-2">{variant.pipe_length_ft}</td>
          </>
        )}

        <td className="p-2">{variant.on_hand}</td>
        <td className="p-2">{variant.cost_price}</td>
        <td className="p-2">{variant.price_base}</td>
        <td className="p-2">{variant.price_alt ?? "—"}</td>
        <td className="p-2">{variant.low_stock_threshold}</td>
        <td className="p-2 text-center">{variant.active ? "Yes" : "No"}</td>
        <td className="p-2 flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1 rounded-md border bg-blue-800 text-white"
          >
            Edit
          </button>
          {variant.active ? (
            <button
              onClick={softDelete}
              className="px-3 py-1 rounded-md border bg-red-800 text-white"
            >
              Delete
            </button>
          ) : (
            <button onClick={restore} className="px-3 py-1 rounded-md border">
              Restore
            </button>
          )}
        </td>
      </tr>
    );
  }

  // ---------- EDIT / CREATE ----------
  const lockDims = !isNew; // lock dimensions on edit, open on create
  return (
    <tr className="border-b bg-yellow-50">
      <td className="p-2">
        <input
          name="sku"
          value={form.sku}
          onChange={onChange}
          className="w-40 rounded border px-2 py-1"
        />
      </td>
      <td className="p-2">
        <input
          name="label"
          value={form.label}
          onChange={onChange}
          className="w-40 rounded border px-2 py-1"
        />
      </td>

      {product.type === "Glass" && (
        <>
          <td className="p-2">
            <input
              type="number"
              name="thickness_mm"
              value={form.thickness_mm}
              onChange={onChange}
              disabled={lockDims}
              className={`w-24 rounded border px-2 py-1 ${
                lockDims ? "bg-gray-100" : ""
              }`}
            />
          </td>
          <td className="p-2">
            <input
              type="number"
              name="width_in"
              value={form.width_in}
              onChange={onChange}
              disabled={lockDims}
              className={`w-24 rounded border px-2 py-1 ${
                lockDims ? "bg-gray-100" : ""
              }`}
            />
          </td>
          <td className="p-2">
            <input
              type="number"
              name="height_in"
              value={form.height_in}
              onChange={onChange}
              disabled={lockDims}
              className={`w-24 rounded border px-2 py-1 ${
                lockDims ? "bg-gray-100" : ""
              }`}
            />
          </td>
        </>
      )}

      {product.type === "Thai Aluminum" && (
        <>
          <td className="p-2">
            <input
              name="color"
              value={form.color}
              onChange={onChange}
              className="w-32 rounded border px-2 py-1"
            />
          </td>
          <td className="p-2">
            <input
              type="number"
              step="0.1"
              name="rod_length_ft"
              value={form.rod_length_ft}
              onChange={onChange}
              disabled={lockDims}
              className={`w-24 rounded border px-2 py-1 ${
                lockDims ? "bg-gray-100" : ""
              }`}
            />
          </td>
        </>
      )}

      {product.type === "SS Pipe" && (
        <>
          <td className="p-2">
            <input
              type="number"
              name="thickness_mm"
              value={form.thickness_mm}
              onChange={onChange}
              disabled
              className={`w-24 rounded border px-2 py-1 ${
                lockDims ? "bg-gray-100" : ""
              }`}
            />
          </td>
          <td className="p-2">
            <input
              type="number"
              name="pipe_length_ft"
              value={form.pipe_length_ft || 20}
              onChange={onChange}
              disabled // fixed 20 ft by rule
              className="w-24 rounded border px-2 py-1 bg-gray-100"
            />
          </td>
        </>
      )}

      {/* On hand / Opening stock */}
      <td className="p-2">
        {isNew ? (
          <input
            type="number"
            name="opening_stock"
            value={form.opening_stock}
            onChange={onChange}
            className="w-24 rounded border px-2 py-1"
          />
        ) : (
          variant.on_hand
        )}
      </td>

      <td className="p-2">
        <input
          type="number"
          name="cost_price"
          value={form.cost_price}
          onChange={onChange}
          className="w-24 rounded border px-2 py-1"
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          name="price_base"
          value={form.price_base}
          onChange={onChange}
          className="w-24 rounded border px-2 py-1"
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          name="price_alt"
          value={form.price_alt ?? ""}
          onChange={onChange}
          disabled={product.type === "Others"}
          className="w-24 rounded border px-2 py-1 disabled:bg-gray-100"
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          name="low_stock_threshold"
          value={form.low_stock_threshold}
          onChange={onChange}
          className="w-24 rounded border px-2 py-1"
        />
      </td>
      <td className="p-2 text-center">
        <input
          type="checkbox"
          name="active"
          checked={form.active}
          onChange={onChange}
        />
      </td>
      <td className="p-2 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1 rounded-md border bg-blue-800 text-white"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={isNew ? onCancel : () => setEditing(false)}
          className="px-3 py-1 rounded-md border"
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}

export default VariantFormRow;
