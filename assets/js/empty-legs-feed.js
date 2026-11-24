/**
 * @file empty-legs-feed.js
 * @description Feed SIMULADO de Empty Legs (voos de retorno/posicionamento sem passageiros, com desconto).
 * Interface: subscribe(callback) -> unsubscribe(). O callback recebe (offers, evento).
 *
 * >>> ONDE PLUGAR DADOS REAIS (WebSocket/SSE) <<<
 * Toda a interface do site só conhece window.EmptyLegFeedInstance com:
 *     subscribe(callback) -> unsubscribe()      callback(offers, evento)
 * Eventos: {type:'init'} | {type:'new', offer} | {type:'price', offer} | {type:'expired'} | {type:'tick'}.
 * Uma oferta tem: id, origemICAO, destinoICAO, origemCidade, destinoCidade, aeronave, categoria, pax (assentos livres),
 * distanciaKm, precoNormal, descontoPct, precoEmpty, departureTime (ms), expiresAt (ms), createdAt (ms), isReduced.
 * No fim deste arquivo existe a classe RemoteEmptyLegFeed (SSE) com a MESMA interface: defina
 * window.AETHER_EMPTY_LEG_SSE_URL = 'https://seu-backend/empty-legs/stream' antes de carregar este script e ela substitui o simulador.
 * Para WebSocket, troque o EventSource por new WebSocket(url) e chame this._apply(JSON.parse(msg.data)) no onmessage.
 * Depende de data.js (AIRPORTS, FLEET, calculateFlightCost) e route-service.js.
 */
