/* eslint-disable */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require('discord.js');
const Profile = require('../../models/profileSchema');

module.exports = {
  category: 'profile',
  data: new SlashCommandBuilder()
      .setName('profile-edit')
      .setDescription('Edit your profile settings using an interactive menu.'),

  async execute(interaction) {
      try {
          const userId = interaction.user.id;
          const guildId = interaction.guild.id;
          let profileData = await Profile.findOne({ userId });
          if (!profileData) {
              profileData = new Profile({
                  userId,
                  guildId,
                  bio: "This is my bio!",
                  bannerColor: "#7289DA",
                  customDisplayName: "",
                  pfpUrl: "",
                  bannerUrl: "",
                  private: false,
                  showBaubles: true
              });
              await profileData.save();
          }

          // Build an embed that shows current settings.
          const settingsEmbed = new EmbedBuilder()
              .setColor(0x00AE86)
              .setTitle('Profile Editor')
              .setDescription('Select the setting you want to edit from the dropdown below.')
              .addFields(
                  { name: 'Bio', value: profileData.bio || "Not set", inline: true },
                  { name: 'Display Name', value: profileData.customDisplayName || "Using Discord username", inline: true },
                  { name: 'Profile Picture', value: profileData.pfpUrl || "Default avatar", inline: true },
                  { name: 'Banner', value: profileData.bannerUrl ? profileData.bannerUrl : `Color: ${profileData.bannerColor}`, inline: true },
                  { name: 'Profile Privacy', value: profileData.private ? '🔒 Private' : '🔓 Public', inline: true },
                  { name: 'Show Baubles', value: profileData.showBaubles ? 'Enabled ✅' : 'Disabled ❌', inline: true }
              )
              .setTimestamp();

          const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('profile_edit_select')
              .setPlaceholder('Choose an option to edit...')
              .addOptions([
                  {
                      label: 'Edit Bio',
                      description: 'Change your bio',
                      value: 'edit_bio'
                  },
                  {
                      label: 'Edit Display Name',
                      description: 'Set a custom display name',
                      value: 'edit_display'
                  },
                  {
                      label: 'Edit Profile Picture',
                      description: 'Set a custom profile picture (GIFs not supported)',
                      value: 'edit_pfp'
                  },
                  {
                      label: 'Edit Banner',
                      description: 'Set a custom banner URL or change banner color',
                      value: 'edit_banner'
                  },
                  {
                      label: 'Toggle Profile Privacy',
                      description: 'Make your profile private/public',
                      value: 'toggle_private'
                  },
                  {
                      label: 'Toggle Show Baubles',
                      description: 'Show or hide your bauble balance on your profile',
                      value: 'toggle_baubles'
                  }
              ]);

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.reply({ embeds: [settingsEmbed], components: [row], ephemeral: true });

          const collector = interaction.channel.createMessageComponentCollector({
              filter: i => i.user.id === userId && i.customId === 'profile_edit_select',
              time: 30000,
              max: 1
          });

          collector.on('collect', async i => {
              const selection = i.values[0];
              if (selection === 'edit_bio') {
                  const modal = new ModalBuilder()
                      .setCustomId('modal_edit_bio')
                      .setTitle('Edit Bio');

                  const bioInput = new TextInputBuilder()
                      .setCustomId('newBio')
                      .setLabel('Enter your new bio')
                      .setStyle(TextInputStyle.Paragraph)
                      .setPlaceholder('Your bio here...')
                      .setRequired(true);

                  modal.addComponents(new ActionRowBuilder().addComponents(bioInput));
                  await i.showModal(modal);
                  try {
                      const submitted = await i.awaitModalSubmit({ time: 15000, filter: j => j.user.id === userId });
                      const newBio = submitted.fields.getTextInputValue('newBio');
                      profileData.bio = newBio;
                      await profileData.save();
                      const replyEmbed = new EmbedBuilder()
                          .setColor(0x00AE86)
                          .setTitle('Bio Updated')
                          .setDescription(`Your new bio is:\n${newBio}`)
                          .setTimestamp();
                      await submitted.reply({ embeds: [replyEmbed], ephemeral: true });
                  } catch (err) {
                      console.error('Modal error:', err);
                  }
              } else if (selection === 'edit_display') {
                  const modal = new ModalBuilder()
                      .setCustomId('modal_edit_display')
                      .setTitle('Edit Display Name');

                  const displayInput = new TextInputBuilder()
                      .setCustomId('newDisplay')
                      .setLabel('Enter your custom display name')
                      .setStyle(TextInputStyle.Short)
                      .setPlaceholder('Custom display name')
                      .setRequired(true);

                  modal.addComponents(new ActionRowBuilder().addComponents(displayInput));
                  await i.showModal(modal);
                  try {
                      const submitted = await i.awaitModalSubmit({ time: 15000, filter: j => j.user.id === userId });
                      const newDisplay = submitted.fields.getTextInputValue('newDisplay');
                      profileData.customDisplayName = newDisplay;
                      await profileData.save();
                      const replyEmbed = new EmbedBuilder()
                          .setColor(0x00AE86)
                          .setTitle('Display Name Updated')
                          .setDescription(`Your custom display name is now: ${newDisplay}`)
                          .setTimestamp();
                      await submitted.reply({ embeds: [replyEmbed], ephemeral: true });
                  } catch (err) {
                      console.error('Modal error:', err);
                  }
              } else if (selection === 'edit_pfp') {
                  // Using Message component instead of modal for ease of use.
                  await i.reply({content: "Please send the picture you want to use as your profile picture. (GIFs are not supported) or enter a URL", ephemeral: true});

                  const filter = m => m.author.id === userId;
                  const pfpCollector = interaction.channel.createMessageCollector({
                      filter,
                      time: 30000,
                      max: 1
                  });
                  pfpCollector.on('collect', async m => {
                      if (m.author.id !== userId) return;
                      try {
                          let newPfp = m.attachments.size > 0 ? m.attachments.first().url : m.content;
                          if (newPfp.endsWith('.gif')) {
                              return m.reply({ content: '❌ GIFs are not supported for profile pictures.', ephemeral: true });
                          }
                          profileData.pfpUrl = newPfp;
                          await profileData.save();
                          const replyEmbed = new EmbedBuilder()
                              .setColor(0x00AE86)
                              .setTitle('Profile Picture Updated')
                              .setDescription(`Your custom profile picture has been updated.`)
                              .setTimestamp();
                          await m.reply({ embeds: [replyEmbed], ephemeral: true });
                      } catch (err) {
                          console.error('Error updating PFP:', err);
                          await m.reply({ content: '❌ An error occurred while updating your profile picture.', ephemeral: true });
                      }
                  });

                  pfpCollector.on('end', (collected, reason) => {
                      if (reason === 'time' && collected.size === 0) {
                          interaction.editReply({ content: '❌ You took too long to provide a profile picture.', components: [] }).catch(console.error);
                      }
                  });
              } else if (selection === 'edit_banner') {
                  const Bauble = require('../../models/baubleSchema');
                  const baubleData = await Bauble.findOne({ userId });
                  const hasPaintbrush = baubleData?.inventory?.some(item => item.itemId === 'paintbrush' && item.quantity > 0);
                  if (!hasPaintbrush) {
                      return i.reply({ content: '❌ You need a 🎨 **Profile Paintbrush** in your inventory to customize your profile banner! Buy one from the `/shop`.', ephemeral: true });
                  }

                   // Using Message component instead of modal for ease of use.
                  await i.reply({content: "Please send the picture you want to use as your banner. (GIFs are not supported) or enter a URL or a hex color code (e.g. #FF0000)", ephemeral: true});

                  const filter = m => m.author.id === userId;
                  const bannerCollector = interaction.channel.createMessageCollector({
                      filter,
                      time: 30000,
                      max: 1
                  });

                  bannerCollector.on('collect', async m => {
                      if (m.author.id !== userId) return;
                      try {
                          let newBanner = m.attachments.size > 0 ? m.attachments.first().url : m.content;

                          if (newBanner.startsWith('#')) {
                              profileData.bannerUrl = "";
                              profileData.bannerColor = newBanner;
                          } else {
                              if (newBanner.endsWith('.gif')) {
                                  return m.reply({ content: '❌ GIFs are not supported for banners.', ephemeral: true });
                              }
                              profileData.bannerUrl = newBanner;
                              profileData.bannerColor = "";
                          }
                          await profileData.save();
                          const replyEmbed = new EmbedBuilder()
                              .setColor(0x00AE86)
                              .setTitle('Banner Updated')
                              .setDescription(`Your banner has been updated.`)
                              .setTimestamp();
                          await m.reply({ embeds: [replyEmbed], ephemeral: true });
                      } catch (err) {
                          console.error('Error updating banner:', err);
                          await m.reply({ content: '❌ An error occurred while updating your banner.', ephemeral: true });
                      }
                  });

                  bannerCollector.on('end', (collected, reason) => {
                      if (reason === 'time' && collected.size === 0) {
                          interaction.editReply({ content: '❌ You took too long to provide a banner.', components: [] }).catch(console.error);
                      }
                  });
              } else if (selection === 'toggle_private') {
                  profileData.private = !profileData.private;
                  await profileData.save();
                  const replyEmbed = new EmbedBuilder()
                      .setColor(0x00AE86)
                      .setTitle('Profile Privacy Toggled')
                      .setDescription(`Your profile is now ${profileData.private ? '🔒 Private' : '🔓 Public'}.`)
                      .setTimestamp();
                  await i.update({ embeds: [replyEmbed], components: [] });
              } else if (selection === 'toggle_baubles') {
                  profileData.showBaubles = !profileData.showBaubles;
                  await profileData.save();
                  const replyEmbed = new EmbedBuilder()
                      .setColor(0x00AE86)
                      .setTitle('Show Baubles Toggled')
                      .setDescription(`Showing baubles on your profile is now ${profileData.showBaubles ? 'Enabled ✅' : 'Disabled ❌'}.`)
                      .setTimestamp();
                  await i.update({ embeds: [replyEmbed], components: [] });
              }
          });

          collector.on('end', (collected, reason) => {
              if (reason === 'time' && collected.size === 0) {
                  interaction.editReply({ components: [] }).catch(console.error);
              }
          });

      } catch (error) {
          console.error('Error in profile-edit command:', error);
          await interaction.reply({ content: '❌ An error occurred while editing your profile.', ephemeral: true });
      }
  },

  // Prefix version: a simpler text-based interactive flow.
  async executePrefix(message, args) {
      try {
          const userId = message.author.id;
          const guildId = message.guild.id;
          let profileData = await Profile.findOne({ userId });
          if (!profileData) {
              profileData = new Profile({
                  userId,
                  guildId,
                  bio: "This is my bio!",
                  bannerColor: "#7289DA",
                  customDisplayName: "",
                  pfpUrl: "",
                  bannerUrl: "",
                  private: false,
                  showBaubles: true
              });
              await profileData.save();
          }
          const filter = m => m.author.id === userId;
          message.channel.send(`<@${userId}>, which setting would you like to update? Reply with one of the following options:
1. bio
2. display (custom display name)
3. pfp (profile picture)
4. banner (banner URL or color)
5. toggleprivate (toggle profile privacy)
6. togglebaubles (toggle show baubles)`);

          const collected = await message.channel.awaitMessages({ filter, time: 30000, max: 1 });
          if (!collected.size) return message.channel.send(`<@${userId}>, you took too long.`);

          const choice = collected.first().content.toLowerCase();
          let selection;

          if (['1', 'bio'].includes(choice)) {
              selection = 'bio';
          } else if (['2', 'display'].includes(choice)) {
              selection = 'display';
          } else if (['3', 'pfp'].includes(choice)) {
              selection = 'pfp';
          } else if (['4', 'banner'].includes(choice)) {
              selection = 'banner';
          } else if (['5', 'toggleprivate'].includes(choice)) {
              selection = 'toggleprivate';
          } else if (['6', 'togglebaubles'].includes(choice)) {
              selection = 'togglebaubles';
          } else {
              return message.channel.send(`<@${userId}>, invalid choice.`);
          }


          if (selection === 'bio') {
              message.channel.send(`<@${userId}>, please enter your new bio:`);
              const colBio = await message.channel.awaitMessages({ filter, time: 30000, max: 1 });
              if (!colBio.size) return message.channel.send(`<@${userId}>, you took too long.`);
              profileData.bio = colBio.first().content;
          } else if (selection === 'display') {
              message.channel.send(`<@${userId}>, please enter your new custom display name:`);
              const colDisplay = await message.channel.awaitMessages({ filter, time: 30000, max: 1 });
              if (!colDisplay.size) return message.channel.send(`<@${userId}>, you took too long.`);
              profileData.customDisplayName = colDisplay.first().content;
          } else if (selection === 'pfp') {
               message.channel.send(`<@${userId}>, please send a URL for your new profile picture or upload a picture (GIFs not supported):`);

              const colPfp = await message.channel.awaitMessages({ filter, time: 30000, max: 1 });
              if (!colPfp.size) return message.channel.send(`<@${userId}>, you took too long.`);

              const msg = colPfp.first();

              let newPfp = msg.attachments.size > 0 ? msg.attachments.first().url : msg.content;

              if (newPfp.endsWith('.gif')) {
                return message.channel.send(`<@${userId}>, GIFs are not supported for profile pictures.`);
              }

              profileData.pfpUrl = newPfp;
          } else if (selection === 'banner') {
              const Bauble = require('../../models/baubleSchema');
              const baubleData = await Bauble.findOne({ userId });
              const hasPaintbrush = baubleData?.inventory?.some(item => item.itemId === 'paintbrush' && item.quantity > 0);
              if (!hasPaintbrush) {
                  return message.channel.send(`<@${userId}>, you need a 🎨 **Profile Paintbrush** in your inventory to customize your profile banner! Buy one from the shop.`);
              }

              message.channel.send(`<@${userId}>, please send a URL for your new banner, upload a picture or enter a hex color code (e.g. #FF0000). GIFs are not supported for banners:`);

              const colBanner = await message.channel.awaitMessages({ filter, time: 30000, max: 1 });
              if (!colBanner.size) return message.channel.send(`<@${userId}>, you took too long.`);

              const msg = colBanner.first();

              let input = msg.attachments.size > 0 ? msg.attachments.first().url : msg.content;


              if (input.startsWith('#')) {
                  profileData.bannerUrl = "";
                  profileData.bannerColor = input;
              } else {
                  if (input.endsWith('.gif')) {
                      return message.channel.send(`<@${userId}>, GIFs are not supported for banners.`);
                  }
                  profileData.bannerUrl = input;
                  profileData.bannerColor = "";
              }
          } else if (selection === 'toggleprivate') {
              profileData.private = !profileData.private;
              message.channel.send(`<@${userId}>, profile privacy is now ${profileData.private ? '🔒 Private' : '🔓 Public'}.`);
          } else if (selection === 'togglebaubles') {
              profileData.showBaubles = !profileData.showBaubles;
              message.channel.send(`<@${userId}>, showing baubles on your profile is now ${profileData.showBaubles ? 'Enabled ✅' : 'Disabled ❌'}.`);
          }

          await profileData.save();
          const { EmbedBuilder } = require('discord.js');
          const embed = new EmbedBuilder()
              .setColor(0x00AE86)
              .setTitle('Profile Updated')
              .setDescription('Your profile settings have been updated.')
              .addFields(
                  { name: 'Bio', value: profileData.bio, inline: true },
                  { name: 'Display Name', value: profileData.customDisplayName || 'Using Discord username', inline: true },
                  { name: 'Profile Picture', value: profileData.pfpUrl || 'Default avatar', inline: true },
                  { name: 'Banner', value: profileData.bannerUrl ? profileData.bannerUrl : `Color: ${profileData.bannerColor}`, inline: true },
                  { name: 'Profile Privacy', value: profileData.private ? '🔒 Private' : '🔓 Public', inline: true },
                  { name: 'Show Baubles', value: profileData.showBaubles ? 'Enabled ✅' : 'Disabled ❌', inline: true }
              )
              .setTimestamp();
          message.channel.send({ content: `<@${userId}>`, embeds: [embed] });

      } catch (error) {
          console.error('Error in profile-edit command (prefix):', error);
          message.channel.send(`<@${message.author.id}>, an error occurred while updating your profile.`);
      }
  }
};