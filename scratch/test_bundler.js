const { bundleSlashCommands } = require('../utils/slashCommandsBundler');

try {
    const commands = bundleSlashCommands();
    console.log(`Success! Bundled ${commands.length} top level commands.`);
    console.log(commands.map(c => `/${c.name} - ${c.description}`));
} catch (error) {
    console.error("Failed to bundle commands:", error);
}
