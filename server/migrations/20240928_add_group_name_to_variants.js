/**
 * Adds group_name column for consistent grouping (Glass/SS by thickness; Thai via UI; Others = Default).
 */
export async function up(knex) {
  const exists = await knex.schema.hasColumn("variants", "group_name");
  if (!exists) {
    await knex.schema.alterTable("variants", (t) => {
      t.string("group_name").nullable().index();
    });
  }
}

export async function down(knex) {
  const exists = await knex.schema.hasColumn("variants", "group_name");
  if (exists) {
    await knex.schema.alterTable("variants", (t) => {
      t.dropColumn("group_name");
    });
  }
}
