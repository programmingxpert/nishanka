/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyEngine = require('../../utils/economyEngine');
const User = require('../../models/User');

const locations = [
  { names: ['paris', 'france'], display: 'Paris, France', image: 'https://images.unsplash.com/photo-1502602881462-f2243e4fc84d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'City of Love, home to the Eiffel Tower.' },
  { names: ['tokyo', 'japan'], display: 'Tokyo, Japan', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'The most populous metropolitan area in the world.' },
  { names: ['new york', 'usa', 'united states', 'nyc', 'new york city'], display: 'New York City, USA', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'The Big Apple.' },
  { names: ['london', 'uk', 'united kingdom', 'england'], display: 'London, UK', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Home to Big Ben and the red double-decker buses.' },
  { names: ['sydney', 'australia'], display: 'Sydney, Australia', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Famous for its Opera House.' },
  { names: ['rome', 'italy'], display: 'Rome, Italy', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'The Eternal City, home to the Colosseum.' },
  { names: ['cairo', 'egypt'], display: 'Cairo, Egypt', image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Near the Great Pyramids of Giza.' },
  { names: ['rio de janeiro', 'brazil', 'rio'], display: 'Rio de Janeiro, Brazil', image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Famous for the Christ the Redeemer statue and Copacabana beach.' },
  { names: ['dubai', 'uae', 'united arab emirates'], display: 'Dubai, UAE', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Home to the tallest building in the world, the Burj Khalifa.' },
  { names: ['moscow', 'russia'], display: 'Moscow, Russia', image: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Features the colorful domes of St. Basil\'s Cathedral.' },
  { names: ['agra', 'india', 'taj mahal'], display: 'Taj Mahal, India', image: 'https://images.unsplash.com/photo-1564507592208-027083a64c57?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'A magnificent white marble mausoleum.' },
  { names: ['toronto', 'canada'], display: 'Toronto, Canada', image: 'https://images.unsplash.com/photo-1507992781348-310259076fe0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Features the iconic CN Tower.' },
  { names: ['berlin', 'germany'], display: 'Berlin, Germany', image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Famous for a wall that fell in 1989 and the Brandenburg Gate.' },
  { names: ['cape town', 'south africa'], display: 'Cape Town, South Africa', image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'A port city beneath the imposing Table Mountain.' },
  { names: ['amsterdam', 'netherlands', 'holland'], display: 'Amsterdam, Netherlands', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Known for its elaborate canal system and narrow houses.' },
  { names: ['machu picchu', 'peru'], display: 'Machu Picchu, Peru', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'An Incan citadel set high in the Andes Mountains.' },
  { names: ['santorini', 'greece'], display: 'Santorini, Greece', image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'An island in the Aegean Sea famous for whitewashed, cubiform houses.' },
  { names: ['istanbul', 'turkey'], display: 'Istanbul, Turkey', image: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'A major city that straddles Europe and Asia across the Bosphorus Strait.' },
  { names: ['venice', 'italy'], display: 'Venice, Italy', image: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'Built on more than 100 small islands in a lagoon in the Adriatic Sea.' },
  { names: ['seoul', 'south korea', 'korea'], display: 'Seoul, South Korea', image: 'https://images.unsplash.com/photo-1538485395224-3271d77de771?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', hint: 'A huge metropolis where modern skyscrapers, high-tech subways and pop culture meet.' },
];

const activeGames = new Set();

module.exports = {
	category: 'fun',
	data: new SlashCommandBuilder()
		.setName('geoguesser')
		.setDescription('Guess the location shown in the image! Win Baubles if you are correct.'),

	async execute(context) {
		const isSlash = !!context.options;
		const channel = context.channel;
		const authorId = isSlash ? context.user.id : context.author.id;

		if (activeGames.has(authorId)) {
			const msg = '❌ You already have an active GeoGuesser game running!';
			return isSlash ? await context.reply({ content: msg, ephemeral: true }) : await channel.send(msg);
		}

		// Select random location
		const loc = locations[Math.floor(Math.random() * locations.length)];
		const reward = Math.floor(Math.random() * 50) + 50; // Win 50-100 baubles

		const embed = new EmbedBuilder()
			.setColor(0x2ecc71)
			.setTitle('🌍 GeoGuessr: Where in the world is this?')
			.setDescription(`Reply in this channel with the **City** or **Country** name.\nYou have **30 seconds** to guess!\n\n💡 **Hint:** Type \`hint\` to reveal a clue.`)
			.setImage(loc.image)
			.setFooter({ text: `Reward: 🪙 ${reward} Baubles` });

		if (isSlash) {
			await context.reply({ embeds: [embed] });
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

			if (loc.names.some(n => guess.includes(n))) {
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
				let userDoc = await User.findOne({ userId: authorId });
				if (!userDoc) userDoc = new User({ userId: authorId });
				
				userDoc.wallet += finalReward;
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
