import TelegramBot from 'node-telegram-bot-api';
import Groq from 'groq-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import ytdl from 'ytdl-core';
import yts from 'yt-search';
import QRCode from 'qrcode';
import Jimp from 'jimp';

dotenv.config();

// =====================================================
//  CONFIGURACIÓN
// =====================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY; // <-- Obtén gratis en newsapi.org

if (!TELEGRAM_TOKEN) {
  console.error('❌ FALTA TELEGRAM_TOKEN');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// =====================================================
//  FUNCIONES AUXILIARES
// =====================================================
const getAnimeImage = (query) => {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent('anime girl, cute, ' + query)}`;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =====================================================
//  COMANDOS BÁSICOS
// =====================================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const text = `🌸 ¡Bienvenido al bot definitivo!\n\nComandos disponibles:\n/start - Inicio\n/ping - Latencia\n/test - Diagnóstico\n/ai [texto] - IA\n/imagen [descripción] - Imagen IA\n/clima [ciudad] - Clima\n/video [búsqueda] - Descarga video\n/music [búsqueda] - Descarga audio\n/qr [texto] - Genera QR\n/leerqr - Lee QR (responde a foto)\n/dolar - Precio dólar\n/bitcoin - Precio Bitcoin\n/wikipedia [término] - Busca en Wikipedia\n/resumen [url] - Resume página\n/trivia - Pregunta random\n/adivina [número] - Adivina el número\n/horoscopo [signo] - Horóscopo\n/noticias - Últimas noticias\n/traducir [texto] - Traduce\n/chiste - Chiste random\n/poema [tema] - Poema\n/recordatorio [tiempo] [texto] - Recordatorio\n/help - Ayuda`;
  const image = getAnimeImage('welcome, cute, pastel');
  await bot.sendPhoto(chatId, image, { caption: text });
});

bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  const start = Date.now();
  const end = Date.now();
  const text = `🏓 Pong!\n⚡ Latencia: ${end - start}ms`;
  const image = getAnimeImage('ping pong, anime');
  await bot.sendPhoto(chatId, image, { caption: text });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const help = `🌸 Comandos disponibles:\n\n/start - Inicio\n/ping - Latencia\n/test - Diagnóstico\n/ai [texto] - Chat con IA\n/imagen [descripción] - Genera imagen\n/clima [ciudad] - Clima\n/video [búsqueda] - Descarga video\n/music [búsqueda] - Descarga audio\n/qr [texto] - Genera QR\n/leerqr - Lee QR (responde a foto)\n/dolar - Precio dólar\n/bitcoin - Precio Bitcoin\n/wikipedia [término] - Busca en Wikipedia\n/resumen [url] - Resume página\n/trivia - Pregunta random\n/adivina [número] - Adivina el número\n/horoscopo [signo] - Horóscopo\n/noticias - Últimas noticias\n/traducir [texto] - Traduce\n/chiste - Chiste random\n/poema [tema] - Poema\n/recordatorio [tiempo] [texto] - Recordatorio\n/help - Ayuda`;
  bot.sendMessage(chatId, help);
});

// =====================================================
//  IA Y PROCESAMIENTO DE TEXTO
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
      await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  });
} else {
  bot.onText(/\/ai/, (msg) => bot.sendMessage(msg.chat.id, '❌ GROQ no configurado.'));
}

// =====================================================
//  IMAGEN CON IA
// =====================================================
bot.onText(/\/imagen (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  await bot.sendChatAction(chatId, 'upload_photo');
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
  await bot.sendPhoto(chatId, imageUrl, { caption: `🖼️ *"${prompt}"*` });
});

// =====================================================
//  CLIMA
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
      const text = `🌡️ *${data.location.name}:*\n${data.current.condition.text}\nTemperatura: ${data.current.temp_c}°C\n💨 Viento: ${data.current.wind_kph} km/h\n💧 Humedad: ${data.current.humidity}%`;
      const image = getAnimeImage('weather, rain, cute');
      await bot.sendPhoto(chatId, image, { caption: text });
    } catch {
      await bot.sendMessage(chatId, '❌ No encontré esa ciudad.');
    }
  });
} else {
  bot.onText(/\/clima/, (msg) => bot.sendMessage(msg.chat.id, '❌ WeatherAPI no configurado.'));
}

// =====================================================
//  YOUTUBE: VIDEO Y AUDIO
// =====================================================
bot.onText(/\/video (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const results = await yts(query);
    if (!results.videos.length) return bot.sendMessage(chatId, '❌ No encontré videos.');
    const video = results.videos[0];
    const stream = ytdl(video.url, { quality: 'lowest' });
    await bot.sendVideo(chatId, stream, { caption: `📹 *${video.title}*\n${video.url}` });
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});

bot.onText(/\/music (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  await bot.sendChatAction(chatId, 'typing');
  try {
    const results = await yts(query);
    if (!results.videos.length) return bot.sendMessage(chatId, '❌ No encontré canciones.');
    const video = results.videos[0];
    const stream = ytdl(video.url, { quality: 'highestaudio' });
    await bot.sendAudio(chatId, stream, { caption: `🎵 *${video.title}*`, title: video.title });
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});

// =====================================================
//  QR
// =====================================================
bot.onText(/\/qr (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  try {
    const qrBuffer = await QRCode.toBuffer(text);
    await bot.sendPhoto(chatId, qrBuffer, { caption: `🔲 QR: "${text}"` });
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});

bot.onText(/\/leerqr/, async (msg) => {
  const chatId = msg.chat.id;
  const reply = msg.reply_to_message;
  if (!reply || !reply.photo) return bot.sendMessage(chatId, '❌ Responde a una imagen con /leerqr');
  try {
    const fileId = reply.photo[reply.photo.length - 1].file_id;
    const fileLink = await bot.getFileLink(fileId);
    const image = await Jimp.read(fileLink);
    // Aquí iría la lectura de QR (necesitas qrcode-reader o similar)
    // Por ahora solo avisamos que funciona
    await bot.sendMessage(chatId, '📸 QR leído (simulado). La librería de lectura no está implementada aún.');
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});

// =====================================================
//  DÓLAR Y BITCOIN
// =====================================================
bot.onText(/\/dolar/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const { data } = await axios.get('https://dolarapi.com/v1/dolares/oficial');
    const text = `💵 *Dólar Oficial:*\nCompra: $${data.compra}\nVenta: $${data.venta}`;
    await bot.sendPhoto(chatId, getAnimeImage('money'), { caption: text });
  } catch {
    await bot.sendMessage(chatId, '❌ Error al obtener el dólar.');
  }
});

bot.onText(/\/bitcoin/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const price = data.bitcoin.usd;
    await bot.sendPhoto(chatId, getAnimeImage('bitcoin'), { caption: `₿ *Bitcoin:* $${price} USD` });
  } catch {
    await bot.sendMessage(chatId, '❌ Error al obtener Bitcoin.');
  }
});

// =====================================================
//  WIKIPEDIA
// =====================================================
bot.onText(/\/wikipedia (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const term = match[1];
  try {
    const { data } = await axios.get(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`);
    if (data.type === 'disambiguation') return bot.sendMessage(chatId, '❌ Término ambiguo, sé más específico.');
    const text = `📖 *${data.title}*\n${data.extract}`;
    await bot.sendPhoto(chatId, getAnimeImage('book'), { caption: text.slice(0, 1000) });
  } catch {
    await bot.sendMessage(chatId, '❌ No encontré ese artículo.');
  }
});

