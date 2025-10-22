import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { apiGet } from "../api.js";

function fmtBDT(n) {
  return `৳ ${Number(n || 0).toFixed(2)}`;
}
function formatDateDDMMYYYY(iso) {
  return new Date(iso).toLocaleDateString("en-GB");
}

export default function ProfitDetailModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      try {
        const res = await apiGet(`/reports/profit/${invoiceId}`);
        setData(res.data);
      } catch (e) {
        alert(e.message);
      }
    })();
  }, [invoiceId]);

  if (!invoiceId) return null;

  return (
    <Modal
      open={!!invoiceId}
      onClose={onClose}
      title={
        data ? `Profit Detail — ${data.invoice.invoice_no}` : "Profit Detail"
      }
      maxWidth="max-w-4xl"
    >
      {!data ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Date: {formatDateDDMMYYYY(data.invoice.created_at)} — Subtotal:{" "}
            {fmtBDT(data.invoice.subtotal)} — Discount:{" "}
            {fmtBDT(data.invoice.discount_bdt)}
          </div>

          <div className="overflow-x-auto rounded border">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Sales</th>
                  <th className="p-2 text-right">Cost</th>
                  <th className="p-2 text-right">Gross Profit</th>
                  <th className="p-2 text-right">Share Disc.</th>
                  <th className="p-2 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="p-2">
                      <div className="font-medium">{l.product_name}</div>
                      <div className="text-xs text-gray-500">
                        {l.variant_label}
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      {Number(l.qty).toFixed(3)}
                    </td>
                    <td className="p-2 text-right">{fmtBDT(l.line_total)}</td>
                    <td className="p-2 text-right">
                      {fmtBDT(Number(l.cost_at_sale) * Number(l.qty))}
                    </td>
                    <td className="p-2 text-right">
                      {fmtBDT(l.line_gross_profit)}
                    </td>
                    <td className="p-2 text-right">
                      {fmtBDT(l.share_discount)}
                    </td>
                    <td className="p-2 text-right">
                      {fmtBDT(l.line_net_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Returns impact summary (if any) */}
          {(Number(data.refund_total || 0) > 0 ||
            Number(data.returns_impact || 0) > 0) && (
            <div className="text-sm text-gray-700">
              <div>
                Returns: {fmtBDT(data.refund_total || 0)} (reduces profit by{" "}
                {fmtBDT(data.returns_impact || 0)})
              </div>
            </div>
          )}

          <div className="text-right font-semibold">
            Net Profit: {fmtBDT(data.net_profit)}
          </div>
        </div>
      )}
    </Modal>
  );
}
