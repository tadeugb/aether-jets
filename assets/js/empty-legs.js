/**
 * @file empty-legs.js
 * @description Interface dos Empty Legs ao vivo. Dois modos, escolhidos pelo HTML da página:
 *   - página completa (empty-legs.html): #el-grid + filtros + alertas;
 *   - prévia da home (index.html): #el-preview-grid com 3 cards.
 * Consome window.EmptyLegFeedInstance (interface subscribe(cb) -> unsubscribe), hoje SIMULADO (empty-legs-feed.js).
 * Para dados reais troque só o feed (WebSocket/SSE), esta interface não muda.
 * Depende de aether-core.js, aether-ui.js, i18n.js e empty-legs-feed.js.
 */
(function () {
    'use strict';
    const A = window.Aether, I = window.AetherI18n, esc = A.esc;
    const t = (k, v) => I.t(k, v);
    const $ = (id) => document.getElementById(id);
    const ALERTS_KEY = 'aether.alerts.v1';
    const REGIONS = ['Sudeste', 'Sul', 'Nordeste', 'Norte', 'Centro-Oeste', 'América do Sul', 'América do Norte', 'Caribe', 'Europa', 'Oriente Médio'];
    const PRICE_MAX = 700000;

    let regionIndex = null;
    const regionOf = (icao) => {
        if (!regionIndex) { regionIndex = new Map(); (window.AIRPORTS || []).forEach((a) => { if (a.icao) regionIndex.set(a.icao, a.regiao); }); }
        return regionIndex.get(icao) || null;
    };

    class EmptyLegBoard {
        constructor(grid, opts) {
            this.grid = grid; this.limit = opts.limit || 0; this.preview = !!opts.preview;
            this.offers = []; this.region = 'Todas'; this.seen = new Set(); this.first = true; this.lastUpdate = null;
            this.unsub = null; this.timer = null;
        }

        start() {
            const feed = window.EmptyLegFeedInstance;
            if (!feed) { const c = $('el-count'); if (c) c.textContent = 'Feed indisponível.'; return; }
            this.bindFilters();
            this.unsub = feed.subscribe((offers, evt) => this.onFeed(offers, evt));
            // contagens regressivas (1 s). Não gasta CPU com a aba oculta.
            this.timer = setInterval(() => { if (!document.hidden) this.tickCountdown(); }, 1000);
            document.addEventListener('visibilitychange', () => { this.setLive(!document.hidden); if (!document.hidden) { this.tickCountdown(); } });
            this.setLive(!document.hidden);
        }

        onFeed(offers, evt) {
            this.offers = offers.slice();
            this.lastUpdate = new Date();
            this.updateStamp();
            if (evt && (evt.type === 'new' || evt.type === 'price') && evt.offer) { this.checkAlerts(evt.offer); }
            this.render(evt);
            if (evt && evt.type === 'new' && evt.offer && this.matches(evt.offer)) {
                const o = evt.offer, live = $('sr-announcer');
                if (live) live.textContent = `${t('el.new')}: ${o.origemCidade} → ${o.destinoCidade}, ${o.descontoPct}% OFF, ${A.fmtBRL(o.precoEmpty)}.`;
            }
        }

        // ----- indicador AO VIVO -----
        setLive(on) {
            const l = $('el-live-label'); if (!l) return;
            l.textContent = on ? t('el.live') : t('el.paused');
            const dot = $('el-live-dot'); if (dot) dot.style.opacity = on ? '1' : '.35';
        }
        updateStamp() {
            const el = $('el-updated'); if (!el || !this.lastUpdate) return;
            el.textContent = t('el.updated', { t: this.lastUpdate.toLocaleTimeString(I.locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
        }

        // ----- filtros -----
        filters() {
            const v = (id, d) => ($(id) ? $(id).value : d);
            return { date: v('f-date', 'all'), cat: v('f-cat', 'all'), max: Number(v('f-price', PRICE_MAX)), sort: v('f-sort', 'nearest') };
        }
        matches(o, f) {
            f = f || this.filters(); const now = Date.now();
            if (this.region !== 'Todas' && regionOf(o.origemICAO) !== this.region && regionOf(o.destinoICAO) !== this.region) return false;
            if (f.cat !== 'all' && o.categoria !== f.cat) return false;
            if (o.precoEmpty > f.max) return false;
            const days = (o.departureTime - now) / 86400000;
            if (f.date === 'today' && days > 1) return false;
            if (f.date === '7days' && days > 7) return false;
            if (f.date === '30days' && days > 30) return false;
            return o.expiresAt > now;
        }
        filtered() {
            const f = this.filters();
            const list = this.offers.filter((o) => this.matches(o, f));
            const sort = this.preview ? 'discount' : f.sort;
            list.sort((a, b) => sort === 'discount' ? b.descontoPct - a.descontoPct : sort === 'price_asc' ? a.precoEmpty - b.precoEmpty : a.departureTime - b.departureTime);
            return this.limit ? list.slice(0, this.limit) : list;
        }
        bindFilters() {
            const chips = $('el-region-chips');
            if (chips) {
                const draw = () => { chips.innerHTML = ['Todas'].concat(REGIONS).map((r) => `<button type="button" data-region="${esc(r)}" aria-pressed="${r === this.region}" class="chip ${r === this.region ? 'active' : ''}">${esc(r === 'Todas' ? t('el.all_r') : r)}</button>`).join(''); };
                draw(); this.drawChips = draw;
                chips.addEventListener('click', (e) => { const b = e.target.closest('[data-region]'); if (!b) return; this.region = b.dataset.region; draw(); this.render(); });
            }
            ['f-date', 'f-cat', 'f-sort'].forEach((id) => { const el = $(id); if (el) el.addEventListener('change', () => this.render()); });
            const p = $('f-price');
            if (p) { const label = () => { $('f-price-val').textContent = A.fmtBRL(Number(p.value)); }; p.addEventListener('input', () => { label(); this.render(); }); this.drawPrice = label; label(); }
            const reset = $('f-reset'); if (reset) reset.addEventListener('click', () => this.reset());
            const reset2 = $('el-empty-reset'); if (reset2) reset2.addEventListener('click', () => this.reset());
        }
        reset() {
            ['f-date', 'f-cat', 'f-sort'].forEach((id) => { if ($(id)) $(id).selectedIndex = 0; });
            const p = $('f-price'); if (p) { p.value = p.max; if (this.drawPrice) this.drawPrice(); }
            this.region = 'Todas'; if (this.drawChips) this.drawChips();
            this.render();
        }
        // Reaplica textos/valores quando idioma ou moeda mudam
        refreshPrefs() { if (this.drawChips) this.drawChips(); if (this.drawPrice) this.drawPrice(); this.setLive(!document.hidden); this.updateStamp(); this.grid.innerHTML = ''; this.seen = new Set(); this.first = true; this.render(); }

        // ----- cartão -----
        cardHTML(o) {
            const dep = new Date(o.departureTime);
            const dateStr = dep.toLocaleDateString(I.locale, { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dep.toLocaleTimeString(I.locale, { hour: '2-digit', minute: '2-digit' });
            const isNew = Date.now() - o.createdAt < 6000;
            const qs = new URLSearchParams({ origem: o.origemICAO, destino: o.destinoICAO, pax: String(o.pax), data: A.toLocalInput(o.departureTime) });
            return `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="bg-wine text-white text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">${o.descontoPct}% OFF</span>
                        ${isNew ? `<span data-new-until="${o.createdAt + 6000}" class="badge badge-ok">${esc(t('el.new'))}</span>` : ''}
                        ${o.isReduced ? `<span class="badge badge-warn">${esc(t('el.reduced'))}</span>` : ''}
                    </div>
                    <span class="text-xs font-mono text-mute">${esc(o.id)}</span>
                </div>
                <h3 class="font-serif text-2xl font-bold text-ink tracking-wide">${esc(o.origemICAO)} &rarr; ${esc(o.destinoICAO)}</h3>
                <p class="text-xs text-mute mb-4">${esc(o.origemCidade)} &bull; ${esc(o.destinoCidade)} &bull; ${o.distanciaKm.toLocaleString(I.locale)} km</p>
                <div class="bg-fog p-4 rounded-xl space-y-2 mb-4 border border-ink/10 text-xs">
                    <div class="flex justify-between gap-3"><span class="text-mute">${esc(t('el.aircraft'))}</span><span class="text-ink font-semibold text-right">${esc(o.aeronave)}</span></div>
                    <div class="flex justify-between gap-3"><span class="text-mute">${esc(t('el.dep'))}</span><span class="text-ink">${esc(dateStr)}, ${esc(timeStr)}</span></div>
                    <div class="flex justify-between gap-3"><span class="text-mute">&nbsp;</span><span class="text-ok font-semibold">${esc(t('el.seats', { n: o.pax }))}</span></div>
                    <div class="flex justify-between gap-3 pt-2 border-t border-ink/10"><span class="text-mute">${esc(t('el.expires'))}</span><span class="text-warn font-mono font-semibold countdown-timer" data-expires="${o.expiresAt}">--</span></div>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <div><span class="text-[11px] text-mute line-through block">${A.fmtBRL(o.precoNormal)}</span><span class="font-serif text-2xl font-bold text-wineInk">${A.fmtBRL(o.precoEmpty)}</span></div>
                    <a href="criar-passagem.html?${qs.toString()}" class="btn btn-wine btn-sm" data-reserve="${esc(o.id)}">${esc(t('el.reserve'))}</a>
                </div>`;
        }

        // Atualização "chaveada": só recria os cartões que mudaram (preserva foco e cliques) e anima os novos.
        render(evt) {
            const list = this.filtered();
            const count = $('el-count');
            if (count) count.textContent = t(list.length === 1 ? 'el.count1' : 'el.countN', { n: list.length });
            const empty = $('el-empty'); if (empty) empty.classList.toggle('hidden', list.length > 0);
            const existing = new Map(Array.from(this.grid.children).map((el) => [el.dataset.id, el]));
            const keep = new Set();
            list.forEach((o, i) => {
                const html = this.cardHTML(o).replace(/data-new-until="\d+"/, '');   // o selo "Novo" não entra na assinatura
                const sig = html.length + ':' + o.precoEmpty + ':' + o.pax + ':' + (o.isReduced ? 1 : 0) + ':' + I.lang + I.currency;
                let el = existing.get(o.id);
                if (!el || el.dataset.sig !== sig) {
                    const fresh = document.createElement('article');
                    fresh.className = 'card p-6 flex flex-col justify-between hover:border-taupe/60 transition-colors tilt-card';
                    fresh.dataset.id = o.id; fresh.dataset.sig = sig; fresh.innerHTML = this.cardHTML(o);
                    if (!this.first && !this.seen.has(o.id)) fresh.classList.add('offer-in');
                    if (el) el.replaceWith(fresh); else this.grid.appendChild(fresh);
                    el = fresh;
                }
                keep.add(o.id); this.seen.add(o.id);
                if (this.grid.children[i] !== el) this.grid.insertBefore(el, this.grid.children[i] || null);
            });
            existing.forEach((el, id) => { if (!keep.has(id)) el.remove(); });
            this.first = false;
            this.tickCountdown();
            A.icons();
        }

        tickCountdown() {
            const now = Date.now();
            this.grid.querySelectorAll('.countdown-timer').forEach((el) => {
                const ms = Number(el.dataset.expires) - now;
                if (ms <= 0) { el.textContent = t('el.expired'); return; }
                const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
                el.textContent = (d ? d + 'd ' : '') + [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
            });
            this.grid.querySelectorAll('[data-new-until]').forEach((el) => { if (now > Number(el.dataset.newUntil)) el.remove(); });
        }

        // ----- alertas (localStorage; sem backend) -----
        checkAlerts(o) {
            const alerts = A.store.get(ALERTS_KEY, []);
            const hit = alerts.find((al) => (al.regiao === 'Todas' || regionOf(o.origemICAO) === al.regiao || regionOf(o.destinoICAO) === al.regiao) && o.precoEmpty <= al.maxBRL);
            if (!hit) return;
            const k = 'aether.alert.seen.' + o.id + ':' + o.precoEmpty;
            try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { /* ignora */ }
            const msg = t('el.alertHit', { o: o.origemICAO, d: o.destinoICAO, p: A.fmtBRL(o.precoEmpty) });
            A.toast(msg); const live = $('sr-announcer'); if (live) live.textContent = msg;
        }
    }

    // ---------- Modal "Criar alerta" ----------
    function openAlertModal(board) {
        const draw = (box) => {
            const alerts = A.store.get(ALERTS_KEY, []);
            box.querySelector('#al-list').innerHTML = alerts.length
                ? alerts.map((a) => `<li class="flex items-center justify-between gap-3 py-1.5 border-b border-ink/10"><span>${esc(a.regiao === 'Todas' ? t('el.all_r') : a.regiao)} &le; ${A.fmtBRL(a.maxBRL)}</span><button type="button" data-al-del="${esc(a.id)}" class="text-wineInk underline text-xs">${esc(t('el.remove'))}</button></li>`).join('')
                : `<li class="text-xs">${esc(t('el.noAlerts'))}</li>`;
        };
        A.openModal({
            title: t('el.alertT'),
            html: `<p class="mb-4">${esc(t('el.alertD'))}</p>
                <form id="al-form" class="space-y-3">
                    <div><label class="field-label" for="al-region">${esc(t('el.region'))}</label><select id="al-region" class="field">${['Todas'].concat(REGIONS).map((r) => `<option value="${esc(r)}" ${r === board.region ? 'selected' : ''}>${esc(r === 'Todas' ? t('el.all_r') : r)}</option>`).join('')}</select></div>
                    <div><label class="field-label" for="al-price">${esc(t('el.max'))}: <span id="al-price-val">${A.fmtBRL(150000)}</span></label><input id="al-price" type="range" min="10000" max="${PRICE_MAX}" step="5000" value="150000" class="w-full accent-wine"></div>
                    <p id="al-status" role="status" class="text-ok font-medium min-h-[1em]"></p>
                    <button type="submit" class="btn btn-wine w-full">${esc(t('el.alertSave'))}</button>
                </form>
                <h4 class="font-serif text-lg text-ink mt-6 mb-2">${esc(t('el.alerts'))}</h4><ul id="al-list"></ul>`,
            onOpen: (box) => {
                const price = box.querySelector('#al-price'), val = box.querySelector('#al-price-val');
                price.addEventListener('input', () => { val.textContent = A.fmtBRL(Number(price.value)); });
                box.querySelector('#al-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const regiao = box.querySelector('#al-region').value, maxBRL = Number(price.value);
                    const alerts = A.store.get(ALERTS_KEY, []);
                    alerts.push({ id: 'AL' + Date.now().toString(36), regiao, maxBRL, criadoEm: new Date().toISOString() });
                    A.store.set(ALERTS_KEY, alerts);   // BACKEND: POST /api/alerts (e envio por e-mail/push quando surgir a oferta)
                    box.querySelector('#al-status').textContent = t('el.alertOk', { r: regiao === 'Todas' ? t('el.all_r') : regiao, p: A.fmtBRL(maxBRL) });
                    draw(box);
                });
                box.addEventListener('click', (e) => { const d = e.target.closest('[data-al-del]'); if (!d) return; A.store.set(ALERTS_KEY, A.store.get(ALERTS_KEY, []).filter((a) => a.id !== d.dataset.alDel)); draw(box); });
                draw(box);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const full = $('el-grid'), prev = $('el-preview-grid');
        const grid = full || prev; if (!grid) return;
        window.__aetherLive = true;
        const board = new EmptyLegBoard(grid, { preview: !full, limit: full ? 0 : 3 });
        window.EmptyLegBoard = board;
        board.start();
        const alertBtn = $('btn-alert'); if (alertBtn) alertBtn.addEventListener('click', () => openAlertModal(board));
        document.addEventListener('click', (e) => { if (e.target.closest('[data-el-alert]')) openAlertModal(board); });
        I.onChange(() => { I.apply(); board.refreshPrefs(); });
    });
})();
