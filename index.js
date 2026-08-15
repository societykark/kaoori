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
//  🖼️ CARGAR IMÁGENES DESDE LA CARPETA LOCAL 'assets'
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagenesFolder = path.join(__dirname, 'assets');
const misImagenes = [];

try {
  const files = fs.readdirSync(imagenesFolder);
  const imageFiles = files.filter(file =>
    file.endsWith('.jpg') || file.endsWith('.jpeg') ||
    file.endsWith('.png') || file.endsWith('.gif')
  );
  imageFiles.forEach(file => {
    misImagenes.push(path.join(imagenesFolder, file));
  });
  console.log(`✅ ${misImagenes.length} imágenes cargadas desde la carpeta local 'assets'`);
} catch (error) {
  console.warn('⚠️ No se encontró la carpeta "assets", usando imágenes de respaldo.');
  misImagenes.push('https://i.ibb.co/F45TJJqH/IMG-4774.jpg');
  misImagenes.push('https://i.ibb.co/F4B8PMgt/IMG-4773.jpg');
}

const getRandomImage = () => {
  return misImagenes[Math.floor(Math.random() * misImagenes.length)];
};

// =====================================================
//  FUNCIÓN PARA ENVIAR IMAGEN + TEXTO (DESDE LOCAL O URL)
// =====================================================
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
//  📂 CARGA DINÁMICA DE COMANDOS
// =====================================================
const commands = new Map();
const commandsPath = path.join(__dirname, 'commands');
let commandFiles = [];

try {
  commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
} catch (e) {
  console.warn('⚠️ Carpeta /commands no encontrada');
}

for (const file of commandFiles) {
  try {
    const { default: cmd } = await import(`./commands/${file}`);
    if (cmd?.name && typeof cmd.execute === 'function') {
      commands.set(cmd.name, cmd);
      console.log(`✅ Comando cargado: ${cmd.name}`);
    }
  } catch (err) {
    console.error(`❌ Error al cargar ${file}:`, err);
  }
}

console.log(`📦 ${commands.size} comandos cargados`);

// =====================================================
//  📋 DEFINICIÓN DE CATEGORÍAS Y COMANDOS PARA EL MENÚ
// =====================================================
const categorias = {
  '🔍 Búsqueda': ['aisearchimg', 'pin', 'sp', 'stickers', 'tiktoksearch'],
  '💾 Descarga': ['applemusic', 'facebook', 'instagram', 'mediafire', 'spotifydl', 'tiktokdl', 'yta', 'ytv'],
  '🛠️ Herramientas': ['brat', 'cf', 'emojimix', 'whatmusic', 'transcribe'],
  '🤖 IA': ['claude', 'gemini', 'qwen', 'zimg'],
  '🎨 Canvas': ['welcome', 'goodbye'],
  '📋 Otros': ['ping', 'test', 'dolar', 'bitcoin', 'wikipedia', 'resumen', 'trivia', 'adivina', 'horoscopo', 'noticias', 'traducir', 'chiste', 'poema', 'recordatorio', 'help']
};

// Comandos que NO requieren parámetros (se ejecutan directo al hacer clic)
const noParams = ['ping', 'test', 'dolar', 'bitcoin', 'trivia', 'chiste', 'cf', 'noticias', 'help', 'start', 'menu'];

// =====================================================
//  🧠 FUNCIONES PARA GENERAR TECLADOS INLINE
// =====================================================
function getCategoriasKeyboard() {
  const keys = Object.keys(categorias);
  const keyboard = [];
  for (let i = 0; i < keys.length; i += 2) {
    const row = [];
    row.push({ text: keys[i], callback_data: `cat_${i}` });
    if (i + 1 < keys.length) {
      row.push({ text: keys[i + 1], callback_data: `cat_${i + 1}` });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: '❓ Ayuda', callback_data: 'help' }]);
  return keyboard;
}

