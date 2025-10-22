import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { apiGet } from "../api.js";
import InvoicePrint from "./InvoicePrint.jsx";

export default function InvoiceViewModal({ invoiceId, onClose }) {
  const [inv, setInv] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      const res = await apiGet(`/invoices/${invoiceId}`);
      const raw = res.data || {};

      const refund = Number(raw.refund_total || 0);
      const grand = Number(raw.grand_total || 0);
      const paid = Number(raw.paid_amount || 0);
      const revisedGrand = Number((grand - refund).toFixed(2));
      const due = Math.max(0, Number((revisedGrand - paid).toFixed(2)));

      setInv({
        ...raw,
        customer_name: raw.customer_name || "",
        customer_phone: raw.customer_phone || "",
        refund_total: refund,
        revised_grand_total: revisedGrand,
        due,
        // add a ready remark text for the print/view
        return_remark:
          refund > 0 ? `Return adjustment applied: ৳ ${refund.toFixed(2)}` : "",
      });
    })();
  }, [invoiceId]);

  if (!invoiceId) return null;

  return (
    <Modal
      open={!!invoiceId}
      onClose={onClose}
      title={inv ? `Invoice — ${inv.invoice_no}` : "Invoice"}
      maxWidth="max-w-3xl"
    >
      <div className="bg-white">
        <InvoicePrint ref={printRef} invoice={inv} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="px-3 py-1 rounded-md border" onClick={onClose}>
          Close
        </button>
        <button
          className="px-3 py-1 rounded-md border"
          onClick={() => {
            if (printRef.current) window.print();
          }}
        >
          Print
        </button>
      </div>
    </Modal>
  );
}
