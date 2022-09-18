const line = require("@line/bot-sdk");

const config = require("./config");
const knex = require("./knex")();

const client = new line.Client(config);

const saveBodyWeight = async (bodyWeightKG, userId, replyToken) => {
  const [result] = await knex("user_weights")
    .insert({
      user_id: userId,
      weight_kg: bodyWeightKG,
    })
    .returning("*");
};

const transformUserWeights = (userWeights) => {
  return userWeights
    .sort((a, b) => a.id - b.id)
    .map((item) => item.weight_kg)
    .join(", ");
};

const handleMyStatCommand = async (userId, replyToken) => {
  const userWeights = await knex("user_weights")
    .select(["id", "weight_kg"])
    .where("user_id", userId)
    .orderBy("created_at", "desc")
    .limit(7);

  return client.replyMessage(replyToken, [
    { type: "text", text: transformUserWeights(userWeights) },
  ]);
};

const handleCommand = (command, userId, replyToken) => {
  switch (command) {
    case "mystat":
      return handleMyStatCommand(userId, replyToken);
    default:
      console.error(`Unknown command: ${command}`);
  }
};

const handleText = async (text, userId, replyToken) => {
  const isCommand = text[0] === "/";
  if (isCommand) {
    return handleCommand(text.substr(1), userId, replyToken);
  }

  const bodyWeightRegex = /(\d{2,3}\.\d{2})/i;
  const result = text.match(bodyWeightRegex);
  if (result) {
    const bodyWeight = parseFloat(result[1]);
    return saveBodyWeight(bodyWeight, userId, replyToken);
  }
};

const handleMessage = (message, lineUserId, replyToken) => {
  const { type } = message;

  switch (type) {
    case "text":
      return handleText(message.text, lineUserId, replyToken);
    default:
      throw new Error(`Unknown message: ${JSON.stringify(message)}`);
  }
};

const firstOrCreateUser = async (lineUserId) => {
  const user = await knex("users").where("line_user_id", lineUserId).first();
  if (user) {
    return user;
  }

  return knex("users")
    .insert({
      line_user_id: lineUserId,
    })
    .returning("*");
};

const handleEvent = async (event) => {
  const { webhookEventId, type, replyToken, deliveryContext, source } = event;

  if (deliveryContext.isRedelivery) {
    const eventExists = await knex("events")
      .whereRaw("json_extract(event, '$.webhookEventId') = ?", [webhookEventId])
      .first();
    if (eventExists) {
      console.log(`skip event ${webhookEventId}`);
      return;
    }
  }

  await knex("events").insert({ event }).returning("*");

  const user = await firstOrCreateUser(source.userId);

  switch (type) {
    case "message":
      return handleMessage(event.message, user.id, replyToken);
    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
};

module.exports = async (req, res) => {
  try {
    const { destination, events } = req.body;
    if (destination !== config.botUserID) {
      return res.sendStatus(401);
    }

    if (!Array.isArray(req.body.events)) {
      return res.sendStatus(500);
    }

    const promises = events.map((event) => handleEvent(event));
    await Promise.all(promises);

    return res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
};
