import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // Intenta leer .env local, pero si no existe, usa las variables de Railway

// =====================================================
//  LECTURA DE VARIABLES DE ENTORNO (desde Railway)
// =====================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!TELEGRAM_TOKEN) {
  console.error('❌ FALTA TELEGRAM_TOKEN en variables de entorno (Railway)');
  process.exit(1);
}

// =====================================================
//  INICIALIZAR BOT Y CLIENTES
// =====================================================
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const weatherApiKey = WEATHER_API_KEY;

// =====================================================
//  COMANDOS
// =====================================================

// 🔹 /start - Bienvenida
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `🤖 *Bot Ultra en Railway*\n\n` +
    `Comandos disponibles:\n` +
    `/start - Inicio\n` +
    `/ping - Latencia\n` +
    `/ai [texto] - ChatGPT (si tienes OpenAI)\n` +
    `/imagen [descripción] - Genera imagen con DALL-E\n` +
    `/clima [ciudad] - Clima actual\n` +
    `/help - Ayuda\n` +
    `\nCreado por tu compa 🤘`,
    { parse_mode: 'Markdown' }
  );
});

// 🔹 /help - Ayuda
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `📌 *Comandos disponibles:*\n` +
    `/start - Inicio\n` +
    `/ping - Latencia\n` +
    `/ai [texto] - ChatGPT\n` +
    `/imagen [descripción] - Genera imagen\n` +
    `/clima [ciudad] - Clima\n` +
    `/help - Esta ayuda\n` +
    `\nPara usar /ai, /imagen o /clima necesitas las keys correspondientes en Railway.`,
    { parse_mode: 'Markdown' }
  );
});

// 🔹 /ping - Latencia
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  const start = Date.now();
  await bot.sendMessage(chatId, '🏓 Pong...');
  const end = Date.now();
  await bot.sendMessage(chatId, `*Latencia:* ${end - start}ms`, { parse_mode: 'Markdown' });
});

// 🔹 /ai - ChatGPT
if (openai) {
  bot.onText(/\/ai (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un asistente útil, gracioso, y respondes en español.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });
      const reply = completion.choices[0].message.content;
      await bot.sendMessage(chatId, `🤖 *GPT:*\n${reply}`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Error en /ai:', err);
      await bot.sendMessage(chatId, '❌ Error al consultar OpenAI.');
    }
  });
} else {
  bot.onText(/\/ai/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ OpenAI no configurado. Agrega OPENAI_API_KEY en Railway.');
  });
}

// 🔹 /imagen - DALL-E
if (openai) {
  bot.onText(/\/imagen (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1];
    await bot.sendChatAction(chatId, 'upload_photo');
    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
      });
      const imageUrl = response.data[0].url;
      await bot.sendPhoto(chatId, imageUrl, { caption: `🖼️ *"${prompt}"*`, parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Error en /imagen:', err);
      await bot.sendMessage(chatId, '❌ No se pudo generar la imagen.');
    }
  });
} else {
  bot.onText(/\/imagen/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ OpenAI no configurado. Agrega OPENAI_API_KEY en Railway.');
  });
}

// 🔹 /clima - Clima
if (weatherApiKey) {
  bot.onText(/\/clima (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ciudad = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const url = `http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${ciudad}&lang=es`;
      const { data } = await axios.get(url);
      const temp = data.current.temp_c;
      const condition = data.current.condition.text;
      const location = data.location.name;
      await bot.sendMessage(chatId,
        `🌡️ *Clima en ${location}:*\n${condition}\nTemperatura: ${temp}°C`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Error en /clima:', err);
      await bot.sendMessage(chatId, '❌ No encontré esa ciudad.');
    }
  });
} else {
  bot.onText(/\/clima/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ WeatherAPI no configurado. Agrega WEATHER_API_KEY en Railway.');
  });
}

// =====================================================
//  INICIO
// =====================================================
console.log('🤖 Bot Ultra corriendo en Railway...');
console.log('Comandos disponibles: /start, /ping, /ai, /imagen, /clima, /help');