function getComandosKeyboard(categoriaIndex) {
  const keys = Object.keys(categorias);
  const categoria = keys[categoriaIndex];
  const comandos = categorias[categoria];
  const keyboard = [];
  for (const cmd of comandos) {
    const label = `/${cmd}`;
    keyboard.push([{ text: label, callback_data: `cmd_${cmd}` }]);
  }
  keyboard.push([{ text: '⬅️ Volver al menú', callback_data: 'volver' }]);
  return keyboard;
}

// =====================================================
//  🏠 COMANDO /start (MENÚ PRINCIPAL)
// =====================================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
`🌸 *Kaori Bot – Menú Principal* 🌸

Selecciona una categoría para ver los comandos:

🔍 Búsqueda – Busca imágenes, música, stickers, TikTok.
💾 Descarga – Descarga de redes y YouTube.
🛠️ Herramientas – Generadores, mezclas, transcripción.
🤖 IA – Chat con Claude, Gemini, Qwen, generación de imágenes.
🎨 Canvas – Imágenes de bienvenida y despedida.
📋 Otros – Ping, clima, dólar, trivia, y más.

*Cada imagen que ves es de Kaori Miyazono.* 🎻

Usa /menu para volver a este menú en cualquier momento.`;
  await sendSafePhoto(chatId, text, 'Markdown', {
    reply_markup: { inline_keyboard: getCategoriasKeyboard() }
  });
});

// =====================================================
//  🏠 COMANDO /menu (VUELVE AL MENÚ)
// =====================================================
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
`🌸 *Kaori Bot – Menú Principal* 🌸

Selecciona una categoría para ver los comandos:

🔍 Búsqueda – Busca imágenes, música, stickers, TikTok.
💾 Descarga – Descarga de redes y YouTube.
🛠️ Herramientas – Generadores, mezclas, transcripción.
🤖 IA – Chat con Claude, Gemini, Qwen, generación de imágenes.
🎨 Canvas – Imágenes de bienvenida y despedida.
📋 Otros – Ping, clima, dólar, trivia, y más.

*Cada imagen que ves es de Kaori Miyazono.* 🎻

Usa /menu para volver a este menú en cualquier momento.`;
  await sendSafePhoto(chatId, text, 'Markdown', {
    reply_markup: { inline_keyboard: getCategoriasKeyboard() }
  });
});

