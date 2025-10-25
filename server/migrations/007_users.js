/**
 * Users table for app login.
 * roles: 'admin' | 'salesman'
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("users");
  if (exists) return;

  await knex.schema.createTable("users", (t) => {
    t.increments("id").unsigned().primary();
    t.string("name").notNullable();
    t.string("username").notNullable().unique();
    t.string("password_hash").notNullable();
    t.enu("role", ["admin", "salesman"]).notNullable().defaultTo("salesman");
    t.boolean("active").notNullable().defaultTo(true);
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("users");
}
