import knex from "../db/knex.js";

export async function findOrCreateByPhone(req, res, next) {
  try {
    const { phone, name, address } = req.body;
    if (!phone)
      return res
        .status(400)
        .json({ error: true, message: "phone is required" });

    let customer = await knex("customers").where({ phone }).first();
    if (!customer) {
      const [id] = await knex("customers").insert({
        name: name || "Walk-in",
        phone,
        address: address || null,
      });
      customer = await knex("customers").where({ id }).first();
    } else if (name || address) {
      await knex("customers")
        .where({ id: customer.id })
        .update({
          name: name || customer.name,
          address: address ?? customer.address,
        });
      customer = await knex("customers").where({ id: customer.id }).first();
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

export async function searchCustomers(req, res, next) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ success: true, data: [] });

    const rows = await knex("customers")
      .whereILike("name", `%${q}%`)
      .orWhereILike("phone", `%${q}%`)
      .limit(20);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}
