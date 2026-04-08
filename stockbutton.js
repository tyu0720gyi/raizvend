const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Pushbullet = require('pushbullet');


// --- 설정 및 데이터 ---
const ADMIN_ID = "1452554082500739094"; 
const LOG_CHANNEL_ID = "1480705992479084564"; // 구매 로그 채널
const pb = new Pushbullet('o.9BlVwZu4mFhTJ7HMsX9IFktpC7sEqp2x'); // Pushbullet 토큰

const INITIAL_PRODUCTS = [
  { id: 1, name: "하드밴제거기 하루권", category: "hardban_remover", price: 5000, codes: [] },
  { id: 2, name: "하드밴제거기 한달권", category: "hardban_remover", price: 20000, codes: [] },
  { id: 3, name: "하드밴제거기 영구권", category: "hardban_remover", price: 50000, codes: [] },
  { id: 4, name: "NO", category: "account_recovery", price: 10000, codes: [] },
  { id: 5, name: "NO", category: "account_recovery", price: 25000, codes: [] },
  { id: 6, name: "NO", category: "etc", price: 3000, codes: [] }
];

const categories = [
  { label: "하드밴제거기", value: "hardban_remover" },
  { label: "NO", value: "account_recovery" },
  { label: "NO", value: "etc" }
];

let products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
let userBalances = {};
let pendingCharges = []; // 자동 승인 대기열

