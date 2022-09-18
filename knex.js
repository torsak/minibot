const knexfile = require("./knexfile");

let knexInstance;

module.exports = () => {
  if (knexInstance) {
    return knexInstance;
  }

  knexInstance = require("knex")(knexfile);

  return knexInstance;
};