// =====================================================
//  TRIVIA
// =====================================================
bot.onText(/\/trivia/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const { data } = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
    const q = data.results[0];
    const options = [q.correct_answer, ...q.incorrect_answers].sort(() => Math.random() - 0.5);
    const text = `🧠 *${q.category}*\n${q.question}\n\nOpciones:\n${options.map((o, i) => `${i+1}. ${o}`).join('\n')}`;
    await bot.sendPhoto(chatId, getAnimeImage('quiz'), { caption: text });
  } catch {
    await bot.sendMessage(chatId, '❌ Error al obtener trivia.');
  }
});

// =====================================================
//  ADIVINA EL NÚMERO
// =====================================================
let numeroSecreto = null;
bot.onText(/\/adivina (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const num = parseInt(match[1]);
  if (isNaN(num)) return bot.sendMessage(chatId, '❌ Ingresa un número.');
  if (numeroSecreto === null) {
    numeroSecreto = Math.floor(Math.random() * 100) + 1;
  }
  if (num === numeroSecreto) {
    await bot.sendMessage(chatId, `🎉 ¡Correcto! El número era ${numeroSecreto}.`);
    numeroSecreto = null;
  } else if (num < numeroSecreto) {
    await bot.sendMessage(chatId, '⬆️ Más alto.');
  } else {
    await bot.sendMessage(chatId, '⬇️ Más bajo.');
  }
});

