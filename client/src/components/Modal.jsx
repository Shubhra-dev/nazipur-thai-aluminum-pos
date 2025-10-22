import React from "react";

function Modal({ open, onClose, title, children, maxWidth = "max-w-5xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div
        className={`relative z-50 w-full ${maxWidth} bg-white rounded-2xl shadow-lg border`}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-2xl py-2 font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded-md border"
          >
            Close
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
