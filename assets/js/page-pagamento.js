/**
 * @file page-pagamento.js
 * @description Etapa 3: dados do pagador, forma de pagamento (crédito parcelado, débito, Pix, cheque, transferência),
 * validações e emissão da passagem. SIMULAÇÃO: não há cobrança real; CVV e número do cartão nunca são gravados.
 */
(function () {
    'use strict';
    const A = window.Aether, $ = (id) => document.getElementById(id), esc = A.esc;
    A.mountLayout({ active: 'criar', step: 3 });

    const draft = A.getDraft();
    const idx = A.menuIndex();
    const errs = A.validateDraft(draft);
    const needsAdult = Object.entries(draft.menu).some(([id, q]) => q > 0 && idx[id] && idx[id].alcool) && !draft.adult18;

    // ---------- Proteção: só chega aqui com a viagem completa ----------
    if (errs.length || needsAdult) {
        $('pay-form').classList.add('hidden');
        const g = $('pay-guard'); g.classList.remove('hidden');
        g.innerHTML = `<h2 class="font-serif text-2xl font-bold text-ink mb-3">Falta completar a sua reserva</h2><p class="text-sm text-mute mb-6">${esc(errs[0] || 'Confirme a declaração de maioridade para as bebidas alcoólicas escolhidas.')}</p><a href="${errs.length ? 'criar-passagem.html' : 'cardapio.html'}" class="btn btn-wine">${errs.length ? 'Completar a viagem' : 'Voltar ao cardápio'}</a>`;
        return;
    }

    const pricing = A.priceTrip(draft);
    const METHODS = [['credito', 'Crédito', 'credit-card'], ['debito', 'Débito', 'landmark'], ['pix', 'Pix', 'zap'], ['cheque', 'Cheque', 'file-text'], ['transferencia', 'Transferência', 'arrow-left-right']];
    const LABEL = { credito: 'Cartão de crédito', debito: 'Cartão de débito', pix: 'Pix', cheque: 'Cheque', transferencia: 'Transferência bancária' };
    let method = 'credito', installments = 1, busy = false;

    // Clima do destino (guardado na passagem; não bloqueia o pagamento)
    let weatherSnap = null;
    A.getWeather(pricing.route.destino, draft.departure).then((w) => { weatherSnap = w.status === 'ok' ? w : null; });

    // ---------- Métodos ----------
    function renderMethods() {
        $('method-tabs').innerHTML = METHODS.map(([k, t, ic]) => `<button type="button" role="radio" aria-checked="${k === method}" data-method="${k}" class="option-card p-3 text-xs font-medium flex flex-col items-center gap-1 ${k === method ? 'selected text-ink' : 'text-mute'}"><i data-lucide="${ic}" class="w-5 h-5 text-taupe"></i>${t}</button>`).join('');
        const isCard = method === 'credito' || method === 'debito';
        $('panel-card').classList.toggle('hidden', !isCard);
        $('wrap-installments').classList.toggle('hidden', method !== 'credito');
        ['pix', 'cheque', 'transferencia'].forEach((m) => $('panel-' + m).classList.toggle('hidden', method !== m));
        A.icons();
    }
    $('method-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-method]'); if (!b) return; method = b.dataset.method; installments = 1; $('cc-installments').value = '1'; renderMethods(); renderSummary(); });

    function renderInstallments() {
        const opts = A.installmentOptions(pricing.subtotal);
        $('cc-installments').innerHTML = opts.map((o) => `<option value="${o.n}">${o.n}x de ${A.fmtBRL2(o.parcela)}${o.juros ? ` com juros (total ${A.fmtBRL2(o.total)})` : ' sem juros'}</option>`).join('');
        $('installments-note').textContent = `Até ${A.CONFIG.FREE_INSTALLMENTS}x sem juros. De ${A.CONFIG.FREE_INSTALLMENTS + 1}x a ${A.CONFIG.MAX_INSTALLMENTS}x, juros de ${(A.CONFIG.MONTHLY_RATE * 100).toFixed(2).replace('.', ',')}% ao mês. Parcela mínima de ${A.fmtBRL(A.CONFIG.MIN_INSTALLMENT)}.`;
    }
    $('cc-installments').addEventListener('change', (e) => { installments = Number(e.target.value); renderSummary(); });

    // ---------- Resumo ----------
    function renderSummary() {
        const p = pricing, t = A.paymentTotals(p.subtotal, method, installments);
        const row = (a, b, cls) => `<div class="flex justify-between gap-3 ${cls || ''}"><span class="text-mute">${a}</span><span class="text-ink shrink-0">${b}</span></div>`;
        let h = `<h3 class="font-serif text-xl font-bold text-ink">Resumo do pedido</h3>
            <div class="text-xs"><span class="font-serif text-lg font-bold text-ink">${esc(p.route.origem.icao)} &rarr; ${esc(p.route.destino.icao)}</span><span class="block text-mute">${esc(p.aircraft.nome)} &bull; ${draft.pax} pax</span><span class="block text-mute">Ida: ${esc(A.fmtDateTime(draft.departure))}</span>${p.legs === 2 ? `<span class="block text-mute">Volta: ${esc(A.fmtDateTime(draft.returnDeparture))}</span>` : ''}</div>
            <div class="border-t border-ink/10 pt-3 space-y-2 text-xs">${row(`Voo (${Math.round(p.est.kmTotal).toLocaleString('pt-BR')} km${p.legs === 2 ? ' &times; 2' : ''})`, A.fmtBRL(p.vooBase))}${row('Taxas de voo e escalas', A.fmtBRL(p.vooTaxas))}${p.cateringTotal ? row(`Cardápio (${p.menuLines.length} ${p.menuLines.length === 1 ? 'item' : 'itens'})`, A.fmtBRL(p.cateringTotal)) : ''}${p.servicesTotal ? row('Serviços adicionais', A.fmtBRL(p.servicesTotal)) : ''}${A.itineraryHTML(p.est, p.legs === 2)}${row('<strong class="text-ink">Subtotal</strong>', A.fmtBRL(p.subtotal), 'pt-2 border-t border-ink/10')}</div>
            <div class="border-t border-ink/10 pt-3 space-y-2 text-xs">${row('Forma de pagamento', LABEL[method])}`;
        if (t.desconto) h += row('Desconto Pix (5%)', '<span class="text-ok">&minus; ' + A.fmtBRL2(t.desconto) + '</span>');
        if (t.juros) h += row('Juros do parcelamento', '<span class="text-warn">+ ' + A.fmtBRL2(t.juros) + '</span>');
        h += `<div class="flex justify-between items-end pt-2 border-t border-ink/10"><span class="text-ink font-semibold text-sm">Total</span><span class="font-serif text-2xl font-bold text-taupe">${A.fmtBRL2(t.total)}</span></div>`;
        if (method === 'credito') h += `<p class="text-[11px] text-mute text-right">${t.parcelas}x de ${A.fmtBRL2(t.parcela)}</p>`;
        h += '</div>';
        $('pay-summary').innerHTML = h;
    }

    // ---------- Máscaras ----------
    const digits = (s) => String(s).replace(/\D/g, '');
    $('p-doc').addEventListener('input', (e) => {
        const d = digits(e.target.value).slice(0, 14);
        e.target.value = d.length <= 11 ? d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
            : d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    });
    $('cc-number').addEventListener('input', (e) => {
        const d = digits(e.target.value).slice(0, 19), b = A.cardBrand(d);
        e.target.value = b === 'Amex' ? [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ') : (d.match(/.{1,4}/g) || []).join(' ');
        $('cc-brand').textContent = b ? '(' + b + ')' : '';
    });
    $('cc-exp').addEventListener('input', (e) => { const d = digits(e.target.value).slice(0, 4); e.target.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; });
    $('cc-cvv').addEventListener('input', (e) => { e.target.value = digits(e.target.value).slice(0, 4); });

    // ---------- Validação ----------
    function validate() {
        let first = null;
        const bad = (id, msg) => { A.setError($(id), msg); if (msg && !first) first = $(id); return !msg; };
        const name = $('p-name').value.trim();
        bad('p-name', name.length < 5 || !/\s/.test(name) ? 'Informe o nome completo.' : '');
        bad('p-doc', A.validDoc($('p-doc').value) ? '' : 'CPF ou CNPJ inválido.');
        bad('p-email', A.validEmail($('p-email').value) ? '' : 'E-mail inválido.');
        if (method === 'credito' || method === 'debito') {
            const num = digits($('cc-number').value), brand = A.cardBrand(num);
            bad('cc-number', A.luhn(num) ? '' : 'Número de cartão inválido.');
            bad('cc-name', $('cc-name').value.trim().length < 3 ? 'Informe o nome impresso no cartão.' : '');
            bad('cc-exp', A.validExpiry($('cc-exp').value) ? '' : 'Validade inválida ou vencida.');
            bad('cc-cvv', digits($('cc-cvv').value).length === (brand === 'Amex' ? 4 : 3) ? '' : `CVV com ${brand === 'Amex' ? 4 : 3} dígitos.`);
        } else ['cc-number', 'cc-name', 'cc-exp', 'cc-cvv'].forEach((id) => A.setError($(id), ''));
        bad('terms', $('terms').checked ? '' : 'É preciso aceitar os termos para continuar.');
        if (first) { first.focus(); A.toast('Revise os campos destacados.', 'error'); }
        return !first;
    }
    ['p-name', 'p-doc', 'p-email', 'cc-number', 'cc-name', 'cc-exp', 'cc-cvv'].forEach((id) => $(id).addEventListener('input', () => A.setError($(id), '')));

    // ---------- Confirmação ----------
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    $('pay-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy) return;
        $('pay-error').classList.add('hidden');
        if (!validate()) return;
        // Revalida a reserva (a data pode ter vencido enquanto a página ficou aberta)
        const again = A.validateDraft(draft);
        if (again.length) { $('pay-error').textContent = again[0] + ' Volte e ajuste a viagem.'; $('pay-error').classList.remove('hidden'); return; }

        busy = true; const btn = $('btn-pay'); btn.disabled = true; btn.textContent = 'Processando pagamento...';
        await sleep(1300);
        const isCard = method === 'credito' || method === 'debito';
        const num = digits($('cc-number').value);
        if (isCard && num === '4000000000000002') {
            busy = false; btn.disabled = false; btn.textContent = 'Confirmar e emitir passagem';
            $('pay-error').textContent = 'Pagamento recusado pelo emissor do cartão (modo demonstração). Tente outro cartão ou outra forma de pagamento.';
            $('pay-error').classList.remove('hidden'); return;
        }
        const t = A.paymentTotals(pricing.subtotal, method, installments);
        const paid = isCard;
        const payment = {
            method, label: LABEL[method], parcelas: t.parcelas, valorParcela: t.parcela, total: t.total,
            descontoValor: t.desconto, jurosValor: t.juros, status: paid ? 'pago' : 'pendente',
            paidAt: paid ? new Date().toISOString() : null,
            holder: $('p-name').value.trim(), docMasked: A.maskDoc($('p-doc').value), email: $('p-email').value.trim(),
            brand: isCard ? A.cardBrand(num) : null, last4: isCard ? num.slice(-4) : null   // nunca gravamos o número completo nem o CVV
        };
        const ticket = A.buildTicket(draft, payment, weatherSnap);
        if (method === 'pix') ticket.payment.pixCode = `DEMO.PIX.${ticket.code}.${Math.round(t.total * 100)}`;
        A.addTicket(ticket);
        A.clearDraft();
        location.href = 'passagens.html?novo=' + encodeURIComponent(ticket.code);
    });

    renderMethods(); renderInstallments(); renderSummary();
})();
