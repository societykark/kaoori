import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// =====================================================
//  LECTURA DE VARIABLES DE ENTORNO CON LOGS
// =====================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

console.log('🔍 ====== VARIABLES DE ENTORNO ======');
console.log(`✅ TELEGRAM_TOKEN: ${TELEGRAM_TOKEN ? '✅ Presente' : '❌ FALTA'}`);
console.log(`✅ OPENAI_API_KEY: ${OPENAI_API_KEY ? '✅ Presente' : '❌ FALTA'}`);
console.log(`✅ WEATHER_API_KEY: ${WEATHER_API_KEY ? '✅ Presente' : '❌ FALTA'}`);
console.log('=====================================');

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

let openai = null;
try {
  if (OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    console.log('✅ OpenAI inicializado correctamente');
  } else {
    console.warn('⚠️ OPENAI_API_KEY no presente, comandos /ai y /imagen desactivados');
  }
} catch (err) {
  console.error('❌ Error inicializando OpenAI:', err.message);
}

const weatherApiKey = WEATHER_API_KEY;

// Manejador de errores de polling
bot.on('polling_error', (error) => {
  console.warn(`⚠️ Error de polling: ${error.code} - ${error.message}`);
});

// =====================================================
//  COMANDO /test - DIAGNÓSTICO DESDE TELEGRAM
// =====================================================
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  let report = '🔍 *DIAGNÓSTICO DEL BOT*\n\n';
  report += `✅ TELEGRAM_TOKEN: ${TELEGRAM_TOKEN ? 'Presente' : 'FALTA'}\n`;
  report += `✅ OPENAI_API_KEY: ${OPENAI_API_KEY ? 'Presente' : 'FALTA'}\n`;
  report += `✅ WEATHER_API_KEY: ${WEATHER_API_KEY ? 'Presente' : 'FALTA'}\n\n`;
  
  if (openai) {
    report += '🤖 *OpenAI inicializado*\n';
    // Prueba rápida de OpenAI
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Responde solo "OK"' }],
        max_tokens: 5,
      });
      const reply = completion.choices[0].message.content;
      report += `✅ *Prueba OpenAI:* ${reply}\n`;
    } catch (err) {
      report += `❌ *Error OpenAI:* ${err.message}\n`;
    }
  } else {
    report += '❌ OpenAI no inicializado\n';
  }

  if (weatherApiKey) {
    report += `✅ WeatherAPI: Presente\n`;
    try {
      const { data } = await axios.get(`http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=London&lang=es`);
      report += `✅ *Prueba WeatherAPI:* ${data.location.name} - ${data.current.temp_c}°C\n`;
    } catch (err) {
      report += `❌ *Error WeatherAPI:* ${err.message}\n`;
    }
  } else {
    report += '❌ WeatherAPI no configurado\n';
  }

  await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
});

// =====================================================
//  COMANDOS PRINCIPALES
// =====================================================

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `🤖 *Bot Ultra en Railway*\n\n` +
    `Comandos:\n` +
    `/start - Inicio\n` +
    `/ping - Latencia\n` +
    `/test - Diagnóstico\n` +
    `/ai [texto] - ChatGPT\n` +
    `/imagen [descripción] - Genera imagen\n` +
    `/clima [ciudad] - Clima\n` +
    `/help - Ayuda`,
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
    console.log(`📩 /ai: "${prompt}"`);
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      const reply = completion.choices[0].message.content;
      await bot.sendMessage(chatId, `🤖 *GPT:*\n${reply}`, { parse_mode: 'Markdown' });
      console.log(`✅ /ai respondido`);
    } catch (err) {
      console.error('❌ Error en /ai:', err.message);
      await bot.sendMessage(chatId, `❌ Error OpenAI: ${err.message}`);
    }
  });
} else {
  bot.onText(/\/ai/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ OpenAI no configurado. Agrega OPENAI_API_KEY en Railway.');
  });
}

// /imagen
if (openai) {
  bot.onText(/\/imagen (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1];
    await bot.sendChatAction(chatId, 'upload_photo');
    console.log(`📩 /imagen: "${prompt}"`);
    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
      });
      await bot.sendPhoto(chatId, response.data[0].url, { caption: `🖼️ "${prompt}"` });
      console.log(`✅ Imagen generada`);
    } catch (err) {
      console.error('❌ Error en /imagen:', err.message);
      await bot.sendMessage(chatId, `❌ Error OpenAI: ${err.message}`);
    }
  });
} else {
  bot.onText(/\/imagen/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ OpenAI no configurado.');
  });
}

// /clima
if (weatherApiKey) {
  bot.onText(/\/clima (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ciudad = match[1].trim();
    await bot.sendChatAction(chatId, 'typing');
    console.log(`📩 /clima: "${ciudad}"`);
    try {
      const url = `http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${ciudad}&lang=es`;
      console.log(`🌐 URL: ${url}`);
      const { data } = await axios.get(url);
      await bot.sendMessage(chatId,
        `🌡️ *Clima en ${data.location.name}:*\n${data.current.condition.text}\nTemperatura: ${data.current.temp_c}°C`,
        { parse_mode: 'Markdown' }
      );
      console.log(`✅ Clima enviado para "${ciudad}"`);
    } catch (err) {
      console.error('❌ Error en /clima:', err.message);
      if (err.response?.status === 400) {
        await bot.sendMessage(chatId, `❌ No encontré "${ciudad}". Prueba con el nombre en inglés (ej: "Mexico City").`);
      } else {
        await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
      }
    }
  });
} else {
  bot.onText(/\/clima/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ WeatherAPI no configurado.');
  });
}

// /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `📌 *Comandos:*\n` +
    `/start - Inicio\n` +
    `/ping - Latencia\n` +
    `/test - Diagnóstico\n` +
    `/ai [texto] - ChatGPT\n` +
    `/imagen [descripción] - Genera imagen\n` +
    `/clima [ciudad] - Clima\n` +
    `/help - Esta ayuda`,
    { parse_mode: 'Markdown' }
  );
});

console.log('🤖 Bot Ultra corriendo en Railway...');
console.log('Comandos: /start, /ping, /test, /ai, /imagen, /clima, /help');