export async function up(knex) {
  const exists = await knex.schema.hasTable("customers");
  if (exists) return;
  await knex.schema.createTable("customers", (t) => {
    t.increments("id").primary();
    t.string("name").notNullable();
    t.string("phone").notNullable().unique();
    t.string("address");
  });
}
export async function down(knex) {
  await knex.schema.dropTableIfExists("customers");
}
