export async function up(knex) {
  const exists = await knex.schema.hasTable("invoices");
  if (exists) return;
  await knex.schema.createTable("invoices", (t) => {
    t.increments("id").primary();
    t.string("invoice_no").notNullable().unique();
    t.integer("customer_id")
      .unsigned()
      .references("id")
      .inTable("customers")
      .onDelete("SET NULL");
    t.decimal("subtotal", 12, 2).notNullable().defaultTo(0);
    t.decimal("discount_bdt", 12, 2).notNullable().defaultTo(0);
    t.decimal("grand_total", 12, 2).notNullable().defaultTo(0);
    t.decimal("paid_amount", 12, 2).notNullable().defaultTo(0);
    t.string("status").notNullable(); // PAID|PARTIAL|UNPAID
    t.string("shop_name");
    t.string("shop_address");
    t.string("shop_phone");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}
export async function down(knex) {
  await knex.schema.dropTableIfExists("invoices");
}
