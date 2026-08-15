import TelegramBot from 'node-telegram-bot-api';
import Groq from 'groq-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

dotenv.config();

// =====================================================
//  CONFIGURACIÓN
// =====================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const LEMPI_API_KEY = 'lem336'; // API key de Lempi

if (!TELEGRAM_TOKEN) {
  console.error('❌ FALTA TELEGRAM_TOKEN');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// =====================================================
//  🖼️ IMÁGENES LOCALES (carpeta /assets)
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagenesFolder = path.join(__dirname, 'assets');
const misImagenes = [];

try {
  const files = fs.readdirSync(imagenesFolder);
  const imageFiles = files.filter(file =>
    file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.gif')
  );
  imageFiles.forEach(file => {
    misImagenes.push(path.join(imagenesFolder, file));
  });
  console.log(`✅ ${misImagenes.length} imágenes cargadas desde 'assets'`);
} catch (error) {
  console.warn('⚠️ No se encontró la carpeta "assets", usando imágenes de respaldo.');
  misImagenes.push('https://i.ibb.co/F45TJJqH/IMG-4774.jpg');
}

const getRandomImage = () => {
  return misImagenes[Math.floor(Math.random() * misImagenes.length)];
};

async function sendSafePhoto(chatId, caption, parseMode = 'Markdown', extra = {}) {
  try {
    const imagePath = getRandomImage();
    if (imagePath.startsWith('http')) {
      await bot.sendPhoto(chatId, imagePath, { caption, parse_mode: parseMode, ...extra });
    } else {
      const stream = fs.createReadStream(imagePath);
      await bot.sendPhoto(chatId, stream, { caption, parse_mode: parseMode, ...extra });
    }
  } catch (error) {
    console.warn('⚠️ Error enviando imagen, enviando solo texto:', error.message);
    await bot.sendMessage(chatId, caption, { parse_mode: parseMode, ...extra });
  }
}

// =====================================================
//  🏠 COMANDO /start
// =====================================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
`🌸 *Kaori Bot* 🎻

Inspirado en *Your Lie in April*. Cada interacción incluye una imagen de Kaori.

*Comandos principales:*
/help - Lista completa
/menu - Menú interactivo
/ping - Latencia
/ai [texto] - Pregunta a la IA
/imagen [descripción] - Genera imagen
/clima [ciudad] - Clima actual
/video [búsqueda] - Descarga audio de YouTube
/qr [texto] - Genera QR
/dolar - Cotización del dólar
/wikipedia [término] - Busca en Wikipedia
/trivia - Pregunta random
/chiste - Chiste random

*Creado con amor y violín.* 🎻✨`;
  await sendSafePhoto(chatId, text);
});

// =====================================================
//  🏠 COMANDO /menu
// =====================================================
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
`📂 *Menú de comandos*

🔍 *Búsqueda:* /aisearchimg, /pin, /sp, /stickers, /tiktoksearch
💾 *Descarga:* /applemusic, /facebook, /instagram, /mediafire, /spotifydl, /tiktokdl, /yta, /ytv
🛠️ *Herramientas:* /brat, /cf, /emojimix, /whatmusic, /transcribe
🤖 *IA:* /claude, /gemini, /qwen, /zimg
🎨 *Canvas:* /welcome, /goodbye
📋 *Otros:* /ping, /test, /dolar, /bitcoin, /wikipedia, /resumen, /trivia, /adivina, /horoscopo, /noticias, /traducir, /chiste, /poema, /recordatorio, /help

Usa /help para ver todos los comandos con descripciones.`;
  await sendSafePhoto(chatId, text);
});

