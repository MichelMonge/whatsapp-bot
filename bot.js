import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import { config, updateConfig } from './config.js';
import {
  buildFollowUpMessage,
  getAiResponse,
  getCustomResponses,
  getKnowledgeFiles,
  isQuickSubjectOrStatusQuery,
  preloadAudioTranscriber,
  saveCustomResponses,
  saveKnowledgeFiles,
  testGeminiApiKey,
  transcribeAudioBuffer
} from './gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFolder = path.join(__dirname, 'auth_info_baileys');
const painelPath = path.join(__dirname, 'painel.html');
const followUpsPath = path.join(__dirname, 'followups.json');

// Armazenamento em memória das conversas e estados (com persistência para lembretes de 48h)
const conversationStore = new Map(); // jid -> { history: [], lastActivity: timestamp, followUpSent: boolean, followUpSentAt: timestamp }
const pendingDebounce = new Map();   // jid -> { timer: Timeout }
const pendingBuffer = new Map();     // jid -> string[] (mensagens acumuladas aguardando envio)
const activeGeneration = new Map();  // jid -> number (cancela resposta em andamento se chegarem novas mensagens)
const pausedForHuman = new Map();    // jid -> timestamp de até quando o bot fica pausado
const botSentMessageIds = new Set(); // IDs de mensagens enviadas pelo próprio robô
const sendingBubblesForJid = new Set(); // JIDs recebendo sequência ativa de balões
const recentLogs = [];               // últimos 30 atendimentos

// Estado global do WhatsApp para o Painel Web
const waState = {
  status: 'connecting', // 'connecting' | 'qr' | 'open' | 'close'
  qrDataUrl: '',
  connectedNumber: '',
  connectedName: '',
  lastError: ''
};

let activeSock = null;
let reconnectTimer = null;
let isLoggingOut = false;
let isCheckingFollowUps = false;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function loadFollowUpStore() {
  try {
    if (!fs.existsSync(followUpsPath)) return;
    const raw = fs.readFileSync(followUpsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let loadedCount = 0;

    for (const [jid, data] of Object.entries(parsed)) {
      if (!jid || !data || typeof data !== 'object') continue;
      if (!Array.isArray(data.history) || data.history.length === 0) continue;
      const lastActivity = Number(data.lastActivity);
      if (!Number.isFinite(lastActivity) || now - lastActivity > maxAgeMs) continue;

      const cleanHistory = data.history
        .filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.text === 'string' && item.text.trim())
        .slice(-(Number(config.maxHistoryLength) || 30));

      if (cleanHistory.length === 0) continue;

      conversationStore.set(jid, {
        history: cleanHistory,
        lastActivity,
        followUpSent: Boolean(data.followUpSent),
        followUpSentAt: Number(data.followUpSentAt) || 0
      });
      loadedCount++;
    }

    if (loadedCount > 0) {
      console.log(`⏰ Histórico de ${loadedCount} conversa(s) carregado para monitoramento de retorno 48h.`);
    }
  } catch (err) {
    console.warn('Aviso ao ler followups.json:', err.message);
  }
}

