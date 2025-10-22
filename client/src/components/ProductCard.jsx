import React from "react";

function ProductCard({ product, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-white p-4 hover:shadow-md transition"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{product.name}</h4>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            product.active
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-gray-50"
          }`}
        >
          {product.active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-gray-500">Category</div>
          <div className="font-medium">{product.category}</div>
        </div>
        <div>
          <div className="text-gray-500">Variants</div>
          <div className="font-medium">{product.variant_count}</div>
        </div>
        <div>
          <div className="text-gray-500">Stock (base)</div>
          <div className="font-medium">
            {Number(product.stock_total || 0).toFixed(3)}
          </div>
        </div>
      </div>
    </button>
  );
}

export default ProductCard;
