const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const SystemConfig = require('../../models/SystemConfig');
const config = require('../../config.json');

module.exports = {
    category: 'developer',
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Configure maintenance mode and developer announcements (Developer Only).')
        .addSubcommand(sub => sub
            .setName('toggle')
            .setDescription('Toggle maintenance mode on/off')
            .addBooleanOption(opt => opt.setName('active').setDescription('Active state of maintenance mode').setRequired(true))
            .addStringOption(opt => opt.setName('eta').setDescription('Optional ETA/reason (e.g. 2 hours)').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('msg')
            .setDescription('Update the maintenance message')
            .addStringOption(opt => opt.setName('content').setDescription('New maintenance message').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('announce')
            .setDescription('Configure developer announcements')
            .addStringOption(opt => opt.setName('content').setDescription('Announcement message text').setRequired(true))
            .addBooleanOption(opt => opt.setName('active').setDescription('Whether the announcement should be visible').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('announce-clear')
            .setDescription('Clear the developer announcement')),

    async execute(interaction) {
        if (interaction.user.id !== config.devId) {
            return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        let sysConfig = await SystemConfig.findOne();
        if (!sysConfig) {
            sysConfig = new SystemConfig();
        }

        if (sub === 'toggle') {
            const active = interaction.options.getBoolean('active');
            const eta = interaction.options.getString('eta') || null;

            sysConfig.maintenanceMode = active;
            if (eta) {
                sysConfig.maintenanceETA = eta;
            }
            await sysConfig.save();

            const embed = new EmbedBuilder()
                .setColor(active ? 0xe74c3c : 0x2ecc71)
                .setTitle('🛠️ Maintenance Mode Update')
                .setDescription(`Maintenance mode has been successfully turned **${active ? 'ON' : 'OFF'}**.${eta ? `\n**ETA/Reason:** ${eta}` : ''}`)
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'msg') {
            const content = interaction.options.getString('content');
            sysConfig.maintenanceMessage = content;
            await sysConfig.save();

            return interaction.reply({ content: `✅ **Maintenance message updated to:**\n> ${content}`, ephemeral: true });
        }

        if (sub === 'announce') {
            const content = interaction.options.getString('content');
            const active = interaction.options.getBoolean('active') ?? true;

            sysConfig.announcement = content;
            sysConfig.announcementActive = active;
            sysConfig.announcementUpdatedAt = new Date();
            await sysConfig.save();

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('📢 Developer Announcement Set')
                .setDescription(`**Content:**\n${content}\n\n**Status:** ${active ? '🟢 Visible' : '🔴 Hidden'}`)
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'announce-clear') {
            sysConfig.announcement = "";
            sysConfig.announcementActive = false;
            await sysConfig.save();

            return interaction.reply({ content: '✅ Developer announcement has been cleared.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (message.author.id !== config.devId) {
            return message.reply('❌ You are not authorized to use this command.');
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) {
            return message.reply('❌ Available subcommands: `toggle <on/off> [eta]`, `msg <message>`, `announce <message>`, `announceclear`');
        }

        let sysConfig = await SystemConfig.findOne();
        if (!sysConfig) {
            sysConfig = new SystemConfig();
        }

        if (sub === 'toggle') {
            const stateStr = args[1]?.toLowerCase();
            if (stateStr !== 'on' && stateStr !== 'off') {
                return message.reply('❌ Usage: `-maintenance toggle <on/off> [eta]`');
            }
            const active = stateStr === 'on';
            const eta = args.slice(2).join(' ') || null;

            sysConfig.maintenanceMode = active;
            if (eta) sysConfig.maintenanceETA = eta;
            await sysConfig.save();

            return message.reply(`🛠️ Maintenance mode turned **${active ? 'ON' : 'OFF'}**.${eta ? `\n**ETA/Reason:** ${eta}` : ''}`);
        }

        if (sub === 'msg') {
            const content = args.slice(1).join(' ');
            if (!content) return message.reply('❌ Please specify a maintenance message.');

            sysConfig.maintenanceMessage = content;
            await sysConfig.save();
            return message.reply(`✅ Maintenance message updated.`);
        }

        if (sub === 'announce') {
            const content = args.slice(1).join(' ');
            if (!content) return message.reply('❌ Please specify an announcement message.');

            sysConfig.announcement = content;
            sysConfig.announcementActive = true;
            sysConfig.announcementUpdatedAt = new Date();
            await sysConfig.save();

            return message.reply(`📢 Announcement set and activated:\n> ${content}`);
        }

        if (sub === 'announceclear' || sub === 'announce-clear') {
            sysConfig.announcement = "";
            sysConfig.announcementActive = false;
            await sysConfig.save();
            return message.reply('✅ Announcement cleared.');
        }

        return message.reply('❌ Unknown subcommand. Options: `toggle`, `msg`, `announce`, `announceclear`');
    }
};
