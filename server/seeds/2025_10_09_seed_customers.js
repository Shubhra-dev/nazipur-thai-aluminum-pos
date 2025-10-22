export async function seed(knex) {
  const existing = await knex("customers").first();
  if (existing) return;
  await knex("customers").insert([
    { name: "Walk-in", phone: "N/A", address: "" },
    { name: "Akij Bashir", phone: "01700000001", address: "Bogura" },
  ]);
}