// =====================================================
//  📋 COMANDO /help (LISTA COMPLETA)
// =====================================================
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
`📋 *Lista completa de comandos:*

🔍 *Búsqueda*
/aisearchimg [texto] - Busca imágenes con IA (Lempi)
/pin [término] - Busca en Pinterest
/sp [canción] - Busca en Spotify
/stickers [texto] - Busca stickers
/tiktoksearch [texto] - Busca en TikTok

💾 *Descarga*
/applemusic [url] - Descarga de Apple Music
/facebook [url] - Descarga de Facebook
/instagram [url] - Descarga de Instagram
/mediafire [url] - Descarga de MediaFire
/spotifydl [url] - Descarga de Spotify
/tiktokdl [url] - Descarga de TikTok sin marca
/yta [url o búsqueda] - Descarga audio de YouTube
/ytv [url o búsqueda] - Descarga video de YouTube

🛠️ *Herramientas*
/brat [texto] - Genera imagen estilo Brat
/cf - Obtén el flujo actual
/emojimix [emoji1] [emoji2] - Mezcla dos emojis
/whatmusic [url o nombre] - Identifica una canción
/transcribe [url] - Transcribe audio a texto

🤖 *IA*
/claude [pregunta] - Chat con Claude
/gemini [pregunta] - Chat con Gemini
/qwen [pregunta] - Chat con Qwen
/zimg [descripción] - Genera imagen con IA (Zimg)

🎨 *Canvas*
/welcome [nombre] [grupo] - Imagen de bienvenida
/goodbye [nombre] [grupo] - Imagen de despedida

📋 *Otros*
/start - Inicio
/menu - Menú de comandos
/ping - Latencia
/test - Diagnóstico
/ai [texto] - Pregunta a la IA (Groq)
/imagen [descripción] - Genera imagen con IA
/clima [ciudad] - Clima actual
/video [búsqueda] - Descarga audio de YouTube
/music [búsqueda] - Alias de /video
/qr [texto] - Genera QR
/leerqr - Lee QR (en desarrollo)
/dolar - Cotización del dólar
/bitcoin - Precio de Bitcoin
/wikipedia [término] - Resumen de Wikipedia
/resumen [url] - Resume una página web
/trivia - Pregunta de cultura general
/adivina [número] - Adivina el número (1-100)
/horoscopo [signo] - Horóscopo del día
/noticias - Últimas noticias
/traducir [texto] - Traduce a español
/chiste - Chiste aleatorio
/poema [tema] - Poema generado por IA
/recordatorio [tiempo] [texto] - Recordatorio

🎻 *Cada interacción incluye una imagen de Kaori.*`;
  await sendSafePhoto(chatId, text);
});

// =====================================================
//  🏓 COMANDO /ping
// =====================================================
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  const start = Date.now();
  const end = Date.now();
  await sendSafePhoto(chatId, `🏓 *Pong!*\n⚡ Latencia: ${end - start}ms`);
});

// =====================================================
//  🔍 COMANDO /test (DIAGNÓSTICO)
// =====================================================
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  let report = `🔍 *DIAGNÓSTICO*\n\n`;
  report += `✅ TELEGRAM_TOKEN: ${TELEGRAM_TOKEN ? 'OK' : 'FALTA'}\n`;
  report += `✅ GROQ_API_KEY: ${GROQ_API_KEY ? 'OK' : 'FALTA'}\n`;
  report += `✅ WEATHER_API_KEY: ${WEATHER_API_KEY ? 'OK' : 'FALTA'}\n`;
  report += `🖼️ Imágenes cargadas: ${misImagenes.length}\n`;
  await sendSafePhoto(chatId, report);
});

// =====================================================
//  🤖 COMANDO /ai (GROQ)
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
      await sendSafePhoto(chatId, `🤖 *Kaori IA:*\n${completion.choices[0].message.content}`);
    } catch (err) {
      await sendSafePhoto(chatId, `❌ *Error en IA:* ${err.message}`);
    }
  });
} else {
  bot.onText(/\/ai/, async (msg) => {
    await sendSafePhoto(msg.chat.id, '❌ *GROQ no configurado.*');
  });
}

// =====================================================
//  🎨 COMANDO /imagen (POLLINATIONS)
// =====================================================
bot.onText(/\/imagen (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  await bot.sendChatAction(chatId, 'upload_photo');
  try {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ', anime style, high quality')}`;
    await bot.sendPhoto(chatId, imageUrl, { caption: `🖼️ *"${prompt}"*` });
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error al generar imagen:* ${err.message}`);
  }
});

// =====================================================
//  🌦️ COMANDO /clima
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
    await sendSafePhoto(msg.chat.id, '❌ *WeatherAPI no configurado.*');
  });
}

