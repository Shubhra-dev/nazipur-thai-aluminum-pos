/**
 * Idempotent migration:
 * - Create returns / return_items ONLY if they don't exist
 * - Add invoices.revised_of_id / invoices.remark ONLY if they don't exist
 * - Safe down: only remove added invoice columns (do not drop returns tables)
 */

export async function up(knex) {
  // returns
  const hasReturns = await knex.schema.hasTable("returns");
  if (!hasReturns) {
    await knex.schema.createTable("returns", (t) => {
      t.increments("id").primary();
      t.string("return_no").notNullable().unique();
      t.integer("invoice_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("invoices");
      t.decimal("subtotal_refund", 12, 2).notNullable().defaultTo(0);
      t.string("note").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }

  // return_items
  const hasReturnItems = await knex.schema.hasTable("return_items");
  if (!hasReturnItems) {
    await knex.schema.createTable("return_items", (t) => {
      t.increments("id").primary();
      t.integer("return_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("returns")
        .onDelete("CASCADE");
      t.integer("invoice_item_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("invoice_items");
      t.integer("variant_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("variants");
      t.string("uom").notNullable(); // sheet | sqft | bar | ft | pipe | piece
      t.decimal("qty", 12, 3).notNullable(); // entered qty in the chosen UoM
      t.decimal("base_qty", 12, 3).notNullable(); // converted to base UoM
      t.decimal("refund_amount", 12, 2).notNullable();
      t.string("note").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }

  // invoices: revised_of_id, remark
  const hasRevisedOf = await knex.schema.hasColumn("invoices", "revised_of_id");
  const hasRemark = await knex.schema.hasColumn("invoices", "remark");
  if (!hasRevisedOf || !hasRemark) {
    await knex.schema.alterTable("invoices", (t) => {
      if (!hasRevisedOf) {
        t.integer("revised_of_id")
          .unsigned()
          .nullable()
          .references("id")
          .inTable("invoices");
      }
      if (!hasRemark) {
        t.string("remark").nullable();
      }
    });
  }
}

export async function down(knex) {
  // Only remove the columns we added; DO NOT drop returns tables here to avoid accidental data loss.
  const hasRevisedOf = await knex.schema.hasColumn("invoices", "revised_of_id");
  const hasRemark = await knex.schema.hasColumn("invoices", "remark");
  if (hasRevisedOf || hasRemark) {
    await knex.schema.alterTable("invoices", (t) => {
      if (hasRemark) t.dropColumn("remark");
      if (hasRevisedOf) t.dropColumn("revised_of_id");
    });
  }

  // Intentionally not dropping 'returns' or 'return_items' because they may have been
  // created by another migration (e.g., 20251010_create_returns.js) and may contain data.
}