function saveFollowUpStore() {
  try {
    const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const recentEntries = [...conversationStore.entries()]
      .filter(([jid, data]) =>
        jid &&
        data &&
        Array.isArray(data.history) &&
        data.history.length > 0 &&
        Number.isFinite(data.lastActivity) &&
        now - data.lastActivity <= maxAgeMs
      )
      .sort((a, b) => b[1].lastActivity - a[1].lastActivity)
      .slice(0, 500);

    const payload = {};
    for (const [jid, data] of recentEntries) {
      payload[jid] = {
        history: data.history.slice(-(Number(config.maxHistoryLength) || 30)),
        lastActivity: data.lastActivity,
        followUpSent: Boolean(data.followUpSent),
        followUpSentAt: Number(data.followUpSentAt) || 0
      };
    }

    fs.writeFileSync(followUpsPath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Aviso ao salvar followups.json:', err.message);
  }
}

/**
 * Verifica periodicamente conversas sem nova mensagem após followUpHours (padrão 48h)
 * e envia um retorno educado perguntando se já foi resolvido ou lembrando o último assunto.
 */
async function checkPendingFollowUps() {
  if (isCheckingFollowUps) return;
  if (!config.botEnabled || !activeSock || waState.status !== 'open') return;

  const rawHours = Number(config.followUpHours);
  const followUpHours = Number.isFinite(rawHours) ? rawHours : 48;
  if (followUpHours <= 0) return;
  const followUpMs = followUpHours * 60 * 60 * 1000;

  isCheckingFollowUps = true;
  try {
    const now = Date.now();
    for (const [remoteJid, convData] of conversationStore.entries()) {
      if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;
      if (!convData || convData.followUpSent) continue;
      if (!Array.isArray(convData.history) || convData.history.length === 0) continue;
      if (!Number.isFinite(convData.lastActivity)) continue;
      if (pendingDebounce.has(remoteJid) || pendingBuffer.has(remoteJid) || sendingBubblesForJid.has(remoteJid)) continue;

      const pauseUntil = pausedForHuman.get(remoteJid);
      if (pauseUntil && now < pauseUntil) continue;

      if (now - convData.lastActivity < followUpMs) continue;

      const reminderText = buildFollowUpMessage(convData.history);
      if (!reminderText) continue;

      convData.followUpSent = true;
      convData.followUpSentAt = now;
      saveFollowUpStore();

      try {
        await activeSock.sendPresenceUpdate('composing', remoteJid);
        await sleep(5000 + Math.floor(Math.random() * 3000));
        await activeSock.sendPresenceUpdate('paused', remoteJid);

        if (!config.botEnabled || !activeSock || waState.status !== 'open') break;

        const sentMsg = await activeSock.sendMessage(remoteJid, { text: reminderText });
        if (sentMsg?.key?.id) {
          botSentMessageIds.add(sentMsg.key.id);
          if (botSentMessageIds.size > 500) {
            const firstId = botSentMessageIds.values().next().value;
            botSentMessageIds.delete(firstId);
          }
        }

        convData.history.push({ role: 'assistant', text: reminderText });
        if (convData.history.length > config.maxHistoryLength) {
          convData.history = convData.history.slice(-config.maxHistoryLength);
        }
        convData.followUpSentAt = Date.now();
        conversationStore.set(remoteJid, convData);
        addRecentLog(remoteJid, `[LEMBRETE ${followUpHours}H]`, reminderText, `lembrete-${followUpHours}h`);
        saveFollowUpStore();
        console.log(`⏰ [LEMBRETE ${followUpHours}H] Retorno enviado para ${formatContactLabel(remoteJid)}:\n"${reminderText}"`);
      } catch (sendErr) {
        console.warn(`⚠️ Falha ao enviar lembrete ${followUpHours}h para ${remoteJid}:`, sendErr.message);
      }
    }
  } finally {
    isCheckingFollowUps = false;
  }
}

function formatContactLabel(jid) {
  if (!jid) return 'Desconhecido';
  return jid.split('@')[0].split(':')[0];
}

function addRecentLog(contact, incoming, reply, source) {
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  recentLogs.unshift({
    time,
    contact: formatContactLabel(contact),
    incoming: incoming.length > 180 ? incoming.slice(0, 180) + '...' : incoming,
    reply: reply.length > 220 ? reply.slice(0, 220) + '...' : reply,
    source
  });
  if (recentLogs.length > 30) {
    recentLogs.length = 30;
  }
}

function unwrapMessage(message) {
  let cur = message;
  while (cur) {
    if (cur.ephemeralMessage?.message) {
      cur = cur.ephemeralMessage.message;
    } else if (cur.viewOnceMessage?.message) {
      cur = cur.viewOnceMessage.message;
    } else if (cur.viewOnceMessageV2?.message) {
      cur = cur.viewOnceMessageV2.message;
    } else if (cur.viewOnceMessageV2Extension?.message) {
      cur = cur.viewOnceMessageV2Extension.message;
    } else if (cur.documentWithCaptionMessage?.message) {
      cur = cur.documentWithCaptionMessage.message;
    } else {
      break;
    }
  }
  return cur;
}

/**
 * Inicia a conexão com o WhatsApp usando Baileys
 */
async function startBot() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log('----------------------------------------------------');
  console.log('🤖 INICIANDO ATENDENTE VIRTUAL IA PARA WHATSAPP');
  console.log('----------------------------------------------------');

  waState.status = 'connecting';
  waState.lastError = '';

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  let waVersion;
  try {
    const versionInfo = await fetchLatestBaileysVersion();
    waVersion = versionInfo.version;
    console.log(`📡 Versão WhatsApp Web detectada: ${waVersion.join('.')}`);
  } catch (err) {
    console.warn('Aviso ao buscar versão mais recente do WA Web, usando padrão:', err.message);
  }

  const sock = makeWASocket({
    ...(waVersion ? { version: waVersion } : {}),
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Atendente IA', 'Chrome', '1.0.0']
  });

  activeSock = sock;

  // Salva credenciais sempre que atualizadas
  sock.ev.on('creds.update', saveCreds);

  // Monitora o status da conexão
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      waState.status = 'qr';
      try {
        waState.qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
      } catch (err) {
        console.error('Erro ao gerar imagem QR Code:', err.message);
      }
      console.log('\n📱 ESCANEIE O QR CODE PELO PAINEL (http://localhost:' + config.port + ') OU ABAIXO:\n');
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = !isLoggingOut && statusCode !== DisconnectReason.loggedOut;

      waState.status = 'close';
      waState.connectedNumber = '';
      waState.connectedName = '';

      console.warn(`[CONEXÃO FECHADA]: Código ${statusCode}. Reconectando: ${shouldReconnect}`);

      if (shouldReconnect) {
        reconnectTimer = setTimeout(startBot, 3500);
      } else if (!isLoggingOut) {
        console.warn('Sessão encerrada pelo WhatsApp. Limpando sessão antiga para gerar novo QR Code...');
        waState.qrDataUrl = '';
        try {
          fs.rmSync(authFolder, { recursive: true, force: true });
        } catch (err) {
          console.error('Erro ao limpar pasta auth_info_baileys:', err.message);
        }
        reconnectTimer = setTimeout(startBot, 2000);
      }
    } else if (connection === 'open') {
      waState.status = 'open';
      waState.qrDataUrl = '';
      waState.connectedNumber = formatContactLabel(sock.user?.id || '');
      waState.connectedName = sock.user?.name || '';
      console.log(`✅ CONECTADO COM SUCESSO AO WHATSAPP (${waState.connectedNumber})!`);
      console.log('Pronto para receber e responder mensagens com IA.');
      console.log('----------------------------------------------------\n');
    }
  });

  // Hidrata histórico sincronizado pelo WhatsApp sem disparar lembretes automáticos em conversas antigas
  sock.ev.on('messaging-history.set', ({ messages: histMsgs = [] }) => {
    if (!Array.isArray(histMsgs) || histMsgs.length === 0) return;

    const groupedByJid = new Map();
    const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const msg of histMsgs) {
      if (!msg?.message || !msg?.key?.remoteJid) continue;
      const remoteJid = msg.key.remoteJid;
      if (remoteJid === 'status@broadcast') continue;
      if (remoteJid.endsWith('@g.us') && !config.respondToGroups) continue;

      const innerMsg = unwrapMessage(msg.message);
      if (!innerMsg || innerMsg.protocolMessage || innerMsg.senderKeyDistributionMessage || innerMsg.reactionMessage) continue;

      const text = (
        innerMsg.conversation ||
        innerMsg.extendedTextMessage?.text ||
        innerMsg.imageMessage?.caption ||
        innerMsg.videoMessage?.caption ||
        ''
      ).trim();
      if (!text) continue;

      const rawTs = Number(msg.messageTimestamp?.low ?? msg.messageTimestamp) || 0;
      const tsMs = rawTs > 1e12 ? rawTs : rawTs * 1000;
      if (tsMs > 0 && now - tsMs > maxAgeMs) continue;

      const list = groupedByJid.get(remoteJid) || [];
      list.push({
        role: msg.key.fromMe ? 'assistant' : 'user',
        text,
        tsMs: tsMs || now
      });
      groupedByJid.set(remoteJid, list);
    }

    let hydratedCount = 0;
    for (const [jid, items] of groupedByJid.entries()) {
      const existing = conversationStore.get(jid);
      if (existing && Array.isArray(existing.history) && existing.history.length >= items.length) continue;

      items.sort((a, b) => a.tsMs - b.tsMs);
      const maxLen = Number(config.maxHistoryLength) || 30;
      const merged = existing && Array.isArray(existing.history) ? [...items, ...existing.history] : items;
      const deduped = [];
      for (const item of merged) {
        const last = deduped[deduped.length - 1];
        if (!last || last.role !== item.role || last.text !== item.text) {
          deduped.push({ role: item.role, text: item.text });
        }
      }
      const trimmed = deduped.slice(-maxLen);
      const latestTs = items[items.length - 1]?.tsMs || now;

      conversationStore.set(jid, {
        history: trimmed,
        lastActivity: existing?.lastActivity ? Math.max(existing.lastActivity, latestTs) : latestTs,
        followUpSent: existing ? Boolean(existing.followUpSent) : true,
        followUpSentAt: existing?.followUpSentAt || 0
      });
      hydratedCount++;
    }

    if (hydratedCount > 0) {
      saveFollowUpStore();
      console.log(`📚 Histórico sincronizado do WhatsApp para ${hydratedCount} conversa(s).`);
    }
  });

  // Monitora mensagens recebidas
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid) continue;

      // 1. Regra de Segurança: Ignorar mensagens de status/stories
      if (remoteJid === 'status@broadcast') continue;

      // 2. Regra de Segurança: Ignorar grupos se configurado
      const isGroup = remoteJid.endsWith('@g.us');
      if (isGroup && !config.respondToGroups) continue;

      const innerMsg = unwrapMessage(msg.message);
      if (!innerMsg) continue;

      // Ignora mensagens de protocolo, sincronização de chaves e reações
      if (
        innerMsg.protocolMessage ||
        innerMsg.senderKeyDistributionMessage ||
        innerMsg.reactionMessage
      ) {
        continue;
      }

      // Extração do texto da mensagem e detecção de mídia/áudio
      const messageContent =
        innerMsg.conversation ||
        innerMsg.extendedTextMessage?.text ||
        innerMsg.imageMessage?.caption ||
        innerMsg.videoMessage?.caption ||
        '';
      const cleanText = messageContent.trim();
      const audioMessage = innerMsg.audioMessage || null;
      const hasRealMedia = Boolean(
        innerMsg.imageMessage ||
        audioMessage ||
        innerMsg.videoMessage ||
        innerMsg.documentMessage
      );

      if (!cleanText && !hasRealMedia) continue;

      // 3. Regra de Transbordo Humano Inteligente:
      if (msg.key.fromMe) {
        if (msg.key.id && botSentMessageIds.has(msg.key.id)) {
          continue;
        }
        if (!isGroup) {
          const pauseUntil = Date.now() + config.humanHandoffMinutes * 60 * 1000;
          pausedForHuman.set(remoteJid, pauseUntil);
          activeGeneration.set(remoteJid, (activeGeneration.get(remoteJid) || 0) + 1);
          const oldPending = pendingDebounce.get(remoteJid);
          if (oldPending?.timer) clearTimeout(oldPending.timer);
          pendingDebounce.delete(remoteJid);
          pendingBuffer.delete(remoteJid);
          console.log(`[PAUSA HUMANA]: Você enviou mensagem para ${remoteJid}. Bot pausado por ${config.humanHandoffMinutes}min.`);

          const manualNow = Date.now();
          const existingConv = conversationStore.get(remoteJid) || {
            history: [],
            lastActivity: manualNow,
            followUpSent: false,
            followUpSentAt: 0
          };
          if (cleanText) {
            existingConv.history.push({ role: 'assistant', text: cleanText });
            if (existingConv.history.length > config.maxHistoryLength) {
              existingConv.history = existingConv.history.slice(-config.maxHistoryLength);
            }
          }
          existingConv.lastActivity = manualNow;
          existingConv.followUpSent = false;
          existingConv.followUpSentAt = 0;
          conversationStore.set(remoteJid, existingConv);
          saveFollowUpStore();
        }
        continue;
      }

      // Verifica se o robô está globalmente ligado no Painel
      if (!config.botEnabled) {
        console.log(`[ROBÔ PAUSADO NO PAINEL]: Mensagem de ${remoteJid} ignorada.`);
        continue;
      }

      // Verifica se o contato está com o bot pausado para atendimento humano
      const pauseUntil = pausedForHuman.get(remoteJid);
      if (pauseUntil && Date.now() < pauseUntil) {
        const remainingMin = Math.ceil((pauseUntil - Date.now()) / (60 * 1000));
        console.log(`[IGNORADO]: Contato ${remoteJid} em atendimento humano (restam ${remainingMin}min).`);
        continue;
      } else if (pauseUntil) {
        pausedForHuman.delete(remoteJid);
      }

      let incomingText = cleanText;
      let isAudioMessage = false;

      const shortConfirmRegex = /^(isso|isso mesmo|exato|exatamente|sim|ok|certo|uhum)[\s.!?-]*$/i;
      if (
        sendingBubblesForJid.has(remoteJid) &&
        incomingText &&
        shortConfirmRegex.test(incomingText)
      ) {
        console.log(`[IGNORADO]: Confirmação curta "${incomingText}" durante envio dos balões para ${remoteJid}.`);
        continue;
      }

      // 4. Transcrição automática de mensagens de voz recebidas no WhatsApp
      if (!incomingText && audioMessage) {
        isAudioMessage = true;
        activeGeneration.set(remoteJid, (activeGeneration.get(remoteJid) || 0) + 1);
        const curPending = pendingDebounce.get(remoteJid);
        if (curPending?.timer) clearTimeout(curPending.timer);
        pendingDebounce.delete(remoteJid);

        console.log(`\n🎙️ Mensagem de voz recebida de [${remoteJid}]. Ouvindo e transcrevendo...`);
        try {
          const audioBuffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
              logger: pino({ level: 'silent' }),
              reuploadRequest: sock.updateMediaMessage
            }
          );

          const transcript = await transcribeAudioBuffer(
            audioBuffer,
            audioMessage.mimetype || 'audio/ogg; codecs=opus'
          );

          const nowPauseUntil = pausedForHuman.get(remoteJid);
          if (!config.botEnabled || (nowPauseUntil && Date.now() < nowPauseUntil)) {
            continue;
          }

          if (transcript) {
            console.log(`📝 Áudio de [${remoteJid}] transcrito: "${transcript}"`);
            incomingText = transcript;
          } else {
            console.log(`⚠️ Áudio de [${remoteJid}] inaudível ou vazio.`);
            incomingText = '[AUDIO_INAUDIVEL]';
          }
        } catch (audioErr) {
          console.warn(`⚠️ Falha ao baixar/ouvir áudio de [${remoteJid}]:`, audioErr.message);
          incomingText = '[AUDIO_INAUDIVEL]';
        }
      }

      if (!incomingText) continue;

      if (cleanText) {
        console.log(`\n📩 Nova mensagem de [${remoteJid}]: "${incomingText}"`);
      }

      // 5. Mecanismo de Debounce (Agrupamento de Mensagens Consecutivas)
      handleIncomingDebouncedMessage(sock, remoteJid, incomingText, isAudioMessage);
    }
  });
}