// =====================================================
//  🎵 COMANDO /video (DESCARGA AUDIO YOUTUBE)
// =====================================================
bot.onText(/\/video (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'upload_video');
  try {
    const result = await yts(query);
    const video = result.videos[0];
    if (!video) return await sendSafePhoto(chatId, '❌ *No encontré el video.*');
    const stream = ytdl(video.url, { quality: 'highestaudio' });
    const info = await ytdl.getInfo(video.url);
    const title = info.videoDetails.title;
    await bot.sendAudio(chatId, stream, { title, performer: 'YouTube', caption: `🎵 *${title}*` });
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
  }
});

// =====================================================
//  🎵 COMANDO /music (ALIAS DE /video)
// =====================================================
bot.onText(/\/music (.+)/, (msg, match) => {
  bot.emit('text', { ...msg, text: `/video ${match[1]}` });
});

// =====================================================
//  📲 COMANDO /qr
// =====================================================
bot.onText(/\/qr (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  try {
    const qrBuffer = await QRCode.toBuffer(text);
    await bot.sendPhoto(chatId, qrBuffer, { caption: `📲 *QR:*\n${text}` });
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error al generar QR:* ${err.message}`);
  }
});

// =====================================================
//  🔧 COMANDO /leerqr (EN DESARROLLO)
// =====================================================
bot.onText(/\/leerqr/, async (msg) => {
  await sendSafePhoto(msg.chat.id, '🔧 *Leer QR está en desarrollo.* Pronto estará disponible.');
});

// =====================================================
//  💰 COMANDO /dolar
// =====================================================
bot.onText(/\/dolar/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get('https://dolarapi.com/v1/dolares');
    const blue = data.find(d => d.nombre === 'Dólar Blue');
    const oficial = data.find(d => d.nombre === 'Dólar Oficial');
    let text = '💰 *Cotización del Dólar:*\n\n';
    if (blue) text += `🔵 *Blue:* $${blue.venta} (venta) | $${blue.compra} (compra)\n`;
    if (oficial) text += `🏦 *Oficial:* $${oficial.venta} (venta) | $${oficial.compra} (compra)\n`;
    text += `\n📅 ${new Date().toLocaleString('es-AR')}`;
    await sendSafePhoto(chatId, text);
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
  }
});

// =====================================================
//  ₿ COMANDO /bitcoin
// =====================================================
bot.onText(/\/bitcoin/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    await sendSafePhoto(chatId, `₿ *Bitcoin:* $${data.bitcoin.usd} USD`);
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
  }
});

// =====================================================
//  📖 COMANDO /wikipedia
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
      return await sendSafePhoto(chatId, `❌ *El término "${query}" es ambiguo.*`);
    }
    const text = `📖 *${data.title}*\n\n${data.extract || 'Sin resumen.'}\n\n🔗 ${data.content_urls?.desktop?.page || ''}`;
    await sendSafePhoto(chatId, text);
  } catch {
    await sendSafePhoto(chatId, `❌ *No encontré "${query}" en Wikipedia.*`);
  }
});

// =====================================================
//  📄 COMANDO /resumen
// =====================================================
bot.onText(/\/resumen (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get(url);
    const text = data.slice(0, 2000).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    if (groq) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: `Resume esto en 200 palabras: ${text}` }],
        max_tokens: 300,
      });
      await sendSafePhoto(chatId, `📄 *Resumen:*\n${completion.choices[0].message.content}`);
    } else {
      await sendSafePhoto(chatId, `📄 *Texto extraído:*\n${text.slice(0, 400)}...`);
    }
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error al resumir:* ${err.message}`);
  }
});

// =====================================================
//  ❓ COMANDO /trivia
// =====================================================
bot.onText(/\/trivia/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
    const q = data.results[0];
    const options = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
    let text = `❓ *${q.question}*\n\n`;
    options.forEach((opt, i) => text += `${i+1}. ${opt}\n`);
    text += `\nResponde con el número de la opción.`;
    await bot.sendMessage(chatId, text);
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
  }
});

