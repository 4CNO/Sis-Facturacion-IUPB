/**
 * public/js/modules/productos.js  — FactuLogin v3.0
 * Productos tiene búsqueda por ID (ObjectId), no por campo de texto único,
 * así que extiende el factory con lógica específica.
 */

'use strict';

/* utils.js + crud-module.js deben cargarse antes */

/* ── Estado ───────────────────────────────────────────────────────── */
let modoEdicion  = false;
let productoIdActual = null;

/* ── DOM refs ─────────────────────────────────────────────────────── */
const buscarId     = document.getElementById('buscarId');
const btnBuscar    = document.getElementById('btnBuscar');
const searchStatus = document.getElementById('searchStatus');
const modoIndicador= document.getElementById('modoIndicador');
const idGroup      = document.getElementById('idGroup');
const productoId   = document.getElementById('productoId');
const nombreInput  = document.getElementById('nombreProducto');
const marcaInput   = document.getElementById('marcaProducto');
const precioInput  = document.getElementById('precioProducto');
const stockInput   = document.getElementById('cantidadProducto');
const saveBtnEl    = document.getElementById('saveProductoBtn');
const saveBtnTxt   = document.getElementById('saveBtnText');
const clearBtnEl   = document.getElementById('clearBtn');
const tbody        = document.getElementById('productosBody');
const empty        = document.getElementById('productosEmpty');

/* ── Helpers ──────────────────────────────────────────────────────── */
const _showMsg = (type, msg) => showMsg('producto-error', 'producto-ok', type, msg);

function setSearchStatus(text, cls = '') {
    if (!searchStatus) return;
    searchStatus.textContent = text;
    searchStatus.className   = `search-status ${cls}`.trim();
}

function setModo(edicion, pid = null) {
    modoEdicion      = edicion;
    productoIdActual = pid;

    if (modoIndicador) {
        modoIndicador.className = `modo-badge ${edicion ? 'modo-edicion' : 'modo-nuevo'}`;
        modoIndicador.innerHTML = edicion
            ? `<i class="fa-solid fa-pen-to-square"></i> Modo: Editando producto`
            : `<i class="fa-solid fa-plus-circle"></i> Modo: Nuevo producto`;
    }
    if (saveBtnTxt) saveBtnTxt.textContent = edicion ? 'Actualizar producto' : 'Guardar producto';
    if (idGroup)    idGroup.style.display   = edicion ? 'flex' : 'none';
    if (productoId) productoId.value        = pid || '';
}

function clearForm() {
    [buscarId, nombreInput, marcaInput, precioInput, stockInput].forEach(el => { if (el) el.value = ''; });
    setSearchStatus('');
    setModo(false);
    _showMsg(null);
}

/* ── Búsqueda por ID ─────────────────────────────────────────────── */
async function buscarProducto() {
    const pid = buscarId?.value.trim();
    if (!pid) { setSearchStatus('Ingresa un ID para buscar.', 'status-warn'); return; }
    setSearchStatus('Buscando…');

    try {
        const res  = await authFetch(`${API_URL}/api/productos/buscar?productId=${encodeURIComponent(pid)}`);
        const data = await res.json();

        if (!data.found) {
            setSearchStatus('ID no encontrado.', 'status-error');
            [nombreInput, marcaInput, precioInput, stockInput].forEach(el => { if (el) el.value = ''; });
            setModo(false);
            return;
        }

        const p = data.producto;
        if (nombreInput) nombreInput.value = p.name;
        if (marcaInput)  marcaInput.value  = p.brand;
        if (precioInput) precioInput.value = p.price;
        if (stockInput)  stockInput.value  = p.stock;

        setSearchStatus('✅ Producto encontrado — puedes editar.', 'status-ok');
        setModo(true, p.id || p.productId);
        _showMsg(null);

    } catch (err) {
        console.error('[buscarProducto]', err);
        setSearchStatus('Error de conexión.', 'status-error');
    }
}

/* ── Guardar / actualizar ────────────────────────────────────────── */
async function guardar() {
    _showMsg(null);

    const nombre   = nombreInput?.value.trim();
    const marca    = marcaInput?.value.trim();
    const precio   = Number(precioInput?.value);
    const cantidad = Number(stockInput?.value);

    if (!nombre)                          return _showMsg('error', 'El nombre es obligatorio.');
    if (!marca)                           return _showMsg('error', 'La marca es obligatoria.');
    if (isNaN(precio)   || precio   < 0) return _showMsg('error', 'Ingresa un precio válido (≥ 0).');
    if (isNaN(cantidad) || cantidad < 0) return _showMsg('error', 'Ingresa una cantidad válida (≥ 0).');

    if (saveBtnEl)  saveBtnEl.disabled = true;
    if (saveBtnTxt) saveBtnTxt.textContent = 'Guardando…';

    try {
        const body = { nombre, marca, precio, cantidad };
        if (modoEdicion && productoIdActual) body.productId = productoIdActual;

        const res  = await authFetch(`${API_URL}/api/productos`, {
            method: 'POST',
            body:   JSON.stringify(body),
        });
        const data = await res.json();

        if (!res.ok) { _showMsg('error', data.error || 'No se pudo guardar.'); return; }

        _showMsg('ok', modoEdicion ? 'Producto actualizado.' : `Producto creado.`);
        toast(modoEdicion ? '✏️ Producto actualizado' : '📦 Producto creado');
        clearForm();
        loadProductos();

    } catch (err) {
        console.error('[guardarProducto]', err);
        _showMsg('error', 'Error de conexión.');
    } finally {
        if (saveBtnEl)  saveBtnEl.disabled = false;
        if (saveBtnTxt) saveBtnTxt.textContent = modoEdicion ? 'Actualizar producto' : 'Guardar producto';
    }
}

/* ── Tabla ───────────────────────────────────────────────────────── */
function renderProductos(rows) {
    if (!rows?.length) { if (empty) empty.style.display = 'block'; if (tbody) tbody.innerHTML = ''; return; }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = rows.map(r => {
        const pid   = sanitize(String(r.id || r._id));
        const name  = sanitize(r.name);
        const brand = sanitize(r.brand || '—');
        const price = Number(r.price).toFixed(2);
        const stock = r.stock ?? 0;
        return `<tr>
            <td><button class="link-table-btn" data-pid="${pid}">#${pid.slice(-6)}</button></td>
            <td>${name}</td>
            <td>${brand}</td>
            <td>$${price}</td>
            <td>${stock}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.link-table-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (buscarId) buscarId.value = btn.dataset.pid;
            buscarProducto();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

async function loadProductos() {
    try {
        const res  = await authFetch(`${API_URL}/api/productos`);
        const data = await res.json();
        renderProductos(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
        console.error('[loadProductos]', err);
        _showMsg('error', 'No se pudo cargar la lista.');
    }
}

/* ── Init ────────────────────────────────────────────────────────── */
btnBuscar?.addEventListener('click', buscarProducto);
buscarId?.addEventListener('keydown', e => { if (e.key === 'Enter') buscarProducto(); });
clearBtnEl?.addEventListener('click', clearForm);
saveBtnEl?.addEventListener('click', guardar);

if (!SESSION) {
    [buscarId, btnBuscar, nombreInput, marcaInput, precioInput, stockInput, saveBtnEl, clearBtnEl]
        .forEach(el => { if (el) el.disabled = true; });
    if (empty) { empty.textContent = 'Inicia sesión para habilitar productos'; empty.style.display = 'block'; }
} else {
    setModo(false);
    loadProductos();
}

initPageTransitions();
