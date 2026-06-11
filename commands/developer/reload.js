/* eslint-disable */
const { SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
	hidden: true,
	devOnly: true,
	category: 'developer',
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads or loads a command.')
		.addStringOption(option =>
			option.setName('command')
				.setDescription('The command to reload or load.')
				.setRequired(true)
		),

	async execute(interaction) {
		const commandName = interaction.options.getString('command', true).toLowerCase();

		// Step 1: Look for the command in memory
		let oldCommand = interaction.client.commands.get(commandName);
		let folder = oldCommand?.category;

		// Step 2: If not found, try to find the file in commands subfolders
		if (!folder) {
			const basePath = path.join(__dirname, '..');
			const subfolders = fs.readdirSync(basePath).filter(f => fs.statSync(path.join(basePath, f)).isDirectory());

			for (const sub of subfolders) {
				const commandPath = path.join(basePath, sub, `${commandName}.js`);
				if (fs.existsSync(commandPath)) {
					folder = sub;
					break;
				}
			}
		}

		// Step 3: If still not found, abort
		if (!folder) {
			return interaction.reply({ content: `❌ Could not find the file for command \`${commandName}\` in any folder.`, ephemeral: true });
		}

		const commandPath = path.join(__dirname, '..', folder, `${commandName}.js`);

		try {
			// Reload the module
			delete require.cache[require.resolve(commandPath)];
			const newCommand = require(commandPath);

			if (!newCommand.data || !newCommand.execute) {
				return interaction.reply(`⚠️ The reloaded file is missing "data" or "execute".`);
			}

			newCommand.category = folder;
			interaction.client.commands.set(newCommand.data.name, newCommand);

			// ✅ Sync all commands with Discord API
			const clientId = interaction.client.user.id;
			const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

			const allCommands = [];
			interaction.client.commands.forEach(cmd => {
				if (cmd.data) allCommands.push(cmd.data.toJSON());
			});

			await rest.put(Routes.applicationCommands(clientId), { body: allCommands });

			await interaction.reply(`✅ Command \`${newCommand.data.name}\` was loaded/reloaded from folder \`${folder}\`!`);
			console.log(`✅ Command \`${newCommand.data.name}\` was loaded/reloaded from folder \`${folder}\``);
		} catch (error) {
			console.error(error);
			await interaction.reply(`💥 Error loading \`${commandName}\`: \`${error.message}\``);
		}
	},
};
