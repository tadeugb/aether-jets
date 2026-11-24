/**
 * @file page-cardapio.js
 * @description Etapa 2: escolha de bebidas, refeições, snacks, serviços adicionais e preferências alimentares.
 */
(function () {
    'use strict';
    const A = window.Aether, $ = (id) => document.getElementById(id), esc = A.esc;
    A.mountLayout({ active: 'cardapio', step: 2 });

    const MENU = window.AETHER_MENU, SERVICES = window.AETHER_SERVICES, DIET = window.AETHER_DIETARY;
    const MAX_QTY = 24;
    const draft = A.getDraft();
    const TABS = Object.keys(MENU).map((k) => ({ k, t: MENU[k].nome })).concat([{ k: 'servicos', t: 'Serviços' }, { k: 'preferencias', t: 'Preferências' }]);
    let tab = TABS[0].k;
    const idx = A.menuIndex();
    const persist = () => A.saveDraft(draft);
    const legs = () => (draft.tripType === 'ida-volta' ? 2 : 1);
    const hasAlcohol = () => Object.entries(draft.menu).some(([id, q]) => q > 0 && idx[id] && idx[id].alcool);

    // ---------- Banner de rascunho ----------
    function renderBanner() {
        const errs = A.validateDraft(draft);
        const b = $('draft-banner');
        if (!errs.length) { b.classList.add('hidden'); return; }
        b.classList.remove('hidden');
        b.innerHTML = `<p class="text-warn"><strong>Sua viagem ainda não está completa:</strong> ${esc(errs[0])}</p><a href="criar-passagem.html" class="text-taupe hover:underline text-xs">Voltar e completar a etapa 1 &rarr;</a><span class="block text-xs text-mute mt-1">Você pode montar o cardápio agora, mas só avança para o pagamento com a viagem completa.</span>`;
    }

    // ---------- Abas ----------
    function renderTabs() {
        $('menu-tabs').innerHTML = TABS.map((t) => `<button type="button" role="tab" aria-selected="${t.k === tab}" data-tab="${t.k}" class="chip ${t.k === tab ? 'active' : ''}">${esc(t.t)}</button>`).join('');
    }
    $('menu-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; renderTabs(); renderContent(); });

    // ---------- Conteúdo ----------
    function itemCard(i) {
        const q = draft.menu[i.id] || 0;
        const tags = i.tags.map((t) => `<span class="badge badge-muted">${esc(t)}</span>`).join(' ') + (i.alcool ? ' <span class="badge badge-warn">18+</span>' : '');
        return `<div class="card p-4 flex flex-col justify-between gap-3 ${q ? 'card-gold' : ''}" data-item="${esc(i.id)}">
            <div><div class="h-28 overflow-hidden rounded-lg mb-3">${AetherImages.markup(i.imagem, i.nome, "catering")}</div><h3 class="font-serif text-lg font-bold text-ink leading-tight">${esc(i.nome)}</h3><p class="text-xs text-mute mt-1">${esc(i.desc)}</p><div class="flex flex-wrap gap-1 mt-2">${tags}</div></div>
            <div class="flex items-center justify-between"><div><span class="font-serif text-xl font-bold text-taupe">${A.fmtBRL(i.preco)}</span><span class="text-[11px] text-mute"> / ${esc(i.unidade)}</span></div>
                <div class="flex items-center gap-2" role="group" aria-label="Quantidade de ${esc(i.nome)}">
                    <button type="button" class="btn btn-ghost btn-sm !px-3" data-act="dec" aria-label="Diminuir" ${q ? '' : 'disabled'}>&minus;</button>
                    <span class="w-6 text-center text-sm font-semibold" data-qty>${q}</span>
                    <button type="button" class="btn btn-ghost btn-sm !px-3" data-act="inc" aria-label="Aumentar" ${q >= MAX_QTY ? 'disabled' : ''}>+</button></div></div></div>`;
    }
    function renderContent() {
        const el = $('menu-content');
        if (MENU[tab]) {
            el.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${MENU[tab].itens.map(itemCard).join('') || '<p class="text-mute">Nenhum item nesta categoria.</p>'}</div>`;
        } else if (tab === 'servicos') {
            el.innerHTML = `<div class="grid grid-cols-1 gap-4">${SERVICES.map((s) => {
                const on = !!draft.services[s.id];
                return `<label class="card p-4 flex items-start gap-4 cursor-pointer ${on ? 'card-gold' : ''}"><input type="checkbox" data-service="${esc(s.id)}" class="mt-1 accent-wine w-4 h-4" ${on ? 'checked' : ''}>
                    <div class="flex-1"><h3 class="font-serif text-lg font-bold text-ink">${esc(s.nome)}</h3><p class="text-xs text-mute mt-1">${esc(s.desc)}</p></div>
                    <div class="text-right"><span class="font-serif text-lg font-bold text-taupe">${A.fmtBRL(s.preco)}</span><span class="block text-[11px] text-mute">${s.porTrecho ? 'por trecho' : 'por viagem'}</span></div></label>`;
            }).join('')}</div>`;
        } else {
            el.innerHTML = `<div class="card p-6 space-y-6">
                <div><span class="field-label">Restrições e preferências alimentares</span><div class="flex flex-wrap gap-2" id="diet-chips">${DIET.map((d) => `<button type="button" class="chip ${draft.dietary.includes(d) ? 'active' : ''}" data-diet="${esc(d)}" aria-pressed="${draft.dietary.includes(d)}">${esc(d)}</button>`).join('')}</div></div>
                <div><label class="field-label" for="notes">Observações para o chef e a tripulação</label><textarea id="notes" class="field" rows="4" maxlength="500" placeholder="Ex.: aniversário a bordo, horário preferido para a refeição, alergias...">${esc(draft.notes)}</textarea><p class="text-[11px] text-mute mt-1"><span id="notes-count">${draft.notes.length}</span>/500</p></div>
                <label class="flex items-start gap-3 text-sm cursor-pointer"><input type="checkbox" id="adult18" class="mt-1 accent-wine w-4 h-4" ${draft.adult18 ? 'checked' : ''}><span class="text-mute">Declaro que todos os passageiros que consumirem bebidas alcoólicas têm <strong class="text-ink">18 anos ou mais</strong>. <span class="text-warn text-xs">(obrigatório se houver bebidas alcoólicas)</span></span></label></div>`;
        }
        A.icons();
    }

    // ---------- Eventos de conteúdo ----------
    $('menu-content').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]'); if (btn) {
            const card = btn.closest('[data-item]'); const id = card.dataset.item;
            let q = (draft.menu[id] || 0) + (btn.dataset.act === 'inc' ? 1 : -1);
            q = Math.max(0, Math.min(MAX_QTY, q));
            if (q) draft.menu[id] = q; else delete draft.menu[id];
            card.querySelector('[data-qty]').textContent = q;
            card.querySelector('[data-act="dec"]').disabled = q === 0;
            card.querySelector('[data-act="inc"]').disabled = q >= MAX_QTY;
            card.classList.toggle('card-gold', q > 0);
            persist(); renderCart(); return;
        }
        const chip = e.target.closest('[data-diet]'); if (chip) {
            const d = chip.dataset.diet, i = draft.dietary.indexOf(d);
            if (i >= 0) draft.dietary.splice(i, 1); else draft.dietary.push(d);
            chip.classList.toggle('active', i < 0); chip.setAttribute('aria-pressed', String(i < 0)); persist();
        }
    });
    $('menu-content').addEventListener('change', (e) => {
        if (e.target.dataset.service) { draft.services[e.target.dataset.service] = e.target.checked; if (!e.target.checked) delete draft.services[e.target.dataset.service]; e.target.closest('label').classList.toggle('card-gold', e.target.checked); persist(); renderCart(); }
        if (e.target.id === 'adult18') { draft.adult18 = e.target.checked; persist(); }
    });
    $('menu-content').addEventListener('input', (e) => {
        if (e.target.id === 'notes') { draft.notes = e.target.value.slice(0, 500); $('notes-count').textContent = draft.notes.length; persist(); }
    });

    // ---------- Carrinho ----------
    function renderCart() {
        const p = A.priceTrip(draft);
        const menuLines = p ? p.menuLines : Object.entries(draft.menu).filter(([id, q]) => idx[id] && q > 0).map(([id, q]) => ({ nome: idx[id].nome, qtd: q, unidade: idx[id].unidade, total: idx[id].preco * q }));
        const serviceLines = p ? p.serviceLines : SERVICES.filter((s) => draft.services[s.id]).map((s) => ({ nome: s.nome, mult: s.porTrecho ? legs() : 1, total: s.preco * (s.porTrecho ? legs() : 1) }));
        const cat = menuLines.reduce((a, l) => a + l.total, 0), serv = serviceLines.reduce((a, l) => a + l.total, 0);
        const voo = p ? p.voo : 0, subtotal = voo + cat + serv;
        let html = '<h3 class="font-serif text-xl font-bold text-ink">Sua seleção</h3>';
        if (p) html += `<div class="text-xs"><span class="font-serif text-lg font-bold text-ink">${esc(p.route.origem.icao)} &rarr; ${esc(p.route.destino.icao)}</span><span class="block text-mute">${esc(p.aircraft.nome)} &bull; ${draft.pax} pax &bull; ${esc(A.fmtDateTime(draft.departure))}</span></div>`;
        html += '<div class="border-t border-ink/10 pt-3 space-y-2 text-xs">';
        if (!menuLines.length && !serviceLines.length) html += '<p class="text-mute">Nenhum item selecionado.</p>';
        html += menuLines.map((l) => `<div class="flex justify-between gap-3"><span class="text-mute">${l.qtd}&times; ${esc(l.nome)}</span><span class="text-ink shrink-0">${A.fmtBRL(l.total)}</span></div>`).join('');
        html += serviceLines.map((l) => `<div class="flex justify-between gap-3"><span class="text-mute">${esc(l.nome)}${l.mult > 1 ? ' (&times;' + l.mult + ')' : ''}</span><span class="text-ink shrink-0">${A.fmtBRL(l.total)}</span></div>`).join('');
        html += '</div><div class="border-t border-ink/10 pt-3 space-y-2 text-xs">';
        if (p) html += `<div class="flex justify-between"><span class="text-mute">Voo</span><span class="text-ink">${A.fmtBRL(voo)}</span></div>`;
        html += `<div class="flex justify-between"><span class="text-mute">Cardápio</span><span class="text-ink">${A.fmtBRL(cat)}</span></div>
                 <div class="flex justify-between"><span class="text-mute">Serviços</span><span class="text-ink">${A.fmtBRL(serv)}</span></div>
                 <div class="flex justify-between pt-2 border-t border-ink/10"><span class="text-ink font-semibold text-sm">${p ? 'Subtotal' : 'Total do cardápio'}</span><span class="font-serif text-xl font-bold text-taupe">${A.fmtBRL(p ? subtotal : cat + serv)}</span></div></div>
                 <p class="text-[11px] text-mute">Forma de pagamento e eventuais descontos ou juros são aplicados na próxima etapa.</p>
                 <button id="btn-next" class="btn btn-wine w-full">Continuar para o pagamento &rarr;</button>
                 <a href="criar-passagem.html" class="block text-center text-[11px] text-mute hover:text-ink">&larr; Voltar à etapa 1</a>`;
        $('cart').innerHTML = html;
        $('btn-next').addEventListener('click', next);
    }

    function next() {
        const errs = A.validateDraft(draft);
        if (errs.length) { A.toast(errs[0], 'error'); renderBanner(); return; }
        if (hasAlcohol() && !draft.adult18) {
            A.toast('Confirme a declaração de maioridade para bebidas alcoólicas (aba Preferências).', 'error');
            tab = 'preferencias'; renderTabs(); renderContent(); return;
        }
        persist(); location.href = 'pagamento.html';
    }

    renderBanner(); renderTabs(); renderContent(); renderCart();
})();
