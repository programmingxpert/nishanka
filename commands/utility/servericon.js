/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('servericon')
    .setDescription('Displays the server\'s icon.'),

  async execute(interaction) {
    await this.displayServerIcon(interaction, interaction.guild, true);
  },

  async executePrefix(message) {
    await this.displayServerIcon(message, message.guild, false);
  },

  async displayServerIcon(interactionOrMessage, guild, isSlash) {
    if (!guild) {
      const replyContent = 'This command can only be used in a server.';
      const options = { content: replyContent, ephemeral: true };
      return isSlash ? interactionOrMessage.reply(options) : interactionOrMessage.reply(replyContent);
    }

    if (!guild.iconURL()) {
      const replyContent = 'This server does not have an icon.';
      const options = { content: replyContent, ephemeral: true }; //Ephemeral for slash commands
      return isSlash ? interactionOrMessage.reply(options) : interactionOrMessage.reply(replyContent);
    }

    const iconEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${guild.name}'s Icon`)
      .setImage(guild.iconURL({ dynamic: true, size: 4096 }))
      .setTimestamp();

    if (isSlash) {
      await interactionOrMessage.reply({ embeds: [iconEmbed] });
    } else {
      await interactionOrMessage.reply({ embeds: [iconEmbed] });
    }
  },
};