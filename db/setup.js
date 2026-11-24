// Cria as tabelas e carrega os dados iniciais em qualquer sistema (Windows, Linux, macOS), sem depender do psql.
// APAGA o schema aether e recria do zero. Uso: npm run db:setup   (usa DATABASE_URL, igual ao server.js)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
// Os .sql são escritos para o psql; aqui trocamos os meta-comandos (\ir, \set) pelo equivalente.
const schema = read('schema.sql').replace(/^\\ir relatorios\.sql$/m, () => read('relatorios.sql'));
const seed = read('seed.sql')
  .replace(/^\\.*$/gm, '')
  .replace(/:'(airports|frota|catering|pacotes)'::jsonb/g, "(SELECT dados FROM seed_json WHERE nome = '$1')");

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://aether:aether@localhost:5432/aether_jets' });
  await db.connect();
  try {
    await db.query(schema);
    await db.query('CREATE TEMP TABLE seed_json (nome text PRIMARY KEY, dados jsonb NOT NULL)');
    for (const nome of ['airports', 'frota', 'catering', 'pacotes']) {
      await db.query('INSERT INTO seed_json VALUES ($1, $2)', [nome, fs.readFileSync(path.join(dir, '..', 'assets', 'data', nome + '.json'), 'utf8')]);
    }
    await db.query(seed);
    const { rows } = await db.query(`SELECT (SELECT count(*) FROM aether.aeroporto) AS aeroportos, (SELECT count(*) FROM aether.aeronave) AS aeronaves,
      (SELECT count(*) FROM aether.item_catering) AS catering, (SELECT count(*) FROM aether.pacote) AS pacotes`);
    console.log('Banco pronto:', rows[0]);
  } catch (e) {
    console.error('Falhou:', e.message);
    if (/unaccent/.test(e.message)) console.error('Crie a extensão como superusuário: CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public');
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();
