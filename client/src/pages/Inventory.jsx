import React, { useEffect, useMemo, useState } from "react";
import Tabs from "../components/Tabs.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { apiGet, apiPost } from "../api.js";
import ProductPanel from "../components/ProductPanel.jsx";
import LowStockTable from "../components/LowStockTable.jsx";
import Modal from "../components/Modal.jsx";

function Inventory() {
  const [tab, setTab] = useState("Products");

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW: search + pagination state
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [total, setTotal] = useState(0);
  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total]
  );

  const [openId, setOpenId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    type: "Glass",
    category: "",
  });

  async function load(p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: p,
        page_size: pageSize,
        q,
      });
      const res = await apiGet(`/products?${params.toString()}`);
      setList(res.data || []);
      setTotal(res.pagination?.total || 0);
      setPage(p);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function createProduct() {
    if (!newProduct.name) {
      alert("Name required");
      return;
    }
    try {
      await apiPost("/products", {
        name: newProduct.name,
        type: newProduct.type,
        category: newProduct.category || newProduct.type,
      });
      setShowAdd(false);
      setNewProduct({ name: "", type: "Glass", category: "" });
      load(1);
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <Tabs tabs={["Products", "Low Stock"]} current={tab} onChange={setTab} />

      {tab === "Products" && (
        <>
          {/* Toolbar: search + add */}
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-gray-600 mb-1">
                Search (name / SKU)
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g., Clear Glass, GL-5MM..."
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-md border bg-black text-white"
            >
              Add Product
            </button>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : list.length === 0 ? (
            <div className="text-gray-600">No products found.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onClick={() => setOpenId(p.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {page} / {pages} — {total} product(s)
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded border disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => load(page - 1)}
                  >
                    Prev
                  </button>
                  <button
                    className="px-3 py-1 rounded border disabled:opacity-50"
                    disabled={page >= pages}
                    onClick={() => load(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          <ProductPanel
            productId={openId}
            open={!!openId}
            onClose={(changed) => {
              setOpenId(null);
              if (changed) load(page);
            }}
          />
        </>
      )}

      {tab === "Low Stock" && <LowStockTable />}

      {/* Add Product Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Product"
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <input
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct((s) => ({ ...s, name: e.target.value }))
            }
            placeholder="Product Name"
            className="w-full rounded border px-3 py-2"
          />
          <select
            value={newProduct.type}
            onChange={(e) =>
              setNewProduct((s) => ({ ...s, type: e.target.value }))
            }
            className="w-full rounded border px-3 py-2"
          >
            <option>Glass</option>
            <option>Thai Aluminum</option>
            <option>SS Pipe</option>
            <option>Others</option>
          </select>
          <input
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct((s) => ({ ...s, category: e.target.value }))
            }
            placeholder="Category"
            className="w-full rounded border px-3 py-2"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1 rounded-md border"
            >
              Cancel
            </button>
            <button
              onClick={createProduct}
              className="px-3 py-1 rounded-md border bg-black text-white"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Inventory;