/**
 * Decide se a resposta deve ser enviada em balões curtos separados (estilo WhatsApp real).
 */
function shouldSplitBubbles(text) {
  const parts = String(text || '').split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return false;
  const bulletCount = (text.match(/^\s*•/gm) || []).length;
  if (bulletCount > 3) return false;
  return true;
}

/**
 * Calcula tempo humano realista de digitação com variação orgânica.
 */
function computePartTypingMs(partText, totalParts) {
  const safeParts = Math.max(1, Number(totalParts) || 1);
  const configuredMin = Math.max(1000, Number(config.minTypingDelayMs) || 25000);
  const configuredMax = Math.max(configuredMin, Number(config.maxTypingDelayMs) || 35000);
  const interBubbleMinTotal = Math.max(0, safeParts - 1) * 3000;
  const interBubbleMaxTotal = Math.max(0, safeParts - 1) * 4000;
  const perPartMin = Math.max(3000, Math.round((configuredMin - interBubbleMinTotal) / safeParts));
  const rawMaxBudget = configuredMax >= 35000 ? configuredMax - 2000 : configuredMax;
  const perPartMax = Math.max(perPartMin, Math.round((rawMaxBudget - interBubbleMaxTotal) / safeParts));

  const lenScore = Math.round(String(partText || '').length * (150 / safeParts));
  const proportional = Math.min(perPartMax, Math.max(perPartMin, lenScore));
  const headroom = Math.max(0, perPartMax - proportional);
  const jitter = Math.floor(Math.random() * Math.min(Math.max(1000, Math.round((perPartMax - perPartMin) * 0.6)), headroom + 1));
  return Math.min(perPartMax, Math.max(perPartMin, proportional + jitter));
}

