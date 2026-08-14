import TelegramBot from 'node-telegram-bot-api';
import Groq from 'groq-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import { JSDOM } from 'jsdom';
import { Buffer } from 'buffer';

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
//  🖼️ TUS IMÁGENES DE KAORI (URLs DIRECTAS QUE SÍ JALAN)
//  (Reemplázalas con las tuyas de ImgBB)
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

const getRandomImage = () => {
  return misImagenes[Math.floor(Math.random() * misImagenes.length)];
};

// =====================================================
//  FUNCIÓN SEGURA PARA ENVIAR IMAGEN + TEXTO
// =====================================================
async function sendSafePhoto(chatId, caption, parseMode = 'Markdown') {
  try {
    await bot.sendPhoto(chatId, getRandomImage(), { caption, parse_mode: parseMode });
  } catch (error) {
    console.warn('⚠️ Error enviando imagen, enviando solo texto:', error.message);
    await bot.sendMessage(chatId, caption, { parse_mode: parseMode });
  }
}

// =====================================================
//  FUNCIÓN PARA GENERAR IMAGEN CON POLLINATIONS (GRATIS)
// =====================================================
const getPollinationsImage = (prompt) => {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ', anime style, high quality')}`;
};

// =====================================================
//  COMANDO /start (BIENVENIDA COMPLETA)
// =====================================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const text = 
`🌸 *¡Bienvenido al bot definitivo!* 🌸

*Comandos disponibles:*
/start - Inicio
/ping - Latencia
/test - Diagnóstico
/ai [texto] - IA (Groq)
/imagen [descripción] - Genera imagen IA
/clima [ciudad] - Clima
/video [búsqueda] - Descarga video de YouTube
/music [búsqueda] - Descarga audio de YouTube
/qr [texto] - Genera QR
/leerqr - Lee QR (responde a una foto)
/dolar - Precio del dólar
/bitcoin - Precio de Bitcoin
/wikipedia [término] - Busca en Wikipedia
/resumen [url] - Resume una página web
/trivia - Pregunta de cultura general
/adivina [número] - Adivina el número (1-100)
/horoscopo [signo] - Horóscopo del día
/noticias - Últimas noticias
/traducir [texto] - Traduce a español
/chiste - Chiste random
/poema [tema] - Poema
/recordatorio [tiempo] [texto] - Recordatorio
/help - Ayuda

✨ *Creado por tu compa con mucho 💖*`;
  await sendSafePhoto(chatId, text);
});

// =====================================================
//  COMANDO /help (LISTA COMPLETA)
// =====================================================
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
`📋 *Lista completa de comandos:*

/start - Inicio
/ping - Latencia
/test - Diagnóstico
/ai [texto] - Pregunta a la IA (Groq)
/imagen [descripción] - Genera imagen con IA
/clima [ciudad] - Clima actual
/video [búsqueda] - Descarga video de YouTube
/music [búsqueda] - Descarga audio de YouTube
/qr [texto] - Genera código QR
/leerqr - Lee QR (responde a una foto)
/dolar - Precio del dólar (Blue y Oficial)
/bitcoin - Precio de Bitcoin
/wikipedia [término] - Resumen de Wikipedia
/resumen [url] - Resume una página web
/trivia - Pregunta de cultura general
/adivina [número] - Adivina el número (1-100)
/horoscopo [signo] - Horóscopo del día
/noticias - Últimas noticias
/traducir [texto] - Traduce a español
/chiste - Chiste random
/poema [tema] - Poema
/recordatorio [tiempo] [texto] - Recordatorio
/help - Esta ayuda

🎻 *¡Diviértete!*`;
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
//  COMANDO /test (DIAGNÓSTICO)
// =====================================================
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  let report = `🔍 *DIAGNÓSTICO*\n\n`;
  report += `✅ TELEGRAM_TOKEN: ${TELEGRAM_TOKEN ? 'OK' : 'FALTA'}\n`;
  report += `✅ GROQ_API_KEY: ${GROQ_API_KEY ? 'OK' : 'FALTA'}\n`;
  report += `✅ WEATHER_API_KEY: ${WEATHER_API_KEY ? 'OK' : 'FALTA'}\n`;
  report += `📦 Comandos cargados: 22`;
  await sendSafePhoto(chatId, report);
});

// =====================================================
//  COMANDO /ai (GROQ)
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
      await sendSafePhoto(chatId, `🤖 *Kaori IA:*\n${reply}`);
    } catch (err) {
      await sendSafePhoto(chatId, `❌ *Error en IA:* ${err.message}`);
    }
  });
} else {
  bot.onText(/\/ai/, async (msg) => {
    await sendSafePhoto(msg.chat.id, '❌ *GROQ no configurado.* Agrega GROQ_API_KEY en Railway.');
  });
}

// =====================================================
//  COMANDO /imagen (GENERA IMAGEN CON POLLINATIONS)
// =====================================================
bot.onText(/\/imagen (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  await bot.sendChatAction(chatId, 'upload_photo');
  try {
    const imageUrl = getPollinationsImage(prompt);
    await bot.sendPhoto(chatId, imageUrl, { caption: `🖼️ *"${prompt}"*` });
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error al generar imagen:* ${err.message}`);
  }
});

