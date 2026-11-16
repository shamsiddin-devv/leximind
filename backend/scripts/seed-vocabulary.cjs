require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const words = require('./starter-vocabulary.json');

async function seed(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    for (const word of words) {
      const result = await client.query(
        'INSERT INTO words(text,cefr_level,topic) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id',
        [word.text, word.cefrLevel, word.topic],
      );
      if (!result.rowCount) continue;
      await client.query(
        'INSERT INTO word_senses(word_id,definition,example_sentence,translation_uz,order_index) VALUES($1,$2,$3,$4,0)',
        [
          result.rows[0].id,
          word.definition,
          word.exampleSentence,
          word.translationUz,
        ],
      );
      inserted++;
    }
    await client.query('COMMIT');
    return inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
module.exports = { seed };
if (require.main === module) {
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL is required.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  seed(pool)
    .then((count) => console.log('Added ' + count + ' starter words.'))
    .catch((error) => {
      console.error('Vocabulary import failed.', error.code ?? 'UNKNOWN');
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
