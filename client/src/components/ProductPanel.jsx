import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { apiGet, apiDelete } from "../api.js";
import VariantFormRow from "./VariantFormRow.jsx";
import RestockModal from "./RestockModal.jsx";

function renderHeaders(product) {
  const common = (
    <>
      <th className="p-2">SKU</th>
      <th className="p-2">Label</th>
    </>
  );

  if (product.type === "Glass") {
    return (
      <>
        {common}
        <th className="p-2">Thickness</th>
        <th className="p-2">Width</th>
        <th className="p-2">Height</th>
      </>
    );
  }
  if (product.type === "Thai Aluminum") {
    return (
      <>
        {common}
        <th className="p-2">Color</th>
        <th className="p-2">Rod ft</th>
      </>
    );
  }
  if (product.type === "SS Pipe") {
    return (
      <>
        {common}
        <th className="p-2">Thickness</th>
        <th className="p-2">Pipe ft</th>
      </>
    );
  }
  return <>{common}</>;
}

function renderFooters() {
  return (
    <>
      <th className="p-2">On Hand</th>
      <th className="p-2">Cost</th>
      <th className="p-2">Base Price</th>
      <th className="p-2">Alt Price</th>
      <th className="p-2">Low Stock</th>
      <th className="p-2">Active</th>
      <th className="p-2">Actions</th>
    </>
  );
}

function groupKeyFor(product, v) {
  switch (product.type) {
    case "Glass":
      return v.thickness_mm ? `${Number(v.thickness_mm)}mm` : "Ungrouped";
    case "SS Pipe":
      return v.thickness_mm ? `${Number(v.thickness_mm)}mm` : "Ungrouped";
    case "Thai Aluminum":
      return v.group_name || "Default";
    default:
      return "Default";
  }
}

