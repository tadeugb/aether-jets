(function () {
    'use strict';
    if (AetherAdminAuth.active()) {
        location.replace('admin.html');
        return;
    }
    Aether.mountLayout({ active: 'admin' });
    const form = document.getElementById('admin-login');
    const status = document.getElementById('login-status');
    form.addEventListener('submit', async event => {
        event.preventDefault();
        try {
            if (await AetherAdminAuth.login(form.elements.usuario.value.trim(), form.elements.senha.value)) {
                location.replace('admin.html');
                return;
            }
            status.textContent = 'Usuário ou senha inválidos.';
            form.elements.senha.focus();
        } catch {
            status.textContent = 'O navegador bloqueou a sessão. Permita o armazenamento para continuar.';
        }
    });
})();
