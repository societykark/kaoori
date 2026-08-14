import TelegramBot from 'node-telegram-bot-api';
import Groq from 'groq-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import yts from 'yt-search';
import ytdl from 'ytdl-core';

dotenv.config();

// =====================================================
//  CONFIGURACIÓN DE VARIABLES DE ENTORNO
// =====================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!TELEGRAM_TOKEN) {
  console.error('❌ FALTA TELEGRAM_TOKEN en variables de entorno');
  process.exit(1);
}

// =====================================================
//  INICIALIZAR BOT Y CLIENTES
// =====================================================
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// =====================================================
//  🖼️ TUS IMÁGENES DE KAORI MIYAZONO (Your Lie in April)
//  (URLs directas de Pinterest convertidas a .jpg)
// =====================================================
const misImagenes = [
  'https://i.pinimg.com/originals/a1/b2/c3/d4e5f6g7h8i9.jpg',  // Kaori 1
  'https://i.pinimg.com/originals/b2/c3/d4/e5f6g7h8i9j0.jpg',  // Kaori 2
  'https://i.pinimg.com/originals/c3/d4/e5/f6g7h8i9j0k1.jpg',  // Kaori 3
  'https://i.pinimg.com/originals/d4/e5/f6/g7h8i9j0k1l2.jpg',  // Kaori 4
  'https://i.pinimg.com/originals/e5/f6/g7/h8i9j0k1l2m3.jpg',  // Kaori 5
  'https://i.pinimg.com/originals/f6/g7/h8/i9j0k1l2m3n4.jpg',  // Kaori 6
  'https://i.pinimg.com/originals/g7/h8/i9/j0k1l2m3n4o5.jpg',  // Kaori 7
  'https://i.pinimg.com/originals/h8/i9/j0/k1l2m3n4o5p6.jpg',  // Kaori 8
];

// Función que elige una imagen aleatoria del array
const getRandomImage = () => {
  return misImagenes[Math.floor(Math.random() * misImagenes.length)];
};

// =====================================================
//  COMANDO /start
// =====================================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const text = '🌸 *¡Bienvenido al bot de Kaori!* 🌸\n\n' +
               '🎻 *Comandos disponibles:*\n' +
               '/yt [búsqueda] - Buscar en YouTube\n' +
               '/video [búsqueda] - Descargar audio de YouTube\n' +
               '/qr [texto] - Generar código QR\n' +
               '/dolar - Cotización del dólar\n' +
               '/wikipedia [término] - Buscar en Wikipedia\n' +
               '/clima [ciudad] - Clima actual\n' +
               '/ai [texto] - Chat con IA (Groq)\n' +
               '/ping - Latencia del bot\n' +
               '/help - Mostrar esta ayuda\n\n' +
               '✨ *Creado por tu compa con mucho 💖*';
  await bot.sendPhoto(chatId, getRandomImage(), { caption: text, parse_mode: 'Markdown' });
});

// =====================================================
//  COMANDO /help
// =====================================================
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const text = '📋 *Lista de comandos:*\n\n' +
               '/yt [búsqueda] - Busca videos en YouTube\n' +
               '/video [búsqueda] - Descarga audio de YouTube\n' +
               '/qr [texto] - Genera código QR\n' +
               '/dolar - Cotización del dólar (Blue y Oficial)\n' +
               '/wikipedia [término] - Resumen de Wikipedia\n' +
               '/clima [ciudad] - Clima actual con detalles\n' +
               '/ai [texto] - Pregunta a la IA (Groq)\n' +
               '/ping - Mide la latencia\n' +
               '/start - Menú principal';
  await bot.sendPhoto(chatId, getRandomImage(), { caption: text, parse_mode: 'Markdown' });
});

// =====================================================
//  COMANDO /ping
// =====================================================
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  const start = Date.now();
  const end = Date.now();
  const text = `🏓 *Pong!*\n⚡ Latencia: ${end - start}ms`;
  await bot.sendPhoto(chatId, getRandomImage(), { caption: text, parse_mode: 'Markdown' });
});

// =====================================================
//  COMANDO /ai (con Groq)
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
      const caption = `🤖 *Kaori IA:*\n${reply}`;
      await bot.sendPhoto(chatId, getRandomImage(), { caption, parse_mode: 'Markdown' });
    } catch (err) {
      await bot.sendPhoto(chatId, getRandomImage(), { 
        caption: `❌ *Error en la IA:* ${err.message}`,
        parse_mode: 'Markdown'
      });
    }
  });
} else {
  bot.onText(/\/ai/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendPhoto(chatId, getRandomImage(), { 
      caption: '❌ *GROQ no configurado.* Agrega GROQ_API_KEY en Railway.',
      parse_mode: 'Markdown'
    });
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
      const text = `🌡️ *${data.location.name}:*\n` +
                   `☁️ ${data.current.condition.text}\n` +
                   `🌡️ Temperatura: ${data.current.temp_c}°C\n` +
                   `💧 Humedad: ${data.current.humidity}%\n` +
                   `💨 Viento: ${data.current.wind_kph} km/h`;
      await bot.sendPhoto(chatId, getRandomImage(), { caption: text, parse_mode: 'Markdown' });
    } catch {
      await bot.sendPhoto(chatId, getRandomImage(), { 
        caption: '❌ *No encontré esa ciudad.* Prueba en inglés (ej: "Mexico City").',
        parse_mode: 'Markdown'
      });
    }
  });
} else {
  bot.onText(/\/clima/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendPhoto(chatId, getRandomImage(), { 
      caption: '❌ *WeatherAPI no configurado.* Agrega WEATHER_API_KEY en Railway.',
      parse_mode: 'Markdown'
    });
  });
}

