/**
 * @file page-frota.js
 * @description Catálogo de aeronaves com preço calculado para a rota informada e detalhes de cada modelo.
 */
(function () {
    'use strict';
    const A = window.Aether, $ = (id) => document.getElementById(id), esc = A.esc;
    $('c-pax').max = A.CONFIG.MAX_PAX;
    A.mountLayout({ active: 'frota' });

    const q = A.params();
    const CATS = [['todas', 'Todas'], ['leves', 'Jatos Leves'], ['medios', 'Jatos Médios'], ['pesados', 'Jatos Pesados'], ['turboelices', 'Turboélices']];
    let cat = CATS.some(([k]) => k === q.cat) ? q.cat : 'todas';
    let sort = 'preco';
    A.attachAirportAutocomplete($('c-origem')); A.attachAirportAutocomplete($('c-destino'));
    if (q.origem) A.setAirport($('c-origem'), q.origem);
    if (q.destino) A.setAirport($('c-destino'), q.destino);
    if (q.pax && Number(q.pax) >= 1) $('c-pax').value = Math.min(A.CONFIG.MAX_PAX, Math.floor(Number(q.pax)));

    $('sort').innerHTML = [['preco', 'Ordenar: menor preço da rota'], ['tarifa', 'Ordenar: tarifa por km'], ['alcance', 'Ordenar: maior alcance'], ['velocidade', 'Ordenar: mais rápido'], ['pax', 'Ordenar: maior capacidade']].map(([k, t]) => `<option value="${k}">${t}</option>`).join('');
    $('sort').addEventListener('change', (e) => { sort = e.target.value; render(); });

    const pax = () => Math.max(1, Math.min(A.CONFIG.MAX_PAX, Math.floor(Number($('c-pax').value)) || 1));
    let route = null;

    function readRoute() {
        const o = A.airportOf($('c-origem')), d = A.airportOf($('c-destino'));
        A.setError($('c-origem'), $('c-origem').value.trim() && !o ? 'Aeroporto não encontrado.' : '');
        A.setError($('c-destino'), $('c-destino').value.trim() && !d ? 'Aeroporto não encontrado.' : (o && o === d ? 'Origem e destino não podem ser iguais.' : ''));
        const r = o && d ? window.RouteService.computeRoute(o, d) : null;
        route = r && !r.error ? r : null;
        $('c-result').innerHTML = route
            ? `<strong class="text-ink">${esc(route.origem.icao)} &rarr; ${esc(route.destino.icao)}</strong>: ${route.distanciaOrtodromicaKm.toLocaleString('pt-BR')} km em linha reta (great circle), cerca de ${route.distanciaVooKm.toLocaleString('pt-BR')} km de voo. Valores por trecho, já com taxas.`
            : 'Informe origem e destino para ver o preço em cada aeronave.';
    }

    function render() {
        const n = pax();
        $('cat-chips').innerHTML = CATS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === cat}" data-cat="${k}" class="chip ${k === cat ? 'active' : ''}">${l}</button>`).join('');
        let rows = (window.FLEET || []).filter((a) => cat === 'todas' || a.categoria === cat).map((a) => {
            const est = route ? window.RouteService.estimateFor(route, a, n) : null;
            return { a, est, viable: !route || est.viavel };
        });
        const cmp = {
            preco: (x, y) => (route ? window.RouteService.compareEstimates(x.est, y.est) : x.a.tarifa_km - y.a.tarifa_km),
            tarifa: (x, y) => x.a.tarifa_km - y.a.tarifa_km, alcance: (x, y) => y.a.alcance_km - x.a.alcance_km,
            velocidade: (x, y) => y.a.velocidade_kmh - x.a.velocidade_kmh, pax: (x, y) => y.a.pax - x.a.pax
        }[sort];
        rows.sort(cmp);
        A.setHTML($('fleet-grid'), rows.map(({ a, est, viable }) => {
            let priceBlock;
            if (!route) priceBlock = `<span class="block text-[10px] text-mute uppercase">Tarifa</span><span class="font-serif text-2xl font-bold text-taupe">${A.fmtBRL2(a.tarifa_km)}<span class="text-xs text-mute font-sans"> / km</span></span>`;
            else if (viable) priceBlock = `<span class="block text-[10px] text-mute uppercase">Viagem &bull; ${esc(est.duracao)}</span><span class="font-serif text-2xl font-bold text-taupe">${A.fmtBRL(est.custo.totalCost)}</span>`;
            else priceBlock = `<span class="badge badge-bad">Indisponível nesta rota</span><span class="block text-[11px] text-bad mt-1">${!est.rotaViavel ? 'Nenhuma rota compatível na rede de escalas técnicas.' : `Comporta no máximo ${a.pax} passageiros.`}</span>`;
            const link = `criar-passagem.html?aeronave=${encodeURIComponent(a.id)}${route ? `&origem=${route.origem.icao}&destino=${route.destino.icao}` : ''}&pax=${n}`;
            return `<article class="card overflow-hidden flex flex-col ${viable ? '' : 'opacity-70'}">
                <div class="relative h-48 bg-fog">${AetherImages.markup(a.imagem, a.nome, 'jato', 'w-full h-full object-cover')}<span class="absolute top-3 right-3 badge badge-muted bg-sand/80">${esc(a.categoriaNome)}</span></div>
                <div class="p-5 flex-1 flex flex-col gap-4">
                    <div><h3 class="font-serif text-2xl font-bold text-ink leading-tight">${esc(a.nome)}</h3><p class="text-xs text-mute mt-1">${esc(a.descricao)}</p></div>
                    <dl class="grid grid-cols-3 gap-2 py-3 border-y border-ink/10 text-center text-xs"><div><dt class="text-[10px] uppercase text-mute">Capacidade</dt><dd class="text-ink font-semibold">${a.pax} pax</dd></div><div><dt class="text-[10px] uppercase text-mute">Alcance</dt><dd class="text-ink font-semibold">${a.alcance_km.toLocaleString('pt-BR')} km</dd></div><div><dt class="text-[10px] uppercase text-mute">Velocidade</dt><dd class="text-ink font-semibold">${a.velocidade_kmh} km/h</dd></div></dl>
                    ${A.itineraryHTML(est)}<div class="mt-auto flex items-end justify-between gap-3"><div>${priceBlock}</div><div class="flex flex-col gap-2"><button type="button" class="btn btn-ghost btn-sm" data-detail="${esc(a.id)}">Detalhes</button>${viable ? `<a href="${link}" class="btn btn-wine btn-sm">Escolher</a>` : ''}</div></div>
                </div></article>`;
        }).join(''));
    }

    // ---------- Detalhes ----------
    const SAMPLE_ROUTES = [['SBSP', 'SBRJ'], ['SBSP', 'SUPE'], ['SBGR', 'SBFN'], ['SBGR', 'KOPF'], ['SBGR', 'LPPT']];
    function openDetail(id) {
        const a = A.getAircraft(id); if (!a) return;
        const rows = SAMPLE_ROUTES.map(([o, d]) => {
            const r = window.RouteService.computeRoute(o, d); if (r.error) return '';
            const est = window.RouteService.estimateFor(r, a, 1);
            return `<tr class="border-t border-ink/5"><td class="py-2 text-ink">${esc(r.origem.cidade)} &rarr; ${esc(r.destino.cidade)}</td><td class="py-2 text-mute">${Math.round(est.kmTotal ?? r.distanciaVooKm).toLocaleString('pt-BR')} km</td><td class="py-2 text-mute">${est.rotaViavel ? esc(est.duracao) : '—'}</td><td class="py-2 text-right ${est.rotaViavel ? 'text-taupe font-semibold' : 'text-bad'}">${est.rotaViavel ? A.fmtBRL(est.custo.totalCost) : 'sem alcance'}</td></tr>`;
        }).join('');
        const n = pax();
        $('fleet-modal').innerHTML = `<div class="modal-backdrop !items-start overflow-y-auto" role="dialog" aria-modal="true" aria-label="${esc(a.nome)}"><div class="w-full max-w-2xl my-6 bg-sand border border-taupe/30 rounded-2xl overflow-hidden shadow-2xl">
            <div class="relative h-56 bg-fog">${AetherImages.markup(a.imagem, a.nome, 'jato', 'w-full h-full object-cover')}<button type="button" data-close class="absolute top-3 right-3 btn btn-ghost btn-sm bg-sand/80" aria-label="Fechar">&#10005;</button></div>
            <div class="p-6 space-y-5"><div><span class="badge badge-muted">${esc(a.categoriaNome)}</span><h2 class="font-serif text-3xl font-bold text-ink mt-2">${esc(a.nome)}</h2><p class="text-sm text-mute mt-2">${esc(a.descricao)}</p></div>
            <dl class="grid grid-cols-2 gap-x-6 text-xs"><div class="flex justify-between py-2 border-b border-ink/5"><dt class="text-mute">Capacidade</dt><dd class="text-ink">até ${a.pax} pax</dd></div><div class="flex justify-between py-2 border-b border-ink/5"><dt class="text-mute">Alcance</dt><dd class="text-ink">${a.alcance_km.toLocaleString('pt-BR')} km</dd></div><div class="flex justify-between py-2 border-b border-ink/5"><dt class="text-mute">Velocidade de cruzeiro</dt><dd class="text-ink">${a.velocidade_kmh} km/h</dd></div><div class="flex justify-between py-2 border-b border-ink/5"><dt class="text-mute">Valor por hora de voo</dt><dd class="text-ink">${A.fmtBRL(a.valor_hora)}</dd></div><div class="flex justify-between py-2 col-span-2"><dt class="text-mute">Tarifa por km (valor/hora &divide; velocidade)</dt><dd class="text-taupe font-semibold">${A.fmtBRL2(a.tarifa_km)}</dd></div></dl>
            <div><h3 class="font-serif text-lg font-bold text-ink mb-2">Exemplos de preço (1 trecho, com taxas)</h3><table class="w-full text-xs"><thead><tr class="text-left text-[10px] uppercase text-mute"><th class="pb-2">Rota</th><th class="pb-2">Distância</th><th class="pb-2">Tempo</th><th class="pb-2 text-right">Valor</th></tr></thead><tbody>${rows}</tbody></table></div>
            <a href="criar-passagem.html?aeronave=${encodeURIComponent(a.id)}${route ? `&origem=${route.origem.icao}&destino=${route.destino.icao}` : ''}&pax=${n}" class="btn btn-wine w-full">Escolher esta aeronave e criar passagem</a></div></div></div>`;
    }
    const closeDetail = () => { $('fleet-modal').innerHTML = ''; };
    $('fleet-modal').addEventListener('click', (e) => { if (e.target.classList.contains('modal-backdrop') || e.target.closest('[data-close]')) closeDetail(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });
    $('fleet-grid').addEventListener('click', (e) => { const b = e.target.closest('[data-detail]'); if (b) openDetail(b.dataset.detail); });
    $('cat-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; render(); } });

    ['c-origem', 'c-destino'].forEach((id) => $(id).addEventListener('change', () => { readRoute(); render(); }));
    $('c-pax').addEventListener('input', render);
    $('c-clear').addEventListener('click', () => { ['c-origem', 'c-destino'].forEach((id) => { $(id).value = ''; $(id).dataset.icao = ''; A.setError($(id), ''); }); readRoute(); render(); });

    readRoute(); render();
})();
