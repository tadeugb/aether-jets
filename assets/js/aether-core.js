/**
 * @file aether-core.js
 * @description Núcleo de regras de negócio do fluxo de reserva (sem DOM):
 * armazenamento, preços, parcelamento, política de cancelamento, validações e emissão de passagens.
 * Depende de: data.js (FLEET, AIRPORTS, calculateFlightCost), route-service.js (RouteService), catalog.js.
 *
 * SIMULAÇÃO: nada aqui processa pagamento real. As passagens ficam no localStorage e, quando o site roda pelo server.js, também no PostgreSQL.
 * NUNCA gravamos número completo de cartão nem CVV: só bandeira e os 4 últimos dígitos.
 */
(function () {
    'use strict';

    const KEYS = { draft: 'aether.draft.v1', tickets: 'aether.tickets.v1' };
    const CONFIG = {
        PIX_DISCOUNT: 0.05,          // 5% de desconto no Pix
        FREE_INSTALLMENTS: 6,        // até 6x sem juros
        MAX_INSTALLMENTS: 12,
        MONTHLY_RATE: 0.0199,        // 1,99% a.m. de 7x a 12x (Tabela Price)
        MIN_INSTALLMENT: 1000,       // valor mínimo da parcela
        MIN_LEAD_HOURS: 2,           // antecedência mínima da decolagem
        MAX_PAX: Math.max(16, ...window.FLEET.map(a => a.pax))
    };

    // ---------- Armazenamento (localStorage com fallback em memória) ----------
    const mem = {};
    const store = {
        get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return (k in mem) ? mem[k] : fallback; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
        remove(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
    };

    // ---------- Formatação ----------
    // Valores são calculados em BRL; a exibição respeita a moeda escolhida (taxas fixas de referência, ver i18n.js/data.js).
    const I18N = () => window.AetherI18n;
    const fmtBRL = (v) => I18N() ? I18N().money(v) : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    const fmtBRL2 = (v) => I18N() ? I18N().money(v, { decimals: 2 }) : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDateTime = (iso) => new Date(iso).toLocaleString(I18N() ? I18N().locale : 'pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const round2 = (n) => Math.round(n * 100) / 100;
    const pad = (n) => String(n).padStart(2, '0');
    // Valor para <input type="datetime-local"> no horário LOCAL (toISOString usaria UTC)
    const toLocalInput = (d) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const params = () => Object.fromEntries(new URLSearchParams(location.search));

    // ---------- Rascunho da reserva ----------
    const defaultDraft = () => ({ tripType: 'ida', pax: 2, menu: {}, services: {}, dietary: [], notes: '', adult18: false });
    const getDraft = () => Object.assign(defaultDraft(), store.get(KEYS.draft, {}));
    const saveDraft = (d) => store.set(KEYS.draft, d);
    const clearDraft = () => store.remove(KEYS.draft);

    // ---------- Catálogos ----------
    const getAircraft = (id) => (window.FLEET || []).find((a) => a.id === id) || null;
    const menuIndex = () => {
        const idx = {};
        Object.entries(window.AETHER_MENU || {}).forEach(([cat, c]) => c.itens.forEach((i) => { idx[i.id] = Object.assign({ categoria: cat, categoriaNome: c.nome }, i); }));
        return idx;
    };

    // ---------- Rota e preço ----------
    function tripRoute(d) {
        if (!d || !d.origemICAO || !d.destinoICAO) return null;
        const r = window.RouteService.computeRoute(d.origemICAO, d.destinoICAO);
        return r.error ? null : r;
    }

    // Preço completo da viagem. Voo = (distância de voo x tarifa/km + 8% de taxas) por trecho.
    function priceTrip(d) {
        const route = tripRoute(d), aircraft = getAircraft(d && d.aircraftId);
        if (!route || !aircraft) return null;
        const legs = d.tripType === 'ida-volta' ? 2 : 1;
        const est = window.RouteService.estimateFor(route, aircraft, d.pax || 1);
        if (!est.viavel) return null;
        const leg = est.custo;
        const idx = menuIndex();
        const menuLines = Object.entries(d.menu || {})
            .filter(([id, q]) => idx[id] && q > 0)
            .map(([id, q]) => ({ id, nome: idx[id].nome, categoria: idx[id].categoriaNome, unidade: idx[id].unidade, alcool: idx[id].alcool, qtd: q, unit: idx[id].preco, total: idx[id].preco * q }));
        const serviceLines = (window.AETHER_SERVICES || [])
            .filter((s) => d.services && d.services[s.id])
            .map((s) => { const mult = s.porTrecho ? legs : 1; return { id: s.id, nome: s.nome, mult, unit: s.preco, total: s.preco * mult }; });
        const sum = (arr) => arr.reduce((a, x) => a + x.total, 0);
        const voo = leg.totalCost * legs;
        const cateringTotal = sum(menuLines), servicesTotal = sum(serviceLines);
        return {
            route, aircraft, legs, est,
            vooBase: leg.baseCost * legs, vooTaxas: leg.taxesAndHandling * legs, taxaEscalas: est.taxaEscalas * legs, voo,
            menuLines, cateringTotal, serviceLines, servicesTotal,
            subtotal: voo + cateringTotal + servicesTotal
        };
    }

    // Validação do rascunho. Retorna lista de mensagens (vazia = ok).
    function validateDraft(d, now) {
        now = now || Date.now();
        const errors = [];
        const route = tripRoute(d), aircraft = getAircraft(d.aircraftId);
        if (!route) errors.push('Informe origem e destino válidos (aeroportos diferentes).');
        if (!aircraft) errors.push('Escolha uma aeronave.');
        const pax = Number(d.pax);
        if (!Number.isInteger(pax) || pax < 1 || pax > CONFIG.MAX_PAX) errors.push(`O número de passageiros deve ficar entre 1 e ${CONFIG.MAX_PAX}.`);
        if (route && aircraft) {
            if (!window.RouteService.estimateFor(route, aircraft, pax).rotaViavel) errors.push(`${aircraft.nome}: nenhuma rota compatível na rede de escalas técnicas.`);
            if (Number.isInteger(pax) && aircraft.pax < pax) errors.push(`${aircraft.nome} comporta no máximo ${aircraft.pax} passageiros.`);
        }
        const dep = new Date(d.departure).getTime();
        if (!d.departure || isNaN(dep)) errors.push('Informe a data e o horário da decolagem.');
        else if (dep < now + CONFIG.MIN_LEAD_HOURS * 3600000) errors.push(`A decolagem precisa ser daqui a pelo menos ${CONFIG.MIN_LEAD_HOURS} horas.`);
        if (d.tripType === 'ida-volta') {
            const ret = new Date(d.returnDeparture).getTime();
            if (!d.returnDeparture || isNaN(ret)) errors.push('Informe a data e o horário da volta.');
            else if (!isNaN(dep) && ret < dep + 3600000) errors.push('A volta precisa ser pelo menos 1 hora depois da ida.');
        }
        return errors;
    }

    // ---------- Pagamento ----------
    function installmentOptions(total) {
        const out = [];
        for (let n = 1; n <= CONFIG.MAX_INSTALLMENTS; n++) {
            let parcela, totalFinal;
            if (n <= CONFIG.FREE_INSTALLMENTS) { parcela = total / n; totalFinal = total; }
            else { const i = CONFIG.MONTHLY_RATE; parcela = total * i / (1 - Math.pow(1 + i, -n)); totalFinal = parcela * n; }
            if (n > 1 && parcela < CONFIG.MIN_INSTALLMENT) break;
            out.push({ n, parcela: round2(parcela), total: round2(totalFinal), juros: n > CONFIG.FREE_INSTALLMENTS });
        }
        return out;
    }

    // Total a pagar conforme o método
    function paymentTotals(subtotal, method, nInstallments) {
        if (method === 'pix') {
            const desconto = round2(subtotal * CONFIG.PIX_DISCOUNT);
            return { total: round2(subtotal - desconto), desconto, juros: 0, parcelas: 1, parcela: round2(subtotal - desconto) };
        }
        if (method === 'credito') {
            const opts = installmentOptions(subtotal);
            const o = opts.find((x) => x.n === Number(nInstallments)) || opts[0];
            return { total: o.total, desconto: 0, juros: round2(o.total - subtotal), parcelas: o.n, parcela: o.parcela };
        }
        return { total: round2(subtotal), desconto: 0, juros: 0, parcelas: 1, parcela: round2(subtotal) };
    }

    // Política de cancelamento (reembolso sobre o valor PAGO)
    function refundInfo(ticket, now) {
        now = now || Date.now();
        const hours = (new Date(ticket.view.departure).getTime() - now) / 3600000;
        const pct = hours > 48 ? 1 : hours > 24 ? 0.5 : 0;
        const pago = ticket.payment.status === 'pago';
        return { hours, pct, valor: pago ? round2(ticket.payment.total * pct) : 0, pago };
    }

    // ---------- Validações de documento e cartão ----------
    function luhn(num) {
        const d = String(num).replace(/\D/g, '');
        if (d.length < 13 || d.length > 19) return false;
        let sum = 0, alt = false;
        for (let i = d.length - 1; i >= 0; i--) { let n = Number(d[i]); if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
        return sum % 10 === 0;
    }
    function cardBrand(num) {
        const d = String(num).replace(/\D/g, '');
        if (/^4/.test(d)) return 'Visa';
        if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
        if (/^3[47]/.test(d)) return 'Amex';
        if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(d)) return 'Elo';
        return null;
    }
    function validExpiry(mmaa, now) {
        const m = /^(\d{2})\/(\d{2})$/.exec(mmaa || '');
        if (!m) return false;
        const mes = Number(m[1]), ano = 2000 + Number(m[2]);
        if (mes < 1 || mes > 12) return false;
        const d = new Date(now || Date.now());
        return ano > d.getFullYear() || (ano === d.getFullYear() && mes >= d.getMonth() + 1);
    }
    function validCPF(s) {
        const c = String(s).replace(/\D/g, '');
        if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
        for (let t = 9; t < 11; t++) {
            let sum = 0;
            for (let i = 0; i < t; i++) sum += Number(c[i]) * (t + 1 - i);
            if (((sum * 10) % 11) % 10 !== Number(c[t])) return false;
        }
        return true;
    }
    function validCNPJ(s) {
        const c = String(s).replace(/\D/g, '');
        if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
        const calc = (len) => { let sum = 0, pos = len - 7; for (let i = len; i >= 1; i--) { sum += Number(c[len - i]) * pos--; if (pos < 2) pos = 9; } const r = sum % 11; return r < 2 ? 0 : 11 - r; };
        return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
    }
    const validDoc = (s) => { const n = String(s).replace(/\D/g, ''); return n.length === 11 ? validCPF(n) : n.length === 14 ? validCNPJ(n) : false; };
    const maskDoc = (s) => { const n = String(s).replace(/\D/g, ''); return n.length === 11 ? `***.***.${n.slice(6, 9)}-${n.slice(9)}` : n.length === 14 ? `**.***.***/${n.slice(8, 12)}-${n.slice(12)}` : '***'; };
    const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());

    // ---------- Passagens ----------
    const getTickets = () => { const t = store.get(KEYS.tickets, []); return Array.isArray(t) ? t : []; };
    const saveTickets = (t) => store.set(KEYS.tickets, t);
    function genCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const existing = new Set(getTickets().map((t) => t.code));
        for (;;) {
            let code = 'AJ';
            const bytes = new Uint8Array(5);
            if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes); else for (let i = 0; i < 5; i++) bytes[i] = Math.floor(Math.random() * 256);
            bytes.forEach((b) => { code += alphabet[b % alphabet.length]; });
            if (!existing.has(code)) return code;
        }
    }

    // Monta o "snapshot" que a passagem guarda (assim ela não muda se o catálogo mudar depois)
    function buildTicket(draft, payment, weather) {
        const p = priceTrip(draft);
        if (!p) throw new Error('Rascunho incompleto.');
        const a = p.aircraft, r = p.route;
        const air = (x) => ({ icao: x.icao, iata: x.iata, cidade: x.cidade, nome: x.nome, pais: x.pais });
        return {
            code: genCode(),
            createdAt: new Date().toISOString(),
            status: 'ativa',
            view: {
                origem: air(r.origem), destino: air(r.destino),
                distanciaOrtodromicaKm: r.distanciaOrtodromicaKm, distanciaVooKm: Math.round(p.est.kmTotal), trechos: p.est.trechos, escalas: p.est.escalas,
                duracao: p.est.duracao, horasPorTrecho: p.est.horas,
                tripType: draft.tripType, departure: draft.departure, returnDeparture: draft.tripType === 'ida-volta' ? draft.returnDeparture : null,
                pax: Number(draft.pax),
                aircraft: { id: a.id, nome: a.nome, categoriaNome: a.categoriaNome, pax: a.pax, alcance_km: a.alcance_km, velocidade_kmh: a.velocidade_kmh, tarifa_km: a.tarifa_km, imagem: a.imagem },
                menuLines: p.menuLines, serviceLines: p.serviceLines,
                dietary: draft.dietary || [], notes: draft.notes || '',
                valores: { legs: p.legs, vooBase: p.vooBase, vooTaxas: p.vooTaxas, taxaEscalas: p.taxaEscalas, voo: p.voo, catering: p.cateringTotal, servicos: p.servicesTotal, subtotal: p.subtotal },
                weather: weather || null
            },
            payment
        };
    }
    // Espelha a passagem no banco via API. Aberto como site estático (sem server.js) a chamada falha e fica só o localStorage.
    const syncTicket = (t) => {
        if (t.demo || !/^https?:$/.test(location.protocol)) return;
        fetch('/api/passagens/' + encodeURIComponent(t.code), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) })
            .then((r) => { if (!r.ok && r.status !== 404) r.json().then((e) => console.warn('API passagens:', e.erro)); })
            .catch(() => {});
    };
    const addTicket = (t) => { const list = getTickets(); list.unshift(t); saveTickets(list); syncTicket(t); return t; };
    const updateTicket = (code, fn) => { const list = getTickets(); const i = list.findIndex((t) => t.code === code); if (i < 0) return null; fn(list[i]); saveTickets(list); syncTicket(list[i]); return list[i]; };

    // Estado de exibição (considera a data atual)
    function ticketStatus(t, now) {
        now = now || Date.now();
        if (t.status === 'cancelada') return 'cancelada';
        const end = new Date(t.view.tripType === 'ida-volta' ? t.view.returnDeparture : t.view.departure).getTime();
        if (t.payment.status !== 'pago') return new Date(t.view.departure).getTime() < now ? 'expirada' : 'aguardando';
        return end < now ? 'concluida' : 'confirmada';
    }

    window.Aether = {
        CONFIG, KEYS, store, fmtBRL, fmtBRL2, fmtDateTime, esc, round2, pad, toLocalInput, params,
        getDraft, saveDraft, clearDraft, defaultDraft, getAircraft, menuIndex, tripRoute,
        priceTrip, validateDraft, installmentOptions, paymentTotals, refundInfo,
        luhn, cardBrand, validExpiry, validCPF, validCNPJ, validDoc, maskDoc, validEmail,
        getTickets, saveTickets, genCode, buildTicket, addTicket, updateTicket, ticketStatus
    };
})();
