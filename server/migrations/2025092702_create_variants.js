export async function up(knex) {
  await knex.schema.createTable("variants", (t) => {
    t.increments("id").primary();
    t.integer("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
    t.string("sku").notNullable().unique();
    t.string("size_label"); // e.g., "24x36" for glass, custom sizes, or name for Others
    t.decimal("thickness_mm", 12, 3);
    t.decimal("width_in", 12, 3);
    t.decimal("height_in", 12, 3);
    t.string("color");
    t.decimal("rod_length_ft", 12, 3); // Thai Aluminum bar length (18.5 or 21)
    t.decimal("pipe_length_ft", 12, 3); // SS Pipe fixed 20
    t.decimal("price_base", 12, 2);
    t.decimal("price_alt", 12, 2).nullable(); // Others must be null
    t.decimal("cost_price", 12, 2).notNullable().defaultTo(0.0);
    t.decimal("on_hand", 12, 3).notNullable().defaultTo(0.0); // base units stock
    t.decimal("low_stock_threshold", 12, 3).notNullable().defaultTo(0.0);
    t.boolean("active").notNullable().defaultTo(true);
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("updated_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("variants");
}
