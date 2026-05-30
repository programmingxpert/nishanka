/* eslint-disable */
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const Family = require('../../models/familySchema');
const { syncFamily } = require('../../utils/familySync');

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

function getRelationshipLabel(nodeId, subjectId, docMap, gen) {
    if (nodeId === subjectId) return 'You';
    
    const subjectDoc = docMap.get(subjectId);
    const nodeDoc = docMap.get(nodeId);
    
    if (subjectDoc) {
        if (subjectDoc.spouseId === nodeId) return 'Spouse';
        if (subjectDoc.parents && subjectDoc.parents.includes(nodeId)) return 'Parent';
        if (subjectDoc.children && subjectDoc.children.includes(nodeId)) return 'Child';
        
        // Sibling
        if (subjectDoc.parents && subjectDoc.parents.length > 0 && nodeDoc && nodeDoc.parents) {
            if (nodeDoc.parents.some(p => subjectDoc.parents.includes(p))) {
                return 'Sibling';
            }
        }
    }
    
    if (gen === -2) return 'Grandparent';
    if (gen === 2) return 'Grandchild';
    
    if (gen === -1) {
        if (subjectDoc && subjectDoc.spouseId) {
            const spouseDoc = docMap.get(subjectDoc.spouseId);
            if (spouseDoc && spouseDoc.parents && spouseDoc.parents.includes(nodeId)) {
                return 'In-Law';
            }
        }
        return 'Aunt/Uncle';
    }
    
    if (gen === 1) {
        return 'Relative';
    }
    
    if (gen === 0) {
        return 'Cousin';
    }
    
    if (gen < -2) return 'Ancestor';
    if (gen > 2) return 'Descendant';
    
    return 'Relative';
}

