/* eslint-disable */
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const Family = require('../../models/familySchema');

async function resolveUser(client, id) {
    if (!id) return null;
    try {
        const u = await client.users.fetch(id);
        return {
            userId: u.id,
            username: u.username,
            displayName: u.displayName || u.globalName || u.username,
            avatarUrl: u.displayAvatarURL({ extension: 'png', size: 128 })
        };
    } catch (e) {
        return {
            userId: id,
            username: `user_${id}`,
            displayName: `Unknown (${id.slice(0, 4)})`,
            avatarUrl: null
        };
    }
}

async function generateTreeImage(client, subjectUser) {
    const canvas = createCanvas(1000, 600);
    const ctx = canvas.getContext('2d');

    // 1. Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 1000, 600);
    grad.addColorStop(0, '#0d0d14');
    grad.addColorStop(1, '#1b1b26');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Main Outer Border
    ctx.strokeStyle = '#2f2f3f';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);

    // Title text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`FAMILY TREE: ${subjectUser.username.toUpperCase()}`, 500, 30);

    // Fetch family data
    let familyData = await Family.findOne({ userId: subjectUser.id });
    if (!familyData) {
        familyData = new Family({ userId: subjectUser.id });
        await familyData.save();
    }

    // Resolve Siblings
    let siblingIds = [];
    if (familyData.parents && familyData.parents.length > 0) {
        const siblingDocs = await Family.find({
            userId: { $ne: subjectUser.id },
            parents: { $in: familyData.parents }
        }).lean();
        siblingIds = siblingDocs.map(d => d.userId);
    }

    // Resolve Discord profiles
    const [
        spouse,
        parents,
        children,
        siblings,
        subjectProfile
    ] = await Promise.all([
        resolveUser(client, familyData.spouseId),
        Promise.all((familyData.parents || []).map(id => resolveUser(client, id))),
        Promise.all((familyData.children || []).map(id => resolveUser(client, id))),
        Promise.all(siblingIds.map(id => resolveUser(client, id))),
        resolveUser(client, subjectUser.id)
    ]);

    const activeParents = parents.filter(Boolean);
    const activeChildren = children.filter(Boolean);
    const activeSiblings = siblings.filter(Boolean);

    // 3. Layout Mapping
    const nodes = [];
    const lines = [];

    // Gen 2: Subject & Spouse & Siblings (y = 300)
    let userX = 500;
    let spouseX = null;

    if (spouse) {
        userX = 420;
        spouseX = 580;
        nodes.push({ user: subjectProfile, label: 'You', x: userX, y: 300, isHighlighted: true });
        nodes.push({ user: spouse, label: 'Spouse', x: spouseX, y: 300 });
        lines.push({ x1: userX, y1: 290, x2: spouseX, y2: 290, isSpouse: true });
    } else {
        nodes.push({ user: subjectProfile, label: 'You', x: userX, y: 300, isHighlighted: true });
    }

    const midpointX = spouse ? 500 : 500;

    // Gen 1: Parents (y = 110)
    let parentMidpointX = 500;
    if (activeParents.length === 1) {
        const px = 500;
        nodes.push({ user: activeParents[0], label: 'Parent', x: px, y: 110 });
        lines.push({ x1: px, y1: 110, x2: px, y2: 200 }); // Line down to gen divider
    } else if (activeParents.length === 2) {
        const p1x = 380;
        const p2x = 620;
        nodes.push({ user: activeParents[0], label: 'Parent', x: p1x, y: 110 });
        nodes.push({ user: activeParents[1], label: 'Parent', x: p2x, y: 110 });
        lines.push({ x1: p1x, y1: 100, x2: p2x, y2: 100, isHorizontal: true }); // Line between parents
        lines.push({ x1: 500, y1: 100, x2: 500, y2: 200 }); // Line down from parent midpoint
    }

    // Gen 2 Siblings placement
    if (activeSiblings.length > 0) {
        activeSiblings.forEach((sib, index) => {
            // Draw siblings starting left (180, 80) or right (820, 920)
            const sx = index % 2 === 0 ? 180 - Math.floor(index / 2) * 100 : 820 + Math.floor(index / 2) * 100;
            nodes.push({ user: sib, label: 'Sibling', x: sx, y: 300 });
            // Drop lines from parent divider down to siblings
            lines.push({ x1: sx, y1: 200, x2: sx, y2: 290 });
        });
    }

    // Connect Gen 1 drop line to Gen 2 family line
    if (activeParents.length > 0) {
        lines.push({ x1: 500, y1: 200, x2: userX, y2: 200, isHorizontal: true });
        lines.push({ x1: userX, y1: 200, x2: userX, y2: 290 }); // drop to subject
        
        if (activeSiblings.length > 0) {
            const minSibX = Math.min(...nodes.filter(n => n.label === 'Sibling').map(n => n.x));
            const maxSibX = Math.max(...nodes.filter(n => n.label === 'Sibling').map(n => n.x));
            lines.push({ x1: Math.min(minSibX, 500), y1: 200, x2: Math.max(maxSibX, 500), y2: 200, isHorizontal: true });
        }
    }

    // Gen 3: Children (y = 490)
    if (activeChildren.length > 0) {
        // Compute children X positions spaced around midpoint
        const cCount = activeChildren.length;
        const spacing = 140;
        const startX = midpointX - ((cCount - 1) * spacing) / 2;

        activeChildren.forEach((child, index) => {
            const cx = startX + index * spacing;
            nodes.push({ user: child, label: 'Child', x: cx, y: 490 });
            lines.push({ x1: cx, y1: 390, x2: cx, y2: 480 }); // Drop to child node
        });

        // Vertical drop from Gen 2 midpoint down to Gen 3 divider
        lines.push({ x1: midpointX, y1: 290, x2: midpointX, y2: 390 });
        if (cCount > 1) {
            lines.push({ x1: startX, y1: 390, x2: startX + (cCount - 1) * spacing, y2: 390, isHorizontal: true });
        }
    }

    // 4. Draw connection lines
    ctx.strokeStyle = '#2f2f3f';
    ctx.lineWidth = 3.5;
    lines.forEach(line => {
        ctx.beginPath();
        if (line.isSpouse) {
            // Draw double line for marriage
            ctx.strokeStyle = '#f97fa8'; // Pink line
            ctx.lineWidth = 4;
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();

            // Reset line style
            ctx.strokeStyle = '#2f2f3f';
            ctx.lineWidth = 3.5;
        } else {
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
        }
    });

    // 5. Draw Nodes
    const radius = 35;
    for (const node of nodes) {
        const avatarUrl = node.user.avatarUrl;
        let img = null;
        if (avatarUrl) {
            try {
                img = await loadImage(avatarUrl);
            } catch (e) {}
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y - 10, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        if (img) {
            ctx.drawImage(img, node.x - radius, node.y - 10 - radius, radius * 2, radius * 2);
        } else {
            ctx.fillStyle = '#7c6cf0';
            ctx.fillRect(node.x - radius, node.y - 10 - radius, radius * 2, radius * 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.user.displayName[0].toUpperCase(), node.x, node.y - 10);
        }
        ctx.restore();

        // Border
        ctx.beginPath();
        ctx.arc(node.x, node.y - 10, radius, 0, Math.PI * 2, true);
        if (node.isHighlighted) {
            ctx.strokeStyle = '#ffd700'; // Gold glow for User
            ctx.lineWidth = 4.5;
            ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
            ctx.shadowBlur = 15;
        } else {
            ctx.strokeStyle = '#7c6cf0'; // Primary color
            ctx.lineWidth = 2.5;
        }
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Label and name
        ctx.fillStyle = node.isHighlighted ? '#ffd700' : '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        let name = node.user.displayName;
        if (name.length > 12) name = name.slice(0, 10) + '..';
        ctx.fillText(name, node.x, node.y + 32);

        ctx.fillStyle = '#8b89ac';
        ctx.font = '9px sans-serif';
        ctx.fillText(node.label.toUpperCase(), node.x, node.y + 48);
    }

    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'familytree.png' });
}

module.exports = {
    category: 'fun',
    cooldown: 8,
    data: new SlashCommandBuilder()
        .setName('familytree')
        .setDescription('Generate a graphic rendering of your global family tree!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose tree you want to see (optional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const user = interaction.options.getUser('user') || interaction.user;

        try {
            const attachment = await generateTreeImage(interaction.client, user);
            await interaction.editReply({ files: [attachment] });
        } catch (err) {
            console.error('familytree command error:', err);
            await interaction.editReply('❌ Failed to generate family tree image.');
        }
    },

    async executePrefix(message, args) {
        const user = message.mentions.users.first() 
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null) 
            || message.author;

        const msg = await message.reply('👪 Generating family pedigree chart...');

        try {
            const attachment = await generateTreeImage(message.client, user);
            await msg.delete().catch(() => {});
            await message.reply({ files: [attachment] });
        } catch (err) {
            console.error('familytree command error:', err);
            await msg.edit('❌ Failed to generate family tree.');
        }
    }
};
