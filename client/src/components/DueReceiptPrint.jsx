import React, { forwardRef } from "react";

const fmtBDT = (n) => `৳ ${Number(n || 0).toFixed(2)}`;
const ddmmyyyy = (iso) => new Date(iso).toLocaleDateString("en-GB");

const DueReceiptPrint = forwardRef(
  ({ receipt, invoice, amount, remainingAfter }, ref) => {
    if (!receipt || !invoice) return null;

    const shopName = "নজিপুর থাই অ্যালুমিনিয়াম এন্ড এস এস পয়েন্ট";
    const shopAddress = "নজিপুর, পত্নীতলা, নওগাঁ";
    const shopPhone = "01XXXXXXXXX";
    const proprietor = "চন্দন কুমার (বিট্টু)";

    return (
      <div ref={ref} className="p-6 bg-white text-[13px]">
        <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: fixed !important;
            top: 0 !important; left: 0 !important; right: 0 !important;
            margin: 0 !important; background: #fff !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
            padding: 10mm !important;
          }
        }
        .hdr-title { font-size: 20px; font-weight: 800; }
        .meta { font-size: 12px; color:#555 }
        .row { display:flex; justify-content:space-between; padding:6px 0 }
      `}</style>

        <div className="text-center">
          <div className="hdr-title">Payment Receipt</div>
          <div className="font-kalpurush text-xl font-bold">{shopName}</div>
          <div className="font-kalpurush text-base">{shopAddress}</div>
          <div className="font-kalpurush text-base">
            মোবাঃ {shopPhone} — প্রোঃ {proprietor}
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div>
            Invoice: <b>{invoice.invoice_no}</b>
          </div>
          <div>
            Receipt: <b>{receipt.receipt_no}</b>
          </div>
        </div>
        <div className="row">
          <div>Date: {ddmmyyyy(receipt.created_at)}</div>
          <div>
            Customer: {invoice.customer_name || "Walk-in"} (
            {invoice.customer_phone || "N/A"})
          </div>
        </div>

        <hr className="my-2" />

        <div className="row">
          <div>Paid Amount</div>
          <div>
            <b>{fmtBDT(amount)}</b>
          </div>
        </div>
        <div className="row">
          <div>Remaining Due</div>
          <div>
            <b>{fmtBDT(remainingAfter)}</b>
          </div>
        </div>

        <div
          className="text-center mt-6"
          style={{ fontSize: 12, color: "#555" }}
        >
          Thank you for your payment.
        </div>
      </div>
    );
  }
);

export default DueReceiptPrint;