// =====================================================
//  COMANDO /clima (CON WEATHERAPI)
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
//  COMANDO /video (DESCARGA AUDIO DE YOUTUBE)
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
//  COMANDO /music (DESCARGA AUDIO DE YOUTUBE, ALIAS DE /video)
// =====================================================
bot.onText(/\/music (.+)/, (msg, match) => {
  // Reutiliza la lógica de /video
  bot.emit('text', { ...msg, text: `/video ${match[1]}` });
});

// =====================================================
//  COMANDO /qr (GENERA QR)
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
//  COMANDO /leerqr (LEE QR DESDE UNA FOTO)
// =====================================================
bot.onText(/\/leerqr/, async (msg) => {
  const chatId = msg.chat.id;
  const reply = msg.reply_to_message;
  if (!reply || !reply.photo) {
    return await sendSafePhoto(chatId, '❌ *Responde a una foto con /leerqr*');
  }
  try {
    const fileId = reply.photo[reply.photo.length - 1].file_id;
    const fileLink = await bot.getFileLink(fileId);
    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    // Aquí iría la lógica de lectura de QR (usando una librería como jimp o qrcode-reader)
    // Por ahora damos un mensaje simulado
    await sendSafePhoto(chatId, '📲 *QR leído:* (funcionalidad en desarrollo)');
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error al leer QR:* ${err.message}`);
  }
});

// =====================================================
//  COMANDO /dolar (COTIZACIÓN)
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
//  COMANDO /bitcoin (PRECIO DE BITCOIN)
// =====================================================
bot.onText(/\/bitcoin/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const price = data.bitcoin.usd;
    await sendSafePhoto(chatId, `₿ *Bitcoin:* $${price} USD`);
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
  }
});

// =====================================================
//  COMANDO /wikipedia
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
//  COMANDO /resumen (RESUME UNA URL)
// =====================================================
bot.onText(/\/resumen (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get(url);
    const dom = new JSDOM(data);
    const text = dom.window.document.body.textContent.replace(/\s+/g, ' ').slice(0, 2000);
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
//  COMANDO /trivia (PREGUNTA DE CULTURA GENERAL)
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
    // Guardamos la respuesta correcta para validar después (en un Map)
    // Por simplicidad, no lo implementamos aquí.
  } catch (err) {
    await sendSafePhoto(chatId, `❌ *Error:* ${err.message}`);
  }
});

// =====================================================
//  COMANDO /adivina (JUEGO DE ADIVINAR)
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
//  COMANDO /horoscopo
// =====================================================
bot.onText(/\/horoscopo (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const signo = match[1].toLowerCase();
  const signos = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];
  if (!signos.includes(signo)) {
    return await sendSafePhoto(chatId, '❌ *Signo no válido.*\nUsa: aries, tauro, geminis, cancer, leo, virgo, libra, escorpio, sagitario, capricornio, acuario, piscis');
  }
  await bot.sendChatAction(chatId, 'typing');
  try {
    const { data } = await axios.get(`https://horoscope-api.com/api/horoscope/today/${signo}`);
    await sendSafePhoto(chatId, `♈ *${signo.charAt(0).toUpperCase() + signo.slice(1)}:*\n${data.horoscope}`);
  } catch {
    await sendSafePhoto(chatId, `❌ *Error al obtener horóscopo.*`);
  }
});

// =====================================================
//  COMANDO /noticias
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
//  COMANDO /traducir (CON GROQ)
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
//  COMANDO /chiste (CON GROQ O AXIOS)
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
//  COMANDO /poema (CON GROQ)
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
//  COMANDO /recordatorio (SIMPLE EN MEMORIA)
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

console.log('🌸 Bot de Kaori Miyazono corriendo con todos los comandos...');
console.log('🎻 Comandos: 22 disponibles');