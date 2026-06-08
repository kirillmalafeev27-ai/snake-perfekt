const snakeLevelCache = new Map();

const LEVEL_COUNT = 10;
const VALID_LEVELS = new Set(['A1', 'A2', 'B1']);
const VALID_MODES = new Set(['compact', 'full']);
const DEFAULT_MODELS = 'gpt-5.4,gpt-5.2,gpt-5,gpt-5-mini,gpt-4o,gpt-4o-mini';
const AI_MODELS = (process.env.AITUNNEL_MODELS || DEFAULT_MODELS)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const THEMES = [
  {
    id: 'alltag',
    title: 'Alltag',
    description: 'Повседневные ситуации',
    guidance: 'Alltag: Tagesablauf, Termine, Wege, kleine Gespräche und häufige Verben.',
  },
  {
    id: 'was-ist-das',
    title: 'Was ist das?',
    description: 'Вещи в классе и офисе',
    guidance: [
      'Dinge im Kursraum und im Büro, Eigenschaften und Farben.',
      'Sprachhandlungen: nach Wörtern fragen, Nachfragen beantworten und über Dinge sprechen.',
      'Grammatik: bestimmter, unbestimmter und negativer Artikel im Nominativ, Singular und Plural, Personalpronomen.',
    ].join(' '),
  },
  {
    id: 'shoppen',
    title: 'Und heute: Shoppen!',
    description: 'Покупки, магазины и город',
    guidance: [
      'Einkaufen und Shoppen: sagen, was man gern oder nicht gern kauft, einfache Einkaufsdialoge und Dinge in der Stadt.',
      'Grammatik: haben, möchten, bestimmter, unbestimmter und negativer Artikel, Akkusativ und doch.',
    ].join(' '),
  },
  {
    id: 'freizeit',
    title: 'Tanzen oder wandern?',
    description: 'Досуг, времена года и дни недели',
    guidance: [
      'Freizeit und Alltag: Freizeitaktivitäten, Jahreszeiten und Wochentage.',
      'Grammatik: Verben mit Vokalwechsel, trennbare Verben, man, Präposition im plus Jahreszeit, am plus Tag und Inversion mit Position 1 im Satz.',
    ].join(' '),
  },
];