// =====================================================
//  🎯 COMANDO /adivina
// =====================================================
const adivinaJuego = new Map();
bot.onText(/\/adivina (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const numero = parseInt(match[1]);
  if (isNaN(numero) || numero < 1 || numero > 100) {
    return await sendSafePhoto(chatId, '❌ *Escribe un número del 1 al 100.*');
  }
  if (!adivinaJuego.has(chatId)) {
    adivinaJuego.set(chatId, Math.floor(Math.random() * 100) + 1);
  }
  const objetivo = adivinaJuego.get(chatId);
  if (numero === objetivo) {
    adivinaJuego.delete(chatId);
    await sendSafePhoto(chatId, `🎉 *Correcto!* El número era ${objetivo}. ¡Ganaste!`);
  } else if (numero < objetivo) {
    await sendSafePhoto(chatId, `⬆️ *Más alto.* Intenta otra vez.`);
  } else {
    await sendSafePhoto(chatId, `⬇️ *Más bajo.* Intenta otra vez.`);
  }
});
bot.onText(/\/adivina/, async (msg) => {
  const chatId = msg.chat.id;
  adivinaJuego.delete(chatId);
  await sendSafePhoto(chatId, '🎯 *Juego de adivinar iniciado!*\nEscribe /adivina [número] (1-100)');
});

// =====================================================
//  ♈ COMANDO /horoscopo (CON GROQ)
// =====================================================
if (groq) {
  bot.onText(/\/horoscopo (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const signo = match[1].toLowerCase();
    const signosValidos = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];
    if (!signosValidos.includes(signo)) {
      return await sendSafePhoto(chatId, '❌ *Signo no válido.*\nUsa: aries, tauro, geminis, cancer, leo, virgo, libra, escorpio, sagitario, capricornio, acuario, piscis');
    }
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: `Genera un horóscopo para el signo ${signo} para hoy, en español, con un tono positivo y amigable.` }],
        max_tokens: 200,
      });
      await sendSafePhoto(chatId, `♈ *Horóscopo para ${signo.charAt(0).toUpperCase() + signo.slice(1)}:*\n${completion.choices[0].message.content}`);
    } catch (err) {
      await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
    }
  });
} else {
  bot.onText(/\/horoscopo/, async (msg) => {
    await sendSafePhoto(msg.chat.id, '❌ *GROQ no configurado.*');
  });
}

// =====================================================
//  📰 COMANDO /noticias
// =====================================================
bot.onText(/\/noticias/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get('https://newsapi.org/v2/top-headlines?country=us&apiKey=TU_API_KEY_DE_NEWSAPI');
    const noticias = data.articles.slice(0, 5);
    let text = '📰 *Últimas noticias:*\n\n';
    noticias.forEach((n, i) => text += `${i+1}. *${n.title}*\n${n.description || 'Sin descripción'}\n\n`);
    await sendSafePhoto(chatId, text);
  } catch {
    await sendSafePhoto(chatId, '❌ *Error al obtener noticias.* (Necesitas API key de newsapi.org)');
  }
});

// =====================================================
//  🌐 COMANDO /traducir (CON GROQ)
// =====================================================
if (groq) {
  bot.onText(/\/traducir (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const texto = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: `Traduce esto al español: ${texto}` }],
        max_tokens: 300,
      });
      await sendSafePhoto(chatId, `🌐 *Traducción:*\n${completion.choices[0].message.content}`);
    } catch (err) {
      await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
    }
  });
} else {
  bot.onText(/\/traducir/, async (msg) => {
    await sendSafePhoto(msg.chat.id, '❌ *GROQ no configurado.*');
  });
}

// =====================================================
//  😂 COMANDO /chiste
// =====================================================
bot.onText(/\/chiste/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const { data } = await axios.get('https://v2.jokeapi.dev/joke/Any?lang=es');
    const chiste = data.type === 'single' ? data.joke : `${data.setup}\n${data.delivery}`;
    await sendSafePhoto(chatId, `😂 *Chiste:*\n${chiste}`);
  } catch {
    await sendSafePhoto(chatId, '😂 *¿Por qué los programadores prefieren el otoño? Porque tienen menos bugs.*');
  }
});

// =====================================================
//  📝 COMANDO /poema (CON GROQ)
// =====================================================
if (groq) {
  bot.onText(/\/poema (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const tema = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: `Escribe un poema corto sobre "${tema}"` }],
        max_tokens: 200,
      });
      await sendSafePhoto(chatId, `📝 *Poema:*\n${completion.choices[0].message.content}`);
    } catch (err) {
      await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
    }
  });
} else {
  bot.onText(/\/poema/, async (msg) => {
    await sendSafePhoto(msg.chat.id, '❌ *GROQ no configurado.*');
  });
}

