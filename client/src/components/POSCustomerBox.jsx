import React, { useEffect } from "react";
import { apiGet } from "../api.js";

/**
 * Behavior:
 * - User types phone. When phone has 5+ chars, we auto-search.
 * - If a customer with EXACT phone exists, we auto-fill name & address.
 * - Otherwise, user keeps typing name/address; they'll be created on Save.
 * - No search button. No extra search box.
 */
function POSCustomerBox({ value, onChange }) {
  // Auto-search by phone and fill details if exact match found
  useEffect(() => {
    const phone = (value.phone || "").trim();
    if (phone.length < 5) return; // avoid noisy calls

    const t = setTimeout(async () => {
      try {
        const res = await apiGet(
          `/customers/search?q=${encodeURIComponent(phone)}`
        );
        const exact = (res.data || []).find(
          (c) => (c.phone || "").trim() === phone
        );
        if (exact) {
          onChange({
            ...value,
            name: exact.name || value.name || "",
            address: exact.address || value.address || "",
          });
        }
      } catch {
        // ignore
      }
    }, 300);

    return () => clearTimeout(t);
  }, [value.phone]);

  return (
    <div className="rounded-xl border p-3 bg-white">
      <div className="mb-2 font-medium">Customer</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          className="rounded border px-3 py-2"
          placeholder="Phone"
          value={value.phone || ""}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
        />
        <input
          className="rounded border px-3 py-2"
          placeholder="Name"
          value={value.name || ""}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <input
        className="rounded border px-3 py-2 mt-2"
        placeholder="Address"
        value={value.address || ""}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
      />
      <div className="mt-2 text-xs text-gray-500">
        Tip: Type phone. If a customer exists, name & address auto-fill.
      </div>
    </div>
  );
}

export default POSCustomerBox;