const FALLBACK_LEVELS = {
  alltag: [
    ['Ich esse ein Brot.', ['Ich', 'esse', 'ein', 'Brot.'], ['trinke', 'einen Apfel'], 'Я ем хлеб.'],
    ['Du trinkst viel Wasser.', ['Du', 'trinkst', 'viel', 'Wasser.'], ['isst', 'Milch'], 'Ты пьёшь много воды.'],
    ['Wir gehen zur Schule.', ['Wir', 'gehen', 'zur', 'Schule.'], ['geht', 'nach Hause'], 'Мы идём в школу.'],
    ['Papa liest ein Buch.', ['Papa', 'liest', 'ein', 'Buch.'], ['kocht', 'eine Zeitung'], 'Папа читает книгу.'],
    ['Lena malt ein Bild.', ['Lena', 'malt', 'ein', 'Bild.'], ['schreibt', 'ein Lied'], 'Лена рисует картинку.'],
    ['Der Hund schläft im Haus.', ['Der Hund', 'schläft', 'im', 'Haus.'], ['läuft', 'in der Tasche'], 'Собака спит в доме.'],
    ['Ich spiele im Zimmer.', ['Ich', 'spiele', 'im', 'Zimmer.'], ['schlafe', 'auf dem Tisch'], 'Я играю в комнате.'],
    ['Mama kocht heute Suppe.', ['Mama', 'kocht', 'heute', 'Suppe.'], ['liest', 'morgen'], 'Мама сегодня готовит суп.'],
    ['Wir machen die Hausaufgabe.', ['Wir', 'machen', 'die', 'Hausaufgabe.'], ['macht', 'das Spiel'], 'Мы делаем домашнее задание.'],
    ['Am Abend bin ich müde.', ['Am Abend', 'bin', 'ich', 'müde.'], ['bist', 'lustig'], 'Вечером я устал.'],
  ],
  'was-ist-das': [
    ['Das ist ein Stift.', ['Das', 'ist', 'ein', 'Stift.'], ['eine', 'Tasche'], 'Это ручка.'],
    ['Das ist eine Tasche.', ['Das', 'ist', 'eine', 'Tasche.'], ['ein', 'Buch'], 'Это сумка.'],
    ['Der Ball ist rot.', ['Der', 'Ball', 'ist', 'rot.'], ['die', 'blau'], 'Мяч красный.'],
    ['Die Lampe ist groß.', ['Die', 'Lampe', 'ist', 'groß.'], ['der', 'klein'], 'Лампа большая.'],
    ['Mein Heft ist blau.', ['Mein', 'Heft', 'ist', 'blau.'], ['meine', 'rot'], 'Моя тетрадь синяя.'],
    ['Ist das dein Buch?', ['Ist', 'das', 'dein', 'Buch?'], ['meine', 'Stuhl'], 'Это твоя книга?'],
    ['Das sind drei Stifte.', ['Das', 'sind', 'drei', 'Stifte.'], ['ist', 'zwei'], 'Это три ручки.'],
    ['Hier liegt ein Radiergummi.', ['Hier', 'liegt', 'ein', 'Radiergummi.'], ['steht', 'eine Schere'], 'Здесь лежит ластик.'],
    ['Die Schere ist klein.', ['Die', 'Schere', 'ist', 'klein.'], ['der', 'groß'], 'Ножницы маленькие.'],
    ['Das ist kein Handy.', ['Das', 'ist', 'kein', 'Handy.'], ['eine', 'Computer'], 'Это не телефон.'],
  ],
  shoppen: [
    ['Ich kaufe einen Apfel.', ['Ich', 'kaufe', 'einen', 'Apfel.'], ['esse', 'eine Banane'], 'Я покупаю яблоко.'],
    ['Du möchtest eine Banane.', ['Du', 'möchtest', 'eine', 'Banane.'], ['möchte', 'ein Brot'], 'Ты хочешь банан.'],
    ['Die Jacke ist rot.', ['Die', 'Jacke', 'ist', 'rot.'], ['der', 'blau'], 'Куртка красная.'],
    ['Wir kaufen zwei Hefte.', ['Wir', 'kaufen', 'zwei', 'Hefte.'], ['kauft', 'drei Stifte'], 'Мы покупаем две тетради.'],
    ['Der Ball kostet drei Euro.', ['Der Ball', 'kostet', 'drei', 'Euro.'], ['kosten', 'zwei'], 'Мяч стоит три евро.'],
    ['Ich nehme das Brot.', ['Ich', 'nehme', 'das', 'Brot.'], ['nimmst', 'die Milch'], 'Я беру хлеб.'],
    ['Mama kauft heute Milch.', ['Mama', 'kauft', 'heute', 'Milch.'], ['kaufen', 'morgen'], 'Мама сегодня покупает молоко.'],
    ['Ich brauche neue Schuhe.', ['Ich', 'brauche', 'neue', 'Schuhe.'], ['brauchst', 'alte Socken'], 'Мне нужны новые ботинки.'],
    ['Die Tasche ist schön.', ['Die', 'Tasche', 'ist', 'schön.'], ['der', 'klein'], 'Сумка красивая.'],
    ['Ich zahle mit Geld.', ['Ich', 'zahle', 'mit', 'Geld.'], ['kauft', 'ohne'], 'Я плачу деньгами.'],
  ],
  freizeit: [
    ['Ich spiele gern Fußball.', ['Ich', 'spiele', 'gern', 'Fußball.'], ['spielst', 'Tennis'], 'Я люблю играть в футбол.'],
    ['Wir malen ein Bild.', ['Wir', 'malen', 'ein', 'Bild.'], ['malt', 'ein Buch'], 'Мы рисуем картинку.'],
    ['Anna tanzt am Montag.', ['Anna', 'tanzt', 'am', 'Montag.'], ['tanzen', 'im Sommer'], 'Анна танцует в понедельник.'],
    ['Du liest einen Comic.', ['Du', 'liest', 'einen', 'Comic.'], ['lese', 'ein Film'], 'Ты читаешь комикс.'],
    ['Wir schwimmen im Sommer.', ['Wir', 'schwimmen', 'im', 'Sommer.'], ['schwimmt', 'am Winter'], 'Мы плаваем летом.'],
    ['Ich fahre gern Rad.', ['Ich', 'fahre', 'gern', 'Rad.'], ['fährst', 'Auto'], 'Я люблю кататься на велосипеде.'],
    ['Ben hört laute Musik.', ['Ben', 'hört', 'laute', 'Musik.'], ['höre', 'leiser'], 'Бен слушает громкую музыку.'],
    ['Am Sonntag spiele ich draußen.', ['Am Sonntag', 'spiele', 'ich', 'draußen.'], ['spielst', 'drinnen'], 'В воскресенье я играю на улице.'],
    ['Wir gehen in den Park.', ['Wir', 'gehen', 'in den', 'Park.'], ['geht', 'nach Hause'], 'Мы идём в парк.'],
    ['Ich sehe einen Film.', ['Ich', 'sehe', 'einen', 'Film.'], ['siehst', 'ein Lied'], 'Я смотрю фильм.'],
  ],
};

