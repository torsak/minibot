const express = require("express");
const path = require("path");
const { middleware } = require("@line/bot-sdk");

const config = require("./config");
const controller = require("./controller");

const app = express();

const imageDir = path.join(__dirname, "public/users");
app.use("/users", express.static(imageDir));

app.use(middleware(config));
app.post("/", controller);

app.use((_req, res) => {
  return res.sendStatus(404);
});

app.listen(config.port, () => {
  console.log(`MiniBot is running on ${config.port}`);
});
