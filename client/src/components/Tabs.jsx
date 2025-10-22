import React from "react";

function Tabs({ tabs, current, onChange }) {
  return (
    <div className="mb-4 flex gap-2">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-2 rounded-md border ${
            current === t ? "bg-black text-white" : "bg-white"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
