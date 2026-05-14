/**
 * public/js/modules/crud-module.js  — FactuLogin v3.0
 *
 * Factory que genera toda la lógica de UI para módulos CRUD
 * (clientes, empresas, productos). Elimina ~70% de código duplicado.
 *
 * Uso:
 *   const mod = createCrudModule({ config });
 *   mod.init();
 */

'use strict';

/* utils.js debe cargarse antes */

/**
 * @param {Object} cfg
 * @param {string}   cfg.entityName       - 'cliente' | 'empresa' | 'producto'
 * @param {string}   cfg.searchEndpoint   - '/api/clientes/buscar?documento='
 * @param {string}   cfg.saveEndpoint     - '/api/clientes'
 * @param {string}   cfg.listEndpoint     - '/api/clientes'
 * @param {string}   cfg.errorMsgId       - ID del div de error
 * @param {string}   cfg.okMsgId          - ID del div de ok
 * @param {string[]} cfg.fieldIds         - IDs de los inputs del form
 * @param {string}   cfg.uniqueFieldId    - ID del input que es la clave única
 * @param {string}   cfg.searchInputId    - ID del input de búsqueda
 * @param {string}   cfg.tbodyId          - ID del tbody de la tabla
 * @param {string}   cfg.emptyId          - ID del párrafo "sin datos"
 * @param {Function} cfg.buildBody        - (fields) => objeto para POST
 * @param {Function} cfg.renderRow        - (row, index) => string HTML de <tr>
 * @param {Function} cfg.fillForm         - (data) => llena el form con los datos
 */