/**
 * Agrupa mensagens rápidas do mesmo usuário e cancela respostas antigas se o cliente continuar digitando.
 */
function handleIncomingDebouncedMessage(sock, remoteJid, text, isAudio = false) {
  const existing = pendingDebounce.get(remoteJid);
  if (existing?.timer) {
    clearTimeout(existing.timer);
  }

  const genId = (activeGeneration.get(remoteJid) || 0) + 1;
  activeGeneration.set(remoteJid, genId);

  const buf = pendingBuffer.get(remoteJid) || [];
  buf.push({ text, isAudio: Boolean(isAudio) });
  pendingBuffer.set(remoteJid, buf);

  const existingConv = conversationStore.get(remoteJid);
  if (existingConv) {
    existingConv.lastActivity = Date.now();
    existingConv.followUpSent = false;
    existingConv.followUpSentAt = 0;
    conversationStore.set(remoteJid, existingConv);
    saveFollowUpStore();
  }

  const isQuickQuery = buf.some(item => isQuickSubjectOrStatusQuery(typeof item === 'string' ? item : item.text));
  const waitDebounceMs = isQuickQuery
    ? Math.min(4000, Number(config.debounceMs) || 20000)
    : config.debounceMs;

  const timer = setTimeout(async () => {
    pendingDebounce.delete(remoteJid);
    if (!config.botEnabled) {
      pendingBuffer.delete(remoteJid);
      return;
    }
    const buffered = pendingBuffer.get(remoteJid) || [];
    if (buffered.length === 0) return;
    const combinedMessage = buffered.map(item => (typeof item === 'string' ? item : item.text)).join('\n');
    const fromAudio = buffered.some(item => Boolean(item && typeof item === 'object' && item.isAudio));
    const quickReply = buffered.some(item => isQuickSubjectOrStatusQuery(typeof item === 'string' ? item : item.text));
    await processMessageWithAi(sock, remoteJid, combinedMessage, genId, { fromAudio, quickReply });
  }, waitDebounceMs);

  pendingDebounce.set(remoteJid, { timer });
}

