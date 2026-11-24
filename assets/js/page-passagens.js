/**
 * @file page-passagens.js
 * @description Etapa 4 e painel de passagens: lista com filtros, detalhes completos, cartão de embarque para impressão,
 * pagamento pendente (Pix/cheque/transferência, simulado) e cancelamento com cálculo de reembolso.
 */
(function () {
    'use strict';
    const A = window.Aether, $ = (id) => document.getElementById(id), esc = A.esc;
    const q = A.params();
    A.mountLayout({ active: 'passagens', step: q.novo ? 4 : 0 });

    let filter = 'todas', search = '';
    const DAY = 86400000;

    const STATUS = {
        confirmada: ['Confirmada', 'badge-ok'], aguardando: ['Aguardando pagamento', 'badge-warn'],
        concluida: ['Concluída', 'badge-muted'], cancelada: ['Cancelada', 'badge-bad'], expirada: ['Expirada', 'badge-bad']
    };
    const badge = (st) => `<span class="badge ${STATUS[st][1]}">${STATUS[st][0]}</span>`;
    const dt = (iso) => A.fmtDateTime(iso);

    // ---------- Lista ----------
    function matches(t, st) {
        if (filter === 'proximas' && !['confirmada', 'aguardando'].includes(st)) return false;
        if (filter === 'aguardando' && st !== 'aguardando') return false;
        if (filter === 'concluidas' && st !== 'concluida') return false;
        if (filter === 'canceladas' && !['cancelada', 'expirada'].includes(st)) return false;
        if (search) {
            const hay = `${t.code} ${t.view.origem.cidade} ${t.view.destino.cidade} ${t.view.origem.icao} ${t.view.destino.icao} ${t.view.aircraft.nome}`.toLowerCase();
            if (!hay.includes(search.toLowerCase())) return false;
        }
        return true;
    }
    function render() {
        const all = A.getTickets();
        const withSt = all.map((t) => ({ t, st: A.ticketStatus(t) }));
        const counts = { todas: all.length, proximas: withSt.filter((x) => ['confirmada', 'aguardando'].includes(x.st)).length, aguardando: withSt.filter((x) => x.st === 'aguardando').length, concluidas: withSt.filter((x) => x.st === 'concluida').length, canceladas: withSt.filter((x) => ['cancelada', 'expirada'].includes(x.st)).length };
        const F = [['todas', 'Todas'], ['proximas', 'Próximas'], ['aguardando', 'Aguardando pagamento'], ['concluidas', 'Concluídas'], ['canceladas', 'Canceladas']];
        $('filters').innerHTML = F.map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === filter}" data-filter="${k}" class="chip ${k === filter ? 'active' : ''}">${l} (${counts[k]})</button>`).join('');
        const list = withSt.filter((x) => matches(x.t, x.st));
        $('empty').classList.toggle('hidden', all.length > 0);
        $('filters').parentElement.classList.toggle('hidden', all.length === 0);
        $('btn-wipe').classList.toggle('hidden', all.length === 0);
        if (all.length) {
            $('ticket-list').innerHTML = list.length ? list.map(({ t, st }) => card(t, st)).join('') : '<div class="card p-8 text-center text-sm text-mute">Nenhuma passagem corresponde ao filtro.</div>';
        } else $('ticket-list').innerHTML = '';
    }
    function card(t, st) {
        const v = t.view;
        return `<article class="card p-5 hover:border-taupe/40 transition-colors" data-code="${esc(t.code)}">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex-1">
                    <div class="flex flex-wrap items-center gap-2 mb-2"><span class="font-mono text-xs text-taupe">${esc(t.code)}</span>${badge(st)}${t.demo ? '<span class="badge badge-muted">Exemplo</span>' : ''}${v.tripType === 'ida-volta' ? '<span class="badge badge-muted">Ida e volta</span>' : ''}</div>
                    <h3 class="font-serif text-2xl font-bold text-ink">${esc(v.origem.icao)} &rarr; ${esc(v.destino.icao)}</h3>
                    <p class="text-xs text-mute">${esc(v.origem.cidade)} &bull; ${esc(v.destino.cidade)}</p>
                    <p class="text-xs text-mute mt-2">${esc(dt(v.departure))} &bull; ${esc(v.aircraft.nome)} &bull; ${v.pax} ${v.pax === 1 ? 'passageiro' : 'passageiros'}</p>
                </div>
                <div class="md:text-right space-y-2"><div><span class="block text-[10px] uppercase text-mute">Total</span><span class="font-serif text-2xl font-bold text-taupe">${A.fmtBRL2(t.payment.total)}</span></div>
                    <button type="button" class="btn btn-wine btn-sm" data-open="${esc(t.code)}">Ver detalhes</button></div>
            </div></article>`;
    }
    $('filters').addEventListener('click', (e) => { const b = e.target.closest('[data-filter]'); if (b) { filter = b.dataset.filter; render(); } });
    $('search').addEventListener('input', (e) => { search = e.target.value.trim(); render(); });
    $('ticket-list').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) openDetail(b.dataset.open); });

    // ---------- Detalhes ----------
    const row = (l, v) => `<div class="flex justify-between gap-4 text-xs py-1.5 border-b border-ink/5 last:border-0"><dt class="text-mute">${l}</dt><dd class="text-ink text-right">${v}</dd></div>`;
    const section = (title, inner) => `<section class="card p-5"><h3 class="font-serif text-lg font-bold text-ink mb-3">${title}</h3>${inner}</section>`;

    function boardingPass(t, st) {
        const v = t.view;
        const leg = (o, d, when, label) => `<div class="flex items-center justify-between gap-4 py-3">
            <div><span class="block text-[10px] uppercase tracking-wider">${label}</span><span class="font-serif text-3xl font-bold">${esc(o.icao)}</span><span class="block text-xs">${esc(o.cidade)}</span></div>
            <div class="text-center text-xs"><span class="block">&#9992;</span>${esc(v.duracao)}</div>
            <div class="text-right"><span class="block text-[10px] uppercase tracking-wider">&nbsp;</span><span class="font-serif text-3xl font-bold">${esc(d.icao)}</span><span class="block text-xs">${esc(d.cidade)}</span></div>
            <div class="text-right text-xs"><span class="block text-[10px] uppercase tracking-wider">Decolagem</span><strong>${esc(dt(when))}</strong></div></div>`;
        return `<div id="print-area" class="bg-white text-[#23262B] rounded-xl p-6 shadow-xl">
            <div class="flex justify-between items-start border-b border-stone pb-3 mb-2"><div><span class="font-serif text-xl font-bold tracking-widest">AETHER JETS</span><span class="block text-[10px] uppercase tracking-widest text-mute">Cartão de embarque &bull; ilustrativo</span></div><div class="text-right"><span class="block text-[10px] uppercase text-mute">Localizador</span><span class="font-mono text-xl font-bold">${esc(t.code)}</span></div></div>
            ${leg(v.origem, v.destino, v.departure, 'Ida')}
            ${v.tripType === 'ida-volta' ? '<div class="border-t border-dashed border-stone"></div>' + leg(v.destino, v.origem, v.returnDeparture, 'Volta') : ''}
            <div class="grid grid-cols-3 gap-3 text-xs border-t border-stone pt-3"><div><span class="block text-[10px] uppercase text-mute">Aeronave</span><strong>${esc(v.aircraft.nome)}</strong></div><div><span class="block text-[10px] uppercase text-mute">Passageiros</span><strong>${v.pax}</strong></div><div><span class="block text-[10px] uppercase text-mute">Status</span><strong>${STATUS[st][0]}</strong></div></div>
            <div class="mt-4 flex items-end justify-between gap-4"><div class="overflow-hidden">${A.barcodeSVG(t.code, 260, 46)}</div><p class="text-[10px] text-mute text-right max-w-[11rem]">Código ilustrativo, sem validade para embarque real. Apresente o localizador ao concierge.</p></div></div>`;
    }

    function pendingBlock(t) {
        const p = t.payment; if (p.status === 'pago' || t.status === 'cancelada') return '';
        let inner = '';
        if (p.method === 'pix') inner = `<div class="flex flex-col sm:flex-row gap-5 items-center"><div class="bg-white p-2 rounded-lg shrink-0">${A.fakeQR(t.code, 150)}</div><div class="flex-1 space-y-2 text-xs"><p class="text-mute">Pague <strong class="text-ink">${A.fmtBRL2(p.total)}</strong> escaneando o QR Code ou usando o código abaixo. <span class="text-warn">QR e código de demonstração.</span></p><div class="flex gap-2"><input readonly class="field font-mono !text-[11px]" value="${esc(p.pixCode || '')}" aria-label="Código Pix copia e cola"><button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(p.pixCode || '')}">Copiar</button></div></div></div>`;
        else if (p.method === 'cheque') inner = '<p class="text-xs text-mute">Aguardando a retirada do cheque pelo mensageiro e a compensação (até 3 dias úteis). O concierge entrará em contato para agendar.</p>';
        else inner = '<p class="text-xs text-mute">Aguardando a conferência da transferência. Envie o comprovante ao concierge para agilizar.</p>';
        return `<div class="card card-gold p-5 space-y-4"><h3 class="font-serif text-lg font-bold text-warn">Pagamento pendente</h3>${inner}<button type="button" class="btn btn-wine btn-sm" data-simpay="${esc(t.code)}">Simular confirmação do pagamento</button></div>`;
    }

    function detailHTML(t) {
        const v = t.view, p = t.payment, val = v.valores, st = A.ticketStatus(t), r = A.refundInfo(t);
        const canCancel = ['confirmada', 'aguardando'].includes(st) && new Date(v.departure).getTime() > Date.now();
        const lines = (arr, fn) => arr.length ? arr.map(fn).join('') : '<p class="text-xs text-mute">Nenhum item selecionado.</p>';
        const weather = v.weather && v.weather.status === 'ok' ? A.weatherHTML(v.weather, v.destino.cidade) : '<p class="text-xs text-mute">Previsão não disponível quando a passagem foi emitida (ela só existe a partir de 16 dias antes do voo).</p>';
        return `<div class="flex flex-wrap items-start justify-between gap-3 mb-5"><div><span class="font-mono text-sm text-taupe">${esc(t.code)}</span><h2 class="font-serif text-3xl font-bold text-ink">${esc(v.origem.icao)} &rarr; ${esc(v.destino.icao)}</h2><span class="text-xs text-mute">Emitida em ${esc(dt(t.createdAt))}</span></div><div class="flex items-center gap-2">${badge(st)}<button type="button" class="btn btn-ghost btn-sm" data-close aria-label="Fechar">&#10005;</button></div></div>
        <div class="space-y-5">
            ${boardingPass(t, st)}
            ${pendingBlock(t)}
            ${section('Voo', `<dl>${row('Origem', `${esc(v.origem.nome)} (${esc(v.origem.icao)}/${esc(v.origem.iata)}), ${esc(v.origem.cidade)}, ${esc(v.origem.pais)}`)}${row('Destino', `${esc(v.destino.nome)} (${esc(v.destino.icao)}/${esc(v.destino.iata)}), ${esc(v.destino.cidade)}, ${esc(v.destino.pais)}`)}${row('Tipo', v.tripType === 'ida-volta' ? 'Ida e volta' : 'Somente ida')}${row('Decolagem (ida)', esc(dt(v.departure)))}${v.returnDeparture ? row('Decolagem (volta)', esc(dt(v.returnDeparture))) : ''}${row('Distância great circle', v.distanciaOrtodromicaKm.toLocaleString('pt-BR') + ' km')}${row('Distância de voo estimada', v.distanciaVooKm.toLocaleString('pt-BR') + ' km')}${row('Tempo médio por trecho', esc(v.duracao))}${row('Passageiros', v.pax)}</dl>`)}
            ${section('Aeronave', `<dl>${row('Modelo', esc(v.aircraft.nome))}${row('Categoria', esc(v.aircraft.categoriaNome))}${row('Capacidade', 'até ' + v.aircraft.pax + ' passageiros')}${row('Alcance', v.aircraft.alcance_km.toLocaleString('pt-BR') + ' km')}${row('Velocidade de cruzeiro', v.aircraft.velocidade_kmh + ' km/h')}${row('Tarifa', A.fmtBRL2(v.aircraft.tarifa_km) + ' por km')}</dl>`)}
            ${section('Cardápio e serviços', `<h4 class="text-[11px] uppercase tracking-wider text-taupe mb-1">Cardápio</h4>${lines(v.menuLines, (l) => row(`${l.qtd}&times; ${esc(l.nome)}`, A.fmtBRL(l.total)))}<h4 class="text-[11px] uppercase tracking-wider text-taupe mt-4 mb-1">Serviços adicionais</h4>${lines(v.serviceLines, (l) => row(esc(l.nome) + (l.mult > 1 ? ` (&times;${l.mult})` : ''), A.fmtBRL(l.total)))}${v.dietary.length ? `<h4 class="text-[11px] uppercase tracking-wider text-taupe mt-4 mb-1">Restrições alimentares</h4><p class="text-xs text-ink">${v.dietary.map(esc).join(', ')}</p>` : ''}${v.notes ? `<h4 class="text-[11px] uppercase tracking-wider text-taupe mt-4 mb-1">Observações</h4><p class="text-xs text-ink whitespace-pre-line">${esc(v.notes)}</p>` : ''}`)}
            ${section('Clima no destino', weather)}
            ${section('Pagamento', `<dl>${row('Forma', esc(p.label))}${row('Situação', p.status === 'pago' ? 'Pago' + (p.paidAt ? ' em ' + esc(dt(p.paidAt)) : '') : 'Pendente')}${p.method === 'credito' ? row('Parcelamento', `${p.parcelas}x de ${A.fmtBRL2(p.valorParcela)}`) : ''}${p.last4 ? row('Cartão', `${esc(p.brand || 'Cartão')} final ${esc(p.last4)}`) : ''}${row('Pagador', esc(p.holder))}${row('Documento', esc(p.docMasked))}${row('E-mail', esc(p.email))}</dl>`)}
            ${v.trechos ? section('Itinerário', A.itineraryHTML({ rotaViavel: true, trechos: v.trechos, escalas: v.escalas, horas: v.horasPorTrecho, kmTotal: v.trechos.reduce((sum, leg) => sum + leg.km, 0), paradaMin: v.trechos.reduce((sum, leg) => sum + leg.paradaMin, 0), taxaEscalas: (val.taxaEscalas || 0) / val.legs }, val.legs === 2)) : ''}
            ${section('Valores', `<dl>${row(`Voo (${v.distanciaVooKm.toLocaleString('pt-BR')} km &times; ${A.fmtBRL2(v.aircraft.tarifa_km)}/km${val.legs === 2 ? ' &times; 2 sentidos' : ''})`, A.fmtBRL(val.vooBase))}${row('Taxas de voo e escalas', A.fmtBRL(val.vooTaxas))}${row('Cardápio', A.fmtBRL(val.catering))}${row('Serviços adicionais', A.fmtBRL(val.servicos))}${row('<strong>Subtotal</strong>', '<strong>' + A.fmtBRL(val.subtotal) + '</strong>')}${p.descontoValor ? row('Desconto Pix (5%)', '<span class="text-ok">&minus; ' + A.fmtBRL2(p.descontoValor) + '</span>') : ''}${p.jurosValor ? row('Juros do parcelamento', '<span class="text-warn">+ ' + A.fmtBRL2(p.jurosValor) + '</span>') : ''}<div class="flex justify-between pt-3 mt-1 border-t border-ink/10"><dt class="text-ink font-semibold">Total</dt><dd class="font-serif text-2xl font-bold text-taupe">${A.fmtBRL2(p.total)}</dd></div></dl>`)}
            ${section('Cancelamento', `<ul class="text-xs text-mute space-y-1 mb-3"><li>Mais de 48 h antes da decolagem: reembolso de <strong class="text-ink">100%</strong>.</li><li>Entre 24 h e 48 h: reembolso de <strong class="text-ink">50%</strong>.</li><li>Menos de 24 h: <strong class="text-ink">sem reembolso</strong>.</li></ul>${t.status === 'cancelada' ? `<p class="text-xs text-bad">Cancelada em ${esc(dt(t.cancelledAt))}. Reembolso: ${A.fmtBRL2(t.refund ? t.refund.valor : 0)} (${Math.round((t.refund ? t.refund.pct : 0) * 100)}%).</p>` : canCancel ? `<p class="text-xs text-ink mb-3">Se cancelar agora: reembolso de <strong class="text-taupe">${A.fmtBRL2(r.valor)}</strong> (${Math.round(r.pct * 100)}%${r.pago ? '' : ', pagamento ainda não realizado, sem cobrança'}).</p><button type="button" class="btn btn-ghost btn-sm !border-bad/50 !text-bad" data-cancel="${esc(t.code)}">Cancelar passagem</button>` : '<p class="text-xs text-mute">Esta passagem não pode mais ser cancelada.</p>'}`)}
            <div class="flex flex-wrap gap-3"><button type="button" class="btn btn-wine" data-print>Imprimir cartão de embarque</button><button type="button" class="btn btn-ghost" data-copy="${esc(t.code)}">Copiar localizador</button></div>
        </div>`;
    }

    function openDetail(code) {
        const t = A.getTickets().find((x) => x.code === code); if (!t) return;
        const root = $('ticket-modal');
        root.innerHTML = `<div class="modal-backdrop !items-start overflow-y-auto" role="dialog" aria-modal="true" aria-label="Detalhes da passagem ${esc(code)}"><div class="w-full max-w-3xl my-6 bg-sand border border-taupe/30 rounded-2xl p-6 shadow-2xl" data-code="${esc(code)}">${detailHTML(t)}</div></div>`;
        A.icons();
    }
    const closeDetail = () => { $('ticket-modal').innerHTML = ''; };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('ticket-modal').innerHTML) closeDetail(); });
    $('ticket-modal').addEventListener('click', async (e) => {
        const backdrop = e.target.classList && e.target.classList.contains('modal-backdrop');
        if (backdrop || e.target.closest('[data-close]')) { closeDetail(); return; }
        const box = e.target.closest('[data-code]'); const code = box ? box.dataset.code : null;
        const copy = e.target.closest('[data-copy]'); if (copy) { A.copyText(copy.dataset.copy); return; }
        if (e.target.closest('[data-print]')) { window.print(); return; }
        const sim = e.target.closest('[data-simpay]'); if (sim) {
            A.updateTicket(sim.dataset.simpay, (t) => { t.payment.status = 'pago'; t.payment.paidAt = new Date().toISOString(); });
            A.toast('Pagamento confirmado (simulação).'); openDetail(sim.dataset.simpay); render(); return;
        }
        const cancel = e.target.closest('[data-cancel]'); if (cancel) {
            const t = A.getTickets().find((x) => x.code === cancel.dataset.cancel); const r = A.refundInfo(t);
            const ok = await A.confirmDialog({ title: 'Cancelar esta passagem?', html: `Reembolso estimado: <strong class="text-taupe">${A.fmtBRL2(r.valor)}</strong> (${Math.round(r.pct * 100)}%).${r.pago ? '' : '<br>O pagamento ainda não foi realizado, então não há cobrança.'}<br><span class="text-xs">Esta ação não pode ser desfeita.</span>`, confirmText: 'Cancelar passagem', cancelText: 'Manter' });
            if (!ok) return;
            A.updateTicket(t.code, (x) => { x.status = 'cancelada'; x.cancelledAt = new Date().toISOString(); x.refund = { pct: r.pct, valor: r.valor }; });
            A.toast(r.valor ? `Passagem cancelada. Reembolso de ${A.fmtBRL2(r.valor)} (simulado).` : 'Passagem cancelada.'); openDetail(t.code); render();
        }
    });

    // ---------- Exemplos e limpeza ----------
    function seed() {
        const base = (o, d, aid, pax, depDays, ret, menu, services) => ({ origemICAO: o, destinoICAO: d, aircraftId: aid, pax, tripType: ret ? 'ida-volta' : 'ida', departure: new Date(Date.now() + depDays * DAY).toISOString(), returnDeparture: ret ? new Date(Date.now() + ret * DAY).toISOString() : '', menu: menu || {}, services: services || {}, dietary: [], notes: '' });
        const mk = (draft, payment, createdDaysAgo, status) => { const t = A.buildTicket(draft, payment, null); t.demo = true; t.createdAt = new Date(Date.now() - createdDaysAgo * DAY).toISOString(); return t; };
        const pay = (method, label, total, extra) => Object.assign({ method, label, parcelas: 1, valorParcela: total, total, descontoValor: 0, jurosValor: 0, status: 'pago', paidAt: new Date().toISOString(), holder: 'Beatriz Monte Negro', docMasked: '***.***.247-25', email: 'cliente@aetherjets.com', brand: null, last4: null }, extra || {});
        const d1 = base('SBSP', 'SBRJ', 'phenom-300e', 3, -20, 0, { 'cafe-cha': 3, 'agua-imp': 4 });
        const p1 = A.priceTrip(d1); const t1 = mk(d1, pay('credito', 'Cartão de crédito', p1.subtotal, { brand: 'Visa', last4: '1111' }), 30);
        const d2 = base('SBGR', 'SUPE', 'citation-cj3', 4, 12, 15, { 'champ-veuve': 2, risoto: 2, salmao: 2 }, { transfer: true });
        const p2 = A.priceTrip(d2); const tot2 = A.paymentTotals(p2.subtotal, 'credito', 6);
        const t2 = mk(d2, pay('credito', 'Cartão de crédito', tot2.total, { parcelas: 6, valorParcela: tot2.parcela, brand: 'Mastercard', last4: '4444' }), 2);
        const d3 = base('SBGR', 'LPPT', 'falcon-8x', 6, 30, 0, { 'vinho-chab': 2, caviar: 1 });
        const p3 = A.priceTrip(d3); const tot3 = A.paymentTotals(p3.subtotal, 'pix');
        const t3 = mk(d3, pay('pix', 'Pix', tot3.total, { status: 'pendente', paidAt: null, descontoValor: tot3.desconto }), 0);
        t3.payment.pixCode = `DEMO.PIX.${t3.code}.${Math.round(tot3.total * 100)}`;
        [t3, t2, t1].forEach((t) => A.addTicket(t));
    }
    $('btn-seed').addEventListener('click', () => { seed(); A.toast('Passagens de exemplo carregadas.'); render(); });
    $('btn-wipe').addEventListener('click', async () => {
        if (await A.confirmDialog({ title: 'Apagar todas as passagens?', message: 'Isso remove as passagens salvas neste navegador. Não pode ser desfeito.', confirmText: 'Apagar tudo' })) { A.saveTickets([]); render(); A.toast('Passagens apagadas.'); }
    });

    // ---------- Início ----------
    render();
    if (q.novo) {
        const t = A.getTickets().find((x) => x.code === q.novo);
        if (t) {
            const pend = t.payment.status !== 'pago';
            $('success-banner').classList.remove('hidden');
            $('success-banner').innerHTML = `<h2 class="font-serif text-2xl font-bold text-ink mb-1">Passagem emitida!</h2><p class="text-sm text-mute">Localizador <strong class="font-mono text-taupe">${esc(t.code)}</strong>. ${pend ? 'Falta concluir o pagamento: veja as instruções nos detalhes abaixo.' : 'Pagamento aprovado. Boa viagem!'}</p>`;
            history.replaceState(null, '', 'passagens.html');
            openDetail(t.code);
        }
    }
})();
