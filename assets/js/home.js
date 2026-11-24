/**
 * @file home.js
 * @description Lógica da home: layout compartilhado, simulador de cotação com resultado na própria página,
 * validações (origem = destino, aeroporto inexistente com sugestões, data passada, passageiros acima da capacidade),
 * categorias da frota e atalhos de destino.
 *
 * COMO A DISTÂNCIA É CALCULADA (sem tabela N x N): RouteService.computeRoute usa Haversine (círculo máximo) em tempo real
 * entre as coordenadas do OurAirports e multiplica por 1,05 (fator médio de desvio das aerovias). Nada é pré-calculado.
 */
(function () {
    'use strict';
    const A = window.Aether, I = window.AetherI18n, esc = A.esc;
    const t = (k, v) => I.t(k, v);
    const $ = (id) => document.getElementById(id);
    const NM = 1.852;                       // 1 milha náutica = 1,852 km
    window.__aetherLive = true;
    A.mountLayout({ active: 'home', exitIntent: true });

    const maxPax = () => Math.max(1, ...window.FLEET.map(a => a.pax));
    let last = null;                        // última cotação exibida (para redesenhar ao trocar moeda/idioma)

    // ---------- Frota: 4 categorias ----------
    const CATS = [['leves', 'wind'], ['medios', 'compass'], ['pesados', 'globe'], ['turboelices', 'activity']];
    function renderCategories() {
        const box = $('fleet-categories'); if (!box) return;
        box.innerHTML = CATS.map(([cat, icon]) => {
            const list = window.FLEET.filter((a) => a.categoria === cat);
            if (!list.length) return '';
            const minRate = Math.min.apply(null, list.map((a) => a.tarifa_km)), maxP = Math.max.apply(null, list.map((a) => a.pax));
            const rangeMax = Math.max.apply(null, list.map((a) => a.alcance_km));
            return `<a href="frota.html?cat=${cat}" class="group card overflow-hidden block hover:border-taupe/70 transition-colors reveal in">
                <div class="h-40 overflow-hidden relative">${AetherImages.markup(list[0].imagem, t('cat.' + cat), 'jato', 'w-full h-full object-cover grayscale-[.5] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500')}<div class="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent"></div></div>
                <div class="p-5"><div class="flex items-center gap-2 text-wineInk mb-1"><i data-lucide="${icon}" class="w-4 h-4"></i><span class="text-[11px] uppercase tracking-wider font-semibold">${esc(t('fleet.sub', { n: list.length }))}</span></div>
                <h3 class="font-serif text-xl font-bold text-ink mb-3">${esc(t('cat.' + cat))}</h3>
                <dl class="grid grid-cols-2 gap-2 text-xs text-mute"><div><dt>${esc(t('sim.pax'))}</dt><dd class="text-ink font-semibold">${maxP}</dd></div><div><dt>${esc(t('fleet.range'))}</dt><dd class="text-ink font-semibold">${rangeMax.toLocaleString(I.locale)} km</dd></div></dl>
                <p class="mt-3 text-xs text-mute">${esc(t('fleet.fromTo'))} <span class="text-ink font-semibold">${A.fmtBRL(minRate)}</span> ${esc(t('fleet.perkm'))}</p></div></a>`;
        }).join('');
        A.icons();
    }

    // ---------- Simulador ----------
    const f = { o: $('sim-origem'), d: $('sim-destino'), date: $('sim-data'), pax: $('sim-pax') };
    A.attachAirportAutocomplete(f.o); A.attachAirportAutocomplete(f.d);

    // "Você quis dizer...?": as 3 melhores sugestões de Aether.rankAirports para cada campo não encontrado
    function suggestions(input, text) {
        const box = $('sim-suggest');
        const best = A.rankAirports(text, 3);
        if (!best.length) return;
        box.innerHTML += `<p class="mb-1"><span class="text-mute font-medium">${esc(t('err.dym'))}</span> ` + best.map((a) => `<button type="button" data-sug="${esc(input.id)}" data-icao="${esc(a.icao)}" class="chip mr-1 mb-1">${esc(A.airportLabel(a))}</button>`).join('') + '</p>';
    }
    $('sim-suggest').addEventListener('click', (e) => {
        const b = e.target.closest('[data-sug]'); if (!b) return;
        const input = $(b.dataset.sug); A.setAirport(input, b.dataset.icao); A.setError(input, ''); b.closest('p').remove(); input.focus();
    });

    function validate() {
        let ok = true, firstBad = null;
        const bad = (el, msg) => { A.setError(el, msg); if (msg) { ok = false; firstBad = firstBad || el; } };
        $('sim-suggest').innerHTML = '';
        // origem e destino
        const read = (el) => {
            const text = el.value.trim();
            if (!text) return { err: t('err.req') };
            const icao = A.airportOf(el);
            if (!icao) { suggestions(el, text); return { err: t('err.notfound') }; }
            return { icao };
        };
        const o = read(f.o), d = read(f.d);
        bad(f.o, o.err || ''); bad(f.d, d.err || '');
        if (o.icao && d.icao && o.icao === d.icao) bad(f.d, t('err.same'));
        // data no passado (opcional: só valida se preenchida)
        if (f.date.value) { const dt = new Date(f.date.value); bad(f.date, isNaN(dt) || dt.getTime() < Date.now() ? t('err.past') : ''); } else bad(f.date, '');
        // passageiros
        const pax = Number(f.pax.value);
        if (!Number.isInteger(pax) || pax < 1) bad(f.pax, t('err.req'));
        else if (pax > maxPax()) bad(f.pax, t('err.pax', { n: pax, m: maxPax() })); else bad(f.pax, '');
        if (!ok) { if (firstBad) firstBad.focus(); return null; }
        return { origem: o.icao, destino: d.icao, pax, data: f.date.value };
    }

    function renderResult() {
        const box = $('quote-result'); if (!last) return;
        const { q, args } = last, r = q.route;
        const nm = Math.round(r.distanciaVooKm / NM);
        const best = q.opcoes.find((o) => o.viavel);
        const rows = q.opcoes.map((o) => {
            const viable = o.viavel;
            const flags = [];
            if (!o.capacidadeOk) flags.push(`<span class="badge badge-bad">${esc(t('res.over', { n: args.pax }))}</span>`);
            if (!o.rotaViavel) flags.push(`<span class="badge badge-bad">${esc(t('res.unreachable'))}</span>`);
            if (o === best) flags.push(`<span class="badge ${o === best ? 'badge-ok' : 'badge-muted'}">${esc(o === best ? t('res.best') : t('res.direct'))}</span>`);
            return `<li class="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-ink/10 ${viable ? '' : 'opacity-70'} ${o === best ? 'bg-wine/5 -mx-3 px-3 rounded-lg' : ''}">
                <div class="min-w-0"><p class="font-semibold text-ink">${esc(o.aircraft.nome)}</p><p class="text-xs text-mute">${esc(o.aircraft.categoriaNome)} &bull; ${o.aircraft.pax} pax &bull; ${o.duracao ? esc(o.duracao) : '—'}</p>${A.itineraryHTML(o)}<div class="flex flex-wrap gap-1.5 mt-1">${flags.join('')}</div></div>
                <p class="font-serif text-xl font-bold ${viable ? 'text-wineInk' : 'text-mute'}">${viable ? A.fmtBRL(o.custo.totalCost) : '—'}</p></li>`;
        }).join('');
        const qs = new URLSearchParams({ origem: r.origem.icao, destino: r.destino.icao, pax: String(args.pax) });
        if (args.data) qs.set('data', args.data);
        box.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                <div><p class="text-xs uppercase tracking-wider text-taupe font-semibold mb-1">${esc(t('res.title'))}</p>
                    <h3 class="font-serif text-3xl font-bold text-ink">${esc(r.origem.icao)} &rarr; ${esc(r.destino.icao)}</h3>
                    <p class="text-sm text-mute">${esc(r.origem.cidade)} (${esc(r.origem.pais)}) &rarr; ${esc(r.destino.cidade)} (${esc(r.destino.pais)})</p></div>
                <dl class="grid grid-cols-3 gap-4 text-center">
                    <div><dt class="text-[11px] uppercase text-mute">${esc(t('route.reference'))}</dt><dd class="font-semibold text-ink">${r.distanciaVooKm.toLocaleString(I.locale)} km</dd></div>
                    <div><dt class="text-[11px] uppercase text-mute">${esc(t('res.nm'))}</dt><dd class="font-semibold text-ink">${nm.toLocaleString(I.locale)} nm</dd></div>
                    <div><dt class="text-[11px] uppercase text-mute">${esc(t('res.time'))}</dt><dd class="font-semibold text-ink">${best ? esc(best.duracao) : '—'}</dd></div></dl></div>
            ${best ? '' : `<p class="badge badge-warn mb-3">${esc(t('res.none'))}</p>`}
            <h4 class="text-xs uppercase tracking-wider text-mute font-semibold mb-1">${esc(t('res.options'))}</h4>
            <ul class="mb-4">${rows}</ul>
            <p class="text-[11px] text-mute mb-4">${esc(t('res.note'))} ${esc(I.currency !== 'BRL' ? I.note() : '')}</p>
            <div class="flex flex-col sm:flex-row gap-3">
                <a id="res-continue" href="criar-passagem.html?${qs.toString()}" class="btn btn-wine flex-1">${esc(t('res.continue'))}<i data-lucide="arrow-right" class="w-4 h-4"></i></a>
                <button type="button" id="res-request" class="btn btn-ghost flex-1">${esc(t('res.request'))}</button></div>`;
        box.classList.remove('hidden');
        $('res-request').addEventListener('click', () => A.formModal('quote', { resumo: `${r.origem.icao} → ${r.destino.icao}, ${args.pax} pax${best ? ', ' + best.aircraft.nome + ' ' + best.custo.formattedTotal : ''}`, dados: { origem: r.origem.icao, destino: r.destino.icao, pax: args.pax, data: args.data || null, distanciaKm: best ? Math.round(best.kmTotal) : r.distanciaVooKm, trechos: best?.trechos || [] } }));
        A.icons();
    }

    $('quote-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const args = validate(); if (!args) { $('quote-result').classList.add('hidden'); last = null; return; }
        const q = window.RouteService.quote(args.origem, args.destino, args.pax);
        if (q.error) { A.setError(q.error === 'igual' ? f.d : f.o, t(q.error === 'igual' ? 'err.same' : 'err.notfound')); return; }
        last = { q, args }; renderResult();
        const box = $('quote-result'); box.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); box.focus({ preventScroll: true });
    });
    ['sim-origem', 'sim-destino', 'sim-data', 'sim-pax'].forEach((id) => $(id).addEventListener('input', () => { A.setError($(id), ''); }));

    // Cards de destino preenchem o destino do simulador
    document.querySelectorAll('.dest-card').forEach((c) => c.addEventListener('click', (e) => {
        e.preventDefault();
        A.setAirport(f.d, c.dataset.dest); A.setError(f.d, '');
        $('simulador').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => (f.o.value ? f.d : f.o).focus({ preventScroll: true }), 450);
    }));

    // Parâmetros opcionais na URL (?origem=&destino=&pax=)
    const qp = A.params();
    if (qp.origem) A.setAirport(f.o, qp.origem);
    if (qp.destino) A.setAirport(f.d, qp.destino);
    if (qp.pax && Number(qp.pax) >= 1) f.pax.value = Math.floor(Number(qp.pax));

    // Idioma/moeda: redesenha o que foi gerado por JavaScript
    I.onChange(() => { I.apply(); renderCategories(); renderResult(); });
    renderCategories();
    I.apply();
})();
