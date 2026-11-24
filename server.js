// API + site da Aether Jets sobre PostgreSQL. Rodar: npm start  (porta 3000; ajuste com PORT e DATABASE_URL)
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const ADMIN = { usuario: process.env.ADMIN_USER || 'admin', senha: process.env.ADMIN_PASS || 'AetherJets2026!' };
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://aether:aether@localhost:5432/aether_jets', options: '-c search_path=aether,public' });

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg) => { throw new HttpError(400, msg); };

// ---------- Consultas ----------
const AIRPORT_SQL = `SELECT icao, iata, nome, coalesce(cidade,'') AS cidade, estado, pais, regiao,
  lat::float8 AS lat, lon::float8 AS lon, pista_ft, escala_tecnica FROM v_aeroporto`;
const airportJson = (r) => {
  const a = { icao: r.icao, iata: r.iata, nome: r.nome, cidade: r.cidade, estado: r.estado, pais: r.pais, regiao: r.regiao, lat: r.lat, lon: r.lon, pista_ft: r.pista_ft };
  if (r.escala_tecnica) a.escalaTecnica = true;   // mesmo formato do airports.json original
  return a;
};

// Mesmo ranking do autocomplete do site: código exato > cidade > nome > contém; Brasil e IATA desempatam.
async function searchAirports(q, limit) {
  const n = String(q || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (!n) return [];
  // shortcut: LIKE '%x%' varre a tabela (5,6 mil linhas, ~ms); com muito mais dados, usar índice pg_trgm.
  const { rows } = await pool.query(`SELECT * FROM (SELECT v.*, unaccent(lower(cidade)) AS c, unaccent(lower(nome)) AS nm, unaccent(lower(pais)) AS ps FROM (${AIRPORT_SQL}) v) s
    WHERE lower(icao) = $1 OR lower(iata) = $1 OR c LIKE '%'||$2||'%' OR nm LIKE '%'||$2||'%' OR ps LIKE '%'||$2||'%'
    ORDER BY CASE WHEN lower(icao) = $1 OR lower(iata) = $1 THEN 0 WHEN c = $1 THEN 1
                  WHEN c LIKE $2||'%' THEN 2 WHEN nm LIKE $2||'%' THEN 3
                  WHEN c LIKE '%'||$2||'%' THEN 4 WHEN nm LIKE '%'||$2||'%' THEN 6 ELSE 8 END
             - CASE WHEN pais = 'Brasil' THEN 0.5 ELSE 0 END - CASE WHEN iata <> '' THEN 0.2 ELSE 0 END, pista_ft DESC
    LIMIT $3`, [n, n.replace(/[\\%_]/g, '\\$&'), limit]);
  return rows.map(airportJson);
}

async function loadCatalog() {
  const [f, c, p] = await Promise.all([
    pool.query(`SELECT a.id, a.nome, a.categoria_id AS categoria, k.nome AS "categoriaNome", a.pax, a.alcance_km, a.velocidade_kmh,
      a.valor_hora::float8 AS valor_hora, a.tarifa_km::float8 AS tarifa_km, a.imagem, a.descricao, a.modelo
      FROM aeronave a JOIN categoria_aeronave k ON k.id = a.categoria_id WHERE a.ativo ORDER BY a.ordem, a.nome`),
    pool.query(`SELECT id, nome, descricao AS "desc", preco::float8 AS preco, unidade, alcool, tags, categoria, imagem
      FROM item_catering WHERE ativo ORDER BY ordem, nome`),
    pool.query(`SELECT id, nome, destino, dias, noites, aeronave_id AS "aeronaveId", hotel, categoria_hotel AS "categoriaHotel",
      carro, motorista, incluidos, opcionais, pax, disponibilidade, preco::float8 AS preco, imagem, descricao FROM pacote ORDER BY ordem, nome`)
  ]);
  return { frota: f.rows, catering: c.rows, pacotes: p.rows };
}

// O painel envia o catálogo inteiro; aqui viram upserts numa transação só.
// Aeronave e item de catering já vendidos não podem sumir (FK das passagens), então saem do catálogo com ativo = false.
async function saveCatalog(data) {
  for (const k of ['frota', 'catering', 'pacotes']) if (!Array.isArray(data && data[k])) bad(`Campo ${k} ausente.`);
  const ids = (list) => { const s = list.map((x) => String(x.id || '')); if (s.some((x) => !x) || new Set(s).size !== s.length) bad('IDs vazios ou repetidos.'); return s; };
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('DELETE FROM pacote WHERE NOT (id = ANY($1))', [ids(data.pacotes)]);
    await db.query('UPDATE aeronave SET ativo = false WHERE NOT (id = ANY($1))', [ids(data.frota)]);
    await db.query('UPDATE item_catering SET ativo = false WHERE NOT (id = ANY($1))', [ids(data.catering)]);
    for (const [i, a] of data.frota.entries()) {
      await db.query(`INSERT INTO aeronave (id, categoria_id, nome, modelo, pax, alcance_km, velocidade_kmh, valor_hora, tarifa_km, imagem, descricao, ordem, ativo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,round($8::numeric / $7::int, 2),$9,$10,$11,true)
        ON CONFLICT (id) DO UPDATE SET categoria_id=$2, nome=$3, modelo=$4, pax=$5, alcance_km=$6, velocidade_kmh=$7, valor_hora=$8,
          tarifa_km=round($8::numeric / $7::int, 2), imagem=$9, descricao=$10, ordem=$11, ativo=true`,
        [a.id, a.categoria, a.nome, a.modelo || null, a.pax, a.alcance_km, a.velocidade_kmh, a.valor_hora, a.imagem || null, a.descricao || null, i]);
    }
    for (const [i, c] of data.catering.entries()) {
      await db.query(`INSERT INTO item_catering (id, categoria, nome, descricao, preco, unidade, alcool, tags, imagem, ordem, ativo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
        ON CONFLICT (id) DO UPDATE SET categoria=$2, nome=$3, descricao=$4, preco=$5, unidade=$6, alcool=$7, tags=$8, imagem=$9, ordem=$10, ativo=true`,
        [c.id, c.categoria, c.nome, c.desc || null, c.preco, c.unidade || null, !!c.alcool, Array.isArray(c.tags) ? c.tags : [], c.imagem || null, i]);
    }
    for (const [i, p] of data.pacotes.entries()) {
      await db.query(`INSERT INTO pacote (id, aeronave_id, nome, destino, dias, noites, pax, preco, hotel, categoria_hotel, carro, motorista, disponibilidade, imagem, descricao, incluidos, opcionais, ordem)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT (id) DO UPDATE SET aeronave_id=$2, nome=$3, destino=$4, dias=$5, noites=$6, pax=$7, preco=$8, hotel=$9, categoria_hotel=$10,
          carro=$11, motorista=$12, disponibilidade=$13, imagem=$14, descricao=$15, incluidos=$16, opcionais=$17, ordem=$18`,
        [p.id, p.aeronaveId, p.nome, p.destino, p.dias, p.noites, p.pax, p.preco, p.hotel || null, p.categoriaHotel || null, p.carro || null,
          p.motorista || null, p.disponibilidade || null, p.imagem || null, p.descricao || null, p.incluidos || [], p.opcionais || [], i]);
    }
    const orphan = await db.query('SELECT p.id FROM pacote p JOIN aeronave a ON a.id = p.aeronave_id WHERE NOT a.ativo LIMIT 1');
    if (orphan.rowCount) bad(`O pacote ${orphan.rows[0].id} usa uma aeronave removida.`);
    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  } finally { db.release(); }
}

