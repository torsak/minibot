const line = require("@line/bot-sdk");

const config = require("./config");

const client = new line.Client(config);

const saveBodyWeight = (bodyWeight, userId, replyToken) => {
  // TODO: Save to database
  console.log({ bodyWeight, userId });
};

const handleCommand = (command, userId, replyToken) => {
  console.log({ command, userId, replyToken });

  return client.replyMessage(replyToken, [{ type: "text", text: "Done!" }]);
};

const handleText = (text, userId, replyToken) => {
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

const handleMessage = (message, userId, replyToken) => {
  const { type } = message;

  switch (type) {
    case "text":
      return handleText(message.text, userId, replyToken);
    default:
      throw new Error(`Unknown message: ${JSON.stringify(message)}`);
  }
};

const handleEvent = (event) => {
  const {
    webhookEventId,
    timestamp,
    type,
    replyToken,
    deliveryContext,
    source,
  } = event;

  if (deliveryContext.isRedelivery) {
    // TODO: See if event is already handled
    console.log({ webhookEventId, timestamp });
    return;
  }

  switch (type) {
    case "message":
      return handleMessage(event.message, source.userId, replyToken);
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
    console.log(error);
    return res.sendStatus(500);
  }
};
