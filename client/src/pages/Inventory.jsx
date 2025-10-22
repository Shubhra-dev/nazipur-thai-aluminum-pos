import React, { useEffect, useState } from "react";
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
  const [openId, setOpenId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    type: "Glass",
    category: "",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await apiGet("/products");
      setList(res.data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <Tabs tabs={["Products", "Low Stock"]} current={tab} onChange={setTab} />

      {tab === "Products" && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-md border bg-black text-white"
            >
              Add Product
            </button>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={() => setOpenId(p.id)}
                />
              ))}
            </div>
          )}

          <ProductPanel
            productId={openId}
            open={!!openId}
            onClose={(changed) => {
              setOpenId(null);
              if (changed) load();
            }}
          />
        </>
      )}

      {tab === "Low Stock" && <LowStockTable />}

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
