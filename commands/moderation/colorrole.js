const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkCommandPermission } = require('../../utils/permissions');

module.exports = {
    category: 'moderation',
    cooldown: 5,
    aliases: ['cr', 'color', 'hexcolor', 'colorole'],
    data: new SlashCommandBuilder()
        .setName('colorrole')
        .setDescription('Creates or updates a custom hex color role for yourself or another user.')
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Hex color code (e.g. #FF5733) or "clear" to remove your custom color')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to assign the color role to (optional, defaults to you)')
                .setRequired(false)),

    async execute(interaction) {
        if (!await checkCommandPermission(interaction, 'bot')) {
            return interaction.reply({ content: '❌ You do not have permission to run this command.', ephemeral: true });
        }

        const colorInput = interaction.options.getString('color').trim();
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const guild = interaction.guild;

        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
        }

        const botMember = guild.members.me;
        if (!botMember.permissions.has('ManageRoles')) {
            return interaction.reply({ content: '❌ I do not have permission to manage roles in this server.', ephemeral: true });
        }

        // Handle Clear / Remove
        if (colorInput.toLowerCase() === 'clear' || colorInput.toLowerCase() === 'remove') {
            const existingRole = member.roles.cache.find(r => r.name.startsWith('Color - '));
            if (existingRole) {
                if (existingRole.position >= botMember.roles.highest.position) {
                    return interaction.reply({ content: `❌ I cannot delete the role **${existingRole.name}** because it is positioned higher than my role.`, ephemeral: true });
                }
                await existingRole.delete(`Custom color role removed by command`).catch(console.error);
                return interaction.reply({ content: `✅ Successfully removed and deleted custom color role for **${targetUser.username}**.` });
            } else {
                return interaction.reply({ content: `❌ **${targetUser.username}** does not have a custom color role to remove.`, ephemeral: true });
            }
        }

        // Validate Hex Color
        const hexRegex = /^#?[0-9A-F]{6}$/i;
        if (!hexRegex.test(colorInput)) {
            return interaction.reply({ content: '❌ Invalid hex color code! Please use a valid hex code like `#FF5733` or `00FF00`, or use `clear` to remove the role.', ephemeral: true });
        }
        const hexColor = colorInput.startsWith('#') ? colorInput : `#${colorInput}`;

        try {
            let existingRole = member.roles.cache.find(r => r.name.startsWith('Color - '));
            
            if (existingRole) {
                if (existingRole.position >= botMember.roles.highest.position) {
                    return interaction.reply({ content: `❌ I cannot edit the role **${existingRole.name}** because it is positioned higher than my role.`, ephemeral: true });
                }
                await existingRole.edit({
                    color: hexColor,
                    reason: `Custom color role updated by ${interaction.user.tag}`
                });
                
                if (!member.roles.cache.has(existingRole.id)) {
                    await member.roles.add(existingRole);
                }
                
                return interaction.reply({ content: `✅ Successfully updated custom color role color to **${hexColor}** for **${targetUser.username}**.` });
            } else {
                // Create a new role
                const newRole = await guild.roles.create({
                    name: `Color - ${targetUser.username}`,
                    color: hexColor,
                    reason: `Custom color role created by ${interaction.user.tag}`
                });

                // Position it below the bot's highest role
                const botHighestRole = botMember.roles.highest;
                if (botHighestRole.position > 1) {
                    await newRole.setPosition(botHighestRole.position - 1).catch(err => {
                        console.error('Failed to set position for color role:', err);
                    });
                }

                await member.roles.add(newRole);
                return interaction.reply({ content: `✅ Successfully created and assigned custom color role **${newRole.name}** with color **${hexColor}**.` });
            }
        } catch (err) {
            console.error('[ColorRole] Error managing color role:', err);
            return interaction.reply({ content: '❌ An error occurred while creating or updating the color role.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (!await checkCommandPermission(message, 'bot')) {
            return message.reply('❌ You do not have permission to run this command.');
        }

        const targetUser = message.mentions.users.first() || message.author;
        const guild = message.guild;

        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return message.reply('❌ User not found in this server.');
        }

        const botMember = guild.members.me;
        if (!botMember.permissions.has('ManageRoles')) {
            return message.reply('❌ I do not have permission to manage roles in this server.');
        }

        // Find the color argument (either the first or second arg, excluding the mention if it was specified)
        let colorInput = null;
        const hexRegex = /^#?[0-9A-F]{6}$/i;
        const isColorOrClear = (str) => {
            if (!str) return false;
            const s = str.toLowerCase();
            return s === 'clear' || s === 'remove' || hexRegex.test(str);
        };

        // Filter out arguments that look like mentions to isolate the color code
        const nonMentionArgs = args.filter(arg => !(arg.startsWith('<') && arg.endsWith('>')));
        
        if (isColorOrClear(nonMentionArgs[0])) {
            colorInput = nonMentionArgs[0].trim();
        } else if (isColorOrClear(args[0])) {
            colorInput = args[0].trim();
        } else if (args[0]) {
            colorInput = args[0].trim();
        }

        if (!colorInput) {
            return message.reply('❌ Please specify a hex color or "clear". Example: `-colorrole #FF5733 [@user]`');
        }

        // Handle Clear / Remove
        if (colorInput.toLowerCase() === 'clear' || colorInput.toLowerCase() === 'remove') {
            const existingRole = member.roles.cache.find(r => r.name.startsWith('Color - '));
            if (existingRole) {
                if (existingRole.position >= botMember.roles.highest.position) {
                    return message.reply(`❌ I cannot delete the role **${existingRole.name}** because it is positioned higher than my role.`);
                }
                await existingRole.delete(`Custom color role removed by command`).catch(console.error);
                return message.reply(`✅ Successfully removed and deleted custom color role for **${targetUser.username}**.`);
            } else {
                return message.reply(`❌ **${targetUser.username}** does not have a custom color role to remove.`);
            }
        }

        // Validate Hex Color
        if (!hexRegex.test(colorInput)) {
            return message.reply('❌ Invalid hex color code! Please use a valid hex code like `#FF5733` or `00FF00`, or use `clear` to remove the role.');
        }
        const hexColor = colorInput.startsWith('#') ? colorInput : `#${colorInput}`;

        try {
            let existingRole = member.roles.cache.find(r => r.name.startsWith('Color - '));
            
            if (existingRole) {
                if (existingRole.position >= botMember.roles.highest.position) {
                    return message.reply(`❌ I cannot edit the role **${existingRole.name}** because it is positioned higher than my role.`);
                }
                await existingRole.edit({
                    color: hexColor,
                    reason: `Custom color role updated by ${message.author.tag}`
                });
                
                if (!member.roles.cache.has(existingRole.id)) {
                    await member.roles.add(existingRole);
                }
                
                return message.reply(`✅ Successfully updated custom color role color to **${hexColor}** for **${targetUser.username}**.`);
            } else {
                // Create a new role
                const newRole = await guild.roles.create({
                    name: `Color - ${targetUser.username}`,
                    color: hexColor,
                    reason: `Custom color role created by ${message.author.tag}`
                });

                // Position it below the bot's highest role
                const botHighestRole = botMember.roles.highest;
                if (botHighestRole.position > 1) {
                    await newRole.setPosition(botHighestRole.position - 1).catch(err => {
                        console.error('Failed to set position for color role:', err);
                    });
                }

                await member.roles.add(newRole);
                return message.reply(`✅ Successfully created and assigned custom color role **${newRole.name}** with color **${hexColor}**.`);
            }
        } catch (err) {
            console.error('[ColorRole] Error managing color role:', err);
            return message.reply('❌ An error occurred while creating or updating the color role.');
        }
    }
};
