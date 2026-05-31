const fs = require('fs');
const path = require('path');

// Mock discord.js
const discordMock = {
    SlashCommandBuilder: class {
        constructor() {
            this.options = [];
        }
        setName(name) { this.name = name; return this; }
        setDescription(desc) { this.description = desc; return this; }
        addStringOption(fn) { this._addOption(fn, 'string'); return this; }
        addIntegerOption(fn) { this._addOption(fn, 'integer'); return this; }
        addBooleanOption(fn) { this._addOption(fn, 'boolean'); return this; }
        addUserOption(fn) { this._addOption(fn, 'user'); return this; }
        addChannelOption(fn) { this._addOption(fn, 'channel'); return this; }
        addRoleOption(fn) { this._addOption(fn, 'role'); return this; }
        addMentionableOption(fn) { this._addOption(fn, 'mentionable'); return this; }
        addNumberOption(fn) { this._addOption(fn, 'number'); return this; }
        addAttachmentOption(fn) { this._addOption(fn, 'attachment'); return this; }
        _addOption(fn, type) {
            const opt = { type, choices: [] };
            const optBuilder = {
                setName: (n) => { opt.name = n; return optBuilder; },
                setDescription: (d) => { opt.description = d; return optBuilder; },
                setRequired: (r) => { opt.required = r; return optBuilder; },
                addChoices: (...choices) => { opt.choices.push(...choices); return optBuilder; },
                setMinValue: () => optBuilder,
                setMaxValue: () => optBuilder,
                setMinLength: () => optBuilder,
                setMaxLength: () => optBuilder
            };
            fn(optBuilder);
            this.options.push(opt);
        }
    },
    EmbedBuilder: class {
        setColor() { return this; }
        setTitle() { return this; }
        setAuthor() { return this; }
        setDescription() { return this; }
        addFields() { return this; }
        setFooter() { return this; }
        setTimestamp() { return this; }
    },
    ActionRowBuilder: class {
        addComponents() { return this; }
    },
    StringSelectMenuBuilder: class {
        setCustomId() { return this; }
        setPlaceholder() { return this; }
        addOptions() { return this; }
    },
    ButtonBuilder: class {
        setCustomId() { return this; }
        setLabel() { return this; }
        setStyle() { return this; }
        setEmoji() { return this; }
    },
    ButtonStyle: { Primary: 1, Secondary: 2, Success: 3, Danger: 4, Link: 5 },
    ComponentType: {}
};

// Mock mongoose models
const mongooseMock = {
    Schema: class {},
    model: () => ({}),
    connect: () => {}
};

// Override require to intercept discord.js and local models
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
    if (request === 'discord.js') return discordMock;
    if (request === 'mongoose') return mongooseMock;
    if (request.includes('../../models/')) return mongooseMock;
    if (request.includes('../../utils/')) return {};
    
    try {
        return originalRequire.apply(this, arguments);
    } catch (e) {
        return {}; // Return empty object for any other failing requires
    }
};

const commandsDir = path.join('C:\\Projects\\Projects\\Projects\\nishanka\\commands');
const outputDir = path.join('C:\\Projects\\Projects\\Projects\\nishanka\\dashboard-v2\\src\\data\\docs');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const getFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
};

const files = getFiles(commandsDir);
const categories = {};

for (const file of files) {
    try {
        // Clear cache so it re-evaluates
        delete require.cache[require.resolve(file)];
        const command = require(file);
        
        if (command && command.data && command.data.name) {
            const cat = command.category || path.basename(path.dirname(file));
            if (!categories[cat]) categories[cat] = [];
            
            const cmdData = {
                name: command.data.name,
                description: command.data.description || 'No description provided.',
                options: command.data.options || [],
                hasPrefixVersion: !!command.executePrefix,
                // Add default placeholders info based on common patterns
                dashboardConfigurable: false // Will be manually updated later
            };
            categories[cat].push(cmdData);
        }
    } catch (e) {
        console.error(`Failed to load ${file}:`, e.message);
    }
}

// Write JSON files
for (const [cat, cmds] of Object.entries(categories)) {
    // Sort by name
    cmds.sort((a, b) => a.name.localeCompare(b.name));
    
    fs.writeFileSync(
        path.join(outputDir, `${cat}.json`),
        JSON.stringify(cmds, null, 2)
    );
}

// Generate an index
const indexData = {
    categories: Object.keys(categories).map(c => ({
        id: c,
        name: c.charAt(0).toUpperCase() + c.slice(1),
        count: categories[c].length
    }))
};
fs.writeFileSync(
    path.join(outputDir, 'index.json'),
    JSON.stringify(indexData, null, 2)
);

console.log('Extraction complete. Output written to:', outputDir);
