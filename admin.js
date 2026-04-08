const { ChannelType } = require("discord.js");

const ADMIN_ID = "1448238855789613086"; // 관리자

module.exports = (client) => {

  // 애플리케이션 커맨드 등록 (간단히 글로벌 등록)
  client.on("ready", async () => {
    try {
      await client.application.commands.create({
        name: "addstock",
        description: "관리자가 상품 재고를 추가합니다",
        options: [
          { name: "product_id", description: "상품 ID", type: 4, required: true },
          { name: "amount", description: "추가할 수량", type: 4, required: true }
        ]
      });
    } catch (err) {
      console.error("슬래시 명령 등록 오류:", err);
    }
  });

  // 슬래시 커맨드 처리
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "addstock") {
      if (interaction.user.id !== ADMIN_ID) {
        return interaction.reply({ content: "❌ 관리자만 사용 가능합니다.", ephemeral: true });
      }

      const productId = interaction.options.getInteger("product_id");
      const amount = interaction.options.getInteger("amount");

      try {
        const stockModule = require("./stockbutton");
        const products = stockModule.products;

        const prod = products.find(p => p.id === productId);
        if (!prod) {
          return interaction.reply({ content: "❌ 해당 ID의 상품을 찾을 수 없습니다.", ephemeral: true });
        }

        prod.stock = (prod.stock || 0) + amount;

        return interaction.reply({ content: `✅ ${prod.name} 재고가 ${amount}개 추가되어 현재 ${prod.stock}개 입니다.`, ephemeral: true });
      } catch (err) {
        console.error("재고 추가 오류:", err);
        return interaction.reply({ content: "❌ 재고 추가 중 오류가 발생했습니다.", ephemeral: true });
      }
    }
  });


  client.on("messageCreate", async (msg) => {

    if (msg.author.bot) return;

    // $내ID - 사용자 ID 확인
    if (msg.content === "$내ID") {
      return msg.reply(`당신의 Discord ID: \`${msg.author.id}\``);
    }

    // $재고추가 [상품이름] [수량]
    if (msg.content.startsWith("$재고추가")) {
      if (msg.author.id !== ADMIN_ID) {
        return msg.reply("❌ 관리자만 이 명령어를 사용할 수 있습니다.");
      }

      const args = msg.content.split(" ");
      if (args.length < 3) {
        return msg.reply("사용법: $재고추가 [상품이름] [수량]\n예: $재고추가 하드밴제거기하루권 5");
      }

      const productName = args[1];
      const quantity = parseInt(args[2]);

      if (isNaN(quantity) || quantity <= 0) {
        return msg.reply("❌ 수량은 양의 정수여야 합니다.");
      }

      // 실제 구현 시 Supabase에 저장
      const embed = {
        color: 0x42b8e3,
        title: "✅ 재고 추가 완료",
        fields: [
          { name: "상품", value: productName, inline: true },
          { name: "추가된 수량", value: `${quantity}개`, inline: true }
        ]
      };

      await msg.reply({ embeds: [embed] });
    }

    // $재고확인
    if (msg.content === "$재고확인") {
      if (msg.author.id !== ADMIN_ID) {
        return msg.reply("❌ 관리자만 이 명령어를 사용할 수 있습니다.");
      }

      const embed = {
        color: 0x42b8e3,
        title: "📊 현재 재고 현황",
        description: "재고 조회 기능은 준비 중입니다."
      };

      await msg.reply({ embeds: [embed] });
    }

  });

};