/**
 * Processa a mensagem com o Gemini e envia a resposta de forma humanizada
 */
async function processMessageWithAi(sock, remoteJid, userMessage, genId, options = {}) {
  const isStale = () => {
    if (activeGeneration.get(remoteJid) !== genId) return true;
    if (!config.botEnabled) return true;
    const pauseUntil = pausedForHuman.get(remoteJid);
    return Boolean(pauseUntil && pauseUntil > Date.now());
  };

  try {
    if (isStale()) return;

    const now = Date.now();
    let convData = conversationStore.get(remoteJid);

    const rawFollowUpHours = Number(config.followUpHours);
    const followUpHours = Number.isFinite(rawFollowUpHours) ? rawFollowUpHours : 48;
    const retentionMs = Math.max(
      (Number(config.sessionTimeoutMinutes) || 30) * 60 * 1000,
      (Math.max(0, followUpHours) + 48) * 60 * 60 * 1000
    );

    if (!convData || (now - convData.lastActivity) > retentionMs) {
      convData = { history: [], lastActivity: now, followUpSent: false, followUpSentAt: 0 };
    }

    const previewHistory = [...convData.history, { role: 'user', text: userMessage }].slice(-config.maxHistoryLength);
    const isQuickReply = Boolean(options.quickReply) || isQuickSubjectOrStatusQuery(userMessage);

    const readPauseMs = isQuickReply
      ? (1500 + Math.floor(Math.random() * 1000))
      : (4000 + Math.floor(Math.random() * 3000));
    await sleep(readPauseMs);
    if (isStale()) return;

    const startAiTime = Date.now();
    const { text: replyText, explicitHumanRequest, source } = await getAiResponse(previewHistory, {
      fromAudio: Boolean(options.fromAudio)
    });
    if (isStale()) return;
    const elapsedMs = Date.now() - startAiTime;

    const parts = shouldSplitBubbles(replyText)
      ? replyText.split(/\n\n+/).map(s => s.trim()).filter(Boolean)
      : [replyText];

    const sentParts = [];
    const shouldAbortSequence = () => {
      if (sentParts.length === 0) return isStale();
      if (!config.botEnabled) return true;
      const pauseUntil = pausedForHuman.get(remoteJid);
      return Boolean(pauseUntil && pauseUntil > Date.now());
    };

    try {
      for (let i = 0; i < parts.length; i++) {
        if (shouldAbortSequence()) break;

        if (i > 0) {
          await sock.sendPresenceUpdate('paused', remoteJid);
          const interPauseMs = isQuickReply ? 1200 : (2500 + Math.floor(Math.random() * 1500));
          await sleep(interPauseMs);
          if (shouldAbortSequence()) break;
        }

        await sock.sendPresenceUpdate('composing', remoteJid);
        const partTargetMs = isQuickReply
          ? (3000 + Math.floor(Math.random() * 1500))
          : computePartTypingMs(parts[i], parts.length);
        const waitMs = i === 0 ? Math.max(0, partTargetMs - elapsedMs) : partTargetMs;
        if (waitMs > 0) {
          await sleep(waitMs);
        }

        if (shouldAbortSequence()) break;

        if (i === 0) {
          pendingBuffer.delete(remoteJid);
          sendingBubblesForJid.add(remoteJid);
        }

        const sentMsg = await sock.sendMessage(remoteJid, { text: parts[i] });
        if (sentMsg?.key?.id) {
          botSentMessageIds.add(sentMsg.key.id);
          if (botSentMessageIds.size > 500) {
            const firstId = botSentMessageIds.values().next().value;
            botSentMessageIds.delete(firstId);
          }
        }
        sentParts.push(parts[i]);
      }
    } finally {
      sendingBubblesForJid.delete(remoteJid);
    }

    if (sentParts.length === 0) return;

    const finalSentText = sentParts.join('\n\n');
    console.log(`🤖 Resposta enviada (${source}) em ${Date.now() - startAiTime}ms (${sentParts.length} balão/ões) para [${remoteJid}]:\n"${finalSentText}"`);

    addRecentLog(remoteJid, userMessage, finalSentText, source);

    convData.history.push({ role: 'user', text: userMessage });
    convData.history.push({ role: 'assistant', text: finalSentText });
    if (convData.history.length > config.maxHistoryLength) {
      convData.history = convData.history.slice(-config.maxHistoryLength);
    }
    convData.lastActivity = Date.now();
    convData.followUpSent = false;
    convData.followUpSentAt = 0;
    conversationStore.set(remoteJid, convData);
    saveFollowUpStore();

    await sock.sendPresenceUpdate('paused', remoteJid);

    if (explicitHumanRequest) {
      const pauseUntil = Date.now() + config.humanHandoffMinutes * 60 * 1000;
      pausedForHuman.set(remoteJid, pauseUntil);
      console.log(`⚠️ [TRANSFERÊNCIA HUMANA]: Contato ${remoteJid} pediu atendente humano. Bot pausado por ${config.humanHandoffMinutes}min.`);
    }
  } catch (err) {
    console.error(`❌ Erro ao responder ${remoteJid}:`, err.message);
    try {
      await sock.sendPresenceUpdate('paused', remoteJid);
      await sock.sendMessage(remoteJid, {
        text: 'Desculpe, tive uma instabilidade momentânea aqui. Pode mandar de novo ou me chamar?'
      });
    } catch (e) {
      console.error('Falha ao enviar mensagem de erro:', e);
    }
  }
}

