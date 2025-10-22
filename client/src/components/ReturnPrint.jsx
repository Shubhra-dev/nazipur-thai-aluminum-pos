import React from "react";

/**
 * Props:
 *  - data: {
 *      head: {
 *        return_no, created_at,
 *        shop_name, shop_address, shop_phone,
 *        invoice_no,
 *        customer_name, customer_phone, customer_address
 *      },
 *      items: [{ idx, product_name, variant_label, uom, qty, rate, refund, sku }],
 *      subtotal_refund,
 *      draft?: boolean
 *    }
 */
export default function ReturnPrint({ data }) {
  if (!data) return null;
  const { head, items, subtotal_refund, draft } = data;

  return (
    <div className="print-only">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #fff; }
        }
        .a4-wrap {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 6mm 8mm;
          background: white;
          color: #111827;
          font-size: 12px;
          line-height: 1.35;
        }
        .muted { color: #6b7280; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
        .table th { background: #f9fafb; text-align: left; }
        .right { text-align: right; }
        .center { text-align: center; }
        .mb-12 { margin-bottom: 12px; }
        .mb-16 { margin-bottom: 16px; }
        .fw-600 { font-weight: 600; }
        .fw-700 { font-weight: 700; }
        .title { font-size: 18px; font-weight: 800; text-align: center; margin-bottom: 2px; }
        .subtle { font-size: 11px; }
        .hr { height: 1px; background: #e5e7eb; margin: 8px 0 12px; }
      `}</style>

      <div className="a4-wrap">
        {/* Shop header */}
        <div className="title">{head.shop_name}</div>
        <div className="center subtle">
          {head.shop_address}
          <br />
          Phone: {head.shop_phone}
          <br />
          Return Slip{draft ? " (DRAFT)" : ""}
        </div>

        <div className="hr" />

        {/* Meta */}
        <div className="grid-2 mb-16">
          <div>
            <div className="fw-600">Bill To</div>
            <div className="subtle">{head.customer_name}</div>
            <div className="subtle">Phone: {head.customer_phone}</div>
            {head.customer_address ? (
              <div className="subtle">{head.customer_address}</div>
            ) : null}
          </div>
          <div className="right">
            <div className="subtle">
              Return No: <span className="fw-600">{head.return_no}</span>
            </div>
            <div className="subtle">
              Invoice: <span className="fw-600">{head.invoice_no}</span>
            </div>
            <div className="subtle">
              Date:{" "}
              <span className="fw-600">
                {new Date(head.created_at).toLocaleDateString("en-GB")}
              </span>
            </div>
          </div>
        </div>

        {/* Items */}
        <table className="table mb-12">
          <thead>
            <tr>
              <th style={{ width: "32px" }}>#</th>
              <th>Item (Variant)</th>
              <th>UoM</th>
              <th className="right">Qty</th>
              <th className="right">Rate</th>
              <th className="right">Refund</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{it.idx ?? i + 1}</td>
                <td>
                  <div className="fw-600">
                    {it.product_name} ({it.variant_label})
                  </div>
                  {it.sku ? (
                    <div className="subtle muted">SKU: {it.sku}</div>
                  ) : null}
                </td>
                <td>{it.uom}</td>
                <td className="right">{Number(it.qty).toFixed(3)}</td>
                <td className="right">৳ {Number(it.rate).toFixed(2)}</td>
                <td className="right">৳ {Number(it.refund).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="right fw-700">
          Subtotal Refund: ৳ {Number(subtotal_refund || 0).toFixed(2)}
        </div>

        <div className="subtle muted" style={{ marginTop: "24px" }}>
          Thank you.
        </div>
      </div>
    </div>
  );
}
