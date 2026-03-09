/* eslint-disable */
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const Afk = require('../../models/afkSchema'); // Import the AFK model
let prefix;

try {
    const config = require('../../config.json');
    prefix = config.prefix;
} catch (error) {
    console.warn("config.json not found. Using default prefix: !");
    prefix = "!";
}

module.exports = {
    category: 'utility',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Sets an AFK status and reason.')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for being AFK.')
                .setRequired(false)
        ),

    async execute(interaction) {
        const reason = interaction.options.getString('reason') || 'AFK';
        const member = interaction.member;
        const client = interaction.client;

        // Store AFK status in the client cache
        client.afk.set(interaction.user.id, {
            reason: reason,
            time: Date.now(),
            displayName: member.displayName
        });

        // Persist AFK status to MongoDB (upsert: insert a new record or update the existing one)
        await Afk.findOneAndUpdate(
            { userId: interaction.user.id, guildId: interaction.guild.id },
            { reason: reason, timestamp: Date.now(), displayName: member.displayName },
            { upsert: true, new: true }
        );

        const nicknameResult = await this.setAfkNickname(interaction, member, client); // Get result from setting nickname

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('😴 AFK Mode Activated')
            .setDescription(`You are now AFK. Reason: **${reason}**`)
            .setTimestamp()
            .setFooter({ text: 'AFK Status', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

        if (nicknameResult) { // If there was an issue with the nickname, add it to the embed
            embed.addFields({ name: "Nickname Update", value: nicknameResult});
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async executePrefix(message, args) {
        const reason = args.join(' ') || 'AFK';
        const member = message.member;
        const client = message.client;

        // Store AFK status in the client cache
        client.afk.set(message.author.id, {
            reason: reason,
            time: Date.now(),
            displayName: member.displayName
        });

        // Persist AFK status to MongoDB
        await Afk.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { reason: reason, timestamp: Date.now(), displayName: member.displayName },
            { upsert: true, new: true }
        );

         const nicknameResult = await this.setAfkNickname(message, member, client); // Get result from setting nickname

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('😴 AFK Mode Activated')
            .setDescription(`You are now AFK. Reason: **${reason}**`)
            .setTimestamp()
            .setFooter({ text: 'AFK Status', iconURL: message.author.displayAvatarURL({ dynamic: true }) });

         if (nicknameResult) { // If there was an issue with the nickname, add it to the embed
            embed.addFields({ name: "Nickname Update", value: nicknameResult});
        }

        await message.reply({ embeds: [embed] });
    },

    async setAfkNickname(interactionOrMessage, member, client) {
        try {
            const guild = interactionOrMessage.guild || interactionOrMessage.message.guild;
            const isOwner = member.id === guild.ownerId;
            const nishankaRole = guild.roles.cache.find(role => role.name === 'Nishanka');

             if (isOwner) {
                return "I cannot change the nickname of the server owner.";
            }

            if (!nishankaRole) {
                return "The 'Nishanka' role was not found. Ensure there is a role named 'Nishanka'";
            }

            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
                return "I do not have the 'Manage Nicknames' permission to change your nickname. Ask an admin to grant me this permission.";
            }

            if (guild.members.me.roles.highest.position < nishankaRole.position) {
                return "My role ('Nishanka') is not high enough in the role hierarchy.  Please move it higher so I can manage nicknames.";
            }

            if (member.manageable) {
                await member.setNickname(`[AFK] ${member.displayName}`);
                return null; // No issue to report
            } else {
                console.warn(`Bot does not have permission to change nickname for ${member.user ? member.user.tag : member.author.tag}`);
                return "I do not have permission to change your nickname. This usually means your role is higher than mine.";
            }


        } catch (error) {
            console.error("Error setting nickname:", error);
            return "There was an error setting your AFK status.  Check the bot's console for details. I might not have the right permissions.";
        }
    }
};