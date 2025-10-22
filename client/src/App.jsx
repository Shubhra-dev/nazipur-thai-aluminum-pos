import React, { useState } from "react";
import POS from "./pages/POS.jsx";
import Inventory from "./pages/Inventory.jsx";
import Sales from "./pages/Sales.jsx";
import SalesReport from "./pages/SalesReport.jsx";
import Returns from "./pages/Returns.jsx";
import RestockLogs from "./pages/RestockLogs.jsx";
import Dues from "./pages/Dues.jsx"; // NEW

function App() {
  const [tab, setTab] = useState("POS");

  const btn = (t) =>
    `px-4 py-2 rounded-md border ${
      tab === t ? "bg-black text-white" : "bg-white"
    }`;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Thai POS</h1>
        <nav className="flex gap-3">
          <button onClick={() => setTab("POS")} className={btn("POS")}>
            POS
          </button>
          <button
            onClick={() => setTab("Inventory")}
            className={btn("Inventory")}
          >
            Inventory
          </button>
          <button onClick={() => setTab("Sales")} className={btn("Sales")}>
            Sales
          </button>
          <button onClick={() => setTab("Reports")} className={btn("Reports")}>
            Reports
          </button>
          <button onClick={() => setTab("Returns")} className={btn("Returns")}>
            Returns
          </button>
          <button onClick={() => setTab("Dues")} className={btn("Dues")}>
            Dues
          </button>{" "}
          {/* NEW */}
          <button
            onClick={() => setTab("Restock Logs")}
            className={btn("Restock Logs")}
          >
            Restock Logs
          </button>
        </nav>
      </header>
      {tab === "POS" && <POS />}
      {tab === "Inventory" && <Inventory />}
      {tab === "Sales" && <Sales />}
      {tab === "Reports" && <SalesReport />}
      {tab === "Returns" && <Returns />}
      {tab === "Dues" && <Dues />} {/* NEW */}
      {tab === "Restock Logs" && <RestockLogs />}
    </div>
  );
}

export default App;
