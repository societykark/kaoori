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
//  🖼️ IMÁGENES DE KAORI (URLs DIRECTAS QUE SÍ FUNCIONAN)
//  (Puedes reemplazar estas URLs por las tuyas de ImgBB)
// =====================================================
const misImagenes = [
  'https://i.ibb.co/DtfRjPx/kaori1.jpg',
  'https://i.ibb.co/BLzHXj2/kaori2.jpg',
  'https://i.ibb.co/3F2Kp7v/kaori3.jpg',
  'https://i.ibb.co/HTTk9rJ/kaori4.jpg',
  'https://i.ibb.co/fD7Z1Dv/kaori5.jpg',
  'https://i.ibb.co/JmqcmP8/kaori6.jpg',
  'https://i.ibb.co/S0T6QWp/kaori7.jpg',
  'https://i.ibb.co/D8H4CjR/kaori8.jpg',
];

// Función que elige una imagen aleatoria
const getRandomImage = () => {
  return misImagenes[Math.floor(Math.random() * misImagenes.length)];
};

// =====================================================
//  FUNCIÓN PARA ENVIAR IMAGEN CON FALLO SEGURO
// =====================================================
async function sendSafePhoto(chatId, caption, parseMode = 'Markdown') {
  try {
    await bot.sendPhoto(chatId, getRandomImage(), { caption, parse_mode: parseMode });
  } catch (error) {
    console.error('Error enviando imagen:', error.message);
    // Si falla la imagen, solo envía el texto
    await bot.sendMessage(chatId, caption, { parse_mode: parseMode });
  }
}

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
  await sendSafePhoto(chatId, text);
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
  await sendSafePhoto(chatId, text);
});

// =====================================================
//  COMANDO /ping
// =====================================================
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  const start = Date.now();
  const end = Date.now();
  const text = `🏓 *Pong!*\n⚡ Latencia: ${end - start}ms`;
  await sendSafePhoto(chatId, text);
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
      await sendSafePhoto(chatId, caption);
    } catch (err) {
      await sendSafePhoto(chatId, `❌ *Error en la IA:* ${err.message}`);
    }
  });
} else {
  bot.onText(/\/ai/, async (msg) => {
    const chatId = msg.chat.id;
    await sendSafePhoto(chatId, '❌ *GROQ no configurado.* Agrega GROQ_API_KEY en Railway.');
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
      await sendSafePhoto(chatId, text);
    } catch {
      await sendSafePhoto(chatId, '❌ *No encontré esa ciudad.* Prueba en inglés (ej: "Mexico City").');
    }
  });
} else {
  bot.onText(/\/clima/, async (msg) => {
    const chatId = msg.chat.id;
    await sendSafePhoto(chatId, '❌ *WeatherAPI no configurado.* Agrega WEATHER_API_KEY en Railway.');
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
      return await sendSafePhoto(chatId, '❌ *No encontré resultados.*');
    }
    let message = '🎬 *Resultados en YouTube:*\n\n';
    videos.forEach((v, i) => {
      message += `${i+1}. *${v.title}*\n`;
      message += `   👤 ${v.author.name}  |  ⏱️ ${v.duration.timestamp}\n`;
      message += `   🔗 ${v.url}\n\n`;
    });
    await sendSafePhoto(chatId, message);
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
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
      return await sendSafePhoto(chatId, '❌ *No encontré el video.*');
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
    await sendSafePhoto(chatId, `❌ *Error al descargar:* ${err.message}`);
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
    await sendSafePhoto(chatId, `❌ *Error al generar QR:* ${err.message}`);
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
    await sendSafePhoto(chatId, message);
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error al obtener el dólar:* ${err.message}`);
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
      return await sendSafePhoto(chatId, `❌ *El término "${query}" es ambiguo.* Intenta con otro.`);
    }
    const message = `📖 *${data.title}*\n\n${data.extract || 'Sin resumen disponible.'}\n\n🔗 ${data.content_urls?.desktop?.page || 'Sin enlace'}`;
    await sendSafePhoto(chatId, message);
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *No encontré "${query}" en Wikipedia.*`);
  }
});

// =====================================================
//  RESPUESTA A MENSAJES SIN COMANDOS
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
  await sendSafePhoto(chatId, `🌸 ${randomText}`);
});

// =====================================================
//  MANEJO DE ERRORES DE POLLING
// =====================================================
bot.on('polling_error', (error) => {
  console.warn(`⚠️ Error de polling: ${error.code} - ${error.message}`);
});

console.log('🌸 Bot de Kaori Miyazono corriendo en Railway...');
console.log('🎻 Comandos: /start, /ping, /ai, /clima, /yt, /video, /qr, /dolar, /wikipedia');