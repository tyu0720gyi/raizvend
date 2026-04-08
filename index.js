require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

require("./vendingmachine")(client);
require("./stockbutton")(client);
require("./admin")(client);

client.once("ready", () => {
  console.log("Successful Login:", client.user.tag);
});

client.login('MTQ2NDA2ODE1Mjk5NTQ3OTYzNQ.G_Bn8e.eAU_Kz6pIlMLJWT3Srnfr6SGR37MZgBNuBEOtc');