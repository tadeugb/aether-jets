/**
 * @file aether-ui.js
 * @description Componentes de interface compartilhados pelas páginas internas:
 * cabeçalho/rodapé, passos da reserva, toasts, diálogo de confirmação, autocomplete de aeroportos,
 * previsão do tempo (Open-Meteo) e gráficos decorativos (código de barras e QR de demonstração).
 * Depende de aether-core.js.
 */
(function () {
    'use strict';
    const A = window.Aether;
    const { esc } = A;
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const icons = () => { if (window.lucide) window.lucide.createIcons(); };

    // ---------- Contato (fonte única; corrige e-mail sem acento e telefone em formato tel: válido) ----------
    const CONTACT = {
        phoneDisplay: '+55 (31) 97157-3764', tel: '+5531971573764', email: 'joaogabriel@aetherjets.com',
        wa: 'https://wa.me/5531971573764', address: 'Av. Brigadeiro Faria Lima, 4440 - Itaim Bibi, São Paulo - SP'
    };
    const T = (k, v) => (window.AetherI18n ? window.AetherI18n.t(k, v) : k);
    const waLink = (text) => CONTACT.wa + (text ? '?text=' + encodeURIComponent(text) : '');

    // ---------- Layout ----------
    // NAV: todas as páginas (rodapé e menu móvel). HEAD: subconjunto exibido no cabeçalho desktop.
    const NAV = [
        { k: 'home', href: 'index.html', i: 'nav.home' },
        { k: 'frota', href: 'frota.html', i: 'nav.fleet' },
        { k: 'empty', href: 'empty-legs.html', i: 'nav.empty', live: true },
        // Empty Legs permanece separado: inventário de reposicionamento, com datas e rotas próprias.
        { k: 'pacotes', href: 'pacotes.html', i: 'nav.packages' },
        { k: 'dest', href: 'index.html#destinos', i: 'nav.dest' },
        { k: 'criar', href: 'criar-passagem.html', i: 'nav.create' },
        { k: 'cardapio', href: 'cardapio.html', i: 'nav.menu' },
        { k: 'passagens', href: 'passagens.html', i: 'nav.tickets' },
        { k: 'sobre', href: 'sobre.html', i: 'nav.about' },
        { k: 'blog', href: 'blog.html', i: 'nav.blog' }
    ];
    const HEAD = ['frota', 'empty', 'pacotes', 'dest', 'sobre', 'blog', 'passagens'];
    const LANGS = [['pt', 'PT', 'Português'], ['en', 'EN', 'English'], ['es', 'ES', 'Español']];

    function dropdownHTML(kind) {
        const I = window.AetherI18n;
        const isLang = kind === 'lang';
        const cur = isLang ? I.lang : I.currency;
        const opts = isLang ? LANGS.map((l) => [l[0], l[2]]) : Object.keys(window.CURRENCIES).map((c) => [c, window.CURRENCIES[c].label]);
        const shown = isLang ? cur.toUpperCase() : cur;
        return `<div class="relative" data-dd>
            <button type="button" data-dd-toggle aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(T(isLang ? 'top.lang' : 'top.currency'))}: ${esc(shown)}" class="flex items-center gap-1 py-1 px-1.5 rounded text-ink font-medium hover:text-taupe">${esc(shown)}<i data-lucide="chevron-down" class="w-3 h-3 text-taupe"></i></button>
            <ul role="listbox" class="hidden absolute right-0 top-full mt-1 min-w-[8.5rem] bg-silver text-ink border border-stone/40 rounded-lg shadow-2xl z-[60] py-1">
                ${opts.map((o) => `<li role="option" aria-selected="${o[0] === cur}"><button type="button" data-${isLang ? 'lang' : 'cur'}="${o[0]}" class="w-full text-left px-3 py-1.5 text-xs hover:bg-fog ${o[0] === cur ? 'font-semibold text-wineInk' : ''}">${esc(o[1])}</button></li>`).join('')}
            </ul></div>`;
    }

    function headerHTML(active) {
        const links = NAV.filter((n) => HEAD.indexOf(n.k) !== -1).map((n) => `<a href="${n.href}" ${n.k === active ? 'aria-current="page"' : ''} class="text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${n.k === active ? 'text-taupe' : 'hover:text-taupe'}">${n.live ? '<span class="live-dot" aria-hidden="true"></span>' : ''}<span>${esc(T(n.i))}</span></a>`).join('');
        const mobile = NAV.map((n) => `<a href="${n.href}" class="block text-lg font-medium py-1 ${n.k === active ? 'text-taupe' : ''}">${esc(T(n.i))}</a>`).join('');
        return `
        <a href="#main" class="skip-link">${esc(T('nav.skip'))}</a>
        <div class="scope-night bg-sandDeep border-b border-ink/10 text-xs text-mute py-2 px-4 sm:px-8 flex justify-between items-center gap-3">
            <div class="flex items-center gap-5 min-w-0">
                <a href="tel:${CONTACT.tel}" class="hover:text-taupe flex items-center gap-1.5 shrink-0"><i data-lucide="phone" class="w-3.5 h-3.5 text-taupe"></i><span>${CONTACT.phoneDisplay}</span></a>
                <a href="mailto:${CONTACT.email}" class="hidden md:flex hover:text-taupe items-center gap-1.5"><i data-lucide="mail" class="w-3.5 h-3.5 text-taupe"></i><span>${CONTACT.email}</span></a>
                <span class="hidden xl:flex items-center gap-1.5 text-taupe"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i>${esc(T('top.support'))}</span>
            </div>
            <div class="flex items-center gap-2 shrink-0">${dropdownHTML('lang')}<span class="text-ink/25" aria-hidden="true">|</span>${dropdownHTML('cur')}</div>
        </div>
        <header class="scope-night glass-nav sticky top-0 z-40" id="site-header">
            <div class="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
                <a href="index.html" class="flex items-center gap-3 group" aria-label="Aether Jets">
                    <div class="w-10 h-10 rounded bg-wine/30 border border-taupe/40 flex items-center justify-center group-hover:bg-wine transition-colors"><i data-lucide="plane" class="w-5 h-5 text-taupe group-hover:text-white -rotate-45"></i></div>
                    <div class="flex flex-col"><span class="font-serif text-xl font-bold tracking-widest text-ink uppercase">Aether</span><span class="text-[9px] tracking-[0.3em] text-taupe uppercase -mt-1">Private Aviation</span></div>
                </a>
                <nav class="hidden lg:flex items-center gap-6" aria-label="Principal">${links}</nav>
                <div class="hidden lg:flex items-center gap-3">
                    <a href="index.html#/area-cliente" aria-label="${esc(T('nav.client'))}" class="text-mute hover:text-taupe p-2"><i data-lucide="user" class="w-5 h-5"></i></a>
                    <a href="criar-passagem.html" class="btn btn-wine btn-sm">${esc(T('nav.quote'))}</a>
                </div>
                <button id="nav-toggle" aria-label="${esc(T('nav.open'))}" aria-expanded="false" aria-controls="nav-mobile" class="lg:hidden text-ink p-2"><i data-lucide="menu" class="w-6 h-6"></i></button>
            </div>
            <div id="nav-mobile" class="hidden lg:hidden border-t border-ink/10 px-6 py-4 space-y-2 bg-sand max-h-[75vh] overflow-y-auto">
                ${mobile}
                <a href="index.html#/area-cliente" class="block text-lg font-medium py-1">${esc(T('nav.client'))}</a>
                <button type="button" data-open-modal="contact" class="block text-lg font-medium py-1 text-left">${esc(T('nav.contact'))}</button>
                <a href="criar-passagem.html" class="btn btn-wine w-full mt-3">${esc(T('nav.quote'))}</a>
            </div>
        </header>`;
    }

    function footerHTML() {
        const nav = NAV.map((n) => `<li><a href="${n.href}" class="hover:text-taupe">${esc(T(n.i))}</a></li>`).join('');
        return `
        <footer id="contato" class="scope-night bg-sand text-ink border-t border-ink/10 mt-20 pt-14 pb-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-8">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12 text-xs text-mute">
                    <div class="space-y-3">
                        <span class="font-serif text-xl font-bold tracking-widest text-ink">AETHER</span>
                        <p class="leading-relaxed max-w-xs">${esc(T('foot.about'))}</p>
                        <p>${esc(CONTACT.address)}</p>
                        <p><a href="tel:${CONTACT.tel}" class="hover:text-taupe">${CONTACT.phoneDisplay}</a><br><a href="mailto:${CONTACT.email}" class="hover:text-taupe">${CONTACT.email}</a></p>
                        <div class="flex flex-wrap gap-2 pt-1">
                            <a href="${waLink('Olá! Gostaria de uma cotação.')}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp</a>
                            <button type="button" data-open-modal="contact" class="btn btn-ghost btn-sm"><i data-lucide="mail" class="w-3.5 h-3.5"></i> ${esc(T('nav.contact'))}</button>
                        </div>
                    </div>
                    <div><h4 class="text-ink uppercase tracking-wider font-semibold mb-3">${esc(T('foot.nav'))}</h4><ul class="space-y-2">${nav}</ul></div>
                    <div><h4 class="text-ink uppercase tracking-wider font-semibold mb-3">Legal</h4>
                        <ul class="space-y-2">
                            <li><a href="legal.html#privacidade" class="hover:text-taupe">${esc(T('foot.privacy'))}</a></li>
                            <li><a href="legal.html#termos" class="hover:text-taupe">${esc(T('foot.terms'))}</a></li>
                            <li><a href="legal.html#cookies" class="hover:text-taupe">${esc(T('foot.cookies'))}</a></li>
                            <li><a href="admin-login.html" class="hover:text-taupe">Administração</a></li>
                            <li><a href="legal.html#certificacoes" class="hover:text-taupe">${esc(T('foot.cert'))}</a></li>
                        </ul></div>
                    <div><h4 class="text-ink uppercase tracking-wider font-semibold mb-3">${esc(T('foot.news'))}</h4>
                        <p class="mb-3">${esc(T('foot.newsP'))}</p>
                        <form id="newsletter-form" novalidate class="space-y-2">
                            <label for="news-email" class="sr-only">${esc(T('foot.email'))}</label>
                            <input id="news-email" type="email" autocomplete="email" class="field" placeholder="${esc(T('foot.email'))}">
                            <p class="field-error" data-error-for="news-email" role="alert"></p>
                            <button type="submit" class="btn btn-wine btn-sm w-full">${esc(T('foot.subscribe'))}</button>
                            <p id="news-status" role="status" class="text-ok min-h-[1em]"></p>
                        </form></div>
                </div>
                <p class="text-[11px] text-mute border-t border-ink/10 pt-5 mb-3">${esc(T('foot.demo'))} ${esc(window.AetherI18n.note())}</p>
                <p class="text-[11px] text-mute">&copy; 2026 Aether Jets Aviation Ltda. ${esc(T('foot.rights'))}</p>
            </div>
        </footer>`;
    }

    const STEPS = [['Viagem', 'criar-passagem.html'], ['Cardápio', 'cardapio.html'], ['Pagamento', 'pagamento.html'], ['Passagem', 'passagens.html']];
    function stepperHTML(current) {
        return `<ol class="flex items-center justify-center gap-2 sm:gap-4 mb-10" aria-label="Etapas da reserva">${STEPS.map((s, i) => {
            const n = i + 1, state = n < current ? 'done' : n === current ? 'current' : '';
            const dot = `<span class="stepper-dot ${state}">${n < current ? '&#10003;' : n}</span><span class="hidden sm:inline text-xs ${n === current ? 'text-wineInk font-semibold' : 'text-mute'}">${s[0]}</span>`;
            const inner = n < current ? `<a href="${s[1]}" class="flex items-center gap-2">${dot}</a>` : `<div class="flex items-center gap-2" ${n === current ? 'aria-current="step"' : ''}>${dot}</div>`;
            return `<li class="flex items-center gap-2 sm:gap-4">${inner}${n < STEPS.length ? '<span class="w-6 sm:w-12 h-px bg-ink/20"></span>' : ''}</li>`;
        }).join('')}</ol>`;
    }

    // ---------- Modal genérico acessível: ESC, clique fora, foco preso e devolvido ao elemento de origem ----------
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let modalSeq = 0;
    function openModal(o) {
        const opener = document.activeElement;
        const id = 'modal-t-' + (++modalSeq);
        const wrap = document.createElement('div');
        wrap.className = 'modal-backdrop';
        wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', id);
        wrap.innerHTML = `<div class="card card-gold ${o.wide ? 'max-w-2xl' : 'max-w-md'} w-full p-7 shadow-2xl relative" tabindex="-1">
            <button type="button" data-modal-close aria-label="${esc(T('form.close'))}" class="absolute top-3 right-3 text-mute hover:text-ink p-1.5"><i data-lucide="x" class="w-5 h-5"></i></button>
            <h3 id="${id}" class="font-serif text-2xl font-bold text-ink mb-3 pr-8">${esc(o.title)}</h3>
            <div data-modal-body class="text-sm text-mute leading-relaxed">${o.html || ''}</div></div>`;
        const box = wrap.firstElementChild;
        let closed = false;
        const close = (v) => {
            if (closed) return; closed = true;
            document.removeEventListener('keydown', onKey, true); wrap.remove();
            if (!document.querySelector('.modal-backdrop')) document.body.style.overflow = '';
            if (opener && opener.focus && document.contains(opener)) opener.focus();
            if (o.onClose) o.onClose(v);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); close(false); return; }
            if (e.key !== 'Tab') return;
            const f = Array.from(box.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
            if (!f.length) { e.preventDefault(); return; }
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(false); });
        wrap.addEventListener('click', (e) => { if (e.target.closest('[data-modal-close]')) close(false); });
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(wrap); document.body.style.overflow = 'hidden';
        icons();
        const first = box.querySelector('[data-autofocus]') || box.querySelector(FOCUSABLE);
        (first || box).focus();
        if (o.onOpen) o.onOpen(box, close);
        return { el: box, close };
    }

    // ---------- Toast e confirmação ----------
    function toast(message, kind) {
        const box = document.getElementById('toast-container'); if (!box) return;
        const el = document.createElement('div');
        el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        el.className = 'bg-silver border text-ink text-xs px-4 py-3 rounded-xl shadow-2xl transition-opacity duration-500 max-w-xs ' + (kind === 'error' ? 'border-bad/60' : 'border-taupe/50');
        el.textContent = message; box.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 4200);
    }

    function confirmDialog(o) {
        return new Promise((resolve) => {
            let result = false;
            const m = openModal({
                title: o.title,
                html: `<div class="mb-6">${o.html || esc(o.message || '')}</div>
                    <div class="flex gap-3"><button data-r="0" class="btn btn-ghost flex-1">${esc(o.cancelText || 'Voltar')}</button><button data-r="1" class="btn btn-wine flex-1">${esc(o.confirmText || 'Confirmar')}</button></div>`,
                onClose: () => resolve(result),
                onOpen: (box, close) => box.addEventListener('click', (e) => { const b = e.target.closest('button[data-r]'); if (b) { result = b.dataset.r === '1'; close(result); } })
            });
            const cancel = m.el.querySelector('button[data-r="0"]'); if (cancel) cancel.focus();
        });
    }

    // ---------- Validação e gravação local de formulários (SEM backend) ----------
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const validPhone = (v) => { const d = String(v).replace(/\D/g, ''); return d.length >= 10 && d.length <= 13; };
    // Em produção troque por um POST ao seu backend (ver comentário em cada chamada). Aqui: localStorage.
    function saveLocal(key, record) {
        const list = A.store.get(key, []);
        list.push(Object.assign({ id: 'L' + Date.now().toString(36), criadoEm: new Date().toISOString() }, record));
        A.store.set(key, list.slice(-100));
        return list.length;
    }
    function setErr(input, msg) { setError(input, msg); return !msg; }

    function formModal(kind, ctx) {
        const isQuote = kind === 'quote';
        const fields = `
            <div><label class="field-label" for="fm-name">${esc(T('form.name'))}</label><input id="fm-name" data-autofocus class="field" autocomplete="name"><p class="field-error" data-error-for="fm-name" role="alert"></p></div>
            <div><label class="field-label" for="fm-email">${esc(T('form.email'))}</label><input id="fm-email" type="email" class="field" autocomplete="email"><p class="field-error" data-error-for="fm-email" role="alert"></p></div>
            <div><label class="field-label" for="fm-phone">${esc(T('form.phone'))}</label><input id="fm-phone" type="tel" class="field" autocomplete="tel" placeholder="(31) 97157-3764"><p class="field-error" data-error-for="fm-phone" role="alert"></p></div>
            ${isQuote ? '' : `<div><label class="field-label" for="fm-msg">${esc(T('form.msg'))}</label><textarea id="fm-msg" rows="4" class="field"></textarea><p class="field-error" data-error-for="fm-msg" role="alert"></p></div>`}`;
        const summary = isQuote && ctx ? `<p class="mb-4 text-ink font-medium">${esc(T('quote.route'))}: ${esc(ctx.resumo)}</p>` : '';
        return openModal({
            title: T(isQuote ? 'quote.title' : 'nav.contact'),
            html: `${summary}<form id="fm-form" novalidate class="space-y-3">${fields}
                <p class="text-[11px]">${esc(T('form.localNote'))}</p>
                <p id="fm-status" role="status" class="text-ok font-medium min-h-[1em]"></p>
                <div class="flex gap-3"><button type="button" data-modal-close class="btn btn-ghost flex-1">${esc(T('form.cancel'))}</button><button type="submit" class="btn btn-wine flex-1">${esc(T('form.send'))}</button></div></form>`,
            onOpen: (box, close) => {
                const $f = (id) => box.querySelector('#' + id);
                box.querySelector('#fm-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const name = $f('fm-name'), email = $f('fm-email'), phone = $f('fm-phone'), msg = $f('fm-msg');
                    let ok = true;
                    ok = setErr(name, name.value.trim().length < 2 ? T('form.invalidName') : '') && ok;
                    ok = setErr(email, !EMAIL_RE.test(email.value.trim()) ? T('form.invalidEmail') : '') && ok;
                    ok = setErr(phone, phone.value.trim() && !validPhone(phone.value) ? T('form.invalidPhone') : (isQuote && !phone.value.trim() ? T('err.req') : '')) && ok;
                    if (msg) ok = setErr(msg, msg.value.trim().length < 10 ? T('form.invalidMsg') : '') && ok;
                    if (!ok) { const bad = box.querySelector('.invalid'); if (bad) bad.focus(); return; }
                    // BACKEND: aqui iria fetch('/api/' + kind, { method: 'POST', body: JSON.stringify(...) }). Sem servidor, gravamos no navegador.
                    saveLocal(isQuote ? 'aether.quotes.v1' : 'aether.contacts.v1', Object.assign({ nome: name.value.trim(), email: email.value.trim(), telefone: phone.value.trim() }, msg ? { mensagem: msg.value.trim() } : { rota: ctx && ctx.dados }));
                    $f('fm-status').textContent = T(isQuote ? 'form.quoteOk' : 'form.contactOk');
                    toast(T(isQuote ? 'form.quoteOk' : 'form.contactOk'));
                    box.querySelector('button[type="submit"]').disabled = true;
                    setTimeout(() => close(true), 1800);
                });
            }
        });
    }

    function bindNewsletter() {
        const f = document.getElementById('newsletter-form'); if (!f) return;
        f.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('news-email'), st = document.getElementById('news-status');
            const v = input.value.trim();
            if (!setErr(input, !EMAIL_RE.test(v) ? T('form.invalidEmail') : '')) { st.textContent = ''; input.focus(); return; }
            saveLocal('aether.newsletter.v1', { email: v });   // BACKEND: POST /api/newsletter
            st.textContent = T('form.newsOk'); input.value = '';
        });
    }

    // ---------- Overlays globais: toast, WhatsApp, voltar ao topo, cookies, saída ----------
    function mountOverlays(opts) {
        if (document.getElementById('shell-overlays')) return;
        const root = document.createElement('div'); root.id = 'shell-overlays';
        root.innerHTML = `
            <div id="toast-container" class="fixed bottom-6 left-6 z-[90] space-y-3 pointer-events-none" aria-live="polite"></div>
            <a href="${waLink('Olá! Gostaria de falar com um broker.')}" target="_blank" rel="noopener" aria-label="WhatsApp" class="fixed bottom-6 right-6 z-50 bg-emerald-700 hover:bg-emerald-800 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110"><i data-lucide="message-circle" class="w-6 h-6"></i></a>
            <button id="back-to-top" type="button" aria-label="Topo" class="fixed bottom-24 right-6 z-40 bg-silver hover:bg-fog text-ink border border-stone p-3 rounded-full shadow-xl opacity-0 invisible transition-all"><i data-lucide="arrow-up" class="w-5 h-5"></i></button>`;
        document.body.appendChild(root);
        const up = document.getElementById('back-to-top');
        up.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => { const on = window.scrollY > 400; up.classList.toggle('opacity-0', !on); up.classList.toggle('invisible', !on); }, { passive: true });
        // Cookies (LGPD)
        let accepted = false; try { accepted = localStorage.getItem('aether_cookies') === 'accepted'; } catch (e) { /* ignora */ }
        if (!accepted) {
            const c = document.createElement('div'); c.id = 'cookie-banner'; c.setAttribute('role', 'region'); c.setAttribute('aria-label', 'Cookies');
            c.className = 'fixed bottom-0 left-0 right-0 z-[70] bg-silver text-ink border-t border-taupe/40 p-4 shadow-2xl';
            c.innerHTML = `<div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:pr-24"><p class="text-xs text-mute text-center sm:text-left">${esc(T('cookie.text'))} <a href="legal.html#cookies" class="underline text-wineInk">${esc(T('cookie.more'))}</a></p><button type="button" class="btn btn-wine btn-sm shrink-0" data-accept-cookies>${esc(T('cookie.accept'))}</button></div>`;
            document.body.appendChild(c);
        }
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-accept-cookies]')) { try { localStorage.setItem('aether_cookies', 'accepted'); } catch (x) { /* ignora */ } const b = document.getElementById('cookie-banner'); if (b) b.remove(); }
        });
        // Intenção de saída (somente desktop, uma vez por sessão, depois de 10 s na página)
        if (opts.exitIntent) {
            const t0 = Date.now();
            document.addEventListener('mouseleave', (e) => {
                let seen = false; try { seen = sessionStorage.getItem('aether_exit') === '1'; } catch (x) { /* ignora */ }
                if (e.clientY > 10 || seen || Date.now() - t0 < 10000 || document.querySelector('.modal-backdrop')) return;
                try { sessionStorage.setItem('aether_exit', '1'); } catch (x) { /* ignora */ }
                openModal({ title: T('exit.title'), html: `<p class="mb-5">${esc(T('exit.text'))}</p><div class="flex flex-col sm:flex-row gap-3"><a href="${waLink('Olá! Quero uma simulação sob medida.')}" target="_blank" rel="noopener" class="btn btn-wine flex-1"><i data-lucide="message-circle" class="w-4 h-4"></i> ${esc(T('exit.wa'))}</a><button type="button" data-modal-close class="btn btn-ghost flex-1">${esc(T('exit.stay'))}</button></div>` });
            });
        }
    }

    // ---------- Ações delegadas (funcionam em elementos criados depois) ----------
    let delegated = false;
    function bindDelegates() {
        if (delegated) return; delegated = true;
        document.addEventListener('click', (e) => {
            const dd = e.target.closest('[data-dd]');
            document.querySelectorAll('[data-dd]').forEach((d) => { if (d !== dd) { d.querySelector('ul').classList.add('hidden'); d.querySelector('[data-dd-toggle]').setAttribute('aria-expanded', 'false'); } });
            const tog = e.target.closest('[data-dd-toggle]');
            if (tog) { const ul = tog.parentElement.querySelector('ul'); const open = ul.classList.toggle('hidden') === false; tog.setAttribute('aria-expanded', String(open)); return; }
            const lang = e.target.closest('[data-lang]'); if (lang) { window.AetherI18n.setLang(lang.dataset.lang); return; }
            const cur = e.target.closest('[data-cur]'); if (cur) { window.AetherI18n.setCurrency(cur.dataset.cur); return; }
            const mo = e.target.closest('[data-open-modal]');
            if (mo && mo.dataset.openModal === 'contact') { formModal('contact'); }
            const nt = e.target.closest('#nav-toggle');
            if (nt) { const menu = document.getElementById('nav-mobile'); const open = menu.classList.toggle('hidden') === false; nt.setAttribute('aria-expanded', String(open)); nt.setAttribute('aria-label', T(open ? 'nav.close' : 'nav.open')); }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            document.querySelectorAll('[data-dd] ul:not(.hidden)').forEach((ul) => { ul.classList.add('hidden'); const b = ul.parentElement.querySelector('[data-dd-toggle]'); b.setAttribute('aria-expanded', 'false'); b.focus(); });
        });
    }

    function renderChrome(opts) {
        const h = document.getElementById('layout-header'); if (h) h.innerHTML = headerHTML(opts.active);
        const f = document.getElementById('layout-footer'); if (f) f.innerHTML = footerHTML();
        const s = document.getElementById('stepper'); if (s && opts.step) s.innerHTML = stepperHTML(opts.step);
        bindNewsletter();
        if (window.AetherI18n) window.AetherI18n.apply();
        icons();
    }

    function mountLayout(opts) {
        opts = opts || {};
        document.body.classList.add('cinematic-body');
        if (!document.getElementById('global-bg-fixed')) { const bg = document.createElement('div'); bg.id = 'global-bg-fixed'; document.body.prepend(bg); }
        renderChrome(opts);
        mountOverlays(opts); bindDelegates(); icons();
        // Troca de idioma/moeda: páginas com atualização ao vivo (window.__aetherLive) se redesenham; as demais recarregam.
        window.AetherI18n.onChange(() => { if (window.__aetherLive) renderChrome(opts); else location.reload(); });
    }

    // ---------- Autocomplete de aeroportos ----------
    const airportLabel = (a) => `${a.cidade} (${a.icao})`;
    // Busca ranqueada (a base tem milhares de aeroportos): código exato > cidade que começa > nome que começa > contém.
    const POPULAR = ['SBSP', 'SBGR', 'SBRJ', 'SBBH', 'SBFL', 'SBBR', 'SBKP', 'KOPF', 'KMIA', 'LFPB'];
    let _idx = null, _idxFor = null;
    function airportIndex() {
        const list = window.AIRPORTS || [];
        if (_idx && _idxFor === list) return _idx;
        _idxFor = list;
        _idx = list.map((a) => ({ a, icao: norm(a.icao), iata: norm(a.iata), cidade: norm(a.cidade), nome: norm(a.nome), pais: norm(a.pais) }));
        return _idx;
    }
    // Similaridade por trigramas (coeficiente de Dice) para "Você quis dizer...?" quando a busca exata não acha nada.
    function trigrams(str) { const s = '  ' + str + ' ', set = new Set(); for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3)); return set; }
    function dice(a, b) { let inter = 0; a.forEach((x) => { if (b.has(x)) inter++; }); return (2 * inter) / (a.size + b.size || 1); }
    function fuzzyAirports(n, idx, limit) {
        const q = trigrams(n), out = [];
        for (const e of idx) {
            if (!e.cidade && !e.nome) continue;
            // compara com a cidade, o nome completo e cada palavra do nome (ex.: "Guarulhos" dentro de "Guarulhos - Governador ...")
            let sc = Math.max(dice(q, trigrams(e.cidade)), dice(q, trigrams(e.nome)) * 0.9);
            String(e.nome).split(/[\s\-\/,]+/).forEach((w) => { if (w.length >= 4) sc = Math.max(sc, dice(q, trigrams(w)) * 0.95); });
            if (sc >= 0.3) out.push([sc + (e.a.iata ? 0.05 : 0) + (e.a.pais === 'Brasil' ? 0.02 : 0), e.a]);
        }
        out.sort((x, y) => y[0] - x[0]);
        return out.slice(0, limit).map((x) => x[1]);
    }
    function rankAirports(q, limit) {
        limit = limit || 8;
        const n = norm(q).trim();
        const idx = airportIndex();
        if (!n) {
            const byIcao = new Map(idx.map((e) => [e.a.icao, e.a]));
            return POPULAR.map((c) => byIcao.get(c)).filter(Boolean).slice(0, limit);
        }
        const scored = [];
        for (const e of idx) {
            let s;
            if (e.icao === n || e.iata === n) s = 0;
            else if (e.cidade === n) s = 1;
            else if (e.cidade.startsWith(n)) s = 2;
            else if (e.nome.startsWith(n)) s = 3;
            else if (e.cidade.includes(n)) s = 4;
            else if (e.icao.startsWith(n) || (e.iata && e.iata.startsWith(n))) s = 5;   // prefixo de código vem depois do nome
            else if (e.nome.includes(n)) s = 6;
            else if (e.pais.includes(n)) s = 8;
            else continue;
            if (e.a.pais === 'Brasil') s -= 0.5;        // desempate: prioriza o Brasil
            if (e.a.iata) s -= 0.2;                      // aeroportos com IATA são mais relevantes
            scored.push([s, -(e.a.pista_ft || 0), e.a]);
        }
        scored.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
        if (!scored.length && n.length >= 3) return fuzzyAirports(n, idx, limit);   // erro de digitação: sugere os mais parecidos
        return scored.slice(0, limit).map((x) => x[2]);
    }
    function attachAirportAutocomplete(input, onSelect) {
        const wrap = input.parentElement; wrap.classList.add('relative');
        const list = document.createElement('ul');
        list.className = 'absolute left-0 right-0 top-full mt-1 bg-silver border border-taupe/30 rounded-lg shadow-2xl z-30 max-h-64 overflow-y-auto hidden';
        list.setAttribute('role', 'listbox'); wrap.appendChild(list);
        input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('autocomplete', 'off');
        let items = [], idx = -1;
        const search = (q) => rankAirports(q);
        const render = () => {
            list.innerHTML = items.length ? items.map((a, i) => `<li role="option" data-i="${i}" class="px-3 py-2 text-xs cursor-pointer ${i === idx ? 'bg-sandDeep ring-1 ring-inset ring-wine/50' : 'hover:bg-fog'}"><span class="text-taupe font-mono">${esc(a.icao)}</span> <span class="text-ink font-medium">${esc(a.cidade)}</span><span class="block text-mute">${esc(a.nome)} &bull; ${esc(a.pais)}</span></li>`).join('') : '<li class="px-3 py-2 text-xs text-mute">Nenhum aeroporto encontrado</li>';
            list.classList.toggle('hidden', false);
        };
        const hide = () => list.classList.add('hidden');
        const choose = (a) => { input.value = airportLabel(a); input.dataset.icao = a.icao; hide(); input.dispatchEvent(new Event('change', { bubbles: true })); if (onSelect) onSelect(a); };
        input.addEventListener('input', () => { input.dataset.icao = ''; items = search(input.value); idx = -1; render(); });
        input.addEventListener('focus', () => { items = search(input.value); idx = -1; render(); });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(items.length - 1, idx + 1); render(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); render(); }
            else if (e.key === 'Enter' && idx >= 0 && items[idx] && !list.classList.contains('hidden')) { e.preventDefault(); choose(items[idx]); }
            else if (e.key === 'Escape') hide();
        });
        list.addEventListener('mousedown', (e) => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); choose(items[Number(li.dataset.i)]); } });
        input.addEventListener('blur', () => {
            setTimeout(hide, 120);
            if (!input.dataset.icao && input.value.trim()) { // aceita texto digitado, se reconhecível
                const a = window.RouteService.findAirport(input.value);
                if (a) { input.value = airportLabel(a); input.dataset.icao = a.icao; input.dispatchEvent(new Event('change', { bubbles: true })); }
            }
        });
    }
    // Preenche o campo a partir de código/texto; retorna o aeroporto ou null
    function setAirport(input, text) {
        const a = window.RouteService.findAirport(text);
        if (a) { input.value = airportLabel(a); input.dataset.icao = a.icao; }
        return a;
    }
    const airportOf = (input) => input.dataset.icao || (window.RouteService.findAirport(input.value) || {}).icao || '';

    // ---------- Previsão do tempo (Open-Meteo, sem chave). Fora da janela de 16 dias, não inventamos números. ----------
    function wmo(code) {
        if (code === 0) return ['Céu limpo', 'sun'];
        if (code <= 2) return ['Poucas nuvens', 'cloud-sun'];
        if (code === 3) return ['Nublado', 'cloud'];
        if (code === 45 || code === 48) return ['Neblina', 'cloud-fog'];
        if (code >= 51 && code <= 57) return ['Garoa', 'cloud-drizzle'];
        if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ['Chuva', 'cloud-rain'];
        if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['Neve', 'snowflake'];
        if (code >= 95) return ['Tempestade', 'cloud-lightning'];
        return ['Tempo variável', 'cloud'];
    }
    async function getWeather(airport, iso) {
        const d = new Date(iso);
        if (!airport || isNaN(d)) return { status: 'indisponivel', msg: 'Informe destino e data para ver a previsão.' };
        const days = (d.getTime() - Date.now()) / 86400000;
        if (days > 15) return { status: 'distante', msg: 'A previsão do tempo fica disponível a partir de 16 dias antes do voo.' };
        const day = `${d.getFullYear()}-${A.pad(d.getMonth() + 1)}-${A.pad(d.getDate())}`;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${airport.lat}&longitude=${airport.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${day}&end_date=${day}`;
        const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 4500);
        try {
            const res = await fetch(url, { signal: ctl.signal });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const j = await res.json();
            const dd = j.daily; if (!dd || !dd.time || !dd.time.length) throw new Error('sem dados');
            const [desc, icon] = wmo(dd.weathercode[0]);
            return { status: 'ok', fonte: 'Open-Meteo', dia: dd.time[0], desc, icon, tmax: Math.round(dd.temperature_2m_max[0]), tmin: Math.round(dd.temperature_2m_min[0]), chuva: dd.precipitation_probability_max ? dd.precipitation_probability_max[0] : null };
        } catch (e) {
            return { status: 'indisponivel', msg: 'Previsão indisponível no momento. Tente novamente mais tarde.' };
        } finally { clearTimeout(timer); }
    }
    function weatherHTML(w, cidade) {
        if (!w) return '';
        if (w.status !== 'ok') return `<p class="text-xs text-mute flex items-start gap-2"><i data-lucide="cloud" class="w-4 h-4 text-taupe shrink-0 mt-0.5"></i><span>${esc(w.msg)}</span></p>`;
        return `<div class="flex items-center gap-3"><i data-lucide="${w.icon}" class="w-8 h-8 text-taupe"></i><div><span class="text-ink font-semibold text-sm">${esc(w.desc)}</span><span class="block text-xs text-mute">${esc(cidade || 'Destino')}: mín. ${w.tmin}°C, máx. ${w.tmax}°C${w.chuva != null ? ', chuva ' + w.chuva + '%' : ''}</span><span class="block text-[10px] text-mute">Fonte: ${esc(w.fonte)}</span></div></div>`;
    }

    // ---------- Gráficos decorativos (NÃO são códigos reais) ----------
    function hashSeed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function rng(seed) { let s = seed || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
    function barcodeSVG(code, w, h) {
        const r = rng(hashSeed(code)); let x = 0, bars = '';
        while (x < w - 4) { const bw = 1 + Math.floor(r() * 3); if (r() > 0.4) bars += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="#23262B"/>`; x += bw + 1; }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Código de barras ilustrativo">${bars}</svg>`;
    }
    function fakeQR(seed, size) {
        const N = 25, r = rng(hashSeed(seed)), c = size / N; let cells = '';
        const finder = (ox, oy) => `<rect x="${ox * c}" y="${oy * c}" width="${7 * c}" height="${7 * c}" fill="#23262B"/><rect x="${(ox + 1) * c}" y="${(oy + 1) * c}" width="${5 * c}" height="${5 * c}" fill="#fff"/><rect x="${(ox + 2) * c}" y="${(oy + 2) * c}" width="${3 * c}" height="${3 * c}" fill="#23262B"/>`;
        const inFinder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && r() > 0.52) cells += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="#23262B"/>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR Code de demonstração"><rect width="${size}" height="${size}" fill="#fff"/>${cells}${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}</svg>`;
    }

    // Copia texto (com fallback) e avisa
    async function copyText(text) {
        try { await navigator.clipboard.writeText(text); toast('Copiado para a área de transferência.'); return true; }
        catch (e) {
            try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); toast(ok ? 'Copiado para a área de transferência.' : 'Não foi possível copiar. Selecione e copie manualmente.', ok ? undefined : 'error'); return ok; }
            catch (e2) { toast('Não foi possível copiar. Selecione e copie manualmente.', 'error'); return false; }
        }
    }

    // Só troca o DOM se o HTML mudou. Evita recriar elementos entre o mousedown e o mouseup
    // (um "change" disparado pelo blur re-renderizava a grade e o clique do usuário era perdido).
    function setHTML(el, html) {
        if (el.__html === html) return false;
        el.__html = html; el.innerHTML = html; return true;
    }

    // Campo com erro
    function setError(input, msg) {
        if (!input) return;
        input.classList.toggle('invalid', !!msg);
        const err = document.querySelector(`[data-error-for="${input.id}"]`);
        if (err) err.textContent = msg || '';
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    // Exibe o itinerário estimado; o retorno usa os mesmos aeroportos em ordem inversa.
    function itineraryHTML(estimate, roundTrip = false) {
        if (!estimate?.rotaViavel) return '';
        const duration = window.RouteService.formatDuration;
        const km = value => Math.round(value).toLocaleString(window.AetherI18n.locale);
        const label = estimate.escalas ? T('route.stops', { n: estimate.escalas }) : T('route.nonstop');
        const legs = estimate.trechos.map(leg => `<li>
            <strong title="${esc(leg.origem.nome)}">${esc(leg.origem.icao)}</strong> →
            <strong title="${esc(leg.destino.nome)}">${esc(leg.destino.icao)}</strong>
            · ${km(leg.km)} km · ${duration(leg.horas)}
            ${leg.paradaMin ? `<br>${esc(leg.destino.nome)} · ${esc(T('route.stopTime', { n: leg.paradaMin }))}` : ''}
        </li>`).join('');
        return `<div class="text-xs text-mute mt-2">
            <p class="font-semibold text-ink">${esc(label)}</p>
            <ol class="space-y-1 my-1">${legs}</ol>
            <p>${esc(T('route.total'))} · ${km(estimate.kmTotal)} km · ${duration(estimate.horas)}</p>
            ${estimate.taxaEscalas ? `<p>${esc(T('route.fees'))} · ${A.fmtBRL(estimate.taxaEscalas)}</p>` : ''}
            ${roundTrip ? `<p>${esc(T('route.returnTotal'))} · ${km(2 * estimate.kmTotal)} km · ${duration(2 * estimate.horas)}</p>` : ''}
        </div>`;
    }

    Object.assign(window.Aether, { itineraryHTML, CONTACT, waLink, openModal, formModal, saveLocal, EMAIL_RE, validPhone, rankAirports, setHTML, mountLayout, toast, confirmDialog, attachAirportAutocomplete, setAirport, airportOf, airportLabel, getWeather, weatherHTML, barcodeSVG, fakeQR, copyText, setError, icons, stepperHTML });
})();
