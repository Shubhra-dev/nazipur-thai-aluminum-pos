// Make return_items.uom a flexible VARCHAR so 'sqft'/'ft' work.
// Safe on any existing schema (ENUM or VARCHAR).

export async function up(knex) {
  // Use raw to be robust even if the original type was ENUM
  await knex.raw(`
    ALTER TABLE return_items
    MODIFY COLUMN uom VARCHAR(16) NOT NULL
  `);
}

export async function down(knex) {
  // Rollback to a conservative ENUM (if you really need it).
  // Includes all units we use in this system.
  await knex.raw(`
    ALTER TABLE return_items
    MODIFY COLUMN uom ENUM('sheet','sqft','bar','ft','pipe','piece') NOT NULL
  `);
}
