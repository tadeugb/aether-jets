# Aether Jets — histórico da entrega anterior

Para esta versão, siga as instruções de `README.md`. A descrição abaixo registra o estado da entrega anterior.

## Arquivos
**Novos:** empty-legs.html, sobre.html, blog.html, legal.html, assets/js/i18n.js, assets/js/home.js
**Reescritos:** index.html (108 KB -> 20 KB), assets/js/empty-legs.js, assets/css/cinematic.css, assets/css/site.css, assets/js/tailwind-config.js (agora única para todas as páginas, inclusive a home)
**Alterados:** data.js (moedas fixas), aether-core.js (moeda/idioma), aether-ui.js (cabeçalho, rodapé, modais, formulários, sugestões fuzzy), empty-legs-feed.js (heartbeat + adaptador SSE), cinematic.js (reveal, poeira prateada), client-portal.js e page-*.js (tokens de cor), frota/criar-passagem/passagens/pagamento/cardapio.html (i18n.js, landmark main).

## Paleta (tokens)
sand/sandDeep (bege), silver (cartões), fog (campos), stone/slate (cinzas), ink (texto cinza-grafite #2B2E33), mute (texto secundário), taupe (bege escuro, substitui o dourado), wine/wineHover/wineDark/wineInk (vinho), ok/warn/bad (estados).
Os tokens são variáveis CSS; o escopo `.scope-night` (hero, empty legs da home, CTA, cabeçalho, rodapé, portal) inverte para cinza-chumbo #23262B com texto bege, sem preto puro. Contrastes calculados (WCAG): texto ink/mute/taupe >= 4,7:1 em todas as superfícies claras; escuro >= 5,3:1; branco sobre vinho 12:1.

## Auditoria: elemento -> antes -> depois
| Elemento | Antes | Agora |
|---|---|---|
| Seletor PT/EN/ES | href="#" | Menu acessível; troca textos via i18n.js e persiste (localStorage) |
| Seletor BRL/USD/EUR | href="#" | Converte todos os preços exibidos com taxas fixas (data.js) + aviso no rodapé/resultado |
| Ver todos os artigos / Ler artigo completo | href="#" | blog.html e blog.html#artigo |
| Política de Privacidade, Termos, Cookies, Certificações ANAC | href="#" | legal.html#privacidade / #termos / #cookies / #certificacoes |
| Logo | href="#" | index.html |
| #/area-cliente | só na home | Link em todas as páginas -> portal (login demo cliente@aetherjets.com / Demo@2026 / 2FA 123456) |
| Newsletter | sem validação | Valida e-mail, mensagem inline, grava em localStorage |
| Contato | não existia | Modal com validação; grava em localStorage |
| Cotação | só modal | Cartão na própria página + "Enviar ao concierge" (modal validado, localStorage) |
| Modais (contato, cotação, saída, confirmação, alerta) | parciais | ESC, clique fora, foco preso e devolvido |
| mailto / tel | joãogabriel@... e tel:+55(31) 97157-3764 | mailto:joaogabriel@aetherjets.com, tel:+5531971573764 |
| Cookies | banner simples | Banner com aceite persistente + link para legal.html |

## O que saiu da home
Blog/artigos -> blog.html. "Experiência", "Sobre" extenso, diferenciais e casos -> sobre.html. Barra de confiança, citações repetidas, mega-menu e 12 cards de destino -> removidos (destinos: 4). FAQ: 4 perguntas. Frota: 4 categorias com link para frota.html. Empty legs: prévia de 3 cards. Selos de certificação inventados foram removidos (legal.html explica que a empresa é fictícia).

## 8 testes manuais
1. GRU -> MIA (SBGR -> KMIA, resultado abaixo do formulário; Continuar abre criar-passagem com origem/destino/pax).
2. Belo Horizonte -> Florianópolis (SBBH -> SBFL).
3. Angra dos Reis como destino (SDAG).
4. Aeroporto inexistente ("Xyzzy": erro) e com erro de digitação ("Florianopli": mostra 3 sugestões clicáveis). Também: origem = destino, data passada, 30 passageiros.
5. empty-legs.html: chips de região, categoria, data, preço máximo, ordenação, limpar, contador, estado vazio, criar alerta.
6. Trocar idioma (PT/EN/ES) e recarregar: a escolha persiste.
7. Trocar moeda para USD/EUR: preços da home, simulador, frota e empty legs convertem.
8. Reservar um empty leg: abre criar-passagem.html?origem=...&destino=...&pax=...&data=... já preenchido.

## Simulado (depende de backend)
Feed de empty legs (empty-legs-feed.js; para real, defina window.AETHER_EMPTY_LEG_SSE_URL: classe RemoteEmptyLegFeed já existe com a mesma interface subscribe()), envio de newsletter/contato/cotação/alertas (hoje localStorage), câmbio real, pagamento, login do portal, e-mails/push de alerta, disponibilidade e certificações reais.