// =====================================================
//  ⏰ COMANDO /recordatorio
// =====================================================
const recordatorios = new Map();
bot.onText(/\/recordatorio (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const params = match[1].split(' ');
  if (params.length < 2) {
    return await sendSafePhoto(chatId, '❌ *Uso:* /recordatorio [tiempo] [texto]\nEj: /recordatorio 10min Llamar a Juan');
  }
  const tiempoStr = params[0];
  const texto = params.slice(1).join(' ');
  let segundos = 0;
  if (tiempoStr.includes('s')) segundos = parseInt(tiempoStr) || 10;
  else if (tiempoStr.includes('min')) segundos = (parseInt(tiempoStr) || 1) * 60;
  else if (tiempoStr.includes('h')) segundos = (parseInt(tiempoStr) || 1) * 3600;
  else segundos = parseInt(tiempoStr) || 10;

  const id = Date.now();
  recordatorios.set(id, { chatId, texto, tiempo: Date.now() + segundos * 1000 });
  await sendSafePhoto(chatId, `⏰ *Recordatorio configurado para ${tiempoStr}*`);
  setTimeout(async () => {
    const data = recordatorios.get(id);
    if (data) {
      await bot.sendMessage(data.chatId, `⏰ *Recordatorio:* ${data.texto}`);
      recordatorios.delete(id);
    }
  }, segundos * 1000);
});

// =====================================================
//  🔍 COMANDOS DE LEMPI (BÚSQUEDA)
// =====================================================

// /aisearchimg
bot.onText(/\/aisearchimg (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/s/aisearchimg?q=${encodeURIComponent(query)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.url) await bot.sendPhoto(chatId, data.url, { caption: `🖼️ "${query}"` });
    else await bot.sendMessage(chatId, '❌ No encontré resultados.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al buscar imágenes.');
  }
});

// /pin
bot.onText(/\/pin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  const limit = 20;
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/s/pin?q=${encodeURIComponent(query)}&limit=${limit}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.images) await bot.sendPhoto(chatId, data.images[0], { caption: `📌 Resultados de Pinterest para "${query}"` });
    else await bot.sendMessage(chatId, '❌ No encontré imágenes.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al buscar en Pinterest.');
  }
});

// /sp
bot.onText(/\/sp (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/s/sp?q=${encodeURIComponent(query)}&limit=10&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.tracks) {
      let msgText = '🎵 *Resultados en Spotify:*\n\n';
      data.tracks.slice(0, 5).forEach((t, i) => {
        msgText += `${i+1}. *${t.name}* - ${t.artists[0].name}\n🔗 ${t.external_urls.spotify}\n\n`;
      });
      await bot.sendMessage(chatId, msgText);
    } else await bot.sendMessage(chatId, '❌ No encontré canciones.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al buscar en Spotify.');
  }
});

// /stickers
bot.onText(/\/stickers (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/s/stickers?q=${encodeURIComponent(query)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.stickers) await bot.sendSticker(chatId, data.stickers[0].url);
    else await bot.sendMessage(chatId, '❌ No encontré stickers.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al buscar stickers.');
  }
});

// /tiktoksearch
bot.onText(/\/tiktoksearch (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/s/tiktok?q=${encodeURIComponent(query)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.videos) await bot.sendVideo(chatId, data.videos[0].url, { caption: `🎵 ${data.videos[0].title}` });
    else await bot.sendMessage(chatId, '❌ No encontré videos.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al buscar en TikTok.');
  }
});

// =====================================================
//  💾 COMANDOS DE DESCARGA (LEMPI)
// =====================================================

// /applemusic
bot.onText(/\/applemusic (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/dl/applemusic?url=${encodeURIComponent(url)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.download_url) await bot.sendAudio(chatId, data.download_url);
    else await bot.sendMessage(chatId, '❌ No se pudo descargar la música.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al descargar.');
  }
});

// /facebook
bot.onText(/\/facebook (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/dl/facebook?url=${encodeURIComponent(url)}&quality=hd&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.download_url) await bot.sendVideo(chatId, data.download_url);
    else await bot.sendMessage(chatId, '❌ No se pudo descargar el video.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al descargar.');
  }
});

