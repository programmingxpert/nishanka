/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const activeGames = new Set();
const recentLocations = []; // Track recent locations to prevent repeats

async function fetchRandomLocation() {
    try {
        // Fetch all countries with specific fields to avoid 400 error
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,capital,region,subregion');
        const countries = await res.json();

        if (!Array.isArray(countries)) {
            console.error('[GeoGuesser] Unexpected response from restcountries:', countries);
            return null;
        }

        // Loop until we find a country with a valid capital and an image on Wikipedia that is NOT a flag/map
        for (let i = 0; i < 15; i++) {
            const country = countries[Math.floor(Math.random() * countries.length)];
            if (!country || !country.capital || !country.capital[0]) continue;
            
            const capital = country.capital[0];
            
            // Skip if recently used
            if (recentLocations.includes(capital)) continue;

            const countryName = country.name.common;
            const region = country.subregion || country.region;
            
            // Try to fetch Wikipedia image for the capital
            const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(capital)}`);
            if (!wikiRes.ok) continue;
            
            const wikiData = await wikiRes.json();
            if (!wikiData.originalimage || !wikiData.originalimage.source) continue;

            const imgUrl = wikiData.originalimage.source;
            const lowerUrl = imgUrl.toLowerCase();
            
            // Filter out flags, maps, coat of arms, and logos
            if (lowerUrl.includes('flag') || lowerUrl.includes('map') || 
                lowerUrl.includes('coat_of_arms') || lowerUrl.includes('logo') || 
                lowerUrl.includes('locator')) {
                continue;
            }

            // Add to history and keep max 150 items to prevent repetition
            recentLocations.push(capital);
            if (recentLocations.length > 150) recentLocations.shift();

            return {
                capital: capital.toLowerCase(),
                country: countryName.toLowerCase(),
                display: `${capital}, ${countryName}`,
                image: imgUrl,
                hint: `It is the capital of a country located in **${region}**.`
            };
        }
    } catch (e) {
        console.error('[GeoGuesser] Error fetching data:', e);
    }
    return null; // Fallback handled in command
}

// Fallback hardcoded locations just in case APIs fail
const fallbackLocations = [
  { capital: 'paris', country: 'france', display: 'Paris, France', image: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques_000222.jpg', hint: 'City of Love, home to the Eiffel Tower.' },
  { capital: 'tokyo', country: 'japan', display: 'Tokyo, Japan', image: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg', hint: 'The most populous metropolitan area in the world.' },
];

module.exports = {
	category: 'fun',
	aliases: ['geoguessr'],
	data: new SlashCommandBuilder()
		.setName('geoguesser')
		.setDescription('Guess the location shown in the image! Win Baubles if you are correct.')
		.addStringOption(option => 
			option.setName('mode')
				.setDescription('Play solo or multiplayer with the server!')
				.addChoices(
					{ name: 'Solo', value: 'solo' },
					{ name: 'Multiplayer', value: 'multiplayer' }
				)
				.setRequired(false)
		),

	async execute(context) {
		const isSlash = !!context.options;
		const channel = context.channel;
		const authorId = isSlash ? context.user.id : context.author.id;
		
        // Parse mode
        let mode = 'solo';
        if (isSlash) {
            mode = context.options.getString('mode') || 'solo';
        } else if (context.args && context.args.length > 0) {
            if (context.args[0].toLowerCase() === 'multiplayer') mode = 'multiplayer';
        }

		const reply = async (opts) => isSlash ? await context.reply(opts) : await channel.send(opts);

		if (activeGames.has(channel.id)) {
			return await reply({ content: '❌ A GeoGuesser game is already running in this channel!', ephemeral: true });
		}

		activeGames.add(channel.id);

        try {
            const participants = new Set();
            participants.add(authorId);

            if (mode === 'multiplayer') {
                const joinButton = new ButtonBuilder()
                    .setCustomId('join_geoguesser')
                    .setLabel('Join Game')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🌍');
                
                const row = new ActionRowBuilder().addComponents(joinButton);

                const lobbyEmbed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('🌍 GeoGuessr Multiplayer Lobby')
                    .setDescription(`Game hosted by <@${authorId}>!\n\nClick the button below to join the game. The game will start in **20 seconds**!`)
                    .setFooter({ text: 'Current Players: 1' });

                const lobbyMsg = isSlash ? 
                    await context.reply({ embeds: [lobbyEmbed], components: [row], fetchReply: true }) : 
                    await channel.send({ embeds: [lobbyEmbed], components: [row] });

                // Wait 20s for players
                const collector = lobbyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });
                
                collector.on('collect', async i => {
                    if (i.customId === 'join_geoguesser') {
                        if (participants.has(i.user.id)) {
                            await i.reply({ content: 'You are already in the game!', ephemeral: true });
                        } else {
                            participants.add(i.user.id);
                            
                            const updatedEmbed = EmbedBuilder.from(lobbyEmbed)
                                .setFooter({ text: `Current Players: ${participants.size}` });
                            
                            await lobbyMsg.edit({ embeds: [updatedEmbed] });
                            await i.reply({ content: 'You joined the game!', ephemeral: true });
                        }
                    }
                });

                await new Promise(resolve => collector.on('end', resolve));

                // Remove buttons
                const disabledRow = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(joinButton).setDisabled(true)
                );
                await lobbyMsg.edit({ components: [disabledRow] });

                if (participants.size === 1) {
                    await channel.send('Nobody else joined! Starting as solo game.');
                } else {
                    await channel.send(`Starting game with **${participants.size}** players!`);
                }
            } else {
                if (isSlash && context.deferReply) await context.deferReply();
            }

            let loc = await fetchRandomLocation();
            if (!loc) {
                // Fallback logic
                let validFallbacks = fallbackLocations.filter(f => !recentLocations.includes(f.capital));
                if (validFallbacks.length === 0) validFallbacks = fallbackLocations; // reset if all used
                
                loc = validFallbacks[Math.floor(Math.random() * validFallbacks.length)];
                
                recentLocations.push(loc.capital);
                if (recentLocations.length > 150) recentLocations.shift();
            }

            const reward = Math.floor(Math.random() * 50) + 50; // Win 50-100 baubles

            const gameEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🌍 GeoGuessr: Where in the world is this?')
                .setDescription(`Reply in this channel with the **Capital City** or **Country** name.\nYou have **60 seconds** to guess!\n\n💡 **Hint:** Type \`hint\` to reveal a clue.`)
                .setImage(loc.image)
                .setFooter({ text: `Reward: 🪙 ${reward} Baubles` });

            if (mode === 'solo' && isSlash) {
                await context.editReply({ embeds: [gameEmbed] });
            } else {
                await channel.send({ embeds: [gameEmbed] });
            }

            const guessFilter = m => participants.has(m.author.id);
            const guessCollector = channel.createMessageCollector({ filter: guessFilter, time: 60000 });

            let hintsUsed = 0;
            let winner = null;

            guessCollector.on('collect', async (m) => {
                const guess = m.content.toLowerCase().trim();

                if (guess === 'hint') {
                    if (hintsUsed > 0) {
                        await channel.send("❌ You already used your hint!");
                        return;
                    }
                    hintsUsed++;
                    await channel.send(`💡 **Hint:** ${loc.hint}`);
                    return;
                }

                if (guess === loc.capital || guess === loc.country) {
                    winner = m.author.id;
                    guessCollector.stop('won');
                } else {
                    await m.react('❌');
                }
            });

            guessCollector.on('end', async (_, reason) => {
                if (reason === 'won') {
                    // Reward winner
                    const finalReward = hintsUsed > 0 ? Math.floor(reward / 2) : reward;
                    let userDoc = await Bauble.findOne({ userId: winner });
                    if (!userDoc) userDoc = new Bauble({ userId: winner });
                    
                    userDoc.baubles += finalReward;
                    await userDoc.save();

                    const winEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('🎉 Correct!')
                        .setDescription(`<@${winner}> correctly identified **${loc.display}**!\n\nThey won **🪙 ${finalReward} Baubles**${hintsUsed > 0 ? ' (Half reward for using a hint)' : ''}!`);
                    
                    await channel.send({ embeds: [winEmbed] });
                } else {
                    const loseEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle('⏱️ Time is up!')
                        .setDescription(`Nobody guessed it in time.\n\nThe correct location was **${loc.display}**.`);
                    
                    await channel.send({ embeds: [loseEmbed] });
                }
            });

        } catch (e) {
            console.error('GeoGuesser Error:', e);
            await channel.send('❌ An error occurred while running the game.');
        } finally {
            // Free the channel so another game can start
            // Set timeout so it cleans up after game is done, not immediately
            setTimeout(() => {
                activeGames.delete(channel.id);
            }, 62000); 
        }
	},

	async executePrefix(message, args) {
		await this.execute({
			client: message.client,
			user: message.author,
			author: message.author,
			member: message.member,
			channel: message.channel,
			message: message,
			args: args,
		});
	}
};
