/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/profileSchema');

module.exports = {
  category: 'profile',
  data: new SlashCommandBuilder()
    .setName('profile-reset')
    .setDescription('Reset your profile to default settings.'),
  
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      let profileData = await Profile.findOne({ userId, guildId });
      
      if (!profileData) {
        // If no profile exists, create the default profile.
        profileData = new Profile({
          userId,
          guildId,
          bio: "This is my bio!",
          bannerColor: "#7289DA"
        });
      } else {
        profileData.bio = "This is my bio!";
        profileData.bannerColor = "#7289DA";
      }
      
      await profileData.save();
      
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Profile Reset')
        .setDescription('Your profile has been reset to default settings.')
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in profile-reset command:', error);
      await interaction.reply({ content: '❌ An error occurred while resetting your profile.', ephemeral: true });
    }
  },
  
  async executePrefix(message) {
    try {
      const userId = message.author.id;
      const guildId = message.guild.id;
      let profileData = await Profile.findOne({ userId, guildId });
      
      if (!profileData) {
        profileData = new Profile({
          userId,
          guildId,
          bio: "This is my bio!",
          bannerColor: "#7289DA"
        });
      } else {
        profileData.bio = "This is my bio!";
        profileData.bannerColor = "#7289DA";
      }
      
      await profileData.save();
      
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Profile Reset')
        .setDescription('Your profile has been reset to default settings.')
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in profile-reset command (prefix):', error);
      message.channel.send('❌ An error occurred while resetting your profile.');
    }
  }
};
