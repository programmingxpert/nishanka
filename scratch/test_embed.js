const { EmbedBuilder } = require('discord.js');

// Mock client
global.client = {
    user: {
        displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/123/abc.png?size=128'
    }
};

const originalToJSON = EmbedBuilder.prototype.toJSON;
EmbedBuilder.prototype.toJSON = function() {
    const json = originalToJSON.call(this);
    
    if (!json.color) {
        json.color = 0x7c6cf0;
    }
    
    const client = global.client;
    const avatarURL = client?.user?.displayAvatarURL({ extension: 'png', size: 128 }) || null;
    
    if (json.footer) {
        if (json.footer.text && !json.footer.text.includes('Nishanka')) {
            json.footer.text = `Nishanka • ${json.footer.text}`;
        }
        if (!json.footer.icon_url && avatarURL) {
            json.footer.icon_url = avatarURL;
        }
    } else {
        json.footer = {
            text: 'Nishanka • by Zeyuki'
        };
        if (avatarURL) {
            json.footer.icon_url = avatarURL;
        }
    }
    
    return json;
};

const embed1 = new EmbedBuilder().setTitle('Test Embed 1').setDescription('No footer');
const embed2 = new EmbedBuilder().setTitle('Test Embed 2').setDescription('Existing footer').setFooter({ text: 'Deducted 20 APU' });
console.log(embed1.toJSON());
console.log(embed2.toJSON());
