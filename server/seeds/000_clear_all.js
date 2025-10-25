/**
 * Hard reset seed: clears all transactional data in the correct FK order.
 * Safe on MySQL/MariaDB: we temporarily disable FK checks and only delete
 * from tables that actually exist.
 */
export async function seed(knex) {
  // helper: delete from table if it exists
  async function delIfExists(table) {
    const exists = await knex.schema.hasTable(table);
    if (exists) {
      await knex(table).del();
    }
  }

  // Turn off FK checks to avoid dependency errors during bulk delete
  await knex.raw("SET FOREIGN_KEY_CHECKS = 0");

  // CHILD → PARENT order
  await delIfExists("due_payments"); // depends on invoices
  await delIfExists("return_items"); // depends on returns + invoice_items/variants
  await delIfExists("returns"); // depends on invoices
  await delIfExists("invoice_items"); // depends on invoices + variants
  await delIfExists("invoices"); // depends on customers
  await delIfExists("restocks"); // depends on variants
  await delIfExists("variants"); // depends on products
  await delIfExists("products");
  await delIfExists("customers");
  await delIfExists("users"); // optional: clear before re-seeding users

  // Re-enable FK checks
  await knex.raw("SET FOREIGN_KEY_CHECKS = 1");
}
