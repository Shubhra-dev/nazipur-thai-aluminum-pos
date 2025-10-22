export async function up(knex) {
  await knex.schema.createTable("products", (t) => {
    t.increments("id").primary();
    t.string("name").notNullable();
    t.string("type").notNullable(); // Glass | Thai Aluminum | SS Pipe | Others
    t.string("category").notNullable().defaultTo("General");
    t.boolean("active").notNullable().defaultTo(true);
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("updated_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("products");
}
