/**
 * Create table: due_payments
 * - Stores installments against invoices
 * - When a payment is recorded we also increase invoices.paid_amount by that amount
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("due_payments");
  if (!exists) {
    await knex.schema.createTable("due_payments", (t) => {
      t.increments("id").unsigned().primary();
      t.integer("invoice_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("invoices")
        .onDelete("CASCADE");
      t.decimal("amount", 12, 2).notNullable();
      t.string("receipt_no").notNullable().unique();
      t.string("note").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("due_payments");
}
