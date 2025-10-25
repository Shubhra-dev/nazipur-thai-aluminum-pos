import React from "react";
import {
  displayUomForProductType,
  displayVariantName,
  glassSqftPerSheet,
} from "../lib/uom.js";

/**
 * Changes:
 * - Line total is editable (kept).
 * - On UoM switch, unit price auto-updates (to price_base/price_alt) and line_total recalculates.
 * - Stock column removed.
 */
function POSLineItemRow({ item, onChange, onRemove }) {
  console.log(item);
  const uoms = displayUomForProductType(item.product_type);

  const setField = (name, value) => {
    onChange({ ...item, [name]: value });
  };

  const onChangeUom = (uom) => {
    // Auto-switch unit price based on uom (fallback to base if alt missing)
    const nextPrice =
      uom === "alt"
        ? item.price_alt ?? item.price_base ?? 0
        : item.price_base ?? item.price_alt ?? 0;

    const qty = Number(item.qty || 0);
    const line_total = Number((qty * Number(nextPrice || 0)).toFixed(2));

    onChange({
      ...item,
      uom,
      unit_price: nextPrice,
      line_total,
    });
  };

  const onChangeQty = (value) => {
    if (value > item.on_hand) {
      alert("Selected quantity is bigger than stock");
      return;
    }
    const qty = Number(value || 0);
    const price = Number(item.unit_price || 0);
    // keep line_total editable, but recalc when qty changes
    onChange({
      ...item,
      qty: value,
      line_total: Number((qty * price).toFixed(2)),
    });
  };

  const onChangeUnitPrice = (value) => {
    const price = Number(value || 0);
    const qty = Number(item.qty || 0);
    onChange({
      ...item,
      unit_price: value,
      line_total: Number((qty * price).toFixed(2)),
    });
  };

  return (
    <tr className="border-b">
      <td className="p-2">
        <div className="font-medium">{item.product_name}</div>
        <div className="text-xs text-gray-600">
          {displayVariantName(item)} —{" "}
          <span className="text-gray-500">{item.sku}</span>
        </div>
      </td>

      <td className="p-2">
        <select
          className="rounded border px-2 py-1"
          value={item.uom}
          onChange={(e) => onChangeUom(e.target.value)}
          disabled={!uoms.alt}
        >
          <option value="base">{uoms.base}</option>
          {uoms.alt && <option value="alt">{uoms.alt}</option>}
        </select>
      </td>

      <td className="p-2">
        <input
          type="number"
          step="1"
          className="rounded border px-2 py-1 w-28"
          value={item.qty}
          onChange={(e) => onChangeQty(e.target.value)}
        />
        <div className="text-[11px] text-gray-500 mt-1">
          {item.product_type === "Glass" && item.uom === "alt" && (
            <>1 sheet ≈ {glassSqftPerSheet(item).toFixed(2)} sqft</>
          )}
          {item.product_type === "Thai Aluminum" &&
            item.uom === "alt" &&
            item.rod_length_ft && <>1 bar = {Number(item.rod_length_ft)} ft</>}
          {item.product_type === "SS Pipe" && item.uom === "alt" && (
            <>1 pipe = 20 ft</>
          )}
        </div>
      </td>

      <td className="p-2">
        <input
          type="number"
          step="0.01"
          className="rounded border px-2 py-1 w-28"
          value={item.unit_price}
          onChange={(e) => onChangeUnitPrice(e.target.value)}
        />
      </td>

      <td className="p-2">
        <input
          type="number"
          step="0.01"
          className="rounded border px-2 py-1 w-32"
          value={item.line_total}
          onChange={(e) => setField("line_total", e.target.value)}
        />
      </td>

      <td className="p-2">
        <button onClick={onRemove} className="px-2 py-1 rounded border">
          Remove
        </button>
      </td>
    </tr>
  );
}

export default POSLineItemRow;
