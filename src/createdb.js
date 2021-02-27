import { readFile } from 'fs/promises';
import pg from 'pg';
import faker from 'faker';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const schemaFile = './sql/schema.sql';

async function query(q, values = []) {
  const client = await pool.connect();

  try {
    const result = await client.query(q, values);

    const { rows } = result;
    return rows;
  } catch (err) {
    console.error('Error running query');
    throw err;
  } finally {
    client.release();
  }
}

async function clear(q) {
  const client = await pool.connect();

  try {
    await client.query(q);
  } catch (err) {
    console.error('Error running query');
    throw err;
  } finally {
    client.release();
  }
}

async function mock(n) {
  for (let i = 0; i < n; i++) {
    const firstName = faker.name.findName();
    const nationalId = Math.floor(Math.random() * (9999999999 - 1000000000 + 1) + 1000000000);
    let comment = '';
    if (Math.random() >= 0.5) {
      comment = faker.lorem.sentence();
    }
    let anonymous = 'off';
    if (Math.random() >= 0.5) {
      anonymous = 'on';
    }

    const q = `
      INSERT INTO signatures (name, nationalId, comment, anonymous)
      VALUES ($1, $2, $3, $4)`;
    await query(q, [firstName, nationalId, comment, anonymous]);
  }
}
export async function create() {
  const data = await readFile(schemaFile);

  await query(data.toString('utf-8'));

  console.info('Schema created');

  await clear('TRUNCATE TABLE signatures');

  await mock(500);

  console.info('Mock data inserted');

  await pool.end();
}

create().catch((err) => {
  console.error('Error creating schema', err);
});