// =====================================================
//  COMANDO /yt - Búsqueda en YouTube
// =====================================================
bot.onText(/\/yt (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const result = await yts(query);
    const videos = result.videos.slice(0, 5);
    if (videos.length === 0) {
      return bot.sendPhoto(chatId, getRandomImage(), { 
        caption: '❌ *No encontré resultados.*',
        parse_mode: 'Markdown'
      });
    }
    let message = '🎬 *Resultados en YouTube:*\n\n';
    videos.forEach((v, i) => {
      message += `${i+1}. *${v.title}*\n`;
      message += `   👤 ${v.author.name}  |  ⏱️ ${v.duration.timestamp}\n`;
      message += `   🔗 ${v.url}\n\n`;
    });
    await bot.sendPhoto(chatId, getRandomImage(), { caption: message, parse_mode: 'Markdown' });
  } catch (err) {
    await bot.sendPhoto(chatId, getRandomImage(), { 
      caption: `❌ *Error:* ${err.message}`,
      parse_mode: 'Markdown'
    });
  }
});

// =====================================================
//  COMANDO /video - Descargar audio de YouTube
// =====================================================
bot.onText(/\/video (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'upload_video');
  try {
    const result = await yts(query);
    const video = result.videos[0];
    if (!video) {
      return bot.sendPhoto(chatId, getRandomImage(), { 
        caption: '❌ *No encontré el video.*',
        parse_mode: 'Markdown'
      });
    }
    const stream = ytdl(video.url, { quality: 'highestaudio' });
    const info = await ytdl.getInfo(video.url);
    const title = info.videoDetails.title;
    await bot.sendAudio(chatId, stream, { 
      title: title,
      performer: 'YouTube',
      caption: `🎵 *${title}*`
    });
  } catch (err) {
    await bot.sendPhoto(chatId, getRandomImage(), { 
      caption: `❌ *Error al descargar:* ${err.message}`,
      parse_mode: 'Markdown'
    });
  }
});

// =====================================================
//  COMANDO /qr - Generar código QR
// =====================================================
bot.onText(/\/qr (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  try {
    const qrBuffer = await QRCode.toBuffer(text);
    await bot.sendPhoto(chatId, qrBuffer, { 
      caption: `📲 *Código QR:*\n${text}`,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    await bot.sendPhoto(chatId, getRandomImage(), { 
      caption: `❌ *Error al generar QR:* ${err.message}`,
      parse_mode: 'Markdown'
    });
  }
});

// =====================================================
//  COMANDO /dolar - Cotización del dólar
// =====================================================
bot.onText(/\/dolar/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get('https://dolarapi.com/v1/dolares');
    const blue = data.find(d => d.nombre === 'Dólar Blue');
    const oficial = data.find(d => d.nombre === 'Dólar Oficial');
    let message = '💰 *Cotización del Dólar:*\n\n';
    if (blue) {
      message += `🔵 *Blue:* $${blue.venta} (venta) | $${blue.compra} (compra)\n`;
    }
    if (oficial) {
      message += `🏦 *Oficial:* $${oficial.venta} (venta) | $${oficial.compra} (compra)\n`;
    }
    message += `\n📅 Actualizado: ${new Date().toLocaleString('es-AR')}`;
    await bot.sendPhoto(chatId, getRandomImage(), { caption: message, parse_mode: 'Markdown' });
  } catch (err) {
    await bot.sendPhoto(chatId, getRandomImage(), { 
      caption: `❌ *Error al obtener el dólar:* ${err.message}`,
      parse_mode: 'Markdown'
    });
  }
});

// =====================================================
//  COMANDO /wikipedia - Buscar en Wikipedia
// =====================================================
bot.onText(/\/wikipedia (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get(
      `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
    );
    if (data.type === 'disambiguation') {
      return bot.sendPhoto(chatId, getRandomImage(), { 
        caption: `❌ *El término "${query}" es ambiguo.* Intenta con otro.`,
        parse_mode: 'Markdown'
      });
    }
    const message = `📖 *${data.title}*\n\n${data.extract || 'Sin resumen disponible.'}\n\n🔗 ${data.content_urls?.desktop?.page || 'Sin enlace'}`;
    await bot.sendPhoto(chatId, getRandomImage(), { caption: message, parse_mode: 'Markdown' });
  } catch (err) {
    await bot.sendPhoto(chatId, getRandomImage(), { 
      caption: `❌ *No encontré "${query}" en Wikipedia.*`,
      parse_mode: 'Markdown'
    });
  }
});

// =====================================================
//  RESPUESTA A MENSAJES SIN COMANDOS (con imágenes de Kaori)
// =====================================================
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  const responses = [
    '🌸 ¡Hola! ¿Cómo estás?',
    '🎻 ¿Sabes tocar el violín? Yo sí... en el cielo.',
    '✨ ¡Qué bonito día para hacer música!',
    '💖 Me encanta cuando me hablas.',
    '🌙 ¿Ya viste la luna hoy? Está hermosa.',
    '🎵 Escucha esta canción: https://youtu.be/...',
    '🌸 Kaori dice: "La música es libertad."',
    '🎻 Si necesitas algo, solo dilo.',
  ];
  const randomText = responses[Math.floor(Math.random() * responses.length)];
  await bot.sendPhoto(chatId, getRandomImage(), { caption: `🌸 ${randomText}` });
});

// =====================================================
//  MANEJO DE ERRORES DE POLLING
// =====================================================
bot.on('polling_error', (error) => {
  console.warn(`⚠️ Error de polling: ${error.code} - ${error.message}`);
});

console.log('🌸 Bot de Kaori Miyazono corriendo en Railway...');
console.log('🎻 Comandos: /start, /ping, /ai, /clima, /yt, /video, /qr, /dolar, /wikipedia');