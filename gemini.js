import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OggOpusDecoder } from 'ogg-opus-decoder';
import { pipeline } from '@xenova/transformers';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.join(__dirname, 'system_prompt.txt');
const baseConhecimentoPath = path.join(__dirname, 'base_conhecimento.txt');
const respostasPath = path.join(__dirname, 'respostas.json');

export const DEFAULT_CUSTOM_RESPONSES = {
  saudacao:
    '{{saudacao_hora}}! Tudo bem?\n\nAqui é o Engº Michel P.G. Monge, como posso te ajudar hoje?',
  saudacaoCurta: 'Tudo ótimo por aqui!\n\nMe conta, como posso te ajudar?',
  perguntaOrcamento:
    'Opa, claro! Faço seu orçamento sim.\n\nMe conta, com quem eu falo e o que você tá precisando orçar (coifa, exaustor, duto...)?',
  fechamentoResumo:
    'Já anotei tudo aqui pra eu calcular e montar sua proposta.\n\nAssim que eu fechar o levantamento já te mando por aqui! Se tiver alguma foto ou vídeo do local e quiser me mandar, ajuda bastante também.',
  respostaCatalogo:
    'Eu trabalho com fabricação própria e projetos sob medida na área de exaustão e ventilação: coifas industriais e comerciais (em Inox 304, 430 ou Galvanizado), exaustores, dutos, chaminés, lavadores de gases, filtros, manutenção e projetos com ART pela NBR 14518.\n\nO que você tá precisando montar ou resolver aí?',
  respostaHorario:
    'Eu faço atendimento por aqui em qualquer horário, todos os dias! Pode me mandar o que você precisa (orçamento, medidas, fotos ou dúvidas técnicas) a qualquer hora que já te atendo e dou andamento por aqui mesmo.',
  respostaPrazo:
    'Pra orçamento, meu prazo é de até 5 dias úteis, mas quase sempre consigo te mandar antes!\n\nJá o prazo de fabricação e instalação varia conforme o modelo e as medidas, e coloco tudo detalhado na sua proposta.',
  respostaInstalacao:
    'Se você já fechou pedido comigo, me passa seu nome ou o que comprou que eu já confiro agora aqui na programação a data certinha da entrega e instalação!\n\nAgora, se ainda for orçamento novo, o prazo certinho vai detalhado na proposta conforme as medidas.',
  respostaVisita:
    'Eu atendo todo o Brasil por aqui e por chamada de vídeo, e em São Paulo e região também vou pessoalmente pra visita técnica, medição e instalação!\n\nSe quiser ir adiantando, pode me mandar fotos ou um vídeo curto do espaço aqui mesmo.',
  respostaManutencao:
    'Faço sim! Tanto manutenção preventiva e limpeza técnica de coifas e dutos quanto conserto ou troca de exaustores e motores.\n\nMe fala de qual cidade você é, qual equipamento deu problema e, se puder, me manda uma foto ou vídeo curto pra eu analisar aqui.',
  respostaPagamento:
    'Emito Nota Fiscal certinho e aceito Pix, Transferência, Boleto e Cartão de Crédito.\n\nColoco todas as condições de pagamento bem detalhadas na sua proposta!',
  respostaGarantia:
    'Tem garantia sim! Todos os equipamentos e serviços vão com garantia técnica e Nota Fiscal certinho.\n\nDeixo os prazos e detalhes todos especificados na sua proposta.',
  respostaMaterial:
    'Trabalho com três opções e acabamento escovado ou polido de alto padrão: Aço Inox 304 (máxima resistência contra corrosão, gordura e exigências da Vigilância), Aço Inox 430 (ótimo custo-benefício pra áreas internas secas) e Chapa Galvanizada (muito usada em dutos e áreas externas).\n\nConforme o seu espaço, eu mesmo te indico a melhor opção na proposta!',
  respostaNormas:
    'Sim! Trabalho seguindo a norma ABNT NBR 14518 (exigida pela Vigilância Sanitária/ANVISA e Corpo de Bombeiros).\n\nEu mesmo faço o projeto técnico completo com emissão de Laudo e ART pelo CREA!',
  respostaFumacaOdor:
    'Pra segurar bem fumaça, gordura, cheiro e ruído (especialmente perto de vizinhos ou em condomínios), eu dimensiono a coifa com filtros inerciais e, se precisar, coloco lavador de gases ou filtro de carvão ativado junto ao exaustor.\n\nMe conta um pouco de como é o seu local hoje!',
  respostaConfirmacao:
    'Combinado! Qualquer dúvida ou detalhe que quiser acrescentar, é só me chamar aqui.',
  respostaDespedida:
    'Imagina, por nada! Precisando, é só me chamar por aqui. Tenha um excelente dia!',
  respostaHumano:
    'Oi! Aqui é o próprio Engº Michel P.G. Monge falando com você. Só um instante que já estou finalizando uma tarefa aqui e te respondo diretamente!',
  respostaFallback:
    'Oi! Vi sua mensagem por aqui. Só um instante que já estou concluindo um atendimento aqui e já te retorno na sequência pra gente conversar!',
  respostasExtras:
    'catálogo, produtos, serviços, o que vocês fazem = Eu fabrico e instalo coifas industriais e comerciais (Inox 304, 430 ou Galvanizado), exaustores, dutos, lavadores de gases, filtros, manutenção e projetos com ART. O que você tá procurando hoje?\ngarantia = Tem garantia sim! Todos os equipamentos e serviços contam com garantia técnica e Nota Fiscal certinho.\nendereço, localização, onde fica = Minha base técnica fica em São Paulo e região, mas atendo e projeto para todo o Brasil! Se precisar de visita ou retirada, me avisa sua cidade que já vejo aqui pra você.\ntelefone, contato, ligar, ligação = Eu respondo por aqui mesmo no WhatsApp, mas se preferir conversar por ligação ou chamada de vídeo comigo, me avisa que já combino um horário com você!\nurgente, urgência, emergência, equipamento parado = Entendo perfeitamente a urgência! Me passa sua cidade, qual equipamento parou e o que aconteceu que já dou prioridade aqui pra você.\nchurrasqueira, área gourmet, residencial = Faço sim! Inclusive projeto coifas e exaustão bem silenciosas sob medida pra áreas gourmet e churrasqueiras. Me passa as medidas da churrasqueira e sua cidade pra eu orçar!\nrestaurante, lanchonete, pizzaria, hamburgueria, padaria = Atendo muitas cozinhas profissionais (restaurantes, lanchonetes, pizzarias, hamburguerias e padarias) já dentro da NBR 14518! Se quiser orçamento, me passa as medidas e sua cidade.\nexaustor, motor, centrífugo, axial, ventilador = Eu dimensiono exaustores centrífugos e axiais conforme a vazão e perda de carga do seu projeto. Você já tem as medidas ou quer ajuda pra calcular?\nduto, tubulação, chaminé, curva = Fabrico e instalo dutos e chaminés em chapa galvanizada ou aço inox (lisos, soldados ou flangeados) sob medida pro traçado da sua obra!\ninox, aço inox = Trabalho com Aço Inox 304 (máxima resistência sanitária e contra corrosão) e Inox 430 (ótimo custo-benefício), sempre com acabamento escovado ou polido de alto padrão!\ndesconto, à vista, parcelamento, entrada = Eu sempre estudo condições especiais pra pagamento à vista no Pix ou Transferência, além de parcelamento direto na proposta comercial!\nfoto, vídeo, planta, desenho = Pode me mandar suas fotos, vídeos do local ou planta por aqui mesmo! Isso me ajuda demais a montar uma proposta rápida e bem certinha.\nnota fiscal, nf, cnpj = Emito sim! Nota Fiscal certinho tanto para CNPJ quanto para CPF, conforme combinarmos na proposta.\nreclamação, problema, defeito = Sinto muito mesmo pelo transtorno! Já estou analisando seu caso pessoalmente agora pra resolver o quanto antes pra você.\naguardo a proposta, aguardo o orçamento, aguardo a cotação = Eu que agradeço pela confiança! Já estou preparando o seu orçamento por aqui e te retorno o mais breve possível com a sua proposta. Qualquer dúvida até lá, é só me chamar!\naguardo, fico no aguardo, breve retorno, espero retorno = Eu que agradeço pela confiança! Já anotei sua mensagem por aqui e te retorno o mais breve possível. Qualquer dúvida até lá, é só me chamar!\nobrigado, obrigada, muito obrigado, muito obrigada, agradeço, gratidão, valeu, obg, brigado, brigada = Imagina, eu que agradeço pelo contato e pela confiança! Sempre que precisar, pode contar comigo por aqui.'
};

/**
 * Lê as respostas personalizáveis do arquivo respostas.json.
 */
export function getCustomResponses() {
  try {
    if (fs.existsSync(respostasPath)) {
      const raw = fs.readFileSync(respostasPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_CUSTOM_RESPONSES, ...parsed };
      }
    }
  } catch (err) {
    console.warn('Aviso ao ler respostas.json:', err.message);
  }
  return { ...DEFAULT_CUSTOM_RESPONSES };
}

/**
 * Salva as respostas personalizáveis no arquivo respostas.json.
 */
export function saveCustomResponses(updates) {
  if (!updates || typeof updates !== 'object') return getCustomResponses();
  const current = getCustomResponses();
  const next = { ...current };
  for (const key of Object.keys(DEFAULT_CUSTOM_RESPONSES)) {
    if (typeof updates[key] === 'string') {
      next[key] = updates[key];
    }
  }
  fs.writeFileSync(respostasPath, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

/**
 * Lê o conteúdo atual dos arquivos de instrução e conhecimento.
 */
export function getKnowledgeFiles() {
  const systemPrompt = fs.existsSync(promptPath)
    ? fs.readFileSync(promptPath, 'utf-8')
    : 'Você é um assistente prestativo.';

  const baseConhecimento = fs.existsSync(baseConhecimentoPath)
    ? fs.readFileSync(baseConhecimentoPath, 'utf-8')
    : '';

  return { systemPrompt, baseConhecimento };
}

/**
 * Salva alterações no prompt de sistema ou base de conhecimento.
 */
export function saveKnowledgeFiles({ systemPrompt, baseConhecimento }) {
  if (typeof systemPrompt === 'string') {
    fs.writeFileSync(promptPath, systemPrompt, 'utf-8');
  }
  if (typeof baseConhecimento === 'string') {
    fs.writeFileSync(baseConhecimentoPath, baseConhecimento, 'utf-8');
  }
}

/**
 * Combina o prompt de sistema, a base de conhecimento e respostas extras para a IA.
 */
function getSystemInstruction() {
  const { systemPrompt, baseConhecimento } = getKnowledgeFiles();
  const custom = getCustomResponses();
  const extras = custom.respostasExtras
    ? `\n\n--- RESPOSTAS RÁPIDAS PERSONALIZADAS ---\n${custom.respostasExtras}`
    : '';
  return `${systemPrompt}\n\n--- BASE DE CONHECIMENTO ---\n${baseConhecimento}${extras}`;
}

/**
 * Normaliza texto removendo acentos e pontuação para comparação rápida.
 */
function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retorna saudação dinâmica de acordo com a hora atual.
 */
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Remove qualquer emoji Unicode preservando pontuação, acentos e quebras de linha.
 */
export function stripEmojis(text) {
  return String(text || '')
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u200D|\u20E3/gu, '')
    .replace(/\*+/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,.;!?])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

/**
 * Converte canais PCM (Float32Array[]) para mono 16kHz exigido pelo Whisper.
 */
function resampleTo16kMono(channelData, sampleRate = 48000) {
  if (!Array.isArray(channelData) || channelData.length === 0 || !channelData[0]?.length) {
    return new Float32Array(0);
  }
  const numChannels = channelData.length;
  const srcLen = channelData[0].length;
  const mono = new Float32Array(srcLen);
  if (numChannels === 1) {
    mono.set(channelData[0]);
  } else {
    for (let i = 0; i < srcLen; i++) {
      let sum = 0;
      for (let c = 0; c < numChannels; c++) {
        sum += channelData[c][i] || 0;
      }
      mono[i] = sum / numChannels;
    }
  }

  const targetRate = 16000;
  if (!sampleRate || sampleRate === targetRate) return mono;

  const ratio = sampleRate / targetRate;
  const targetLen = Math.max(1, Math.floor(srcLen / ratio));
  const out = new Float32Array(targetLen);
  for (let i = 0; i < targetLen; i++) {
    const srcIdx = i * ratio;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(srcLen - 1, idx0 + 1);
    const frac = srcIdx - idx0;
    out[i] = mono[idx0] * (1 - frac) + mono[idx1] * frac;
  }
  return out;
}

/**
 * Decodifica buffer WAV (PCM 16-bit ou Float32) para Float32Array mono 16kHz.
 */
function decodeWavBuffer(buf) {
  if (!buf || buf.length < 44) return new Float32Array(0);
  let offset = 12;
  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let dataStart = -1;
  let dataSize = 0;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const bodyStart = offset + 8;

    if (chunkId === 'fmt ' && bodyStart + 16 <= buf.length) {
      audioFormat = buf.readUInt16LE(bodyStart);
      numChannels = buf.readUInt16LE(bodyStart + 2) || 1;
      sampleRate = buf.readUInt32LE(bodyStart + 4) || 16000;
      bitsPerSample = buf.readUInt16LE(bodyStart + 14) || 16;
    } else if (chunkId === 'data') {
      dataStart = bodyStart;
      dataSize = Math.min(chunkSize, buf.length - bodyStart);
      break;
    }

    offset = bodyStart + chunkSize + (chunkSize % 2);
  }

  if (dataStart < 0 || dataSize <= 0) return new Float32Array(0);

  const bytesPerSample = Math.max(1, Math.floor(bitsPerSample / 8));
  const frameBytes = bytesPerSample * numChannels;
  const totalFrames = Math.floor(dataSize / frameBytes);
  const channels = Array.from({ length: numChannels }, () => new Float32Array(totalFrames));

  for (let i = 0; i < totalFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const pos = dataStart + i * frameBytes + c * bytesPerSample;
      if (audioFormat === 3 && bitsPerSample === 32) {
        channels[c][i] = buf.readFloatLE(pos);
      } else if (bitsPerSample === 16) {
        channels[c][i] = buf.readInt16LE(pos) / 32768;
      } else if (bitsPerSample === 8) {
        channels[c][i] = (buf.readUInt8(pos) - 128) / 128;
      }
    }
  }

  return resampleTo16kMono(channels, sampleRate);
}

/**
 * Converte buffer de áudio (.ogg Opus do WhatsApp ou .wav) em PCM Float32 mono 16kHz.
 */
async function decodeAudioToFloat32_16k(audioBuffer) {
  const buf = Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer || []);
  if (buf.length < 12) return new Float32Array(0);

  const header4 = buf.toString('ascii', 0, 4);
  if (header4 === 'OggS') {
    const decoder = new OggOpusDecoder();
    try {
      await decoder.ready;
      const { channelData, sampleRate } = await decoder.decodeFile(new Uint8Array(buf));
      return resampleTo16kMono(channelData, sampleRate || 48000);
    } finally {
      decoder.free();
    }
  }

  if (header4 === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
    return decodeWavBuffer(buf);
  }

  return new Float32Array(0);
}

const SPOKEN_PT_NUMBER_MAP = new Map([
  ['zero', 0],
  ['um', 1], ['uma', 1],
  ['dois', 2], ['duas', 2],
  ['tres', 3],
  ['quatro', 4],
  ['cinco', 5],
  ['seis', 6],
  ['sete', 7],
  ['oito', 8],
  ['nove', 9],
  ['dez', 10],
  ['onze', 11],
  ['doze', 12],
  ['treze', 13],
  ['quatorze', 14], ['catorze', 14],
  ['quinze', 15],
  ['dezesseis', 16],
  ['dezessete', 17],
  ['dezoito', 18],
  ['dezenove', 19],
  ['vinte', 20]
]);

const SPOKEN_PT_DECIMALS_MAP = new Map([
  ['dez', 0.1],
  ['vinte', 0.2],
  ['trinta', 0.3],
  ['quarenta', 0.4],
  ['cinquenta', 0.5],
  ['sessenta', 0.6],
  ['setenta', 0.7],
  ['oitenta', 0.8],
  ['noventa', 0.9]
]);

function parseSpokenNumberToken(rawToken) {
  const norm = normalizeText(rawToken).replace(/\s+/g, ' ').trim();
  if (!norm) return null;

  const halfMatch = norm.match(/^(\S+?)\s+(?:metros?\s+)?e\s+(meio|meia)$/);
  if (halfMatch) {
    const baseVal = parseSpokenNumberToken(halfMatch[1]);
    if (baseVal !== null) return baseVal + 0.5;
  }

  const decimalWordMatch = norm.match(/^(\S+?)\s+(?:metros?\s+)?e\s+(dez|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)$/);
  if (decimalWordMatch) {
    const baseVal = parseSpokenNumberToken(decimalWordMatch[1]);
    const dec = SPOKEN_PT_DECIMALS_MAP.get(decimalWordMatch[2]);
    if (baseVal !== null && dec !== undefined) return baseVal + dec;
  }

  if (/^\d+(?:[.,]\d+)?$/.test(norm)) {
    const n = parseFloat(norm.replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  }

  if (SPOKEN_PT_NUMBER_MAP.has(norm)) {
    return SPOKEN_PT_NUMBER_MAP.get(norm);
  }
  return null;
}

function formatPtNumber(val) {
  if (Number.isInteger(val)) return String(val);
  return String(Number(val.toFixed(2))).replace('.', ',');
}

/**
 * Pré-processa PCM 16 kHz antes do Whisper: remove DC offset, apara silêncio das pontas,
 * adiciona margem silenciosa de 200 ms e normaliza picos de voz baixa (até 12x).
 */
function preprocessPcm16k(pcm) {
  if (!pcm || pcm.length === 0) return new Float32Array(0);

  let sum = 0;
  for (let i = 0; i < pcm.length; i++) {
    sum += pcm[i];
  }
  const mean = sum / pcm.length;

  const centered = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    centered[i] = pcm[i] - mean;
  }

  const trimThreshold = 0.003;
  let firstIdx = -1;
  let lastIdx = -1;
  for (let i = 0; i < centered.length; i++) {
    if (Math.abs(centered[i]) >= trimThreshold) {
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
    }
  }

  const start = firstIdx === -1 ? 0 : firstIdx;
  const end = firstIdx === -1 ? centered.length - 1 : lastIdx;
  const speechLen = Math.max(0, end - start + 1);
  if (speechLen === 0) return new Float32Array(0);

  let maxAbs = 0;
  for (let i = start; i <= end; i++) {
    const abs = Math.abs(centered[i]);
    if (abs > maxAbs) maxAbs = abs;
  }

  const gain = maxAbs > 0 ? Math.min(12, 0.85 / maxAbs) : 1;
  const padSamples = 3200; // 200ms a 16 kHz para evitar corte na sílaba inicial
  const out = new Float32Array(padSamples + speechLen + padSamples);

  for (let i = 0; i < speechLen; i++) {
    out[padSamples + i] = centered[start + i] * gain;
  }

  return out;
}

/**
 * Limpa artefatos do Whisper e repara vícios fonéticos e medidas faladas em português.
 */
