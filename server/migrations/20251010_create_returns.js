/**
 * Returns module schema:
 * - returns
 * - return_items
 * - invoices: add revised_of_id, remark
 *
 * This file name must match what Knex expects: 20251010_create_returns.js
 */

export async function up(knex) {
  // ----- returns -----
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

  // ----- return_items -----
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
      t.string("uom").notNullable(); // 'sheet' | 'sqft' | 'bar' | 'ft' | 'pipe' | 'piece'
      t.decimal("qty", 12, 3).notNullable(); // qty entered in uom
      t.decimal("base_qty", 12, 3).notNullable(); // converted to base uom
      t.decimal("refund_amount", 12, 2).notNullable();
      t.string("note").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }

  // ----- invoices column additions -----
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
  // Drop added columns if they exist
  const hasRevisedOf = await knex.schema.hasColumn("invoices", "revised_of_id");
  const hasRemark = await knex.schema.hasColumn("invoices", "remark");
  if (hasRevisedOf || hasRemark) {
    await knex.schema.alterTable("invoices", (t) => {
      if (hasRemark) t.dropColumn("remark");
      if (hasRevisedOf) t.dropColumn("revised_of_id");
    });
  }

  // Drop tables in reverse order
  const hasReturnItems = await knex.schema.hasTable("return_items");
  if (hasReturnItems) {
    await knex.schema.dropTable("return_items");
  }
  const hasReturns = await knex.schema.hasTable("returns");
  if (hasReturns) {
    await knex.schema.dropTable("returns");
  }
}
