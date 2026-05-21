/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder
  } = require('discord.js');
  const GuildSettings = require('../../models/guildSettingsSchema');
  
  module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Removes a specific track from the queue by its number.')
        .addIntegerOption(option =>
            option.setName('tracknumber')
                .setDescription('The number of the track to remove.')
                .setRequired(true)
                // IMPORTANT: We'll dynamically populate the choices in the `execute` function
        ),
  
    async execute(interaction) {
      const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
      if (settings?.music?.djRoleId) {
          if (!interaction.member.roles.cache.has(settings.music.djRoleId)) {
              return interaction.reply({ content: '❌ Only members with the DJ role can use this command.', ephemeral: true });
          }
      }

      const trackNumber = interaction.options.getInteger('tracknumber');
      const player = interaction.client.activePlayers.get(interaction.guild.id);
  
      if (!player || !player.queue || player.queue.size === 0) {
          return interaction.reply({ content: '❌ The queue is empty.', ephemeral: true });
      }
  
      if (trackNumber < 1 || trackNumber > player.queue.size) {
          return interaction.reply({ content: `❌ Invalid track number.  Must be between 1 and ${player.queue.size}.`, ephemeral: true });
      }
  
      const removedTrack = player.queue.remove(trackNumber - 1); // Adjust index for 0-based array
  
      if (!removedTrack) {
          return interaction.reply({ content: '❌ Failed to remove the track.  Please try again.', ephemeral: true }); //Error handling
      }
  
  
      const embed = new EmbedBuilder()
          .setColor('#FF7A00')
          .setTitle('🗑️ Track Removed')
          .setDescription(`Removed **[${removedTrack.info.title}](${removedTrack.info.uri})** from the queue.`);
  
      await interaction.reply({ embeds: [embed] });
  
      // Refresh the queue display (optional, but good for user experience)
      // You would call the displayQueue function from queue.js here, passing `interaction`
      const queueModule = require('./queue.js'); // Import the queue module
      queueModule.displayQueue(interaction, interaction.client, interaction.guild.id, true); // Refresh the queue display for Slash
    },
  
    async executePrefix(message, args) {
        const settings = await GuildSettings.findOne({ guildId: message.guild.id });
        if (settings?.music?.djRoleId) {
            if (!message.member.roles.cache.has(settings.music.djRoleId)) {
                return message.reply('❌ Only members with the DJ role can use this command.');
            }
        }

        if (!args.length) {
            return message.reply('❌ Please provide the track number to remove.');
        }
  
        const trackNumber = parseInt(args[0]);
  
        if (isNaN(trackNumber)) {
            return message.reply('❌ Invalid track number. Please provide a valid number.');
        }
  
        const player = message.client.activePlayers.get(message.guild.id);
  
        if (!player || !player.queue || player.queue.size === 0) {
            return message.reply('❌ The queue is empty.');
        }
  
        if (trackNumber < 1 || trackNumber > player.queue.size) {
            return message.reply(`❌ Invalid track number. Must be between 1 and ${player.queue.size}.`);
        }
  
      const removedTrack = player.queue.remove(trackNumber - 1); // Adjust index for 0-based array
        if (!removedTrack) {
            return message.reply('❌ Failed to remove the track. Please try again.');
        }
  
  
        const embed = new EmbedBuilder()
            .setColor('#FF7A00')
            .setTitle('🗑️ Track Removed')
            .setDescription(`Removed **[${removedTrack.info.title}](${removedTrack.info.uri})** from the queue.`);
  
        await message.reply({ embeds: [embed] });
  
        // Refresh the queue display (optional, but good for user experience)
        // You would call the displayQueue function from queue.js here, passing `message`
        const queueModule = require('./queue.js'); // Import the queue module
        queueModule.displayQueue(message, message.client, message.guild.id, false); // Refresh the queue display for Prefix
    }
  };