class UnoCard {
    constructor(color, type) {
        this.color = color; // "red", "green", "blue", "yellow", "wild"
        this.type = type;   // "0"-"9", "skip", "reverse", "+2", "wild", "+4"
    }

    toString() {
        return `${this.color} ${this.type}`;
    }
}

function generateDeck() {
    const colors = ['red', 'green', 'blue', 'yellow'];
    const types = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', '+2'];
    const deck = [];

    for (const color of colors) {
        deck.push(new UnoCard(color, '0'));
        for (const type of types.slice(1)) {
            deck.push(new UnoCard(color, type));
            deck.push(new UnoCard(color, type));
        }
    }

    for (let i = 0; i < 4; i++) {
        deck.push(new UnoCard('wild', 'wild'));
        deck.push(new UnoCard('wild', '+4'));
    }

    return shuffle(deck);
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

let game = {
    deck: [],
    hands: {},
    currentPlayerIndex: 0,
    turnOrder: [],
    direction: 1
};

function dealCards(players) {
    const hands = {};
    for (const playerId of players) {
        hands[playerId] = game.deck.splice(0, 7);
    }
    return hands;
}

function startGame() {
    game.deck = generateDeck();
    game.hands = dealCards(players);
    game.turnOrder = [...players];
    game.currentPlayerIndex = 0;
    game.direction = 1;

    const firstCard = game.deck.pop();
    console.log(`🃏 First card is: ${firstCard.toString()}`);
}

const { Client, IntentsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, EmbedBuilder } = require('discord.js');
const { token, client_id } = require('./config.json');

const client = new Client({
    intents: [
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.MessageContent,
    ]
});

client.once('ready', () => {
    console.log('bot online 🥀💀😡😭🤖');
});

let players = [];
let countingDown = false;
let hasGameStarted = false;

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.author != '952296941339934720') return;

    if (message.content === "startgame") {
        players = [];
        countingDown = false;

        const joinRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('2137').setEmoji('👽').setLabel('Join').setStyle(ButtonStyle.Success));
        const joinEmbed = new EmbedBuilder().setTitle("Waiting for players to join...").setDescription("Join using the button below, once 5 people joinin 60 seconds the game will start within 60 seconds.").setColor("Green");
        
        await message.channel.send({embeds: [joinEmbed], components: [joinRow]});
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton) return;
    if (interaction.customId !== '2137') return;

    if (players.includes(interaction.user.id)) {
        return interaction.reply({
            content: "You already joined the game!",
            flags: MessageFlags.Ephemeral
        });
    }
    if (hasGameStarted) {
        return await interaction.reply({content: "This game already started", flags: MessageFlags.Ephemeral});
    }

    await interaction.reply({content: "You joined the game", flags: MessageFlags.Ephemeral});
    players.push(interaction.user.id);

    if (!countingDown && players.length >= 1) {
        countingDown = true;
    
        const gameChannel = interaction.channel;
    
        gameChannel.send("Game will begin in 60 seconds...");
    
        setTimeout(() => {
            gameChannel.send(`🚀 Game starting with ${players.length} players!`);
            startGame();
            hasGameStarted = true;
        }, 1000);
    }
});

client.login(token);