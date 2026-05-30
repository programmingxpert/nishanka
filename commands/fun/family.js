/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Family = require('../../models/familySchema');
const { syncFamily } = require('../../utils/familySync');

module.exports = {
    category: 'fun',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('family')
        .setDescription('View your family tree or someone else\'s family tree!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose family tree you want to view (optional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const user = interaction.options.getUser('user') || interaction.user;

        const { embed, error } = await getFamilyEmbed(user);

        if (error) {
            return interaction.editReply({ content: `❌ ${error}` });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const user = message.mentions.users.first() 
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null) 
            || message.author;

        const msgIndicator = await message.reply('👪 Fetching family data...');
        const { embed, error } = await getFamilyEmbed(user);

        if (error) {
            return msgIndicator.edit({ content: `❌ ${error}` }).catch(() => {});
        }

        await msgIndicator.delete().catch(() => {});
        await message.reply({ embeds: [embed] });
    }
};

async function getFamilyEmbed(user) {
    // Sync family data retroactively before building the embed
    await syncFamily(user.id);

    // Step 1: Recursively traverse connected component of the family tree
    const connectedIds = new Set();
    async function traverse(id, depth = 0) {
        if (depth > 6) return;
        if (connectedIds.has(id)) return;
        connectedIds.add(id);
        
        const doc = await Family.findOne({ userId: id }).lean();
        if (!doc) return;
        
        const relatives = [];
        if (doc.spouseId) relatives.push(doc.spouseId);
        if (doc.parents) relatives.push(...doc.parents);
        if (doc.children) relatives.push(...doc.children);
        
        // Siblings
        if (doc.parents && doc.parents.length > 0) {
            const siblingDocs = await Family.find({ parents: { $in: doc.parents } }).select('userId').lean();
            for (const sib of siblingDocs) {
                relatives.push(sib.userId);
            }
        }
        
        for (const rId of relatives) {
            await traverse(rId, depth + 1);
        }
    }
    await traverse(user.id);

    // Fetch details for all connected documents
    const docs = await Family.find({ userId: { $in: Array.from(connectedIds) } }).lean();
    const docMap = new Map();
    for (const doc of docs) {
        docMap.set(doc.userId, doc);
    }
    for (const id of connectedIds) {
        if (!docMap.has(id)) {
            docMap.set(id, { userId: id, parents: [], children: [], spouseId: null });
        }
    }

    // Step 2: BFS for generation mapping
    const generationMap = new Map();
    const queue = [user.id];
    generationMap.set(user.id, 0);

    while (queue.length > 0) {
        const currentId = queue.shift();
        const currentGen = generationMap.get(currentId);
        const doc = docMap.get(currentId);
        
        const sameLevel = [];
        if (doc.spouseId) sameLevel.push(doc.spouseId);
        
        if (doc.parents && doc.parents.length > 0) {
            for (const otherId of connectedIds) {
                if (otherId === currentId) continue;
                const otherDoc = docMap.get(otherId);
                if (otherDoc && otherDoc.parents && otherDoc.parents.some(p => doc.parents.includes(p))) {
                    sameLevel.push(otherId);
                }
            }
        }
        
        for (const id of sameLevel) {
            if (!generationMap.has(id)) {
                generationMap.set(id, currentGen);
                queue.push(id);
            }
        }
        
        if (doc.parents) {
            for (const pId of doc.parents) {
                if (!generationMap.has(pId)) {
                    generationMap.set(pId, currentGen - 1);
                    queue.push(pId);
                }
            }
        }
        
        if (doc.children) {
            for (const cId of doc.children) {
                if (!generationMap.has(cId)) {
                    generationMap.set(cId, currentGen + 1);
                    queue.push(cId);
                }
            }
        }
    }

    for (const id of connectedIds) {
        if (!generationMap.has(id)) {
            generationMap.set(id, 0);
        }
    }

    // Classify relations
    const spouseId = docMap.get(user.id)?.spouseId || null;
    const parents = docMap.get(user.id)?.parents || [];
    const children = docMap.get(user.id)?.children || [];
    
    // Find siblings
    let siblingIds = [];
    if (parents.length > 0) {
        siblingIds = Array.from(connectedIds).filter(id => {
            if (id === user.id) return false;
            const doc = docMap.get(id);
            return doc && doc.parents && doc.parents.some(p => parents.includes(p));
        });
    }

    const grandparents = [];
    const grandchildren = [];
    const auntsUncles = [];
    const cousins = [];
    const inLaws = [];
    const otherRelatives = [];

    for (const id of connectedIds) {
        if (id === user.id || id === spouseId || parents.includes(id) || children.includes(id) || siblingIds.includes(id)) {
            continue;
        }
        
        const gen = generationMap.get(id);
        const doc = docMap.get(id);

        if (gen === -2) {
            grandparents.push(id);
        } else if (gen === 2) {
            grandchildren.push(id);
        } else if (gen === -1) {
            if (spouseId) {
                const spouseDoc = docMap.get(spouseId);
                if (spouseDoc && spouseDoc.parents && spouseDoc.parents.includes(id)) {
                    inLaws.push(id);
                    continue;
                }
            }
            auntsUncles.push(id);
        } else if (gen === 0) {
            cousins.push(id);
        } else if (gen === 1) {
            otherRelatives.push(id);
        } else {
            otherRelatives.push(id);
        }
    }

    const embed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle(`👪 Family Tree of ${user.username}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'Global Family Tree System | Nishanka' });

    const fmt = list => list.length > 0 ? list.map(id => `<@${id}>`).join(', ') : 'None';

    embed.addFields(
        { name: '💍 Spouse', value: spouseId ? `<@${spouseId}>` : 'Single', inline: false },
        { name: '🧓 Parents', value: fmt(parents), inline: true },
        { name: '👤 Siblings', value: fmt(siblingIds), inline: true },
        { name: '👶 Children', value: fmt(children), inline: true }
    );

    if (grandparents.length > 0) {
        embed.addFields({ name: '👴 Grandparents', value: fmt(grandparents), inline: true });
    }
    if (grandchildren.length > 0) {
        embed.addFields({ name: '🍼 Grandchildren', value: fmt(grandchildren), inline: true });
    }
    if (auntsUncles.length > 0) {
        embed.addFields({ name: '📣 Aunts & Uncles', value: fmt(auntsUncles), inline: true });
    }
    if (cousins.length > 0) {
        embed.addFields({ name: '👥 Cousins', value: fmt(cousins), inline: true });
    }
    if (inLaws.length > 0) {
        embed.addFields({ name: '🤝 In-Laws', value: fmt(inLaws), inline: true });
    }
    if (otherRelatives.length > 0) {
        embed.addFields({ name: '✨ Extended Relatives', value: fmt(otherRelatives), inline: true });
    }

    return { embed };
}
