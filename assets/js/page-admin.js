// Editor local. Cada operação relê o catálogo antes de gravar para preservar as demais seções.
(function () {
    'use strict';
    const auth = window.AetherAdminAuth;
    function requireSession() {
        if (auth.active()) return true;
        location.replace('admin-login.html');
        return false;
    }
    if (!requireSession()) return;

    const A = window.Aether;
    const store = window.AetherCatalog;
    const esc = A.esc;
    const $ = id => document.getElementById(id);
    const form = $('admin-edit');
    const status = $('admin-status');
    const titles = { frota: 'Aeronaves', catering: 'Catering de bordo', pacotes: 'Pacotes' };
    const field = (name, label, kind = 'text', options = {}) => ({ name, label, kind, ...options });
    const photo = field('imagem', 'Foto (caminho local ou URL)', 'text', { optional: true });
    const fields = {
        frota: [
            field('nome', 'Nome'), field('modelo', 'Modelo'), field('categoria', 'Categoria', 'fleetCategory'),
            field('pax', 'Passageiros', 'number'), field('alcance_km', 'Autonomia (km)', 'number'),
            field('velocidade_kmh', 'Velocidade (km/h)', 'number'),
            field('valor_hora', 'Preço por hora (R$)', 'currency'), photo, field('descricao', 'Descrição', 'area')
        ],
        catering: [
            field('nome', 'Nome'), field('categoria', 'Categoria', 'menuCategory'), field('preco', 'Preço (R$)', 'currency'),
            field('unidade', 'Unidade de venda'), photo, field('desc', 'Descrição', 'area'),
            field('tags', 'Restrições e etiquetas (uma por linha)', 'lines', { optional: true }),
            field('alcool', 'Bebida alcoólica (18+)', 'checkbox')
        ],
        pacotes: [
            field('nome', 'Nome'), field('destino', 'Destino'), field('dias', 'Dias', 'number'),
            field('noites', 'Noites', 'number', { min: 0 }), field('pax', 'Passageiros', 'number'),
            field('aeronaveId', 'Aeronave incluída', 'aircraft'), field('hotel', 'Hotel'),
            field('categoriaHotel', 'Categoria do hotel'), field('carro', 'Tipo de carro blindado'),
            field('motorista', 'Motorista'), field('disponibilidade', 'Datas / disponibilidade'),
            field('preco', 'Preço inicial (R$)', 'currency'), photo, field('descricao', 'Descrição', 'area'),
            field('incluidos', 'Itens incluídos (um por linha)', 'lines'),
            field('opcionais', 'Itens opcionais (um por linha)', 'lines', { optional: true })
        ]
    };
    let section = 'frota';
    let editing = null;

    function message(value, error = false) {
        status.classList.toggle('text-bad', error);
        status.classList.toggle('text-ok', !error);
        status.textContent = value;
    }

    function render() {
        const records = store.load()[section];
        $('list-title').textContent = titles[section];
        for (const button of $('admin-nav').querySelectorAll('[data-section]')) {
            const active = button.dataset.section === section;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        }
        $('admin-list').innerHTML = records.map(record => `<div class="admin-row">
            <span class="font-medium">${esc(record.nome)}</span>
            <div class="flex flex-wrap gap-2">
                <button class="btn btn-ghost btn-sm" type="button" data-edit="${esc(record.id)}">Editar</button>
                <button class="btn btn-ghost btn-sm text-bad" type="button" data-remove="${esc(record.id)}">Excluir</button>
            </div>
        </div>`).join('') || '<p class="text-mute">Nenhum registro cadastrado.</p>';
    }

    function options(kind, data) {
        if (kind === 'fleetCategory') return Object.entries(store.categoriasFrota);
        if (kind === 'menuCategory') return Object.entries(store.categoriasCatering).map(([id, group]) => [id, group.nome]);
        if (kind === 'aircraft') return data.frota.map(a => [a.id, a.nome]);
        return null;
    }

    function control(def, record, data) {
        const { name, label, kind, min = kind === 'currency' ? 0 : 1, optional } = def;
        const value = record[name] ?? '';
        const required = optional ? '' : 'required';
        const opts = options(kind, data);
        const full = kind === 'area' || kind === 'lines';
        let input;
        if (opts) {
            input = `<select name="${name}" class="field" ${required}>
                <option value="">Selecione</option>
                ${opts.map(([id, text]) => `<option value="${esc(id)}" ${value === id ? 'selected' : ''}>${esc(text)}</option>`).join('')}
            </select>`;
        } else if (full) {
            input = `<textarea name="${name}" class="field" rows="3" maxlength="2000" ${required}>${esc(Array.isArray(value) ? value.join('\n') : value)}</textarea>`;
        } else if (kind === 'checkbox') {
            input = `<input name="${name}" type="checkbox" ${value ? 'checked' : ''}>`;
        } else {
            const numeric = kind === 'currency' || kind === 'number';
            const type = numeric ? `type="number" min="${min}" step="${kind === 'currency' ? '.01' : '1'}" max="1000000000"` : 'type="text" maxlength="500"';
            input = `<input name="${name}" class="field" ${type} value="${esc(value)}" ${required}>`;
        }
        return `<label class="${full ? 'full' : ''}"><span class="field-label">${label}</span>${input}</label>`;
    }

    function openEditor(id) {
        if (!requireSession()) return;
        const data = store.load();
        const record = id ? data[section].find(item => item.id === id) : {};
        if (!record) return message('O registro já foi removido.', true);
        if (section === 'pacotes' && !data.frota.length) return message('Cadastre uma aeronave antes de adicionar um pacote.', true);
        editing = id;
        message('');
        $('editor-title').textContent = id ? 'Editar registro' : 'Adicionar registro';
        $('admin-fields').innerHTML = fields[section].map(def => control(def, record, data)).join('');
        form.hidden = false;
        $('editor-title').focus();
    }

    function collect(data) {
        const record = {};
        for (const { name, label, kind, optional } of fields[section]) {
            const input = form.elements[name];
            const raw = input.value.trim();
            if (kind === 'checkbox') record[name] = input.checked;
            else if (kind === 'number' || kind === 'currency') record[name] = Number(raw);
            else if (kind === 'lines') record[name] = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            else record[name] = raw;
            if (kind !== 'checkbox' && !optional && !raw) throw new Error(`Preencha o campo ${label}.`);
        }
        if (record.imagem && !AetherImages.safeImage(record.imagem)) throw new Error('Informe um caminho de imagem ou URL HTTP(S) válido.');
        if (section === 'pacotes') {
            const aircraft = data.frota.find(a => a.id === record.aeronaveId);
            if (!aircraft || record.pax > aircraft.pax) throw new Error('Selecione uma aeronave com capacidade para todos os passageiros do pacote.');
            if (record.noites > record.dias) throw new Error('O número de noites deve ser menor ou igual ao de dias.');
        }
        if (section === 'frota' && editing && data.pacotes.some(p => p.aeronaveId === editing && p.pax > record.pax)) {
            throw new Error('A capacidade informada é menor que a de um pacote associado. Ajuste o pacote primeiro.');
        }
        return record;
    }

    function newId() {
        // Compatível com servidor HTTP local e com o contexto seguro HTTPS.
        return globalThis.crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join('-');
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!requireSession()) return;
        try {
            const data = store.load();
            const record = collect(data);
            if (editing) {
                const index = data[section].findIndex(item => item.id === editing);
                if (index < 0) throw new Error('O registro já foi removido.');
                data[section][index] = { ...data[section][index], ...record };
            } else data[section].push({ id: newId(), ...record });
            store.save(data).then(dbError => { if (dbError) message('Salvo neste navegador, mas o banco recusou: ' + dbError, true); });
            form.hidden = true;
            render();
            message('Registro salvo com sucesso.');
            A.toast('Registro salvo com sucesso.');
        } catch (error) {
            message(error.name === 'QuotaExceededError' ? 'Sem espaço para salvar o catálogo.' : error.message, true);
            status.scrollIntoView({ block: 'nearest' });
        }
    });

    function remove(id) {
        if (!requireSession()) return;
        const data = store.load();
        const record = data[section].find(item => item.id === id);
        if (!record || !confirm(`Excluir “${record.nome}”?`)) return;
        if (section === 'frota' && data.pacotes.some(p => p.aeronaveId === id)) {
            message('Reatribua ou exclua os pacotes vinculados antes de excluir esta aeronave.', true);
            return;
        }
        try {
            data[section] = data[section].filter(item => item.id !== id);
            store.save(data).then(dbError => { if (dbError) message('Salvo neste navegador, mas o banco recusou: ' + dbError, true); });
            if (editing === id) form.hidden = true;
            render();
            message('Registro excluído com sucesso.');
        } catch {
            message('Não foi possível gravar a exclusão neste navegador.', true);
        }
    }

    $('admin-nav').addEventListener('click', event => {
        const button = event.target.closest('[data-section]');
        if (!button || !requireSession()) return;
        section = button.dataset.section;
        form.hidden = true;
        message('');
        render();
    });
    $('admin-list').addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.dataset.edit) openEditor(button.dataset.edit);
        if (button.dataset.remove) remove(button.dataset.remove);
    });
    $('admin-add').addEventListener('click', () => openEditor(null));
    $('admin-cancel').addEventListener('click', () => { form.hidden = true; $('admin-add').focus(); });
    $('admin-logout').addEventListener('click', () => { auth.logout(); location.replace('admin-login.html'); });
    window.addEventListener('pageshow', requireSession);
    window.addEventListener('focus', requireSession);
    A.mountLayout({ active: 'admin' });
    render();
    $('main').hidden = false;
})();