export function cleanAndRepairVoiceTranscript(rawText) {
  let text = String(rawText || '')
    .replace(/\[.*?\]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  text = stripEmojis(text).trim();
  if (!text) return '';

  if (/\b(?:legendas pela comunidade|obrigado por assistir|inscreva-se|subtitles by|amara\.org|transcricao automatica)\b/i.test(normalizeText(text))) {
    return '';
  }

  // Reparos fonéticos comuns de saudação captada com microfone/corte inicial
  text = text
    .replace(/^\s*(?:ou\s+a|ou\s+la|oh\s+la|u\s+la)\b/i, 'Olá')
    .replace(/\b(?:o\s+la|oh\s+la)\b/gi, 'Olá')
    .replace(/(?:^|(?<=\b(?:oi|ol[aá]|opa|ei|bom\s+dia|boa\s+tarde|boa\s+noite)[\s,!]*))outra\s+bem\b/gi, 'tudo bem')
    .replace(/\boutra\s+bem(?=\s*(?:[,!?.]|bom\s+dia|boa\s+tarde|boa\s+noite|$))/gi, 'tudo bem')
    .replace(/\btudo\s+b[aã]o\b/gi, 'tudo bem');

  // Reparos fonéticos comuns do domínio de coifas e exaustão
  text = text
    .replace(/\b(?:coi\s+fa|cuifa|coi\s*pha|coiva)\b/gi, 'coifa')
    .replace(/\b(?:ex\s+autor|esautor|isautor|ezautor|esaltor)\b/gi, 'exaustor')
    .replace(/\b(?:or[cs]amento|osamento|or[sç]amentu)\b/gi, 'orçamento')
    .replace(/\blavador(?:es)?\s+de\s+fuma[cç]a\b/gi, 'lavador de gases')
    .replace(/\b(?:michrl|micher|micheu|michell)\b/gi, 'Michel')
    .replace(/\binox\s+(?:trezentos\s+e\s+quatro|3\s+0\s+4)\b/gi, 'inox 304')
    .replace(/\binox\s+(?:quatrocentos\s+e\s+trinta|4\s+3\s+0)\b/gi, 'inox 430');

  // Converte medidas faladas ("três por dois", "dois e meio por um e meio", "3 por 2 metros")
  const numWord = '(?:\\d+(?:[.,]\\d+)?|zero|uma?|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte)';
  const numExpr = `${numWord}(?:\\s*(?:metros?\\s+)?e\\s+(?:mei[oa]|dez|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa))?`;
  const dimTripleOrPairRe = new RegExp(
    `\\b(${numExpr})\\s*(?:metros?\\s+|m\\s+|cm\\s+|mm\\s+)?(?:por|x|\\*)\\s*(${numExpr})(?!\\s*cento\\b)(?:\\s*(?:metros?\\s+|m\\s+|cm\\s+|mm\\s+)?(?:por|x|\\*)\\s*(${numExpr}))?\\s*(metros?|m|cm|mm)?\\b`,
    'gi'
  );

  text = text.replace(dimTripleOrPairRe, (fullMatch, rawA, rawB, rawC, rawUnit) => {
    const a = parseSpokenNumberToken(rawA);
    const b = parseSpokenNumberToken(rawB);
    const c = rawC ? parseSpokenNumberToken(rawC) : null;
    if (a === null || b === null) return fullMatch;

    // Evita converter expressões idiomáticas sem unidade como "um por um" ou "dois por um" sem unidade/contexto
    const rawNoDigits = !/\d/.test(fullMatch) && !rawUnit && !/\bmetros?\b/i.test(fullMatch);
    if (rawNoDigits && a === 1 && b === 1) return fullMatch;

    let unit = 'm';
    const unitHint = (rawUnit || (/cm/i.test(fullMatch) ? 'cm' : /mm/i.test(fullMatch) ? 'mm' : '')).toLowerCase();
    if (unitHint === 'cm' || unitHint === 'mm') {
      unit = unitHint;
    } else if (a >= 100 || b >= 100 || (c !== null && c >= 100)) {
      unit = 'mm';
    }

    const parts = [formatPtNumber(a), formatPtNumber(b)];
    if (c !== null) parts.push(formatPtNumber(c));
    return `${parts.join('x')} ${unit}`;
  });

  return stripEmojis(text.replace(/\s+/g, ' ').trim());
}

let whisperPipelinePromise = null;
let activeWhisperModel = 'Xenova/whisper-small';

/**
 * Pré-carrega o modelo local Whisper (Xenova/whisper-small, com fallback para Xenova/whisper-base).
 */
export function preloadAudioTranscriber() {
  if (!whisperPipelinePromise) {
    whisperPipelinePromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-small')
      .then(pipe => {
        activeWhisperModel = 'Xenova/whisper-small';
        return pipe;
      })
      .catch(async smallErr => {
        console.warn(`⚠️ Falha ao carregar Xenova/whisper-small (${smallErr.message}). Tentando fallback para Xenova/whisper-base...`);
        try {
          const basePipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base');
          activeWhisperModel = 'Xenova/whisper-base';
          return basePipe;
        } catch (baseErr) {
          whisperPipelinePromise = null;
          throw baseErr;
        }
      });
  }
  return whisperPipelinePromise;
}

async function getLocalWhisperPipeline() {
  return preloadAudioTranscriber();
}

/**
 * Transcreve mensagens de voz (.ogg Opus / .wav) para texto em português.
 * Usa Groq Whisper ou Gemini quando há chave configurada e Whisper local como padrão gratuito.
 */
export async function transcribeAudioBuffer(audioBuffer, mimeType = 'audio/ogg') {
  const buf = Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer || []);
  if (buf.length === 0) return '';

  const baseMime = String(mimeType || 'audio/ogg').split(';')[0].trim() || 'audio/ogg';
  const cleanKey = (config.geminiApiKey || '').trim();

  // Tier 1: Groq Whisper API (gsk_...)
  if (cleanKey.startsWith('gsk_')) {
    try {
      const form = new FormData();
      const ext = baseMime.includes('wav') ? 'wav' : baseMime.includes('mpeg') || baseMime.includes('mp3') ? 'mp3' : 'ogg';
      form.append('file', new Blob([buf], { type: baseMime }), `audio.${ext}`);
      form.append('model', 'whisper-large-v3-turbo');
      form.append('language', 'pt');
      const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cleanKey}` },
        body: form
      });
      if (resp.ok) {
        const data = await resp.json();
        const raw = stripEmojis(data?.text || '');
        if (!raw || /^inaudivel$/i.test(normalizeText(raw))) return '';
        return cleanAndRepairVoiceTranscript(raw);
      }
    } catch (err) {
      console.warn('⚠️ Falha ao transcrever áudio na Groq:', err.message);
    }
  }

  // Tier 2: Google Gemini Multimodal (AIza...)
  if (cleanKey && !cleanKey.startsWith('gsk_')) {
    const modelsToTry = Array.from(new Set([config.geminiModel, 'gemini-2.0-flash', 'gemini-1.5-flash']));
    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: baseMime,
                    data: buf.toString('base64')
                  }
                },
                {
                  text: 'Transcreva fielmente em português do Brasil apenas o que foi falado neste áudio, sem comentários extras. Se não houver fala audível, responda apenas: INAUDIVEL.'
                }
              ]
            }],
            generationConfig: { temperature: 0, maxOutputTokens: 400 }
          })
        });
        if (!resp.ok) continue;
        const data = await resp.json();
        const raw = stripEmojis(data?.candidates?.[0]?.content?.parts?.[0]?.text || '');
        if (!raw) continue;
        if (/^inaudivel$/i.test(normalizeText(raw))) return '';
        return cleanAndRepairVoiceTranscript(raw);
      } catch (err) {
        console.warn(`⚠️ Falha ao transcrever áudio no Gemini (${model}):`, err.message);
      }
    }
  }

  // Tier 3: Motor Local Whisper (gratuito e sem dependência de chave externa)
  try {
    const rawPcm = await decodeAudioToFloat32_16k(buf);
    if (!rawPcm || rawPcm.length < 1600) return '';

    let sumRaw = 0;
    for (let i = 0; i < rawPcm.length; i++) {
      sumRaw += rawPcm[i];
    }
    const dcMean = sumRaw / rawPcm.length;
    let sumSq = 0;
    for (let i = 0; i < rawPcm.length; i++) {
      const v = rawPcm[i] - dcMean;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / rawPcm.length);
    if (rms < 0.0012) return '';

    const pcm16k = preprocessPcm16k(rawPcm);
    if (!pcm16k || pcm16k.length < 1600) return '';

    const transcriber = await getLocalWhisperPipeline();
    const result = await transcriber(pcm16k, {
      language: 'portuguese',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5
    });

    const repaired = cleanAndRepairVoiceTranscript(result?.text || '');
    if (!repaired) return '';
    return stripEmojis(repaired);
  } catch (err) {
    console.warn(`⚠️ Falha na transcrição local do áudio (${activeWhisperModel}):`, err.message);
    return '';
  }
}

function applyPlaceholders(text, history = []) {
  const raw = String(text || '');
  let chosen = raw;
  if (raw.includes('||')) {
    const options = raw.split('||').map(o => o.trim()).filter(Boolean);
    if (options.length > 0) {
      const prevAssistantNorms = (Array.isArray(history) ? history : [])
        .filter(m => m && m.role === 'assistant')
        .map(m => normalizeText(m.text));
      const unused = options.filter(opt => {
        const resolved = opt.replace(/\{\{saudacao_hora\}\}/gi, getTimeGreeting());
        return !prevAssistantNorms.includes(normalizeText(resolved));
      });
      const pool = unused.length > 0 ? unused : options;
      chosen = pool[prevAssistantNorms.length % pool.length] || options[0];
    }
  }
  return stripEmojis(chosen.replace(/\{\{saudacao_hora\}\}/gi, getTimeGreeting()));
}

/**
 * Retorna status de atendimento contínuo (disponível em qualquer horário).
 */
function getBusinessHoursStatus() {
  return {
    isOpen: true,
    dayLabel: 'todos os dias',
    todaySchedule: 'em qualquer horário'
  };
}

/**
 * Faz o parse das seções [TITULO] dentro de base_conhecimento.txt.
 */
function parseKnowledgeSections(baseConhecimento) {
  const lines = String(baseConhecimento || '').split(/\r?\n/);
  const sections = [];
  let current = { title: 'GERAL', lines: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('===') || trimmed.startsWith('(Edite este arquivo')) {
      continue;
    }
    const headerMatch = trimmed.match(/^\[(.+)\]$/);
    if (headerMatch) {
      if (current.lines.length > 0) {
        sections.push(current);
      }
      current = { title: headerMatch[1].trim(), lines: [] };
    } else {
      current.lines.push(trimmed);
    }
  }
  if (current.lines.length > 0) {
    sections.push(current);
  }
  return sections;
}

const GREETING_FILLER_TOKENS = new Set([
  'oi', 'ola', 'opa', 'eai', 'ei', 'alo', 'hello', 'hi', 'salve',
  'bom', 'boa', 'dia', 'tarde', 'noite', 'tudo', 'bem', 'otimo', 'certo',
  'como', 'vai', 'voce', 'vc', 'vcs', 'com', 'por', 'ai', 'beleza', 'blz', 'joia',
  'michel', 'eng', 'engenheiro', 'monge', 'amigo', 'amiga', 'pessoal', 'sr', 'senhor',
  'ou', 'outra', 'entao', 'fala', 'escuta', 'aqui', 'chefe', 'cara', 'irmao',
  'obrigado', 'obrigada', 'valeu', 'estou', 'to', 'ta', 'sim'
]);

const STOP_WORDS = new Set([
  'que', 'para', 'com', 'sem', 'por', 'uma', 'uns', 'umas', 'dos', 'das', 'nos', 'nas',
  'voces', 'voce', 'vcs', 'tem', 'esta', 'estao', 'como', 'qual', 'quais',
  'onde', 'quando', 'quanto', 'quanta', 'quantos', 'quem', 'quero', 'queria', 'gostaria',
  'saber', 'sobre', 'fazer', 'fazem', 'faz', 'vendem', 'vende', 'oferecem', 'oferece',
  'atendem', 'atende', 'pode', 'podem', 'aqui', 'isso', 'esse', 'essa', 'isto',
  'meu', 'minha', 'seu', 'sua', 'mais', 'muito', 'ola', 'bom', 'boa', 'dia', 'tarde', 'noite',
  'tudo', 'bem',
  'mas', 'mandar', 'mando', 'mensagem', 'mensagens', 'voz', 'audio', 'tambem',
  'consegue', 'conseguem', 'responder', 'responde', 'falar', 'falando', 'dizer',
  'entao', 'porque', 'outra', 'outro', 'seria', 'estava', 'precisava', 'posso'
]);

const QUESTION_OR_CONTROL_WORDS = new Set([
  'qual', 'quais', 'quando', 'como', 'onde', 'quanto', 'quem',
  'atendimento', 'funciona', 'envia', 'manda', 'entrega', 'aberto', 'fechado',
  'certo', 'ok', 'okay', 'tudo', 'entendi', 'entendido', 'beleza', 'blz', 'ta'
]);

const INTENTION_OR_ACTION_WORDS = new Set([
  'quero', 'queria', 'gostaria', 'preciso', 'falar', 'conversar', 'saber', 'fazer',
  'comprar', 'orcar', 'instalar', 'ver', 'mandar', 'enviar', 'ter', 'estou', 'esta',
  'tem', 'tenho', 'pode', 'podem', 'fazem', 'vende', 'vendem', 'atende', 'atendem',
  'moro', 'fica', 'chamar'
]);

const NON_NAME_WORDS = new Set([
  ...STOP_WORDS,
  ...GREETING_FILLER_TOKENS,
  ...QUESTION_OR_CONTROL_WORDS,
  ...INTENTION_OR_ACTION_WORDS,
  'eu', 'tu', 'ele', 'ela', 'nos', 'eles', 'elas',
  'tratar', 'passa', 'passar', 'instalado', 'instalando',
  'michrl', 'micher', 'michel', 'monge', 'engenheiro', 'eng',
  'orcamento', 'precisando', 'necessito', 'coifa', 'coifas', 'parede', 'ilha', 'central',
  'exaustor', 'exaustores', 'exaustao', 'duto', 'dutos', 'tubulacao', 'ventilacao', 'climatizacao',
  'lavador', 'gases', 'filtro', 'filtros', 'inox', 'aco', 'galvanizada', 'galvanizado', 'chapa',
  'manutencao', 'limpeza', 'projeto', 'laudo', 'art', 'instalacao', 'visita', 'tecnica',
  'restaurante', 'cozinha', 'industrial', 'comercial', 'lanchonete', 'pizzaria', 'hamburgueria',
  'padaria', 'confeitaria', 'industria', 'galpao', 'fabrica', 'laboratorio', 'residencia', 'casa',
  'metro', 'metros', 'centimetro', 'centimetros', 'milimetro', 'milimetros', 'medida', 'medidas',
  'hoje', 'amanha', 'agora', 'horario', 'horarios', 'prazo', 'prazos', 'tempo', 'demora',
  'preco', 'precos', 'valor', 'valores', 'pagamento', 'pix', 'cartao', 'boleto', 'nota', 'fiscal',
  'sim', 'nao', 'por', 'favor', 'obrigado', 'obrigada', 'valeu', 'combinado', 'tranquilo',
  'de', 'da', 'do', 'dos', 'das', 'em', 'na', 'no', 'nas', 'nos', 'e', 'ou', 'a', 'o', 'as', 'os',
  'sou', 'chamo', 'nome', 'me', 'cidade', 'regiao', 'cep', 'bairro',
  'uma', 'um', 'minha', 'meu', 'vai', 'quando',
  'urgente', 'urgencia', 'emergencia', 'defeito', 'problema', 'conserto', 'consertar', 'reparo',
  'ajuda', 'pedido', 'comprei', 'fechei', 'produto', 'produtos', 'servico', 'servicos',
  'catalogo', 'garantia', 'desconto', 'endereco', 'telefone', 'contato', 'ligar',
  'foto', 'fotos', 'video', 'videos', 'planta', 'desenho',
  'nbr', '14518', '304', '430', 'sao', 'paulo', 'sp', 'rj', 'mg', 'brasil',
  'fumaca', 'cheiro', 'odor', 'gordura', 'ruido', 'carvao', 'ativado',
  'polido', 'escovado', 'acabamento', 'material', 'motor', 'centrifugo', 'axial',
  'chamine', 'curva', 'gourmet', 'churrasqueira', 'residencial'
]);

function findSectionByHint(sections, hints) {
  return sections.find(s => {
    const t = normalizeText(s.title);
    return hints.some(h => t.includes(h));
  });
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Verifica se a mensagem corresponde a alguma regra personalizada em respostasExtras (palavra-chave = resposta).
 */
function matchCustomExtraResponse(normMsg, custom, prevMessages = []) {
  const rawExtras = String(custom?.respostasExtras || '').trim();
  if (!rawExtras) return null;

  const lines = rawExtras.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes('=')) continue;
    const eqIndex = trimmed.indexOf('=');
    const triggersPart = trimmed.slice(0, eqIndex).trim();
    const answerPart = trimmed.slice(eqIndex + 1).trim().replace(/\\n/g, '\n');
    if (!triggersPart || !answerPart) continue;

    const triggers = triggersPart
      .split(/[,;|]/)
      .map(t => normalizeText(t))
      .filter(Boolean);

    const matched = triggers.some(t => {
      const esc = escapeRegExp(t);
      const pattern = t.length <= 3
        ? new RegExp(`(?:^|\\s)${esc}(?:$|\\s)`)
        : new RegExp(`(?:^|\\s)${esc}`);
      return pattern.test(normMsg);
    });

    if (matched) {
      return applyPlaceholders(answerPart, prevMessages);
    }
  }
  return null;
}

/**
 * Detecta se a mensagem é um pedido explícito para falar com um humano ou reclamação urgente.
 */
function isExplicitHumanRequest(normMsg) {
  const directHumanRegex = /\b(?:falar|conversar|chamar|tratar|passa|passar)\s+(?:direto\s+|diretamente\s+)?(?:com|pro|para)\s+(?:o\s+|a\s+)?(?:eng\w*\s+|dr\s+|sr\s+)?(?:michel|michrl|micher|monge|engenheiro|atendente|humano|pessoa|alguem|suporte|gerente)\b|\bchamar\s+(?:o\s+|a\s+)?(?:michel|michrl|micher|monge|engenheiro|atendente|humano|gerente)\b/;
  if (directHumanRegex.test(normMsg)) return true;

  const humanTriggers = [
    'falar com atendente', 'falar com humano', 'falar com uma pessoa', 'falar com pessoa',
    'falar com alguem', 'suporte humano', 'atendimento humano', 'quero atendente',
    'quero falar com o michel', 'falar direto com michel', 'falar diretamente com',
    'reclamacao', 'reclamar', 'cancelar', 'cancelamento', 'gerente', 'problema grave'
  ];
  if (humanTriggers.some(t => normMsg.includes(t))) return true;
  if (normMsg === 'atendente' || normMsg === 'humano') return true;
  return false;
}

/**
 * Verifica se o texto começa ou contém uma saudação.
 */
function hasGreetingPhrase(normMsg) {
  return [
    'oi', 'ola', 'opa', 'eai', 'alo', 'hello', 'hi', 'salve',
    'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'tudo bom', 'como vai',
    'tudo sim', 'tudo joia', 'tudo certo', 'tudo otimo', 'e vc', 'e voce', 'como vc ta', 'como voce esta'
  ].some(g => normMsg === g || normMsg.startsWith(g + ' ') || normMsg.includes(' ' + g));
}

const KNOWN_CITIES = [
  ['sao paulo', 'São Paulo'],
  ['guarulhos', 'Guarulhos'],
  ['campinas', 'Campinas'],
  ['santo andre', 'Santo André'],
  ['sao bernardo do campo', 'São Bernardo do Campo'],
  ['sao bernardo', 'São Bernardo do Campo'],
  ['sao caetano do sul', 'São Caetano do Sul'],
  ['sao caetano', 'São Caetano do Sul'],
  ['diadema', 'Diadema'],
  ['osasco', 'Osasco'],
  ['barueri', 'Barueri'],
  ['alphaville', 'Alphaville'],
  ['sorocaba', 'Sorocaba'],
  ['santos', 'Santos'],
  ['jundiai', 'Jundiaí'],
  ['ribeirao preto', 'Ribeirão Preto'],
  ['sao jose dos campos', 'São José dos Campos'],
  ['mogi das cruzes', 'Mogi das Cruzes'],
  ['suzano', 'Suzano'],
  ['taboao da serra', 'Taboão da Serra'],
  ['cotia', 'Cotia'],
  ['maua', 'Mauá'],
  ['grande abc', 'Grande ABC'],
  ['rio de janeiro', 'Rio de Janeiro'],
  ['belo horizonte', 'Belo Horizonte'],
  ['curitiba', 'Curitiba'],
  ['porto alegre', 'Porto Alegre'],
  ['brasilia', 'Brasília'],
  ['goiania', 'Goiânia'],
  ['salvador', 'Salvador'],
  ['fortaleza', 'Fortaleza'],
  ['recife', 'Recife'],
  ['florianopolis', 'Florianópolis']
];

/**
 * Extrai e acumula entidades/contexto de todas as mensagens do cliente na conversa.
 * @param {Array<{role: string, text: string}>} history
 */
export function extractConversationContext(history = []) {
  const ctx = {
    equipamento: null,
    material: null,
    ambiente: null,
    medidas: null,
    localidade: null,
    bairro: null,
    indicacao: null,
    nomeCliente: null,
    historicoAssuntos: [],
    lastAddedFields: []
  };

  const fullHistory = Array.isArray(history) ? history : [];
  const envRules = [
    { pattern: /\brestaurantes?\b/, label: 'Restaurante' },
    { pattern: /\bcozinhas?\s+industri(?:al|ais)\b/, label: 'Cozinha Industrial' },
    { pattern: /\bcozinhas?\s+comerci(?:al|ais)\b/, label: 'Cozinha Comercial' },
    { pattern: /\b(?:cozinhas?\s+residencia(?:l|is)|residencia(?:l|is)?|casas?|apartamentos?)\b/, label: 'Cozinha Residencial' },
    { pattern: /\b(?:areas?\s+gourmet|churrasqueiras?)\b/, label: 'Área Gourmet / Churrasqueira' },
    { pattern: /\bcozinhas?\b/, label: 'Cozinha' },
    { pattern: /\bpizzarias?\b/, label: 'Pizzaria' },
    { pattern: /\bhamburguerias?\b/, label: 'Hamburgueria' },
    { pattern: /\blanchonetes?\b/, label: 'Lanchonete' },
    { pattern: /\b(?:padarias?|confeitarias?)\b/, label: 'Padaria / Confeitaria' },
    { pattern: /\b(?:industrias?|galp(?:ao|oes)|fabricas?)\b/, label: 'Indústria / Galpão' },
    { pattern: /\blaboratorios?\b/, label: 'Laboratório' },
    { pattern: /\b(?:comercios?|lojas?|shoppings?)\b/, label: 'Comércio / Loja' }
  ];

  const nonCityWords = new Set([
    'inox', 'aco', 'galvanizada', 'galvanizado', 'chapa', 'breve', 'geral', 'metros', 'metro',
    'restaurante', 'cozinha', 'lanchonete', 'casa', 'sp', 'orcamento', 'parede', 'ilha'
  ]);

  let equipList = [];
  const assuntoSet = new Set();

  for (let i = 0; i < fullHistory.length; i++) {
    const entry = fullHistory[i];
    if (!entry || entry.role !== 'user' || !entry.text) continue;

    const rawMsg = String(entry.text);
    const norm = normalizeText(rawMsg);

    // Captura indicação (ex.: "O Sérgio passou seu contato") mesmo quando seguida de outras perguntas
    const indicStopWords = new Set(['ele', 'ela', 'eles', 'elas', 'um', 'uma', 'amigo', 'amiga', 'cliente', 'conhecido', 'conhecida', 'alguem', 'pessoal', 'empresa', 'parceiro', 'arquiteto', 'engenheiro', 'me', 'seu', 'teu', 'o', 'a']);
    const mIndic1 = rawMsg.match(/(?:^|[,.;!\s])(?:(?:o|a)\s+)?([A-ZÀ-Úa-zà-ú]{3,20})\s+(?:que\s+)?(?:me\s+)?(?:passou|passaram|indicou|recomendou)\s+(?:o\s+)?(?:seu|teu|esse)?\s*(?:contato|numero|whatsapp)?/i);
    const mIndic2 = rawMsg.match(/indicac[aã]o\s+d[eo]\s+([A-ZÀ-Úa-zà-ú]{3,20})/i);
    const rawReferrer = (mIndic1 && mIndic1[1]) || (mIndic2 && mIndic2[1]) || '';
    if (rawReferrer) {
      const normRef = normalizeText(rawReferrer);
      if (!indicStopWords.has(normRef) && !NON_NAME_WORDS.has(normRef)) {
        ctx.indicacao = rawReferrer.charAt(0).toUpperCase() + rawReferrer.slice(1).toLowerCase();
      }
    }

    // Registra tópicos adicionais discutidos na conversa
    if (/\b(?:prazo|quanto tempo|quando envia|quando manda)\b.*\b(?:orcamento|proposta|cotacao)\b|\bprazo\b/.test(norm)) {
      assuntoSet.add('prazo de envio da proposta');
    }
    if (/\b(?:pagamento|pix|boleto|cartao|parcelamento)\b/.test(norm)) {
      assuntoSet.add('formas de pagamento');
    }
    if (/\b(?:nbr|14518|\bart\b|vigilancia|anvisa|bombeiro|laudo)\b/.test(norm)) {
      assuntoSet.add('normas técnicas ABNT NBR 14518 e ART');
    }
    if (/\b(?:instalacao|instalar|entrega)\b/.test(norm)) {
      assuntoSet.add('instalação e entrega');
    }
    if (/\b(?:manutencao|limpeza|conserto|reparo)\b/.test(norm)) {
      assuntoSet.add('manutenção técnica');
    }
    if (/\b(?:visita|vistoria|medicao)\b/.test(norm)) {
      assuntoSet.add('visita técnica');
    }
    if (/\b(?:material|inox|304|430|galvanizad|acabamento)\b/.test(norm)) {
      assuntoSet.add('materiais e acabamento em inox');
    }
    if (/\b(?:fumaca|cheiro|odor|filtro|lavador)\b/.test(norm)) {
      assuntoSet.add('controle de fumaça e odor');
    }

    if (isExplicitHumanRequest(norm) || /\bquando\s+(?:vai\s+)?instalar\b/.test(norm)) {
      ctx.lastAddedFields = [];
      continue;
    }

    const prevBotMsg = fullHistory.slice(0, i).reverse().find(m => m.role === 'assistant');
    const normPrevBot = normalizeText(prevBotMsg?.text || '');
    const addedInTurn = [];

    // 1. Subtipos e Equipamentos
    const turnEquip = [];
    if (/\bcoifas?\s+(?:de\s+)?parede\b/.test(norm)) {
      equipList = equipList.filter(e => e !== 'Coifa');
      turnEquip.push('Coifa de Parede');
    } else if (/\bcoifas?\s+(?:central|ilha|de\s+ilha)\b/.test(norm)) {
      equipList = equipList.filter(e => e !== 'Coifa');
      turnEquip.push('Coifa Central (Ilha)');
    } else if (/\bcoifas?\b/.test(norm) && !equipList.some(e => e.startsWith('Coifa'))) {
      turnEquip.push('Coifa');
    }

    if (/\b(?:exaustor(?:es)?|exaustao)\b/.test(norm)) turnEquip.push('Sistema de Exaustão');
    if (/\b(?:dutos?|tubulacao)\b/.test(norm)) turnEquip.push('Dutos / Tubulação');
    if (/\b(?:ventilacao|insuflamento|renovacao\s+de\s+ar)\b/.test(norm)) turnEquip.push('Ventilação Mecânica');
    if (/\b(?:climatizacao|ar[\s-]condicionado)\b/.test(norm)) turnEquip.push('Climatização');
    if (/\blavador(?:es)?(?:\s+de\s+(?:gases|fumaca|ar|odor))?\b/.test(norm)) turnEquip.push('Lavador de Gases');
    if (/\bfiltros?\b/.test(norm)) turnEquip.push('Filtros / Elementos Filtrantes');
    if (/\b(?:manutencao|limpeza\s+tecnica|conserto|reparo)\b/.test(norm)) turnEquip.push('Manutenção Técnica');
    if (/\b(?:laudo|art|projeto\s+tecnico)\b/.test(norm)) turnEquip.push('Projeto / Laudo Técnico');
    if (/\b(?:sistema\s+(?:todo|completo|inteiro)|tudo\s+completo|kit\s+completo|instalacao\s+completa|projeto\s+completo)\b/.test(norm) && turnEquip.length === 0) {
      turnEquip.push('Sistema Completo de Exaustão');
    }

    if (turnEquip.length > 0) {
      equipList = Array.from(new Set([...equipList, ...turnEquip]));
      ctx.equipamento = equipList.join(' + ');
      addedInTurn.push(...turnEquip);
    }

    // 1b. Material
    if (/\b(?:aco\s+)?inox(?:idavel)?\s*304\b/.test(norm)) {
      ctx.material = 'Aço Inox 304';
      addedInTurn.push(ctx.material);
    } else if (/\b(?:aco\s+)?inox(?:idavel)?\s*430\b/.test(norm)) {
      ctx.material = 'Aço Inox 430';
      addedInTurn.push(ctx.material);
    } else if (/\b(?:aco\s+)?inox(?:idavel)?\b/.test(norm)) {
      ctx.material = 'Aço Inox';
      addedInTurn.push(ctx.material);
    } else if (/\b(?:chapa\s+)?galvanizad[ao]\b/.test(norm)) {
      ctx.material = 'Chapa Galvanizada';
      addedInTurn.push(ctx.material);
    }

    // 2. Ambiente
    for (const rule of envRules) {
      if (rule.pattern.test(norm)) {
        ctx.ambiente = rule.label;
        addedInTurn.push(rule.label);
        break;
      }
    }

    // 3. Medidas / Dimensões
    const pairedMeasureRegex = /\b(\d+(?:[.,]\d+)?)\s*(metros?|metro|m|cm|mm)?(?:\s+de\s+(?:largura|comprimento|profundidade|altura|frente))?\s*,?\s*(?:x|\*|por)\s*(\d+(?:[.,]\d+)?)\s*(metros?|metro|m|cm|mm)?(?:\s+de\s+(?:largura|comprimento|profundidade|altura|frente))?(?:\s*,?\s*(?:x|\*|por)\s*(\d+(?:[.,]\d+)?)\s*(metros?|metro|m|cm|mm)?)?/gi;
    // Exige qualificador dimensional ao aceitar conectores ", com" ou "e" (ex.: "2 de comprimento, com 2 de largura")
    const qualifiedMeasureRegex = /\b(\d+(?:[.,]\d+)?)\s*(metros?|metro|m|cm|mm)?\s+de\s+(?:largura|comprimento|profundidade|altura|frente)\s*(?:,\s*(?:com\s+|e\s+)?|\s+(?:x|\*|por|com|e)\s+)(\d+(?:[.,]\d+)?)\s*(metros?|metro|m|cm|mm)?(?:\s+de\s+(?:largura|comprimento|profundidade|altura|frente))?(?:\s*(?:,\s*(?:com\s+|e\s+)?|\s+(?:x|\*|por|com|e)\s+)(\d+(?:[.,]\d+)?)\s*(metros?|metro|m|cm|mm)?\s*(?:de\s+(?:largura|comprimento|profundidade|altura|frente))?)?/gi;
    const singleUnitMeasureRegex = /\b\d+(?:[.,]\d+)?\s*(?:metros?\s*(?:quadrados)?|m2|m²|m3\/h|m³\/h|cm|mm|m)\b/gi;

    const rawPairedMatches = [...rawMsg.matchAll(pairedMeasureRegex)];
    const pairedMatches = rawPairedMatches.length > 0 ? rawPairedMatches : [...rawMsg.matchAll(qualifiedMeasureRegex)];
    if (pairedMatches.length > 0) {
      const formattedPairs = pairedMatches.map(match => {
        const full = match[0].trim();
        const [rawA, uA, rawB, uB, rawC, uC] = [match[1], match[2], match[3], match[4], match[5], match[6]];
        const numA = parseFloat(rawA.replace(',', '.'));
        const numB = parseFloat(rawB.replace(',', '.'));
        const numC = rawC ? parseFloat(rawC.replace(',', '.')) : null;
        const normUnit = u => {
          if (!u) return '';
          const lu = u.toLowerCase();
          return lu.startsWith('metro') ? 'm' : lu;
        };
        const nuA = normUnit(uA);
        const nuB = normUnit(uB);
        const nuC = normUnit(uC);

        // Regra mista: ex. "1 de largura por 60 de profundidade" ou "1metro por 60" -> "1m x 60cm"
        const looksLikeMetersByCm =
          !rawC &&
          !Number.isNaN(numA) && !Number.isNaN(numB) &&
          numA > 0 && numA < 10 &&
          (!nuA || nuA === 'm') &&
          numB >= 20 && numB < 100 &&
          (!nuB || nuB === 'cm');

        if (looksLikeMetersByCm) {
          return `${rawA}m x ${rawB}cm`;
        }

        const hasQualifiers = /\bde\s+(?:largura|comprimento|profundidade|altura|frente)\b/i.test(full) || /\bpor\b/i.test(full) || Boolean(nuA);
        if (!hasQualifiers && (nuB || nuC)) {
          return full.replace(/\s+/g, full.includes(' ') ? ' ' : '').trim();
        }

        const maxVal = Math.max(numA || 0, numB || 0, numC || 0);
        const finalUnit = nuC || nuB || nuA || (maxVal >= 100 ? 'mm' : 'm');
        const dims = [rawA, rawB];
        if (rawC) dims.push(rawC);
        return `${dims.join('x')} ${finalUnit}`;
      });
      ctx.medidas = formattedPairs.join(', ');
      addedInTurn.push(ctx.medidas);
    } else {
      const unitMatches = rawMsg.match(singleUnitMeasureRegex);
      if (unitMatches && unitMatches.length > 0) {
        ctx.medidas = unitMatches.map(m => m.trim()).join(', ');
        addedInTurn.push(ctx.medidas);
      }
    }

    if (
      !ctx.medidas &&
      normPrevBot.includes('medida') &&
      /\b(?:nao\s+sei|nao\s+tenho|ainda\s+nao|sem\s+medida|precisa\s+medir|nao\s+tirei)\b/.test(norm)
    ) {
      ctx.medidas = 'medidas a confirmar';
      addedInTurn.push(ctx.medidas);
    }

    // 4. Localidade / Cidade
    let matchedCitySlug = null;
    for (const [slug, proper] of KNOWN_CITIES) {
      const cityRe = new RegExp(`\\b${slug}\\b`);
      if (cityRe.test(norm)) {
        ctx.localidade = proper;
        matchedCitySlug = slug;
        addedInTurn.push(proper);
        break;
      }
    }
    if (!matchedCitySlug) {
      const cityPattern = /(?:sou\s+d[eo]|estou\s+em|aqui\s+em|fica\s+em|cidade\s*(?:de|:)\s*|regiao\s+de)\s+([A-ZÀ-Úa-zà-ú]{3,20}(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÀ-Úa-zà-ú]{2,20}){0,2})/i;
      const mCity = rawMsg.match(cityPattern);
      if (mCity && mCity[1]) {
        const candidate = mCity[1].trim().replace(/[.,!?]+$/, '');
        if (!nonCityWords.has(normalizeText(candidate))) {
          ctx.localidade = candidate;
          addedInTurn.push(candidate);
        }
      }
    }

    // 4b. Bairro
    const bairroPattern = /(?:(?:o\s+|no\s+)?bairro\s+(?:e|é|de|do|da)?\s*)([A-ZÀ-Úa-zà-ú]{2,20}(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÀ-Úa-zà-ú]{2,20}){0,2})/i;
    const mBairro = rawMsg.match(bairroPattern);
    if (mBairro && mBairro[1]) {
      const cleanBairro = mBairro[1].trim().replace(/[.,!?]+$/, '');
      const normB = normalizeText(cleanBairro);
      if (cleanBairro && !['voce', 'qual', 'cidade', 'local', 'sua', 'seu', 'aqui'].includes(normB)) {
        ctx.bairro = cleanBairro
          .split(/\s+/)
          .map(w => ['da', 'de', 'do', 'dos', 'das'].includes(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        addedInTurn.push(ctx.bairro);
      }
    }

    // 5. Nome do Cliente (com prefixo explícito OU resposta direta curta quando perguntado — nunca de perguntas ou frases de intenção!)
    const namePattern = /(?:meu\s+nome\s+[eé]|me\s+chamo|aqui\s+[eé]\s+(?:o|a)|sou\s+(?:o|a))\s+([A-ZÀ-Úa-zà-ú]{2,20}(?:\s+[A-ZÀ-Úa-zà-ú]{2,20})?)/i;
    const mName = rawMsg.match(namePattern);
    if (mName && mName[1]) {
      const candidateTokens = mName[1]
        .trim()
        .replace(/[.,!?]+$/, '')
        .split(/\s+/)
        .filter(tok => {
          const nt = normalizeText(tok);
          return nt === 'michel' || !NON_NAME_WORDS.has(nt);
        });
      if (candidateTokens.length > 0) {
        ctx.nomeCliente = candidateTokens
          .map(tok => tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase())
          .join(' ');
        addedInTurn.push(ctx.nomeCliente);
      }
    } else {
      const normWords = norm.split(' ').filter(Boolean);
      const isQuestionOrControl =
        rawMsg.includes('?') ||
        normWords.some(w => QUESTION_OR_CONTROL_WORDS.has(w));

      const isGreetingAddressedToMichel =
        hasGreetingPhrase(norm) &&
        /\b(?:oi|ola|bom dia|boa tarde|boa noite|tudo bem|tudo bom)\s+michel\b/.test(norm);

      const botAskedName =
        normPrevBot.includes('como posso te chamar') ||
        normPrevBot.includes('qual seu nome') ||
        normPrevBot.includes('qual e o seu nome') ||
        normPrevBot.includes('seu nome') ||
        normPrevBot.includes('com quem eu falo');
      const hasIntentionVerb = normWords.some(w => INTENTION_OR_ACTION_WORDS.has(w));

      if (!isQuestionOrControl && !isGreetingAddressedToMichel && botAskedName && normWords.length <= 3 && !hasIntentionVerb) {
        const rawTokens = rawMsg
          .replace(/[^\wÀ-Úà-ú\s]/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        const remainingNameTokens = rawTokens.filter(tok => {
          const nt = normalizeText(tok);
          if (!nt || nt.length < 2 || /\d/.test(nt)) return false;
          if (matchedCitySlug && matchedCitySlug.split(' ').includes(nt)) return false;
          return !NON_NAME_WORDS.has(nt);
        });

        if (remainingNameTokens.length >= 1 && remainingNameTokens.length <= 2) {
          ctx.nomeCliente = remainingNameTokens
            .map(tok => tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase())
            .join(' ');
          addedInTurn.push(ctx.nomeCliente);
        }
      }
    }

    ctx.lastAddedFields = addedInTurn;
  }

  ctx.historicoAssuntos = Array.from(assuntoSet);
  return ctx;
}

function pickUnusedVariation(candidates, prevMessages = []) {
  const valid = candidates.map(c => String(c || '').trim()).filter(Boolean);
  if (valid.length === 0) return '';
  const prevNorms = (Array.isArray(prevMessages) ? prevMessages : [])
    .filter(m => m && m.role === 'assistant')
    .map(m => normalizeText(m.text));
  const prevSet = new Set(prevNorms);
  const unused = valid.find(c => {
    const nc = normalizeText(c);
    if (prevSet.has(nc)) return false;
    if (nc.length >= 18 && prevNorms.some(p => p.startsWith(nc.slice(0, 18)))) return false;
    return true;
  });
  if (unused) return unused;
  const lastNorm = prevNorms[prevNorms.length - 1] || '';
  return valid.find(c => normalizeText(c) !== lastNorm) || valid[0];
}

/**
 * Gera a mensagem humanizada de lembrete/retorno após 48h sem resposta,
 * lembrando do último assunto e perguntando se o atendimento já foi resolvido.
 * @param {Array<{role: string, text: string}>} history
 * @returns {string}
 */
export function buildFollowUpMessage(history = []) {
  const safeHistory = Array.isArray(history) ? history : [];
  const ctx = extractConversationContext(safeHistory);
  const nomeSuffix = ctx.nomeCliente ? `, ${ctx.nomeCliente}` : '';

  const summaryAlreadySent = safeHistory.some(m => {
    if (!m || m.role !== 'assistant') return false;
    const nt = normalizeText(m.text);
    return nt.includes('anotei tudo certinho aqui') || nt.includes('ja deixei seu pedido organizado');
  });

  const hasTechSubject = Boolean(
    ctx.equipamento ||
    ctx.ambiente ||
    (ctx.medidas && ctx.medidas !== 'medidas a confirmar')
  );

  let assuntoResumo = '';
  if (hasTechSubject) {
    const parts = [];
    if (ctx.equipamento) {
      parts.push(`${ctx.equipamento.toLowerCase()}${ctx.material ? ` (${ctx.material.toLowerCase()})` : ''}`);
    }
    if (ctx.ambiente) {
      parts.push(ctx.equipamento ? `para ${ctx.ambiente.toLowerCase()}` : ctx.ambiente.toLowerCase());
    }
    if (ctx.medidas && ctx.medidas !== 'medidas a confirmar') {
      parts.push(`(${ctx.medidas})`);
    }
    if (ctx.localidade) {
      parts.push(`em ${ctx.localidade}`);
    }
    assuntoResumo = parts.join(' ').trim();
  } else {
    const recentUserTexts = [...safeHistory]
      .filter(m => m && m.role === 'user' && m.text && m.text !== '[AUDIO_INAUDIVEL]')
      .slice(-5)
      .reverse();

    const topicRules = [
      { re: /\b(?:lavador|fumaca|odor|cheiro)\b/, label: 'lavador de gases e controle de fumaça' },
      { re: /\b(?:manutencao|limpeza|conserto|reparo|assistencia|motor|barulho)\b/, label: 'manutenção e assistência técnica' },
      { re: /\b(?:instalacao|instalar|montagem)\b/, label: 'instalação de equipamentos' },
      { re: /\b(?:visita|vistoria|medicao)\b/, label: 'visita técnica' },
      { re: /\b(?:projeto|laudo|art|nbr\s*14518)\b/, label: 'projeto e adequação técnica' },
      { re: /\b(?:duto|tubulacao|chamine)\b/, label: 'sistema de dutos e exaustão' },
      { re: /\b(?:coifa)\b/, label: 'coifa e exaustão' },
      { re: /\b(?:exaustor|exaustao|ventilacao)\b/, label: 'exaustão e ventilação' },
      { re: /\b(?:orcamento|cotacao|proposta|preco|valor)\b/, label: 'orçamento de exaustão' }
    ];

    for (const msg of recentUserTexts) {
      const nt = normalizeText(msg.text);
      const hit = topicRules.find(rule => rule.re.test(nt));
      if (hit) {
        assuntoResumo = hit.label;
        break;
      }
    }
    if (!assuntoResumo) {
      assuntoResumo = 'exaustão e ventilação';
    }
    if (ctx.localidade) {
      assuntoResumo = `${assuntoResumo} em ${ctx.localidade}`;
    }
  }

  let message;
  if (summaryAlreadySent) {
    message = `${getTimeGreeting()}${nomeSuffix}, tudo bem? Aqui é o Engº Michel P.G. Monge.\n\nEstou passando para dar um retorno sobre o nosso último assunto (${assuntoResumo}) e perguntar se o seu atendimento já foi resolvido ou se ficou alguma dúvida sobre o orçamento. Se precisar ajustar algum detalhe ou dar andamento, é só me chamar por aqui!`;
  } else if (hasTechSubject) {
    message = `${getTimeGreeting()}${nomeSuffix}, tudo bem? Aqui é o Engº Michel P.G. Monge.\n\nEstou passando para lembrar do nosso último assunto sobre ${assuntoResumo} e perguntar se o seu atendimento já foi resolvido ou se você ainda precisa daquele orçamento. Se quiser retomar, é só me mandar os detalhes que faltavam por aqui!`;
  } else {
    message = `${getTimeGreeting()}${nomeSuffix}, tudo bem? Aqui é o Engº Michel P.G. Monge.\n\nEstou passando para dar um retorno sobre o nosso último assunto (${assuntoResumo}) e perguntar se o seu atendimento já foi resolvido ou se ainda posso te ajudar com alguma dúvida ou orçamento. Qualquer coisa, estou à disposição por aqui!`;
  }

  return stripEmojis(message);
}

/**
 * Classifica se a mensagem questiona o assunto da conversa anterior ou o andamento
 * de uma cotação / orçamento já solicitado.
 */
function classifySubjectOrStatusQuery(userMessage) {
  const normMsg = normalizeText(userMessage);
  if (!normMsg) {
    return { isQuery: false, asksConversationSubject: false, asksQuoteStatus: false };
  }

  const hasMeasurements = /\b\d+(?:[.,]\d+)?\s*(?:x|m2|m²|mm|cm|m\b|metros?)\b/.test(normMsg);
  if (hasMeasurements) {
    return { isQuery: false, asksConversationSubject: false, asksQuoteStatus: false };
  }

  const asksConversationSubject =
    /\b(?:o\s+que|oq)\b.*\b(?:conversamos|falamos|tratamos|combinamos|discutimos|estavamos\s+falando|eu\s+pedi|te\s+pedi)\b/.test(normMsg) ||
    /\b(?:qual\s+(?:foi|era|e)|me\s+(?:diz|fala|diga)\s+(?:qual\s+e\s+)?o)\s+(?:o\s+)?assunto\b/.test(normMsg) ||
    /\b(?:sobre\s+o\s+assunto|sobre\s+(?:esse|meu|nosso)\s+assunto|(?:pesquis\w*|pux\w*|olh\w*|verific\w*|confir\w*)\b.*\b(?:conversa|historico))\b/.test(normMsg) ||
    /\b(?:sobre\s+o\s+que|do\s+que)\b.*\b(?:conversamos|falamos|estavamos\s+falando|tratamos|se\s+trata)\b/.test(normMsg) ||
    /\b(?:apaguei|perdi|limpei|sumiu|deletei)\b.*\b(?:historico|conversa|conversas|mensagens|chat)\b/.test(normMsg) ||
    /\b(?:consegue|pode|poderia|da\s+pra)\s+(?:me\s+)?(?:relembrar|lembrar|dizer\s+o\s+assunto|resumir)\b/.test(normMsg) ||
    /\b(?:me\s+lembra|me\s+relembra|me\s+recorda|lembra\s+do\s+meu\s+caso|resumo\s+da\s+conversa|ultima\s+conversa|ultima\s+vez\s+que\s+(?:falamos|conversamos))\b/.test(normMsg);

  const asksQuoteStatus =
    /\b(?:solicitei|pedi|fiz|mandei|enviei|falamos\s+de)\s+(?:um\s+|uma\s+|o\s+|a\s+)?(?:orcamento|cotacao|proposta)\b/.test(normMsg) ||
    /\b(?:como\s+(?:esta|ta|anda|ficou)|qual\s+(?:o\s+)?(?:status|andamento)|tem\s+novidade|alguma\s+novidade|ja\s+conseguiu|conseguiu\s+(?:fazer|calcular|ver|montar|fechar)|ficou\s+pronto)\b.*\b(?:orcamento|cotacao|proposta|levantamento)\b/.test(normMsg) ||
    /\b(?:orcamento|cotacao|proposta)\b.*\b(?:como\s+(?:esta|ta|anda|ficou)|conseguiu\s+(?:fazer|calcular|ver|montar|fechar)|mais\s+cedo|ontem|outro\s+dia|essa\s+semana|semana\s+passada)\b/.test(normMsg) ||
    /\b(?:queria|gostaria\s+de|quero)\s+saber\s+(?:sobre|como\s+(?:esta|ta|anda))\s+(?:o\s+|a\s+)?(?:meu\s+|minha\s+)?(?:orcamento|cotacao|proposta)\b/.test(normMsg) ||
    /\b(?:voce|vc)\s+lembra\b.*\b(?:orcamento|cotacao|proposta|assunto|pedido|conversa)\b/.test(normMsg);

  return {
    isQuery: asksConversationSubject || asksQuoteStatus,
    asksConversationSubject,
    asksQuoteStatus
  };
}

/**
 * Indica rapidamente para o roteador de tempo se a mensagem pergunta sobre o assunto
 * da conversa ou andamento do orçamento/cotação (para resposta ágil).
 * @param {string} userMessage
 * @returns {boolean}
 */
export function isQuickSubjectOrStatusQuery(userMessage) {
  return classifySubjectOrStatusQuery(userMessage).isQuery;
}

/**
 * Pesquisa todo o histórico da conversa do cliente e responde em 1ª pessoa
 * com precisão técnica qual é o assunto, os dados capturados e a etapa atual.
 * @param {string} userMessage
 * @param {Array<{role: string, text: string}>} history
 * @param {string} [greetingPrefix]
 * @returns {{text: string, requestHuman: boolean, explicitHumanRequest: boolean, source: 'local'} | null}
 */
export function buildConversationSubjectResponse(userMessage, history = [], greetingPrefix = '') {
  const classification = classifySubjectOrStatusQuery(userMessage);
  if (!classification.isQuery) return null;

  const safeHistory = Array.isArray(history) ? history : [];
  const lastMsg = safeHistory[safeHistory.length - 1];
  const prevMessages =
    lastMsg && lastMsg.role === 'user' && normalizeText(lastMsg.text) === normalizeText(userMessage)
      ? safeHistory.slice(0, -1)
      : safeHistory;

  const ctx = extractConversationContext(prevMessages);
  const nomePrefixo = ctx.nomeCliente ? `${ctx.nomeCliente}! ` : '';
  const bairroSuffix = ctx.bairro ? ` (bairro ${ctx.bairro})` : '';
  const indicacaoSuffix = ctx.indicacao ? ` — atendimento iniciado por indicação do ${ctx.indicacao}` : '';

  const summaryAlreadySent =
    prevMessages.some(m => {
      if (!m || m.role !== 'assistant') return false;
      const nt = normalizeText(m.text);
      return nt.includes('anotei tudo certinho aqui') || nt.includes('ja deixei seu pedido organizado');
    }) ||
    Boolean(ctx.equipamento && ctx.medidas && ctx.localidade);

  const extraAssuntos = (ctx.historicoAssuntos || []).filter(Boolean);
  const extraTopicsNote = extraAssuntos.length > 0
    ? `, além dos detalhes sobre ${extraAssuntos.join(', ')}`
    : '';

  let variations;

  // Caso 1: Histórico já possui os dados completos do projeto/orçamento
  if (summaryAlreadySent || (ctx.equipamento && (ctx.medidas || ctx.ambiente) && ctx.localidade)) {
    const equipDesc = `${ctx.equipamento || 'Sistema de Exaustão'}${ctx.material ? ` (${ctx.material})` : ''}`;
    const completeParts = [equipDesc];
    if (ctx.ambiente) completeParts.push(`para ${ctx.ambiente}`);
    if (ctx.medidas) {
      completeParts.push(
        ctx.medidas === 'medidas a confirmar'
          ? 'com medidas a confirmar no local'
          : `nas medidas de ${ctx.medidas}`
      );
    }
    if (ctx.localidade) {
      completeParts.push(`em ${ctx.localidade}${bairroSuffix}`);
    }
    const resumoCompleto = `${completeParts.join(', ')}${indicacaoSuffix}`;

    if (classification.asksQuoteStatus && !classification.asksConversationSubject) {
      variations = [
        `${greetingPrefix}${nomePrefixo}Conferi aqui agora mesmo o seu histórico comigo! O nosso assunto é o seu orçamento de ${resumoCompleto}.\n\nSeus dados técnicos já estão todos registrados aqui na minha engenharia e estou finalizando o dimensionamento e o levantamento de custos para te entregar uma proposta técnica bem precisa. Meu prazo é de até 5 dias úteis, mas já estou priorizando o seu cálculo para te enviar o quanto antes por aqui! Quer acrescentar algum detalhe ao projeto?`,
        `${greetingPrefix}${nomePrefixo}Já localizei tudo aqui no seu atendimento! Estamos tratando da sua cotação de ${resumoCompleto}.\n\nJá estou com todas as suas medidas e especificações na bancada fazendo o cálculo técnico para fechar o valor certinho sem erro, e assim que concluir já te envio a proposta comercial completa neste WhatsApp. Ficou mais alguma dúvida técnica que eu possa te adiantar?`,
        `${greetingPrefix}${nomePrefixo}Verifiquei sua ficha completa aqui na minha engenharia! Seu pedido de ${resumoCompleto} já está em elaboração com todas as especificações técnicas em mãos.\n\nEstou fechando a planilha de fabricação e dimensionamento dentro do meu prazo de até 5 dias úteis e te mando a proposta detalhada por aqui mesmo assim que finalizar!`
      ];
    } else {
      variations = [
        `${greetingPrefix}${nomePrefixo}Claro! Pesquisei aqui na nossa conversa e te relembro todos os detalhes agora mesmo: o nosso assunto é o seu projeto e orçamento de ${resumoCompleto}${extraTopicsNote}.\n\nJá deixei todas essas informações técnicas anotadas aqui comigo para finalizar o cálculo da sua proposta comercial. Você gostaria de revisar alguma medida ou incluir mais algum item no orçamento?`,
        `${greetingPrefix}${nomePrefixo}Sem problemas, tenho tudo registrado aqui e te atualizo agora! Na nossa última conversa, tratamos do seu orçamento de ${resumoCompleto}${extraTopicsNote}.\n\nO seu pedido já está organizado aqui comigo na engenharia para o fechamento da proposta. Se precisar ajustar algum detalhe ou tirar qualquer dúvida, estou à disposição por aqui!`,
        `${greetingPrefix}${nomePrefixo}Conferi todo o nosso histórico para você! Estávamos tratando justamente da cotação de ${resumoCompleto}${extraTopicsNote}, com os dados já separados na minha bancada técnica para eu concluir seu orçamento.`
      ];
    }
  } else if (ctx.equipamento || ctx.ambiente || ctx.medidas || ctx.localidade || ctx.indicacao || extraAssuntos.length > 0) {
    // Caso 2: Histórico possui dados parciais do projeto/assunto
    const partialParts = [];
    if (ctx.equipamento) {
      partialParts.push(`um orçamento de ${ctx.equipamento}${ctx.material ? ` (${ctx.material})` : ''}`);
    } else {
      partialParts.push('um atendimento técnico e orçamento sob medida');
    }
    if (ctx.ambiente) partialParts.push(`para ${ctx.ambiente}`);
    if (ctx.medidas) {
      partialParts.push(
        ctx.medidas === 'medidas a confirmar'
          ? 'com medidas a confirmar no local'
          : `nas medidas de ${ctx.medidas}`
      );
    }
    if (ctx.localidade) partialParts.push(`em ${ctx.localidade}${bairroSuffix}`);
    if (ctx.indicacao) partialParts.push(`(atendimento iniciado por indicação do ${ctx.indicacao})`);
    if (extraAssuntos.length > 0) partialParts.push(`incluindo pontos sobre ${extraAssuntos.join(', ')}`);

    const resumoParcial = partialParts.join(' ');
    const faltam = [];
    if (!ctx.equipamento) faltam.push('qual equipamento você precisa (coifa, exaustor, duto...)');
    if (!ctx.ambiente) faltam.push('o tipo de ambiente');
    if (!ctx.medidas) faltam.push('as medidas aproximadas do espaço');
    if (!ctx.localidade) faltam.push('a sua cidade ou região');
    if (!ctx.nomeCliente) faltam.push('o seu nome');
    const faltamItens = faltam.length > 1
      ? `${faltam.slice(0, -1).join(', ')} e ${faltam[faltam.length - 1]}`
      : (faltam[0] || 'qualquer detalhe técnico adicional');

    variations = [
      `${greetingPrefix}${nomePrefixo}Conferi toda a nossa conversa aqui para te atualizar certinho! Estávamos tratando sobre ${resumoParcial}.\n\nPara eu concluir o dimensionamento técnico aqui na engenharia e já fechar o valor da sua proposta com precisão, só faltava você me informar ${faltamItens}. Se já tiver esses detalhes aí, pode me passar por aqui que já dou sequência imediata!`,
      `${greetingPrefix}${nomePrefixo}Claro, te relembro agora mesmo! No nosso último contato, conversamos sobre ${resumoParcial}.\n\nEu já deixei essa primeira parte anotada na sua ficha, e para finalizar o cálculo do orçamento só preciso que você me confirme ${faltamItens}. Quer me passar por aqui agora para eu já adiantar sua cotação?`,
      `${greetingPrefix}${nomePrefixo}Pesquisei no nosso histórico agora e o assunto registrado comigo é ${resumoParcial}.\n\nAssim que você me confirmar ${faltamItens}, eu já fecho o dimensionamento completo e sigo com a sua proposta comercial!`
    ];
  } else if (classification.asksQuoteStatus) {
    // Caso 3A: Pergunta sobre orçamento/cotação anterior sem histórico técnico registrado neste chat
    variations = [
      `${greetingPrefix}${nomePrefixo}Verifiquei aqui o histórico desta nossa conversa e vi que ainda não ficaram registradas as medidas e especificações técnicas do seu equipamento por aqui.\n\nPara eu localizar seu pedido na hora ou já fechar sua cotação agora mesmo com prioridade, me confirma por favor o seu nome, qual equipamento você precisa (coifa, exaustor, duto...) e as medidas aproximadas com a sua cidade!`,
      `${greetingPrefix}${nomePrefixo}Conferi aqui nas mensagens anteriores e ainda não constam os dados técnicos da sua cotação registrados neste número.\n\nMe passa rapidinho o seu nome e o que você pediu para orçar (tipo de equipamento, medidas aproximadas e cidade) que eu já confiro aqui na engenharia e te dou o retorno imediato!`,
      `${greetingPrefix}${nomePrefixo}Olhei todo o histórico deste WhatsApp aqui e não localizei ainda os detalhes da cotação (equipamento e medidas).\n\nSe você tiver falado por outro número ou preferir agilizar por aqui agora, me manda qual equipamento procura, o tipo de ambiente, medidas e sua cidade que eu já assumo seu orçamento na hora!`
    ];
  } else {
    // Caso 3B: Pergunta sobre o assunto sem histórico técnico registrado neste chat
    variations = [
      `${greetingPrefix}${nomePrefixo}Conferi aqui o nosso histórico e vi que tínhamos acabado de iniciar o contato, sem entrar ainda nas especificações técnicas do seu projeto.\n\nEu trabalho com projetos de engenharia, fabricação própria e instalação de coifas, sistemas completos de exaustão, lavadores de gases e ventilação sob medida. Me conta qual equipamento ou solução você está precisando aí no seu espaço que já te oriento agora mesmo!`,
      `${greetingPrefix}${nomePrefixo}Olhei aqui as nossas mensagens anteriores e tínhamos apenas trocado as boas-vindas iniciais, então ainda não tínhamos registrado os detalhes do que você precisa.\n\nMe fala se o seu assunto é orçamento de coifa, exaustor, dutos, lavador de gases ou manutenção técnica e como é o seu ambiente, que já retomamos daqui mesmo!`,
      `${greetingPrefix}${nomePrefixo}Pesquisei aqui na conversa e ainda não ficou nenhum item técnico anotado neste histórico. Pode me contar do que se trata o seu projeto ou dúvida na parte de exaustão e ventilação que eu mesmo já assumo e te ajudo com total precisão!`
    ];
  }

  const chosen = stripEmojis(pickUnusedVariation(variations, prevMessages));
  return {
    text: chosen,
    requestHuman: false,
    explicitHumanRequest: false,
    source: 'local'
  };
}

function detectSubjectForText(rawText, ctxForFallback = {}) {
  const norm = normalizeText(rawText);
  if (!norm) return null;

  const hasExplicitQuoteIntent = /\b(?:orcamento|orcar|cotacao|cotar|proposta|preco|valor)\b/.test(norm);
  const isMaintenanceTopic = /\b(?:manutencao|conserto|consertar|reparo|limpeza)\b/.test(norm);

  if (isMaintenanceTopic && !hasExplicitQuoteIntent) {
    return {
      category: 'manutencao',
      bare: 'manutenção do seu equipamento',
      sobre: 'sobre a manutenção do seu equipamento',
      de: 'da manutenção do seu equipamento',
      para: 'para a manutenção do seu equipamento'
    };
  }

  if (
    hasExplicitQuoteIntent ||
    /\b(?:coifa\w*|exaustor\w*|exaustao|duto\w*|ventilacao|lavador\w*)\b/.test(norm)
  ) {
    const bare = ctxForFallback.equipamento && ctxForFallback.equipamento !== 'Projeto / Laudo Técnico'
      ? `seu orçamento de ${ctxForFallback.equipamento}`
      : 'seu orçamento';
    return {
      category: 'orcamento',
      bare,
      sobre: `sobre o ${bare}`,
      de: `do ${bare}`,
      para: `para o ${bare}`
    };
  }

  if (/\b(?:instalacao|instalar|entrega\s+do\s+pedido)\b/.test(norm)) {
    return {
      category: 'instalacao',
      bare: 'sua instalação',
      sobre: 'sobre a sua instalação',
      de: 'da sua instalação',
      para: 'para a sua instalação'
    };
  }

  if (/\b(?:visita\s+tecnica|vistoria|medicao\s+no\s+local)\b/.test(norm)) {
    return {
      category: 'visita',
      bare: 'sua visita técnica',
      sobre: 'sobre a sua visita técnica',
      de: 'da sua visita técnica',
      para: 'para a sua visita técnica'
    };
  }

  if (/\b(?:laudo|\bart\b|nbr\s*14518)\b/.test(norm)) {
    return {
      category: 'projeto',
      bare: 'seu projeto técnico',
      sobre: 'sobre o seu projeto técnico',
      de: 'do seu projeto técnico',
      para: 'para o seu projeto técnico'
    };
  }

  if (/\b(?:nota\s+fiscal|\bnf\b|boleto|pagamento|fatura|cobranca|recibo|reembolso)\b/.test(norm)) {
    return {
      category: 'financeiro',
      bare: 'essa questão de pagamento e nota fiscal',
      sobre: 'sobre essa questão de pagamento e nota fiscal',
      de: 'dessa questão de pagamento e nota fiscal',
      para: 'para essa questão de pagamento e nota fiscal'
    };
  }

  if (/\b(?:fornecedor\w*|entrega\s+d[aeo]s?\s+chapa\w*|compra\s+de\s+material|insumo\w*|materia[\s-]prima)\b/.test(norm)) {
    return {
      category: 'fornecedor',
      bare: 'entrega e fornecimento de material',
      sobre: 'sobre a entrega e fornecimento de material',
      de: 'da entrega e fornecimento de material',
      para: 'para a entrega e fornecimento de material'
    };
  }

  if (/\b(?:reuniao|assembleia|condominio|alinhamento|pauta)\b/.test(norm)) {
    return {
      category: 'reuniao',
      bare: 'reunião',
      sobre: 'sobre a reunião',
      de: 'da reunião',
      para: 'para a reunião'
    };
  }

  if (/\b(?:contabilidade|contador|contrato\w*|documentacao|documento\w*|juridico)\b/.test(norm)) {
    return {
      category: 'documentacao',
      bare: 'documento e alinhamento',
      sobre: 'sobre o documento e alinhamento',
      de: 'do documento e alinhamento',
      para: 'para o documento e alinhamento'
    };
  }

  const explicitTopicMatch = String(rawText).match(/(?:falar\s+sobre|assunto\s+(?:[eé]|sobre)|referente\s+[aà]|a\s+respeito\s+d[eo]|tratar\s+(?:sobre|d[eo]))\s+([A-ZÀ-Úa-zà-ú0-9][A-ZÀ-Úa-zà-ú0-9\s]{2,34}?)(?=[.!?\n,;]|$)/i);
  if (explicitTopicMatch && explicitTopicMatch[1]) {
    const cleanTopic = explicitTopicMatch[1].trim().replace(/\s+(?:de|do|da|em|no|na|e)$/i, '');
    const normTopic = normalizeText(cleanTopic);
    const topicWords = normTopic.split(' ').filter(Boolean);
    const genericStopTopics = new Set([
      'isso', 'aquilo', 'este assunto', 'esse assunto', 'um assunto', 'algo',
      'voce', 'voces', 'mim', 'tudo', 'o que', 'oq', 'nada'
    ]);
    if (topicWords.length >= 1 && topicWords.length <= 5 && !genericStopTopics.has(normTopic)) {
      return {
        category: 'assunto_especifico',
        bare: cleanTopic,
        sobre: `sobre ${cleanTopic}`,
        de: `sobre ${cleanTopic}`,
        para: `para ${cleanTopic}`
      };
    }
  }

  return null;
}

/**
 * Identifica o assunto real falado pelo cliente na conversa para finalizar ou prometer retorno
 * estritamente dentro do contexto (sem inventar orçamento/proposta quando o assunto for apenas falar com você).
 */
function detectConversationSubjectSummary(history = [], userMessage = '') {
  const safeHistory = Array.isArray(history) ? history : [];
  const fullHistory = safeHistory.length > 0 ? safeHistory : (userMessage ? [{ role: 'user', text: userMessage }] : []);
  const ctx = extractConversationContext(fullHistory);

  const userRawList = fullHistory
    .filter(m => m && m.role === 'user' && m.text && m.text !== '[AUDIO_INAUDIVEL]')
    .map(m => String(m.text));
  if (userMessage && (!userRawList.length || normalizeText(userRawList[userRawList.length - 1]) !== normalizeText(userMessage))) {
    userRawList.push(String(userMessage));
  }

  // 1. Se a mensagem atual trouxe explicitamente um assunto, prioriza a análise dela
  if (userMessage) {
    const currentHit = detectSubjectForText(userMessage, ctx);
    if (currentHit) {
      return { ...currentHit, ctx };
    }
  }

  // 2. Caso contrário (ex.: fechamento "fico no aguardo", "obrigado", "tchau"), busca do mais recente para o mais antigo
  for (let i = userRawList.length - 1; i >= 0; i--) {
    const hit = detectSubjectForText(userRawList[i], ctx);
    if (hit) {
      return { ...hit, ctx };
    }
  }

  if (Boolean(ctx.equipamento || ctx.ambiente || ctx.medidas) && ctx.equipamento !== 'Projeto / Laudo Técnico') {
    const bare = ctx.equipamento ? `seu orçamento de ${ctx.equipamento}` : 'seu orçamento';
    return {
      category: 'orcamento',
      ctx,
      bare,
      sobre: `sobre o ${bare}`,
      de: `do ${bare}`,
      para: `para o ${bare}`
    };
  }

  return {
    category: 'geral',
    ctx,
    bare: null,
    sobre: null,
    de: null,
    para: null
  };
}

/**
 * Verifica interações instantâneas puras (< 5ms):
 * pedido de humano, despedidas, agradecimentos/confirmações rápidas e saudações (sem repetição).
 */
function getInstantInteractionResponse(userMessage, history = [], options = {}) {
  const normMsg = normalizeText(userMessage);
  if (!normMsg) return null;

  const custom = getCustomResponses();
  const tokens = normMsg.split(' ').filter(Boolean);
  const timeGreeting = getTimeGreeting();
  const prevMessages = Array.isArray(history) ? history.slice(0, -1) : [];
  const alreadyGreeted = prevMessages.some(m => m && m.role === 'assistant');

  if (String(userMessage || '').trim() === '[AUDIO_INAUDIVEL]' || normMsg === 'audio inaudivel') {
    const replyText = pickUnusedVariation([
      'O seu áudio ficou bem baixinho aqui pra mim, não consegui ouvir direito. Você consegue me mandar outro áudio ou escrever por aqui o que precisa?',
      'Não consegui escutar direito o seu áudio, cortou um pouco aqui. Pode mandar de novo ou me escrever por texto?'
    ], prevMessages);

    return {
      text: replyText,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // 1. Pedido explícito de atendimento humano
  if (isExplicitHumanRequest(normMsg)) {
    return {
      text: applyPlaceholders(custom.respostaHumano, prevMessages),
      requestHuman: true,
      explicitHumanRequest: true,
      source: 'local'
    };
  }

  const topicInfo = detectConversationSubjectSummary(history, userMessage);
  const ctx = topicInfo.ctx;
  const nomeSuffix = ctx.nomeCliente ? `, ${ctx.nomeCliente}` : '';

  // 2. Despedidas puras (referenciando o assunto real da conversa quando houver)
  const farewellWords = ['tchau', 'ate mais', 'ate logo', 'falou', 'bom final de semana', 'otimo dia', 'otima tarde', 'otima noite'];
  if (farewellWords.some(f => normMsg.includes(f)) && tokens.length <= 6) {
    let farewellText;
    if (topicInfo.category === 'orcamento') {
      farewellText = pickUnusedVariation([
        `Até mais${nomeSuffix}! Já deixei tudo anotado ${topicInfo.sobre} e te retorno em breve por aqui. Tenha um excelente dia!`,
        `Tchau${nomeSuffix}! Seguimos falando ${topicInfo.sobre}, qualquer dúvida é só me chamar. Tudo de bom!`
      ], prevMessages);
    } else if (topicInfo.sobre) {
      farewellText = pickUnusedVariation([
        `Até mais${nomeSuffix}! Já deixei registrado aqui ${topicInfo.sobre} e te retorno em breve. Tenha um excelente dia!`,
        `Tchau${nomeSuffix}! Qualquer outra dúvida ${topicInfo.sobre}, pode me chamar por aqui!`
      ], prevMessages);
    } else {
      farewellText = pickUnusedVariation([
        applyPlaceholders(custom.respostaDespedida, prevMessages),
        `Até logo${nomeSuffix}! Assim que puder já te retorno por aqui pra gente falar. Tenha um excelente dia!`
      ], prevMessages);
    }

    return {
      text: farewellText,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // 3. Aguardo de breve retorno, todos os tipos de agradecimentos e confirmações curtas/compostas
  const lastAssistantMsg = [...prevMessages].reverse().find(m => m && m.role === 'assistant');
  const lastAssistantNorm = normalizeText(lastAssistantMsg?.text || '');
  const isReplyToFollowUp =
    lastAssistantNorm.includes('perguntar se o seu atendimento ja foi resolvido') ||
    lastAssistantNorm.includes('lembrar do nosso ultimo assunto') ||
    lastAssistantNorm.includes('dar um retorno sobre o nosso ultimo assunto');

  if (isReplyToFollowUp) {
    const isAlreadyResolved =
      !/\b(?:ainda\s+nao|nao\s+(?:foi\s+)?resolv|nao\s+resolvi|nao\s+deu\s+certo|nao\s+recebi|ainda\s+preciso)\b/.test(normMsg) &&
      (
        /\b(?:ja\s+(?:foi\s+)?resolvido|ja\s+resolvi|ja\s+deu\s+(?:tudo\s+)?certo|ja\s+consegui\s+resolver|ja\s+fechei|nao\s+preciso\s+mais|ja\s+esta\s+resolvido|resolvido\s+sim|tudo\s+resolvido)\b/.test(normMsg) ||
        /^(?:sim|ja|tudo\s+certo|deu\s+certo\s+sim|resolvido)[.!?\s]*$/.test(normMsg)
      );

    if (isAlreadyResolved) {
      return {
        text: stripEmojis(
          `Que ótimo saber que já foi resolvido${nomeSuffix}! Fico muito feliz que tenha dado tudo certo por aí. Sempre que precisar de alguma coisa na parte de coifas, exaustão ou ventilação, pode contar comigo. Um excelente dia!`
        ),
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      };
    }

    const isNotResolvedYet =
      /\b(?:ainda\s+nao|nao\s+foi\s+resolvido|nao\s+resolvi|nao\s+deu\s+certo|ainda\s+preciso|quero\s+continuar|quero\s+retomar|pode\s+mandar|estou\s+aguardando|preciso\s+sim|falta\s+(?:o\s+orcamento|a\s+proposta|responder))\b/.test(normMsg) ||
      /^(?:nao|ainda\s+nao)[.!?\s]*$/.test(normMsg);

    const hasQuestionOrDetails =
      String(userMessage || '').includes('?') ||
      ctx.lastAddedFields.length > 0;

    if (isNotResolvedYet && !hasQuestionOrDetails) {
      const summaryAlreadySent = prevMessages.some(m => {
        if (!m || m.role !== 'assistant') return false;
        const nt = normalizeText(m.text);
        return nt.includes('anotei tudo certinho aqui') || nt.includes('ja deixei seu pedido organizado');
      });

      if (summaryAlreadySent) {
        return {
          text: stripEmojis(
            `Perfeito${nomeSuffix}! Já estou retomando aqui os dados do seu projeto de ${ctx.equipamento || 'exaustão'} para finalizar o cálculo e te enviar a proposta comercial o quanto antes. Qualquer detalhe extra que queira acrescentar, pode me mandar por aqui!`
          ),
          requestHuman: false,
          explicitHumanRequest: false,
          source: 'local'
        };
      }

      if (ctx.equipamento || ctx.ambiente || ctx.medidas || ctx.localidade) {
        let missingPrompt = 'Qual equipamento ou serviço você tá precisando (coifa, exaustor, lavador de gases...)?';
        if (ctx.equipamento) {
          if (!ctx.ambiente && !ctx.medidas) {
            missingPrompt = 'Pra eu calcular seu orçamento certinho, vai ser pra qual tipo de ambiente (cozinha residencial, restaurante...) e você já sabe mais ou menos as medidas?';
          } else if (!ctx.medidas) {
            missingPrompt = 'Você já sabe mais ou menos as medidas do local ou do equipamento?';
          } else if (!ctx.ambiente) {
            missingPrompt = 'Esse equipamento vai ser instalado em qual tipo de ambiente (residência, restaurante, cozinha industrial...)?';
          } else if (!ctx.localidade && !ctx.nomeCliente) {
            missingPrompt = 'Pra eu fechar seu orçamento certinho, qual é o seu nome e de qual cidade ou bairro você fala?';
          } else if (!ctx.localidade) {
            missingPrompt = 'E de qual cidade ou bairro você fala?';
          } else if (!ctx.nomeCliente) {
            missingPrompt = 'E como posso te chamar?';
          } else {
            missingPrompt = 'Pode me passar qualquer detalhe extra que tenha surgido para eu finalizar sua proposta!';
          }
        }
        return {
          text: stripEmojis(
            `Perfeito${nomeSuffix}! Vamos retomar o seu orçamento${ctx.equipamento ? ` de ${ctx.equipamento.toLowerCase()}` : ''} sim.\n\n${missingPrompt}`
          ),
          requestHuman: false,
          explicitHumanRequest: false,
          source: 'local'
        };
      }

      return {
        text: stripEmojis(
          `Perfeito${nomeSuffix}! Vamos retomar seu atendimento agora mesmo. Me conta o que você está precisando ou qual dúvida ficou pendente que já te ajudo por aqui!`
        ),
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      };
    }
  }

  const hasQuestionOrNewRequest =
    String(userMessage || '').includes('?') ||
    ctx.lastAddedFields.length > 0 ||
    /\b(?:qual|quais|quando|quanto|como|onde|quem|porque|por\s+que)\b/.test(normMsg) ||
    /\b(?:quero|queria|gostaria|preciso|orcar|fazer\s+um\s+orcamento|cotar)\b/.test(normMsg) ||
    /\b(?:faz(?:em)?|tem|aceita(?:m)?|emite(?:m)?|trabalha(?:m)?|fornece(?:m)?|atende(?:m)?|confirma|explica|informa|me\s+fala|me\s+diz)\b.*\b(?:instal\w*|manutenc\w*|garantia|pagamento|pix|boleto|cartao|visita|prazo|entrega|material|inox|nota\s+fiscal|desconto|coifa|exaust\w*|duto|lavador)\b/.test(normMsg);

  // 3A. Cliente diz que aguarda ou espera um breve retorno / proposta
  const waitReturnRegex = /\b(?:aguard(?:o|ando|arei)|fic(?:o|arei)\s+(?:no\s+aguardo|aguardando|esperando)|est(?:ou|arei)\s+(?:no\s+aguardo|aguardando|esperando)|(?:to|tamo)\s+(?:no\s+aguardo|aguardando)|vou\s+(?:aguardar|esperar)|esper(?:o|ando|arei)\s+(?:o\s+|um\s+|seu\s+|a\s+|pelo\s+|pela\s+)?(?:breve\s+)?(?:retorno|proposta|orcamento|cotacao|resposta|contato)|breve\s+retorno|no\s+aguardo)\b/;
  if (!hasQuestionOrNewRequest && tokens.length <= 16 && waitReturnRegex.test(normMsg)) {
    let waitCandidates;
    if (topicInfo.category === 'orcamento') {
      waitCandidates = [
        `Eu que agradeço pela confiança${nomeSuffix}! Já estou preparando tudo ${topicInfo.sobre} por aqui e te retorno o mais breve possível com a sua proposta. Qualquer dúvida até lá, é só me chamar!`,
        `Muito obrigado você pela atenção e confiança${nomeSuffix}! Já dei andamento no levantamento ${topicInfo.de} aqui e logo mais te envio o retorno certinho. Precisando, estou por aqui!`,
        `Agradeço demais pelo contato${nomeSuffix}! Pode deixar que já estou cuidando ${topicInfo.de} com atenção e te mando um breve retorno por aqui mesmo.`,
        `Obrigado você${nomeSuffix}! Já está tudo anotado comigo ${topicInfo.sobre} e assim que eu fechar a proposta já te chamo aqui. Tenha um ótimo dia!`
      ];
    } else if (topicInfo.sobre) {
      waitCandidates = [
        `Eu que agradeço pela confiança${nomeSuffix}! Já deixei tudo anotado ${topicInfo.sobre} e te retorno o mais breve possível por aqui. Qualquer dúvida até lá, é só me chamar!`,
        `Muito obrigado você pela atenção${nomeSuffix}! Já estou verificando tudo ${topicInfo.sobre} e logo mais te mando o retorno certinho por aqui!`
      ];
    } else {
      waitCandidates = [
        `Eu que agradeço pela atenção${nomeSuffix}! Já anotei sua mensagem aqui e te retorno o mais breve possível pra gente conversar. Qualquer coisa até lá, é só me chamar!`,
        `Muito obrigado você${nomeSuffix}! Assim que eu concluir aqui já te dou um retorno por aqui mesmo. Precisando, estou à disposição!`,
        `Combinado, agradeço pelo contato${nomeSuffix}! Logo mais já te retorno por aqui pra falarmos com calma.`,
        `Obrigado você${nomeSuffix}! Já vi seu recado aqui e em breve te chamo com o retorno. Tenha um ótimo dia!`
      ];
    }

    const replyText = pickUnusedVariation(waitCandidates, prevMessages);
    return {
      text: replyText,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // 3B. Todos os tipos de agradecimentos possíveis
  const thankRegex = /\b(?:obrigad[oa]s?|obrigadao|obrigadissim[oa]|brigad[oa]s?|brigadao|brigadinh[oa]|obg|obgd|obgda|obgdo|valeu|vlw|agradec(?:o|ido|ida|emos)|grat[oa]s?|gratidao|tks|thanks|thank\s+you|thx|deus\s+(?:te\s+|lhe\s+)?abencoe|fique\s+com\s+deus|fica\s+com\s+deus|tmj|tamo\s+junto|muito\s+gentil|gentileza\s+sua|muito\s+atencioso|excelente\s+atendimento|otimo\s+atendimento|parabens\s+pelo\s+atendimento|atendimento\s+nota\s+10)\b/;
  if (!hasQuestionOrNewRequest && tokens.length <= 16 && thankRegex.test(normMsg)) {
    let thankCandidates;
    if (topicInfo.category === 'orcamento') {
      thankCandidates = [
        `Eu que agradeço pelo contato e pela confiança${nomeSuffix}! Seguimos falando ${topicInfo.sobre} por aqui e logo te retorno. Sempre que precisar, pode contar comigo!`,
        `Por nada${nomeSuffix}, disponha sempre! Já deixei tudo encaminhado ${topicInfo.sobre} aqui comigo e qualquer dúvida adicional é só me chamar.`,
        `Imagina${nomeSuffix}, fico à disposição! Estou cuidando ${topicInfo.de} por aqui e te retorno em breve. Tudo de bom!`,
        `Eu que agradeço${nomeSuffix}! Qualquer outro detalhe que queira acrescentar ${topicInfo.sobre}, é só me mandar por aqui. Tenha um excelente dia!`
      ];
    } else if (topicInfo.sobre) {
      thankCandidates = [
        `Eu que agradeço pelo contato e pela confiança${nomeSuffix}! Já deixei tudo anotado ${topicInfo.sobre} e logo te retorno por aqui.`,
        `Por nada${nomeSuffix}, disponha sempre! Qualquer outra dúvida ${topicInfo.sobre}, é só me mandar mensagem aqui.`
      ];
    } else {
      thankCandidates = [
        `Eu que agradeço pelo contato e pela confiança${nomeSuffix}! Sempre que precisar de qualquer coisa, pode contar comigo por aqui.`,
        applyPlaceholders(custom.respostaDespedida, prevMessages),
        `Por nada${nomeSuffix}, disponha sempre! Qualquer outra dúvida ou detalhe que surgir, é só me mandar mensagem aqui.`,
        `Imagina${nomeSuffix}, fico à disposição! Precisando de mim, é só chamar por aqui. Tudo de bom!`
      ];
    }

    const replyText = pickUnusedVariation(thankCandidates, prevMessages);
    return {
      text: replyText,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // 3C. Confirmações curtas e compostas ("Certo", "Ok", "Entendi", "Show de bola", "Tudo certo", "Beleza")
  const quickConfirmRegex = /^(?:certo|ok|okay|entendi|entendido|ta\s+bom|tudo\s+certo|beleza|blz|combinado|perfeito|maravilha|show(?:\s+de\s+bola)?|tranquilo|fechado|fechou|otimo|joia)(?:\b|$)/;
  if (!hasQuestionOrNewRequest && tokens.length <= 8 && quickConfirmRegex.test(normMsg)) {
    let confirmCandidates;
    if (topicInfo.category === 'orcamento') {
      confirmCandidates = [
        `Combinado${nomeSuffix}! Já deixei tudo registrado ${topicInfo.sobre} e te retorno em breve por aqui.`,
        `Beleza${nomeSuffix}! Seguimos falando ${topicInfo.sobre} por aqui e qualquer novidade ou dúvida é só me chamar.`,
        `Perfeito${nomeSuffix}! Já estou cuidando ${topicInfo.de} e logo te dou um retorno por aqui.`
      ];
    } else if (topicInfo.sobre) {
      confirmCandidates = [
        `Combinado${nomeSuffix}! Já deixei registrado ${topicInfo.sobre} e te retorno em breve por aqui.`,
        `Beleza${nomeSuffix}! Qualquer outra dúvida ${topicInfo.sobre}, é só me chamar aqui.`
      ];
    } else {
      confirmCandidates = [
        applyPlaceholders(custom.respostaConfirmacao, prevMessages),
        'Beleza! Qualquer coisa que precisar ou quiser perguntar, é só me chamar aqui.',
        'Tranquilo! Fico por aqui se surgir mais alguma dúvida.'
      ];
    }

    const replyText = pickUnusedVariation(confirmCandidates, prevMessages);
    return {
      text: replyText,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // 4. Saudação pura (ou saudação de áudio com pequena sujeira de transcrição)
  const nonGreetingTokens = tokens.filter(t => t.length > 1 && !GREETING_FILLER_TOKENS.has(t));
  const hasAnyBusinessOrQuestion =
    String(userMessage || '').includes('?') ||
    tokens.some(t =>
      QUESTION_OR_CONTROL_WORDS.has(t) ||
      INTENTION_OR_ACTION_WORDS.has(t) ||
      /^(?:coifa|exaustor|exaustao|duto|dutos|lavador|inox|galvaniz\w*|filtro|orcamento|orcar|cotacao|preco|valor|pagamento|pix|boleto|cartao|garantia|manutencao|instalacao|visita|prazo|horario|audio|voz|norma|nbr|restaurante|cozinha|churrasqueira|empresa|catalogo)$/.test(t)
    );
  const isNoisyAudioGreeting =
    Boolean(options?.fromAudio) &&
    hasGreetingPhrase(normMsg) &&
    tokens.length <= 7 &&
    nonGreetingTokens.length <= 2 &&
    !hasAnyBusinessOrQuestion;

  if (hasGreetingPhrase(normMsg) && (nonGreetingTokens.length === 0 || isNoisyAudioGreeting)) {
    let replyText;
    if (!alreadyGreeted) {
      replyText = applyPlaceholders(custom.saudacao, prevMessages);
    } else if (
      normMsg.includes('tudo bem') ||
      normMsg.includes('tudo bom') ||
      normMsg.includes('como vai') ||
      normMsg.includes('tudo sim') ||
      normMsg.includes('e vc') ||
      normMsg.includes('e voce')
    ) {
      replyText = pickUnusedVariation([
        'Tudo ótimo por aqui, obrigado!\n\nE com você? Como posso te ajudar hoje?',
        applyPlaceholders(custom.saudacaoCurta, prevMessages),
        'Por aqui tá tudo joia! Pode me falar o que você precisa.'
      ], prevMessages);
    } else if (/\b(?:bom dia|boa tarde|boa noite)\b/.test(normMsg)) {
      replyText = pickUnusedVariation([
        `${timeGreeting}! Pode falar, tô por aqui.`,
        `${timeGreeting}! Como posso te ajudar hoje?`,
        applyPlaceholders(custom.saudacaoCurta, prevMessages)
      ], prevMessages);
    } else {
      replyText = pickUnusedVariation([
        applyPlaceholders(custom.saudacaoCurta, prevMessages),
        'Opa, tô por aqui! Pode me falar como posso te ajudar.',
        'Oi! Pode mandar sua dúvida ou o que precisa orçar que já te ajudo por aqui!'
      ], prevMessages);
    }

    return {
      text: replyText,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  return null;
}

/**
 * Responde perguntas específicas de negócio e dúvidas técnicas de engenharia
 * ANTES de entrar no fluxo de coleta de orçamento.
 */
function matchSpecificQuestion(normMsg, ctx, greetingPrefix, custom, prevMessages = []) {
  const nomeSaudacao = ctx.nomeCliente ? `${ctx.nomeCliente}, ` : '';
  const itemRef = ctx.equipamento ? `para ${ctx.equipamento}` : '';

  // -1. Pergunta de identidade ("Com quem eu falo?", "Quem tá falando?")
  const asksIdentity =
    !ctx.equipamento &&
    !ctx.medidas &&
    (
      /\b(?:com\s+quem\s+(?:eu\s+)?falo|quem\s+(?:fala|e\b|(?:esta|ta)\s+falando)|qual\s+(?:o\s+)?seu\s+nome|falo\s+com\s+(?:o\s+)?michel)\b/.test(normMsg) ||
      (/\b(?:quem|nome)\b/.test(normMsg) && /\b(?:falo|falando|atende|responde)\b/.test(normMsg))
    );
  if (asksIdentity) {
    const identityReply = greetingPrefix
      ? 'Aqui é o Engº Michel P.G. Monge falando! Como posso te ajudar hoje?'
      : 'Aqui é o próprio Engº Michel P.G. Monge falando com você! Como posso te ajudar?';
    return {
      text: `${greetingPrefix}${identityReply}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // -0.5. Pergunta sobre quais detalhes / informações precisa enviar para o orçamento
  const asksRequiredDetails =
    /\b(?:quais|que|tipo\s+de)\s+(?:detalhes?|informac(?:ao|oes)|dados)\b/.test(normMsg) ||
    /\bo\s+que\s+(?:voce\s+|vc\s+)?precisa\b(?:\s+(?:saber|de\s+detalhes?))?/.test(normMsg) ||
    /\bcomo\s+(?:faco\s+(?:para|pra)\s+orcar|pedir\s+orcamento|funciona\s+o\s+orcamento)\b/.test(normMsg);
  if (asksRequiredDetails) {
    const missingParts = [];
    if (!ctx.equipamento) missingParts.push('qual equipamento você precisa (coifa, exaustor, duto...)');
    if (!ctx.ambiente) missingParts.push('o tipo de ambiente (restaurante, cozinha residencial, área gourmet...)');
    if (!ctx.medidas) missingParts.push('as medidas aproximadas do local ou do equipamento');
    if (!ctx.localidade) missingParts.push('a cidade ou região da instalação');

    const replyBody = missingParts.length > 0 && (ctx.equipamento || ctx.ambiente || ctx.medidas || ctx.localidade)
      ? `Pra eu calcular seu orçamento certinho${itemRef ? ` ${itemRef}` : ''}, me ajuda bastante saber: ${missingParts.join(', ')}. Se tiver alguma foto ou vídeo curto do espaço, pode mandar por aqui também!`
      : 'Pra eu montar seu orçamento certinho, o principal que eu preciso saber é: qual equipamento ou serviço você procura (coifa, exaustor, duto...), em qual tipo de ambiente vai instalar, as medidas aproximadas e a sua cidade. Se tiver fotos ou vídeo do local e quiser mandar aqui, ajuda muito também!';

    return {
      text: `${greetingPrefix}${nomeSaudacao}${replyBody}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // -0.25. Pesquisa do assunto da conversa / relembrar histórico / status de orçamento solicitado
  const subjectOrStatusReply = buildConversationSubjectResponse(normMsg, prevMessages, greetingPrefix);
  if (subjectOrStatusReply) {
    return subjectOrStatusReply;
  }

  // 0. Instalação / Andamento / Entrega de Pedido
  const installTriggers = [
    'quando vai instalar', 'quando instala', 'agendar instalacao', 'data da instalacao',
    'status do pedido', 'andamento do pedido', 'meu pedido', 'minha coifa',
    'ja comprei', 'ja fechei', 'prazo de instalacao', 'prazo de fabricacao'
  ];
  if (installTriggers.some(t => normMsg.includes(t))) {
    return {
      text: `${greetingPrefix}${nomeSaudacao}${applyPlaceholders(custom.respostaInstalacao, prevMessages)}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // 0b. Catálogo / Produtos / Serviços
  const catalogTriggers = [
    'catalogo', 'quais servicos', 'quais produtos', 'o que voces fazem',
    'trabalham com o que', 'o que voces vendem', 'linha de produtos'
  ];
  if (catalogTriggers.some(t => normMsg.includes(t))) {
    return {
      text: `${greetingPrefix}${applyPlaceholders(custom.respostaCatalogo, prevMessages)}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // 0c. Manutenção / Limpeza Técnica / Conserto
  const manutencaoTriggers = [
    'manutencao', 'conserto', 'consertar', 'reparo',
    'limpeza de coifa', 'limpeza de duto', 'motor queimou',
    'parou de funcionar', 'nao liga', 'fazendo barulho'
  ];
  if (manutencaoTriggers.some(t => normMsg.includes(t))) {
    return {
      text: `${greetingPrefix}${applyPlaceholders(custom.respostaManutencao, prevMessages)}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // 0d. Fornecimento de Material e Serviço / Somente Mão de Obra
  const supplyTriggers = [
    'fornece material', 'fornecem material', 'fornece o material', 'fornecem o material',
    'material e servico', 'material e mao de obra', 'somente servico', 'so servico',
    'apenas servico', 'somente mao de obra', 'so mao de obra', 'fornece o equipamento',
    'equipamento e instalacao'
  ];
  const asksSupplyMode =
    supplyTriggers.some(t => normMsg.includes(t)) ||
    /\b(?:fornec\w*|trabalh\w*)\b.*\bmaterial\b.*\b(?:servico|mao de obra|instalac\w*)\b/.test(normMsg);
  if (asksSupplyMode) {
    return {
      text: `${greetingPrefix}${nomeSaudacao}Trabalho das duas formas! Posso fazer o pacote completo pra você (fabricação própria com todo o material e instalação) ou fornecer somente o equipamento ou serviço técnico, conforme o que for melhor pro seu projeto.\n\nQual equipamento ou serviço você tá precisando orçar?`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // A. Atendimento em Qualquer Horário / Disponibilidade Imediata
  const scheduleTriggers = [
    'atende hoje', 'atendem hoje', 'atendimento hoje', 'esta aberto', 'ta aberto',
    'funciona hoje', 'trabalha hoje', 'horario', 'horarios', 'funcionamento',
    'abre que horas', 'fecha que horas', 'sabado', 'domingo', 'feriado',
    'qualquer horario', '24 horas', '24h', 'atende agora', 'atende a noite',
    'atende de noite', 'atende de madrugada', 'atende fim de semana', 'atende final de semana',
    'pode falar', 'consegue falar', 'esta disponivel', 'ta disponivel',
    'esta atendendo', 'ta atendendo', 'esta por onde', 'ta por onde', 'esta por aqui', 'ta por aqui'
  ];
  const asksCanTalkNow =
    /\b(?:pode|consegue|da\s+pra)\s+(?:falar|conversar|me\s+atender)\b/.test(normMsg) ||
    /\b(?:esta|ta)\s+(?:por\s+onde|por\s+aqui|disponivel|online|atendendo|livre)\b/.test(normMsg);
  const asksAnyTimeSchedule =
    scheduleTriggers.some(t => normMsg.includes(t)) ||
    /\b(?:atend\w*|funcion\w*|trabalh\w*)\b.*\b(?:hoje|agora|noite|madrugada|domingo|sabado|feriado|fim\s+de\s+semana|qualquer\s+hora|qualquer\s+horario)\b/.test(normMsg);

  if (asksCanTalkNow) {
    const availText = pickUnusedVariation([
      `${greetingPrefix}${nomeSaudacao}Estou por aqui sim, pode falar! Faço atendimento por aqui em qualquer horário. Me conta o que você está precisando que já te ajudo agora mesmo!`,
      `${greetingPrefix}${nomeSaudacao}Claro, estou disponível por aqui agora mesmo! Atendo em São Paulo e região e também pelo WhatsApp em qualquer horário. O que você precisa ver ou orçar hoje?`,
      `${greetingPrefix}${nomeSaudacao}Pode falar sim, estou à disposição por aqui! Me diz como posso te ajudar hoje que já vemos isso na hora.`
    ], prevMessages);

    return {
      text: availText,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  if (asksAnyTimeSchedule) {
    const baseHorario = applyPlaceholders(custom.respostaHorario, prevMessages);
    const contextFollowup = ctx.equipamento
      ? `\n\nPode ficar tranquilo(a), ${nomeSaudacao}seu pedido ${itemRef} já está anotado aqui comigo pra eu continuar te atendendo.`
      : '';
    const scheduleReply = pickUnusedVariation([
      `${greetingPrefix}${baseHorario}${contextFollowup}`,
      `${greetingPrefix}Atendo aqui pelo WhatsApp em qualquer horário, inclusive à noite, fins de semana e feriados!${ctx.equipamento ? ` Inclusive seu pedido ${itemRef} já está aqui comigo.` : ''} Como posso te ajudar agora?`,
      `${greetingPrefix}Não tenho restrição de horário aqui no atendimento pelo WhatsApp! Pode mandar sua dúvida, fotos ou medidas a qualquer hora que já te respondo.`
    ], prevMessages);

    return {
      text: scheduleReply,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // B. Prazos (incluindo "Quando envia o orçamento ?", "QUANDO VC VAI MANDAR A PROPOSTA?", "quando você enviará o orçamento?")
  const deadlineTriggers = [
    'prazo', 'prazos', 'quanto tempo', 'demora', 'quando fica pronto', 'tempo de entrega',
    'tempo para', 'quando envia', 'quando manda', 'quando recebo', 'envia quando',
    'quanto tempo para enviar', 'quando sai'
  ];
  const asksDeadline =
    deadlineTriggers.some(t => normMsg.includes(t)) ||
    /\b(?:quando|que\s+dia|quanto\s+tempo|qual\s+(?:o\s+)?prazo|demora\s+quanto)\b.*\b(?:envi\w*|mand\w*|entreg\w*|receb\w*|fic\w*\s+pront\w*|sai\w*|proposta|orcamento|cotacao|retorno|resposta)\b/.test(normMsg) ||
    /\b(?:envi\w*|mand\w*|entreg\w*|receb\w*|sai\w*)\b.*\b(?:proposta|orcamento|cotacao)\b.*\b(?:quando|que\s+dia|quanto\s+tempo)\b/.test(normMsg);
  if (asksDeadline) {
    const basePrazo = applyPlaceholders(custom.respostaPrazo, prevMessages);
    const hasMedidasText = ctx.medidas && ctx.medidas !== 'medidas a confirmar' ? ` de ${ctx.medidas}` : '';
    const detailsNote = ctx.equipamento
      ? `\n\nComo você já informou ${ctx.equipamento}${hasMedidasText}, isso já adianta bastante o cálculo aqui da sua proposta.`
      : '';
    const cand1 = `${greetingPrefix}${nomeSaudacao}${basePrazo}${detailsNote}`;
    const cand2 = `${greetingPrefix}${nomeSaudacao}Como já deixei seu pedido anotado por aqui${ctx.equipamento ? ' para ' + ctx.equipamento : ''}${ctx.localidade ? ' em ' + ctx.localidade : ''}, meu prazo para enviar a proposta comercial é de até 5 dias úteis (geralmente consigo mandar até antes)!`;
    const cand3 = `${greetingPrefix}${nomeSaudacao}Fica tranquilo(a), o envio do seu orçamento segue no meu prazo de até 5 dias úteis e assim que eu fechar os cálculos te mando por aqui!`;
    const chosenPrazo = pickUnusedVariation([cand1, cand2, cand3], prevMessages);

    return {
      text: chosenPrazo,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // C. Visita Técnica / Medição no Local / Instalação / Região
  const visitTriggers = [
    'visita tecnica', 'visita no local', 'vem medir', 'faz medicao', 'medicao no local',
    'faz instalacao', 'fazem instalacao', 'instalam', 'instala', 'atendimento presencial',
    'atendimento online', 'onde voces ficam', 'qual cidade', 'atendem todo o brasil'
  ];
  if (visitTriggers.some(t => normMsg.includes(t))) {
    return {
      text: `${greetingPrefix}${applyPlaceholders(custom.respostaVisita, prevMessages)}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // D. Dúvidas Técnicas de Engenharia
  const materialQuestionTriggers = [
    'qual material', 'que material', 'qual o material', 'de que e feito',
    'de que e feita', 'qual material e feito', 'qual acabamento', 'qual o acabamento',
    'tipo de acabamento', 'acabamento da coifa', 'acabamento do inox'
  ];
  const asksMaterialComparison =
    materialQuestionTriggers.some(t => normMsg.includes(t)) ||
    (normMsg.includes('304') && normMsg.includes('430')) ||
    ((normMsg.includes('diferenca') || normMsg.includes('melhor') || normMsg.includes('qual usar') || normMsg.includes('vantagem')) &&
      (normMsg.includes('inox') || normMsg.includes('304') || normMsg.includes('430') || normMsg.includes('galvaniz')));

  if (asksMaterialComparison) {
    const alreadyExplainedAcabamento = prevMessages.some(m => {
      if (m.role !== 'assistant') return false;
      const nt = normalizeText(m.text);
      return nt.includes('acabamento escovado ou polido') || (nt.includes('acabamento') && (nt.includes('escovado') || nt.includes('polido') || nt.includes('304')));
    });

    if (alreadyExplainedAcabamento && normMsg.includes('acabamento') && !normMsg.includes('304') && !normMsg.includes('430')) {
      return {
        text: `${greetingPrefix}Como te falei logo acima, o acabamento é escovado ou polido de alto padrão (tanto no Aço Inox 304 quanto no 430)! Você já tem preferência por algum?`,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      };
    }

    return {
      text: `${greetingPrefix}${applyPlaceholders(custom.respostaMaterial, prevMessages)}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  if (
    normMsg.includes('nbr') ||
    normMsg.includes('14518') ||
    /\bart\b/.test(normMsg) ||
    normMsg.includes('laudo') ||
    normMsg.includes('vigilancia') ||
    normMsg.includes('anvisa') ||
    normMsg.includes('bombeiro') ||
    normMsg.includes('crea')
  ) {
    return {
      text: `${greetingPrefix}${applyPlaceholders(custom.respostaNormas, prevMessages)}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  const isShortLavadorEquipment =
    /\blavador\b/.test(normMsg) &&
    normMsg.split(' ').filter(Boolean).length <= 4 &&
    !normMsg.includes('?') &&
    !normMsg.includes('como') &&
    !normMsg.includes('funciona');

  if (
    !isShortLavadorEquipment &&
    (normMsg.includes('lavador de gases') || normMsg.includes('fumaca') || normMsg.includes('cheiro') || normMsg.includes('odor') || normMsg.includes('filtro inercial'))
  ) {
    return {
      text: `${greetingPrefix}${applyPlaceholders(custom.respostaFumacaOdor, prevMessages)}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // D1b. Dúvida se o atendente entende áudio / mensagem de voz
  const mentionsAudioOrVoice = /\b(?:audio|audios|mensagem de voz|mensagens de voz|voz)\b/.test(normMsg);
  const asksAudioSupport =
    /\b(?:consegue|conseguem|pode|posso|escuta|escutam|ouve|ouvem|entende|entendem|recebe|recebem|responde|respondem|ler|le|leem|aceita|aceitam)\b/.test(normMsg) ||
    normMsg.includes('mandar audio') ||
    normMsg.includes('enviar audio') ||
    normMsg.includes('mandar mensagem de voz') ||
    normMsg.includes('enviar mensagem de voz');
  const hasQuoteSpecInAudioMsg =
    Boolean(ctx.equipamento) ||
    Boolean(ctx.medidas) ||
    /\b(?:orcamento|coifa|exaustor|duto|lavador|manutencao)\b/.test(normMsg);

  if (mentionsAudioOrVoice && asksAudioSupport && !hasQuoteSpecInAudioMsg) {
    const replyText = pickUnusedVariation([
      'Consigo sim! Pode mandar áudio ou mensagem de voz tranquilo que eu escuto e já te respondo por aqui mesmo.',
      'Pode mandar áudio sim, sem problemas! Eu ouço certinho e já sigo seu atendimento por aqui.',
      'Com certeza! Se preferir mandar mensagem de voz em vez de digitar, pode mandar que eu entendo e te respondo por aqui.'
    ], prevMessages);

    return {
      text: `${greetingPrefix}${replyText}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // D2. Garantia
  const guaranteeTriggers = ['garantia', 'tem garantia', 'tempo de garantia'];
  if (guaranteeTriggers.some(g => normMsg.includes(g))) {
    return {
      text: `${greetingPrefix}${applyPlaceholders(custom.respostaGarantia, prevMessages)}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // D2b. Dúvida específica sobre composição da proposta (valor do serviço / mão de obra vs. material)
  const asksServiceVsMaterialCost =
    /\b(?:valor|custo|preco)\s+d[eo]\s+(?:servico|mao\s+de\s+obra|instalacao)\b/.test(normMsg) ||
    (/\bmaterial\b/.test(normMsg) && /\b(?:servico|mao\s+de\s+obra)\b/.test(normMsg) && /\b(?:valor|custo|preco|proposta)\b/.test(normMsg)) ||
    /\bproposta\s+so\s+mostra\b/.test(normMsg);
  const alsoAsksDiscount = /\b(?:desconto|a\s+vista)\b/.test(normMsg);

  if (asksServiceVsMaterialCost) {
    const nomeBang = ctx.nomeCliente ? `${ctx.nomeCliente}! ` : '';
    const discountPrefix = alsoAsksDiscount
      ? 'Sobre o pagamento à vista, consigo sim trabalhar uma condição especial com desconto pra você!\n\nQuanto a essa dúvida do '
      : 'Vi sua dúvida aqui sobre o ';
    const replyText = pickUnusedVariation([
      `${greetingPrefix}${nomeBang}${discountPrefix}valor do material e o custo do serviço na proposta: estou abrindo a planilha de engenharia do seu projeto aqui no computador para conferir os valores discriminados certinho e já te retorno em instantes!`,
      `${greetingPrefix}${nomeBang}Anotei sua pergunta sobre o valor do serviço e mão de obra! Estou finalizando uma conferência técnica aqui na planilha do seu orçamento para separar certinho o custo do serviço e do equipamento, e já retorno para você logo na sequência!`,
      `${greetingPrefix}${nomeBang}Recebi sua dúvida sobre a composição do valor do serviço! Já estou revisando os cálculos de instalação e mão de obra do seu projeto aqui no escritório e já te retorno em poucos minutos com tudo detalhado!`
    ], prevMessages);

    return {
      text: replyText,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // E. Formas de Pagamento / Nota Fiscal
  const payTriggers = ['pagamento', 'pagar', 'pix', 'cartao', 'credito', 'debito', 'boleto', 'parcela', 'transferencia', 'nota fiscal', 'cnpj'];
  if (payTriggers.some(p => normMsg.includes(p))) {
    if (alsoAsksDiscount) {
      return {
        text: `${greetingPrefix}${nomeSaudacao}Para pagamento à vista no Pix ou Transferência eu consigo sim trabalhar uma condição especial com desconto pra você! Além disso, também aceito boleto e cartão de crédito com emissão de Nota Fiscal certinho.\n\nColoco todas essas condições detalhadas na sua proposta!`,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      };
    }
    return {
      text: `${greetingPrefix}${applyPlaceholders(custom.respostaPagamento, prevMessages)}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  // E2. Pergunta direta de preço / valor ("QUAL O VALOR?", "quanto fica?", "qual o preço?")
  const asksDirectPrice =
    ctx.lastAddedFields.length === 0 &&
    /\b(?:qual\s+(?:e\s+)?o\s+(?:valor|preco)|quanto\s+(?:custa|fica|sai)|tem\s+(?:tabela|preco|valor|ideia\s+de\s+valor))\b/.test(normMsg);
  if (asksDirectPrice && ctx.equipamento) {
    if (ctx.medidas && ctx.localidade) {
      const medidasInfo = ctx.medidas === 'medidas a confirmar'
        ? 'com as informações que você já passou'
        : `das medidas informadas (${ctx.medidas})`;
      const priceText = pickUnusedVariation([
        `${greetingPrefix}${nomeSaudacao}Como eu fabrico tudo sob medida, o valor exato depende do cálculo técnico ${medidasInfo} para ${ctx.equipamento}. Já estou fechando esse levantamento pra te mandar tudo detalhado na sua proposta!`,
        `${greetingPrefix}${nomeSaudacao}Por ser fabricação sob medida, eu calculo o valor certinho em cima do dimensionamento técnico (${ctx.equipamento}${ctx.medidas && ctx.medidas !== 'medidas a confirmar' ? ', ' + ctx.medidas : ''}). Assim que eu finalizar o orçamento já te envio o valor fechado na proposta!`
      ], prevMessages);
      return {
        text: priceText,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      };
    }

    const missingForPrice = [];
    if (!ctx.ambiente) missingForPrice.push('o tipo de ambiente');
    if (!ctx.medidas) missingForPrice.push('as medidas aproximadas');
    if (!ctx.localidade) missingForPrice.push('sua cidade ou região');
    return {
      text: `${greetingPrefix}${nomeSaudacao}Como o trabalho é todo sob medida, o valor depende do dimensionamento técnico do seu projeto. Pra eu calcular certinho para ${ctx.equipamento}, me passa só ${missingForPrice.join(', ')} por favor!`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    };
  }

  return null;
}

/**
 * Detecta se a mensagem é apenas texto aleatório / incompreensível (gibberish)
 * sem estrutura reconhecível em português.
 */
function isGibberishInput(normMsg) {
  const tokens = String(normMsg || '').split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  if (/^\d+$/.test(normMsg)) return false;

  const isGibberishToken = tok => {
    if (tok.length <= 1) return false;
    if (/^\d+$/.test(tok)) return false;
    if (/^(?:ok|oi|vc|pq|tb|eh|hj|cm|mm|m2|m3|nf|art|pix)$/i.test(tok)) return false;
    if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(tok)) return true;
    if (/^(?:[bcdfghjklmnpqrstvwxz]+|asdf\w*|qwert\w*|zxcv\w*|blabla\w*|xyz|teste\d*)$/i.test(tok)) return true;
    if (!/[aeiou]/i.test(tok)) return true;
    return false;
  };

  const alphaTokens = tokens.filter(t => /[a-z]/.test(t));
  if (alphaTokens.length === 0) return false;

  const gibCount = alphaTokens.filter(isGibberishToken).length;
  if (gibCount === alphaTokens.length) return true;
  if (alphaTokens.length <= 2 && gibCount >= 1 && !alphaTokens.some(t => t.length >= 4 && !isGibberishToken(t))) return true;
  if (gibCount / alphaTokens.length > 0.6) return true;
  return false;
}

/**
 * Gera resposta natural em 1ª pessoa mantendo estritamente o assunto da conversa
 * e avisando que já retornará (sem inventar assuntos técnicos fora da conversa).
 */
function buildUnrelatedSubjectResponse(userMessage, ctx, prevMessages = [], greetingPrefix = '', custom = getCustomResponses()) {
  const customFallback = applyPlaceholders(custom.respostaFallback, prevMessages);
  const topicInfo = detectConversationSubjectSummary(prevMessages, userMessage);
  const nomePrefix = ctx?.nomeCliente ? `${ctx.nomeCliente}, ` : '';
  let candidates;

  if (topicInfo.sobre) {
    const cap = s => (nomePrefix || greetingPrefix ? s : s.charAt(0).toUpperCase() + s.slice(1));
    candidates = [
      `${greetingPrefix}${nomePrefix}${cap(`vi sua mensagem ${topicInfo.sobre}! Só um instante que já estou verificando esse detalhe aqui e já te retorno em seguida!`)}`,
      `${greetingPrefix}${nomePrefix}${cap(`recebi o que você mandou ${topicInfo.sobre}! Em poucos minutos já concluo aqui e já te retorno com a resposta certinha!`)}`,
      `${greetingPrefix}${nomePrefix}${cap(`acabei de ver seu recado ${topicInfo.sobre}! Já retorno logo na sequência pra gente seguir com isso.`)}`
    ];
  } else if (ctx?.nomeCliente) {
    const n = ctx.nomeCliente;
    candidates = [
      `${greetingPrefix}${n}, vi sua mensagem por aqui! Só um instante que já estou concluindo um atendimento aqui e já te retorno na sequência pra gente conversar!`,
      `${greetingPrefix}${n}, recebi sua mensagem! Só um minuto que já estou finalizando um compromisso aqui e já te retorno em instantes pra falarmos sobre isso!`,
      `${greetingPrefix}${n}, vi o que você me mandou! Assim que eu liberar aqui, em poucos minutos já retorno para você pra gente conversar com calma!`,
      `${greetingPrefix}${n}, acabei de ver seu recado! Já estou me desocupando aqui e já te retorno logo na sequência!`
    ];
  } else {
    const firstBody = greetingPrefix && customFallback.startsWith('Oi! ')
      ? `${customFallback.charAt(4).toUpperCase()}${customFallback.slice(5)}`
      : customFallback;
    candidates = [
      `${greetingPrefix}${firstBody}`,
      `${greetingPrefix}Recebi sua mensagem por aqui! Só um minuto que já estou finalizando um compromisso aqui e já te retorno em instantes pra falarmos sobre isso!`,
      `${greetingPrefix}Vi o que você me mandou! Assim que eu liberar aqui, em poucos minutos já retorno para você pra gente conversar com calma!`,
      `${greetingPrefix}Acabei de ver seu recado! Já estou me desocupando aqui e já te retorno logo na sequência!`
    ];
  }

  return pickUnusedVariation(candidates, prevMessages);
}

/**
 * Evita que o bot envie respostas idênticas ou muito parecidas com o que já respondeu antes.
 */
function deduplicateReply(replyObj, prevMessages = [], ctx = {}) {
  if (!replyObj || !replyObj.text) return replyObj;
  const normCand = normalizeText(replyObj.text);
  const prevAssistant = prevMessages
    .filter(m => m.role === 'assistant' && m.text)
    .map(m => normalizeText(m.text));

  const isDuplicate = prevAssistant.some(prevNorm => {
    if (!prevNorm) return false;
    if (prevNorm === normCand) return true;
    if (prevNorm.length > 25 && normCand.length > 25 && (prevNorm.includes(normCand) || normCand.includes(prevNorm))) {
      return true;
    }
    return false;
  });

  if (!isDuplicate) return replyObj;

  let alternatives = [];
  if (ctx.equipamento && (!ctx.ambiente || !ctx.medidas || !ctx.localidade || !ctx.nomeCliente)) {
    let nextStep = '';
    if (!ctx.ambiente && !ctx.medidas) {
      nextStep = 'o tipo de ambiente e as medidas aproximadas';
    } else if (!ctx.medidas) {
      nextStep = 'as medidas aproximadas de onde vai instalar';
    } else if (!ctx.ambiente) {
      nextStep = 'o tipo de ambiente';
    } else if (!ctx.localidade) {
      nextStep = 'de qual cidade ou região você fala';
    } else if (!ctx.nomeCliente) {
      nextStep = 'como posso te chamar';
    }
    alternatives = [
      `Desculpa, não consegui entender direito essa parte. Você pode me explicar de outra forma ou me confirmar ${nextStep}?`,
      `Não entendi muito bem o que você quis dizer agora. Consegue repetir de outro jeito e me passar ${nextStep}?`,
      `Fiquei um pouco na dúvida no que você mandou. Pode repetir com outras palavras pra eu anotar ${nextStep}?`
    ];
  } else {
    alternatives = [
      'Desculpa, não consegui entender direito o que você quis dizer. Você pode repetir ou me explicar de outra forma por favor?',
      'Não entendi muito bem essa sua mensagem. Consegue me falar de outro jeito pra eu te responder certinho?',
      'Me desculpa, fiquei na dúvida sobre o que você precisa agora. Pode repetir com outras palavras pra eu te ajudar?'
    ];
  }

  return {
    ...replyObj,
    text: pickUnusedVariation(alternatives, prevMessages)
  };
}

/**
 * Motor Contextual Inteligente Instantâneo (< 10ms) usando respostas personalizáveis.
 */
export function getSmartLocalResponse(userMessage, baseConhecimento, history = [], options = {}) {
  const effectiveHistory = Array.isArray(history) && history.length > 0
    ? history
    : [{ role: 'user', text: userMessage }];

  const instant = getInstantInteractionResponse(userMessage, effectiveHistory, options);
  if (instant) return instant;

  const custom = getCustomResponses();
  const normMsg = normalizeText(userMessage);
  const allWords = normMsg.split(' ').filter(w => w.length > 2);
  const meaningfulWords = allWords.filter(w => !STOP_WORDS.has(w));
  const sections = parseKnowledgeSections(baseConhecimento);

  const ctx = extractConversationContext(effectiveHistory);
  const prevMessages = effectiveHistory.slice(0, -1);
  const alreadyGreeted = prevMessages.some(m => m.role === 'assistant');
  const lastAssistantMsg = [...prevMessages].reverse().find(m => m.role === 'assistant');
  const normLastBot = normalizeText(lastAssistantMsg?.text || '');

  const summaryAlreadySent = prevMessages.some(m => {
    if (m.role !== 'assistant') return false;
    const nt = normalizeText(m.text);
    return nt.includes('anotei tudo certinho aqui') || nt.includes('ja deixei seu pedido organizado');
  });

  const isReferral =
    normMsg.includes('passaram seu contato') ||
    normMsg.includes('passaram o contato') ||
    normMsg.includes('me indicaram') ||
    normMsg.includes('indicacao') ||
    normMsg.includes('recomendacao');

  const referralAlreadyAcked = prevMessages.some(m => {
    if (m.role !== 'assistant') return false;
    const nt = normalizeText(m.text);
    return nt.includes('passaram meu contato') || nt.includes('passaram nosso contato');
  });

  const tokens = normMsg.split(' ').filter(Boolean);
  const nonGreetingTokens = tokens.filter(t => t.length > 1 && !GREETING_FILLER_TOKENS.has(t));
  const hasLeadGreeting = hasGreetingPhrase(normMsg) && nonGreetingTokens.length > 0;

  let greetingPrefix = '';
  if (!alreadyGreeted && hasLeadGreeting) {
    greetingPrefix = isReferral && !referralAlreadyAcked
      ? `${getTimeGreeting()}! Que bacana que passaram meu contato!\n\n`
      : `${getTimeGreeting()}! Tudo bem?\n\n`;
  } else if (alreadyGreeted && isReferral && !referralAlreadyAcked) {
    greetingPrefix = 'Que bacana que te passaram meu contato!\n\n';
  }

  // 1. Perguntas específicas (instalação, catálogo, manutenção, material/serviço, horários, prazos, visita, dúvidas técnicas, garantia, pagamento)
  const specificAnswer = matchSpecificQuestion(normMsg, ctx, greetingPrefix, custom, prevMessages);
  if (specificAnswer) {
    return deduplicateReply(specificAnswer, prevMessages, ctx);
  }

  const botWasCollectingQuote =
    normLastBot.includes('para eu ja deixar tudo pronto') ||
    normLastBot.includes('pra eu ja passar certinho') ||
    normLastBot.includes('pra eu ja ir adiantando') ||
    normLastBot.includes('calcular seu orcamento') ||
    normLastBot.includes('entender melhor seu projeto') ||
    normLastBot.includes('fechar seu pre-cadastro') ||
    normLastBot.includes('fechar seu orcamento') ||
    normLastBot.includes('qual equipamento') ||
    normLastBot.includes('precisando orcar') ||
    normLastBot.includes('tipo de ambiente') ||
    normLastBot.includes('medidas aproximadas') ||
    normLastBot.includes('medidas do local') ||
    normLastBot.includes('cidade ou bairro') ||
    normLastBot.includes('como posso te chamar') ||
    normLastBot.includes('me diz so') ||
    normLastBot.includes('me passa por favor') ||
    normLastBot.includes('me informe apenas') ||
    normLastBot.includes('me conta rapidinho') ||
    normLastBot.includes('para eu agilizar');

  // 1b. Gatilhos extras personalizados pelo usuário no Painel (exceto quando estiver em coleta ou enviando especificações/medidas de orçamento)
  const isExplicitQuoteInput =
    /\b(?:orcamento|cotacao)\b/.test(normMsg) ||
    (Boolean(ctx.medidas) && (Boolean(ctx.equipamento) || Boolean(ctx.ambiente))) ||
    (botWasCollectingQuote && ctx.lastAddedFields.length > 0);

  if (!isExplicitQuoteInput) {
    const extraReply = matchCustomExtraResponse(normMsg, custom, prevMessages);
    if (extraReply) {
      return deduplicateReply({
        text: `${greetingPrefix}${extraReply}`,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      }, prevMessages, ctx);
    }
  }

  // Helper local para buscar resposta relevante na Base de Conhecimento sem repetir código
  const findBestKnowledgeSection = () => {
    if (meaningfulWords.length === 0) return null;
    let bestSection = null;
    let bestScore = 0;
    let bestMatched = 0;

    for (const section of sections) {
      const normTitle = normalizeText(section.title);
      const normBody = normalizeText(section.lines.join(' '));
      let score = 0;
      let matched = 0;

      for (const w of meaningfulWords) {
        const esc = escapeRegExp(w);
        const wordRe = w.length <= 4
          ? new RegExp(`(?:^|\\s)${esc}(?:$|\\s)`)
          : new RegExp(`(?:^|\\s)${esc}`);
        const inTitle = wordRe.test(normTitle);
        const inBody = wordRe.test(normBody);
        if (inTitle || inBody) {
          matched++;
          if (inTitle) score += 4;
          if (inBody) score += 2;
        }
      }

      if (matched > 0 && score > bestScore) {
        bestScore = score;
        bestSection = section;
        bestMatched = matched;
      }
    }

    return bestSection && (bestScore >= 6 || bestMatched >= 2) ? bestSection : null;
  };

  const bestKnowledgeSection = findBestKnowledgeSection();

  // 2. Fluxo pós-resumo
  if (summaryAlreadySent) {
    if (ctx.lastAddedFields.length > 0) {
      const updatedText = ctx.lastAddedFields.join(', ');
      return deduplicateReply({
        text: `${greetingPrefix}Anotei aqui também (${updatedText}) pra eu considerar no seu orçamento! Precisa acrescentar mais alguma coisa?`,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      }, prevMessages, ctx);
    }

    if (bestKnowledgeSection) {
      return deduplicateReply({
        text: `${greetingPrefix}Sobre ${bestKnowledgeSection.title}, funciona assim:\n\n${bestKnowledgeSection.lines.join('\n')}\n\nSe quiser me passar mais detalhes do que precisa, é só falar!`,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      }, prevMessages, ctx);
    }

    const hasOperationalContext = /\b(?:urgente|amanha|semana|parede|telhado|predio|condominio|vizinho|fogao|chapa|fritadeira|forno|cozinha|foto|video|planta|desenho|horario|visita|medir|loja|restaurante|lanchonete)\b/.test(normMsg);
    const alreadyAckedObs = prevMessages.some(
      m => m.role === 'assistant' && normalizeText(m.text).includes('anotei essa observacao')
    );
    if (hasOperationalContext && !alreadyAckedObs) {
      return deduplicateReply({
        text: `${greetingPrefix}Perfeito, já anotei essa observação junto com o seu pedido aqui! Qualquer outra dúvida é só falar.`,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      }, prevMessages, ctx);
    }
  }

  // 3. Fluxo de Orçamento / Coleta Conversacional em Etapas
  const quoteOrTechTriggers = [
    'orcamento', 'quanto custa', 'preco', 'precos', 'valor', 'valores', 'cotacao',
    'coifa', 'exaustor', 'exaustao', 'duto', 'ventilacao', 'climatizacao',
    'lavador', 'filtro', 'manutencao', 'projeto', 'laudo', 'instalacao', 'inox', 'galvaniz',
    'sistema', 'completo'
  ];

  const isQuoteFlow =
    quoteOrTechTriggers.some(q => normMsg.includes(q)) ||
    /\bpreciso\s+(?:de\s+)?(?:um\s+|uma\s+)?(?:orcamento|orcar|cotar|cotacao|equipamento|coifa|exaustor|duto|lavador|sistema|projeto|ajuda\s+com\s+(?:coifa|exaust|ventil))\b/.test(normMsg) ||
    Boolean(ctx.equipamento) ||
    (ctx.lastAddedFields.length > 0 && (Boolean(ctx.ambiente) || Boolean(ctx.medidas))) ||
    botWasCollectingQuote;

  if (isQuoteFlow && !summaryAlreadySent) {
    const equipDisplay = ctx.equipamento
      ? `${ctx.equipamento}${ctx.material ? ` (${ctx.material})` : ''}`
      : null;

    const hasCoreTechnicalInfo = Boolean(equipDisplay) && (Boolean(ctx.medidas) || Boolean(ctx.ambiente));

    // Caso A: Nada técnico informado ainda (Etapa 1)
    if (!equipDisplay && !ctx.ambiente && !ctx.medidas) {
      if (isReferral && !referralAlreadyAcked) {
        const referralText = !alreadyGreeted && hasLeadGreeting
          ? `${getTimeGreeting()}! Que bacana que passaram meu contato! Faço seu orçamento sim.\n\nMe conta, com quem eu falo e o que você tá precisando orçar?`
          : 'Que bacana que te passaram meu contato! Pode ficar à vontade.\n\nMe diz seu nome e qual equipamento ou serviço você tá procurando pra eu ir adiantando aqui.';
        return deduplicateReply({
          text: referralText,
          requestHuman: false,
          explicitHumanRequest: false,
          source: 'local'
        }, prevMessages, ctx);
      }

      if (ctx.nomeCliente) {
        return deduplicateReply({
          text: `${greetingPrefix}Opa, claro, ${ctx.nomeCliente}! Faço seu orçamento sim.\n\nMe conta, qual equipamento ou serviço você tá precisando orçar (coifa, exaustor, duto...)?`,
          requestHuman: false,
          explicitHumanRequest: false,
          source: 'local'
        }, prevMessages, ctx);
      }

      return deduplicateReply({
        text: `${greetingPrefix}${applyPlaceholders(custom.perguntaOrcamento, prevMessages)}`,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      }, prevMessages, ctx);
    }

    // Caso C: Resumo completo em linguagem natural (exige localidade para não pular cidade)
    if (hasCoreTechnicalInfo && Boolean(ctx.localidade) && (Boolean(ctx.nomeCliente) || botWasCollectingQuote)) {
      const nomePrefixo = ctx.nomeCliente ? `Perfeito, ${ctx.nomeCliente}!` : 'Perfeito!';
      const resumoPartes = [];
      if (equipDisplay) resumoPartes.push(equipDisplay);
      if (ctx.ambiente) resumoPartes.push(`para ${ctx.ambiente}`);
      if (ctx.medidas) {
        resumoPartes.push(ctx.medidas === 'medidas a confirmar' ? 'com medidas a confirmar no local' : `nas medidas de ${ctx.medidas}`);
      }
      if (ctx.localidade) resumoPartes.push(`em ${ctx.localidade}`);

      return deduplicateReply({
        text: `${greetingPrefix}${nomePrefixo} Já deixei seu pedido organizado aqui: ${resumoPartes.join(', ')}.\n\n${applyPlaceholders(custom.fechamentoResumo, prevMessages)}`,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      }, prevMessages, ctx);
    }

    // Caso B: Coleta conversacional por etapas (uma pergunta natural por vez)
    const recognizedParts = [];
    if (equipDisplay) recognizedParts.push(equipDisplay);
    if (ctx.ambiente) recognizedParts.push(`para ${ctx.ambiente}`);
    if (ctx.medidas) {
      recognizedParts.push(ctx.medidas === 'medidas a confirmar' ? 'com medidas a confirmar no local' : `na medida de ${ctx.medidas}`);
    }
    if (ctx.localidade) recognizedParts.push(`em ${ctx.localidade}`);

    const nomeAckSuffix = ctx.nomeCliente ? `, ${ctx.nomeCliente}` : '';
    const ackVariants = recognizedParts.length > 0
      ? [
          `Perfeito${nomeAckSuffix}! Já anotei aqui ${recognizedParts.join(' ')}.`,
          `Show${nomeAckSuffix}! Deixei registrado aqui: ${recognizedParts.join(' ')}.`,
          `Anotado${nomeAckSuffix}! Já peguei aqui ${recognizedParts.join(' ')}.`
        ]
      : [
          `Certo${nomeAckSuffix}! Já comecei a anotar seu pedido por aqui.`,
          `Beleza${nomeAckSuffix}! Tô acompanhando seu pedido aqui.`
        ];
    const ackLine = pickUnusedVariation(ackVariants, prevMessages);

    let askLine;
    if (!equipDisplay) {
      askLine = 'Qual equipamento ou serviço exatamente você tá precisando? (ex: coifa, exaustor, lavador de gases...)';
    } else if (!ctx.ambiente || !ctx.medidas) {
      if (!ctx.ambiente && !ctx.medidas) {
        askLine = 'Pra eu entender melhor seu projeto, vai ser pra qual tipo de ambiente (cozinha residencial, restaurante...) e você já sabe mais ou menos as medidas?';
      } else if (!ctx.medidas) {
        askLine = 'Você já sabe mais ou menos as medidas do local ou do equipamento?';
      } else {
        askLine = 'Esse equipamento vai ser instalado em qual tipo de ambiente (residência, restaurante, cozinha industrial...)?';
      }
    } else if (!ctx.localidade && !ctx.nomeCliente) {
      askLine = 'Pra eu fechar seu orçamento certinho, qual é o seu nome e de qual cidade ou bairro você fala?';
    } else if (!ctx.localidade) {
      askLine = 'E de qual cidade ou bairro você fala?';
    } else {
      askLine = 'E como posso te chamar?';
    }

    const isDirectQuoteOrRef =
      /\b(?:orcamento|cotacao|orcar|quanto\s+custa|preco|precos|valor|valores|preciso)\b/.test(normMsg) ||
      isReferral;

    if (ctx.lastAddedFields.length === 0 && !isDirectQuoteOrRef) {
      if (bestKnowledgeSection) {
        return deduplicateReply({
          text: `${greetingPrefix}Sobre ${bestKnowledgeSection.title}, funciona assim:\n\n${bestKnowledgeSection.lines.join('\n')}\n\nSe quiser me passar mais detalhes do que precisa, é só falar!`,
          requestHuman: false,
          explicitHumanRequest: false,
          source: 'local'
        }, prevMessages, ctx);
      }

      if (!options?.fromAudio && !isGibberishInput(normMsg) && normMsg.split(' ').filter(Boolean).length >= 4) {
        const unrelatedMidText = buildUnrelatedSubjectResponse(userMessage, ctx, prevMessages, greetingPrefix, custom);
        return deduplicateReply({
          text: unrelatedMidText,
          requestHuman: false,
          explicitHumanRequest: false,
          source: 'local'
        }, prevMessages, ctx);
      }

      const clarifyText = pickUnusedVariation([
        `Desculpa${nomeAckSuffix}, não consegui entender direito o que você quis dizer agora. Você pode repetir ou me explicar de outra forma?\n\n${askLine}`,
        `Não entendi muito bem essa última mensagem${nomeAckSuffix}. Consegue me falar de outro jeito por favor?\n\n${askLine}`
      ], prevMessages);

      return deduplicateReply({
        text: `${greetingPrefix}${clarifyText}`,
        requestHuman: false,
        explicitHumanRequest: false,
        source: 'local'
      }, prevMessages, ctx);
    }

    return deduplicateReply({
      text: `${greetingPrefix}${ackLine}\n\n${askLine}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    }, prevMessages, ctx);
  }

  // 4. Busca dinâmica por palavras-chave na base de conhecimento (com fronteira de palavra)
  if (bestKnowledgeSection) {
    return deduplicateReply({
      text: `${greetingPrefix}Sobre ${bestKnowledgeSection.title}, funciona assim:\n\n${bestKnowledgeSection.lines.join('\n')}\n\nSe quiser me passar mais detalhes do que precisa, é só falar!`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    }, prevMessages, ctx);
  }

  // 5. Fallback seguro:
  // - Áudio incompreensível -> pede para repetir em áudio ou texto
  // - Texto aleatório/incompreensível (gibberish) -> admite que não entendeu e pede para explicar de outra forma
  // - Assunto real fora da base -> explica atividade técnica em andamento e avisa que já retorna
  if (options?.fromAudio) {
    const audioFallback = pickUnusedVariation([
      'Desculpa, não consegui entender direito o seu áudio. Você pode repetir ou mandar de outra forma por aqui?',
      'O áudio ficou um pouco confuso pra mim aqui. Consegue mandar outro áudio explicando de outra forma ou escrever por texto?'
    ], prevMessages);
    return deduplicateReply({
      text: `${greetingPrefix}${audioFallback}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    }, prevMessages, ctx);
  }

  if (isGibberishInput(normMsg)) {
    const gibFallback = pickUnusedVariation([
      'Desculpa, não consegui entender direito o que você quis dizer. Você pode repetir ou me explicar de outra forma por favor?',
      'Não entendi muito bem o que você quis dizer agora. Consegue repetir ou explicar de outro jeito por favor?',
      'Fiquei na dúvida sobre essa mensagem. Pode escrever de outra forma pra eu te responder certinho?'
    ], prevMessages);
    return deduplicateReply({
      text: `${greetingPrefix}${gibFallback}`,
      requestHuman: false,
      explicitHumanRequest: false,
      source: 'local'
    }, prevMessages, ctx);
  }

  const unrelatedText = buildUnrelatedSubjectResponse(userMessage, ctx, prevMessages, greetingPrefix, custom);
  return deduplicateReply({
    text: unrelatedText,
    requestHuman: false,
    explicitHumanRequest: false,
    source: 'local'
  }, prevMessages, ctx);
}

/**
 * Chama a API gratuita da Groq (Llama 3.3 70B em ~300ms) quando configurada chave gsk_...
 */
async function getGroqResponse(apiKey, systemInstruction, history, userMessage) {
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.text
    }))
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: config.temperature,
      max_tokens: 450,
      messages
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!rawText) {
    throw new Error('Resposta vazia da API Groq.');
  }

  const hasTag = rawText.includes('[SOLICITAR_HUMANO]');
  const cleanText = stripEmojis(rawText.replace(/\[SOLICITAR_HUMANO\]/g, ''));
  const explicit = hasTag || isExplicitHumanRequest(normalizeText(userMessage));

  return {
    text: cleanText,
    requestHuman: explicit,
    explicitHumanRequest: explicit,
    source: 'ia-cloud'
  };
}

/**
 * Testa se uma chave de API (Google Gemini AIza... ou Groq gsk_...) é válida.
 * @param {string} apiKey
 * @returns {Promise<{valid: boolean, message: string, model?: string}>}
 */
export async function testGeminiApiKey(apiKey) {
  const cleanKey = String(apiKey || '').trim();
  if (!cleanKey) {
    return { valid: false, message: 'Chave vazia.' };
  }

  if (cleanKey.startsWith('gsk_')) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Responda apenas: OK' }],
          max_tokens: 10,
          temperature: 0
        })
      });

      if (response.ok) {
        return { valid: true, message: 'Chave Groq (Llama 3.3 70B) validada com sucesso!', model: 'llama-3.3-70b-versatile' };
      }

      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${response.status}`;
      return { valid: false, message: `Chave Groq inválida: ${errMsg}` };
    } catch (err) {
      return { valid: false, message: `Erro ao testar chave Groq: ${err.message}` };
    }
  }

  const modelsToTry = Array.from(new Set([config.geminiModel, 'gemini-2.0-flash', 'gemini-1.5-flash']));
  let lastError = 'Erro desconhecido ao validar chave.';

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Responda apenas: OK' }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0 }
        })
      });

      if (response.ok) {
        return { valid: true, message: `Chave validada com sucesso usando ${model}!`, model };
      }

      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${response.status}`;
      lastError = errMsg;

      if (response.status === 400 || response.status === 401 || response.status === 403) {
        if (errMsg.toLowerCase().includes('api key')) {
          return { valid: false, message: `Chave da API inválida: ${errMsg}` };
        }
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  return { valid: false, message: lastError };
}

/**
 * Orquestra a resposta mais rápida e inteligente disponível:
 * 1. Saudações e interações diretas instantâneas (< 5ms)
 * 2. Groq (se chave gsk_... configurada, ~300ms) ou Google Gemini (se chave AIza... configurada)
 * 3. Motor Contextual Inteligente Instantâneo (< 10ms)
 * @param {Array<{role: string, text: string}>} history
 * @param {{fromAudio?: boolean}} [options]
 * @returns {Promise<{text: string, requestHuman: boolean, explicitHumanRequest: boolean, source: 'gemini' | 'ia-cloud' | 'local'}>}
 */
export async function getAiResponse(history, options = {}) {
  const sanitize = res => (res ? { ...res, text: stripEmojis(res.text) } : res);
  const lastUserItem = [...history].reverse().find(item => item.role === 'user');
  const lastUserMessage = lastUserItem ? lastUserItem.text : '';
  const { baseConhecimento } = getKnowledgeFiles();

  // 1. Interações instantâneas
  const instant = getInstantInteractionResponse(lastUserMessage, history, options);
  if (instant) {
    return sanitize(instant);
  }

  const cleanKey = (config.geminiApiKey || '').trim();

  // 2a. Groq (gsk_...) se configurada
  if (cleanKey.startsWith('gsk_')) {
    try {
      const systemInstruction = getSystemInstruction();
      return sanitize(await getGroqResponse(cleanKey, systemInstruction, history, lastUserMessage));
    } catch (err) {
      console.warn(`⚠️ Falha na API Groq (${err.message}). Usando motor contextual instantâneo.`);
      return sanitize(getSmartLocalResponse(lastUserMessage, baseConhecimento, history, options));
    }
  }

  // 2b. Google Gemini (AIza...) se configurada
  if (cleanKey) {
    const systemInstruction = getSystemInstruction();
    const contents = history.map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.text }]
    }));

    const modelsToTry = Array.from(new Set([config.geminiModel, 'gemini-2.0-flash', 'gemini-1.5-flash']));

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        const payload = {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            temperature: config.temperature,
            topP: 0.95,
            maxOutputTokens: 600
          }
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.warn(`[AVISO API GEMINI (${model}) HTTP ${response.status}]:`, errorBody);
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!rawText) continue;

        const hasTag = rawText.includes('[SOLICITAR_HUMANO]');
        const cleanText = stripEmojis(rawText.replace(/\[SOLICITAR_HUMANO\]/g, ''));
        const explicit = hasTag || isExplicitHumanRequest(normalizeText(lastUserMessage));

        return sanitize({
          text: cleanText,
          requestHuman: explicit,
          explicitHumanRequest: explicit,
          source: 'gemini'
        });
      } catch (err) {
        console.warn(`[AVISO REDE GEMINI (${model})]:`, err.message);
      }
    }
  }

  // 3. Motor Contextual Inteligente Instantâneo (< 10ms)
  return sanitize(getSmartLocalResponse(lastUserMessage, baseConhecimento, history, options));
}