// =====================================================
//  🎯 MANEJADOR DE CALLBACKS (BOTONES INLINE)
// =====================================================
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  // Categoría
  if (data.startsWith('cat_')) {
    const index = parseInt(data.split('_')[1]);
    const keys = Object.keys(categorias);
    const categoria = keys[index];
    const keyboard = getComandosKeyboard(index);
    const text = `📂 *${categoria}*\n\nSelecciona un comando:`;
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
    await bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  // Volver al menú
  if (data === 'volver') {
    const text =
`🌸 *Kaori Bot – Menú Principal* 🌸

Selecciona una categoría para ver los comandos:

🔍 Búsqueda – Busca imágenes, música, stickers, TikTok.
💾 Descarga – Descarga de redes y YouTube.
🛠️ Herramientas – Generadores, mezclas, transcripción.
🤖 IA – Chat con Claude, Gemini, Qwen, generación de imágenes.
🎨 Canvas – Imágenes de bienvenida y despedida.
📋 Otros – Ping, clima, dólar, trivia, y más.

*Cada imagen que ves es de Kaori Miyazono.* 🎻

Usa /menu para volver a este menú en cualquier momento.`;
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: getCategoriasKeyboard() }
    });
    await bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  // Ayuda
  if (data === 'help') {
    const helpText = `📋 *Lista de comandos disponibles:*\n\n` +
      `🔍 *Búsqueda:* /aisearchimg, /pin, /sp, /stickers, /tiktoksearch\n` +
      `💾 *Descarga:* /applemusic, /facebook, /instagram, /mediafire, /spotifydl, /tiktokdl, /yta, /ytv\n` +
      `🛠️ *Herramientas:* /brat, /cf, /emojimix, /whatmusic, /transcribe\n` +
      `🤖 *IA:* /claude, /gemini, /qwen, /zimg\n` +
      `🎨 *Canvas:* /welcome, /goodbye\n` +
      `📋 *Otros:* /ping, /test, /dolar, /bitcoin, /wikipedia, /resumen, /trivia, /adivina, /horoscopo, /noticias, /traducir, /chiste, /poema, /recordatorio, /help, /menu\n\n` +
      `Usa /menu para ver el menú con botones.`;
    await bot.editMessageText(helpText, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Volver al menú', callback_data: 'volver' }]] }
    });
    await bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  // Comando
  if (data.startsWith('cmd_')) {
    const cmdName = data.split('_')[1];
    // Si el comando no requiere parámetros, lo ejecutamos directamente
    if (noParams.includes(cmdName)) {
      // Buscar el comando en el mapa
      const cmd = commands.get(cmdName);
      if (cmd) {
        // Simular un mensaje con el comando
        const fakeMsg = { chat: { id: chatId }, text: `/${cmdName}` };
        try {
          await cmd.execute({ bot, chatId, args: [], m: fakeMsg });
        } catch (err) {
          console.error(`Error ejecutando /${cmdName}:`, err);
          await bot.sendMessage(chatId, `❌ Error al ejecutar /${cmdName}.`);
        }
      } else {
        await bot.sendMessage(chatId, `❌ Comando /${cmdName} no encontrado.`);
      }
      await bot.answerCallbackQuery(callbackQuery.id, { text: `Ejecutando /${cmdName}...` });
    } else {
      // Si requiere parámetros, enviamos el comando al chat para que el usuario lo complete
      await bot.sendMessage(chatId, `/${cmdName} `);
      await bot.answerCallbackQuery(callbackQuery.id, { text: `Escribe lo que necesitas después del comando.` });
    }
    // Cerrar el menú o mantenerlo abierto? Mejor no cerrarlo, que el usuario pueda seguir usando.
    // Pero para evitar confusiones, no editamos el mensaje.
    return;
  }

  await bot.answerCallbackQuery(callbackQuery.id);
});

// =====================================================
//  COMANDO /help (LISTA DE COMANDOS)
// =====================================================
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
`📋 *Lista de comandos disponibles:*\n\n` +
`🔍 *Búsqueda:* /aisearchimg, /pin, /sp, /stickers, /tiktoksearch\n` +
`💾 *Descarga:* /applemusic, /facebook, /instagram, /mediafire, /spotifydl, /tiktokdl, /yta, /ytv\n` +
`🛠️ *Herramientas:* /brat, /cf, /emojimix, /whatmusic, /transcribe\n` +
`🤖 *IA:* /claude, /gemini, /qwen, /zimg\n` +
`🎨 *Canvas:* /welcome, /goodbye\n` +
`📋 *Otros:* /ping, /test, /dolar, /bitcoin, /wikipedia, /resumen, /trivia, /adivina, /horoscopo, /noticias, /traducir, /chiste, /poema, /recordatorio, /help, /menu\n\n` +
`Usa /menu para ver el menú con botones.`;
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
  report += `🖼️ Imágenes cargadas: ${misImagenes.length}`;
  report += `\n📦 Comandos cargados: ${commands.size}`;
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
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ', anime style, high quality')}`;
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
//  COMANDO /music (ALIAS DE /video)
// =====================================================
bot.onText(/\/music (.+)/, (msg, match) => {
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
//  COMANDO /leerqr (EN DESARROLLO)
// =====================================================
bot.onText(/\/leerqr/, async (msg) => {
  await sendSafePhoto(msg.chat.id, '🔧 *Leer QR está en desarrollo.* Pronto estará disponible.');
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
//  COMANDO /bitcoin
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
//  COMANDO /trivia
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
//  COMANDO /adivina
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
//  COMANDO /horoscopo (CON GROQ)
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
//  COMANDO /chiste
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
//  COMANDO /recordatorio
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

console.log('🌸 Bot de Kaori Miyazono corriendo con menú de botones...');
console.log(`🖼️ ${misImagenes.length} imágenes cargadas desde 'assets'`);
console.log(`📦 ${commands.size} comandos disponibles`);