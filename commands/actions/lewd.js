/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Array of "lewd" GIF links (replace with your own!)
const lewdGifs = [
    "https://media.tenor.com/x2OPO3hPl_gAAAAM/wew-arata.gif", // Replace with actual GIF links
    "https://media.tenor.com/VXtAtV5csL4AAAAM/osaco.gif",
    "https://media.tenor.com/RwaDdjtbSoMAAAAM/anime.gif",
    "https://media.tenor.com/vqPt7f8PxtkAAAAM/marrochi-evil.gif",
    "https://media.tenor.com/0-V0WPt5htEAAAAM/anime-lewd.gif",
    "https://media.tenor.com/513s3tmHbUYAAAAM/lewd-anime.gif",
    // Add more GIF URLs here
];


module.exports = {
    category: 'actions',
    data: { name: 'lewd' },

	

    async execute(context) {
        const user = context.options?.getUser?.('user') || context.mentions?.users.first();
        const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');
			
        const reply = (msg) => {
            if (typeof msg === 'string') {
                return context.reply ? context.reply({ content: msg, ephemeral: true }) : context.message.reply(msg);
            }
            return context.reply ? context.reply(msg) : context.message.reply(msg);
        };

        if (!context.channel || !context.channel.nsfw) {
            return reply('❌ This command can only be used in **NSFW channels**!');
        }

        const selfResponses = ["Aww, let me do that for you! *But you still need to mention someone else...*","Doing that to yourself? How lonely... Mention someone!","I'm here for you! But seriously, mention another user for this command.","You can't target yourself, silly! Mention a friend!","Hold on there, you need another person for this to work right. Mention them!"];
        const randomResponse = selfResponses[Math.floor(Math.random() * selfResponses.length)];
        if (!user) return reply('❗ Please mention a user to lewd.');
        if (user.id === (context.user?.id || context.author?.id)) return reply(randomResponse);

        // Select a random GIF
        const randomGif = lewdGifs[Math.floor(Math.random() * lewdGifs.length)];

        // If slash, defer the reply
        if (context.deferReply) await context.deferReply();

        // Determine whether it's a slash command or a message command (prefix)
        const isSlashCommand = !!context.deferReply;

        // Construct the embed
        const lewdEmbed = new EmbedBuilder()
            .setColor(0xFFC0CB) // Light Pink
            .setTitle('Lewd Action!')
            .setDescription(`**${context.user.username}** is being lewd with **${user.username}**!`)
            .setImage(randomGif)
            .setTimestamp();

        if (customMsg) {
            lewdEmbed.addFields({ name: 'Message', value: customMsg });
        }

        // Send the embed
        if (isSlashCommand) {
            await context.editReply({ embeds: [lewdEmbed] });
        } else {
            await context.channel.send({ embeds: [lewdEmbed] });
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
				getUser: () => message.mentions.users.first(),
				getString: () => {
					// If the first argument is a mention, omit it from the custom message
					if (args[0] && args[0].match(/^<@!?\d+>$/)) {
						return args.slice(1).join(' ');
					}
					return args.join(' ');
				}
			}
		});
	}
};

