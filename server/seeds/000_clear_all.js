export async function seed(knex) {
  await knex("restocks").del();
  await knex("variants").del();
  await knex("products").del();
}
