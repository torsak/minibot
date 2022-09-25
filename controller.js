const line = require("@line/bot-sdk");
const { promises: fs } = require("fs");
const path = require("path");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: 400,
  height: 300,
  backgroundColor: "white",
});

const config = require("./config");
const knex = require("./knex")();

const client = new line.Client(config);

const saveBodyWeight = async (bodyWeightKG, userId) => {
  const [result] = await knex("user_weights")
    .insert({
      user_id: userId,
      weight_kg: bodyWeightKG,
    })
    .returning("*");
};

const handleMyStatCommand = async (userId, replyToken, host) => {
  const userWeights = await knex("user_weights")
    .select([
      knex.raw("max(weight_kg) as weight_kg"),
      knex.raw("date(created_at) as created_at"),
    ])
    .where("user_id", userId)
    .where(
      knex.raw("date(created_at)"),
      ">",
      knex.raw("date('now', '-14 days')")
    )
    .groupBy(knex.raw("date(created_at)"))
    .orderBy("created_at", "asc");

  const diffWeightKg =
    userWeights[userWeights.length - 1].weight_kg - userWeights[0].weight_kg;

  var labels = userWeights.map((item) => {
    const d = new Date(item.created_at);
    return `${d.getMonth()}/${d.getDate()}`;
  });

  const data = userWeights.map((item) => item.weight_kg);

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: ["blue"],
          borderWidth: 1,
          fill: false,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `User${userId}'s weight (kg) in last 2 weeks`,
        },
        legend: {
          display: false,
        },
        beforeDraw: ({ chart }) => {
          const ctx = chart.chart.ctx;
          ctx.save();
          ctx.globalCompositeOperation = "destination-over";
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, chart.witdh, chart.height);
          ctx.restore();
        },
      },
    },
  };

  const userPath = path.join(__dirname, `public/users/${userId}`);
  await fs.mkdir(userPath, { recursive: true });

  const buffer = await chartJSNodeCanvas.renderToBuffer(config);
  const timestamp = new Date().getTime();
  const fileName = `${timestamp}.png`;
  const filePath = path.join(userPath, fileName);
  await fs.writeFile(filePath, buffer, "base64");

  const imageUrl = `https://${host}/users/${userId}/${fileName}`;
  const gainOrLost = diffWeightKg > 0 ? "gain" : "lost";
  const displayDiffWeight = Math.abs(diffWeightKg).toFixed(2);

  return Promise.all([
    client.replyMessage(replyToken, [
      {
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl, // TODO: Resize to create a preview version
      },
      {
        type: "text",
        text: `You ${gainOrLost} ${displayDiffWeight} kg`,
      },
    ]),
  ]);
};

const handleCommand = (command, userId, replyToken, host) => {
  switch (command) {
    case "mystat":
      return handleMyStatCommand(userId, replyToken, host);
    default:
      console.error(`Unknown command: ${command}`);
  }
};

const handleText = async (text, userId, replyToken, host) => {
  const isCommand = text[0] === "/";
  if (isCommand) {
    return handleCommand(text.substr(1), userId, replyToken, host);
  }

  const bodyWeightRegex = /(\d{2,3}\.\d{2})/i;
  const result = text.match(bodyWeightRegex);
  if (result) {
    const bodyWeight = parseFloat(result[1]);
    return saveBodyWeight(bodyWeight, userId, replyToken);
  }
};

const handleMessage = (message, lineUserId, replyToken, host) => {
  const { type } = message;

  switch (type) {
    case "text":
      return handleText(message.text, lineUserId, replyToken, host);
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

const handleEvent = async (event, host) => {
  const { webhookEventId, type, replyToken, deliveryContext, source } = event;

  if (deliveryContext.isRedelivery) {
    const eventExists = await knex("events")
      .whereRaw("json_extract(event, '$.webhookEventId') = ?", [webhookEventId])
      .first();
    if (eventExists) {
      console.info(`skip event ${webhookEventId}`);
      return;
    }
  }

  await knex("events").insert({ event }).returning("*");

  const user = await firstOrCreateUser(source.userId);

  switch (type) {
    case "message":
      return handleMessage(event.message, user.id, replyToken, host);
    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
};

module.exports = async (req, res) => {
  try {
    const { host } = req.headers;

    const { destination, events } = req.body;
    if (destination !== config.botUserID) {
      return res.sendStatus(401);
    }

    if (!Array.isArray(req.body.events)) {
      return res.sendStatus(500);
    }

    const promises = events.map((event) => handleEvent(event, host));
    await Promise.all(promises);

    return res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
};