// ---------- Passagens ----------
const CODE_RE = /^[A-Z0-9]{4,12}$/;
const ticketRow = (r) => r && Object.assign(r.snapshot, { status: r.status });

// Cria a passagem (com trechos, catering e pagamento) ou, se já existe, atualiza só status e pagamento.
// shortcut: o valor vem calculado do navegador; antes de cobrar de verdade, recalcular o preço no servidor.
async function upsertTicket(code, t) {
  if (!CODE_RE.test(code) || !t || t.code !== code) bad('Código de passagem inválido.');
  const v = t.view || {}, pay = t.payment || {};
  if (!['ativa', 'cancelada'].includes(t.status)) bad('Status inválido.');
  if (!['pendente', 'pago'].includes(pay.status)) bad('Status de pagamento inválido.');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const exists = await db.query('SELECT 1 FROM passagem WHERE codigo = $1 FOR UPDATE', [code]);
    if (exists.rowCount) {
      await db.query('UPDATE passagem SET status = $2, snapshot = $3 WHERE codigo = $1', [code, t.status, t]);
      await db.query('UPDATE pagamento SET status = $2, pago_em = $3 WHERE passagem_codigo = $1', [code, pay.status, pay.paidAt || null]);
    } else {
      if (!v.origem || !v.destino) bad('Origem e destino são obrigatórios.');
      let clienteId = null;
      if (pay.email) {
        const c = await db.query(`INSERT INTO cliente (nome, email) VALUES ($1, lower($2))
          ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [pay.holder || pay.email, pay.email]);
        clienteId = c.rows[0].id;
      }
      await db.query(`INSERT INTO passagem (codigo, cliente_id, origem_icao, destino_icao, aeronave_id, tipo, partida, retorno, pax, status, valor_total, snapshot, criado_em)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [code, clienteId, v.origem.icao, v.destino.icao, v.aircraft && v.aircraft.id, v.tripType, v.departure, v.returnDeparture || null,
          v.pax, t.status, (v.valores || {}).subtotal, t, t.createdAt || new Date()]);
      for (const [i, leg] of (v.trechos || []).entries()) {
        await db.query('INSERT INTO passagem_trecho (passagem_codigo, ordem, de_icao, para_icao, distancia_km) VALUES ($1,$2,$3,$4,$5)',
          [code, i + 1, leg.origem && leg.origem.icao, leg.destino && leg.destino.icao, leg.km]);
      }
      for (const m of v.menuLines || []) {
        await db.query('INSERT INTO passagem_catering (passagem_codigo, item_id, quantidade, preco_unitario) VALUES ($1,$2,$3,$4)', [code, m.id, m.qtd, m.unit]);
      }
      await db.query(`INSERT INTO pagamento (passagem_codigo, metodo, status, parcelas, bandeira, cartao_final, titular_email, valor, pago_em)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [code, pay.method, pay.status, pay.parcelas || 1, pay.brand || null, pay.last4 || null, pay.email || null, pay.total, pay.paidAt || null]);
    }
    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  } finally { db.release(); }
}

// ---------- Relatórios (views rel_* em db/relatorios.sql). Lista fechada: o nome nunca vai direto para o SQL. ----------
const RELATORIOS = {
  faturamento: ['Faturamento por mês', 'rel_faturamento_mensal'],
  rotas: ['Rotas mais vendidas', 'rel_rotas_mais_vendidas'],
  frota: ['Uso da frota', 'rel_uso_frota'],
  catering: ['Catering mais vendido', 'rel_catering_mais_vendido'],
  clientes: ['Melhores clientes', 'rel_clientes'],
  pagamentos: ['Formas de pagamento', 'rel_pagamentos'],
  aeroportos: ['Rede de aeroportos por região', 'rel_rede_aeroportos'],
  pacotes: ['Pacotes', 'rel_pacotes']
};

// ---------- Admin (token em memória; reiniciar o servidor exige novo login) ----------
const tokens = new Map();
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
function requireAdmin(req) {
  const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
  const exp = tokens.get(tok);
  if (!exp || exp < Date.now()) { tokens.delete(tok); throw new HttpError(401, 'Sessão de administrador expirada. Entre novamente.'); }
}

// ---------- HTTP ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const send = (res, status, body, type) => { res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(type ? body : JSON.stringify(body)); };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 1e6) { reject(new HttpError(413, 'Corpo muito grande.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(new HttpError(400, 'JSON inválido.')); } });
    req.on('error', reject);
  });
}

let airportsJs = null;   // a base de aeroportos só muda pelo seed, então gera uma vez
async function route(req, res, url) {
  const p = url.pathname, m = req.method;
  let x;
  // O site continua carregando estes dois scripts; agora eles saem do banco.
  if (m === 'GET' && p === '/assets/js/airports.js') {
    if (!airportsJs) airportsJs = 'window.AIRPORTS = ' + JSON.stringify((await pool.query(AIRPORT_SQL + ' ORDER BY pais, cidade')).rows.map(airportJson)) + ';\n';
    return send(res, 200, airportsJs, TYPES['.js']);
  }
  if (m === 'GET' && p === '/assets/js/catalog-seed.js') return send(res, 200, 'window.AETHER_CATALOG_SEED = ' + JSON.stringify(await loadCatalog()) + ';\n', TYPES['.js']);

  if (m === 'GET' && p === '/api/aeroportos') return send(res, 200, await searchAirports(url.searchParams.get('q'), Math.min(Number(url.searchParams.get('limit')) || 8, 50)));
  if (m === 'GET' && (x = p.match(/^\/api\/aeroportos\/([A-Za-z0-9]{4})$/))) {
    const { rows } = await pool.query(AIRPORT_SQL + ' WHERE icao = upper($1)', [x[1]]);
    return rows.length ? send(res, 200, airportJson(rows[0])) : send(res, 404, { erro: 'Aeroporto não encontrado.' });
  }
  if (m === 'GET' && p === '/api/catalogo') return send(res, 200, await loadCatalog());
  if (m === 'PUT' && p === '/api/catalogo') { requireAdmin(req); await saveCatalog(await readBody(req)); return send(res, 200, await loadCatalog()); }
  if (m === 'POST' && p === '/api/admin/login') {
    const b = await readBody(req);
    if (!safeEq(b.usuario, ADMIN.usuario) || !safeEq(b.senha, ADMIN.senha)) return send(res, 401, { erro: 'Usuário ou senha inválidos.' });
    const token = crypto.randomBytes(24).toString('hex');
    tokens.set(token, Date.now() + 8 * 3600e3);
    return send(res, 200, { token });
  }
  if (m === 'GET' && p === '/api/relatorios') { requireAdmin(req); return send(res, 200, Object.entries(RELATORIOS).map(([id, [titulo]]) => ({ id, titulo }))); }
  if (m === 'GET' && (x = p.match(/^\/api\/relatorios\/(\w+)$/))) {
    requireAdmin(req);
    const rel = Object.hasOwn(RELATORIOS, x[1]) && RELATORIOS[x[1]];
    if (!rel) return send(res, 404, { erro: 'Relatório não encontrado.' });
    const r = await pool.query(`SELECT * FROM ${rel[1]}`);
    return send(res, 200, { titulo: rel[0], colunas: r.fields.map((f) => f.name), linhas: r.rows });
  }
  if ((x = p.match(/^\/api\/passagens\/([A-Z0-9]{4,12})$/))) {
    if (m === 'PUT') { await upsertTicket(x[1], await readBody(req)); return send(res, 200, { ok: true }); }
    if (m === 'GET') {
      const { rows } = await pool.query('SELECT status, snapshot FROM passagem WHERE codigo = $1', [x[1]]);
      return rows.length ? send(res, 200, ticketRow(rows[0])) : send(res, 404, { erro: 'Passagem não encontrada.' });
    }
  }
  if (p.startsWith('/api/')) return send(res, 404, { erro: 'Rota não encontrada.' });
  if (m !== 'GET' && m !== 'HEAD') return send(res, 405, { erro: 'Método não permitido.' });

  // Arquivos estáticos: só as páginas da raiz e a pasta assets (nada de db/, server.js, node_modules...)
  const rel = path.normalize(decodeURIComponent(p === '/' ? '/index.html' : p)).replace(/^[/\\]+/, '');
  if (!(/^[\w-]+\.html$/.test(rel) || rel.startsWith('assets' + path.sep))) return send(res, 404, 'Não encontrado', TYPES['.txt']);
  fs.readFile(path.join(ROOT, rel), (err, data) => {
    if (err) return send(res, 404, 'Não encontrado', TYPES['.txt']);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(rel)] || 'application/octet-stream' });
    res.end(data);
  });
}

// Erros do Postgres viram 400/409 com mensagem legível (FK, CHECK, UNIQUE, trigger).
function pgError(e) {
  if (e instanceof HttpError) return e;
  if (e instanceof URIError) return new HttpError(400, 'URL inválida.');
  const msg = { '23503': 'Referência inválida: ' + (e.detail || ''), '23514': 'Valor fora das regras: ' + (e.constraint || ''), '23505': 'Registro duplicado.',
    '23502': 'Campo obrigatório ausente: ' + (e.column || ''), '22P02': 'Valor em formato inválido.', '22007': 'Data inválida.', '22008': 'Data inválida.', 'P0001': e.message }[e.code];
  return msg ? new HttpError(e.code === '23505' ? 409 : 400, msg) : null;
}

const server = http.createServer(async (req, res) => {
  try { await route(req, res, new URL(req.url, 'http://localhost')); }
  catch (e) {
    const h = pgError(e);
    if (!h) console.error(e);
    if (!res.headersSent) send(res, h ? h.status : 500, { erro: h ? h.message : 'Erro interno.' });
  }
});

if (require.main === module) server.listen(PORT, () => console.log(`Aether Jets em http://localhost:${PORT}`));
module.exports = { server, pool };
