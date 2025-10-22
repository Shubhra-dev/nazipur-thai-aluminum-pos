import knexConfig from "../../knexfile.js";
import Knex from "knex";

const knex = Knex(knexConfig);

export default knex;