// /instagram
bot.onText(/\/instagram (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/dl/instagram?url=${encodeURIComponent(url)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.download_url) await bot.sendVideo(chatId, data.download_url);
    else if (data?.image_url) await bot.sendPhoto(chatId, data.image_url);
    else await bot.sendMessage(chatId, '❌ No se pudo descargar el contenido.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al descargar.');
  }
});

// /mediafire
bot.onText(/\/mediafire (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/dl/mediafire?url=${encodeURIComponent(url)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.download_url) await bot.sendDocument(chatId, data.download_url);
    else await bot.sendMessage(chatId, '❌ No se pudo descargar el archivo.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al descargar.');
  }
});

// /spotifydl
bot.onText(/\/spotifydl (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/dl/spotify?url=${encodeURIComponent(url)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.download_url) await bot.sendAudio(chatId, data.download_url);
    else await bot.sendMessage(chatId, '❌ No se pudo descargar la canción.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al descargar.');
  }
});

// /tiktokdl
bot.onText(/\/tiktokdl (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/dl/tiktok?url=${encodeURIComponent(url)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.download_url) await bot.sendVideo(chatId, data.download_url);
    else await bot.sendMessage(chatId, '❌ No se pudo descargar el video.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al descargar.');
  }
});

// /yta
bot.onText(/\/yta (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/dl/yta?q=${encodeURIComponent(query)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.download_url) await bot.sendAudio(chatId, data.download_url);
    else await bot.sendMessage(chatId, '❌ No se pudo descargar el audio.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al descargar.');
  }
});

// /ytv
bot.onText(/\/ytv (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/dl/ytv?q=${encodeURIComponent(query)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.download_url) await bot.sendVideo(chatId, data.download_url);
    else await bot.sendMessage(chatId, '❌ No se pudo descargar el video.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al descargar.');
  }
});

// =====================================================
//  🛠️ HERRAMIENTAS (LEMPI)
// =====================================================

// /brat
bot.onText(/\/brat (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/tools/brat?text=${encodeURIComponent(text)}&color=verde&format=image&apikey=${LEMPI_API_KEY}`);
    const buffer = await res.buffer();
    await bot.sendPhoto(chatId, buffer, { caption: `😈 "${text}"` });
  } catch {
    await bot.sendMessage(chatId, '❌ Error al generar la imagen Brat.');
  }
});

// /cf
bot.onText(/\/cf/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/tools/cf?apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.result) await bot.sendMessage(chatId, `🌊 *Current Flow:*\n${data.result}`);
    else await bot.sendMessage(chatId, '❌ No se pudo obtener el flujo actual.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al obtener datos.');
  }
});

// /emojimix
bot.onText(/\/emojimix (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const emoji1 = match[1];
  const emoji2 = match[2];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/tools/emojimix?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}&apikey=${LEMPI_API_KEY}`);
    const buffer = await res.buffer();
    await bot.sendPhoto(chatId, buffer, { caption: `🔮 ${emoji1} + ${emoji2}` });
  } catch {
    await bot.sendMessage(chatId, '❌ Error al mezclar emojis.');
  }
});

// /whatmusic
bot.onText(/\/whatmusic (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/tools/whatmusic?q=${encodeURIComponent(query)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.result) await bot.sendMessage(chatId, `🎵 *Canción identificada:*\n${data.result}`);
    else await bot.sendMessage(chatId, '❌ No se pudo identificar la canción.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al identificar.');
  }
});

// /transcribe
bot.onText(/\/transcribe (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/tools/transcribe?url=${encodeURIComponent(url)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.text) await bot.sendMessage(chatId, `📝 *Transcripción:*\n${data.text}`);
    else await bot.sendMessage(chatId, '❌ No se pudo transcribir.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al transcribir.');
  }
});

// =====================================================
//  🤖 INTELIGENCIA ARTIFICIAL (LEMPI)
// =====================================================

// /claude
bot.onText(/\/claude (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/ai/claude?q=${encodeURIComponent(prompt)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.result) await bot.sendMessage(chatId, `🤖 *Claude:*\n${data.result}`);
    else await bot.sendMessage(chatId, '❌ No pude obtener respuesta de Claude.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al consultar Claude.');
  }
});

