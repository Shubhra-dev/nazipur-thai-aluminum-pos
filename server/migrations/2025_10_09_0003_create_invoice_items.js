export async function up(knex) {
  const exists = await knex.schema.hasTable("invoice_items");
  if (exists) return;
  await knex.schema.createTable("invoice_items", (t) => {
    t.increments("id").primary();
    t.integer("invoice_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("invoices")
      .onDelete("CASCADE");
    t.integer("variant_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("variants");
    t.string("sku").notNullable();
    t.string("product_name").notNullable();
    t.string("product_type").notNullable();
    t.string("variant_label");
    t.string("uom").notNullable(); // base | alt
    t.decimal("qty", 12, 3).notNullable().defaultTo(0);
    t.decimal("base_qty", 12, 3).notNullable().defaultTo(0);
    t.decimal("unit_price", 12, 2).notNullable().defaultTo(0);
    t.decimal("line_total", 12, 2).notNullable().defaultTo(0);
    t.decimal("cost_at_sale", 12, 2).notNullable().defaultTo(0);
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("updated_at").defaultTo(knex.fn.now());
  });
}
export async function down(knex) {
  await knex.schema.dropTableIfExists("invoice_items");
}
