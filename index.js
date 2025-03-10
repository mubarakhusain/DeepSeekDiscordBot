require('dotenv').config(); // Load environment variables from .env file
const { Client, GatewayIntentBits } = require('discord.js');
const admin = require('firebase-admin');
const serviceAccount = require(`./firebase-key.json`); // Firebase service account key
const axios = require('axios'); // For making HTTP requests to DeepSeek API

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// DeepSeek API configuration
const DEEPSEEK_API_KEY = process.env.DEEPAI_API_KEY; // DeepSeek API key from .env
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'; // DeepSeek API endpoint

// Setup Discord bot client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// A simple delay function using async/await to avoid rate limits
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Bot message handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignore bot messages

    try {
        // Wait for 1 second before sending the next request (to prevent rate limiting)
        await delay(1000);

        // Make the DeepSeek API request
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: 'deepseek-chat', // Replace with the correct DeepSeek model
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' }, // System message for context
                    { role: 'user', content: message.content }, // User message
                ],
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Extract the reply from the response
        const reply = response.data.choices[0].message.content;
        message.reply(reply);

        // Log conversation to Firebase
        await db.collection('chat_logs').add({
            user: message.author.username,
            message: message.content,
            response: reply,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Error interacting with DeepSeek API:', error);
        message.reply("Sorry, I couldn't process your request at the moment.");
    }
});

// Log in the bot
client.login(process.env.DISCORD_TOKEN);


