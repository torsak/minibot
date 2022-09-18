exports.up = function (knex) {
  return knex.schema.createTable("users", (t) => {
    t.increments("id").primary();
    t.string("line_user_id").notNullable();
    t.timestamp("created_at", { useTz: false }).defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("users");
};
