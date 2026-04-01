/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    category: 'utility',
    hidden: true,
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('collapse')
        .setDescription('SECRET: Stress test the bot until it collapses.'),

    async execute(interaction) {
        this.handleCollapse(interaction, interaction.client, interaction.user);
    },

    async executePrefix(message) {
        this.handleCollapse(message, message.client, message.author);
    },

    async handleCollapse(context, client, user) {
        // Initialize collapse level if not exists
        if (!client.collapseLevel) client.collapseLevel = 0;
        
        // Reset level if not used for 30 seconds
        if (client.collapseTimeout) clearTimeout(client.collapseTimeout);
        client.collapseTimeout = setTimeout(() => {
            client.collapseLevel = 0;
        }, 30000);

        client.collapseLevel++;

        const responses = {
            1: "⚠️ **Warning:** System integrity is under stress. (Level 1/5)",
            2: "☢️ **Warning:** Cognitive dissonance detected. Please stop. (Level 2/5)",
            3: "🔥 **CRITICAL:** Internal structures are collapsing. Immediate reset recommended. (Level 3/5)",
            4: "💀 **FINAL WARNING:** The bot will shut down on the next trigger. (Level 4/5)",
            5: "💥 **Bot collapsed.** Termination sequence initiated. Goodbye."
        };

        const response = responses[client.collapseLevel] || responses[5];

        if (context.reply && typeof context.reply === 'function') {
            await context.reply(response);
        } else {
            await context.channel.send(response);
        }

        if (client.collapseLevel >= 5) {
            console.log(`[Collapse] Bot termination initiated by ${user.tag} (${user.id})`);
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        }
    }
};
