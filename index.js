import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// =====================================================
//  LECTURA DE VARIABLES DE ENTORNO CON VERIFICACIÓN
// =====================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

console.log('🔍 VERIFICANDO VARIABLES DE ENTORNO:');
console.log(`✅ TELEGRAM_TOKEN: ${TELEGRAM_TOKEN ? '✅ Presente' : '❌ FALTA'}`);
console.log(`✅ OPENAI_API_KEY: ${OPENAI_API_KEY ? '✅ Presente (${OPENAI_API_KEY.substring(0, 10)}...)' : '❌ FALTA'}`);
console.log(`✅ WEATHER_API_KEY: ${WEATHER_API_KEY ? '✅ Presente' : '❌ FALTA'}`);

if (!TELEGRAM_TOKEN) {
  console.error('❌ FALTA TELEGRAM_TOKEN');
  process.exit(1);
}

// =====================================================
//  INICIALIZAR BOT
// =====================================================
const bot = new TelegramBot(TELEGRAM_TOKEN, { 
  polling: {
    autoStart: true,
    interval: 300,
    params: { timeout: 10 }
  }
});

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const weatherApiKey = WEATHER_API_KEY;

bot.on('polling_error', (error) => {
  console.warn(`⚠️ Error de polling: ${error.code} - ${error.message}`);
});

// =====================================================
//  COMANDOS CON ERRORES DETALLADOS
// =====================================================

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `🤖 *Bot Ultra en Railway*\n\n` +
    `Comandos:\n/start - Inicio\n/ping - Latencia\n/ai [texto] - ChatGPT\n/imagen [descripción] - Genera imagen\n/clima [ciudad] - Clima\n/help - Ayuda\n\nCreado por tu compa 🤘`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  const start = Date.now();
  await bot.sendMessage(chatId, '🏓 Pong...');
  const end = Date.now();
  await bot.sendMessage(chatId, `*Latencia:* ${end - start}ms`, { parse_mode: 'Markdown' });
});

// /ai - CON MENSAJES DE ERROR DETALLADOS
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
      const reply = completion.choices[0].message.content;
      await bot.sendMessage(chatId, `🤖 *GPT:*\n${reply}`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ Error en /ai:', err);
      let mensaje = '❌ Error al consultar OpenAI.';
      if (err.message.includes('insufficient_quota')) {
        mensaje = '❌ Saldo insuficiente en OpenAI. Revisa tu facturación.';
      } else if (err.message.includes('invalid_api_key')) {
        mensaje = '❌ API key de OpenAI inválida. Verifica que esté bien escrita.';
      } else if (err.message.includes('model_not_found')) {
        mensaje = '❌ Modelo no encontrado. Usa gpt-4o-mini.';
      }
      await bot.sendMessage(chatId, mensaje);
    }
  });
} else {
  bot.onText(/\/ai/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ OpenAI no configurado. Agrega OPENAI_API_KEY en Railway.');
  });
}

// /imagen - CON ERRORES DETALLADOS
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
    } catch (err) {
      console.error('❌ Error en /imagen:', err);
      let mensaje = '❌ No se pudo generar la imagen.';
      if (err.message.includes('insufficient_quota')) {
        mensaje = '❌ Saldo insuficiente en OpenAI. Revisa tu facturación.';
      } else if (err.message.includes('invalid_api_key')) {
        mensaje = '❌ API key de OpenAI inválida.';
      }
      await bot.sendMessage(chatId, mensaje);
    }
  });
} else {
  bot.onText(/\/imagen/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ OpenAI no configurado.');
  });
}

// /clima - CON MENSAJES MÁS CLAROS
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
    } catch (err) {
      console.error('❌ Error en /clima:', err);
      await bot.sendMessage(chatId, '❌ No encontré esa ciudad. Prueba con el nombre en inglés (ej: "New York").');
    }
  });
} else {
  bot.onText(/\/clima/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ WeatherAPI no configurado. Agrega WEATHER_API_KEY en Railway.');
  });
}

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `📌 *Comandos:*\n/start - Inicio\n/ping - Latencia\n/ai [texto] - ChatGPT\n/imagen [descripción] - Genera imagen\n/clima [ciudad] - Clima\n/help - Esta ayuda`,
    { parse_mode: 'Markdown' }
  );
});

console.log('🤖 Bot Ultra corriendo en Railway...');