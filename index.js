import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// =====================================================
//  LECTURA DE VARIABLES DE ENTORNO
// =====================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!TELEGRAM_TOKEN) {
  console.error('❌ FALTA TELEGRAM_TOKEN en variables de entorno');
  process.exit(1);
}

// =====================================================
//  INICIALIZAR BOT (con opciones para evitar conflictos)
// =====================================================
const bot = new TelegramBot(TELEGRAM_TOKEN, { 
  polling: {
    autoStart: true,
    interval: 300,
    params: {
      timeout: 10
    }
  }
});

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const weatherApiKey = WEATHER_API_KEY;

// =====================================================
//  MANEJO DE ERRORES DE POLLING (sin que se caiga)
// =====================================================
bot.on('polling_error', (error) => {
  console.warn(`⚠️ Error de polling (ignorado): ${error.code} - ${error.message}`);
});

bot.on('error', (error) => {
  console.error(`❌ Error general: ${error.message}`);
});

// =====================================================
//  COMANDOS
// =====================================================

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `🤖 *Bot Ultra en Railway*\n\n` +
    `Comandos disponibles:\n` +
    `/start - Inicio\n` +
    `/ping - Latencia\n` +
    `/ai [texto] - ChatGPT\n` +
    `/imagen [descripción] - Genera imagen\n` +
    `/clima [ciudad] - Clima\n` +
    `/help - Ayuda\n` +
    `\nCreado por tu compa 🤘`,
    { parse_mode: 'Markdown' }
  );
});

// /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `📌 *Comandos:*\n` +
    `/start - Inicio\n` +
    `/ping - Latencia\n` +
    `/ai - ChatGPT\n` +
    `/imagen - Genera imagen\n` +
    `/clima - Clima\n` +
    `/help - Esta ayuda`,
    { parse_mode: 'Markdown' }
  );
});

// /ping
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  const start = Date.now();
  await bot.sendMessage(chatId, '🏓 Pong...');
  const end = Date.now();
  await bot.sendMessage(chatId, `*Latencia:* ${end - start}ms`, { parse_mode: 'Markdown' });
});

// /ai
if (openai) {
  bot.onText(/\/ai (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      await bot.sendMessage(chatId, `🤖 *GPT:*\n${completion.choices[0].message.content}`, { parse_mode: 'Markdown' });
    } catch {
      await bot.sendMessage(chatId, '❌ Error con OpenAI.');
    }
  });
} else {
  bot.onText(/\/ai/, (msg) => bot.sendMessage(msg.chat.id, '❌ OpenAI no configurado. Agrega OPENAI_API_KEY en Railway.'));
}

// /imagen
if (openai) {
  bot.onText(/\/imagen (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1];
    await bot.sendChatAction(chatId, 'upload_photo');
    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
      });
      await bot.sendPhoto(chatId, response.data[0].url, { caption: `🖼️ "${prompt}"` });
    } catch {
      await bot.sendMessage(chatId, '❌ No se pudo generar la imagen.');
    }
  });
} else {
  bot.onText(/\/imagen/, (msg) => bot.sendMessage(msg.chat.id, '❌ OpenAI no configurado. Agrega OPENAI_API_KEY en Railway.'));
}

// /clima
if (weatherApiKey) {
  bot.onText(/\/clima (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ciudad = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const { data } = await axios.get(`http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${ciudad}&lang=es`);
      await bot.sendMessage(chatId,
        `🌡️ *Clima en ${data.location.name}:*\n${data.current.condition.text}\nTemperatura: ${data.current.temp_c}°C`,
        { parse_mode: 'Markdown' }
      );
    } catch {
      await bot.sendMessage(chatId, '❌ No encontré esa ciudad.');
    }
  });
} else {
  bot.onText(/\/clima/, (msg) => bot.sendMessage(msg.chat.id, '❌ WeatherAPI no configurado.'));
}

console.log('🤖 Bot Ultra corriendo en Railway...');