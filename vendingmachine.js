const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = (client) => {

  client.on("messageCreate", async (msg) => {

    if (msg.author.bot) return;
    if (msg.content !== "$vending_machine_1") return;

    await msg.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor("#ffffff")
      .setTitle("레이즈서비스")
      .setDescription(`
**24시간 자동충전 자판기입니다.**

아래 버튼을 눌러 원하는 기능을 이용하세요.

- 자동충전 시 최대 1분 소요될 수 있습니다.
- 3자입금 시 법적 대응 할 수 있습니다.
- 계좌으로 충전할 수 있습니다.
`)
      .setImage(
        "https://tse2.mm.bing.net/th/id/OIP.Jf4eW5S_oZfqx1sLxMc90QHaD3?rs=1&pid=ImgDetMain&o=7&rm=3"
      );

    const row = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setEmoji("<:File:1448347029737570446>")
        .setLabel("제품")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("vending_product"),

      new ButtonBuilder()
        .setEmoji("<:Bag:1448347031583199312>")
        .setLabel("구매")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("vending_buy"),

      new ButtonBuilder()
        .setEmoji("<:Pay:1448347033021710396>")
        .setLabel("충전")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("vending_charge"),

      new ButtonBuilder()
        .setEmoji("<:Admin:1448347034519343104>")
        .setLabel("정보")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("vending_info"),
    );

    await msg.channel.send({
      embeds: [embed],
      components: [row]
    });

  });

};
