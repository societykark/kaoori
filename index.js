import TelegramBot from 'node-telegram-bot-api';
import Groq from 'groq-sdk';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// =====================================================
//  LECTURA DE VARIABLES DE ENTORNO
// =====================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!TELEGRAM_TOKEN) {
  console.error('❌ FALTA TELEGRAM_TOKEN');
  process.exit(1);
}

// =====================================================
//  INICIALIZAR BOT Y CLIENTES
// =====================================================
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// =====================================================
//  COMANDO /test (diagnóstico)
// =====================================================
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  let report = '🔍 *DIAGNÓSTICO*\n\n';
  report += `✅ TELEGRAM: ${TELEGRAM_TOKEN ? 'OK' : 'FALTA'}\n`;
  report += `✅ GROQ (IA): ${GROQ_API_KEY ? 'OK' : 'FALTA'}\n`;
  report += `✅ WEATHER: ${WEATHER_API_KEY ? 'OK' : 'FALTA'}\n`;
  await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
});

// =====================================================
//  COMANDO /ai (con Groq, gratis y rápido)
// =====================================================
if (groq) {
  bot.onText(/\/ai (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-specdec',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      const reply = completion.choices[0].message.content;
      await bot.sendMessage(chatId, `🤖 *IA:*\n${reply}`, { parse_mode: 'Markdown' });
    } catch (err) {
      await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  });
} else {
  bot.onText(/\/ai/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ GROQ no configurado. Agrega GROQ_API_KEY en Railway.');
  });
}

// =====================================================
//  COMANDO /clima (con WeatherAPI)
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
      await bot.sendMessage(chatId,
        `🌡️ *${data.location.name}:*\n${data.current.condition.text}\nTemperatura: ${data.current.temp_c}°C`,
        { parse_mode: 'Markdown' }
      );
    } catch {
      await bot.sendMessage(chatId, '❌ No encontré esa ciudad. Prueba en inglés (ej: "Mexico City").');
    }
  });
} else {
  bot.onText(/\/clima/, (msg) => {
    bot.sendMessage(msg.chat.id, '❌ WeatherAPI no configurado.');
  });
}

// =====================================================
//  COMANDOS BÁSICOS
// =====================================================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🤖 *Bot con Groq y WeatherAPI*\n\n` +
    `/start - Inicio\n/ping - Latencia\n/test - Diagnóstico\n/ai [texto] - ChatGPT gratis\n/clima [ciudad] - Clima\n/help - Ayuda`,
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

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `📌 *Comandos:*\n/start - Inicio\n/ping - Latencia\n/test - Diagnóstico\n/ai [texto] - IA\n/clima [ciudad] - Clima`,
    { parse_mode: 'Markdown' }
  );
});

console.log('🤖 Bot corriendo con Groq y WeatherAPI...'); 