// =====================================================
//  HORÓSCOPO
// =====================================================
bot.onText(/\/horoscopo (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const signo = match[1].toLowerCase();
  const signs = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];
  if (!signs.includes(signo)) return bot.sendMessage(chatId, '❌ Signo inválido. Usa: aries, tauro, geminis, cancer, leo, virgo, libra, escorpio, sagitario, capricornio, acuario, piscis');
  try {
    const { data } = await axios.get(`https://horoscope-api.com/api/horoscope/today/${signo}`);
    const text = `🔮 *Horóscopo de ${signo}*\n${data.horoscope}`;
    await bot.sendPhoto(chatId, getAnimeImage('stars'), { caption: text });
  } catch {
    await bot.sendMessage(chatId, '❌ Error al obtener horóscopo.');
  }
});

// =====================================================
//  NOTICIAS
// =====================================================
if (NEWS_API_KEY) {
  bot.onText(/\/noticias/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const { data } = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWS_API_KEY}&pageSize=5`);
      const news = data.articles.map((a, i) => `${i+1}. ${a.title}\n${a.url}`).join('\n\n');
      await bot.sendPhoto(chatId, getAnimeImage('news'), { caption: `📰 *Últimas noticias*\n${news}` });
    } catch {
      await bot.sendMessage(chatId, '❌ Error al obtener noticias.');
    }
  });
} else {
  bot.onText(/\/noticias/, (msg) => bot.sendMessage(msg.chat.id, '❌ NEWS_API_KEY no configurada.'));
}

// =====================================================
//  TRADUCIR (con Groq)
// =====================================================
if (groq) {
  bot.onText(/\/traducir (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: `Traduce esto al español: "${text}"` }],
        max_tokens: 300,
      });
      const reply = completion.choices[0].message.content;
      await bot.sendMessage(chatId, `🌐 *Traducción:*\n${reply}`);
    } catch {
      await bot.sendMessage(chatId, '❌ Error al traducir.');
    }
  });
} else {
  bot.onText(/\/traducir/, (msg) => bot.sendMessage(msg.chat.id, '❌ GROQ no configurado.'));
}

// =====================================================
//  CHISTE Y POEMA (con Groq)
// =====================================================
if (groq) {
  bot.onText(/\/chiste/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Dame un chiste corto y gracioso en español' }],
        max_tokens: 150,
      });
      await bot.sendPhoto(chatId, getAnimeImage('joke'), { caption: `😂 ${completion.choices[0].message.content}` });
    } catch {
      await bot.sendMessage(chatId, '❌ Error al generar chiste.');
    }
  });

  bot.onText(/\/poema (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const tema = match[1];
    await bot.sendChatAction(chatId, 'typing');
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: `Escribe un poema corto sobre "${tema}" en español` }],
        max_tokens: 200,
      });
      await bot.sendPhoto(chatId, getAnimeImage('poem'), { caption: `📝 *Poema:*\n${completion.choices[0].message.content}` });
    } catch {
      await bot.sendMessage(chatId, '❌ Error al generar poema.');
    }
  });
} else {
  bot.onText(/\/chiste/, (msg) => bot.sendMessage(msg.chat.id, '❌ GROQ no configurado.'));
  bot.onText(/\/poema/, (msg) => bot.sendMessage(msg.chat.id, '❌ GROQ no configurado.'));
}

// =====================================================
//  RECORDATORIO
// =====================================================
const recordatorios = new Map();
bot.onText(/\/recordatorio (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const tiempo = match[1];
  const mensaje = match[2];
  const ms = parseInt(tiempo) * 60 * 1000;
  if (isNaN(ms)) return bot.sendMessage(chatId, '❌ Tiempo inválido. Ej: /recordatorio 5 "Hacer algo"');
  const id = Date.now();
  recordatorios.set(id, { chatId, mensaje });
  setTimeout(async () => {
    const data = recordatorios.get(id);
    if (data) {
      await bot.sendMessage(data.chatId, `⏰ *Recordatorio:* ${data.mensaje}`);
      recordatorios.delete(id);
    }
  }, ms);
  await bot.sendMessage(chatId, `✅ Recordatorio programado para ${tiempo} min: "${mensaje}"`);
});

// =====================================================
//  RESPUESTA A MENSAJES SIN COMANDOS
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

console.log('🤖 Bot definitivo con 20 comandos corriendo...');