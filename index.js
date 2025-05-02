const { Client, IntentsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, EmbedBuilder } = require('discord.js');
const { token } = require('./config.json');

/////////////////////////////////////////// uno - helper functions ////////////////////////////////////////////

class UnoCard {
    constructor(color, type) {
        this.color = color; // "red", "green", "blue", "yellow", "wild"
        this.type = type;   // "0"-"9", "skip", "reverse", "+2", "wild", "+4"
    }
    cardToString() {
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
    direction: 1,
    isActive: false,
    discardPile: [],
    activeColor: "red"
    };

function dealCards(players) {
    const hands = {};
    for (const playerId of players) {
        hands[playerId] = game.deck.splice(0, 7);
    }
    return hands;
}

function generateCurrentPlayerComponents(game) {
    const actionRows = [];
    let currentRow = new ActionRowBuilder();
    const playerId = game.turnOrder[game.currentPlayerIndex];
    const playerHand = game.hands[playerId];

    for (let i = 0; i < playerHand.length; i++) {
        if (currentRow.components.length === 5) {
            actionRows.push(currentRow);
               currentRow = new ActionRowBuilder();
        }

        currentRow.addComponents(
            new ButtonBuilder().setCustomId(`${i + 1}`)
                .setLabel(playerHand[i]
                .cardToString())
                .setStyle(ButtonStyle.Secondary)
        );
    }

    if (currentRow.components.length > 0) {
        actionRows.push(currentRow);
    }

    return actionRows;
}

async function handleWildCard(playerId, currentPlayer, gameChannel) {
    const colorRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('color_red').setLabel('🔴 Red').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('color_green').setLabel('🟢 Green').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('color_blue').setLabel('🔵 Blue').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('color_yellow').setLabel('🟡 Yellow').setStyle(ButtonStyle.Secondary),
   );

    const colorMsg = await currentPlayer.send({ content: "Pick a color for your wild card:", components: [colorRow] });
        
    const colorCollector = colorMsg.createMessageComponentCollector({
        filter: i => i.user.id === playerId,
        time: 15000
    });
        
    colorCollector.on('collect', async i => {
        const chosenColor = i.customId.replace('color_', '');
        game.activeColor = chosenColor;
       
        await i.reply({ content: `You selected: ${chosenColor.toUpperCase()}`, flags: MessageFlags.Ephemeral});
    
        colorCollector.stop();
    });
}

//////////////////////////////////////////////// uno - game loop //////////////////////////////////////////////////

async function startGame(gameChannel) {
    game.deck = generateDeck();
    game.hands = dealCards(players);
    game.turnOrder = [...players];
    game.currentPlayerIndex = 0;
    game.direction = 1;
    game.isActive = true;
    hasGameStarted = true;
        
    let firstCard = game.deck.pop();
    while (firstCard.type === 'wild' || firstCard.type === '+4') {
        game.deck.unshift(firstCard);
         firstCard = game.deck.pop();
     }
    game.discardPile.push(firstCard);

    switch(firstCard.type) {
        case "skip": {
            game.currentPlayerIndex += 1;
            advanceTurn(gameChannel);
            break;
         }
        case "reverse": {
            game.direction = -game.direction;
            game.currentPlayerIndex = (game.currentPlayerIndex + game.direction) % game.turnOrder.length;
            break;
        }
        case "+2": {
            const punishedPlayerIndex = (game.currentPlayerIndex + game.direction) % game.turnOrder.length;
            const punishedPlayerId = game.turnOrder[punishedPlayerIndex];
        
            for (let i = 0; i < 2; i++) {
                game.hands[punishedPlayerId].push(game.deck.pop());
            }
            game.currentPlayerIndex = (punishedPlayerIndex + game.direction) % game.turnOrder.length;
            break;
        }
        
        default: {
            game.currentPlayerIndex = (game.currentPlayerIndex + game.direction) % game.turnOrder.length;
        }
    }

    game.activeColor = firstCard.color;
    await gameChannel.send(`First card is: ${firstCard.cardToString()}`);
    advanceTurn(gameChannel);

}
async function advanceTurn(gameChannel) {
    const playerId = game.turnOrder[game.currentPlayerIndex];
    const nextPlayerId = game.turnOrder[(game.currentPlayerIndex + game.direction)%game.turnOrder.length];
    const currentPlayer = await client.users.fetch(game.turnOrder[game.currentPlayerIndex]);
    const sentMessage = await currentPlayer.send({content:"It's your turn now!", components: generateCurrentPlayerComponents(game)});
    const filter = i => i.user.id === playerId;
    const collector = sentMessage.createMessageComponentCollector({ filter, time: 120000 });

    collector.on('collect', async i => {
        const index = parseInt(i.customId) - 1;
        const playedCard = game.hands[playerId][index];

        game.discardPile.push(playedCard);
        game.hands[playerId].splice(index, 1);

        if (playedCard.type === 'wild' || playedCard.type === '+4') {
            await handleWildCard(playerId, currentPlayer, gameChannel);
        }

        switch (playedCard.type) {
            case "skip": {
                game.currentPlayerIndex = (game.currentPlayerIndex + (2*game.direction)) % game.turnOrder.length;
                break;
            }
            case "reverse": {
                if (game.turnOrder.length != 2) {
                    game.direction = -game.direction;
                    game.currentPlayerIndex = (game.currentPlayerIndex + game.direction) % game.turnOrder.length;
                }
                break;
            }
            case "+2": {
                for (let i = 0; i < 2; i++) {
                    game.hands[nextPlayerId].push(game.deck.pop());
                }
                game.currentPlayerIndex = (game.currentPlayerIndex + 2 * game.direction + game.turnOrder.length) % game.turnOrder.length;
                break;
            }
                    
            case "+4": {
                for (let i = 0; i < 4; i++) {
                    game.hands[nextPlayerId].push(game.deck.pop());
                }
                game.currentPlayerIndex = (game.currentPlayerIndex + 2 * game.direction + game.turnOrder.length) % game.turnOrder.length;
                break;
            }
                    
            default: {
                game.currentPlayerIndex = (game.currentPlayerIndex + game.direction) % game.turnOrder.length;
            }
        }
            
        await gameChannel.send(`<@${playerId}> played **${playedCard.cardToString()}**`);
        await i.reply ({content: `You played **${playedCard.cardToString()}**`, flags: MessageFlags.Ephemeral});

        collector.stop();

        advanceTurn(gameChannel);
    });

    collector.on('end', async (_, reason) => {
        if (reason === "time") {
            const drawnCard = game.deck.pop();
            game.hands[playerId].push(drawnCard);
            await currentPlayer.send("You ran out of time, so you automatically drew a card.");
               
            game.currentPlayerIndex = (game.currentPlayerIndex + game.direction) % game.turnOrder.length;
            advanceTurn(gameChannel);
        }
    });
}

///////////////////////////////////////////// discord api things ///////////////////////////////////////////////

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

     if (!countingDown && players.length >= 1) { //PROJECTFINISH: change to two
        countingDown = true;
        
        const gameChannel = interaction.channel;

        await gameChannel.send("Game will begin in 60 seconds...");
    
        setTimeout(() => {
             gameChannel.send(`🚀 Game starting with ${players.length} players!`);
        startGame(gameChannel);
    }, 20000); //PROJECTFINISH: change to 60000
    }
});

client.login(token);