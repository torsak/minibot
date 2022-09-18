exports.up = function (knex) {
  return knex.schema.createTable("user_weights", (t) => {
    t.increments("id").primary();
    t.integer("user_id")
      .references("users.id")
      .notNullable()
      .onDelete("CASCADE");
    t.decimal("weight_kg").notNullable();
    t.timestamp("created_at", { useTz: false }).defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("user_weights");
};
