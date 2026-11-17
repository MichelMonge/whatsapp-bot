import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');
const settingsPath = path.join(__dirname, 'settings.json');

dotenv.config({ path: envPath });

const defaults = {
  // Chave da API do Google Gemini (gratuita no Google AI Studio: https://aistudio.google.com/)
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // Modelo da IA: 'gemini-2.0-flash' ou 'gemini-1.5-flash' (extremamente rápidos e gratuitos)
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  // Temperatura: valores baixos (0.2 a 0.3) garantem respostas fiéis e evitam que a IA invente informações
  temperature: 0.25,

  // Segurança Anti-Ban & Humanização:
  // Tempo de espera (ms) após o cliente enviar uma mensagem para ler e agrupar caso ele envie várias seguidas
  debounceMs: 20000,

  // Atraso simulando digitação humana ("digitando...") (ms)
  minTypingDelayMs: 25000,
  maxTypingDelayMs: 35000,

  // Tempo que o bot fica pausado para um cliente se ele pedir atendente humano ou se você responder manualmente
  humanHandoffMinutes: 60,

  // Limite de histórico mantido por contato (mensagens recentes para manter o contexto dinâmico)
  maxHistoryLength: 30,

  // Tempo de inatividade (minutos) para reiniciar o contexto da conversa
  sessionTimeoutMinutes: 30,

  // Tempo (em horas) após a última mensagem para enviar lembrete/retorno automático (0 = desativado)
  followUpHours: 48,

  // Responder a mensagens em grupos? (Recomendado 'false' para evitar banimentos e mensagens indesejadas)
  respondToGroups: false,

  // Controle global do atendimento automático
  botEnabled: true,

  // Porta do Painel de Controle Web
  port: Number(process.env.PORT) || 3000
};

function loadSavedSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch (err) {
    console.warn('Aviso ao ler settings.json:', err.message);
  }
  return {};
}

export const config = {
  ...defaults,
  ...loadSavedSettings()
};

// Se a chave veio do .env e não havia no settings.json, garante que ela esteja ativa
if (!config.geminiApiKey && process.env.GEMINI_API_KEY) {
  config.geminiApiKey = process.env.GEMINI_API_KEY;
}

/**
 * Atualiza e persiste configurações em tempo de execução (.env e settings.json)
 * @param {Partial<typeof defaults>} updates
 */
export function updateConfig(updates) {
  if (!updates || typeof updates !== 'object') return config;

  const numericFields = [
    'temperature',
    'debounceMs',
    'minTypingDelayMs',
    'maxTypingDelayMs',
    'humanHandoffMinutes',
    'maxHistoryLength',
    'sessionTimeoutMinutes',
    'followUpHours',
    'port'
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (!(key in defaults) || value === undefined) continue;
    if (numericFields.includes(key)) {
      const num = Number(value);
      if (!Number.isNaN(num)) config[key] = num;
    } else if (key === 'respondToGroups' || key === 'botEnabled') {
      config[key] = Boolean(value);
    } else {
      config[key] = String(value).trim();
    }
  }

  const toPersist = {
    geminiApiKey: config.geminiApiKey,
    geminiModel: config.geminiModel,
    temperature: config.temperature,
    debounceMs: config.debounceMs,
    minTypingDelayMs: config.minTypingDelayMs,
    maxTypingDelayMs: config.maxTypingDelayMs,
    humanHandoffMinutes: config.humanHandoffMinutes,
    maxHistoryLength: config.maxHistoryLength,
    sessionTimeoutMinutes: config.sessionTimeoutMinutes,
    followUpHours: config.followUpHours,
    respondToGroups: config.respondToGroups,
    botEnabled: config.botEnabled,
    port: config.port
  };

  fs.writeFileSync(settingsPath, JSON.stringify(toPersist, null, 2), 'utf-8');

  // Mantém o arquivo .env sincronizado também
  const envContent = [
    '# Obtenha sua chave gratuita em: https://aistudio.google.com/',
    `GEMINI_API_KEY=${config.geminiApiKey}`,
    `GEMINI_MODEL=${config.geminiModel}`,
    `PORT=${config.port}`
  ].join('\n') + '\n';
  fs.writeFileSync(envPath, envContent, 'utf-8');

  return config;
}
