/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const chrono = require('chrono-node');
const moment = require('moment-timezone');
const Reminder = require('../../models/Reminder');

module.exports = {
    category: 'utility',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder!')
        .addStringOption(option => 
            option.setName('time')
            .setDescription('When to remind you (e.g., "in 3 days at 4:30 pm", "on March 20th at 2 am")')
            .setRequired(false)
        )
        .addStringOption(option => 
            option.setName('about')
            .setDescription('What should I remind you about?')
            .setRequired(false)
        ),

    // ---------- SLASH COMMAND ----------
    async execute(interaction) {
        const userId = interaction.user.id;
        const channelId = interaction.channelId;
        const defaultTimezone = 'Asia/Kolkata';

        let timeStr = interaction.options.getString('time');
        let aboutStr = interaction.options.getString('about');

        // Ask for missing details via modal or follow-up prompt? 
        // For simplicity and matching prefix, we'll use channel collectors if missing.
        if (!timeStr || !aboutStr) {
            await interaction.reply({ content: 'I need more details. Check your DMs or channel prompts!', ephemeral: true });
            return this.runInteractivePrompt(interaction.channel, interaction.user, defaultTimezone, null);
        }

        await this.createReminder(interaction, userId, channelId, timeStr, aboutStr, defaultTimezone, null);
    },

    // ---------- PREFIX COMMAND ----------
    async executePrefix(message, args) {
        const userId = message.author.id;
        const channelId = message.channelId;
        const defaultTimezone = 'Asia/Kolkata';

        if (args.length === 0) {
            return this.runInteractivePrompt(message.channel, message.author, defaultTimezone, message.id);
        }

        const inputString = args.join(' ');
        
        // Parse with chrono using the default timezone context
        const referenceDate = moment.tz(defaultTimezone).toDate();
        const parsedResults = chrono.parse(inputString, referenceDate, { forwardDate: true });

        if (!parsedResults || parsedResults.length === 0) {
            return message.reply("❌ I couldn't understand the time format. Try something like `-remind in 3 days at 4:30 pm to wash dishes` or just `-remind` to get prompted.");
        }

        const parsedResult = parsedResults[0];
        const remindAtDate = parsedResult.start.date();
        
        // Extract the reason by removing the time string from the input
        let reason = inputString.replace(parsedResult.text, '').trim();
        if (reason.toLowerCase().startsWith('to ')) reason = reason.slice(3).trim();
        if (reason.toLowerCase().startsWith('that ')) reason = reason.slice(5).trim();
        if (!reason) reason = 'Here is your reminder!';

        if (remindAtDate.getTime() <= Date.now()) {
            return message.reply("❌ The time you specified is in the past! Please provide a future time.");
        }

        try {
            await Reminder.create({
                userId,
                channelId,
                messageId: message.id,
                reminderText: reason,
                remindAt: remindAtDate
            });

            // Format for user
            const formattedTime = `<t:${Math.floor(remindAtDate.getTime() / 1000)}:f>`;
            const relativeTime = `<t:${Math.floor(remindAtDate.getTime() / 1000)}:R>`;
            
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('⏰ Reminder Set!')
                .setDescription(`I will remind you about:\n**${reason}**\n\nWhen: ${formattedTime} (${relativeTime})`)
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error('Error creating reminder:', err);
            await message.reply("❌ An error occurred while setting your reminder.");
        }
    },

    // ---------- HELPER METHODS ----------

    async runInteractivePrompt(channel, user, timezone, sourceMessageId) {
        const filter = m => m.author.id === user.id;

        // 1. Ask about WHAT
        await channel.send(`<@${user.id}>, what should I remind you about? (Reply within 60s, or type 'cancel')`);
        let aboutCol;
        try {
            aboutCol = await channel.awaitMessages({ filter, time: 60000, max: 1, errors: ['time'] });
        } catch (e) {
            return channel.send(`<@${user.id}>, you took too long to specify a reason. Reminder cancelled.`);
        }

        const aboutMsg = aboutCol.first();
        if (aboutMsg.content.toLowerCase() === 'cancel') {
            return channel.send('Cancelled reminder setup.');
        }
        const aboutStr = aboutMsg.content;

        // 2. Ask about WHEN
        await channel.send(`<@${user.id}>, when should I remind you about that? e.g., 'in 3 days at 4:30 pm', 'on March 20th at 2 am' (Default timezone: Asia/Kolkata)`);
        let timeCol;
        try {
            timeCol = await channel.awaitMessages({ filter, time: 60000, max: 1, errors: ['time'] });
        } catch (e) {
            return channel.send(`<@${user.id}>, you took too long to specify a time. Reminder cancelled.`);
        }

        const timeMsg = timeCol.first();
        if (timeMsg.content.toLowerCase() === 'cancel') {
            return channel.send('Cancelled reminder setup.');
        }
        const timeStr = timeMsg.content;

        // 3. Process
        await this.createReminder(timeMsg, user.id, channel.id, timeStr, aboutStr, timezone, sourceMessageId || timeMsg.id);
    },

    async createReminder(interactionOrMessage, userId, channelId, timeStr, aboutStr, timezone, messageId) {
        const referenceDate = moment.tz(timezone).toDate();
        const parsedDate = chrono.parseDate(timeStr, referenceDate, { forwardDate: true });

        const replyMethod = interactionOrMessage.reply ? interactionOrMessage.reply.bind(interactionOrMessage) : interactionOrMessage.channel.send.bind(interactionOrMessage.channel);

        if (!parsedDate) {
            return replyMethod("❌ I couldn't understand that time. Please try again with a format like 'in 3 days at 4:30 pm' or 'on March 20th at 2 am'.");
        }

        if (parsedDate.getTime() <= Date.now()) {
            return replyMethod("❌ That time is in the past! Please provide a future time.");
        }

        try {
            await Reminder.create({
                userId,
                channelId,
                messageId: messageId || (interactionOrMessage.id ? interactionOrMessage.id : null),
                reminderText: aboutStr,
                remindAt: parsedDate
            });

            const timestamp = Math.floor(parsedDate.getTime() / 1000);
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('⏰ Reminder Set!')
                .setDescription(`I will remind you about:\n**${aboutStr}**\n\nWhen: <t:${timestamp}:f> (<t:${timestamp}:R>)`)
                .setTimestamp();
            
            await replyMethod({ embeds: [embed] });

        } catch (err) {
            console.error('Error creating reminder:', err);
            await replyMethod("❌ An error occurred while setting your reminder in the database.");
        }
    }
};
