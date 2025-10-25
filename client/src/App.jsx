import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./store/index.js";
import { logout, touch } from "./store/authSlice.js";

import POS from "./pages/POS.jsx";
import Inventory from "./pages/Inventory.jsx";
import RestockLogs from "./pages/RestockLogs.jsx";
import Sales from "./pages/Sales.jsx";
import SalesReport from "./pages/SalesReport.jsx";
import Returns from "./pages/Returns.jsx";
import Dues from "./pages/Dues.jsx";
import Users from "./pages/Users.jsx";
import Login from "./pages/Login.jsx";
import Protected from "./components/Protected.jsx";

const INACTIVITY_MS = 20 * 60 * 1000; // 20 minutes

function AppShell() {
  const [tab, setTab] = useState("POS");
  const [navOpen, setNavOpen] = useState(false);

  const dispatch = useDispatch();
  const { isAuthenticated, user, lastActive } = useSelector((s) => s.auth);
  const role = user?.role || "salesman";

  // Inactivity auto-logout
  useEffect(() => {
    let timer = null;

    function resetTimer() {
      dispatch(touch());
    }
    function schedule() {
      clearTimeout(timer);
      const remain = INACTIVITY_MS - (Date.now() - lastActive);
      timer = setTimeout(() => dispatch(logout()), Math.max(1000, remain));
    }

    if (isAuthenticated) {
      window.addEventListener("mousemove", resetTimer);
      window.addEventListener("keydown", resetTimer);
      window.addEventListener("click", resetTimer);
      schedule();
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, [isAuthenticated, lastActive, dispatch]);

  // Tabs by role
  const tabs = useMemo(() => {
    const base = [
      "POS",
      "Inventory",
      "Returns",
      "Sales",
      "Dues",
      "Restock Logs",
    ];
    return role === "admin" ? [...base, "Reports", "Users"] : base;
  }, [role]);

  // Close sidebar on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const chooseTab = useCallback(
    (t) => {
      setTab(t);
      setNavOpen(false); // auto-close on selection
    },
    [setTab, setNavOpen]
  );

  if (!isAuthenticated) return <Login />;

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6">
      {/* Top bar */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger */}
          <button
            aria-label="Open menu"
            onClick={() => setNavOpen(true)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-md border bg-white hover:bg-gray-50"
          >
            {/* simple hamburger icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6h18M3 12h18M3 18h18"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">
            Nazipur Thai <span className="hidden sm:inline">POS</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-700">
            {user?.name} <span className="text-gray-500">({user?.role})</span>
          </div>
          <button
            onClick={() => dispatch(logout())}
            className="ml-2 px-3 py-2 rounded-md border bg-white hover:bg-gray-50"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Slide-in left drawer */}
      <div
        className={`fixed inset-0 z-40 ${navOpen ? "" : "pointer-events-none"}`}
      >
        {/* backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${
            navOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setNavOpen(false)}
        />
        {/* panel */}
        <aside
          className={`absolute left-0 top-0 h-full w-72 bg-white shadow-xl transition-transform duration-200 ease-out
          ${navOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold">Menu</div>
            <button
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
              className="w-9 h-9 rounded-md border bg-white hover:bg-gray-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6l-12 12"
                  stroke="#000"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <nav className="p-2">
            {tabs.map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => chooseTab(t)}
                  className={`w-full text-left px-3 py-2 rounded-md mb-1 border transition
                    ${
                      active
                        ? "bg-black text-white border-black"
                        : "bg-white hover:bg-gray-50"
                    }`}
                >
                  {t}
                </button>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Main content */}
      {tab === "POS" && <POS />}
      {tab === "Inventory" && <Inventory />}
      {tab === "Restock Logs" && <RestockLogs />}
      {tab === "Returns" && <Returns />}
      {tab === "Sales" && <Sales />}
      {tab === "Dues" && <Dues />}

      <Protected
        roles="admin"
        fallback={<div className="text-sm text-gray-500">Not authorized.</div>}
      >
        {tab === "Reports" && <SalesReport />}
        {tab === "Users" && <Users />}
      </Protected>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppShell />
    </Provider>
  );
}
