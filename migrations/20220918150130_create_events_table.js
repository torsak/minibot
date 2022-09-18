exports.up = function (knex) {
  return knex.schema.createTable("events", (t) => {
    t.increments("id").primary();
    t.text("event").notNullable();
    t.timestamp("created_at", { useTz: false }).defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("events");
};
