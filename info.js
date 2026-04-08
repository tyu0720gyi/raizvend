const { EmbedBuilder } = require("discord.js");

module.exports = (client) => {

  client.on("interactionCreate", async (interaction) => {

    if (!interaction.isButton()) return;
    if (interaction.customId !== "vending_info") return;

    const user = interaction.user;

    try {
      const embed = new EmbedBuilder()
        .setColor("#42b8e3")
        .setTitle(`<:Admin:1448347034519343104> ${user.username}님의 정보`)
        .addFields(
          { name: "성명", value: "`미등록`", inline: false },
          { name: "잔액", value: "`0원`", inline: false }
        );

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

    } catch (err) {
      console.error("[INFO] Unexpected error:", err);
      return interaction.reply({
        content: "회원 정보를 불러오는 중 오류가 발생했습니다.",
        ephemeral: true
      });
    }

  });

};
