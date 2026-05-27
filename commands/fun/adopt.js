/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Family = require('../../models/familySchema');

module.exports = {
    category: 'fun',
    cooldown: 8,
    data: new SlashCommandBuilder()
        .setName('adopt')
        .setDescription('Propose adopting another user!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to adopt as your child')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const proposer = interaction.user;
        const target = interaction.options.getUser('user');

        const { embed, components, error } = await proposeAdoption(proposer, target);

        if (error) {
            return interaction.editReply({ content: `❌ ${error}` });
        }

        const msg = await interaction.editReply({ embeds: [embed], components: [components] });
        handleAdoptionCollector(msg, proposer, target);
    },

    async executePrefix(message, args) {
        const proposer = message.author;
        const target = message.mentions.users.first() 
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null);

        if (!target) {
            return message.reply('❌ Mention the user you want to adopt!').catch(() => {});
        }

        const msgIndicator = await message.reply('👶 Processing adoption...');
        const { embed, components, error } = await proposeAdoption(proposer, target);

        if (error) {
            return msgIndicator.edit({ content: `❌ ${error}` }).catch(() => {});
        }

        await msgIndicator.delete().catch(() => {});
        const mainMsg = await message.reply({ embeds: [embed], components: [components] });
        handleAdoptionCollector(mainMsg, proposer, target);
    }
};

async function proposeAdoption(proposer, target) {
    if (proposer.id === target.id) {
        return { error: "You cannot adopt yourself!" };
    }
    if (target.bot) {
        return { error: "You cannot adopt a bot!" };
    }

    const getFamily = async (id) => {
        let f = await Family.findOne({ userId: id });
        if (!f) {
            f = new Family({ userId: id });
            await f.save();
        }
        return f;
    };

    const proposerFamily = await getFamily(proposer.id);
    const targetFamily = await getFamily(target.id);

    if (proposerFamily.parents.includes(target.id)) {
        return { error: "You cannot adopt your own parent! That's a circular family tree anomaly." };
    }
    if (proposerFamily.spouseId === target.id) {
        return { error: "You cannot adopt your spouse!" };
    }
    if (targetFamily.parents.length >= 2) {
        return { error: "This user already has 2 parents!" };
    }
    if (targetFamily.pendingAdoptionProposals.includes(proposer.id)) {
        return { error: "You already have a pending adoption proposal sent to this user." };
    }

    targetFamily.pendingAdoptionProposals.push(proposer.id);
    await targetFamily.save();

    const embed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('👶 Adoption Proposal!')
        .setDescription(`**${proposer.username}** wants to adopt **${target.username}** as their child!\n\n*${target.username}, do you agree to be adopted?*`)
        .setFooter({ text: 'This proposal will expire in 60 seconds.' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('accept_adoption')
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🍼'),
        new ButtonBuilder()
            .setCustomId('decline_adoption')
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚪')
    );

    return { embed, components: row };
}

function handleAdoptionCollector(message, proposer, target) {
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async i => {
        if (i.user.id !== target.id) {
            return i.reply({ content: `❌ Only **${target.username}** can respond to this adoption request!`, ephemeral: true });
        }

        await i.deferUpdate();

        const proposerFamily = await Family.findOne({ userId: proposer.id });
        const targetFamily = await Family.findOne({ userId: target.id });

        if (!proposerFamily || !targetFamily) {
            return i.followUp({ content: '❌ Data error occurred.', ephemeral: true });
        }

        // Clean proposals list
        targetFamily.pendingAdoptionProposals = targetFamily.pendingAdoptionProposals.filter(id => id !== proposer.id);

        if (i.customId === 'accept_adoption') {
            if (targetFamily.parents.length >= 2) {
                await targetFamily.save();
                const embed = new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('❌ Adoption Failed')
                    .setDescription(`**${target.username}** already has the maximum limit of 2 parents!`);
                return message.edit({ embeds: [embed], components: [] });
            }

            targetFamily.parents.push(proposer.id);
            if (!proposerFamily.children.includes(target.id)) {
                proposerFamily.children.push(target.id);
            }

            await targetFamily.save();
            await proposerFamily.save();

            const embed = new EmbedBuilder()
                .setColor(0x4ade80)
                .setTitle('🍼 ADOPTION SUCCESSFUL!')
                .setDescription(`🎉 **${target.username}** has been adopted by **${proposer.username}**! Welcome to the family! 🎉`)
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });
        } else {
            await targetFamily.save();

            const embed = new EmbedBuilder()
                .setColor(0xf87171)
                .setTitle('❌ Adoption Declined')
                .setDescription(`**${target.username}** declined the adoption request.`);

            await message.edit({ embeds: [embed], components: [] });
        }
        collector.stop();
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const targetFamily = await Family.findOne({ userId: target.id });
            if (targetFamily && targetFamily.pendingAdoptionProposals.includes(proposer.id)) {
                targetFamily.pendingAdoptionProposals = targetFamily.pendingAdoptionProposals.filter(id => id !== proposer.id);
                await targetFamily.save();
            }

            const embed = new EmbedBuilder()
                .setColor(0xf87171)
                .setTitle('⏰ Adoption Proposal Expired')
                .setDescription(`The adoption proposal from **${proposer.username}** to **${target.username}** has expired.`);

            await message.edit({ embeds: [embed], components: [] }).catch(() => {});
        }
    });
}
