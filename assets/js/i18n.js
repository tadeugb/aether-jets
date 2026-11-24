/**
 * @file i18n.js
 * @description Idioma (PT/EN/ES) e moeda (BRL/USD/EUR) do site. Dicionário simples para os textos principais.
 * - Marque elementos com data-i18n="chave" (texto), data-i18n-html="chave" (HTML confiável),
 *   data-i18n-ph="chave" (placeholder) ou data-i18n-label="chave" (aria-label).
 * - Em JavaScript use AetherI18n.t('chave') e AetherI18n.money(valorEmBRL).
 * - A escolha fica em localStorage (aether.prefs.v1). As taxas de moeda são FIXAS e vêm de data.js (CURRENCIES).
 * Textos que não estão no dicionário permanecem em português (o conteúdo longo das páginas internas não é traduzido).
 * Depende de data.js (CURRENCIES).
 */
(function () {
    'use strict';
    const KEY = 'aether.prefs.v1';
    const D = {
        pt: {
            'nav.home': 'Início', 'nav.fleet': 'Aeronaves', 'nav.empty': 'Empty Legs', 'nav.dest': 'Destinos', 'nav.create': 'Criar passagem',
            'nav.menu': 'Cardápio', 'nav.tickets': 'Minhas passagens', 'nav.about': 'Sobre', 'nav.blog': 'Blog', 'nav.client': 'Área do cliente',
            'nav.quote': 'Solicitar cotação', 'nav.contact': 'Fale conosco', 'nav.open': 'Abrir menu', 'nav.close': 'Fechar menu', 'nav.skip': 'Ir para o conteúdo',
            'top.support': 'Atendimento executivo 24/7', 'top.lang': 'Idioma', 'top.currency': 'Moeda',
            'cur.note': 'Valores em moedas estrangeiras usam taxas fixas de referência ({d}): 1 USD = R$ 5,40; 1 EUR = R$ 5,88. Não são cotações em tempo real; a cobrança é sempre em BRL.',
            'hero.badge': 'Avião particular • Fretamento sob medida', 'hero.t1': 'O céu inteiro à', 'hero.t2': 'sua disposição.',
            'hero.sub': 'Decole no seu horário, sem filas e com total privacidade. Cotação instantânea pela distância real da rota.',
            'hero.cta1': 'Simular viagem', 'hero.cta2': 'Conhecer a frota',
            'sim.title': 'Simulador rápido de cotação', 'sim.reply': 'Cálculo na hora, direto no navegador', 'sim.origin': 'Origem', 'sim.dest': 'Destino',
            'sim.date': 'Data e horário', 'sim.pax': 'Passageiros', 'sim.submit': 'Ver jatos', 'sim.phO': 'Ex.: GRU, Belo Horizonte, SBSP', 'sim.phD': 'Ex.: MIA, Florianópolis, SBFL',
            'sim.paxN': '{n} passageiro(s)', 'sim.paxUp': 'Até {n} passageiros', 'sim.pax12': '12 ou mais',
            'res.title': 'Resultado da cotação', 'res.distance': 'Distância', 'res.time': 'Tempo estimado', 'res.options': 'Aeronaves para esta rota (menor preço primeiro)',
            'res.continue': 'Continuar', 'res.request': 'Enviar ao concierge', 'res.stop': 'Parada técnica', 'res.over': 'Não comporta {n} passageiros', 'res.direct': 'Sem parada',
            'res.note': 'Estimativa: distância ortodrômica (Haversine) × fator de rota 1,05. Valores de referência; o concierge confirma a proposta final.',
            'res.best': 'Menor preço viável', 'nav.packages': 'Pacotes', 'res.none': 'Nenhuma aeronave disponível para esta rota e capacidade.', 'res.unreachable': 'Sem rota viável na rede de escalas', 'route.nonstop': 'Voo direto', 'route.stops': '{n} escala(s) técnica(s)', 'route.stopTime': 'parada de {n} min', 'route.total': 'Total por sentido', 'route.returnTotal': 'Total ida e volta', 'route.fees': 'Taxas de escala', 'route.reference': 'Distância de referência (rota direta)', 'res.nm': 'milhas náuticas',
            'err.same': 'Origem e destino não podem ser o mesmo aeroporto.', 'err.notfound': 'Aeroporto não encontrado.', 'err.dym': 'Você quis dizer…?',
            'err.past': 'A data e o horário já passaram. Escolha um horário futuro.', 'err.pax': 'Nenhuma aeronave comporta {n} passageiros (máximo: {m}).', 'err.req': 'Preencha este campo.',
            'how.eyebrow': 'Simples e eficiente', 'how.title': 'Como funciona', 'how.s1t': 'Escolha a rota', 'how.s1d': 'Informe origem, destino, data e passageiros.',
            'how.s2t': 'Compare jatos', 'how.s2d': 'Veja aeronaves viáveis e preços pela distância real.', 'how.s3t': 'Personalize', 'how.s3d': 'Cardápio, transfer e pedidos especiais.',
            'how.s4t': 'Pague e embarque', 'how.s4d': 'Confirme e embarque direto no terminal executivo.',
            'fleet.eyebrow': 'Frota', 'fleet.title': 'Aeronaves de elite', 'fleet.all': 'Ver todas as aeronaves', 'cat.leves': 'Jatos leves', 'cat.medios': 'Jatos médios', 'cat.pesados': 'Jatos pesados', 'cat.turboelices': 'Turboélices',
            'fleet.pax': 'Até {n} pax', 'fleet.range': 'Alcance', 'fleet.rate': 'Tarifa estimada', 'fleet.perkm': '/ km', 'fleet.ask': 'Solicitar', 'fleet.sub': '{n} modelos', 'fleet.fromTo': 'a partir de',
            'el.eyebrow': 'Oportunidades em tempo real', 'el.title': 'Empty Legs ao vivo', 'el.sub': 'Voos de retorno ou posicionamento sem passageiros, com até 75% de desconto.',
            'el.all': 'Ver todos os empty legs ao vivo', 'el.live': 'AO VIVO', 'el.updated': 'Atualizado às {t}', 'el.simulated': 'Feed simulado: atualiza a cada 8 a 15 s',
            'el.count1': '{n} oferta disponível', 'el.countN': '{n} ofertas disponíveis', 'el.empty': 'Nenhuma oferta com estes filtros', 'el.emptyD': 'Ajuste os filtros ou crie um alerta para ser avisado.',
            'el.reserve': 'Reservar', 'el.alert': 'Criar alerta', 'el.region': 'Região', 'el.all_r': 'Todas', 'el.date': 'Data', 'el.cat': 'Categoria', 'el.max': 'Preço máximo', 'el.sort': 'Ordenar por',
            'el.dAll': 'Todas as datas', 'el.d24': 'Próximas 24 h', 'el.d7': 'Próximos 7 dias', 'el.d30': 'Próximos 30 dias', 'el.cAll': 'Todas as categorias',
            'el.sNear': 'Mais próximos (data)', 'el.sDisc': 'Maior desconto', 'el.sPrice': 'Menor preço', 'el.clear': 'Limpar filtros', 'el.expires': 'Expira em', 'el.seats': '{n} assento(s) livre(s)',
            'el.aircraft': 'Aeronave', 'el.dep': 'Decolagem', 'el.new': 'Novo', 'el.reduced': 'Preço reduzido', 'el.expired': 'Expirada', 'el.paused': 'Atualizações pausadas (aba oculta)',
            'el.alertT': 'Criar alerta de empty leg', 'el.alertD': 'Avisamos neste navegador quando surgir uma oferta compatível. Sem backend, o alerta fica salvo só aqui.', 'el.alertSave': 'Salvar alerta',
            'el.alertOk': 'Alerta salvo: {r} até {p}.', 'el.alertHit': 'Alerta: nova oferta {o} → {d} por {p}.', 'el.alerts': 'Meus alertas', 'el.noAlerts': 'Você ainda não tem alertas.', 'el.remove': 'Remover',
            'dest.eyebrow': 'Rotas frequentes', 'dest.title': 'Destinos em destaque', 'dest.charter': 'Cotar esta rota',
            'faq.eyebrow': 'Esclarecimentos', 'faq.title': 'Perguntas frequentes',
            'faq.q1': 'Como é calculado o preço do fretamento?', 'faq.a1': 'Pela distância real da rota (cálculo em tempo real) multiplicada pela tarifa por km da aeronave, mais 8% de taxas de pouso, handling e combustível. Serviços opcionais entram à parte.',
            'faq.q2': 'Quais formas de pagamento são aceitas?', 'faq.a2': 'Pix (5% de desconto), cartão em até 12x e transferência. Neste projeto de demonstração nenhum pagamento é processado de verdade.',
            'faq.q3': 'Qual a antecedência mínima para voar?', 'faq.a3': 'A partir de 2 horas para empty legs e voos de prontidão. Para rotas internacionais, recomendamos de 24 a 48 horas.',
            'faq.q4': 'Qual é a política de cancelamento?', 'faq.a4': 'Cancelamentos com mais de 48 horas de antecedência têm reembolso integral ou crédito. Veja os detalhes em cada passagem.',
            'cta.eyebrow': 'Pronto para decolar?', 'cta.title': 'A verdadeira liberdade de voar', 'cta.sub': 'Solicite sua cotação em minutos e tenha uma aeronave preparada para o seu próximo destino.',
            'cta.btn': 'Solicitar cotação agora', 'cta.wa': 'Atendimento por WhatsApp',
            'foot.about': 'Fretamento de jatos particulares com preço calculado pela distância real da rota.', 'foot.nav': 'Navegação', 'foot.news': 'Newsletter executiva',
            'foot.newsP': 'Receba empty legs e novidades. Sem backend: a inscrição fica salva só neste navegador.', 'foot.email': 'Seu e-mail', 'foot.subscribe': 'Inscrever-se',
            'foot.privacy': 'Política de privacidade', 'foot.terms': 'Termos de uso', 'foot.cookies': 'Cookies (LGPD)', 'foot.cert': 'Certificações ANAC', 'foot.rights': 'Todos os direitos reservados.',
            'foot.demo': 'Projeto de demonstração: valores, pagamentos e disponibilidade são simulados. Nenhuma cobrança real é feita.', 'foot.contact': 'Contato',
            'form.name': 'Nome', 'form.email': 'E-mail', 'form.phone': 'Telefone', 'form.msg': 'Mensagem', 'form.send': 'Enviar', 'form.cancel': 'Cancelar', 'form.close': 'Fechar',
            'form.invalidEmail': 'Informe um e-mail válido.', 'form.invalidName': 'Informe seu nome (mín. 2 letras).', 'form.invalidMsg': 'Escreva uma mensagem (mín. 10 caracteres).', 'form.invalidPhone': 'Telefone inválido (use DDD + número).',
            'form.localNote': 'Sem backend: os dados ficam salvos apenas neste navegador (localStorage) e não são enviados a ninguém.',
            'form.newsOk': 'Inscrição registrada neste navegador. Obrigado!', 'form.contactOk': 'Mensagem registrada neste navegador. Em produção ela seria enviada ao concierge.', 'form.quoteOk': 'Solicitação de cotação registrada neste navegador.',
            'cookie.text': 'Usamos apenas cookies e armazenamento local essenciais (idioma, moeda, reservas simuladas), conforme a LGPD.', 'cookie.accept': 'Aceitar e continuar', 'cookie.more': 'Saiba mais',
            'exit.eyebrow': 'Consultoria especializada', 'exit.title': 'Quer uma simulação sob medida?', 'exit.text': 'Fale com um broker pelo WhatsApp e veja os empty legs da sua rota.', 'exit.wa': 'Falar com broker', 'exit.stay': 'Continuar navegando',
            'quote.title': 'Solicitar cotação ao concierge', 'quote.route': 'Rota'
        },
        en: {
            'nav.home': 'Home', 'nav.fleet': 'Aircraft', 'nav.empty': 'Empty Legs', 'nav.dest': 'Destinations', 'nav.create': 'Book a trip',
            'nav.menu': 'Menu', 'nav.tickets': 'My tickets', 'nav.about': 'About', 'nav.blog': 'Blog', 'nav.client': 'Client area',
            'nav.quote': 'Request a quote', 'nav.contact': 'Contact us', 'nav.open': 'Open menu', 'nav.close': 'Close menu', 'nav.skip': 'Skip to content',
            'top.support': 'Executive support 24/7', 'top.lang': 'Language', 'top.currency': 'Currency',
            'cur.note': 'Amounts in foreign currencies use fixed reference rates ({d}): 1 USD = R$ 5.40; 1 EUR = R$ 5.88. They are not live quotes; billing is always in BRL.',
            'hero.badge': 'Private aviation • Tailored charter', 'hero.t1': 'The whole sky', 'hero.t2': 'at your command.',
            'hero.sub': 'Depart on your schedule, skip the lines and keep full privacy. Instant quotes based on the real route distance.',
            'hero.cta1': 'Simulate a trip', 'hero.cta2': 'Explore the fleet',
            'sim.title': 'Quick quote simulator', 'sim.reply': 'Instant calculation, right in your browser', 'sim.origin': 'Origin', 'sim.dest': 'Destination',
            'sim.date': 'Date and time', 'sim.pax': 'Passengers', 'sim.submit': 'See jets', 'sim.phO': 'E.g. GRU, Belo Horizonte, SBSP', 'sim.phD': 'E.g. MIA, Florianópolis, SBFL',
            'sim.paxN': '{n} passenger(s)', 'sim.paxUp': 'Up to {n} passengers', 'sim.pax12': '12 or more',
            'res.title': 'Quote result', 'res.distance': 'Distance', 'res.time': 'Estimated time', 'res.options': 'Aircraft for this route (lowest price first)',
            'res.continue': 'Continue', 'res.request': 'Send to concierge', 'res.stop': 'Technical stop', 'res.over': 'Cannot seat {n} passengers', 'res.direct': 'Non-stop',
            'res.note': 'Estimate: great-circle distance (Haversine) × route factor 1.05. Reference values; the concierge confirms the final offer.',
            'res.best': 'Lowest viable price', 'nav.packages': 'Packages', 'res.none': 'No aircraft available for this route and passenger count.', 'res.unreachable': 'No viable route in the stopover network', 'route.nonstop': 'Nonstop flight', 'route.stops': '{n} technical stop(s)', 'route.stopTime': '{n} min stop', 'route.total': 'Total each way', 'route.returnTotal': 'Round-trip total', 'route.fees': 'Stopover fees', 'route.reference': 'Reference distance (direct route)', 'res.nm': 'nautical miles',
            'err.same': 'Origin and destination cannot be the same airport.', 'err.notfound': 'Airport not found.', 'err.dym': 'Did you mean…?',
            'err.past': 'That date and time have passed. Pick a future time.', 'err.pax': 'No aircraft seats {n} passengers (maximum: {m}).', 'err.req': 'Please fill in this field.',
            'how.eyebrow': 'Simple and efficient', 'how.title': 'How it works', 'how.s1t': 'Pick a route', 'how.s1d': 'Enter origin, destination, date and passengers.',
            'how.s2t': 'Compare jets', 'how.s2d': 'See viable aircraft and prices by real distance.', 'how.s3t': 'Personalize', 'how.s3d': 'Menu, transfer and special requests.',
            'how.s4t': 'Pay and board', 'how.s4d': 'Confirm and board straight at the executive terminal.',
            'fleet.eyebrow': 'Fleet', 'fleet.title': 'Elite aircraft', 'fleet.all': 'See all aircraft', 'cat.leves': 'Light jets', 'cat.medios': 'Midsize jets', 'cat.pesados': 'Heavy jets', 'cat.turboelices': 'Turboprops',
            'fleet.pax': 'Up to {n} pax', 'fleet.range': 'Range', 'fleet.rate': 'Estimated rate', 'fleet.perkm': '/ km', 'fleet.ask': 'Request', 'fleet.sub': '{n} models', 'fleet.fromTo': 'from',
            'el.eyebrow': 'Real-time opportunities', 'el.title': 'Live Empty Legs', 'el.sub': 'Return or positioning flights without passengers, up to 75% off.',
            'el.all': 'See all live empty legs', 'el.live': 'LIVE', 'el.updated': 'Updated at {t}', 'el.simulated': 'Simulated feed: refreshes every 8 to 15 s',
            'el.count1': '{n} offer available', 'el.countN': '{n} offers available', 'el.empty': 'No offers match these filters', 'el.emptyD': 'Adjust the filters or create an alert to be notified.',
            'el.reserve': 'Book', 'el.alert': 'Create alert', 'el.region': 'Region', 'el.all_r': 'All', 'el.date': 'Date', 'el.cat': 'Category', 'el.max': 'Max price', 'el.sort': 'Sort by',
            'el.dAll': 'All dates', 'el.d24': 'Next 24 h', 'el.d7': 'Next 7 days', 'el.d30': 'Next 30 days', 'el.cAll': 'All categories',
            'el.sNear': 'Soonest (date)', 'el.sDisc': 'Biggest discount', 'el.sPrice': 'Lowest price', 'el.clear': 'Clear filters', 'el.expires': 'Expires in', 'el.seats': '{n} free seat(s)',
            'el.aircraft': 'Aircraft', 'el.dep': 'Departure', 'el.new': 'New', 'el.reduced': 'Price drop', 'el.expired': 'Expired', 'el.paused': 'Updates paused (hidden tab)',
            'el.alertT': 'Create an empty leg alert', 'el.alertD': 'We notify you in this browser when a matching offer appears. With no backend, the alert is stored only here.', 'el.alertSave': 'Save alert',
            'el.alertOk': 'Alert saved: {r} up to {p}.', 'el.alertHit': 'Alert: new offer {o} → {d} for {p}.', 'el.alerts': 'My alerts', 'el.noAlerts': 'You have no alerts yet.', 'el.remove': 'Remove',
            'dest.eyebrow': 'Popular routes', 'dest.title': 'Featured destinations', 'dest.charter': 'Quote this route',
            'faq.eyebrow': 'Answers', 'faq.title': 'Frequently asked questions',
            'faq.q1': 'How is the charter price calculated?', 'faq.a1': 'By the real route distance (calculated live) times the aircraft rate per km, plus 8% for landing, handling and fuel fees. Optional services are extra.',
            'faq.q2': 'Which payment methods are accepted?', 'faq.a2': 'Pix (5% off), cards up to 12 installments and bank transfer. In this demo project no payment is actually processed.',
            'faq.q3': 'How much notice do I need?', 'faq.a3': 'From 2 hours for empty legs and on-demand flights. For international routes we recommend 24 to 48 hours.',
            'faq.q4': 'What is the cancellation policy?', 'faq.a4': 'Cancellations more than 48 hours ahead get a full refund or credit. Details are shown on each ticket.',
            'cta.eyebrow': 'Ready for takeoff?', 'cta.title': 'The true freedom of flying', 'cta.sub': 'Request your quote in minutes and have an aircraft ready for your next destination.',
            'cta.btn': 'Request a quote now', 'cta.wa': 'WhatsApp support',
            'foot.about': 'Private jet charter priced by the real route distance.', 'foot.nav': 'Navigation', 'foot.news': 'Executive newsletter',
            'foot.newsP': 'Get empty legs and news. No backend: the subscription is stored only in this browser.', 'foot.email': 'Your email', 'foot.subscribe': 'Subscribe',
            'foot.privacy': 'Privacy policy', 'foot.terms': 'Terms of use', 'foot.cookies': 'Cookies (LGPD)', 'foot.cert': 'ANAC certifications', 'foot.rights': 'All rights reserved.',
            'foot.demo': 'Demo project: prices, payments and availability are simulated. No real charge is made.', 'foot.contact': 'Contact',
            'form.name': 'Name', 'form.email': 'Email', 'form.phone': 'Phone', 'form.msg': 'Message', 'form.send': 'Send', 'form.cancel': 'Cancel', 'form.close': 'Close',
            'form.invalidEmail': 'Enter a valid email.', 'form.invalidName': 'Enter your name (min. 2 letters).', 'form.invalidMsg': 'Write a message (min. 10 characters).', 'form.invalidPhone': 'Invalid phone (area code + number).',
            'form.localNote': 'No backend: data is saved only in this browser (localStorage) and sent to no one.',
            'form.newsOk': 'Subscription recorded in this browser. Thank you!', 'form.contactOk': 'Message recorded in this browser. In production it would go to the concierge.', 'form.quoteOk': 'Quote request recorded in this browser.',
            'cookie.text': 'We only use essential cookies and local storage (language, currency, simulated bookings), per Brazilian LGPD.', 'cookie.accept': 'Accept and continue', 'cookie.more': 'Learn more',
            'exit.eyebrow': 'Expert advice', 'exit.title': 'Want a tailored simulation?', 'exit.text': 'Talk to a broker on WhatsApp and see empty legs for your route.', 'exit.wa': 'Talk to a broker', 'exit.stay': 'Keep browsing',
            'quote.title': 'Request a quote from the concierge', 'quote.route': 'Route'
        },
        es: {
            'nav.home': 'Inicio', 'nav.fleet': 'Aeronaves', 'nav.empty': 'Empty Legs', 'nav.dest': 'Destinos', 'nav.create': 'Crear pasaje',
            'nav.menu': 'Menú', 'nav.tickets': 'Mis pasajes', 'nav.about': 'Nosotros', 'nav.blog': 'Blog', 'nav.client': 'Área de clientes',
            'nav.quote': 'Solicitar cotización', 'nav.contact': 'Contáctenos', 'nav.open': 'Abrir menú', 'nav.close': 'Cerrar menú', 'nav.skip': 'Ir al contenido',
            'top.support': 'Atención ejecutiva 24/7', 'top.lang': 'Idioma', 'top.currency': 'Moneda',
            'cur.note': 'Los valores en monedas extranjeras usan tasas fijas de referencia ({d}): 1 USD = R$ 5,40; 1 EUR = R$ 5,88. No son cotizaciones en tiempo real; el cobro es siempre en BRL.',
            'hero.badge': 'Avión privado • Fletamento a medida', 'hero.t1': 'El cielo entero a', 'hero.t2': 'tu disposición.',
            'hero.sub': 'Despega a tu hora, sin filas y con total privacidad. Cotización instantánea por la distancia real de la ruta.',
            'hero.cta1': 'Simular viaje', 'hero.cta2': 'Conocer la flota',
            'sim.title': 'Simulador rápido de cotización', 'sim.reply': 'Cálculo al instante, en tu navegador', 'sim.origin': 'Origen', 'sim.dest': 'Destino',
            'sim.date': 'Fecha y hora', 'sim.pax': 'Pasajeros', 'sim.submit': 'Ver jets', 'sim.phO': 'Ej.: GRU, Belo Horizonte, SBSP', 'sim.phD': 'Ej.: MIA, Florianópolis, SBFL',
            'sim.paxN': '{n} pasajero(s)', 'sim.paxUp': 'Hasta {n} pasajeros', 'sim.pax12': '12 o más',
            'res.title': 'Resultado de la cotización', 'res.distance': 'Distancia', 'res.time': 'Tiempo estimado', 'res.options': 'Aeronaves para esta ruta (menor precio primero)',
            'res.continue': 'Continuar', 'res.request': 'Enviar al concierge', 'res.stop': 'Parada técnica', 'res.over': 'No admite {n} pasajeros', 'res.direct': 'Sin escala',
            'res.note': 'Estimación: distancia ortodrómica (Haversine) × factor de ruta 1,05. Valores de referencia; el concierge confirma la oferta final.',
            'res.best': 'Menor precio viable', 'nav.packages': 'Paquetes', 'res.none': 'No hay aeronaves disponibles para esta ruta y capacidad.', 'res.unreachable': 'Sin ruta viable en la red de escalas', 'route.nonstop': 'Vuelo directo', 'route.stops': '{n} escala(s) técnica(s)', 'route.stopTime': 'parada de {n} min', 'route.total': 'Total por sentido', 'route.returnTotal': 'Total ida y vuelta', 'route.fees': 'Tasas de escala', 'route.reference': 'Distancia de referencia (ruta directa)', 'res.nm': 'millas náuticas',
            'err.same': 'Origen y destino no pueden ser el mismo aeropuerto.', 'err.notfound': 'Aeropuerto no encontrado.', 'err.dym': '¿Quisiste decir…?',
            'err.past': 'La fecha y la hora ya pasaron. Elige un horario futuro.', 'err.pax': 'Ninguna aeronave admite {n} pasajeros (máximo: {m}).', 'err.req': 'Completa este campo.',
            'how.eyebrow': 'Simple y eficiente', 'how.title': 'Cómo funciona', 'how.s1t': 'Elige la ruta', 'how.s1d': 'Indica origen, destino, fecha y pasajeros.',
            'how.s2t': 'Compara jets', 'how.s2d': 'Mira aeronaves viables y precios por distancia real.', 'how.s3t': 'Personaliza', 'how.s3d': 'Menú, traslado y pedidos especiales.',
            'how.s4t': 'Paga y embarca', 'how.s4d': 'Confirma y embarca directo en la terminal ejecutiva.',
            'fleet.eyebrow': 'Flota', 'fleet.title': 'Aeronaves de élite', 'fleet.all': 'Ver todas las aeronaves', 'cat.leves': 'Jets ligeros', 'cat.medios': 'Jets medianos', 'cat.pesados': 'Jets pesados', 'cat.turboelices': 'Turbohélices',
            'fleet.pax': 'Hasta {n} pax', 'fleet.range': 'Alcance', 'fleet.rate': 'Tarifa estimada', 'fleet.perkm': '/ km', 'fleet.ask': 'Solicitar', 'fleet.sub': '{n} modelos', 'fleet.fromTo': 'desde',
            'el.eyebrow': 'Oportunidades en tiempo real', 'el.title': 'Empty Legs en vivo', 'el.sub': 'Vuelos de regreso o posicionamiento sin pasajeros, con hasta 75% de descuento.',
            'el.all': 'Ver todos los empty legs en vivo', 'el.live': 'EN VIVO', 'el.updated': 'Actualizado a las {t}', 'el.simulated': 'Feed simulado: se actualiza cada 8 a 15 s',
            'el.count1': '{n} oferta disponible', 'el.countN': '{n} ofertas disponibles', 'el.empty': 'Ninguna oferta con estos filtros', 'el.emptyD': 'Ajusta los filtros o crea una alerta para recibir aviso.',
            'el.reserve': 'Reservar', 'el.alert': 'Crear alerta', 'el.region': 'Región', 'el.all_r': 'Todas', 'el.date': 'Fecha', 'el.cat': 'Categoría', 'el.max': 'Precio máximo', 'el.sort': 'Ordenar por',
            'el.dAll': 'Todas las fechas', 'el.d24': 'Próximas 24 h', 'el.d7': 'Próximos 7 días', 'el.d30': 'Próximos 30 días', 'el.cAll': 'Todas las categorías',
            'el.sNear': 'Más próximos (fecha)', 'el.sDisc': 'Mayor descuento', 'el.sPrice': 'Menor precio', 'el.clear': 'Limpiar filtros', 'el.expires': 'Expira en', 'el.seats': '{n} asiento(s) libre(s)',
            'el.aircraft': 'Aeronave', 'el.dep': 'Despegue', 'el.new': 'Nuevo', 'el.reduced': 'Precio rebajado', 'el.expired': 'Expirada', 'el.paused': 'Actualizaciones en pausa (pestaña oculta)',
            'el.alertT': 'Crear alerta de empty leg', 'el.alertD': 'Avisamos en este navegador cuando aparezca una oferta compatible. Sin backend, la alerta queda guardada solo aquí.', 'el.alertSave': 'Guardar alerta',
            'el.alertOk': 'Alerta guardada: {r} hasta {p}.', 'el.alertHit': 'Alerta: nueva oferta {o} → {d} por {p}.', 'el.alerts': 'Mis alertas', 'el.noAlerts': 'Aún no tienes alertas.', 'el.remove': 'Quitar',
            'dest.eyebrow': 'Rutas frecuentes', 'dest.title': 'Destinos destacados', 'dest.charter': 'Cotizar esta ruta',
            'faq.eyebrow': 'Aclaraciones', 'faq.title': 'Preguntas frecuentes',
            'faq.q1': '¿Cómo se calcula el precio del fletamento?', 'faq.a1': 'Por la distancia real de la ruta (cálculo en tiempo real) por la tarifa por km de la aeronave, más 8% de tasas de aterrizaje, handling y combustible. Los servicios opcionales van aparte.',
            'faq.q2': '¿Qué formas de pago se aceptan?', 'faq.a2': 'Pix (5% de descuento), tarjeta hasta 12 cuotas y transferencia. En este proyecto de demostración no se procesa ningún pago real.',
            'faq.q3': '¿Cuál es la antelación mínima?', 'faq.a3': 'Desde 2 horas para empty legs y vuelos a demanda. Para rutas internacionales recomendamos de 24 a 48 horas.',
            'faq.q4': '¿Cuál es la política de cancelación?', 'faq.a4': 'Las cancelaciones con más de 48 horas de antelación tienen reembolso total o crédito. Los detalles están en cada pasaje.',
            'cta.eyebrow': '¿Listo para despegar?', 'cta.title': 'La verdadera libertad de volar', 'cta.sub': 'Solicita tu cotización en minutos y ten una aeronave lista para tu próximo destino.',
            'cta.btn': 'Solicitar cotización ahora', 'cta.wa': 'Atención por WhatsApp',
            'foot.about': 'Fletamento de jets privados con precio calculado por la distancia real de la ruta.', 'foot.nav': 'Navegación', 'foot.news': 'Newsletter ejecutiva',
            'foot.newsP': 'Recibe empty legs y novedades. Sin backend: la suscripción queda guardada solo en este navegador.', 'foot.email': 'Tu correo', 'foot.subscribe': 'Suscribirse',
            'foot.privacy': 'Política de privacidad', 'foot.terms': 'Términos de uso', 'foot.cookies': 'Cookies (LGPD)', 'foot.cert': 'Certificaciones ANAC', 'foot.rights': 'Todos los derechos reservados.',
            'foot.demo': 'Proyecto de demostración: valores, pagos y disponibilidad son simulados. No se realiza ningún cobro real.', 'foot.contact': 'Contacto',
            'form.name': 'Nombre', 'form.email': 'Correo', 'form.phone': 'Teléfono', 'form.msg': 'Mensaje', 'form.send': 'Enviar', 'form.cancel': 'Cancelar', 'form.close': 'Cerrar',
            'form.invalidEmail': 'Ingresa un correo válido.', 'form.invalidName': 'Ingresa tu nombre (mín. 2 letras).', 'form.invalidMsg': 'Escribe un mensaje (mín. 10 caracteres).', 'form.invalidPhone': 'Teléfono inválido (código de área + número).',
            'form.localNote': 'Sin backend: los datos se guardan solo en este navegador (localStorage) y no se envían a nadie.',
            'form.newsOk': 'Suscripción registrada en este navegador. ¡Gracias!', 'form.contactOk': 'Mensaje registrado en este navegador. En producción iría al concierge.', 'form.quoteOk': 'Solicitud de cotización registrada en este navegador.',
            'cookie.text': 'Solo usamos cookies y almacenamiento local esenciales (idioma, moneda, reservas simuladas), conforme a la LGPD.', 'cookie.accept': 'Aceptar y continuar', 'cookie.more': 'Más información',
            'exit.eyebrow': 'Asesoría especializada', 'exit.title': '¿Quieres una simulación a medida?', 'exit.text': 'Habla con un broker por WhatsApp y mira los empty legs de tu ruta.', 'exit.wa': 'Hablar con un broker', 'exit.stay': 'Seguir navegando',
            'quote.title': 'Solicitar cotización al concierge', 'quote.route': 'Ruta'
        }
    };
    const LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
    const listeners = [];
    let prefs = { lang: 'pt', currency: 'BRL' };
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) prefs = Object.assign(prefs, s); } catch (e) { /* storage bloqueado */ }
    if (!D[prefs.lang]) prefs.lang = 'pt';
    if (!(window.CURRENCIES || {})[prefs.currency]) prefs.currency = 'BRL';
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* ignora */ } };

    function t(key, vars) {
        let s = (D[prefs.lang] && D[prefs.lang][key]) || D.pt[key] || key;
        if (vars) Object.keys(vars).forEach((k) => { s = s.split('{' + k + '}').join(vars[k]); });
        return s;
    }
    // Converte um valor em BRL para a moeda escolhida (taxa fixa de referência) e formata.
    function money(brl, opts) {
        const cur = (window.CURRENCIES || {})[prefs.currency] || { code: 'BRL', rate: 1, locale: 'pt-BR' };
        const v = Number(brl) * cur.rate;
        const dec = opts && opts.decimals != null ? opts.decimals : 0;
        return new Intl.NumberFormat(cur.code === 'BRL' ? 'pt-BR' : LOCALE[prefs.lang], { style: 'currency', currency: cur.code, minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
    }
    function apply(root) {
        root = root || document;
        root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
        root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
        root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.setAttribute('placeholder', t(el.dataset.i18nPh)); });
        root.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
        document.documentElement.lang = LOCALE[prefs.lang];
    }
    function emit() { listeners.forEach((cb) => { try { cb(prefs); } catch (e) { console.error(e); } }); }
    function setLang(l) { if (!D[l] || l === prefs.lang) return; prefs.lang = l; save(); apply(); emit(); }
    function setCurrency(c) { if (!(window.CURRENCIES || {})[c] || c === prefs.currency) return; prefs.currency = c; save(); apply(); emit(); }
    const note = () => t('cur.note', { d: (window.CURRENCY_REFERENCE_DATE || '') });

    window.AetherI18n = {
        t, money, apply, setLang, setCurrency, note,
        get lang() { return prefs.lang; }, get currency() { return prefs.currency; }, get locale() { return LOCALE[prefs.lang]; },
        onChange(cb) { listeners.push(cb); }
    };
    document.documentElement.lang = LOCALE[prefs.lang];
})();
