import React, { useEffect, useState } from "react";
import { apiGet } from "../api.js";

function LowStockTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // Primary endpoint
      const res = await apiGet("/low-stock");
      setRows(res.data);
    } catch (_e) {
      // Compatibility endpoint
      const res2 = await apiGet("/variants/low-stock");
      setRows(res2.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!rows.length) {
    return (
      <div className="text-sm text-gray-600">
        Everything looks good. No items at or below threshold.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            <th className="p-2">Product</th>
            <th className="p-2">Variant</th>
            <th className="p-2">SKU</th>
            <th className="p-2">On Hand</th>
            <th className="p-2">Low Stock Threshold</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.variant_id} className="border-b">
              <td className="p-2">
                {r.product_name} ({r.product_type})
              </td>
              <td className="p-2">
                {r.size_label ||
                  r.color ||
                  (r.thickness_mm ? `${r.thickness_mm}mm` : "")}
              </td>
              <td className="p-2">{r.sku}</td>
              <td className="p-2">{r.on_hand}</td>
              <td className="p-2">{r.low_stock_threshold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LowStockTable;
