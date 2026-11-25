// Testes da API contra o banco local. Rodar: npm test (precisa do PostgreSQL com schema + seed carregados)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { server, pool } = require('../server');

let base;
test.before(() => new Promise((ok) => server.listen(0, () => { base = `http://localhost:${server.address().port}`; ok(); })));
test.after(async () => { await pool.query("DELETE FROM passagem WHERE codigo = 'TESTE1'"); await pool.query("DELETE FROM cliente WHERE email = 'teste@exemplo.com'"); server.close(); await pool.end(); });

const api = (p, opt = {}) => fetch(base + p, { ...opt, headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) } });
const login = async () => (await (await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ usuario: 'admin', senha: 'AetherJets2026!' }) })).json()).token;

test('busca de aeroporto ignora acento e prioriza código', async () => {
  const sp = await (await api('/api/aeroportos?q=sao paulo')).json();
  assert.ok(sp.some((a) => a.icao === 'SBGR'));
  const gru = await (await api('/api/aeroportos?q=GRU')).json();
  assert.equal(gru[0].icao, 'SBGR');
  assert.equal((await api('/api/aeroportos/ZZZZ')).status, 404);
});

test('não serve arquivos fora das páginas e assets', async () => {
  for (const p of ['/server.js', '/db/schema.sql', '/assets/..%2fserver.js', '/package.json']) assert.equal((await api(p)).status, 404, p);
  assert.equal((await api('/%E0%A4%A')).status, 400);
});

test('catálogo exige login e respeita a FK do pacote', async () => {
  const cat = await (await api('/api/catalogo')).json();
  assert.equal((await api('/api/catalogo', { method: 'PUT', body: JSON.stringify(cat) })).status, 401);
  const token = await login();
  const auth = { Authorization: 'Bearer ' + token };
  const usado = cat.pacotes[0].aeronaveId;
  const semJato = { ...cat, frota: cat.frota.filter((a) => a.id !== usado) };
  const r = await api('/api/catalogo', { method: 'PUT', headers: auth, body: JSON.stringify(semJato) });
  assert.equal(r.status, 400);
  const salvo = await api('/api/catalogo', { method: 'PUT', headers: auth, body: JSON.stringify(cat) });
  assert.equal(salvo.status, 200);
  assert.deepEqual((await salvo.json()).frota.map((a) => a.id), cat.frota.map((a) => a.id));
});

test('passagem: cria, paga, cancela e recusa aeroporto inexistente', async () => {
  const ap = (icao) => ({ icao });
  const t = { code: 'TESTE1', status: 'ativa', createdAt: new Date().toISOString(),
    view: { origem: ap('SBGR'), destino: ap('SBRJ'), tripType: 'ida', departure: new Date(Date.now() + 864e5).toISOString(), pax: 2,
      aircraft: { id: 'phenom-300e' }, trechos: [{ origem: ap('SBGR'), destino: ap('SBRJ'), km: 340 }],
      menuLines: [{ id: 'champ-dom', qtd: 1, unit: 2400 }], valores: { subtotal: 50000 } },
    payment: { method: 'pix', status: 'pendente', total: 47500, email: 'teste@exemplo.com', holder: 'Teste' } };
  const bad = { ...t, code: 'TESTE2', view: { ...t.view, origem: ap('ZZZZ') } };
  assert.equal((await api('/api/passagens/TESTE2', { method: 'PUT', body: JSON.stringify(bad) })).status, 400);
  assert.equal((await api('/api/passagens/TESTE1', { method: 'PUT', body: JSON.stringify(t) })).status, 200);
  t.payment.status = 'pago'; t.status = 'cancelada';
  assert.equal((await api('/api/passagens/TESTE1', { method: 'PUT', body: JSON.stringify(t) })).status, 200);
  const got = await (await api('/api/passagens/TESTE1')).json();
  assert.equal(got.status, 'cancelada');
  const { rows } = await pool.query("SELECT p.status, g.status AS pag, (SELECT count(*) FROM passagem_trecho WHERE passagem_codigo = p.codigo)::int AS trechos FROM passagem p JOIN pagamento g ON g.passagem_codigo = p.codigo WHERE p.codigo = 'TESTE1'");
  assert.deepEqual(rows[0], { status: 'cancelada', pag: 'pago', trechos: 1 });
});

test('relatórios exigem login e só aceitam nomes da lista', async () => {
  assert.equal((await api('/api/relatorios/frota')).status, 401);
  const auth = { headers: { Authorization: 'Bearer ' + await login() } };
  const lista = await (await api('/api/relatorios', auth)).json();
  assert.ok(lista.length >= 8);
  for (const { id } of lista) assert.equal((await api('/api/relatorios/' + id, auth)).status, 200, id);
  const rede = await (await api('/api/relatorios/aeroportos', auth)).json();
  assert.equal(rede.linhas.reduce((s, l) => s + Number(l.aeroportos), 0), 5603);
  assert.equal((await api('/api/relatorios/constructor', auth)).status, 404);
});

test('excluir no painel apaga o que nunca foi vendido e só desativa o que foi', async () => {
  const auth = { Authorization: 'Bearer ' + await login() };
  const cat = await (await api('/api/catalogo')).json();
  const novo = { ...cat.frota[0], id: 'teste-exclusao', nome: 'Teste exclusão' };
  const put = (frota) => api('/api/catalogo', { method: 'PUT', headers: auth, body: JSON.stringify({ ...cat, frota }) });
  assert.equal((await put([...cat.frota, novo])).status, 200);
  assert.equal((await put(cat.frota)).status, 200);
  assert.equal((await pool.query("SELECT 1 FROM aeronave WHERE id = 'teste-exclusao'")).rowCount, 0);
  // aeronave com venda e sem pacote: excluir só desativa, e voltar ao catálogo reativa
  const { rows: [v] } = await pool.query('SELECT p.aeronave_id AS id FROM passagem p WHERE p.aeronave_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pacote k WHERE k.aeronave_id = p.aeronave_id) LIMIT 1');
  assert.ok(v, 'precisa de uma passagem com aeronave fora de pacote (o teste de passagem cria uma)');
  assert.equal((await put(cat.frota.filter((a) => a.id !== v.id))).status, 200);
  assert.equal((await pool.query('SELECT ativo FROM aeronave WHERE id = $1', [v.id])).rows[0].ativo, false);
  assert.equal((await put(cat.frota)).status, 200);
  assert.equal((await pool.query('SELECT ativo FROM aeronave WHERE id = $1', [v.id])).rows[0].ativo, true);
});
