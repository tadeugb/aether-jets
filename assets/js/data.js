// Moedas de referência e precificação do voo.
window.CURRENCIES = {
    BRL: { code: 'BRL', symbol: 'R$', label: 'BRL (R$)', rate: 1,     locale: 'pt-BR' },
    USD: { code: 'USD', symbol: '$',  label: 'USD ($)',  rate: 0.185, locale: 'en-US' },   // referência: 1 USD = R$ 5,40
    EUR: { code: 'EUR', symbol: '€',  label: 'EUR (€)',  rate: 0.170, locale: 'de-DE' }    // referência: 1 EUR = R$ 5,88
};
window.CURRENCY_REFERENCE_DATE = '17/11/2026';

/**
 * 5. CENTRALIZED PRICING ENGINE
 * Custo total = distância de voo × tarifa por km, mais taxa base e taxas por escala.
 * A distância de voo vem do RouteService (Haversine x fator de rota 1,05), calculada em tempo real (sem tabela N x N).
 * formattedTotal respeita a moeda escolhida (AetherI18n.money) e cai para BRL se o i18n não estiver carregado.
 */
window.calculateFlightCost = function(distanceKm, aircraft, extraTaxesPercent = 0.08, taxasEscalas = 0) {
    const baseCost = Math.round(distanceKm * aircraft.tarifa_km);
    const taxesAndHandling = Math.round(baseCost * extraTaxesPercent) + taxasEscalas;
    const totalCost = baseCost + taxesAndHandling;
    const fmt = (window.AetherI18n && window.AetherI18n.money)
        ? window.AetherI18n.money(totalCost)
        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalCost);
    return {
        baseCost: Math.round(baseCost),
        taxesAndHandling: Math.round(taxesAndHandling),
        totalCost: Math.round(totalCost),
        get formattedTotal() { return (window.AetherI18n && window.AetherI18n.money) ? window.AetherI18n.money(totalCost) : fmt; }
    };
};