function createCrudModule(cfg) {

    /* ── Estado ──────────────────────────────────────────────────── */
    let modoEdicion = false;

    /* ── Helpers ─────────────────────────────────────────────────── */
    const _showMsg  = (type, msg) => showMsg(cfg.errorMsgId, cfg.okMsgId, type, msg);
    const _getField = id => document.getElementById(id);
    const _val      = id => _getField(id)?.value.trim() || '';

    function setSearchStatus(text, cls = '') {
        const el = _getField('searchStatus');
        if (!el) return;
        el.textContent = text;
        el.className   = `search-status ${cls}`.trim();
    }

    function setModo(edicion) {
        modoEdicion = edicion;
        const badge  = _getField('modoIndicador');
        const btnTxt = _getField('saveBtnText');
        if (!badge) return;

        badge.className = `modo-badge ${edicion ? 'modo-edicion' : 'modo-nuevo'}`;
        badge.innerHTML = edicion
            ? `<i class="fa-solid fa-pen-to-square"></i> Modo: Editando ${cfg.entityName} existente`
            : `<i class="fa-solid fa-plus-circle"></i> Modo: Nuevo ${cfg.entityName}`;

        if (btnTxt) btnTxt.textContent = edicion
            ? `Actualizar ${cfg.entityName}`
            : `Guardar ${cfg.entityName}`;

        const uniqField = _getField(cfg.uniqueFieldId);
        if (uniqField) uniqField.readOnly = edicion;
    }

    function clearForm() {
        cfg.fieldIds.forEach(id => { const el = _getField(id); if (el) el.value = ''; });
        const si = _getField(cfg.searchInputId);
        if (si) si.value = '';
        setSearchStatus('');
        setModo(false);
        _showMsg(null);
    }

    /* ── Búsqueda ────────────────────────────────────────────────── */
    async function buscar() {
        const val = _val(cfg.searchInputId);
        if (!val) { setSearchStatus('Ingresa un valor para buscar.', 'status-warn'); return; }
        setSearchStatus('Buscando…');

        try {
            const res  = await authFetch(`${API_URL}${cfg.searchEndpoint}${encodeURIComponent(val)}`);
            const data = await res.json();

            if (!data.found) {
                setSearchStatus(`No encontrado — se creará un nuevo ${cfg.entityName}.`, 'status-warn');
                const uniq = _getField(cfg.uniqueFieldId);
                if (uniq) uniq.value = val;
                cfg.fieldIds.filter(id => id !== cfg.uniqueFieldId)
                    .forEach(id => { const el = _getField(id); if (el) el.value = ''; });
                setModo(false);
                return;
            }

            cfg.fillForm(data[cfg.entityName] || data.data || data.producto || data.empresa || data.cliente);
            setSearchStatus(`✅ ${cfg.entityName.charAt(0).toUpperCase() + cfg.entityName.slice(1)} encontrado.`, 'status-ok');
            setModo(true);
            _showMsg(null);

        } catch (err) {
            console.error(`[${cfg.entityName}] buscar`, err);
            setSearchStatus('Error de conexión.', 'status-error');
        }
    }

    /* ── Guardar ─────────────────────────────────────────────────── */
    async function guardar() {
        _showMsg(null);

        const fields  = {};
        cfg.fieldIds.forEach(id => { fields[id] = _val(id); });

        const allFilled = cfg.fieldIds.every(id => fields[id]);
        if (!allFilled) return _showMsg('error', 'Todos los campos son obligatorios.');

        const saveBtn    = _getField('saveBtn') || document.querySelector('[id$="Btn"][id^="save"]');
        const saveBtnTxt = _getField('saveBtnText');
        if (saveBtn) saveBtn.disabled = true;
        if (saveBtnTxt) saveBtnTxt.textContent = 'Guardando…';

        try {
            const body = cfg.buildBody(fields);
            const res  = await authFetch(`${API_URL}${cfg.saveEndpoint}`, {
                method: 'POST',
                body:   JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) { _showMsg('error', data.error || 'No se pudo guardar.'); return; }

            const msg = modoEdicion
                ? `${cfg.entityName.charAt(0).toUpperCase() + cfg.entityName.slice(1)} actualizado correctamente.`
                : `${cfg.entityName.charAt(0).toUpperCase() + cfg.entityName.slice(1)} creado correctamente.`;

            _showMsg('ok', msg);
            toast(modoEdicion ? `✏️ Actualizado` : `✅ Guardado`);
            clearForm();
            loadList();

        } catch (err) {
            console.error(`[${cfg.entityName}] guardar`, err);
            _showMsg('error', 'Error de conexión.');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
            if (saveBtnTxt) saveBtnTxt.textContent = modoEdicion
                ? `Actualizar ${cfg.entityName}`
                : `Guardar ${cfg.entityName}`;
        }
    }

    /* ── Lista ───────────────────────────────────────────────────── */
    function renderList(rows) {
        const tbody = _getField(cfg.tbodyId);
        const empty = _getField(cfg.emptyId);
        if (!tbody || !empty) return;

        if (!rows?.length) {
            empty.style.display = 'block';
            tbody.innerHTML     = '';
            return;
        }

        empty.style.display = 'none';
        tbody.innerHTML     = rows.map((r, i) => cfg.renderRow(r, i)).join('');

        /* Delegación de eventos para edición desde tabla */
        tbody.querySelectorAll('.link-table-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                cfg.fillForm(btn.dataset);
                setSearchStatus('✅ Cargado — puedes editar los datos.', 'status-ok');
                setModo(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    async function loadList() {
        try {
            const res  = await authFetch(`${API_URL}${cfg.listEndpoint}`);
            const data = await res.json();
            renderList(Array.isArray(data) ? data : data.data || []);
        } catch (err) {
            console.error(`[${cfg.entityName}] loadList`, err);
            _showMsg('error', 'No se pudo cargar la lista.');
        }
    }

    /* ── Init ────────────────────────────────────────────────────── */
    function init() {
        const searchBtn  = _getField('btnBuscar');
        const searchInp  = _getField(cfg.searchInputId);
        const clearBtn   = _getField('clearBtn');
        const saveBtn    = _getField('saveBtn') || document.querySelector('[id$="Btn"][id^="save"]');

        searchBtn?.addEventListener('click', buscar);
        searchInp?.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
        clearBtn?.addEventListener('click', clearForm);
        saveBtn?.addEventListener('click', guardar);

        if (!SESSION) {
            const inputs = [searchBtn, searchInp, clearBtn, saveBtn,
                ...cfg.fieldIds.map(id => _getField(id))].filter(Boolean);
            inputs.forEach(el => { el.disabled = true; });
            const empty = _getField(cfg.emptyId);
            if (empty) {
                empty.textContent   = `Inicia sesión para habilitar ${cfg.entityName}s`;
                empty.style.display = 'block';
            }
            return;
        }

        setModo(false);
        loadList();
        initPageTransitions();
    }

    return { init, buscar, guardar, clearForm, loadList };
}

/* Exportar para uso con módulos ES o script tag */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createCrudModule };
} else {
    window.createCrudModule = createCrudModule;
}
