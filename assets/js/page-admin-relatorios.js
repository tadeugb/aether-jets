// Aba "Relatórios" do painel: lê as views de relatório pela API (só funciona com o server.js rodando).
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const esc = window.Aether.esc;
    const btn = document.querySelector('#admin-nav [data-reports]');
    const listCard = $('admin-list').closest('section');
    const box = $('admin-reports'), select = $('report-select'), out = $('report-out');
    const LABEL = { mes: 'Mês', passagens: 'Passagens', canceladas: 'Canceladas', passageiros: 'Passageiros', receita_paga: 'Receita paga', a_receber: 'A receber',
        origem: 'Origem', destino: 'Destino', valor_total: 'Valor total', aeronave: 'Aeronave', categoria: 'Categoria', capacidade: 'Capacidade',
        ocupacao_media_pct: 'Ocupação média (%)', km_por_sentido: 'Km voados (por sentido)', nome: 'Nome', quantidade: 'Quantidade', receita: 'Receita',
        email: 'E-mail', total_pago: 'Total pago', ultima_compra: 'Última compra', metodo: 'Forma', status: 'Situação', valor: 'Valor',
        parcelas_media: 'Parcelas (média)', regiao: 'Região', paises: 'Países', aeroportos: 'Aeroportos', escalas_tecnicas: 'Escalas técnicas',
        maior_pista_ft: 'Maior pista (pés)', pacote: 'Pacote', lugares: 'Lugares usados', dias: 'Dias', noites: 'Noites', preco: 'Preço', preco_por_noite: 'Preço por noite' };
    const MONEY = /receita|valor|preco|pago|receber/;
    const fmt = (col, v) => v === null ? '—' : MONEY.test(col) ? window.Aether.fmtBRL2(Number(v))
        : typeof v === 'number' || /^-?\d+(\.\d+)?$/.test(v) ? Number(v).toLocaleString('pt-BR') : String(v);

    const api = (path) => fetch(path, { headers: { Authorization: 'Bearer ' + (window.AetherAdminAuth.token() || '') } })
        .then(r => r.json().then(body => { if (!r.ok) throw new Error(body.erro || 'Falha ao carregar.'); return body; }));
    const fail = (e) => { out.innerHTML = `<p class="text-bad text-sm">${esc(e.message === 'Failed to fetch' ? 'Servidor indisponível. Rode npm start e abra o site por localhost:3000.' : e.message)}</p>`; };

    function show(id) {
        out.innerHTML = '<p class="text-mute text-sm">Carregando…</p>';
        api('/api/relatorios/' + encodeURIComponent(id)).then(({ colunas, linhas }) => {
            if (!linhas.length) { out.innerHTML = '<p class="text-mute text-sm">Sem dados ainda: as vendas aparecem aqui depois das primeiras passagens.</p>'; return; }
            out.innerHTML = `<table class="w-full text-sm"><thead><tr>${colunas.map(c => `<th scope="col" class="text-left font-semibold p-2 border-b border-stone/50 whitespace-nowrap">${esc(LABEL[c] || c)}</th>`).join('')}</tr></thead>
                <tbody>${linhas.map(l => `<tr>${colunas.map(c => `<td class="p-2 border-b border-stone/30 ${typeof l[c] === 'number' || MONEY.test(c) ? 'text-right tabular-nums' : ''}">${esc(fmt(c, l[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        }).catch(fail);
    }

    function open() {
        listCard.hidden = true; $('admin-edit').hidden = true; box.hidden = false;
        $('admin-status').textContent = '';
        document.querySelectorAll('#admin-nav .chip').forEach(c => { const on = c === btn; c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on)); });
        if (select.options.length) return show(select.value);
        api('/api/relatorios').then(list => {
            select.innerHTML = list.map(r => `<option value="${esc(r.id)}">${esc(r.titulo)}</option>`).join('');
            show(select.value);
        }).catch(fail);
    }

    btn.addEventListener('click', open);
    select.addEventListener('change', () => show(select.value));
    // Voltar para Aeronaves/Catering/Pacotes esconde os relatórios (o page-admin.js cuida do resto)
    document.querySelectorAll('#admin-nav [data-section]').forEach(b => b.addEventListener('click', () => { box.hidden = true; listCard.hidden = false; btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }));
})();
