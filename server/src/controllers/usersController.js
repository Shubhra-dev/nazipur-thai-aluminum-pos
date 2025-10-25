import knex from "../db/knex.js";
import bcrypt from "bcryptjs";

/**
 * GET /api/users?q=&page=&page_size=
 */
export async function listUsers(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.page_size || 10))
    );
    const q = (req.query.q || "").trim();

    const base = knex("users").modify((qb) => {
      if (q) {
        qb.whereILike("name", `%${q}%`).orWhereILike("username", `%${q}%`);
      }
    });

    const [{ cnt }] = await base
      .clone()
      .clearSelect()
      .countDistinct({ cnt: "id" });

    const rows = await base
      .clone()
      .select("id", "name", "username", "role", "active", "created_at")
      .orderBy("created_at", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    res.json({
      success: true,
      data: rows,
      pagination: { page, page_size: pageSize, total: Number(cnt || 0) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users
 * body: { name, username, password, role, active }
 */
export async function createUser(req, res, next) {
  try {
    const {
      name,
      username,
      password,
      role = "salesman",
      active = true,
    } = req.body || {};
    if (!name || !username || !password) {
      return res
        .status(400)
        .json({ error: true, message: "Missing required fields" });
    }
    const exists = await knex("users").where({ username }).first();
    if (exists) {
      return res
        .status(409)
        .json({ error: true, message: "Username already exists" });
    }
    const hash = bcrypt.hashSync(String(password), 10);
    const [id] = await knex("users").insert({
      name,
      username,
      password_hash: hash,
      role,
      active: !!active,
    });
    const created = await knex("users")
      .select("id", "name", "username", "role", "active", "created_at")
      .where({ id })
      .first();
    res.json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:id
 * body: { name?, username?, password?, role?, active? }
 */
export async function updateUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    const patch = {};
    const { name, username, password, role, active } = req.body || {};

    if (name != null) patch.name = name;
    if (username != null) patch.username = username;
    if (role != null) patch.role = role;
    if (active != null) patch.active = !!active;
    if (password) patch.password_hash = bcrypt.hashSync(String(password), 10);

    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Nothing to update" });
    }
    await knex("users").where({ id }).update(patch);
    const updated = await knex("users")
      .select("id", "name", "username", "role", "active", "created_at")
      .where({ id })
      .first();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/users/:id
 */
export async function deleteUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    await knex("users").where({ id }).del();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