async function generateTreeImage(client, subjectUser) {
    // Fetch family data and auto-sync retroactively
    await syncFamily(subjectUser.id);

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
    await traverse(subjectUser.id);

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
    const queue = [subjectUser.id];
    generationMap.set(subjectUser.id, 0);

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

    let minGen = 0;
    let maxGen = 0;
    for (const [id, gen] of generationMap.entries()) {
        if (gen < minGen) minGen = gen;
        if (gen > maxGen) maxGen = gen;
    }

    // Group nodes by generation
    const genNodes = new Map();
    for (let g = minGen; g <= maxGen; g++) {
        genNodes.set(g, []);
    }
    for (const id of connectedIds) {
        const gen = generationMap.get(id);
        genNodes.get(gen).push(id);
    }

    // Step 3: Layout Solving (X-coordinates)
    const nodeSpacing = 160;
    const spouseSpacing = 100;
    const xMap = new Map();

    const xQueue = [subjectUser.id];
    const visitedForX = new Set([subjectUser.id]);
    xMap.set(subjectUser.id, 0);

    while (xQueue.length > 0) {
        const curr = xQueue.shift();
        const currX = xMap.get(curr);
        const doc = docMap.get(curr);
        
        if (doc.spouseId && !visitedForX.has(doc.spouseId)) {
            xMap.set(doc.spouseId, currX + spouseSpacing);
            visitedForX.add(doc.spouseId);
            xQueue.push(doc.spouseId);
        }
        
        if (doc.children && doc.children.length > 0) {
            const unplacedChildren = doc.children.filter(c => !visitedForX.has(c));
            if (unplacedChildren.length > 0) {
                const center = doc.spouseId ? (currX + xMap.get(doc.spouseId)) / 2 : currX;
                const startX = center - ((unplacedChildren.length - 1) * nodeSpacing) / 2;
                unplacedChildren.forEach((child, idx) => {
                    xMap.set(child, startX + idx * nodeSpacing);
                    visitedForX.add(child);
                    xQueue.push(child);
                });
            }
        }
        
        if (doc.parents && doc.parents.length > 0) {
            const unplacedParents = doc.parents.filter(p => !visitedForX.has(p));
            if (unplacedParents.length > 0) {
                const startX = currX - ((unplacedParents.length - 1) * nodeSpacing) / 2;
                unplacedParents.forEach((parent, idx) => {
                    xMap.set(parent, startX + idx * nodeSpacing);
                    visitedForX.add(parent);
                    xQueue.push(parent);
                });
            }
        }
    }

    for (const id of connectedIds) {
        if (!xMap.has(id)) {
            xMap.set(id, 0);
        }
    }

    // Push overlaps apart
    for (let iter = 0; iter < 3; iter++) {
        for (let g = minGen; g <= maxGen; g++) {
            const nodesInGen = genNodes.get(g);
            if (nodesInGen.length <= 1) continue;
            
            nodesInGen.sort((a, b) => xMap.get(a) - xMap.get(b));
            
            for (let i = 1; i < nodesInGen.length; i++) {
                const prev = nodesInGen[i - 1];
                const curr = nodesInGen[i];
                const prevX = xMap.get(prev);
                const currX = xMap.get(curr);
                
                const isSpouse = (docMap.get(prev).spouseId === curr || docMap.get(curr).spouseId === prev);
                const reqSpacing = isSpouse ? spouseSpacing : nodeSpacing;
                
                if (currX < prevX + reqSpacing) {
                    xMap.set(curr, prevX + reqSpacing);
                }
            }
        }
    }

    // Center each generation around 0
    for (let g = minGen; g <= maxGen; g++) {
        const nodesInGen = genNodes.get(g);
        if (nodesInGen.length === 0) continue;
        
        const minX = Math.min(...nodesInGen.map(id => xMap.get(id)));
        const maxX = Math.max(...nodesInGen.map(id => xMap.get(id)));
        const width = maxX - minX;
        const offset = 0 - (minX + width / 2);
        
        for (const id of nodesInGen) {
            xMap.set(id, xMap.get(id) + offset);
        }
    }

    // Determine Canvas width and height dynamically
    let maxGenWidth = 1000;
    for (let g = minGen; g <= maxGen; g++) {
        const nodesInGen = genNodes.get(g);
        if (nodesInGen.length === 0) continue;
        const minX = Math.min(...nodesInGen.map(id => xMap.get(id)));
        const maxX = Math.max(...nodesInGen.map(id => xMap.get(id)));
        const width = maxX - minX + 220; // Margin on edges
        if (width > maxGenWidth) {
            maxGenWidth = width;
        }
    }

    const canvasWidth = maxGenWidth;
    const canvasHeight = Math.max(600, (maxGen - minGen + 1) * 180 + 160);

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Draw background
    const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    grad.addColorStop(0, '#0d0d14');
    grad.addColorStop(1, '#1b1b26');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#2f2f3f';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`FAMILY TREE: ${subjectUser.username.toUpperCase()}`, canvasWidth / 2, 30);

    // Resolve profiles and map coordinates to canvas center
    const profiles = await Promise.all(
        Array.from(connectedIds).map(id => resolveUser(client, id))
    );
    const profileMap = new Map();
    for (const p of profiles) {
        profileMap.set(p.userId, p);
    }

    const nodes = [];
    for (const id of connectedIds) {
        const gen = generationMap.get(id);
        const userProfile = profileMap.get(id);
        const label = getRelationshipLabel(id, subjectUser.id, docMap, gen);
        const x = xMap.get(id) + canvasWidth / 2;
        const y = 140 + (gen - minGen) * 180;
        
        nodes.push({
            user: userProfile,
            label,
            x,
            y,
            isHighlighted: (id === subjectUser.id)
        });
    }

    // Build connection lines
    const lines = [];

    // Spouse horizontal lines (pink line connecting them)
    for (const id of connectedIds) {
        const doc = docMap.get(id);
        if (doc.spouseId && id < doc.spouseId) {
            const x1 = xMap.get(id) + canvasWidth / 2;
            const x2 = xMap.get(doc.spouseId) + canvasWidth / 2;
            const y = 140 + (generationMap.get(id) - minGen) * 180;
            lines.push({ x1, y1: y - 10, x2, y2: y - 10, isSpouse: true });
        }
    }

    // Parent-child connections
    const parentPairToChildren = new Map();
    for (const childId of connectedIds) {
        const doc = docMap.get(childId);
        if (doc.parents && doc.parents.length > 0) {
            const parentKey = [...doc.parents].sort().join(',');
            if (!parentPairToChildren.has(parentKey)) {
                parentPairToChildren.set(parentKey, []);
            }
            parentPairToChildren.get(parentKey).push(childId);
        }
    }

    for (const [parentKey, childIds] of parentPairToChildren.entries()) {
        const parentIds = parentKey.split(',');
        const parentCoords = parentIds.map(pId => {
            return {
                x: xMap.get(pId) + canvasWidth / 2,
                y: 140 + (generationMap.get(pId) - minGen) * 180
            };
        });
        
        const parentY = parentCoords[0].y;
        let midParentX;
        if (parentCoords.length === 2) {
            midParentX = (parentCoords[0].x + parentCoords[1].x) / 2;
        } else {
            midParentX = parentCoords[0].x;
        }
        
        const childY = 140 + (generationMap.get(childIds[0]) - minGen) * 180;
        const midY = (parentY + childY) / 2;
        
        // Drop vertical line from parents midpoint
        lines.push({ x1: midParentX, y1: parentY - 10, x2: midParentX, y2: midY });
        
        // Horizontal bar
        const childXs = childIds.map(cId => xMap.get(cId) + canvasWidth / 2);
        const minChildX = Math.min(...childXs);
        const maxChildX = Math.max(...childXs);
        
        lines.push({ x1: Math.min(minChildX, midParentX), y1: midY, x2: Math.max(maxChildX, midParentX), y2: midY });
        
        // Drops to children
        for (const cX of childXs) {
            lines.push({ x1: cX, y1: midY, x2: cX, y2: childY - 10 });
        }
    }

    // Draw lines
    ctx.strokeStyle = '#2f2f3f';
    ctx.lineWidth = 3.5;
    lines.forEach(line => {
        ctx.beginPath();
        if (line.isSpouse) {
            ctx.strokeStyle = '#f97fa8';
            ctx.lineWidth = 4;
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
            
            ctx.strokeStyle = '#2f2f3f';
            ctx.lineWidth = 3.5;
        } else {
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
        }
    });

    // Draw Nodes
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

        // Node borders
        ctx.beginPath();
        ctx.arc(node.x, node.y - 10, radius, 0, Math.PI * 2, true);
        if (node.isHighlighted) {
            ctx.strokeStyle = '#ffd700'; 
            ctx.lineWidth = 4.5;
            ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
            ctx.shadowBlur = 15;
        } else {
            ctx.strokeStyle = '#7c6cf0'; 
            ctx.lineWidth = 2.5;
        }
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Label and name texts
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
