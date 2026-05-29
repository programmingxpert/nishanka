/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const activeGames = new Set();
const recentLocations = []; // Track recent locations to prevent repeats

async function fetchRandomLocation() {
    try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,capital,region,subregion');
        const countries = await res.json();

        if (!Array.isArray(countries)) {
            console.error('[GeoGuesser] Unexpected response from restcountries:', countries);
            return null;
        }

        for (let i = 0; i < 15; i++) {
            const country = countries[Math.floor(Math.random() * countries.length)];
            if (!country || !country.capital || !country.capital[0]) continue;
            
            const capital = country.capital[0];
            
            if (recentLocations.includes(capital)) continue;

            const countryName = country.name.common;
            const region = country.subregion || country.region;
            
            const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(capital)}`);
            if (!wikiRes.ok) continue;
            
            const wikiData = await wikiRes.json();
            if (!wikiData.originalimage || !wikiData.originalimage.source) continue;

            const imgUrl = wikiData.originalimage.source;
            const lowerUrl = imgUrl.toLowerCase();
            
            if (lowerUrl.includes('flag') || lowerUrl.includes('map') || 
                lowerUrl.includes('coat_of_arms') || lowerUrl.includes('logo') || 
                lowerUrl.includes('locator')) {
                continue;
            }

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
    return null;
}

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
		)
        .addIntegerOption(option =>
            option.setName('rounds')
                .setDescription('Number of rounds (multiplayer only, max 10)')
                .setRequired(false)
        ),

	async execute(context) {
		const isSlash = !!context.options;
		const channel = context.channel;
		const authorId = isSlash ? context.user.id : context.author.id;
		
        let mode = 'solo';
        let rounds = 5;

        if (isSlash) {
            mode = context.options.getString('mode') || 'solo';
            rounds = context.options.getInteger('rounds') || 5;
        } else if (context.args && context.args.length > 0) {
            if (context.args[0].toLowerCase() === 'multiplayer') mode = 'multiplayer';
            if (context.args[1] && !isNaN(context.args[1])) rounds = parseInt(context.args[1]);
        }

        if (rounds > 10) rounds = 10;
        if (rounds < 1) rounds = 1;

		const reply = async (opts) => isSlash ? await context.reply(opts) : await channel.send(opts);

		if (activeGames.has(channel.id)) {
			return await reply({ content: '❌ A GeoGuesser game is already running in this channel!', ephemeral: true });
		}

		activeGames.add(channel.id);

        try {
            // participants: Map of userId -> { score, tag }
            const participants = new Map();
            participants.set(authorId, { score: 0, tag: isSlash ? context.user.username : context.author.username });

            if (mode === 'multiplayer') {
                const joinButton = new ButtonBuilder()
                    .setCustomId('join_geoguesser')
                    .setLabel('Join Game')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🌍');
                
                const startButton = new ButtonBuilder()
                    .setCustomId('start_geoguesser')
                    .setLabel('Start Game')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('▶️');

                const row = new ActionRowBuilder().addComponents(joinButton, startButton);

                const lobbyEmbed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('🌍 GeoGuessr Multiplayer Lobby')
                    .setDescription(`Game hosted by <@${authorId}>!\n\nClick **Join Game** to play.\nThe host can click **Start Game** to begin **${rounds} Rounds**!`)
                    .setFooter({ text: 'Current Players: 1' });

                const lobbyMsg = isSlash ? 
                    await context.reply({ embeds: [lobbyEmbed], components: [row], fetchReply: true }) : 
                    await channel.send({ embeds: [lobbyEmbed], components: [row] });

                const collector = lobbyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 }); // 5 minutes max wait
                
                let gameStarted = false;
                collector.on('collect', async i => {
                    if (i.customId === 'join_geoguesser') {
                        if (participants.has(i.user.id)) {
                            await i.reply({ content: 'You are already in the game!', ephemeral: true });
                        } else {
                            participants.set(i.user.id, { score: 0, tag: i.user.username });
                            const updatedEmbed = EmbedBuilder.from(lobbyEmbed)
                                .setFooter({ text: `Current Players: ${participants.size}` });
                            await lobbyMsg.edit({ embeds: [updatedEmbed] });
                            await i.reply({ content: 'You joined the game!', ephemeral: true });
                        }
                    } else if (i.customId === 'start_geoguesser') {
                        if (i.user.id !== authorId) {
                            await i.reply({ content: 'Only the host can start the game!', ephemeral: true });
                        } else {
                            gameStarted = true;
                            collector.stop('started');
                            await i.reply({ content: 'Starting game...', ephemeral: true });
                        }
                    }
                });

                await new Promise(resolve => collector.on('end', resolve));

                if (!gameStarted) {
                    // Lobby timed out
                    const disabledRow = new ActionRowBuilder().addComponents(
                        ButtonBuilder.from(joinButton).setDisabled(true),
                        ButtonBuilder.from(startButton).setDisabled(true)
                    );
                    await lobbyMsg.edit({ content: 'Lobby timed out.', components: [disabledRow] });
                    activeGames.delete(channel.id);
                    return;
                }

                // Remove buttons
                const disabledRow = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(joinButton).setDisabled(true),
                    ButtonBuilder.from(startButton).setDisabled(true)
                );
                await lobbyMsg.edit({ components: [disabledRow] });

                if (participants.size === 1) {
                    await channel.send(`Nobody else joined! Starting **${rounds}-Round** solo game.`);
                } else {
                    await channel.send(`Starting game with **${participants.size}** players for **${rounds} Rounds**!`);
                }
            } else {
                if (isSlash && context.deferReply) await context.deferReply();
                rounds = 1; // Forced 1 round for actual "solo" mode backward compatibility, or keep specified rounds. 
                // Wait, if they want 5 rounds solo, why not let them? Let's allow multi-round solo.
            }

            // Game Loop
            for (let currentRound = 1; currentRound <= rounds; currentRound++) {
                let loc = await fetchRandomLocation();
                if (!loc) {
                    let validFallbacks = fallbackLocations.filter(f => !recentLocations.includes(f.capital));
                    if (validFallbacks.length === 0) validFallbacks = fallbackLocations;
                    loc = validFallbacks[Math.floor(Math.random() * validFallbacks.length)];
                    recentLocations.push(loc.capital);
                    if (recentLocations.length > 150) recentLocations.shift();
                }

                const gameEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle(`🌍 GeoGuessr (Round ${currentRound}/${rounds})`)
                    .setDescription(`Where in the world is this?\nReply with the **Capital City** or **Country** name.\nYou have **60 seconds** to guess!\n\n💡 **Hint:** Type \`hint\` to reveal a clue.`)
                    .setImage(loc.image);
                
                if (mode === 'solo' && isSlash && currentRound === 1) {
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

                await new Promise(resolve => {
                    guessCollector.on('end', async (_, reason) => {
                        if (reason === 'won') {
                            const p = participants.get(winner);
                            p.score++;
                            
                            const winEmbed = new EmbedBuilder()
                                .setColor(0x00ff00)
                                .setTitle(`🎉 Correct! (Round ${currentRound})`)
                                .setDescription(`<@${winner}> correctly identified **${loc.display}**!\n\n**${p.tag}** now has **${p.score} points**.`);
                            
                            await channel.send({ embeds: [winEmbed] });
                        } else {
                            const loseEmbed = new EmbedBuilder()
                                .setColor(0xff0000)
                                .setTitle(`⏱️ Time is up! (Round ${currentRound})`)
                                .setDescription(`Nobody guessed it in time.\n\nThe correct location was **${loc.display}**.`);
                            
                            await channel.send({ embeds: [loseEmbed] });
                        }
                        resolve();
                    });
                });

                // Wait 5 seconds before next round, if not last round
                if (currentRound < rounds) {
                    await channel.send(`*Get ready for the next round in 5 seconds...*`);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }

            // End of game payouts & leaderboard
            const sortedParticipants = Array.from(participants.entries())
                .sort((a, b) => b[1].score - a[1].score)
                .filter(p => p[1].score > 0);

            if (sortedParticipants.length === 0) {
                await channel.send("The game has ended! Nobody scored any points.");
            } else {
                let leaderboardText = "";
                let place = 1;
                
                for (const [userId, data] of sortedParticipants) {
                    const reward = data.score * 50; // 50 baubles per point
                    
                    let userDoc = await Bauble.findOne({ userId });
                    if (!userDoc) userDoc = new Bauble({ userId });
                    userDoc.baubles += reward;
                    await userDoc.save();

                    leaderboardText += `**#${place}** <@${userId}> — ${data.score} Points (+🪙 ${reward})\n`;
                    place++;
                }

                const finalEmbed = new EmbedBuilder()
                    .setColor(0xf1c40f)
                    .setTitle('🏆 GeoGuessr Final Results')
                    .setDescription(leaderboardText);
                
                await channel.send({ embeds: [finalEmbed] });
            }

        } catch (e) {
            console.error('GeoGuesser Error:', e);
            await channel.send('❌ An error occurred while running the game.');
        } finally {
            activeGames.delete(channel.id);
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