function ProductPanel({ productId, open, onClose }) {
  const [data, setData] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [addingNew, setAddingNew] = useState(null); // { group: string } | null
  const [groupInput, setGroupInput] = useState("");
  const [manualGroups, setManualGroups] = useState([]); // groups created via UI but not yet persisted

  async function load() {
    const res = await apiGet(`/products/${productId}`);
    setData(res.data);
  }

  useEffect(() => {
    if (open) load();
  }, [open, productId]);

  const product = data?.product;

  const grouped = useMemo(() => {
    if (!data) return {};
    const map = {};
    for (const v of data.variants) {
      const k = groupKeyFor(data.product, v);
      if (!map[k]) map[k] = [];
      map[k].push(v);
    }
    // Include any manual groups even if empty
    for (const g of manualGroups) {
      if (!map[g]) map[g] = [];
    }
    // For Thai/Others when there are zero variants and zero groups, we’ll render a direct section below.
    return map;
  }, [data, manualGroups]);

  function startAddVariant(groupKey) {
    setAddingNew({ group: groupKey });
  }

  function cancelAddVariant() {
    setAddingNew(null);
  }

  function addGroup() {
    const name = (groupInput || "").trim();
    if (!name) return;
    if (!manualGroups.includes(name)) {
      setManualGroups((prev) => [...prev, name]);
    }
    setGroupInput("");
  }

  async function deleteProduct() {
    if (!confirm("Delete this product and all its variants?")) return;
    try {
      await apiDelete(`/products/${productId}`);
      onClose(true);
    } catch (e) {
      alert(e.message);
    }
  }

  if (!open) return null;

  if (!data) {
    return (
      <Modal open={open} onClose={() => onClose(false)} title="Product Panel">
        <div>Loading...</div>
      </Modal>
    );
  }

  const productUsesGroups =
    product.type === "Glass" ||
    product.type === "SS Pipe" ||
    product.type === "Thai Aluminum";
  const existingGroupKeys = Object.keys(grouped);
  const hasAnyGroup =
    existingGroupKeys.length > 0 &&
    !(
      existingGroupKeys.length === 1 &&
      existingGroupKeys[0] === "Default" &&
      grouped["Default"]?.length === 0
    );

  const shouldShowDirectSection =
    (product.type === "Thai Aluminum" || product.type === "Others") &&
    !hasAnyGroup &&
    data.variants.length >= 0; // show direct variants block when no explicit groups

  return (
    <>
      <Modal
        open={open}
        onClose={() => onClose(false)}
        title={`${product.name}`}
        maxWidth="max-w-6xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
            <button
              onClick={() => setShowRestock(true)}
              className="px-3 py-1 rounded-md border"
            >
              Restock / Adjust
            </button>
          </div>
          <button
            onClick={deleteProduct}
            className="px-3 py-1 rounded-md border bg-red-600 text-white"
          >
            Delete Product
          </button>
        </div>

        {/* Add Group — visible for Glass, SS Pipe, Thai (optional groups) */}
        {productUsesGroups && (
          <div className="mb-4 flex items-center gap-2">
            <input
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              type="text"
              placeholder={
                product.type === "Glass" || product.type === "SS Pipe"
                  ? "Enter group (e.g., 5mm, 8mm)"
                  : "Enter group (optional, e.g., Door Frame)"
              }
              className="rounded border px-3 py-2"
            />
            <button
              onClick={addGroup}
              className="px-3 py-1 rounded-md border bg-teal-800 text-white"
            >
              Add Group
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Direct Variants section for Thai/Others when no groups exist */}
          {shouldShowDirectSection && (
            <div className="rounded-xl border bg-white overflow-x-auto">
              <div className="flex items-center justify-between bg-gray-50 p-3">
                <div className="font-semibold">Variants</div>
                <button
                  onClick={() => startAddVariant("Default")}
                  className="px-3 py-1 rounded-md border bg-black text-white"
                >
                  Add Variant
                </button>
              </div>
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    {renderHeaders(product)}
                    {renderFooters()}
                  </tr>
                </thead>
                <tbody>
                  {data.variants.map((v) => (
                    <VariantFormRow
                      key={v.id}
                      product={product}
                      variant={v}
                      onSaved={load}
                      showInactive={showInactive}
                    />
                  ))}
                  {addingNew && addingNew.group === "Default" && (
                    <VariantFormRow
                      product={product}
                      variant={{ id: null }}
                      isNew={true}
                      groupName={"Default"}
                      onCancel={cancelAddVariant}
                      onSaved={() => {
                        cancelAddVariant();
                        load();
                      }}
                      showInactive={true}
                    />
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Grouped sections */}
          {Object.keys(grouped)
            .filter(
              (g) =>
                !(
                  shouldShowDirectSection &&
                  g === "Default" &&
                  grouped[g].length === 0
                )
            )
            .map((g) => (
              <div
                key={g}
                className="rounded-xl border bg-white overflow-x-auto"
              >
                <div className="flex items-center justify-between bg-gray-50 p-3">
                  <div className="font-semibold text-xl text-amber-700">
                    {g}
                  </div>
                  <button
                    onClick={() => startAddVariant(g)}
                    className="px-3 py-1 rounded-md border bg-teal-900 text-white"
                  >
                    Add Variant
                  </button>
                </div>
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      {renderHeaders(product)}
                      {renderFooters()}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[g]?.map((v) => (
                      <VariantFormRow
                        key={v.id}
                        product={product}
                        variant={v}
                        onSaved={load}
                        showInactive={showInactive}
                      />
                    ))}
                    {addingNew && addingNew.group === g && (
                      <VariantFormRow
                        product={product}
                        variant={{ id: null }}
                        isNew={true}
                        groupName={g}
                        onCancel={cancelAddVariant}
                        onSaved={() => {
                          cancelAddVariant();
                          load();
                        }}
                        showInactive={true}
                      />
                    )}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </Modal>

      <RestockModal
        open={showRestock}
        onClose={(changed) => {
          setShowRestock(false);
          if (changed) load();
        }}
        product={product}
      />
    </>
  );
}

export default ProductPanel;
