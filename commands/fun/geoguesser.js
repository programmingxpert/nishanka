/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const activeGames = new Set();
const recentLocations = []; // Track recent locations to prevent repeats

async function fetchRandomLocation() {
    try {
        // Fetch all countries
        const res = await fetch('https://restcountries.com/v3.1/all');
        const countries = await res.json();

        if (!Array.isArray(countries)) {
            console.error('[GeoGuesser] Unexpected response from restcountries:', countries);
            return null;
        }

        // Loop until we find a country with a capital and an image on Wikipedia
        for (let i = 0; i < 10; i++) {
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

            // Add to history and keep max 150 items to prevent repetition
            recentLocations.push(capital);
            if (recentLocations.length > 150) recentLocations.shift();

            return {
                capital: capital.toLowerCase(),
                country: countryName.toLowerCase(),
                display: `${capital}, ${countryName}`,
                image: wikiData.originalimage.source,
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
	data: new SlashCommandBuilder()
		.setName('geoguesser')
		.setDescription('Guess the location shown in the image! Win Baubles if you are correct.'),

	async execute(context) {
		const isSlash = !!context.options;
		const channel = context.channel;
		const authorId = isSlash ? context.user.id : context.author.id;
		const reply = async (opts) => isSlash ? await context.reply(opts) : await channel.send(opts);

		if (activeGames.has(authorId)) {
			return await reply({ content: '❌ You already have an active GeoGuesser game running!', ephemeral: true });
		}

        if (isSlash && context.deferReply) await context.deferReply();

        let loc = await fetchRandomLocation();
        if (!loc) {
            // Fallback
            loc = fallbackLocations[Math.floor(Math.random() * fallbackLocations.length)];
        }

		const reward = Math.floor(Math.random() * 50) + 50; // Win 50-100 baubles

		const embed = new EmbedBuilder()
			.setColor(0x2ecc71)
			.setTitle('🌍 GeoGuessr: Where in the world is this?')
			.setDescription(`Reply in this channel with the **Capital City** or **Country** name.\nYou have **30 seconds** to guess!\n\n💡 **Hint:** Type \`hint\` to reveal a clue.`)
			.setImage(loc.image)
			.setFooter({ text: `Reward: 🪙 ${reward} Baubles` });

		if (isSlash) {
			await context.editReply({ embeds: [embed] });
		} else {
			await channel.send({ embeds: [embed] });
		}

		activeGames.add(authorId);

		const filter = m => m.author.id === authorId;
		const collector = channel.createMessageCollector({ filter, time: 30000 });

		let guessed = false;
		let hintsUsed = 0;

		collector.on('collect', async (m) => {
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

            // Accept if they type the capital OR the country correctly
			if (guess === loc.capital || guess === loc.country) {
				guessed = true;
				collector.stop('won');
			} else {
				await m.react('❌');
			}
		});

		collector.on('end', async (_, reason) => {
			activeGames.delete(authorId);

			if (reason === 'won') {
				// Reward user
				const finalReward = hintsUsed > 0 ? Math.floor(reward / 2) : reward;
				let userDoc = await Bauble.findOne({ userId: authorId });
				if (!userDoc) userDoc = new Bauble({ userId: authorId });
				
				userDoc.baubles += finalReward;
				await userDoc.save();

				const winEmbed = new EmbedBuilder()
					.setColor(0x00ff00)
					.setTitle('🎉 Correct!')
					.setDescription(`You correctly identified **${loc.display}**!\n\nYou won **🪙 ${finalReward} Baubles**${hintsUsed > 0 ? ' (Half reward for using a hint)' : ''}!`);
				
				await channel.send({ content: `<@${authorId}>`, embeds: [winEmbed] });
			} else {
				const loseEmbed = new EmbedBuilder()
					.setColor(0xff0000)
					.setTitle('⏱️ Time is up!')
					.setDescription(`You didn't guess it in time.\n\nThe correct location was **${loc.display}**.`);
				
				await channel.send({ content: `<@${authorId}>`, embeds: [loseEmbed] });
			}
		});
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
