// Fonte compartilhada entre as páginas públicas e o painel administrativo.
(function () {
    'use strict';

    const key = 'aether.catalog.v1';
    const seed = window.AETHER_CATALOG_SEED;
    const categoriasFrota = {
        leves: 'Jatos Leves', medios: 'Jatos Médios', pesados: 'Jatos Pesados', turboelices: 'Turboélices'
    };
    const categoriasCatering = {
        bebidas: { nome: 'Bebidas', icone: 'wine' },
        refeicoes: { nome: 'Refeições', icone: 'utensils' },
        snacks: { nome: 'Snacks e doces', icone: 'cookie' }
    };

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(key));
            if (saved && Object.keys(seed).every(name => Array.isArray(saved[name]))) return saved;
        } catch {
            // Catálogo inicial cobre armazenamento bloqueado ou conteúdo inconsistente.
        }
        return JSON.parse(JSON.stringify(seed));
    }

    function publish(data) {
        window.FLEET = data.frota.map(a => ({
            ...a, categoriaNome: categoriasFrota[a.categoria],
            tarifa_km: Number((a.valor_hora / a.velocidade_kmh).toFixed(2))
        }));
        window.AETHER_MENU = Object.fromEntries(Object.entries(categoriasCatering).map(([id, group]) => [
            id, { ...group, itens: data.catering.filter(item => item.categoria === id) }
        ]));
    }

    // Grava local (resposta imediata no painel) e envia ao banco. Retorna a promessa da API para quem quiser tratar o erro.
    function save(data) {
        localStorage.setItem(key, JSON.stringify(data));
        publish(data);
        const token = window.AetherAdminAuth && window.AetherAdminAuth.token();
        if (!token) return Promise.resolve(null);
        return fetch('/api/catalogo', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(data) })
            .then(r => r.ok ? null : r.json().then(e => e.erro || 'Falha ao gravar no banco.'))
            .catch(() => null);   // sem servidor: fica só no navegador, como antes
    }

    publish(load());
    window.AetherCatalog = { load, save, categoriasFrota, categoriasCatering };
})();
