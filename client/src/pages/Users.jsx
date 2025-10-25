import React, { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "../api.js";

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB");

export default function Users() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // row or null
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "salesman",
    active: true,
  });

  async function load(p = page) {
    const params = new URLSearchParams({
      q,
      page: p,
      page_size: pageSize,
    });
    const res = await apiGet(`/users?${params.toString()}`);
    setRows(res.data || []);
    setTotal(res.pagination?.total || 0);
    setPage(p);
  }

  useEffect(() => {
    load(1);
  }, [q]);

  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total]
  );

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      username: "",
      password: "",
      role: "salesman",
      active: true,
    });
    setModalOpen(true);
  }
  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name,
      username: row.username,
      password: "",
      role: row.role,
      active: !!row.active,
    });
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
  }

  async function save() {
    try {
      if (!form.name || !form.username || (!editing && !form.password)) {
        alert("Name, username and password (for new user) are required.");
        return;
      }
      if (editing) {
        const body = {
          name: form.name,
          username: form.username,
          role: form.role,
          active: form.active,
        };
        if (form.password) body.password = form.password;
        await apiPut(`/users/${editing.id}`, body);
      } else {
        await apiPost("/users", {
          ...form,
        });
      }
      closeModal();
      await load(1);
    } catch (e) {
      alert(e?.message || "Failed");
    }
  }

  async function remove(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await apiDelete(`/users/${id}`);
      await load(page);
    } catch (e) {
      alert(e?.message || "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-3 flex items-end gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Search</label>
          <input
            className="rounded border px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name or username"
          />
        </div>
        <div className="ml-auto">
          <button className="px-3 py-2 rounded-md border" onClick={openCreate}>
            Add User
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Username</th>
              <th className="p-2">Role</th>
              <th className="p-2">Active</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.username}</td>
                <td className="p-2 capitalize">{r.role}</td>
                <td className="p-2">{r.active ? "Yes" : "No"}</td>
                <td className="p-2">{fmtDate(r.created_at)}</td>
                <td className="p-2 flex gap-2">
                  <button
                    className="px-3 py-1 rounded border"
                    onClick={() => openEdit(r)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1 rounded border"
                    onClick={() => remove(r.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-center text-gray-500">
                  No users
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Page {page} / {pages} — {total} record(s)
        </div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Prev
          </button>
          <button
            disabled={page >= pages}
            onClick={() => load(page + 1)}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-xl border bg-white p-4 space-y-3">
            <div className="text-lg font-semibold">
              {editing ? "Edit User" : "Add User"}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Name</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Username
              </label>
              <input
                className="w-full rounded border px-3 py-2"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Password {editing ? "(leave blank to keep)" : ""}
              </label>
              <input
                className="w-full rounded border px-3 py-2"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Role</label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="admin">admin</option>
                  <option value="salesman">salesman</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <label className="text-xs text-gray-600">Active</label>
                <input
                  type="checkbox"
                  className="ml-2"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={closeModal}>
                Cancel
              </button>
              <button className="px-3 py-1 rounded border" onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