function aiKey() {
  return process.env.AITUNNEL_API_KEY || process.env.OPENAI_API_KEY || '';
}

function aiBaseUrl() {
  if (process.env.AI_BASE_URL) return process.env.AI_BASE_URL.replace(/\/$/, '');
  if (process.env.OPENAI_BASE_URL) return process.env.OPENAI_BASE_URL.replace(/\/$/, '');
  return process.env.AITUNNEL_API_KEY ? 'https://api.aitunnel.ru/v1' : 'https://api.openai.com/v1';
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function comparableText(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

function wordCount(value) {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

function chunkSentence(sentence) {
  const words = cleanText(sentence).split(/\s+/).filter(Boolean);
  const chunkCount = Math.min(6, words.length);
  if (words.length < 3 || words.length > 18) return [];
  const chunks = [];
  let cursor = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const remainingWords = words.length - cursor;
    const remainingChunks = chunkCount - index;
    const size = Math.ceil(remainingWords / remainingChunks);
    chunks.push(words.slice(cursor, cursor + size).join(' '));
    cursor += size;
  }
  return chunks;
}

function themeFor(themeId) {
  return THEMES.find((theme) => theme.id === themeId) || THEMES[0];
}

function fallbackPack(themeId, _mode) {
  const source = FALLBACK_LEVELS[themeId] || FALLBACK_LEVELS.alltag;
  return source.map(([sentence, compactChunks, distractors, hint], index) => {
    const chunks = compactChunks;
    return {
      id: index + 1,
      sentence,
      hint,
      chunks,
      distractors: distractors.slice(0, 2),
    };
  });
}

function normalizeLevel(raw, mode, index) {
  if (!raw || typeof raw !== 'object') return null;
  const sentence = cleanText(raw.sentence);
  const hint = cleanText(raw.hint);
  const chunks = (Array.isArray(raw.chunks) ? raw.chunks : [])
    .map(cleanText)
    .filter(Boolean);
  const requiredChunkCount = mode === 'compact' ? 4 : null;
  if (!sentence || !hint) return null;
  if (requiredChunkCount && chunks.length !== requiredChunkCount) return null;
  if (mode === 'full' && (chunks.length < 3 || chunks.length > 6)) return null;
  if (chunks.some((chunk) => wordCount(chunk) > 3)) return null;
  if (comparableText(chunks.join(' ')) !== comparableText(sentence)) return null;

  const uniqueChunks = new Set(chunks.map(comparableText));
  if (uniqueChunks.size !== chunks.length) return null;

  const neededDistractors = Math.max(0, 6 - chunks.length);
  const distractors = (Array.isArray(raw.distractors) ? raw.distractors : [])
    .map(cleanText)
    .filter(Boolean)
    .filter((item) => wordCount(item) <= 3)
    .filter((item) => !uniqueChunks.has(comparableText(item)));
  const uniqueDistractors = [...new Map(distractors.map((item) => [comparableText(item), item])).values()];
  if (uniqueDistractors.length < neededDistractors) return null;

  return {
    id: index + 1,
    sentence,
    hint,
    chunks,
    distractors: uniqueDistractors.slice(0, neededDistractors),
  };
}

function parseLevelArray(rawText, mode) {
  const text = String(rawText || '').trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item, index) => normalizeLevel(item, mode, index)).filter(Boolean);
}