// /gemini
bot.onText(/\/gemini (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/ai/gemini?q=${encodeURIComponent(prompt)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.result) await bot.sendMessage(chatId, `🧠 *Gemini:*\n${data.result}`);
    else await bot.sendMessage(chatId, '❌ No pude obtener respuesta de Gemini.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al consultar Gemini.');
  }
});

// /qwen
bot.onText(/\/qwen (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/ai/qwen?q=${encodeURIComponent(prompt)}&apikey=${LEMPI_API_KEY}`);
    const data = await res.json();
    if (data?.result) await bot.sendMessage(chatId, `📡 *Qwen:*\n${data.result}`);
    else await bot.sendMessage(chatId, '❌ No pude obtener respuesta de Qwen.');
  } catch {
    await bot.sendMessage(chatId, '❌ Error al consultar Qwen.');
  }
});

// /zimg
bot.onText(/\/zimg (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`https://api.lempi.lat/ai/zimg?size=1024x1024&q=${encodeURIComponent(prompt)}&apikey=${LEMPI_API_KEY}`);
    const buffer = await res.buffer();
    await bot.sendPhoto(chatId, buffer, { caption: `🖼️ "${prompt}"` });
  } catch {
    await bot.sendMessage(chatId, '❌ Error al generar imagen.');
  }
});

// =====================================================
//  🎨 CANVAS (LEMPI)
// =====================================================

// /welcome
bot.onText(/\/welcome (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const params = match[1].split(' ');
  const username = params[0] || 'Usuario';
  const guildName = params.slice(1).join(' ') || 'Club de Anime';
  await bot.sendChatAction(chatId, 'typing');
  try {
    const url = `https://api.lempi.lat/api/canvas/welcomev1?username=${encodeURIComponent(username)}&guildName=${encodeURIComponent(guildName)}&guildIcon=https%3A%2F%2Fapi.lempi.lat%2FUka.jpg&memberCount=150&avatar=https%3A%2F%2Fapi.lempi.lat%2FBiy.jpg&background=https%3A%2F%2Fapi.lempi.lat%2FRlK.jpg&quality=80&apikey=${LEMPI_API_KEY}`;
    const buffer = await fetch(url).then(r => r.buffer());
    await bot.sendPhoto(chatId, buffer, { caption: `🎉 Bienvenido ${username} a ${guildName}!` });
  } catch {
    await bot.sendMessage(chatId, '❌ Error al generar la imagen de bienvenida.');
  }
});

// /goodbye
bot.onText(/\/goodbye (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const params = match[1].split(' ');
  const username = params[0] || 'Usuario';
  const guildName = params.slice(1).join(' ') || 'Club de Anime';
  await bot.sendChatAction(chatId, 'typing');
  try {
    const url = `https://api.lempi.lat/api/canvas/goodbyev1?username=${encodeURIComponent(username)}&guildName=${encodeURIComponent(guildName)}&guildIcon=https%3A%2F%2Fapi.lempi.lat%2FUka.jpg&memberCount=150&avatar=https%3A%2F%2Fapi.lempi.lat%2FBiy.jpg&background=https%3A%2F%2Fapi.lempi.lat%2FRlK.jpg&quality=80&apikey=${LEMPI_API_KEY}`;
    const buffer = await fetch(url).then(r => r.buffer());
    await bot.sendPhoto(chatId, buffer, { caption: `👋 ¡Hasta luego ${username}!` });
  } catch {
    await bot.sendMessage(chatId, '❌ Error al generar la imagen de despedida.');
  }
});

// =====================================================
//  💬 RESPUESTA A MENSAJES SIN COMANDOS
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
    '🌸 Kaori dice: "La música es libertad."',
    '🎻 Si necesitas algo, solo dilo.',
  ];
  const randomText = responses[Math.floor(Math.random() * responses.length)];
  await sendSafePhoto(chatId, `🌸 ${randomText}`);
});

// =====================================================
//  ⚠️ MANEJO DE ERRORES
// =====================================================
bot.on('polling_error', (error) => {
  console.warn(`⚠️ Error de polling: ${error.code} - ${error.message}`);
});

console.log('🌸 Kaori Bot corriendo con TODOS los comandos integrados...');
console.log(`🖼️ ${misImagenes.length} imágenes cargadas desde 'assets'`);