(function () {
    'use strict';

    // Com a base global (milhares de aeroportos) o sorteio ficaria com rotas obscuras: usamos só aeroportos executivos curados.
    const FEED_ICAOS = ["SBSP", "SBMT", "SBGR", "SBKP", "SBRJ", "SBGL", "SBJR", "SDAG", "SBFL", "SBPA", "SBCT", "SBRF", "SBSV", "SBFZ", "SBFN", "SBBR", "SBCF", "SBBH", "SBIZ", "SBMQ", "KOPF", "KMIA", "KTEB", "KJFK", "KFLL", "KPBI", "MYNN", "TJSJ", "SUPE", "SUMU", "SAEZ", "SABE", "SCEL", "LFPB", "EGLF", "LSGG", "LIML", "LPPT", "OMDB"];
    const MAX_OFFERS = 24;
    const SEED_OFFERS = 12;
    const HOUR = 3600 * 1000;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const rint = (a, b) => Math.floor(rnd(a, b + 1));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    class MockEmptyLegFeed {
        constructor() {
            this.offers = [];
            this.subs = new Set();
            this.timer = null;
            this.seq = 1000;
            for (let i = 0; i < SEED_OFFERS; i++) {
                const o = this.makeOffer();
                if (o) { o.createdAt = Date.now() - 60000; this.offers.push(o); }
            }
            // Pausa quando a aba está oculta (economiza CPU/bateria)
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) this.stop();
                else if (this.subs.size) this.start();
            });
        }

        makeOffer() {
            const airports = (window.AIRPORTS || []).filter((a) => FEED_ICAOS.indexOf(a.icao) !== -1);
            const fleet = window.FLEET || [];
            for (let tries = 0; tries < 40; tries++) {
                const o = pick(airports), d = pick(airports);
                if (!o || !d || o.icao === d.icao) continue;
                const route = window.RouteService.computeRoute(o.icao, d.icao);
                if (route.error || route.distanciaVooKm < 300 || route.distanciaVooKm > 8000) continue;
                const candidates = fleet.filter((a) => a.alcance_km >= route.distanciaVooKm);
                if (!candidates.length) continue;
                const aircraft = pick(candidates);
                const precoNormal = window.calculateFlightCost(route.distanciaVooKm, aircraft).totalCost;
                const descontoPct = rint(30, 75);
                const departureTime = Date.now() + rnd(3 * HOUR, 20 * 24 * HOUR);
                return {
                    id: 'EL-' + (this.seq++),
                    origemICAO: o.icao, destinoICAO: d.icao,
                    origemCidade: o.cidade, destinoCidade: d.cidade,
                    aeronave: aircraft.nome, categoria: aircraft.categoria,
                    pax: rint(1, aircraft.pax),
                    distanciaKm: route.distanciaVooKm,
                    precoNormal, descontoPct,
                    precoEmpty: Math.round(precoNormal * (1 - descontoPct / 100) / 100) * 100,
                    departureTime,
                    expiresAt: departureTime - 2 * HOUR,
                    createdAt: Date.now(),
                    isReduced: false
                };
            }
            return null;
        }

        subscribe(cb) {
            this.subs.add(cb);
            cb(this.offers, { type: 'init' });
            this.start();
            return () => { this.subs.delete(cb); if (!this.subs.size) this.stop(); };
        }

        emit(evt) { this.subs.forEach((cb) => cb(this.offers, evt)); }

        start() {
            if (this.timer) return;
            const loop = () => {
                this.timer = setTimeout(() => { this.tick(); loop(); }, rint(8, 15) * 1000);
            };
            loop();
        }

        stop() { clearTimeout(this.timer); this.timer = null; }

        tick() {
            const now = Date.now();
            const before = this.offers.length;
            this.offers = this.offers.filter((o) => o.expiresAt > now);
            if (this.offers.length < MAX_OFFERS && Math.random() < 0.7) {
                const offer = this.makeOffer();
                if (offer) { this.offers.push(offer); this.emit({ type: 'new', offer }); return; }
            }
            const target = this.offers.length ? pick(this.offers) : null;
            if (target && target.descontoPct <= 75) {
                target.descontoPct += 5;
                target.precoEmpty = Math.round(target.precoNormal * (1 - target.descontoPct / 100) / 100) * 100;
                target.isReduced = true;
                this.emit({ type: 'price', offer: target });
            } else if (this.offers.length !== before) {
                this.emit({ type: 'expired' });
            } else {
                this.emit({ type: 'tick' });   // "heartbeat": o feed foi consultado (a interface atualiza o horário da última atualização)
            }
        }
    }

    /**
     * Adaptador de feed REAL por Server-Sent Events (exige um backend; não é usado por padrão).
     * O servidor deve enviar mensagens JSON: {type:'new'|'price'|'expired'|'snapshot', offer?, offers?}.
     */
    class RemoteEmptyLegFeed {
        constructor(url) { this.url = url; this.offers = []; this.subs = new Set(); this.es = null; }
        subscribe(cb) {
            this.subs.add(cb); cb(this.offers, { type: 'init' });
            if (!this.es) this._open();
            return () => { this.subs.delete(cb); if (!this.subs.size) this._close(); };
        }
        _open() {
            this.es = new EventSource(this.url);
            this.es.onmessage = (m) => { try { this._apply(JSON.parse(m.data)); } catch (e) { console.error('[feed] mensagem inválida', e); } };
            document.addEventListener('visibilitychange', this._vis = () => { if (document.hidden) this._close(); else if (this.subs.size && !this.es) this._open(); });
        }
        _close() { if (this.es) { this.es.close(); this.es = null; } }
        _apply(msg) {
            const now = Date.now();
            if (msg.type === 'snapshot') this.offers = msg.offers || [];
            else if (msg.type === 'new' || msg.type === 'price') { this.offers = this.offers.filter((o) => o.id !== msg.offer.id).concat(msg.offer); }
            this.offers = this.offers.filter((o) => o.expiresAt > now);
            this.subs.forEach((cb) => cb(this.offers, msg.type === 'snapshot' ? { type: 'tick' } : msg));
        }
    }

    if (window.AETHER_EMPTY_LEG_SSE_URL && window.EventSource) {
        window.EmptyLegFeedInstance = new RemoteEmptyLegFeed(window.AETHER_EMPTY_LEG_SSE_URL);
    } else if (window.AIRPORTS && window.FLEET && window.RouteService) {
        window.EmptyLegFeedInstance = new MockEmptyLegFeed();
    } else {
        console.error('[empty-legs-feed] carregue data.js e route-service.js antes deste arquivo.');
    }
})();
