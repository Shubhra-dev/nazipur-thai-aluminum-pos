export async function up(knex) {
  await knex.schema.createTable("restocks", (t) => {
    t.increments("id").primary();
    t.integer("variant_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("variants")
      .onDelete("CASCADE");
    t.decimal("qty_base", 12, 3).notNullable(); // can be negative for adjustments
    t.string("note");
    t.decimal("cost_per_unit", 12, 2).notNullable().defaultTo(0.0);
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("restocks");
}
