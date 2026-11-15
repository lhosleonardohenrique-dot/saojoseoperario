// Filtro de nomes/intenções ofensivos da vela virtual.
// 1) lista de palavras (grátis, instantânea)  2) moderação da OpenAI (se OPENAI_API_KEY estiver definida).
// Se a OpenAI estiver fora do ar, a vela é aceita (e o erro vai para o log) para ninguém ficar sem poder rezar.

// Edite à vontade. Comparação sem acento, ignorando maiúsculas e símbolos usados como disfarce (p0rra, p.o.r.r.a).
const BLOCKED = [
  'porra', 'caralho', 'cacete', 'merda', 'bosta', 'puta', 'puto', 'viado', 'veado', 'buceta', 'xoxota', 'piroca', 'pau no cu',
  'foder', 'foda-se', 'fodase', 'fdp', 'filho da puta', 'cuzao', 'cu', 'arrombado', 'otario', 'idiota', 'imbecil', 'babaca',
  'retardado', 'vagabunda', 'vagabundo', 'desgraca', 'desgracado', 'nazista', 'hitler', 'macaco', 'neguinho', 'sapatao',
];  // (termos religiosos como demônio/diabo ficam de fora de propósito: aparecem em orações legítimas)

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[01345@7$]/g, (c) => LEET[c])
    .replace(/[^a-z\s]/g, '');           // tira pontos, traços etc.
}

function hasBlockedWord(text) {
  const tokens = normalize(text).split(/\s+/).filter(Boolean);
  // junta letras soltas: "p o r r a" -> "porra"
  const joined = [];
  let run = '';
  tokens.forEach((t) => { if (t.length === 1) run += t; else { if (run) joined.push(run); run = ''; joined.push(t); } });
  if (run) joined.push(run);
  const all = tokens.concat(joined);
  const phrase = tokens.join(' ');
  return BLOCKED.some((w) => {
    const word = normalize(w);
    if (word.includes(' ')) return phrase.includes(word);               // expressões: "filho da puta"
    // palavra inteira (ou flexão, para palavras longas: "merdas", "desgracado")
    return all.some((t) => t === word || (word.length >= 5 && t.startsWith(word)));
  });
}

async function flaggedByOpenAI(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || typeof fetch !== 'function') return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
      signal: ctrl.signal,
    });
    if (!r.ok) { console.error('Moderação OpenAI: HTTP', r.status); return false; }
    const d = await r.json();
    return !!(d.results && d.results[0] && d.results[0].flagged);
  } catch (e) {
    console.error('Moderação OpenAI indisponível:', e.message);
    return false;
  } finally { clearTimeout(timer); }
}

// true = pode publicar
async function isAllowed(...fields) {
  const text = fields.filter(Boolean).join('\n').trim();
  if (!text) return true;
  if (hasBlockedWord(text)) return false;
  if (await flaggedByOpenAI(text)) return false;
  return true;
}

module.exports = { isAllowed, hasBlockedWord };