module.exports = (client) => {

  // --- 1. Pushbullet 실시간 감시 (자동 입금 확인) ---
  const stream = pb.stream();
  stream.connect();

  stream.on('push', async (push) => {
    if (push.type === 'mirror' && push.title && push.title.includes('입금')) {
      const amount = parseInt(push.title.replace(/[^0-9]/g, ""));
      if (!amount) return;

      console.log(`[토스뱅크] ${amount}원 입금 감지됨`);

      const requestIndex = pendingCharges.findIndex(req => req.amount === amount);
      if (requestIndex !== -1) {
        const request = pendingCharges[requestIndex];
        userBalances[request.userId] = (userBalances[request.userId] || 0) + amount;
        pendingCharges.splice(requestIndex, 1);

        try {
          const user = await client.users.fetch(request.userId);
          await user.send(`✅ **입금 자동 확인 완료**\n${amount.toLocaleString()}원이 충전되었습니다.\n현재 잔액: ${userBalances[request.userId].toLocaleString()}원`);
          
          const admin = await client.users.fetch(ADMIN_ID);
          admin.send(`🤖 **자동 승인 로그**\n유저: <@${request.userId}>\n금액: ${amount}원\n상태: 성공`);
        } catch (e) { console.log("알림 전송 실패"); }
      }
    }
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      // --- 2. 재고 관리 (관리자 전용) ---
      if (interaction.isChatInputCommand() && interaction.commandName === "재고추가") {
        if (interaction.user.id !== ADMIN_ID) return interaction.reply({ content: "❌ 관리자 전용", ephemeral: true });
        const menu = new StringSelectMenuBuilder()
          .setCustomId("addstock_select_product")
          .setPlaceholder("상품 선택")
          .addOptions(products.map(p => ({ label: p.name, value: p.id.toString() })));
        await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "addstock_select_product") {
        const product = products.find(p => p.id === parseInt(interaction.values[0]));
        const modal = new ModalBuilder().setCustomId(`addstock_modal_${product.id}`).setTitle(`${product.name} 키 추가`);
        const input = new TextInputBuilder().setCustomId("keys_input").setLabel("키 입력 (줄바꿈 구분)").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith("addstock_modal_")) {
        const productId = parseInt(interaction.customId.split("_")[2]);
        const product = products.find(p => p.id === productId);
        const newKeys = interaction.fields.getTextInputValue("keys_input").split("\n").map(k => k.trim()).filter(k => k.length > 0);
        product.codes.push(...newKeys);
        await interaction.reply({ content: `✅ ${product.name}에 ${newKeys.length}개 추가 완료!`, ephemeral: true });
      }

      // --- 3. 제품 보기 ---
      if (interaction.isButton() && interaction.customId === "vending_product") {
        const menu = new StringSelectMenuBuilder().setCustomId("product_category").setPlaceholder("카테고리 선택").addOptions(categories);
        await interaction.reply({ content: "카테고리를 선택하세요.", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "product_category") {
        const categoryProducts = products.filter(p => p.category === interaction.values[0]);
        const desc = categoryProducts.map(p => `**${p.name}**\n가격: ${p.price}원 | 재고: ${p.codes.length}개`).join("\n\n") || "상품 없음";
        await interaction.update({ embeds: [new EmbedBuilder().setTitle("상품 목록").setDescription(desc).setColor("#5865F2")], components: [] });
      }

      // --- 4. 구매 기능 (로그 채널 반영) ---
      if (interaction.isButton() && interaction.customId === "vending_buy") {
        const menu = new StringSelectMenuBuilder().setCustomId("buy_product_category").setPlaceholder("카테고리 선택").addOptions(categories);
        await interaction.reply({ content: "구매할 카테고리 선택", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "buy_product_category") {
        const categoryProducts = products.filter(p => p.category === interaction.values[0]);
        if (categoryProducts.length === 0) return interaction.update({ content: "❌ 현재 재고가 없습니다.", components: [] });
        const menu = new StringSelectMenuBuilder().setCustomId("buy_product_select").setPlaceholder("상품 선택").addOptions(categoryProducts.map(p => ({ label: p.name, value: p.id.toString() })));
        await interaction.update({ components: [new ActionRowBuilder().addComponents(menu)] });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "buy_product_select") {
        const product = products.find(p => p.id === parseInt(interaction.values[0]));
        const balance = userBalances[interaction.user.id] || 0;
        
        if (product.codes.length === 0) return interaction.reply({ content: "❌ 재고가 부족합니다.", ephemeral: true });
        if (balance < product.price) return interaction.reply({ content: `❌ 잔액 부족 (현재: ${balance}원)`, ephemeral: true });

        const code = product.codes.shift();
        userBalances[interaction.user.id] -= product.price;

        // 구매자에게 DM 전송
        await interaction.user.send({ 
          content: `🎫 **구매 완료!**\n**사용법 : 사용법 채널**\n**상품:** ${product.name}\n**코드:** \`${code}\`\n**잔액:** ${userBalances[interaction.user.id]}원` 
        }).catch(() => {});
        
        await interaction.update({ content: `✅ 구매 성공! DM을 확인해주세요.`, components: [] });

        // ⭐ 구매 로그 채널 전송
        const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle("레이즈 서비스 상품 구매 로그")
            .setColor("#00FF00")
            .addFields(
              { name: "👤 구매자", value: `<@${interaction.user.id}>`, inline: true },
              { name: "📦 상품명", value: product.name, inline: true },
              { name: "💰 결제 금액", value: `${product.price.toLocaleString()}원`, inline: true },
              { name: "📉 남은 재고", value: `${product.codes.length}개`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: "판매 로그 시스템" });
          await logChannel.send({ embeds: [logEmbed] });
        }
      }

      // --- 5. 충전 기능 (자동+수동) ---
      if (interaction.isButton() && interaction.customId === "vending_charge") {
        const modal = new ModalBuilder().setCustomId("charge_modal").setTitle("포인트 충전");
        const nameInput = new TextInputBuilder().setCustomId("user_name").setLabel("입금자명").setStyle(TextInputStyle.Short).setRequired(true);
        const amountInput = new TextInputBuilder().setCustomId("charge_amount").setLabel("입금 금액 (숫자만)").setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(amountInput));
        await interaction.showModal(modal);
      }

      if (interaction.isModalSubmit() && interaction.customId === "charge_modal") {
        const userName = interaction.fields.getTextInputValue("user_name");
        const amount = parseInt(interaction.fields.getTextInputValue("charge_amount"));
        if (isNaN(amount)) return interaction.reply({ content: "❌ 숫자만 입력 가능합니다.", ephemeral: true });

        pendingCharges.push({ userId: interaction.user.id, amount: amount });

        const admin = await client.users.fetch(ADMIN_ID);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`approve_charge_${interaction.user.id}_${amount}`).setLabel("수동 승인").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`reject_charge_${interaction.user.id}`).setLabel("거부").setStyle(ButtonStyle.Danger)
        );
        await admin.send({ content: `💰 **충전 요청**\n유저: <@${interaction.user.id}>\n입금자: ${userName}\n금액: ${amount}원`, components: [row] });
        await interaction.reply({ content: `✅ **신청 완료**\n**계좌:** 토스뱅크 1002-1596-8985 ㄱㅇㅎ\n**금액:** ${amount.toLocaleString()}원\n정확한 금액 입금 시 자동 처리됩니다.`, ephemeral: true });
      }

      // --- 6. 수동 승인 처리 ---
      if (interaction.isButton() && interaction.customId.startsWith("approve_charge_")) {
        const [, , targetId, amount] = interaction.customId.split("_");
        userBalances[targetId] = (userBalances[targetId] || 0) + parseInt(amount);
        const idx = pendingCharges.findIndex(req => req.userId === targetId && req.amount === parseInt(amount));
        if (idx !== -1) pendingCharges.splice(idx, 1);
        await interaction.update({ content: "✅ 수동 승인 완료", components: [] });
        const user = await client.users.fetch(targetId);
        await user.send(`💰 충전 완료! 현재 잔액: ${userBalances[targetId]}원`).catch(() => {});
      }

      if (interaction.isButton() && interaction.customId.startsWith("reject_charge_")) {
        await interaction.update({ content: "❌ 거부 완료", components: [] });
      }

      // --- 7. 내 정보 ---
      if (interaction.isButton() && interaction.customId === "vending_info") {
        const balance = userBalances[interaction.user.id] || 0;
        await interaction.reply({ content: `👤 **${interaction.user.username}**님 잔액: **${balance.toLocaleString()}원**`, ephemeral: true });
      }

    } catch (err) {
      console.error(err);
      if (!interaction.replied) await interaction.reply({ content: "오류가 발생했습니다.", ephemeral: true });
    }
  });
};