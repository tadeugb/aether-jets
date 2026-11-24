// Credenciais e duração da sessão de demonstração. Em produção, autentique no servidor.
(function () {
    'use strict';
    const config = { usuario: 'admin', senha: 'AetherJets2026!', sessaoHoras: 8 };
    const key = 'aether.admin.session.v1';
    const tokenKey = 'aether.admin.token.v1';

    function active() {
        try { return Number(sessionStorage.getItem(key)) > Date.now(); }
        catch { return false; }
    }

    // Com o server.js rodando, quem valida é a API (e devolve o token para gravar no banco).
    // Sem servidor (site estático), cai na checagem local de demonstração.
    async function login(usuario, senha) {
        let res = null;
        try { res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, senha }) }); }
        catch { /* sem servidor */ }
        if (res && res.status === 401) return false;
        const body = res && res.ok ? await res.json().catch(() => null) : null;
        if (body && body.token) sessionStorage.setItem(tokenKey, body.token);
        else if (usuario !== config.usuario || senha !== config.senha) return false;
        sessionStorage.setItem(key, String(Date.now() + config.sessaoHoras * 3600000));
        return true;
    }

    function token() {
        try { return active() ? sessionStorage.getItem(tokenKey) : null; }
        catch { return null; }
    }

    function logout() {
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(tokenKey);
    }

    window.AetherAdminAuth = { active, login, logout, token };
})();
