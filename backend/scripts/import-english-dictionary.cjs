const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Pool } = require('pg');

const parts = { noun: 'n', verb: 'v', adjective: 'a', adverb: 'r' };
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const wordKey = (text) =>
  text.trim().normalize('NFC').replaceAll('_', ' ').toLowerCase();
const synsetKey = (offset, part) =>
  `${Number(offset)}-${part === 's' ? 'a' : part}`;
const itemKey = (headword, part) => `${headword}:${part}`;
const lines = (file) => readFileSync(file, 'utf8').split(/\r?\n/);

function readTranslations(path) {
  const lexicon = JSON.parse(readFileSync(path, 'utf8'))['@graph'][0];
  if (lexicon.language !== 'uz' || lexicon.version !== '1.0') {
    throw new Error('Expected the UzWordnet 1.0 JSON-LD lexicon.');
  }
  const result = new Map();
  for (const entry of lexicon.entry) {
    const text = entry.lemma.writtenForm.normalize('NFC').trim();
    if (
      !text ||
      !/\p{Script=Latin}/u.test(text) ||
      /\p{Script=Cyrillic}/u.test(text)
    )
      continue;
    for (const { synsetRef } of entry.sense) {
      const match = /^uzwordnet-(\d+)-([nvasr])$/.exec(synsetRef);
      if (!match) continue;
      const key = synsetKey(match[1], match[2]);
      if (!result.has(key)) result.set(key, new Set());
      result.get(key).add(text);
    }
  }
  return result;
}

