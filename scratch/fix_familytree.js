const fs = require('fs');

let c = fs.readFileSync('commands/fun/familytree.js', 'utf8');

const regex = /async function generateTreeImage\(client, subjectUser\) \{[\s\S]*?return new AttachmentBuilder\(buffer, \{ name: 'familytree\.png' \}\);\n\}/;

const replacement = `async function generateTreeImage(client, subjectUser) {
    // Fetch family data and auto-sync retroactively
    await syncFamily(subjectUser.id);
    let familyData = await Family.findOne({ userId: subjectUser.id });

    if (!familyData) {
        familyData = new Family({ userId: subjectUser.id });
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

    const maxNodesInRow = Math.max(
        activeParents.length,
        activeSiblings.length + (spouse ? 2 : 1),
        activeChildren.length
    );

    const nodeSpacing = 160;
    const canvasWidth = Math.max(1000, maxNodesInRow * nodeSpacing + 200);
    const canvasHeight = 600;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 1. Background Gradient
    const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
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
    ctx.fillText(\`FAMILY TREE: \${subjectUser.username.toUpperCase()}\`, canvasWidth / 2, 30);

    // 3. Layout Mapping
    const nodes = [];
    const lines = [];
    const midpointX = canvasWidth / 2;

    // Gen 2: Subject & Spouse & Siblings (y = 300)
    // Draw subject + spouse in middle, siblings spread around them
    const gen2Y = 300;
    let userX = midpointX;
    let spouseX = null;
    let subjectBlockCenter = midpointX;

    if (spouse) {
        userX = midpointX - 80;
        spouseX = midpointX + 80;
        nodes.push({ user: subjectProfile, label: 'You', x: userX, y: gen2Y, isHighlighted: true });
        nodes.push({ user: spouse, label: 'Spouse', x: spouseX, y: gen2Y });
        lines.push({ x1: userX, y1: gen2Y - 10, x2: spouseX, y2: gen2Y - 10, isSpouse: true });
    } else {
        nodes.push({ user: subjectProfile, label: 'You', x: userX, y: gen2Y, isHighlighted: true });
    }

    if (activeSiblings.length > 0) {
        let leftSiblings = [];
        let rightSiblings = [];
        activeSiblings.forEach((sib, idx) => {
            if (idx % 2 === 0) leftSiblings.push(sib);
            else rightSiblings.push(sib);
        });

        const sibSpacing = nodeSpacing;
        leftSiblings.forEach((sib, idx) => {
            const sx = (userX - sibSpacing) - (idx * sibSpacing);
            nodes.push({ user: sib, label: 'Sibling', x: sx, y: gen2Y });
            lines.push({ x1: sx, y1: 200, x2: sx, y2: gen2Y - 10 });
        });

        const rightBase = spouse ? spouseX : userX;
        rightSiblings.forEach((sib, idx) => {
            const sx = (rightBase + sibSpacing) + (idx * sibSpacing);
            nodes.push({ user: sib, label: 'Sibling', x: sx, y: gen2Y });
            lines.push({ x1: sx, y1: 200, x2: sx, y2: gen2Y - 10 });
        });
    }

    // Gen 1: Parents (y = 110)
    const gen1Y = 110;
    if (activeParents.length > 0) {
        const pCount = activeParents.length;
        const pStartX = midpointX - ((pCount - 1) * nodeSpacing) / 2;
        
        let minPX = pStartX;
        let maxPX = pStartX;

        activeParents.forEach((parent, index) => {
            const px = pStartX + index * nodeSpacing;
            nodes.push({ user: parent, label: 'Parent', x: px, y: gen1Y });
            lines.push({ x1: px, y1: gen1Y, x2: px, y2: 200 }); // drop to gen 1 divider
            if (px > maxPX) maxPX = px;
        });

        // Parent connecting line
        if (pCount > 1) {
            lines.push({ x1: minPX, y1: 200, x2: maxPX, y2: 200, isHorizontal: true });
        }
        
        // Link to Gen 2
        lines.push({ x1: midpointX, y1: 200, x2: userX, y2: 200, isHorizontal: true });
        lines.push({ x1: userX, y1: 200, x2: userX, y2: gen2Y - 10 });

        // Connect siblings to parents
        if (activeSiblings.length > 0) {
            const allSibXs = nodes.filter(n => n.label === 'Sibling').map(n => n.x);
            const minSibX = Math.min(...allSibXs);
            const maxSibX = Math.max(...allSibXs);
            lines.push({ x1: Math.min(minSibX, userX), y1: 200, x2: Math.max(maxSibX, userX), y2: 200, isHorizontal: true });
        }
    }

    // Gen 3: Children (y = 490)
    const gen3Y = 490;
    if (activeChildren.length > 0) {
        const cCount = activeChildren.length;
        const cStartX = subjectBlockCenter - ((cCount - 1) * nodeSpacing) / 2;

        activeChildren.forEach((child, index) => {
            const cx = cStartX + index * nodeSpacing;
            nodes.push({ user: child, label: 'Child', x: cx, y: gen3Y });
            lines.push({ x1: cx, y1: 390, x2: cx, y2: gen3Y - 10 }); 
        });

        lines.push({ x1: subjectBlockCenter, y1: gen2Y - 10, x2: subjectBlockCenter, y2: 390 });
        if (cCount > 1) {
            lines.push({ x1: cStartX, y1: 390, x2: cStartX + (cCount - 1) * nodeSpacing, y2: 390, isHorizontal: true });
        }
    }

    // 4. Draw connection lines
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
}`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('commands/fun/familytree.js', c);
    console.log("Successfully updated familytree.js");
} else {
    console.log("Regex did not match.");
}
