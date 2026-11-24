/**
 * @file route-service.js
 * @description Distância great circle (Haversine), tempo de voo e cotação por aeronave.
 * Funciona 100% no navegador, sem API externa. Depende de window.AIRPORTS, FLEET e calculateFlightCost (data.js).
 *
 * Em produção, para dados de vento/tráfego, troque computeRoute por uma chamada a um backend proxy
 * (nunca coloque chave de API no front-end).
 */
(function () {
    'use strict';

    const R = 6371;              // raio médio da Terra (km)
    const config = window.AETHER_ROUTE_CONFIG;
    const ROUTE_FACTOR = config.fatorRota;
    const cache = new Map();
    const distances = new Map();
    // A rede inclui aeroportos civis selecionados para simulação de parada técnica.
    const candidates = (window.AIRPORTS || []).filter(a => a.escalaTecnica && a.pista_ft >= config.pistaMinimaPes);

    const toRad = (d) => d * Math.PI / 180;
    const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

    // Haversine: distância sobre a esfera entre dois pontos (lat/lon em graus)
    function haversineKm(a, b) {
        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lon - a.lon);
        const h = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
    }

    // Aceita "SBSP", "CGH", "São Paulo", "São Paulo (CGH)". Retorna null se não achar (sem "chute").
    function findAirport(text) {
        if (!text) return null;
        const raw = String(text).trim();
        const list = window.AIRPORTS || [];
        const paren = raw.match(/\(([A-Za-z]{3,4})\)\s*$/);
        const code = norm(paren ? paren[1] : raw);
        const byCode = list.find((a) => a.icao === code || a.iata === code);
        if (byCode) return byCode;
        const city = norm(raw.replace(/\(.*?\)/g, ''));
        if (city.length < 3) return null;
        return list.find((a) => norm(a.cidade) === city)
            || list.find((a) => norm(a.cidade).includes(city) || norm(a.nome).includes(city))
            || null;
    }

    function formatDuration(hours) {
        const total = Math.round(hours * 60);
        return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}min`;
    }

    function computeRoute(origText, destText) {
        const origem = findAirport(origText);
        const destino = findAirport(destText);
        if (!origem) return { error: 'origem' };
        if (!destino) return { error: 'destino' };
        if (origem.icao === destino.icao) return { error: 'igual' };
        const gc = haversineKm(origem, destino);
        return {
            origem, destino,
            distanciaOrtodromicaKm: Math.round(gc),
            distanciaVooKm: Math.round(gc * ROUTE_FACTOR)
        };
    }

    function distance(a, b) {
        const key = a.icao < b.icao ? a.icao + ':' + b.icao : b.icao + ':' + a.icao;
        if (!distances.has(key)) distances.set(key, haversineKm(a, b) * ROUTE_FACTOR);
        return distances.get(key);
    }

    function plan(route, limit) {
        const { origem, destino } = route;
        const key = [origem.icao, destino.icao, limit].join(':');
        if (cache.has(key)) return cache.get(key);
        if (distance(origem, destino) <= limit) return [origem, destino];

        // Busca por camadas minimiza escalas. Entre rotas com o mesmo número de
        // trechos, prefere menor desvio e trechos próximos da distância média.
        const nodes = [...candidates.filter(a => a !== origem && a !== destino), destino];
        const visited = new Set([origem]);
        let current = new Map([[origem, { path: [origem], score: 0 }]]);
        const ideal = distance(origem, destino) / Math.ceil(distance(origem, destino) / limit);
        while (current.size) {
            const next = new Map();
            for (const [from, state] of current) {
                for (const to of nodes) {
                    if (visited.has(to)) continue;
                    const km = distance(from, to);
                    if (km > limit) continue;
                    const score = state.score + km + 0.35 * (km - ideal) ** 2 / limit;
                    if (!next.has(to) || next.get(to).score > score) {
                        next.set(to, { path: [...state.path, to], score });
                    }
                }
            }
            if (next.has(destino)) {
                const path = next.get(destino).path;
                cache.set(key, path);
                return path;
            }
            for (const node of next.keys()) visited.add(node);
            current = next;
        }
        cache.set(key, null);
        return null;
    }

    function estimateFor(route, aircraft, pax) {
        const limiteKm = aircraft.alcance_km * (1 - config.margemCombustivel);
        const path = plan(route, limiteKm);
        const capacidadeOk = aircraft.pax >= (pax || 1);
        if (!path) return { aircraft, capacidadeOk, rotaViavel: false, viavel: false, semParada: false, trechos: [], custo: null };
        const trechos = path.slice(1).map((destino, i) => {
            const origem = path[i];
            const km = distance(origem, destino);
            return { origem, destino, km, horas: km / aircraft.velocidade_kmh + config.tempoOperacionalHoras,
                paradaMin: i < path.length - 2 ? config.paradaMinutos : 0 };
        });
        const escalas = trechos.length - 1;
        const kmTotal = trechos.reduce((sum, leg) => sum + leg.km, 0);
        const horasVoo = trechos.reduce((sum, leg) => sum + leg.horas, 0);
        const paradaMin = escalas * config.paradaMinutos;
        const horas = horasVoo + paradaMin / 60;
        const taxaEscalas = escalas * (config.taxaPouso + config.taxaReabastecimento);
        return { aircraft, capacidadeOk, rotaViavel: true, viavel: capacidadeOk, semParada: !escalas,
            escalas, trechos, kmTotal, horasVoo, paradaMin, horas, limiteKm, taxaEscalas,
            duracao: formatDuration(horas), custo: window.calculateFlightCost(kmTotal, aircraft, 0.08, taxaEscalas) };
    }

    function compareEstimates(a, b) {
        return Number(b.viavel) - Number(a.viavel) ||
            (a.custo?.totalCost ?? Infinity) - (b.custo?.totalCost ?? Infinity) || 0;
    }

    function quote(origText, destText, pax) {
        const route = computeRoute(origText, destText);
        if (route.error) return route;
        const opcoes = (window.FLEET || []).map(a => estimateFor(route, a, pax)).sort(compareEstimates);
        return { route, opcoes };
    }

    window.RouteService = { findAirport, haversineKm, computeRoute, estimateFor, compareEstimates, quote, formatDuration, ROUTE_FACTOR };
})();
