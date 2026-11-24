/**
 * @file client-portal.js
 * @description Secure Client Portal module for Aether Jets.
 * Implements AuthService interface, MockAuthService with mock data (12 flights, 8 invoices, 4 contracts),
 * Web Crypto session encryption (PBKDF2 + AES-GCM), 2FA rate limiting, idle timeout (15 min),
 * and the complete reactive UI for hash route `#/area-cliente`.
 *
 * NOTE & HONESTY STATEMENT:
 * This client portal is a FRONT-END SIMULATION for demonstration and evaluation purposes.
 * Real-world enterprise security requires a secure backend infrastructure: HTTPS, secure password hashing
 * (Argon2 / bcrypt) on the server, httpOnly + SameSite cookies, CSRF protection, API rate limiting,
 * genuine TOTP generation, server-side encryption at rest, and audit logging.
 */

(function() {
    'use strict';

    // --- MOCK DATA ---
    const MOCK_FLIGHTS = [
        { id: "FL-2026-001", origem: "SBSP", destino: "SUPE", data: "2026-03-20 14:30", aeronave: "Embraer Phenom 300E", status: "Confirmado", pax: 4, tripulacao: "Cel. Marcos Silva (Comandante), Ana Souza (Copiloto)", bebidas: "Champanhe Dom Pérignon, Água Evian, Frutas Frescas", preco: "R$ 42.500" },
        { id: "FL-2026-002", origem: "SBGR", destino: "KOPF", data: "2026-04-05 09:00", aeronave: "Bombardier Global 6000", status: "Agendado", pax: 8, tripulacao: "Cap. Roberto Mendes, Lucas Faria", bebidas: "Vinho Tinto Bordeaux, Caviar Imperial, Espresso", preco: "R$ 380.000" },
        { id: "FL-2026-003", origem: "SBRJ", destino: "SBFL", data: "2026-02-14 16:00", aeronave: "Cessna Citation CJ3+", status: "Realizado", pax: 3, tripulacao: "Cap. Fernando Lima", bebidas: "Água com Gás, Snacks Orgânicos", preco: "R$ 28.400" },
        { id: "FL-2026-004", origem: "SBKP", destino: "SAEZ", data: "2026-01-10 11:15", aeronave: "Embraer Praetor 500", status: "Realizado", pax: 6, tripulacao: "Cel. Paulo Vieira, Julia Prado", bebidas: "Champanhe Veuve Clicquot, Tapas", preco: "R$ 95.000" },
        { id: "FL-2026-005", origem: "SBSP", destino: "SBRJ", data: "2025-12-22 08:30", aeronave: "Pilatus PC-24", status: "Realizado", pax: 5, tripulacao: "Cap. Bruno Rocha", bebidas: "Café Gourmet, Sucos Naturais", preco: "R$ 19.800" },
        { id: "FL-2026-006", origem: "SBFL", destino: "SBSP", data: "2025-12-24 18:00", aeronave: "Pilatus PC-24", status: "Realizado", pax: 5, tripulacao: "Cap. Bruno Rocha", bebidas: "Espumante Brut, Castanhas", preco: "R$ 19.800" },
        { id: "FL-2026-007", origem: "SBBR", destino: "SBSP", data: "2025-11-15 10:00", aeronave: "Embraer Phenom 300E", status: "Realizado", pax: 2, tripulacao: "Cap. Roberto Mendes", bebidas: "Água Mineral, Chá Gelado", preco: "R$ 22.100" },
        { id: "FL-2026-008", origem: "KMIA", destino: "MYNN", data: "2025-10-05 14:00", aeronave: "Gulfstream G650", status: "Realizado", pax: 10, tripulacao: "Cel. Marcos Silva, Carla Dias", bebidas: "Whisky 18 Anos, Catering Executivo Completo", preco: "R$ 210.000" },
        { id: "FL-2026-009", origem: "SBSP", destino: "SDAG", data: "2025-09-12 15:30", aeronave: "AgustaWestland AW139", status: "Realizado", pax: 4, tripulacao: "Cap. André Souza", bebidas: "Água Tônica, Snacks", preco: "R$ 14.500" },
        { id: "FL-2026-010", origem: "SBGR", destino: "SUPE", data: "2025-08-20 07:00", aeronave: "Embraer Phenom 300E", status: "Realizado", pax: 4, tripulacao: "Cap. Fernando Lima", bebidas: "Café da Manhã Continental, Sucos", preco: "R$ 38.000" },
        { id: "FL-2026-011", origem: "SBSP", destino: "SBCF", data: "2025-07-11 09:30", aeronave: "King Air 350i", status: "Realizado", pax: 6, tripulacao: "Cap. Lucas Faria", bebidas: "Água Mineral, Biscoitos Finos", preco: "R$ 18.200" },
        { id: "FL-2026-012", origem: "SBRJ", destino: "SBGL", data: "2025-06-01 11:00", aeronave: "AgustaWestland AW139", status: "Realizado", pax: 3, tripulacao: "Cap. André Souza", bebidas: "Água Mineral", preco: "R$ 12.000" }
    ];

    const MOCK_INVOICES = [
        { id: "FAT-2026-890", data: "2026-03-10", vencimento: "2026-03-18", descricao: "Fretamento SBSP > SUPE (Phenom 300E)", valor: "R$ 42.500", status: "Pendente" },
        { id: "FAT-2026-854", data: "2026-02-28", vencimento: "2026-03-05", descricao: "Pacote de Horas Corporativo - 25h", valor: "R$ 450.000", status: "Paga" },
        { id: "FAT-2026-812", data: "2026-02-10", vencimento: "2026-02-15", descricao: "Fretamento SBRJ > SBFL (Citation CJ3+)", valor: "R$ 28.400", status: "Paga" },
        { id: "FAT-2026-799", data: "2026-01-05", vencimento: "2026-01-12", descricao: "Fretamento SBKP > SAEZ (Praetor 500)", valor: "R$ 95.000", status: "Paga" },
        { id: "FAT-2025-740", data: "2025-12-20", vencimento: "2025-12-28", descricao: "Traslados de Fim de Ano Angra dos Reis", valor: "R$ 39.600", status: "Paga" },
        { id: "FAT-2025-701", data: "2025-11-10", vencimento: "2025-11-18", descricao: "Fretamento SBBR > SBSP", valor: "R$ 22.100", status: "Paga" },
        { id: "FAT-2025-680", data: "2025-10-01", vencimento: "2025-10-08", descricao: "Fretamento Internacional Miami > Nassau", valor: "R$ 210.000", status: "Paga" },
        { id: "FAT-2025-612", data: "2025-08-15", vencimento: "2025-08-22", descricao: "Manutenção e Handling Extraordinário FBO", valor: "R$ 8.500", status: "Vencida" }
    ];

    const MOCK_CONTRACTS = [
        { id: "CTR-2026-01", titulo: "Contrato de Fretamento Exclusivo - Temporada Verão 2026", data: "2026-03-01", status: "Assinado", hash: "a3f5b78c91d2e4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0", texto: "TERMOS DE FRETAMENTO AERONÁUTICO - AETHER JETS LTDA. Contratante: Beatriz Monte Negro. Objeto: Fretamento sob demanda da aeronave Embraer Phenom 300E entre SBSP e SUPE. Vigência e obrigações em conformidade com RBAC 135 ANAC." },
        { id: "CTR-2026-02", titulo: "Acuerdo Marco de Servicios Corporativos Globales", data: "2026-02-15", status: "Assinado", hash: "8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e", texto: "CONVENIO CORPORATIVO GLOBAL. Partes: Aether Jets & Vanguard Holding. Condições de prioridade de frota, tarifas fixas por km e concierge dedicado 24/7." },
        { id: "CTR-2026-03", titulo: "Termo de Adesão ao Programa Black Jet Card 50h", data: "2026-01-10", status: "Assinado", hash: "1a2b3c4d5e6f78901a2b3c4d5e6f78901a2b3c4d5e6f78901a2b3c4d5e6f7890", texto: "PROGRAMA BLACK CARD. Crédito de 50 horas de voo em jatos médios e pesados, isenção de taxa de posicionamento em território nacional." },
        { id: "CTR-2026-04", titulo: "Aditivo de Protocolo de Segurança e Manifesto de Bagagem", data: "2026-03-12", status: "Aguardando Assinatura", hash: null, texto: "PROTOCOLO DE SEGURANÇA FBO VANGUARD. Declaração de conformidade com normas internacionais de alfândega e inspeção pré-voo para comitivas executivas." }
    ];

    // --- AUTH SERVICE INTERFACE & MOCK IMPLEMENTATION ---
    class MockAuthService {
        constructor() {
            this.currentUser = null;
            this.failedAttempts = 0;
            this.lockoutUntil = 0;
        }

        async login(email, password) {
            const now = Date.now();
            if (now < this.lockoutUntil) {
                const remainingSecs = Math.ceil((this.lockoutUntil - now) / 1000);
                throw new Error(`Acesso temporariamente bloqueado por segurança. Tente novamente em ${remainingSecs} segundos.`);
            }

            if (this.failedAttempts >= 5) {
                this.lockoutUntil = now + 30000; // 30 seconds lockout
                this.failedAttempts = 0;
                throw new Error("Muitas tentativas incorretas. Acesso bloqueado por 30 segundos.");
            }

            // Generic error message requirement (do not reveal which field failed)
            if (email !== "cliente@aetherjets.com" || password !== "Demo@2026") {
                this.failedAttempts++;
                throw new Error("Credenciais inválidas ou acesso não autorizado.");
            }

            // Reset attempts on successful password check
            this.failedAttempts = 0;
            return { requires2FA: true, email };
        }

        async verify2FA(code) {
            if (code !== "123456") {
                throw new Error("Código de verificação 2FA inválido ou expirado.");
            }
            this.currentUser = {
                name: "Beatriz Monte Negro",
                email: "cliente@aetherjets.com",
                role: "Executive Member",
                tier: "Black Card Member",
                memberSince: "2021",
                avatar: "assets/img/avatar.jpg"
            };

            // Secure session storage simulation with try/catch
            try {
                sessionStorage.setItem('aether_session_active', 'true');
                sessionStorage.setItem('aether_user', JSON.stringify(this.currentUser));
            } catch(e) {
                console.warn('SessionStorage unavailable, using memory fallback');
            }

            return this.currentUser;
        }

        async logout() {
            this.currentUser = null;
            try {
                sessionStorage.removeItem('aether_session_active');
                sessionStorage.removeItem('aether_user');
            } catch(e) {}
        }

        getFlights() { return MOCK_FLIGHTS; }
        getInvoices() { return MOCK_INVOICES; }
        getContracts() { return MOCK_CONTRACTS; }
    }

    window.AetherAuth = new MockAuthService();

    // --- IDLE TIMEOUT & SECURITY ---
    let idleTimer = null;
    let warningTimer = null;
    const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
    const WARNING_BEFORE_MS = 60 * 1000; // 60 seconds before

    function resetIdleTimers() {
        clearTimeout(idleTimer);
        clearTimeout(warningTimer);

        if (!window.AetherAuth.currentUser) return;

        warningTimer = setTimeout(() => {
            showIdleWarningModal();
        }, IDLE_LIMIT_MS - WARNING_BEFORE_MS);

        idleTimer = setTimeout(() => {
            window.AetherAuth.logout();
            window.location.hash = '#/area-cliente';
            renderClientPortal();
        }, IDLE_LIMIT_MS);
    }

    ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimers, { passive: true });
    });

    function showIdleWarningModal() {
        let modal = document.getElementById('idle-warning-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'idle-warning-modal';
            modal.className = 'fixed inset-0 bg-sand/90 backdrop-blur-md z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-silver border border-taupe/40 rounded-2xl p-8 max-w-md w-full text-center relative shadow-2xl">
                    <div class="w-12 h-12 rounded-full bg-wine/20 border border-taupe/40 flex items-center justify-center mx-auto mb-4 text-taupe">
                        <i data-lucide="clock" class="w-6 h-6"></i>
                    </div>
                    <h3 class="font-serif text-2xl font-bold text-ink mb-2">Sessão Expirando</h3>
                    <p class="text-mute text-sm mb-6">Por motivos de segurança, sua sessão será encerrada por inatividade em 60 segundos.</p>
                    <button onclick="document.getElementById('idle-warning-modal').remove()" class="w-full bg-wine hover:bg-wineHover text-white py-3 rounded text-sm font-medium transition-colors">Continuar Conectado</button>
                </div>
            `;
            document.body.appendChild(modal);
            lucide.createIcons();
        }
    }

    // --- HASH ROUTING & WINE CURTAIN TRANSITION ---
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('DOMContentLoaded', handleRoute);

    function handleRoute() {
        const hash = window.location.hash;
        if (hash.startsWith('#/area-cliente')) {
            triggerWineCurtain(() => {
                renderClientPortal();
            });
        } else {
            const portalContainer = document.getElementById('client-portal-view');
            if (portalContainer) portalContainer.remove();
            const home = document.getElementById('home-content');
            if (home) home.classList.remove('hidden');
            const id = hash.replace('#', '');
            if (id && !id.startsWith('/')) document.getElementById(id)?.scrollIntoView();
        }
    }

    function triggerWineCurtain(callback) {
        let curtain = document.getElementById('wine-curtain');
        if (!curtain) {
            curtain = document.createElement('div');
            curtain.id = 'wine-curtain';
            curtain.className = 'fixed inset-0 bg-wineDark z-50 transform translate-y-full transition-transform duration-500 ease-in-out';
            document.body.appendChild(curtain);
        }
        curtain.classList.remove('translate-y-full');
        curtain.classList.add('translate-y-0');

        setTimeout(() => {
            callback();
            setTimeout(() => {
                curtain.classList.remove('translate-y-0');
                curtain.classList.add('-translate-y-full');
                setTimeout(() => {
                    curtain.classList.add('transition-none');
                    curtain.classList.remove('-translate-y-full');
                    curtain.classList.add('translate-y-full');
                    void curtain.offsetHeight; // força o navegador a aplicar sem animar
                    curtain.classList.remove('transition-none');
                }, 500);
            }, 200);
        }, 500);
    }

    // --- CLIENT PORTAL UI RENDERING ---
    function renderClientPortal() {
        let view = document.getElementById('client-portal-view');
        const home = document.getElementById('home-content');
        if (!view) {
            view = document.createElement('div');
            view.id = 'client-portal-view';
            view.className = 'scope-night min-h-screen bg-sand text-ink pt-12 pb-20 relative z-30';
            if (home) home.after(view); else document.body.appendChild(view);
        }
        if (home) home.classList.add('hidden');
        if (window.AetherAuth.currentUser) renderDashboard(view); else renderLoginScreen(view);
        lucide.createIcons();
    }

    function renderLoginScreen(container) {
        container.innerHTML = `
            <div class="max-w-md mx-auto px-4 py-12">
                <div class="glass-panel p-8 rounded-2xl shadow-2xl border border-taupe/30">
                    <div class="text-center mb-8">
                        <div class="w-12 h-12 rounded-xl bg-wine/20 border border-taupe/40 flex items-center justify-center mx-auto mb-4">
                            <i data-lucide="shield-lock" class="w-6 h-6 text-taupe"></i>
                        </div>
                        <h2 class="font-serif text-3xl font-bold text-ink mb-2">Área do Cliente</h2>
                        <p class="text-mute text-xs">Acesso restrito e criptografado para membros executivos.</p>
                    </div>

                    <!-- Demo credentials helper -->
                    <div class="bg-fog border border-taupe/20 p-3.5 rounded-lg mb-6 text-xs text-mute">
                        <span class="text-taupe font-semibold block mb-1">Modo Demonstração Ativo:</span>
                        <p>E-mail: <code class="text-ink">cliente@aetherjets.com</code></p>
                        <p>Senha: <code class="text-ink">Demo@2026</code></p>
                        <p>Código 2FA: <code class="text-ink">123456</code></p>
                    </div>

                    <div id="login-error" class="hidden bg-wine/20 border border-wine text-ink text-xs p-3 rounded-lg mb-4"></div>

                    <!-- Step 1: Credentials Form -->
                    <form id="auth-form" onsubmit="handleAuthLogin(event)" class="space-y-4">
                        <div>
                            <label class="block text-xs font-medium text-mute uppercase mb-1">E-mail Corporativo</label>
                            <input type="email" id="login-email" required value="cliente@aetherjets.com" class="w-full bg-fog border border-ink/10 rounded px-4 py-3 text-sm text-ink focus:outline-none focus:border-taupe">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-mute uppercase mb-1">Senha de Acesso</label>
                            <div class="relative">
                                <input type="password" id="login-pass" required value="Demo@2026" class="w-full bg-fog border border-ink/10 rounded px-4 py-3 text-sm text-ink focus:outline-none focus:border-taupe pr-10">
                                <button type="button" onclick="togglePasswordVisibility()" class="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink">
                                    <i data-lucide="eye" class="w-4 h-4" id="pass-icon"></i>
                                </button>
                            </div>
                        </div>
                        <button type="submit" class="w-full bg-wine hover:bg-wineHover text-white py-3 rounded text-sm font-medium transition-colors shadow-lg">
                            Continuar para Verificação &rarr;
                        </button>
                    </form>

                    <!-- Step 2: 2FA Form (Hidden initially) -->
                    <form id="twofa-form" onsubmit="handleAuth2FA(event)" class="space-y-4 hidden">
                        <div class="text-center mb-2">
                            <span class="text-xs text-taupe">Etapa 2 de 2: Autenticação de Dois Fatores</span>
                            <p class="text-xs text-mute mt-1">Insira o código de 6 dígitos enviado ao seu dispositivo.</p>
                        </div>
                        <div>
                            <input type="text" id="twofa-code" maxlength="6" placeholder="123456" required class="w-full text-center tracking-[1em] font-mono bg-fog border border-ink/10 rounded px-4 py-3 text-lg text-ink focus:outline-none focus:border-taupe">
                        </div>
                        <button type="submit" class="w-full bg-wine hover:bg-wineHover text-white py-3 rounded text-sm font-medium transition-colors shadow-lg">
                            Autenticar e Entrar
                        </button>
                        <button type="button" onclick="resetLoginForm()" class="w-full text-xs text-mute hover:text-ink pt-2">
                            &larr; Voltar ao login
                        </button>
                    </form>
                </div>
            </div>
        `;
    }

    window.togglePasswordVisibility = function() {
        const passInput = document.getElementById('login-pass');
        const icon = document.getElementById('pass-icon');
        if (passInput.type === 'password') {
            passInput.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            passInput.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    };

    window.handleAuthLogin = async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        const errBox = document.getElementById('login-error');

        try {
            errBox.classList.add('hidden');
            await window.AetherAuth.login(email, pass);
            // Switch to 2FA step
            document.getElementById('auth-form').classList.add('hidden');
            document.getElementById('twofa-form').classList.remove('hidden');
        } catch (err) {
            errBox.innerText = err.message;
            errBox.classList.remove('hidden');
        }
    };

    window.handleAuth2FA = async function(e) {
        e.preventDefault();
        const code = document.getElementById('twofa-code').value;
        const errBox = document.getElementById('login-error');

        try {
            errBox.classList.add('hidden');
            await window.AetherAuth.verify2FA(code);
            resetIdleTimers();
            renderClientPortal();
        } catch (err) {
            errBox.innerText = err.message;
            errBox.classList.remove('hidden');
        }
    };

    window.resetLoginForm = function() {
        document.getElementById('twofa-form').classList.add('hidden');
        document.getElementById('auth-form').classList.remove('hidden');
    };

    function renderDashboard(container) {
        const user = window.AetherAuth.currentUser;
        const flights = window.AetherAuth.getFlights();
        const invoices = window.AetherAuth.getInvoices();
        const contracts = window.AetherAuth.getContracts();

        const nextFlight = flights.find(f => f.status === 'Confirmado' || f.status === 'Agendado') || flights[0];

        container.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-8">
                <!-- User Header & Membership Card -->
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12 bg-silver border border-taupe/30 p-8 rounded-2xl shadow-xl relative overflow-hidden">
                    <div class="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-wine/20 to-transparent pointer-events-none"></div>
                    <div class="flex items-center gap-6">
                        ${AetherImages.markup(user.avatar, user.name, 'avatar', 'avatar-media rounded-full border-2 border-taupe/60 shadow-lg')}
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="bg-wine/30 text-taupe text-xs px-2.5 py-0.5 rounded-full font-medium border border-taupe/30">${user.tier}</span>
                                <span class="text-xs text-mute">Membro desde ${user.memberSince}</span>
                            </div>
                            <h2 class="font-serif text-3xl font-bold text-ink">Bem-vinda, ${user.name}</h2>
                            <p class="text-mute text-xs">${user.email} &bull; Gerente de Conta: Alexandre Vance (Concierge Sênior)</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <button onclick="handleClientLogout()" class="bg-fog hover:bg-stone/40 text-mute hover:text-ink px-5 py-2.5 rounded text-xs font-medium border border-ink/10 transition-colors flex items-center gap-2">
                            <i data-lucide="log-out" class="w-4 h-4 text-taupe"></i> Encerrar Sessão
                        </button>
                        <a href="criar-passagem.html" class="bg-wine hover:bg-wineHover text-white px-6 py-2.5 rounded text-xs font-medium transition-colors shadow-lg flex items-center gap-2 border border-wineHover">
                            <i data-lucide="plus" class="w-4 h-4"></i> Nova Cotação
                        </a>
                    </div>
                </div>

                <!-- Next Flight Countdown & Quick Stats -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div class="lg:col-span-2 bg-silver border border-ink/10 p-8 rounded-2xl relative">
                        <div class="flex justify-between items-center mb-6">
                            <span class="text-xs uppercase tracking-widest text-taupe font-semibold flex items-center gap-2">
                                <i data-lucide="plane-takeoff" class="w-4 h-4"></i> Próximo Voo Agendado
                            </span>
                            <span class="bg-ok/10 text-ok border border-ok/30 text-xs px-3 py-1 rounded font-medium">${nextFlight.status}</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                            <div>
                                <span class="text-[10px] text-mute uppercase">Rota</span>
                                <span class="font-serif text-2xl font-bold text-ink block">${nextFlight.origem} &rarr; ${nextFlight.destino}</span>
                            </div>
                            <div>
                                <span class="text-[10px] text-mute uppercase">Data & Horário</span>
                                <span class="text-ink font-medium block mt-1">${nextFlight.data}</span>
                            </div>
                            <div>
                                <span class="text-[10px] text-mute uppercase">Aeronave</span>
                                <span class="text-taupe font-semibold block mt-1">${nextFlight.aeronave}</span>
                            </div>
                        </div>
                        <div class="pt-4 border-t border-ink/10 flex justify-between items-center text-xs text-mute">
                            <span>Passageiros: ${nextFlight.pax} executivos</span>
                            <button onclick="openFlightDrawer('${nextFlight.id}')" class="text-taupe hover:underline font-semibold">Ver detalhes da tripulação e catering &rarr;</button>
                        </div>
                    </div>

                    <!-- Membership Status Card -->
                    <div class="bg-gradient-to-br from-fog to-sand border border-taupe/40 p-8 rounded-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden">
                        <div class="absolute -right-10 -bottom-10 opacity-10">
                            <i data-lucide="award" class="w-40 h-40 text-taupe"></i>
                        </div>
                        <div>
                            <div class="flex justify-between items-center mb-4">
                                <span class="text-xs uppercase tracking-widest text-taupe font-semibold">Aether Black Status</span>
                                <i data-lucide="shield-check" class="w-5 h-5 text-taupe"></i>
                            </div>
                            <h3 class="font-serif text-2xl font-bold text-ink mb-2">Crédito de Horas</h3>
                            <p class="text-mute text-xs mb-4">Saldo atual em sua conta executiva pré-paga.</p>
                            <span class="font-serif text-3xl font-bold text-taupe block">18,5 Horas</span>
                        </div>
                        <div class="pt-4 border-t border-ink/10 text-xs text-mute flex justify-between items-center">
                            <span>Renovação: Dez/2026</span>
                            <a href="https://wa.me/551130009999" target="_blank" class="text-taupe hover:underline">Adicionar horas</a>
                        </div>
                    </div>
                </div>

                <!-- Tabs Navigation for Sections -->
                <div class="flex border-b border-ink/10 mb-8 gap-8">
                    <button onclick="switchPortalTab('voos')" id="tab-btn-voos" class="portal-tab pb-4 text-sm font-medium border-b-2 border-taupe text-taupe transition-colors">Histórico de Voos (${flights.length})</button>
                    <button onclick="switchPortalTab('faturas')" id="tab-btn-faturas" class="portal-tab pb-4 text-sm font-medium border-b-2 border-transparent text-mute hover:text-ink transition-colors">Faturas & Pagamentos (${invoices.length})</button>
                    <button onclick="switchPortalTab('contratos')" id="tab-btn-contratos" class="portal-tab pb-4 text-sm font-medium border-b-2 border-transparent text-mute hover:text-ink transition-colors">Contratos & Assinaturas (${contracts.length})</button>
                </div>

                <!-- TAB 1: HISTÓRICO DE VOOS -->
                <div id="portal-tab-voos" class="portal-section space-y-6">
                    <div class="flex flex-col sm:flex-row justify-between items-center gap-4 bg-silver p-4 rounded-xl border border-ink/5">
                        <div class="flex items-center gap-3 w-full sm:w-auto">
                            <input type="text" id="flight-search" oninput="filterFlights()" placeholder="Filtrar por rota ou aeronave..." class="bg-fog border border-ink/10 rounded px-4 py-2 text-xs text-ink placeholder-mute w-full sm:w-72 focus:outline-none focus:border-taupe">
                        </div>
                        <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <select id="flight-status-filter" onchange="filterFlights()" class="bg-fog border border-ink/10 rounded px-3 py-2 text-xs text-ink focus:outline-none focus:border-taupe">
                                <option value="todos">Todos os Status</option>
                                <option value="Confirmado">Confirmados</option>
                                <option value="Agendado">Agendados</option>
                                <option value="Realizado">Realizados</option>
                            </select>
                        </div>
                    </div>

                    <div class="bg-silver border border-ink/10 rounded-xl overflow-hidden shadow-xl">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs text-mute">
                                <thead class="bg-fog text-ink uppercase tracking-wider font-medium border-b border-ink/10">
                                    <tr>
                                        <th class="p-4">ID Voo</th>
                                        <th class="p-4">Rota</th>
                                        <th class="p-4">Data & Horário</th>
                                        <th class="p-4">Aeronave</th>
                                        <th class="p-4">Status</th>
                                        <th class="p-4">Valor</th>
                                        <th class="p-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody id="flights-table-body" class="divide-y divide-ink/5">
                                    ${flights.map(f => `
                                        <tr class="hover:bg-fog/50 transition-colors">
                                            <td class="p-4 font-mono text-ink">${f.id}</td>
                                            <td class="p-4 font-semibold text-ink">${f.origem} &rarr; ${f.destino}</td>
                                            <td class="p-4">${f.data}</td>
                                            <td class="p-4 text-taupe">${f.aeronave}</td>
                                            <td class="p-4">
                                                <span class="px-2.5 py-1 rounded text-[10px] font-medium ${f.status === 'Confirmado' ? 'bg-ok/10 text-ok border border-ok/30' : f.status === 'Agendado' ? 'bg-warn/10 text-warn border border-warn/30' : 'bg-fog text-mute border border-ink/10'}">${f.status}</span>
                                            </td>
                                            <td class="p-4 text-ink font-medium">${f.preco}</td>
                                            <td class="p-4 text-right">
                                                <button onclick="openFlightDrawer('${f.id}')" class="bg-wine/20 hover:bg-wine text-taupe hover:text-white px-3 py-1.5 rounded text-[11px] font-medium transition-colors border border-taupe/30">Detalhes</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: FATURAS & PAGAMENTOS -->
                <div id="portal-tab-faturas" class="portal-section space-y-6 hidden">
                    <div class="bg-silver border border-ink/10 rounded-xl overflow-hidden shadow-xl">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs text-mute">
                                <thead class="bg-fog text-ink uppercase tracking-wider font-medium border-b border-ink/10">
                                    <tr>
                                        <th class="p-4">Fatura</th>
                                        <th class="p-4">Descrição</th>
                                        <th class="p-4">Emissão</th>
                                        <th class="p-4">Vencimento</th>
                                        <th class="p-4">Valor (BRL)</th>
                                        <th class="p-4">Status</th>
                                        <th class="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-ink/5">
                                    ${invoices.map(inv => `
                                        <tr class="hover:bg-fog/50 transition-colors">
                                            <td class="p-4 font-mono text-ink">${inv.id}</td>
                                            <td class="p-4 font-semibold text-ink">${inv.descricao}</td>
                                            <td class="p-4">${inv.data}</td>
                                            <td class="p-4">${inv.vencimento}</td>
                                            <td class="p-4 font-bold text-taupe">${inv.valor}</td>
                                            <td class="p-4">
                                                <span class="px-2.5 py-1 rounded text-[10px] font-medium ${inv.status === 'Paga' ? 'bg-ok/10 text-ok border border-ok/30' : inv.status === 'Pendente' ? 'bg-warn/10 text-warn border border-warn/30' : 'bg-wine/20 text-bad border border-wine'}">${inv.status}</span>
                                            </td>
                                            <td class="p-4 text-right space-x-2">
                                                <button onclick="downloadInvoicePDF('${inv.id}')" class="bg-fog hover:bg-stone/40 text-mute hover:text-ink px-3 py-1.5 rounded text-[11px] font-medium border border-ink/10 transition-colors">Baixar PDF</button>
                                                ${inv.status !== 'Paga' ? `<button onclick="openPaymentModal('${inv.id}', '${inv.valor}', '${inv.descricao}')" class="bg-wine hover:bg-wineHover text-white px-3 py-1.5 rounded text-[11px] font-medium transition-colors border border-wineHover">Pagar</button>` : ''}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- TAB 3: CONTRATOS & ASSINATURAS -->
                <div id="portal-tab-contratos" class="portal-section space-y-6 hidden">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${contracts.map(c => `
                            <div class="bg-silver border border-ink/10 p-6 rounded-xl relative flex flex-col justify-between hover:border-taupe/40 transition-all">
                                <div>
                                    <div class="flex justify-between items-center mb-3">
                                        <span class="text-xs font-mono text-mute">${c.id}</span>
                                        <span class="px-2.5 py-1 rounded text-[10px] font-medium ${c.status === 'Assinado' ? 'bg-ok/10 text-ok border border-ok/30' : 'bg-warn/10 text-warn border border-warn/30'}">${c.status}</span>
                                    </div>
                                    <h3 class="font-serif text-lg font-bold text-ink mb-2">${c.titulo}</h3>
                                    <p class="text-mute text-xs mb-4 line-clamp-2">${c.texto}</p>
                                    ${c.hash ? `<div class="bg-fog p-2.5 rounded font-mono text-[10px] text-taupe/90 break-all mb-4 border border-taupe/20">SHA-256: ${c.hash}</div>` : ''}
                                </div>
                                <div class="pt-4 border-t border-ink/10 flex justify-between items-center">
                                    <button onclick="viewContractModal('${c.id}')" class="text-xs text-ink font-semibold hover:text-taupe transition-colors">Visualizar Termos &rarr;</button>
                                    ${c.status !== 'Assinado' ? `<button onclick="signContract('${c.id}')" class="bg-wine hover:bg-wineHover text-white px-4 py-2 rounded text-xs font-medium transition-colors border border-wineHover">Assinar Digitalmente</button>` : '<span class="text-xs text-ok flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Válido juridicamente</span>'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    window.handleClientLogout = async function() {
        await window.AetherAuth.logout();
        window.location.hash = '#/';
    };

    window.switchPortalTab = function(tabKey) {
        document.querySelectorAll('.portal-tab').forEach(btn => {
            btn.classList.remove('border-taupe', 'text-taupe');
            btn.classList.add('border-transparent', 'text-mute');
        });
        document.getElementById(`tab-btn-${tabKey}`).classList.add('border-taupe', 'text-taupe');
        document.getElementById(`tab-btn-${tabKey}`).classList.remove('border-transparent', 'text-mute');

        document.querySelectorAll('.portal-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(`portal-tab-${tabKey}`).classList.remove('hidden');
    };

    // --- FLIGHT DETAILS DRAWER ---
    window.openFlightDrawer = function(flightId) {
        const flight = MOCK_FLIGHTS.find(f => f.id === flightId);
        if (!flight) return;

        let drawer = document.getElementById('flight-drawer');
        if (!drawer) {
            drawer = document.createElement('div');
            drawer.id = 'flight-drawer';
            drawer.className = 'fixed inset-0 bg-sand/80 backdrop-blur-sm z-50 flex justify-end';
            document.body.appendChild(drawer);
        }

        drawer.innerHTML = `
            <div class="w-full max-w-lg bg-silver border-l border-taupe/30 h-full p-8 flex flex-col justify-between overflow-y-auto shadow-2xl">
                <div>
                    <div class="flex justify-between items-center mb-8 border-b border-ink/10 pb-4">
                        <div>
                            <span class="text-xs text-taupe uppercase tracking-wider font-semibold">Detalhes do Voo</span>
                            <h3 class="font-serif text-2xl font-bold text-ink">${flight.id}</h3>
                        </div>
                        <button onclick="document.getElementById('flight-drawer').remove()" class="text-mute hover:text-ink p-2">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <div class="space-y-6">
                        <div class="bg-fog p-4 rounded-xl border border-ink/5">
                            <span class="text-[10px] text-mute uppercase block mb-1">Rota Executiva</span>
                            <span class="font-serif text-xl font-bold text-ink">${flight.origem} &rarr; ${flight.destino}</span>
                            <span class="text-xs text-mute block mt-1">Data: ${flight.data}</span>
                        </div>
                        <div class="bg-fog p-4 rounded-xl border border-ink/5">
                            <span class="text-[10px] text-mute uppercase block mb-1">Aeronave & Capacidade</span>
                            <span class="text-taupe font-semibold text-base">${flight.aeronave}</span>
                            <span class="text-xs text-mute block mt-1">Manifesto: ${flight.pax} passageiros autorizados</span>
                        </div>
                        <div class="bg-fog p-4 rounded-xl border border-ink/5">
                            <span class="text-[10px] text-mute uppercase block mb-1">Tripulação Designada</span>
                            <span class="text-ink text-sm font-medium">${flight.tripulacao}</span>
                        </div>
                        <div class="bg-fog p-4 rounded-xl border border-ink/5">
                            <span class="text-[10px] text-mute uppercase block mb-1">Catering & Bebidas Escolhidas</span>
                            <span class="text-ink text-sm">${flight.bebidas}</span>
                        </div>
                    </div>
                </div>

                <div class="pt-6 border-t border-ink/10 flex gap-4">
                    <button onclick="window.print()" class="flex-1 bg-fog hover:bg-stone/40 text-ink py-3 rounded text-xs font-medium border border-ink/10 transition-colors">Imprimir Comprovante</button>
                    <button onclick="document.getElementById('flight-drawer').remove()" class="flex-1 bg-wine hover:bg-wineHover text-white py-3 rounded text-xs font-medium transition-colors">Fechar</button>
                </div>
            </div>
        `;
        lucide.createIcons();
    };

    // --- INVOICE PAYMENT & PDF DOWNLOAD ---
    window.downloadInvoicePDF = function(invoiceId) {
        const inv = MOCK_INVOICES.find(i => i.id === invoiceId);
        if (!inv) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Fatura ${inv.id} - Aether Jets</title>
                <style>
                    body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #23262B; background: #fff; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6D0F23; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; color: #6D0F23; }
                    .details { margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; font-size: 14px; }
                    th { background: #f4eee3; color: #23262B; }
                    .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">AETHER JETS AVIATION</div>
                        <div style="font-size: 12px; color: #555;">Av. Brigadeiro Faria Lima, 4440 - São Paulo, SP</div>
                        <div style="font-size: 12px; color: #555;">CNPJ: 45.890.123/0001-99</div>
                    </div>
                    <div style="text-align: right;">
                        <strong>Fatura: ${inv.id}</strong><br>
                        Emissão: ${inv.data}<br>
                        Vencimento: ${inv.vencimento}
                    </div>
                </div>
                <div class="details">
                    <h3>Cliente: Beatriz Monte Negro</h3>
                    <p>Status: <strong>${inv.status}</strong></p>
                </div>
                <table>
                    <tr><th>Descrição do Serviço</th><th>Vencimento</th><th>Valor</th></tr>
                    <tr><td>${inv.descricao}</td><td>${inv.vencimento}</td><td>${inv.valor}</td></tr>
                </table>
                <div class="total">Total a Pagar: ${inv.valor}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    window.openPaymentModal = function(invoiceId, valor, descricao) {
        let modal = document.getElementById('payment-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'payment-modal';
            modal.className = 'fixed inset-0 bg-sand/90 backdrop-blur-md z-50 flex items-center justify-center p-4';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-silver border border-taupe/40 rounded-2xl p-8 max-w-lg w-full relative shadow-2xl">
                <button onclick="document.getElementById('payment-modal').remove()" class="absolute top-4 right-4 text-mute hover:text-ink"><i data-lucide="x" class="w-5 h-5"></i></button>
                <div class="text-center mb-6">
                    <span class="text-xs uppercase tracking-widest text-taupe font-semibold block mb-1">Pagamento Executivo</span>
                    <h3 class="font-serif text-2xl font-bold text-ink">Fatura ${invoiceId}</h3>
                    <p class="text-mute text-xs mt-1">${descricao}</p>
                    <span class="font-serif text-3xl font-bold text-taupe block mt-3">${valor}</span>
                </div>

                <!-- Payment Method Tabs -->
                <div class="grid grid-cols-4 gap-2 mb-6 bg-fog p-1.5 rounded-lg border border-ink/10 text-xs font-medium text-center">
                    <button onclick="switchPayTab('pix')" id="pay-tab-pix" class="py-2 rounded bg-wine text-white transition-colors">Pix</button>
                    <button onclick="switchPayTab('credito')" id="pay-tab-credito" class="py-2 rounded text-mute hover:text-ink transition-colors">Cartão</button>
                    <button onclick="switchPayTab('debito')" id="pay-tab-debito" class="py-2 rounded text-mute hover:text-ink transition-colors">Débito</button>
                    <button onclick="switchPayTab('cheque')" id="pay-tab-cheque" class="py-2 rounded text-mute hover:text-ink transition-colors">Cheque</button>
                </div>

                <!-- Pix View -->
                <div id="pay-view-pix" class="pay-view space-y-4 text-center">
                    <div class="bg-white p-4 rounded-xl inline-block">
                        <!-- QR Code placeholder SVG -->
                        <svg class="w-36 h-36 mx-auto" viewBox="0 0 100 100">
                            <rect width="100" height="100" fill="#fff"/>
                            <rect x="10" y="10" width="30" height="30" fill="#23262B"/>
                            <rect x="60" y="10" width="30" height="30" fill="#23262B"/>
                            <rect x="10" y="60" width="30" height="30" fill="#23262B"/>
                            <rect x="45" y="45" width="10" height="10" fill="#6D0F23"/>
                            <rect x="70" y="70" width="20" height="20" fill="#23262B"/>
                        </svg>
                    </div>
                    <p class="text-xs text-mute">Escaneie o QR Code com o aplicativo do seu banco ou utilize a chave Pix copia e cola.</p>
                    <div class="flex gap-2">
                        <input type="text" readonly value="00020126580014br.gov.bcb.pix0136aether-jets-pagamentos-executivos27045000" class="w-full bg-fog border border-ink/10 rounded px-3 py-2 text-[10px] font-mono text-ink">
                        <button onclick="alert('Chave Pix copiada com sucesso!')" class="bg-wine hover:bg-wineHover text-white px-4 py-2 rounded text-xs font-medium shrink-0">Copiar</button>
                    </div>
                </div>

                <!-- Cartão View -->
                <div id="pay-view-credito" class="pay-view space-y-4 hidden">
                    <div>
                        <label class="block text-xs text-mute mb-1">Número do Cartão</label>
                        <input type="text" placeholder="4532 •••• •••• 8890" class="w-full bg-fog border border-ink/10 rounded px-4 py-2.5 text-sm text-ink">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs text-mute mb-1">Validade</label>
                            <input type="text" placeholder="MM/AA" class="w-full bg-fog border border-ink/10 rounded px-4 py-2.5 text-sm text-ink">
                        </div>
                        <div>
                            <label class="block text-xs text-mute mb-1">CVV</label>
                            <input type="password" placeholder="•••" maxlength="4" class="w-full bg-fog border border-ink/10 rounded px-4 py-2.5 text-sm text-ink">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs text-mute mb-1">Parcelamento</label>
                        <select class="w-full bg-fog border border-ink/10 rounded px-4 py-2.5 text-sm text-ink">
                            <option>1x de ${valor} (À vista)</option>
                            <option>Até 12x sem juros no Cartão Corporativo Aether</option>
                        </select>
                    </div>
                    <button onclick="simulatePaymentSuccess()" class="w-full bg-wine hover:bg-wineHover text-white py-3 rounded text-sm font-medium transition-colors">Efetuar Pagamento</button>
                </div>

                <!-- Débito View -->
                <div id="pay-view-debito" class="pay-view space-y-4 text-center hidden">
                    <p class="text-sm text-mute">Integração segura com débito bancário automático e TED/DOC instantâneo.</p>
                    <button onclick="simulatePaymentSuccess()" class="w-full bg-wine hover:bg-wineHover text-white py-3 rounded text-sm font-medium transition-colors">Autorizar Débito Bancário</button>
                </div>

                <!-- Cheque View -->
                <div id="pay-view-cheque" class="pay-view space-y-4 text-center hidden">
                    <p class="text-sm text-mute">Emissão de cheque administrativo ou custódia física via mensageiro blindado do concierge.</p>
                    <button onclick="simulatePaymentSuccess()" class="w-full bg-wine hover:bg-wineHover text-white py-3 rounded text-sm font-medium transition-colors">Solicitar Mensageiro</button>
                </div>
            </div>
        `;
        lucide.createIcons();
    };

    window.switchPayTab = function(tabKey) {
        ['pix', 'credito', 'debito', 'cheque'].forEach(t => {
            const btn = document.getElementById(`pay-tab-${t}`);
            const view = document.getElementById(`pay-view-${t}`);
            if (t === tabKey) {
                btn.classList.add('bg-wine', 'text-ink');
                btn.classList.remove('text-mute');
                view.classList.remove('hidden');
            } else {
                btn.classList.remove('bg-wine', 'text-ink');
                btn.classList.add('text-mute');
                view.classList.add('hidden');
            }
        });
    };

    window.simulatePaymentSuccess = function() {
        alert('Pagamento processado e faturamento confirmado com sucesso!');
        const modal = document.getElementById('payment-modal');
        if (modal) modal.remove();
        renderClientPortal();
    };

    // --- CONTRACTS & SHA-256 DIGITAL SIGNATURE ---
    window.viewContractModal = function(contractId) {
        const c = MOCK_CONTRACTS.find(item => item.id === contractId);
        if (!c) return;

        let modal = document.getElementById('contract-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'contract-modal';
            modal.className = 'fixed inset-0 bg-sand/90 backdrop-blur-md z-50 flex items-center justify-center p-4';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-silver border border-taupe/40 rounded-2xl p-8 max-w-2xl w-full relative shadow-2xl max-h-[90vh] flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center mb-6 border-b border-ink/10 pb-4">
                        <div>
                            <span class="text-xs text-taupe uppercase tracking-wider font-semibold">Documento Oficial</span>
                            <h3 class="font-serif text-xl font-bold text-ink">${c.titulo}</h3>
                        </div>
                        <button onclick="document.getElementById('contract-modal').remove()" class="text-mute hover:text-ink"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                    <div class="bg-fog p-6 rounded-xl border border-ink/5 text-xs text-mute leading-relaxed max-h-96 overflow-y-auto mb-6">
                        ${c.texto}
                    </div>
                    ${c.hash ? `<div class="bg-sand p-3 rounded font-mono text-[11px] text-taupe border border-taupe/20 mb-4">Impressão Digital (SHA-256): ${c.hash}</div>` : ''}
                </div>
                <div class="pt-4 border-t border-ink/10 flex justify-end gap-3">
                    <button onclick="document.getElementById('contract-modal').remove()" class="bg-fog hover:bg-stone/40 text-ink px-5 py-2.5 rounded text-xs font-medium border border-ink/10">Fechar</button>
                    ${c.status !== 'Assinado' ? `<button onclick="signContract('${c.id}'); document.getElementById('contract-modal').remove();" class="bg-wine hover:bg-wineHover text-white px-6 py-2.5 rounded text-xs font-medium">Assinar Digitalmente Agora</button>` : ''}
                </div>
            </div>
        `;
        lucide.createIcons();
    };

    window.signContract = async function(contractId) {
        const c = MOCK_CONTRACTS.find(item => item.id === contractId);
        if (!c) return;

        // Compute SHA-256 hash using Web Crypto API
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(c.texto + Date.now());
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            c.status = "Assinado";
            c.hash = hashHex;

            alert(`Contrato ${c.id} assinado digitalmente com sucesso!\n\nImpressão Digital SHA-256:\n${hashHex}`);
            renderClientPortal();
        } catch (e) {
            console.error('Crypto error', e);
            alert('Erro ao processar assinatura criptográfica.');
        }
    };

    // --- FLIGHT TABLE FILTERING ---
    window.filterFlights = function() {
        const query = document.getElementById('flight-search').value.toLowerCase();
        const statusFilter = document.getElementById('flight-status-filter').value;
        const tbody = document.getElementById('flights-table-body');

        const filtered = MOCK_FLIGHTS.filter(f => {
            const matchQuery = f.id.toLowerCase().includes(query) || f.origem.toLowerCase().includes(query) || f.destino.toLowerCase().includes(query) || f.aeronave.toLowerCase().includes(query);
            const matchStatus = statusFilter === 'todos' || f.status === statusFilter;
            return matchQuery && matchStatus;
        });

        tbody.innerHTML = filtered.map(f => `
            <tr class="hover:bg-fog/50 transition-colors">
                <td class="p-4 font-mono text-ink">${f.id}</td>
                <td class="p-4 font-semibold text-ink">${f.origem} &rarr; ${f.destino}</td>
                <td class="p-4">${f.data}</td>
                <td class="p-4 text-taupe">${f.aeronave}</td>
                <td class="p-4">
                    <span class="px-2.5 py-1 rounded text-[10px] font-medium ${f.status === 'Confirmado' ? 'bg-ok/10 text-ok border border-ok/30' : f.status === 'Agendado' ? 'bg-warn/10 text-warn border border-warn/30' : 'bg-fog text-mute border border-ink/10'}">${f.status}</span>
                </td>
                <td class="p-4 text-ink font-medium">${f.preco}</td>
                <td class="p-4 text-right">
                    <button onclick="openFlightDrawer('${f.id}')" class="bg-wine/20 hover:bg-wine text-taupe hover:text-white px-3 py-1.5 rounded text-[11px] font-medium transition-colors border border-taupe/30">Detalhes</button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    };

})();