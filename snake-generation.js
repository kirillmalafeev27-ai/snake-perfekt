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
    ['Heute kaufe ich frisches Brot.', ['Heute', 'kaufe ich', 'frisches', 'Brot.'], ['morgen', 'liest du'], 'Сегодня я покупаю свежий хлеб.'],
    ['Am Morgen trinke ich Kaffee.', ['Am Morgen', 'trinke', 'ich', 'Kaffee.'], ['am Abend', 'kauft'], 'Утром я пью кофе.'],
    ['Wir fahren mit dem Bus.', ['Wir', 'fahren', 'mit dem', 'Bus.'], ['Zug', 'geht'], 'Мы едем на автобусе.'],
    ['Meine Schwester arbeitet heute lange.', ['Meine Schwester', 'arbeitet', 'heute', 'lange.'], ['kurz', 'spielen'], 'Моя сестра сегодня долго работает.'],
    ['Nachmittags treffe ich meine Freunde.', ['Nachmittags', 'treffe ich', 'meine', 'Freunde.'], ['Familie', 'morgens'], 'После обеда я встречаюсь с друзьями.'],
    ['Der Kurs beginnt um neun.', ['Der Kurs', 'beginnt', 'um', 'neun.'], ['endet', 'acht'], 'Курс начинается в девять.'],
    ['Ich brauche einen neuen Termin.', ['Ich', 'brauche', 'einen neuen', 'Termin.'], ['keinen', 'finde'], 'Мне нужна новая запись.'],
    ['Am Abend kochen wir zusammen.', ['Am Abend', 'kochen', 'wir', 'zusammen.'], ['allein', 'lernt'], 'Вечером мы готовим вместе.'],
    ['Mein Handy liegt auf dem Tisch.', ['Mein Handy', 'liegt', 'auf dem', 'Tisch.'], ['unter den', 'Schlüssel'], 'Мой телефон лежит на столе.'],
    ['Sonntags schlafe ich etwas länger.', ['Sonntags', 'schlafe ich', 'etwas', 'länger.'], ['Montags', 'früher'], 'По воскресеньям я сплю немного дольше.'],
  ],
  'was-ist-das': [
    ['Das ist ein roter Ordner.', ['Das ist', 'ein', 'roter', 'Ordner.'], ['eine Lampe', 'keinen'], 'Это красная папка.'],
    ['Dort liegt eine gelbe Schere.', ['Dort', 'liegt', 'eine gelbe', 'Schere.'], ['steht', 'Bleistift'], 'Там лежат желтые ножницы.'],
    ['Im Büro steht ein Drucker.', ['Im Büro', 'steht', 'ein', 'Drucker.'], ['liegt', 'Tasche'], 'В офисе стоит принтер.'],
    ['Das sind meine neuen Hefte.', ['Das sind', 'meine', 'neuen', 'Hefte.'], ['mein', 'alt'], 'Это мои новые тетради.'],
    ['Auf dem Tisch liegt dein Handy.', ['Auf dem Tisch', 'liegt', 'dein', 'Handy.'], ['hängt', 'Laptop'], 'На столе лежит твой телефон.'],
    ['Der schwarze Stift gehört mir.', ['Der schwarze', 'Stift', 'gehört', 'mir.'], ['blaues', 'dir'], 'Черная ручка принадлежит мне.'],
    ['Ist das dein roter Rucksack?', ['Ist das', 'dein', 'roter', 'Rucksack?'], ['meine', 'Tafel'], 'Это твой красный рюкзак?'],
    ['Wir brauchen einen großen Bildschirm.', ['Wir brauchen', 'einen', 'großen', 'Bildschirm.'], ['kleine', 'Tastatur'], 'Нам нужен большой экран.'],
    ['Die Flasche steht neben dem Laptop.', ['Die Flasche', 'steht', 'neben dem', 'Laptop.'], ['unter den', 'Papier'], 'Бутылка стоит рядом с ноутбуком.'],
    ['Diese Tasse ist nicht blau.', ['Diese Tasse', 'ist', 'nicht', 'blau.'], ['kein', 'grünen'], 'Эта чашка не синяя.'],
  ],
  shoppen: [
    ['Ich möchte diese Jacke kaufen.', ['Ich möchte', 'diese', 'Jacke', 'kaufen.'], ['keine', 'verkaufen'], 'Я хотел бы купить эту куртку.'],
    ['Der Pullover gefällt mir nicht.', ['Der Pullover', 'gefällt', 'mir', 'nicht.'], ['mich', 'doch'], 'Этот свитер мне не нравится.'],
    ['Habt ihr auch schwarze Schuhe?', ['Habt ihr', 'auch', 'schwarze', 'Schuhe?'], ['keinen', 'Jacke'], 'У вас есть также черные туфли?'],
    ['Wir suchen einen günstigen Laptop.', ['Wir suchen', 'einen', 'günstigen', 'Laptop.'], ['teure', 'findet'], 'Мы ищем недорогой ноутбук.'],
    ['Kann ich mit Karte zahlen?', ['Kann ich', 'mit', 'Karte', 'zahlen?'], ['Bargeld', 'kaufen'], 'Можно заплатить картой?'],
    ['Im Laden gibt es heute Sonderangebote.', ['Im Laden', 'gibt es', 'heute', 'Sonderangebote.'], ['Markt', 'morgen'], 'Сегодня в магазине есть специальные предложения.'],
    ['Die rote Tasche ist zu teuer.', ['Die rote', 'Tasche', 'ist', 'zu teuer.'], ['billig', 'Schuhe'], 'Красная сумка слишком дорогая.'],
    ['Wo finde ich die Kasse?', ['Wo', 'finde ich', 'die', 'Kasse?'], ['wann', 'Regal'], 'Где я найду кассу?'],
    ['Nein, ich brauche keine Socken.', ['Nein, ich', 'brauche', 'keine', 'Socken.'], ['einen', 'nehme'], 'Нет, мне не нужны носки.'],
    ['Doch, dieses Handy ist praktisch.', ['Doch, dieses', 'Handy', 'ist', 'praktisch.'], ['kein', 'teuren'], 'Нет же, этот телефон практичный.'],
  ],
  freizeit: [
    ['Am Montag gehe ich tanzen.', ['Am Montag', 'gehe', 'ich', 'tanzen.'], ['wandert', 'im'], 'В понедельник я иду танцевать.'],
    ['Im Sommer wandern wir oft.', ['Im Sommer', 'wandern', 'wir', 'oft.'], ['am Winter', 'fährt'], 'Летом мы часто ходим в походы.'],
    ['Meine Freundin fährt gern Rad.', ['Meine Freundin', 'fährt', 'gern', 'Rad.'], ['fahrt', 'Fußball'], 'Моя подруга любит кататься на велосипеде.'],
    ['Nach der Arbeit sehe ich gern fern.', ['Nach der Arbeit', 'sehe ich', 'gern', 'fern.'], ['liest', 'aus'], 'После работы я люблю смотреть телевизор.'],
    ['Am Wochenende treffen wir Freunde.', ['Am Wochenende', 'treffen', 'wir', 'Freunde.'], ['trifft', 'Montag'], 'На выходных мы встречаемся с друзьями.'],
    ['Im Winter liest man mehr.', ['Im Winter', 'liest', 'man', 'mehr.'], ['am Sommer', 'lesen'], 'Зимой люди читают больше.'],
    ['Jeden Mittwoch spiele ich Tennis.', ['Jeden Mittwoch', 'spiele', 'ich', 'Tennis.'], ['am', 'wandern'], 'Каждую среду я играю в теннис.'],
    ['Im Herbst machen wir Ausflüge.', ['Im Herbst', 'machen', 'wir', 'Ausflüge.'], ['am Freitag', 'macht'], 'Осенью мы ездим на экскурсии.'],
    ['Am Freitag hört er Musik.', ['Am Freitag', 'hört', 'er', 'Musik.'], ['hören', 'Filme'], 'В пятницу он слушает музыку.'],
    ['Sonntags schlafe ich lange aus.', ['Sonntags', 'schlafe', 'ich lange', 'aus.'], ['stehe', 'fern'], 'По воскресеньям я долго сплю.'],
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

function fallbackPack(themeId, mode) {
  const source = FALLBACK_LEVELS[themeId] || FALLBACK_LEVELS.alltag;
  return source.map(([sentence, compactChunks, distractors, hint], index) => {
    const chunks = mode === 'full' ? chunkSentence(sentence) : compactChunks;
    return {
      id: index + 1,
      sentence,
      hint,
      chunks,
      distractors: distractors.slice(0, Math.max(0, 6 - chunks.length)),
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
