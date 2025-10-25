import { createSlice } from "@reduxjs/toolkit";

const LS_KEY = "thai_pos_auth_v1";

function loadFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveToLS(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

const initial = loadFromLS() || {
  isAuthenticated: false,
  token: null,
  user: null, // {id,name,username,role}
  lastActive: Date.now(),
};

const authSlice = createSlice({
  name: "auth",
  initialState: initial,
  reducers: {
    loginSuccess(state, action) {
      const { token, user } = action.payload;
      state.isAuthenticated = true;
      state.token = token;
      state.user = user;
      state.lastActive = Date.now();
      saveToLS(state);
    },
    logout(state) {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.lastActive = Date.now();
      saveToLS(state);
    },
    touch(state) {
      state.lastActive = Date.now();
      saveToLS(state);
    },
  },
});

export const { loginSuccess, logout, touch } = authSlice.actions;
export default authSlice.reducer;
export { LS_KEY };
