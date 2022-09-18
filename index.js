const express = require("express");
const { middleware } = require("@line/bot-sdk");

const config = require("./config");

const controller = require("./controller");

const app = express();

app.use(middleware(config));

app.post("/", controller);

app.use((_req, res) => {
  return res.sendStatus(404);
});

app.listen(config.port, () => {
  console.log(`MiniBot is running on ${config.port}`);
});