function readLevels(files) {
  const result = new Map();
  for (const file of files) {
    for (const line of lines(file)) {
      const match =
        /^("(?:[^"]|"")*"|[^,]+),([^,]+),(A1|A2|B1|B2|C1|C2)(?:,|$)/.exec(line);
      if (!match || !Object.hasOwn(parts, match[2])) continue;
      for (const variant of match[1]
        .replace(/^"|"$/g, '')
        .replaceAll('""', '"')
        .split('/')) {
        const word = wordKey(variant);
        if (!/^[a-z]+(?:[ '-][a-z]+)*$/.test(word)) continue;
        const key = itemKey(word, parts[match[2]]);
        const level = levels.indexOf(match[3]);
        result.set(key, Math.min(level, result.get(key) ?? levels.length));
      }
    }
  }
  return result;
}

function readWordnet(dir, translations) {
  const ranks = new Map();
  const senseParts = ['', 'n', 'v', 'a', 'r', 'a'];
  for (const line of lines(join(dir, 'index.sense'))) {
    if (!line) continue;
    const [sense, offset, rank] = line.split(' ');
    const [form, data] = sense.split('%');
    const key = synsetKey(offset, senseParts[Number(data[0])]);
    ranks.set(`${form}:${key}`, Number(rank));
  }
  const entries = new Map();
  for (const file of ['data.noun', 'data.verb', 'data.adj', 'data.adv']) {
    for (const line of lines(join(dir, file))) {
      if (!/^\d{8} /.test(line)) continue;
      const separator = line.indexOf('|');
      if (separator < 0) throw new Error('Invalid WordNet data row.');
      const [offset, , pos, size, ...fields] = line
        .slice(0, separator)
        .trim()
        .split(/\s+/);
      const part = pos === 's' ? 'a' : pos;
      const synset = synsetKey(offset, part);
      const gloss = line.slice(separator + 1).trim();
      const firstExample = /;\s*"/.exec(gloss);
      const definition = firstExample
        ? gloss.slice(0, firstExample.index)
        : gloss;
      const examples = firstExample
        ? [
            ...gloss.slice(firstExample.index).matchAll(/(?:^|;)\s*"([^"]+)"/g),
          ].map((match) => match[1])
        : [];
      const translationUz = [...(translations.get(synset) ?? [])];
      for (let index = 0; index < parseInt(size, 16); index++) {
        const form = fields[index * 2].replace(/\((?:a|p|ip)\)$/, '');
        const headword = wordKey(form);
        if (!entries.has(headword)) entries.set(headword, new Map());
        const senses = entries.get(headword);
        if (!senses.has(synset)) {
          const example =
            examples.find((sentence) =>
              sentence.toLowerCase().includes(headword),
            ) ?? '';
          senses.set(synset, {
            synset,
            part,
            rank: ranks.get(`${form.toLowerCase()}:${synset}`) ?? 999,
            definition,
            example,
            translationUz,
          });
        }
      }
    }
  }
  return entries;
}

function assemble(dir, uzFile, ...levelFiles) {
  const translations = readTranslations(uzFile);
  const levelByWord = readLevels(levelFiles);
  const dictionary = [];
  const learning = [];
  for (const [headword, rawSenses] of readWordnet(dir, translations)) {
    const senses = [...rawSenses.values()].sort((a, b) => a.rank - b.rank);
    dictionary.push({ headword, senses });
    const usable = senses.flatMap((sense) => {
      const level = levelByWord.get(itemKey(headword, sense.part));
      const translation = sense.translationUz.find(
        (text) => text.length <= 255,
      );
      if (
        level === undefined ||
        !translation ||
        !sense.definition ||
        sense.definition.length > 255
      )
        return [];
      return [
        {
          level,
          definition: sense.definition,
          translation,
          example: sense.example.length <= 255 ? sense.example : '',
        },
      ];
    });
    if (!usable.length || headword.length > 120) continue;
    const baseLevel = Math.min(...usable.map((sense) => sense.level));
    learning.push({
      headword,
      level: levels[baseLevel],
      senses: usable.filter((sense) => sense.level === baseLevel),
    });
  }
  if (dictionary.length < 100_000 || learning.length < 1_000) {
    throw new Error('Dictionary files are incomplete or incompatible.');
  }
  return { dictionary, learning };
}

async function importDictionary(pool, { dictionary, learning }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(927482)');
    let referenceAdded = 0;
    let learningAdded = 0;
    for (let index = 0; index < dictionary.length; index += 500) {
      const result = await client.query(
        `INSERT INTO english_dictionary_reference(headword, senses)
         SELECT headword, senses FROM jsonb_to_recordset($1) AS entry(headword text, senses jsonb)
         ON CONFLICT DO NOTHING`,
        [JSON.stringify(dictionary.slice(index, index + 500))],
      );
      referenceAdded += result.rowCount;
    }
    for (let index = 0; index < learning.length; index += 500) {
      const result = await client.query(
        `WITH batch AS (
           SELECT * FROM jsonb_to_recordset($1) AS entry(headword text, level cefr_level, senses jsonb)
         ), added AS (
           INSERT INTO words(text, cefr_level)
           SELECT headword, level FROM batch
           WHERE NOT EXISTS (SELECT FROM words WHERE lower(trim(text)) = batch.headword)
           ON CONFLICT DO NOTHING RETURNING id, text
         )
         INSERT INTO word_senses(word_id, definition, example_sentence, translation_uz, order_index)
         SELECT added.id, sense.value->>'definition', sense.value->>'example', sense.value->>'translation', (sense.ordinality - 1)::int
         FROM added JOIN batch ON batch.headword = added.text
         CROSS JOIN LATERAL jsonb_array_elements(batch.senses) WITH ORDINALITY AS sense`,
        [JSON.stringify(learning.slice(index, index + 500))],
      );
      learningAdded += result.rowCount;
    }
    await client.query('COMMIT');
    return { referenceAdded, learningSensesAdded: learningAdded };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const [dir, uz, cefr, advanced, flag] = process.argv.slice(2);
  if (!dir || !uz || !cefr || !advanced || (flag && flag !== '--inspect')) {
    throw new Error(
      'Usage: npm run db:import:vocabulary -- <wordnet-dir> <uzwordnet.json> <cefr.csv> <advanced.csv> [--inspect]',
    );
  }
  const data = assemble(dir, uz, cefr, advanced);
  const counts = Object.fromEntries(levels.map((level) => [level, 0]));
  for (const item of data.learning) counts[item.level]++;
  console.log({
    referenceHeadwords: data.dictionary.length,
    learningHeadwords: data.learning.length,
    levels: counts,
  });
  if (flag === '--inspect') return;
  require('dotenv').config({ quiet: true });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log(await importDictionary(pool, data));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error.code ? `Dictionary import failed (${error.code}).` : error.message,
  );
  process.exitCode = 1;
});
