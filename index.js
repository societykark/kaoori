import TelegramBot from 'node-telegram-bot-api';
import Groq from 'groq-sdk';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!TELEGRAM_TOKEN) {
  console.error('❌ FALTA TELEGRAM_TOKEN');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// =====================================================
// FUNCIÓN QUE GENERA UNA IMAGEN DE ANIME (GENERAL)
// =====================================================
const getAnimeImage = (query) => {
  // Genera una imagen usando Pollinations (gratis, sin clave)
  // Puedes cambiar la URL para tener un estilo específico
  return `https://image.pollinations.ai/prompt/${encodeURIComponent('anime girl, ' + query)}`;
};

// =====================================================
// COMANDO /start (CON IMAGEN Y TEXTO)
// =====================================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const text = '🌸 ¡Bienvenido al bot!\n\nComandos:\n/start - Inicio\n/ping - Latencia\n/ai [pregunta] - Chat con IA\n/imagen [descripción] - Genera imagen\n/clima [ciudad] - Clima';
  const image = getAnimeImage('welcome, cute');
  await bot.sendPhoto(chatId, image, { caption: text });
});

// =====================================================
// COMANDO /ping (CON IMAGEN Y TEXTO)
// =====================================================
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  const start = Date.now();
  const end = Date.now();
  const text = `🏓 Pong!\n⚡ Latencia: ${end - start}ms`;
  const image = getAnimeImage('ping pong, anime');
  await bot.sendPhoto(chatId, image, { caption: text });
});

// =====================================================
// COMANDO /ai (CON IMAGEN + TEXTO)
// =====================================================
if (groq) {
  bot.onText(/\/ai (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      const reply = completion.choices[0].message.content;
      const image = getAnimeImage(prompt);
      await bot.sendPhoto(chatId, image, { caption: `🤖 *Respuesta:*\n${reply}` });
    } catch (err) {
      const image = getAnimeImage('error');
      await bot.sendPhoto(chatId, image, { caption: `❌ Error: ${err.message}` });
    }
  });
} else {
  bot.onText(/\/ai/, async (msg) => {
    const chatId = msg.chat.id;
    const image = getAnimeImage('error');
    await bot.sendPhoto(chatId, image, { caption: '❌ GROQ no configurado.' });
  });
}

// =====================================================
// COMANDO /imagen (GENERA IMAGEN CON IA)
// =====================================================
bot.onText(/\/imagen (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  await bot.sendChatAction(chatId, 'upload_photo');
  try {
    const imageUrl = getAnimeImage(prompt);
    await bot.sendPhoto(chatId, imageUrl, { caption: `🖼️ *"${prompt}"*` });
  } catch (err) {
    const image = getAnimeImage('error');
    await bot.sendPhoto(chatId, image, { caption: `❌ Error al generar imagen: ${err.message}` });
  }
});

// =====================================================
// COMANDO /clima (CON IMAGEN + TEXTO)
// =====================================================
if (WEATHER_API_KEY) {
  bot.onText(/\/clima (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ciudad = match[1].trim();
    await bot.sendChatAction(chatId, 'typing');
    try {
      const { data } = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${ciudad}&lang=es`
      );
      const text = `🌡️ *${data.location.name}:*\n${data.current.condition.text}\nTemperatura: ${data.current.temp_c}°C`;
      const image = getAnimeImage('weather, rain, cute');
      await bot.sendPhoto(chatId, image, { caption: text });
    } catch {
      const image = getAnimeImage('city');
      await bot.sendPhoto(chatId, image, { caption: '❌ No encontré esa ciudad. Prueba en inglés (ej: "Mexico City").' });
    }
  });
} else {
  bot.onText(/\/clima/, async (msg) => {
    const chatId = msg.chat.id;
    const image = getAnimeImage('error');
    await bot.sendPhoto(chatId, image, { caption: '❌ WeatherAPI no configurado.' });
  });
}

// =====================================================
// RESPUESTA A MENSAJES SIN COMANDOS (TEXTO + IMAGEN)
// =====================================================
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  const responses = [
    '¡Hola! ¿Cómo estás? 🌸',
    '¡Qué onda! Si necesitas algo, usa /start ~',
    '¡Me encanta cuando me hablan! 💖',
    '¿Sabías que soy un bot muy simpático? 😊',
    '¡Nya! ¿Qué tal tu día? 🌸',
    '¡Dime, dime! ¿Qué necesitas? 🎀',
    '¡Eso suena interesante! Cuéntame más ~',
  ];
  const randomText = responses[Math.floor(Math.random() * responses.length)];
  const image = getAnimeImage('anime girl, cute, happy');
  await bot.sendPhoto(chatId, image, { caption: `🌸 ${randomText}` });
});

// =====================================================
// MANEJO DE ERRORES (polling)
// =====================================================
bot.on('polling_error', (error) => {
  console.warn(`⚠️ Error de polling: ${error.code} - ${error.message}`);
});

console.log('🤖 Bot corriendo con imagen + texto en cada respuesta...');