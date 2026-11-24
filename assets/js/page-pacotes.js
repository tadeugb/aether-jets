// Catálogo de viagens completas. O pedido é encaminhado ao concierge via WhatsApp.
(function () {
    'use strict';
    const A = window.Aether;
    const esc = A.esc;
    const form = document.getElementById('package-filters');
    const results = document.getElementById('package-results');
    const count = document.getElementById('package-count');
    const packages = AetherCatalog.load().pacotes;

    function inclusions(items, icon) {
        return `<ul class="package-list text-sm text-mute">${items.map(item => `<li><span aria-hidden="true">${icon}</span>${esc(item)}</li>`).join('')}</ul>`;
    }

    function details(p) {
        const aircraft = A.getAircraft(p.aeronaveId);
        return `<p class="font-medium text-wineInk">${esc(p.destino)}</p>
            <dl class="grid sm:grid-cols-2 gap-2 text-sm">
                <div><dt class="font-semibold text-ink">Duração</dt><dd>${p.dias} dias · ${p.noites} noites</dd></div>
                <div><dt class="font-semibold text-ink">Capacidade</dt><dd>Até ${p.pax} passageiros</dd></div>
                <div><dt class="font-semibold text-ink">Aeronave</dt><dd>${esc(aircraft?.nome || 'Sob consulta')}</dd></div>
                <div><dt class="font-semibold text-ink">Hotel</dt><dd>${esc(p.hotel)} · ${esc(p.categoriaHotel)}</dd></div>
                <div><dt class="font-semibold text-ink">Transporte privativo</dt><dd>${esc(p.carro)} · ${esc(p.motorista)}</dd></div>
                <div><dt class="font-semibold text-ink">Disponibilidade</dt><dd>${esc(p.disponibilidade)}</dd></div>
            </dl>
            <div><p class="font-semibold text-ink text-sm">Inclusos</p>${inclusions(p.incluidos, '✓')}</div>
            <div><p class="font-semibold text-ink text-sm">Opcionais</p>${p.opcionais.length ? inclusions(p.opcionais, '+') : '<p>Consulte o concierge.</p>'}</div>
            <p class="font-serif text-xl font-bold text-wineInk">A partir de ${A.fmtBRL(p.preco)}</p>`;
    }

    function requestLink(p) {
        const message = `Olá! Gostaria de consultar disponibilidade e solicitar o pacote ${p.nome} (${p.destino}, ${p.dias} dias/ ${p.noites} noites, até ${p.pax} passageiros).`;
        return `<a class="btn btn-wine" href="${esc(A.waLink(message))}" target="_blank" rel="noopener">Solicitar pacote</a>`;
    }

    function render() {
        const filters = new FormData(form);
        const matches = packages.filter(p =>
            (!filters.get('destino') || p.destino === filters.get('destino')) &&
            (filters.get('preco') === '' || p.preco <= Number(filters.get('preco'))) &&
            (!filters.get('dias') || p.dias <= Number(filters.get('dias'))) &&
            (!filters.get('pax') || p.pax >= Number(filters.get('pax')))
        );
        count.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'pacote encontrado' : 'pacotes encontrados'}` : 'Nenhum pacote corresponde aos filtros.';
        results.innerHTML = matches.map(p => `<article class="card overflow-hidden flex flex-col">
            <div class="package-image">${AetherImages.markup(p.imagem, p.nome, 'destino')}</div>
            <div class="p-5 flex flex-col gap-3 flex-1 text-mute">
                <h2 class="font-serif text-2xl font-bold text-ink">${esc(p.nome)}</h2>
                ${details(p)}
                <div class="flex flex-wrap gap-2 mt-auto pt-2">
                    <button type="button" class="btn btn-ghost" data-package="${esc(p.id)}">Ver detalhes</button>
                    ${requestLink(p)}
                </div>
            </div>
        </article>`).join('');
    }

    for (const destination of [...new Set(packages.map(p => p.destino))].sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
        form.elements.destino.add(new Option(destination, destination));
    }
    form.addEventListener('submit', event => { event.preventDefault(); render(); });
    form.addEventListener('reset', () => setTimeout(render, 0));
    results.addEventListener('click', event => {
        const button = event.target.closest('[data-package]');
        if (!button) return;
        const p = packages.find(item => item.id === button.dataset.package);
        if (!p) return;
        A.openModal({ title: p.nome, wide: true, html: `<div class="space-y-4">
            <div class="package-image rounded-lg">${AetherImages.markup(p.imagem, p.nome, 'destino')}</div>
            <p>${esc(p.descricao)}</p>${details(p)}${requestLink(p)}
        </div>` });
    });

    A.mountLayout({ active: 'pacotes' });
    render();
})();
