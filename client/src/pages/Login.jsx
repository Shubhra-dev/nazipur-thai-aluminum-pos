import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { apiPost } from "../api.js";
import { loginSuccess } from "../store/authSlice.js";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [see, setSee] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  async function submit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiPost("/auth/login", { username, password });
      dispatch(loginSuccess({ token: res.token, user: res.user }));
    } catch (e) {
      alert(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border bg-white p-6 space-y-4"
      >
        <h1 className="text-xl font-bold text-center">
          Nazipur Thai POS — Login
        </h1>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Username</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Password</label>
          <div className="relative">
            <input
              className="w-full rounded border px-3 py-2"
              type={see ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {!see && (
              <Eye
                onClick={() => setSee(true)}
                className="absolute top-1/2 -translate-y-1/2 transform right-2"
              />
            )}
            {see && (
              <EyeOff
                onClick={() => setSee(false)}
                className="absolute top-1/2 -translate-y-1/2 transform right-2"
              />
            )}
          </div>
        </div>
        <button
          className="w-full rounded-md border px-3 py-2"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
