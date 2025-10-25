import bcrypt from "bcryptjs";

/** Seed one admin (username: admin, password: admin123) and one salesman */
export async function seed(knex) {
  const rows = await knex("users").select("id").limit(1);
  if (rows.length) return;

  const adminHash = bcrypt.hashSync("admin123", 10);
  const salesHash = bcrypt.hashSync("sales123", 10);

  await knex("users").insert([
    {
      name: "System Admin",
      username: "admin",
      password_hash: adminHash,
      role: "admin",
      active: true,
    },
    {
      name: "Default Salesman",
      username: "sales",
      password_hash: salesHash,
      role: "salesman",
      active: true,
    },
  ]);
}
