/**
 * @file page-criar.js
 * @description Etapa 1 da reserva: rota, data, passageiros e escolha da aeronave com cálculo de preço em tempo real.
 */
(function () {
    'use strict';
    const A = window.Aether, $ = (id) => document.getElementById(id), esc = A.esc;
    $('f-pax').max = A.CONFIG.MAX_PAX;
    A.mountLayout({ active: 'criar', step: 1 });

    let draft = A.getDraft();
    const minLocal = () => A.toLocalInput(Date.now() + A.CONFIG.MIN_LEAD_HOURS * 3600000);
    $('f-data').min = minLocal(); $('f-volta').min = minLocal();
    A.attachAirportAutocomplete($('f-origem')); A.attachAirportAutocomplete($('f-destino'));

    // ---------- Preenchimento inicial: parâmetros da URL > rascunho salvo ----------
    (function prefill() {
        const q = A.params();
        if (q.origem) { const a = A.setAirport($('f-origem'), q.origem); if (a) draft.origemICAO = a.icao; }
        else if (draft.origemICAO) A.setAirport($('f-origem'), draft.origemICAO);
        if (q.destino) { const a = A.setAirport($('f-destino'), q.destino); if (a) draft.destinoICAO = a.icao; }
        else if (draft.destinoICAO) A.setAirport($('f-destino'), draft.destinoICAO);
        if (q.data && !isNaN(new Date(q.data))) draft.departure = new Date(q.data).toISOString();
        if (q.pax && Number(q.pax) >= 1) draft.pax = Math.min(A.CONFIG.MAX_PAX, Math.floor(Number(q.pax)));
        if (q.aeronave && A.getAircraft(q.aeronave)) draft.aircraftId = q.aeronave;
        if (draft.departure) $('f-data').value = A.toLocalInput(draft.departure);
        if (draft.returnDeparture) $('f-volta').value = A.toLocalInput(draft.returnDeparture);
        $('f-pax').value = draft.pax;
        setTrip(draft.tripType, false);
    })();

    function setTrip(type, save) {
        draft.tripType = type;
        const volta = type === 'ida-volta';
        $('trip-ida').classList.toggle('active', !volta); $('trip-ida-volta').classList.toggle('active', volta);
        $('trip-ida').setAttribute('aria-checked', String(!volta)); $('trip-ida-volta').setAttribute('aria-checked', String(volta));
        $('wrap-volta').classList.toggle('hidden', !volta);
        if (save !== false) { persist(); update(); }
    }

    function readForm() {
        draft.origemICAO = A.airportOf($('f-origem'));
        draft.destinoICAO = A.airportOf($('f-destino'));
        draft.departure = $('f-data').value ? new Date($('f-data').value).toISOString() : '';
        draft.returnDeparture = $('f-volta').value ? new Date($('f-volta').value).toISOString() : '';
        draft.pax = Math.floor(Number($('f-pax').value)) || 0;
    }
    const persist = () => A.saveDraft(draft);

    // ---------- Validação por campo (mostrada junto ao campo) ----------
    function fieldErrors() {
        const o = $('f-origem'), d = $('f-destino');
        A.setError(o, o.value.trim() && !draft.origemICAO ? 'Aeroporto não encontrado. Use cidade, ICAO ou IATA.' : '');
        A.setError(d, d.value.trim() && !draft.destinoICAO ? 'Aeroporto não encontrado. Use cidade, ICAO ou IATA.' : (draft.origemICAO && draft.origemICAO === draft.destinoICAO ? 'Origem e destino não podem ser iguais.' : ''));
        const dep = new Date(draft.departure).getTime();
        A.setError($('f-data'), draft.departure && dep < Date.now() + A.CONFIG.MIN_LEAD_HOURS * 3600000 ? `A decolagem precisa ser daqui a pelo menos ${A.CONFIG.MIN_LEAD_HOURS} horas.` : '');
        const ret = new Date(draft.returnDeparture).getTime();
        A.setError($('f-volta'), draft.tripType === 'ida-volta' && draft.returnDeparture && !isNaN(dep) && ret < dep + 3600000 ? 'A volta precisa ser pelo menos 1 hora depois da ida.' : '');
        A.setError($('f-pax'), draft.pax < 1 || draft.pax > A.CONFIG.MAX_PAX ? `Entre 1 e ${A.CONFIG.MAX_PAX} passageiros.` : '');
    }

    // ---------- Aeronaves ----------
    function renderAircraft(route) {
        const fleet = (window.FLEET || []).slice();
        const rows = fleet.map((a) => {
            const est = route ? window.RouteService.estimateFor(route, a, draft.pax) : null;
            const viable = !route || est.viavel;
            let reason = '';
            if (route && !est.rotaViavel) reason = "Nenhuma rota compatível na rede de escalas técnicas.";
            else if (route && !est.capacidadeOk) reason = `Comporta no máximo ${a.pax} passageiros.`;
            else if (!route && draft.pax > a.pax) reason = '';
            return { a, est, viable, reason };
        });
        if (route) rows.sort((x, y) => window.RouteService.compareEstimates(x.est, y.est));
        else rows.sort((x, y) => x.a.tarifa_km - y.a.tarifa_km);
        $('aero-hint').textContent = route ? `Mostrando o valor para ${route.origem.icao} → ${route.destino.icao}. A cotação inclui escalas técnicas quando necessárias.` : 'Informe origem e destino para ver o valor de cada aeronave. Você já pode escolher uma.';
        A.setHTML($('aircraft-grid'), rows.map(({ a, est, viable, reason }) => {
            const sel = draft.aircraftId === a.id;
            const price = route && viable ? `<span class="block text-[10px] text-mute uppercase">${draft.tripType === 'ida-volta' ? 'Voo ida e volta' : 'Voo'} &bull; ${esc(est.duracao)}/sentido</span><span class="font-serif text-xl font-bold text-taupe">${A.fmtBRL(est.custo.totalCost * (draft.tripType === 'ida-volta' ? 2 : 1))}</span>`
                : route ? `<span class="badge badge-bad">Indisponível</span><span class="block text-[11px] text-bad mt-1">${esc(reason)}</span>`
                : `<span class="block text-[10px] text-mute uppercase">Tarifa</span><span class="font-serif text-lg font-bold text-taupe">${A.fmtBRL2(a.tarifa_km)} <span class="text-xs text-mute font-sans">/ km</span></span>`;
            return `<div class="option-card overflow-hidden ${sel ? 'selected' : ''} ${route && !viable ? 'disabled' : ''}" data-id="${esc(a.id)}" role="radio" aria-checked="${sel}" aria-disabled="${route && !viable}" tabindex="${route && !viable ? -1 : 0}">
                <div class="relative h-32 bg-fog">${AetherImages.markup(a.imagem, a.nome, 'jato', 'w-full h-full object-cover')}<span class="absolute top-2 right-2 badge badge-muted bg-sand/80">${esc(a.categoriaNome)}</span>${sel ? '<span class="absolute top-2 left-2 badge badge-ok bg-sand/80">Selecionada</span>' : ''}</div>
                <div class="p-4 space-y-3">
                    <h3 class="font-serif text-lg font-bold text-ink leading-tight">${esc(a.nome)}</h3>
                    <p class="text-[11px] text-mute">Até ${a.pax} pax &bull; ${a.alcance_km.toLocaleString('pt-BR')} km &bull; ${a.velocidade_kmh} km/h</p>
                    <div>${price}</div>${A.itineraryHTML(est, draft.tripType === "ida-volta")}
                </div></div>`;
        }).join(''));
    }

    // ---------- Resumo ----------
    let wToken = 0, wTimer = null;
    function renderSummary(route, p, errors) {
        const dt = (iso) => (iso ? A.fmtDateTime(iso) : '—');
        let html = '<h3 class="font-serif text-xl font-bold text-ink">Resumo da viagem</h3>';
        if (!route) html += '<p class="text-xs text-mute">Informe origem e destino para calcular a distância, o tempo de voo e o valor.</p>';
        else {
            html += `<div><span class="font-serif text-2xl font-bold text-ink">${esc(route.origem.icao)} &rarr; ${esc(route.destino.icao)}</span><span class="block text-xs text-mute">${esc(route.origem.cidade)} &bull; ${esc(route.destino.cidade)}</span></div>
            <dl class="text-xs space-y-2">
                <div class="flex justify-between gap-3"><dt class="text-mute">Distância (great circle)</dt><dd class="text-ink font-medium">${route.distanciaOrtodromicaKm.toLocaleString('pt-BR')} km</dd></div>
                <div class="flex justify-between gap-3"><dt class="text-mute">Distância de voo estimada${p ? "" : " (rota direta)"}</dt><dd class="text-ink font-medium">${Math.round(p?.est.kmTotal ?? route.distanciaVooKm).toLocaleString('pt-BR')} km</dd></div>
                ${p ? `<div class="flex justify-between gap-3"><dt class="text-mute">Duração por sentido</dt><dd class="text-ink font-medium">${esc(p.est.duracao)}</dd></div>` : ''}
            </dl>`;
        }
        html += `<dl class="text-xs space-y-2 border-t border-ink/10 pt-4">
            <div class="flex justify-between gap-3"><dt class="text-mute">Aeronave</dt><dd class="text-ink font-medium text-right">${p ? esc(p.aircraft.nome) : (A.getAircraft(draft.aircraftId) ? esc(A.getAircraft(draft.aircraftId).nome) : 'Escolha uma aeronave')}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-mute">Passageiros</dt><dd class="text-ink font-medium">${draft.pax || '—'}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-mute">Ida</dt><dd class="text-ink font-medium text-right">${dt(draft.departure)}</dd></div>
            ${draft.tripType === 'ida-volta' ? `<div class="flex justify-between gap-3"><dt class="text-mute">Volta</dt><dd class="text-ink font-medium text-right">${dt(draft.returnDeparture)}</dd></div>` : ''}</dl>`;
        if (p) {
            html += `<div class="border-t border-ink/10 pt-4 space-y-2 text-xs">
                <div class="text-[10px] uppercase tracking-wider text-taupe font-semibold">Como o valor é calculado</div>
                <div class="flex justify-between gap-3"><span class="text-mute">${Math.round(p.est.kmTotal).toLocaleString('pt-BR')} km &times; ${A.fmtBRL2(p.aircraft.tarifa_km)}/km${p.legs === 2 ? ' &times; 2 sentidos' : ''}</span><span class="text-ink">${A.fmtBRL(p.vooBase)}</span></div>
                <div class="flex justify-between gap-3"><span class="text-mute">Taxas de voo e escalas</span><span class="text-ink">${A.fmtBRL(p.vooTaxas)}</span></div>
                <div class="flex justify-between gap-3 pt-2 border-t border-ink/10 text-sm"><span class="text-ink font-semibold">Valor do voo</span><span class="font-serif text-xl font-bold text-taupe">${A.fmtBRL(p.voo)}</span></div>
                <p class="text-[11px] text-mute">Cardápio e serviços opcionais entram na próxima etapa.</p></div>`;
        }
        html += '<div id="weather-box" class="border-t border-ink/10 pt-4"><div class="text-[10px] uppercase tracking-wider text-taupe font-semibold mb-2">Clima no destino</div><div id="weather-body" class="text-xs text-mute">Informe destino e data.</div></div>';
        if (errors.length) html += `<ul class="text-[11px] text-warn space-y-1 list-disc pl-4" aria-label="Pendências">${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;
        html += `<button id="btn-continue" class="btn btn-wine w-full" ${errors.length ? 'disabled' : ''}>Continuar para o cardápio &rarr;</button>
                 <button id="btn-reset" type="button" class="text-[11px] text-mute hover:text-ink w-full text-center">Limpar e recomeçar</button>`;
        if (!A.setHTML($('summary'), html)) return; // nada mudou: mantém os elementos (e o clima já carregado)
        $('btn-continue').addEventListener('click', () => { const errs = A.validateDraft(draft); if (errs.length) { A.toast(errs[0], 'error'); return; } persist(); location.href = 'cardapio.html'; });
        $('btn-reset').addEventListener('click', async () => { if (await A.confirmDialog({ title: 'Recomeçar reserva?', message: 'Isso apaga a rota, a aeronave e o cardápio escolhidos.', confirmText: 'Limpar tudo' })) { A.clearDraft(); location.href = 'criar-passagem.html'; } });
        A.icons();
        refreshWeather(route);
    }

    function refreshWeather(route) {
        clearTimeout(wTimer);
        const body = $('weather-body'); if (!body) return;
        if (!route || !draft.departure) return;
        const token = ++wToken;
        body.textContent = 'Consultando previsão...';
        wTimer = setTimeout(async () => {
            const w = await A.getWeather(route.destino, draft.departure);
            if (token !== wToken || !$('weather-body')) return;
            $('weather-body').innerHTML = A.weatherHTML(w, route.destino.cidade); A.icons();
        }, 350);
    }

    function update() {
        const route = A.tripRoute(draft);
        const p = A.priceTrip(draft);
        renderAircraft(route);
        const errors = A.validateDraft(draft);
        renderSummary(route, p && p.est.viavel ? p : null, errors);
        fieldErrors();
    }

    // ---------- Eventos ----------
    ['f-origem', 'f-destino', 'f-data', 'f-volta', 'f-pax'].forEach((id) => {
        $(id).addEventListener('change', () => { readForm(); persist(); update(); });
    });
    $('f-pax').addEventListener('input', () => { readForm(); persist(); update(); });
    $('trip-ida').addEventListener('click', () => setTrip('ida'));
    $('trip-ida-volta').addEventListener('click', () => setTrip('ida-volta'));
    $('btn-swap').addEventListener('click', () => {
        const o = $('f-origem'), d = $('f-destino'); [o.value, d.value] = [d.value, o.value];
        [o.dataset.icao, d.dataset.icao] = [d.dataset.icao || '', o.dataset.icao || '']; readForm(); persist(); update();
    });
    const pick = (el) => {
        const card = el.closest('.option-card'); if (!card || card.classList.contains('disabled')) return;
        draft.aircraftId = card.dataset.id; persist(); update();
    };
    $('aircraft-grid').addEventListener('click', (e) => pick(e.target));
    $('aircraft-grid').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e.target); } });

    readForm(); // sincroniza o rascunho com o que foi preenchido
    if (!draft.departure && $('f-data').value) readForm();
    persist(); update();
})();
