// Knex migration: make restocks.cost_per_unit NOT NULL DEFAULT 0.00
export async function up(knex) {
  const hasTable = await knex.schema.hasTable("restocks");
  if (!hasTable) return;

  // MySQL/MariaDB require MODIFY COLUMN to set default/not null
  await knex.schema.alterTable("restocks", (t) => {
    t.decimal("cost_per_unit", 12, 2).notNullable().defaultTo(0.0).alter();
  });
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("restocks");
  if (!hasTable) return;

  // Revert to nullable (if you had it previously)
  await knex.schema.alterTable("restocks", (t) => {
    t.decimal("cost_per_unit", 12, 2).nullable().defaultTo(null).alter();
  });
}
