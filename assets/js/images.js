// Aceita fotos locais e URLs HTTP(S) cadastradas. Cada imagem tem fallback local.
(function () {
    'use strict';
    const fallbacks = {
        jato: 'assets/img/jato-fallback.webp',
        destino: 'assets/img/destino-fallback.webp',
        catering: 'assets/img/catering-fallback.webp',
        avatar: 'assets/img/avatar-fallback.webp'
    };

    function safeImage(value) {
        const src = String(value || '').trim();
        if (!src) return '';
        try {
            const url = new URL(src, document.baseURI);
            return ['https:', 'http:', 'file:'].includes(url.protocol) ? src : '';
        } catch {
            return '';
        }
    }

    function applyFallback(image, kind) {
        image.onerror = null;
        image.src = fallbacks[kind] || fallbacks.jato;
    }

    function markup(src, alt, kind, css = '') {
        const esc = window.Aether.esc;
        const fallback = fallbacks[kind] || fallbacks.jato;
        return `<img loading="lazy" class="media-fill ${esc(css)}" src="${esc(safeImage(src) || fallback)}"
            alt="${esc(alt)}" onerror="AetherImages.fallback(this, '${esc(kind)}')">`;
    }

    window.AetherImages = { safeImage, fallback: applyFallback, markup };
})();
