require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
  botUserID: process.env.BOT_USER_ID,
};