function buildPrompt({ level, theme, mode }) {
  const modeRules = mode === 'compact'
    ? [
        'Each sentence MUST be split into exactly 4 ordered chunks.',
        'Add exactly 2 distractor chunks. A distractor must be plausible for the selected theme but must not belong to the correct sentence.',
      ].join('\n')
    : [
        'Split the complete sentence into 3 to 6 ordered chunks. Use as many chunks as naturally needed.',
        'Add enough distractor chunks so chunks plus distractors contain exactly 6 items.',
      ].join('\n');

  return `You are an experienced DaF teacher creating a German word-order Snake game.

Create exactly ${LEVEL_COUNT} distinct German sentences for one game.
CEFR level: ${level}. Do not use grammar or vocabulary above ${level}.
Theme: ${theme.title}. ${theme.guidance}

Game rules:
${modeRules}
Every chunk contains 1 to 3 words.
The ordered chunks joined with spaces MUST reproduce the complete German sentence exactly.
All chunks and distractors inside one level MUST be visibly distinct.
Use natural, useful German. Vary sentence structure across the 10 levels.
The hint is a short Russian translation of the sentence.

Return only a JSON array. No Markdown and no explanation:
[
  {
    "sentence": "Ich möchte diese Jacke kaufen.",
    "hint": "Я хотел бы купить эту куртку.",
    "chunks": ["Ich möchte", "diese", "Jacke", "kaufen."],
    "distractors": ["keine", "verkaufen"]
  }
]`;
}

async function requestAiText(prompt, maxTokens = 8192) {
  const key = aiKey();
  if (!key) throw new Error('AI key is not configured');

  const errors = [];
  for (const model of AI_MODELS) {
    try {
      const response = await fetch(`${aiBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const bodyText = await response.text();
      if (!response.ok) {
        errors.push(`${model}: HTTP ${response.status} ${bodyText.slice(0, 180)}`);
        continue;
      }
      const data = JSON.parse(bodyText);
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim()) return content.trim();
      errors.push(`${model}: empty response`);
    } catch (error) {
      errors.push(`${model}: ${error?.message || String(error)}`);
    }
  }
  throw new Error(`AI generation failed: ${errors.join(' | ')}`);
}

async function generateLevels({ level, theme, mode }) {
  const cacheKey = `${level}:${theme.id}:${mode}`;
  if (snakeLevelCache.has(cacheKey)) {
    return { levels: snakeLevelCache.get(cacheKey), source: 'cache' };
  }

  const fallback = fallbackPack(theme.id, mode);
  if (!aiKey()) return { levels: fallback, source: 'fallback' };

  try {
    const rawText = await requestAiText(buildPrompt({ level, theme, mode }));
    const generated = parseLevelArray(rawText, mode);
    const seen = new Set();
    const levels = [];
    for (const candidate of [...generated, ...fallback]) {
      const key = comparableText(candidate.sentence);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      levels.push({ ...candidate, id: levels.length + 1 });
      if (levels.length === LEVEL_COUNT) break;
    }
    if (levels.length !== LEVEL_COUNT) throw new Error('AI response did not contain enough valid levels');
    snakeLevelCache.set(cacheKey, levels);
    return { levels, source: generated.length >= LEVEL_COUNT ? 'ai' : 'mixed' };
  } catch (error) {
    return { levels: fallback, source: 'fallback', warning: error?.message || String(error) };
  }
}

function installSnakeRoutes(app) {
  app.get('/api/snake/status', (_req, res) => {
    res.json({
      ok: true,
      generationConfigured: Boolean(aiKey()),
      themes: THEMES.map(({ id, title, description }) => ({ id, title, description })),
      levels: [...VALID_LEVELS],
      modes: [...VALID_MODES],
    });
  });

  app.post('/api/snake/levels', async (req, res) => {
    const selectedLevel = VALID_LEVELS.has(req.body?.level) ? req.body.level : 'A1';
    const mode = VALID_MODES.has(req.body?.mode) ? req.body.mode : 'compact';
    const theme = themeFor(req.body?.theme);
    const result = await generateLevels({ level: selectedLevel, theme, mode });
    res.json({
      ok: true,
      ...result,
      theme: { id: theme.id, title: theme.title },
      level: selectedLevel,
      mode,
      count: result.levels.length,
    });
  });
}

module.exports = { installSnakeRoutes };
