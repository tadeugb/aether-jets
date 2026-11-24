/**
 * Configuração ÚNICA do Tailwind (todas as páginas, inclusive a home). Usada pela CLI para gerar assets/css/tailwind.css.
 *
 * Paleta "Prata, Cinza e Bege" com vinho como cor de destaque. Os tokens apontam para variáveis CSS
 * (definidas em assets/css/cinematic.css) para que um bloco com a classe `scope-night` (hero, rodapé, portal)
 * inverta a paleta para tons de cinza-chumbo SEM trocar nenhuma classe.
 *
 *   sand / sandDeep  fundos bege              silver  cartões prata           fog   campos e superfícies
 *   stone            bordas e cinza médio     slate   cinza de superfície     ink   texto principal (cinza-grafite)
 *   mute             texto secundário         taupe   bege escuro (destaque neutro, substitui o dourado)
 *   wine / wineHover / wineDark  vinho (botões e destaques)      wineInk  vinho legível como texto
 *   ok / warn / bad  estados (sucesso, atenção, erro) com contraste AA nos dois escopos
 * Não existe preto puro na paleta.
 */
(function () {
    const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
    module.exports = {
        content: ["./*.html", "./assets/js/*.js", "!./assets/js/airports.js", "!./assets/js/catalog-seed.js"],
        theme: {
            extend: {
                colors: {
                    sand: v('sand'), sandDeep: v('sand-deep'), silver: v('silver'), fog: v('fog'),
                    stone: v('stone'), slate: v('slate'), ink: v('ink'), mute: v('mute'), taupe: v('taupe'),
                    wine: '#6D0F23', wineHover: '#8B1A32', wineDark: '#4A0A17', wineInk: v('wine-ink'),
                    ok: v('ok'), warn: v('warn'), bad: v('bad')
                },
                fontFamily: { serif: ['"Playfair Display"', 'Georgia', 'serif'], sans: ['"Inter"', 'system-ui', 'sans-serif'] }
            }
        }
    };
})();