/**
 * Lê o corpo JSON de uma requisição HTTP POST
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Corpo da requisição muito grande.'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

/**
 * Cria o Servidor HTTP para o Painel de Controle e para a Nuvem (Render)
 */
function startControlPanelServer() {
  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    try {
      if (req.method === 'GET' && pathname === '/') {
        let html = '';
        try {
          html = fs.readFileSync(painelPath, 'utf-8');
        } catch (e) {
          html = '<h1>Atendente IA WhatsApp online!</h1><p>Painel indisponível no momento.</p>';
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/status') {
        const now = Date.now();
        const pausedContacts = [];
        for (const [jid, until] of pausedForHuman.entries()) {
          if (until > now) {
            pausedContacts.push({
              jid,
              contact: formatContactLabel(jid),
              remainingMinutes: Math.ceil((until - now) / 60000)
            });
          } else {
            pausedForHuman.delete(jid);
          }
        }

        sendJson(res, 200, {
          status: waState.status,
          qrDataUrl: waState.qrDataUrl,
          connectedNumber: waState.connectedNumber,
          connectedName: waState.connectedName,
          hasGeminiKey: Boolean(config.geminiApiKey && config.geminiApiKey.trim()),
          geminiModel: config.geminiModel,
          botEnabled: config.botEnabled,
          pausedContacts,
          recentLogs
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/knowledge') {
        const { systemPrompt, baseConhecimento } = getKnowledgeFiles();
        sendJson(res, 200, {
          baseConhecimento,
          systemPrompt,
          customResponses: getCustomResponses(),
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
          humanHandoffMinutes: config.humanHandoffMinutes,
          debounceMs: config.debounceMs,
          minTypingDelayMs: config.minTypingDelayMs
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/save-config') {
        const body = await readJsonBody(req);

        if (body.validateKey && body.geminiApiKey && body.geminiApiKey.trim()) {
          const check = await testGeminiApiKey(body.geminiApiKey.trim());
          if (!check.valid) {
            sendJson(res, 400, {
              ok: false,
              message: `Não foi possível validar sua chave Gemini: ${check.message}`
            });
            return;
          }
          if (check.model && !body.geminiModel) {
            body.geminiModel = check.model;
          }
        }

        const configUpdates = {};
        if (body.geminiApiKey !== undefined) configUpdates.geminiApiKey = body.geminiApiKey;
        if (body.geminiModel !== undefined) configUpdates.geminiModel = body.geminiModel;
        if (body.humanHandoffMinutes !== undefined) configUpdates.humanHandoffMinutes = body.humanHandoffMinutes;
        if (body.debounceMs !== undefined) configUpdates.debounceMs = body.debounceMs;
        if (body.minTypingDelayMs !== undefined) {
          const minTyping = Math.max(1000, Number(body.minTypingDelayMs) || 25000);
          configUpdates.minTypingDelayMs = minTyping;
          configUpdates.maxTypingDelayMs = Math.max(Math.round(minTyping * 1.4), 35000);
        }

        if (Object.keys(configUpdates).length > 0) {
          updateConfig(configUpdates);
        }

        if (body.baseConhecimento !== undefined || body.systemPrompt !== undefined) {
          saveKnowledgeFiles({
            baseConhecimento: body.baseConhecimento,
            systemPrompt: body.systemPrompt
          });
        }

        if (body.customResponses && typeof body.customResponses === 'object') {
          saveCustomResponses(body.customResponses);
        }

        const msg = body.validateKey
          ? (body.geminiApiKey && body.geminiApiKey.trim()
              ? 'Chave validada e IA em nuvem ativada com sucesso!'
              : 'Chave removida. Motor Inteligente Local ativado!')
          : 'Informações e respostas salvas e aplicadas imediatamente!';

        sendJson(res, 200, { ok: true, message: msg });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/toggle-bot') {
        const nextState = !config.botEnabled;
        updateConfig({ botEnabled: nextState });
        console.log(nextState ? '▶️ Robô ATIVADO pelo painel.' : '⏸️ Robô PAUSADO pelo painel.');
        sendJson(res, 200, { ok: true, botEnabled: config.botEnabled });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/unpause') {
        const body = await readJsonBody(req);
        if (body.jid) {
          if (body.action === 'pause') {
            pausedForHuman.set(body.jid, Date.now() + config.humanHandoffMinutes * 60 * 1000);
          } else {
            pausedForHuman.delete(body.jid);
            console.log(`▶️ Robô reativado manualmente para ${body.jid}`);
          }
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/logout') {
        isLoggingOut = true;
        waState.status = 'connecting';
        waState.qrDataUrl = '';
        waState.connectedNumber = '';
        waState.connectedName = '';

        try {
          if (activeSock) {
            await activeSock.logout().catch(() => {});
          }
        } finally {
          try {
            fs.rmSync(authFolder, { recursive: true, force: true });
          } catch (err) {
            console.error('Erro ao remover sessão:', err.message);
          }
          isLoggingOut = false;
          setTimeout(startBot, 1000);
        }

        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 404, { error: 'Rota não encontrada' });
    } catch (err) {
      console.error('Erro no servidor do painel:', err);
      sendJson(res, 500, { ok: false, message: err.message });
    }
  });

  // Utiliza a porta dinâmica da nuvem (process.env.PORT) ou fallback para 3000
  const portToUse = Number(process.env.PORT) || Number(config.port) || 3000;

  server.listen(portToUse, '0.0.0.0', () => {
    config.port = portToUse;
    console.log(`🌐 Servidor HTTP rodando na porta ${portToUse}`);
  });
}

// Inicialização geral
loadFollowUpStore();
startControlPanelServer();
setInterval(checkPendingFollowUps, 60 * 1000);
setTimeout(() => {
  checkPendingFollowUps().catch((err) => console.warn('Aviso no verificador inicial de lembretes 48h:', err.message));
}, 15 * 1000);
preloadAudioTranscriber().catch((err) => {
  console.warn('Aviso ao pré-carregar motor local de áudio:', err.message);
});
startBot().catch((err) => {
  console.error('Erro crítico ao inicializar o bot:', err);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Exceção não tratada capturada (mantendo atendimento ativo):', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Rejeição assíncrona capturada (mantendo atendimento ativo):', reason?.message || reason);
});