/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const answers = [
	"It is certain.",
	"It is decidedly so.",
	"Without a doubt.",
	"Yes - definitely.",
	"You may rely on it.",
	"As I see it, yes.",
	"Most likely.",
	"Outlook good.",
	"Yes.",
	"Signs point to yes.",
	"Reply hazy, try again.",
	"Ask again later.",
	"Better not tell you now.",
	"Cannot predict now.",
	"Concentrate and ask again.",
	"Don't count on it.",
	"My reply is no.",
	"My sources say no.",
	"Outlook not so good.",
	"Very doubtful."
];

module.exports = {
	category: 'fun',
	data: new SlashCommandBuilder()
		.setName('8ball')
		.setDescription('Ask the magic 8-ball a question.')
		.addStringOption(option =>
			option.setName('question')
				.setDescription('The question to ask the 8-ball')
				.setRequired(true)
		),

	async execute(context) {
		const question = context.options?.getString('question') || context.args?.join(' ');
		
		if (!question) {
			const msg = '🎱 Please provide a question to ask the 8-ball!';
			return context.reply ? await context.reply(msg) : await context.channel.send(msg);
		}

		const answer = answers[Math.floor(Math.random() * answers.length)];

		const embed = new EmbedBuilder()
			.setColor(0x000000)
			.setTitle('🎱 Magic 8-Ball')
			.addFields(
				{ name: 'Question', value: question },
				{ name: 'Answer', value: answer }
			);

		if (context.reply) {
			await context.reply({ embeds: [embed] });
		} else {
			await context.channel.send({ embeds: [embed] });
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
			options: {
				getString: () => args.join(' '),
			}
		});
	}
};
