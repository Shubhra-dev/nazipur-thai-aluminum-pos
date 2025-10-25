import knex from "../db/knex.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * POST /api/auth/login
 * body: { username, password }
 * returns: { token, user: { id, name, username, role } }
 * Note: Frontend-only RBAC. Token is opaque (not verified server-side later).
 */
export async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: true, message: "Missing credentials" });
    }
    const user = await knex("users").where({ username }).first();
    if (!user || !user.active) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid username or inactive user" });
    }
    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid credentials" });
    }
    const token = crypto.randomBytes(24).toString("hex");
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    // Frontend stores user; this endpoint is optional (kept minimal)
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
