class UnoCard {
    constructor(colour, type) {
        this.colour = colour;
        this.type = type;
    }
}

const { Client, IntentsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { token, client_id } = require('./config.json');

const client = new Client({
    intents: [
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.MessageContent,
    ]
});

let players = [];

client.once('ready', () => {
    console.log('bot online 🥀💀😡😭🤖');
})

client.on('messageCreate', message => {
    if (message.author.bot) return;
    if (message.author != '952296941339934720') return;

    if (message.content === "startgame") {
        const joinRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('2137').setEmoji('👽').setLabel('Join').setStyle(ButtonStyle.Success));

        message.channel.send({content: "hahaha", components: [joinRow]});
    }
});

client.on('interactionCreate', (interaction) => {
    if (!interaction.isButton) return;
    if (!interaction.customId == '2137') return;

    players.push(interaction.user.id);
    interaction.reply({content: "You joined the game", flags: MessageFlags.Ephemeral});
});

client.login(token);