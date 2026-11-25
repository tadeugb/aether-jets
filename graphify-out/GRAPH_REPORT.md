# Graph Report - aether-jets  (2026-11-25)

## Corpus Check
- 49 files · ~127,298 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 5, (none) 1)

## Summary
- 573 nodes · 925 edges · 50 communities (31 shown, 19 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 92 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `362f0431`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lenis.js
- gsap.js
- aether-ui.js
- scroll-trigger.js
- r
- aether-core.js
- EmptyLegBoard
- client-portal.js
- MockEmptyLegFeed
- _d
- Tween
- K
- page-passagens.js
- yc
- gerar_relatorio.py
- i18n.js
- page-admin.js
- route-service.js
- bf
- jc
- page-criar.js
- Aether Jets — histórico da entrega anterior
- Aether Jets
- page-cardapio.js
- cb
- Oa
- home.js
- page-pacotes.js
- Arquivos novos e alterados
- admin-auth.js
- images.js
- server.js
- ja
- page-admin-relatorios.js
- setup.js
- Ub
- Vb
- L
- r
- Q

## God Nodes (most connected - your core abstractions)
1. `yc()` - 19 edges
2. `EmptyLegBoard` - 16 edges
3. `r()` - 13 edges
4. `s()` - 13 edges
5. `Tween()` - 13 edges
6. `route()` - 13 edges
7. `t()` - 10 edges
8. `Como rodar o sistema` - 10 edges
9. `ja()` - 9 edges
10. `_d()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `render()` --indirect_call--> `route()`  [INFERRED]
  assets/js/page-frota.js → server.js
- `wb()` --indirect_call--> `t()`  [INFERRED]
  assets/vendor/scroll-trigger.js → assets/vendor/gsap.js
- `wb()` --indirect_call--> `w()`  [INFERRED]
  assets/vendor/scroll-trigger.js → assets/vendor/gsap.js
- `Gb()` --indirect_call--> `Q()`  [INFERRED]
  assets/vendor/scroll-trigger.js → assets/vendor/gsap.js
- `Hb()` --indirect_call--> `Q()`  [INFERRED]
  assets/vendor/scroll-trigger.js → assets/vendor/gsap.js

## Import Cycles
- None detected.

## Communities (50 total, 19 thin omitted)

### Community 0 - "lenis.js"
Cohesion: 0.07
Nodes (20): Animate, clamp(), cleanUpClassName(), constructor(), destroy(), Dimensions, emit(), Emitter (+12 more)

### Community 1 - "gsap.js"
Cohesion: 0.06
Nodes (17): ee(), Jd(), Kd(), Ld(), ma(), Md(), na(), Od() (+9 more)

### Community 2 - "aether-ui.js"
Cohesion: 0.11
Nodes (29): airportIndex(), attachAirportAutocomplete(), barcodeSVG(), bindDelegates(), bindNewsletter(), confirmDialog(), copyText(), dice() (+21 more)

### Community 3 - "scroll-trigger.js"
Cohesion: 0.07
Nodes (4): dc(), Ha(), Ia(), ob()

### Community 4 - "r"
Cohesion: 0.12
Nodes (24): _a(), ac(), Bo(), db(), eb(), ga(), gb(), hb() (+16 more)

### Community 5 - "aether-core.js"
Cohesion: 0.14
Nodes (7): buildTicket(), genCode(), installmentOptions(), paymentTotals(), priceTrip(), tripRoute(), validateDraft()

### Community 7 - "client-portal.js"
Cohesion: 0.17
Nodes (8): handleRoute(), MockAuthService, renderClientPortal(), renderDashboard(), renderLoginScreen(), resetIdleTimers(), showIdleWarningModal(), triggerWineCurtain()

### Community 9 - "_d"
Cohesion: 0.25
Nodes (11): be(), _d(), ea(), fa(), ia(), ie(), je(), ke() (+3 more)

### Community 10 - "Tween"
Cohesion: 0.15
Nodes (17): _assertThisInitialized(), Ec(), Fc(), gc(), ka(), qa(), t(), tb() (+9 more)

### Community 11 - "K"
Cohesion: 0.33
Nodes (6): A(), B(), F(), G(), ad(), K()

### Community 12 - "page-passagens.js"
Cohesion: 0.23
Nodes (11): load(), publish(), save(), boardingPass(), card(), detailHTML(), matches(), openDetail() (+3 more)

### Community 13 - "yc"
Cohesion: 0.17
Nodes (14): Fa(), Ga(), mb(), oc(), qc(), rc(), Ta(), ub() (+6 more)

### Community 14 - "gerar_relatorio.py"
Cohesion: 0.09
Nodes (12): clean(), api_sql(), build(), chrome(), code(), der_svg(), img(), q() (+4 more)

### Community 15 - "i18n.js"
Cohesion: 0.27
Nodes (5): apply(), emit(), setCurrency(), setLang(), t()

### Community 16 - "page-admin.js"
Cohesion: 0.36
Nodes (7): control(), message(), openEditor(), options(), remove(), render(), requireSession()

### Community 17 - "route-service.js"
Cohesion: 0.42
Nodes (9): compareEstimates(), computeRoute(), distance(), estimateFor(), findAirport(), formatDuration(), haversineKm(), plan() (+1 more)

### Community 18 - "bf"
Cohesion: 0.33
Nodes (6): bf(), cf(), df(), kf(), mf(), N()

### Community 19 - "jc"
Cohesion: 0.22
Nodes (9): Ab(), J(), jc(), kb(), lc(), Ra(), rb(), Sa() (+1 more)

### Community 21 - "page-criar.js"
Cohesion: 0.43
Nodes (6): fieldErrors(), refreshWeather(), renderAircraft(), renderSummary(), setTrip(), update()

### Community 22 - "Aether Jets — histórico da entrega anterior"
Cohesion: 0.25
Nodes (7): 8 testes manuais, Aether Jets — histórico da entrega anterior, Arquivos, Auditoria: elemento -> antes -> depois, O que saiu da home, Paleta (tokens), Simulado (depende de backend)

### Community 23 - "Aether Jets"
Cohesion: 0.11
Nodes (18): Administração e migração para produção, Aether Jets, API, Como rodar o sistema, Como testar, Configuração (opcional), Cotação e escalas, Créditos de mídia (+10 more)

### Community 24 - "page-cardapio.js"
Cohesion: 0.52
Nodes (6): itemCard(), next(), renderBanner(), renderCart(), renderContent(), renderTabs()

### Community 25 - "cb"
Cohesion: 0.29
Nodes (7): Ab(), Bb(), cb(), Context(), Ew(), fb(), zb()

### Community 26 - "Oa"
Cohesion: 0.53
Nodes (6): Bb(), Ja(), Ka(), La(), Oa(), z()

### Community 28 - "page-pacotes.js"
Cohesion: 0.70
Nodes (4): details(), inclusions(), render(), requestLink()

### Community 30 - "Arquivos novos e alterados"
Cohesion: 0.50
Nodes (3): Alterados, Arquivos novos e alterados, Novos

### Community 33 - "server.js"
Cohesion: 0.08
Nodes (29): render(), ADMIN, airportJson(), bad(), crypto, fs, http, HttpError (+21 more)

### Community 34 - "ja"
Cohesion: 0.28
Nodes (9): Aa(), Animation(), ha(), ja(), Jc(), Lc(), Ra(), Sa() (+1 more)

### Community 36 - "setup.js"
Cohesion: 0.11
Nodes (16): { Client }, fs, path, read(), schema, seed, dependencies, pg@^8.13.1 (+8 more)

### Community 48 - "r"
Cohesion: 0.40
Nodes (5): mc(), O(), P(), r(), wb()

### Community 49 - "Q"
Cohesion: 0.50
Nodes (4): la(), Q(), Gb(), Hb()

## Knowledge Gaps
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Q()` connect `Q` to `gsap.js`, `yc`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `yc()` (e.g. with `Q()` and `Fa()`) actually correct?**
  _`yc()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `lenis.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06845513413506013 - nodes in this community are weakly interconnected._
- **Why does `s()` connect `r` to `gsap.js`, `Tween`, `_d`, `cb`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `r()` (e.g. with `Bo()` and `ea()`) actually correct?**
  _`r()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `gsap.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06219512195121951 - nodes in this community are weakly interconnected._
- **Why does `yc()` connect `yc` to `scroll-trigger.js`, `K`, `r`, `Q`, `jc`, `Oa`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._